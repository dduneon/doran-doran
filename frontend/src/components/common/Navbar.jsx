import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import NotificationBadge from "./NotificationBadge";

export default function Navbar() {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const navigate = useNavigate();

  return (
    <nav style={styles.nav}>
      <span style={styles.logo} onClick={() => navigate("/")}>도란도란</span>
      <div style={styles.right}>
        <NotificationBadge />
        <span style={styles.userName}>{user?.name}</span>
        <button style={styles.logoutBtn} onClick={() => { logout(); navigate("/login"); }}>
          로그아웃
        </button>
      </div>
    </nav>
  );
}

const styles = {
  nav: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 20px", height: 56, background: "#4f46e5", color: "#fff" },
  logo: { fontSize: 20, fontWeight: 700, cursor: "pointer" },
  right: { display: "flex", alignItems: "center", gap: 16 },
  userName: { fontSize: 14 },
  logoutBtn: { background: "rgba(255,255,255,0.2)", border: "none", color: "#fff", padding: "6px 12px", borderRadius: 6, cursor: "pointer", fontSize: 13 },
};
