import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { addAnggaran, editAnggaran } from "../../services/api";
import { useAuth } from "../../context/AuthContext";
import { useTheme } from "../../context/ThemeContext";

const formatRupiah = (angka) => {
  return new Intl.NumberFormat("id-ID").format(angka);
};

export default function TambahAnggaran({
  isOpen,
  onClose,
  onSuccess,
  editData,
}) {
  const { user } = useAuth();
  const { isDark } = useTheme();
  const [tipe, setTipe] = useState("pengeluaran"); // pengeluaran, pemasukan
  const [nama, setNama] = useState("");
  const [batas, setBatas] = useState("");
  const [ikon, setIkon] = useState("🛒");
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (editData) {
        setTipe(editData.tipe || "pengeluaran");
        setNama(editData.nama || "");
        setBatas(editData.batas ? formatRupiah(editData.batas) : "");
        setIkon(editData.ikon || "🛒");
      } else {
        setTipe("pengeluaran");
        setNama("");
        setBatas("");
        setIkon("🛒");
      }
    }
  }, [isOpen, editData]);

  if (!isOpen) return null;

  const handleBatasChange = (e) => {
    let value = e.target.value.replace(/[^,\d]/g, "").toString();
    const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
    setBatas(formatted);
  };

  const handleSave = async () => {
    if (!nama) {
      alert("Mohon isi nama pos.");
      return;
    }

    // Batas can be optional for pemasukan
    if (tipe === "pengeluaran" && !batas) {
      alert("Mohon isi batas anggaran.");
      return;
    }

    setIsSubmitting(true);
    const batasRaw = batas ? batas.replace(/\./g, "") : "0";

    const data = {
      tipe,
      nama,
      batas: batasRaw,
      ikon,
      familyId: user?.familyId || "",
      addedById: user?.id || "",
      addedByName: user?.nama || "",
      editedById: user?.id || "",
      editedByName: user?.nama || "",
    };

    let res;
    if (editData && editData.id) {
      data.id = editData.id;
      res = await editAnggaran(data);
    } else {
      res = await addAnggaran(data);
    }

    setIsSubmitting(false);

    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      alert(
        `Gagal ${editData ? "mengubah" : "menambah"} anggaran: ` + res.error,
      );
    }
  };

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl ${isDark ? "bg-gray-900 text-white" : "bg-white text-gray-900"}`}
    >
      <header
        className={`flex justify-between items-center px-4 pt-8 pb-4 border-b ${isDark ? "border-gray-800 bg-gray-900" : "border-gray-100 bg-white"}`}
      >
        <h2 className="text-lg font-bold">
          {editData ? "Edit" : "Tambah"} Pos Kategori
        </h2>
        <button
          onClick={onClose}
          className={`w-8 h-8 rounded-full flex items-center justify-center transition ${isDark ? "bg-gray-800 text-gray-300 hover:bg-gray-700" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
          disabled={isSubmitting}
        >
          <X className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-8 px-4 mt-4">
        {/* Tipe Kategori (Segmented Control) */}
        <div className="mb-6">
          <div
            className={`p-1 rounded-xl flex gap-1 relative ${isDark ? "bg-gray-800" : "bg-gray-100"}`}
          >
            <div
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] rounded-lg shadow-sm transition-transform duration-300 ease-in-out ${isDark ? "bg-gray-700" : "bg-white"} ${tipe === "pemasukan" ? "translate-x-full" : "translate-x-0"}`}
            ></div>

            <button
              onClick={() => setTipe("pengeluaran")}
              className={`relative z-10 flex-1 text-sm py-2 transition-colors ${tipe === "pengeluaran" ? "font-bold text-red-500" : `font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}`}
            >
              Pengeluaran
            </button>
            <button
              onClick={() => setTipe("pemasukan")}
              className={`relative z-10 flex-1 text-sm py-2 transition-colors ${tipe === "pemasukan" ? "font-bold text-green-500" : `font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}`}
            >
              Pemasukan
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-5">
          <div>
            <label
              className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              Nama{" "}
              {tipe === "pengeluaran" ? "Pos Anggaran" : "Kategori Pemasukan"}
            </label>
            <input
              type="text"
              value={nama}
              onChange={(e) => setNama(e.target.value)}
              placeholder={`Mis: ${tipe === "pengeluaran" ? "Kebutuhan Pokok" : "Gaji Utama"}`}
              className={`w-full border font-medium rounded-xl p-4 outline-none focus:ring-2 focus-primary-theme transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900"}`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              {tipe === "pengeluaran"
                ? "Batas Anggaran Bulanan (Rp)"
                : "Target Pemasukan Bulanan (Opsional) (Rp)"}
            </label>
            <input
              type="text"
              inputMode="numeric"
              value={batas}
              onChange={handleBatasChange}
              placeholder="0"
              className={`w-full border font-medium rounded-xl p-4 outline-none focus:ring-2 focus-primary-theme transition ${isDark ? "bg-gray-800 border-gray-700 text-white" : "bg-gray-50 border-gray-200 text-gray-900"}`}
            />
          </div>

          <div>
            <label
              className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              Ikon (Emoji)
            </label>
            <div className="flex gap-4 items-center mb-3">
              <div
                className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl border shrink-0 shadow-inner ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-100 border-gray-200"}`}
              >
                {ikon || "❓"}
              </div>
              <input
                type="text"
                value={ikon}
                onChange={(e) => setIkon(e.target.value)}
                placeholder="Ketik/Pilih emoji..."
                maxLength={2}
                className={`w-full border font-medium rounded-xl p-4 outline-none focus:ring-2 focus-primary-theme transition ${isDark ? "bg-gray-800 border-gray-700 text-white placeholder-gray-500" : "bg-gray-50 border-gray-200 text-gray-900"}`}
              />
            </div>

            {/* Pilihan Cepat Emoji */}
            <div
              className={`border rounded-xl p-3 ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}
            >
              <p
                className={`text-[10px] font-bold uppercase tracking-widest mb-2 ${isDark ? "text-gray-500" : "text-gray-400"}`}
              >
                Pilihan Cepat
              </p>
              <div className="grid grid-cols-6 gap-2">
                {[
                  "🛒",
                  "👶",
                  "⚡",
                  "🎉",
                  "🍔",
                  "🚗",
                  "🏥",
                  "🏠",
                  "📚",
                  "🎁",
                  "👗",
                  "🎮",
                  "✈️",
                  "📱",
                  "💸",
                  "☕",
                  "💡",
                  "🐶",
                ].map((emoji, idx) => (
                  <button
                    key={idx}
                    onClick={() => setIkon(emoji)}
                    className={`h-10 text-xl rounded-lg flex items-center justify-center transition-all ${ikon === emoji ? "bg-primary-surface-strong-adaptive border-primary-soft-adaptive border shadow-sm" : isDark ? "hover:bg-gray-700 bg-gray-900 border border-gray-700" : "hover:bg-gray-200 bg-white border border-gray-100"}`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
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
          {isSubmitting
            ? "Menyimpan..."
            : editData
              ? "Simpan Perubahan"
              : "Simpan Pos Anggaran"}
        </button>
      </div>
    </div>
  );
}
