import { useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { expenseApi } from "../../services/api";

const CATS = [
  { value: "transport",     label: "교통", icon: "🚌" },
  { value: "food",          label: "식비", icon: "🍜" },
  { value: "accommodation", label: "숙박", icon: "🏨" },
  { value: "activity",      label: "활동", icon: "🎡" },
  { value: "shopping",      label: "쇼핑", icon: "🛍️" },
  { value: "other",         label: "기타", icon: "📌" },
];

const CURRENCIES = ["KRW", "USD", "JPY", "EUR", "CNY", "THB", "SGD", "AUD"];

export default function ExpenseForm({ workspaceId, members, onClose }) {
  const [form, setForm] = useState({
    title: "", amount: "", currency: "KRW", category: "other",
    participant_ids: members.map((m) => m.user.id), date: "", note: "",
  });
  const [loading, setLoading] = useState(false);

  const set = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const toggleParticipant = (uid) => {
    setForm((f) => ({
      ...f,
      participant_ids: f.participant_ids.includes(uid)
        ? f.participant_ids.filter((id) => id !== uid)
        : [...f.participant_ids, uid],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await expenseApi.create(workspaceId, { ...form, amount: parseFloat(form.amount), date: form.date || null });
      onClose();
    } finally { setLoading(false); }
  };

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="overlay"
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] bg-black/50 backdrop-blur-sm flex items-end sm:items-center justify-center sm:p-6"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <motion.div
          initial={{ opacity: 0, y: 48 }}
          animate={{ opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 26 } }}
          exit={{ opacity: 0, y: 32 }}
          className="bg-white/95 backdrop-blur-xl w-full sm:max-w-md max-h-[92vh] sm:max-h-[90vh]
                     overflow-y-auto shadow-glass-lg border border-white/60
                     rounded-t-3xl sm:rounded-3xl"
        >
          {/* 모바일 드래그 핸들 */}
          <div className="sm:hidden flex justify-center pt-3 pb-1">
            <div className="w-10 h-1 bg-gray-200 rounded-full" />
          </div>

          {/* 헤더 */}
          <div className="flex items-center justify-between px-5 sm:px-6 pt-3 sm:pt-6 pb-0">
            <h3 className="text-xl font-black text-gray-800 tracking-tight">지출 추가</h3>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center
                         text-gray-400 hover:text-gray-600 transition-all duration-150 text-sm">
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="px-5 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
            {/* 항목명 */}
            <Field label="항목명" required>
              <input className="input-glass" name="title" placeholder="예: 오사카성 입장료"
                value={form.title} onChange={(e) => set("title", e.target.value)} required autoFocus />
            </Field>

            {/* 금액 + 통화 */}
            <Field label="금액" required>
              <div className="flex gap-2">
                <input className="input-glass flex-1" type="number" placeholder="0" min="0"
                  value={form.amount} onChange={(e) => set("amount", e.target.value)} required />
                <select className="input-glass w-24 flex-shrink-0" value={form.currency}
                  onChange={(e) => set("currency", e.target.value)}>
                  {CURRENCIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
            </Field>

            {/* 카테고리 */}
            <Field label="카테고리">
              <div className="grid grid-cols-3 gap-2">
                {CATS.map((c) => (
                  <button key={c.value} type="button" onClick={() => set("category", c.value)}
                    className={`flex flex-col items-center gap-1 py-2.5 px-2 rounded-2xl border-2 text-xs font-semibold
                                transition-all duration-150
                                ${form.category === c.value
                                  ? "border-coral-500 bg-coral-50 text-coral-600 shadow-float"
                                  : "border-gray-100 bg-gray-50 text-gray-500 hover:border-gray-200 hover:bg-gray-100"
                                }`}>
                    <span className="text-xl">{c.icon}</span>
                    {c.label}
                  </button>
                ))}
              </div>
            </Field>

            {/* 날짜 */}
            <Field label="날짜" optional>
              <input className="input-glass" type="date" value={form.date}
                onChange={(e) => set("date", e.target.value)} />
            </Field>

            {/* 참여자 */}
            {members.length > 0 && (
              <Field label="참여자">
                <div className="flex flex-wrap gap-2">
                  {members.map((m) => {
                    const on = form.participant_ids.includes(m.user.id);
                    return (
                      <button key={m.user.id} type="button" onClick={() => toggleParticipant(m.user.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full border-2 text-xs font-semibold
                                    transition-all duration-150
                                    ${on
                                      ? "border-coral-500 bg-coral-50 text-coral-600"
                                      : "border-gray-200 bg-white text-gray-500 hover:border-gray-300"
                                    }`}>
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black
                                          ${on ? "bg-coral-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                          {m.user.name[0]}
                        </div>
                        {m.user.name}
                        {on && <span className="text-coral-400 text-[10px]">✓</span>}
                      </button>
                    );
                  })}
                </div>
              </Field>
            )}

            {/* 메모 */}
            <Field label="메모" optional>
              <textarea className="input-glass resize-none" rows={2} placeholder="추가 메모…"
                value={form.note} onChange={(e) => set("note", e.target.value)} />
            </Field>

            {/* 버튼 */}
            <div className="flex gap-2 pt-1">
              <button type="button" onClick={onClose}
                className="flex-1 py-3.5 bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-2xl font-semibold transition-colors">
                취소
              </button>
              <motion.button type="submit" disabled={loading}
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                className="flex-[2] py-3.5 bg-coral-500 hover:bg-coral-600 disabled:opacity-50
                           text-white rounded-2xl font-black tracking-tight transition-colors shadow-float">
                {loading ? "저장 중…" : "저장하기"}
              </motion.button>
            </div>
          </form>
        </motion.div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
}

function Field({ label, required, optional, children }) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-1.5 text-xs font-bold text-gray-600 uppercase tracking-widest">
        {label}
        {required && <span className="text-coral-500">*</span>}
        {optional && <span className="text-gray-300 font-normal normal-case tracking-normal">(선택)</span>}
      </label>
      {children}
    </div>
  );
}
