import { Bell } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function Header({
  currentView,
  familyName,
  onOpenNotifikasi,
  unreadCount = 0,
}) {
  const { isDark } = useTheme();

  const getHeaderContent = () => {
    switch (currentView) {
      case "beranda":
        return {
          subtitle: "Selamat datang,",
          title: familyName || "Keluarga Anda",
        };
      case "laporan":
        return { subtitle: "Analisis Keuangan", title: "Laporan Anda" };
      case "anggaran":
        return { subtitle: "Alokasi & Perencanaan", title: "Anggaran" };
      case "profil":
        return { subtitle: "Pengaturan", title: "Profil Saya" };
      default:
        return { subtitle: "", title: "" };
    }
  };

  const { subtitle, title } = getHeaderContent();

  return (
    <header
      className={`flex justify-between items-center px-4 pt-8 pb-2 z-10 shadow-sm transition-colors duration-300 ${isDark ? "bg-gray-900 border-b border-gray-800" : "bg-white"}`}
    >
      <div>
        <p
          className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}
        >
          {subtitle}
        </p>
        <h1
          className={`text-lg font-bold ${isDark ? "text-white" : "text-gray-900"}`}
        >
          {title}
        </h1>
      </div>

      {/* Notification Button */}
      <button
        onClick={onOpenNotifikasi}
        className={`relative w-10 h-10 rounded-full flex items-center justify-center border shadow-sm hover:opacity-80 transition active:scale-95 ${isDark ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-100"}`}
      >
        <Bell
          className={`w-5 h-5 ${isDark ? "text-gray-300" : "text-gray-700"}`}
        />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 ring-2 ring-white flex items-center justify-center">
            <span className="text-[9px] font-bold text-white leading-none">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          </span>
        )}
      </button>
    </header>
  );
}
