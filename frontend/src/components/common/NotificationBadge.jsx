import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/notificationStore";

export default function NotificationBadge() {
  const { notifications, unreadCount, fetchNotifications, fetchUnreadCount, markRead, markAllRead } = useNotificationStore();
  const [open, setOpen] = useState(false);
  const panelRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnreadCount();
    const timer = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (open) fetchNotifications();
  }, [open]);

  useEffect(() => {
    const handleClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleNotificationClick = async (n) => {
    await markRead(n.id);
    if (n.related_url) navigate(n.related_url);
    setOpen(false);
  };

  return (
    <div style={styles.wrapper} ref={panelRef}>
      <button style={styles.bell} onClick={() => setOpen((o) => !o)}>
        🔔
        {unreadCount > 0 && <span style={styles.badge}>{unreadCount > 99 ? "99+" : unreadCount}</span>}
      </button>
      {open && (
        <div style={styles.panel}>
          <div style={styles.panelHeader}>
            <span style={styles.panelTitle}>알림</span>
            {unreadCount > 0 && (
              <button style={styles.readAll} onClick={markAllRead}>모두 읽음</button>
            )}
          </div>
          <div style={styles.list}>
            {notifications.length === 0 && <p style={styles.empty}>알림이 없습니다.</p>}
            {notifications.map((n) => (
              <div
                key={n.id}
                style={{ ...styles.item, ...(n.is_read ? {} : styles.itemUnread) }}
                onClick={() => handleNotificationClick(n)}
              >
                <p style={styles.itemTitle}>{n.title}</p>
                {n.body && <p style={styles.itemBody}>{n.body}</p>}
                <p style={styles.itemTime}>{new Date(n.created_at).toLocaleString("ko-KR")}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  wrapper: { position: "relative" },
  bell: { background: "none", border: "none", fontSize: 20, cursor: "pointer", position: "relative", padding: "4px 8px" },
  badge: { position: "absolute", top: 0, right: 0, background: "#ef4444", color: "#fff", borderRadius: 10, fontSize: 10, padding: "1px 4px", minWidth: 16, textAlign: "center" },
  panel: { position: "absolute", right: 0, top: "calc(100% + 8px)", width: 320, background: "#fff", borderRadius: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.15)", zIndex: 500, overflow: "hidden" },
  panelHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #f3f4f6" },
  panelTitle: { fontWeight: 600, fontSize: 15 },
  readAll: { background: "none", border: "none", color: "#4f46e5", cursor: "pointer", fontSize: 13 },
  list: { maxHeight: 360, overflowY: "auto" },
  empty: { textAlign: "center", color: "#9ca3af", padding: 24, fontSize: 14 },
  item: { padding: "12px 16px", borderBottom: "1px solid #f9fafb", cursor: "pointer" },
  itemUnread: { background: "#eef2ff" },
  itemTitle: { margin: 0, fontSize: 14, fontWeight: 500 },
  itemBody: { margin: "2px 0 0", fontSize: 12, color: "#6b7280" },
  itemTime: { margin: "4px 0 0", fontSize: 11, color: "#9ca3af" },
};
