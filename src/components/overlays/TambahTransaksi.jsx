import { useState, useEffect, useRef } from "react";
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
  const [shoppingItemsText, setShoppingItemsText] = useState("");
  const [shoppingParseInfo, setShoppingParseInfo] = useState("");
  const [useChecklistFormat, setUseChecklistFormat] = useState(false);
  const [showItemsSection, setShowItemsSection] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const catatanRef = useRef(null);

  const formatNominalDisplay = (value) =>
    String(value || "").replace(/\B(?=(\d{3})+(?!\d))/g, ".");

  const resizeTextarea = (el, maxRows = 2) => {
    if (!el) return;
    el.style.height = "auto";
    const computed = window.getComputedStyle(el);
    const lineHeight = parseFloat(computed.lineHeight) || 20;
    const verticalPadding = 16;
    const maxHeight = lineHeight * maxRows + verticalPadding;
    el.style.height = `${Math.min(el.scrollHeight, maxHeight)}px`;
  };

  const parseShoppingItems = (text) => {
    const lines = String(text || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);

    const parsed = lines.map((line) => {
      const qtyPriceMatch = line.match(/(\d+)\s*[x*]\s*rp?\s*([\d.,]+)/i);
      if (qtyPriceMatch) {
        const qty = Number(qtyPriceMatch[1] || 0);
        const unitPrice = Number(
          String(qtyPriceMatch[2] || "").replace(/[^\d]/g, "") || 0,
        );
        const amount = qty * unitPrice;
        return { raw: line, amount, hasAmount: amount > 0 };
      }

      const amountMatch = line.match(/rp?\s*([\d.,]+)|([\d][\d.,]*)/i);
      const amount = Number(
        String(
          (amountMatch && (amountMatch[1] || amountMatch[2])) || "",
        ).replace(/[^\d]/g, "") || 0,
      );
      return { raw: line, amount, hasAmount: amount > 0 };
    });

    const total = parsed.reduce((acc, item) => acc + (item.amount || 0), 0);
    const validCount = parsed.filter((item) => item.hasAmount).length;
    const invalidCount = parsed.length - validCount;

    return { parsed, total, validCount, invalidCount };
  };

  const handleApplyShoppingTotal = () => {
    const { total, validCount, invalidCount } =
      parseShoppingItems(shoppingItemsText);
    if (validCount === 0) {
      setShoppingParseInfo(
        "Belum ada nominal item yang terdeteksi. Gunakan format contoh: Minyak goreng 24.000",
      );
      return;
    }

    setNominal(formatNominalDisplay(total));
    setShoppingParseInfo(
      invalidCount > 0
        ? `Total dari ${validCount} item diterapkan ke nominal. ${invalidCount} item tanpa angka dilewati.`
        : `Total dari ${validCount} item diterapkan ke nominal.`,
    );
  };

  const handleAppendShoppingToCatatan = () => {
    const { parsed } = parseShoppingItems(shoppingItemsText);
    if (parsed.length === 0) {
      setShoppingParseInfo(
        "Tambahkan minimal satu item belanja terlebih dahulu.",
      );
      return;
    }

    let itemLines;
    if (useChecklistFormat) {
      // Format checklist dengan ☐
      itemLines = parsed.map((item) => {
        if (!item.hasAmount) return `☐ ${item.raw}`;
        return `☐ ${item.raw} (Rp ${formatNominalDisplay(item.amount)})`;
      });
    } else {
      // Format list biasa dengan -
      itemLines = parsed.map((item) => {
        if (!item.hasAmount) return `- ${item.raw}`;
        return `- ${item.raw} (Rp ${formatNominalDisplay(item.amount)})`;
      });
    }

    setCatatan((prev) => {
      const prefix = prev.trim() ? `${prev.trim()}\n` : "";
      return `${prefix}Daftar belanja:\n${itemLines.join("\n")}`;
    });
    setShoppingParseInfo("Daftar item berhasil dimasukkan ke catatan.");
  };

  useEffect(() => {
    if (isOpen) {
      // Reset form when opened
      setType("pengeluaran");
      setNominal("");
      setPosAnggaran("");
      setCatatan("");
      setShoppingItemsText("");
      setShoppingParseInfo("");
      setUseChecklistFormat(false);
      setShowItemsSection(false);
      const today = new Date().toISOString().split("T")[0];
      setTanggal(today);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!catatanRef.current) return;
    resizeTextarea(catatanRef.current, 2);
  }, [catatan]);

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
          className="overlay-muted-button w-8 h-8 rounded-full flex items-center justify-center transition"
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
                className="overlay-control w-full appearance-none font-medium rounded-xl p-4 pr-10 focus:ring-2"
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
              className="overlay-control w-full font-medium rounded-xl p-4 focus:ring-2"
            />
          </div>

          <div>
            <label
              className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
            >
              Catatan (Opsional)
            </label>
            <textarea
              ref={catatanRef}
              rows={1}
              value={catatan}
              onChange={(e) => {
                setCatatan(e.target.value);
                resizeTextarea(e.target, 2);
              }}
              placeholder="Mis: Beli pampers ukuran L promo"
              className="overlay-control w-full font-medium rounded-xl p-4 focus:ring-2 resize-none overflow-y-auto leading-5"
            />
          </div>

          {type === "pengeluaran" && (
            <div>
              <label
                className={`block text-sm font-bold mb-2 ${isDark ? "text-gray-300" : "text-gray-700"}`}
              >
                Daftar Item Belanja (Opsional)
              </label>
              <textarea
                rows={5}
                value={shoppingItemsText}
                onChange={(e) => {
                  setShoppingItemsText(e.target.value);
                  setShowItemsSection(true);
                  setShoppingParseInfo("");
                }}
                onFocus={() => setShowItemsSection(true)}
                placeholder={
                  "Contoh:\nMinyak goreng 24.000\nBeras 5kg 78.000\n2x Susu 18.500"
                }
                className="overlay-control w-full font-medium rounded-xl p-4 focus:ring-2 resize-y min-h-[110px]"
              />
              <p
                className={`text-[11px] mt-2 ${isDark ? "text-gray-400" : "text-gray-500"}`}
              >
                Isi satu item per baris. Sistem akan mencoba membaca nominal di
                tiap baris.
              </p>

              {(showItemsSection || shoppingItemsText.trim().length > 0) && (
                <>
                  <div className="mt-4 flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="checklistFormat"
                      checked={useChecklistFormat}
                      onChange={(e) => setUseChecklistFormat(e.target.checked)}
                      className="w-4 h-4 rounded cursor-pointer"
                    />
                    <label
                      htmlFor="checklistFormat"
                      className={`text-sm font-medium cursor-pointer ${isDark ? "text-gray-300" : "text-gray-700"}`}
                    >
                      Simpan item belanja sebagai checklist
                    </label>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={handleApplyShoppingTotal}
                      className={`rounded-lg px-3 py-2 text-xs font-bold border transition ${
                        isDark
                          ? "border-gray-700 text-gray-100 hover:bg-gray-800"
                          : "border-gray-200 text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      Hitung Total
                    </button>
                    <button
                      type="button"
                      onClick={handleAppendShoppingToCatatan}
                      className={`rounded-lg px-3 py-2 text-xs font-bold border transition ${
                        isDark
                          ? "border-gray-700 text-gray-100 hover:bg-gray-800"
                          : "border-gray-200 text-gray-800 hover:bg-gray-50"
                      }`}
                    >
                      Ke Catatan
                    </button>
                  </div>
                  {shoppingParseInfo && (
                    <p
                      className={`text-xs mt-2 ${
                        shoppingParseInfo.includes("berhasil") ||
                        shoppingParseInfo.includes("diterapkan")
                          ? isDark
                            ? "text-emerald-300"
                            : "text-emerald-700"
                          : isDark
                            ? "text-amber-300"
                            : "text-amber-700"
                      }`}
                    >
                      {shoppingParseInfo}
                    </p>
                  )}
                </>
              )}
            </div>
          )}
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
