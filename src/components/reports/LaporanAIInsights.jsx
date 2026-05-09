import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { fetchAIInsights } from "../../services/api";

export default function LaporanAIInsights({
  isDark,
  isActive,
  aiEnabled,
  familyId,
  filter,
  periodTitle,
  filteredTransaksi,
  totalMasuk,
  totalKeluar,
  pengeluaranPerPos,
}) {
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [aiCache, setAiCache] = useState({});
  const [requestedMap, setRequestedMap] = useState({});

  const dataSignature = useMemo(() => {
    return filteredTransaksi
      .map(
        (trx) =>
          `${trx.ID || ""}-${trx.Tanggal || ""}-${trx.Tipe || ""}-${trx.Nominal || ""}-${trx["Pos Anggaran"] || ""}`,
      )
      .join("|");
  }, [filteredTransaksi]);

  const insightCacheKey = `${filter}::${dataSignature}`;
  const isRequested = !!requestedMap[insightCacheKey];

  const netCashflow = totalMasuk - totalKeluar;
  const savingRate = totalMasuk > 0 ? (netCashflow / totalMasuk) * 100 : 0;
  const topCategories = (pengeluaranPerPos || []).slice(0, 3);

  const formatRupiah = (value) =>
    `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;

  const requestInsights = async (force = false) => {
    setRequestedMap((prev) => ({ ...prev, [insightCacheKey]: true }));

    if (!force && aiCache[insightCacheKey]) {
      const cached = aiCache[insightCacheKey];
      setAiData(cached.data || null);
      setAiError(cached.error || null);
      return;
    }

    setAiLoading(true);
    setAiError(null);
    const res = await fetchAIInsights(familyId || null, {
      period: filter,
      detailLevel: "deep",
      focusAreas: ["pemasukan", "pengeluaran", "budgeting"],
      summaryData: {
        periodTitle,
        totalMasuk,
        totalKeluar,
        netCashflow,
        transactionCount: filteredTransaksi.length,
        topSpendingCategories: topCategories.map(([name, amount]) => ({
          name,
          amount,
        })),
      },
    });
    setAiLoading(false);

    if (res.success) {
      setAiData(res.data);
      setAiCache((prev) => ({
        ...prev,
        [insightCacheKey]: { data: res.data, error: null },
      }));
    } else {
      const msg =
        res.error === "API_KEY_MISSING"
          ? "Gemini API Key belum dikonfigurasi di Google Apps Script (Backend)."
          : `Gagal memuat insight: ${res.error}`;
      setAiError(msg);
      setAiCache((prev) => ({
        ...prev,
        [insightCacheKey]: { data: null, error: msg },
      }));
    }
  };

  useEffect(() => {
    if (!isActive || !aiEnabled) return;
    const cached = aiCache[insightCacheKey];
    if (cached) {
      setAiData(cached.data || null);
      setAiError(cached.error || null);
    } else {
      setAiData(null);
      setAiError(null);
    }
    setAiLoading(false);
  }, [isActive, aiEnabled, insightCacheKey, aiCache]);

  if (!aiEnabled) return null;

  return (
    <section className="px-4 mt-8 pb-6">
      <div
        className={`rounded-2xl p-5 border shadow-sm relative overflow-hidden ${
          isDark
            ? "bg-gradient-to-r from-teal-900/40 to-emerald-900/30 border-teal-800"
            : "bg-gradient-to-r from-teal-50 to-emerald-50 border-teal-100"
        }`}
      >
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none bg-primary-surface-strong-adaptive"></div>

        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full flex items-center justify-center text-primary-adaptive bg-primary-surface-strong-adaptive">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-sm text-primary-strong-adaptive">
              Insight AI Mendalam • {periodTitle}
            </h3>
          </div>
          {!aiLoading && (aiData || aiError || isRequested) && (
            <button
              onClick={() => requestInsights(true)}
              className={`text-xs font-bold transition px-3 py-1.5 rounded-lg active:scale-95 bg-primary-soft-adaptive text-primary-adaptive ${
                isDark
                  ? "hover:bg-primary-surface-strong-adaptive"
                  : "hover:text-primary-strong-adaptive"
              }`}
            >
              Perbarui
            </button>
          )}
        </div>

        <div className="relative z-10">
          <div
            className={`rounded-xl p-3 mb-3 ${isDark ? "bg-gray-900/45 border border-gray-700" : "bg-white/70 border border-teal-100"}`}
          >
            <p
              className={`text-[11px] font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Overview Cepat (Tanpa Kuota AI)
            </p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div
                className={`rounded-lg p-2 ${isDark ? "bg-gray-800/70" : "bg-white"}`}
              >
                <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Pemasukan
                </p>
                <p className="semantic-success-text font-bold mt-0.5">
                  {formatRupiah(totalMasuk)}
                </p>
              </div>
              <div
                className={`rounded-lg p-2 ${isDark ? "bg-gray-800/70" : "bg-white"}`}
              >
                <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Pengeluaran
                </p>
                <p className="semantic-danger-text font-bold mt-0.5">
                  {formatRupiah(totalKeluar)}
                </p>
              </div>
              <div
                className={`rounded-lg p-2 ${isDark ? "bg-gray-800/70" : "bg-white"}`}
              >
                <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Selisih
                </p>
                <p
                  className={`font-bold mt-0.5 ${netCashflow >= 0 ? "semantic-success-text" : "semantic-danger-text"}`}
                >
                  {formatRupiah(netCashflow)}
                </p>
              </div>
              <div
                className={`rounded-lg p-2 ${isDark ? "bg-gray-800/70" : "bg-white"}`}
              >
                <p className={`${isDark ? "text-gray-400" : "text-gray-500"}`}>
                  Rasio Menabung
                </p>
                <p
                  className={`font-bold mt-0.5 ${savingRate >= 20 ? "semantic-success-text" : savingRate >= 0 ? "semantic-warning-text" : "semantic-danger-text"}`}
                >
                  {Number.isFinite(savingRate)
                    ? `${savingRate.toFixed(1)}%`
                    : "-"}
                </p>
              </div>
            </div>
            <div className="mt-2">
              <p
                className={`text-[11px] font-semibold ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                Pos pengeluaran terbesar:
              </p>
              {topCategories.length > 0 ? (
                <ul
                  className={`text-xs mt-1 space-y-1 ${isDark ? "text-gray-300" : "text-gray-700"}`}
                >
                  {topCategories.map(([name, amount]) => (
                    <li
                      key={name}
                      className="flex items-center justify-between gap-2"
                    >
                      <span className="truncate">{name}</span>
                      <span className="font-semibold">
                        {formatRupiah(amount)}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p
                  className={`text-xs mt-1 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                >
                  Belum ada data pengeluaran pada periode ini.
                </p>
              )}
            </div>
          </div>

          {!isRequested && !aiData && !aiError && !aiLoading ? (
            <div
              className={`rounded-xl p-3 border ${isDark ? "bg-gray-900/45 border-gray-700" : "bg-white/70 border-teal-100"}`}
            >
              <p
                className={`text-sm ${isDark ? "text-gray-300" : "text-gray-700"}`}
              >
                Insight AI tidak dimuat otomatis untuk menghemat kuota. Klik
                tombol di bawah untuk membuat analisis mendalam pemasukan,
                pengeluaran, dan budgeting.
              </p>
              <button
                onClick={() => requestInsights(false)}
                className="mt-3 w-full py-2.5 rounded-xl btn-primary-theme text-sm font-bold shadow-primary-theme active:scale-[0.98] transition"
              >
                Buat Insight AI Sekarang
              </button>
            </div>
          ) : aiLoading ? (
            <div className="flex flex-col gap-2 animate-pulse mt-2">
              <div className="h-3 bg-primary-surface-muted-adaptive rounded-full w-full"></div>
              <div className="h-3 bg-primary-surface-muted-adaptive rounded-full w-5/6"></div>
              <div className="h-3 bg-primary-surface-muted-adaptive rounded-full w-4/6"></div>
            </div>
          ) : aiError ? (
            <p className="overlay-danger-soft text-sm font-medium rounded-xl border px-3 py-2">
              {aiError}
            </p>
          ) : aiData ? (
            <p className="text-sm leading-relaxed whitespace-pre-line text-primary-strong-adaptive">
              {aiData}
            </p>
          ) : (
            <p className="text-sm text-primary-soft-adaptive">
              Klik "Buat Insight AI Sekarang" untuk menghasilkan analisis.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
