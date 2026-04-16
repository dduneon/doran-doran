import enum
import uuid
from datetime import date, datetime

from sqlalchemy import Date, DateTime, Enum, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class FlightType(str, enum.Enum):
    OUTBOUND = "outbound"
    RETURN = "return"
    CONNECTING = "connecting"


class ItineraryDay(Base):
    __tablename__ = "itinerary_days"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    day_number: Mapped[int] = mapped_column(Integer, nullable=False)
    date: Mapped[date | None] = mapped_column(Date, nullable=True)

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="itinerary_days")
    items: Mapped[list["ItineraryItem"]] = relationship(
        "ItineraryItem", back_populates="day", order_by="ItineraryItem.order"
    )


class ItineraryItem(Base):
    __tablename__ = "itinerary_items"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    day_id: Mapped[str] = mapped_column(String(36), ForeignKey("itinerary_days.id"), nullable=False)
    destination_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("destinations.id"), nullable=True
    )
    order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)

    day: Mapped["ItineraryDay"] = relationship("ItineraryDay", back_populates="items")
    destination: Mapped["Destination | None"] = relationship("Destination", back_populates="itinerary_items")


class Flight(Base):
    __tablename__ = "flights"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    flight_number: Mapped[str] = mapped_column(String(20), nullable=False)
    airline: Mapped[str | None] = mapped_column(String(100), nullable=True)
    departure_airport: Mapped[str] = mapped_column(String(10), nullable=False)
    arrival_airport: Mapped[str] = mapped_column(String(10), nullable=False)
    departure_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    arrival_time: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    terminal: Mapped[str | None] = mapped_column(String(20), nullable=True)
    type: Mapped[FlightType] = mapped_column(Enum(FlightType), default=FlightType.OUTBOUND)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="flights")


class Accommodation(Base):
    __tablename__ = "accommodations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(300), nullable=False)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    check_in: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    check_out: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    confirmation_number: Mapped[str | None] = mapped_column(String(100), nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="accommodations")
