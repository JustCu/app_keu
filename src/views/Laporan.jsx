import { useState, useMemo, useEffect, lazy, Suspense } from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import ScrollReveal from "../components/common/ScrollReveal";

const LaporanCharts = lazy(() => import("../components/reports/LaporanCharts"));
const LaporanAIInsights = lazy(
  () => import("../components/reports/LaporanAIInsights"),
);

const formatRupiah = (angka) => new Intl.NumberFormat("id-ID").format(angka);

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
  const { isDark } = useTheme();
  const [filter, setFilter] = useState("semua");

  const [aiEnabled, setAiEnabled] = useState(true);

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
    const totalSaldoGlobal = transaksi.reduce((acc, trx) => {
      const nominalRaw = String(trx.Nominal || "").replace(/[^0-9]/g, "");
      const nominal = parseInt(nominalRaw, 10) || 0;
      if (trx.Tipe === "pemasukan") return acc + nominal;
      if (trx.Tipe === "pengeluaran") return acc - nominal;
      return acc;
    }, 0);

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

    let runningSaldo = 0;
    const saldoRawSeries = labels.map((l) => {
      const delta = barDataMap[l].m - barDataMap[l].k;
      if (filter === "semua") {
        runningSaldo += delta;
        return runningSaldo;
      }
      return delta;
    });

    // Keep monthly trend shape, but anchor the last point to actual total saldo.
    const adjustedSaldoSeries =
      filter === "semua"
        ? saldoRawSeries.length > 0
          ? (() => {
              const latestRaw = saldoRawSeries[saldoRawSeries.length - 1] || 0;
              const offset = totalSaldoGlobal - latestRaw;
              return saldoRawSeries.map((v) => v + offset);
            })()
          : saldoRawSeries
        : labels.map(() => totalSaldoGlobal);

    const computedBarData = {
      labels,
      masuk: labels.map((l) => barDataMap[l].m),
      keluar: labels.map((l) => barDataMap[l].k),
      saldo: adjustedSaldoSeries,
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

  if (isLoading) {
    return <LaporanLoadingSkeleton isDark={isDark} />;
  }

  return (
    <div>
      <ScrollReveal delay={30} duration={560}>
        <div className="px-4 mt-4">
          <div
            className={`p-1 rounded-xl flex gap-1 overflow-x-auto no-scrollbar ${isDark ? "bg-gray-800" : "bg-gray-200/60"}`}
          >
            {["Hari Ini", "Mingguan", "Bulanan", "Semua"].map((f) => {
              const key = f.toLowerCase().replace(" ", "");
              const isSelected =
                filter === key || (f === "Hari Ini" && filter === "harian");
              return (
                <button
                  key={f}
                  onClick={() => setFilter(key)}
                  className={`filter-btn flex-1 min-w-[70px] text-sm py-2 transition-all ${isSelected ? `font-bold rounded-lg shadow-sm ${isDark ? "bg-gray-700 text-white" : "bg-white text-gray-900"}` : `font-medium ${isDark ? "text-gray-400 hover:text-gray-200" : "text-gray-500 hover:text-gray-900"}`}`}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      </ScrollReveal>

      <Suspense fallback={null}>
        <ScrollReveal delay={90} duration={620} y={18}>
          <LaporanCharts
            isDark={isDark}
            filter={filter}
            periodTitle={periodTitle}
            totalMasuk={totalMasuk}
            totalKeluar={totalKeluar}
            barData={barData}
            pengeluaranPerPos={pengeluaranPerPos}
          />
        </ScrollReveal>
        <ScrollReveal delay={150} duration={620} y={18}>
          <LaporanAIInsights
            isDark={isDark}
            isActive={isActive}
            aiEnabled={aiEnabled}
            familyId={user?.familyId}
            userId={user?.id}
            filter={filter}
            periodTitle={periodTitle}
            filteredTransaksi={filteredTransaksi}
            totalMasuk={totalMasuk}
            totalKeluar={totalKeluar}
            pengeluaranPerPos={pengeluaranPerPos}
          />
        </ScrollReveal>
      </Suspense>
    </div>
  );
}

function LaporanLoadingSkeleton({ isDark }) {
  const line = isDark ? "bg-white/10" : "bg-gray-200";
  const lineSoft = isDark ? "bg-white/7" : "bg-gray-100";
  const panel = isDark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-100";

  return (
    <div className="animate-fade-up">
      <div className="px-4 mt-4">
        <div
          className={`p-1 rounded-xl flex gap-1 ${isDark ? "bg-gray-800" : "bg-gray-200/60"}`}
        >
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className={`h-9 flex-1 rounded-lg ${index === 3 ? line : lineSoft}`}
            />
          ))}
        </div>
      </div>

      <div className="px-4 mt-4 space-y-4">
        <div className={`rounded-2xl border p-5 skeleton-shimmer ${panel}`}>
          <div className="flex items-center justify-between mb-4">
            <div className={`h-4 w-32 rounded-full ${line}`} />
            <div className={`h-3 w-20 rounded-full ${lineSoft}`} />
          </div>
          <div className={`h-48 w-full rounded-2xl ${lineSoft}`} />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={`h-16 rounded-xl ${line}`}
                style={{ opacity: 0.7 + index * 0.1 }}
              />
            ))}
          </div>
        </div>

        <div
          className={`rounded-2xl border p-5 skeleton-shimmer ${panel}`}
          style={{ "--skeleton-delay": "140ms" }}
        >
          <div className={`h-4 w-28 rounded-full ${line}`} />
          <div className={`mt-3 h-3 w-2/3 rounded-full ${lineSoft}`} />
          <div className="mt-5 space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div
                key={index}
                className={`h-3 rounded-full ${line}`}
                style={{ width: `${92 - index * 16}%` }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
