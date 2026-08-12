const assert = require("node:assert/strict");

const {
  assertActivationAuthorized,
  parseArguments,
  summary,
} = require("../scripts/importArenaTierQuestionCatalog");

const sourceHash = "a".repeat(64);

assert.deepEqual(parseArguments(["catalog.json"]), {
  sourceArgument: "catalog.json",
  apply: false,
  confirmSha256: "",
});
assert.equal(
  assertActivationAuthorized({ apply: false, confirmSha256: "", sourceHash }),
  false,
  "기본 실행은 DB를 쓰지 않는 dry-run이어야 합니다."
);
assert.throws(
  () => assertActivationAuthorized({ apply: true, confirmSha256: "", sourceHash }),
  /--confirm-sha256=/
);
assert.throws(
  () => assertActivationAuthorized({
    apply: true,
    confirmSha256: "b".repeat(64),
    sourceHash,
  }),
  /--confirm-sha256=/
);
assert.equal(
  assertActivationAuthorized({ apply: true, confirmSha256: sourceHash, sourceHash }),
  true
);

const parsed = parseArguments([
  "--apply",
  `--confirm-sha256=${sourceHash.toUpperCase()}`,
  "/tmp/catalog.json",
]);
assert.equal(parsed.sourceArgument, "/tmp/catalog.json");
assert.equal(parsed.apply, true);
assert.equal(parsed.confirmSha256, sourceHash);

const line = summary("preflight", {
  code: "CATALOG-V1",
  sourceHash,
  contentHash: "c".repeat(64),
  tierConfigurations: Array.from({ length: 9 }),
  validationReport: {
    typeCount: 30,
    referenceQuestionCount: 270,
    answeredReferenceQuestionCount: 270,
    solutionProcessReferenceCount: 270,
    multipleChoiceReferenceCount: 168,
    naturalNumberReferenceCount: 102,
    mappedEngineCount: 60,
  },
});
assert.match(line, /references=270/);
assert.match(line, new RegExp(`sourceHash=${sourceHash}`));

console.log("Arena tier catalog import is dry-run by default and hash-gated on activation");
