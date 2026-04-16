from datetime import date as Date_, datetime

from pydantic import BaseModel

from app.models.itinerary import FlightType
from app.schemas.destination import DestinationResponse


class ItineraryItemCreate(BaseModel):
    destination_id: str | None = None
    order: int = 0
    duration_minutes: int | None = None
    note: str | None = None


class ItineraryItemUpdate(BaseModel):
    order: int | None = None
    duration_minutes: int | None = None
    note: str | None = None


class ItineraryItemResponse(BaseModel):
    id: str
    day_id: str
    destination_id: str | None = None
    destination: DestinationResponse | None = None
    order: int
    duration_minutes: int | None = None
    note: str | None = None

    model_config = {"from_attributes": True}


class ItineraryDayCreate(BaseModel):
    day_number: int
    date: Date_ | None = None


class ItineraryDayResponse(BaseModel):
    id: str
    workspace_id: str
    day_number: int
    date: Date_ | None = None
    items: list[ItineraryItemResponse] = []

    model_config = {"from_attributes": True}


class ItineraryReorderRequest(BaseModel):
    items: list[dict]  # [{"id": str, "day_id": str, "order": int}]


class FlightCreate(BaseModel):
    flight_number: str
    airline: str | None = None
    departure_airport: str
    departure_lat: float | None = None
    departure_lng: float | None = None
    departure_place_id: str | None = None
    arrival_airport: str
    arrival_lat: float | None = None
    arrival_lng: float | None = None
    arrival_place_id: str | None = None
    departure_time: datetime | None = None
    arrival_time: datetime | None = None
    terminal: str | None = None
    type: FlightType = FlightType.OUTBOUND


class FlightResponse(BaseModel):
    id: str
    workspace_id: str
    flight_number: str
    airline: str | None = None
    departure_airport: str
    departure_lat: float | None = None
    departure_lng: float | None = None
    arrival_airport: str
    arrival_lat: float | None = None
    arrival_lng: float | None = None
    departure_time: datetime | None = None
    arrival_time: datetime | None = None
    terminal: str | None = None
    type: FlightType
    created_at: datetime

    model_config = {"from_attributes": True}


class AccommodationCreate(BaseModel):
    name: str
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    place_id: str | None = None
    check_in: datetime | None = None
    check_out: datetime | None = None
    confirmation_number: str | None = None
    note: str | None = None


class AccommodationResponse(BaseModel):
    id: str
    workspace_id: str
    name: str
    address: str | None = None
    lat: float | None = None
    lng: float | None = None
    check_in: datetime | None = None
    check_out: datetime | None = None
    confirmation_number: str | None = None
    note: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}
