from datetime import date, datetime

from pydantic import BaseModel

from app.models.expense import ExpenseCategory
from app.schemas.user import UserResponse


class ExpenseCreate(BaseModel):
    title: str
    amount: float
    currency: str = "KRW"
    category: ExpenseCategory = ExpenseCategory.OTHER
    participant_ids: list[str] = []
    date: date | None = None
    note: str | None = None


class ExpenseUpdate(BaseModel):
    title: str | None = None
    amount: float | None = None
    currency: str | None = None
    category: ExpenseCategory | None = None
    participant_ids: list[str] | None = None
    date: date | None = None
    note: str | None = None


class ExpenseResponse(BaseModel):
    id: str
    workspace_id: str
    title: str
    amount: float
    currency: str
    category: ExpenseCategory
    paid_by: str
    paid_by_user: UserResponse
    participant_ids: list[str]
    date: date | None = None
    note: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class ExpenseSummary(BaseModel):
    total_amount: float
    currency: str
    per_person: dict[str, float]  # user_id -> amount owed
    expenses: list[ExpenseResponse]
