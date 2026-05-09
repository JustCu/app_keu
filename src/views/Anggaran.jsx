import { useEffect, useMemo, useState, lazy, Suspense } from "react";
import { Edit2, Sparkles } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import { fetchAICategoryWeeklyHistory } from "../services/api";
import ScrollReveal from "../components/common/ScrollReveal";

const AnalisisKategori = lazy(
  () => import("../components/overlays/AnalisisKategori"),
);

const formatRupiah = (angka) => new Intl.NumberFormat("id-ID").format(angka);

export default function Anggaran({
  transaksi = [],
  anggaran = [],
  isLoading = false,
  onRefresh,
  onOpenAdd,
  onOpenEdit,
}) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [isAnalisaOpen, setIsAnalisaOpen] = useState(false);
  const [selectedAnalisaKategori, setSelectedAnalisaKategori] = useState(null);
  const [activeTab, setActiveTab] = useState("pengeluaran");
  const [aiEnabled, setAiEnabled] = useState(true);
  const [aiScoresByCategory, setAiScoresByCategory] = useState({});

  useEffect(() => {
    setAiEnabled(localStorage.getItem("integrasiAI") !== "false");
  }, []);

  useEffect(() => {
    if (!user?.familyId) {
      setAiScoresByCategory({});
      return;
    }

    let canceled = false;
    const loadHistory = async () => {
      const res = await fetchAICategoryWeeklyHistory(user.familyId, {
        weeks: 12,
      });
      if (canceled || !res.success) return;
      setAiScoresByCategory(res.data?.latestByCategory || {});
    };
    loadHistory();

    return () => {
      canceled = true;
    };
  }, [user?.familyId]);

  const { totalAnggaran, totalTerpakai, rincianPengeluaran, rincianPemasukan } =
    useMemo(() => {
      let tAnggaran = 0;
      let tTerpakai = 0;

      // Pisahkan berdasarkan tipe
      const listPengeluaran = anggaran.filter(
        (a) => !a.Tipe || a.Tipe === "pengeluaran",
      );
      const listPemasukan = anggaran.filter((a) => a.Tipe === "pemasukan");

      const defaultPengeluaran =
        listPengeluaran.length > 0
          ? listPengeluaran
          : [
              {
                ID: "default-1",
                Nama: "Kebutuhan Pokok",
                Batas: 2000000,
                Ikon: "🛒",
                Tipe: "pengeluaran",
              },
              {
                ID: "default-2",
                Nama: "Anak & Toddler",
                Batas: 1000000,
                Ikon: "👶",
                Tipe: "pengeluaran",
              },
              {
                ID: "default-3",
                Nama: "Tagihan Bulanan",
                Batas: 1500000,
                Ikon: "⚡",
                Tipe: "pengeluaran",
              },
              {
                ID: "default-4",
                Nama: "Rekreasi & Hobi",
                Batas: 500000,
                Ikon: "🎉",
                Tipe: "pengeluaran",
              },
            ];

      const pengeluaranMap = {};
      const pemasukanMap = {};
      transaksi.forEach((trx) => {
        const nominalRaw = String(trx.Nominal || "").replace(/[^0-9]/g, "");
        const nominal = parseInt(nominalRaw, 10) || 0;
        const pos = trx["Pos Anggaran"] || "Lainnya";

        if (trx.Tipe === "pengeluaran") {
          pengeluaranMap[pos] = (pengeluaranMap[pos] || 0) + nominal;
          tTerpakai += nominal;
        } else if (trx.Tipe === "pemasukan") {
          pemasukanMap[pos] = (pemasukanMap[pos] || 0) + nominal;
        }
      });

      const processItem = (pos, index, terpakaiTotal) => {
        const batasRaw = String(pos.Batas || "").replace(/[^0-9]/g, "");
        const batas = parseInt(batasRaw, 10) || 0;
        const percentage =
          batas > 0
            ? Math.min(Math.round((terpakaiTotal / batas) * 100), 100)
            : 0;

        const colors = [
          {
            bg: "bg-primary-theme",
            bar: "bg-primary-surface-strong-adaptive",
            iconBg: "bg-primary-surface-adaptive",
            iconBorder: "border-teal-100",
            text: "text-primary-adaptive",
          },
          {
            bg: "bg-primary-theme",
            bar: "bg-primary-surface-strong-adaptive",
            iconBg: "bg-primary-surface-adaptive",
            iconBorder: "border-teal-100",
            text: "text-primary-adaptive",
          },
          {
            bg: "semantic-warning-fill",
            bar: "semantic-warning-surface",
            iconBg: "semantic-warning-surface",
            iconBorder: "semantic-warning-border",
            text: "semantic-warning-text",
          },
          {
            bg: "semantic-success-fill",
            bar: "semantic-success-surface",
            iconBg: "semantic-success-surface",
            iconBorder: "semantic-success-border",
            text: "semantic-success-text",
          },
        ];
        const color = colors[index % colors.length];

        return {
          id: pos.ID,
          nama: pos.Nama,
          ikon: pos.Ikon || "💼",
          batas,
          terpakai: terpakaiTotal,
          sisa: Math.max(batas - terpakaiTotal, 0),
          percentage,
          color,
          tipe: pos.Tipe || "pengeluaran",
        };
      };

      const rincianPengeluaranFinal = defaultPengeluaran.map((pos, index) => {
        const terpakai = pengeluaranMap[pos.Nama] || 0;
        const processed = processItem(pos, index, terpakai);
        tAnggaran += processed.batas; // Only sum boundaries for pengeluaran
        return processed;
      });

      const rincianPemasukanFinal = listPemasukan.map((pos, index) => {
        const terkumpul = pemasukanMap[pos.Nama] || 0;
        return processItem(pos, index, terkumpul);
      });

      return {
        totalAnggaran: tAnggaran,
        totalTerpakai: tTerpakai,
        rincianPengeluaran: rincianPengeluaranFinal,
        rincianPemasukan: rincianPemasukanFinal,
      };
    }, [transaksi, anggaran]);

  const sisaAlokasi = Math.max(totalAnggaran - totalTerpakai, 0);
  const totalPercentage =
    totalAnggaran > 0
      ? Math.min(Math.round((totalTerpakai / totalAnggaran) * 100), 100)
      : 0;

  if (isLoading) {
    return <AnggaranLoadingSkeleton isDark={isDark} />;
  }

  const handleEdit = (pos) => {
    if (!pos.id || pos.id.startsWith("default-")) {
      alert(
        "Pos Anggaran bawaan tidak bisa diedit. Silakan buat pos anggaran baru.",
      );
      return;
    }
    onOpenEdit?.(pos);
  };

  const handleCloseModal = () => {}; // kept for safety

  const handleOpenAnalisa = (pos) => {
    setAiEnabled(localStorage.getItem("integrasiAI") !== "false");
    setSelectedAnalisaKategori(pos);
    setIsAnalisaOpen(true);
  };

  const getScoreBadgeClass = (score) => {
    if (typeof score !== "number") {
      return isDark
        ? "bg-gray-700 text-gray-400 border-gray-600"
        : "bg-gray-100 text-gray-500 border-gray-200";
    }
    if (score >= 80) return "overlay-success-soft border";
    if (score >= 60) return "overlay-warning-soft border";
    return "overlay-danger-soft border";
  };

  const getCategoryScore = (categoryName) => {
    const item = aiScoresByCategory?.[categoryName];
    if (!item) return null;
    const score = Number(item.score);
    return Number.isFinite(score) ? score : null;
  };

  return (
    <div>
      {/* Header Saldo Alokasi */}
      <section className="px-4 mt-4">
        <ScrollReveal delay={30} duration={620}>
          <div
            className={`${isDark ? "bg-gray-800" : "bg-gray-900"} rounded-2xl p-6 text-white shadow-lg flex flex-col justify-between relative overflow-hidden`}
          >
            <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-16 -mt-16"></div>

            <div className="relative z-10">
              <p className="text-gray-300 text-xs font-medium uppercase tracking-wider mb-1">
                Total Sisa Alokasi
              </p>
              <h2 className="text-3xl font-bold tracking-tight mb-4">
                Rp {formatRupiah(sisaAlokasi)}
              </h2>

              <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden mb-2">
                <div
                  className={`h-full rounded-full ${totalPercentage > 90 ? "semantic-danger-fill" : "semantic-success-fill"}`}
                  style={{ width: `${totalPercentage}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-400 text-right">
                Terpakai Rp {formatRupiah(totalTerpakai)} dari Rp{" "}
                {formatRupiah(totalAnggaran)}
              </p>
            </div>
          </div>
        </ScrollReveal>
      </section>

      {/* Daftar Anggaran & Target Pemasukan */}
      <section className="px-4 mt-6">
        <div className="flex justify-between items-center mb-4">
          <h2
            className={`text-base font-bold ${isDark ? "text-white" : "text-gray-900"}`}
          >
            Pos Kategori
          </h2>
          <button
            onClick={() => onOpenAdd?.()}
            className="text-sm font-medium text-primary-adaptive flex items-center gap-1 hover:text-primary-strong-adaptive transition"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M12 4v16m8-8H4"
              ></path>
            </svg>
            Tambah
          </button>
        </div>

        {/* Tab Control */}
        <div
          className={`p-1 rounded-xl flex gap-1 relative mb-4 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
        >
          <div
            className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-transform duration-300 ease-in-out ${isDark ? "bg-gray-700" : "bg-white"} ${activeTab === "pemasukan" ? "translate-x-full" : "translate-x-0"}`}
          ></div>

          <button
            onClick={() => setActiveTab("pengeluaran")}
            className={`relative z-10 flex-1 text-sm py-2 transition-colors ${activeTab === "pengeluaran" ? "semantic-danger-text font-bold" : `font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}`}
          >
            Pengeluaran
          </button>
          <button
            onClick={() => setActiveTab("pemasukan")}
            className={`relative z-10 flex-1 text-sm py-2 transition-colors ${activeTab === "pemasukan" ? "semantic-success-text font-bold" : `font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}`}
          >
            Pemasukan
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {activeTab === "pengeluaran" ? (
            rincianPengeluaran.map((pos, i) => (
              <ScrollReveal key={i} delay={80 + i * 70} duration={560} y={16}>
                <div
                  className={`p-4 rounded-2xl shadow-sm border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border ${isDark ? "bg-gray-700 border-gray-600" : `${pos.color.iconBg} ${pos.color.iconBorder}`}`}
                      >
                        {pos.ikon}
                      </div>
                      <div>
                        <p
                          className={`font-bold text-[15px] leading-tight ${isDark ? "text-white" : "text-gray-900"}`}
                        >
                          {pos.nama}
                        </p>
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                        >
                          Sisa Saldo
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${getScoreBadgeClass(getCategoryScore(pos.nama))}`}
                        title="Skor kesehatan AI mingguan"
                      >
                        {getCategoryScore(pos.nama) === null
                          ? "AI --"
                          : `AI ${getCategoryScore(pos.nama)}`}
                      </span>
                      <button
                        onClick={() => handleOpenAnalisa(pos)}
                        className={`p-1.5 rounded-lg transition ${isDark ? "text-primary-adaptive hover:text-primary-strong-adaptive hover:bg-primary-surface-adaptive" : "text-primary-adaptive hover:text-primary-strong-adaptive hover:bg-primary-surface-adaptive"}`}
                        title="Analisa AI"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(pos)}
                        className={`p-1.5 rounded-lg transition ${isDark ? "text-gray-500 hover:text-primary-adaptive hover:bg-primary-surface-adaptive" : "text-gray-400 hover:text-primary-adaptive hover:bg-primary-surface-adaptive"}`}
                        title="Edit kategori"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p
                    className={`font-bold text-[26px] leading-none mb-4 ${pos.percentage > 90 ? "semantic-danger-text" : pos.color.text}`}
                  >
                    Rp {formatRupiah(pos.sisa)}
                  </p>

                  <div
                    className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : pos.color.bar}`}
                  >
                    <div
                      className={`h-full rounded-full ${pos.percentage > 90 ? "semantic-danger-fill" : pos.color.bg}`}
                      style={{ width: `${pos.percentage}%` }}
                    ></div>
                  </div>
                  <div className="flex justify-between items-center mt-2">
                    <p
                      className={`text-xs font-medium ${pos.percentage > 90 ? "semantic-danger-text" : isDark ? "text-gray-400" : "text-gray-500"}`}
                    >
                      Terpakai Rp {formatRupiah(pos.terpakai)}
                    </p>
                    <p
                      className={`text-xs font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}
                    >
                      Anggaran Rp {formatRupiah(pos.batas)}
                    </p>
                  </div>
                </div>
              </ScrollReveal>
            ))
          ) : rincianPemasukan.length > 0 ? (
            rincianPemasukan.map((pos, i) => (
              <ScrollReveal key={i} delay={80 + i * 70} duration={560} y={16}>
                <div
                  className={`p-4 rounded-2xl shadow-sm border ${isDark ? "bg-gray-800 border-gray-700" : "bg-white border-gray-100"}`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-lg border ${isDark ? "bg-gray-700 border-gray-600" : `${pos.color.iconBg} ${pos.color.iconBorder}`}`}
                      >
                        {pos.ikon}
                      </div>
                      <div>
                        <p
                          className={`font-bold text-[15px] leading-tight ${isDark ? "text-white" : "text-gray-900"}`}
                        >
                          {pos.nama}
                        </p>
                        <p
                          className={`text-[10px] font-bold uppercase tracking-wide mt-1 ${isDark ? "text-gray-500" : "text-gray-400"}`}
                        >
                          {pos.batas > 0 ? "Terkumpul" : "Total Pemasukan"}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <span
                        className={`px-2 py-1 rounded-lg text-[11px] font-bold border ${getScoreBadgeClass(getCategoryScore(pos.nama))}`}
                        title="Skor kesehatan AI mingguan"
                      >
                        {getCategoryScore(pos.nama) === null
                          ? "AI --"
                          : `AI ${getCategoryScore(pos.nama)}`}
                      </span>
                      <button
                        onClick={() => handleOpenAnalisa(pos)}
                        className={`p-1.5 rounded-lg transition ${isDark ? "text-primary-adaptive hover:text-primary-strong-adaptive hover:bg-primary-surface-adaptive" : "text-primary-adaptive hover:text-primary-strong-adaptive hover:bg-primary-surface-adaptive"}`}
                        title="Analisa AI"
                      >
                        <Sparkles className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(pos)}
                        className={`p-1.5 rounded-lg transition ${isDark ? "text-gray-500 hover:semantic-success-text hover:semantic-success-surface" : "text-gray-400 hover:semantic-success-text hover:semantic-success-surface"}`}
                        title="Edit kategori"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <p className="semantic-success-text font-bold text-[26px] leading-none mb-4">
                    Rp {formatRupiah(pos.terpakai)}
                  </p>

                  {pos.batas > 0 && (
                    <>
                      <div
                        className={`w-full h-2.5 rounded-full overflow-hidden ${isDark ? "bg-gray-700" : pos.color.bar}`}
                      >
                        <div
                          className="semantic-success-fill h-full rounded-full"
                          style={{ width: `${pos.percentage}%` }}
                        ></div>
                      </div>
                      <div className="flex justify-between items-center mt-2">
                        <p className="semantic-success-text text-xs font-medium">
                          {pos.percentage}% Tercapai
                        </p>
                        <p
                          className={`text-xs font-medium ${isDark ? "text-gray-500" : "text-gray-400"}`}
                        >
                          Target Rp {formatRupiah(pos.batas)}
                        </p>
                      </div>
                    </>
                  )}
                </div>
              </ScrollReveal>
            ))
          ) : (
            <p
              className={`text-center text-sm py-4 ${isDark ? "text-gray-500" : "text-gray-400"}`}
            >
              Belum ada Kategori Pemasukan.
            </p>
          )}
        </div>
      </section>

      <Suspense fallback={null}>
        {isAnalisaOpen && (
          <AnalisisKategori
            isOpen={isAnalisaOpen}
            onClose={() => setIsAnalisaOpen(false)}
            category={selectedAnalisaKategori}
            aiEnabled={aiEnabled}
            onInsightSaved={(payload) => {
              if (!payload?.categoryName) return;
              setAiScoresByCategory((prev) => ({
                ...prev,
                [payload.categoryName]: {
                  score: Number(payload.score || 0),
                  source: payload.source || "RULE_BASED",
                  updatedAt: new Date().toISOString(),
                },
              }));
            }}
          />
        )}
      </Suspense>
    </div>
  );
}

function AnggaranLoadingSkeleton({ isDark }) {
  const surface = isDark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-100";
  const line = isDark ? "bg-white/10" : "bg-gray-200";
  const lineSoft = isDark ? "bg-white/7" : "bg-gray-100";

  return (
    <div className="animate-fade-up">
      <section className="px-4 mt-4">
        <div className="relative rounded-2xl p-6 overflow-hidden skeleton-shimmer bg-gradient-to-br from-slate-900 via-teal-950 to-slate-950 border border-white/8">
          <div className={`h-3 w-32 rounded-full ${lineSoft}`} />
          <div className={`mt-3 h-10 w-44 rounded-2xl ${line}`} />
          <div className={`mt-5 h-2 w-full rounded-full ${lineSoft}`} />
          <div className={`mt-2 h-2 w-2/3 rounded-full ${line}`} />
        </div>
      </section>

      <section className="px-4 mt-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className={`h-5 w-28 rounded-full ${line}`} />
          <div className={`h-4 w-16 rounded-full ${lineSoft}`} />
        </div>

        <div
          className={`p-1 rounded-xl flex gap-1 ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
        >
          <div className={`h-9 flex-1 rounded-lg ${line}`} />
          <div className={`h-9 flex-1 rounded-lg ${lineSoft}`} />
        </div>

        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className={`rounded-2xl border p-4 skeleton-shimmer ${surface}`}
              style={{ "--skeleton-delay": `${index * 140}ms` }}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full ${line}`} />
                  <div>
                    <div className={`h-4 w-28 rounded-full ${line}`} />
                    <div
                      className={`mt-2 h-2.5 w-20 rounded-full ${lineSoft}`}
                    />
                  </div>
                </div>
                <div className={`h-6 w-14 rounded-lg ${lineSoft}`} />
              </div>

              <div className={`h-8 w-36 rounded-2xl ${line} mb-4`} />
              <div className={`h-2.5 w-full rounded-full ${lineSoft}`} />
              <div className="mt-2 flex justify-between">
                <div className={`h-2.5 w-24 rounded-full ${line}`} />
                <div className={`h-2.5 w-24 rounded-full ${lineSoft}`} />
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
