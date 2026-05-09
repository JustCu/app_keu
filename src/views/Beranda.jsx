import { useState } from "react";
import { Eye, EyeOff, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

export default function Beranda({
  transaksi = [],
  anggaran = [],
  isLoading = false,
  onViewAll,
}) {
  const [isBalanceHidden, setIsBalanceHidden] = useState(false);
  const { isDark } = useTheme();

  // Calculate totals
  let totalMasuk = 0;
  let totalKeluar = 0;

  transaksi.forEach((trx) => {
    // Nominal might be string or number, parse it.
    // Also remove any dots if it was formatted with thousands separators.
    const nominalRaw = String(trx.Nominal || "").replace(/[^0-9]/g, "");
    const nominal = parseInt(nominalRaw, 10) || 0;

    if (trx.Tipe === "pemasukan") {
      totalMasuk += nominal;
    } else if (trx.Tipe === "pengeluaran") {
      totalKeluar += nominal;
    }
  });

  const totalSaldo = totalMasuk - totalKeluar;

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat("id-ID").format(angka);
  };

  return (
    <div>
      {/* Main Dashboard Card Section */}
      <section className="px-4 mt-4">
        <div className="relative bg-gradient-to-br from-teal-900 via-teal-800 to-gray-900 rounded-2xl p-6 text-white shadow-xl overflow-hidden flex flex-col gap-5">
          {/* Decorative Backgrounds */}
          <div className="absolute top-0 right-0 w-40 h-40 bg-white opacity-5 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-primary-theme opacity-10 rounded-full -ml-10 -mb-10 pointer-events-none"></div>
          <div className="absolute inset-0 card-shine pointer-events-none"></div>

          {/* Top Row: Title & Toggle Visibility */}
          <div className="flex justify-between items-center relative z-10">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center backdrop-blur-sm">
                <WalletIcon className="w-4 h-4 text-white" />
              </div>
              <p className="text-primary-on-dark text-xs font-bold uppercase tracking-wider">
                Total Saldo
              </p>
            </div>
            <button
              onClick={() => setIsBalanceHidden(!isBalanceHidden)}
              className="text-primary-on-dark hover:text-white p-1 rounded-full hover:bg-white/10 transition active:scale-95"
            >
              {isBalanceHidden ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Middle Row: Main Balance */}
          <div className="relative z-10">
            <div className="flex items-baseline gap-1">
              <span className="text-primary-on-dark text-lg font-bold">Rp</span>
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

          {/* Bottom Row: In & Out (Glassmorphism Box) */}
          <div className="relative z-10 bg-white/10 backdrop-blur-md rounded-xl p-4 flex justify-between border border-white/10 mt-2">
            {/* Pemasukan */}
            <div className="flex-1 flex gap-3 items-center">
              <div className="w-8 h-8 rounded-full bg-green-400/20 flex items-center justify-center text-green-400 border border-green-400/30">
                <ArrowDownRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-primary-on-dark uppercase tracking-wider font-bold">
                  Masuk
                </p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {isBalanceHidden
                    ? "Rp •••••••"
                    : `Rp ${formatRupiah(totalMasuk)}`}
                </p>
              </div>
            </div>

            {/* Divider */}
            <div className="w-[1px] bg-white/20 mx-2"></div>

            {/* Pengeluaran */}
            <div className="flex-1 flex gap-3 items-center pl-2">
              <div className="w-8 h-8 rounded-full bg-red-400/20 flex items-center justify-center text-red-400 border border-red-400/30">
                <ArrowUpRight className="w-4 h-4" />
              </div>
              <div>
                <p className="text-[10px] text-primary-on-dark uppercase tracking-wider font-bold">
                  Keluar
                </p>
                <p className="text-sm font-bold text-white mt-0.5">
                  {isBalanceHidden
                    ? "Rp •••••••"
                    : `Rp ${formatRupiah(totalKeluar)}`}
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Transactions List */}
      <section className="px-4 mt-8">
        <div className="flex justify-between items-center mb-4">
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
          {isLoading ? (
            <p
              className={`text-sm text-center py-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Memuat data...
            </p>
          ) : transaksi.length === 0 ? (
            <p
              className={`text-sm text-center py-4 ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Belum ada transaksi.
            </p>
          ) : (
            transaksi.slice(0, 5).map((trx, index) => {
              const isMasuk = trx.Tipe === "pemasukan";
              const nominalStr = formatRupiah(
                String(trx.Nominal || "").replace(/[^0-9]/g, ""),
              );
              const dateStr = new Date(trx.Tanggal).toLocaleDateString(
                "id-ID",
                { day: "numeric", month: "short" },
              );

              // Lookup pos anggaran to get icon
              const pos = anggaran.find((a) => a.Nama === trx["Pos Anggaran"]);
              const icon = pos?.Ikon || (isMasuk ? "💼" : "🛒");
              const iconBg = isMasuk
                ? isDark
                  ? "bg-green-900/40 border-green-800"
                  : "bg-green-50 border-green-100"
                : "bg-primary-surface-adaptive border-primary-soft-adaptive";

              return (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm border ${iconBg}`}
                    >
                      {icon}
                    </div>
                    <div>
                      <p
                        className={`font-bold text-sm ${isDark ? "text-white" : "text-gray-900"}`}
                      >
                        {trx.Catatan || trx["Pos Anggaran"]}
                      </p>
                      <p
                        className={`text-xs font-medium mt-0.5 ${isDark ? "text-gray-400" : "text-gray-500"}`}
                      >
                        {trx["Pos Anggaran"]} • {dateStr}
                      </p>
                    </div>
                  </div>
                  <p
                    className={`font-bold text-sm ${isMasuk ? "text-green-500" : isDark ? "text-gray-300" : "text-gray-900"}`}
                  >
                    {isMasuk ? "+" : "-"} Rp {nominalStr}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </section>

    </div>
  );
}

// Icon Helper
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
