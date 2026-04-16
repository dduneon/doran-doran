import uuid
from datetime import datetime

from sqlalchemy import DateTime, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Destination(Base):
    __tablename__ = "destinations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    lat: Mapped[float | None] = mapped_column(Float, nullable=True)
    lng: Mapped[float | None] = mapped_column(Float, nullable=True)
    place_id: Mapped[str | None] = mapped_column(String(200), nullable=True)  # Google Places ID
    category: Mapped[str | None] = mapped_column(String(50), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    added_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="destinations")
    added_by_user: Mapped["User"] = relationship("User", foreign_keys=[added_by])
    itinerary_items: Mapped[list["ItineraryItem"]] = relationship("ItineraryItem", back_populates="destination")
