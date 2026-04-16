import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class MemberRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"


class Workspace(Base):
    __tablename__ = "workspaces"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    destination_country: Mapped[str | None] = mapped_column(String(100), nullable=True)
    start_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    end_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    owner_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    invite_code: Mapped[str] = mapped_column(
        String(20), unique=True, default=lambda: str(uuid.uuid4())[:8].upper()
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    owner: Mapped["User"] = relationship("User", foreign_keys=[owner_id])
    members: Mapped[list["WorkspaceMember"]] = relationship("WorkspaceMember", back_populates="workspace")
    destinations: Mapped[list["Destination"]] = relationship("Destination", back_populates="workspace")
    itinerary_days: Mapped[list["ItineraryDay"]] = relationship(
        "ItineraryDay", back_populates="workspace", order_by="ItineraryDay.day_number"
    )
    flights: Mapped[list["Flight"]] = relationship("Flight", back_populates="workspace")
    accommodations: Mapped[list["Accommodation"]] = relationship("Accommodation", back_populates="workspace")
    notifications: Mapped[list["Notification"]] = relationship("Notification", back_populates="workspace")
    expenses: Mapped[list["Expense"]] = relationship("Expense", back_populates="workspace")


class WorkspaceMember(Base):
    __tablename__ = "workspace_members"

    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), primary_key=True)
    user_id: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), primary_key=True)
    role: Mapped[MemberRole] = mapped_column(Enum(MemberRole), default=MemberRole.MEMBER)
    joined_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="members")
    user: Mapped["User"] = relationship("User", back_populates="memberships")
