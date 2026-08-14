/*
 * 출시 전 사용자·아카이브 정리 도구
 *
 * - 문제은행, 개념, 정책, 상점 상품은 건드리지 않는다.
 * - 저장소 밖의 보안 파일로 명시한 계정만 보존한다.
 * - 실행 전에는 계획만 출력하고, --apply가 있어야 실제 삭제한다.
 * - --apply 는 보존 계정 수 재확인 없이는 실행되지 않는다.
 */
require("dotenv").config({ path: "config.env" });

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");

const {
  AdminActionLog,
  AdminTodo,
  ArchiveFolder,
  ArchiveItem,
  PrivateMockExam,
  PrivateMockIntegrityCase,
  PrivateMockObjection,
  PrivateMockResource,
  User,
  UserNotification,
} = require("../models/matthsModel");
const { StoreProduct } = require("../models/storeModel");
const {
  ArenaMatch,
  ArenaMatchEvidence,
  ArenaMatchParticipantLock,
  ArenaRevengeRight,
} = require("../models/goatArenaModel");
const { PdfWatermarkIssuance } = require("../models/documentSecurityModel");
const { destroyStoredAsset } = require("../services/fileStorageService");
const {
  purgeUserOwnedData,
  removePrivateAccountData,
  removeUserUploadedFiles,
} = require("../services/accountDeletionService");

const REPO_ROOT = path.resolve(__dirname, "..");
const MAX_RETAINED_USERS = 20;
const MAX_RETAINED_FILE_BYTES = 64 * 1024;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const LEGACY_ARCHIVE_DIRECTORY = path.resolve(__dirname, "..", "storage", "archive");
const LEGACY_STORE_DIRECTORY = path.resolve(__dirname, "..", "storage", "store");
const LEGACY_STORAGE_ROOT = path.resolve(__dirname, "..", "storage");
const RETIRED_LOCAL_UPLOAD_DIRECTORIES = Object.freeze([
  path.resolve(__dirname, "..", "storage", "arena-evidence"),
  path.resolve(__dirname, "..", "storage", "community"),
  path.resolve(__dirname, "..", "storage", "tmp"),
]);

function maskEmail(email) {
  const [local, domain] = String(email).split("@");
  const visible = local.slice(0, Math.min(2, local.length));
  return `${visible}${"*".repeat(Math.max(3, local.length - visible.length))}@${domain}`;
}

function readOption(argv, name) {
  const exactIndex = argv.indexOf(name);
  if (exactIndex !== -1) {
    const value = argv[exactIndex + 1];
    if (!value || value.startsWith("--")) throw new Error(`${name} 값이 필요합니다.`);
    return value;
  }
  const prefix = `${name}=`;
  const inline = argv.find((entry) => entry.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : "";
}

function parseCliArguments(argv = process.argv.slice(2), env = process.env) {
  const retainedUsersFile = readOption(argv, "--retained-users-file")
    || String(env.MATTHS_RETAINED_USERS_FILE || "").trim();
  const countValue = readOption(argv, "--confirm-retained-count");
  const confirmedDatabase = readOption(argv, "--confirm-database");
  if (!retainedUsersFile) {
    throw new Error(
      "보존 계정 파일이 필요합니다. --retained-users-file 또는 "
      + "MATTHS_RETAINED_USERS_FILE을 지정하세요."
    );
  }
  if (countValue && !/^\d+$/.test(countValue)) {
    throw new Error("--confirm-retained-count는 0 이상의 정수여야 합니다.");
  }
  if (confirmedDatabase && !/^[A-Za-z0-9_-]+$/.test(confirmedDatabase)) {
    throw new Error("--confirm-database 형식이 올바르지 않습니다.");
  }
  return {
    apply: argv.includes("--apply"),
    retainedUsersFile,
    confirmedRetainedCount: countValue ? Number(countValue) : null,
    confirmedDatabase,
  };
}

function assertApplyConfirmation(options, retainedUserCount) {
  if (options.apply && options.confirmedRetainedCount !== retainedUserCount) {
    throw new Error(
      `실제 삭제에는 --confirm-retained-count=${retainedUserCount} 재확인이 필요합니다.`
    );
  }
  if (options.apply && !options.confirmedDatabase) {
    throw new Error("실제 삭제에는 --confirm-database=<DB 이름> 재확인이 필요합니다.");
  }
}

function assertDatabaseConfirmation(options, actualDatabase) {
  if (options.apply && options.confirmedDatabase !== actualDatabase) {
    throw new Error("연결된 DB 이름이 --confirm-database 값과 달라 삭제를 중단했습니다.");
  }
}

function isInsideRepository(absolutePath) {
  const relative = path.relative(REPO_ROOT, absolutePath);
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

function normalizeRetainedUsers(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_RETAINED_USERS) {
    throw new Error(`보존 계정은 1~${MAX_RETAINED_USERS}개 배열이어야 합니다.`);
  }
  const seen = new Set();
  return Object.freeze(value.map((entry, index) => {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`보존 계정 ${index + 1}번 항목이 객체가 아닙니다.`);
    }
    const unknownKeys = Object.keys(entry).filter((key) => !["email", "role"].includes(key));
    if (unknownKeys.length) {
      throw new Error(`보존 계정 ${index + 1}번 항목에 허용되지 않은 필드가 있습니다.`);
    }
    const email = String(entry.email || "").trim().toLowerCase();
    const role = String(entry.role || "").trim();
    if (!EMAIL_PATTERN.test(email)) {
      throw new Error(`보존 계정 ${index + 1}번 이메일 형식이 올바르지 않습니다.`);
    }
    if (role && !["admin", "student", "parent"].includes(role)) {
      throw new Error(`보존 계정 ${index + 1}번 역할이 허용 범위를 벗어났습니다.`);
    }
    if (seen.has(email)) throw new Error("보존 계정 이메일이 중복되었습니다.");
    seen.add(email);
    return Object.freeze({ email, ...(role ? { role } : {}) });
  }));
}

function loadRetainedUsers(filePath) {
  const absolutePath = path.resolve(filePath);
  if (isInsideRepository(absolutePath)) {
    throw new Error("보존 계정 파일은 커밋을 막기 위해 저장소 밖에 두어야 합니다.");
  }
  let stat;
  try {
    stat = fs.lstatSync(absolutePath);
  } catch {
    throw new Error("보존 계정 파일을 읽을 수 없습니다.");
  }
  if (!stat.isFile() || stat.isSymbolicLink()) {
    throw new Error("보존 계정 경로는 심볼릭 링크가 아닌 일반 파일이어야 합니다.");
  }
  if (stat.size > MAX_RETAINED_FILE_BYTES) {
    throw new Error("보존 계정 파일이 허용 크기를 초과했습니다.");
  }
  if (process.platform !== "win32" && (stat.mode & 0o177) !== 0) {
    throw new Error("보존 계정 파일 권한은 600 이하로 제한해야 합니다.");
  }
  if (typeof process.getuid === "function" && stat.uid !== process.getuid()) {
    throw new Error("보존 계정 파일 소유자가 현재 실행 사용자와 다릅니다.");
  }
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(absolutePath, "utf8"));
  } catch {
    throw new Error("보존 계정 파일이 유효한 JSON이 아닙니다.");
  }
  return normalizeRetainedUsers(parsed);
}

function userSelector({ email, role }) {
  return {
    email: String(email).toLowerCase(),
    ...(role ? { role } : {}),
  };
}

function idsToStrings(documents) {
  return documents.map((document) => String(document._id));
}

async function listFiles(directory) {
  const entries = await fs.promises.readdir(directory, { withFileTypes: true }).catch((error) => {
    if (error.code === "ENOENT") return [];
    throw error;
  });
  const nested = await Promise.all(entries.map(async (entry) => {
    const absolutePath = path.resolve(directory, entry.name);
    if (path.dirname(absolutePath) !== directory) {
      throw new Error(`안전하지 않은 저장소 경로가 감지되었습니다: ${entry.name}`);
    }
    if (entry.isDirectory()) return listFiles(absolutePath);
    return entry.isFile() ? [absolutePath] : [];
  }));
  return nested.flat();
}

async function removeDirectoryIfSafe(directory) {
  const resolved = path.resolve(directory);
  const allowed = [
    LEGACY_ARCHIVE_DIRECTORY,
    LEGACY_STORE_DIRECTORY,
    ...RETIRED_LOCAL_UPLOAD_DIRECTORIES,
  ];
  if (!allowed.includes(resolved)) {
    throw new Error(`허용되지 않은 로컬 저장소 삭제 요청입니다: ${resolved}`);
  }
  await fs.promises.rm(resolved, { recursive: true, force: true });
}

async function removeEmptyLegacyStorageRoot() {
  const entries = await fs.promises.readdir(LEGACY_STORAGE_ROOT).catch((error) => {
    if (error.code === "ENOENT") return null;
    throw error;
  });
  if (entries === null) return;
  if (entries.length) {
    throw new Error("정리 대상이 아닌 로컬 저장소 항목이 남아 있어 storage 루트를 삭제하지 않았습니다.");
  }
  await fs.promises.rmdir(LEGACY_STORAGE_ROOT);
}

async function resolveRetainedUsers(retainedUserDefinitions) {
  const retained = [];
  for (const definition of retainedUserDefinitions) {
    const users = await User.find(userSelector(definition))
      .select("_id name email role accountStatus")
      .lean();
    assert.equal(
      users.length,
      1,
      `보존 계정 확인 실패: ${maskEmail(definition.email)} 계정이 정확히 하나여야 합니다.`
    );
    retained.push(users[0]);
  }
  return retained;
}

async function buildPlan(retainedUserDefinitions) {
  const retainedUsers = await resolveRetainedUsers(retainedUserDefinitions);
  const retainedIds = idsToStrings(retainedUsers);
  const users = await User.find({}).select("_id name email role accountStatus").lean();
  const removedUsers = users.filter((user) => !retainedIds.includes(String(user._id)));
  const removedIds = removedUsers.map((user) => user._id);
  const [archiveItems, archiveFolders, protectedArchiveReferenceCounts, localArchiveFiles, localStoreFiles, nonR2StoreAssets] = await Promise.all([
    ArchiveItem.find({}).lean(),
    ArchiveFolder.find({}).lean(),
    Promise.all([
      PrivateMockExam.countDocuments({
        $or: [
          { archiveItemId: { $ne: null } },
          { answerSheetArchiveItemId: { $ne: null } },
        ],
      }),
      PrivateMockResource.countDocuments({ archiveItemId: { $ne: null } }),
    ]),
    listFiles(LEGACY_ARCHIVE_DIRECTORY),
    listFiles(LEGACY_STORE_DIRECTORY),
    StoreProduct.countDocuments({ "assets.storageProvider": { $ne: "R2" } }),
  ]);

  assert.equal(
    protectedArchiveReferenceCounts.reduce((sum, count) => sum + count, 0),
    0,
    "아카이브가 주간 모의고사 또는 공식 자료에 참조되어 있어 안전상 삭제를 중단했습니다."
  );
  assert.equal(
    nonR2StoreAssets,
    0,
    "R2에 이관되지 않은 상점 원본이 있어 로컬 상점 복제본 삭제를 중단했습니다."
  );

  const [relatedMatches, relatedEvidence, relatedLocks, relatedRevenge, directNotifications, directTodos, directLogs, watermarkIssuances] = await Promise.all([
    removedIds.length
      ? ArenaMatch.find({
        $or: [
          { requestInitiatorUserId: { $in: removedIds } },
          { "challenger.userId": { $in: removedIds } },
          { "defender.userId": { $in: removedIds } },
        ],
      }).select("_id").lean()
      : [],
    removedIds.length ? ArenaMatchEvidence.find({ userId: { $in: removedIds } }).select("_id").lean() : [],
    removedIds.length ? ArenaMatchParticipantLock.find({ userId: { $in: removedIds } }).select("_id").lean() : [],
    removedIds.length ? ArenaRevengeRight.find({ $or: [{ eligibleUserId: { $in: removedIds } }, { opponentUserId: { $in: removedIds } }] }).select("_id").lean() : [],
    removedIds.length ? UserNotification.find({ userId: { $in: removedIds } }).select("_id").lean() : [],
    removedIds.length ? AdminTodo.find({ $or: [{ targetUserId: { $in: removedIds } }, { actorUserId: { $in: removedIds } }] }).select("_id").lean() : [],
    removedIds.length ? AdminActionLog.find({ $or: [{ targetUserId: { $in: removedIds } }, { adminUserId: { $in: removedIds } }] }).select("_id").lean() : [],
    removedIds.length ? PdfWatermarkIssuance.find({ userId: { $in: removedIds } }).select("_id").lean() : [],
  ]);

  return {
    retainedUsers,
    removedUsers,
    archiveItems,
    archiveFolders,
    localArchiveFiles,
    localStoreFiles,
    related: {
      matches: relatedMatches,
      evidence: relatedEvidence,
      locks: relatedLocks,
      revengeRights: relatedRevenge,
      notifications: directNotifications,
      todos: directTodos,
      adminLogs: directLogs,
      watermarkIssuances,
    },
  };
}

function summarizePlan(plan) {
  return {
    preservedUsers: plan.retainedUsers.map((user) => ({
      id: String(user._id), email: maskEmail(user.email), role: user.role,
    })),
    removedUserCount: plan.removedUsers.length,
    archiveItems: plan.archiveItems.length,
    archiveFolders: plan.archiveFolders.length,
    legacyLocalArchiveFiles: plan.localArchiveFiles.length,
    legacyLocalStoreCopies: plan.localStoreFiles.length,
    userRelated: Object.fromEntries(
      Object.entries(plan.related).map(([key, documents]) => [key, documents.length])
    ),
  };
}

async function purgeArchiveRecords(plan) {
  const archiveItemIds = plan.archiveItems.map((item) => item._id);
  for (const item of plan.archiveItems) {
    const source = {
      ...item,
      storageProvider: item.storageProvider || (item.r2ObjectKey ? "R2" : ""),
    };
    await destroyStoredAsset(source).catch((error) => {
      if (source.r2ObjectKey || source.cloudPublicId) throw error;
    });
  }
  await Promise.all([
    PdfWatermarkIssuance.deleteMany({ sourceType: "ARCHIVE" }),
    ...(archiveItemIds.length
      ? [
        UserNotification.deleteMany({ sourceId: { $in: archiveItemIds } }),
        AdminTodo.deleteMany({ sourceId: { $in: archiveItemIds } }),
      ]
      : []),
    ArchiveItem.deleteMany({}),
    ArchiveFolder.deleteMany({}),
  ]);
  await removeDirectoryIfSafe(LEGACY_ARCHIVE_DIRECTORY);
}

async function purgeLegacyStoreCopies() {
  await removeDirectoryIfSafe(LEGACY_STORE_DIRECTORY);
  await Promise.all(RETIRED_LOCAL_UPLOAD_DIRECTORIES.map(removeDirectoryIfSafe));
  await removeEmptyLegacyStorageRoot();
}

async function purgeDeletedUsers(plan) {
  const deletedUserIds = plan.removedUsers.map((user) => user._id);
  const relatedMatchIds = plan.related.matches.map((match) => match._id);
  for (const user of plan.removedUsers) {
    await removePrivateAccountData(user._id);
    await removeUserUploadedFiles(user._id);
    await purgeUserOwnedData(user._id);
    await User.deleteOne({ _id: user._id });
  }

  if (!deletedUserIds.length) return;
  await Promise.all([
    AdminActionLog.deleteMany({
      $or: [
        { targetUserId: { $in: deletedUserIds } },
        { adminUserId: { $in: deletedUserIds } },
      ],
    }),
    AdminTodo.deleteMany({
      $or: [
        { targetUserId: { $in: deletedUserIds } },
        { actorUserId: { $in: deletedUserIds } },
        ...(relatedMatchIds.length ? [{ sourceId: { $in: relatedMatchIds } }] : []),
      ],
    }),
    UserNotification.deleteMany(
      relatedMatchIds.length
        ? { $or: [{ userId: { $in: deletedUserIds } }, { sourceId: { $in: relatedMatchIds } }] }
        : { userId: { $in: deletedUserIds } }
    ),
  ]);

  const sessionCollections = (await mongoose.connection.db.listCollections().toArray())
    .map((entry) => entry.name)
    .filter((name) => /^(sessions|session)$/i.test(name));
  const userIdPattern = deletedUserIds.map((id) => String(id).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|");
  if (userIdPattern) {
    await Promise.all(sessionCollections.map((name) => mongoose.connection.db
      .collection(name)
      .deleteMany({ session: { $regex: userIdPattern } })));
  }
}

async function verifyResult(retainedUserDefinitions) {
  const expectedEmails = retainedUserDefinitions.map((entry) => entry.email).sort();
  const users = await User.find({}).select("_id name email role").lean();
  const actualEmails = users.map((user) => String(user.email).toLowerCase()).sort();
  assert.deepEqual(actualEmails, expectedEmails, "보존 계정 외 사용자 레코드가 남아 있습니다.");
  assert.equal(await ArchiveItem.countDocuments(), 0, "아카이브 파일 DB 레코드가 남아 있습니다.");
  assert.equal(await ArchiveFolder.countDocuments(), 0, "아카이브 폴더 DB 레코드가 남아 있습니다.");
  assert.equal((await listFiles(LEGACY_ARCHIVE_DIRECTORY)).length, 0, "로컬 아카이브 원본이 남아 있습니다.");
  assert.equal((await listFiles(LEGACY_STORE_DIRECTORY)).length, 0, "R2 이관 뒤 남은 로컬 상점 원본이 있습니다.");
  assert.equal(fs.existsSync(LEGACY_STORAGE_ROOT), false, "레거시 storage 디렉터리가 남아 있습니다.");
  assert.ok(await StoreProduct.countDocuments(), "상점 상품은 보존되어야 합니다.");
  return {
    users: users.map((user) => ({
      id: String(user._id), email: maskEmail(user.email), role: user.role,
    })),
  };
}

async function run(argv = process.argv.slice(2), env = process.env) {
  const options = parseCliArguments(argv, env);
  const retainedUserDefinitions = loadRetainedUsers(options.retainedUsersFile);
  assertApplyConfirmation(options, retainedUserDefinitions.length);
  if (!String(env.DB || "").trim()) throw new Error("DB 연결 정보가 없습니다.");
  await mongoose.connect(env.DB);
  try {
    assertDatabaseConfirmation(options, mongoose.connection.name);
    const plan = await buildPlan(retainedUserDefinitions);
    console.log(JSON.stringify(summarizePlan(plan), null, 2));
    if (!options.apply) {
      console.log("검토 모드입니다. 실제 삭제는 --apply 옵션으로만 실행됩니다.");
      return;
    }
    await purgeArchiveRecords(plan);
    await purgeLegacyStoreCopies();
    await purgeDeletedUsers(plan);
    const verified = await verifyResult(retainedUserDefinitions);
    console.log(JSON.stringify({ status: "PURGED", ...verified }, null, 2));
  } finally {
    await mongoose.disconnect();
  }
}

if (require.main === module) {
  run().catch((error) => {
    console.error(`출시 데이터 정리 실패: ${error.message}`);
    process.exitCode = 1;
  });
}

module.exports = {
  assertApplyConfirmation,
  assertDatabaseConfirmation,
  isInsideRepository,
  loadRetainedUsers,
  maskEmail,
  normalizeRetainedUsers,
  parseCliArguments,
  userSelector,
};
