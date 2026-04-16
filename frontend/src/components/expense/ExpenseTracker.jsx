import { useEffect, useState } from "react";
import { useWorkspaceStore } from "../../store/workspaceStore";
import { useAuthStore } from "../../store/authStore";
import ExpenseForm from "./ExpenseForm";
import { expenseApi } from "../../services/api";

const CATEGORY_LABELS = {
  transport: "교통",
  food: "식비",
  accommodation: "숙박",
  activity: "활동",
  shopping: "쇼핑",
  other: "기타",
};

const CATEGORY_COLORS = {
  transport: "#3b82f6",
  food: "#f59e0b",
  accommodation: "#8b5cf6",
  activity: "#10b981",
  shopping: "#ec4899",
  other: "#6b7280",
};

export default function ExpenseTracker({ workspaceId }) {
  const { expenses, expenseSummary, fetchExpenses, fetchExpenseSummary } = useWorkspaceStore();
  const { current: workspace } = useWorkspaceStore();
  const user = useAuthStore((s) => s.user);
  const [showForm, setShowForm] = useState(false);

  const reload = () => {
    fetchExpenses(workspaceId);
    fetchExpenseSummary(workspaceId);
  };

  useEffect(() => {
    reload();
  }, [workspaceId]);

  const handleDelete = async (id) => {
    await expenseApi.delete(workspaceId, id);
    reload();
  };

  const memberMap = Object.fromEntries(
    (workspace?.members || []).map((m) => [m.user.id, m.user.name])
  );

  return (
    <div style={styles.container}>
      <div style={styles.left}>
        <div style={styles.sectionHeader}>
          <h3 style={styles.sectionTitle}>지출 내역</h3>
          <button style={styles.addBtn} onClick={() => setShowForm(true)}>+ 지출 추가</button>
        </div>
        <div style={styles.list}>
          {expenses.map((e) => (
            <div key={e.id} style={styles.expenseItem}>
              <div style={{ ...styles.categoryDot, background: CATEGORY_COLORS[e.category] }} />
              <div style={styles.expenseInfo}>
                <p style={styles.expenseTitle}>{e.title}</p>
                <p style={styles.expenseMeta}>
                  {CATEGORY_LABELS[e.category]} · {e.paid_by_user?.name} 결제
                  {e.date && ` · ${e.date}`}
                </p>
              </div>
              <div style={styles.expenseRight}>
                <span style={styles.amount}>{e.amount.toLocaleString("ko-KR")} {e.currency}</span>
                <button style={styles.deleteBtn} onClick={() => handleDelete(e.id)}>✕</button>
              </div>
            </div>
          ))}
          {expenses.length === 0 && <p style={styles.empty}>지출 내역이 없습니다.</p>}
        </div>
      </div>

      <div style={styles.right}>
        <h3 style={styles.sectionTitle}>정산 요약</h3>
        {expenseSummary && (
          <>
            <div style={styles.totalCard}>
              <p style={styles.totalLabel}>총 지출</p>
              {Object.entries(expenseSummary.totals_by_currency).length === 0 && (
                <p style={styles.totalEmpty}>지출 없음</p>
              )}
              {Object.entries(expenseSummary.totals_by_currency).map(([cur, amt]) => (
                <p key={cur} style={styles.totalAmount}>
                  {amt.toLocaleString("ko-KR")} <span style={styles.totalCurrency}>{cur}</span>
                </p>
              ))}
            </div>
            <h4 style={styles.perPersonTitle}>인당 정산</h4>
            {Object.entries(expenseSummary.per_person).map(([uid, byCurrency]) => {
              const nonZero = Object.entries(byCurrency).filter(([, v]) => Math.round(v) !== 0);
              if (nonZero.length === 0) return null;
              return (
                <div key={uid} style={styles.personBlock}>
                  <span style={styles.personName}>{memberMap[uid] || uid}</span>
                  <div style={styles.personAmounts}>
                    {nonZero.map(([cur, amount]) => (
                      <span
                        key={cur}
                        style={{ ...styles.personAmount, color: amount < 0 ? "#ef4444" : "#10b981" }}
                      >
                        {amount < 0 ? "" : "+"}{Math.round(amount).toLocaleString("ko-KR")} {cur}
                      </span>
                    ))}
                  </div>
                </div>
              );
            })}
            <p style={styles.settleNote}>양수: 더 받아야 할 금액 · 음수: 더 내야 할 금액</p>
          </>
        )}
      </div>

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

const styles = {
  container: { display: "flex", height: "100%", overflow: "hidden" },
  left: { flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" },
  right: { width: 260, borderLeft: "1px solid #e5e7eb", padding: 20, background: "#fff", overflowY: "auto" },
  sectionHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "#fff", borderBottom: "1px solid #e5e7eb" },
  sectionTitle: { margin: 0, fontSize: 16, fontWeight: 600 },
  addBtn: { padding: "8px 14px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 7, cursor: "pointer", fontSize: 13 },
  list: { flex: 1, overflowY: "auto", padding: "8px 20px" },
  expenseItem: { display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid #f3f4f6" },
  categoryDot: { width: 10, height: 10, borderRadius: "50%", flexShrink: 0 },
  expenseInfo: { flex: 1 },
  expenseTitle: { margin: 0, fontSize: 14, fontWeight: 500 },
  expenseMeta: { margin: "2px 0 0", fontSize: 12, color: "#6b7280" },
  expenseRight: { display: "flex", alignItems: "center", gap: 8 },
  amount: { fontSize: 14, fontWeight: 600 },
  deleteBtn: { background: "none", border: "none", cursor: "pointer", color: "#d1d5db", fontSize: 13 },
  empty: { color: "#9ca3af", textAlign: "center", padding: 24 },
  totalCard: { background: "#eef2ff", borderRadius: 10, padding: "12px 16px", marginBottom: 16 },
  totalLabel: { margin: "0 0 8px", fontSize: 12, color: "#6b7280" },
  totalEmpty: { margin: 0, fontSize: 14, color: "#9ca3af" },
  totalAmount: { margin: "2px 0 0", fontSize: 20, fontWeight: 700, color: "#4f46e5" },
  totalCurrency: { fontSize: 13, fontWeight: 500 },
  perPersonTitle: { margin: "0 0 10px", fontSize: 14, fontWeight: 600, color: "#374151" },
  personBlock: { padding: "8px 0", borderBottom: "1px solid #f3f4f6" },
  personName: { fontSize: 13, fontWeight: 500, color: "#374151" },
  personAmounts: { display: "flex", flexDirection: "column", gap: 2, marginTop: 4 },
  personAmount: { fontSize: 13, fontWeight: 600 },
  settleNote: { marginTop: 12, fontSize: 11, color: "#9ca3af" },
};
