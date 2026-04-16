from sqlalchemy.ext.asyncio import AsyncSession

from app.models.notification import Notification


class NotificationService:
    @staticmethod
    async def create(
        db: AsyncSession,
        user_id: str,
        type: str,
        title: str,
        workspace_id: str | None = None,
        body: str | None = None,
        related_url: str | None = None,
    ) -> Notification:
        notification = Notification(
            user_id=user_id,
            workspace_id=workspace_id,
            type=type,
            title=title,
            body=body,
            related_url=related_url,
        )
        db.add(notification)
        return notification
