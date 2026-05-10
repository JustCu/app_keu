import { useEffect, useState } from "react";
import {
  AlertCircle,
  Eye,
  EyeOff,
  Hash,
  Loader2,
  LogIn,
  Plus,
  Users,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFamily } from "../context/FamilyContext";
import { useTheme } from "../context/ThemeContext";
import { apiLogin, apiRegister } from "../services/api";

export default function Login({ onOpenTentang }) {
  const APP_VERSION = "v1.0.0";
  const { login, user } = useAuth();
  const { createFamily, joinFamily } = useFamily();
  const { isDark } = useTheme();

  const [mode, setMode] = useState("login");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ nama: "", email: "", password: "" });
  const [familyForm, setFamilyForm] = useState({
    namaKeluarga: "",
    inviteCode: "",
    hubungan: "",
    mode: "create",
  });
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [entering, setEntering] = useState(false);

  const ui = isDark
    ? {
        page: "bg-gradient-to-b from-slate-950 via-gray-950 to-teal-950",
        panel: "bg-gray-900 border-gray-800 text-gray-100",
        divider: "border-gray-800",
        muted: "text-gray-400",
        label: "text-gray-400",
        input:
          "bg-gray-900 border-gray-700 text-gray-100 placeholder-gray-500 focus-primary-theme",
        tabs: "bg-gray-800",
        tabIdle: "text-gray-400",
        tabActive: "bg-gray-700 text-gray-100",
        primaryText: "text-primary-adaptive",
        primaryBadge:
          "bg-primary-soft-adaptive border-primary-soft-adaptive text-primary-adaptive",
      }
    : {
        page: "bg-gradient-to-b from-teal-50 via-white to-emerald-50",
        panel: "bg-white border-gray-200 text-gray-900",
        divider: "border-gray-200",
        muted: "text-gray-500",
        label: "text-gray-500",
        input:
          "bg-gray-50 border-gray-200 text-gray-900 placeholder-gray-400 focus-primary-theme",
        tabs: "bg-gray-100",
        tabIdle: "text-gray-500",
        tabActive: "bg-white text-gray-900",
        primaryText: "text-primary-adaptive",
        primaryBadge:
          "bg-primary-soft-adaptive border-primary-soft-adaptive text-primary-adaptive",
      };

  const inputBase =
    "w-full rounded-2xl px-4 py-3 text-sm font-medium border transition focus:outline-none focus:ring-2";
  const labelBase = `block mb-2 text-xs font-bold uppercase tracking-wider ${ui.label}`;

  useEffect(() => {
    if (user && !user.familyId) {
      setPendingUser(user);
      setStep(2);
      return;
    }
    if (!user) {
      setPendingUser(null);
      setStep(1);
    }
  }, [user]);

  useEffect(() => {
    setEntering(false);
    const frame = requestAnimationFrame(() => setEntering(true));
    return () => cancelAnimationFrame(frame);
  }, [step]);

  const shellMotionClass = entering
    ? "opacity-100 translate-y-0 scale-100"
    : "opacity-0 translate-y-4 scale-[0.985]";

  const handle = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleFamily = (e) => {
    const { name, value } = e.target;
    setFamilyForm((p) => ({
      ...p,
      [name]: name === "inviteCode" ? String(value || "").toUpperCase() : value,
    }));
    setError("");
  };

  const validateAuthForm = () => {
    if (!form.email.includes("@")) {
      setError("Format email tidak valid.");
      return false;
    }
    if (form.password.length < 6) {
      setError("Kata sandi minimal 6 karakter.");
      return false;
    }
    if (mode === "register" && !form.nama.trim()) {
      setError("Nama tidak boleh kosong.");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateAuthForm()) return;

    setLoading(true);
    setError("");

    if (mode === "login") {
      const res = await apiLogin({
        email: form.email,
        password: form.password,
      });
      if (res.success) {
        if (!res.user.familyId) {
          setPendingUser(res.user);
          login(res.user);
          setStep(2);
        } else {
          login(res.user);
        }
      } else {
        setError(
          res.error === "INVALID_CREDENTIALS"
            ? "Email atau kata sandi salah."
            : res.error,
        );
      }
    } else {
      const res = await apiRegister({
        nama: form.nama,
        email: form.email,
        password: form.password,
      });
      if (res.success) {
        setPendingUser(res.user);
        login(res.user);
        setStep(2);
      } else {
        setError(
          res.error === "EMAIL_EXISTS"
            ? "Email sudah terdaftar. Silakan masuk."
            : res.error,
        );
      }
    }

    setLoading(false);
  };

  const handleFamilySetup = async () => {
    if (familyForm.mode === "create" && !familyForm.namaKeluarga.trim()) {
      setError("Nama keluarga wajib diisi.");
      return;
    }
    if (familyForm.mode === "join" && !familyForm.inviteCode.trim()) {
      setError("Kode undangan wajib diisi.");
      return;
    }

    setLoading(true);
    setError("");

    const u = pendingUser || user;
    if (!u) {
      setLoading(false);
      return;
    }

    if (familyForm.mode === "create") {
      const res = await createFamily({ namaKeluarga: familyForm.namaKeluarga });
      if (res.success) setPendingUser(null);
      else setError(res.error);
    } else {
      const res = await joinFamily({
        inviteCode: familyForm.inviteCode,
        hubungan: familyForm.hubungan || "Anggota",
      });
      if (res.success) setPendingUser(null);
      else setError(res.error);
    }

    setLoading(false);
  };

  const ErrorBox = () => {
    if (!error) return null;
    return (
      <div
        role="alert"
        className="overlay-danger-soft rounded-2xl border px-4 py-3 text-xs font-medium flex items-start gap-2"
      >
        <AlertCircle className="w-4 h-4 mt-1 flex-shrink-0" />
        <span>{error}</span>
      </div>
    );
  };

  if (step === 2) {
    return (
      <div className={`absolute inset-0 z-[100] overflow-y-auto ${ui.page}`}>
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="login-orb login-orb-slow absolute -left-16 top-16 h-48 w-48 rounded-full bg-teal-300/25 blur-3xl dark:bg-teal-400/15" />
          <div className="login-orb login-orb-delayed absolute right-[-4rem] top-1/2 h-56 w-56 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-400/15" />
        </div>
        <div className="relative min-h-full w-full flex items-center justify-center px-4 py-8">
          <div
            className={`w-full max-w-md transition-all duration-700 ease-out ${shellMotionClass}`}
          >
            <div className={`px-6 py-6 border-b ${ui.divider}`}>
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl border flex items-center justify-center ${ui.primaryBadge} login-float`}
                >
                  <Users className="w-5 h-5" />
                </div>
                <div
                  className={`flex-1 min-w-0 transition-all duration-700 ease-out ${entering ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
                >
                  <h1 className="text-lg font-bold leading-tight mt-1">
                    Setup Keluarga
                  </h1>
                  <p className={`text-xs mt-2 ${ui.muted}`}>
                    Langkah 2 dari 2. Lengkapi data keluarga untuk lanjut ke
                    dashboard.
                  </p>
                </div>
              </div>
            </div>

            <div
              className={`px-6 py-6 space-y-6 transition-all duration-700 ease-out delay-100 ${entering ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              <div
                className={`rounded-2xl p-1 flex ${ui.tabs}`}
                role="tablist"
                aria-label="Mode setup keluarga"
              >
                <button
                  type="button"
                  onClick={() => {
                    setFamilyForm((p) => ({ ...p, mode: "create" }));
                    setError("");
                  }}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold transition flex items-center justify-center gap-2 ${familyForm.mode === "create" ? `${ui.tabActive} shadow-sm` : ui.tabIdle}`}
                  role="tab"
                  aria-selected={familyForm.mode === "create"}
                >
                  <Plus className="w-4 h-4" /> Buat Baru
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setFamilyForm((p) => ({ ...p, mode: "join" }));
                    setError("");
                  }}
                  className={`flex-1 rounded-xl py-3 text-sm font-bold transition flex items-center justify-center gap-2 ${familyForm.mode === "join" ? `${ui.tabActive} shadow-sm` : ui.tabIdle}`}
                  role="tab"
                  aria-selected={familyForm.mode === "join"}
                >
                  <Hash className="w-4 h-4" /> Gabung
                </button>
              </div>

              <div className="space-y-4" role="tabpanel">
                {familyForm.mode === "create" ? (
                  <div>
                    <label htmlFor="namaKeluarga" className={labelBase}>
                      Nama Keluarga
                    </label>
                    <input
                      id="namaKeluarga"
                      type="text"
                      name="namaKeluarga"
                      value={familyForm.namaKeluarga}
                      onChange={handleFamily}
                      placeholder="Contoh: Keluarga Pratama"
                      className={`${inputBase} ${ui.input}`}
                    />
                  </div>
                ) : (
                  <>
                    <div>
                      <label htmlFor="inviteCode" className={labelBase}>
                        Kode Undangan
                      </label>
                      <input
                        id="inviteCode"
                        type="text"
                        name="inviteCode"
                        value={familyForm.inviteCode}
                        onChange={handleFamily}
                        placeholder="Contoh: A3B9XZ"
                        maxLength={6}
                        className={`${inputBase} ${ui.input} uppercase tracking-[0.2em] font-bold`}
                      />
                      <p className={`text-xs mt-2 ${ui.muted}`}>
                        Gunakan kode undangan dari admin keluarga.
                      </p>
                    </div>

                    <div>
                      <label htmlFor="hubungan" className={labelBase}>
                        Hubungan (Opsional)
                      </label>
                      <input
                        id="hubungan"
                        type="text"
                        name="hubungan"
                        value={familyForm.hubungan}
                        onChange={handleFamily}
                        placeholder="Contoh: Anak, Istri, Suami"
                        className={`${inputBase} ${ui.input}`}
                      />
                    </div>
                  </>
                )}

                <ErrorBox />

                <button
                  type="button"
                  onClick={handleFamilySetup}
                  disabled={loading}
                  className="w-full rounded-2xl py-3 px-4 btn-primary-theme text-sm font-bold shadow-lg shadow-primary-theme active:scale-[0.98] transition flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      {familyForm.mode === "create" ? (
                        <Plus className="w-4 h-4" />
                      ) : (
                        <LogIn className="w-4 h-4" />
                      )}
                      {familyForm.mode === "create"
                        ? "Buat Keluarga"
                        : "Gabung Keluarga"}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`absolute inset-0 z-[100] overflow-y-auto ${ui.page}`}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="login-orb login-orb-slow absolute -left-20 top-12 h-64 w-64 rounded-full bg-teal-300/25 blur-3xl dark:bg-teal-400/15" />
        <div className="login-orb login-orb-delayed absolute right-[-5rem] top-[18%] h-72 w-72 rounded-full bg-emerald-300/20 blur-3xl dark:bg-emerald-400/15" />
        <div className="login-orb absolute left-1/2 top-[68%] h-44 w-44 -translate-x-1/2 rounded-full bg-cyan-300/20 blur-3xl dark:bg-cyan-400/10" />
      </div>
      <div className="relative min-h-full w-full flex items-center justify-center px-4 py-8">
        <div
          className={`w-full max-w-md transition-all duration-700 ease-out ${shellMotionClass}`}
        >
          <div className={`px-6 py-6 border-b ${ui.divider}`}>
            <div className="flex flex-col items-center text-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 rounded-[2rem] bg-teal-300/30 blur-2xl dark:bg-teal-400/15 login-float" />
                <img
                  src="/Logo.png"
                  alt="Logo Dompet Keluarga"
                  className="relative w-24 h-24 rounded-3xl object-cover shadow-xl shadow-teal-950/10 login-float"
                />
              </div>
              <div
                className={`min-w-0 transition-all duration-700 ease-out delay-100 ${entering ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
              >
                <h1 className="text-2xl font-extrabold leading-tight mt-1">
                  Dompet Keluarga
                </h1>
                <p className={`text-sm mt-2 ${ui.muted}`}>
                  Catat transaksi, kelola anggaran, dan pantau keuangan bersama
                  keluarga dengan mudah.
                </p>
              </div>
            </div>
          </div>

          <div
            className={`px-6 py-6 space-y-6 transition-all duration-700 ease-out delay-100 ${entering ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
          >
            <div
              className={`rounded-2xl p-1 flex ${ui.tabs}`}
              role="tablist"
              aria-label="Mode autentikasi"
            >
              <button
                type="button"
                onClick={() => {
                  setMode("login");
                  setError("");
                }}
                className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${mode === "login" ? `${ui.tabActive} shadow-sm` : ui.tabIdle}`}
                role="tab"
                aria-selected={mode === "login"}
              >
                Masuk
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("register");
                  setError("");
                }}
                className={`flex-1 rounded-xl py-3 text-sm font-bold transition ${mode === "register" ? `${ui.tabActive} shadow-sm` : ui.tabIdle}`}
                role="tab"
                aria-selected={mode === "register"}
              >
                Daftar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "register" && (
                <div>
                  <label htmlFor="nama" className={labelBase}>
                    Nama
                  </label>
                  <input
                    id="nama"
                    type="text"
                    name="nama"
                    value={form.nama}
                    onChange={handle}
                    placeholder="Nama lengkap"
                    required
                    autoComplete="name"
                    className={`${inputBase} ${ui.input}`}
                  />
                </div>
              )}

              <div>
                <label htmlFor="email" className={labelBase}>
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handle}
                  placeholder="email@anda.com"
                  required
                  autoComplete="email"
                  className={`${inputBase} ${ui.input}`}
                />
              </div>

              <div>
                <label htmlFor="password" className={labelBase}>
                  Kata Sandi
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPass ? "text" : "password"}
                    name="password"
                    value={form.password}
                    onChange={handle}
                    placeholder="Minimal 6 karakter"
                    required
                    autoComplete={
                      mode === "login" ? "current-password" : "new-password"
                    }
                    className={`${inputBase} ${ui.input} pr-12`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg ${ui.tabIdle}`}
                    aria-label={
                      showPass
                        ? "Sembunyikan kata sandi"
                        : "Tampilkan kata sandi"
                    }
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <ErrorBox />

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl py-3 px-4 btn-primary-theme text-sm font-bold shadow-lg shadow-primary-theme active:scale-[0.98] transition flex items-center justify-center gap-2"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    {mode === "login" ? "Masuk Sekarang" : "Daftar & Lanjut"}
                  </>
                )}
              </button>
            </form>

            <div className={`pt-2 border-t ${ui.divider}`}>
              <div className="flex items-center justify-between gap-3">
                <p className={`text-xs font-semibold ${ui.muted}`}>
                  Versi {APP_VERSION}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenTentang?.()}
                  className="text-xs font-bold text-primary-adaptive hover:text-primary-strong-adaptive transition"
                >
                  Tentang Aplikasi
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
