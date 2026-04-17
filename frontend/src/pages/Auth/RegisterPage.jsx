import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "../../store/authStore";

const FEATURES = [
  { icon: "🗺️", title: "실시간 지도 협업",   desc: "팀원들과 동시에 지도에서 명소를 검색하고 저장해요" },
  { icon: "📅", title: "드래그 일정 보드",    desc: "날짜별 일정을 카드로 정리하고 자유롭게 재배치해요" },
  { icon: "💰", title: "스마트 가계부 정산",  desc: "누가 얼마 냈는지 자동으로 계산해 정산이 쉬워요" },
];

export default function RegisterPage() {
  const [form,    setForm]    = useState({ email: "", password: "", name: "" });
  const [error,   setError]   = useState("");
  const [loading, setLoading] = useState(false);
  const register = useAuthStore((s) => s.register);
  const navigate = useNavigate();

  const handleChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await register(form.email, form.password, form.name); navigate("/"); }
    catch (err) { setError(err.response?.data?.detail || "회원가입에 실패했습니다."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── 왼쪽 히어로 ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden
                      bg-gradient-to-br from-teal-500 via-cyan-500 to-indigo-600">
        <div className="absolute top-1/4 right-1/3 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/3 left-1/4 w-56 h-56 bg-cyan-300/20 rounded-full blur-3xl" />

        <div className="relative z-10 flex flex-col justify-center px-14 py-16 max-w-lg">
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30 flex items-center justify-center">
              <span className="text-white text-lg font-black">✈</span>
            </div>
            <span className="text-white text-xl font-black tracking-tight">도란도란</span>
          </div>

          <h1 className="text-5xl font-black text-white leading-[1.15] tracking-tight mb-6">
            여행의 모든 것,<br />
            <span className="text-white/80">하나의 앱으로</span>
          </h1>
          <p className="text-white/75 text-base leading-relaxed mb-14">
            복잡했던 여행 준비를 도란도란과 함께<br />
            쉽고 즐겁게 해결해보세요
          </p>

          {/* 기능 소개 */}
          <div className="space-y-5">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.1 }}
                className="flex items-start gap-4"
              >
                <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/25
                                flex items-center justify-center text-xl flex-shrink-0">
                  {f.icon}
                </div>
                <div>
                  <p className="text-white font-bold text-sm mb-0.5">{f.title}</p>
                  <p className="text-white/70 text-xs leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 오른쪽 폼 ── */}
      <div className="flex-1 lg:max-w-[480px] flex items-center justify-center bg-white px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="w-full max-w-sm"
        >
          <div className="flex items-center gap-2 mb-10">
            <div className="w-9 h-9 rounded-xl bg-coral-500 flex items-center justify-center shadow-float">
              <span className="text-white font-black">✈</span>
            </div>
            <span className="text-xl font-black text-gray-800 tracking-tight">도란도란</span>
          </div>

          <h2 className="text-3xl font-black text-gray-800 tracking-tight mb-2">회원가입</h2>
          <p className="text-gray-400 text-sm mb-8">무료로 시작하고 함께 여행을 계획하세요</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {[
              { name: "name",     label: "이름",   type: "text",     placeholder: "이름을 입력하세요" },
              { name: "email",    label: "이메일", type: "email",    placeholder: "이메일 주소를 입력하세요" },
              { name: "password", label: "비밀번호", type: "password", placeholder: "비밀번호를 입력하세요" },
            ].map((field) => (
              <div key={field.name} className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">{field.label}</label>
                <input
                  name={field.name} type={field.type} placeholder={field.placeholder}
                  value={form[field.name]} onChange={handleChange} required
                  className="input-glass"
                />
              </div>
            ))}

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="bg-coral-50 border border-coral-200 text-coral-600 text-sm rounded-2xl px-4 py-3 font-medium"
              >
                {error}
              </motion.div>
            )}

            <motion.button
              type="submit" disabled={loading}
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              className="w-full py-4 btn-coral text-base font-black rounded-2xl mt-2
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "처리 중…" : "시작하기"}
            </motion.button>
          </form>

          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <p className="text-center text-sm text-gray-500">
            이미 계정이 있으신가요?{" "}
            <Link to="/login" className="text-coral-500 font-bold hover:text-coral-600 transition-colors">
              로그인
            </Link>
          </p>

          <p className="text-center text-[11px] text-gray-300 mt-6 leading-relaxed">
            가입하면 도란도란의{" "}
            <span className="text-coral-400 cursor-pointer">이용약관</span> 및{" "}
            <span className="text-coral-400 cursor-pointer">개인정보처리방침</span>에 동의하는 것으로 간주됩니다.
          </p>
        </motion.div>
      </div>
    </div>
  );
}
