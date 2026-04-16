import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { itineraryApi } from "../../services/api";

function SortableItem({ item }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { dayId: item.day_id },
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.item,
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      {...attributes}
      {...listeners}
    >
      <p style={styles.itemName}>{item.destination?.name || "장소 미지정"}</p>
      {item.duration_minutes && (
        <span style={styles.itemDuration}>{item.duration_minutes}분</span>
      )}
      {item.note && <p style={styles.itemNote}>{item.note}</p>}
    </div>
  );
}

export default function DayColumn({ day, workspaceId }) {
  const { destinations, reloadItinerary } = useWorkspaceStore();
  const [showAdd, setShowAdd] = useState(false);
  const [selectedDestId, setSelectedDestId] = useState("");
  const { setNodeRef } = useDroppable({ id: day.id });

  const handleAddItem = async () => {
    if (!selectedDestId) return;
    await itineraryApi.addItem(workspaceId, day.id, {
      destination_id: selectedDestId,
      order: day.items.length,
    });
    await reloadItinerary();
    setShowAdd(false);
    setSelectedDestId("");
  };

  return (
    <div style={styles.column}>
      <div style={styles.header}>
        <span style={styles.dayLabel}>{day.day_number}일차</span>
        {day.date && <span style={styles.date}>{new Date(day.date).toLocaleDateString("ko-KR")}</span>}
      </div>
      <div ref={setNodeRef} style={styles.itemList}>
        <SortableContext items={day.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {day.items.map((item) => (
            <SortableItem key={item.id} item={item} />
          ))}
        </SortableContext>
        {day.items.length === 0 && <p style={styles.empty}>장소를 추가하세요</p>}
      </div>
      {showAdd ? (
        <div style={styles.addForm}>
          <select style={styles.select} value={selectedDestId} onChange={(e) => setSelectedDestId(e.target.value)}>
            <option value="">장소 선택</option>
            {destinations.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <div style={styles.addRow}>
            <button style={styles.cancelBtn} onClick={() => setShowAdd(false)}>취소</button>
            <button style={styles.addBtn} onClick={handleAddItem}>추가</button>
          </div>
        </div>
      ) : (
        <button style={styles.addTrigger} onClick={() => setShowAdd(true)}>+ 장소 추가</button>
      )}
    </div>
  );
}

const styles = {
  column: { minWidth: 220, background: "#f9fafb", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  dayLabel: { fontWeight: 600, fontSize: 14, color: "#4f46e5" },
  date: { fontSize: 12, color: "#9ca3af" },
  itemList: { flex: 1, minHeight: 60, display: "flex", flexDirection: "column", gap: 6 },
  item: { background: "#fff", borderRadius: 8, padding: "10px 12px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", cursor: "grab" },
  itemName: { margin: 0, fontSize: 13, fontWeight: 500 },
  itemDuration: { fontSize: 11, color: "#9ca3af" },
  itemNote: { margin: "4px 0 0", fontSize: 12, color: "#6b7280" },
  empty: { fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 8 },
  addTrigger: { background: "none", border: "1px dashed #d1d5db", borderRadius: 6, padding: "7px", cursor: "pointer", fontSize: 13, color: "#6b7280", width: "100%" },
  addForm: { display: "flex", flexDirection: "column", gap: 6 },
  select: { padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 },
  addRow: { display: "flex", gap: 6 },
  addBtn: { flex: 1, padding: "7px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  cancelBtn: { flex: 1, padding: "7px", background: "#e5e7eb", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
};
