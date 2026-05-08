const formatRupiah = (n) => new Intl.NumberFormat("id-ID").format(n);

const formatRupiahPendek = (n) => {
  if (n >= 1000000) return (n / 1000000).toFixed(1) + "jt";
  if (n >= 1000) return (n / 1000).toFixed(0) + "rb";
  return n;
};

const parseNominal = (value) =>
  parseInt(String(value || "").replace(/[^0-9]/g, ""), 10) || 0;

export function generateNotifications(transaksi = [], anggaran = []) {
  const notifs = [];
  const now = new Date();
  const currentMonth = now.getMonth();
  const currentYear = now.getFullYear();

  const thisMonth = transaksi.filter((t) => {
    const d = new Date(t.Tanggal);
    return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  });

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(now.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);
  const thisWeek = transaksi.filter((t) => new Date(t.Tanggal) >= sevenDaysAgo);

  const posKeluar = anggaran.filter(
    (a) => (a.Tipe || "pengeluaran") === "pengeluaran",
  );

  posKeluar.forEach((pos) => {
    const batas = parseNominal(pos.Batas || pos["Batas Anggaran"] || "0") || 0;
    if (!batas) return;

    const terpakai = thisMonth
      .filter((t) => t["Pos Anggaran"] === pos.Nama && t.Tipe === "pengeluaran")
      .reduce((sum, t) => sum + parseNominal(t.Nominal), 0);

    const sisa = batas - terpakai;
    const persenSisa = batas > 0 ? (sisa / batas) * 100 : 100;

    if (persenSisa <= 20 && persenSisa >= 0) {
      notifs.push({
        id: `anggaran-menipis-${pos.ID || pos.Nama}-${currentYear}-${currentMonth}`,
        type: "warning",
        title: `Anggaran ${pos.Nama} Menipis!`,
        bodyText: `Sisa anggaran ${pos.Nama} tersisa Rp ${formatRupiah(sisa)} (${Math.round(persenSisa)}%). Harap perhatikan pengeluaran untuk pos ini.`,
        time: "10 mnt lalu",
        isNew: true,
      });
    }
  });

  const pengeluaranMinggu = thisWeek.filter((t) => t.Tipe === "pengeluaran");
  if (pengeluaranMinggu.length > 0) {
    const totalKeluar = pengeluaranMinggu.reduce(
      (s, t) => s + parseNominal(t.Nominal),
      0,
    );
    const perPos = {};
    pengeluaranMinggu.forEach((t) => {
      const pos = t["Pos Anggaran"] || "Lainnya";
      perPos[pos] = (perPos[pos] || 0) + parseNominal(t.Nominal);
    });
    const topPos = Object.entries(perPos).sort((a, b) => b[1] - a[1])[0];
    const persen = topPos ? Math.round((topPos[1] / totalKeluar) * 100) : 0;

    notifs.unshift({
      id: `insight-mingguan-${currentYear}-${currentMonth}-${now.getDate()}`,
      type: "insight",
      title: "Insight Mingguan Anda",
      bodyText: topPos
        ? `Pengeluaran ${topPos[0]} menyumbang porsi terbesar (${persen}%) minggu ini. Total pengeluaran Rp ${formatRupiahPendek(totalKeluar)}.`
        : "Belum ada pengeluaran minggu ini.",
      actionLabel: "LIHAT LAPORAN LENGKAP",
      actionTarget: "laporan",
      time: "Baru",
      isNew: true,
    });
  }

  const prevMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const prevYear = currentMonth === 0 ? currentYear - 1 : currentYear;
  const lastMonth = transaksi.filter((t) => {
    const d = new Date(t.Tanggal);
    return d.getMonth() === prevMonth && d.getFullYear() === prevYear;
  });

  if (lastMonth.length > 0) {
    const totalMasukLalu = lastMonth
      .filter((t) => t.Tipe === "pemasukan")
      .reduce((s, t) => s + parseNominal(t.Nominal), 0);
    const totalKeluarLalu = lastMonth
      .filter((t) => t.Tipe === "pengeluaran")
      .reduce((s, t) => s + parseNominal(t.Nominal), 0);
    const tabungan = totalMasukLalu - totalKeluarLalu;
    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "Mei",
      "Jun",
      "Jul",
      "Ags",
      "Sep",
      "Okt",
      "Nov",
      "Des",
    ];

    notifs.push({
      id: `rekap-bulanan-${prevYear}-${prevMonth}`,
      type: "calendar",
      title: `Rekap ${monthNames[prevMonth]} Tersedia`,
      bodyText:
        tabungan > 0
          ? `Seluruh pencatatan bulan ${monthNames[prevMonth]} ${prevYear} telah dirangkum. Rata-rata Anda berhasil menghemat Rp ${formatRupiahPendek(tabungan)} bulan lalu.`
          : `Seluruh pencatatan bulan ${monthNames[prevMonth]} ${prevYear} telah dirangkum. Pengeluaran Anda melebihi pemasukan bulan lalu.`,
      time: `1 ${monthNames[prevMonth]}`,
      isNew: false,
    });
  }

  return notifs;
}

export function getNotifStorageKey(userId, familyId) {
  return `notif-read::${userId || "guest"}::${familyId || "nofamily"}`;
}

export function loadReadMap(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function saveReadMap(storageKey, readMap) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(readMap || {}));
  } catch {
    // noop: storage can fail in restricted environments
  }
}

export function normalizeReadMap(readMap) {
  if (!readMap || typeof readMap !== "object") return {};
  const normalized = {};
  Object.keys(readMap).forEach((key) => {
    if (readMap[key]) normalized[key] = true;
  });
  return normalized;
}

export function mergeReadMaps(baseMap, incomingMap) {
  const base = normalizeReadMap(baseMap);
  const incoming = normalizeReadMap(incomingMap);
  const merged = { ...base };
  Object.keys(incoming).forEach((key) => {
    merged[key] = merged[key] || incoming[key] ? true : false;
  });
  return normalizeReadMap(merged);
}

export function readMapsEqual(mapA, mapB) {
  const a = normalizeReadMap(mapA);
  const b = normalizeReadMap(mapB);
  const aKeys = Object.keys(a).sort();
  const bKeys = Object.keys(b).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
  }
  return true;
}
