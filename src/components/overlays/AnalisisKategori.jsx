import { useEffect, useMemo, useState } from "react";
import { X, Sparkles, AlertCircle, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";
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
      ring: "semantic-success-ring",
      text: "semantic-success-text",
      bg: "semantic-success-surface",
    };
  if (score >= 60)
    return {
      ring: "semantic-warning-ring",
      text: "semantic-warning-text",
      bg: "semantic-warning-surface",
    };
  return {
    ring: "semantic-danger-ring",
    text: "semantic-danger-text",
    bg: "semantic-danger-surface",
  };
};

export default function AnalisisKategori({
  isOpen,
  onClose,
  category,
  aiEnabled = true,
  onInsightSaved,
}) {
  const { user } = useAuth();
  const { isDark } = useTheme();
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
  const panelClass = isDark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-gray-400" : "text-gray-500";
  const textSoft = isDark ? "text-gray-500" : "text-gray-400";

  return (
    <div
      className={`fixed inset-0 z-[70] flex flex-col shadow-2xl ${isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
    >
      <header
        className={`flex items-center justify-between px-4 pt-8 pb-4 border-b ${isDark ? "border-gray-800 bg-gray-900" : "border-gray-100 bg-white"}`}
      >
        <div>
          <p
            className={`text-xs font-bold uppercase tracking-wider ${textSoft}`}
          >
            Analisa AI Kategori
          </p>
          <h2 className={`text-lg font-bold mt-0.5 ${textPrimary}`}>
            {category?.nama || "Kategori"}
          </h2>
        </div>
        <button
          onClick={onClose}
          className="overlay-muted-button w-8 h-8 rounded-full flex items-center justify-center transition"
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="px-4 pt-4">
        <div
          className={`p-1 rounded-xl flex gap-1 overflow-x-auto no-scrollbar ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
        >
          {PERIOD_OPTIONS.map((p) => (
            <button
              key={p.key}
              onClick={() => setPeriod(p.key)}
              className={`min-w-[78px] px-3 py-2 rounded-lg text-xs font-semibold transition ${
                period === p.key
                  ? isDark
                    ? "bg-gray-700 text-white shadow-sm"
                    : "bg-white text-gray-900 shadow-sm"
                  : isDark
                    ? "text-gray-400"
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
          <div className="overlay-warning-soft rounded-2xl border p-4">
            <p
              className={`text-sm font-bold ${isDark ? "text-amber-300" : "text-amber-700"}`}
            >
              Integrasi AI belum aktif
            </p>
            <p
              className={`text-xs mt-1 ${isDark ? "text-amber-300" : "text-amber-700"}`}
            >
              Aktifkan fitur Integrasi Gemini AI di menu Pengaturan untuk
              menggunakan analisa kategori.
            </p>
          </div>
        )}

        {aiEnabled && loading && (
          <AnalisisKategoriLoadingSkeleton
            isDark={isDark}
            panelClass={panelClass}
          />
        )}

        {aiEnabled && !loading && error && (
          <div
            className={`rounded-2xl border p-4 ${isDark ? "border-red-800 bg-red-900/30" : "border-red-200 bg-red-50"}`}
          >
            <p
              className={`text-sm font-semibold flex items-center gap-2 ${isDark ? "text-red-300" : "text-red-600"}`}
            >
              <AlertCircle className="w-4 h-4" /> Terjadi masalah
            </p>
            <p
              className={`text-xs mt-1 ${isDark ? "text-red-300" : "text-red-600"}`}
            >
              {error}
            </p>
          </div>
        )}

        {aiEnabled && !loading && !error && insight && (
          <div className="space-y-4">
            <div
              className={`rounded-2xl p-4 border ${isDark ? "border-gray-700" : "border-gray-100"} ${scoreStyle.bg}`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p
                    className={`text-xs font-bold uppercase tracking-wider ${textMuted}`}
                  >
                    Skor Kesehatan
                  </p>
                  <p className={`text-3xl font-black mt-1 ${scoreStyle.text}`}>
                    {score}/100
                  </p>
                </div>
                <div
                  className={`w-12 h-12 rounded-full ring-8 ${isDark ? "bg-gray-800" : "bg-white"} ${scoreStyle.ring} flex items-center justify-center`}
                >
                  <ShieldCheck className={`w-6 h-6 ${scoreStyle.text}`} />
                </div>
              </div>
              <p
                className={`text-xs mt-3 ${isDark ? "text-gray-300" : "text-gray-600"}`}
              >
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

            <div className={`rounded-2xl border p-4 ${panelClass}`}>
              <p
                className={`text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-1 ${textMuted}`}
              >
                <Sparkles className="w-3.5 h-3.5 text-primary-adaptive" />{" "}
                Ringkasan AI
              </p>
              <p className={`text-[11px] mb-2 ${textSoft}`}>
                Sumber:{" "}
                {insight?.source === "GEMINI"
                  ? "Gemini AI"
                  : "Analisa Rule-Based"}
              </p>
              <p
                className={`text-sm font-medium leading-relaxed ${isDark ? "text-gray-200" : "text-gray-700"}`}
              >
                {insight.summary}
              </p>
            </div>

            <div className={`rounded-2xl border p-4 ${panelClass}`}>
              <p
                className={`text-xs font-bold uppercase tracking-wider mb-2 ${textMuted}`}
              >
                Alasan Utama
              </p>
              <ul className="space-y-2">
                {(insight.reasons || []).map((reason, idx) => (
                  <li
                    key={`${reason}-${idx}`}
                    className={`text-sm flex gap-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}
                  >
                    <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-primary-theme shrink-0"></span>
                    <span>{reason}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`rounded-2xl border p-4 ${panelClass}`}>
              <p
                className={`text-xs font-bold uppercase tracking-wider mb-2 ${textMuted}`}
              >
                Tips Hemat
              </p>
              <ul className="space-y-2">
                {(insight.tips || []).map((tip, idx) => (
                  <li
                    key={`${tip}-${idx}`}
                    className={`text-sm flex gap-2 ${isDark ? "text-gray-200" : "text-gray-700"}`}
                  >
                    <span className="semantic-success-dot mt-1.5 w-1.5 h-1.5 rounded-full shrink-0"></span>
                    <span>{tip}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className={`rounded-2xl border p-4 ${panelClass}`}>
              <p
                className={`text-xs font-bold uppercase tracking-wider mb-2 ${textMuted}`}
              >
                Histori Mingguan
              </p>
              {historyItems.length === 0 ? (
                <p className={`text-xs ${textMuted}`}>
                  Belum ada histori insight mingguan untuk kategori ini.
                </p>
              ) : (
                <div className="space-y-2">
                  {historyItems.map((h) => (
                    <div
                      key={h.id}
                      className={`flex items-center justify-between rounded-lg px-3 py-2 ${isDark ? "bg-gray-700" : "bg-gray-50"}`}
                    >
                      <div>
                        <p
                          className={`text-xs font-semibold ${isDark ? "text-gray-200" : "text-gray-700"}`}
                        >
                          {h.weekStart} - {h.weekEnd}
                        </p>
                        <p className={`text-[11px] ${textSoft}`}>
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

function AnalisisKategoriLoadingSkeleton({ isDark, panelClass }) {
  const line = isDark ? "bg-white/10" : "bg-gray-200";
  const lineSoft = isDark ? "bg-white/7" : "bg-gray-100";

  return (
    <div className="space-y-4" aria-hidden="true">
      <div className={`rounded-2xl border p-4 skeleton-shimmer ${panelClass}`}>
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className={`h-3 w-24 rounded-full ${lineSoft}`} />
            <div className={`mt-2 h-8 w-20 rounded-xl ${line}`} />
          </div>
          <div className={`w-12 h-12 rounded-full ${line}`} />
        </div>
        <div className={`mt-4 h-3 w-4/5 rounded-full ${lineSoft}`} />
      </div>

      <div
        className={`rounded-2xl border p-4 skeleton-shimmer ${panelClass}`}
        style={{ "--skeleton-delay": "140ms" }}
      >
        <div className={`h-3 w-24 rounded-full ${line}`} />
        <div className={`mt-3 h-2.5 w-36 rounded-full ${lineSoft}`} />
        <div className="mt-4 space-y-2">
          <div className={`h-3 w-full rounded-full ${line}`} />
          <div className={`h-3 w-11/12 rounded-full ${line}`} />
          <div className={`h-3 w-4/5 rounded-full ${lineSoft}`} />
        </div>
      </div>

      <div
        className={`rounded-2xl border p-4 skeleton-shimmer ${panelClass}`}
        style={{ "--skeleton-delay": "280ms" }}
      >
        <div className={`h-3 w-20 rounded-full ${line}`} />
        <div className="mt-3 space-y-2">
          <div className={`h-3 w-10/12 rounded-full ${lineSoft}`} />
          <div className={`h-3 w-9/12 rounded-full ${lineSoft}`} />
          <div className={`h-3 w-11/12 rounded-full ${lineSoft}`} />
        </div>
      </div>
    </div>
  );
}
