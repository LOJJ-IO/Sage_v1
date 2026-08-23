"""Per-user, purely-visual folder arrangement over the shared file list
(Sage-MVP-Functional-Spec §4.4). This module never touches `app.retrieval` —
creating, renaming, moving, or deleting a personal folder has zero effect on
what Sage retrieves from or answers with; it only changes how one user sees
and navigates the same shared files everyone else sees flat (or arranged
differently in their own tree).

Every function takes `business_id` as a required kwarg per CLAUDE.md §2.4,
same reasoning as `app.chat_settings` — `user_id` alone would scope the data,
but every query still scopes by business_id directly, not just derivable
through a join.
"""

from __future__ import annotations

import uuid

from sqlalchemy import delete, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import UserPersonalFolder, UserPersonalFolderItem

FOLDER_NAME_MAX_LEN = 255


class FolderNotFound(ValueError):
    """No folder with that id exists for this (business, user)."""


class FolderCycle(ValueError):
    """Reparenting would make a folder its own ancestor."""


def _would_create_cycle(
    parent_by_id: dict[uuid.UUID, uuid.UUID | None],
    folder_id: uuid.UUID,
    proposed_parent_id: uuid.UUID | None,
) -> bool:
    """True if setting `folder_id`'s parent to `proposed_parent_id` would make
    `folder_id` its own ancestor (including reparenting onto itself). Pure —
    `parent_by_id` is a plain {folder_id: parent_folder_id} snapshot, no DB
    access, so this is unit-testable without a database."""
    if proposed_parent_id is None:
        return False
    if proposed_parent_id == folder_id:
        return True

    current: uuid.UUID | None = proposed_parent_id
    seen: set[uuid.UUID] = set()
    while current is not None:
        if current == folder_id:
            return True
        if current in seen:
            return False  # defensive: shouldn't happen with valid data
        seen.add(current)
        current = parent_by_id.get(current)
    return False


def _renumber(ids_in_order: list[uuid.UUID]) -> dict[uuid.UUID, int]:
    """Pure: contiguous 0..n-1 positions for a sibling group in the given order."""
    return {item_id: index for index, item_id in enumerate(ids_in_order)}


async def _get_owned_folder(
    session: AsyncSession, *, business_id: uuid.UUID, user_id: uuid.UUID, folder_id: uuid.UUID
) -> UserPersonalFolder:
    result = await session.execute(
        select(UserPersonalFolder).where(
            UserPersonalFolder.id == folder_id,
            UserPersonalFolder.business_id == business_id,
            UserPersonalFolder.user_id == user_id,
        )
    )
    folder = result.scalar_one_or_none()
    if folder is None:
        raise FolderNotFound(f"no folder {folder_id!r} for this user")
    return folder


async def _sibling_folders(
    session: AsyncSession, *, business_id: uuid.UUID, user_id: uuid.UUID, parent_folder_id: uuid.UUID | None
) -> list[UserPersonalFolder]:
    result = await session.execute(
        select(UserPersonalFolder)
        .where(
            UserPersonalFolder.business_id == business_id,
            UserPersonalFolder.user_id == user_id,
            UserPersonalFolder.parent_folder_id == parent_folder_id,
        )
        .order_by(UserPersonalFolder.position)
    )
    return list(result.scalars())


async def _sibling_items(
    session: AsyncSession, *, business_id: uuid.UUID, user_id: uuid.UUID, folder_id: uuid.UUID | None
) -> list[UserPersonalFolderItem]:
    result = await session.execute(
        select(UserPersonalFolderItem)
        .where(
            UserPersonalFolderItem.business_id == business_id,
            UserPersonalFolderItem.user_id == user_id,
            UserPersonalFolderItem.folder_id == folder_id,
        )
        .order_by(UserPersonalFolderItem.position)
    )
    return list(result.scalars())


async def list_tree(
    *, business_id: uuid.UUID, user_id: uuid.UUID
) -> tuple[list[UserPersonalFolder], list[UserPersonalFolderItem]]:
    """Flat folder list + flat file-placement list; the caller assembles the tree.
    A file with no item row is unplaced (root, alphabetical fallback)."""
    async with get_session() as session:
        folders = await session.execute(
            select(UserPersonalFolder)
            .where(UserPersonalFolder.business_id == business_id, UserPersonalFolder.user_id == user_id)
            .order_by(UserPersonalFolder.position)
        )
        items = await session.execute(
            select(UserPersonalFolderItem)
            .where(UserPersonalFolderItem.business_id == business_id, UserPersonalFolderItem.user_id == user_id)
            .order_by(UserPersonalFolderItem.position)
        )
        return list(folders.scalars()), list(items.scalars())


async def create_folder(
    *, business_id: uuid.UUID, user_id: uuid.UUID, folder_name: str, parent_folder_id: uuid.UUID | None
) -> UserPersonalFolder:
    folder_name = folder_name.strip()[:FOLDER_NAME_MAX_LEN]
    if not folder_name:
        raise ValueError("folder_name is required")

    async with get_session() as session:
        if parent_folder_id is not None:
            await _get_owned_folder(session, business_id=business_id, user_id=user_id, folder_id=parent_folder_id)

        siblings = await _sibling_folders(
            session, business_id=business_id, user_id=user_id, parent_folder_id=parent_folder_id
        )
        folder = UserPersonalFolder(
            business_id=business_id,
            user_id=user_id,
            folder_name=folder_name,
            parent_folder_id=parent_folder_id,
            position=len(siblings),
        )
        session.add(folder)
        await session.commit()
        await session.refresh(folder)
        return folder


async def rename_folder(
    *, business_id: uuid.UUID, user_id: uuid.UUID, folder_id: uuid.UUID, folder_name: str
) -> UserPersonalFolder:
    folder_name = folder_name.strip()[:FOLDER_NAME_MAX_LEN]
    if not folder_name:
        raise ValueError("folder_name is required")

    async with get_session() as session:
        folder = await _get_owned_folder(session, business_id=business_id, user_id=user_id, folder_id=folder_id)
        folder.folder_name = folder_name
        session.add(folder)
        await session.commit()
        await session.refresh(folder)
        return folder


async def move_folder(
    *,
    business_id: uuid.UUID,
    user_id: uuid.UUID,
    folder_id: uuid.UUID,
    parent_folder_id: uuid.UUID | None,
    position: int,
) -> UserPersonalFolder:
    async with get_session() as session:
        folder = await _get_owned_folder(session, business_id=business_id, user_id=user_id, folder_id=folder_id)

        if parent_folder_id is not None:
            await _get_owned_folder(session, business_id=business_id, user_id=user_id, folder_id=parent_folder_id)

        all_folders = await session.execute(
            select(UserPersonalFolder.id, UserPersonalFolder.parent_folder_id).where(
                UserPersonalFolder.business_id == business_id, UserPersonalFolder.user_id == user_id
            )
        )
        parent_by_id = {row.id: row.parent_folder_id for row in all_folders}
        if _would_create_cycle(parent_by_id, folder_id, parent_folder_id):
            raise FolderCycle("cannot move a folder into itself or one of its own descendants")

        old_parent_id = folder.parent_folder_id
        moving_within_same_parent = old_parent_id == parent_folder_id

        folder.parent_folder_id = parent_folder_id
        session.add(folder)
        await session.flush()

        dest_siblings = await _sibling_folders(
            session, business_id=business_id, user_id=user_id, parent_folder_id=parent_folder_id
        )
        ordered_ids = [f.id for f in dest_siblings if f.id != folder_id]
        index = max(0, min(position, len(ordered_ids)))
        ordered_ids.insert(index, folder_id)
        positions = _renumber(ordered_ids)
        for f in dest_siblings:
            f.position = positions[f.id]
            session.add(f)

        if not moving_within_same_parent:
            old_siblings = await _sibling_folders(
                session, business_id=business_id, user_id=user_id, parent_folder_id=old_parent_id
            )
            old_positions = _renumber([f.id for f in old_siblings])
            for f in old_siblings:
                f.position = old_positions[f.id]
                session.add(f)

        await session.commit()
        await session.refresh(folder)
        return folder


async def delete_folder(*, business_id: uuid.UUID, user_id: uuid.UUID, folder_id: uuid.UUID) -> None:
    """Deletes the folder and its nested subfolders (DB `ON DELETE CASCADE`
    handles both the nested folders and every item row pointing at any of
    them). Files themselves are never touched — they simply become unplaced
    (root, alphabetical)."""
    async with get_session() as session:
        folder = await _get_owned_folder(session, business_id=business_id, user_id=user_id, folder_id=folder_id)
        parent_folder_id = folder.parent_folder_id
        await session.execute(delete(UserPersonalFolder).where(UserPersonalFolder.id == folder_id))
        await session.commit()

        siblings = await _sibling_folders(
            session, business_id=business_id, user_id=user_id, parent_folder_id=parent_folder_id
        )
        positions = _renumber([f.id for f in siblings])
        for f in siblings:
            f.position = positions[f.id]
            session.add(f)
        await session.commit()


async def upsert_item_placement(
    *,
    business_id: uuid.UUID,
    user_id: uuid.UUID,
    file_id: str,
    folder_id: uuid.UUID | None,
    position: int,
) -> UserPersonalFolderItem:
    async with get_session() as session:
        if folder_id is not None:
            await _get_owned_folder(session, business_id=business_id, user_id=user_id, folder_id=folder_id)

        stmt = (
            insert(UserPersonalFolderItem)
            .values(
                business_id=business_id,
                user_id=user_id,
                file_id=file_id,
                folder_id=folder_id,
                position=position,
            )
            .on_conflict_do_update(
                index_elements=[UserPersonalFolderItem.user_id, UserPersonalFolderItem.file_id],
                set_={"folder_id": folder_id, "position": position},
            )
            .returning(UserPersonalFolderItem)
        )
        result = await session.execute(stmt)
        item = result.scalar_one()
        await session.commit()

        dest_items = await _sibling_items(session, business_id=business_id, user_id=user_id, folder_id=folder_id)
        ordered_ids = [i.id for i in dest_items if i.id != item.id]
        index = max(0, min(position, len(ordered_ids)))
        ordered_ids.insert(index, item.id)
        positions = _renumber(ordered_ids)
        for i in dest_items:
            i.position = positions[i.id]
            session.add(i)

        await session.commit()
        await session.refresh(item)
        return item


async def remove_file_from_all_placements(*, business_id: uuid.UUID, file_id: str) -> None:
    """Business-wide cleanup (not user-scoped): deleting a file clears every
    user's placement of it. Called from `app.files.service.delete_file_and_storage`."""
    async with get_session() as session:
        await session.execute(
            delete(UserPersonalFolderItem).where(
                UserPersonalFolderItem.business_id == business_id, UserPersonalFolderItem.file_id == file_id
            )
        )
        await session.commit()
