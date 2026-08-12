#!/usr/bin/env node

"use strict";

const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const esbuild = require("esbuild");

const {
  loadCurriculum,
} = require("../services/curriculumService");

const repoRoot = path.resolve(__dirname, "..");
const entryPath = path.join(__dirname, "ipadWebgenBridgeEntry.js");
const defaultOutputPath = path.resolve(
  repoRoot,
  "../ipad-app/Matths/LessonWeb/webgen-bundle.js",
);

function staticCurriculumPlugin() {
  const curriculum = loadCurriculum();
  const commonCourses = curriculum.courses.filter(
    (course) => course.id === "common-math-1" || course.id === "common-math-2",
  );
  assert.equal(commonCourses.length, 2, "공통수학 정본 2과목이 필요합니다.");
  const contents = [
    '"use strict";',
    `const curriculum = ${JSON.stringify({ courses: commonCourses })};`,
    "module.exports = { loadCurriculum: () => curriculum };",
  ].join("\n");

  return {
    name: "matths-static-curriculum",
    setup(build) {
      build.onResolve(
        { filter: /^\.\.\/\.\.\/curriculumService$/ },
        (args) => (
          args.importer.endsWith("services/problemGenerators/commonMath/generators.js")
            ? { path: "curriculumService", namespace: "matths-static-curriculum" }
            : null
        ),
      );
      build.onLoad(
        { filter: /.*/, namespace: "matths-static-curriculum" },
        () => ({ contents, loader: "js" }),
      );
    },
  };
}

async function buildBundle() {
  const result = await esbuild.build({
    entryPoints: [entryPath],
    bundle: true,
    format: "iife",
    platform: "browser",
    target: ["safari16"],
    write: false,
    legalComments: "none",
    plugins: [staticCurriculumPlugin()],
  });
  assert.equal(result.outputFiles.length, 1);
  return result.outputFiles[0].contents;
}

async function main(argv = process.argv.slice(2)) {
  const mode = argv[0] || "--check";
  const outputPath = path.resolve(argv[1] || defaultOutputPath);
  const expected = await buildBundle();

  if (mode === "--write") {
    fs.writeFileSync(outputPath, expected);
    console.log(`iPad 문제 생성기 번들 갱신 완료: ${outputPath}`);
    return;
  }
  if (mode !== "--check") {
    throw new Error("사용법: node scripts/buildIpadWebgenBundle.js [--check|--write] [output-path]");
  }
  assert.deepStrictEqual(
    fs.readFileSync(outputPath),
    Buffer.from(expected),
    "iPad 문제 생성기 번들이 웹 생성기 정본과 다릅니다. --write로 갱신하세요.",
  );
  console.log("iPad 문제 생성기 번들 정본 일치");
}

if (require.main === module) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}

module.exports = {
  buildBundle,
  defaultOutputPath,
};
