import { useState, useEffect } from "react";
import Header from "./components/layout/Header";
import BottomNav from "./components/layout/BottomNav";
import Beranda from "./views/Beranda";
import Laporan from "./views/Laporan";
import Anggaran from "./views/Anggaran";
import Profil from "./views/Profil";
import TambahTransaksi from "./components/overlays/TambahTransaksi";
import Notifikasi from "./components/overlays/Notifikasi";
import { fetchTransaksi, fetchAnggaran } from "./services/api";
import { useTheme } from "./context/ThemeContext";
import { useAuth } from "./context/AuthContext";
import { useFamily } from "./context/FamilyContext";
import Login from "./views/Login";

function App() {
  const [currentView, setCurrentView] = useState("beranda");
  const [isAddTransactionOpen, setIsAddTransactionOpen] = useState(false);
  const [transaksi, setTransaksi] = useState([]);
  const [anggaran, setAnggaran] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotifikasiOpen, setIsNotifikasiOpen] = useState(false);
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
            />
          </div>
          <div
            className={`view-transition ${currentView === "profil" ? "opacity-100 block" : "opacity-0 hidden"} pb-8 ${isDark ? "bg-gray-900" : ""}`}
          >
            <Profil onDataChange={loadData} />
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
          transaksi={transaksi}
          anggaran={anggaran}
        />
        <TambahTransaksi
          isOpen={isAddTransactionOpen}
          onClose={() => setIsAddTransactionOpen(false)}
          anggaran={anggaran}
          onSuccess={() => {
            setIsAddTransactionOpen(false);
            loadData();
          }}
        />
      </div>
    </div>
  );
}

export default App;
