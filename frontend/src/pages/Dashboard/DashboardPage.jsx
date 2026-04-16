import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useAuthStore } from "../../store/authStore";
import Navbar from "../../components/common/Navbar";
import { workspaceApi } from "../../services/api";

export default function DashboardPage() {
  const { workspaces, fetchWorkspaces, createWorkspace } = useWorkspaceStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", destination_country: "" });
  const [joinCode, setJoinCode] = useState("");

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    const ws = await createWorkspace(form);
    setShowCreate(false);
    navigate(`/workspaces/${ws.id}`);
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    // Invite code format: WSID:CODE — for simplicity user pastes invite link
    // In production, the URL would carry workspace ID
    alert("초대 코드 기능은 워크스페이스 페이지에서 링크를 공유하세요.");
  };

  return (
    <div>
      <Navbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <h2 style={styles.greeting}>안녕하세요, {user?.name}님!</h2>
          <button style={styles.btn} onClick={() => setShowCreate(true)}>+ 새 여행 만들기</button>
        </div>

        {showCreate && (
          <div style={styles.modal}>
            <div style={styles.modalCard}>
              <h3>새 여행 만들기</h3>
              <form onSubmit={handleCreate} style={styles.form}>
                <input style={styles.input} placeholder="여행 제목" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                <input style={styles.input} placeholder="여행지 (예: 일본)" value={form.destination_country} onChange={(e) => setForm({ ...form, destination_country: e.target.value })} />
                <div style={styles.row}>
                  <button type="button" style={styles.cancelBtn} onClick={() => setShowCreate(false)}>취소</button>
                  <button type="submit" style={styles.btn}>만들기</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div style={styles.grid}>
          {workspaces.map((ws) => (
            <div key={ws.id} style={styles.card} onClick={() => navigate(`/workspaces/${ws.id}`)}>
              <div style={styles.cardFlag}>{ws.destination_country || "🌍"}</div>
              <h3 style={styles.cardTitle}>{ws.title}</h3>
              <p style={styles.cardMeta}>{ws.members?.length ?? 0}명 참여 중</p>
              {ws.start_date && (
                <p style={styles.cardDate}>
                  {new Date(ws.start_date).toLocaleDateString("ko-KR")}
                  {ws.end_date && ` ~ ${new Date(ws.end_date).toLocaleDateString("ko-KR")}`}
                </p>
              )}
            </div>
          ))}
          {workspaces.length === 0 && (
            <p style={{ color: "#9ca3af" }}>아직 여행이 없습니다. 새 여행을 만들어보세요!</p>
          )}
        </div>
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 960, margin: "0 auto", padding: "24px 16px" },
  header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 },
  greeting: { margin: 0, fontSize: 22 },
  btn: { padding: "10px 18px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 },
  cancelBtn: { padding: "10px 18px", background: "#e5e7eb", color: "#374151", border: "none", borderRadius: 8, cursor: "pointer", fontSize: 14 },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 16 },
  card: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer", transition: "transform 0.15s", ":hover": { transform: "translateY(-2px)" } },
  cardFlag: { fontSize: 28, marginBottom: 8 },
  cardTitle: { margin: "0 0 4px", fontSize: 17, fontWeight: 600 },
  cardMeta: { margin: 0, fontSize: 13, color: "#6b7280" },
  cardDate: { margin: "4px 0 0", fontSize: 12, color: "#9ca3af" },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard: { background: "#fff", borderRadius: 12, padding: 32, width: 360 },
  form: { display: "flex", flexDirection: "column", gap: 12, marginTop: 16 },
  input: { padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15 },
  row: { display: "flex", gap: 8, justifyContent: "flex-end" },
};
