import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useDroppable } from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { itineraryApi } from "../../services/api";

function SortableItem({ item, onDelete }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { dayId: item.day_id },
  });
  const isTransport = !item.destination && item.note;

  return (
    <motion.div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition }}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: isDragging ? 0.3 : 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      className={`relative flex items-start gap-2 p-3 rounded-2xl border group
        transition-shadow duration-150 cursor-default
        ${isTransport
          ? "bg-emerald-50 border-emerald-100"
          : "bg-white border-gray-100 shadow-[0_1px_4px_rgba(0,0,0,0.06)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.1)]"
        }
        ${isDragging ? "shadow-[0_8px_24px_rgba(0,0,0,0.15)] rotate-1 z-50" : ""}
      `}
    >
      {/* 드래그 핸들 */}
      <div
        {...attributes} {...listeners}
        className={`flex-shrink-0 cursor-grab active:cursor-grabbing pt-0.5
          ${isTransport ? "text-emerald-300" : "text-gray-200"}`}
      >
        <svg className="w-3 h-4" viewBox="0 0 12 16" fill="currentColor">
          <circle cx="4" cy="4" r="1.5"/><circle cx="8" cy="4" r="1.5"/>
          <circle cx="4" cy="8" r="1.5"/><circle cx="8" cy="8" r="1.5"/>
          <circle cx="4" cy="12" r="1.5"/><circle cx="8" cy="12" r="1.5"/>
        </svg>
      </div>

      {/* 콘텐츠 */}
      <div className="flex-1 min-w-0">
        {isTransport ? (
          <p className="text-xs text-emerald-700 font-medium leading-relaxed whitespace-pre-line">{item.note}</p>
        ) : (
          <>
            <p className="text-sm font-semibold text-gray-800 leading-snug truncate">
              {item.destination?.name || "장소 미지정"}
            </p>
            {item.duration_minutes && (
              <span className="inline-block mt-1 text-[11px] text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                ⏱ {item.duration_minutes}분
              </span>
            )}
            {item.note && <p className="mt-1 text-xs text-gray-500 leading-snug">{item.note}</p>}
          </>
        )}
      </div>

      {/* 삭제 */}
      <button
        onClick={() => onDelete(item.id)}
        className="opacity-0 group-hover:opacity-100 flex-shrink-0 text-gray-300 hover:text-coral-400
                   transition-all duration-150 text-xs p-0.5"
      >
        ✕
      </button>
    </motion.div>
  );
}

export default function DayColumn({ day, workspaceId }) {
  const { destinations, reloadItinerary } = useWorkspaceStore();
  const [showAdd,     setShowAdd]     = useState(false);
  const [addType,     setAddType]     = useState("place");
  const [destId,      setDestId]      = useState("");
  const [memoText,    setMemoText]    = useState("");
  const { setNodeRef, isOver } = useDroppable({ id: day.id });

  const handleDelete = async (id) => { await itineraryApi.deleteItem(workspaceId, id); await reloadItinerary(); };

  const handleAdd = async () => {
    if (addType === "place") {
      await itineraryApi.addItem(workspaceId, day.id, { destination_id: destId || null, order: day.items.length });
    } else {
      if (!memoText.trim()) return;
      await itineraryApi.addItem(workspaceId, day.id, { destination_id: null, note: memoText.trim(), order: day.items.length });
    }
    await reloadItinerary();
    setShowAdd(false); setDestId(""); setMemoText(""); setAddType("place");
  };

  const dateStr = day.date
    ? new Date(day.date).toLocaleDateString("ko-KR", { month: "short", day: "numeric", weekday: "short" })
    : null;

  return (
    <div className="w-full flex flex-col gap-2">
      {/* 헤더 */}
      <div className="flex items-center gap-2 px-1">
        <div className="bg-coral-500 text-white text-xs font-black px-2.5 py-1 rounded-full shadow-float">
          Day {day.day_number}
        </div>
        {dateStr && <span className="text-xs text-gray-400 font-medium flex-1">{dateStr}</span>}
        <span className="text-[11px] text-gray-300 bg-gray-100/80 px-1.5 py-0.5 rounded-full">{day.items.length}</span>
      </div>

      {/* 드롭 영역 */}
      <div
        ref={setNodeRef}
        className={`flex-1 min-h-[80px] flex flex-col gap-2 p-2 rounded-2xl transition-all duration-200
          ${isOver
            ? "bg-coral-50/80 outline-2 outline-dashed outline-coral-300 outline-offset-[-2px]"
            : "bg-white/40"
          }`}
      >
        <SortableContext items={day.items.map((i) => i.id)} strategy={verticalListSortingStrategy}>
          <AnimatePresence>
            {day.items.map((item) => (
              <SortableItem key={item.id} item={item} workspaceId={workspaceId} onDelete={handleDelete} />
            ))}
          </AnimatePresence>
        </SortableContext>

        {day.items.length === 0 && !isOver && (
          <div className="flex flex-col items-center justify-center py-6 gap-1">
            <span className="text-xl text-gray-200">＋</span>
            <span className="text-[11px] text-gray-300">장소 추가</span>
          </div>
        )}
      </div>

      {/* 추가 UI */}
      <AnimatePresence mode="wait">
        {showAdd ? (
          <motion.div
            key="form"
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="bg-white/90 backdrop-blur-sm border border-gray-100 rounded-2xl p-3 shadow-float space-y-2 max-w-sm"
          >
            {/* 타입 탭 */}
            <div className="flex gap-1">
              {[["place","📍 장소"], ["memo","💬 메모"]].map(([t, lbl]) => (
                <button key={t} type="button" onClick={() => setAddType(t)}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded-xl transition-all duration-150
                    ${addType === t
                      ? "bg-coral-500 text-white shadow-float"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}>
                  {lbl}
                </button>
              ))}
            </div>

            {addType === "place" ? (
              <select value={destId} onChange={(e) => setDestId(e.target.value)}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2
                           text-xs text-gray-700 outline-none focus:border-coral-400">
                <option value="">장소 선택 (선택 안 함)</option>
                {destinations.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            ) : (
              <textarea
                value={memoText} onChange={(e) => setMemoText(e.target.value)} autoFocus rows={3}
                placeholder={"예) 지하철 2호선 탑승\n버스 환승"}
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2
                           text-xs text-gray-700 outline-none resize-none focus:border-coral-400
                           leading-relaxed placeholder:text-gray-300"
              />
            )}

            <div className="flex gap-2">
              <button onClick={() => { setShowAdd(false); setAddType("place"); setMemoText(""); }}
                className="flex-1 py-2 bg-gray-100 text-gray-600 text-xs font-semibold rounded-xl hover:bg-gray-200 transition-colors">
                취소
              </button>
              <button onClick={handleAdd}
                className="flex-1 py-2 bg-coral-500 hover:bg-coral-600 text-white text-xs font-bold rounded-xl transition-colors">
                추가
              </button>
            </div>
          </motion.div>
        ) : (
          <motion.button
            key="trigger"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setShowAdd(true)}
            className="w-full py-2.5 border-2 border-dashed border-gray-200/80
                       text-xs text-gray-400 font-semibold rounded-2xl
                       hover:border-coral-300 hover:text-coral-400 hover:bg-coral-50/50
                       transition-all duration-150"
          >
            + 항목 추가
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
