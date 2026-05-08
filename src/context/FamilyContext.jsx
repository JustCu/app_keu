import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import {
  apiCreateFamily,
  apiGetFamily,
  apiJoinFamily,
  apiLeaveFamily,
  apiRemoveMember,
  apiRotateInviteCode,
  apiTransferAdmin,
} from "../services/api";

const FamilyContext = createContext();

function normalizeFamilyError(error) {
  const map = {
    INVALID_CODE: "Kode undangan tidak valid.",
    ALREADY_MEMBER: "Anda sudah tergabung di keluarga ini.",
    ALREADY_IN_FAMILY: "Akun ini sudah tergabung di keluarga lain.",
    USER_NOT_FOUND: "Akun tidak ditemukan.",
    USER_NOT_IN_FAMILY: "Akun belum tergabung ke keluarga.",
    FORBIDDEN: "Anda tidak punya akses untuk aksi ini.",
    UNAUTHORIZED: "Anda tidak punya izin untuk aksi ini.",
    MEMBER_NOT_FOUND: "Anggota tidak ditemukan.",
    CANNOT_REMOVE_SELF: "Anda tidak dapat menghapus diri sendiri.",
    CANNOT_REMOVE_ADMIN: "Admin tidak dapat dihapus.",
    ADMIN_CANNOT_LEAVE:
      "Admin tidak bisa keluar selama masih ada anggota lain.",
    FAMILY_NOT_FOUND: "Keluarga tidak ditemukan.",
    INVALID_TARGET: "Target admin baru tidak valid.",
    ALREADY_ADMIN: "Anggota tersebut sudah menjadi admin.",
    UNAUTHORIZED_WRITE: "Aksi ditolak karena hak akses tidak valid.",
    AUDIT_NOT_FOUND: "Data audit tidak ditemukan.",
    ROLLBACK_NOT_SUPPORTED: "Aksi ini tidak bisa di-rollback.",
    ROLLBACK_FAILED: "Rollback gagal karena kondisi data saat ini.",
    INVALID_PAYLOAD: "Data request tidak valid.",
  };
  return map[error] || error || "Terjadi kesalahan.";
}

export function FamilyProvider({ children }) {
  const { user, updateUserLocally } = useAuth();
  const [family, setFamily] = useState(null);
  const [members, setMembers] = useState([]);
  const [isLoadingFamily, setIsLoadingFamily] = useState(false);
  const [familyError, setFamilyError] = useState("");

  const clearFamilyState = useCallback(() => {
    setFamily(null);
    setMembers([]);
    setFamilyError("");
    setIsLoadingFamily(false);
  }, []);

  const refreshFamily = useCallback(async () => {
    if (!user?.familyId) {
      clearFamilyState();
      return { success: true, data: null };
    }

    setIsLoadingFamily(true);
    setFamilyError("");

    const res = await apiGetFamily(user.familyId, user.id);
    setIsLoadingFamily(false);

    if (!res.success) {
      const message = normalizeFamilyError(res.error);
      setFamilyError(message);
      return { success: false, error: message, code: res.error };
    }

    setFamily(res.data.family || null);
    setMembers(Array.isArray(res.data.members) ? res.data.members : []);
    return { success: true, data: res.data };
  }, [user?.familyId, user?.id, clearFamilyState]);

  const createFamily = useCallback(
    async ({ namaKeluarga }) => {
      if (!user?.id) return { success: false, error: "Tidak ada sesi aktif." };
      const trimmed = String(namaKeluarga || "").trim();
      if (!trimmed)
        return { success: false, error: "Nama keluarga tidak boleh kosong." };

      const res = await apiCreateFamily({
        userId: user.id,
        namaKeluarga: trimmed,
        namaUser: user.nama,
      });
      if (!res.success) {
        return {
          success: false,
          error: normalizeFamilyError(res.error),
          code: res.error,
        };
      }

      updateUserLocally({ familyId: res.data.familyId, peran: "admin" });
      await refreshFamily();
      return { success: true, data: res.data };
    },
    [user?.id, user?.nama, updateUserLocally, refreshFamily],
  );

  const joinFamily = useCallback(
    async ({ inviteCode, hubungan }) => {
      if (!user?.id) return { success: false, error: "Tidak ada sesi aktif." };

      const normalizedCode = String(inviteCode || "")
        .trim()
        .toUpperCase();
      if (!normalizedCode)
        return { success: false, error: "Kode undangan harus diisi." };

      const res = await apiJoinFamily({
        userId: user.id,
        inviteCode: normalizedCode,
        namaUser: user.nama,
        hubungan: String(hubungan || "").trim() || "Anggota",
      });

      if (!res.success) {
        return {
          success: false,
          error: normalizeFamilyError(res.error),
          code: res.error,
        };
      }

      updateUserLocally({ familyId: res.data.familyId, peran: "anggota" });
      await refreshFamily();
      return { success: true, data: res.data };
    },
    [user?.id, user?.nama, updateUserLocally, refreshFamily],
  );

  const removeMember = useCallback(
    async (memberUserId) => {
      if (!user?.id || !user?.familyId)
        return { success: false, error: "Tidak ada keluarga aktif." };

      const res = await apiRemoveMember({
        requesterId: user.id,
        memberUserId,
        familyId: user.familyId,
      });
      if (!res.success) {
        return {
          success: false,
          error: normalizeFamilyError(res.error),
          code: res.error,
        };
      }

      await refreshFamily();
      return { success: true };
    },
    [user?.id, user?.familyId, refreshFamily],
  );

  const leaveFamily = useCallback(async () => {
    if (!user?.id || !user?.familyId)
      return { success: false, error: "Tidak ada keluarga aktif." };

    const res = await apiLeaveFamily({
      userId: user.id,
      familyId: user.familyId,
    });
    if (!res.success) {
      return {
        success: false,
        error: normalizeFamilyError(res.error),
        code: res.error,
      };
    }

    updateUserLocally({ familyId: null, peran: null });
    clearFamilyState();
    return { success: true, data: res.data || null };
  }, [user?.id, user?.familyId, updateUserLocally, clearFamilyState]);

  const rotateInviteCode = useCallback(async () => {
    if (!user?.id || !user?.familyId)
      return { success: false, error: "Tidak ada keluarga aktif." };

    const res = await apiRotateInviteCode({
      requesterId: user.id,
      familyId: user.familyId,
    });
    if (!res.success) {
      return {
        success: false,
        error: normalizeFamilyError(res.error),
        code: res.error,
      };
    }

    setFamily((prev) =>
      prev ? { ...prev, inviteCode: res.data.inviteCode } : prev,
    );
    return { success: true, data: res.data };
  }, [user?.id, user?.familyId]);

  const transferAdmin = useCallback(
    async (newAdminUserId) => {
      if (!user?.id || !user?.familyId)
        return { success: false, error: "Tidak ada keluarga aktif." };

      const res = await apiTransferAdmin({
        requesterId: user.id,
        newAdminUserId,
        familyId: user.familyId,
      });
      if (!res.success) {
        return {
          success: false,
          error: normalizeFamilyError(res.error),
          code: res.error,
        };
      }

      updateUserLocally({ peran: "anggota" });
      await refreshFamily();
      return { success: true, data: res.data };
    },
    [user?.id, user?.familyId, updateUserLocally, refreshFamily],
  );

  const value = useMemo(
    () => ({
      family,
      members,
      isLoadingFamily,
      familyError,
      refreshFamily,
      createFamily,
      joinFamily,
      removeMember,
      leaveFamily,
      rotateInviteCode,
      transferAdmin,
      clearFamilyState,
    }),
    [
      family,
      members,
      isLoadingFamily,
      familyError,
      refreshFamily,
      createFamily,
      joinFamily,
      removeMember,
      leaveFamily,
      rotateInviteCode,
      transferAdmin,
      clearFamilyState,
    ],
  );

  return (
    <FamilyContext.Provider value={value}>{children}</FamilyContext.Provider>
  );
}

export function useFamily() {
  return useContext(FamilyContext);
}
