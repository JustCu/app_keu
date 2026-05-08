import { useState, useEffect } from 'react';
import { X, ChevronDown } from 'lucide-react';
import { addTransaksi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

export default function TambahTransaksi({ isOpen, onClose, onSuccess, anggaran = [] }) {
  const { user } = useAuth();
  const [type, setType] = useState('pengeluaran'); // pengeluaran, pemasukan
  const [nominal, setNominal] = useState('');
  const [posAnggaran, setPosAnggaran] = useState('');
  const [tanggal, setTanggal] = useState('');
  const [catatan, setCatatan] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Reset form when opened
      setType('pengeluaran');
      setNominal('');
      setPosAnggaran('');
      setCatatan('');
      const today = new Date().toISOString().split('T')[0];
      setTanggal(today);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleNominalChange = (e) => {
    let value = e.target.value.replace(/[^,\d]/g, '').toString();
    const formatted = value.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    setNominal(formatted);
  };

  const handleSave = async () => {
    if (!nominal || !posAnggaran || !tanggal) {
      alert('Mohon isi nominal, pos anggaran, dan tanggal.');
      return;
    }

    setIsSubmitting(true);
    const nominalRaw = nominal.replace(/\./g, '');

    const data = {
      tanggal,
      tipe: type,
      pos_anggaran: posAnggaran,
      nominal: nominalRaw,
      catatan,
      familyId: user?.familyId || '',
      addedById: user?.id || '',
      addedByName: user?.nama || ''
    };

    const res = await addTransaksi(data);
    setIsSubmitting(false);

    if (res.success) {
      if (onSuccess) onSuccess();
    } else {
      alert('Gagal menyimpan transaksi: ' + res.error);
    }
  };

  // Filter available Pos Anggaran based on selected Type
  const availablePos = anggaran.filter(pos => {
    const posTipe = pos.Tipe || 'pengeluaran'; // default to pengeluaran for old data
    return posTipe === type;
  });

  return (
    <div className="absolute inset-0 z-50 bg-white flex flex-col transform transition-transform duration-300 ease-in-out shadow-2xl">
      <header className="flex justify-between items-center px-4 pt-8 pb-4 border-b border-gray-100 bg-white">
        <h2 className="text-lg font-bold text-gray-900">Tambah Transaksi</h2>
        <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-200 transition" disabled={isSubmitting}>
          <X className="w-5 h-5" />
        </button>
      </header>
      
      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
        
        {/* Tipe Transaksi (Segmented Control) */}
        <div className="px-4 mt-4">
          <div className="bg-gray-100 p-1 rounded-xl flex gap-1 relative">
            <div 
              className={`absolute top-1 bottom-1 left-1 w-[calc(50%-4px)] bg-white rounded-lg shadow-sm transition-transform duration-300 ease-in-out ${type === 'pemasukan' ? 'translate-x-full' : 'translate-x-0'}`}
            ></div>
            
            <button 
              onClick={() => { setType('pengeluaran'); setPosAnggaran(''); }} 
              className={`relative z-10 flex-1 text-sm py-2 transition-colors ${type === 'pengeluaran' ? 'font-bold text-red-600' : 'font-medium text-gray-500'}`}
            >
              Pengeluaran
            </button>
            <button 
              onClick={() => { setType('pemasukan'); setPosAnggaran(''); }} 
              className={`relative z-10 flex-1 text-sm py-2 transition-colors ${type === 'pemasukan' ? 'font-bold text-green-600' : 'font-medium text-gray-500'}`}
            >
              Pemasukan
            </button>
          </div>
        </div>

        {/* Input Nominal Giant */}
        <div className="px-4 mt-8 flex flex-col items-center">
          <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-2">Nominal (Rp)</p>
          <input 
            type="text" 
            inputMode="numeric" 
            value={nominal}
            onChange={handleNominalChange}
            className="w-full text-center text-5xl font-bold text-gray-900 bg-transparent outline-none placeholder-gray-300" 
            placeholder="0"
          />
        </div>

        <hr className="mx-4 mt-8 mb-6 border-gray-100" />

        {/* Detail Form inputs */}
        <div className="px-4 flex flex-col gap-5">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">
              {type === 'pengeluaran' ? 'Pos Anggaran' : 'Kategori Pemasukan'}
            </label>
            <div className="relative">
              <select 
                value={posAnggaran}
                onChange={(e) => setPosAnggaran(e.target.value)}
                className="w-full appearance-none bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-xl p-4 pr-10 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
              >
                <option value="" disabled>Pilih Kategori...</option>
                {availablePos.length > 0 ? (
                  availablePos.map((pos) => (
                    <option key={pos.ID} value={pos.Nama}>
                      {pos.Ikon} {pos.Nama}
                    </option>
                  ))
                ) : (
                  <option value="" disabled>-- Belum ada kategori untuk {type} --</option>
                )}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-gray-500">
                <ChevronDown className="w-4 h-4" />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Tanggal</label>
            <input 
              type="date" 
              value={tanggal}
              onChange={(e) => setTanggal(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" 
            />
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Catatan (Opsional)</label>
            <input 
              type="text" 
              value={catatan}
              onChange={(e) => setCatatan(e.target.value)}
              placeholder="Mis: Beli pampers ukuran L promo" 
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 font-medium rounded-xl p-4 outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition" 
            />
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-safe bg-white border-t border-gray-100 mb-4">
        <button 
          onClick={handleSave}
          disabled={isSubmitting}
          className={`w-full font-bold py-4 rounded-xl shadow-lg transition-all ${isSubmitting ? 'bg-gray-400 text-gray-100 cursor-not-allowed shadow-none' : 'bg-blue-600 text-white shadow-blue-600/30 hover:bg-blue-700 active:scale-[0.98]'}`}
        >
          {isSubmitting ? 'Menyimpan...' : 'Simpan Transaksi'}
        </button>
      </div>
    </div>
  );
}
