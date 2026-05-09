import { useState, useEffect } from "react";
import {
  Sparkles,
  Eye,
  EyeOff,
  Check,
  AlertCircle,
  Loader,
} from "lucide-react";
import { useTheme } from "../../context/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { apiGetAIConfig, apiUpdateAIConfig } from "../../services/api";

export default function PengaturanAIConfigSection({ isOpen }) {
  const { isDark } = useTheme();
  const { user } = useAuth();

  const [integrasiAI, setIntegrasiAI] = useState(() => {
    return localStorage.getItem("integrasiAI") !== "false";
  });
  const [aiProvider, setAiProvider] = useState("gemini");
  const [aiApiKey, setAiApiKey] = useState("");
  const [showApiKey, setShowApiKey] = useState(false);
  const [aiConfigLoading, setAiConfigLoading] = useState(false);
  const [aiConfigSaving, setAiConfigSaving] = useState(false);
  const [aiConfigSaved, setAiConfigSaved] = useState(false);
  const [aiConfigError, setAiConfigError] = useState("");
  const [aiTestLoading, setAiTestLoading] = useState(false);
  const [aiTestResult, setAiTestResult] = useState(null);

  useEffect(() => {
    localStorage.setItem("integrasiAI", integrasiAI);
  }, [integrasiAI]);

  useEffect(() => {
    if (!isOpen || !user?.id || !user?.familyId) return;
    setAiConfigLoading(true);
    setAiConfigError("");
    apiGetAIConfig({ familyId: user.familyId })
      .then((res) => {
        if (res.success && res.data) {
          setAiProvider(res.data.provider || "gemini");
          setAiApiKey(res.data.apiKey || "");
        }
      })
      .catch(() => {})
      .finally(() => setAiConfigLoading(false));
  }, [isOpen, user?.id, user?.familyId]);

  const handleTestAIConnection = async () => {
    if (!aiApiKey.trim()) {
      setAiTestResult({
        success: false,
        message: "API key tidak boleh kosong",
      });
      return;
    }
    setAiTestLoading(true);
    setAiTestResult(null);
    const res = await apiUpdateAIConfig({
      familyId: user.familyId,
      provider: aiProvider,
      apiKey: aiApiKey,
      testOnly: true,
    });
    setAiTestLoading(false);
    if (res.success) {
      setAiTestResult({ success: true, message: "Koneksi berhasil" });
    } else {
      setAiTestResult({
        success: false,
        message: res.error || "Gagal terhubung ke API",
      });
    }
  };

  const handleSaveAIConfig = async () => {
    if (!aiApiKey.trim()) {
      setAiConfigError("API key tidak boleh kosong");
      return;
    }
    setAiConfigSaving(true);
    setAiConfigError("");
    setAiConfigSaved(false);
    const res = await apiUpdateAIConfig({
      familyId: user.familyId,
      provider: aiProvider,
      apiKey: aiApiKey,
    });
    setAiConfigSaving(false);
    if (res.success) {
      setAiConfigSaved(true);
      setTimeout(() => setAiConfigSaved(false), 3000);
    } else {
      setAiConfigError(res.error || "Gagal menyimpan konfigurasi API");
    }
  };

  const panelClass = "overlay-panel";
  const compactControlClass =
    "overlay-control w-full rounded-lg px-3 py-2 text-sm font-medium focus:ring-2";
  const compactInputWithIconClass =
    "overlay-control w-full rounded-lg px-3 py-2.5 pr-10 text-sm font-medium focus:ring-2";
  const mutedButtonClass =
    "overlay-muted-button flex items-center justify-center gap-2 rounded-lg text-sm font-bold";
  const textSecondary = isDark ? "text-gray-400" : "text-gray-500";

  const Toggle = ({ value, onChange, colorClass = "bg-primary-theme" }) => (
    <button
      onClick={() => onChange(!value)}
      className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${
        value ? colorClass : isDark ? "bg-gray-700" : "bg-gray-200"
      }`}
    >
      <div
        className={`w-5 h-5 bg-white rounded-full absolute top-0.5 shadow-sm transition-transform ${
          value ? "translate-x-5" : "translate-x-0.5"
        }`}
      ></div>
    </button>
  );

  return (
    <section className="px-4 mt-6">
      <h3
        className={`text-xs font-bold uppercase tracking-wider mb-2 px-1 ${textSecondary}`}
      >
        KONFIGURASI API CLOUD
      </h3>
      <div className={`${panelClass} overflow-hidden`}>
        {aiConfigLoading ? (
          <div className="flex items-center justify-center py-8 gap-2">
            <Loader className={`w-4 h-4 animate-spin ${textSecondary}`} />
            <span className={`text-sm ${textSecondary}`}>
              Memuat konfigurasi AI...
            </span>
          </div>
        ) : (
          <>
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-primary-adaptive" />
                  <p className="font-bold text-sm">Integrasi AI</p>
                </div>
                <Toggle
                  value={integrasiAI}
                  onChange={setIntegrasiAI}
                  colorClass="bg-primary-theme"
                />
              </div>
              <p className={`text-xs font-medium pl-6 ${textSecondary}`}>
                Analisis pengeluaran & buat insight otomatis
              </p>
            </div>

            {integrasiAI && (
              <>
                <div
                  className={`p-4 border-t ${
                    isDark ? "border-gray-700" : "border-gray-50"
                  }`}
                >
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}
                  >
                    Provider AI
                  </label>
                  <select
                    value={aiProvider}
                    onChange={(e) => setAiProvider(e.target.value)}
                    className={compactControlClass}
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="openai">OpenAI (ChatGPT)</option>
                    <option value="deepseek">DeepSeek</option>
                  </select>
                  <p className={`text-xs font-medium mt-2 ${textSecondary}`}>
                    {aiProvider === "gemini"
                      ? "Google Gemini (gratis 60 req/min)"
                      : aiProvider === "openai"
                        ? "OpenAI (perlu credit card, GPT-4o mini recommended)"
                        : "DeepSeek (biaya efisien, model deepseek-chat)"}
                  </p>
                </div>

                <div
                  className={`p-4 border-t ${
                    isDark ? "border-gray-700" : "border-gray-50"
                  }`}
                >
                  <label
                    className={`block text-xs font-bold uppercase tracking-wider mb-2 ${textSecondary}`}
                  >
                    API Key
                  </label>
                  <div className="relative">
                    <input
                      type={showApiKey ? "text" : "password"}
                      value={aiApiKey}
                      onChange={(e) => setAiApiKey(e.target.value)}
                      placeholder="Paste API key Anda di sini"
                      className={compactInputWithIconClass}
                    />
                    <button
                      onClick={() => setShowApiKey(!showApiKey)}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded transition ${
                        isDark
                          ? "text-gray-500 hover:text-gray-300"
                          : "text-gray-400 hover:text-gray-600"
                      }`}
                    >
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                  <p className={`text-xs font-medium mt-2 ${textSecondary}`}>
                    Dapatkan dari:{" "}
                    <a
                      href={
                        aiProvider === "gemini"
                          ? "https://ai.google.dev"
                          : aiProvider === "openai"
                            ? "https://platform.openai.com/api/keys"
                            : "https://platform.deepseek.com/api_keys"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="link-primary-adaptive underline"
                    >
                      {aiProvider === "gemini"
                        ? "ai.google.dev"
                        : aiProvider === "openai"
                          ? "OpenAI API Keys"
                          : "DeepSeek API Keys"}
                    </a>
                  </p>
                </div>

                <div
                  className={`flex gap-2 p-4 border-t ${
                    isDark ? "border-gray-700" : "border-gray-50"
                  }`}
                >
                  <button
                    onClick={handleTestAIConnection}
                    disabled={aiTestLoading || !aiApiKey.trim()}
                    className={`${mutedButtonClass} flex-1 py-2.5`}
                  >
                    {aiTestLoading ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" /> Testing...
                      </>
                    ) : (
                      "Test Koneksi"
                    )}
                  </button>
                  <button
                    onClick={handleSaveAIConfig}
                    disabled={aiConfigSaving || !aiApiKey.trim()}
                    className="flex-1 py-2.5 rounded-lg bg-primary-theme text-white text-sm font-bold hover:bg-primary-strong-theme active:scale-[0.98] transition flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {aiConfigSaving ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" /> Menyimpan...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" /> Simpan
                      </>
                    )}
                  </button>
                </div>

                {aiTestResult && (
                  <div
                    className={`${
                      aiTestResult.success
                        ? "overlay-success-soft border"
                        : "overlay-danger-soft"
                    } mx-4 mb-4 flex items-start gap-2 text-xs font-medium px-3 py-2.5 rounded-lg`}
                  >
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{aiTestResult.message}</span>
                  </div>
                )}

                {aiConfigError && (
                  <div className="overlay-danger-soft mx-4 mb-4 flex items-start gap-2 text-xs font-medium px-3 py-2.5 rounded-lg">
                    <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>{aiConfigError}</span>
                  </div>
                )}

                {aiConfigSaved && (
                  <div className="overlay-success-soft mx-4 mb-4 flex items-start gap-2 text-xs font-medium px-3 py-2.5 rounded-lg border">
                    <Check className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <span>Konfigurasi AI berhasil disimpan</span>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}
