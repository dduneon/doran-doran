from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.destination import Destination
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.routers.websocket import manager
from app.schemas.destination import DestinationCreate, DestinationResponse, DestinationUpdate
from app.services.notification import NotificationService

router = APIRouter(prefix="/workspaces/{workspace_id}/destinations", tags=["destinations"])

DEST_LOAD = [selectinload(Destination.added_by_user)]


async def _require_member(workspace_id: str, user: User, db: AsyncSession):
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member")


@router.get("/", response_model=list[DestinationResponse])
async def list_destinations(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(
        select(Destination)
        .where(Destination.workspace_id == workspace_id)
        .options(*DEST_LOAD)
    )
    return result.scalars().all()


@router.post("/", response_model=DestinationResponse, status_code=status.HTTP_201_CREATED)
async def create_destination(
    workspace_id: str,
    data: DestinationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    dest = Destination(**data.model_dump(), workspace_id=workspace_id, added_by=current_user.id)
    db.add(dest)
    await db.flush()

    result = await db.execute(select(Destination).where(Destination.id == dest.id).options(*DEST_LOAD))
    dest = result.scalar_one()

    await manager.broadcast(workspace_id, {"event": "destination_added", "data": DestinationResponse.model_validate(dest).model_dump()})
    return dest


@router.patch("/{destination_id}", response_model=DestinationResponse)
async def update_destination(
    workspace_id: str,
    destination_id: str,
    data: DestinationUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(
        select(Destination)
        .where(Destination.id == destination_id, Destination.workspace_id == workspace_id)
        .options(*DEST_LOAD)
    )
    dest = result.scalar_one_or_none()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")

    for k, v in data.model_dump(exclude_none=True).items():
        setattr(dest, k, v)

    await manager.broadcast(workspace_id, {"event": "destination_updated", "data": DestinationResponse.model_validate(dest).model_dump()})
    return dest


@router.delete("/{destination_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_destination(
    workspace_id: str,
    destination_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(
        select(Destination).where(
            Destination.id == destination_id, Destination.workspace_id == workspace_id
        )
    )
    dest = result.scalar_one_or_none()
    if not dest:
        raise HTTPException(status_code=404, detail="Destination not found")
    await db.delete(dest)
    await manager.broadcast(workspace_id, {"event": "destination_removed", "data": {"id": destination_id}})
