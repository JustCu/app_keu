const SPREADSHEET_ID = "1fVZG007PvxwvvAqdZgcuzGnuymAMsy_kwtzfUN32ax8";

function getSpreadsheet() {
  if (SPREADSHEET_ID === "GANTI_DENGAN_ID_SPREADSHEET_ANDA")
    return SpreadsheetApp.getActiveSpreadsheet();
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function generateId() {
  return "ID-" + Math.random().toString(36).substr(2, 9).toUpperCase();
}
function generateInviteCode() {
  return Math.random().toString(36).substr(2, 6).toUpperCase();
}

function findRowIndexById(rows, id, idColumnIndex) {
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][idColumnIndex] === id) return i + 1;
  }
  return -1;
}

function getUserById(rows, userId) {
  const row = rows.slice(1).find((r) => r[0] === userId);
  if (!row) return null;
  return {
    id: row[0],
    nama: row[1],
    email: row[2],
    inisial: row[4],
    familyId: row[5] || "",
    peran: row[6] || "",
  };
}

function generateUniqueInviteCode(familyRows) {
  let code = generateInviteCode();
  let attempts = 0;
  while (
    familyRows.slice(1).some((r) => String(r[3]).toUpperCase() === code) &&
    attempts < 20
  ) {
    code = generateInviteCode();
    attempts++;
  }
  return code;
}

function appendFamilyAudit(ss, payload) {
  const sheet = ss.getSheetByName("Family_Audit");
  if (!sheet) return;
  sheet.appendRow([
    generateId(),
    payload.familyId || "",
    payload.actorUserId || "",
    payload.actorName || "",
    payload.action || "",
    payload.targetUserId || "",
    payload.targetName || "",
    payload.metadata ? JSON.stringify(payload.metadata) : "",
    new Date().toISOString(),
  ]);
}

function isFamilyMember(ss, userId, familyId) {
  if (!userId || !familyId) return false;
  const mSheet = ss.getSheetByName("Anggota_Keluarga");
  if (!mSheet) return false;
  const mData = mSheet.getDataRange().getValues();
  return mData.slice(1).some((r) => r[1] === familyId && r[2] === userId);
}

function parseJSONSafe(str, fallbackValue) {
  try {
    if (!str) return fallbackValue;
    return JSON.parse(str);
  } catch (err) {
    return fallbackValue;
  }
}

function getMemberRowIndexByUserId(memberRows, familyId, userId) {
  for (let i = 1; i < memberRows.length; i++) {
    if (memberRows[i][1] === familyId && memberRows[i][2] === userId)
      return i + 1;
  }
  return -1;
}

const ROLLBACK_WINDOW_MS = 24 * 60 * 60 * 1000;

function ensureSheetHeaders(sheetName, headers, options) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  const opts = options || {};

  if (sheet.getMaxColumns() < headers.length) {
    sheet.insertColumnsAfter(
      sheet.getMaxColumns(),
      headers.length - sheet.getMaxColumns(),
    );
  }

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight("bold");

  if (Array.isArray(opts.hideColumns)) {
    opts.hideColumns.forEach((col) => {
      if (col > 0 && col <= sheet.getMaxColumns()) {
        sheet.hideColumns(col);
      }
    });
  }
}

function initSheets() {
  ensureSheetHeaders("Transaksi", [
    "ID",
    "Tanggal",
    "Tipe",
    "Pos Anggaran",
    "Nominal",
    "Catatan",
    "FamilyId",
    "AddedBy",
    "AddedByName",
    "Timestamp",
  ]);

  ensureSheetHeaders("Pos_Anggaran", [
    "ID",
    "Nama",
    "Batas",
    "Ikon",
    "Tipe",
    "FamilyId",
    "AddedBy",
    "AddedByName",
    "LastEditedBy",
    "LastEditedByName",
  ]);

  ensureSheetHeaders(
    "Users",
    [
      "ID",
      "Nama",
      "Email",
      "Password",
      "Inisial",
      "FamilyId",
      "Peran",
      "CreatedAt",
    ],
    { hideColumns: [4] },
  );

  ensureSheetHeaders("Keluarga", [
    "ID",
    "Nama",
    "AdminId",
    "InviteCode",
    "CreatedAt",
  ]);

  ensureSheetHeaders("Anggota_Keluarga", [
    "ID",
    "FamilyId",
    "UserId",
    "Nama",
    "Peran",
    "Hubungan",
    "JoinedAt",
  ]);

  ensureSheetHeaders("Family_Audit", [
    "ID",
    "FamilyId",
    "ActorUserId",
    "ActorName",
    "Action",
    "TargetUserId",
    "TargetName",
    "Metadata",
    "Timestamp",
  ]);
}

function doPost(e) {
  return handleRequest(e, true);
}
function doGet(e) {
  if (e.parameter.action === "init") {
    initSheets();
    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", message: "Initialized" }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
  if (e.parameter.action === "syncHeaders") {
    initSheets();
    return ContentService.createTextOutput(
      JSON.stringify({ status: "success", message: "Headers synced" }),
    ).setMimeType(ContentService.MimeType.JSON);
  }
  return handleRequest(e, false);
}

function handleRequest(e, isPost) {
  const output = { status: "success", data: null, message: "" };
  try {
    const action = e.parameter.action;
    if (!action) throw new Error("Action required");

    // === GET DATA ===
    if (action === "getTransaksi") {
      const familyId = e.parameter.familyId || null;
      output.data = getFilteredData("Transaksi", familyId, 6);
    } else if (action === "getAnggaran") {
      const familyId = e.parameter.familyId || null;
      output.data = getFilteredData("Pos_Anggaran", familyId, 5);
    } else if (action === "getFamily") {
      const familyId = e.parameter.familyId;
      const requesterId = e.parameter.requesterId || "";
      if (!familyId) throw new Error("familyId required");
      const ss = getSpreadsheet();
      const fSheet = ss.getSheetByName("Keluarga");
      const fData = fSheet ? fSheet.getDataRange().getValues() : [];
      const fRow = fData.slice(1).find((r) => r[0] === familyId);
      if (!fRow) throw new Error("Keluarga tidak ditemukan");
      const mSheet = ss.getSheetByName("Anggota_Keluarga");
      const mData = mSheet ? mSheet.getDataRange().getValues() : [];
      if (requesterId) {
        const isMember = mData
          .slice(1)
          .some((r) => r[1] === familyId && r[2] === requesterId);
        if (!isMember) {
          output.status = "error";
          output.message = "FORBIDDEN";
          return ContentService.createTextOutput(
            JSON.stringify(output),
          ).setMimeType(ContentService.MimeType.JSON);
        }
      }
      const members = mData
        .slice(1)
        .filter((r) => r[1] === familyId)
        .map((r) => ({
          id: r[0],
          familyId: r[1],
          userId: r[2],
          nama: r[3],
          peran: r[4],
          hubungan: r[5],
          joinedAt: r[6],
        }));
      output.data = {
        family: {
          id: fRow[0],
          nama: fRow[1],
          adminId: fRow[2],
          inviteCode: fRow[3],
          createdAt: fRow[4],
        },
        members,
      };
    } else if (action === "getFamilyAudit") {
      const familyId = e.parameter.familyId || "";
      const requesterId = e.parameter.requesterId || "";
      const actionFilter = String(
        e.parameter.actionFilter || "ALL",
      ).toUpperCase();
      const fromDate = e.parameter.fromDate || "";
      const toDate = e.parameter.toDate || "";
      const pageRaw = parseInt(String(e.parameter.page || "1"), 10);
      const pageSizeRaw = parseInt(String(e.parameter.pageSize || "20"), 10);
      const page = Number.isFinite(pageRaw) && pageRaw > 0 ? pageRaw : 1;
      const pageSize = Number.isFinite(pageSizeRaw)
        ? Math.min(Math.max(pageSizeRaw, 5), 100)
        : 20;
      if (!familyId || !requesterId)
        throw new Error("familyId & requesterId required");

      const ss = getSpreadsheet();
      if (!isFamilyMember(ss, requesterId, familyId)) {
        output.status = "error";
        output.message = "FORBIDDEN";
      } else {
        const aSheet = ss.getSheetByName("Family_Audit");
        const aData = aSheet ? aSheet.getDataRange().getValues() : [];
        const fromTs = fromDate
          ? new Date(fromDate + "T00:00:00").getTime()
          : null;
        const toTs = toDate ? new Date(toDate + "T23:59:59").getTime() : null;

        const rows = aData.slice(1).filter((r) => {
          if (r[1] !== familyId) return false;
          if (
            actionFilter !== "ALL" &&
            String(r[4]).toUpperCase() !== actionFilter
          )
            return false;
          if (fromTs || toTs) {
            const ts = new Date(r[8]).getTime();
            if (fromTs && ts < fromTs) return false;
            if (toTs && ts > toTs) return false;
          }
          return true;
        });

        const allItems = rows
          .map((r) => ({
            id: r[0],
            familyId: r[1],
            actorUserId: r[2],
            actorName: r[3],
            action: r[4],
            targetUserId: r[5],
            targetName: r[6],
            metadata: parseJSONSafe(r[7], {}),
            timestamp: r[8],
          }))
          .sort(
            (a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
          );

        const rollbackMap = {};
        allItems.forEach((item) => {
          if (!String(item.action || "").startsWith("ROLLBACK_")) return;
          const sourceAuditId = item.metadata?.sourceAuditId;
          if (!sourceAuditId) return;
          const current = rollbackMap[sourceAuditId];
          if (!current) {
            rollbackMap[sourceAuditId] = item;
            return;
          }
          if (
            new Date(item.timestamp).getTime() >
            new Date(current.timestamp).getTime()
          ) {
            rollbackMap[sourceAuditId] = item;
          }
        });

        const enriched = allItems.map((item) => {
          const rollbackInfo = rollbackMap[item.id] || null;
          const ts = new Date(item.timestamp).getTime();
          const rollbackWindowExpired = !Number.isFinite(ts)
            ? true
            : Date.now() - ts > ROLLBACK_WINDOW_MS;
          const rollbackUntil = Number.isFinite(ts)
            ? new Date(ts + ROLLBACK_WINDOW_MS).toISOString()
            : null;

          return {
            ...item,
            rolledBack: !!rollbackInfo,
            rollbackInfo: rollbackInfo
              ? {
                  id: rollbackInfo.id,
                  action: rollbackInfo.action,
                  timestamp: rollbackInfo.timestamp,
                }
              : null,
            rollbackWindowExpired,
            rollbackUntil,
          };
        });

        const total = enriched.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const safePage = Math.min(page, totalPages);
        const start = (safePage - 1) * pageSize;
        const end = start + pageSize;

        output.data = {
          items: enriched.slice(start, end),
          pagination: {
            total,
            page: safePage,
            pageSize,
            totalPages,
          },
        };
      }

      // === AUTH ===
    } else if (action === "register" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      if (!ss.getSheetByName("Users")) initSheets();
      const sheet = ss.getSheetByName("Users");
      const data = sheet.getDataRange().getValues();
      if (
        data
          .slice(1)
          .some(
            (r) => String(r[2]).toLowerCase() === String(p.email).toLowerCase(),
          )
      ) {
        output.status = "error";
        output.message = "EMAIL_EXISTS";
      } else {
        const id = generateId();
        const inisial = p.nama
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        sheet.appendRow([
          id,
          p.nama,
          p.email,
          Utilities.base64Encode(p.password),
          inisial,
          "",
          "",
          new Date().toISOString(),
        ]);
        output.data = {
          id,
          nama: p.nama,
          email: p.email,
          inisial,
          familyId: null,
          peran: null,
        };
      }
    } else if (action === "login" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      const sheet = ss.getSheetByName("Users");
      if (!sheet) {
        output.status = "error";
        output.message = "INVALID_CREDENTIALS";
      } else {
        const data = sheet.getDataRange().getValues();
        const row = data
          .slice(1)
          .find(
            (r) =>
              String(r[2]).toLowerCase() === String(p.email).toLowerCase() &&
              String(r[3]) === Utilities.base64Encode(p.password),
          );
        if (row)
          output.data = {
            id: row[0],
            nama: row[1],
            email: row[2],
            inisial: row[4],
            familyId: row[5] || null,
            peran: row[6] || null,
          };
        else {
          output.status = "error";
          output.message = "INVALID_CREDENTIALS";
        }
      }
    } else if (action === "updateProfile" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      const sheet = ss.getSheetByName("Users");
      if (!sheet) throw new Error("Sheet Users tidak ditemukan");
      const data = sheet.getDataRange().getValues();
      let ri = -1;
      for (let i = 1; i < data.length; i++) {
        if (data[i][0] === p.id) {
          ri = i + 1;
          break;
        }
      }
      if (ri !== -1) {
        const inisial = p.nama
          .split(" ")
          .map((w) => w[0])
          .join("")
          .slice(0, 2)
          .toUpperCase();
        sheet.getRange(ri, 2).setValue(p.nama);
        sheet.getRange(ri, 3).setValue(p.email);
        sheet.getRange(ri, 5).setValue(inisial);
        const mSheet = ss.getSheetByName("Anggota_Keluarga");
        if (mSheet) {
          const mData = mSheet.getDataRange().getValues();
          for (let i = 1; i < mData.length; i++) {
            if (mData[i][2] === p.id) {
              mSheet.getRange(i + 1, 4).setValue(p.nama);
              break;
            }
          }
        }
        output.data = { id: p.id, nama: p.nama, email: p.email, inisial };
      } else {
        output.status = "error";
        output.message = "User tidak ditemukan";
      }

      // === FAMILY MANAGEMENT ===
    } else if (action === "createFamily" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      if (!ss.getSheetByName("Keluarga")) initSheets();
      const uSheet = ss.getSheetByName("Users");
      const uData = uSheet.getDataRange().getValues();
      const user = getUserById(uData, p.userId);
      if (!user) {
        output.status = "error";
        output.message = "USER_NOT_FOUND";
      } else if (user.familyId) {
        output.status = "error";
        output.message = "ALREADY_IN_FAMILY";
      } else {
        const familyId = generateId();
        const kSheet = ss.getSheetByName("Keluarga");
        const kData = kSheet.getDataRange().getValues();
        const inviteCode = generateUniqueInviteCode(kData);
        const ts = new Date().toISOString();
        kSheet.appendRow([familyId, p.namaKeluarga, p.userId, inviteCode, ts]);
        const memberId = generateId();
        ss.getSheetByName("Anggota_Keluarga").appendRow([
          memberId,
          familyId,
          p.userId,
          p.namaUser,
          "admin",
          "Kepala Keluarga",
          ts,
        ]);
        const userRowIndex = findRowIndexById(uData, p.userId, 0);
        if (userRowIndex !== -1) {
          uSheet.getRange(userRowIndex, 6).setValue(familyId);
          uSheet.getRange(userRowIndex, 7).setValue("admin");
        }
        output.data = {
          familyId,
          inviteCode,
          namaKeluarga: p.namaKeluarga,
          peran: "admin",
        };
        output.message = "Keluarga berhasil dibuat";
        appendFamilyAudit(ss, {
          familyId,
          actorUserId: p.userId,
          actorName: p.namaUser,
          action: "CREATE_FAMILY",
          targetUserId: p.userId,
          targetName: p.namaUser,
          metadata: { namaKeluarga: p.namaKeluarga },
        });
      }
    } else if (action === "joinFamily" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      const fSheet = ss.getSheetByName("Keluarga");
      if (!fSheet) throw new Error("Tidak ada keluarga terdaftar");
      const fData = fSheet.getDataRange().getValues();
      const inviteCode = String(p.inviteCode || "")
        .trim()
        .toUpperCase();
      if (!inviteCode) {
        output.status = "error";
        output.message = "INVALID_CODE";
      } else {
        const fRow = fData
          .slice(1)
          .find((r) => String(r[3]).toUpperCase() === inviteCode);
        if (!fRow) {
          output.status = "error";
          output.message = "INVALID_CODE";
        } else {
          const familyId = fRow[0];
          const uSheet = ss.getSheetByName("Users");
          const uData = uSheet.getDataRange().getValues();
          const user = getUserById(uData, p.userId);
          if (!user) {
            output.status = "error";
            output.message = "USER_NOT_FOUND";
          } else if (user.familyId && user.familyId !== familyId) {
            output.status = "error";
            output.message = "ALREADY_IN_FAMILY";
          } else {
            const mSheet = ss.getSheetByName("Anggota_Keluarga");
            const mData = mSheet.getDataRange().getValues();
            if (
              mData.slice(1).some((r) => r[1] === familyId && r[2] === p.userId)
            ) {
              output.status = "error";
              output.message = "ALREADY_MEMBER";
            } else {
              const ts = new Date().toISOString();
              mSheet.appendRow([
                generateId(),
                familyId,
                p.userId,
                p.namaUser,
                "anggota",
                p.hubungan || "Anggota",
                ts,
              ]);
              const userRowIndex = findRowIndexById(uData, p.userId, 0);
              if (userRowIndex !== -1) {
                uSheet.getRange(userRowIndex, 6).setValue(familyId);
                uSheet.getRange(userRowIndex, 7).setValue("anggota");
              }
              output.data = {
                familyId,
                namaKeluarga: fRow[1],
                peran: "anggota",
              };
              output.message = "Berhasil bergabung";
              appendFamilyAudit(ss, {
                familyId,
                actorUserId: p.userId,
                actorName: p.namaUser,
                action: "JOIN_FAMILY",
                targetUserId: p.userId,
                targetName: p.namaUser,
                metadata: { hubungan: p.hubungan || "Anggota" },
              });
            }
          }
        }
      }
    } else if (action === "removeMember" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      const uSheet = ss.getSheetByName("Users");
      const uData = uSheet.getDataRange().getValues();
      const requester = getUserById(uData, p.requesterId);
      if (
        !requester ||
        requester.peran !== "admin" ||
        requester.familyId !== p.familyId
      ) {
        output.status = "error";
        output.message = "UNAUTHORIZED";
      } else if (p.memberUserId === p.requesterId) {
        output.status = "error";
        output.message = "CANNOT_REMOVE_SELF";
      } else {
        const mSheet = ss.getSheetByName("Anggota_Keluarga");
        const mData = mSheet.getDataRange().getValues();
        let ri = -1;
        let memberRole = "";
        let memberName = "";
        let memberHubungan = "";
        let memberJoinedAt = "";
        for (let i = 1; i < mData.length; i++) {
          if (mData[i][2] === p.memberUserId && mData[i][1] === p.familyId) {
            ri = i + 1;
            memberRole = mData[i][4] || "";
            memberName = mData[i][3] || "";
            memberHubungan = mData[i][5] || "";
            memberJoinedAt = mData[i][6] || "";
            break;
          }
        }
        if (ri === -1) {
          output.status = "error";
          output.message = "MEMBER_NOT_FOUND";
        } else if (memberRole === "admin") {
          output.status = "error";
          output.message = "CANNOT_REMOVE_ADMIN";
        } else {
          const targetUser = getUserById(uData, p.memberUserId);
          mSheet.deleteRow(ri);
          const memberRowIndex = findRowIndexById(uData, p.memberUserId, 0);
          if (memberRowIndex !== -1) {
            uSheet.getRange(memberRowIndex, 6).setValue("");
            uSheet.getRange(memberRowIndex, 7).setValue("");
          }
          output.message = "Anggota dihapus";
          appendFamilyAudit(ss, {
            familyId: p.familyId,
            actorUserId: p.requesterId,
            actorName: requester.nama,
            action: "REMOVE_MEMBER",
            targetUserId: p.memberUserId,
            targetName: targetUser ? targetUser.nama : "",
            metadata: {
              removedRole: memberRole || "anggota",
              removedNama: memberName || (targetUser ? targetUser.nama : ""),
              removedHubungan: memberHubungan || "Anggota",
              removedJoinedAt: memberJoinedAt || new Date().toISOString(),
            },
          });
        }
      }
    } else if (action === "leaveFamily" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      const uSheet = ss.getSheetByName("Users");
      const uData = uSheet.getDataRange().getValues();
      const user = getUserById(uData, p.userId);
      if (!user || !user.familyId) {
        output.status = "error";
        output.message = "USER_NOT_IN_FAMILY";
      } else if (p.familyId && user.familyId !== p.familyId) {
        output.status = "error";
        output.message = "FORBIDDEN";
      } else {
        const familyId = user.familyId;
        const mSheet = ss.getSheetByName("Anggota_Keluarga");
        const mData = mSheet.getDataRange().getValues();
        const familyMembers = mData.slice(1).filter((r) => r[1] === familyId);
        const me = familyMembers.find((r) => r[2] === user.id);
        if (!me) {
          output.status = "error";
          output.message = "MEMBER_NOT_FOUND";
        } else {
          const isAdmin = (me[4] || "") === "admin";
          if (isAdmin && familyMembers.length > 1) {
            output.status = "error";
            output.message = "ADMIN_CANNOT_LEAVE";
          } else {
            const memberRowIndex = findRowIndexById(mData, user.id, 2);
            if (memberRowIndex !== -1) mSheet.deleteRow(memberRowIndex);

            const userRowIndex = findRowIndexById(uData, user.id, 0);
            if (userRowIndex !== -1) {
              uSheet.getRange(userRowIndex, 6).setValue("");
              uSheet.getRange(userRowIndex, 7).setValue("");
            }

            if (isAdmin && familyMembers.length === 1) {
              const fSheet = ss.getSheetByName("Keluarga");
              const fData = fSheet.getDataRange().getValues();
              const familyRowIndex = findRowIndexById(fData, familyId, 0);
              if (familyRowIndex !== -1) fSheet.deleteRow(familyRowIndex);
            }

            output.message = "Berhasil keluar dari keluarga";
            output.data = {
              familyDeleted: isAdmin && familyMembers.length === 1,
            };
            appendFamilyAudit(ss, {
              familyId,
              actorUserId: user.id,
              actorName: user.nama,
              action: "LEAVE_FAMILY",
              targetUserId: user.id,
              targetName: user.nama,
              metadata: {
                familyDeleted: isAdmin && familyMembers.length === 1,
              },
            });
          }
        }
      }
    } else if (action === "rotateInviteCode" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      const uSheet = ss.getSheetByName("Users");
      const uData = uSheet.getDataRange().getValues();
      const requester = getUserById(uData, p.requesterId);
      if (
        !requester ||
        requester.peran !== "admin" ||
        requester.familyId !== p.familyId
      ) {
        output.status = "error";
        output.message = "UNAUTHORIZED";
      } else {
        const fSheet = ss.getSheetByName("Keluarga");
        const fData = fSheet.getDataRange().getValues();
        const familyRowIndex = findRowIndexById(fData, p.familyId, 0);
        if (familyRowIndex === -1) {
          output.status = "error";
          output.message = "FAMILY_NOT_FOUND";
        } else {
          const oldInviteCode = fData[familyRowIndex - 1][3] || "";
          const newInviteCode = generateUniqueInviteCode(fData);
          fSheet.getRange(familyRowIndex, 4).setValue(newInviteCode);
          output.data = { inviteCode: newInviteCode };
          output.message = "Kode undangan berhasil diperbarui";
          appendFamilyAudit(ss, {
            familyId: p.familyId,
            actorUserId: p.requesterId,
            actorName: requester.nama,
            action: "ROTATE_INVITE_CODE",
            metadata: { oldInviteCode, newInviteCode },
          });
        }
      }
    } else if (action === "transferAdmin" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      const uSheet = ss.getSheetByName("Users");
      const uData = uSheet.getDataRange().getValues();
      const requester = getUserById(uData, p.requesterId);
      if (
        !requester ||
        requester.peran !== "admin" ||
        requester.familyId !== p.familyId
      ) {
        output.status = "error";
        output.message = "UNAUTHORIZED";
      } else if (!p.newAdminUserId || p.newAdminUserId === p.requesterId) {
        output.status = "error";
        output.message = "INVALID_TARGET";
      } else {
        const mSheet = ss.getSheetByName("Anggota_Keluarga");
        const mData = mSheet.getDataRange().getValues();
        let requesterMemberRow = -1;
        let targetMemberRow = -1;
        let targetRole = "";
        for (let i = 1; i < mData.length; i++) {
          if (mData[i][1] !== p.familyId) continue;
          if (mData[i][2] === p.requesterId) requesterMemberRow = i + 1;
          if (mData[i][2] === p.newAdminUserId) {
            targetMemberRow = i + 1;
            targetRole = mData[i][4] || "";
          }
        }

        if (requesterMemberRow === -1 || targetMemberRow === -1) {
          output.status = "error";
          output.message = "MEMBER_NOT_FOUND";
        } else if (targetRole === "admin") {
          output.status = "error";
          output.message = "ALREADY_ADMIN";
        } else {
          mSheet.getRange(requesterMemberRow, 5).setValue("anggota");
          mSheet.getRange(targetMemberRow, 5).setValue("admin");

          const requesterRowIndex = findRowIndexById(uData, p.requesterId, 0);
          const newAdminRowIndex = findRowIndexById(uData, p.newAdminUserId, 0);
          if (requesterRowIndex !== -1) {
            uSheet.getRange(requesterRowIndex, 7).setValue("anggota");
          }
          if (newAdminRowIndex !== -1) {
            uSheet.getRange(newAdminRowIndex, 7).setValue("admin");
          }

          const fSheet = ss.getSheetByName("Keluarga");
          const fData = fSheet.getDataRange().getValues();
          const familyRowIndex = findRowIndexById(fData, p.familyId, 0);
          if (familyRowIndex !== -1) {
            fSheet.getRange(familyRowIndex, 3).setValue(p.newAdminUserId);
          }

          const newAdminUser = getUserById(uData, p.newAdminUserId);
          output.message = "Transfer admin berhasil";
          output.data = {
            familyId: p.familyId,
            newAdminUserId: p.newAdminUserId,
          };

          appendFamilyAudit(ss, {
            familyId: p.familyId,
            actorUserId: p.requesterId,
            actorName: requester.nama,
            action: "TRANSFER_ADMIN",
            targetUserId: p.newAdminUserId,
            targetName: newAdminUser ? newAdminUser.nama : "",
            metadata: {
              oldAdminUserId: p.requesterId,
              oldAdminName: requester.nama,
              newAdminUserId: p.newAdminUserId,
              newAdminName: newAdminUser ? newAdminUser.nama : "",
            },
          });
        }
      }
    } else if (action === "rollbackFamilyAction" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      const familyId = p.familyId || "";
      const requesterId = p.requesterId || "";
      const auditId = p.auditId || "";
      if (!familyId || !requesterId || !auditId) {
        output.status = "error";
        output.message = "INVALID_PAYLOAD";
      } else {
        const uSheet = ss.getSheetByName("Users");
        const uData = uSheet.getDataRange().getValues();
        const requester = getUserById(uData, requesterId);
        if (
          !requester ||
          requester.peran !== "admin" ||
          requester.familyId !== familyId
        ) {
          output.status = "error";
          output.message = "UNAUTHORIZED";
        } else {
          const aSheet = ss.getSheetByName("Family_Audit");
          const aData = aSheet ? aSheet.getDataRange().getValues() : [];
          const auditRow = aData
            .slice(1)
            .find((r) => r[0] === auditId && r[1] === familyId);
          if (!auditRow) {
            output.status = "error";
            output.message = "AUDIT_NOT_FOUND";
          } else {
            const auditAction = auditRow[4] || "";
            const targetUserId = auditRow[5] || "";
            const metadata = parseJSONSafe(auditRow[7], {});
            const auditTimestamp = new Date(auditRow[8]).getTime();
            const isExpired =
              !Number.isFinite(auditTimestamp) ||
              Date.now() - auditTimestamp > ROLLBACK_WINDOW_MS;
            const rollbackExists = aData.slice(1).some((r) => {
              if (r[1] !== familyId) return false;
              if (!String(r[4] || "").startsWith("ROLLBACK_")) return false;
              const m = parseJSONSafe(r[7], {});
              return m.sourceAuditId === auditId;
            });

            if (rollbackExists) {
              output.status = "error";
              output.message = "ALREADY_ROLLED_BACK";
            } else if (isExpired) {
              output.status = "error";
              output.message = "ROLLBACK_WINDOW_EXPIRED";
            } else if (String(auditAction).startsWith("ROLLBACK_")) {
              output.status = "error";
              output.message = "ROLLBACK_NOT_SUPPORTED";
            } else {
              if (auditAction === "ROTATE_INVITE_CODE") {
                const oldInviteCode = metadata.oldInviteCode || "";
                if (!oldInviteCode) {
                  output.status = "error";
                  output.message = "ROLLBACK_NOT_SUPPORTED";
                } else {
                  const fSheet = ss.getSheetByName("Keluarga");
                  const fData = fSheet.getDataRange().getValues();
                  const familyRowIndex = findRowIndexById(fData, familyId, 0);
                  if (familyRowIndex === -1) {
                    output.status = "error";
                    output.message = "FAMILY_NOT_FOUND";
                  } else {
                    fSheet.getRange(familyRowIndex, 4).setValue(oldInviteCode);
                    appendFamilyAudit(ss, {
                      familyId,
                      actorUserId: requesterId,
                      actorName: requester.nama,
                      action: "ROLLBACK_ROTATE_INVITE_CODE",
                      metadata: {
                        sourceAuditId: auditId,
                        restoredInviteCode: oldInviteCode,
                      },
                    });
                    output.message = "Rollback kode undangan berhasil";
                  }
                }
              } else if (auditAction === "TRANSFER_ADMIN") {
                const oldAdminUserId = metadata.oldAdminUserId || "";
                const newAdminUserId = metadata.newAdminUserId || targetUserId;
                if (!oldAdminUserId || !newAdminUserId) {
                  output.status = "error";
                  output.message = "ROLLBACK_NOT_SUPPORTED";
                } else {
                  const mSheet = ss.getSheetByName("Anggota_Keluarga");
                  const mData = mSheet.getDataRange().getValues();
                  const oldAdminMemberRow = getMemberRowIndexByUserId(
                    mData,
                    familyId,
                    oldAdminUserId,
                  );
                  const newAdminMemberRow = getMemberRowIndexByUserId(
                    mData,
                    familyId,
                    newAdminUserId,
                  );
                  if (oldAdminMemberRow === -1 || newAdminMemberRow === -1) {
                    output.status = "error";
                    output.message = "ROLLBACK_FAILED";
                  } else {
                    mSheet.getRange(oldAdminMemberRow, 5).setValue("admin");
                    mSheet.getRange(newAdminMemberRow, 5).setValue("anggota");

                    const oldAdminUserRow = findRowIndexById(
                      uData,
                      oldAdminUserId,
                      0,
                    );
                    const newAdminUserRow = findRowIndexById(
                      uData,
                      newAdminUserId,
                      0,
                    );
                    if (oldAdminUserRow !== -1)
                      uSheet.getRange(oldAdminUserRow, 7).setValue("admin");
                    if (newAdminUserRow !== -1)
                      uSheet.getRange(newAdminUserRow, 7).setValue("anggota");

                    const fSheet = ss.getSheetByName("Keluarga");
                    const fData = fSheet.getDataRange().getValues();
                    const familyRowIndex = findRowIndexById(fData, familyId, 0);
                    if (familyRowIndex !== -1)
                      fSheet
                        .getRange(familyRowIndex, 3)
                        .setValue(oldAdminUserId);

                    appendFamilyAudit(ss, {
                      familyId,
                      actorUserId: requesterId,
                      actorName: requester.nama,
                      action: "ROLLBACK_TRANSFER_ADMIN",
                      targetUserId: oldAdminUserId,
                      metadata: {
                        sourceAuditId: auditId,
                        restoredAdminUserId: oldAdminUserId,
                      },
                    });
                    output.message = "Rollback transfer admin berhasil";
                  }
                }
              } else if (auditAction === "REMOVE_MEMBER") {
                const removedUserId = targetUserId;
                const removedRole = metadata.removedRole || "anggota";
                const removedNama = metadata.removedNama || "Anggota";
                const removedHubungan = metadata.removedHubungan || "Anggota";
                const removedJoinedAt =
                  metadata.removedJoinedAt || new Date().toISOString();
                const removedUser = getUserById(uData, removedUserId);

                if (!removedUserId || !removedUser) {
                  output.status = "error";
                  output.message = "ROLLBACK_FAILED";
                } else if (
                  removedUser.familyId &&
                  removedUser.familyId !== familyId
                ) {
                  output.status = "error";
                  output.message = "ROLLBACK_FAILED";
                } else {
                  const mSheet = ss.getSheetByName("Anggota_Keluarga");
                  const mData = mSheet.getDataRange().getValues();
                  const memberRow = getMemberRowIndexByUserId(
                    mData,
                    familyId,
                    removedUserId,
                  );
                  if (memberRow !== -1) {
                    output.status = "error";
                    output.message = "ROLLBACK_FAILED";
                  } else {
                    mSheet.appendRow([
                      generateId(),
                      familyId,
                      removedUserId,
                      removedNama || removedUser.nama,
                      removedRole,
                      removedHubungan,
                      removedJoinedAt,
                    ]);

                    const userRow = findRowIndexById(uData, removedUserId, 0);
                    if (userRow !== -1) {
                      uSheet.getRange(userRow, 6).setValue(familyId);
                      uSheet.getRange(userRow, 7).setValue(removedRole);
                    }

                    appendFamilyAudit(ss, {
                      familyId,
                      actorUserId: requesterId,
                      actorName: requester.nama,
                      action: "ROLLBACK_REMOVE_MEMBER",
                      targetUserId: removedUserId,
                      targetName: removedNama || removedUser.nama,
                      metadata: {
                        sourceAuditId: auditId,
                      },
                    });
                    output.message = "Rollback hapus anggota berhasil";
                  }
                }
              } else {
                output.status = "error";
                output.message = "ROLLBACK_NOT_SUPPORTED";
              }
            }

            const updatedRequester = getUserById(
              uSheet.getDataRange().getValues(),
              requesterId,
            );
            if (output.status === "success") {
              output.data = {
                requesterRole: updatedRequester
                  ? updatedRequester.peran
                  : requester.peran,
              };
            }
          }
        }
      }

      // === TRANSAKSI & ANGGARAN ===
    } else if (action === "addTransaksi" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      const user = p.addedById
        ? getUserById(
            ss.getSheetByName("Users").getDataRange().getValues(),
            p.addedById,
          )
        : null;
      if (
        !p.familyId ||
        !p.addedById ||
        !user ||
        user.familyId !== p.familyId
      ) {
        output.status = "error";
        output.message = "UNAUTHORIZED_WRITE";
      } else if (!isFamilyMember(ss, p.addedById, p.familyId)) {
        output.status = "error";
        output.message = "UNAUTHORIZED_WRITE";
      } else {
        const sheet = ss.getSheetByName("Transaksi");
        const id = generateId();
        sheet.appendRow([
          id,
          p.tanggal,
          p.tipe,
          p.pos_anggaran,
          p.nominal,
          p.catatan,
          p.familyId || "",
          p.addedById || "",
          user.nama || "",
          new Date().toISOString(),
        ]);
        output.data = { id };
        output.message = "Transaksi berhasil ditambahkan";
      }
    } else if (action === "addAnggaran" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      const user = p.addedById
        ? getUserById(
            ss.getSheetByName("Users").getDataRange().getValues(),
            p.addedById,
          )
        : null;
      if (
        !p.familyId ||
        !p.addedById ||
        !user ||
        user.familyId !== p.familyId
      ) {
        output.status = "error";
        output.message = "UNAUTHORIZED_WRITE";
      } else if (!isFamilyMember(ss, p.addedById, p.familyId)) {
        output.status = "error";
        output.message = "UNAUTHORIZED_WRITE";
      } else {
        const sheet = ss.getSheetByName("Pos_Anggaran");
        const id = generateId();
        sheet.appendRow([
          id,
          p.nama,
          p.batas,
          p.ikon,
          p.tipe || "pengeluaran",
          p.familyId || "",
          p.addedById || "",
          user.nama || "",
          "",
          "",
        ]);
        output.data = { id };
        output.message = "Pos Anggaran berhasil ditambahkan";
      }
    } else if (action === "editAnggaran" && isPost) {
      const p = JSON.parse(e.postData.contents);
      const ss = getSpreadsheet();
      const user = p.editedById
        ? getUserById(
            ss.getSheetByName("Users").getDataRange().getValues(),
            p.editedById,
          )
        : null;
      if (!p.editedById || !user) {
        output.status = "error";
        output.message = "UNAUTHORIZED_WRITE";
      } else {
        const sheet = ss.getSheetByName("Pos_Anggaran");
        const data = sheet.getDataRange().getValues();
        let ri = -1;
        for (let i = 1; i < data.length; i++) {
          if (data[i][0] === p.id) {
            ri = i + 1;
            break;
          }
        }
        if (ri !== -1) {
          const targetFamilyId = data[ri - 1][5] || "";
          if (!targetFamilyId || user.familyId !== targetFamilyId) {
            output.status = "error";
            output.message = "UNAUTHORIZED_WRITE";
          } else if (!isFamilyMember(ss, user.id, targetFamilyId)) {
            output.status = "error";
            output.message = "UNAUTHORIZED_WRITE";
          } else {
            sheet.getRange(ri, 2).setValue(p.nama);
            sheet.getRange(ri, 3).setValue(p.batas);
            sheet.getRange(ri, 4).setValue(p.ikon);
            sheet.getRange(ri, 5).setValue(p.tipe || "pengeluaran");
            sheet.getRange(ri, 9).setValue(p.editedById || "");
            sheet.getRange(ri, 10).setValue(user.nama || "");
            output.data = { id: p.id };
            output.message = "Pos Anggaran diperbarui";
          }
        } else {
          output.status = "error";
          output.message = "ID tidak ditemukan";
        }
      }
    } else if (action === "getAIInsights") {
      const reqBody = isPost ? parseJSONSafe(e.postData.contents, {}) : {};
      const period = String(
        reqBody.period || e.parameter.period || "bulanan",
      ).toLowerCase();
      const transaksi = getFilteredData(
        "Transaksi",
        e.parameter.familyId || null,
        6,
      );
      const apiKey =
        PropertiesService.getScriptProperties().getProperty("GEMINI_API_KEY");
      if (!apiKey) {
        output.status = "error";
        output.message = "API_KEY_MISSING";
      } else {
        const now = new Date();
        const cm = now.getMonth();
        const cy = now.getFullYear();
        const todayStart = new Date(cy, cm, now.getDate());
        const todayEnd = new Date(cy, cm, now.getDate(), 23, 59, 59, 999);
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - 6);

        const isInSelectedPeriod = (d) => {
          if (period === "hariini") {
            return d >= todayStart && d <= todayEnd;
          }
          if (period === "mingguan") {
            return d >= weekStart && d <= todayEnd;
          }
          if (period === "semua") {
            return d.getFullYear() === cy;
          }
          // default: bulanan
          return d.getMonth() === cm && d.getFullYear() === cy;
        };

        const periodLabel =
          period === "hariini"
            ? `Hari Ini, ${Utilities.formatDate(now, "Asia/Jakarta", "d MMMM yyyy")}`
            : period === "mingguan"
              ? `${Utilities.formatDate(weekStart, "Asia/Jakarta", "d MMM")} - ${Utilities.formatDate(now, "Asia/Jakarta", "d MMM yyyy")}`
              : period === "semua"
                ? `Tahun ${cy}`
                : Utilities.formatDate(now, "Asia/Jakarta", "MMMM yyyy");

        let masuk = 0,
          keluar = 0;
        const perPos = {};
        let totalTransaksi = 0;
        transaksi.forEach((t) => {
          const d = new Date(t.Tanggal);
          if (isInSelectedPeriod(d)) {
            const n =
              parseInt(String(t.Nominal).replace(/[^0-9]/g, ""), 10) || 0;
            totalTransaksi += 1;
            if (t.Tipe === "pemasukan") masuk += n;
            else {
              keluar += n;
              perPos[t["Pos Anggaran"]] = (perPos[t["Pos Anggaran"]] || 0) + n;
            }
          }
        });
        const rincian = Object.entries(perPos)
          .map(([k, v]) => `- ${k}: Rp ${v}`)
          .join("\n");
        const prompt = `Ringkasan keuangan periode ${periodLabel}:\nJumlah transaksi: ${totalTransaksi}\nPemasukan: Rp ${masuk}\nPengeluaran: Rp ${keluar}\n${rincian || "- (Belum ada pengeluaran per pos)"}\n\nBerikan 1 paragraf analisis dan 2 saran penghematan. Gaya bahasa ramah, profesional, to the point. Jika data minim, tetap berikan saran praktis yang relevan.`;
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent?key=${apiKey}`;
        const resp = UrlFetchApp.fetch(url, {
          method: "post",
          contentType: "application/json",
          muteHttpExceptions: true,
          payload: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
          }),
        });
        const json = JSON.parse(resp.getContentText());
        if (resp.getResponseCode() === 200 && json.candidates?.length > 0) {
          output.data = json.candidates[0].content.parts[0].text;
        } else {
          output.status = "error";
          output.message = "Gagal: " + (json.error?.message || "Unknown");
        }
      }
    } else {
      throw new Error("Invalid action");
    }
  } catch (err) {
    output.status = "error";
    output.message = err.message;
  }
  return ContentService.createTextOutput(JSON.stringify(output)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

function getFilteredData(sheetName, familyId, familyIdColIndex) {
  const sheet = getSpreadsheet().getSheetByName(sheetName);
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  const headers = data[0].map((h, i) => {
    if (sheetName === "Pos_Anggaran" && i === 4 && !h) return "Tipe";
    return h;
  });
  let rows = data.slice(1);
  if (familyId) rows = rows.filter((r) => r[familyIdColIndex] === familyId);
  return rows.map((row) => {
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = row[i];
    });
    return obj;
  });
}

function getTableData(sheetName) {
  return getFilteredData(sheetName, null, -1);
}

function triggerAuth() {
  UrlFetchApp.fetch("https://www.google.com");
}
