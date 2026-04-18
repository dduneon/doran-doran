import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, closestCorners } from "@dnd-kit/core";
import { useJsApiLoader } from "@react-google-maps/api";
import { useWorkspaceStore } from "../../store/workspaceStore";
import DayColumn from "./DayColumn";
import PlacePicker from "../map/PlacePicker";
import { itineraryApi } from "../../services/api";

const MAP_LIBRARIES = ["places"];
const EMPTY_FLIGHT  = { flight_number: "", departure: null, arrival: null, departure_time: "", arrival_time: "" };
const EMPTY_ACC     = { place: null, check_in: "", check_out: "" };

export default function ItineraryBoard({ workspaceId }) {
  const { itinerary, flights, accommodations, reloadItinerary, addFlight, deleteFlight, addAccommodation, deleteAccommodation } =
    useWorkspaceStore();
  const [activeItem,  setActiveItem]  = useState(null);
  const [mobileTab,   setMobileTab]   = useState("itinerary"); // "itinerary" | "logistics"
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "",
    libraries: MAP_LIBRARIES,
  });

  const handleDragEnd = async ({ active, over }) => {
    if (!over || active.id === over.id) return;
    const allItems   = itinerary.flatMap((d) => d.items);
    const dragged    = allItems.find((i) => i.id === active.id);
    if (!dragged) return;
    const targetDayId = over.data?.current?.dayId || over.id;
    const targetDay   = itinerary.find((d) => d.id === targetDayId);
    if (!targetDay) return;
    const newItems = targetDay.items.filter((i) => i.id !== active.id);
    const overIdx  = newItems.findIndex((i) => i.id === over.id);
    newItems.splice(overIdx >= 0 ? overIdx : newItems.length, 0, { ...dragged, day_id: targetDayId });
    await itineraryApi.reorder(workspaceId, { items: newItems.map((it, idx) => ({ id: it.id, day_id: targetDayId, order: idx })) });
    await reloadItinerary();
    setActiveItem(null);
  };

  const logisticsProps = {
    flights, accommodations, workspaceId, mapsLoaded: isLoaded,
    onAddFlight: addFlight, onDeleteFlight: deleteFlight,
    onAddAccommodation: addAccommodation, onDeleteAccommodation: deleteAccommodation,
  };

  return (
    <div className="h-full flex flex-col glass rounded-3xl overflow-hidden">

      {/* ── 모바일 내부 탭 (sm 미만에서만 표시) ── */}
      <div className="sm:hidden flex border-b border-white/40 flex-shrink-0">
        {[["itinerary", "📅 일정"], ["logistics", "✈️ 항공·숙소"]].map(([id, label]) => (
          <button
            key={id}
            onClick={() => setMobileTab(id)}
            className={`flex-1 py-3 text-sm font-semibold transition-colors duration-150
              ${mobileTab === id
                ? "text-coral-500 border-b-2 border-coral-500 bg-coral-50/40"
                : "text-gray-400 hover:text-gray-600"
              }`}
          >
            {label}
            {id === "logistics" && (flights.length + accommodations.length) > 0 && (
              <span className="ml-1.5 text-[10px] font-bold bg-coral-500 text-white px-1.5 py-0.5 rounded-full">
                {flights.length + accommodations.length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── 본문 ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* 로지스틱 패널: 데스크톱=항상 왼쪽 고정, 모바일=탭에 따라 */}
        <div className={`
          sm:w-56 sm:flex-shrink-0 sm:border-r sm:border-white/40 sm:overflow-y-auto
          ${mobileTab === "logistics" ? "flex-1 overflow-y-auto" : "hidden sm:block"}
        `}>
          <LogisticsPanel {...logisticsProps} />
        </div>

        {/* 일정 칸반: 수직 스크롤 */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragStart={({ active }) => setActiveItem(active)}
          onDragEnd={handleDragEnd}
        >
          <div className={`
            flex-1 overflow-y-auto
            ${mobileTab === "itinerary" ? "flex flex-col" : "hidden sm:flex sm:flex-col"}
          `}>
            {itinerary.length === 0 ? (
              <div className="flex flex-col items-center justify-center flex-1 gap-3 text-center p-8">
                <span className="text-5xl opacity-30">📅</span>
                <h3 className="text-lg font-bold text-gray-700">일정이 없어요</h3>
                <p className="text-sm text-gray-400 leading-relaxed">
                  여행 기간을 설정하면<br />날짜별 일정이 자동으로 만들어집니다
                </p>
              </div>
            ) : (
              <div className="p-4 space-y-3">
                {itinerary.map((day) => (
                  <DayColumn key={day.id} day={day} workspaceId={workspaceId} />
                ))}
              </div>
            )}
          </div>

          {createPortal(
            <DragOverlay>
              {activeItem ? (() => {
                const item  = itinerary.flatMap((d) => d.items).find((i) => i.id === activeItem.id);
                const label = item?.destination?.name || item?.note || "항목";
                return (
                  <div className="bg-coral-500 text-white text-sm font-bold px-4 py-2.5 rounded-2xl
                                  shadow-[0_8px_24px_rgba(255,90,95,0.5)]">
                    📍 {label}
                  </div>
                );
              })() : null}
            </DragOverlay>,
            document.body
          )}
        </DndContext>
      </div>
    </div>
  );
}

/* ━━━ 로지스틱 패널 ━━━ */
function LogisticsPanel({ flights, accommodations, workspaceId, mapsLoaded, onAddFlight, onDeleteFlight, onAddAccommodation, onDeleteAccommodation }) {
  const [showFlight, setShowFlight] = useState(false);
  const [flightForm, setFlightForm] = useState(EMPTY_FLIGHT);
  const [showAcc,    setShowAcc]    = useState(false);
  const [accForm,    setAccForm]    = useState(EMPTY_ACC);

  const handleAddFlight = async (e) => {
    e.preventDefault();
    if (!flightForm.departure || !flightForm.arrival) return;
    await onAddFlight(workspaceId, {
      flight_number: flightForm.flight_number,
      departure_airport: flightForm.departure.name, departure_lat: flightForm.departure.lat, departure_lng: flightForm.departure.lng, departure_place_id: flightForm.departure.place_id,
      arrival_airport: flightForm.arrival.name, arrival_lat: flightForm.arrival.lat, arrival_lng: flightForm.arrival.lng, arrival_place_id: flightForm.arrival.place_id,
      departure_time: flightForm.departure_time || null, arrival_time: flightForm.arrival_time || null,
    });
    setFlightForm(EMPTY_FLIGHT); setShowFlight(false);
  };

  const handleAddAcc = async (e) => {
    e.preventDefault();
    if (!accForm.place) return;
    await onAddAccommodation(workspaceId, {
      name: accForm.place.name, address: accForm.place.formatted_address || null,
      lat: accForm.place.lat, lng: accForm.place.lng, place_id: accForm.place.place_id,
      check_in: accForm.check_in || null, check_out: accForm.check_out || null,
    });
    setAccForm(EMPTY_ACC); setShowAcc(false);
  };

  return (
    <div className="p-4 space-y-5">
      {/* 항공편 섹션 */}
      <LogSection
        icon="✈️" title="항공편" count={flights.length}
        expanded={showFlight} onToggle={() => { setShowFlight((v) => !v); setShowAcc(false); }}
      >
        <AnimatePresence>
          {showFlight && (
            <motion.form
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddFlight}
              className="space-y-2.5 mt-2 overflow-hidden"
            >
              <FormField label="편명">
                <input className="form-input-sm" placeholder="예: KE001" value={flightForm.flight_number}
                  onChange={(e) => setFlightForm((f) => ({ ...f, flight_number: e.target.value }))} required />
              </FormField>
              <FormField label="출발 공항">
                {mapsLoaded
                  ? <PlacePicker placeholder="출발 공항…" selected={flightForm.departure?.name}
                      onSelect={(p) => setFlightForm((f) => ({ ...f, departure: p }))}
                      onClear={() => setFlightForm((f) => ({ ...f, departure: null }))} />
                  : <input className="form-input-sm" placeholder="출발 공항" value={flightForm.departure?.name || ""}
                      onChange={(e) => setFlightForm((f) => ({ ...f, departure: { name: e.target.value } }))} />
                }
              </FormField>
              <FormField label="도착 공항">
                {mapsLoaded
                  ? <PlacePicker placeholder="도착 공항…" selected={flightForm.arrival?.name}
                      onSelect={(p) => setFlightForm((f) => ({ ...f, arrival: p }))}
                      onClear={() => setFlightForm((f) => ({ ...f, arrival: null }))} />
                  : <input className="form-input-sm" placeholder="도착 공항" value={flightForm.arrival?.name || ""}
                      onChange={(e) => setFlightForm((f) => ({ ...f, arrival: { name: e.target.value } }))} />
                }
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="출발">
                  <input type="datetime-local" className="form-input-sm" value={flightForm.departure_time}
                    onChange={(e) => setFlightForm((f) => ({ ...f, departure_time: e.target.value }))} />
                </FormField>
                <FormField label="도착">
                  <input type="datetime-local" className="form-input-sm" value={flightForm.arrival_time}
                    onChange={(e) => setFlightForm((f) => ({ ...f, arrival_time: e.target.value }))} />
                </FormField>
              </div>
              <FormBtns onCancel={() => setShowFlight(false)}
                disabled={!flightForm.flight_number || !flightForm.departure || !flightForm.arrival} />
            </motion.form>
          )}
        </AnimatePresence>

        {flights.length === 0 && !showFlight && (
          <p className="text-xs text-gray-400 mt-1">등록된 항공편 없음</p>
        )}
        {flights.map((f) => (
          <LogCard key={f.id} icon="✈️" onDelete={() => onDeleteFlight(workspaceId, f.id)}>
            <p className="text-xs font-bold text-gray-800">{f.flight_number}</p>
            <p className="text-[11px] text-gray-500 font-medium">{f.departure_airport} → {f.arrival_airport}</p>
            {f.departure_time && (
              <p className="text-[11px] text-gray-400">
                {new Date(f.departure_time).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}
              </p>
            )}
          </LogCard>
        ))}
      </LogSection>

      {/* 숙소 섹션 */}
      <LogSection
        icon="🏨" title="숙소" count={accommodations.length}
        expanded={showAcc} onToggle={() => { setShowAcc((v) => !v); setShowFlight(false); }}
      >
        <AnimatePresence>
          {showAcc && (
            <motion.form
              initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
              onSubmit={handleAddAcc}
              className="space-y-2.5 mt-2 overflow-hidden"
            >
              <FormField label="숙소 검색">
                {mapsLoaded
                  ? <PlacePicker placeholder="숙소 이름으로 검색…" selected={accForm.place?.name}
                      onSelect={(p) => setAccForm((f) => ({ ...f, place: p }))}
                      onClear={() => setAccForm((f) => ({ ...f, place: null }))} />
                  : <input className="form-input-sm" placeholder="숙소 이름" value={accForm.place?.name || ""}
                      onChange={(e) => setAccForm((f) => ({ ...f, place: { name: e.target.value } }))} />
                }
                {accForm.place?.formatted_address && (
                  <p className="text-[11px] text-gray-400 mt-0.5 truncate">{accForm.place.formatted_address}</p>
                )}
              </FormField>
              <div className="grid grid-cols-2 gap-2">
                <FormField label="체크인">
                  <input type="datetime-local" className="form-input-sm" value={accForm.check_in}
                    onChange={(e) => setAccForm((f) => ({ ...f, check_in: e.target.value }))} />
                </FormField>
                <FormField label="체크아웃">
                  <input type="datetime-local" className="form-input-sm" value={accForm.check_out}
                    min={accForm.check_in || undefined}
                    onChange={(e) => setAccForm((f) => ({ ...f, check_out: e.target.value }))} />
                </FormField>
              </div>
              <FormBtns onCancel={() => setShowAcc(false)} disabled={!accForm.place} />
            </motion.form>
          )}
        </AnimatePresence>

        {accommodations.length === 0 && !showAcc && (
          <p className="text-xs text-gray-400 mt-1">등록된 숙소 없음</p>
        )}
        {accommodations.map((a) => (
          <LogCard key={a.id} icon="🏨" onDelete={() => onDeleteAccommodation(workspaceId, a.id)}>
            <p className="text-xs font-bold text-gray-800 truncate">{a.name}</p>
            {a.address && <p className="text-[11px] text-gray-400 truncate">{a.address}</p>}
            {a.check_in && (
              <p className="text-[11px] text-emerald-600 font-medium">
                체크인 {new Date(a.check_in).toLocaleDateString("ko-KR")}
                {a.check_out && ` ~ ${new Date(a.check_out).toLocaleDateString("ko-KR")}`}
              </p>
            )}
          </LogCard>
        ))}
      </LogSection>
    </div>
  );
}

function LogSection({ icon, title, count, expanded, onToggle, children }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-base">{icon}</span>
          <span className="text-xs font-bold text-gray-700 uppercase tracking-widest">{title}</span>
          {count > 0 && (
            <span className="text-[10px] font-bold bg-coral-500 text-white px-1.5 py-0.5 rounded-full">{count}</span>
          )}
        </div>
        <button
          type="button"
          onClick={onToggle}
          className={`text-xs font-semibold px-2.5 py-1 rounded-lg transition-all duration-150
            ${expanded
              ? "bg-coral-50 text-coral-500 border border-coral-200"
              : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
        >
          {expanded ? "✕" : "+ 추가"}
        </button>
      </div>
      {children}
    </div>
  );
}

function LogCard({ icon, children, onDelete }) {
  return (
    <div className="flex items-start gap-2 mt-2 p-2.5 bg-gray-50/80 rounded-xl group">
      <span className="text-base flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0 space-y-0.5">{children}</div>
      <button onClick={onDelete}
        className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-coral-400
                   transition-all duration-150 text-xs px-1 flex-shrink-0">
        ✕
      </button>
    </div>
  );
}

function FormField({ label, children }) {
  return (
    <div className="space-y-1">
      <label className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">{label}</label>
      {children}
    </div>
  );
}

function FormBtns({ onCancel, disabled }) {
  return (
    <div className="flex gap-2 pt-1">
      <button type="button" onClick={onCancel}
        className="flex-1 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors">
        취소
      </button>
      <button type="submit" disabled={disabled}
        className="flex-1 py-1.5 bg-coral-500 hover:bg-coral-600 disabled:opacity-40 disabled:cursor-not-allowed
                   text-white text-xs font-bold rounded-lg transition-colors">
        추가
      </button>
    </div>
  );
}

/* form-input-sm 유틸 클래스 주입 */
const style = document.createElement("style");
style.textContent = `.form-input-sm{width:100%;padding:6px 10px;border:1.5px solid #E5E7EB;border-radius:10px;font-size:12px;outline:none;background:#fff;color:#1F2937;transition:border-color .15s;box-sizing:border-box;}.form-input-sm:focus{border-color:#FF5A5F;box-shadow:0 0 0 2px rgba(255,90,95,.12);}`;
document.head.appendChild(style);
