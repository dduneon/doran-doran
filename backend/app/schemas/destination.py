from datetime import datetime

from pydantic import BaseModel

from app.schemas.user import UserResponse


class DestinationCreate(BaseModel):
    name: str
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    place_id: str | None = None
    category: str | None = None
    note: str | None = None


class DestinationUpdate(BaseModel):
    name: str | None = None
    note: str | None = None
    category: str | None = None


class DestinationResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    place_id: str | None = None
    category: str | None = None
    note: str | None = None
    added_by: str
    added_by_user: UserResponse
    created_at: datetime

    model_config = {"from_attributes": True}
