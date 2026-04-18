import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { WorkspaceSocket } from "../../services/websocket";
import GlassNavbar from "../../components/common/Navbar";
import MapView from "../../components/map/MapView";
import ItineraryBoard from "../../components/itinerary/ItineraryBoard";
import ExpenseTracker from "../../components/expense/ExpenseTracker";
import { getCountry } from "../../utils/countries";

const TABS = [
  { id: "지도",   icon: "🗺️", label: "지도"   },
  { id: "일정",   icon: "📅", label: "일정"   },
  { id: "가계부", icon: "💰", label: "가계부" },
];

function toDateInput(iso) { return iso ? iso.slice(0, 10) : ""; }
function fmtDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
}

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const navigate = useNavigate();
  const {
    fetchWorkspace, fetchDestinations, fetchItinerary, fetchFlights,
    fetchAccommodations, fetchExpenses, handleWsEvent, current, updateWorkspace,
  } = useWorkspaceStore();

  const [tab, setTab]               = useState("지도");
  const [editDate, setEditDate]     = useState(false);
  const [dateForm, setDateForm]     = useState({ start_date: "", end_date: "" });
  const [copied, setCopied]         = useState(false);
  const [focusedDestination, setFocusedDestination] = useState(null);
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 640);
  const [panelVisible, setPanelVisible] = useState(true);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchWorkspace(workspaceId);
    fetchDestinations(workspaceId);
    fetchItinerary(workspaceId);
    fetchFlights(workspaceId);
    fetchAccommodations(workspaceId);
    fetchExpenses(workspaceId);
    socketRef.current = new WorkspaceSocket(workspaceId, handleWsEvent);
    socketRef.current.connect();
    return () => socketRef.current?.disconnect();
  }, [workspaceId]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  const openDateEdit = () => {
    setDateForm({ start_date: toDateInput(current?.start_date), end_date: toDateInput(current?.end_date) });
    setEditDate(true);
  };
  const saveDates = async () => {
    await updateWorkspace(workspaceId, { start_date: dateForm.start_date || null, end_date: dateForm.end_date || null });
    await fetchItinerary(workspaceId);
    setEditDate(false);
  };
  const copyCode = () => {
    if (!current?.invite_code) return;
    navigator.clipboard.writeText(current.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const country   = current?.destination_country ? getCountry(current.destination_country) : null;
  const dateLabel = current?.start_date
    ? `${fmtDate(current.start_date)}${current.end_date ? ` ~ ${fmtDate(current.end_date)}` : ""}`
    : null;

  const slideUp = {
    hidden:  { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
    exit:    { opacity: 0, y: 12, transition: { duration: 0.15 } },
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-gray-200">

      {/* ━━━ 풀스크린 지도 (항상 렌더링) ━━━ */}
      <div className="absolute inset-0 z-0">
        <MapView
          workspaceId={workspaceId}
          fullscreen
          focusedDestination={focusedDestination}
          panOffset={tab === "지도" && panelVisible && !isMobile ? { x: -160, y: 0 } : null}
        />
      </div>

      {/* ━━━ 상단 글래스 Navbar ━━━ */}
      <div className="absolute top-0 inset-x-0 z-50">
        <GlassNavbar />
      </div>

      {/* ━━━ 워크스페이스 정보 바 ━━━ */}
      <div className="absolute top-16 inset-x-0 z-40 flex items-center justify-between px-3 sm:px-5 py-2 gap-2">

        {/* 왼쪽: 뒤로 + 워크스페이스 제목 */}
        <div className="flex items-center gap-2 min-w-0">
          <button
            onClick={() => navigate("/")}
            className="glass rounded-full p-2 text-gray-500 hover:text-coral-500 transition-colors duration-150 flex-shrink-0"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div className="glass rounded-2xl px-3 py-2 flex items-center gap-1.5 min-w-0">
            <span className="font-bold text-gray-800 text-sm truncate">{current?.title || "…"}</span>
            {country && (
              <span className="text-sm text-gray-500 flex-shrink-0">
                {country.flag}
                <span className="hidden sm:inline"> {country.name}</span>
              </span>
            )}
            {/* 날짜: 데스크톱에서만 표시 */}
            <span className="hidden sm:inline">
              {dateLabel ? (
                <button
                  onClick={openDateEdit}
                  className="text-xs text-coral-500 bg-coral-50 px-2.5 py-1 rounded-full font-semibold
                             hover:bg-coral-100 transition-colors duration-150 whitespace-nowrap"
                >
                  📅 {dateLabel}
                </button>
              ) : (
                <button
                  onClick={openDateEdit}
                  className="text-xs text-gray-400 bg-gray-100/80 px-2.5 py-1 rounded-full font-medium
                             hover:text-coral-500 hover:bg-coral-50 transition-colors duration-150 whitespace-nowrap"
                >
                  + 기간 설정
                </button>
              )}
            </span>
            {/* 날짜: 모바일에서는 아이콘만 */}
            {dateLabel && (
              <button
                onClick={openDateEdit}
                className="sm:hidden text-sm flex-shrink-0"
                title={dateLabel}
              >
                📅
              </button>
            )}
          </div>
        </div>

        {/* 오른쪽: 초대 코드 */}
        <div className="glass rounded-2xl px-2 sm:px-3 py-2 flex items-center gap-1.5 flex-shrink-0">
          <span className="hidden sm:inline text-xs text-gray-400 font-medium">초대 코드</span>
          <code className="hidden sm:inline text-sm font-bold text-gray-700 tracking-widest">{current?.invite_code}</code>
          {/* 모바일: 코드만 작게 표시 */}
          <code className="sm:hidden text-xs font-bold text-gray-700 tracking-wider">{current?.invite_code}</code>
          <button
            onClick={copyCode}
            className={`text-xs font-semibold px-2 py-1 rounded-lg transition-all duration-150 whitespace-nowrap
              ${copied
                ? "bg-emerald-100 text-emerald-600"
                : "bg-coral-50 text-coral-500 hover:bg-coral-100"
              }`}
          >
            {copied ? "✓" : "복사"}
          </button>
        </div>
      </div>

      {/* ━━━ 탭 셀렉터 + 패널 토글 버튼 ━━━ */}
      <div className="absolute top-[116px] left-1/2 -translate-x-1/2 z-40 flex items-center gap-2">
        {/* 패널 토글 버튼 (지도 탭일 때만) */}
        <AnimatePresence>
          {tab === "지도" && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => setPanelVisible((v) => !v)}
              className="glass rounded-full p-2 text-gray-500 hover:text-coral-500 shadow-glass transition-colors duration-150"
              title={panelVisible ? "패널 숨기기" : "패널 보기"}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                {panelVisible
                  ? <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 19l-7-7 7-7M19.5 19l-7-7 7-7" />
                  : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h10M4 18h16" />
                }
              </svg>
            </motion.button>
          )}
        </AnimatePresence>
        <div className="glass rounded-full p-1 flex gap-0.5 shadow-glass">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => { setTab(t.id); setPanelVisible(true); }}
              className={`relative px-3 sm:px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200
                ${tab === t.id ? "text-white shadow-float" : "text-gray-500 hover:text-gray-800"}`}
            >
              {tab === t.id && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-coral-500 rounded-full"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1">
                {t.icon}
                <span className="hidden sm:inline">{t.label}</span>
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* ━━━ 콘텐츠 패널 ━━━ */}
      <AnimatePresence mode="wait">

        {/* 지도 탭: 모바일=바텀시트 / 데스크톱=왼쪽 사이드 패널 */}
        {tab === "지도" && panelVisible && (
          <motion.div
            key="map-panel"
            variants={slideUp}
            initial="hidden" animate="visible" exit="exit"
            className="
              absolute z-30 rounded-3xl overflow-hidden flex flex-col
              left-3 right-3 bottom-3 max-h-[52vh]
              sm:left-4 sm:right-auto sm:top-44 sm:bottom-4 sm:w-80 sm:max-h-none
            "
          >
            <MapView workspaceId={workspaceId} sidebarOnly onFocusDestination={setFocusedDestination} />
          </motion.div>
        )}

        {/* 일정 탭 */}
        {tab === "일정" && (
          <motion.div
            key="itinerary-panel"
            variants={slideUp}
            initial="hidden" animate="visible" exit="exit"
            className="absolute inset-x-3 sm:inset-x-4 top-44 bottom-3 sm:bottom-4 z-30 rounded-3xl overflow-hidden"
          >
            <ItineraryBoard workspaceId={workspaceId} />
          </motion.div>
        )}

        {/* 가계부 탭 */}
        {tab === "가계부" && (
          <motion.div
            key="expense-panel"
            variants={slideUp}
            initial="hidden" animate="visible" exit="exit"
            className="absolute inset-x-3 sm:inset-x-4 top-44 bottom-3 sm:bottom-4 z-30 rounded-3xl overflow-hidden"
          >
            <ExpenseTracker workspaceId={workspaceId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ━━━ 날짜 수정 모달 ━━━ */}
      <AnimatePresence>
        {editDate && (
          <motion.div
            key="date-overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="absolute inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setEditDate(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 24, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 25 } }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="bg-white rounded-3xl p-6 sm:p-8 w-full max-w-md shadow-glass-lg"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-gray-800">여행 기간 설정</h3>
                <button onClick={() => setEditDate(false)} className="text-gray-400 hover:text-gray-600 p-1">✕</button>
              </div>
              <div className="flex gap-3 items-end mb-4">
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">시작일</label>
                  <input type="date" value={dateForm.start_date}
                    onChange={(e) => setDateForm((f) => ({
                      ...f, start_date: e.target.value,
                      end_date: f.end_date && f.end_date < e.target.value ? e.target.value : f.end_date,
                    }))}
                    className="input-glass"
                  />
                </div>
                <span className="text-gray-300 pb-3 text-lg">–</span>
                <div className="flex-1">
                  <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5 block">종료일</label>
                  <input type="date" value={dateForm.end_date} min={dateForm.start_date || undefined}
                    onChange={(e) => setDateForm((f) => ({ ...f, end_date: e.target.value }))}
                    className="input-glass"
                  />
                </div>
              </div>
              {(dateForm.start_date || dateForm.end_date) && (
                <button onClick={() => setDateForm({ start_date: "", end_date: "" })}
                  className="text-xs text-coral-500 font-medium mb-4 hover:text-coral-600">
                  기간 삭제
                </button>
              )}
              <div className="flex gap-2 mt-2">
                <button onClick={() => setEditDate(false)}
                  className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-colors">
                  취소
                </button>
                <button onClick={saveDates}
                  className="flex-2 flex-1 py-3 btn-coral rounded-xl font-bold">
                  저장
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
