import { useState, useEffect, useMemo } from "react";
import Header from "./components/layout/Header";
import BottomNav from "./components/layout/BottomNav";
import Beranda from "./views/Beranda";
import Laporan from "./views/Laporan";
import Anggaran from "./views/Anggaran";
import Profil from "./views/Profil";
import TambahTransaksi from "./components/overlays/TambahTransaksi";
import Notifikasi from "./components/overlays/Notifikasi";
import SemuaTransaksi from "./components/overlays/SemuaTransaksi";
import Pengaturan from "./components/overlays/Pengaturan";
import AnggotaKeluarga from "./components/overlays/AnggotaKeluarga";
import RiwayatAudit from "./components/overlays/RiwayatAudit";
import TentangAplikasi from "./components/overlays/TentangAplikasi";
import TambahAnggaran from "./components/overlays/TambahAnggaran";
import {
  fetchTransaksi,
  fetchAnggaran,
  apiGetNotificationReads,
  apiUpsertNotificationReads,
} from "./services/api";
import { useTheme } from "./context/ThemeContext";
import { useAuth } from "./context/AuthContext";
import { useFamily } from "./context/FamilyContext";
import {
  generateNotifications,
  getNotifStorageKey,
  loadReadMap,
  saveReadMap,
  mergeReadMaps,
  normalizeReadMap,
  readMapsEqual,
} from "./utils/notifications";
import Login from "./views/Login";

function App() {
  const [currentView, setCurrentView] = useState("beranda");
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [transaksi, setTransaksi] = useState([]);
  const [anggaran, setAnggaran] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotifikasiOpen, setIsNotifikasiOpen] = useState(false);
  const [notifReadMap, setNotifReadMap] = useState({});
  // Fullscreen overlay states (managed here so they render above the Header)
  const [isSemuaTransaksiOpen, setIsSemuaTransaksiOpen] = useState(false);
  const [isPengaturanOpen, setIsPengaturanOpen] = useState(false);
  const [isAnggotaOpen, setIsAnggotaOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isTentangOpen, setIsTentangOpen] = useState(false);
  const [isAddAnggaranOpen, setIsAddAnggaranOpen] = useState(false);
  const [editAnggaranData, setEditAnggaranData] = useState(null);
  const { isDark } = useTheme();
  const { isLoggedIn, user } = useAuth();
  const { family, refreshFamily, clearFamilyState } = useFamily();
  const shouldShowLogin = !isLoggedIn || !user?.familyId;

  const loadData = async () => {
    setIsLoading(true);
    const familyId = user?.familyId || null;
    const [dataTransaksi, dataAnggaran] = await Promise.all([
      fetchTransaksi(familyId),
      fetchAnggaran(familyId),
    ]);
    setTransaksi(dataTransaksi.reverse());
    setAnggaran(dataAnggaran);
    setIsLoading(false);
  };

  useEffect(() => {
    if (isLoggedIn && user?.familyId) {
      loadData();
      refreshFamily();
    } else if (isLoggedIn && !user?.familyId) {
      setTransaksi([]);
      setAnggaran([]);
      setIsLoading(false);
      clearFamilyState();
    } else {
      clearFamilyState();
    }
  }, [isLoggedIn, user?.familyId]);

  // Reset view ke beranda saat logout (atau saat belum login)
  useEffect(() => {
    if (!isLoggedIn) {
      setCurrentView("beranda");
    }
  }, [isLoggedIn]);


  const notifications = useMemo(
    () => generateNotifications(transaksi, anggaran),
    [transaksi, anggaran],
  );

  useEffect(() => {
    let cancelled = false;
    const key = getNotifStorageKey(user?.id, user?.familyId);
    const localMap = normalizeReadMap(loadReadMap(key));
    setNotifReadMap(localMap);

    if (!user?.id || !user?.familyId) return () => {};

    (async () => {
      const remoteRes = await apiGetNotificationReads({
        userId: user.id,
        familyId: user.familyId,
      });
      if (cancelled || !remoteRes.success) return;

      const remoteMap = normalizeReadMap(remoteRes.data?.readMap || {});
      const mergedMap = mergeReadMaps(remoteMap, localMap);
      setNotifReadMap(mergedMap);
      saveReadMap(key, mergedMap);

      if (!readMapsEqual(remoteMap, mergedMap)) {
        apiUpsertNotificationReads({
          userId: user.id,
          familyId: user.familyId,
          readMap: mergedMap,
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.id, user?.familyId]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => n.isNew && !notifReadMap[n.id]).length,
    [notifications, notifReadMap],
  );

  const markNotifRead = (notifId) => {
    if (!notifId) return;
    const storageKey = getNotifStorageKey(user?.id, user?.familyId);
    setNotifReadMap((prev) => {
      if (prev[notifId]) return prev;
      const next = normalizeReadMap({ ...prev, [notifId]: true });
      saveReadMap(storageKey, next);
      if (user?.id && user?.familyId) {
        apiUpsertNotificationReads({
          userId: user.id,
          familyId: user.familyId,
          readMap: next,
        });
      }
      return next;
    });
  };

  const markAllNotifRead = () => {
    if (!notifications.length) return;
    const storageKey = getNotifStorageKey(user?.id, user?.familyId);
    const allRead = notifications.reduce((acc, n) => {
      acc[n.id] = true;
      return acc;
    }, {});
    setNotifReadMap((prev) => {
      const next = normalizeReadMap({ ...prev, ...allRead });
      saveReadMap(storageKey, next);
      if (user?.id && user?.familyId) {
        apiUpsertNotificationReads({
          userId: user.id,
          familyId: user.familyId,
          readMap: next,
        });
      }
      return next;
    });
  };

  const navigateFromNotif = (targetView, notifId) => {
    if (notifId) markNotifRead(notifId);
    setIsNotifikasiOpen(false);
    if (targetView) setCurrentView(targetView);
  };

  return (
    <div
      className={`flex justify-center h-screen overflow-hidden ${isDark ? "bg-gray-950" : "bg-gray-100"}`}
    >
      <div
        className={`w-full max-w-md h-full relative flex flex-col shadow-2xl overflow-hidden transition-colors duration-300 ${isDark ? "bg-gray-900 text-gray-100" : "bg-white text-gray-900"}`}
      >
        {/* Login Gate — covers everything if not logged in */}
        {shouldShowLogin && <Login />}

        <Header
          currentView={currentView}
          familyName={family?.nama}
          onOpenNotifikasi={() => setIsNotifikasiOpen(true)}
          unreadCount={unreadCount}
        />

        <main
          className={`flex-1 overflow-y-auto no-scrollbar pb-24 relative ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
        >
          <div
            className={`view-transition ${currentView === "beranda" ? "opacity-100 block" : "opacity-0 hidden"} pb-8 ${isDark ? "bg-gray-900" : "bg-white"}`}
          >
            <Beranda
              transaksi={transaksi}
              anggaran={anggaran}
              isLoading={isLoading}
              onViewAll={() => setIsSemuaTransaksiOpen(true)}
            />
          </div>
          <div
            className={`view-transition ${currentView === "laporan" ? "opacity-100 block" : "opacity-0 hidden"} pb-8 ${isDark ? "bg-gray-900" : ""}`}
          >
            <Laporan
              isActive={currentView === "laporan"}
              transaksi={transaksi}
              isLoading={isLoading}
            />
          </div>
          <div
            className={`view-transition ${currentView === "anggaran" ? "opacity-100 block" : "opacity-0 hidden"} pb-8 ${isDark ? "bg-gray-900" : ""}`}
          >
            <Anggaran
              transaksi={transaksi}
              anggaran={anggaran}
              isLoading={isLoading}
              onRefresh={loadData}
              onOpenAdd={() => { setEditAnggaranData(null); setIsAddAnggaranOpen(true); }}
              onOpenEdit={(pos) => { setEditAnggaranData(pos); setIsAddAnggaranOpen(true); }}
            />
          </div>
          <div
            className={`view-transition ${currentView === "profil" ? "opacity-100 block" : "opacity-0 hidden"} pb-8 ${isDark ? "bg-gray-900" : ""}`}
          >
            <Profil
              onDataChange={loadData}
              onOpenPengaturan={() => setIsPengaturanOpen(true)}
              onOpenAnggota={() => setIsAnggotaOpen(true)}
              onOpenAudit={() => setIsAuditOpen(true)}
              onOpenTentang={() => setIsTentangOpen(true)}
            />
          </div>
        </main>

        <BottomNav
          currentView={currentView}
          setCurrentView={setCurrentView}
          onOpenAddTransaction={() => setIsAddTransactionOpen(true)}
        />

        <Notifikasi
          isOpen={isNotifikasiOpen}
          onClose={() => setIsNotifikasiOpen(false)}
          notifications={notifications}
          readMap={notifReadMap}
          onMarkRead={markNotifRead}
          onMarkAllRead={markAllNotifRead}
          onNavigate={navigateFromNotif}
        />
        <TambahTransaksi
          isOpen={isAddTransactionOpen}
          onClose={() => setIsAddTransactionOpen(false)}
          anggaran={anggaran}
          onSuccess={() => { setIsAddTransactionOpen(false); loadData(); }}
        />

        {/* Fullscreen overlays — rendered here (sibling of Header) so they cover everything */}
        <SemuaTransaksi
          isOpen={isSemuaTransaksiOpen}
          onClose={() => setIsSemuaTransaksiOpen(false)}
          transaksi={transaksi}
          anggaran={anggaran}
        />
        <Pengaturan
          isOpen={isPengaturanOpen}
          onClose={() => setIsPengaturanOpen(false)}
        />
        <AnggotaKeluarga
          isOpen={isAnggotaOpen}
          onClose={() => setIsAnggotaOpen(false)}
        />
        <RiwayatAudit
          isOpen={isAuditOpen}
          onClose={() => setIsAuditOpen(false)}
        />
        <TentangAplikasi
          isOpen={isTentangOpen}
          onClose={() => setIsTentangOpen(false)}
        />
        <TambahAnggaran
          isOpen={isAddAnggaranOpen}
          onClose={() => { setIsAddAnggaranOpen(false); setEditAnggaranData(null); }}
          editData={editAnggaranData}
          onSuccess={() => { setIsAddAnggaranOpen(false); setEditAnggaranData(null); loadData(); }}
        />
      </div>
    </div>
  );
}

export default App;
