import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useAuthStore } from "../../store/authStore";
import Navbar from "../../components/common/Navbar";
import { COUNTRIES, getCountry } from "../../utils/countries";

export default function DashboardPage() {
  const { workspaces, fetchWorkspaces, createWorkspace } = useWorkspaceStore();
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ title: "", destination_country: "" });
  const [countrySearch, setCountrySearch] = useState("");
  const [showCountryList, setShowCountryList] = useState(false);

  useEffect(() => { fetchWorkspaces(); }, []);

  const filteredCountries = countrySearch
    ? COUNTRIES.filter((c) => c.name.includes(countrySearch) || c.code.includes(countrySearch.toLowerCase()))
    : COUNTRIES;

  const selectedCountry = getCountry(form.destination_country);

  const handleCreate = async (e) => {
    e.preventDefault();
    const ws = await createWorkspace(form);
    setShowCreate(false);
    setForm({ title: "", destination_country: "" });
    setCountrySearch("");
    navigate(`/workspaces/${ws.id}`);
  };

  const handleSelectCountry = (code) => {
    setForm((f) => ({ ...f, destination_country: code }));
    setCountrySearch("");
    setShowCountryList(false);
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
              <h3 style={{ margin: "0 0 16px" }}>새 여행 만들기</h3>
              <form onSubmit={handleCreate} style={styles.form}>
                <input
                  style={styles.input}
                  placeholder="여행 제목"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  required
                />

                {/* 나라 선택 */}
                <div style={styles.countryWrapper}>
                  <div
                    style={{ ...styles.input, ...styles.countryTrigger }}
                    onClick={() => setShowCountryList((v) => !v)}
                  >
                    {selectedCountry
                      ? <span>{selectedCountry.flag} {selectedCountry.name}</span>
                      : <span style={{ color: "#9ca3af" }}>여행할 나라 선택</span>}
                    <span style={{ marginLeft: "auto", color: "#9ca3af" }}>▾</span>
                  </div>

                  {showCountryList && (
                    <div style={styles.countryDropdown}>
                      <input
                        style={styles.countrySearch}
                        placeholder="나라 검색..."
                        value={countrySearch}
                        onChange={(e) => setCountrySearch(e.target.value)}
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                      <div style={styles.countryList}>
                        {form.destination_country && (
                          <div
                            style={styles.countryItem}
                            onClick={() => handleSelectCountry("")}
                          >
                            <span style={{ color: "#9ca3af", fontSize: 13 }}>선택 안 함</span>
                          </div>
                        )}
                        {filteredCountries.map((c) => (
                          <div
                            key={c.code}
                            style={{
                              ...styles.countryItem,
                              ...(form.destination_country === c.code ? styles.countryItemActive : {}),
                            }}
                            onClick={() => handleSelectCountry(c.code)}
                          >
                            <span style={{ fontSize: 18, marginRight: 8 }}>{c.flag}</span>
                            <span style={{ fontSize: 14 }}>{c.name}</span>
                          </div>
                        ))}
                        {filteredCountries.length === 0 && (
                          <p style={{ padding: "12px 16px", color: "#9ca3af", fontSize: 13, margin: 0 }}>결과 없음</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                <div style={styles.row}>
                  <button type="button" style={styles.cancelBtn} onClick={() => { setShowCreate(false); setShowCountryList(false); }}>취소</button>
                  <button type="submit" style={styles.btn}>만들기</button>
                </div>
              </form>
            </div>
          </div>
        )}

        <div style={styles.grid}>
          {workspaces.map((ws) => {
            const country = getCountry(ws.destination_country);
            return (
              <div key={ws.id} style={styles.card} onClick={() => navigate(`/workspaces/${ws.id}`)}>
                <div style={styles.cardFlag}>{country ? country.flag : "🌍"}</div>
                <h3 style={styles.cardTitle}>{ws.title}</h3>
                <p style={styles.cardMeta}>
                  {country ? country.name : ws.destination_country || "목적지 미정"} · {ws.members?.length ?? 0}명
                </p>
                {ws.start_date && (
                  <p style={styles.cardDate}>
                    {new Date(ws.start_date).toLocaleDateString("ko-KR")}
                    {ws.end_date && ` ~ ${new Date(ws.end_date).toLocaleDateString("ko-KR")}`}
                  </p>
                )}
              </div>
            );
          })}
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
  card: { background: "#fff", borderRadius: 12, padding: 20, boxShadow: "0 2px 8px rgba(0,0,0,0.08)", cursor: "pointer" },
  cardFlag: { fontSize: 28, marginBottom: 8 },
  cardTitle: { margin: "0 0 4px", fontSize: 17, fontWeight: 600 },
  cardMeta: { margin: 0, fontSize: 13, color: "#6b7280" },
  cardDate: { margin: "4px 0 0", fontSize: 12, color: "#9ca3af" },
  modal: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modalCard: { background: "#fff", borderRadius: 12, padding: 32, width: 380 },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15 },
  row: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 },
  // 나라 선택
  countryWrapper: { position: "relative" },
  countryTrigger: { display: "flex", alignItems: "center", cursor: "pointer", userSelect: "none", background: "#fff" },
  countryDropdown: { position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 100, overflow: "hidden" },
  countrySearch: { width: "100%", padding: "10px 14px", border: "none", borderBottom: "1px solid #e5e7eb", fontSize: 14, outline: "none", boxSizing: "border-box" },
  countryList: { maxHeight: 240, overflowY: "auto" },
  countryItem: { display: "flex", alignItems: "center", padding: "9px 14px", cursor: "pointer", transition: "background 0.1s" },
  countryItemActive: { background: "#eef2ff" },
};
