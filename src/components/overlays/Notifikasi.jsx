import { useMemo } from "react";
import {
  ChevronLeft,
  Lightbulb,
  AlertTriangle,
  CalendarDays,
  CheckCheck,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
export default function Notifikasi({
  isOpen,
  onClose,
  notifications = [],
  readMap = {},
  onMarkRead,
  onMarkAllRead,
  onNavigate,
}) {
  const { isDark } = useTheme();
  const unreadCount = useMemo(
    () => notifications.filter((n) => n.isNew && !readMap[n.id]).length,
    [notifications, readMap],
  );

  if (!isOpen) return null;

  const iconConfig = {
    insight: {
      bg: isDark ? "bg-yellow-900/40" : "bg-yellow-50",
      text: "text-yellow-500",
      Icon: Lightbulb,
      border: "border-l-4 border-indigo-400",
    },
    warning: {
      bg: isDark ? "bg-red-900/40" : "bg-red-50",
      text: "text-red-500",
      Icon: AlertTriangle,
      border: "",
    },
    calendar: {
      bg: isDark ? "bg-blue-900/40" : "bg-blue-50",
      text: "text-blue-500",
      Icon: CalendarDays,
      border: "",
    },
  };

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col transition-colors duration-300 ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      {/* Header */}
      <header
        className={`flex items-center justify-between px-4 pt-8 pb-4 border-b ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}
      >
        <button
          onClick={onClose}
          className={`w-8 h-8 -ml-2 rounded-full flex items-center justify-center transition ${isDark ? "text-gray-300 hover:bg-gray-800" : "text-gray-600 hover:bg-gray-100"}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold">Notifikasi</h2>
        <button
          onClick={onMarkAllRead}
          className={`text-xs font-bold transition ${unreadCount > 0 ? "text-blue-500 hover:text-blue-600" : isDark ? "text-gray-600" : "text-gray-300"}`}
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
            <p
              className={`text-sm font-medium ${isDark ? "text-gray-400" : "text-gray-500"}`}
            >
              Semua notifikasi sudah dibaca
            </p>
          </div>
        ) : (
          <ul>
            {notifications.map((notif, idx) => {
              const isRead = !!readMap[notif.id];
              const cfg = iconConfig[notif.type] || iconConfig.calendar;
              const isLast = idx === notifications.length - 1;
              return (
                <li
                  key={notif.id}
                  onClick={() => onMarkRead?.(notif.id)}
                  className={`flex gap-4 px-4 py-4 transition ${cfg.border} ${!isLast ? `border-b ${isDark ? "border-gray-800" : "border-gray-100"}` : ""} ${!isRead && notif.isNew ? (isDark ? "bg-gray-800/60" : "bg-indigo-50/30") : ""}`}
                >
                  {/* Icon */}
                  <div
                    className={`w-10 h-10 rounded-full flex-shrink-0 flex items-center justify-center ${cfg.bg}`}
                  >
                    <cfg.Icon className={`w-5 h-5 ${cfg.text}`} />
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="font-bold text-sm leading-tight">
                        {notif.title}
                      </p>
                      <span
                        className={`text-[10px] font-bold flex-shrink-0 px-2 py-0.5 rounded-full ${
                          !isRead && notif.isNew
                            ? "bg-indigo-100 text-indigo-600"
                            : isDark
                              ? "text-gray-500"
                              : "text-gray-400"
                        }`}
                      >
                        {!isRead && notif.isNew ? "Baru" : notif.time}
                      </span>
                    </div>
                    <p
                      className={`text-xs leading-relaxed ${isDark ? "text-gray-400" : "text-gray-600"}`}
                    >
                      {notif.bodyText}
                    </p>
                    {notif.actionLabel && notif.actionTarget && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onNavigate?.(notif.actionTarget, notif.id);
                        }}
                        className="text-[11px] font-bold text-indigo-500 mt-2 tracking-wide hover:text-indigo-600 transition"
                      >
                        {notif.actionLabel} →
                      </button>
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
