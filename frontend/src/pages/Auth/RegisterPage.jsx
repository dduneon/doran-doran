import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";

export default function RegisterPage() {
  const [form, setForm] = useState({ email: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(form.email, form.password, form.name);
      navigate("/");
    } catch (err) {
      setError(err.response?.data?.detail || "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        <h1 style={styles.title}>도란도란</h1>
        <p style={styles.subtitle}>회원가입</p>
        <form onSubmit={handleSubmit} style={styles.form}>
          <input style={styles.input} name="name" placeholder="이름" value={form.name} onChange={handleChange} required />
          <input style={styles.input} type="email" name="email" placeholder="이메일" value={form.email} onChange={handleChange} required />
          <input style={styles.input} type="password" name="password" placeholder="비밀번호" value={form.password} onChange={handleChange} required />
          {error && <p style={styles.error}>{error}</p>}
          <button style={styles.button} type="submit" disabled={loading}>
            {loading ? "처리 중..." : "회원가입"}
          </button>
        </form>
        <p style={styles.link}>
          이미 계정이 있으신가요? <Link to="/login">로그인</Link>
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: { display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh", background: "#f0f4f8" },
  card: { background: "#fff", borderRadius: 12, padding: 40, width: 360, boxShadow: "0 4px 20px rgba(0,0,0,0.1)" },
  title: { margin: 0, fontSize: 32, fontWeight: 700, color: "#4f46e5", textAlign: "center" },
  subtitle: { margin: "4px 0 28px", color: "#6b7280", textAlign: "center" },
  form: { display: "flex", flexDirection: "column", gap: 12 },
  input: { padding: "10px 14px", border: "1px solid #d1d5db", borderRadius: 8, fontSize: 15 },
  button: { padding: "12px", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 8, fontSize: 16, cursor: "pointer" },
  error: { color: "#ef4444", fontSize: 13, margin: 0 },
  link: { textAlign: "center", marginTop: 16, fontSize: 14, color: "#6b7280" },
};
