import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../../store/authStore";
import NotificationBadge from "./NotificationBadge";

export default function Navbar() {
  const user    = useAuthStore((s) => s.user);
  const logout  = useAuthStore((s) => s.logout);
  const navigate = useNavigate();
  const initials = user?.name ? user.name[0].toUpperCase() : "U";

  return (
    <nav className="
      h-16 px-6 flex items-center justify-between
      bg-white/80 backdrop-blur-xl
      border-b border-white/60
      shadow-float
    ">
      {/* Logo */}
      <button
        onClick={() => navigate("/")}
        className="flex items-center gap-2 group"
      >
        <div className="
          w-8 h-8 rounded-xl bg-coral-500
          flex items-center justify-center
          shadow-float group-hover:scale-105 transition-transform duration-150
        ">
          <span className="text-white text-sm font-black">✈</span>
        </div>
        <span className="text-lg font-black text-gray-800 tracking-tight">도란도란</span>
      </button>

      {/* Right */}
      <div className="flex items-center gap-2 sm:gap-3">
        <NotificationBadge />

        {/* User chip */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-1.5 pr-1.5 sm:pr-4 py-1.5">
          <div className="
            w-7 h-7 rounded-full flex items-center justify-center
            bg-gradient-to-br from-coral-400 to-coral-600
            text-white text-xs font-bold flex-shrink-0
          ">
            {initials}
          </div>
          <span className="hidden sm:inline text-sm font-medium text-gray-700">{user?.name}</span>
        </div>

        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="text-sm text-gray-400 hover:text-gray-600 font-medium
                     px-2 sm:px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-150"
        >
          <span className="hidden sm:inline">로그아웃</span>
          <svg className="sm:hidden w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h6a2 2 0 012 2v1" />
          </svg>
        </button>
      </div>
    </nav>
  );
}
