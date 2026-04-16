import { useState } from "react";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { itineraryApi } from "../../services/api";


const TRANSPORT_ICONS = { "✈️": "항공", "🚌": "버스", "🚇": "지하철", "🚂": "기차", "🚗": "차량", "🚶": "도보", "⚡": "기타" };

function SortableItem({ item, workspaceId, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { dayId: item.day_id },
  });

  const isTransport = !item.destination && item.note;

  return (
    <div
      ref={setNodeRef}
      style={{
        ...styles.item,
        ...(isTransport ? styles.transportItem : {}),
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
    >
      <div style={styles.itemBody} {...attributes} {...listeners}>
        {isTransport ? (
          <p style={styles.transportNote}>{item.note}</p>
        ) : (
          <>
            <p style={styles.itemName}>{item.destination?.name || "장소 미지정"}</p>
            {item.duration_minutes && <span style={styles.itemDuration}>{item.duration_minutes}분</span>}
            {item.note && <p style={styles.itemNote}>{item.note}</p>}
          </>
        )}
      </div>
      <button style={styles.itemDeleteBtn} onClick={() => onDelete(item.id)}>✕</button>
    </div>
  );
}

export default function DayColumn({ day, workspaceId }) {
  const { destinations, reloadItinerary } = useWorkspaceStore();
  const [showAdd, setShowAdd] = useState(false);
  const [addType, setAddType] = useState("place"); // "place" | "memo"
  const [selectedDestId, setSelectedDestId] = useState("");
  const [memoText, setMemoText] = useState("");
  const { setNodeRef } = useDroppable({ id: day.id });

  const handleDelete = async (itemId) => {
    await itineraryApi.deleteItem(workspaceId, itemId);
    await reloadItinerary();
  };

  const handleAdd = async () => {
    if (addType === "place") {
      await itineraryApi.addItem(workspaceId, day.id, {
        destination_id: selectedDestId || null,
        order: day.items.length,
      });
    } else {
      if (!memoText.trim()) return;
      await itineraryApi.addItem(workspaceId, day.id, {
        destination_id: null,
        note: memoText.trim(),
        order: day.items.length,
      });
    }
    await reloadItinerary();
    setShowAdd(false);
    setSelectedDestId("");
    setMemoText("");
    setAddType("place");
  };

  return (
    <div style={styles.column}>
      <div style={styles.header}>
        <span style={styles.dayLabel}>{day.day_number}일차</span>
        {day.date && <span style={styles.date}>{new Date(day.date).toLocaleDateString("ko-KR", { month: "numeric", day: "numeric" })}</span>}
      </div>
      <div ref={setNodeRef} style={styles.itemList}>
        <SortableContext items={day.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          {day.items.map((item) => (
            <SortableItem key={item.id} item={item} workspaceId={workspaceId} onDelete={handleDelete} />
          ))}
        </SortableContext>
        {day.items.length === 0 && <p style={styles.empty}>장소를 추가하세요</p>}
      </div>

      {showAdd ? (
        <div style={styles.addForm}>
          {/* 타입 탭 */}
          <div style={styles.typeTabs}>
            <button
              type="button"
              style={{ ...styles.typeTab, ...(addType === "place" ? styles.typeTabActive : {}) }}
              onClick={() => setAddType("place")}
            >
              📍 장소
            </button>
            <button
              type="button"
              style={{ ...styles.typeTab, ...(addType === "memo" ? styles.typeTabActive : {}) }}
              onClick={() => setAddType("memo")}
            >
              💬 이동/메모
            </button>
          </div>

          {addType === "place" ? (
            <select style={styles.select} value={selectedDestId} onChange={(e) => setSelectedDestId(e.target.value)}>
              <option value="">장소 선택 (선택 안 함)</option>
              {destinations.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          ) : (
            <textarea
              style={styles.textarea}
              placeholder={"예) 지하철 2호선 탑승\n버스 101번 환승\n편의점 잠깐 들름"}
              value={memoText}
              onChange={(e) => setMemoText(e.target.value)}
              rows={3}
              autoFocus
            />
          )}

          <div style={styles.addRow}>
            <button style={styles.cancelBtn} onClick={() => { setShowAdd(false); setAddType("place"); setMemoText(""); }}>취소</button>
            <button style={styles.addBtn} onClick={handleAdd}>추가</button>
          </div>
        </div>
      ) : (
        <button style={styles.addTrigger} onClick={() => setShowAdd(true)}>+ 추가</button>
      )}
    </div>
  );
}

const styles = {
  column: { minWidth: 200, background: "#f9fafb", borderRadius: 10, padding: 12, display: "flex", flexDirection: "column", gap: 8 },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center" },
  dayLabel: { fontWeight: 600, fontSize: 14, color: "#4f46e5" },
  date: { fontSize: 12, color: "#9ca3af" },
  itemList: { flex: 1, minHeight: 60, display: "flex", flexDirection: "column", gap: 6 },
  item: { background: "#fff", borderRadius: 8, padding: "8px 10px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)", display: "flex", alignItems: "flex-start", gap: 4 },
  transportItem: { background: "#f0fdf4", borderLeft: "3px solid #86efac" },
  itemBody: { flex: 1, cursor: "grab", minWidth: 0 },
  itemDeleteBtn: { background: "none", border: "none", color: "#d1d5db", cursor: "pointer", fontSize: 11, padding: "1px 2px", flexShrink: 0, lineHeight: 1 },
  itemName: { margin: 0, fontSize: 13, fontWeight: 500 },
  itemDuration: { fontSize: 11, color: "#9ca3af" },
  itemNote: { margin: "4px 0 0", fontSize: 12, color: "#6b7280" },
  transportNote: { margin: 0, fontSize: 13, color: "#166534", whiteSpace: "pre-line" },
  empty: { fontSize: 12, color: "#9ca3af", textAlign: "center", padding: 8 },
  addTrigger: { background: "none", border: "1px dashed #d1d5db", borderRadius: 6, padding: "7px", cursor: "pointer", fontSize: 13, color: "#6b7280", width: "100%" },
  addForm: { display: "flex", flexDirection: "column", gap: 6 },
  typeTabs: { display: "flex", gap: 4 },
  typeTab: { flex: 1, padding: "5px 0", fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 6, background: "#f9fafb", color: "#6b7280", cursor: "pointer" },
  typeTabActive: { background: "#eef2ff", color: "#4f46e5", border: "1px solid #c7d2fe", fontWeight: 600 },
  select: { padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 13 },
  textarea: { padding: "7px 10px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: 12, resize: "none", fontFamily: "inherit", lineHeight: 1.5 },
  addRow: { display: "flex", gap: 6 },
  addBtn: { flex: 1, padding: "7px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
  cancelBtn: { flex: 1, padding: "7px", background: "#e5e7eb", border: "none", borderRadius: 6, cursor: "pointer", fontSize: 13 },
};
