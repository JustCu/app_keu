import { Home, BarChart2, Plus, Wallet, User } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function BottomNav({
  currentView,
  setCurrentView,
  onOpenAddTransaction,
}) {
  const { isDark } = useTheme();

  const navItems = [
    { id: "beranda", label: "Beranda", icon: Home },
    { id: "laporan", label: "Laporan", icon: BarChart2 },
  ];

  const navItemsRight = [
    { id: "anggaran", label: "Anggaran", icon: Wallet },
    { id: "profil", label: "Profil", icon: User },
  ];

  const renderNavItem = ({ id, label, icon: Icon }) => {
    const isActive = currentView === id;
    return (
      <button
        key={id}
        onClick={() => setCurrentView(id)}
        className={`flex flex-col items-center justify-center w-16 h-full transition ${isActive ? "text-primary-adaptive" : isDark ? "text-gray-500 hover:text-gray-300" : "text-gray-400 hover:text-gray-600"}`}
      >
        <Icon className="w-6 h-6 mb-1" />
        <span
          className={`text-[10px] ${isActive ? "font-bold" : "font-medium"}`}
        >
          {label}
        </span>
      </button>
    );
  };

  return (
    <nav
      className={`absolute bottom-0 w-full border-t shadow-[0_-4px_20px_rgba(0,0,0,0.05)] px-2 pb-safe z-20 transition-colors duration-300 ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}
    >
      <div className="flex justify-around items-center h-16">
        {navItems.map(renderNavItem)}

        {/* FAB (Add Transaction) */}
        <div className="relative -top-5">
          <button
            onClick={onOpenAddTransaction}
            className="w-14 h-14 btn-primary-theme rounded-full shadow-lg shadow-primary-theme flex items-center justify-center active:scale-95 transition-all"
          >
            <Plus className="w-8 h-8" />
          </button>
        </div>

        {navItemsRight.map(renderNavItem)}
      </div>
    </nav>
  );
}
