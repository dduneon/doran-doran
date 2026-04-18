import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useAuthStore } from "../../store/authStore";
import ExpenseForm from "./ExpenseForm";
import { expenseApi } from "../../services/api";

const CATS = {
  transport:     { label: "교통",  icon: "🚌", color: "bg-blue-100   text-blue-600",   bar: "#3B82F6" },
  food:          { label: "식비",  icon: "🍜", color: "bg-amber-100  text-amber-600",  bar: "#F59E0B" },
  accommodation: { label: "숙박",  icon: "🏨", color: "bg-violet-100 text-violet-600", bar: "#8B5CF6" },
  activity:      { label: "활동",  icon: "🎡", color: "bg-emerald-100 text-emerald-600", bar: "#10B981" },
  shopping:      { label: "쇼핑",  icon: "🛍️", color: "bg-pink-100   text-pink-600",   bar: "#EC4899" },
  other:         { label: "기타",  icon: "📌", color: "bg-gray-100   text-gray-500",   bar: "#9CA3AF" },
};

export default function ExpenseTracker({ workspaceId }) {
  const { expenses, expenseSummary, fetchExpenses, fetchExpenseSummary } = useWorkspaceStore();
  const { current: workspace } = useWorkspaceStore();
  const user                   = useAuthStore((s) => s.user);
  const [showForm,   setShowForm]   = useState(false);
  const [filter,     setFilter]     = useState("all");
  const [mobileTab,  setMobileTab]  = useState("list"); // "list" | "summary"

  const reload = () => { fetchExpenses(workspaceId); fetchExpenseSummary(workspaceId); };
  useEffect(() => { reload(); }, [workspaceId]);

  const handleDelete = async (id) => { await expenseApi.delete(workspaceId, id); reload(); };

  const memberMap = Object.fromEntries((workspace?.members || []).map((m) => [m.user.id, m.user.name]));
  const filtered  = filter === "all" ? expenses : expenses.filter((e) => e.category === filter);
  const totals    = expenseSummary?.totals_by_currency || {};
  const krwTotal  = totals["KRW"] || 0;

  return (
    <div className="h-full flex flex-col glass rounded-3xl overflow-hidden">

      {/* ── 모바일 내부 탭 ── */}
      <div className="sm:hidden flex border-b border-white/40 flex-shrink-0">
        {[["list", "💳 내역"], ["summary", "📊 정산"]].map(([id, label]) => (
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
          </button>
        ))}
      </div>

      {/* ── 본문 ── */}
      <div className="flex-1 flex overflow-hidden">

        {/* 메인 지출 내역 */}
        <div className={`flex-1 flex flex-col overflow-hidden ${mobileTab === "list" ? "" : "hidden sm:flex"}`}>
          {/* 헤더 */}
          <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-white/40 flex-shrink-0">
            <div>
              <h2 className="text-base sm:text-lg font-black text-gray-800 tracking-tight">지출 내역</h2>
              <p className="text-xs text-gray-400 mt-0.5">{expenses.length}건의 지출 기록</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowForm(true)}
              className="btn-coral text-sm"
            >
              + 지출 추가
            </motion.button>
          </div>

          {/* 카테고리 필터 */}
          <div className="flex gap-2 px-4 sm:px-6 py-3 border-b border-white/40 overflow-x-auto flex-shrink-0">
            <FilterChip label="전체" count={expenses.length} active={filter === "all"} onClick={() => setFilter("all")} />
            {Object.entries(CATS).map(([key, c]) => {
              const n = expenses.filter((e) => e.category === key).length;
              return n > 0
                ? <FilterChip key={key} label={`${c.icon} ${c.label}`} count={n} active={filter === key} onClick={() => setFilter(key)} />
                : null;
            })}
          </div>

          {/* 리스트 */}
          <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-3 space-y-2">
            {filtered.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <span className="text-5xl opacity-30">💳</span>
                <p className="text-sm font-semibold text-gray-500">지출 내역이 없어요</p>
                <p className="text-xs text-gray-400">여행 경비를 기록해보세요</p>
              </div>
            ) : (
              <AnimatePresence>
                {filtered.map((e) => {
                  const cat = CATS[e.category] || CATS.other;
                  return (
                    <motion.div
                      key={e.id}
                      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -16 }}
                      whileHover={{ y: -1, boxShadow: "0 4px 16px rgba(0,0,0,0.08)" }}
                      className="flex items-center gap-3 p-3 sm:p-4 bg-white rounded-2xl border border-gray-100
                                 shadow-[0_1px_4px_rgba(0,0,0,0.05)] transition-shadow duration-150 group"
                    >
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-2xl flex items-center justify-center text-lg flex-shrink-0 ${cat.color.split(" ")[0]}`}>
                        {cat.icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="text-sm font-bold text-gray-800 truncate">{e.title}</p>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${cat.color}`}>
                            {cat.label}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-0.5 truncate">
                          {e.paid_by_user?.name} 결제{e.date && ` · ${e.date}`}
                          {e.participants?.length > 0 && ` · ${e.participants.length}명`}
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <div className="text-right">
                          <span className="text-sm sm:text-base font-black text-gray-800">
                            {e.amount.toLocaleString("ko-KR")}
                          </span>
                          <span className="text-xs text-gray-400 ml-1">{e.currency}</span>
                        </div>
                        <button onClick={() => handleDelete(e.id)}
                          className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-coral-400
                                     transition-all duration-150 text-xs p-1">
                          ✕
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            )}
          </div>
        </div>

        {/* 정산 패널 */}
        <div className={`
          sm:w-72 sm:flex-shrink-0 sm:border-l sm:border-white/40 sm:overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5
          ${mobileTab === "summary" ? "flex-1 overflow-y-auto" : "hidden sm:block"}
        `}>
          {/* 총 지출 카드 */}
          <div className="bg-gradient-to-br from-coral-500 to-coral-700 rounded-3xl p-5 text-white">
            <p className="text-xs font-bold opacity-70 uppercase tracking-widest mb-3">총 지출 합계</p>
            {Object.keys(totals).length === 0 ? (
              <p className="text-sm opacity-60">아직 지출이 없어요</p>
            ) : (
              Object.entries(totals).map(([cur, amt]) => (
                <div key={cur} className="flex items-baseline gap-2">
                  <span className="text-3xl font-black tracking-tight">{amt.toLocaleString("ko-KR")}</span>
                  <span className="text-sm font-semibold opacity-80">{cur}</span>
                </div>
              ))
            )}
          </div>

          {/* 카테고리 분석 */}
          {expenses.length > 0 && krwTotal > 0 && (
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/50">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">카테고리별</p>
              <div className="space-y-2.5">
                {Object.entries(CATS).map(([key, cat]) => {
                  const sum = expenses.filter((e) => e.category === key && e.currency === "KRW")
                                      .reduce((s, e) => s + e.amount, 0);
                  if (!sum) return null;
                  const pct = Math.round((sum / krwTotal) * 100);
                  return (
                    <div key={key} className="flex items-center gap-2">
                      <span className="text-sm w-5">{cat.icon}</span>
                      <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.6, ease: "easeOut" }}
                          className="h-full rounded-full"
                          style={{ background: cat.bar }}
                        />
                      </div>
                      <span className="text-[11px] text-gray-400 w-7 text-right font-medium">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* 인당 정산 */}
          {expenseSummary && (
            <div className="bg-white/60 backdrop-blur-sm rounded-2xl p-4 border border-white/50">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-widest mb-3">인당 정산</p>
              <div className="space-y-2">
                {Object.entries(expenseSummary.per_person).map(([uid, byCur]) => {
                  const nonZero = Object.entries(byCur).filter(([, v]) => Math.round(v) !== 0);
                  if (!nonZero.length) return null;
                  const isPos = nonZero.every(([, v]) => v > 0);
                  return (
                    <div key={uid} className="flex items-start gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-coral-400 to-coral-600
                                      text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                        {(memberMap[uid] || "?")[0]}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-gray-700 truncate">{memberMap[uid] || uid}</p>
                        {nonZero.map(([cur, amt]) => (
                          <p key={cur} className={`text-xs font-bold ${amt > 0 ? "text-emerald-500" : "text-coral-500"}`}>
                            {amt > 0 ? "+" : ""}{Math.round(amt).toLocaleString("ko-KR")} {cur}
                          </p>
                        ))}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0
                        ${isPos ? "bg-emerald-100 text-emerald-600" : "bg-coral-100 text-coral-600"}`}>
                        {isPos ? "받을 것" : "낼 것"}
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 mt-3 leading-relaxed">
                <span className="text-emerald-500 font-semibold">+</span> 받을 금액 &nbsp;
                <span className="text-coral-500 font-semibold">−</span> 낼 금액
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 지출 추가 폼 모달 */}
      {showForm && (
        <ExpenseForm
          workspaceId={workspaceId}
          members={workspace?.members || []}
          onClose={() => { setShowForm(false); reload(); }}
        />
      )}
    </div>
  );
}

function FilterChip({ label, count, active, onClick }) {
  return (
    <button onClick={onClick}
      className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold
                  transition-all duration-150
                  ${active
                    ? "bg-coral-500 text-white shadow-float"
                    : "bg-white/70 text-gray-500 hover:bg-white border border-gray-200/80"
                  }`}>
      {label}
      <span className={`text-[10px] font-bold ${active ? "text-coral-100" : "text-gray-400"}`}>{count}</span>
    </button>
  );
}
