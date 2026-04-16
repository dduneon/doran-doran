from datetime import timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.itinerary import ItineraryDay
from app.models.user import User
from app.models.workspace import MemberRole, Workspace, WorkspaceMember
from app.schemas.workspace import WorkspaceCreate, WorkspaceResponse, WorkspaceUpdate
from app.services.notification import NotificationService

router = APIRouter(prefix="/workspaces", tags=["workspaces"])

WORKSPACE_LOAD = [
    selectinload(Workspace.members).selectinload(WorkspaceMember.user),
]


async def _get_workspace(workspace_id: str, db: AsyncSession) -> Workspace:
    result = await db.execute(
        select(Workspace).where(Workspace.id == workspace_id).options(*WORKSPACE_LOAD)
    )
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="Workspace not found")
    return ws


async def _require_member(workspace_id: str, user: User, db: AsyncSession) -> WorkspaceMember:
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    member = result.scalar_one_or_none()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this workspace")
    return member


async def _sync_itinerary_days(ws: Workspace, db: AsyncSession):
    """start_date/end_date 기준으로 누락된 ItineraryDay를 자동 생성."""
    if not ws.start_date:
        return
    end = ws.end_date or ws.start_date
    num_days = (end.date() - ws.start_date.date()).days + 1
    existing = await db.execute(
        select(ItineraryDay.day_number).where(ItineraryDay.workspace_id == ws.id)
    )
    existing_numbers = {row[0] for row in existing.all()}
    for i in range(1, num_days + 1):
        if i not in existing_numbers:
            db.add(ItineraryDay(
                workspace_id=ws.id,
                day_number=i,
                date=(ws.start_date.date() + timedelta(days=i - 1)),
            ))


@router.post("/", response_model=WorkspaceResponse, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    data: WorkspaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = Workspace(**data.model_dump(), owner_id=current_user.id)
    db.add(ws)
    await db.flush()
    member = WorkspaceMember(workspace_id=ws.id, user_id=current_user.id, role=MemberRole.ADMIN)
    db.add(member)
    await db.flush()
    await _sync_itinerary_days(ws, db)
    return await _get_workspace(ws.id, db)


@router.get("/", response_model=list[WorkspaceResponse])
async def list_workspaces(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace)
        .join(WorkspaceMember, WorkspaceMember.workspace_id == Workspace.id)
        .where(WorkspaceMember.user_id == current_user.id)
        .options(*WORKSPACE_LOAD)
    )
    return result.scalars().all()


@router.get("/{workspace_id}", response_model=WorkspaceResponse)
async def get_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    return await _get_workspace(workspace_id, db)


@router.patch("/{workspace_id}", response_model=WorkspaceResponse)
async def update_workspace(
    workspace_id: str,
    data: WorkspaceUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    member = await _require_member(workspace_id, current_user, db)
    if member.role != MemberRole.ADMIN:
        raise HTTPException(status_code=403, detail="Admin only")
    ws = await _get_workspace(workspace_id, db)
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(ws, k, v)

    await _sync_itinerary_days(ws, db)
    return ws


@router.delete("/{workspace_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_workspace(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = await _get_workspace(workspace_id, db)
    if ws.owner_id != current_user.id:
        raise HTTPException(status_code=403, detail="Owner only")
    await db.delete(ws)


@router.post("/join-by-code")
async def join_by_invite_code(
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Workspace).where(Workspace.invite_code == invite_code).options(*WORKSPACE_LOAD)
    )
    ws = result.scalar_one_or_none()
    if not ws:
        raise HTTPException(status_code=404, detail="유효하지 않은 초대 코드입니다.")

    existing = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == ws.id,
            WorkspaceMember.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="이미 참여한 워크스페이스입니다.")

    db.add(WorkspaceMember(workspace_id=ws.id, user_id=current_user.id))
    await db.flush()

    for m in ws.members:
        await NotificationService.create(
            db,
            user_id=m.user_id,
            workspace_id=ws.id,
            type="member_joined",
            title=f"{current_user.name}님이 워크스페이스에 참여했습니다.",
            related_url=f"/workspaces/{ws.id}",
        )

    return await _get_workspace(ws.id, db)


@router.post("/{workspace_id}/join")
async def join_workspace(
    workspace_id: str,
    invite_code: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    ws = await _get_workspace(workspace_id, db)
    if ws.invite_code != invite_code:
        raise HTTPException(status_code=400, detail="Invalid invite code")

    existing = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == current_user.id,
        )
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Already a member")

    db.add(WorkspaceMember(workspace_id=workspace_id, user_id=current_user.id))
    await db.flush()

    for m in ws.members:
        await NotificationService.create(
            db,
            user_id=m.user_id,
            workspace_id=workspace_id,
            type="member_joined",
            title=f"{current_user.name}님이 워크스페이스에 참여했습니다.",
            related_url=f"/workspaces/{workspace_id}",
        )

    return {"message": "Joined successfully"}
