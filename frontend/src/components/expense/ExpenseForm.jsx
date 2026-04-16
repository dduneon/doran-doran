import { useState } from "react";
import { expenseApi } from "../../services/api";

const CATEGORIES = [
  { value: "transport", label: "교통" },
  { value: "food", label: "식비" },
  { value: "accommodation", label: "숙박" },
  { value: "activity", label: "활동" },
  { value: "shopping", label: "쇼핑" },
  { value: "other", label: "기타" },
];

export default function ExpenseForm({ workspaceId, members, onClose }) {
  const [form, setForm] = useState({
    title: "",
    amount: "",
    currency: "KRW",
    category: "other",
    participant_ids: members.map((m) => m.user.id),
    date: "",
    note: "",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

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
    await expenseApi.create(workspaceId, {
      ...form,
      amount: parseFloat(form.amount),
      date: form.date || null,
    });
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        <h3 style={styles.title}>지출 추가</h3>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} name="title" placeholder="항목명" value={form.title} onChange={handleChange} required />
          <div style={styles.row}>
            <input style={{ ...styles.input, flex: 1 }} name="amount" type="number" placeholder="금액" value={form.amount} onChange={handleChange} required min="0" />
            <select style={{ ...styles.input, width: 80 }} name="currency" value={form.currency} onChange={handleChange}>
              <option>KRW</option>
              <option>USD</option>
              <option>JPY</option>
              <option>EUR</option>
            </select>
          </div>
          <select style={styles.input} name="category" value={form.category} onChange={handleChange}>
            {CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          <input style={styles.input} name="date" type="date" value={form.date} onChange={handleChange} />
          <div>
            <p style={styles.label}>참여자</p>
            <div style={styles.checkboxGroup}>
              {members.map((m) => (
                <label key={m.user.id} style={styles.checkboxLabel}>
                  <input
                    type="checkbox"
                    checked={form.participant_ids.includes(m.user.id)}
                    onChange={() => toggleParticipant(m.user.id)}
                  />
                  {m.user.name}
                </label>
              ))}
            </div>
          </div>
          <textarea style={styles.textarea} name="note" placeholder="메모 (선택)" value={form.note} onChange={handleChange} rows={2} />
          <div style={styles.btnRow}>
            <button type="button" style={styles.cancelBtn} onClick={onClose}>취소</button>
            <button type="submit" style={styles.submitBtn}>저장</button>
          </div>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000 },
  modal: { background: "#fff", borderRadius: 12, padding: 28, width: 380, maxHeight: "90vh", overflowY: "auto" },
  title: { margin: "0 0 16px", fontSize: 18, fontWeight: 600 },
  form: { display: "flex", flexDirection: "column", gap: 10 },
  row: { display: "flex", gap: 8 },
  input: { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 14 },
  textarea: { padding: "9px 12px", border: "1px solid #d1d5db", borderRadius: 7, fontSize: 14, resize: "none" },
  label: { margin: "0 0 6px", fontSize: 13, color: "#374151" },
  checkboxGroup: { display: "flex", flexWrap: "wrap", gap: 8 },
  checkboxLabel: { display: "flex", alignItems: "center", gap: 4, fontSize: 13, cursor: "pointer" },
  btnRow: { display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 },
  cancelBtn: { padding: "9px 16px", background: "#e5e7eb", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 14 },
  submitBtn: { padding: "9px 16px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 14 },
};
