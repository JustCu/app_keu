import { useEffect, useMemo, useState } from "react";
import { X, Sparkles, Loader2, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import {
  fetchAICategoryInsight,
  fetchAICategoryWeeklyHistory,
} from "../../services/api";

const PERIOD_OPTIONS = [
  { key: "hariini", label: "Hari Ini" },
  { key: "mingguan", label: "Mingguan" },
  { key: "bulanan", label: "Bulanan" },
  { key: "semua", label: "Semua" },
];

const getScoreStyle = (score) => {
  if (score >= 80)
    return {
      ring: "ring-emerald-100",
      text: "text-emerald-600",
      bg: "bg-emerald-50",
    };
  if (score >= 60)
    return {
      ring: "ring-amber-100",
      text: "text-amber-600",
      bg: "bg-amber-50",
    };
  return { ring: "ring-red-100", text: "text-red-600", bg: "bg-red-50" };
};

export default function AnalisisKategori({
  isOpen,
  onClose,
  category,
  aiEnabled = true,
  onInsightSaved,
}) {
  const { user } = useAuth();
  const [period, setPeriod] = useState("bulanan");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [insight, setInsight] = useState(null);
  const [cache, setCache] = useState({});
  const [historyItems, setHistoryItems] = useState([]);

  const cacheKey = useMemo(() => {
    if (!category?.nama) return "";
    return `${category.nama}::${category.tipe || "pengeluaran"}::${period}`;
  }, [category?.nama, category?.tipe, period]);

  useEffect(() => {
    if (!isOpen || !category?.nama) return;
    if (!aiEnabled) {
      setError("");
      setInsight(null);
      return;
    }

    if (cacheKey && cache[cacheKey]) {
      const c = cache[cacheKey];
      setInsight(c.data || null);
      setError(c.error || "");
      return;
    }

    let canceled = false;
    const load = async () => {
      setLoading(true);
      setError("");
      const res = await fetchAICategoryInsight(
        user?.familyId || "",
        category.nama,
        category.tipe || "pengeluaran",
        period,
      );
      if (canceled) return;

      setLoading(false);
      if (res.success) {
        setInsight(res.data);
        if (onInsightSaved) onInsightSaved(res.data);
        setCache((prev) => ({
          ...prev,
          [cacheKey]: { data: res.data, error: "" },
        }));
      } else {
        const errMsg =
          res.error === "API_KEY_MISSING"
            ? "Gemini API Key belum dikonfigurasi di backend Google Apps Script."
            : `Gagal memuat analisa: ${res.error || "Unknown error"}`;
        setInsight(null);
        setError(errMsg);
        setCache((prev) => ({
          ...prev,
          [cacheKey]: { data: null, error: errMsg },
        }));
      }
    };

    load();
    return () => {
      canceled = true;
    };
  }, [
    isOpen,
    category?.nama,
    category?.tipe,
    period,
    user?.familyId,
    aiEnabled,
    cacheKey,
    cache,
    onInsightSaved,
  ]);

  useEffect(() => {
    if (!isOpen || !category?.nama || !user?.familyId) return;
    let canceled = false;

    const loadHistory = async () => {
      const res = await fetchAICategoryWeeklyHistory(user.familyId, {
        categoryName: category.nama,
        weeks: 8,
      });
      if (canceled || !res.success) return;
      setHistoryItems(res.data?.items?.slice(0, 6) || []);
    };
    loadHistory();

    return () => {
      canceled = true;
    };
  }, [isOpen, category?.nama, user?.familyId, insight?.score]);

  if (!isOpen) return null;

  const score = Number(insight?.score || 0);
  const scoreStyle = getScoreStyle(score);

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col shadow-2xl">
      <header className="flex items-center justify-between px-4 pt-8 pb-4 border-b border-gray-100 bg-white">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
            Analisa AI Kategori
          </p>
          <h2 className="text-lg font-bold text-gray-900 mt-0.5">
            {category?.nama || "Kategori"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="px-4 pt-4">
        <div className="bg-gray-100 p-1 rounded-xl flex gap-1 overflow-x-auto no-scrollbar">
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`min-w-[78px] px-3 py-2 rounded-lg text-xs font-semibold transition ${
                period === p.key
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar p-4 pb-8">
        {!aiEnabled && (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-sm font-bold text-amber-700">
              Integrasi AI belum aktif
            </p>
            <p className="text-xs text-amber-700 mt-1">
              Aktifkan fitur Integrasi Gemini AI di menu Pengaturan untuk
              menggunakan analisa kategori.
            </p>
          </div>
        )}

        {aiEnabled && loading && (
          <div className="rounded-2xl border border-gray-100 bg-white p-8 flex flex-col items-center gap-2">
            <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            <p className="text-sm text-gray-500">
              Menganalisa kategori dengan AI...
            </p>
          </div>
        )}

        {aiEnabled && !loading && error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
            <p className="text-sm font-semibold text-red-600 flex items-center gap-2">
              <AlertCircle className="w-4 h-4" /> Terjadi masalah
            </p>
            <p className="text-xs text-red-600 mt-1">{error}</p>
          </div>
        )}

        {aiEnabled && !loading && !error && insight && (
          <div className="space-y-4">
            <div
              className={`rounded-2xl p-4 border border-gray-100 ${scoreStyle.bg}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                    Skor Kesehatan
                  </p>
                  <p className={`text-3xl font-black mt-1 ${scoreStyle.text}`}>
                    {score}/100
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-full bg-white ring-8 ${scoreStyle.ring} flex items-center justify-center`}
                >
                  <ShieldCheck className={`w-6 h-6 ${scoreStyle.text}`} />
                </div>
              </div>
              <p className="text-xs text-gray-600 mt-3">
                Total{" "}
                {insight?.categoryType === "pemasukan"
                  ? "pemasukan"
                  : "pengeluaran"}
                : Rp{" "}
                {new Intl.NumberFormat("id-ID").format(
                  Number(insight?.totalNominal || 0),
                )}
                {Number(insight?.budgetLimit || 0) > 0 && (
                  <>
                    {" "}
                    dari{" "}
                    {insight?.categoryType === "pemasukan"
                      ? "target"
                      : "batas"}{" "}
                    Rp{" "}
                    {new Intl.NumberFormat("id-ID").format(
                      Number(insight?.budgetLimit || 0),
                    )}
                  </>
                )}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 p-4 bg-white">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-indigo-500" /> Ringkasan
                AI
              </p>
              <p className="text-[11px] text-gray-400 mb-2">
                Sumber:{" "}
                {insight?.source === "GEMINI"
                  ? "Gemini AI"
                  : "Analisa Rule-Based"}
              </p>
              <p className="text-sm font-medium text-gray-700 leading-relaxed">
                {insight.summary}
              </p>
            </div>

            <div className="rounded-2xl border border-gray-100 p-4 bg-white">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Alasan Utama
              </p>
              <ul className="space-y-2">
                {(insight.reasons || []).map((reason, idx) => (
                  <li
                    key={`${reason}-${idx}`}
                    className="text-sm text-gray-700 flex gap-2"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0"></span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 p-4 bg-white">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Tips Hemat
              </p>
              <ul className="space-y-2">
                {(insight.tips || []).map((tip, idx) => (
                  <li
                    key={`${tip}-${idx}`}
                    className="text-sm text-gray-700 flex gap-2"
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0"></span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="rounded-2xl border border-gray-100 p-4 bg-white">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                Histori Mingguan
              </p>
              {historyItems.length === 0 ? (
                <p className="text-xs text-gray-500">
                  Belum ada histori insight mingguan untuk kategori ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {historyItems.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2"
                    >
                      <div>
                        <p className="text-xs font-semibold text-gray-700">
                          {h.weekStart} - {h.weekEnd}
                        </p>
                        <p className="text-[11px] text-gray-400">
                          {h.source === "GEMINI" ? "Gemini" : "Rule-Based"}
                        </p>
                      </div>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded-md ${getScoreStyle(Number(h.score || 0)).bg} ${getScoreStyle(Number(h.score || 0)).text}`}
                      >
                        {Number(h.score || 0)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
