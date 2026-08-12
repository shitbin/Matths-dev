import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const artifactToolRelativePath = path.join(
  "@oai",
  "artifact-tool",
  "dist",
  "artifact_tool.mjs",
);

function moduleFileFromCandidate(candidate, projectRoot) {
  if (!candidate) return null;
  if (candidate.startsWith("file:")) return fileURLToPath(candidate);
  return path.isAbsolute(candidate)
    ? candidate
    : path.resolve(projectRoot, candidate);
}

export function artifactToolModuleCandidates({
  projectRoot,
  configuredModule = process.env.MATTHS_ARTIFACT_TOOL_MODULE,
  executablePath = process.execPath,
  homeDirectory = os.homedir(),
} = {}) {
  if (!projectRoot) {
    throw new Error("artifact-tool 탐색에는 projectRoot가 필요합니다.");
  }

  return [
    String(configuredModule || "").trim(),
    path.join(projectRoot, "node_modules", artifactToolRelativePath),
    path.resolve(
      path.dirname(executablePath),
      "../node_modules",
      artifactToolRelativePath,
    ),
    path.join(
      homeDirectory,
      ".cache",
      "codex-runtimes",
      "codex-primary-runtime",
      "dependencies",
      "node",
      "node_modules",
      artifactToolRelativePath,
    ),
  ]
    .map((candidate) => moduleFileFromCandidate(candidate, projectRoot))
    .filter(Boolean);
}

export async function loadArtifactTool(options = {}) {
  const candidates = artifactToolModuleCandidates(options);

  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue;
    const module = await import(pathToFileURL(candidate).href);
    if (module.Workbook && module.SpreadsheetFile) return module;
  }

  throw new Error(
    "@oai/artifact-tool을 찾지 못했습니다. "
      + "MATTHS_ARTIFACT_TOOL_MODULE에 artifact_tool.mjs 경로를 지정하세요.",
  );
}
