import { useState, useEffect, lazy, Suspense } from "react";
import {
  ChevronLeft,
  Download,
  Bell,
  Mail,
  Clock,
  Check,
  AlertCircle,
  Loader,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { apiGetUserSettings, apiUpsertUserSettings } from "../../services/api";

const PengaturanAIConfigSection = lazy(
  () => import("./PengaturanAIConfigSection"),
);

export default function Pengaturan({ isOpen, onClose }) {
  const { isDark, setIsDark } = useTheme();
  const { user } = useAuth();

  const [dailyEnabled, setDailyEnabled] = useState(false);
  const [dailyTime, setDailyTime] = useState("20:00");
  const [weeklyEnabled, setWeeklyEnabled] = useState(false);
  const [weeklyEmail, setWeeklyEmail] = useState("");
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaving, setSettingsSaving] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [settingsError, setSettingsError] = useState("");

  const normalizeTimeInput = (raw, fallback = "20:00") => {
    const value = String(raw || "").trim();
    if (!value) return fallback;

    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (match) {
      const h = Number(match[1]);
      const m = Number(match[2]);
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
      }
    }

    const parsed = new Date(value);
    if (!isNaN(parsed.getTime())) {
      return `${String(parsed.getHours()).padStart(2, "0")}:${String(parsed.getMinutes()).padStart(2, "0")}`;
    }

    return fallback;
  };

  useEffect(() => {
    if (!isOpen || !user?.id || !user?.familyId) return;
    setSettingsLoading(true);
    setSettingsError("");
    setSettingsSaved(false);
    apiGetUserSettings({ userId: user.id, familyId: user.familyId })
      .then((res) => {
        if (res.success && res.data) {
          setDailyEnabled(!!res.data.dailyReminderEnabled);
          setDailyTime(normalizeTimeInput(res.data.dailyReminderTime, "20:00"));
          setWeeklyEnabled(!!res.data.weeklyReportEnabled);
          setWeeklyEmail(res.data.weeklyReportEmail || user.email || "");
        } else {
          setWeeklyEmail(user.email || "");
        }
      })
      .catch(() => setWeeklyEmail(user.email || ""))
      .finally(() => setSettingsLoading(false));
  }, [isOpen, user?.id, user?.familyId]);

  const handleSaveNotifSettings = async () => {
    if (!user?.id || !user?.familyId) return;
    setSettingsSaving(true);
    setSettingsError("");
    setSettingsSaved(false);
    const res = await apiUpsertUserSettings({
      userId: user.id,
      familyId: user.familyId,
      settings: {
        dailyReminderEnabled: dailyEnabled,
        dailyReminderTime: dailyTime,
        weeklyReportEnabled: weeklyEnabled,
        weeklyReportEmail: weeklyEmail,
      },
    });
    setSettingsSaving(false);
    if (res.success) {
      setSettingsSaved(true);
      setTimeout(() => setSettingsSaved(false), 3000);
      console.log("Pengaturan notifikasi berhasil disimpan:", res.data);
    } else {
      setSettingsError(res.error || "Gagal menyimpan.");
      console.error("Gagal menyimpan pengaturan notifikasi:", res.error);
    }
  };

  if (!isOpen) return null;

  const Toggle = ({ value, onChange, colorClass = "bg-primary-theme" }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${value ? colorClass : isDark ? "bg-gray-700" : "bg-gray-200"}`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${value ? "translate-x-5" : "translate-x-0.5"}`}
      ></div>
    </button>
  );

  const panelClass = "overlay-panel";
  const subtleButtonClass = "overlay-subtle-button";
  const inputClass =
    "overlay-control w-full rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2";
  const divider = `border-b ${isDark ? "border-gray-700" : "border-gray-50"}`;
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";

  return (
    <div
      className={`absolute inset-0 z-50 flex flex-col transform transition-all duration-300 ease-in-out shadow-2xl ${isDark ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}
    >
      {/* Header */}
      <header
        className={`flex items-center justify-between px-4 pt-8 pb-4 border-b ${isDark ? "bg-gray-900 border-gray-800" : "bg-white border-gray-100"}`}
      >
        <button
          onClick={onClose}
          className={`w-8 h-8 -ml-2 rounded-full flex items-center justify-center transition ${subtleButtonClass}`}
        >
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h2 className="text-lg font-bold">Pengaturan</h2>
        <div className="w-8"></div>
      </header>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-8">
        {/* NOTIFIKASI & LAPORAN EMAIL */}
        <section className="px-4 mt-6">
          <h3
            className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${textSecondary}`}
          >
            NOTIFIKASI & LAPORAN EMAIL
          </h3>
          <div className={`${panelClass} overflow-hidden`}>
            {settingsLoading ? (
              <PengaturanSettingsSkeleton isDark={isDark} />
            ) : (
              <>
                {/* Pengingat Harian */}
                <div className={`p-4 ${divider}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-primary-adaptive" />
                      <p className="font-bold text-sm">Pengingat Harian</p>
                    </div>
                    <Toggle value={dailyEnabled} onChange={setDailyEnabled} />
                  </div>
                  <p
                    className={`text-xs font-medium mb-2 pl-6 ${textSecondary}`}
                  >
                    Kirim email pengingat untuk mencatat transaksi harian
                  </p>
                  {dailyEnabled && (
                    <div className="pl-6 flex items-center gap-3 mt-2">
                      <Clock
                        className={`w-4 h-4 flex-shrink-0 ${textSecondary}`}
                      />
                      <div className="flex-1">
                        <label
                          className={`block text-xs font-bold mb-1 ${textSecondary}`}
                        >
                          Jam Pengingat
                        </label>
                        <input
                          type="time"
                          value={dailyTime}
                          onChange={(e) => setDailyTime(e.target.value)}
                          className={inputClass}
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Laporan Mingguan */}
                <div className="p-4">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Mail
                        className={`w-4 h-4 ${isDark ? "text-emerald-400" : "text-emerald-500"}`}
                      />
                      <p className="font-bold text-sm">Laporan Mingguan</p>
                    </div>
                    <Toggle
                      value={weeklyEnabled}
                      onChange={setWeeklyEnabled}
                      colorClass="bg-emerald-500"
                    />
                  </div>
                  <p
                    className={`text-xs font-medium mb-2 pl-6 ${textSecondary}`}
                  >
                    Kirim rekap keuangan keluarga ke email tiap Senin pagi
                  </p>
                  {weeklyEnabled && (
                    <div className="pl-6 mt-2">
                      <label
                        className={`block text-xs font-bold mb-1 ${textSecondary}`}
                      >
                        Kirim ke Email
                      </label>
                      <input
                        type="email"
                        value={weeklyEmail}
                        onChange={(e) => setWeeklyEmail(e.target.value)}
                        placeholder="email@contoh.com"
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Status & Save */}
          {!settingsLoading && (
            <div className="mt-3 flex flex-col gap-2">
              {settingsError && (
                <div className="overlay-danger-soft flex items-center gap-2 text-xs font-medium px-3 py-2.5 rounded-xl">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {settingsError}
                </div>
              )}
              {settingsSaved && (
                <div className="overlay-success-soft flex items-center gap-2 text-xs font-medium px-3 py-2.5 rounded-xl border">
                  <Check className="w-4 h-4 flex-shrink-0" />
                  Pengaturan berhasil disimpan
                </div>
              )}
              {!user?.familyId && (
                <div className="overlay-warning-soft flex items-center gap-2 text-xs font-medium px-3 py-2.5 rounded-xl border">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  Bergabung ke keluarga terlebih dahulu untuk mengaktifkan fitur
                  ini
                </div>
              )}
              <button
                onClick={handleSaveNotifSettings}
                disabled={settingsSaving || settingsLoading || !user?.familyId}
                className="w-full py-3 rounded-xl btn-primary-theme text-sm font-bold shadow-primary-theme active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {settingsSaving ? (
                  <>
                    <Loader className="w-4 h-4 animate-spin" /> Menyimpan...
                  </>
                ) : (
                  <>
                    <Check className="w-4 h-4" /> Simpan Pengaturan Notifikasi
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        <Suspense fallback={null}>
          <PengaturanAIConfigSection isOpen={isOpen} />
        </Suspense>

        {/* TAMPILAN & DATA */}
        <section className="px-4 mt-6">
          <h3
            className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${textSecondary}`}
          >
            TAMPILAN & DATA
          </h3>
          <div className={`${panelClass} overflow-hidden`}>
            <div
              className={`flex items-center justify-between p-4 border-b ${isDark ? "border-gray-700" : "border-gray-50"}`}
            >
              <div>
                <p className="font-bold text-sm">Mode Gelap (Dark Mode)</p>
                <p className={`text-xs font-medium mt-0.5 ${textSecondary}`}>
                  Ganti tampilan ke tema gelap
                </p>
              </div>
              <Toggle
                value={isDark}
                onChange={setIsDark}
                colorClass="bg-primary-theme"
              />
            </div>
            <button
              className={`w-full flex items-center justify-between p-4 transition ${isDark ? "hover:bg-gray-700 active:bg-gray-600" : "hover:bg-gray-50 active:bg-gray-100"}`}
            >
              <div className="text-left">
                <p className="font-bold text-sm text-primary-adaptive">
                  Ekspor Data (CSV)
                </p>
                <p className={`text-xs font-medium mt-0.5 ${textSecondary}`}>
                  Unduh data untuk dibuka di Excel/Spreadsheet
                </p>
              </div>
              <Download className="w-5 h-5 text-primary-adaptive flex-shrink-0" />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function PengaturanSettingsSkeleton({ isDark }) {
  const line = isDark ? "bg-white/10" : "bg-gray-200";
  const lineSoft = isDark ? "bg-white/7" : "bg-gray-100";
  const divider = isDark ? "border-gray-700" : "border-gray-50";

  return (
    <div className="overflow-hidden" aria-hidden="true">
      <div className={`p-4 border-b ${divider} skeleton-shimmer`}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`h-4 w-4 rounded ${line}`} />
            <div className={`h-3.5 w-28 rounded-full ${line}`} />
          </div>
          <div className={`h-6 w-11 rounded-full ${lineSoft}`} />
        </div>
        <div className={`h-2.5 w-3/4 rounded-full ${lineSoft}`} />
        <div className="mt-3 pl-6 flex items-center gap-3">
          <div className={`h-4 w-4 rounded ${lineSoft}`} />
          <div className="flex-1">
            <div className={`h-2.5 w-24 rounded-full ${lineSoft}`} />
            <div className={`mt-2 h-9 w-full rounded-xl ${line}`} />
          </div>
        </div>
      </div>

      <div
        className="p-4 skeleton-shimmer"
        style={{ "--skeleton-delay": "140ms" }}
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className={`h-4 w-4 rounded ${line}`} />
            <div className={`h-3.5 w-28 rounded-full ${line}`} />
          </div>
          <div className={`h-6 w-11 rounded-full ${lineSoft}`} />
        </div>
        <div className={`h-2.5 w-4/5 rounded-full ${lineSoft}`} />
        <div className="mt-3 pl-6">
          <div className={`h-2.5 w-20 rounded-full ${lineSoft}`} />
          <div className={`mt-2 h-9 w-full rounded-xl ${line}`} />
        </div>
      </div>
    </div>
  );
}
