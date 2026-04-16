from datetime import datetime

from pydantic import BaseModel


class NotificationResponse(BaseModel):
    id: str
    user_id: str
    workspace_id: str | None = None
    type: str
    title: str
    body: str | None = None
    is_read: bool
    related_url: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class NotificationCreate(BaseModel):
    user_id: str
    workspace_id: str | None = None
    type: str
    title: str
    body: str | None = None
    related_url: str | None = None
