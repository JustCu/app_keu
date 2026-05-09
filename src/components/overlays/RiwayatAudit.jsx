import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  RefreshCw,
  Filter,
  Clock3,
  RotateCcw,
  ShieldAlert,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useFamily } from "../../context/FamilyContext";
import { apiGetFamilyAudit, apiRollbackFamilyAction } from "../../services/api";

const ACTION_OPTIONS = [
  { value: "ALL", label: "Semua Aksi" },
  { value: "CREATE_FAMILY", label: "Buat Keluarga" },
  { value: "JOIN_FAMILY", label: "Gabung Keluarga" },
  { value: "REMOVE_MEMBER", label: "Hapus Anggota" },
  { value: "LEAVE_FAMILY", label: "Keluar Keluarga" },
  { value: "ROTATE_INVITE_CODE", label: "Putar Kode Undangan" },
  { value: "TRANSFER_ADMIN", label: "Transfer Admin" },
  { value: "ROLLBACK_REMOVE_MEMBER", label: "Rollback Hapus Anggota" },
  { value: "ROLLBACK_TRANSFER_ADMIN", label: "Rollback Transfer Admin" },
  {
    value: "ROLLBACK_ROTATE_INVITE_CODE",
    label: "Rollback Kode Undangan",
  },
];

const ACTION_LABELS = ACTION_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

const ROLLBACKABLE_ACTIONS = new Set([
  "REMOVE_MEMBER",
  "TRANSFER_ADMIN",
  "ROTATE_INVITE_CODE",
]);

function formatActionLabel(action) {
  return ACTION_LABELS[action] || action;
}

function formatDate(value) {
  try {
    return new Date(value).toLocaleString("id-ID", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return value || "-";
  }
}

function normalizeError(code) {
  const map = {
    FORBIDDEN: "Akses ditolak untuk riwayat keluarga ini.",
    UNAUTHORIZED: "Anda tidak punya izin untuk rollback aksi ini.",
    AUDIT_NOT_FOUND: "Data audit tidak ditemukan.",
    ROLLBACK_NOT_SUPPORTED: "Aksi ini belum bisa di-rollback.",
    ROLLBACK_FAILED: "Rollback gagal karena data saat ini tidak kompatibel.",
    ALREADY_ROLLED_BACK: "Aksi ini sudah pernah di-rollback.",
    ROLLBACK_WINDOW_EXPIRED:
      "Rollback kedaluwarsa. Maksimal 24 jam setelah aksi terjadi.",
  };
  return map[code] || code || "Terjadi kesalahan.";
}

export default function RiwayatAudit({ isOpen, onClose }) {
  const { isDark } = useTheme();
  const { user, updateUserLocally } = useAuth();
  const { refreshFamily } = useFamily();

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [rollingId, setRollingId] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  });

  const canRollback = user?.peran === "admin";

  const loadAudit = async (targetPage = page) => {
    if (!user?.id || !user?.familyId) {
      setItems([]);
      return;
    }

    setLoading(true);
    setError("");
    const res = await apiGetFamilyAudit({
      familyId: user.familyId,
      requesterId: user.id,
      actionFilter,
      fromDate,
      toDate,
      page: targetPage,
      pageSize,
    });
    setLoading(false);

    if (!res.success) {
      setError(normalizeError(res.error));
      return;
    }

    const payload = res.data || {};
    const nextPagination = payload.pagination || {
      total: 0,
      page: targetPage,
      pageSize,
      totalPages: 1,
    };
    setItems(Array.isArray(payload.items) ? payload.items : []);
    setPagination(nextPagination);
    setPage(nextPagination.page || targetPage);
  };

  useEffect(() => {
    if (isOpen) loadAudit(1);
  }, [isOpen]);

  const itemView = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        rollbackable:
          !item.action.startsWith("ROLLBACK_") &&
          ROLLBACKABLE_ACTIONS.has(item.action) &&
          !item.rolledBack &&
          !item.rollbackWindowExpired,
      })),
    [items],
  );

  const handleRollback = async (item) => {
    if (!canRollback) return;
    if (!window.confirm(`Rollback aksi ${formatActionLabel(item.action)}?`))
      return;

    setRollingId(item.id);
    const res = await apiRollbackFamilyAction({
      familyId: user.familyId,
      requesterId: user.id,
      auditId: item.id,
    });
    setRollingId("");

    if (!res.success) {
      alert(normalizeError(res.error));
      return;
    }

    if (res.data?.requesterRole) {
      updateUserLocally({ peran: res.data.requesterRole });
    }

    await refreshFamily();
    await loadAudit(page);
  };

  if (!isOpen) return null;

  const bg = isDark ? "bg-gray-900" : "bg-gray-50";
  const card = `rounded-2xl shadow-sm border ${
    isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
  }`;
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const inputClass = `mt-1 w-full rounded-xl border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus-primary-theme ${
    isDark
      ? "bg-gray-700 border-gray-600 text-white"
      : "bg-gray-50 border-gray-200 text-gray-900"
  }`;

  return (
    <div className={`absolute inset-0 z-50 flex flex-col ${bg}`}>
      <header
        className={`flex items-center justify-between px-4 pt-8 pb-4 border-b ${
          isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
        }`}
      >
        <button
          onClick={onClose}
          className={`w-8 h-8 -ml-2 rounded-full flex items-center justify-center transition ${
            isDark
              ? "text-gray-300 hover:bg-gray-800"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className={`text-lg font-bold ${textPrimary}`}>
          Riwayat Aktivitas
        </h2>
        <button
          onClick={() => loadAudit(page)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
            isDark
              ? "text-gray-300 hover:bg-gray-800"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <section className="mt-6">
          <div className={`${card} p-4`}>
            <div className="flex items-center gap-2 mb-3">
              <Filter className={`w-4 h-4 ${textSecondary}`} />
              <p
                className={`text-xs font-bold uppercase tracking-wider ${textSecondary}`}
              >
                Filter
              </p>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <div>
                <label className={`text-xs font-semibold ${textSecondary}`}>
                  Aksi
                </label>
                <select
                  value={actionFilter}
                  onChange={(e) => setActionFilter(e.target.value)}
                  className={inputClass}
                >
                  {ACTION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className={`text-xs font-semibold ${textSecondary}`}>
                    Dari Tanggal
                  </label>
                  <input
                    type="date"
                    value={fromDate}
                    onChange={(e) => setFromDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className={`text-xs font-semibold ${textSecondary}`}>
                    Sampai Tanggal
                  </label>
                  <input
                    type="date"
                    value={toDate}
                    onChange={(e) => setToDate(e.target.value)}
                    className={inputClass}
                  />
                </div>
              </div>

              <div>
                <label className={`text-xs font-semibold ${textSecondary}`}>
                  Data per Halaman
                </label>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(parseInt(e.target.value, 10))}
                  className={inputClass}
                >
                  {[10, 20, 30, 50].map((n) => (
                    <option key={n} value={n}>
                      {n} item
                    </option>
                  ))}
                </select>
              </div>

              <button
                onClick={() => {
                  setPage(1);
                  loadAudit(1);
                }}
                disabled={loading}
                className="mt-1 w-full rounded-xl btn-primary-theme text-sm font-bold py-2.5 shadow-primary-theme disabled:opacity-60"
              >
                Terapkan Filter
              </button>
            </div>
          </div>
        </section>

        <section className="mt-6">
          {error && (
            <div
              className={`mb-3 rounded-xl border px-3 py-2 text-xs font-medium ${isDark ? "border-red-800 bg-red-900/30 text-red-300" : "border-red-200 bg-red-50 text-red-600"}`}
            >
              {error}
            </div>
          )}

          {loading ? (
            <div className="flex flex-col gap-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className={`${card} p-4 animate-pulse`}>
                  <div
                    className={`h-3 rounded w-36 mb-3 ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
                  ></div>
                  <div
                    className={`h-2.5 rounded w-full mb-2 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}
                  ></div>
                  <div
                    className={`h-2.5 rounded w-3/4 ${isDark ? "bg-gray-700" : "bg-gray-100"}`}
                  ></div>
                </div>
              ))}
            </div>
          ) : itemView.length === 0 ? (
            <div className={`${card} p-6 text-center`}>
              <Clock3 className={`w-5 h-5 mx-auto mb-2 ${textSecondary}`} />
              <p className={`text-sm font-medium ${textSecondary}`}>
                Belum ada aktivitas untuk filter saat ini.
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {itemView.map((item) => (
                <div key={item.id} className={`${card} p-4`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={`text-sm font-bold ${textPrimary}`}>
                          {formatActionLabel(item.action)}
                        </p>
                        {item.rolledBack && (
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${isDark ? "bg-emerald-900/40 text-emerald-300" : "bg-emerald-100 text-emerald-700"}`}
                          >
                            Ditarik Kembali
                          </span>
                        )}
                      </div>
                      <p className={`text-xs mt-1 ${textSecondary}`}>
                        {item.actorName || "Sistem"}
                        {item.targetName ? ` -> ${item.targetName}` : ""}
                      </p>
                      <p className={`text-[11px] mt-1 ${textSecondary}`}>
                        {formatDate(item.timestamp)}
                      </p>
                      {item.rolledBack && item.rollbackInfo?.timestamp && (
                        <p
                          className={`text-[11px] mt-1 font-medium ${isDark ? "text-emerald-300" : "text-emerald-600"}`}
                        >
                          Rollback pada{" "}
                          {formatDate(item.rollbackInfo.timestamp)}
                        </p>
                      )}
                    </div>

                    {canRollback &&
                    !item.action.startsWith("ROLLBACK_") &&
                    ROLLBACKABLE_ACTIONS.has(item.action) ? (
                      <button
                        onClick={() => handleRollback(item)}
                        disabled={rollingId === item.id || !item.rollbackable}
                        className={`rounded-lg px-2.5 py-1.5 text-xs font-bold disabled:opacity-60 flex items-center gap-1 ${isDark ? "text-amber-300 bg-amber-900/40 hover:bg-amber-900/60" : "text-amber-700 bg-amber-100 hover:bg-amber-200"}`}
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        {rollingId === item.id
                          ? "Proses"
                          : item.rolledBack
                            ? "Sudah Ditarik"
                            : item.rollbackWindowExpired
                              ? "Kedaluwarsa"
                              : "Rollback"}
                      </button>
                    ) : (
                      <span
                        className={`text-[11px] font-semibold ${textSecondary}`}
                      >
                        {item.action.startsWith("ROLLBACK_")
                          ? "Sudah rollback"
                          : "Read only"}
                      </span>
                    )}
                  </div>

                  {!item.action.startsWith("ROLLBACK_") &&
                    ROLLBACKABLE_ACTIONS.has(item.action) && (
                      <div
                        className={`mt-3 rounded-lg border px-3 py-2 flex items-start gap-2 ${isDark ? "border-amber-800 bg-amber-900/30" : "border-amber-200 bg-amber-50"}`}
                      >
                        <ShieldAlert
                          className={`w-3.5 h-3.5 mt-0.5 ${isDark ? "text-amber-300" : "text-amber-700"}`}
                        />
                        <p
                          className={`text-[11px] leading-relaxed ${isDark ? "text-amber-200" : "text-amber-800"}`}
                        >
                          {item.rolledBack
                            ? "Aksi ini sudah ditarik kembali dan tidak dapat di-rollback ulang."
                            : item.rollbackWindowExpired
                              ? "Aksi ini sudah melewati jendela rollback 24 jam."
                              : "Rollback ringan hanya membatalkan efek utama aksi ini. Lakukan dengan hati-hati."}
                        </p>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}

          {!loading && pagination.totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                onClick={() => loadAudit(Math.max(1, page - 1))}
                disabled={page <= 1}
                className={`px-3 py-2 rounded-xl text-xs font-bold ${
                  page <= 1
                    ? isDark
                      ? "bg-gray-800 text-gray-600"
                      : "bg-gray-200 text-gray-400"
                    : isDark
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
              >
                Sebelumnya
              </button>

              <p className={`text-xs font-semibold ${textSecondary}`}>
                Halaman {pagination.page} / {pagination.totalPages} •{" "}
                {pagination.total} item
              </p>

              <button
                onClick={() =>
                  loadAudit(Math.min(pagination.totalPages, page + 1))
                }
                disabled={page >= pagination.totalPages}
                className={`px-3 py-2 rounded-xl text-xs font-bold ${
                  page >= pagination.totalPages
                    ? isDark
                      ? "bg-gray-800 text-gray-600"
                      : "bg-gray-200 text-gray-400"
                    : isDark
                      ? "bg-gray-700 text-white hover:bg-gray-600"
                      : "bg-gray-800 text-white hover:bg-gray-700"
                }`}
              >
                Berikutnya
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
