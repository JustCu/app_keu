import { useState, useMemo, useEffect } from 'react';
import { ChevronLeft, Filter, ChevronRight, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

export default function SemuaTransaksi({ isOpen, onClose, transaksi = [], anggaran = [] }) {
  const { isDark } = useTheme();
  
  const currentMonthKey = useMemo(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState(currentMonthKey);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  // Reset page when month changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedMonth]);

  const formatRupiah = (angka) => {
    return new Intl.NumberFormat('id-ID').format(angka);
  };

  // 1. Extract unique months for dropdown
  const monthsForDropdown = useMemo(() => {
    const monthSet = new Set();
    transaksi.forEach(trx => {
      const d = new Date(trx.Tanggal);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const n = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      monthSet.add(JSON.stringify({ key: k, name: n }));
    });
    
    // Add current month if it's not in the data yet
    const d = new Date();
    const currentName = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
    monthSet.add(JSON.stringify({ key: currentMonthKey, name: currentName }));

    return Array.from(monthSet)
      .map(s => JSON.parse(s))
      .sort((a, b) => b.key.localeCompare(a.key));
  }, [transaksi, currentMonthKey]);

  // 2. Filter & Sort Transactions
  const filteredTransactions = useMemo(() => {
    let filtered = transaksi;
    if (selectedMonth !== 'Semua') {
      filtered = transaksi.filter(trx => {
        const d = new Date(trx.Tanggal);
        const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        return k === selectedMonth;
      });
    }
    // Sort descending by date
    return filtered.sort((a, b) => new Date(b.Tanggal) - new Date(a.Tanggal));
  }, [transaksi, selectedMonth]);

  // 3. Pagination
  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / ITEMS_PER_PAGE));
  const pageData = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredTransactions.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredTransactions, currentPage]);

  // 4. Group current page data
  const groupedPageData = useMemo(() => {
    const groups = {};
    pageData.forEach(trx => {
      const d = new Date(trx.Tanggal);
      const k = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const n = d.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' });
      if (!groups[k]) groups[k] = { key: k, name: n, items: [] };
      groups[k].items.push(trx);
    });
    return Object.values(groups).sort((a, b) => b.key.localeCompare(a.key));
  }, [pageData]);

  if (!isOpen) return null;

  const bg = isDark ? 'bg-gray-900' : 'bg-gray-50';
  const headerBg = isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100';
  const textPrimary = isDark ? 'text-white' : 'text-gray-900';
  const textSecondary = isDark ? 'text-gray-400' : 'text-gray-500';

  return (
    <div className={`absolute inset-0 z-50 flex flex-col ${bg} transition-colors duration-300`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-4 pt-8 pb-4 border-b ${headerBg} shadow-sm z-10`}>
        <div className="flex items-center gap-3">
          <button onClick={onClose} className={`w-8 h-8 -ml-2 rounded-full flex items-center justify-center transition ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>
            <ChevronLeft className="w-6 h-6" />
          </button>
          <h2 className={`text-lg font-bold ${textPrimary}`}>Semua Transaksi</h2>
        </div>
      </header>

      {/* Filter Dropdown Section */}
      <div className={`px-4 py-4 border-b ${headerBg}`}>
        <div className="relative">
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className={`w-full appearance-none rounded-xl px-4 py-3 text-sm font-bold border focus:outline-none focus:ring-2 focus:ring-blue-500 transition ${isDark ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'}`}
          >
            <option value="Semua">Semua Bulan</option>
            {monthsForDropdown.map(m => (
              <option key={m.key} value={m.key}>{m.name}</option>
            ))}
          </select>
          <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none ${textSecondary}`}>
            <ChevronDown className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar pb-6 relative">
        {groupedPageData.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50 gap-3 pt-20">
            <Filter className={`w-10 h-10 ${textSecondary}`} />
            <p className={`text-sm font-medium ${textSecondary}`}>Tidak ada transaksi.</p>
          </div>
        ) : (
          groupedPageData.map(group => (
            <div key={group.key} className="mb-6 mt-4">
              <h3 className={`px-4 text-xs font-bold uppercase tracking-wider mb-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                {group.name}
              </h3>
              <div className={`mx-4 rounded-2xl shadow-sm border overflow-hidden ${isDark ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-100'}`}>
                {group.items.map((trx, index) => {
                  const isMasuk = trx.Tipe === 'pemasukan';
                  const nominalStr = formatRupiah(String(trx.Nominal || '').replace(/[^0-9]/g, ''));
                  const dateStr = new Date(trx.Tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
                  
                  const pos = anggaran.find(a => a.Nama === trx['Pos Anggaran']);
                  const icon = pos?.Ikon || (isMasuk ? '💼' : '🛒');
                  const iconBg = isMasuk 
                    ? (isDark ? 'bg-green-900/40 border-green-800 text-green-400' : 'bg-green-50 border-green-100 text-green-600')
                    : (isDark ? 'bg-indigo-900/40 border-indigo-800 text-indigo-400' : 'bg-indigo-50 border-indigo-100 text-indigo-600');

                  return (
                    <div key={trx.ID || index} className={`flex justify-between items-center p-4 ${index < group.items.length - 1 ? `border-b ${isDark ? 'border-gray-700' : 'border-gray-50'}` : ''}`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg shadow-sm border ${iconBg}`}>
                          {icon}
                        </div>
                        <div>
                          <p className={`font-bold text-sm ${textPrimary}`}>{trx.Catatan || trx['Pos Anggaran']}</p>
                          <p className={`text-[11px] font-medium mt-0.5 ${textSecondary}`}>{trx['Pos Anggaran']} • {dateStr}</p>
                        </div>
                      </div>
                      <p className={`font-bold text-sm ${isMasuk ? 'text-green-500' : isDark ? 'text-gray-300' : 'text-gray-900'}`}>
                        {isMasuk ? '+' : '-'} Rp {nominalStr}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className={`px-4 py-4 border-t ${headerBg} flex items-center justify-between`}>
          <button 
            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
            disabled={currentPage === 1}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              currentPage === 1 
                ? (isDark ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-300') 
                : (isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 shadow-sm')
            }`}
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          
          <span className={`text-sm font-bold ${textSecondary}`}>
            Hal {currentPage} <span className="font-medium opacity-60">dari</span> {totalPages}
          </span>
          
          <button 
            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
            disabled={currentPage === totalPages}
            className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
              currentPage === totalPages 
                ? (isDark ? 'bg-gray-800 text-gray-600' : 'bg-gray-100 text-gray-300') 
                : (isDark ? 'bg-gray-700 text-white hover:bg-gray-600' : 'bg-white border border-gray-200 text-gray-900 hover:bg-gray-50 shadow-sm')
            }`}
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  );
}
