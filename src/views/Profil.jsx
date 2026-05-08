import { useState } from "react";
import {
  User,
  Settings,
  Info,
  LogOut,
  ChevronRight,
  Edit3,
  Shield,
  Check,
  X,
  Users,
  History,
} from "lucide-react";
import Pengaturan from "../components/overlays/Pengaturan";
import AnggotaKeluarga from "../components/overlays/AnggotaKeluarga";
import RiwayatAudit from "../components/overlays/RiwayatAudit";
import TentangAplikasi from "../components/overlays/TentangAplikasi";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Profil() {
  const { user, logout, updateProfile } = useAuth();
  const { isDark } = useTheme();
  const [isPengaturanOpen, setIsPengaturanOpen] = useState(false);
  const [isAnggotaOpen, setIsAnggotaOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isTentangOpen, setIsTentangOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editNama, setEditNama] = useState(user?.nama || "");
  const [editEmail, setEditEmail] = useState(user?.email || "");
  const [editLoading, setEditLoading] = useState(false);
  const [editError, setEditError] = useState("");
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  const handleSaveProfile = async () => {
    if (!editNama.trim()) return;
    setEditLoading(true);
    setEditError("");
    const res = await updateProfile({
      nama: editNama.trim(),
      email: editEmail.trim(),
    });
    setEditLoading(false);
    if (res.success) {
      setIsEditOpen(false);
    } else {
      setEditError(res.error || "Gagal menyimpan.");
    }
  };

  const nama = user?.nama || "Pengguna";
  const email = user?.email || "";
  const inisial = user?.inisial || nama.slice(0, 2).toUpperCase();

  const cardClass = `rounded-2xl shadow-sm border overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`;
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const sectionLabel = `text-xs font-bold uppercase tracking-wider mb-3 px-2 ${isDark ? "text-gray-500" : "text-gray-400"}`;
  const rowBorder = `border-b ${isDark ? "border-gray-700" : "border-gray-50"}`;
  const rowHover = `hover:${isDark ? "bg-gray-700" : "bg-gray-50"} active:${isDark ? "bg-gray-600" : "bg-gray-100"} transition`;

  return (
    <div className={isDark ? "bg-gray-900 min-h-full" : ""}>
      {/* Profile Header */}
      <section className="px-4 mt-8 flex flex-col items-center">
        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center border-4 border-white shadow-lg mb-4 relative">
          <span className="text-white font-bold text-3xl tracking-wider">
            {inisial}
          </span>
          <button
            onClick={() => {
              setEditNama(user?.nama || "");
              setEditEmail(user?.email || "");
              setIsEditOpen(true);
            }}
            className="absolute bottom-0 right-0 w-8 h-8 bg-blue-600 rounded-full border-2 border-white flex items-center justify-center text-white shadow-sm hover:bg-blue-700 active:scale-95 transition"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        </div>
        <h2 className={`text-xl font-bold ${textPrimary}`}>{nama}</h2>
        <p className={`text-sm font-medium ${textSecondary} mt-0.5`}>{email}</p>
        <div className="flex items-center gap-1 mt-2 bg-green-50 text-green-600 px-3 py-1 rounded-full">
          <Shield className="w-3 h-3" />
          <span className="text-[11px] font-bold">Terverifikasi</span>
        </div>
      </section>

      {/* Akun Menu */}
      <section className="px-4 mt-8">
        <h3 className={sectionLabel}>Akun & Keluarga</h3>
        <div className={cardClass}>
          <button
            onClick={() => setIsAnggotaOpen(true)}
            className={`w-full flex items-center justify-between p-4 ${rowBorder} ${rowHover}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-indigo-900/40 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}
              >
                <Users className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className={`block font-bold text-sm ${textPrimary}`}>
                  Anggota Keluarga
                </span>
                <span className={`block text-xs font-medium ${textSecondary}`}>
                  Kelola dan undang anggota
                </span>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 ${isDark ? "text-gray-600" : "text-gray-300"}`}
            />
          </button>
          <button
            onClick={() => {
              setEditNama(user?.nama || "");
              setEditEmail(user?.email || "");
              setIsEditOpen(true);
            }}
            className={`w-full flex items-center justify-between p-4 ${rowBorder} ${rowHover}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600">
                <User className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className={`block font-bold text-sm ${textPrimary}`}>
                  Edit Profil
                </span>
                <span className={`block text-xs font-medium ${textSecondary}`}>
                  Ubah nama dan data diri
                </span>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 ${isDark ? "text-gray-600" : "text-gray-300"}`}
            />
          </button>
          <button
            onClick={() => setIsAuditOpen(true)}
            className={`w-full flex items-center justify-between p-4 ${rowHover}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-amber-900/40 text-amber-400" : "bg-amber-50 text-amber-600"}`}
              >
                <History className="w-5 h-5" />
              </div>
              <div className="text-left">
                <span className={`block font-bold text-sm ${textPrimary}`}>
                  Riwayat Aktivitas Keluarga
                </span>
                <span className={`block text-xs font-medium ${textSecondary}`}>
                  Lihat log aksi & rollback
                </span>
              </div>
            </div>
            <ChevronRight
              className={`w-5 h-5 ${isDark ? "text-gray-600" : "text-gray-300"}`}
            />
          </button>
        </div>
      </section>

      {/* Pengaturan Menu */}
      <section className="px-4 mt-6">
        <h3 className={sectionLabel}>Pengaturan Lainnya</h3>
        <div className={cardClass}>
          <button
            onClick={() => setIsPengaturanOpen(true)}
            className={`w-full flex items-center justify-between p-4 ${rowBorder} ${rowHover}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"}`}
              >
                <Settings className="w-5 h-5" />
              </div>
              <span className={`font-bold text-sm ${textPrimary}`}>
                Pengaturan Aplikasi
              </span>
            </div>
            <ChevronRight
              className={`w-5 h-5 ${isDark ? "text-gray-600" : "text-gray-300"}`}
            />
          </button>

          <button
            onClick={() => setIsTentangOpen(true)}
            className={`w-full flex items-center justify-between p-4 ${rowBorder} ${rowHover}`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${isDark ? "bg-indigo-900/50 text-indigo-400" : "bg-indigo-50 text-indigo-600"}`}
              >
                <Info className="w-5 h-5" />
              </div>
              <span className={`font-bold text-sm ${textPrimary}`}>
                Tentang Aplikasi
              </span>
            </div>
            <ChevronRight
              className={`w-5 h-5 ${isDark ? "text-gray-600" : "text-gray-300"}`}
            />
          </button>

          <button
            onClick={() => setShowLogoutConfirm(true)}
            className={`w-full flex items-center justify-between p-4 hover:bg-red-50 active:bg-red-100 transition group`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-50 group-hover:bg-red-100 flex items-center justify-center text-red-500 transition">
                <LogOut className="w-5 h-5" />
              </div>
              <span className="font-bold text-sm text-red-500">
                Keluar (Logout)
              </span>
            </div>
          </button>
        </div>
      </section>

      {/* Overlays */}
      <Pengaturan
        isOpen={isPengaturanOpen}
        onClose={() => setIsPengaturanOpen(false)}
      />
      <AnggotaKeluarga
        isOpen={isAnggotaOpen}
        onClose={() => setIsAnggotaOpen(false)}
      />
      <RiwayatAudit
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
      />
      <TentangAplikasi
        isOpen={isTentangOpen}
        onClose={() => setIsTentangOpen(false)}
      />

      {/* Edit Profil Modal */}
      {isEditOpen && (
        <div className="absolute inset-0 z-50 flex items-end bg-black/50 backdrop-blur-sm">
          <div
            className={`w-full rounded-t-3xl p-6 pb-10 shadow-2xl ${isDark ? "bg-gray-800" : "bg-white"}`}
          >
            <div className="flex items-center justify-between mb-6">
              <h3 className={`text-base font-bold ${textPrimary}`}>
                Edit Profil
              </h3>
              <button
                onClick={() => setIsEditOpen(false)}
                className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-600"} hover:opacity-80 transition`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${textSecondary}`}
                >
                  Nama
                </label>
                <input
                  type="text"
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                />
              </div>
              <div>
                <label
                  className={`block text-xs font-bold uppercase tracking-wider mb-1.5 ${textSecondary}`}
                >
                  Email
                </label>
                <input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className={`w-full rounded-xl px-4 py-3 text-sm font-medium border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isDark ? "bg-gray-700 border-gray-600 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
                />
              </div>
              {editError && (
                <div className="bg-red-50 border border-red-100 text-red-600 text-xs font-medium rounded-xl px-4 py-3">
                  {editError}
                </div>
              )}
              <button
                onClick={handleSaveProfile}
                disabled={editLoading}
                className="mt-2 w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-60"
              >
                {editLoading ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Simpan Perubahan
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logout Confirm Modal */}
      {showLogoutConfirm && (
        <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-8">
          <div
            className={`w-full rounded-3xl p-6 shadow-2xl ${isDark ? "bg-gray-800" : "bg-white"}`}
          >
            <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-4">
              <LogOut className="w-7 h-7 text-red-500" />
            </div>
            <h3
              className={`text-base font-bold text-center mb-2 ${textPrimary}`}
            >
              Konfirmasi Keluar
            </h3>
            <p className={`text-sm text-center mb-6 ${textSecondary}`}>
              Yakin ingin keluar dari akun ini?
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowLogoutConfirm(false)}
                className={`flex-1 py-3 rounded-xl font-bold text-sm transition ${isDark ? "bg-gray-700 text-gray-300 hover:bg-gray-600" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
              >
                Batal
              </button>
              <button
                onClick={logout}
                className="flex-1 py-3 rounded-xl bg-red-500 text-white font-bold text-sm hover:bg-red-600 active:scale-[0.98] transition"
              >
                Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
