import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { WorkspaceSocket } from "../../services/websocket";
import Navbar from "../../components/common/Navbar";
import MapView from "../../components/map/MapView";
import ItineraryBoard from "../../components/itinerary/ItineraryBoard";
import ExpenseTracker from "../../components/expense/ExpenseTracker";

const TABS = ["지도", "일정", "가계부"];

export default function WorkspacePage() {
  const { workspaceId } = useParams();
  const { fetchWorkspace, fetchDestinations, fetchItinerary, fetchFlights, fetchAccommodations, fetchExpenses, handleWsEvent, current } = useWorkspaceStore();
  const [tab, setTab] = useState("지도");
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

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      <Navbar />
      <div style={styles.subbar}>
        <div>
          <span style={styles.wsTitle}>{current?.title || "..."}</span>
          {current?.destination_country && <span style={styles.wsSub}> · {current.destination_country}</span>}
        </div>
        <div style={styles.inviteRow}>
          <span style={styles.inviteLabel}>초대 코드:</span>
          <code style={styles.inviteCode}>{current?.invite_code}</code>
        </div>
      </div>
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
  subbar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 20px", background: "#fff", borderBottom: "1px solid #e5e7eb" },
  wsTitle: { fontWeight: 600, fontSize: 16 },
  wsSub: { color: "#6b7280", fontSize: 14 },
  inviteRow: { display: "flex", alignItems: "center", gap: 6, fontSize: 13 },
  inviteLabel: { color: "#6b7280" },
  inviteCode: { background: "#f3f4f6", padding: "2px 8px", borderRadius: 4, letterSpacing: 1 },
  tabs: { display: "flex", background: "#fff", borderBottom: "1px solid #e5e7eb", padding: "0 20px" },
  tab: { padding: "10px 16px", border: "none", background: "none", cursor: "pointer", fontSize: 14, color: "#6b7280", borderBottom: "2px solid transparent" },
  tabActive: { color: "#4f46e5", borderBottom: "2px solid #4f46e5", fontWeight: 600 },
  content: { flex: 1, overflow: "hidden" },
};
