import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import Header from "./components/layout/Header";
import BottomNav from "./components/layout/BottomNav";
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

const Beranda = lazy(() => import("./views/Beranda"));
const Laporan = lazy(() => import("./views/Laporan"));
const Anggaran = lazy(() => import("./views/Anggaran"));
const Profil = lazy(() => import("./views/Profil"));

const TambahTransaksi = lazy(
  () => import("./components/overlays/TambahTransaksi"),
);
const Notifikasi = lazy(() => import("./components/overlays/Notifikasi"));
const SemuaTransaksi = lazy(
  () => import("./components/overlays/SemuaTransaksi"),
);
const Pengaturan = lazy(() => import("./components/overlays/Pengaturan"));
const AnggotaKeluarga = lazy(
  () => import("./components/overlays/AnggotaKeluarga"),
);
const RiwayatAudit = lazy(() => import("./components/overlays/RiwayatAudit"));
const TentangAplikasi = lazy(
  () => import("./components/overlays/TentangAplikasi"),
);
const TambahAnggaran = lazy(
  () => import("./components/overlays/TambahAnggaran"),
);

function MainViewLoadingFallback({ isDark }) {
  const line = isDark ? "bg-white/10" : "bg-gray-200";
  const lineSoft = isDark ? "bg-white/7" : "bg-gray-100";
  const panel = isDark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-100";

  return (
    <div className="px-4 pt-4 pb-8 animate-fade-up">
      <div className={`rounded-2xl border p-5 skeleton-shimmer ${panel}`}>
        <div className={`h-4 w-32 rounded-full ${line}`} />
        <div className={`mt-3 h-10 w-44 rounded-2xl ${lineSoft}`} />
        <div className={`mt-6 h-2.5 w-full rounded-full ${line}`} />
        <div className={`mt-2 h-2.5 w-2/3 rounded-full ${lineSoft}`} />
      </div>

      <div className="mt-5 space-y-4">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className={`rounded-2xl border p-4 skeleton-shimmer ${panel}`}
            style={{ "--skeleton-delay": `${120 + index * 120}ms` }}
          >
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-xl ${line}`} />
                <div>
                  <div className={`h-3.5 w-28 rounded-full ${line}`} />
                  <div className={`mt-2 h-2.5 w-20 rounded-full ${lineSoft}`} />
                </div>
              </div>
              <div className={`h-4 w-20 rounded-full ${line}`} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  const [isBirandaModalOpen, setIsBirandaModalOpen] = useState(false);
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
        {shouldShowLogin && (
          <Login onOpenTentang={() => setIsTentangOpen(true)} />
        )}

        {!isBirandaModalOpen && (
          <Header
            currentView={currentView}
            userName={user?.nama}
            onOpenNotifikasi={() => setIsNotifikasiOpen(true)}
            unreadCount={unreadCount}
          />
        )}

        <main
          className={`flex-1 overflow-y-auto no-scrollbar pb-24 relative ${isDark ? "bg-gray-900" : "bg-gray-50"}`}
        >
          <Suspense fallback={<MainViewLoadingFallback isDark={isDark} />}>
            {currentView === "beranda" && (
              <div
                className={`${isBirandaModalOpen ? "" : "view-transition"} opacity-100 block pb-8 ${isDark ? "bg-gray-900" : "bg-white"}`}
              >
                <Beranda
                  transaksi={transaksi}
                  anggaran={anggaran}
                  isLoading={isLoading}
                  onViewAll={() => setIsSemuaTransaksiOpen(true)}
                  onRefresh={loadData}
                  onModalStateChange={setIsBirandaModalOpen}
                />
              </div>
            )}
            {currentView === "laporan" && (
              <div
                className={`view-transition opacity-100 block pb-8 ${isDark ? "bg-gray-900" : ""}`}
              >
                <Laporan
                  isActive={currentView === "laporan"}
                  transaksi={transaksi}
                  isLoading={isLoading}
                />
              </div>
            )}
            {currentView === "anggaran" && (
              <div
                className={`view-transition opacity-100 block pb-8 ${isDark ? "bg-gray-900" : ""}`}
              >
                <Anggaran
                  transaksi={transaksi}
                  anggaran={anggaran}
                  isLoading={isLoading}
                  onRefresh={loadData}
                  onOpenAdd={() => {
                    setEditAnggaranData(null);
                    setIsAddAnggaranOpen(true);
                  }}
                  onOpenEdit={(pos) => {
                    setEditAnggaranData(pos);
                    setIsAddAnggaranOpen(true);
                  }}
                />
              </div>
            )}
            {currentView === "profil" && (
              <div
                className={`view-transition opacity-100 block pb-8 ${isDark ? "bg-gray-900" : ""}`}
              >
                <Profil
                  onDataChange={loadData}
                  onOpenPengaturan={() => setIsPengaturanOpen(true)}
                  onOpenAnggota={() => setIsAnggotaOpen(true)}
                  onOpenAudit={() => setIsAuditOpen(true)}
                  onOpenTentang={() => setIsTentangOpen(true)}
                />
              </div>
            )}
          </Suspense>
        </main>

        <BottomNav
          currentView={currentView}
          setCurrentView={setCurrentView}
          onOpenAddTransaction={() => setIsAddTransactionOpen(true)}
        />

        <Suspense fallback={null}>
          {isNotifikasiOpen && (
            <Notifikasi
              isOpen={isNotifikasiOpen}
              onClose={() => setIsNotifikasiOpen(false)}
              notifications={notifications}
              readMap={notifReadMap}
              onMarkRead={markNotifRead}
              onMarkAllRead={markAllNotifRead}
              onNavigate={navigateFromNotif}
            />
          )}
          {isAddTransactionOpen && (
            <TambahTransaksi
              isOpen={isAddTransactionOpen}
              onClose={() => setIsAddTransactionOpen(false)}
              anggaran={anggaran}
              onSuccess={() => {
                setIsAddTransactionOpen(false);
                loadData();
              }}
            />
          )}

          {/* Fullscreen overlays — rendered here (sibling of Header) so they cover everything */}
          {isSemuaTransaksiOpen && (
            <SemuaTransaksi
              isOpen={isSemuaTransaksiOpen}
              onClose={() => setIsSemuaTransaksiOpen(false)}
              transaksi={transaksi}
              anggaran={anggaran}
              onRefresh={loadData}
            />
          )}
          {isPengaturanOpen && (
            <Pengaturan
              isOpen={isPengaturanOpen}
              onClose={() => setIsPengaturanOpen(false)}
            />
          )}
          {isAnggotaOpen && (
            <AnggotaKeluarga
              isOpen={isAnggotaOpen}
              onClose={() => setIsAnggotaOpen(false)}
            />
          )}
          {isAuditOpen && (
            <RiwayatAudit
              isOpen={isAuditOpen}
              onClose={() => setIsAuditOpen(false)}
            />
          )}
          {isTentangOpen && (
            <TentangAplikasi
              isOpen={isTentangOpen}
              onClose={() => setIsTentangOpen(false)}
            />
          )}
          {isAddAnggaranOpen && (
            <TambahAnggaran
              isOpen={isAddAnggaranOpen}
              onClose={() => {
                setIsAddAnggaranOpen(false);
                setEditAnggaranData(null);
              }}
              editData={editAnggaranData}
              onSuccess={() => {
                setIsAddAnggaranOpen(false);
                setEditAnggaranData(null);
                loadData();
              }}
            />
          )}
        </Suspense>
      </div>
    </div>
  );
}

export default App;
