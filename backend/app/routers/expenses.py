from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.expense import Expense
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.schemas.expense import ExpenseCreate, ExpenseResponse, ExpenseSummary, ExpenseUpdate

router = APIRouter(prefix="/workspaces/{workspace_id}/expenses", tags=["expenses"])

EXPENSE_LOAD = [selectinload(Expense.paid_by_user)]


async def _require_member(workspace_id: str, user: User, db: AsyncSession):
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member")


@router.get("/", response_model=list[ExpenseResponse])
async def list_expenses(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(
        select(Expense).where(Expense.workspace_id == workspace_id).options(*EXPENSE_LOAD)
    )
    return result.scalars().all()


@router.post("/", response_model=ExpenseResponse, status_code=status.HTTP_201_CREATED)
async def create_expense(
    workspace_id: str,
    data: ExpenseCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    expense = Expense(**data.model_dump(), workspace_id=workspace_id, paid_by=current_user.id)
    db.add(expense)
    await db.flush()
    result = await db.execute(select(Expense).where(Expense.id == expense.id).options(*EXPENSE_LOAD))
    return result.scalar_one()


@router.patch("/{expense_id}", response_model=ExpenseResponse)
async def update_expense(
    workspace_id: str,
    expense_id: str,
    data: ExpenseUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.workspace_id == workspace_id).options(*EXPENSE_LOAD)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(expense, k, v)
    return expense


@router.delete("/{expense_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_expense(
    workspace_id: str,
    expense_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(
        select(Expense).where(Expense.id == expense_id, Expense.workspace_id == workspace_id)
    )
    expense = result.scalar_one_or_none()
    if not expense:
        raise HTTPException(status_code=404, detail="Expense not found")
    await db.delete(expense)


@router.get("/summary", response_model=ExpenseSummary)
async def get_summary(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(
        select(Expense).where(Expense.workspace_id == workspace_id).options(*EXPENSE_LOAD)
    )
    expenses = result.scalars().all()

    totals_by_currency: dict[str, float] = {}
    per_person: dict[str, dict[str, float]] = {}

    for e in expenses:
        cur = e.currency
        totals_by_currency[cur] = totals_by_currency.get(cur, 0) + e.amount

        participants = e.participant_ids or []
        if not participants:
            continue
        share = e.amount / len(participants)
        for uid in participants:
            per_person.setdefault(uid, {})
            per_person[uid][cur] = per_person[uid].get(cur, 0) + share
        per_person.setdefault(e.paid_by, {})
        per_person[e.paid_by][cur] = per_person[e.paid_by].get(cur, 0) - e.amount

    return ExpenseSummary(
        totals_by_currency=totals_by_currency,
        per_person=per_person,
        expenses=[ExpenseResponse.model_validate(e) for e in expenses],
    )
