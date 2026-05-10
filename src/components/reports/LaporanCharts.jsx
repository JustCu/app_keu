import { Bar, Doughnut } from "react-chartjs-2";
import "chart.js/auto";

const formatRupiah = (angka) => new Intl.NumberFormat("id-ID").format(angka);
const formatRupiahPendek = (angka) => {
  if (angka >= 1000000) return (angka / 1000000).toFixed(1) + "jt";
  if (angka >= 1000) return (angka / 1000).toFixed(0) + "rb";
  return angka;
};

export default function LaporanCharts({
  isDark,
  filter,
  periodTitle,
  totalMasuk,
  totalKeluar,
  barData,
  pengeluaranPerPos,
}) {
  const barChartData = {
    labels: barData.labels,
    datasets: [
      {
        type: "bar",
        label: "Masuk",
        data: barData.masuk,
        backgroundColor: "#10B981",
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
        order: 2,
      },
      {
        type: "bar",
        label: "Keluar",
        data: barData.keluar,
        backgroundColor: "#EF4444",
        borderRadius: 4,
        barPercentage: 0.6,
        categoryPercentage: 0.8,
        order: 2,
      },
      {
        type: "line",
        label: "Tren Saldo",
        data: barData.saldo,
        hidden: filter !== "semua",
        borderColor: "#0F766E",
        backgroundColor: "rgba(15, 118, 110, 0.15)",
        borderWidth: 2.5,
        pointRadius: 3,
        pointHoverRadius: 4,
        pointBackgroundColor: "#0F766E",
        tension: 0.3,
        fill: false,
        order: 1,
      },
    ],
  };

  const donutColors = ["#14B8A6", "#6366F1", "#EAB308", "#EF4444", "#10B981"];
  const donutChartData = {
    labels: pengeluaranPerPos.map((p) => p[0]),
    datasets: [
      {
        data: pengeluaranPerPos.map((p) => p[1]),
        backgroundColor: donutColors.slice(0, pengeluaranPerPos.length),
        borderWidth: 3,
        borderColor: isDark ? "#111827" : "#ffffff",
        hoverOffset: 4,
      },
    ],
  };

  const labelColor = isDark ? "#9ca3af" : "#374151";

  const barOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: "bottom",
        labels: {
          usePointStyle: true,
          boxWidth: 8,
          padding: 20,
          color: labelColor,
        },
      },
    },
    scales: {
      y: {
        display: false,
        beginAtZero: true,
      },
      x: { grid: { display: false }, ticks: { color: labelColor } },
    },
  };

  const donutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: "75%",
    plugins: { legend: { display: false } },
  };

  return (
    <>
      <section className="px-4 mt-6">
        <h2
          className={`text-sm font-bold uppercase tracking-wider mb-3 ${
            isDark ? "text-gray-400" : "text-gray-500"
          }`}
        >
          {periodTitle}
        </h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <p
              className={`text-xs font-medium mb-1 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Total Pemasukan
            </p>
            <p className="semantic-success-text text-lg font-bold">
              Rp {formatRupiah(totalMasuk)}
            </p>
          </div>
          <div
            className={`w-[1px] ${isDark ? "bg-gray-700" : "bg-gray-200"}`}
          ></div>
          <div className="flex-1">
            <p
              className={`text-xs font-medium mb-1 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Total Pengeluaran
            </p>
            <p className="semantic-danger-text text-lg font-bold">
              Rp {formatRupiah(totalKeluar)}
            </p>
          </div>
        </div>
      </section>

      <section className="px-4 mt-6">
        <div
          className={`p-4 rounded-2xl shadow-sm border relative overflow-hidden ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
          }`}
        >
          <div className="relative w-full h-56">
            <Bar data={barChartData} options={barOptions} />
          </div>
        </div>
      </section>

      <section className="px-4 mt-8">
        <h2
          className={`text-base font-bold mb-4 ${
            isDark ? "text-white" : "text-gray-900"
          }`}
        >
          Pengeluaran per Pos Anggaran
        </h2>
        <div
          className={`p-4 rounded-2xl shadow-sm border mb-5 flex flex-col ${
            isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"
          }`}
        >
          {pengeluaranPerPos.length > 0 ? (
            <>
              <div className="relative w-full h-48 flex justify-center items-center mb-6">
                <Doughnut data={donutChartData} options={donutOptions} />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0">
                  <p
                    className={`text-[10px] font-bold uppercase tracking-widest mt-2 ${
                      isDark ? "text-gray-500" : "text-gray-400"
                    }`}
                  >
                    Total
                  </p>
                  <p
                    className={`text-lg font-bold ${
                      isDark ? "text-white" : "text-gray-900"
                    }`}
                  >
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
                          <p
                            className={`text-sm font-medium ${
                              isDark ? "text-gray-300" : "text-gray-700"
                            }`}
                          >
                            {pos}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-bold ${
                              isDark ? "text-white" : "text-gray-900"
                            }`}
                          >
                            Rp {formatRupiahPendek(amount)}
                          </p>
                          <p
                            className={`text-[10px] font-bold ${
                              isDark ? "text-gray-500" : "text-gray-400"
                            }`}
                          >
                            {percentage}%
                          </p>
                        </div>
                      </div>
                      {idx < pengeluaranPerPos.length - 1 && (
                        <hr
                          className={`mt-3 ${
                            isDark ? "border-gray-700" : "border-gray-50"
                          }`}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </>
          ) : (
            <p
              className={`text-center text-sm py-6 ${
                isDark ? "text-gray-400" : "text-gray-500"
              }`}
            >
              Belum ada data pengeluaran.
            </p>
          )}
        </div>
      </section>
    </>
  );
}
