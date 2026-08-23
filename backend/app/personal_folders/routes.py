"""Personal-folder endpoints: every signed-in user (not just admins) organizes
their own view of the shared file list (Sage-MVP-Functional-Spec §4.2.7, §4.4)."""

from __future__ import annotations

import uuid

from fastapi import APIRouter, HTTPException, status
from pydantic import BaseModel

from app.auth import CurrentUser
from app.models import UserPersonalFolder, UserPersonalFolderItem
from app.personal_folders import (
    FolderCycle,
    FolderNotFound,
    create_folder,
    delete_folder,
    list_tree,
    move_folder,
    rename_folder,
    upsert_item_placement,
)

router = APIRouter(prefix="/me/folders", tags=["personal-folders"])


class FolderOut(BaseModel):
    id: uuid.UUID
    folder_name: str
    parent_folder_id: uuid.UUID | None
    position: int


class ItemOut(BaseModel):
    file_id: str
    folder_id: uuid.UUID | None
    position: int


class TreeResponse(BaseModel):
    folders: list[FolderOut]
    items: list[ItemOut]


class CreateFolderRequest(BaseModel):
    folder_name: str
    parent_folder_id: uuid.UUID | None = None


class RenameFolderRequest(BaseModel):
    folder_name: str


class MoveFolderRequest(BaseModel):
    parent_folder_id: uuid.UUID | None = None
    position: int = 0


class UpsertItemRequest(BaseModel):
    file_id: str
    folder_id: uuid.UUID | None = None
    position: int = 0


def _folder_out(folder: UserPersonalFolder) -> FolderOut:
    return FolderOut(
        id=folder.id,
        folder_name=folder.folder_name,
        parent_folder_id=folder.parent_folder_id,
        position=folder.position,
    )


def _item_out(item: UserPersonalFolderItem) -> ItemOut:
    return ItemOut(file_id=item.file_id, folder_id=item.folder_id, position=item.position)


@router.get("", response_model=TreeResponse)
async def get_tree(user: CurrentUser) -> TreeResponse:
    folders, items = await list_tree(business_id=user.business_id, user_id=user.user_id)
    return TreeResponse(folders=[_folder_out(f) for f in folders], items=[_item_out(i) for i in items])


@router.post("", response_model=FolderOut, status_code=status.HTTP_201_CREATED)
async def post_folder(user: CurrentUser, payload: CreateFolderRequest) -> FolderOut:
    try:
        folder = await create_folder(
            business_id=user.business_id,
            user_id=user.user_id,
            folder_name=payload.folder_name,
            parent_folder_id=payload.parent_folder_id,
        )
    except FolderNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="parent folder not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc
    return _folder_out(folder)


@router.put("/items", response_model=ItemOut)
async def put_item(user: CurrentUser, payload: UpsertItemRequest) -> ItemOut:
    try:
        item = await upsert_item_placement(
            business_id=user.business_id,
            user_id=user.user_id,
            file_id=payload.file_id,
            folder_id=payload.folder_id,
            position=payload.position,
        )
    except FolderNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="folder not found") from exc
    return _item_out(item)


@router.put("/{folder_id}", response_model=FolderOut)
async def put_folder(user: CurrentUser, folder_id: uuid.UUID, payload: RenameFolderRequest) -> FolderOut:
    try:
        folder = await rename_folder(
            business_id=user.business_id,
            user_id=user.user_id,
            folder_id=folder_id,
            folder_name=payload.folder_name,
        )
    except FolderNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="folder not found") from exc
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc

    return _folder_out(folder)


@router.put("/{folder_id}/move", response_model=FolderOut)
async def put_folder_move(user: CurrentUser, folder_id: uuid.UUID, payload: MoveFolderRequest) -> FolderOut:
    try:
        folder = await move_folder(
            business_id=user.business_id,
            user_id=user.user_id,
            folder_id=folder_id,
            parent_folder_id=payload.parent_folder_id,
            position=payload.position,
        )
    except FolderNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="folder not found") from exc
    except FolderCycle as exc:
        raise HTTPException(status_code=status.HTTP_422_UNPROCESSABLE_CONTENT, detail=str(exc)) from exc

    return _folder_out(folder)


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_folder_route(user: CurrentUser, folder_id: uuid.UUID) -> None:
    try:
        await delete_folder(business_id=user.business_id, user_id=user.user_id, folder_id=folder_id)
    except FolderNotFound as exc:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="folder not found") from exc
