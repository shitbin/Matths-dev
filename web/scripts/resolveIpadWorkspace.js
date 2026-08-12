"use strict";

const fs = require("node:fs");
const path = require("node:path");

function normalizeConfiguredRoot(webRoot, configuredRoot) {
  const value = String(configuredRoot || "").trim();
  if (!value) return null;
  return path.isAbsolute(value) ? path.normalize(value) : path.resolve(webRoot, value);
}

function normalizeWorkspaceRoot(candidate) {
  if (!candidate) return null;
  const resolved = path.resolve(candidate);
  // Accept MATTHS_IPAD_ROOT pointing either at the Xcode workspace root or at
  // its Matths source directory. All callers receive the workspace root.
  if (
    path.basename(resolved) === "Matths"
    && fs.existsSync(path.join(resolved, "MatthsApp.swift"))
  ) {
    return path.dirname(resolved);
  }
  return resolved;
}

function isIpadWorkspaceRoot(candidate) {
  if (!candidate) return false;
  try {
    return fs.statSync(path.join(candidate, "Matths")).isDirectory();
  } catch (_error) {
    return false;
  }
}

/**
 * Resolve the iPad workspace shared by web/iPad contract checks.
 *
 * Resolution order is deliberate:
 * 1. MATTHS_IPAD_ROOT (CI or an explicit local workspace)
 * 2. ../ipad-app (the current two-repository development layout)
 * 3. ../ipad (the integrated Matths-dev/package layout)
 */
function resolveIpadRoot(
  webRoot,
  configuredRoot = process.env.MATTHS_IPAD_ROOT,
) {
  const normalizedWebRoot = path.resolve(webRoot);
  const configured = normalizeWorkspaceRoot(
    normalizeConfiguredRoot(normalizedWebRoot, configuredRoot),
  );
  if (configured) {
    if (isIpadWorkspaceRoot(configured)) return configured;
    throw new Error(`MATTHS_IPAD_ROOT가 올바른 iPad 작업본이 아닙니다: ${configured}`);
  }

  const candidates = [
    path.resolve(normalizedWebRoot, "../ipad-app"),
    path.resolve(normalizedWebRoot, "../ipad"),
  ]
    .map(normalizeWorkspaceRoot)
    .filter(Boolean);

  const resolved = candidates.find(isIpadWorkspaceRoot);
  if (resolved) return resolved;

  throw new Error(
    [
      "iPad 작업본을 찾을 수 없습니다.",
      `MATTHS_IPAD_ROOT 또는 다음 경로를 확인해주세요: ${candidates.join(", ")}`,
    ].join(" "),
  );
}

function resolveIpadSourceRoot(webRoot, configuredRoot) {
  return path.join(resolveIpadRoot(webRoot, configuredRoot), "Matths");
}

module.exports = {
  resolveIpadRoot,
  resolveIpadSourceRoot,
};
