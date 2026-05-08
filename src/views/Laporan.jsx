import { useState, useMemo, useEffect } from "react";
import { Sparkles } from "lucide-react";
import { Bar, Doughnut } from "react-chartjs-2";
import { fetchAIInsights } from "../services/api";
import { useAuth } from "../context/AuthContext";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from "chart.js";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
);

const formatRupiah = (angka) => new Intl.NumberFormat("id-ID").format(angka);
const formatRupiahPendek = (angka) => {
  if (angka >= 1000000) return (angka / 1000000).toFixed(1) + "jt";
  if (angka >= 1000) return (angka / 1000).toFixed(0) + "rb";
  return angka;
};

const getPeriodTitle = (filter) => {
  const now = new Date();
  if (filter === "hariini") {
    return `Hari Ini, ${now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })}`;
  }
  if (filter === "mingguan") {
    const start = new Date(now);
    start.setDate(start.getDate() - 6);
    const startLabel = start.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
    });
    const endLabel = now.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${startLabel} - ${endLabel}`;
  }
  if (filter === "bulanan") {
    return now.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    });
  }
  return `Tahun ${now.getFullYear()}`;
};

export default function Laporan({
  isActive,
  transaksi = [],
  isLoading = false,
}) {
  const { user } = useAuth();
  const [filter, setFilter] = useState("semua");

  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [aiCache, setAiCache] = useState({});

  useEffect(() => {
    const isAI = localStorage.getItem("integrasiAI") !== "false";
    setAiEnabled(isAI);
  }, [isActive]);

  const {
    totalMasuk,
    totalKeluar,
    pengeluaranPerPos,
    barData,
    filteredTransaksi,
    periodTitle,
  } = useMemo(() => {
    let masuk = 0;
    let keluar = 0;
    const posMap = {};

    let labels = [];
    const barDataMap = {};

    if (filter === "hariini") {
      labels = ["Hari Ini"];
    } else if (filter === "mingguan") {
      labels = ["Sen", "Sel", "Rab", "Kam", "Jum", "Sab", "Min"];
    } else if (filter === "bulanan") {
      labels = ["Mg 1", "Mg 2", "Mg 3", "Mg 4", "Mg 5"];
    } else {
      labels = [
        "Jan",
        "Feb",
        "Mar",
        "Apr",
        "Mei",
        "Jun",
        "Jul",
        "Ags",
        "Sep",
        "Okt",
        "Nov",
        "Des",
      ];
    }

    labels.forEach((l) => (barDataMap[l] = { m: 0, k: 0 }));

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();
    const currentDate = now.getDate();

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(now.getDate() - 6);
    sevenDaysAgo.setHours(0, 0, 0, 0);

    const days = ["Min", "Sen", "Sel", "Rab", "Kam", "Jum", "Sab"];
    const months = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Ags",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    const scopedTransaksi = transaksi.filter((trx) => {
      const trxDate = new Date(trx.Tanggal);
      if (isNaN(trxDate.getTime())) return true;

      if (filter === "hariini") {
        return (
          trxDate.getFullYear() === currentYear &&
          trxDate.getMonth() === currentMonth &&
          trxDate.getDate() === currentDate
        );
      }
      if (filter === "mingguan") {
        return trxDate >= sevenDaysAgo;
      }
      if (filter === "bulanan") {
        return (
          trxDate.getFullYear() === currentYear &&
          trxDate.getMonth() === currentMonth
        );
      }
      return trxDate.getFullYear() === currentYear;
    });

    scopedTransaksi.forEach((trx) => {
      const nominalRaw = String(trx.Nominal || "").replace(/[^0-9]/g, "");
      const nominal = parseInt(nominalRaw, 10) || 0;

      const date = new Date(trx.Tanggal);
      const isValidDate = !isNaN(date.getTime());

      let binLabel = "";
      if (filter === "hariini") {
        binLabel = "Hari Ini";
      } else if (filter === "mingguan") {
        binLabel = isValidDate ? days[date.getDay()] : "Sen";
      } else if (filter === "bulanan") {
        if (isValidDate) {
          const dateNum = date.getDate();
          if (dateNum <= 7) binLabel = "Mg 1";
          else if (dateNum <= 14) binLabel = "Mg 2";
          else if (dateNum <= 21) binLabel = "Mg 3";
          else if (dateNum <= 28) binLabel = "Mg 4";
          else binLabel = "Mg 5";
        } else {
          binLabel = "Mg 1";
        }
      } else {
        binLabel = isValidDate ? months[date.getMonth()] : "Jan";
      }

      if (trx.Tipe === "pemasukan") {
        masuk += nominal;
        if (barDataMap[binLabel]) barDataMap[binLabel].m += nominal;
      } else if (trx.Tipe === "pengeluaran") {
        keluar += nominal;
        if (barDataMap[binLabel]) barDataMap[binLabel].k += nominal;

        const pos = trx["Pos Anggaran"] || "Lainnya";
        posMap[pos] = (posMap[pos] || 0) + nominal;
      }
    });

    const computedBarData = {
      labels,
      masuk: labels.map((l) => barDataMap[l].m),
      keluar: labels.map((l) => barDataMap[l].k),
    };

    const sortedPos = Object.entries(posMap).sort((a, b) => b[1] - a[1]);

    return {
      totalMasuk: masuk,
      totalKeluar: keluar,
      pengeluaranPerPos: sortedPos,
      barData: computedBarData,
      filteredTransaksi: scopedTransaksi,
      periodTitle: getPeriodTitle(filter),
    };
  }, [transaksi, filter]);

  const dataSignature = useMemo(() => {
    return filteredTransaksi
      .map(
        (trx) =>
          `${trx.ID || ""}-${trx.Tanggal || ""}-${trx.Tipe || ""}-${trx.Nominal || ""}-${trx["Pos Anggaran"] || ""}`,
      )
      .join("|");
  }, [filteredTransaksi]);

  const insightCacheKey = `${filter}::${dataSignature}`;

  const loadInsights = async (force = false) => {
    if (!force && aiCache[insightCacheKey]) {
      const cached = aiCache[insightCacheKey];
      setAiData(cached.data || null);
      setAiError(cached.error || null);
      return;
    }

    setAiLoading(true);
    setAiError(null);
    const res = await fetchAIInsights(user?.familyId || null, {
      period: filter,
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
    if (!isActive || !aiEnabled || !user?.familyId) return;

    if (aiCache[insightCacheKey]) {
      const cached = aiCache[insightCacheKey];
      setAiData(cached.data || null);
      setAiError(cached.error || null);
      return;
    }

    loadInsights(false);
  }, [isActive, aiEnabled, user?.familyId, insightCacheKey]);

  if (isLoading) {
    return <p className="text-center mt-10 text-gray-500">Memuat laporan...</p>;
  }

  const barChartData = {
    labels: barData.labels,
    datasets: [
      {
        label: "Masuk",
        data: barData.masuk,
        backgroundColor: "#10B981",
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
      {
        label: "Keluar",
        data: barData.keluar,
        backgroundColor: "#EF4444",
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
      },
    ],
  };

  const donutColors = ["#3B82F6", "#6366F1", "#EAB308", "#EF4444", "#10B981"];
  const donutChartData = {
    labels: pengeluaranPerPos.map((p) => p[0]),
    datasets: [
      {
        data: pengeluaranPerPos.map((p) => p[1]),
        backgroundColor: donutColors.slice(0, pengeluaranPerPos.length),
        borderWidth: 3,
        borderColor: "#ffffff",
        hoverOffset: 4,
      },
    ],
  };

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: { usePointStyle: true, boxWidth: 8, padding: 20 },
      },
    },
    scales: {
      y: { display: false, beginAtZero: true },
      x: { grid: { display: false } },
    },
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "75%",
    plugins: { legend: { display: false } },
  };

  return (
    <div>
      <div className="px-4 mt-4">
        <div className="bg-gray-200/60 p-1 rounded-xl flex gap-1 overflow-x-auto no-scrollbar">
          {["Hari Ini", "Mingguan", "Bulanan", "Semua"].map((f) => {
            const key = f.toLowerCase().replace(" ", "");
            const isSelected =
              filter === key || (f === "Hari Ini" && filter === "harian");
            return (
              <button
                key={f}
                onClick={() => setFilter(key)}
                className={`filter-btn flex-1 min-w-[70px] text-sm py-2 transition-all ${isSelected ? "font-bold bg-white rounded-lg shadow-sm text-gray-900" : "font-medium text-gray-500 hover:text-gray-900"}`}
              >
                {f}
              </button>
            );
          })}
        </div>
      </div>

      <section className="px-4 mt-6">
        <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3">
          {periodTitle}
        </h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium mb-1">
              Total Pemasukan
            </p>
            <p className="text-lg font-bold text-green-600">
              Rp {formatRupiah(totalMasuk)}
            </p>
          </div>
          <div className="w-[1px] bg-gray-200"></div>
          <div className="flex-1">
            <p className="text-xs text-gray-500 font-medium mb-1">
              Total Pengeluaran
            </p>
            <p className="text-lg font-bold text-red-600">
              Rp {formatRupiah(totalKeluar)}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 mt-6">
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="relative w-full h-56">
            <Bar data={barChartData} options={barOptions} />
          </div>
        </div>
      </section>

      <section className="px-4 mt-8">
        <h2 className="text-base font-bold text-gray-900 mb-4">
          Pengeluaran per Pos Anggaran
        </h2>
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-5 flex flex-col">
          {pengeluaranPerPos.length > 0 ? (
            <>
              <div className="relative w-full h-48 flex justify-center items-center mb-6">
                <Doughnut data={donutChartData} options={donutOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-2">
                    Total
                  </p>
                  <p className="text-lg font-bold text-gray-900">
                    Rp {formatRupiahPendek(totalKeluar)}
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3">
                {pengeluaranPerPos.map(([pos, amount], idx) => {
                  const percentage = Math.round((amount / totalKeluar) * 100);
                  const color = donutColors[idx % donutColors.length];
                  return (
                    <div key={pos}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3 h-3 rounded-full shadow-sm"
                            style={{ backgroundColor: color }}
                          ></span>
                          <p className="text-sm font-medium text-gray-700">
                            {pos}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-gray-900">
                            Rp {formatRupiahPendek(amount)}
                          </p>
                          <p className="text-[10px] font-bold text-gray-400">
                            {percentage}%
                          </p>
                        </div>
                      </div>
                      {idx < pengeluaranPerPos.length - 1 && (
                        <hr className="border-gray-50 mt-3" />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p className="text-center text-sm text-gray-500 py-6">
              Belum ada data pengeluaran.
            </p>
          )}
        </div>
      </section>

      {aiEnabled && (
        <section className="px-4 mt-8 pb-6">
          <div className="bg-gradient-to-r from-purple-50 to-fuchsia-50 rounded-2xl p-5 border border-purple-100 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-200 rounded-full blur-3xl opacity-50 -mr-10 -mt-10 pointer-events-none"></div>

            <div className="flex items-center justify-between mb-3 relative z-10">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-purple-900">
                  Insight AI • {periodTitle}
                </h3>
              </div>
              {!aiLoading && (
                <button
                  onClick={() => loadInsights(true)}
                  className="text-xs font-bold text-purple-600 hover:text-purple-800 transition bg-purple-100 px-3 py-1.5 rounded-lg active:scale-95"
                >
                  Perbarui
                </button>
              )}
            </div>

            <div className="relative z-10">
              {aiLoading ? (
                <div className="flex flex-col gap-2 animate-pulse mt-2">
                  <div className="h-3 bg-purple-200/50 rounded-full w-full"></div>
                  <div className="h-3 bg-purple-200/50 rounded-full w-5/6"></div>
                  <div className="h-3 bg-purple-200/50 rounded-full w-4/6"></div>
                </div>
              ) : aiError ? (
                <p className="text-sm text-red-500 font-medium">{aiError}</p>
              ) : aiData ? (
                <p className="text-sm text-purple-800 leading-relaxed whitespace-pre-line">
                  {aiData}
                </p>
              ) : (
                <p className="text-sm text-purple-600/70">
                  Menyiapkan insight untuk periode ini...
                </p>
              )}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
