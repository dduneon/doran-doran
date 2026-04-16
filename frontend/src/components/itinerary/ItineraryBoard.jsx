import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useJsApiLoader } from "@react-google-maps/api";
import { useWorkspaceStore } from "../../store/workspaceStore";
import DayColumn from "./DayColumn";
import PlacePicker from "../map/PlacePicker";
import { itineraryApi } from "../../services/api";

const MAP_LIBRARIES = ["places"];

const EMPTY_FLIGHT = {
  flight_number: "",
  departure: null,   // { name, lat, lng, place_id }
  arrival: null,
  departure_time: "",
  arrival_time: "",
};
const EMPTY_ACC = {
  place: null,       // { name, formatted_address, lat, lng, place_id }
  check_in: "",
  check_out: "",
};

export default function ItineraryBoard({ workspaceId }) {
  const { itinerary, flights, accommodations, reloadItinerary, addFlight, deleteFlight, addAccommodation, deleteAccommodation } = useWorkspaceStore();
  const [activeItem, setActiveItem] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  // Maps API 로드 (PlacePicker 사용을 위해)
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const allItems = itinerary.flatMap((d) => d.items);
    const draggedItem = allItems.find((i) => i.id === active.id);
    if (!draggedItem) return;

    const targetDayId = over.data?.current?.dayId || over.id;
    const targetDay = itinerary.find((d) => d.id === targetDayId);
    if (!targetDay) return;

    const newItems = targetDay.items.filter((i) => i.id !== active.id);
    const overIndex = newItems.findIndex((i) => i.id === over.id);
    const insertIndex = overIndex >= 0 ? overIndex : newItems.length;
    newItems.splice(insertIndex, 0, { ...draggedItem, day_id: targetDayId });

    await itineraryApi.reorder(workspaceId, { items: newItems.map((item, idx) => ({ id: item.id, day_id: targetDayId, order: idx })) });
    await reloadItinerary();
    setActiveItem(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.logistics}>
        <LogisticsPanel
          flights={flights}
          accommodations={accommodations}
          workspaceId={workspaceId}
          mapsLoaded={isLoaded}
          onAddFlight={addFlight}
          onDeleteFlight={deleteFlight}
          onAddAccommodation={addAccommodation}
          onDeleteAccommodation={deleteAccommodation}
        />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={({ active }) => setActiveItem(active)} onDragEnd={handleDragEnd}>
        <div style={styles.board}>
          {itinerary.map((day) => (
            <DayColumn key={day.id} day={day} workspaceId={workspaceId} />
          ))}
          {itinerary.length === 0 && (
            <p style={styles.empty}>여행 기간을 설정하면 일정이 자동으로 만들어집니다.</p>
          )}
        </div>
        <DragOverlay>
          {activeItem ? (() => {
            const item = itinerary.flatMap((d) => d.items).find((i) => i.id === activeItem.id);
            const label = item?.destination?.name || item?.note || "항목";
            return <div style={styles.dragOverlay}>{label}</div>;
          })() : null}
        </DragOverlay>
      </DndContext>
    </div>
  );
}

function LogisticsPanel({ flights, accommodations, workspaceId, mapsLoaded, onAddFlight, onDeleteFlight, onAddAccommodation, onDeleteAccommodation }) {
  const [showFlightForm, setShowFlightForm] = useState(false);
  const [flightForm, setFlightForm] = useState(EMPTY_FLIGHT);
  const [showAccForm, setShowAccForm] = useState(false);
  const [accForm, setAccForm] = useState(EMPTY_ACC);

  const handleAddFlight = async (e) => {
    e.preventDefault();
    if (!flightForm.departure || !flightForm.arrival) return;
    await onAddFlight(workspaceId, {
      flight_number: flightForm.flight_number,
      departure_airport: flightForm.departure.name,
      departure_lat: flightForm.departure.lat,
      departure_lng: flightForm.departure.lng,
      departure_place_id: flightForm.departure.place_id,
      arrival_airport: flightForm.arrival.name,
      arrival_lat: flightForm.arrival.lat,
      arrival_lng: flightForm.arrival.lng,
      arrival_place_id: flightForm.arrival.place_id,
      departure_time: flightForm.departure_time || null,
      arrival_time: flightForm.arrival_time || null,
    });
    setFlightForm(EMPTY_FLIGHT);
    setShowFlightForm(false);
  };

  const handleAddAcc = async (e) => {
    e.preventDefault();
    if (!accForm.place) return;
    await onAddAccommodation(workspaceId, {
      name: accForm.place.name,
      address: accForm.place.formatted_address || null,
      lat: accForm.place.lat,
      lng: accForm.place.lng,
      place_id: accForm.place.place_id,
      check_in: accForm.check_in || null,
      check_out: accForm.check_out || null,
    });
    setAccForm(EMPTY_ACC);
    setShowAccForm(false);
  };

  return (
    <div style={styles.logPanel}>
      {/* ── 항공편 ── */}
      <div style={styles.sectionHeader}>
        <h4 style={styles.logTitle}>항공편</h4>
        <button style={styles.addSmallBtn} onClick={() => { setShowFlightForm((v) => !v); setShowAccForm(false); }}>
          {showFlightForm ? "✕" : "+"}
        </button>
      </div>

      {showFlightForm && (
        <form onSubmit={handleAddFlight} style={styles.inlineForm}>
          <input
            style={styles.inlineInput}
            placeholder="편명 (예: KE001)"
            value={flightForm.flight_number}
            onChange={(e) => setFlightForm((f) => ({ ...f, flight_number: e.target.value }))}
            required
          />
          <label style={styles.inlineLabel}>출발 공항</label>
          {mapsLoaded ? (
            <PlacePicker
              placeholder="출발 공항 검색..."
              selected={flightForm.departure?.name}
              onSelect={(place) => setFlightForm((f) => ({ ...f, departure: place }))}
              onClear={() => setFlightForm((f) => ({ ...f, departure: null }))}
            />
          ) : (
            <input style={styles.inlineInput} placeholder="출발 공항" value={flightForm.departure?.name || ""}
              onChange={(e) => setFlightForm((f) => ({ ...f, departure: { name: e.target.value } }))} />
          )}
          <label style={styles.inlineLabel}>도착 공항</label>
          {mapsLoaded ? (
            <PlacePicker
              placeholder="도착 공항 검색..."
              selected={flightForm.arrival?.name}
              onSelect={(place) => setFlightForm((f) => ({ ...f, arrival: place }))}
              onClear={() => setFlightForm((f) => ({ ...f, arrival: null }))}
            />
          ) : (
            <input style={styles.inlineInput} placeholder="도착 공항" value={flightForm.arrival?.name || ""}
              onChange={(e) => setFlightForm((f) => ({ ...f, arrival: { name: e.target.value } }))} />
          )}
          <label style={styles.inlineLabel}>출발 시간</label>
          <input style={styles.inlineInput} type="datetime-local" value={flightForm.departure_time}
            onChange={(e) => setFlightForm((f) => ({ ...f, departure_time: e.target.value }))} />
          <label style={styles.inlineLabel}>도착 시간</label>
          <input style={styles.inlineInput} type="datetime-local" value={flightForm.arrival_time}
            onChange={(e) => setFlightForm((f) => ({ ...f, arrival_time: e.target.value }))} />
          <div style={styles.formBtnRow}>
            <button type="button" style={styles.cancelSmall} onClick={() => setShowFlightForm(false)}>취소</button>
            <button type="submit" style={styles.saveSmall} disabled={!flightForm.flight_number || !flightForm.departure || !flightForm.arrival}>추가</button>
          </div>
        </form>
      )}

      {flights.map((f) => (
        <div key={f.id} style={styles.logItem}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 13 }}>{f.flight_number}</strong>
            <p style={styles.logRoute}>{f.departure_airport} → {f.arrival_airport}</p>
            {f.departure_time && (
              <p style={styles.logMeta}>{new Date(f.departure_time).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
            )}
          </div>
          <button style={styles.deleteBtn} onClick={() => onDeleteFlight(workspaceId, f.id)}>✕</button>
        </div>
      ))}
      {flights.length === 0 && !showFlightForm && <p style={styles.logEmpty}>항공편 없음</p>}

      {/* ── 숙소 ── */}
      <div style={{ ...styles.sectionHeader, marginTop: 20 }}>
        <h4 style={styles.logTitle}>숙소</h4>
        <button style={styles.addSmallBtn} onClick={() => { setShowAccForm((v) => !v); setShowFlightForm(false); }}>
          {showAccForm ? "✕" : "+"}
        </button>
      </div>

      {showAccForm && (
        <form onSubmit={handleAddAcc} style={styles.inlineForm}>
          <label style={styles.inlineLabel}>숙소 검색</label>
          {mapsLoaded ? (
            <PlacePicker
              placeholder="숙소 이름으로 검색..."
              selected={accForm.place?.name}
              onSelect={(place) => setAccForm((f) => ({ ...f, place }))}
              onClear={() => setAccForm((f) => ({ ...f, place: null }))}
            />
          ) : (
            <input style={styles.inlineInput} placeholder="숙소 이름" value={accForm.place?.name || ""}
              onChange={(e) => setAccForm((f) => ({ ...f, place: { name: e.target.value } }))} />
          )}
          {accForm.place?.formatted_address && (
            <p style={{ ...styles.inlineLabel, color: "#9ca3af", margin: 0 }}>{accForm.place.formatted_address}</p>
          )}
          <label style={styles.inlineLabel}>체크인</label>
          <input style={styles.inlineInput} type="datetime-local" value={accForm.check_in}
            onChange={(e) => setAccForm((f) => ({ ...f, check_in: e.target.value }))} />
          <label style={styles.inlineLabel}>체크아웃</label>
          <input style={styles.inlineInput} type="datetime-local" value={accForm.check_out}
            min={accForm.check_in || undefined}
            onChange={(e) => setAccForm((f) => ({ ...f, check_out: e.target.value }))} />
          <div style={styles.formBtnRow}>
            <button type="button" style={styles.cancelSmall} onClick={() => setShowAccForm(false)}>취소</button>
            <button type="submit" style={styles.saveSmall} disabled={!accForm.place}>추가</button>
          </div>
        </form>
      )}

      {accommodations.map((a) => (
        <div key={a.id} style={styles.logItem}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong style={{ fontSize: 13 }}>{a.name}</strong>
            {a.address && <p style={styles.logMeta}>{a.address}</p>}
            {a.check_in && (
              <p style={styles.logMeta}>
                체크인 {new Date(a.check_in).toLocaleDateString("ko-KR")}
                {a.check_out && ` ~ ${new Date(a.check_out).toLocaleDateString("ko-KR")}`}
              </p>
            )}
          </div>
          <button style={styles.deleteBtn} onClick={() => onDeleteAccommodation(workspaceId, a.id)}>✕</button>
        </div>
      ))}
      {accommodations.length === 0 && !showAccForm && <p style={styles.logEmpty}>숙소 없음</p>}
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100%", overflow: "hidden" },
  logistics: { width: 240, borderRight: "1px solid #e5e7eb", overflowY: "auto", background: "#fff" },
  logPanel: { padding: 14 },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  logTitle: { margin: 0, fontSize: 12, fontWeight: 600, color: "#4f46e5", textTransform: "uppercase", letterSpacing: 0.5 },
  addSmallBtn: { width: 22, height: 22, borderRadius: "50%", border: "1px solid #d1d5db", background: "#f9fafb", cursor: "pointer", fontSize: 14, lineHeight: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "#374151" },
  logItem: { display: "flex", alignItems: "flex-start", gap: 4, padding: "6px 0", borderBottom: "1px solid #f3f4f6" },
  logRoute: { margin: "2px 0 0", fontSize: 11, color: "#374151" },
  logMeta: { margin: "2px 0 0", fontSize: 11, color: "#9ca3af" },
  logEmpty: { fontSize: 12, color: "#9ca3af", margin: 0 },
  deleteBtn: { background: "none", border: "none", color: "#d1d5db", cursor: "pointer", fontSize: 12, padding: "2px 4px", flexShrink: 0, lineHeight: 1 },
  inlineForm: { display: "flex", flexDirection: "column", gap: 5, marginBottom: 8, background: "#f9fafb", padding: 8, borderRadius: 6 },
  inlineInput: { padding: "5px 8px", border: "1px solid #e5e7eb", borderRadius: 5, fontSize: 12, width: "100%", boxSizing: "border-box" },
  inlineLabel: { fontSize: 11, color: "#6b7280", margin: "4px 0 0" },
  formBtnRow: { display: "flex", gap: 4, marginTop: 4 },
  cancelSmall: { flex: 1, padding: "5px", background: "#e5e7eb", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 },
  saveSmall: { flex: 1, padding: "5px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 5, cursor: "pointer", fontSize: 12 },
  board: { flex: 1, display: "flex", gap: 12, padding: 16, overflowX: "auto", alignItems: "flex-start" },
  empty: { color: "#9ca3af", padding: 24, fontSize: 14 },
  dragOverlay: { background: "#4f46e5", color: "#fff", padding: "8px 12px", borderRadius: 6, fontSize: 13 },
};
