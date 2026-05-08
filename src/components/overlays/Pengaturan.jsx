import { useState, useEffect } from 'react';
import { ChevronLeft, Sparkles, Download } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function Pengaturan({ isOpen, onClose }) {
  const { isDark, setIsDark } = useTheme();
  const [pengingatHarian, setPengingatHarian] = useState(true);
  const [laporanMingguan, setLaporanMingguan] = useState(false);
  const [integrasiAI, setIntegrasiAI] = useState(() => {
    return localStorage.getItem('integrasiAI') !== 'false';
  });

  useEffect(() => {
    localStorage.setItem('integrasiAI', integrasiAI);
  }, [integrasiAI]);

  if (!isOpen) return null;

  const Toggle = ({ value, onChange, colorClass = 'bg-blue-600' }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? colorClass : isDark ? 'bg-gray-700' : 'bg-gray-200'}`}
    >
      <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${value ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
    </button>
  );

  return (
    <div className={`absolute inset-0 z-50 flex flex-col transform transition-all duration-300 ease-in-out shadow-2xl ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-4 pt-8 pb-4 border-b ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <button onClick={onClose} className={`w-8 h-8 -ml-2 rounded-full flex items-center justify-center transition ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold">Pengaturan</h2>
        <div className="w-8"></div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">

        {/* NOTIFIKASI */}
        <section className="px-4 mt-6">
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>NOTIFIKASI</h3>
          <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-50'}`}>
              <div>
                <p className="font-bold text-sm">Pengingat Harian</p>
                <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ingatkan untuk mencatat tiap jam 20:00</p>
              </div>
              <Toggle value={pengingatHarian} onChange={setPengingatHarian} />
            </div>
            <div className="flex items-center justify-between p-4">
              <div>
                <p className="font-bold text-sm">Laporan Mingguan</p>
                <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Kirim rekap evaluasi ke email</p>
              </div>
              <Toggle value={laporanMingguan} onChange={setLaporanMingguan} />
            </div>
          </div>
        </section>

        {/* KECERDASAN BUATAN (AI) */}
        <section className="px-4 mt-6">
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>KECERDASAN BUATAN (AI)</h3>
          <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 flex-shrink-0">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-bold text-sm">Integrasi Gemini AI</p>
                  <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Analisis pengeluaran & buat insight otomatis</p>
                </div>
              </div>
              <Toggle value={integrasiAI} onChange={setIntegrasiAI} colorClass="bg-purple-600" />
            </div>
          </div>
        </section>

        {/* TAMPILAN & DATA */}
        <section className="px-4 mt-6">
          <h3 className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>TAMPILAN & DATA</h3>
          <div className={`rounded-2xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
            <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-gray-700' : 'border-gray-50'}`}>
              <div>
                <p className="font-bold text-sm">Mode Gelap (Dark Mode)</p>
                <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Ganti tampilan ke tema gelap</p>
              </div>
              <Toggle value={isDark} onChange={setIsDark} colorClass="bg-indigo-600" />
            </div>
            <button className={`w-full flex items-center justify-between p-4 transition ${isDark ? 'hover:bg-gray-700 active:bg-gray-600' : 'hover:bg-gray-50 active:bg-gray-100'}`}>
              <div className="text-left">
                <p className="font-bold text-sm text-blue-500">Ekspor Data (CSV)</p>
                <p className={`text-xs font-medium mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Unduh data untuk dibuka di Excel/Spreadsheet</p>
              </div>
              <Download className="w-5 h-5 text-blue-500 flex-shrink-0" />
            </button>
          </div>
        </section>

      </div>
    </div>
  );
}
