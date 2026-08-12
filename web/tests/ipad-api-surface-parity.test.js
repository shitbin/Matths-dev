"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const repoRoot = path.resolve(__dirname, "..");
const ipadSourceRoot = path.resolve(repoRoot, "../ipad-app/Matths");
const routeSource = fs.readFileSync(
  path.join(repoRoot, "routes/api-routes.js"),
  "utf8",
);

function normalizePath(value) {
  return value
    .replace(/\\\([^)]*\)/g, ":param")
    .replace(/:[A-Za-z][A-Za-z0-9_]*/g, ":param");
}

function routeSegmentsMatch(clientPath, serverPath) {
  const client = clientPath.split("/").filter(Boolean);
  const server = serverPath.split("/").filter(Boolean);
  if (client.length !== server.length) return false;
  return client.every((segment, index) =>
    segment === server[index] || segment === ":param" || server[index] === ":param");
}

function extractServerRoutes() {
  const routes = [];
  const pattern = /router\.(get|post|patch|delete)\s*\(\s*["']([^"']+)["']/g;
  for (const match of routeSource.matchAll(pattern)) {
    routes.push({
      method: match[1].toUpperCase(),
      path: normalizePath(`/api/v1${match[2]}`),
      sourceIndex: match.index,
    });
  }
  return routes;
}

function methodBefore(source, index) {
  const fragment = source.slice(Math.max(0, index - 320), index);
  const methods = [...fragment.matchAll(/["'](GET|POST|PATCH|DELETE)["']/g)];
  return methods.at(-1)?.[1] || null;
}

function extractIpadCalls() {
  const calls = [];
  for (const filename of fs.readdirSync(ipadSourceRoot).filter((name) => name.endsWith(".swift"))) {
    const source = fs.readFileSync(path.join(ipadSourceRoot, filename), "utf8");
    for (const match of source.matchAll(/["'](\/api\/v1\/[^"'\n]+)["']/g)) {
      const rawPath = match[1];
      const method = methodBefore(source, match.index)
        || (rawPath === "/api/v1/auth/google/start" ? "GET" : null);
      assert.ok(method, `${filename}: ${rawPath}의 HTTP method를 판독할 수 없습니다.`);
      calls.push({ filename, method, path: normalizePath(rawPath), rawPath });
    }
  }
  return calls;
}

const serverRoutes = extractServerRoutes();
const ipadCalls = extractIpadCalls();
assert.ok(ipadCalls.length >= 60, `iPad API 전수 표본이 비정상적으로 작습니다: ${ipadCalls.length}`);

for (const call of ipadCalls) {
  const matched = serverRoutes.some((route) =>
    route.method === call.method && routeSegmentsMatch(call.path, route.path));
  assert.ok(
    matched,
    `${call.filename}: ${call.method} ${call.rawPath}에 대응하는 서버 라우트가 없습니다.`,
  );
}

// action 문자열로 합성되는 배치 제출 경로는 위 형태 비교만으로 둘 중 하나만 있어도
// 통과할 수 있으므로, 앱이 실제 생성하는 두 행동을 각각 고정한다.
for (const action of ["submit", "expire"]) {
  assert.ok(
    serverRoutes.some((route) =>
      route.method === "POST"
      && route.path === `/api/v1/placement-exam/:param/${action}`),
    `POST /api/v1/placement-exam/:attemptId/${action}가 없습니다.`,
  );
}

// 인증을 생략할 수 있는 앱 호출은 가입·로그인 준비에 필요한 최소 공개 경로뿐이다.
const publicCalls = new Set([
  "GET /api/v1/schools",
  "GET /api/v1/auth/providers",
  "GET /api/v1/auth/google/start",
  "POST /api/v1/auth/google/exchange",
  "POST /api/v1/auth/register",
  "POST /api/v1/auth/login",
  "POST /api/v1/auth/password-reset/request",
  "POST /api/v1/auth/password-reset/verify",
  "POST /api/v1/auth/password-reset/complete",
]);
const authBoundary = routeSource.indexOf("router.use(requireApiAuth)");
assert.ok(authBoundary > 0, "Bearer 인증 경계가 없습니다.");
for (const route of serverRoutes) {
  if (!ipadCalls.some((call) =>
    call.method === route.method && routeSegmentsMatch(call.path, route.path))) continue;
  const key = `${route.method} ${route.path}`;
  if (!publicCalls.has(key)) {
    assert.ok(
      route.sourceIndex > authBoundary,
      `${key}가 전역 Bearer 인증 경계보다 앞에 등록됐습니다.`,
    );
  }
}

console.log(`iPad API surface parity passed: ${ipadCalls.length} calls, ${serverRoutes.length} server routes`);
