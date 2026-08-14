const assert = require("node:assert/strict");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");

const {
  assertApplyConfirmation,
  assertDatabaseConfirmation,
  isInsideRepository,
  loadRetainedUsers,
  maskEmail,
  normalizeRetainedUsers,
  parseCliArguments,
  userSelector,
} = require("../scripts/purgeLaunchUserAndArchiveData");

function expectThrow(action, pattern) {
  assert.throws(action, pattern);
}

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "matths-retained-users-"));

try {
  const fixturePath = path.join(tempRoot, "retained-users.json");
  fs.writeFileSync(fixturePath, JSON.stringify([
    { email: "Owner@Example.test", role: "admin" },
    { email: "student@example.test" },
  ]));
  fs.chmodSync(fixturePath, 0o600);

  const retainedUsers = loadRetainedUsers(fixturePath);
  assert.deepEqual(retainedUsers, [
    { email: "owner@example.test", role: "admin" },
    { email: "student@example.test" },
  ]);
  assert.equal(isInsideRepository(__filename), true);
  assert.equal(isInsideRepository(fixturePath), false);

  const dryRun = parseCliArguments(["--retained-users-file", fixturePath], {});
  assert.equal(dryRun.apply, false);
  assert.equal(dryRun.confirmedRetainedCount, null);
  assert.doesNotThrow(() => assertApplyConfirmation(dryRun, 2));

  const apply = parseCliArguments([
    "--apply",
    `--retained-users-file=${fixturePath}`,
    "--confirm-retained-count=2",
    "--confirm-database=matths_release",
  ], {});
  assert.equal(apply.apply, true);
  assert.equal(apply.confirmedRetainedCount, 2);
  assert.equal(apply.confirmedDatabase, "matths_release");
  assert.doesNotThrow(() => assertApplyConfirmation(apply, 2));
  assert.doesNotThrow(() => assertDatabaseConfirmation(apply, "matths_release"));
  expectThrow(
    () => assertApplyConfirmation({ ...apply, confirmedRetainedCount: 1 }, 2),
    /재확인/
  );
  expectThrow(
    () => assertDatabaseConfirmation(apply, "matths_production"),
    /DB 이름/
  );
  expectThrow(
    () => assertApplyConfirmation({ ...apply, confirmedDatabase: "" }, 2),
    /confirm-database/
  );

  assert.deepEqual(userSelector(retainedUsers[0]), {
    email: "owner@example.test",
    role: "admin",
  });
  assert.match(maskEmail("private.person@example.test"), /^pr\*+@example\.test$/);
  assert.equal(maskEmail("private.person@example.test").includes("private.person"), false);

  expectThrow(() => parseCliArguments([], {}), /보존 계정 파일/);
  expectThrow(
    () => normalizeRetainedUsers([{ name: "private", email: "person@example.test" }]),
    /허용되지 않은 필드/
  );
  expectThrow(
    () => normalizeRetainedUsers([
      { email: "duplicate@example.test" },
      { email: "DUPLICATE@example.test" },
    ]),
    /중복/
  );
  expectThrow(() => normalizeRetainedUsers([{ email: "not-an-email" }]), /형식/);

  fs.chmodSync(fixturePath, 0o644);
  if (process.platform !== "win32") {
    expectThrow(() => loadRetainedUsers(fixturePath), /권한/);
  }
  fs.chmodSync(fixturePath, 0o600);

  const symlinkPath = path.join(tempRoot, "retained-users-link.json");
  fs.symlinkSync(fixturePath, symlinkPath);
  expectThrow(() => loadRetainedUsers(symlinkPath), /심볼릭 링크/);

  const source = fs.readFileSync(
    path.resolve(__dirname, "..", "scripts", "purgeLaunchUserAndArchiveData.js"),
    "utf8"
  );
  assert.equal(/@(gmail|naver|lsbproduction)\./i.test(source), false);
  assert.match(source, /require\.main === module/);

  const packageJson = require("../package.json");
  assert.equal(packageJson.scripts["launch-data:purge"].includes("--apply"), false);

  const setupDocs = ["EMAIL_SETUP.md", "LOCAL-ENV-RUNBOOK.md"]
    .map((name) => fs.readFileSync(path.resolve(__dirname, "..", "docs", name), "utf8"))
    .join("\n");
  assert.equal(/@(gmail|naver|lsbproduction)\.(com|co\.kr)/i.test(setupDocs), false);
  assert.match(setupDocs, /-type f -name mongod -perm -111/);
  assert.match(setupDocs, /원백업에서 새로 만든 독립 복제본/);

  console.log("Launch data purge safety contract passed.");
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
}
