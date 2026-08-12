const {
  randomInteger,
  randomNonZero,
  randomDistinctIntegers,
  multiplyPolynomials,
  evaluatePolynomial,
  linearFactor,
  polynomialText,
  factorText,
  numberClose,
  createVerifiedProblemTypes,
  isCorrectAnswer,
} = require("./helpers");

function gcd(left, right) {
  let a = Math.abs(left);
  let b = Math.abs(right);

  while (b !== 0) {
    [a, b] = [b, a % b];
  }

  return a;
}

function coefficientsGcd(coefficients) {
  return coefficients.reduce(
    (result, value) => gcd(result, value),
    0
  );
}

function shuffledChoices(correctText, distractors) {
  return [correctText, ...distractors]
    .map((text) => ({ text, order: Math.random() }))
    .sort((left, right) => left.order - right.order)
    .map((choice, index) => ({
      key: ["a", "b", "c", "d"][index],
      text: choice.text,
      correct: choice.text === correctText,
    }));
}

function verify(problem) {
  const audit = problem.audit;
  let expected;

  switch (audit.rule) {
    case "greatest-common-factor":
      expected = coefficientsGcd(audit.coefficients);
      break;
    case "factorization-choice": {
      const selected = audit.choices.find(
        ({ key }) => String(key) === String(problem.answer)
      );
      return Boolean(selected?.correct);
    }
    case "perfect-square-parameter":
      expected = 2 * audit.root;
      break;
    case "larger-quadratic-root": {
      const [first, second] = audit.roots;
      const polynomial = multiplyPolynomials(
        linearFactor(first),
        linearFactor(second)
      );
      if (
        polynomial.join(",") !==
        audit.polynomial.join(",")
      ) {
        return false;
      }
      expected = Math.max(first, second);
      break;
    }
    case "nonmonic-root-sum": {
      const polynomial = multiplyPolynomials(
        audit.leftFactor,
        audit.rightFactor
      );
      if (
        polynomial.join(",") !==
        audit.polynomial.join(",")
      ) {
        return false;
      }
      expected =
        -audit.leftFactor[0] / audit.leftFactor[1] -
        audit.rightFactor[0] / audit.rightFactor[1];
      break;
    }
    case "grouping-factor": {
      const expectedPolynomial = multiplyPolynomials(
        linearFactor(-audit.a),
        [audit.b, 0, 1]
      );
      if (
        expectedPolynomial.join(",") !==
        audit.polynomial.join(",")
      ) {
        return false;
      }
      expected = audit.b;
      break;
    }
    case "cube-difference-coefficient":
      expected = audit.a;
      break;
    case "cube-sum-coefficient":
      expected = -audit.a;
      break;
    case "remaining-cubic-root": {
      const rebuilt = audit.roots.reduce(
        (result, root) =>
          multiplyPolynomials(result, linearFactor(root)),
        [1]
      );
      if (
        rebuilt.join(",") !==
        audit.polynomial.join(",")
      ) {
        return false;
      }
      expected = audit.roots[2];
      break;
    }
    case "biquadratic-largest-root": {
      if (
        evaluatePolynomial(audit.polynomial, audit.p) !== 0 ||
        evaluatePolynomial(audit.polynomial, audit.q) !== 0
      ) {
        return false;
      }
      expected = Math.max(audit.p, audit.q);
      break;
    }
    default:
      return false;
  }

  return numberClose(problem.answer, expected);
}

const definitions = [
  {
    id: "factor-common-number",
    label: "유형 1 · 공통인수 묶기",
    difficulty: 1,
    generate() {
      const commonFactor = randomInteger(2, 9);
      const inner = [
        1,
        randomNonZero(-6, 6),
        randomNonZero(-5, 5),
      ];
      const coefficients = inner.map(
        (value) => value * commonFactor
      );

      return {
        prompt:
          `${polynomialText(coefficients)}의 모든 항에서 ` +
          `묶어낼 수 있는 가장 큰 양의 정수 공통인수를 구하세요.`,
        inputMode: "short-answer",
        answer: commonFactor,
        solution:
          `먼저: 계수 ${coefficients
            .slice()
            .reverse()
            .join(", ")}의 최대공약수를 구합니다. ` +
          `다음으로: 최대공약수는 ${commonFactor}이므로 ` +
          `${commonFactor}(${polynomialText(inner)})로 묶입니다.`,
        hintText:
          `각 항의 계수에 공통으로 들어 있는 가장 큰 수를 찾으세요.`,
        audit: {
          rule: "greatest-common-factor",
          coefficients,
        },
      };
    },
  },
  {
    id: "factor-difference-squares",
    label: "유형 2 · 제곱의 차",
    difficulty: 1,
    generate() {
      const a = randomInteger(2, 9);
      const correctText = `${factorText(a)}${factorText(-a)}`;
      const rawChoices = shuffledChoices(correctText, [
        `${factorText(a)}^2`,
        `${factorText(-a)}^2`,
        `(x-${a * a})(x+1)`,
      ]);
      const choices = rawChoices.map(({ key, text }) => ({
        key,
        text,
      }));
      const answer = rawChoices.find(
        ({ correct }) => correct
      ).key;

      return {
        prompt:
          `x^2-${a * a}을 바르게 인수분해한 것을 고르세요.`,
        inputMode: "multiple-choice",
        choices,
        answer,
        solution:
          `먼저: x^2-${a * a}=x^2-${a}^2는 제곱의 차입니다. ` +
          `다음으로: a^2-b^2=(a-b)(a+b)를 쓰면 ` +
          `${correctText}입니다.`,
        hintText:
          `a^2-b^2=(a-b)(a+b)를 적용하세요.`,
        audit: {
          rule: "factorization-choice",
          choices: rawChoices.map(
            ({ key, text, correct }) => ({
              key,
              text,
              correct,
            })
          ),
        },
      };
    },
  },
  {
    id: "factor-perfect-square",
    label: "유형 3 · 완전제곱식",
    difficulty: 1,
    generate() {
      const root = randomNonZero(-8, 8);
      const answer = 2 * root;

      return {
        prompt:
          `x^2+kx+${root * root}=${factorText(-root)}^2이 ` +
          `항등식일 때 k를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: (x+a)^2=x^2+2ax+a^2를 씁니다. ` +
          `다음으로: a=${root}이므로 k=2×(${root})=${answer}입니다.`,
        hintText:
          `완전제곱식의 가운데 항은 2×x×상수항입니다.`,
        audit: {
          rule: "perfect-square-parameter",
          root,
        },
      };
    },
  },
  {
    id: "factor-quadratic-larger-root",
    label: "유형 4 · 이차식 인수분해",
    difficulty: 2,
    generate() {
      const roots = randomDistinctIntegers(
        2,
        -7,
        7,
        { excludeZero: true }
      );
      const polynomial = multiplyPolynomials(
        linearFactor(roots[0]),
        linearFactor(roots[1])
      );
      const answer = Math.max(...roots);

      return {
        prompt:
          `${polynomialText(polynomial)}=0을 인수분해하여 ` +
          `구한 두 실근 중 큰 값을 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: ${polynomialText(polynomial)}=` +
          `${factorText(roots[0])}${factorText(roots[1])}로 인수분해합니다. ` +
          `다음으로: 두 근은 ${roots[0]}, ${roots[1]}이므로 큰 값은 ${answer}입니다.`,
        hintText:
          `합이 ${roots[0] + roots[1]}, 곱이 ${roots[0] * roots[1]}인 두 수를 찾으세요.`,
        audit: {
          rule: "larger-quadratic-root",
          roots,
          polynomial,
        },
      };
    },
  },
  {
    id: "factor-nonmonic-root-sum",
    label: "유형 5 · 최고차항 계수가 1이 아닌 이차식",
    difficulty: 2,
    generate() {
      const leading = randomInteger(2, 5);
      const firstRoot = randomNonZero(-5, 5);
      const secondRoot = randomNonZero(-6, 6);
      const leftFactor = [
        -leading * firstRoot,
        leading,
      ];
      const rightFactor = [-secondRoot, 1];
      const polynomial = multiplyPolynomials(
        leftFactor,
        rightFactor
      );
      const answer = firstRoot + secondRoot;

      return {
        prompt:
          `${polynomialText(polynomial)}=0을 인수분해했을 때 ` +
          `두 실근의 합을 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: 식은 (${polynomialText(leftFactor)})` +
          `(${polynomialText(rightFactor)})=0으로 인수분해됩니다. ` +
          `다음으로: 두 근은 ${firstRoot}, ${secondRoot}이므로 합은 ${answer}입니다.`,
        hintText:
          `상수항의 인수 조합 중 가운데 항의 계수를 만드는 조합을 찾으세요.`,
        audit: {
          rule: "nonmonic-root-sum",
          leftFactor,
          rightFactor,
          polynomial,
        },
      };
    },
  },
  {
    id: "factor-by-grouping",
    label: "유형 6 · 묶어 인수분해",
    difficulty: 2,
    generate() {
      const a = randomNonZero(-6, 6);
      const b = randomNonZero(-7, 7);
      const polynomial = multiplyPolynomials(
        [a, 1],
        [b, 0, 1]
      );

      return {
        prompt:
          `${polynomialText(polynomial)}=` +
          `${factorText(-a)}(x^2+k)가 항등식일 때 k를 구하세요.`,
        inputMode: "short-answer",
        answer: b,
        solution:
          `먼저: 앞의 두 항과 뒤의 두 항을 묶으면 ` +
          `x^2${factorText(-a)}+(${b})${factorText(-a)}입니다. ` +
          `다음으로: 공통인수 ${factorText(-a)}를 묶으면 ` +
          `${factorText(-a)}(${polynomialText([b, 0, 1])})이므로 ` +
          `k=${b}입니다.`,
        hintText:
          `두 항씩 묶어 양쪽에서 같은 일차식을 공통인수로 만드세요.`,
        audit: {
          rule: "grouping-factor",
          a,
          b,
          polynomial,
        },
      };
    },
  },
  {
    id: "factor-cube-difference",
    label: "유형 7 · 세제곱의 차",
    difficulty: 2,
    generate() {
      const a = randomInteger(2, 7);

      return {
        prompt:
          `x^3-${a ** 3}=${factorText(a)}` +
          `(x^2+kx+${a * a})일 때 k를 구하세요.`,
        inputMode: "short-answer",
        answer: a,
        solution:
          `먼저: a^3-b^3=(a-b)(a^2+ab+b^2)를 씁니다. ` +
          `다음으로: x^3-${a}^3=${factorText(a)}` +
          `(x^2+${a}x+${a * a})이므로 k=${a}입니다.`,
        hintText:
          `세제곱의 차에서 두 번째 인수의 가운데 부호는 +입니다.`,
        audit: {
          rule: "cube-difference-coefficient",
          a,
        },
      };
    },
  },
  {
    id: "factor-cube-sum",
    label: "유형 8 · 세제곱의 합",
    difficulty: 2,
    generate() {
      const a = randomInteger(2, 7);

      return {
        prompt:
          `x^3+${a ** 3}=${factorText(-a)}` +
          `(x^2+kx+${a * a})일 때 k를 구하세요.`,
        inputMode: "short-answer",
        answer: -a,
        solution:
          `먼저: a^3+b^3=(a+b)(a^2-ab+b^2)를 씁니다. ` +
          `다음으로: x^3+${a}^3=${factorText(-a)}` +
          `(x^2-${a}x+${a * a})이므로 k=${-a}입니다.`,
        hintText:
          `세제곱의 합에서 두 번째 인수의 가운데 부호는 -입니다.`,
        audit: {
          rule: "cube-sum-coefficient",
          a,
        },
      };
    },
  },
  {
    id: "factor-cubic-remaining-root",
    label: "유형 9 · 인수정리와 삼차식",
    difficulty: 3,
    generate() {
      const roots = randomDistinctIntegers(
        3,
        -6,
        6,
        { excludeZero: true }
      );
      const polynomial = roots.reduce(
        (result, root) =>
          multiplyPolynomials(result, linearFactor(root)),
        [1]
      );

      return {
        prompt:
          `P(x)=${polynomialText(polynomial)}이고 ` +
          `${factorText(roots[0])}, ${factorText(roots[1])}가 ` +
          `P(x)의 인수입니다. 나머지 일차인수를 x-k라 할 때 k를 구하세요.`,
        inputMode: "short-answer",
        answer: roots[2],
        solution:
          `먼저: 두 인수로 조립제법을 차례로 하면 남는 인수는 ` +
          `${factorText(roots[2])}입니다. ` +
          `다음으로: 따라서 x-k=${factorText(roots[2])}이므로 ` +
          `k=${roots[2]}입니다. ` +
          `검산: 세 인수를 곱하면 P(x)와 같습니다.`,
        hintText:
          `알려진 두 근으로 조립제법을 두 번 하세요.`,
        audit: {
          rule: "remaining-cubic-root",
          roots,
          polynomial,
        },
      };
    },
  },
  {
    id: "factor-biquadratic-substitution",
    label: "유형 10 · 치환을 이용한 인수분해",
    difficulty: 3,
    generate() {
      const [p, q] = randomDistinctIntegers(2, 2, 7);
      const first = [-p * p, 0, 1];
      const second = [-q * q, 0, 1];
      const polynomial = multiplyPolynomials(first, second);
      const answer = Math.max(p, q);

      return {
        prompt:
          `${polynomialText(polynomial)}=0의 양의 실근 중 ` +
          `가장 큰 값을 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: y=x^2로 치환하면 ` +
          `(y-${p * p})(y-${q * q})=0입니다. ` +
          `다음으로: x^2=${p * p} 또는 x^2=${q * q}이므로 ` +
          `양의 실근은 ${p}, ${q}입니다. 가장 큰 값은 ${answer}입니다.`,
        hintText:
          `x^2를 하나의 문자 y로 치환한 뒤 이차식처럼 인수분해하세요.`,
        audit: {
          rule: "biquadratic-largest-root",
          p,
          q,
          polynomial,
        },
      };
    },
  },
];

const problemTypes = createVerifiedProblemTypes(
  definitions,
  {
    conceptId: "polynomial-factorization",
    conceptTitle: "다항식의 인수분해",
    verify,
  }
);

module.exports = {
  key: "common-math-1-polynomial-factorization",
  requiredDistinctTypes: 5,
  problemTypes,
  isCorrectAnswer,
  verify,
};
