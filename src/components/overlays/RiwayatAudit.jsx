import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { ChevronLeft, RefreshCw } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useFamily } from "../../context/FamilyContext";
import { apiGetFamilyAudit, apiRollbackFamilyAction } from "../../services/api";

const RiwayatAuditContent = lazy(() => import("./RiwayatAuditContent"));

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
  const card = "overlay-panel";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const controlClass =
    "overlay-control mt-1 w-full rounded-xl px-3 py-2.5 text-sm focus:ring-2";
  const subtleButtonClass = "overlay-subtle-button";

  return (
    <div className={`absolute inset-0 z-50 flex flex-col ${bg}`}>
      <header
        className={`flex items-center justify-between px-4 pt-8 pb-4 border-b ${
          isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"
        }`}
      >
        <button
          onClick={onClose}
          className={`w-8 h-8 -ml-2 rounded-full flex items-center justify-center transition ${subtleButtonClass}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className={`text-lg font-bold ${textPrimary}`}>
          Riwayat Aktivitas
        </h2>
        <button
          onClick={() => loadAudit(page)}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${subtleButtonClass}`}
        >
          <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar px-4 pb-8">
        <Suspense fallback={null}>
          <RiwayatAuditContent
            isDark={isDark}
            loading={loading}
            error={error}
            actionFilter={actionFilter}
            setActionFilter={setActionFilter}
            fromDate={fromDate}
            setFromDate={setFromDate}
            toDate={toDate}
            setToDate={setToDate}
            pageSize={pageSize}
            setPageSize={setPageSize}
            onApplyFilter={() => {
              setPage(1);
              loadAudit(1);
            }}
            itemView={itemView}
            canRollback={canRollback}
            rollingId={rollingId}
            onRollback={handleRollback}
            formatActionLabel={formatActionLabel}
            formatDate={formatDate}
            textPrimary={textPrimary}
            textSecondary={textSecondary}
            card={card}
            controlClass={controlClass}
            pagination={pagination}
            page={page}
            onPrev={() => loadAudit(Math.max(1, page - 1))}
            onNext={() => loadAudit(Math.min(pagination.totalPages, page + 1))}
          />
        </Suspense>
      </div>
    </div>
  );
}
