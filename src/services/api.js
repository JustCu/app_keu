// GANTI URL INI DENGAN URL WEB APP GOOGLE APPS SCRIPT ANDA
export const GAS_WEB_APP_URL =
  "https://script.google.com/macros/s/AKfycbyTS95U3jIKN2xrqJZhc-CG2O2yVWrMueB7oC0NemIfZc36DB7lkwWNca1LGdQ_h0z2/exec";

const post = async (action, body) => {
  const response = await fetch(`${GAS_WEB_APP_URL}?action=${action}`, {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "text/plain;charset=utf-8" },
  });
  return response.json();
};

/**
 * Login ke spreadsheet
 */
export async function apiLogin({ email, password }) {
  try {
    const result = await post("login", { email, password });
    if (result.status === "success")
      return { success: true, user: result.data };
    return { success: false, error: result.message };
  } catch (e) {
    return { success: false, error: "Koneksi gagal. Periksa internet Anda." };
  }
}

/**
 * Registrasi akun baru ke spreadsheet
 */
export async function apiRegister({ nama, email, password }) {
  try {
    const result = await post("register", { nama, email, password });
    if (result.status === "success")
      return { success: true, user: result.data };
    return { success: false, error: result.message };
  } catch (e) {
    return { success: false, error: "Koneksi gagal. Periksa internet Anda." };
  }
}

/**
 * Update profil user di spreadsheet
 */
export async function apiUpdateProfile({ id, nama, email }) {
  try {
    const result = await post("updateProfile", { id, nama, email });
    if (result.status === "success")
      return { success: true, user: result.data };
    return { success: false, error: result.message };
  } catch (e) {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiCreateFamily({ userId, namaKeluarga, namaUser }) {
  try {
    const r = await post("createFamily", { userId, namaKeluarga, namaUser });
    if (r.status === "success") return { success: true, data: r.data };
    return { success: false, error: r.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiJoinFamily({
  userId,
  inviteCode,
  namaUser,
  hubungan,
}) {
  try {
    const r = await post("joinFamily", {
      userId,
      inviteCode,
      namaUser,
      hubungan,
    });
    if (r.status === "success") return { success: true, data: r.data };
    return { success: false, error: r.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiGetFamily(familyId, requesterId = "") {
  try {
    const params = new URLSearchParams({
      action: "getFamily",
      familyId: String(familyId),
    });
    if (requesterId) params.set("requesterId", String(requesterId));
    const r = await fetch(`${GAS_WEB_APP_URL}?${params.toString()}`);
    const res = await r.json();
    if (res.status === "success") return { success: true, data: res.data };
    return { success: false, error: res.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiRemoveMember({ requesterId, memberUserId, familyId }) {
  try {
    const r = await post("removeMember", {
      requesterId,
      memberUserId,
      familyId,
    });
    if (r.status === "success") return { success: true };
    return { success: false, error: r.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiLeaveFamily({ userId, familyId }) {
  try {
    const r = await post("leaveFamily", { userId, familyId });
    if (r.status === "success") return { success: true, data: r.data || null };
    return { success: false, error: r.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiRotateInviteCode({ requesterId, familyId }) {
  try {
    const r = await post("rotateInviteCode", { requesterId, familyId });
    if (r.status === "success") return { success: true, data: r.data };
    return { success: false, error: r.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiTransferAdmin({
  requesterId,
  newAdminUserId,
  familyId,
}) {
  try {
    const r = await post("transferAdmin", {
      requesterId,
      newAdminUserId,
      familyId,
    });
    if (r.status === "success") return { success: true, data: r.data };
    return { success: false, error: r.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiGetFamilyAudit({
  familyId,
  requesterId,
  actionFilter = "ALL",
  fromDate = "",
  toDate = "",
  page = 1,
  pageSize = 20,
}) {
  try {
    const params = new URLSearchParams({
      action: "getFamilyAudit",
      familyId: String(familyId || ""),
      requesterId: String(requesterId || ""),
      actionFilter: String(actionFilter || "ALL"),
      page: String(page || 1),
      pageSize: String(pageSize || 20),
    });
    if (fromDate) params.set("fromDate", String(fromDate));
    if (toDate) params.set("toDate", String(toDate));

    const r = await fetch(`${GAS_WEB_APP_URL}?${params.toString()}`);
    const res = await r.json();
    if (res.status === "success") {
      const payload = res.data || {};
      return {
        success: true,
        data: {
          items: Array.isArray(payload.items) ? payload.items : [],
          pagination: payload.pagination || {
            total: 0,
            page: 1,
            pageSize: pageSize || 20,
            totalPages: 1,
          },
        },
      };
    }
    return { success: false, error: res.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiRollbackFamilyAction({
  familyId,
  requesterId,
  auditId,
}) {
  try {
    const r = await post("rollbackFamilyAction", {
      familyId,
      requesterId,
      auditId,
    });
    if (r.status === "success") return { success: true, data: r.data || null };
    return { success: false, error: r.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiGetNotificationReads({ userId, familyId }) {
  try {
    const params = new URLSearchParams({
      action: "getNotificationReads",
      userId: String(userId || ""),
      familyId: String(familyId || ""),
    });
    const r = await fetch(`${GAS_WEB_APP_URL}?${params.toString()}`);
    const res = await r.json();
    if (res.status === "success") {
      return {
        success: true,
        data: {
          readMap: res.data?.readMap || {},
          updatedAt: res.data?.updatedAt || null,
        },
      };
    }
    return { success: false, error: res.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiUpsertNotificationReads({
  userId,
  familyId,
  readMap,
}) {
  try {
    const r = await post("upsertNotificationReads", {
      userId,
      familyId,
      readMap: readMap || {},
    });
    if (r.status === "success") return { success: true, data: r.data || null };
    return { success: false, error: r.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

/**
 * Fetch data transaksi dari Google Sheets
 */
export async function apiGetUserSettings({ userId, familyId }) {
  try {
    const params = new URLSearchParams({
      action: "getUserSettings",
      userId: String(userId || ""),
      familyId: String(familyId || ""),
    });
    const r = await fetch(`${GAS_WEB_APP_URL}?${params.toString()}`);
    const res = await r.json();
    if (res.status === "success") return { success: true, data: res.data };
    return { success: false, error: res.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

export async function apiUpsertUserSettings({ userId, familyId, settings }) {
  try {
    const r = await post("upsertUserSettings", {
      userId,
      familyId,
      dailyReminderEnabled: settings.dailyReminderEnabled ?? false,
      dailyReminderTime: settings.dailyReminderTime ?? "20:00",
      weeklyReportEnabled: settings.weeklyReportEnabled ?? false,
      weeklyReportEmail: settings.weeklyReportEmail ?? "",
    });
    if (r.status === "success") return { success: true, data: r.data || null };
    return { success: false, error: r.message };
  } catch {
    return { success: false, error: "Koneksi gagal." };
  }
}

/**
 * Fetch data transaksi dari Google Sheets
 */
export async function fetchTransaksi(familyId = null) {
  try {
    const url = familyId
      ? `${GAS_WEB_APP_URL}?action=getTransaksi&familyId=${familyId}`
      : `${GAS_WEB_APP_URL}?action=getTransaksi`;
    const response = await fetch(url);
    const result = await response.json();
    if (result.status === "success") return result.data;
    throw new Error(result.message);
  } catch (error) {
    console.error("Error fetching transaksi:", error);
    return [];
  }
}

/**
 * Fetch data pos anggaran dari Google Sheets
 */
export async function fetchAnggaran(familyId = null) {
  try {
    const url = familyId
      ? `${GAS_WEB_APP_URL}?action=getAnggaran&familyId=${familyId}`
      : `${GAS_WEB_APP_URL}?action=getAnggaran`;
    const response = await fetch(url);
    const result = await response.json();
    if (result.status === "success") return result.data;
    throw new Error(result.message);
  } catch (error) {
    console.error("Error fetching anggaran:", error);
    return [];
  }
}

/**
 * Tambah transaksi baru ke Google Sheets
 */
export async function addTransaksi(data) {
  try {
    // GAS doPost requires content-type text/plain to avoid CORS preflight issues in some cases
    // Or we use no-cors, but then we can't read the response easily.
    const response = await fetch(`${GAS_WEB_APP_URL}?action=addTransaksi`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });
    const result = await response.json();
    if (result.status === "success") {
      return { success: true, id: result.data.id };
    }
    throw new Error(result.message);
  } catch (error) {
    console.error("Error adding transaksi:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Tambah pos anggaran baru ke Google Sheets
 */
export async function addAnggaran(data) {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=addAnggaran`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });
    const result = await response.json();
    if (result.status === "success") {
      return { success: true, id: result.data.id };
    }
    throw new Error(result.message);
  } catch (error) {
    console.error("Error adding anggaran:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Update pos anggaran di Google Sheets
 */
export async function editAnggaran(data) {
  try {
    const response = await fetch(`${GAS_WEB_APP_URL}?action=editAnggaran`, {
      method: "POST",
      body: JSON.stringify(data),
      headers: {
        "Content-Type": "text/plain;charset=utf-8",
      },
    });
    const result = await response.json();
    if (result.status === "success") {
      return { success: true, id: result.data.id };
    }
    throw new Error(result.message);
  } catch (error) {
    console.error("Error editing anggaran:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Meminta insight dari Gemini AI via Backend
 */
export async function fetchAIInsights(
  familyId = null,
  options = { period: "bulanan" },
) {
  try {
    const url = familyId
      ? `${GAS_WEB_APP_URL}?action=getAIInsights&familyId=${familyId}`
      : `${GAS_WEB_APP_URL}?action=getAIInsights`;
    const payload = {
      period: options?.period || "bulanan",
    };
    const response = await fetch(url, {
      method: "POST",
      body: JSON.stringify(payload),
      headers: { "Content-Type": "text/plain;charset=utf-8" },
    });
    const result = await response.json();
    if (result.status === "success")
      return { success: true, data: result.data };
    if (result.message === "API_KEY_MISSING")
      return { success: false, error: "API_KEY_MISSING" };
    throw new Error(result.message);
  } catch (error) {
    console.error("Error fetching AI insights:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Meminta insight AI untuk kategori anggaran tertentu
 */
export async function fetchAICategoryInsight(
  familyId,
  categoryName,
  categoryType = "pengeluaran",
  period = "bulanan",
) {
  try {
    const payload = {
      familyId: familyId || "",
      categoryName: categoryName || "",
      categoryType: categoryType || "pengeluaran",
      period: period || "bulanan",
    };
    const response = await fetch(
      `${GAS_WEB_APP_URL}?action=getAICategoryInsight`,
      {
        method: "POST",
        body: JSON.stringify(payload),
        headers: { "Content-Type": "text/plain;charset=utf-8" },
      },
    );
    const result = await response.json();
    if (result.status === "success")
      return { success: true, data: result.data || null };
    if (result.message === "API_KEY_MISSING")
      return { success: false, error: "API_KEY_MISSING" };
    throw new Error(result.message || "UNKNOWN_ERROR");
  } catch (error) {
    console.error("Error fetching AI category insight:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Mengambil histori insight mingguan kategori dan skor terbaru per kategori
 */
export async function fetchAICategoryWeeklyHistory(
  familyId,
  { categoryName = "", weeks = 8 } = {},
) {
  try {
    const params = new URLSearchParams({
      action: "getAICategoryWeeklyHistory",
      familyId: String(familyId || ""),
      weeks: String(weeks || 8),
    });
    if (categoryName) params.set("categoryName", String(categoryName));

    const response = await fetch(`${GAS_WEB_APP_URL}?${params.toString()}`);
    const result = await response.json();
    if (result.status === "success") {
      return {
        success: true,
        data: {
          items: result.data?.items || [],
          latestByCategory: result.data?.latestByCategory || {},
        },
      };
    }
    throw new Error(result.message || "UNKNOWN_ERROR");
  } catch (error) {
    console.error("Error fetching AI category weekly history:", error);
    return { success: false, error: error.message };
  }
}
