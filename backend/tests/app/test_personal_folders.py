"""Personal folder hierarchy acceptance: purely per-user visual reorganization
of the shared file list — never consulted by retrieval, never leaks across
users or businesses, and never deletes real files (Sage-MVP-Functional-Spec
§4.4, §4.7)."""

from __future__ import annotations

import uuid

import pytest
from httpx import ASGITransport, AsyncClient

from app.auth import hash_pin, issue_token
from app.db import get_session, new_business
from app.files.service import delete_file_and_storage
from app.main import app
from app.models import File, User
from app.personal_folders import (
    FolderCycle,
    FolderNotFound,
    _renumber,
    _would_create_cycle,
    create_folder,
    delete_folder,
    list_tree,
    move_folder,
    remove_file_from_all_placements,
    rename_folder,
    upsert_item_placement,
)

# --- pure helpers, no DB -----------------------------------------------------


def test_would_create_cycle_none_parent_is_never_a_cycle():
    folder_id = uuid.uuid4()
    assert _would_create_cycle({}, folder_id, None) is False


def test_would_create_cycle_self_parent_is_a_cycle():
    folder_id = uuid.uuid4()
    assert _would_create_cycle({}, folder_id, folder_id) is True


def test_would_create_cycle_detects_indirect_cycle():
    root, child, grandchild = uuid.uuid4(), uuid.uuid4(), uuid.uuid4()
    parent_by_id = {root: None, child: root, grandchild: child}
    # Reparenting `root` under its own grandchild would create a cycle.
    assert _would_create_cycle(parent_by_id, root, grandchild) is True


def test_would_create_cycle_false_for_unrelated_move():
    a, b = uuid.uuid4(), uuid.uuid4()
    parent_by_id = {a: None, b: None}
    assert _would_create_cycle(parent_by_id, a, b) is False


def test_renumber_produces_contiguous_positions():
    ids = [uuid.uuid4() for _ in range(3)]
    positions = _renumber(ids)
    assert [positions[i] for i in ids] == [0, 1, 2]


# --- service layer ------------------------------------------------------------


async def _create_user(business_id: uuid.UUID, *, username: str = "staff") -> User:
    async with get_session() as session:
        user = User(business_id=business_id, username=username, pin_hash=hash_pin("1234"), role="staff")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        return user


async def _create_file_row(business_id: uuid.UUID, *, file_id: str, filename: str = "doc.pdf") -> File:
    async with get_session() as session:
        file_row = File(business_id=business_id, file_id=file_id, filename=filename, status="indexed")
        session.add(file_row)
        await session.commit()
        await session.refresh(file_row)
        return file_row


async def test_create_folder_at_root():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)

    folder = await create_folder(business_id=business_id, user_id=user.id, folder_name="Policies", parent_folder_id=None)
    assert folder.folder_name == "Policies"
    assert folder.parent_folder_id is None
    assert folder.position == 0


async def test_create_nested_folder_appends_after_siblings():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    parent = await create_folder(business_id=business_id, user_id=user.id, folder_name="Parent", parent_folder_id=None)

    await create_folder(business_id=business_id, user_id=user.id, folder_name="Child 1", parent_folder_id=parent.id)
    child_2 = await create_folder(
        business_id=business_id, user_id=user.id, folder_name="Child 2", parent_folder_id=parent.id
    )
    assert child_2.position == 1


async def test_create_folder_rejects_unknown_parent():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    with pytest.raises(FolderNotFound):
        await create_folder(
            business_id=business_id, user_id=user.id, folder_name="Orphan", parent_folder_id=uuid.uuid4()
        )


async def test_rename_folder():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    folder = await create_folder(business_id=business_id, user_id=user.id, folder_name="Old", parent_folder_id=None)

    renamed = await rename_folder(business_id=business_id, user_id=user.id, folder_id=folder.id, folder_name="New")
    assert renamed.folder_name == "New"


async def test_move_folder_reparents_and_repositions():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    a = await create_folder(business_id=business_id, user_id=user.id, folder_name="A", parent_folder_id=None)
    b = await create_folder(business_id=business_id, user_id=user.id, folder_name="B", parent_folder_id=None)

    moved = await move_folder(business_id=business_id, user_id=user.id, folder_id=b.id, parent_folder_id=a.id, position=0)
    assert moved.parent_folder_id == a.id
    assert moved.position == 0


async def test_move_folder_rejects_reparenting_into_own_descendant():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    parent = await create_folder(business_id=business_id, user_id=user.id, folder_name="Parent", parent_folder_id=None)
    child = await create_folder(
        business_id=business_id, user_id=user.id, folder_name="Child", parent_folder_id=parent.id
    )

    with pytest.raises(FolderCycle):
        await move_folder(
            business_id=business_id, user_id=user.id, folder_id=parent.id, parent_folder_id=child.id, position=0
        )


async def test_move_folder_rejects_reparenting_onto_self():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    folder = await create_folder(business_id=business_id, user_id=user.id, folder_name="A", parent_folder_id=None)

    with pytest.raises(FolderCycle):
        await move_folder(
            business_id=business_id, user_id=user.id, folder_id=folder.id, parent_folder_id=folder.id, position=0
        )


async def test_delete_folder_cascades_to_nested_folder_and_items_but_never_files():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    await _create_file_row(business_id, file_id="file-1")

    parent = await create_folder(business_id=business_id, user_id=user.id, folder_name="Parent", parent_folder_id=None)
    child = await create_folder(
        business_id=business_id, user_id=user.id, folder_name="Child", parent_folder_id=parent.id
    )
    await upsert_item_placement(business_id=business_id, user_id=user.id, file_id="file-1", folder_id=child.id, position=0)

    await delete_folder(business_id=business_id, user_id=user.id, folder_id=parent.id)

    folders, items = await list_tree(business_id=business_id, user_id=user.id)
    assert folders == []
    # The placement row for the deleted (nested) folder is gone too — the
    # file is simply unplaced now, never deleted itself.
    assert items == []

    async with get_session() as session:
        from sqlalchemy import select

        result = await session.execute(select(File).where(File.business_id == business_id, File.file_id == "file-1"))
        assert result.scalar_one_or_none() is not None


async def test_delete_folder_rejects_unknown_folder():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    with pytest.raises(FolderNotFound):
        await delete_folder(business_id=business_id, user_id=user.id, folder_id=uuid.uuid4())


async def test_upsert_item_placement_creates_then_updates_same_row():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    await _create_file_row(business_id, file_id="file-1")
    folder = await create_folder(business_id=business_id, user_id=user.id, folder_name="Docs", parent_folder_id=None)

    first = await upsert_item_placement(
        business_id=business_id, user_id=user.id, file_id="file-1", folder_id=folder.id, position=0
    )
    second = await upsert_item_placement(
        business_id=business_id, user_id=user.id, file_id="file-1", folder_id=None, position=0
    )
    assert first.id == second.id  # same row, updated in place — not a duplicate
    assert second.folder_id is None


async def test_upsert_item_placement_rejects_unknown_folder():
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    await _create_file_row(business_id, file_id="file-1")
    with pytest.raises(FolderNotFound):
        await upsert_item_placement(
            business_id=business_id, user_id=user.id, file_id="file-1", folder_id=uuid.uuid4(), position=0
        )


async def test_remove_file_from_all_placements_clears_every_users_row():
    business_id = await new_business(name="Store A")
    alice = await _create_user(business_id, username="alice")
    bob = await _create_user(business_id, username="bob")
    await _create_file_row(business_id, file_id="file-1")

    folder_a = await create_folder(business_id=business_id, user_id=alice.id, folder_name="A", parent_folder_id=None)
    folder_b = await create_folder(business_id=business_id, user_id=bob.id, folder_name="B", parent_folder_id=None)
    await upsert_item_placement(business_id=business_id, user_id=alice.id, file_id="file-1", folder_id=folder_a.id, position=0)
    await upsert_item_placement(business_id=business_id, user_id=bob.id, file_id="file-1", folder_id=folder_b.id, position=0)

    await remove_file_from_all_placements(business_id=business_id, file_id="file-1")

    _, items_a = await list_tree(business_id=business_id, user_id=alice.id)
    _, items_b = await list_tree(business_id=business_id, user_id=bob.id)
    assert items_a == []
    assert items_b == []


async def test_deleting_a_file_clears_its_personal_folder_placements():
    """Integration point: app.files.service.delete_file_and_storage must call
    remove_file_from_all_placements (Sage-MVP-Functional-Spec §4.7)."""
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    await _create_file_row(business_id, file_id="file-1")
    folder = await create_folder(business_id=business_id, user_id=user.id, folder_name="Docs", parent_folder_id=None)
    await upsert_item_placement(business_id=business_id, user_id=user.id, file_id="file-1", folder_id=folder.id, position=0)

    await delete_file_and_storage(business_id=business_id, file_id="file-1")

    _, items = await list_tree(business_id=business_id, user_id=user.id)
    assert items == []
    # The folder itself survives — only the file's placement in it is gone.
    folders, _ = await list_tree(business_id=business_id, user_id=user.id)
    assert len(folders) == 1


async def test_folders_and_items_isolated_per_user_within_the_same_business():
    business_id = await new_business(name="Store A")
    alice = await _create_user(business_id, username="alice")
    bob = await _create_user(business_id, username="bob")

    await create_folder(business_id=business_id, user_id=alice.id, folder_name="Alice's folder", parent_folder_id=None)

    folders_alice, _ = await list_tree(business_id=business_id, user_id=alice.id)
    folders_bob, _ = await list_tree(business_id=business_id, user_id=bob.id)
    assert len(folders_alice) == 1
    assert folders_bob == []


async def test_folders_isolated_per_business():
    business_a = await new_business(name="Store A")
    business_b = await new_business(name="Store B")
    user_a = await _create_user(business_a)
    user_b = await _create_user(business_b)

    await create_folder(business_id=business_a, user_id=user_a.id, folder_name="A's folder", parent_folder_id=None)

    folders_a, _ = await list_tree(business_id=business_a, user_id=user_a.id)
    folders_b, _ = await list_tree(business_id=business_b, user_id=user_b.id)
    assert len(folders_a) == 1
    assert folders_b == []


# --- routes --------------------------------------------------------------------


@pytest.fixture
async def client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c


async def test_get_tree_route_empty_initially(client: AsyncClient):
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    headers = {"Authorization": f"Bearer {issue_token(user)}"}

    resp = await client.get("/me/folders", headers=headers)
    assert resp.status_code == 200
    assert resp.json() == {"folders": [], "items": []}


async def test_post_folder_route_creates(client: AsyncClient):
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    headers = {"Authorization": f"Bearer {issue_token(user)}"}

    resp = await client.post("/me/folders", headers=headers, json={"folder_name": "Policies"})
    assert resp.status_code == 201
    body = resp.json()
    assert body["folder_name"] == "Policies"
    assert body["parent_folder_id"] is None


async def test_put_folder_route_renames(client: AsyncClient):
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    headers = {"Authorization": f"Bearer {issue_token(user)}"}

    created = (await client.post("/me/folders", headers=headers, json={"folder_name": "Old"})).json()
    resp = await client.put(f"/me/folders/{created['id']}", headers=headers, json={"folder_name": "New"})
    assert resp.status_code == 200
    assert resp.json()["folder_name"] == "New"


async def test_put_folder_move_route_reparents(client: AsyncClient):
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    headers = {"Authorization": f"Bearer {issue_token(user)}"}

    parent = (await client.post("/me/folders", headers=headers, json={"folder_name": "Parent"})).json()
    child = (await client.post("/me/folders", headers=headers, json={"folder_name": "Child"})).json()

    resp = await client.put(
        f"/me/folders/{child['id']}/move", headers=headers, json={"parent_folder_id": parent["id"], "position": 0}
    )
    assert resp.status_code == 200
    assert resp.json()["parent_folder_id"] == parent["id"]


async def test_put_folder_move_route_rejects_cycle(client: AsyncClient):
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    headers = {"Authorization": f"Bearer {issue_token(user)}"}

    parent = (await client.post("/me/folders", headers=headers, json={"folder_name": "Parent"})).json()
    child = (
        await client.post(
            "/me/folders", headers=headers, json={"folder_name": "Child", "parent_folder_id": parent["id"]}
        )
    ).json()

    resp = await client.put(
        f"/me/folders/{parent['id']}/move", headers=headers, json={"parent_folder_id": child["id"], "position": 0}
    )
    assert resp.status_code == 422


async def test_delete_folder_route_unplaces_files_without_deleting_them(client: AsyncClient):
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    await _create_file_row(business_id, file_id="file-1")
    headers = {"Authorization": f"Bearer {issue_token(user)}"}

    folder = (await client.post("/me/folders", headers=headers, json={"folder_name": "Docs"})).json()
    await client.put("/me/folders/items", headers=headers, json={"file_id": "file-1", "folder_id": folder["id"], "position": 0})

    resp = await client.delete(f"/me/folders/{folder['id']}", headers=headers)
    assert resp.status_code == 204

    tree = (await client.get("/me/folders", headers=headers)).json()
    assert tree == {"folders": [], "items": []}


async def test_put_item_route_upserts_placement(client: AsyncClient):
    business_id = await new_business(name="Store A")
    user = await _create_user(business_id)
    await _create_file_row(business_id, file_id="file-1")
    headers = {"Authorization": f"Bearer {issue_token(user)}"}

    folder = (await client.post("/me/folders", headers=headers, json={"folder_name": "Docs"})).json()
    resp = await client.put(
        "/me/folders/items", headers=headers, json={"file_id": "file-1", "folder_id": folder["id"], "position": 0}
    )
    assert resp.status_code == 200
    assert resp.json() == {"file_id": "file-1", "folder_id": folder["id"], "position": 0}


async def test_personal_folders_isolated_per_user_at_the_route_level(client: AsyncClient):
    business_id = await new_business(name="Store A")
    alice = await _create_user(business_id, username="alice")
    bob = await _create_user(business_id, username="bob")
    headers_a = {"Authorization": f"Bearer {issue_token(alice)}"}
    headers_b = {"Authorization": f"Bearer {issue_token(bob)}"}

    await client.post("/me/folders", headers=headers_a, json={"folder_name": "Alice only"})

    tree_b = (await client.get("/me/folders", headers=headers_b)).json()
    assert tree_b == {"folders": [], "items": []}


async def test_personal_folders_isolated_per_business_at_the_route_level(client: AsyncClient):
    business_a = await new_business(name="Store A")
    business_b = await new_business(name="Store B")
    user_a = await _create_user(business_a)
    user_b = await _create_user(business_b)
    headers_a = {"Authorization": f"Bearer {issue_token(user_a)}"}
    headers_b = {"Authorization": f"Bearer {issue_token(user_b)}"}

    await client.post("/me/folders", headers=headers_a, json={"folder_name": "Store A only"})

    tree_b = (await client.get("/me/folders", headers=headers_b)).json()
    assert tree_b == {"folders": [], "items": []}
