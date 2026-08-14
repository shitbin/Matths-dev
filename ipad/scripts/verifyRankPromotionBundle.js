#!/usr/bin/env node

"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const EXPECTED_ASSETS = Object.freeze([
  Object.freeze({ tierCode: "BRONZE", filename: "bronze-rank-up.v6.mp4", sha256: "86206344b96bd1b9ebeaf66078c49d45b70c9a0cedf9d42401dce51a7441743d", sizeBytes: 3038531 }),
  Object.freeze({ tierCode: "SILVER", filename: "silver-rank-up.v6.mp4", sha256: "04b5c3d4b6cfd9354e247c9fc4df90ae89808bbad6536f079f666f9e531d5526", sizeBytes: 3236641 }),
  Object.freeze({ tierCode: "GOLD", filename: "gold-rank-up.v6.mp4", sha256: "79a55282c52100294c04be86e08baa90e9e7c88266c542b4e575f59d51e36fc8", sizeBytes: 4894268 }),
  Object.freeze({ tierCode: "PLATINUM", filename: "platinum-rank-up.v7.mp4", sha256: "c5586ebd29c8ec9b579013329df72971c23e63ac00f42afde19f219c42f0bbc8", sizeBytes: 5837126 }),
  Object.freeze({ tierCode: "EMERALD", filename: "emerald-rank-up.v6.mp4", sha256: "c24b825b2fd7079f01b4ff0ed8bcde465bea590ac8bc8f67a82d4b94d56b3b30", sizeBytes: 8059981 }),
  Object.freeze({ tierCode: "DIAMOND", filename: "diamond-rank-up.v6.mp4", sha256: "5b107162d1366f2f7406c2e75c0a0f02194a2677e203005b91be755c5690870a", sizeBytes: 8275507 }),
  Object.freeze({ tierCode: "MASTER", filename: "master-rank-up.v6.mp4", sha256: "b446d1cec5b332e7373ba10085342a1c1f6123e9a731f32cc92fc75322bc5f8b", sizeBytes: 8969082 }),
  Object.freeze({ tierCode: "GRANDMASTER", filename: "grandmaster-rank-up.v6.mp4", sha256: "e5385e44304a3aa7211eee34148229ee4ebccbdf7705961e6dc3656e00b7cb6e", sizeBytes: 8803422 }),
  Object.freeze({ tierCode: "CHALLENGER", filename: "challenger-rank-up.v12.mp4", sha256: "6872dae1cd44e78e3c829dce7d5627eb7d80112240c22165e961e77423dc9ecf", sizeBytes: 8368248 }),
]);

const SOURCE_OID_PATTERN = /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/;

function sha256(filename) {
  return crypto.createHash("sha256").update(fs.readFileSync(filename)).digest("hex");
}

function run(command, args) {
  const result = spawnSync(command, args, { encoding: "utf8" });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} 실패\n${result.stderr || result.stdout}`);
  }
  return String(result.stdout || "").trim();
}

function sourceIdentity(root) {
  const commit = run("git", ["-C", root, "rev-parse", "HEAD"]).toLowerCase();
  const tree = run("git", ["-C", root, "rev-parse", "HEAD^{tree}"]).toLowerCase();
  const trackedWorkingTreeClean =
    run("git", ["-C", root, "status", "--porcelain", "--untracked-files=normal"]) === "";
  if (!SOURCE_OID_PATTERN.test(commit) || !SOURCE_OID_PATTERN.test(tree)) {
    throw new Error("source commit/tree가 Git object id 형식이 아닙니다.");
  }
  return { commit, tree, trackedWorkingTreeClean };
}

function walk(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(filename));
    else if (entry.isFile()) files.push(filename);
  }
  return files;
}

function uniqueFileByBasename(files, basename, label = basename) {
  const matches = files.filter((filename) => path.basename(filename) === basename);
  if (matches.length !== 1) {
    throw new Error(`${label}: 번들 파일이 정확히 하나여야 하지만 ${matches.length}개입니다.`);
  }
  return matches[0];
}

function readPlist(filename) {
  const converted = run("/usr/bin/plutil", ["-convert", "json", "-o", "-", filename]);
  return JSON.parse(converted);
}

function verifyRankPromotionAssets(app, { sourceRoot = "" } = {}) {
  const files = walk(app);
  const manifestFile = uniqueFileByBasename(
    files, "rank-promotion-assets.json", "rank asset manifest");
  const manifestRaw = fs.readFileSync(manifestFile, "utf8");
  const manifest = JSON.parse(manifestRaw);
  if (manifest.schemaVersion !== "MATTHS_RANK_PROMOTION_ASSETS_V1") {
    throw new Error("rank asset manifest schemaVersion 불일치");
  }
  if (manifest.sourceProvenance?.status !== "unknown"
      || manifest.sourceProvenance?.approvedSource !== false
      || manifest.sourceProvenance?.externalAttestationRequired !== true) {
    throw new Error("확인되지 않은 웹 원본 provenance를 승인된 출처로 표기했습니다.");
  }
  if (!Array.isArray(manifest.assets)
      || manifest.assets.length !== EXPECTED_ASSETS.length) {
    throw new Error("rank asset manifest가 9티어가 아닙니다.");
  }

  const bundledRankVideos = files.filter((filename) =>
    /-rank-up[.]v[0-9]+[.]mp4$/.test(path.basename(filename)));
  if (bundledRankVideos.length !== EXPECTED_ASSETS.length) {
    throw new Error(`번들 rank MP4가 정확히 9개가 아닙니다: ${bundledRankVideos.length}`);
  }

  const assets = EXPECTED_ASSETS.map((expected, index) => {
    const declared = manifest.assets[index];
    for (const field of ["tierCode", "filename", "sha256", "sizeBytes"]) {
      if (declared?.[field] !== expected[field]) {
        throw new Error(`${expected.tierCode}: manifest ${field}가 고정값과 다릅니다.`);
      }
    }
    const filename = uniqueFileByBasename(
      bundledRankVideos, expected.filename, `${expected.tierCode} MP4`);
    const actualSize = fs.statSync(filename).size;
    const actualSha256 = sha256(filename);
    if (actualSize !== expected.sizeBytes || actualSha256 !== expected.sha256) {
      throw new Error(`${expected.tierCode}: 번들 MP4 바이트가 고정 자산과 다릅니다.`);
    }
    return { ...expected, file: path.relative(app, filename) };
  });

  const manifestSha256 = sha256(manifestFile);
  if (sourceRoot) {
    const sourceManifest = path.join(
      sourceRoot, "Matths", "RankMotion", "rank-promotion-assets.json");
    if (!fs.existsSync(sourceManifest)) {
      throw new Error(`소스 rank asset manifest가 없습니다: ${sourceManifest}`);
    }
    if (sha256(sourceManifest) !== manifestSha256) {
      throw new Error("번들 rank asset manifest가 sourceRoot와 다릅니다.");
    }
  }

  return {
    schemaVersion: manifest.schemaVersion,
    manifestFile,
    manifestSha256,
    sourceProvenance: manifest.sourceProvenance,
    assets,
  };
}

function requireBoolean(value, label) {
  if (typeof value !== "boolean") throw new Error(`${label}가 boolean이 아닙니다.`);
  return value;
}

function verifyRankPromotionBundle(app, { sourceRoot = "", requireCleanSource = true } = {}) {
  if (!app || !fs.existsSync(app) || !fs.statSync(app).isDirectory()) {
    throw new Error("검증할 .app 폴더가 없습니다.");
  }
  const files = walk(app);
  const assets = verifyRankPromotionAssets(app, { sourceRoot });
  const infoFile = path.join(app, "Info.plist");
  if (!fs.existsSync(infoFile)) throw new Error("앱 Info.plist가 없습니다.");
  const info = readPlist(infoFile);
  const provenanceFile = uniqueFileByBasename(
    files, "MatthsBuildProvenance.plist", "build provenance");
  const provenance = readPlist(provenanceFile);

  if (provenance.SchemaVersion !== "MATTHS_BUILD_PROVENANCE_V1"
      || info.MatthsBuildProvenanceSchema !== provenance.SchemaVersion) {
    throw new Error("build provenance schema 불일치");
  }
  const source = {
    commit: String(provenance.SourceCommit || "").toLowerCase(),
    tree: String(provenance.SourceTree || "").toLowerCase(),
    identityKind: String(provenance.SourceIdentityKind || ""),
    trackedWorkingTreeClean: requireBoolean(
      provenance.SourceTrackedWorkingTreeClean, "SourceTrackedWorkingTreeClean"),
    externalAttestationRequired: requireBoolean(
      provenance.SourceExternalAttestationRequired, "SourceExternalAttestationRequired"),
  };
  if (!SOURCE_OID_PATTERN.test(source.commit) || !SOURCE_OID_PATTERN.test(source.tree)) {
    throw new Error("bundle source commit/tree가 Git object id 형식이 아닙니다.");
  }
  if (!["git", "external-parameters"].includes(source.identityKind)) {
    throw new Error("bundle source identity kind가 허용값이 아닙니다.");
  }
  if (source.identityKind === "git" && source.externalAttestationRequired) {
    throw new Error("Git 직접 식별자가 외부 attestation 필요로 잘못 표기됐습니다.");
  }
  if (source.identityKind === "external-parameters" && !source.externalAttestationRequired) {
    throw new Error("git-less source가 외부 attestation 불필요로 잘못 표기됐습니다.");
  }
  if (requireCleanSource && !source.trackedWorkingTreeClean) {
    throw new Error("dirty source에서 만든 빌드는 provenance 증거로 사용할 수 없습니다.");
  }

  const infoPairs = [
    ["MatthsSourceCommit", source.commit],
    ["MatthsSourceTree", source.tree],
    ["MatthsSourceIdentityKind", source.identityKind],
    ["MatthsRankAssetManifestSHA256", assets.manifestSha256],
  ];
  for (const [key, expected] of infoPairs) {
    if (String(info[key] || "").toLowerCase() !== String(expected).toLowerCase()) {
      throw new Error(`Info.plist ${key}가 build provenance/번들과 다릅니다.`);
    }
  }
  if (requireBoolean(info.MatthsSourceTrackedWorkingTreeClean,
    "MatthsSourceTrackedWorkingTreeClean") !== source.trackedWorkingTreeClean) {
    throw new Error("Info.plist source clean 상태가 build provenance와 다릅니다.");
  }
  if (requireBoolean(info.MatthsSourceExternalAttestationRequired,
    "MatthsSourceExternalAttestationRequired") !== source.externalAttestationRequired) {
    throw new Error("Info.plist source attestation 상태가 build provenance와 다릅니다.");
  }
  if (String(provenance.RankAssetManifestSHA256 || "").toLowerCase()
      !== assets.manifestSha256) {
    throw new Error("build provenance rank manifest SHA-256이 실제 번들과 다릅니다.");
  }

  let checkedSource = null;
  if (sourceRoot) {
    checkedSource = sourceIdentity(sourceRoot);
    if (checkedSource.commit !== source.commit || checkedSource.tree !== source.tree) {
      throw new Error("번들 source identity가 검증 sourceRoot와 다릅니다.");
    }
    if (requireCleanSource && !checkedSource.trackedWorkingTreeClean) {
      throw new Error("검증 sourceRoot가 dirty 상태입니다.");
    }
  }

  const executableName = String(info.CFBundleExecutable || "Matths");
  const executable = path.join(app, executableName);
  if (!fs.existsSync(executable) || !fs.statSync(executable).isFile()) {
    throw new Error(`앱 실행 파일이 없습니다: ${executable}`);
  }

  return {
    source,
    checkedSource,
    executable: { file: executableName, sha256: sha256(executable) },
    rankPromotion: {
      manifestSha256: assets.manifestSha256,
      sourceProvenance: assets.sourceProvenance,
      assets: assets.assets.map(({ tierCode, filename, sha256: digest, sizeBytes }) => ({
        tierCode, filename, sha256: digest, sizeBytes,
      })),
    },
  };
}

function option(name, fallback = "") {
  const index = process.argv.indexOf(name);
  if (index < 0) return fallback;
  if (!process.argv[index + 1]) throw new Error(`${name} 값이 필요합니다.`);
  return process.argv[index + 1];
}

if (require.main === module) {
  try {
    const app = path.resolve(option("--app"));
    const sourceRootOption = option("--source-root");
    const sourceRoot = sourceRootOption ? path.resolve(sourceRootOption) : "";
    if (process.argv.includes("--assets-only")) {
      const result = verifyRankPromotionAssets(app, { sourceRoot });
      console.log(`Rank promotion bundle assets PASS: ${result.manifestSha256}`);
    } else {
      const result = verifyRankPromotionBundle(app, { sourceRoot });
      console.log(`Rank promotion bundle provenance PASS: ${result.executable.sha256}`);
    }
  } catch (error) {
    console.error(`Rank promotion bundle provenance FAIL: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  EXPECTED_ASSETS,
  SOURCE_OID_PATTERN,
  sha256,
  sourceIdentity,
  verifyRankPromotionAssets,
  verifyRankPromotionBundle,
};
