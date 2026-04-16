import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { WorkspaceSocket } from "../../services/websocket";
import Navbar from "../../components/common/Navbar";
import MapView from "../../components/map/MapView";
import ItineraryBoard from "../../components/itinerary/ItineraryBoard";
import ExpenseTracker from "../../components/expense/ExpenseTracker";
import { getCountry } from "../../utils/countries";

const TABS = ["지도", "일정", "가계부"];

function formatDate(iso) {
  if (!iso) return null;
  return new Date(iso).toLocaleDateString("ko-KR", { year: "numeric", month: "long", day: "numeric" });
}

function toDateInput(iso) {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const { fetchWorkspace, fetchDestinations, fetchItinerary, fetchFlights, fetchAccommodations, fetchExpenses, handleWsEvent, current, updateWorkspace } = useWorkspaceStore();

  const [tab, setTab] = useState("지도");
  const socketRef = useRef(null);

  const [editingDate, setEditingDate] = useState(false);
  const [dateForm, setDateForm] = useState({ start_date: "", end_date: "" });
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!current?.invite_code) return;
    navigator.clipboard.writeText(current.invite_code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

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

  const openDateEdit = () => {
    setDateForm({
      start_date: toDateInput(current?.start_date),
      end_date: toDateInput(current?.end_date),
    });
    setEditingDate(true);
  };

  const handleDateSave = async () => {
    await updateWorkspace(workspaceId, {
      start_date: dateForm.start_date || null,
      end_date: dateForm.end_date || null,
    });
    await fetchItinerary(workspaceId);
    setEditingDate(false);
  };

  const dateDisplay = current?.start_date
    ? `${formatDate(current.start_date)}${current.end_date ? ` ~ ${formatDate(current.end_date)}` : ""}`
    : null;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Navbar />
      <div style={styles.subbar}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={styles.wsTitle}>{current?.title || "..."}</span>
          {current?.destination_country && (
            <span style={styles.wsSub}>
              {(() => { const c = getCountry(current.destination_country); return c ? `${c.flag} ${c.name}` : current.destination_country; })()}
            </span>
          )}
          {dateDisplay && (
            <span style={styles.dateBadge}>{dateDisplay}</span>
          )}
          <button style={styles.editDateBtn} onClick={openDateEdit} title="여행 기간 수정">
            {dateDisplay ? "✏️" : "📅 기간 설정"}
          </button>
        </div>
        <div style={styles.inviteRow}>
          <span style={styles.inviteLabel}>초대 코드</span>
          <code style={styles.inviteCode}>{current?.invite_code}</code>
          <button style={styles.copyBtn} onClick={handleCopyCode}>
            {copied ? "✓ 복사됨" : "복사"}
          </button>
        </div>
      </div>

      {editingDate && (
        <div style={styles.modal}>
          <div style={styles.modalCard}>
            <h3 style={{ margin: "0 0 16px", fontSize: 16 }}>여행 기간 설정</h3>
            <div style={styles.dateRow}>
              <div style={{ flex: 1 }}>
                <p style={styles.dateLabel}>시작일</p>
                <input
                  style={styles.input}
                  type="date"
                  value={dateForm.start_date}
                  onChange={(e) => setDateForm((f) => ({
                    ...f,
                    start_date: e.target.value,
                    end_date: f.end_date && f.end_date < e.target.value ? e.target.value : f.end_date,
                  }))}
                />
              </div>
              <span style={styles.dateSep}>~</span>
              <div style={{ flex: 1 }}>
                <p style={styles.dateLabel}>종료일</p>
                <input
                  style={styles.input}
                  type="date"
                  value={dateForm.end_date}
                  min={dateForm.start_date || undefined}
                  onChange={(e) => setDateForm((f) => ({ ...f, end_date: e.target.value }))}
                />
              </div>
            </div>
            {(dateForm.start_date || dateForm.end_date) && (
              <button
                style={{ ...styles.clearBtn }}
                onClick={() => setDateForm({ start_date: "", end_date: "" })}
              >
                기간 삭제
              </button>
            )}
            <div style={styles.btnRow}>
              <button style={styles.cancelBtn} onClick={() => setEditingDate(false)}>취소</button>
              <button style={styles.saveBtn} onClick={handleDateSave}>저장</button>
            </div>
          </div>
        </div>
      )}
      <div style={styles.tabs}>
        {TABS.map((t) => (
          <button key={t} style={{ ...styles.tab, ...(tab === t ? styles.tabActive : {}) }} onClick={() => setTab(t)}>
            {t}
          </button>
        ))}
      </div>
      <div style={styles.content}>
        {tab === "지도" && <MapView workspaceId={workspaceId} />}
        {tab === "일정" && <ItineraryBoard workspaceId={workspaceId} />}
        {tab === "가계부" && <ExpenseTracker workspaceId={workspaceId} />}
      </div>
    </div>
  );
}

const styles = {
  subbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 20px", background: "#fff", borderBottom: "1px solid #e5e7eb", flexWrap: "wrap", gap: 8 },
  wsTitle: { fontWeight: 600, fontSize: 16 },
  wsSub: { color: "#6b7280", fontSize: 14, borderLeft: "1px solid #e5e7eb", paddingLeft: 8 },
  dateBadge: { fontSize: 13, color: "#4f46e5", background: "#eef2ff", padding: "2px 10px", borderRadius: 20 },
  editDateBtn: { fontSize: 12, color: "#6b7280", background: "none", border: "1px solid #e5e7eb", borderRadius: 6, padding: "2px 8px", cursor: "pointer" },
  inviteRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
  inviteLabel: { color: "#6b7280" },
  inviteCode: { background: "#f3f4f6", padding: "2px 8px", borderRadius: 4, letterSpacing: 1, fontFamily: "monospace" },
  copyBtn: { padding: "2px 8px", fontSize: 12, background: "none", border: "1px solid #d1d5db", borderRadius: 5, cursor: "pointer", color: "#4f46e5" },
  tabs: { display: "flex", background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 20px" },
  tab: { padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "#6b7280", borderBottom: "2px solid transparent" },
  tabActive: { color: "#4f46e5", borderBottom: "2px solid #4f46e5", fontWeight: 600 },
  content: { flex: 1, overflow: "hidden" },
  // 날짜 수정 모달
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard: { background: "#fff", borderRadius: 12, padding: 28, width: 380, display: "flex", flexDirection: "column", gap: 12 },
  dateRow: { display: "flex", alignItems: "flex-end", gap: 8 },
  dateLabel: { margin: "0 0 4px", fontSize: 12, color: "#6b7280" },
  dateSep: { color: "#9ca3af", paddingBottom: 10, fontSize: 18 },
  input: { width: "100%", padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 14, boxSizing: "border-box" },
  clearBtn: { fontSize: 12, color: "#ef4444", background: "none", border: "none", cursor: "pointer", textAlign: "left", padding: 0 },
  btnRow: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 },
  cancelBtn: { padding: "8px 16px", background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 },
  saveBtn: { padding: "8px 16px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 },
};
