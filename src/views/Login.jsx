import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  LogIn,
  Wallet,
  Loader2,
  Users,
  Plus,
  Hash,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useFamily } from "../context/FamilyContext";
import { apiLogin, apiRegister } from "../services/api";

export default function Login() {
  const { login, user } = useAuth();
  const { createFamily, joinFamily } = useFamily();
  const [mode, setMode] = useState("login");
  const [step, setStep] = useState(1); // 1=form, 2=family setup (after register)
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
  // Temp registered user (before family setup)
  const [pendingUser, setPendingUser] = useState(null);

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

  const handle = (e) => {
    setForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };
  const handleFamily = (e) => {
    setFamilyForm((p) => ({ ...p, [e.target.name]: e.target.value }));
    setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    if (mode === "login") {
      const res = await apiLogin({
        email: form.email,
        password: form.password,
      });
      if (res.success) {
        if (!res.user.familyId) {
          // User exists but no family — go to family setup
          setPendingUser(res.user);
          login(res.user); // login first, then setup family
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
      if (!form.nama.trim()) {
        setError("Nama tidak boleh kosong.");
        setLoading(false);
        return;
      }
      if (!form.email.includes("@")) {
        setError("Format email tidak valid.");
        setLoading(false);
        return;
      }
      if (form.password.length < 6) {
        setError("Kata sandi minimal 6 karakter.");
        setLoading(false);
        return;
      }
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
    setLoading(true);
    setError("");
    const u = pendingUser || user;
    if (!u) {
      setLoading(false);
      return;
    }

    if (familyForm.mode === "create") {
      const res = await createFamily({ namaKeluarga: familyForm.namaKeluarga });
      if (res.success) {
        setPendingUser(null);
      } else {
        setError(res.error);
      }
    } else {
      const res = await joinFamily({
        inviteCode: familyForm.inviteCode,
        hubungan: familyForm.hubungan || "Anggota",
      });
      if (res.success) {
        setPendingUser(null);
      } else {
        setError(res.error);
      }
    }
    setLoading(false);
  };

  if (step === 2) {
    return (
      <div className="absolute inset-0 z-[100] flex flex-col bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
          <div className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-purple-400/20 blur-3xl"></div>
        </div>
        <div className="relative z-10 flex flex-col items-center pt-12 pb-6 px-6 text-center">
          <div className="w-14 h-14 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3 shadow-xl border border-white/30">
            <Users className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Setup Keluarga</h1>
          <p className="text-blue-100 text-sm mt-1">
            Buat keluarga baru atau bergabung dengan kode
          </p>
        </div>
        <div className="relative z-10 flex-1 bg-white rounded-t-3xl overflow-y-auto no-scrollbar px-6 pt-6 pb-10 shadow-2xl">
          {/* Tab */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => {
                setFamilyForm((p) => ({ ...p, mode: "create" }));
                setError("");
              }}
              className={`flex-1 text-sm font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${familyForm.mode === "create" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              <Plus className="w-4 h-4" /> Buat Baru
            </button>
            <button
              onClick={() => {
                setFamilyForm((p) => ({ ...p, mode: "join" }));
                setError("");
              }}
              className={`flex-1 text-sm font-bold py-2 rounded-lg transition-all flex items-center justify-center gap-1.5 ${familyForm.mode === "join" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
            >
              <Hash className="w-4 h-4" /> Gabung
            </button>
          </div>

          <div className="flex flex-col gap-4">
            {familyForm.mode === "create" ? (
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Nama Keluarga
                </label>
                <input
                  type="text"
                  name="namaKeluarga"
                  value={familyForm.namaKeluarga}
                  onChange={handleFamily}
                  placeholder="cth: Keluarga Pratama"
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Kode Undangan
                  </label>
                  <input
                    type="text"
                    name="inviteCode"
                    value={familyForm.inviteCode}
                    onChange={handleFamily}
                    placeholder="6 karakter (cth: A3B9XZ)"
                    maxLength={6}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold tracking-[0.3em] uppercase focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                    Hubungan (opsional)
                  </label>
                  <input
                    type="text"
                    name="hubungan"
                    value={familyForm.hubungan}
                    onChange={handleFamily}
                    placeholder="cth: Istri, Anak, Suami"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
                  />
                </div>
              </>
            )}
            {error && (
              <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-medium rounded-xl px-4 py-3">
                {error}
              </div>
            )}
            <button
              onClick={handleFamilySetup}
              disabled={loading}
              className="mt-1 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
    );
  }

  return (
    <div className="absolute inset-0 z-[100] flex flex-col bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700 overflow-hidden">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-24 -right-24 w-64 h-64 rounded-full bg-white/10 blur-3xl"></div>
        <div className="absolute -bottom-32 -left-16 w-72 h-72 rounded-full bg-purple-400/20 blur-3xl"></div>
      </div>
      <div className="relative z-10 flex flex-col items-center pt-14 pb-8 px-6 text-center">
        <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-4 shadow-xl border border-white/30">
          <Wallet className="w-8 h-8 text-white" />
        </div>
        <h1 className="text-2xl font-bold text-white tracking-tight">
          Catatan Keluarga
        </h1>
        <p className="text-blue-100 text-sm font-medium mt-1">
          Kelola keuangan keluarga dengan cerdas
        </p>
      </div>
      <div className="relative z-10 flex-1 bg-white rounded-t-3xl overflow-y-auto no-scrollbar px-6 pt-8 pb-10 shadow-2xl">
        <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
          <button
            onClick={() => {
              setMode("login");
              setError("");
            }}
            className={`flex-1 text-sm font-bold py-2 rounded-lg transition-all ${mode === "login" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
          >
            Masuk
          </button>
          <button
            onClick={() => {
              setMode("register");
              setError("");
            }}
            className={`flex-1 text-sm font-bold py-2 rounded-lg transition-all ${mode === "register" ? "bg-white shadow text-gray-900" : "text-gray-500"}`}
          >
            Daftar
          </button>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "register" && (
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Nama
              </label>
              <input
                type="text"
                name="nama"
                value={form.nama}
                onChange={handle}
                placeholder="Nama Anda"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
            </div>
          )}
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handle}
              placeholder="email@anda.com"
              required
              className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Kata Sandi
            </label>
            <div className="relative">
              <input
                type={showPass ? "text" : "password"}
                name="password"
                value={form.password}
                onChange={handle}
                placeholder="••••••••"
                required
                className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 pr-12 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 transition"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1"
              >
                {showPass ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          {error && (
            <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-medium rounded-xl px-4 py-3">
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="mt-2 w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-blue-500/30 hover:opacity-90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
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
        <div className="mt-6 bg-blue-50 rounded-xl p-4 border border-blue-100">
          <p className="text-[11px] font-bold text-blue-700 uppercase tracking-wider mb-1">
            Terhubung ke Spreadsheet
          </p>
          <p className="text-[10px] text-blue-500 leading-relaxed">
            Akun & data disimpan aman di Google Spreadsheet milik Anda.
          </p>
        </div>
      </div>
    </div>
  );
}
