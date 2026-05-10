import { useState, useMemo, useEffect } from "react";
import {
  ChevronLeft,
  Filter,
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
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { apiDeleteTransaksi, apiEditTransaksi } from "../../services/api";

const hasValue = (value) =>
  value !== null && value !== undefined && String(value).trim() !== "";

const hasTimePortion = (value) => {
  if (!hasValue(value)) return false;
  const raw = String(value);
  const timePart = raw.match(/(\d{2}):(\d{2})(?::(\d{2}))?/);
  if (timePart) {
    const hh = Number.parseInt(timePart[1], 10) || 0;
    const mm = Number.parseInt(timePart[2], 10) || 0;
    const ss = Number.parseInt(timePart[3] || "0", 10) || 0;
    return hh !== 0 || mm !== 0 || ss !== 0;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return (
    date.getHours() !== 0 ||
    date.getMinutes() !== 0 ||
    date.getSeconds() !== 0 ||
    date.getMilliseconds() !== 0
  );
};

const formatDateTime = (value) => {
  if (!hasValue(value)) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  if (!hasTimePortion(value)) {
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

const getDetailFieldVisual = (label) => {
  if (label === "Tanggal") {
    return { icon: CalendarDays, tone: "text-sky-500" };
  }
  if (label === "Ditambahkan Oleh") {
    return { icon: FileText, tone: "text-amber-500" };
  }
  if (label === "Tipe") {
    return { icon: CircleDollarSign, tone: "text-emerald-500" };
  }
  if (label === "Pos Anggaran") {
    return { icon: Tags, tone: "text-violet-500" };
  }
  if (label === "Nominal") {
    return { icon: CircleDollarSign, tone: "text-emerald-500" };
  }
  return { icon: FileText, tone: "text-slate-500" };
};

export default function SemuaTransaksi({
  isOpen,
  onClose,
  transaksi = [],
  anggaran = [],
  onRefresh,
}) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [currentPage, setCurrentPage] = useState(1);
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
  const ITEMS_PER_PAGE = 10;

  // Reset page when month changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth]);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat("id-ID").format(angka);
  };

  const formatDateInputValue = (value) => {
    if (!hasValue(value)) return "";
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) {
      const raw = String(value).trim();
      const m = raw.match(/^(\d{4}-\d{2}-\d{2})/);
      return m ? m[1] : "";
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

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

  // 1. Extract unique months for dropdown
  const monthsForDropdown = useMemo(() => {
    const monthSet = new Set();
    transaksi.forEach((trx) => {
      const d = new Date(trx.Tanggal);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const n = d.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
      monthSet.add(JSON.stringify({ key: k, name: n }));
    });

    // Add current month if not in data yet
    const d = new Date();
    const currentName = d.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
    monthSet.add(JSON.stringify({ key: currentMonthKey, name: currentName }));

    return Array.from(monthSet)
      .map((s) => JSON.parse(s))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [transaksi, currentMonthKey]);

  // 2. Month navigation helpers
  const allMonthKeys = useMemo(() => {
    const sorted = monthsForDropdown
      .map((m) => m.key)
      .sort((a, b) => b.localeCompare(a));
    return ["Semua", ...sorted];
  }, [monthsForDropdown]);

  const currentMonthIdx = allMonthKeys.indexOf(selectedMonth);
  const canGoPrev = currentMonthIdx < allMonthKeys.length - 1;
  const canGoNext = currentMonthIdx > 0;

  const goPrevMonth = () => {
    if (canGoPrev) setSelectedMonth(allMonthKeys[currentMonthIdx + 1]);
  };
  const goNextMonth = () => {
    if (canGoNext) setSelectedMonth(allMonthKeys[currentMonthIdx - 1]);
  };

  const selectedMonthLabel =
    selectedMonth === "Semua"
      ? "Semua Bulan"
      : (monthsForDropdown.find((m) => m.key === selectedMonth)?.name ??
        selectedMonth);

  // 3. Filter & Sort Transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transaksi;
    if (selectedMonth !== "Semua") {
      filtered = transaksi.filter((trx) => {
        const d = new Date(trx.Tanggal);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        return k === selectedMonth;
      });
    }
    // Sort descending by date
    return [...filtered].sort(
      (a, b) => new Date(b.Tanggal) - new Date(a.Tanggal),
    );
  }, [transaksi, selectedMonth]);

  // 4. Pagination
  const totalPages = Math.max(
    1,
    Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE),
  );
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // 5. Group current page data
  const groupedPageData = useMemo(() => {
    const groups = {};
    pageData.forEach((trx) => {
      const d = new Date(trx.Tanggal);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
      const n = d.toLocaleDateString("id-ID", {
        month: "long",
        year: "numeric",
      });
      if (!groups[k]) groups[k] = { key: k, name: n, items: [] };
      groups[k].items.push(trx);
    });
    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [pageData]);

  const detailRows = useMemo(() => {
    if (!selectedTransaction) return [];

    const rows = [];
    const push = (label, value) => {
      if (!hasValue(value)) return;
      rows.push({ label, value: String(value) });
    };

    push(
      "Tanggal",
      hasValue(selectedTransaction.Timestamp || selectedTransaction.Tanggal)
        ? formatDateTime(
            selectedTransaction.Timestamp || selectedTransaction.Tanggal,
          )
        : "",
    );
    push(
      "Ditambahkan Oleh",
      selectedTransaction.AddedByName || selectedTransaction.AddedBy,
    );
    push(
      "Tipe",
      selectedTransaction.Tipe === "pemasukan" ? "Pemasukan" : "Pengeluaran",
    );
    push("Pos Anggaran", selectedTransaction["Pos Anggaran"]);
    push(
      "Nominal",
      `Rp ${formatRupiah(parseInt(String(selectedTransaction.Nominal || "").replace(/[^0-9]/g, ""), 10) || 0)}`,
    );
    push("Catatan", selectedTransaction.Catatan);

    return rows;
  }, [selectedTransaction]);

  if (!isOpen) return null;

  const bg = isDark ? "bg-gray-900" : "bg-gray-50";
  const headerBg = isDark
    ? "bg-gray-900 border-gray-800"
    : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const subtleButtonClass = "overlay-subtle-button";

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col ${bg} transition-colors duration-300`}
    >
      {/* Header with month navigator */}
      <header
        className={`flex items-center justify-between px-4 pt-8 pb-4 border-b ${headerBg} shadow-sm z-10`}
      >
        <button
          onClick={onClose}
          className={`w-8 h-8 -ml-2 rounded-full flex items-center justify-center transition ${subtleButtonClass}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Month navigator */}
        <div className="flex items-center gap-0.5">
          <button
            onClick={goPrevMonth}
            disabled={!canGoPrev}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90 ${
              canGoPrev ? subtleButtonClass : "opacity-25 cursor-not-allowed"
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={() => setSelectedMonth("Semua")}
            title="Tap untuk lihat semua bulan"
            className={`flex items-center gap-1.5 px-2 py-1.5 rounded-xl transition active:scale-95 ${
              isDark ? "hover:bg-gray-800" : "hover:bg-gray-50"
            }`}
          >
            <CalendarDays className={`w-3.5 h-3.5 ${textSecondary}`} />
            <span className={`text-sm font-bold ${textPrimary}`}>
              {selectedMonthLabel}
            </span>
          </button>
          <button
            onClick={goNextMonth}
            disabled={!canGoNext}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition active:scale-90 ${
              canGoNext ? subtleButtonClass : "opacity-25 cursor-not-allowed"
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Spacer for symmetry */}
        <div className="w-6" />
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6 relative">
        {groupedPageData.length === 0 ? (
          <div className="px-4 pt-6">
            <div className="overlay-panel flex flex-col items-center justify-center gap-3 px-6 py-12 text-center opacity-80">
              <Filter className={`w-10 h-10 ${textSecondary}`} />
              <p className={`text-sm font-medium ${textSecondary}`}>
                Tidak ada transaksi
                {selectedMonth !== "Semua" ? ` di ${selectedMonthLabel}` : ""}.
              </p>
            </div>
          </div>
        ) : (
          groupedPageData.map((group) => (
            <div key={group.key} className="mb-6 mt-4">
              <h3
                className={`px-4 text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? "text-gray-500" : "text-gray-400"}`}
              >
                {group.name}
              </h3>
              <div className="overlay-panel mx-4 overflow-hidden">
                {group.items.map((trx, index) => {
                  const isMasuk = trx.Tipe === "pemasukan";
                  const nominalStr = formatRupiah(
                    String(trx.Nominal || "").replace(/[^0-9]/g, ""),
                  );
                  const dateSource = trx.Timestamp || trx.Tanggal;
                  const dateTimeStr = new Date(dateSource).toLocaleString(
                    "id-ID",
                    {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    },
                  );

                  const pos = anggaran.find(
                    (a) => a.Nama === trx["Pos Anggaran"],
                  );
                  const icon = pos?.Ikon || (isMasuk ? "💼" : "🛒");
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
                      className={`w-full flex justify-between items-start gap-3 p-4 text-left transition-colors duration-200 ${
                        isDark ? "hover:bg-white/5" : "hover:bg-gray-50"
                      } ${index < group.items.length - 1 ? `border-b ${isDark ? "border-gray-700" : "border-gray-50"}` : ""}`}
                    >
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div
                          className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm border shrink-0 ${iconBg}`}
                        >
                          {icon}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className={`font-bold text-sm ${textPrimary}`}>
                            {trx["Pos Anggaran"]}
                          </p>
                          <p
                            className={`text-xs font-medium mt-0.5 truncate ${textSecondary}`}
                          >
                            {dateTimeStr} • {trx.AddedByName || "Unknown"}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
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
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div
          className={`px-4 py-4 border-t ${headerBg} flex items-center justify-between`}
        >
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              currentPage === 1
                ? isDark
                  ? "bg-gray-800 text-gray-600"
                  : "bg-gray-100 text-gray-300"
                : isDark
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "overlay-panel text-gray-900 hover:bg-gray-50"
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>

          <span className={`text-sm font-bold ${textSecondary}`}>
            Hal {currentPage}{" "}
            <span className="font-medium opacity-60">dari</span> {totalPages}
          </span>

          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              currentPage === totalPages
                ? isDark
                  ? "bg-gray-800 text-gray-600"
                  : "bg-gray-100 text-gray-300"
                : isDark
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "overlay-panel text-gray-900 hover:bg-gray-50"
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}

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
                {selectedTransaction["Pos Anggaran"] || "Transaksi"}
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
                    className={`text-center text-5xl font-bold tracking-tight ${selectedTransaction.Tipe === "pemasukan" ? "text-green-500" : isDark ? "text-white" : "text-gray-900"}`}
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
                  {detailRows
                    .filter(
                      (row) => row.label !== "Nominal" && row.label !== "Tipe",
                    )
                    .map((row, index) => {
                      const fieldVisual = getDetailFieldVisual(row.label);
                      const FieldIcon = fieldVisual.icon;

                      return (
                        <div
                          key={`${row.label}-${index}`}
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
                                className={`text-sm font-semibold mt-1 break-words whitespace-pre-wrap ${isDark ? "text-gray-100" : "text-gray-900"}`}
                              >
                                {row.value}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
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
