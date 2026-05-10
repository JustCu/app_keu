import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Send, Sparkles, X, RefreshCw } from "lucide-react";
import { fetchAIChatHistory, fetchAIInsights } from "../../services/api";

const MarkdownAIText = lazy(() => import("./MarkdownAIText"));

export default function LaporanAIInsights({
  isDark,
  isActive,
  aiEnabled,
  familyId,
  userId,
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
  const [analysisCache, setAnalysisCache] = useState({});
  const [assistantOpen, setAssistantOpen] = useState(false);
  const [assistantTab, setAssistantTab] = useState("analysis");
  const [chatInput, setChatInput] = useState("");
  const chatInputRef = useRef(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [historyItems, setHistoryItems] = useState([]);
  const [historyMode, setHistoryMode] = useState("all");
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPagination, setHistoryPagination] = useState({
    total: 0,
    page: 1,
    pageSize: 10,
    totalPages: 1,
    hasNext: false,
    hasPrev: false,
  });
  const [historyDetailItem, setHistoryDetailItem] = useState(null);
  const [historyCache, setHistoryCache] = useState({});

  const dataSignature = useMemo(() => {
    return filteredTransaksi
      .map(
        (trx) =>
          `${trx.ID || ""}-${trx.Tanggal || ""}-${trx.Tipe || ""}-${trx.Nominal || ""}-${trx["Pos Anggaran"] || ""}`,
      )
      .join("|");
  }, [filteredTransaksi]);

  const analysisCacheKey = `${filter}::${dataSignature}`;
  const historyPageSize = 10;
  const historyCacheKey = `${familyId || ""}::${userId || ""}::${historyMode}::${historyPage}`;

  const netCashflow = totalMasuk - totalKeluar;
  const savingRate = totalMasuk > 0 ? (netCashflow / totalMasuk) * 100 : 0;
  const topCategories = (pengeluaranPerPos || []).slice(0, 3);

  const formatRupiah = (value) =>
    `Rp ${new Intl.NumberFormat("id-ID").format(Number(value || 0))}`;

  const requestCurrentAnalysis = async (force = false) => {
    if (!force && analysisCache[analysisCacheKey]) {
      const cached = analysisCache[analysisCacheKey];
      setAiData(cached.data || null);
      setAiError(cached.error || null);
      return;
    }

    setAiLoading(true);
    setAiError(null);
    const res = await fetchAIInsights(familyId || null, {
      mode: "analysis",
      userId: userId || "",
      period: filter,
      detailLevel: "standard",
      focusAreas: ["akuntansi", "arus kas", "pengeluaran", "budgeting"],
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
      setAnalysisCache((prev) => ({
        ...prev,
        [analysisCacheKey]: { data: res.data, error: null },
      }));
      setHistoryPage(1);
      loadChatHistory(true, { mode: historyMode, page: 1 });
    } else {
      const msg =
        res.error === "API_KEY_MISSING"
          ? "Gemini API Key belum dikonfigurasi di Google Apps Script (Backend)."
          : `Gagal memuat insight: ${res.error}`;
      setAiError(msg);
      setAnalysisCache((prev) => ({
        ...prev,
        [analysisCacheKey]: { data: null, error: msg },
      }));
    }
  };

  const sendChat = async () => {
    const question = String(chatInput || "").trim();
    if (!question || chatLoading) return;

    setChatMessages((prev) => [...prev, { role: "user", text: question }]);
    setChatInput("");
    if (chatInputRef.current) {
      chatInputRef.current.style.height = "auto";
    }
    setChatLoading(true);

    const res = await fetchAIInsights(familyId || null, {
      mode: "chat",
      userId: userId || "",
      question,
      period: filter,
      detailLevel: "standard",
      focusAreas: ["akuntansi", "arus kas", "budgeting"],
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

    setChatLoading(false);

    if (res.success) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", text: String(res.data || "") },
      ]);
      setHistoryPage(1);
      loadChatHistory(true, { mode: historyMode, page: 1 });
    } else {
      const msg =
        res.error === "API_KEY_MISSING"
          ? "API key AI belum dikonfigurasi."
          : `Gagal menjawab: ${res.error || "Unknown error"}`;
      setChatMessages((prev) => [...prev, { role: "assistant", text: msg }]);
    }
  };

  const loadChatHistory = async (force = false, options = {}) => {
    if (!familyId) return;

    const mode = String(options.mode || historyMode || "all");
    const page = Number(options.page || historyPage || 1);
    const cacheKey = `${familyId || ""}::${userId || ""}::${mode}::${page}`;

    if (!force && historyCache[cacheKey]) {
      const cached = historyCache[cacheKey];
      setHistoryItems(cached.items || []);
      setHistoryError(cached.error || "");
      setHistoryPagination(
        cached.pagination || {
          total: 0,
          page,
          pageSize: historyPageSize,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      );
      return;
    }

    setHistoryLoading(true);
    setHistoryError("");
    const res = await fetchAIChatHistory({
      familyId,
      userId: userId || "",
      mode,
      page,
      pageSize: historyPageSize,
    });
    setHistoryLoading(false);

    if (res.success) {
      const items = res.data?.items || [];
      const pagination = res.data?.pagination || {
        total: items.length,
        page,
        pageSize: historyPageSize,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      };
      setHistoryItems(items);
      setHistoryPagination(pagination);
      setHistoryCache((prev) => ({
        ...prev,
        [cacheKey]: { items, pagination, error: "" },
      }));
    } else {
      const msg = `Gagal memuat histori: ${res.error || "Unknown error"}`;
      setHistoryError(msg);
      setHistoryPagination({
        total: 0,
        page,
        pageSize: historyPageSize,
        totalPages: 1,
        hasNext: false,
        hasPrev: false,
      });
      setHistoryCache((prev) => ({
        ...prev,
        [cacheKey]: { items: [], pagination: null, error: msg },
      }));
    }
  };

  useEffect(() => {
    if (!isActive || !aiEnabled) return;
    const cached = analysisCache[analysisCacheKey];
    if (cached) {
      setAiData(cached.data || null);
      setAiError(cached.error || null);
    } else {
      setAiData(null);
      setAiError(null);
    }
    setAiLoading(false);
  }, [isActive, aiEnabled, analysisCacheKey, analysisCache]);

  useEffect(() => {
    if (!assistantOpen || assistantTab !== "history") return;
    loadChatHistory(false, { mode: historyMode, page: historyPage });
  }, [assistantOpen, assistantTab, historyCacheKey, historyMode, historyPage]);

  const openAssistantFullscreen = () => {
    setAssistantOpen(true);
    setAssistantTab("chat");
  };

  const resizeChatInput = (el) => {
    if (!el) return;
    el.style.height = "auto";
    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight) || 16;
    const maxHeight = lineHeight * 2 + 12;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

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
              Analisis AI Expert Akuntansi • {periodTitle}
            </h3>
          </div>
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

          <button
            onClick={openAssistantFullscreen}
            className="w-full py-2.5 rounded-xl btn-primary-theme text-sm font-bold shadow-primary-theme active:scale-[0.98] transition"
          >
            Buka AI Assistant
          </button>
        </div>
      </div>

      {assistantOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="fixed inset-0 z-[9999]">
            <div className="absolute inset-0 bg-black/60" />
            <div
              className={`absolute inset-0 md:inset-6 md:rounded-2xl border overflow-hidden ${
                isDark
                  ? "bg-gray-950 border-gray-800"
                  : "bg-white border-gray-200"
              }`}
            >
              <div
                className={`px-4 py-3 border-b flex items-center justify-between ${
                  isDark ? "border-gray-800" : "border-gray-200"
                }`}
              >
                <div>
                  <p
                    className={`text-sm font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}
                  >
                    AI Expert Akuntansi Keluarga
                  </p>
                  <p
                    className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                  >
                    {periodTitle}
                  </p>
                </div>
                <button
                  onClick={() => setAssistantOpen(false)}
                  className={`h-9 w-9 rounded-lg border flex items-center justify-center transition ${
                    isDark
                      ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                      : "border-gray-200 text-gray-700 hover:bg-gray-100"
                  }`}
                  title="Tutup"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div
                className={`p-2 border-b grid grid-cols-3 gap-2 md:flex md:flex-wrap md:justify-center ${
                  isDark
                    ? "border-gray-800 bg-gray-900/70"
                    : "border-gray-200 bg-gray-50"
                }`}
              >
                <button
                  onClick={() => setAssistantTab("analysis")}
                  className={`w-full md:w-auto px-3 py-2 text-xs rounded-lg font-bold transition ${
                    assistantTab === "analysis"
                      ? "btn-primary-theme"
                      : isDark
                        ? "text-gray-400 hover:bg-gray-800"
                        : "text-gray-600 hover:bg-white"
                  }`}
                >
                  Analisis Kondisi
                </button>
                <button
                  onClick={() => setAssistantTab("chat")}
                  className={`w-full md:w-auto px-3 py-2 text-xs rounded-lg font-bold transition ${
                    assistantTab === "chat"
                      ? "btn-primary-theme"
                      : isDark
                        ? "text-gray-400 hover:bg-gray-800"
                        : "text-gray-600 hover:bg-white"
                  }`}
                >
                  Chat AI Agent
                </button>
                <button
                  onClick={() => setAssistantTab("history")}
                  className={`w-full md:w-auto px-3 py-2 text-xs rounded-lg font-bold transition ${
                    assistantTab === "history"
                      ? "btn-primary-theme"
                      : isDark
                        ? "text-gray-400 hover:bg-gray-800"
                        : "text-gray-600 hover:bg-white"
                  }`}
                >
                  Histori
                </button>
              </div>

              <div
                className={`h-[calc(100%-106px)] p-4 ${
                  assistantTab === "chat"
                    ? "overflow-hidden"
                    : "overflow-y-auto no-scrollbar"
                }`}
              >
                {assistantTab === "analysis" ? (
                  <div className="max-w-4xl mx-auto">
                    <div className="flex items-center justify-end mb-3">
                      <button
                        onClick={() => requestCurrentAnalysis(true)}
                        disabled={aiLoading}
                        className={`px-3 py-2 rounded-lg text-xs font-bold border flex items-center gap-2 transition ${
                          isDark
                            ? "border-gray-700 text-gray-200 hover:bg-gray-800"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        <RefreshCw
                          className={`w-3.5 h-3.5 ${aiLoading ? "animate-spin" : ""}`}
                        />
                        Perbarui Analisis
                      </button>
                    </div>

                    {aiLoading ? (
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
                      <Suspense
                        fallback={
                          <p className="text-sm opacity-70">Memuat format...</p>
                        }
                      >
                        <MarkdownAIText
                          content={aiData}
                          isDark={isDark}
                          className="text-primary-strong-adaptive"
                        />
                      </Suspense>
                    ) : (
                      <p
                        className={`text-sm ${isDark ? "text-gray-400" : "text-gray-600"}`}
                      >
                        Tekan tombol Perbarui Analisis untuk menghasilkan
                        evaluasi terbaru.
                      </p>
                    )}
                  </div>
                ) : assistantTab === "chat" ? (
                  <div className="max-w-4xl mx-auto h-full flex flex-col">
                    <div
                      className={`rounded-xl border p-3 flex-1 min-h-0 overflow-y-auto no-scrollbar space-y-2 ${
                        isDark
                          ? "border-gray-700 bg-gray-900/60"
                          : "border-gray-100 bg-white"
                      }`}
                    >
                      {chatMessages.length === 0 ? (
                        <p
                          className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Tanyakan apa saja tentang kondisi keuangan keluarga
                          saat ini.
                        </p>
                      ) : (
                        chatMessages.map((msg, idx) => (
                          <div
                            key={`${msg.role}-${idx}`}
                            className={`text-xs rounded-lg px-2.5 py-2 ${
                              msg.role === "user"
                                ? isDark
                                  ? "bg-teal-900/40 text-teal-100 ml-6"
                                  : "bg-teal-50 text-teal-700 ml-6"
                                : isDark
                                  ? "bg-gray-800 text-gray-100 mr-6"
                                  : "bg-gray-50 text-gray-700 mr-6"
                            }`}
                          >
                            <p className="font-semibold mb-1">
                              {msg.role === "user" ? "Anda" : "AI Agent"}
                            </p>
                            {msg.role === "assistant" ? (
                              <Suspense
                                fallback={
                                  <p className="text-xs opacity-70">
                                    Memuat format...
                                  </p>
                                }
                              >
                                <MarkdownAIText
                                  content={msg.text}
                                  isDark={isDark}
                                />
                              </Suspense>
                            ) : (
                              <p className="whitespace-pre-wrap break-words [overflow-wrap:anywhere]">
                                {msg.text}
                              </p>
                            )}
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-2 flex items-center gap-2">
                      <textarea
                        ref={chatInputRef}
                        rows={1}
                        value={chatInput}
                        onChange={(e) => {
                          setChatInput(e.target.value);
                          resizeChatInput(e.target);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendChat();
                          }
                        }}
                        placeholder="Contoh: Bagaimana cara menurunkan pengeluaran bulan ini?"
                        className={`flex-1 rounded-lg border px-3 py-2 text-xs outline-none resize-none overflow-y-auto ${
                          isDark
                            ? "bg-gray-800 border-gray-700 text-gray-100 placeholder-gray-500"
                            : "bg-white border-gray-200 text-gray-900 placeholder-gray-400"
                        }`}
                      />
                      <button
                        onClick={sendChat}
                        disabled={chatLoading || !chatInput.trim()}
                        className="h-9 w-9 rounded-lg btn-primary-theme flex items-center justify-center disabled:opacity-70"
                        title="Kirim pertanyaan"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="max-w-4xl mx-auto">
                    <div
                      className={`rounded-xl border p-2 mb-2 flex flex-wrap items-center justify-between gap-2 ${
                        isDark
                          ? "border-gray-700 bg-gray-900/60"
                          : "border-gray-100 bg-white"
                      }`}
                    >
                      <div className="flex items-center gap-1">
                        {[
                          { label: "Semua", value: "all" },
                          { label: "Analisis", value: "analysis" },
                          { label: "Chat", value: "chat" },
                        ].map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => {
                              setHistoryMode(opt.value);
                              setHistoryPage(1);
                            }}
                            className={`px-3 py-1.5 text-xs rounded-lg font-bold transition ${
                              historyMode === opt.value
                                ? "btn-primary-theme"
                                : isDark
                                  ? "text-gray-400 hover:bg-gray-800"
                                  : "text-gray-600 hover:bg-gray-50"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                      <p
                        className={`text-[11px] ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        Total {historyPagination.total || 0} riwayat
                      </p>
                    </div>

                    <div
                      className={`rounded-xl border p-3 space-y-2 ${
                        isDark
                          ? "border-gray-700 bg-gray-900/60"
                          : "border-gray-100 bg-white"
                      }`}
                    >
                      {historyLoading ? (
                        <p
                          className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Memuat histori analisis dan chat...
                        </p>
                      ) : historyError ? (
                        <p className="overlay-danger-soft text-xs rounded-lg border px-2 py-2">
                          {historyError}
                        </p>
                      ) : historyItems.length === 0 ? (
                        <p
                          className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                          Belum ada histori analisis atau chat AI.
                        </p>
                      ) : (
                        historyItems.map((item) => (
                          <div
                            key={item.id}
                            role="button"
                            tabIndex={0}
                            onClick={() => setHistoryDetailItem(item)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter" || e.key === " ") {
                                e.preventDefault();
                                setHistoryDetailItem(item);
                              }
                            }}
                            className={`rounded-lg border p-2 ${
                              isDark
                                ? "border-gray-700 bg-gray-800/70"
                                : "border-gray-100 bg-gray-50"
                            } cursor-pointer transition ${
                              isDark
                                ? "hover:bg-gray-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-500"
                                : "hover:bg-gray-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-300"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2">
                              <p
                                className={`text-[11px] font-semibold ${
                                  isDark ? "text-gray-300" : "text-gray-700"
                                }`}
                              >
                                {item.createdAt || "-"}
                              </p>
                              <span
                                className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                  item.type === "analysis"
                                    ? "bg-amber-100 text-amber-700"
                                    : "bg-teal-100 text-teal-700"
                                }`}
                              >
                                {item.type === "analysis" ? "Analisis" : "Chat"}
                              </span>
                            </div>
                            <p
                              className={`text-xs mt-1 ${
                                isDark ? "text-gray-200" : "text-gray-800"
                              }`}
                            >
                              <span className="font-bold">Q:</span>{" "}
                              {item.question || "-"}
                            </p>
                            <p
                              className={`text-xs mt-1 ${
                                isDark ? "text-gray-400" : "text-gray-600"
                              }`}
                            >
                              <span className="font-bold">A:</span>{" "}
                              {String(item.answer || "").slice(0, 220)}
                              {String(item.answer || "").length > 220
                                ? "..."
                                : ""}
                            </p>
                            <div className="mt-2 flex justify-end">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setHistoryDetailItem(item);
                                }}
                                className={`text-xs font-bold px-2.5 py-1 rounded-md border transition ${
                                  isDark
                                    ? "border-gray-600 text-gray-200 hover:bg-gray-700"
                                    : "border-gray-200 text-gray-700 hover:bg-gray-100"
                                }`}
                              >
                                Lihat detail
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <button
                        onClick={() =>
                          setHistoryPage((prev) => Math.max(1, prev - 1))
                        }
                        disabled={!historyPagination.hasPrev || historyLoading}
                        className={`px-3 py-1.5 text-xs rounded-lg font-bold border transition disabled:opacity-50 ${
                          isDark
                            ? "border-gray-700 text-gray-200 hover:bg-gray-800"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Sebelumnya
                      </button>
                      <p
                        className={`text-xs ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        Halaman {historyPagination.page || 1} dari{" "}
                        {historyPagination.totalPages || 1}
                      </p>
                      <button
                        onClick={() => setHistoryPage((prev) => prev + 1)}
                        disabled={!historyPagination.hasNext || historyLoading}
                        className={`px-3 py-1.5 text-xs rounded-lg font-bold border transition disabled:opacity-50 ${
                          isDark
                            ? "border-gray-700 text-gray-200 hover:bg-gray-800"
                            : "border-gray-200 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        Berikutnya
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {historyDetailItem && (
                <div className="absolute inset-0 z-20">
                  <div className="absolute inset-0 bg-black/60" />
                  <div
                    className={`absolute inset-3 md:inset-8 rounded-2xl border overflow-hidden ${
                      isDark
                        ? "bg-gray-950 border-gray-700"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div
                      className={`px-4 py-3 border-b flex items-center justify-between ${
                        isDark ? "border-gray-800" : "border-gray-200"
                      }`}
                    >
                      <div>
                        <p
                          className={`text-sm font-bold ${isDark ? "text-gray-100" : "text-gray-900"}`}
                        >
                          Detail Riwayat AI
                        </p>
                        <p
                          className={`text-xs mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                        >
                          {historyDetailItem.createdAt || "-"}
                        </p>
                      </div>
                      <button
                        onClick={() => setHistoryDetailItem(null)}
                        className={`h-9 w-9 rounded-lg border flex items-center justify-center transition ${
                          isDark
                            ? "border-gray-700 text-gray-300 hover:bg-gray-800"
                            : "border-gray-200 text-gray-700 hover:bg-gray-100"
                        }`}
                        title="Tutup detail"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="p-4 h-[calc(100%-61px)] overflow-y-auto no-scrollbar">
                      <div className="max-w-4xl mx-auto space-y-3">
                        <p
                          className={`text-xs ${isDark ? "text-gray-300" : "text-gray-700"}`}
                        >
                          <span className="font-bold">Tipe:</span>{" "}
                          {historyDetailItem.type === "analysis"
                            ? "Analisis"
                            : "Chat"}
                        </p>
                        <p
                          className={`text-sm ${isDark ? "text-gray-200" : "text-gray-800"}`}
                        >
                          <span className="font-bold">Pertanyaan:</span>{" "}
                          {historyDetailItem.question || "-"}
                        </p>
                        <div
                          className={`rounded-xl border p-3 ${
                            isDark
                              ? "border-gray-700 bg-gray-900/60"
                              : "border-gray-100 bg-gray-50"
                          }`}
                        >
                          <p
                            className={`text-xs font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-600"}`}
                          >
                            Jawaban lengkap
                          </p>
                          <Suspense
                            fallback={
                              <p className="text-xs opacity-70">
                                Memuat format...
                              </p>
                            }
                          >
                            <MarkdownAIText
                              content={String(historyDetailItem.answer || "-")}
                              isDark={isDark}
                            />
                          </Suspense>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>,
          document.body,
        )}
    </section>
  );
}
