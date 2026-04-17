import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useAuthStore } from "../../store/authStore";
import Navbar from "../../components/common/Navbar";
import { COUNTRIES, getCountry } from "../../utils/countries";

const GRADIENTS = [
  "from-coral-400   to-rose-600",
  "from-violet-400  to-indigo-600",
  "from-amber-400   to-orange-500",
  "from-emerald-400 to-teal-600",
  "from-sky-400     to-blue-600",
  "from-pink-400    to-fuchsia-600",
];

function CardGradient(id) { return GRADIENTS[id % GRADIENTS.length]; }

function fmtRange(s, e) {
  if (!s) return null;
  const fmt = (d) => new Date(d).toLocaleDateString("ko-KR", { month: "short", day: "numeric" });
  return `${new Date(s).getFullYear()}년 ${fmt(s)}${e ? ` ~ ${fmt(e)}` : ""}`;
}

export default function DashboardPage() {
  const { workspaces, fetchWorkspaces, createWorkspace, joinWorkspace } = useWorkspaceStore();
  const user     = useAuthStore((s) => s.user);
  const navigate = useNavigate();

  const [modal,            setModal]            = useState(null);
  const [joinCode,         setJoinCode]         = useState("");
  const [joinError,        setJoinError]        = useState("");
  const [form,             setForm]             = useState({ title: "", destination_country: "", start_date: "", end_date: "" });
  const [countrySearch,    setCountrySearch]    = useState("");
  const [showCountryList,  setShowCountryList]  = useState(false);

  useEffect(() => { fetchWorkspaces(); }, []);

  const filtered = countrySearch
    ? COUNTRIES.filter((c) => c.name.includes(countrySearch) || c.code.includes(countrySearch.toLowerCase()))
    : COUNTRIES;
  const selectedCountry = getCountry(form.destination_country);

  const closeModal = () => {
    setModal(null); setJoinCode(""); setJoinError("");
    setForm({ title: "", destination_country: "", start_date: "", end_date: "" });
    setCountrySearch(""); setShowCountryList(false);
  };

  const handleJoin = async (e) => {
    e.preventDefault(); setJoinError("");
    try {
      const ws = await joinWorkspace(joinCode.trim().toUpperCase());
      closeModal(); navigate(`/workspaces/${ws.id}`);
    } catch (err) { setJoinError(err.response?.data?.detail || "참여에 실패했습니다."); }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const ws = await createWorkspace({ title: form.title, destination_country: form.destination_country || null, start_date: form.start_date || null, end_date: form.end_date || null });
    closeModal(); navigate(`/workspaces/${ws.id}`);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* ── 히어로 헤더 ── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-8 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-black text-gray-800 tracking-tight">
              어디로 떠나볼까요,{" "}
              <span className="text-coral-500">{user?.name}</span>님?
            </h1>
            <p className="text-gray-400 mt-1.5 text-sm">새로운 여행을 시작하거나 초대 코드로 팀에 합류하세요</p>
          </div>
          <div className="flex gap-2.5">
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setModal("join")}
              className="btn-ghost text-sm font-bold"
            >
              코드로 참여
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setModal("create")}
              className="btn-coral text-sm"
            >
              + 새 여행 만들기
            </motion.button>
          </div>
        </div>
      </div>

      {/* ── Bento Grid ── */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {workspaces.length === 0 ? (
          /* 빈 상태 */
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="w-20 h-20 rounded-3xl bg-gray-100 flex items-center justify-center text-4xl mb-2">
              ✈️
            </div>
            <h3 className="text-xl font-black text-gray-700">아직 여행이 없어요</h3>
            <p className="text-sm text-gray-400 max-w-xs leading-relaxed">
              새 여행을 만들거나 친구의 초대 코드로 여행에 참여해보세요
            </p>
            <motion.button
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
              onClick={() => setModal("create")}
              className="btn-coral mt-2"
            >
              첫 여행 만들기
            </motion.button>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2 mb-5">
              <h2 className="text-lg font-black text-gray-800">내 여행</h2>
              <span className="text-xs font-bold text-gray-400 bg-gray-100 px-2.5 py-1 rounded-full">
                {workspaces.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {workspaces.map((ws, i) => {
                const country = getCountry(ws.destination_country);
                const dateStr = fmtRange(ws.start_date, ws.end_date);
                return (
                  <motion.div
                    key={ws.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
                    whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
                    onClick={() => navigate(`/workspaces/${ws.id}`)}
                    className="card-hover cursor-pointer overflow-hidden"
                  >
                    {/* 그라디언트 헤더 */}
                    <div className={`h-28 bg-gradient-to-br ${CardGradient(ws.id)} p-4 flex items-end justify-between`}>
                      <span className="text-4xl drop-shadow-md">{country ? country.flag : "🌍"}</span>
                      <span className="text-xs font-bold text-white/80 bg-white/20 backdrop-blur-sm
                                       px-2.5 py-1 rounded-full border border-white/30">
                        👥 {ws.members?.length ?? 0}명
                      </span>
                    </div>
                    {/* 본문 */}
                    <div className="p-4">
                      <h3 className="text-sm font-black text-gray-800 truncate mb-1">{ws.title}</h3>
                      <p className="text-xs text-gray-500">
                        {country ? `${country.flag} ${country.name}` : ws.destination_country || "목적지 미정"}
                      </p>
                      {dateStr && <p className="text-[11px] text-gray-400 mt-1">{dateStr}</p>}
                    </div>
                  </motion.div>
                );
              })}

              {/* 새 여행 카드 */}
              <motion.button
                whileHover={{ y: -4, transition: { type: "spring", stiffness: 400, damping: 25 } }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setModal("create")}
                className="flex flex-col items-center justify-center gap-3 h-48
                           border-2 border-dashed border-gray-200 rounded-2xl
                           text-gray-400 hover:text-coral-500 hover:border-coral-300 hover:bg-coral-50/50
                           transition-all duration-200 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-full border-2 border-current flex items-center justify-center text-lg font-bold">+</div>
                <p className="text-xs font-bold">새 여행 만들기</p>
              </motion.button>
            </div>
          </>
        )}
      </div>

      {/* ── 모달 ── */}
      <AnimatePresence>
        {modal && (
          <motion.div
            key="overlay"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-6"
            onClick={(e) => { if (e.target === e.currentTarget) closeModal(); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 28, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 300, damping: 26 } }}
              exit={{ opacity: 0, y: 12, scale: 0.97 }}
              className="bg-white rounded-3xl w-full max-w-[420px] shadow-glass-lg overflow-hidden"
            >
              {/* 모달 헤더 */}
              <div className="flex items-center justify-between px-7 pt-7 mb-1">
                <h3 className="text-xl font-black text-gray-800">
                  {modal === "join" ? "여행 참여하기" : "새 여행 만들기"}
                </h3>
                <button onClick={closeModal}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center
                             text-gray-400 text-sm transition-all">✕</button>
              </div>

              {modal === "join" && (
                <form onSubmit={handleJoin} className="px-7 pb-7 pt-4 space-y-4">
                  <p className="text-sm text-gray-400">친구에게 받은 초대 코드를 입력하세요</p>
                  <input
                    className="w-full text-center bg-gray-50 border-2 border-gray-200 rounded-2xl
                               px-4 py-4 text-2xl font-black text-gray-800 tracking-[0.4em] uppercase
                               outline-none focus:border-coral-500 focus:ring-4 focus:ring-coral-500/10
                               transition-all placeholder:text-gray-300 placeholder:tracking-widest"
                    placeholder="XXXXXXXX"
                    value={joinCode}
                    onChange={(e) => { setJoinCode(e.target.value); setJoinError(""); }}
                    maxLength={8} autoFocus required
                  />
                  {joinError && (
                    <p className="text-xs text-coral-500 bg-coral-50 rounded-xl px-4 py-2.5 font-medium">{joinError}</p>
                  )}
                  <ModalBtns onCancel={closeModal} submitLabel="참여하기" />
                </form>
              )}

              {modal === "create" && (
                <form onSubmit={handleCreate} className="px-7 pb-7 pt-4 space-y-4">
                  <MField label="여행 제목" required>
                    <input className="input-glass" placeholder="예: 오사카 봄 여행 2025"
                      value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
                  </MField>

                  {/* 국가 선택 */}
                  <MField label="여행 국가">
                    <div className="relative">
                      <div
                        className="input-glass flex items-center justify-between cursor-pointer"
                        onClick={() => setShowCountryList((v) => !v)}
                      >
                        {selectedCountry
                          ? <span className="text-gray-800 font-medium">{selectedCountry.flag} {selectedCountry.name}</span>
                          : <span className="text-gray-400">나라를 선택하세요</span>
                        }
                        <span className="text-gray-400 text-xs">▾</span>
                      </div>
                      <AnimatePresence>
                        {showCountryList && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
                            className="absolute top-[calc(100%+6px)] left-0 right-0 z-50
                                       bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden
                                       border border-gray-100 shadow-glass"
                          >
                            <input
                              className="w-full px-4 py-3 text-sm outline-none border-b border-gray-100 placeholder-gray-400"
                              placeholder="나라 검색…"
                              value={countrySearch}
                              onChange={(e) => setCountrySearch(e.target.value)}
                              autoFocus onClick={(e) => e.stopPropagation()}
                            />
                            <div className="max-h-52 overflow-y-auto">
                              {form.destination_country && (
                                <div className="px-4 py-2.5 cursor-pointer hover:bg-gray-50 border-b border-gray-50"
                                  onClick={() => { setForm((f) => ({ ...f, destination_country: "" })); setShowCountryList(false); }}>
                                  <span className="text-xs text-gray-400">선택 안 함</span>
                                </div>
                              )}
                              {filtered.map((c) => (
                                <div key={c.code}
                                  className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer hover:bg-coral-50
                                              border-b border-gray-50 last:border-0 transition-colors
                                              ${form.destination_country === c.code ? "bg-coral-50" : ""}`}
                                  onClick={() => { setForm((f) => ({ ...f, destination_country: c.code })); setShowCountryList(false); setCountrySearch(""); }}>
                                  <span className="text-xl">{c.flag}</span>
                                  <span className="text-sm font-medium text-gray-700">{c.name}</span>
                                </div>
                              ))}
                              {filtered.length === 0 && (
                                <p className="px-4 py-4 text-sm text-gray-400">검색 결과 없음</p>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </MField>

                  {/* 기간 */}
                  <MField label="여행 기간" optional>
                    <div className="flex gap-2 items-center">
                      <input type="date" className="input-glass flex-1" value={form.start_date}
                        onChange={(e) => setForm((f) => ({ ...f, start_date: e.target.value, end_date: f.end_date && f.end_date < e.target.value ? e.target.value : f.end_date }))} />
                      <span className="text-gray-300 text-lg">–</span>
                      <input type="date" className="input-glass flex-1" value={form.end_date}
                        min={form.start_date || undefined}
                        onChange={(e) => setForm((f) => ({ ...f, end_date: e.target.value }))} />
                    </div>
                  </MField>

                  <ModalBtns onCancel={closeModal} submitLabel="만들기" />
                </form>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MField({ label, required, optional, children }) {
  return (
    <div className="space-y-1.5">
      <label className="text-xs font-bold text-gray-600 uppercase tracking-widest flex items-center gap-1">
        {label}
        {required && <span className="text-coral-500">*</span>}
        {optional && <span className="text-gray-300 font-normal normal-case">(선택)</span>}
      </label>
      {children}
    </div>
  );
}

function ModalBtns({ onCancel, submitLabel }) {
  return (
    <div className="flex gap-2 pt-2">
      <button type="button" onClick={onCancel}
        className="flex-1 py-3 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-semibold transition-colors">
        취소
      </button>
      <motion.button type="submit"
        whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
        className="flex-[2] py-3 btn-coral rounded-2xl font-black text-base">
        {submitLabel}
      </motion.button>
    </div>
  );
}
