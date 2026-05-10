import {
  X,
  GitBranch,
  Mail,
  Globe,
  Heart,
  Shield,
  Zap,
  Users,
  BarChart2,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import Logo from "/Logo.png";

const APP_VERSION = "1.0.0";
const APP_NAME = "Dompet Keluarga";

const FEATURES = [
  {
    icon: Wallet,
    label: "Catat pemasukan & pengeluaran",
    color: "text-primary-adaptive",
    bg: "bg-primary-surface-adaptive",
  },
  {
    icon: Users,
    label: "Manajemen anggota keluarga",
    color: "text-primary-adaptive",
    bg: "bg-primary-surface-adaptive",
  },
  {
    icon: BarChart2,
    label: "Laporan & analisis keuangan",
    color: "semantic-success-text",
    bg: "semantic-success-surface",
  },
  {
    icon: Zap,
    label: "Wawasan AI (Gemini)",
    color: "semantic-warning-text",
    bg: "semantic-warning-surface",
  },
  {
    icon: Shield,
    label: "Data aman di Google Sheets",
    color: "text-primary-adaptive",
    bg: "bg-primary-surface-adaptive",
  },
];

export default function TentangAplikasi({ isOpen, onClose }) {
  const { isDark } = useTheme();

  if (!isOpen) return null;

  const bg = isDark ? "bg-gray-900" : "bg-gray-50";
  const card = isDark
    ? "bg-gray-800 border-gray-700"
    : "bg-white border-gray-100";
  const textPrimary = isDark ? "text-white" : "text-gray-900";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";
  const divider = isDark ? "border-gray-700" : "border-gray-100";

  return (
    <div className="fixed inset-0 z-[120] flex flex-col">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className={`absolute inset-0 overflow-y-auto ${bg}`}>
        {/* Header */}
        <div
          className={`sticky top-0 z-10 flex items-center justify-between px-4 py-4 border-b ${isDark ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-100"}`}
        >
          <h2 className={`text-base font-bold ${textPrimary}`}>
            Tentang Aplikasi
          </h2>
          <button
            onClick={onClose}
            className="overlay-muted-button w-8 h-8 rounded-full flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-4 py-6 flex flex-col gap-6">
          {/* App Identity */}
          <div className="flex flex-col items-center text-center gap-3 pt-2">
            <img
              src={Logo}
              alt="Dompet Keluarga Logo"
              className="w-20 h-20 rounded-3xl shadow-lg object-cover"
            />
            <div>
              <h1
                className={`text-2xl font-extrabold tracking-tight ${textPrimary}`}
              >
                {APP_NAME}
              </h1>
              <p className={`text-sm font-medium mt-0.5 ${textSecondary}`}>
                Versi {APP_VERSION}
              </p>
            </div>
            <p className={`text-sm leading-relaxed max-w-xs ${textSecondary}`}>
              Aplikasi keuangan keluarga yang memudahkan pencatatan, pengelolaan
              anggaran, dan pemantauan kondisi keuangan bersama.
            </p>
          </div>

          {/* Fitur Utama */}
          <section>
            <h3
              className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 ${textSecondary}`}
            >
              Fitur Utama
            </h3>
            <div
              className={`rounded-2xl border overflow-hidden shadow-sm ${card}`}
            >
              {FEATURES.map(({ icon: Icon, label, color, bg }, i) => (
                <div
                  key={i}
                  className={`flex items-center gap-3 px-4 py-3.5 ${i < FEATURES.length - 1 ? `border-b ${divider}` : ""}`}
                >
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 ${bg}`}
                  >
                    <Icon className={`w-4.5 h-4.5 ${color}`} size={18} />
                  </div>
                  <span className={`text-sm font-medium ${textPrimary}`}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Teknologi */}
          <section>
            <h3
              className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 ${textSecondary}`}
            >
              Teknologi
            </h3>
            <div
              className={`rounded-2xl border shadow-sm divide-y ${card} ${isDark ? "divide-gray-700" : "divide-gray-50"}`}
            >
              {[
                ["Frontend", "React 18 + Vite"],
                ["Styling", "Tailwind CSS"],
                ["Backend", "Google Apps Script"],
                ["Database", "Google Sheets"],
                ["AI Insights", "Google Gemini Flash"],
              ].map(([key, val]) => (
                <div
                  key={key}
                  className="flex items-center justify-between px-4 py-3"
                >
                  <span className={`text-sm font-medium ${textSecondary}`}>
                    {key}
                  </span>
                  <span className={`text-sm font-bold ${textPrimary}`}>
                    {val}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* Developer */}
          <section>
            <h3
              className={`text-xs font-bold uppercase tracking-wider mb-3 px-1 ${textSecondary}`}
            >
              Pengembang
            </h3>
            <div className={`rounded-2xl border shadow-sm ${card}`}>
              <div
                className={`flex items-center gap-3 px-4 py-4 border-b ${divider}`}
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
                  JC
                </div>
                <div>
                  <p className={`text-sm font-bold ${textPrimary}`}>JustCu</p>
                  <p className={`text-xs font-medium ${textSecondary}`}>
                    Full-stack Developer
                  </p>
                </div>
              </div>
              <a
                href="https://github.com/JustCu/app_keu"
                target="_blank"
                rel="noopener noreferrer"
                className={`flex items-center gap-3 px-4 py-3.5 border-b ${divider} hover:opacity-80 transition`}
              >
                <GitBranch
                  className={`w-4.5 h-4.5 ${textSecondary}`}
                  size={18}
                />
                <span className={`text-sm font-medium ${textPrimary}`}>
                  github.com/JustCu/app_keu
                </span>
              </a>
              <div className={`flex items-center gap-3 px-4 py-3.5`}>
                <Globe className={`w-4.5 h-4.5 ${textSecondary}`} size={18} />
                <span className={`text-sm font-medium ${textSecondary}`}>
                  Indonesia
                </span>
              </div>
            </div>
          </section>

          {/* Footer */}
          <div
            className={`flex flex-col items-center gap-1.5 py-4 ${textSecondary}`}
          >
            <div className="flex items-center gap-1.5 text-xs font-medium">
              <span>Dibuat dengan</span>
              <Heart className="w-3.5 h-3.5 text-red-400 fill-red-400" />
              <span>untuk keluarga Indonesia</span>
            </div>
            <p className="text-xs opacity-60">
              © {new Date().getFullYear()} {APP_NAME}. All rights reserved.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
