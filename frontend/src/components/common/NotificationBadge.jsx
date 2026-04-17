import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useNotificationStore } from "../../store/notificationStore";

function timeAgo(dateStr) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return "방금";
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  return `${Math.floor(h / 24)}일 전`;
}

export default function NotificationBadge() {
  const { notifications, unreadCount, fetchNotifications, fetchUnreadCount, markRead, markAllRead } =
    useNotificationStore();
  const [open, setOpen]   = useState(false);
  const panelRef           = useRef(null);
  const navigate           = useNavigate();

  useEffect(() => {
    fetchUnreadCount();
    const t = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => { if (open) fetchNotifications(); }, [open]);

  useEffect(() => {
    const fn = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, []);

  const handleClick = async (n) => {
    await markRead(n.id);
    if (n.related_url) navigate(n.related_url);
    setOpen(false);
  };

  return (
    <div className="relative" ref={panelRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative w-9 h-9 flex items-center justify-center
                   rounded-xl hover:bg-gray-100 transition-colors duration-150"
      >
        <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute top-0.5 right-0.5 min-w-[16px] h-4 px-1
                           bg-coral-500 text-white text-[10px] font-bold
                           rounded-full flex items-center justify-center
                           border-2 border-white">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 350, damping: 28 } }}
            exit={{ opacity: 0, y: 4, scale: 0.97, transition: { duration: 0.12 } }}
            className="absolute right-0 top-[calc(100%+8px)] w-80 z-[200]
                       bg-white/95 backdrop-blur-xl rounded-2xl overflow-hidden
                       border border-gray-100 shadow-glass-lg"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-bold text-gray-800 text-sm">알림</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-coral-500 font-semibold hover:text-coral-600 transition-colors"
                >
                  모두 읽음
                </button>
              )}
            </div>

            {/* List */}
            <div className="max-h-[360px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <span className="text-3xl opacity-40">🔔</span>
                  <p className="text-sm text-gray-400">새로운 알림이 없습니다</p>
                </div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleClick(n)}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-gray-50
                                cursor-pointer transition-colors duration-100
                                ${n.is_read ? "hover:bg-gray-50" : "bg-coral-50/60 hover:bg-coral-50"}`}
                  >
                    {!n.is_read && (
                      <span className="mt-1.5 w-2 h-2 rounded-full bg-coral-500 flex-shrink-0" />
                    )}
                    <div className={`flex-1 min-w-0 ${n.is_read ? "" : ""}`}>
                      <p className="text-sm font-semibold text-gray-800 leading-snug">{n.title}</p>
                      {n.body && <p className="text-xs text-gray-500 mt-0.5 truncate">{n.body}</p>}
                      <p className="text-[11px] text-gray-400 mt-1">{timeAgo(n.created_at)}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
