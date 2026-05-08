import { useState, useMemo } from 'react';
import { ChevronLeft, Lightbulb, AlertTriangle, CalendarDays, CheckCheck } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const formatRupiah = (n) => new Intl.NumberFormat('id-ID').format(n);
const formatRupiahPendek = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'jt';
  if (n >= 1000) return (n / 1000).toFixed(0) + 'rb';
  return n;
};

function generateNotifications(transaksi, anggaran) {
  const notifs = [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  // Helper: filter transaksi bulan ini
  const thisMonth = transaksi.filter(t => {
    const d = new Date(t.Tanggal);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  // Helper: filter transaksi minggu ini (7 hari terakhir)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const thisWeek = transaksi.filter(t => new Date(t.Tanggal) >= sevenDaysAgo);

  // === NOTIF 1: Anggaran menipis (< 20% sisa) ===
  const posKeluar = anggaran.filter(a => (a.Tipe || 'pengeluaran') === 'pengeluaran');
  posKeluar.forEach(pos => {
    const batas = parseInt(String(pos.Batas || pos['Batas Anggaran'] || '0').replace(/[^0-9]/g, ''), 10) || 0;
    if (!batas) return;

    const terpakai = thisMonth
      .filter(t => t['Pos Anggaran'] === pos.Nama && t.Tipe === 'pengeluaran')
      .reduce((sum, t) => sum + (parseInt(String(t.Nominal).replace(/[^0-9]/g, ''), 10) || 0), 0);

    const sisa = batas - terpakai;
    const persenSisa = batas > 0 ? (sisa / batas) * 100 : 100;

    if (persenSisa <= 20 && persenSisa >= 0) {
      notifs.push({
        id: `anggaran-menipis-${pos.ID || pos.Nama}`,
        type: 'warning',
        title: `Anggaran ${pos.Nama} Menipis!`,
        body: (
          <>
            Sisa anggaran <strong>{pos.Nama}</strong> tersisa Rp {formatRupiah(sisa)} ({Math.round(persenSisa)}%). Harap perhatikan pengeluaran untuk pos ini.
          </>
        ),
        time: '10 mnt lalu',
        isNew: true,
      });
    }
  });

  // === NOTIF 2: Insight mingguan ===
  const pengeluaranMinggu = thisWeek.filter(t => t.Tipe === 'pengeluaran');
  if (pengeluaranMinggu.length > 0) {
    const totalKeluar = pengeluaranMinggu.reduce((s, t) => s + (parseInt(String(t.Nominal).replace(/[^0-9]/g, ''), 10) || 0), 0);
    const perPos = {};
    pengeluaranMinggu.forEach(t => {
      const pos = t['Pos Anggaran'] || 'Lainnya';
      perPos[pos] = (perPos[pos] || 0) + (parseInt(String(t.Nominal).replace(/[^0-9]/g, ''), 10) || 0);
    });
    const topPos = Object.entries(perPos).sort((a, b) => b[1] - a[1])[0];
    const persen = topPos ? Math.round((topPos[1] / totalKeluar) * 100) : 0;

    notifs.unshift({
      id: 'insight-mingguan',
      type: 'insight',
      title: 'Insight Mingguan Anda',
      body: topPos ? (
        <>
          Pengeluaran <strong>{topPos[0]}</strong> menyumbang porsi terbesar ({persen}%) minggu ini. Total pengeluaran Rp {formatRupiahPendek(totalKeluar)}.
        </>
      ) : 'Belum ada pengeluaran minggu ini.',
      link: 'LIHAT LAPORAN LENGKAP →',
      time: 'Baru',
      isNew: true,
    });
  }

  // === NOTIF 3: Rekap bulan lalu ===
  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const lastMonth = transaksi.filter(t => {
    const d = new Date(t.Tanggal);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  if (lastMonth.length > 0) {
    const totalMasukLalu = lastMonth.filter(t => t.Tipe === 'pemasukan').reduce((s, t) => s + (parseInt(String(t.Nominal).replace(/[^0-9]/g, ''), 10) || 0), 0);
    const totalKeluarLalu = lastMonth.filter(t => t.Tipe === 'pengeluaran').reduce((s, t) => s + (parseInt(String(t.Nominal).replace(/[^0-9]/g, ''), 10) || 0), 0);
    const tabungan = totalMasukLalu - totalKeluarLalu;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

    notifs.push({
      id: 'rekap-bulanan',
      type: 'calendar',
      title: `Rekap ${monthNames[prevMonth]} Tersedia`,
      body: (
        <>
          Seluruh pencatatan bulan {monthNames[prevMonth]} {prevYear} telah dirangkum. {tabungan > 0 ? `Rata-rata Anda berhasil menghemat Rp ${formatRupiahPendek(tabungan)} bulan lalu.` : 'Pengeluaran Anda melebihi pemasukan bulan lalu.'}
        </>
      ),
      time: `1 ${monthNames[prevMonth]}`,
      isNew: false,
    });
  }

  return notifs;
}

export default function Notifikasi({ isOpen, onClose, transaksi = [], anggaran = [] }) {
  const { isDark } = useTheme();
  const [readIds, setReadIds] = useState([]);

  const notifications = useMemo(() => generateNotifications(transaksi, anggaran), [transaksi, anggaran]);

  const unreadCount = notifications.filter(n => n.isNew && !readIds.includes(n.id)).length;

  const markAllRead = () => {
    setReadIds(notifications.map(n => n.id));
  };

  if (!isOpen) return null;

  const iconConfig = {
    insight: {
      bg: isDark ? 'bg-yellow-900/40' : 'bg-yellow-50',
      text: 'text-yellow-500',
      Icon: Lightbulb,
      border: 'border-l-4 border-indigo-400'
    },
    warning: {
      bg: isDark ? 'bg-red-900/40' : 'bg-red-50',
      text: 'text-red-500',
      Icon: AlertTriangle,
      border: ''
    },
    calendar: {
      bg: isDark ? 'bg-blue-900/40' : 'bg-blue-50',
      text: 'text-blue-500',
      Icon: CalendarDays,
      border: ''
    },
  };

  return (
    <div className={`absolute inset-0 z-50 flex flex-col transition-colors duration-300 ${isDark ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <header className={`flex items-center justify-between px-4 pt-8 pb-4 border-b ${isDark ? 'bg-gray-900 border-gray-800' : 'bg-white border-gray-100'}`}>
        <button onClick={onClose} className={`w-8 h-8 -ml-2 rounded-full flex items-center justify-center transition ${isDark ? 'text-gray-300 hover:bg-gray-800' : 'text-gray-600 hover:bg-gray-100'}`}>
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold">Notifikasi</h2>
        <button
          onClick={markAllRead}
          className={`text-xs font-bold transition ${unreadCount > 0 ? 'text-blue-500 hover:text-blue-600' : isDark ? 'text-gray-600' : 'text-gray-300'}`}
          disabled={unreadCount === 0}
        >
          <span className="flex items-center gap-1">
            <CheckCheck className="w-3.5 h-3.5" />
            TANDAI DIBACA
          </span>
        </button>
      </header>

      {/* List */}
      <div className="flex-1 overflow-y-auto no-scrollbar">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full opacity-50 gap-3">
            <CheckCheck className="w-10 h-10 text-gray-400" />
            <p className={`text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Semua notifikasi sudah dibaca</p>
          </div>
        ) : (
          <ul>
            {notifications.map((notif, idx) => {
              const isRead = readIds.includes(notif.id);
              const cfg = iconConfig[notif.type] || iconConfig.calendar;
              const isLast = idx === notifications.length - 1;
              return (
                <li
                  key={notif.id}
                  className={`flex gap-4 px-4 py-4 transition ${cfg.border} ${!isLast ? `border-b ${isDark ? 'border-gray-800' : 'border-gray-100'}` : ''} ${!isRead && notif.isNew ? isDark ? 'bg-gray-800/60' : 'bg-indigo-50/30' : ''}`}
                >
                  {/* Icon */}
                  <div className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${cfg.bg}`}>
                    <cfg.Icon className={`w-5 h-5 ${cfg.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-bold text-sm leading-tight">{notif.title}</p>
                      <span className={`text-[10px] font-bold flex-shrink-0 px-2 py-0.5 rounded-full ${
                        !isRead && notif.isNew
                          ? 'bg-indigo-100 text-indigo-600'
                          : isDark ? 'text-gray-500' : 'text-gray-400'
                      }`}>
                        {!isRead && notif.isNew ? 'Baru' : notif.time}
                      </span>
                    </div>
                    <p className={`text-xs leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                      {notif.body}
                    </p>
                    {notif.link && (
                      <p className="text-[11px] font-bold text-indigo-500 mt-2 tracking-wide">{notif.link}</p>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
