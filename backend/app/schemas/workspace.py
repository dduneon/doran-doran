from datetime import datetime

from pydantic import BaseModel

from app.models.workspace import MemberRole
from app.schemas.user import UserResponse


class WorkspaceCreate(BaseModel):
    title: str
    description: str | None = None
    destination_country: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class WorkspaceUpdate(BaseModel):
    title: str | None = None
    description: str | None = None
    destination_country: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None


class WorkspaceMemberResponse(BaseModel):
    user: UserResponse
    role: MemberRole
    joined_at: datetime

    model_config = {"from_attributes": True}


class WorkspaceResponse(BaseModel):
    id: str
    title: str
    description: str | None = None
    destination_country: str | None = None
    start_date: datetime | None = None
    end_date: datetime | None = None
    owner_id: str
    invite_code: str
    created_at: datetime
    members: list[WorkspaceMemberResponse] = []

    model_config = {"from_attributes": True}
