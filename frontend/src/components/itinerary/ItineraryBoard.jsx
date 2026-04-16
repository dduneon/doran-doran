import { useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { useWorkspaceStore } from "../../store/workspaceStore";
import DayColumn from "./DayColumn";
import { itineraryApi } from "../../services/api";

export default function ItineraryBoard({ workspaceId }) {
  const { itinerary, flights, accommodations, reloadItinerary } = useWorkspaceStore();
  const [activeItem, setActiveItem] = useState(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;

    const allItems = itinerary.flatMap((d) => d.items);
    const draggedItem = allItems.find((i) => i.id === active.id);
    if (!draggedItem) return;

    // Determine target day
    const targetDayId = over.data?.current?.dayId || over.id;
    const targetDay = itinerary.find((d) => d.id === targetDayId);
    if (!targetDay) return;

    const newItems = targetDay.items.filter((i) => i.id !== active.id);
    const overIndex = newItems.findIndex((i) => i.id === over.id);
    const insertIndex = overIndex >= 0 ? overIndex : newItems.length;
    newItems.splice(insertIndex, 0, { ...draggedItem, day_id: targetDayId });

    const reorderPayload = newItems.map((item, idx) => ({
      id: item.id,
      day_id: targetDayId,
      order: idx,
    }));

    await itineraryApi.reorder(workspaceId, { items: reorderPayload });
    await reloadItinerary();
    setActiveItem(null);
  };

  return (
    <div style={styles.container}>
      <div style={styles.logistics}>
        <LogisticsPanel flights={flights} accommodations={accommodations} workspaceId={workspaceId} />
      </div>
      <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={({ active }) => setActiveItem(active)} onDragEnd={handleDragEnd}>
        <div style={styles.board}>
          {itinerary.map((day) => (
            <DayColumn key={day.id} day={day} workspaceId={workspaceId} />
          ))}
          {itinerary.length === 0 && (
            <p style={styles.empty}>일정이 없습니다. 일차를 추가해보세요.</p>
          )}
        </div>
        <DragOverlay>{activeItem ? <div style={styles.dragOverlay}>{activeItem.id}</div> : null}</DragOverlay>
      </DndContext>
    </div>
  );
}

function LogisticsPanel({ flights, accommodations, workspaceId }) {
  return (
    <div style={styles.logPanel}>
      <h4 style={styles.logTitle}>항공편</h4>
      {flights.map((f) => (
        <div key={f.id} style={styles.logItem}>
          <strong>{f.flight_number}</strong> {f.departure_airport} → {f.arrival_airport}
          {f.departure_time && <span style={styles.logMeta}> · {new Date(f.departure_time).toLocaleString("ko-KR")}</span>}
        </div>
      ))}
      {flights.length === 0 && <p style={styles.logEmpty}>항공편 없음</p>}
      <h4 style={{ ...styles.logTitle, marginTop: 16 }}>숙소</h4>
      {accommodations.map((a) => (
        <div key={a.id} style={styles.logItem}>
          <strong>{a.name}</strong>
          {a.check_in && <span style={styles.logMeta}> · 체크인 {new Date(a.check_in).toLocaleDateString("ko-KR")}</span>}
        </div>
      ))}
      {accommodations.length === 0 && <p style={styles.logEmpty}>숙소 없음</p>}
    </div>
  );
}

const styles = {
  container: { display: "flex", height: "100%", overflow: "hidden" },
  logistics: { width: 220, borderRight: "1px solid #e5e7eb", overflowY: "auto", background: "#fff" },
  logPanel: { padding: 14 },
  logTitle: { margin: "0 0 8px", fontSize: 13, fontWeight: 600, color: "#4f46e5", textTransform: "uppercase", letterSpacing: 0.5 },
  logItem: { fontSize: 13, padding: "6px 0", borderBottom: "1px solid #f3f4f6" },
  logMeta: { color: "#6b7280", fontSize: 12 },
  logEmpty: { fontSize: 12, color: "#9ca3af", margin: 0 },
  board: { flex: 1, display: "flex", gap: 12, padding: 16, overflowX: "auto", alignItems: "flex-start" },
  empty: { color: "#9ca3af", padding: 24 },
  dragOverlay: { background: "#4f46e5", color: "#fff", padding: "8px 12px", borderRadius: 6, fontSize: 13 },
};
