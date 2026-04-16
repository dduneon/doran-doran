from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.itinerary import Accommodation, Flight, ItineraryDay, ItineraryItem
from app.models.user import User
from app.models.workspace import WorkspaceMember
from app.routers.websocket import manager
from app.schemas.itinerary import (
    AccommodationCreate,
    AccommodationResponse,
    FlightCreate,
    FlightResponse,
    ItineraryDayCreate,
    ItineraryDayResponse,
    ItineraryItemCreate,
    ItineraryItemResponse,
    ItineraryItemUpdate,
    ItineraryReorderRequest,
)

router = APIRouter(prefix="/workspaces/{workspace_id}", tags=["itineraries"])

DAY_LOAD = [
    selectinload(ItineraryDay.items).selectinload(ItineraryItem.destination),
]


async def _require_member(workspace_id: str, user: User, db: AsyncSession):
    result = await db.execute(
        select(WorkspaceMember).where(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user.id,
        )
    )
    if not result.scalar_one_or_none():
        raise HTTPException(status_code=403, detail="Not a member")


# --- Itinerary Days ---

@router.get("/itinerary", response_model=list[ItineraryDayResponse])
async def get_itinerary(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(
        select(ItineraryDay)
        .where(ItineraryDay.workspace_id == workspace_id)
        .options(*DAY_LOAD)
        .order_by(ItineraryDay.day_number)
    )
    return result.scalars().all()


@router.post("/itinerary/days", response_model=ItineraryDayResponse, status_code=status.HTTP_201_CREATED)
async def add_day(
    workspace_id: str,
    data: ItineraryDayCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    day = ItineraryDay(**data.model_dump(), workspace_id=workspace_id)
    db.add(day)
    await db.flush()
    result = await db.execute(select(ItineraryDay).where(ItineraryDay.id == day.id).options(*DAY_LOAD))
    return result.scalar_one()


@router.post("/itinerary/days/{day_id}/items", response_model=ItineraryItemResponse, status_code=status.HTTP_201_CREATED)
async def add_item(
    workspace_id: str,
    day_id: str,
    data: ItineraryItemCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    item = ItineraryItem(**data.model_dump(), day_id=day_id)
    db.add(item)
    await db.flush()
    await manager.broadcast(workspace_id, {"event": "itinerary_updated"})
    result = await db.execute(
        select(ItineraryItem).where(ItineraryItem.id == item.id).options(selectinload(ItineraryItem.destination))
    )
    return result.scalar_one()


@router.patch("/itinerary/items/{item_id}", response_model=ItineraryItemResponse)
async def update_item(
    workspace_id: str,
    item_id: str,
    data: ItineraryItemUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(
        select(ItineraryItem).where(ItineraryItem.id == item_id).options(selectinload(ItineraryItem.destination))
    )
    item = result.scalar_one_or_none()
    if not item:
        raise HTTPException(status_code=404, detail="Item not found")
    for k, v in data.model_dump(exclude_none=True).items():
        setattr(item, k, v)
    await manager.broadcast(workspace_id, {"event": "itinerary_updated"})
    return item


@router.post("/itinerary/reorder")
async def reorder_items(
    workspace_id: str,
    data: ItineraryReorderRequest,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    for entry in data.items:
        result = await db.execute(select(ItineraryItem).where(ItineraryItem.id == entry["id"]))
        item = result.scalar_one_or_none()
        if item:
            item.day_id = entry["day_id"]
            item.order = entry["order"]
    await manager.broadcast(workspace_id, {"event": "itinerary_updated"})
    return {"message": "Reordered"}


# --- Flights ---

@router.get("/flights", response_model=list[FlightResponse])
async def list_flights(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(select(Flight).where(Flight.workspace_id == workspace_id))
    return result.scalars().all()


@router.post("/flights", response_model=FlightResponse, status_code=status.HTTP_201_CREATED)
async def add_flight(
    workspace_id: str,
    data: FlightCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    flight = Flight(**data.model_dump(), workspace_id=workspace_id)
    db.add(flight)
    return flight


@router.delete("/flights/{flight_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_flight(
    workspace_id: str,
    flight_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(select(Flight).where(Flight.id == flight_id, Flight.workspace_id == workspace_id))
    flight = result.scalar_one_or_none()
    if not flight:
        raise HTTPException(status_code=404, detail="Flight not found")
    await db.delete(flight)


# --- Accommodations ---

@router.get("/accommodations", response_model=list[AccommodationResponse])
async def list_accommodations(
    workspace_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(select(Accommodation).where(Accommodation.workspace_id == workspace_id))
    return result.scalars().all()


@router.post("/accommodations", response_model=AccommodationResponse, status_code=status.HTTP_201_CREATED)
async def add_accommodation(
    workspace_id: str,
    data: AccommodationCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    acc = Accommodation(**data.model_dump(), workspace_id=workspace_id)
    db.add(acc)
    return acc


@router.delete("/accommodations/{accommodation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_accommodation(
    workspace_id: str,
    accommodation_id: str,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await _require_member(workspace_id, current_user, db)
    result = await db.execute(
        select(Accommodation).where(Accommodation.id == accommodation_id, Accommodation.workspace_id == workspace_id)
    )
    acc = result.scalar_one_or_none()
    if not acc:
        raise HTTPException(status_code=404, detail="Accommodation not found")
    await db.delete(acc)
