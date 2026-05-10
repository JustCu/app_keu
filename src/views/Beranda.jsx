import { useEffect, useState } from "react";
import {
  Eye,
  EyeOff,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  ChevronDown,
  X,
  Pencil,
  Trash2,
  Save,
  Loader2,
  CalendarDays,
  Tags,
  FileText,
  CircleDollarSign,
} from "lucide-react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { apiDeleteTransaksi, apiEditTransaksi } from "../services/api";
import ScrollReveal from "../components/common/ScrollReveal";

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeCategoryKey = (value) =>
  String(value || "lainnya")
    .trim()
    .toLowerCase();

const buildCategoryShapeProfile = (items) => {
  const categoryBuckets = {};

  items.slice(0, 12).forEach((trx) => {
    const categoryKey = normalizeCategoryKey(trx["Pos Anggaran"]);
    const catatan = String(trx.Catatan || trx["Pos Anggaran"] || "").trim();
    const nominalDigits = String(trx.Nominal || "").replace(
      /[^0-9]/g,
      "",
    ).length;
    const noteLength = catatan.length;
    const noteWidth = clamp(40 + noteLength * 1.5, 42, 74);
    const amountWidth = clamp(72 + nominalDigits * 7, 78, 132);
    const type = trx.Tipe === "pemasukan" ? "pemasukan" : "pengeluaran";

    if (!categoryBuckets[categoryKey]) {
      categoryBuckets[categoryKey] = {
        short: [],
        long: [],
        meta: [],
        amount: [],
        incomeCount: 0,
        expenseCount: 0,
      };
    }

    const bucket = categoryBuckets[categoryKey];
    if (noteLength >= 18) bucket.long.push(noteWidth);
    else bucket.short.push(noteWidth);

    bucket.meta.push(
      clamp(26 + String(trx["Pos Anggaran"] || "").trim().length * 1.2, 28, 54),
    );
    bucket.amount.push(amountWidth);
    if (type === "pemasukan") bucket.incomeCount += 1;
    else bucket.expenseCount += 1;
  });

  return Object.entries(categoryBuckets).reduce(
    (acc, [categoryKey, bucket]) => {
      const longAvg =
        bucket.long.length > 0
          ? bucket.long.reduce((sum, value) => sum + value, 0) /
            bucket.long.length
          : 66;
      const shortAvg =
        bucket.short.length > 0
          ? bucket.short.reduce((sum, value) => sum + value, 0) /
            bucket.short.length
          : 52;
      const metaAvg =
        bucket.meta.length > 0
          ? bucket.meta.reduce((sum, value) => sum + value, 0) /
            bucket.meta.length
          : 38;
      const amountAvg =
        bucket.amount.length > 0
          ? bucket.amount.reduce((sum, value) => sum + value, 0) /
            bucket.amount.length
          : 92;
      const longRatio =
        bucket.long.length + bucket.short.length > 0
          ? bucket.long.length / (bucket.long.length + bucket.short.length)
          : 0.4;

      acc[categoryKey] = {
        longWidth: clamp(longAvg, 58, 74),
        shortWidth: clamp(shortAvg, 42, 62),
        metaWidth: clamp(metaAvg, 28, 54),
        amountWidth: clamp(amountAvg, 78, 132),
        longRatio,
        dominantType:
          bucket.incomeCount >= bucket.expenseCount
            ? "pemasukan"
            : "pengeluaran",
      };
      return acc;
    },
    {},
  );
};

const buildSkeletonProfile = (items, categoryShapes = {}) => {
  return items.slice(0, 5).map((trx, index) => {
    const catatan = String(trx.Catatan || trx["Pos Anggaran"] || "").trim();
    const pos = String(trx["Pos Anggaran"] || "").trim();
    const categoryKey = normalizeCategoryKey(pos);
    const categoryShape = categoryShapes[categoryKey];
    const nominalDigits = String(trx.Nominal || "").replace(
      /[^0-9]/g,
      "",
    ).length;
    const type = trx.Tipe === "pemasukan" ? "pemasukan" : "pengeluaran";
    const noteWidth = clamp(40 + catatan.length * 1.5, 42, 74);

    return {
      id: `${type}-${index}`,
      categoryKey,
      nameWidth: categoryShape
        ? clamp(noteWidth * 0.65 + categoryShape.shortWidth * 0.35, 42, 74)
        : noteWidth,
      metaWidth: categoryShape
        ? clamp(
            clamp(26 + pos.length * 1.2, 28, 54) * 0.6 +
              categoryShape.metaWidth * 0.4,
            28,
            54,
          )
        : clamp(26 + pos.length * 1.2, 28, 54),
      amountWidth: categoryShape
        ? clamp(
            clamp(72 + nominalDigits * 7, 78, 132) * 0.65 +
              categoryShape.amountWidth * 0.35,
            78,
            132,
          )
        : clamp(72 + nominalDigits * 7, 78, 132),
      type,
    };
  });
};

const fallbackShape = (index) => ({
  id: `fallback-${index}`,
  categoryKey: "lainnya",
  nameWidth: 58 - (index % 3) * 8,
  metaWidth: 42 - (index % 2) * 8,
  amountWidth: 96 - (index % 2) * 14,
  type: index % 2 === 0 ? "pemasukan" : "pengeluaran",
});

const hasValue = (value) =>
  value !== undefined && value !== null && value !== "";

const formatDateTime = (value) => {
  const raw = typeof value === "string" ? value.trim() : "";
  const hasExplicitTime = /T\d{2}:\d{2}|\s\d{2}:\d{2}/.test(raw);
  const date = new Date(value);
  if (isNaN(date.getTime())) return String(value);

  const isMidnight = date.getHours() === 0 && date.getMinutes() === 0;
  if (!hasExplicitTime || isMidnight) {
    return date.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  }

  return date.toLocaleString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatDateInputValue = (value) => {
  if (!hasValue(value)) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) {
    const raw = String(value).trim();
    const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
    return m ? m[1] : "";
  }
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const buildTransactionDetailGroups = (trx, formatRupiah) => {
  const infoRows = [];

  const push = (group, label, value) => {
    if (!hasValue(value)) return;
    group.push({ label, value: String(value) });
  };

  const nominalRaw = String(trx.Nominal || "").replace(/[^0-9]/g, "");
  const nominal = parseInt(nominalRaw, 10) || 0;

  push(
    infoRows,
    "Tanggal",
    hasValue(trx.Tanggal) ? formatDateTime(trx.Tanggal) : "",
  );
  push(
    infoRows,
    "Ditambahkan Oleh",
    trx.addedByName ||
      trx.AddedByName ||
      trx["Added By Name"] ||
      trx.AddedBy ||
      "",
  );
  push(
    infoRows,
    "ID Pengguna",
    trx.addedById || trx.AddedById || trx["Added By ID"] || "",
  );
  push(infoRows, "Tipe", trx.Tipe);
  push(infoRows, "Pos Anggaran", trx["Pos Anggaran"]);
  push(infoRows, "Nominal", `Rp ${formatRupiah(nominal)}`);
  push(infoRows, "Catatan", trx.Catatan || "-");

  return [{ title: "Informasi Utama", rows: infoRows }].filter(
    (group) => group.rows.length > 0,
  );
};

const getDetailFieldVisual = (label) => {
  const normalized = String(label || "").toLowerCase();

  if (normalized.includes("tanggal"))
    return { icon: CalendarDays, tone: "text-sky-500" };
  if (normalized.includes("nominal"))
    return { icon: CircleDollarSign, tone: "text-emerald-500" };
  if (normalized.includes("catatan"))
    return { icon: FileText, tone: "text-amber-500" };
  if (normalized.includes("pos") || normalized.includes("anggaran")) {
    return { icon: Tags, tone: "text-violet-500" };
  }
  return { icon: FileText, tone: "text-gray-500" };
};

export default function Beranda({
  transaksi = [],
  anggaran = [],
  isLoading = false,
  onViewAll,
  onRefresh,
  onModalStateChange,
}) {
  const [isBalanceHidden, setIsBalanceHidden] = useState(true);
  const [entering, setEntering] = useState(false);
  const [lastKnownTxCount, setLastKnownTxCount] = useState(4);
  const [lastKnownCategoryShapes, setLastKnownCategoryShapes] = useState({});
  const [lastKnownSkeletonProfile, setLastKnownSkeletonProfile] = useState(() =>
    Array.from({ length: 4 }).map((_, index) => fallbackShape(index)),
  );
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [isEditingTransaction, setIsEditingTransaction] = useState(false);
  const [txActionLoading, setTxActionLoading] = useState(false);
  const [transactionForm, setTransactionForm] = useState({
    tanggal: "",
    tipe: "pengeluaran",
    posAnggaran: "",
    nominal: "",
    catatan: "",
  });
  const { isDark } = useTheme();
  const { user } = useAuth();

  useEffect(() => {
    setEntering(false);
    const frame = requestAnimationFrame(() => setEntering(true));
    return () => cancelAnimationFrame(frame);
  }, [isLoading, transaksi.length, anggaran.length]);

  useEffect(() => {
    onModalStateChange?.(!!selectedTransaction);
  }, [selectedTransaction, onModalStateChange]);

  useEffect(() => {
    if (transaksi.length > 0) {
      const categoryShapes = buildCategoryShapeProfile(transaksi);
      setLastKnownTxCount(Math.min(5, Math.max(3, transaksi.length)));
      setLastKnownCategoryShapes(categoryShapes);
      setLastKnownSkeletonProfile(
        buildSkeletonProfile(transaksi, categoryShapes),
      );
    }
  }, [transaksi]);

  let totalMasuk = 0;
  let totalKeluar = 0;

  transaksi.forEach((trx) => {
    const nominalRaw = String(trx.Nominal || "").replace(/[^0-9]/g, "");
    const nominal = parseInt(nominalRaw, 10) || 0;

    if (trx.Tipe === "pemasukan") totalMasuk += nominal;
    else if (trx.Tipe === "pengeluaran") totalKeluar += nominal;
  });

  const totalSaldo = totalMasuk - totalKeluar;
  const shellMotionClass = entering
    ? "opacity-100 translate-y-0 scale-100"
    : "opacity-0 translate-y-4 scale-[0.985]";
  const hasContent = transaksi.length > 0 || anggaran.length > 0;
  const skeletonRowCount = Math.min(
    5,
    Math.max(3, transaksi.length || lastKnownTxCount),
  );

  const formatRupiah = (angka) => new Intl.NumberFormat("id-ID").format(angka);

  const detailRows = selectedTransaction
    ? buildTransactionDetailGroups(selectedTransaction, formatRupiah)
    : [];

  const setFormFromTransaction = (trx) => {
    const nominalRaw = String(trx.Nominal || "").replace(/[^0-9]/g, "");
    const nominal = parseInt(nominalRaw, 10) || 0;
    setTransactionForm({
      tanggal: formatDateInputValue(trx.Tanggal),
      tipe: trx.Tipe === "pemasukan" ? "pemasukan" : "pengeluaran",
      posAnggaran: String(trx["Pos Anggaran"] || ""),
      nominal: nominal ? formatRupiah(nominal).replace(/,/g, ".") : "",
      catatan: String(trx.Catatan || ""),
    });
  };

  const handleOpenTransactionDetail = (trx) => {
    setSelectedTransaction(trx);
    setIsEditingTransaction(false);
    setFormFromTransaction(trx);
  };

  const handleCloseTransactionDetail = () => {
    setSelectedTransaction(null);
    setIsEditingTransaction(false);
    setTxActionLoading(false);
  };

  const handleNominalEditChange = (value) => {
    const raw = String(value || "").replace(/[^0-9]/g, "");
    const formatted = raw.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setTransactionForm((prev) => ({ ...prev, nominal: formatted }));
  };

  const handleSaveEditedTransaction = async () => {
    if (!selectedTransaction) return;
    if (
      !transactionForm.tanggal ||
      !transactionForm.posAnggaran ||
      !transactionForm.nominal
    ) {
      alert("Tanggal, kategori, dan nominal wajib diisi.");
      return;
    }

    const id = selectedTransaction.ID || selectedTransaction.id;
    if (!id) {
      alert("ID transaksi tidak ditemukan.");
      return;
    }

    setTxActionLoading(true);
    const res = await apiEditTransaksi({
      id,
      familyId: user?.familyId || selectedTransaction.FamilyId || "",
      editedById: user?.id || "",
      tanggal: transactionForm.tanggal,
      tipe: transactionForm.tipe,
      pos_anggaran: transactionForm.posAnggaran,
      nominal: String(transactionForm.nominal || "").replace(/[^0-9]/g, ""),
      catatan: transactionForm.catatan || "",
    });
    setTxActionLoading(false);

    if (!res.success) {
      alert(`Gagal menyimpan perubahan: ${res.error || "Unknown error"}`);
      return;
    }

    const merged = {
      ...selectedTransaction,
      Tanggal: transactionForm.tanggal,
      Tipe: transactionForm.tipe,
      "Pos Anggaran": transactionForm.posAnggaran,
      Nominal: String(transactionForm.nominal || "").replace(/[^0-9]/g, ""),
      Catatan: transactionForm.catatan,
      updatedAt: new Date().toISOString(),
    };

    setSelectedTransaction(merged);
    setIsEditingTransaction(false);
    await onRefresh?.();
  };

  const handleDeleteTransaction = async () => {
    if (!selectedTransaction) return;
    const id = selectedTransaction.ID || selectedTransaction.id;
    if (!id) {
      alert("ID transaksi tidak ditemukan.");
      return;
    }

    if (
      !window.confirm(
        "Hapus transaksi ini? Tindakan ini tidak dapat dibatalkan.",
      )
    )
      return;

    setTxActionLoading(true);
    const res = await apiDeleteTransaksi({
      id,
      familyId: user?.familyId || selectedTransaction.FamilyId || "",
      deletedById: user?.id || "",
    });
    setTxActionLoading(false);

    if (!res.success) {
      alert(`Gagal menghapus transaksi: ${res.error || "Unknown error"}`);
      return;
    }

    handleCloseTransactionDetail();
    await onRefresh?.();
  };

  const availablePosForEdit = anggaran.filter(
    (pos) => (pos.Tipe || "pengeluaran") === transactionForm.tipe,
  );

  return (
    <div>
      <section className="px-4 mt-4">
        <ScrollReveal delay={40} duration={620}>
          <div
            className={`relative bg-gradient-to-br from-[#216f6d] via-[#0f7f78] to-[#0b223f] rounded-2xl p-6 text-white shadow-lg shadow-slate-950/20 border border-white/8 overflow-hidden flex flex-col gap-5 transition-all duration-700 ease-out ${shellMotionClass}`}
          >
            <div className="absolute top-0 right-0 h-56 w-56 rounded-full bg-white/28 -mr-28 -mt-28 pointer-events-none beranda-orb"></div>
            <div className="absolute top-0 right-0 h-56 w-56 rounded-full border border-white/15 -mr-28 -mt-28 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 h-40 w-40 rounded-full bg-teal-300/20 -ml-20 -mb-20 pointer-events-none beranda-orb beranda-orb-delayed"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_45%_40%,rgba(255,255,255,0.12),transparent_52%)] pointer-events-none"></div>

            <div
              className={`flex justify-between items-center relative z-10 transition-all duration-700 ease-out delay-75 ${entering ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
            >
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-white/12 border border-white/10 flex items-center justify-center backdrop-blur-sm beranda-float">
                  <WalletIcon className="w-4 h-4 text-white" />
                </div>
                <p className="text-primary-on-dark text-xs font-bold uppercase tracking-wider">
                  Total Saldo
                </p>
              </div>
              <button
                onClick={() => setIsBalanceHidden(!isBalanceHidden)}
                aria-label={
                  isBalanceHidden ? "Tampilkan saldo" : "Sembunyikan saldo"
                }
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/15 bg-white/12 text-white shadow-sm shadow-black/10 backdrop-blur-sm transition hover:bg-white/18 hover:border-white/25 active:scale-95"
              >
                {isBalanceHidden ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            <div
              className={`relative z-10 transition-all duration-700 ease-out delay-100 ${entering ? "opacity-100 translate-y-0" : "opacity-0 translate-y-3"}`}
            >
              <div className="flex items-baseline gap-1">
                <span className="text-primary-on-dark text-lg font-bold">
                  Rp
                </span>
                {isBalanceHidden ? (
                  <h2 className="text-4xl font-bold tracking-tight mt-1">
                    ••••••••
                  </h2>
                ) : (
                  <h2 className="text-4xl font-bold tracking-tight">
                    {formatRupiah(totalSaldo)}
                  </h2>
                )}
              </div>
            </div>

            <div
              className={`relative z-10 flex justify-between mt-8 transition-all duration-700 ease-out delay-150 ${entering ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"}`}
            >
              <div className="flex flex-1 items-center gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-green-400/20 flex items-center justify-center text-green-400 border border-green-400/30 beranda-float">
                  <ArrowDownRight className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-primary-on-dark uppercase tracking-wider font-bold">
                    Pemasukan
                  </p>
                  <p className="text-sm font-bold text-white mt-0.5 whitespace-nowrap">
                    {isBalanceHidden
                      ? "Rp •••••••"
                      : `Rp ${formatRupiah(totalMasuk)}`}
                  </p>
                </div>
              </div>

              <div className="flex flex-1 items-center justify-end gap-3">
                <div className="w-10 h-10 shrink-0 rounded-xl bg-red-400/20 flex items-center justify-center text-red-400 border border-red-400/30 beranda-float beranda-float-delayed">
                  <ArrowUpRight className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[10px] text-primary-on-dark uppercase tracking-wider font-bold">
                    Pengeluaran
                  </p>
                  <p className="text-sm font-bold text-white mt-0.5 whitespace-nowrap">
                    {isBalanceHidden
                      ? "Rp •••••••"
                      : `Rp ${formatRupiah(totalKeluar)}`}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>
      </section>

      <section className="px-4 mt-8">
        <div
          className={`flex justify-between items-center mb-4 transition-all duration-700 ease-out delay-200 ${entering ? "opacity-100 translate-y-0" : "opacity-0 translate-y-2"}`}
        >
          <h2
            className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Transaksi Terakhir
          </h2>
          <button
            onClick={() => onViewAll?.()}
            className="text-sm font-medium text-primary-adaptive hover:text-primary-strong-adaptive transition active:scale-95"
          >
            Lihat Semua
          </button>
        </div>

        <div className="flex flex-col gap-5">
          {isLoading && !hasContent ? (
            <TransactionsSkeleton
              isDark={isDark}
              rowCount={skeletonRowCount}
              profile={lastKnownSkeletonProfile}
              categoryShapes={lastKnownCategoryShapes}
            />
          ) : transaksi.length === 0 ? (
            <p
              className={`text-sm text-center py-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Belum ada transaksi.
            </p>
          ) : (
            <ScrollReveal delay={220} duration={560} y={16}>
              <div
                className={`rounded-2xl shadow-sm border overflow-hidden ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}
              >
                {transaksi.slice(0, 5).map((trx, index) => {
                  const isMasuk = trx.Tipe === "pemasukan";
                  const nominalStr = formatRupiah(
                    String(trx.Nominal || "").replace(/[^0-9]/g, ""),
                  );
                  const dateStr = new Date(trx.Tanggal).toLocaleDateString(
                    "id-ID",
                    {
                      day: "numeric",
                      month: "short",
                    },
                  );

                  const pos = anggaran.find(
                    (a) => a.Nama === trx["Pos Anggaran"],
                  );
                  const icon = pos?.Ikon || (isMasuk ? "??" : "??");
                  const iconBg = isMasuk
                    ? isDark
                      ? "bg-green-900/40 border-green-800 text-green-400"
                      : "bg-green-50 border-green-100 text-green-600"
                    : isDark
                      ? "bg-primary-surface-strong-adaptive border-primary-soft-adaptive text-primary-strong-adaptive"
                      : "bg-primary-surface-adaptive border-primary-soft-theme text-primary-adaptive";

                  return (
                    <button
                      key={trx.ID || index}
                      type="button"
                      onClick={() => handleOpenTransactionDetail(trx)}
                      className={`w-full flex justify-between items-center p-4 text-left transition-colors duration-200 ${isDark ? "hover:bg-white/5" : "hover:bg-gray-50"} ${index < transaksi.slice(0, 5).length - 1 ? `border-b ${isDark ? "border-gray-700" : "border-gray-50"}` : ""}`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm border ${iconBg}`}
                        >
                          {icon}
                        </div>
                        <div className="min-w-0">
                          <p
                            className={`font-bold text-sm truncate ${isDark ? "text-white" : "text-gray-900"}`}
                          >
                            {trx.Catatan || trx["Pos Anggaran"]}
                          </p>
                          <p
                            className={`text-xs font-medium mt-0.5 truncate ${isDark ? "text-gray-400" : "text-gray-500"}`}
                          >
                            {trx["Pos Anggaran"]} • {dateStr}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <p
                          className={`font-bold text-sm ${isMasuk ? "semantic-success-text" : isDark ? "text-gray-200" : "text-gray-900"}`}
                        >
                          {isMasuk ? "+" : "-"} Rp {nominalStr}
                        </p>
                        <ChevronRight
                          className={`w-4 h-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                        />
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollReveal>
          )}
          {isLoading && hasContent && (
            <div className="-mt-1 rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-3 text-xs font-medium text-primary-on-dark/80 backdrop-blur-sm">
              Menyinkronkan data terbaru...
            </div>
          )}
        </div>
      </section>

      {selectedTransaction && (
        <div
          className={`fixed inset-0 z-[9999] flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl ${isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
        >
          <header
            className={`flex justify-between items-center px-4 pt-8 pb-4 border-b ${isDark ? "border-gray-800 bg-gray-900" : "border-gray-100 bg-white"}`}
          >
            <div>
              <p
                className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                Detail Transaksi
              </p>
              <h2 className="text-lg font-bold mt-0.5">
                {selectedTransaction.Catatan ||
                  selectedTransaction["Pos Anggaran"] ||
                  "Transaksi"}
              </h2>
            </div>
            <button
              type="button"
              onClick={handleCloseTransactionDetail}
              className="overlay-muted-button w-8 h-8 rounded-full flex items-center justify-center"
              aria-label="Tutup detail transaksi"
            >
              <X className="w-4 h-4" />
            </button>
          </header>

          <div className="flex-1 overflow-y-auto no-scrollbar">
            {isEditingTransaction ? (
              <div className="px-4 mt-4 flex flex-col gap-5">
                <div
                  className={`p-1 rounded-xl flex gap-1 relative ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
                >
                  <div
                    className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-transform duration-300 ease-in-out ${isDark ? "bg-gray-700" : "bg-white"} ${transactionForm.tipe === "pemasukan" ? "translate-x-full" : "translate-x-0"}`}
                  ></div>
                  <button
                    type="button"
                    onClick={() =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        tipe: "pengeluaran",
                        posAnggaran: "",
                      }))
                    }
                    className={`relative z-10 flex-1 text-sm py-2 transition-colors ${transactionForm.tipe === "pengeluaran" ? "font-bold text-red-500" : `font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}`}
                  >
                    Pengeluaran
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        tipe: "pemasukan",
                        posAnggaran: "",
                      }))
                    }
                    className={`relative z-10 flex-1 text-sm py-2 transition-colors ${transactionForm.tipe === "pemasukan" ? "font-bold text-green-500" : `font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}`}
                  >
                    Pemasukan
                  </button>
                </div>

                <div className="mt-2 flex flex-col items-center">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Nominal (Rp)
                  </p>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={transactionForm.nominal}
                    onChange={(e) => handleNominalEditChange(e.target.value)}
                    className={`w-full text-center text-5xl font-bold bg-transparent outline-none ${isDark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-300"}`}
                    placeholder="0"
                  />
                </div>

                <hr
                  className={`${isDark ? "border-gray-800" : "border-gray-100"}`}
                />

                <div>
                  <label
                    className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    {transactionForm.tipe === "pengeluaran"
                      ? "Pos Anggaran"
                      : "Kategori Pemasukan"}
                  </label>
                  <div className="relative">
                    <select
                      value={transactionForm.posAnggaran}
                      onChange={(e) =>
                        setTransactionForm((prev) => ({
                          ...prev,
                          posAnggaran: e.target.value,
                        }))
                      }
                      className="overlay-control w-full appearance-none font-medium rounded-xl p-4 pr-10 focus:ring-2"
                    >
                      <option value="" disabled>
                        Pilih kategori
                      </option>
                      {availablePosForEdit.map((pos) => (
                        <option key={pos.ID} value={pos.Nama}>
                          {pos.Ikon} {pos.Nama}
                        </option>
                      ))}
                    </select>
                    <div
                      className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </div>
                  </div>
                </div>

                <div>
                  <label
                    className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Tanggal
                  </label>
                  <input
                    type="date"
                    value={transactionForm.tanggal}
                    onChange={(e) =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        tanggal: e.target.value,
                      }))
                    }
                    className="overlay-control w-full font-medium rounded-xl p-4 focus:ring-2"
                  />
                </div>

                <div>
                  <label
                    className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                  >
                    Catatan (Opsional)
                  </label>
                  <input
                    type="text"
                    value={transactionForm.catatan}
                    onChange={(e) =>
                      setTransactionForm((prev) => ({
                        ...prev,
                        catatan: e.target.value,
                      }))
                    }
                    className="overlay-control w-full font-medium rounded-xl p-4 focus:ring-2"
                    placeholder="Tambahkan catatan transaksi"
                  />
                </div>
              </div>
            ) : (
              <>
                <div className="px-4 mt-8 flex flex-col items-center">
                  <p
                    className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    Nominal (Rp)
                  </p>
                  <p
                    className={`text-center text-5xl font-bold tracking-tight ${selectedTransaction.Tipe === "pemasukan" ? "semantic-success-text" : isDark ? "text-white" : "text-gray-900"}`}
                  >
                    {selectedTransaction.Tipe === "pemasukan" ? "+" : "-"}
                    {formatRupiah(
                      parseInt(
                        String(selectedTransaction.Nominal || "").replace(
                          /[^0-9]/g,
                          "",
                        ),
                        10,
                      ) || 0,
                    )}
                  </p>
                </div>

                <hr
                  className={`mx-4 mt-8 mb-6 ${isDark ? "border-gray-800" : "border-gray-100"}`}
                />

                <div className="px-4 flex flex-col gap-3">
                  <div
                    className={`rounded-xl border px-4 py-3 ${isDark ? "border-gray-800 bg-gray-800/60" : "border-gray-100 bg-gray-50"}`}
                  >
                    <p
                      className={`text-xs font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      Jenis Transaksi
                    </p>
                    <p
                      className={`mt-1 text-sm font-semibold ${selectedTransaction.Tipe === "pemasukan" ? "text-green-500" : "text-red-500"}`}
                    >
                      {selectedTransaction.Tipe === "pemasukan"
                        ? "Pemasukan"
                        : "Pengeluaran"}
                    </p>
                  </div>

                  {detailRows.map((group) => (
                    <div key={group.title} className="flex flex-col gap-3">
                      {group.rows
                        .filter(
                          (row) =>
                            row.label !== "Nominal" && row.label !== "Tipe",
                        )
                        .map((row, index) => {
                          const fieldVisual = getDetailFieldVisual(row.label);
                          const FieldIcon = fieldVisual.icon;

                          return (
                            <div
                              key={`${group.title}-${row.label}-${index}`}
                              className={`rounded-xl border px-4 py-3 ${isDark ? "border-gray-800 bg-gray-800/60" : "border-gray-100 bg-white"}`}
                            >
                              <div className="flex items-start gap-3">
                                <div
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center ${isDark ? "bg-gray-700/80" : "bg-gray-100"}`}
                                >
                                  <FieldIcon
                                    className={`w-4 h-4 ${fieldVisual.tone}`}
                                  />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p
                                    className={`text-[11px] font-bold uppercase tracking-wider ${isDark ? "text-gray-400" : "text-gray-500"}`}
                                  >
                                    {row.label}
                                  </p>
                                  <p
                                    className={`text-sm font-semibold mt-1 break-words ${isDark ? "text-gray-100" : "text-gray-900"}`}
                                  >
                                    {row.value}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>

          <div
            className={`px-4 py-4 border-t ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}
          >
            {isEditingTransaction ? (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSaveEditedTransaction}
                  disabled={txActionLoading}
                  className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${txActionLoading ? "bg-gray-400 text-gray-100 cursor-not-allowed shadow-none" : "btn-primary-theme shadow-primary-theme active:scale-[0.98]"}`}
                >
                  {txActionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4" />
                  )}
                  Simpan Perubahan
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditingTransaction(false);
                    setFormFromTransaction(selectedTransaction);
                  }}
                  disabled={txActionLoading}
                  className="overlay-muted-button px-4 py-4 rounded-xl text-sm font-bold"
                >
                  Batal
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditingTransaction(true)}
                  disabled={txActionLoading}
                  className="overlay-muted-button flex-1 rounded-xl py-4 text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Edit Transaksi
                </button>
                <button
                  type="button"
                  onClick={handleDeleteTransaction}
                  disabled={txActionLoading}
                  className="overlay-danger-soft flex-1 rounded-xl py-4 text-sm font-bold border flex items-center justify-center gap-2"
                >
                  {txActionLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4" />
                  )}
                  Hapus
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function WalletIcon(props) {
  return (
    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" {...props}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
        d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
      ></path>
    </svg>
  );
}

function TransactionsSkeleton({
  isDark,
  rowCount = 4,
  profile = [],
  categoryShapes = {},
}) {
  const line = isDark ? "bg-white/10" : "bg-gray-200";
  const lineSoft = isDark ? "bg-white/8" : "bg-gray-100";
  const categoryKeys = Object.keys(categoryShapes);

  return (
    <div className="space-y-4" aria-hidden="true">
      <div className="space-y-4">
        {Array.from({ length: rowCount }).map((_, index) =>
          (() => {
            const baseShape =
              profile[index % profile.length] || fallbackShape(index);
            const categoryKey =
              baseShape.categoryKey ||
              categoryKeys[index % categoryKeys.length] ||
              "lainnya";
            const categoryShape = categoryShapes[categoryKey];
            const shouldUseLong = categoryShape
              ? ((index * 37) % 100) / 100 < categoryShape.longRatio
              : false;
            const shape = categoryShape
              ? {
                  ...baseShape,
                  nameWidth: shouldUseLong
                    ? clamp(
                        categoryShape.longWidth + (index % 2 ? -2 : 2),
                        42,
                        74,
                      )
                    : clamp(
                        categoryShape.shortWidth + (index % 2 ? 2 : -2),
                        42,
                        74,
                      ),
                  metaWidth: clamp(
                    categoryShape.metaWidth + ((index % 3) - 1) * 2,
                    28,
                    54,
                  ),
                  amountWidth: clamp(
                    categoryShape.amountWidth + (index % 2 ? -6 : 4),
                    78,
                    132,
                  ),
                  type: categoryShape.dominantType,
                }
              : baseShape;

            const iconTone =
              shape.type === "pemasukan"
                ? isDark
                  ? "bg-emerald-400/12 border border-emerald-400/20"
                  : "bg-emerald-100 border border-emerald-200"
                : isDark
                  ? "bg-rose-400/12 border border-rose-400/20"
                  : "bg-rose-100 border border-rose-200";

            return (
              <div
                key={`${shape.id}-${index}`}
                className="flex items-center justify-between gap-4 rounded-2xl px-1 py-1 skeleton-shimmer"
                style={{ "--skeleton-delay": `${index * 140}ms` }}
              >
                <div className="flex items-center gap-4 flex-1 min-w-0">
                  <div className={`h-12 w-12 rounded-2xl ${iconTone}`} />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div
                      className={`h-4 rounded-full ${line}`}
                      style={{ width: `${shape.nameWidth}%` }}
                    />
                    <div
                      className={`h-3 rounded-full ${lineSoft}`}
                      style={{ width: `${shape.metaWidth}%` }}
                    />
                  </div>
                </div>
                <div
                  className={`h-4 rounded-full ${line}`}
                  style={{ width: `${shape.amountWidth}px` }}
                />
              </div>
            );
          })(),
        )}
      </div>
    </div>
  );
}
