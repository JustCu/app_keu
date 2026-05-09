import { Filter, Clock3, RotateCcw, ShieldAlert } from "lucide-react";

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

export default function RiwayatAuditContent({
  isDark,
  loading,
  error,
  actionFilter,
  setActionFilter,
  fromDate,
  setFromDate,
  toDate,
  setToDate,
  pageSize,
  setPageSize,
  onApplyFilter,
  itemView,
  canRollback,
  rollingId,
  onRollback,
  formatActionLabel,
  formatDate,
  textPrimary,
  textSecondary,
  card,
  controlClass,
  pagination,
  page,
  onPrev,
  onNext,
}) {
  return (
    <>
      <section className="mt-5">
        <div className={`${card} p-5`}>
          <div className="flex items-center gap-2 mb-4">
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
                className={controlClass}
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
                  className={controlClass}
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
                  className={controlClass}
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
                className={controlClass}
              >
                {[10, 20, 30, 50].map((n) => (
                  <option key={n} value={n}>
                    {n} item
                  </option>
                ))}
              </select>
            </div>

            <button
              onClick={onApplyFilter}
              disabled={loading}
              className="mt-1 w-full rounded-xl btn-primary-theme text-sm font-bold py-2.5 shadow-primary-theme disabled:opacity-60"
            >
              Terapkan Filter
            </button>
          </div>
        </div>
      </section>

      <section className="mt-5">
        {error && (
          <div className="overlay-danger-soft mb-3 rounded-xl border px-3 py-2 text-xs font-medium">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex flex-col gap-3">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className={`${card} p-5 skeleton-shimmer`}
                style={{ "--skeleton-delay": `${i * 120}ms` }}
              >
                <div
                  className={`overlay-skeleton h-3 rounded w-36 mb-3 ${isDark ? "opacity-70" : "opacity-100"}`}
                ></div>
                <div
                  className={`overlay-skeleton h-2.5 rounded w-full mb-2 ${isDark ? "opacity-60" : "opacity-90"}`}
                ></div>
                <div
                  className={`overlay-skeleton h-2.5 rounded w-3/4 ${isDark ? "opacity-55" : "opacity-80"}`}
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
              <div key={item.id} className={`${card} p-5`}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-bold ${textPrimary}`}>
                        {formatActionLabel(item.action)}
                      </p>
                      {item.rolledBack && (
                        <span className="overlay-success-soft text-[10px] font-bold px-2 py-0.5 rounded-full border">
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
                        className={`text-[11px] mt-1 font-medium ${
                          isDark ? "text-emerald-300" : "text-emerald-600"
                        }`}
                      >
                        Rollback pada {formatDate(item.rollbackInfo.timestamp)}
                      </p>
                    )}
                  </div>

                  {canRollback &&
                  !item.action.startsWith("ROLLBACK_") &&
                  item.rollbackable ? (
                    <button
                      onClick={() => onRollback(item)}
                      disabled={rollingId === item.id || !item.rollbackable}
                      className="overlay-warning-soft rounded-lg px-2.5 py-1.5 text-xs font-bold flex items-center gap-1 transition border disabled:opacity-60"
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

                {!item.action.startsWith("ROLLBACK_") && item.rollbackable && (
                  <div className="overlay-warning-soft mt-4 rounded-xl border px-3 py-2.5 flex items-start gap-2">
                    <ShieldAlert
                      className={`w-3.5 h-3.5 mt-0.5 ${
                        isDark ? "text-amber-300" : "text-amber-700"
                      }`}
                    />
                    <p
                      className={`text-[11px] leading-relaxed ${
                        isDark ? "text-amber-200" : "text-amber-800"
                      }`}
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
              onClick={onPrev}
              disabled={page <= 1}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
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
              onClick={onNext}
              disabled={page >= pagination.totalPages}
              className={`px-3 py-2 rounded-xl text-xs font-bold transition ${
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
    </>
  );
}
