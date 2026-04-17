import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuthStore } from "../../store/authStore";

const SPOTS = [
  { emoji: "🗼", name: "파리"      },
  { emoji: "⛩️",  name: "도쿄"    },
  { emoji: "🗽",  name: "뉴욕"     },
  { emoji: "🏖️", name: "발리"      },
  { emoji: "🏛️", name: "로마"      },
  { emoji: "🌆",  name: "방콕"    },
];

export default function LoginPage() {
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [error,    setError]    = useState("");
  const [loading,  setLoading]  = useState(false);
  const login    = useAuthStore((s) => s.login);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); setError(""); setLoading(true);
    try { await login(email, password); navigate("/"); }
    catch (err) { setError(err.response?.data?.detail || "로그인에 실패했습니다."); }
    finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen flex">
      {/* ── 왼쪽 히어로 ── */}
      <div className="hidden lg:flex flex-1 relative overflow-hidden
                      bg-gradient-to-br from-coral-500 via-rose-500 to-violet-600">
        {/* 배경 블러 원들 */}
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-white/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-48 h-48 bg-violet-400/20 rounded-full blur-3xl" />
        <div className="absolute top-3/4 left-1/3 w-32 h-32 bg-rose-300/20 rounded-full blur-2xl" />

        <div className="relative z-10 flex flex-col justify-center px-14 py-16 max-w-lg">
          {/* 브랜드 */}
          <div className="flex items-center gap-2.5 mb-16">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-sm border border-white/30
                            flex items-center justify-center">
              <span className="text-white text-lg font-black">✈</span>
            </div>
            <span className="text-white text-xl font-black tracking-tight">도란도란</span>
          </div>

          <h1 className="text-5xl font-black text-white leading-[1.15] tracking-tight mb-6">
            다음 여행은<br />
            <span className="text-white/80">함께 계획</span>하세요
          </h1>
          <p className="text-white/75 text-lg leading-relaxed mb-12">
            친구, 가족과 실시간으로 여행을 설계하고<br />
            잊지 못할 추억을 만들어보세요
          </p>

          {/* 여행지 태그들 */}
          <div className="flex flex-wrap gap-2">
            {SPOTS.map((s, i) => (
              <motion.span
                key={s.name}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.08 }}
                className="flex items-center gap-1.5 bg-white/15 backdrop-blur-sm
                           border border-white/25 text-white text-sm font-medium
                           px-3.5 py-1.5 rounded-full"
              >
                {s.emoji} {s.name}
              </motion.span>
            ))}
          </div>
        </div>
      </div>

      {/* ── 오른쪽 폼 ── */}
      <div className="flex-1 lg:max-w-[480px] flex items-center justify-center
                      bg-white px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="w-full max-w-sm"
        >
          {/* 모바일 로고 */}
          <div className="flex items-center gap-2 mb-10 lg:mb-12">
            <div className="w-9 h-9 rounded-xl bg-coral-500 flex items-center justify-center shadow-float">
              <span className="text-white font-black">✈</span>
            </div>
            <span className="text-xl font-black text-gray-800 tracking-tight">도란도란</span>
          </div>

          <h2 className="text-3xl font-black text-gray-800 tracking-tight mb-2">로그인</h2>
          <p className="text-gray-400 text-sm mb-8">함께하는 여행 계획, 지금 시작하세요</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">이메일</label>
              <input
                type="email" value={email} onChange={(e) => setEmail(e.target.value)} required
                placeholder="이메일 주소를 입력하세요"
                className="input-glass"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-gray-600 uppercase tracking-widest">비밀번호</label>
              <input
                type="password" value={password} onChange={(e) => setPassword(e.target.value)} required
                placeholder="비밀번호를 입력하세요"
                className="input-glass"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }}
                className="bg-coral-50 border border-coral-200 text-coral-600 text-sm
                           rounded-2xl px-4 py-3 font-medium"
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
              {loading ? "로그인 중…" : "로그인"}
            </motion.button>
          </form>

          <div className="flex items-center gap-3 my-7">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400">또는</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          <p className="text-center text-sm text-gray-500">
            아직 계정이 없으신가요?{" "}
            <Link to="/register" className="text-coral-500 font-bold hover:text-coral-600 transition-colors">
              회원가입
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
