import enum
import uuid
from datetime import date, datetime

from sqlalchemy import JSON, Date, DateTime, Enum, Float, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class ExpenseCategory(str, enum.Enum):
    TRANSPORT = "transport"
    FOOD = "food"
    ACCOMMODATION = "accommodation"
    ACTIVITY = "activity"
    SHOPPING = "shopping"
    OTHER = "other"


class Expense(Base):
    __tablename__ = "expenses"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    workspace_id: Mapped[str] = mapped_column(String(36), ForeignKey("workspaces.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(300), nullable=False)
    amount: Mapped[float] = mapped_column(Float, nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="KRW")
    category: Mapped[ExpenseCategory] = mapped_column(Enum(ExpenseCategory), default=ExpenseCategory.OTHER)
    paid_by: Mapped[str] = mapped_column(String(36), ForeignKey("users.id"), nullable=False)
    participant_ids: Mapped[list] = mapped_column(JSON, default=list)
    date: Mapped[date | None] = mapped_column(Date, nullable=True)
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    workspace: Mapped["Workspace"] = relationship("Workspace", back_populates="expenses")
    paid_by_user: Mapped["User"] = relationship("User", back_populates="expenses_paid")
