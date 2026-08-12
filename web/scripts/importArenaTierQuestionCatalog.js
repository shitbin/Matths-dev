const fs = require("node:fs");
const path = require("node:path");
const mongoose = require("mongoose");
const dotenv = require("dotenv");

dotenv.config({ path: "./config.env" });

const {
  syncProblemTypeRegistry,
} = require("../services/problemTypeCatalogService");
const {
  activateValidatedArenaTierCatalog,
  buildArenaTierCatalogDefinition,
} = require("../services/arenaTierQuestionCatalogService");

function parseArguments(argv = process.argv.slice(2)) {
  const sourceArgument = argv.find((value) => !value.startsWith("--"));
  const confirmArgument = argv.find((value) => value.startsWith("--confirm-sha256="));
  return {
    sourceArgument,
    apply: argv.includes("--apply"),
    confirmSha256: confirmArgument
      ? confirmArgument.slice("--confirm-sha256=".length).trim().toLowerCase()
      : "",
  };
}

function assertActivationAuthorized({ apply, confirmSha256, sourceHash }) {
  if (!apply) return false;
  if (!/^[a-f0-9]{64}$/.test(confirmSha256) || confirmSha256 !== sourceHash) {
    throw new Error(
      `활성화하려면 검증 출력의 원본 해시를 그대로 지정하세요: --apply --confirm-sha256=${sourceHash}`
    );
  }
  return true;
}

function summary(label, definition) {
  return [
    label,
    `code=${definition.code}`,
    `types=${definition.validationReport?.typeCount || 0}`,
    `tiers=${definition.tierConfigurations?.length || 0}`,
    `references=${definition.validationReport?.referenceQuestionCount || 0}`,
    `answers=${definition.validationReport?.answeredReferenceQuestionCount || 0}`,
    `solutions=${definition.validationReport?.solutionProcessReferenceCount || 0}`,
    `choices=${definition.validationReport?.multipleChoiceReferenceCount || 0}`,
    `naturals=${definition.validationReport?.naturalNumberReferenceCount || 0}`,
    `engines=${definition.validationReport?.mappedEngineCount || 0}`,
    `sourceHash=${definition.sourceHash}`,
    `contentHash=${definition.contentHash}`,
  ].join(" ");
}

async function main(argv = process.argv.slice(2)) {
  const options = parseArguments(argv);
  const sourcePath = path.resolve(options.sourceArgument || "");
  if (!options.sourceArgument) {
    throw new Error("가져올 T1~T9 JSON 파일 경로가 필요합니다.");
  }
  const sourceText = fs.readFileSync(sourcePath, "utf8");
  const raw = JSON.parse(sourceText);

  // DB 연결·레지스트리 동기화보다 먼저 전체 카탈로그와 라이브 생성기를
  // 오프라인에서 검산한다. 기본 실행은 여기서 끝나는 안전한 dry-run이다.
  const definition = await buildArenaTierCatalogDefinition(raw, {
    sourceText,
    sourceFileName: path.basename(sourcePath),
  });
  console.log(summary("Arena tier catalog preflight passed", definition));
  if (!assertActivationAuthorized({
    apply: options.apply,
    confirmSha256: options.confirmSha256,
    sourceHash: definition.sourceHash,
  })) {
    console.log(
      `Dry-run only. 활성화 명령: npm run arena-tier-catalog:import -- ${JSON.stringify(sourcePath)} --apply --confirm-sha256=${definition.sourceHash}`
    );
    return;
  }
  if (!process.env.DB) {
    throw new Error("활성화에는 config.env의 DB 연결 문자열이 필요합니다.");
  }

  await mongoose.connect(process.env.DB);
  await syncProblemTypeRegistry({ activateSourceChanges: true });
  const created = await activateValidatedArenaTierCatalog({
    definition,
  });

  console.log(`${summary("Arena tier catalog activated", created)} status=${created.status}`);
}

if (require.main === module) {
  main()
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    })
    .finally(async () => {
      await mongoose.disconnect();
    });
}

module.exports = {
  assertActivationAuthorized,
  main,
  parseArguments,
  summary,
};
