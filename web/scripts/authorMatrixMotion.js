#!/usr/bin/env node

"use strict";

const fs = require("node:fs");
const path = require("node:path");

const shardPath = path.resolve(
  __dirname,
  "..",
  "content_folder",
  "curriculum-stories",
  "common-math-1.json",
);

function beat(id, action, target, expression, result, caption, durationMs = 1_900) {
  return { id, action, target, expression, result, caption, durationMs };
}

function check(prompt, choices, answerIndex, correctFeedback, retryFeedback) {
  return { prompt, choices, answerIndex, correctFeedback, retryFeedback };
}

function motion(focus, instruction, beats, mild, spicy, sceneCheck) {
  return {
    version: 1,
    mode: "plot",
    focus,
    instruction,
    beats,
    mild: { explanation: mild },
    spicy: { explanation: spicy },
    check: sceneCheck,
  };
}

const specs = {
  "matrix-table": motion(
    "행 제목·열 제목이 만나는 숫자 칸",
    "매장×상품 표에서 제목을 옆으로 밀고 숫자의 상대 위치를 그대로 괄호 안에 보존",
    [
      beat("name-axes", "highlight", "가로 행은 매장, 세로 열은 상품", "행: 서울·부산 / 열: 연필·공책", "2개의 행 × 2개의 열", "숫자를 보기 전에 각 방향이 무엇을 뜻하는지 먼저 이름 붙입니다."),
      beat("remove-headings", "transform", "제목을 뺀 네 숫자", "서울 30,12 / 부산 25,18", "30 12 / 25 18", "제목은 행렬 밖의 약속으로 옮기되 숫자의 자리와 순서는 바꾸지 않습니다."),
      beat("read-one-cell", "point", "둘째 행 첫째 열 25", "부산 행 ∩ 연필 열", "부산 연필 25개", "한 성분을 원래 문장으로 되읽어 자리 정보가 살아 있는지 검산합니다."),
    ],
    "행렬은 숫자를 한 상자에 쏟아 넣는 것이 아닙니다. 서울과 부산을 위아래 줄로, 연필과 공책을 왼쪽과 오른쪽 칸으로 약속합니다. 제목을 지워도 숫자가 앉은 자리는 그대로라서 둘째 줄 첫 칸 25는 부산의 연필 판매량으로 읽힙니다.",
    "행렬은 두 유한 색인 집합의 곱 위에 놓인 값의 함수입니다. 행·열 라벨은 외부 메타데이터가 되지만 성분 aᵢⱼ의 좌표 순서가 의미를 보존합니다.",
    check(
      "행이 매장, 열이 상품일 때 둘째 행 첫째 열은 무엇을 뜻하나요?",
      ["첫 매장의 둘째 상품", "둘째 매장의 첫째 상품", "둘째 매장의 둘째 상품"],
      1,
      "맞아요. 행을 먼저 내려가 둘째 매장을 찾고, 열을 첫째 상품으로 옮깁니다.",
      "아래첨자와 위치는 행부터 읽습니다. 먼저 둘째 가로줄을 찾은 뒤 첫째 세로칸을 보세요.",
    ),
  ),
  "matrix-size-entry": motion(
    "2×3의 2는 행, 3은 열",
    "두 가로줄과 세 세로칸을 따로 색칠하고 a₂₁까지 행→열 순서로 포인터 이동",
    [
      beat("count-rows", "group", "가로줄 두 개", "12 8 6 / 5 10 9", "행 2개", "행렬 왼쪽에서 가로줄이 몇 층인지 먼저 셉니다."),
      beat("count-columns", "group", "각 줄의 세 칸", "첫째·둘째·셋째 열", "열 3개", "한 가로줄 안에서 세로 방향으로 정렬된 칸 수를 셉니다."),
      beat("locate-a21", "point", "a₂₁: 둘째 행 첫째 열", "행 2로 내려가기 → 열 1로 이동", "a₂₁=5", "아래첨자의 첫 숫자를 행으로, 둘째 숫자를 열로 사용합니다."),
    ],
    "2×3은 두 곱하기 삼이라고만 읽지 말고, 두 층에 세 칸씩 있는 서랍장으로 보세요. a₂₁을 찾을 때는 두 번째 층으로 먼저 내려가고 첫 번째 칸을 엽니다. 그 안의 값이 5입니다.",
    "m×n에서 m은 row index의 범위, n은 column index의 범위입니다. aᵢⱼ는 i∈{1,…,m}, j∈{1,…,n}인 좌표이므로 첨자 순서를 바꾸면 다른 성분입니다.",
    check(
      "첫째 행이 12, 8, 6일 때 a₁₃은 무엇인가요?",
      ["첫째 값 12", "둘째 값 8", "셋째 값 6"],
      2,
      "맞아요. 첫째 행으로 간 뒤 셋째 열까지 옮기면 값은 6입니다.",
      "13을 열세 번째로 읽지 마세요. 첫 숫자는 행 1, 둘째 숫자는 열 3입니다.",
    ),
  ),
  "matrix-shape-trap": motion(
    "성분 6개보다 2행×3열이라는 배치",
    "같은 여섯 숫자를 2×3과 3×2 격자에 각각 놓아 대응 칸이 달라지는 모습을 나란히 비교",
    [
      beat("show-two-by-three", "highlight", "2×3 격자", "1 2 3 / 4 5 6", "행 2, 열 3", "첫 배열은 가로로 긴 두 줄입니다."),
      beat("reflow-three-by-two", "transform", "3×2 격자", "1 2 / 3 4 / 5 6", "행 3, 열 2", "같은 숫자를 세 줄로 다시 놓으면 각 숫자의 행·열 좌표가 바뀝니다."),
      beat("reject-equality", "verify", "크기와 대응 성분", "2×3 ≠ 3×2", "서로 다른 행렬", "성분 개수만 같아서는 같은 위치끼리 비교할 수 없습니다."),
    ],
    "블록 여섯 개가 같아도 서랍장이 두 층 세 칸인지, 세 층 두 칸인지에 따라 자리가 달라집니다. 행렬이 같으려면 서랍장의 모양부터 같고, 같은 칸의 값도 모두 같아야 합니다.",
    "행렬의 동치는 shape equality와 componentwise equality를 동시에 요구합니다. mn이 같다는 것은 전체 원소 수만 같다는 뜻이며 index set의 순서쌍 구조까지 같다는 뜻은 아닙니다.",
    check(
      "2×3 행렬과 3×2 행렬이 같은 행렬이 될 수 없는 첫 이유는 무엇인가요?",
      ["성분이 너무 작아서", "행과 열의 크기가 달라서", "곱이 6이라서"],
      1,
      "맞아요. 대응 성분을 비교하기 전에 두 행렬의 행 수와 열 수부터 같아야 합니다.",
      "전체 칸 수 6만 보지 말고 가로줄 수와 세로칸 수를 각각 비교하세요.",
    ),
  ),
  "matrix-sales-model": motion(
    "서울·부산 행과 연필·공책 열",
    "두 축의 순서를 먼저 고정하고 30·12·25·18을 교차점 네 칸에 하나씩 채우기",
    [
      beat("fix-order", "highlight", "행 서울→부산, 열 연필→공책", "행 순서와 열 순서", "2×2 틀", "값을 넣기 전에 두 방향의 이름과 순서를 화면에 남깁니다."),
      beat("fill-values", "group", "네 판매량의 교차점", "서울 30,12 / 부산 25,18", "30 12 / 25 18", "각 수를 해당 매장 행과 상품 열이 만나는 칸에 놓습니다."),
      beat("translate-a21", "point", "a₂₁=25", "부산 행 × 연필 열", "부산 연필 25개", "행렬의 한 칸을 원래 자료의 문장으로 정확히 번역합니다."),
    ],
    "먼저 왼쪽에 서울, 부산을 위에서 아래로 적고 위쪽에는 연필, 공책을 왼쪽에서 오른쪽으로 적습니다. 서울 연필 30은 첫 칸, 부산 연필 25는 둘째 줄 첫 칸입니다. 숫자를 채운 뒤 아무 칸이나 문장으로 되읽어 보세요.",
    "모델링에서 행·열 색인 순서는 스키마입니다. 배열 값만 저장하면 permutation of labels에 따라 의미가 바뀌므로 schema order와 matrix entries를 함께 보존해야 합니다.",
    check(
      "행 순서가 서울·부산, 열 순서가 연필·공책일 때 18은 무엇인가요?",
      ["서울 연필 18개", "부산 연필 18개", "부산 공책 18개"],
      2,
      "맞아요. 18은 둘째 행 둘째 열이므로 부산 매장의 공책 판매량입니다.",
      "18이 놓인 줄과 칸을 각각 원래 제목에 연결하세요. 둘째 행은 부산, 둘째 열은 공책입니다.",
    ),
  ),
  "matrix-reading-recall": motion(
    "행→열→원래 뜻의 세 단계",
    "aᵢⱼ 포인터를 행 라벨에서 열 라벨로 이동한 뒤 선택한 칸을 상황 문장으로 되돌리기",
    [
      beat("read-shape", "highlight", "m개의 행과 n개의 열", "m×n", "행 먼저, 열 나중", "크기를 말할 때도 가로줄 수를 먼저 읽습니다."),
      beat("read-entry", "point", "aᵢⱼ의 i행 j열", "i로 내려가기 → j로 옮기기", "성분 한 칸", "아래첨자를 두 자리 수가 아니라 두 좌표로 읽습니다."),
      beat("reverse-meaning", "verify", "선택한 성분의 실제 문장", "자리 + 행·열 라벨", "자료의 뜻 복원", "숫자와 원래 대상이 맞으면 행렬 표현을 제대로 만든 것입니다."),
    ],
    "행렬을 보면 세 번만 확인하세요. 몇 줄 몇 칸인지 읽고, 아래첨자의 첫 숫자로 줄을 찾고, 둘째 숫자로 칸을 찾습니다. 마지막에는 그 칸이 실제로 누구의 어떤 값인지 한 문장으로 말합니다.",
    "shape, index, semantic label의 세 층을 분리하면 전치·성분 혼동을 막을 수 있습니다. equality와 연산 가능성도 이 좌표 체계를 전제로 합니다.",
    check(
      "aᵢⱼ를 찾는 올바른 이동 순서는 무엇인가요?",
      ["j행으로 내려가 i열로 이동", "i행으로 내려가 j열로 이동", "i+j번째 칸으로 이동"],
      1,
      "맞아요. 첫 첨자 i로 행을 고르고 둘째 첨자 j로 열을 고릅니다.",
      "아래첨자를 더하거나 붙이지 마세요. 첫 숫자와 둘째 숫자가 서로 다른 두 방향을 맡습니다.",
    ),
  ),
  "matrix-operations-roles": motion(
    "같은 칸 덧셈과 행×열 곱셈의 다른 연결선",
    "덧셈은 같은 좌표끼리 수직 연결하고 곱셈은 앞 행에서 뒤 열로 꺾이는 선을 그려 비교",
    [
      beat("pair-same-cells", "highlight", "A와 B의 같은 위치", "aᵢⱼ+bᵢⱼ", "덧셈 성분", "덧셈은 모양이 같은 두 표의 정확히 같은 칸만 포갭니다."),
      beat("scale-all-cells", "group", "A의 모든 성분", "2A: 각 칸 ×2", "같은 크기 유지", "실수배는 어느 칸도 빠뜨리지 않고 같은 배수를 적용합니다."),
      beat("connect-row-column", "transform", "A의 한 행과 B의 한 열", "행의 성분·열의 성분 → 곱해 더하기", "곱셈의 새 한 칸", "곱셈은 같은 칸 선이 아니라 가로줄과 세로줄의 만남입니다."),
    ],
    "덧셈에서는 투명한 표 두 장을 포갠다고 생각하세요. 같은 칸이 서로 만납니다. 곱셈에서는 방식이 바뀝니다. 앞 표의 한 가로줄과 뒤 표의 한 세로줄을 손가락으로 훑고, 마주친 수들을 곱해 더해 새 칸 하나를 만듭니다.",
    "덧셈은 벡터공간의 componentwise operation이고 곱셈은 row vector와 column vector의 내적을 성분으로 갖는 합성입니다. 두 연산의 index contraction이 다릅니다.",
    check(
      "행렬곱의 결과 한 칸을 만들 때 무엇을 연결하나요?",
      ["두 행렬의 같은 칸만", "앞 행렬의 한 행과 뒤 행렬의 한 열", "앞 행렬의 한 열과 같은 칸"],
      1,
      "맞아요. 결과의 i행 j열은 앞 행렬 i행과 뒤 행렬 j열의 내적입니다.",
      "덧셈의 같은 칸 규칙을 곱셈에 가져오지 마세요. 가로줄 하나와 세로줄 하나를 표시하세요.",
    ),
  ),
  "matrix-add-scale": motion(
    "대응하는 네 칸과 모든 칸 ×2",
    "A와 B의 같은 좌표를 색으로 짝지어 합을 채우고, A 전체에 ×2 도장을 순서대로 찍기",
    [
      beat("add-corresponding", "point", "첫째 행 첫째 열 1+5", "A+B", "첫 칸 6", "같은 행과 같은 열의 두 수만 한 쌍으로 더합니다."),
      beat("finish-sum", "group", "나머지 세 대응 칸", "2+(−1), 3+0, 4+2", "6 1 / 3 6", "네 칸 모두 같은 위치끼리 계산했는지 연결선을 확인합니다."),
      beat("scale-a", "transform", "A의 네 성분 전부", "2×1, 2×2, 2×3, 2×4", "2 4 / 6 8", "실수배는 선택한 칸만이 아니라 행렬 전체에 분배됩니다."),
    ],
    "A와 B를 포갠 뒤 왼쪽 위부터 같은 칸끼리 더합니다. 1과 5는 6, 2와 −1은 1입니다. 2A에서는 다른 행렬을 보지 말고 A의 네 칸에 모두 2를 찍어 2, 4, 6, 8로 만듭니다.",
    "A+B는 동일 shape에서 정의되는 coordinatewise sum이며 scalar multiplication λA도 모든 index (i,j)에 λaᵢⱼ를 적용합니다. 둘 다 결과 shape는 A와 같습니다.",
    check(
      "A의 둘째 행 둘째 열이 4일 때 2A의 같은 성분은 무엇인가요?",
      ["그대로 4", "두 배인 8", "제곱인 16"],
      1,
      "맞아요. 실수 2를 A의 모든 성분에 곱하므로 그 칸은 2×4=8입니다.",
      "2A는 행렬 크기를 두 배로 만드는 말이 아닙니다. 각 칸의 값에 2를 곱하세요.",
    ),
  ),
  "matrix-elementwise-trap": motion(
    "A 첫째 행과 B 첫째 열의 내적",
    "같은 칸끼리 세로로 잇던 잘못된 선을 지우고 A의 가로 두 칸에서 B의 세로 두 칸으로 교차 연결",
    [
      beat("show-wrong-pairing", "highlight", "같은 위치끼리 곱한 잘못된 선", "a₁₁b₁₁만 보기", "행렬곱 아님", "한 쌍만 곱하면 연결되는 중간 차원의 정보를 빠뜨립니다."),
      beat("trace-row-column", "point", "A 첫째 행 1,2와 B 첫째 열 2,1", "1·2 + 2·1", "4", "가로에서 첫째끼리, 둘째끼리 곱한 뒤 두 값을 더합니다."),
      beat("check-inner-size", "verify", "앞 열 수 2와 뒤 행 수 2", "2×2 · 2×2", "안쪽 크기 일치", "행의 길이와 열의 길이가 같아야 끝까지 짝지을 수 있습니다."),
    ],
    "결과의 왼쪽 위 칸을 만들 때 A의 왼쪽 위와 B의 왼쪽 위만 곱하지 않습니다. A 첫째 줄의 1과 2를 가로로 잡고, B 첫째 열의 2와 1을 세로로 잡습니다. 1·2와 2·1을 더해 4를 만듭니다.",
    "행렬곱은 cᵢⱼ=Σₖaᵢₖbₖⱼ라는 index contraction입니다. 공통 index k의 범위가 앞 열 수이자 뒤 행 수여야 하므로 안쪽 차원이 일치해야 합니다.",
    check(
      "AB의 첫째 행 첫째 열을 만드는 식은 무엇인가요?",
      ["a₁₁b₁₁만", "A 첫째 행·B 첫째 열의 곱의 합", "A 첫째 열·B 첫째 행의 합"],
      1,
      "정확합니다. 결과 위치가 첫째 행 첫째 열이면 A의 첫째 행과 B의 첫째 열을 연결합니다.",
      "결과 칸의 두 좌표를 나눠 쓰세요. 행 좌표는 A에서, 열 좌표는 B에서 가져옵니다.",
    ),
  ),
  "matrix-product-computed": motion(
    "A의 선택 행과 B의 선택 열이 만나는 결과 칸",
    "결과 2×2의 네 칸을 행·열 포인터를 이동하며 4→10→10→20 순서로 채우기",
    [
      beat("compute-c11", "point", "결과 첫째 행 첫째 열", "1·2+2·1", "4", "A 첫째 행과 B 첫째 열을 같은 순서로 곱해 더합니다."),
      beat("compute-first-row", "transform", "결과 첫째 행 둘째 열", "1·0+2·5", "10", "A의 행은 그대로 두고 B의 포인터만 둘째 열로 옮깁니다."),
      beat("finish-product", "verify", "결과 둘째 행의 두 칸", "3·2+4·1=10 / 3·0+4·5=20", "4 10 / 10 20", "A 포인터를 둘째 행으로 내리고 B의 두 열을 차례로 훑어 네 칸을 완성합니다."),
    ],
    "결과 칸 하나를 선택하고 그 칸의 행 번호는 A에서, 열 번호는 B에서 가져옵니다. 왼쪽 위는 A 첫째 줄과 B 첫째 세로줄이라 4입니다. 오른쪽 위는 B 둘째 세로줄로 옮겨 10을 만듭니다. 같은 동작을 둘째 줄에서 반복합니다.",
    "C=AB에서 C의 i행 전체는 A의 i행을 B의 각 열에 차례로 내적한 결과입니다. 이 예에서는 C=(4,10;10,20)이며 각 값의 두 항을 누락하지 않아야 합니다.",
    check(
      "A 첫째 행이 1,2이고 B 둘째 열이 0,5일 때 결과 첫째 행 둘째 열은?",
      ["1·0+2·5=10", "1·2+0·5=2", "1+2+0+5=8"],
      0,
      "맞아요. 첫째 행과 둘째 열의 대응 항을 곱해 더하면 0+10=10입니다.",
      "결과의 ‘첫째 행’은 A에서, ‘둘째 열’은 B에서 선택해 두 쌍의 곱을 더하세요.",
    ),
  ),
  "matrix-order-recall": motion(
    "m×n · n×p에서 맞닿는 n과 남는 m×p",
    "두 크기 표기를 나란히 놓고 가운데 n끼리 연결한 뒤 바깥 m·p를 결과 틀로 이동",
    [
      beat("match-inner", "highlight", "앞 열 수 n과 뒤 행 수 n", "m×n · n×p", "곱셈 가능", "가운데 두 수는 한 행과 한 열을 끝까지 짝지을 길이입니다."),
      beat("keep-outer", "transform", "앞 행 수 m과 뒤 열 수 p", "바깥 m, p", "결과 m×p", "결과 칸은 A의 행마다, B의 열마다 하나씩 생깁니다."),
      beat("respect-order", "verify", "AB와 BA의 다른 행·열 연결", "AB=4 10 / 10 20, BA=2 4 / 16 22", "AB≠BA", "순서를 바꾸면 선택하는 행과 열 자체가 바뀌므로 값도 보통 달라집니다."),
    ],
    "크기 두 개를 나란히 적고 가운데 숫자끼리 손을 잡는지 보세요. 같으면 곱할 수 있습니다. 손을 잡은 가운데 숫자는 계산 속으로 사라지고, 바깥의 첫 행 수와 마지막 열 수가 결과 크기로 남습니다. 순서를 바꾸면 연결도 바뀝니다.",
    "선형사상 합성의 차원 규칙으로 (m×n)(n×p)→m×p입니다. 내적의 contraction index n은 사라지고 free indices i,j만 결과에 남습니다. 합성은 일반적으로 비가환이므로 AB와 BA를 교환할 수 없습니다.",
    check(
      "3×2 행렬과 2×4 행렬을 이 순서로 곱한 결과 크기는?",
      ["안쪽인 2×2", "바깥인 3×4", "반대인 4×3"],
      1,
      "맞아요. 안쪽 2와 2가 일치하고 바깥의 3행과 4열이 남아 3×4입니다.",
      "가운데 숫자는 곱셈 가능 여부를 확인하는 데 쓰고, 결과 크기에는 가장 바깥 두 수를 남기세요.",
    ),
  ),
};

const shard = JSON.parse(fs.readFileSync(shardPath, "utf8"));
const targetStories = shard.stories.filter((story) => story.unitId === "matrices");
const targetSceneIds = new Set(targetStories.flatMap((story) => story.scenes.map((scene) => scene.id)));
const missing = [...targetSceneIds].filter((id) => !specs[id]);
const extra = Object.keys(specs).filter((id) => !targetSceneIds.has(id));
if (missing.length || extra.length) {
  throw new Error(`motion spec 불일치: missing=${missing.join(",")} extra=${extra.join(",")}`);
}
for (const story of targetStories) {
  for (const scene of story.scenes) scene.motion = specs[scene.id];
}
fs.writeFileSync(shardPath, `${JSON.stringify(shard, null, 2)}\n`);
console.log(`Authored matrix motion: ${targetStories.length} stories / ${targetSceneIds.size} scenes`);
