import { useState, useEffect } from "react";
import { X, ChevronDown } from "lucide-react";
import { addTransaksi } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

export default function TambahTransaksi({
  isOpen,
  onClose,
  onSuccess,
  anggaran = [],
}) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [type, setType] = useState("pengeluaran"); // pengeluaran, pemasukan
  const [nominal, setNominal] = useState("");
  const [posAnggaran, setPosAnggaran] = useState("");
  const [tanggal, setTanggal] = useState("");
  const [catatan, setCatatan] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when opened
      setType("pengeluaran");
      setNominal("");
      setPosAnggaran("");
      setCatatan("");
      const today = new Date().toISOString().split("T")[0];
      setTanggal(today);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNominalChange = (e) => {
    let value = e.target.value.replace(/[^,\d]/g, "").toString();
    const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setNominal(formatted);
  };

  const handleSave = async () => {
    if (!nominal || !posAnggaran || !tanggal) {
      alert("Mohon isi nominal, pos anggaran, dan tanggal.");
      return;
    }

    setIsSubmitting(true);
    const nominalRaw = nominal.replace(/\./g, "");

    const data = {
      tanggal,
      tipe: type,
      pos_anggaran: posAnggaran,
      nominal: nominalRaw,
      catatan,
      familyId: user?.familyId || "",
      addedById: user?.id || "",
      addedByName: user?.nama || "",
    };

    const res = await addTransaksi(data);
    setIsSubmitting(false);

    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      alert("Gagal menyimpan transaksi: " + res.error);
    }
  };

  // Filter available Pos Anggaran based on selected Type
  const availablePos = anggaran.filter((pos) => {
    const posTipe = pos.Tipe || "pengeluaran"; // default to pengeluaran for old data
    return posTipe === type;
  });

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl ${isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
    >
      <header
        className={`flex justify-between items-center px-4 pt-8 pb-4 border-b ${isDark ? "border-gray-800 bg-gray-900" : "border-gray-100 bg-white"}`}
      >
        <h2 className="text-lg font-bold">Tambah Transaksi</h2>
        <button
          onClick={onClose}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
        {/* Tipe Transaksi (Segmented Control) */}
        <div className="px-4 mt-4">
          <div
            className={`p-1 rounded-xl flex gap-1 relative ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
          >
            <div
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-transform duration-300 ease-in-out ${isDark ? "bg-gray-700" : "bg-white"} ${type === "pemasukan" ? "translate-x-full" : "translate-x-0"}`}
            ></div>

            <button
              onClick={() => {
                setType("pengeluaran");
                setPosAnggaran("");
              }}
              className={`relative z-10 flex-1 text-sm py-2 transition-colors ${type === "pengeluaran" ? "font-bold text-red-500" : `font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}`}
            >
              Pengeluaran
            </button>
            <button
              onClick={() => {
                setType("pemasukan");
                setPosAnggaran("");
              }}
              className={`relative z-10 flex-1 text-sm py-2 transition-colors ${type === "pemasukan" ? "font-bold text-green-500" : `font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}`}
            >
              Pemasukan
            </button>
          </div>
        </div>

        {/* Input Nominal Giant */}
        <div className="px-4 mt-8 flex flex-col items-center">
          <p
            className={`text-xs font-bold uppercase tracking-wider mb-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
          >
            Nominal (Rp)
          </p>
          <input
            type="text"
            inputMode="numeric"
            value={nominal}
            onChange={handleNominalChange}
            className={`w-full text-center text-5xl font-bold bg-transparent outline-none ${isDark ? "text-white placeholder-gray-600" : "text-gray-900 placeholder-gray-300"}`}
            placeholder="0"
          />
        </div>

        <hr
          className={`mx-4 mt-8 mb-6 ${isDark ? "border-gray-800" : "border-gray-100"}`}
        />

        {/* Detail Form inputs */}
        <div className="px-4 flex flex-col gap-5">
          <div>
            <label
              className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              {type === "pengeluaran" ? "Pos Anggaran" : "Kategori Pemasukan"}
            </label>
            <div className="relative">
              <select
                value={posAnggaran}
                onChange={(e) => setPosAnggaran(e.target.value)}
                className={`w-full appearance-none border font-medium rounded-xl p-4 pr-10 outline-none focus:ring-2 focus-primary-theme transition ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
              >
                <option value="" disabled>
                  Pilih Kategori...
                </option>
                {availablePos.length > 0 ? (
                  availablePos.map((pos) => (
                    <option key={pos.ID} value={pos.Nama}>
                      {pos.Ikon} {pos.Nama}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>
                    -- Belum ada kategori untuk {type} --
                  </option>
                )}
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
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className={`w-full border font-medium rounded-xl p-4 outline-none focus:ring-2 focus-primary-theme transition ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
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
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Mis: Beli pampers ukuran L promo"
              className={`w-full border font-medium rounded-xl p-4 outline-none focus:ring-2 focus-primary-theme transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900"}`}
            />
          </div>
        </div>
      </div>

      <div
        className={`px-4 pt-4 pb-safe border-t mb-4 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}
      >
        <button
          onClick={handleSave}
          disabled={isSubmitting}
          className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all ${isSubmitting ? "bg-gray-400 text-gray-100 cursor-not-allowed shadow-none" : "btn-primary-theme shadow-primary-theme active:scale-[0.98]"}`}
        >
          {isSubmitting ? "Menyimpan..." : "Simpan Transaksi"}
        </button>
      </div>
    </div>
  );
}
