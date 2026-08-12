"use strict";

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");
const ConnectionStringModule = require("mongodb-connection-string-url");

const ConnectionString = ConnectionStringModule.default || ConnectionStringModule;

function databaseTargetFingerprint(uri) {
  const parsed = parseTarget(uri);
  const database = decodeURIComponent(String(parsed.pathname || "").replace(/^\//, ""));
  if (!database) throw new Error("DB 연결 문자열에 데이터베이스 이름이 필요합니다.");
  const identity = JSON.stringify({
    protocol: parsed.protocol.toLowerCase(),
    hosts: parsed.hosts.map((host) => host.toLowerCase()).sort(),
    database,
  });
  return crypto.createHash("sha256").update(identity).digest("hex");
}

function parseTarget(uri) {
  return new ConnectionString(String(uri || ""));
}

function assertAtlasProductionTarget(uri) {
  const parsed = parseTarget(uri);
  if (parsed.protocol !== "mongodb+srv:") {
    throw new Error("운영 Atlas 증거는 mongodb+srv 연결에서만 만들 수 있습니다.");
  }
  if (!parsed.hosts.length || parsed.hosts.some((host) => {
    const hostname = String(host).split(":")[0].toLowerCase();
    return hostname !== "mongodb.net" && !hostname.endsWith(".mongodb.net");
  })) {
    throw new Error("운영 Atlas 증거의 대상이 MongoDB Atlas 공식 호스트가 아닙니다.");
  }
  return databaseTargetFingerprint(uri);
}

function cleanSourceCommit(root = path.resolve(__dirname, "..")) {
  const run = (args) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    if (result.status !== 0) throw new Error(`Git 소스 확인 실패: ${result.stderr || result.stdout}`);
    return String(result.stdout || "").trim();
  };
  if (run(["status", "--porcelain"])) {
    throw new Error("운영 DB apply 보고서는 깨끗한 로컬 웹 커밋에서만 만들 수 있습니다.");
  }
  const commit = run(["rev-parse", "HEAD"]);
  if (!/^[a-f0-9]{40}$/i.test(commit)) throw new Error("운영 DB apply 소스 커밋이 올바르지 않습니다.");
  return commit;
}

function writeExclusiveJson(filename, document) {
  const output = path.resolve(filename);
  assertOutputAvailable(output);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(document, null, 2)}\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  return output;
}

function assertOutputAvailable(filename) {
  const output = path.resolve(filename);
  if (fs.existsSync(output)) throw new Error(`기존 운영 증거를 덮어쓰지 않습니다: ${output}`);
  return output;
}

module.exports = {
  assertAtlasProductionTarget,
  assertOutputAvailable,
  cleanSourceCommit,
  databaseTargetFingerprint,
  writeExclusiveJson,
};
