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
      <div className="flex items-center gap-3">
        <NotificationBadge />

        {/* User chip */}
        <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-full pl-1.5 pr-4 py-1.5">
          <div className="
            w-7 h-7 rounded-full flex items-center justify-center
            bg-gradient-to-br from-coral-400 to-coral-600
            text-white text-xs font-bold
          ">
            {initials}
          </div>
          <span className="text-sm font-medium text-gray-700">{user?.name}</span>
        </div>

        <button
          onClick={() => { logout(); navigate("/login"); }}
          className="text-sm text-gray-400 hover:text-gray-600 font-medium
                     px-3 py-2 rounded-lg hover:bg-gray-100 transition-all duration-150"
        >
          로그아웃
        </button>
      </div>
    </nav>
  );
}
