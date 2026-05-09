import { useState, useEffect } from "react";
import {
  ChevronLeft,
  UserPlus,
  Trash2,
  Crown,
  Copy,
  Check,
  RefreshCw,
  Users,
  LogOut,
  RotateCw,
  ShieldCheck,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useFamily } from "../../context/FamilyContext";

const COLORS = [
  "bg-primary-theme",
  "bg-primary-theme",
  "bg-pink-500",
  "bg-green-500",
  "bg-orange-500",
  "bg-red-500",
  "bg-primary-theme",
  "bg-primary-theme",
];
const getColor = (str) =>
  COLORS[
    str.split("").reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length
  ];

export default function AnggotaKeluarga({ isOpen, onClose }) {
  const { isDark } = useTheme();
  const { user } = useAuth();
  const {
    family,
    members,
    isLoadingFamily,
    familyError,
    refreshFamily,
    removeMember,
    leaveFamily,
    rotateInviteCode,
    transferAdmin,
  } = useFamily();

  const [copied, setCopied] = useState(false);
  const [removingId, setRemovingId] = useState(null);
  const [isLeaving, setIsLeaving] = useState(false);
  const [isRotatingInvite, setIsRotatingInvite] = useState(false);
  const [promotingId, setPromotingId] = useState(null);

  useEffect(() => {
    if (isOpen) refreshFamily();
  }, [isOpen, refreshFamily]);

  const copyCode = () => {
    if (!family?.inviteCode) return;
    navigator.clipboard.writeText(family.inviteCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRemove = async (member) => {
    if (!window.confirm(`Hapus ${member.nama} dari keluarga?`)) return;
    setRemovingId(member.userId);
    const res = await removeMember(member.userId);
    if (!res.success) {
      alert(res.error || "Gagal menghapus anggota.");
    }
    setRemovingId(null);
  };

  const handleLeaveFamily = async () => {
    if (!window.confirm("Anda yakin ingin keluar dari keluarga ini?")) return;
    setIsLeaving(true);
    const res = await leaveFamily();
    setIsLeaving(false);
    if (!res.success) {
      alert(res.error || "Gagal keluar dari keluarga.");
      return;
    }
    onClose();
  };

  const handleRotateInviteCode = async () => {
    setIsRotatingInvite(true);
    const res = await rotateInviteCode();
    setIsRotatingInvite(false);
    if (!res.success) {
      alert(res.error || "Gagal memperbarui kode undangan.");
    }
  };

  const handlePromote = async (member) => {
    if (!window.confirm(`Jadikan ${member.nama} sebagai admin keluarga?`))
      return;
    setPromotingId(member.userId);
    const res = await transferAdmin(member.userId);
    setPromotingId(null);
    if (!res.success) {
      alert(res.error || "Gagal memindahkan admin.");
      return;
    }
    alert(`${member.nama} sekarang menjadi admin keluarga.`);
  };

  if (!isOpen) return null;

  const bg = isDark ? "bg-gray-900" : "bg-gray-50";
  const card = "overlay-panel";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const subtleButtonClass = "overlay-subtle-button";
  const mutedIconButtonClass =
    "overlay-muted-button w-10 h-10 rounded-xl flex items-center justify-center";

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col ${bg} transition-colors duration-300`}
    >
      {/* Header */}
      <header
        className={`flex items-center justify-between px-4 pt-8 pb-4 border-b ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}
      >
        <button
          onClick={onClose}
          className={`w-8 h-8 -ml-2 rounded-full flex items-center justify-center transition ${subtleButtonClass}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className={`text-lg font-bold ${textPrimary}`}>Anggota Keluarga</h2>
        <button
          onClick={refreshFamily}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${subtleButtonClass}`}
        >
          <RefreshCw
            className={`w-4 h-4 ${isLoadingFamily ? "animate-spin" : ""}`}
          />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        {/* Kode Undangan */}
        {user?.peran === "admin" && family && (
          <section className="mt-6">
            <p
              className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${textSecondary}`}
            >
              Kode Undangan Keluarga
            </p>
            <div
              className={`${card} p-5 flex items-center justify-between gap-4`}
            >
              <div>
                <p
                  className={`text-2xl font-bold tracking-[0.3em] ${textPrimary}`}
                >
                  {family.inviteCode}
                </p>
                <p className={`text-xs mt-1 ${textSecondary}`}>
                  Bagikan ke anggota keluarga untuk bergabung
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRotateInviteCode}
                  disabled={isRotatingInvite}
                  className={mutedIconButtonClass}
                  title="Perbarui kode undangan"
                >
                  <RotateCw
                    className={`w-4 h-4 ${isRotatingInvite ? "animate-spin" : ""}`}
                  />
                </button>
                <button
                  onClick={copyCode}
                  className={`${copied ? "overlay-success-soft border" : mutedIconButtonClass} w-10 h-10 rounded-xl flex items-center justify-center transition`}
                >
                  {copied ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </section>
        )}

        {/* Nama Keluarga */}
        {family && (
          <section className="mt-6">
            <p
              className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${textSecondary}`}
            >
              Keluarga
            </p>
            <div className={`${card} p-5 flex items-center gap-3`}>
              <div className="w-10 h-10 rounded-full bg-primary-surface-strong-adaptive flex items-center justify-center">
                <Users className="w-5 h-5 text-primary-adaptive" />
              </div>
              <div>
                <p className={`font-bold text-sm ${textPrimary}`}>
                  {family.nama}
                </p>
                <p className={`text-xs ${textSecondary}`}>
                  {members.length} anggota
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Daftar Anggota */}
        <section className="mt-6">
          <p
            className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${textSecondary}`}
          >
            Daftar Anggota
          </p>
          {familyError && !isLoadingFamily && (
            <div className="overlay-danger-soft mb-3 rounded-xl border px-3 py-2 text-xs font-medium">
              {familyError}
            </div>
          )}
          {isLoadingFamily ? (
            <div className="flex flex-col gap-3">
              {[1, 2].map((i) => (
                <div
                  key={i}
                  className={`${card} p-5 flex items-center gap-3 animate-pulse`}
                >
                  <div className="overlay-skeleton w-10 h-10 rounded-full"></div>
                  <div className="flex-1">
                    <div className="overlay-skeleton h-3 rounded w-32 mb-2"></div>
                    <div className="overlay-skeleton h-2.5 rounded w-20"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className={`${card} overflow-hidden`}>
              {members.length === 0 ? (
                <div className={`p-4 text-sm ${textSecondary}`}>
                  Belum ada anggota keluarga.
                </div>
              ) : (
                members.map((member, idx) => {
                  const isAdmin = member.peran === "admin";
                  const isMe = member.userId === user?.id;
                  const color = getColor(member.nama);
                  const canRemove =
                    user?.peran === "admin" && !isMe && !isAdmin;
                  const canPromote =
                    user?.peran === "admin" && !isMe && !isAdmin;
                  return (
                    <div
                      key={member.id}
                      className={`flex items-center gap-3 p-4 ${idx < members.length - 1 ? `border-b ${isDark ? "border-gray-700" : "border-gray-50"}` : ""}`}
                    >
                      <div
                        className={`w-10 h-10 rounded-full ${color} flex items-center justify-center flex-shrink-0`}
                      >
                        <span className="text-white font-bold text-sm">
                          {member.nama[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className={`font-bold text-sm ${textPrimary}`}>
                            {member.nama}
                            {isMe && (
                              <span
                                className={`text-xs font-normal ml-1 ${textSecondary}`}
                              >
                                (Anda)
                              </span>
                            )}
                          </p>
                          {isAdmin && (
                            <span className="flex items-center gap-1 bg-primary-theme text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                              <Crown className="w-2.5 h-2.5" /> Kepala / Admin
                            </span>
                          )}
                        </div>
                        <p className={`text-xs ${textSecondary}`}>
                          {member.hubungan} • {isAdmin ? "Admin" : "Anggota"}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        {canPromote && (
                          <button
                            onClick={() => handlePromote(member)}
                            disabled={promotingId === member.userId}
                            className="w-8 h-8 rounded-full flex items-center justify-center transition text-primary-adaptive hover:bg-primary-surface-adaptive disabled:opacity-40"
                            title="Jadikan admin"
                          >
                            <ShieldCheck className="w-4 h-4" />
                          </button>
                        )}
                        {canRemove && (
                          <button
                            onClick={() => handleRemove(member)}
                            disabled={removingId === member.userId}
                            className={`w-8 h-8 rounded-full flex items-center justify-center transition disabled:opacity-40 ${isDark ? "text-red-300 hover:bg-red-900/30" : "text-red-400 hover:bg-red-50"}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
        </section>

        {/* Undang Anggota - info */}
        {user?.peran === "admin" && (
          <button
            onClick={copyCode}
            className={`mt-4 w-full border-2 border-dashed rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm transition ${isDark ? "border-gray-700 text-gray-400 hover:border-gray-600" : "border-gray-200 text-gray-500 hover:border-gray-300"}`}
          >
            <UserPlus className="w-5 h-5" />
            Undang Anggota (Salin Kode)
          </button>
        )}

        <button
          onClick={handleLeaveFamily}
          disabled={isLeaving}
          className="overlay-danger-soft mt-4 w-full rounded-2xl border p-4 flex items-center justify-center gap-2 font-bold text-sm transition disabled:opacity-60"
        >
          <LogOut className="w-5 h-5" />
          {isLeaving ? "Memproses..." : "Keluar dari Keluarga"}
        </button>
      </div>
    </div>
  );
}
