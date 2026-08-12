const {
  randomInteger,
  randomNonZero,
  randomDistinctIntegers,
  addPolynomials,
  multiplyPolynomials,
  evaluatePolynomial,
  coefficientAt,
  linearFactor,
  polynomialText,
  polynomialTextWithSymbol,
  factorText,
  numberClose,
  createVerifiedProblemTypes,
  isCorrectAnswer,
} = require("./helpers");

function randomPolynomial(degree, min = -5, max = 5) {
  const coefficients = Array.from(
    { length: degree + 1 },
    () => randomInteger(min, max)
  );
  coefficients[degree] = randomNonZero(min, max);
  return coefficients;
}

function verify(problem) {
  const audit = problem.audit;
  let expected;

  switch (audit.rule) {
    case "identity-product-coefficient":
      expected = coefficientAt(
        multiplyPolynomials(audit.left, audit.right),
        audit.degree
      );
      break;
    case "identity-linear-parameter": {
      const leftCoefficient = audit.a + audit.k;
      const leftConstant =
        audit.a * audit.p + audit.k * audit.q;
      if (
        leftCoefficient !== audit.m ||
        leftConstant !== audit.n
      ) {
        return false;
      }
      expected = audit.m - audit.a;
      break;
    }
    case "remainder-linear":
      expected = evaluatePolynomial(
        audit.polynomial,
        audit.root
      );
      break;
    case "remainder-scaled-linear": {
      const root = -audit.constant / audit.xCoefficient;
      if (!Number.isInteger(root)) return false;
      expected = evaluatePolynomial(audit.polynomial, root);
      break;
    }
    case "factor-parameter-quadratic":
      expected = -(
        audit.root * audit.root + audit.constant
      ) / audit.root;
      break;
    case "factor-choice": {
      const correct = audit.candidates.find(
        ({ value }) =>
          evaluatePolynomial(audit.polynomial, value) === 0
      );
      if (!correct) return false;
      return String(problem.answer) === correct.key;
    }
    case "remainder-quadratic": {
      const reconstructed = addPolynomials(
        multiplyPolynomials(
          multiplyPolynomials(
            linearFactor(audit.firstRoot),
            linearFactor(audit.secondRoot)
          ),
          audit.quotient
        ),
        audit.remainder
      );
      if (
        reconstructed.join(",") !==
        audit.polynomial.join(",")
      ) {
        return false;
      }
      expected = evaluatePolynomial(audit.remainder, 1);
      break;
    }
    case "remainder-two-values": {
      const slope =
        (audit.secondValue - audit.firstValue) /
        (audit.secondRoot - audit.firstRoot);
      const intercept =
        audit.firstValue - slope * audit.firstRoot;
      expected = slope + intercept;
      break;
    }
    case "factor-parameter-cubic":
      expected = -(
        audit.root ** 3 +
        audit.linearCoefficient * audit.root +
        audit.constant
      ) / (audit.root ** 2);
      break;
    default:
      return false;
  }

  return numberClose(problem.answer, expected);
}

const definitions = [
  {
    id: "identity-product-coefficient",
    label: "유형 1 · 항등식의 계수 비교",
    difficulty: 1,
    generate() {
      const left = [
        randomNonZero(-6, 6),
        randomNonZero(-4, 4),
      ];
      const right = [
        randomNonZero(-6, 6),
        randomNonZero(-4, 4),
      ];
      const product = multiplyPolynomials(left, right);
      const answer = coefficientAt(product, 1);

      return {
        prompt:
          `(${polynomialText(left)})(${polynomialText(right)})` +
          `≡${product[2]}x^2+kx+(${product[0]})일 때 k를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: 항등식의 양변에서 x항의 계수를 비교합니다. ` +
          `다음으로: 교차항의 계수 ${left[1]}×(${right[0]})+` +
          `(${left[0]})×${right[1]}=${answer}이므로 k=${answer}입니다.`,
        hintText:
          `모든 x에서 성립하므로 같은 차수 항의 계수는 서로 같습니다.`,
        audit: {
          rule: "identity-product-coefficient",
          left,
          right,
          degree: 1,
        },
      };
    },
  },
  {
    id: "identity-linear-parameter",
    label: "유형 2 · 일차 항등식",
    difficulty: 1,
    generate() {
      const a = randomNonZero(-5, 5);
      const k = randomNonZero(-5, 5);
      const p = randomInteger(-5, 5);
      const q = randomInteger(-5, 5);
      const m = a + k;
      const n = a * p + k * q;

      return {
        prompt:
          `${a}(x+(${p}))+k(x+(${q}))` +
          `≡${m}x+(${n})일 때 k를 구하세요.`,
        inputMode: "short-answer",
        answer: k,
        solution:
          `먼저: x의 계수를 비교하면 ${a}+k=${m}입니다. ` +
          `다음으로: k=${m}-(${a})=${k}입니다. ` +
          `상수항도 ${a}×(${p})+${k}×(${q})=${n}으로 일치합니다.`,
        hintText: `먼저 양변의 x항 계수만 비교하세요.`,
        audit: {
          rule: "identity-linear-parameter",
          a,
          k,
          p,
          q,
          m,
          n,
        },
      };
    },
  },
  {
    id: "identity-special-substitution",
    label: "유형 3 · 항등식의 수 대입",
    difficulty: 2,
    generate() {
      const root = randomNonZero(-4, 4);
      const quotient = randomPolynomial(2, -4, 4);
      const remainder = randomInteger(-9, 9);
      const polynomial = addPolynomials(
        multiplyPolynomials(
          linearFactor(root),
          quotient
        ),
        [remainder]
      );

      return {
        prompt:
          `P(x)=${polynomialText(polynomial)}이고 ` +
          `P(x)=${factorText(root)}Q(x)+k가 모든 x에서 ` +
          `성립할 때 k를 구하세요.`,
        inputMode: "short-answer",
        answer: remainder,
        solution:
          `먼저: ${factorText(root)}가 0이 되도록 x=${root}를 대입합니다. ` +
          `다음으로: k=P(${root})=${remainder}입니다.`,
        hintText:
          `${factorText(root)}를 0으로 만드는 x=${root}를 대입하세요.`,
        audit: {
          rule: "remainder-linear",
          polynomial,
          root,
        },
      };
    },
  },
  {
    id: "remainder-linear",
    label: "유형 4 · 일차식의 나머지정리",
    difficulty: 1,
    generate() {
      const polynomial = randomPolynomial(3, -5, 5);
      const root = randomNonZero(-3, 3);
      const answer = evaluatePolynomial(polynomial, root);

      return {
        prompt:
          `P(x)=${polynomialText(polynomial)}를 ` +
          `${factorText(root)}로 나눈 나머지를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: 나머지정리에 따라 나머지는 P(${root})입니다. ` +
          `다음으로: ${polynomialText(polynomial)}에 x=${root}를 ` +
          `대입하면 ${answer}입니다.`,
        hintText:
          `x-a로 나눈 나머지는 P(a)입니다.`,
        audit: {
          rule: "remainder-linear",
          polynomial,
          root,
        },
      };
    },
  },
  {
    id: "remainder-scaled-linear",
    label: "유형 5 · ax+b의 나머지",
    difficulty: 2,
    generate() {
      const polynomial = randomPolynomial(3, -4, 4);
      const root = randomNonZero(-3, 3);
      const xCoefficient = randomInteger(2, 5);
      const constant = -xCoefficient * root;
      const divisor = [constant, xCoefficient];
      const answer = evaluatePolynomial(polynomial, root);

      return {
        prompt:
          `P(x)=${polynomialText(polynomial)}를 ` +
          `${polynomialText(divisor)}로 나눈 나머지를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: ${polynomialText(divisor)}=0의 해는 x=${root}입니다. ` +
          `다음으로: 나머지는 P(${root})=${answer}입니다.`,
        hintText:
          `나누는 일차식을 0으로 만드는 x를 먼저 구하세요.`,
        audit: {
          rule: "remainder-scaled-linear",
          polynomial,
          xCoefficient,
          constant,
        },
      };
    },
  },
  {
    id: "factor-parameter-quadratic",
    label: "유형 6 · 인수정리와 미정계수",
    difficulty: 2,
    generate() {
      const [root, otherRoot] = randomDistinctIntegers(
        2,
        -5,
        5,
        { excludeZero: true }
      );
      const constant = root * otherRoot;
      const answer = -(root + otherRoot);
      const polynomial = [constant, answer, 1];

      return {
        prompt:
          `P(x)=x^2+kx+(${constant})에서 ` +
          `${factorText(root)}가 인수일 때 k를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: 인수정리에 따라 P(${root})=0입니다. ` +
          `다음으로: (${root})^2+k(${root})+(${constant})=0을 풀면 ` +
          `k=${answer}입니다.`,
        hintText:
          `${factorText(root)}가 인수이면 P(${root})=0입니다.`,
        audit: {
          rule: "factor-parameter-quadratic",
          polynomial,
          root,
          constant,
        },
      };
    },
  },
  {
    id: "factor-theorem-choice",
    label: "유형 7 · 인수의 판정",
    difficulty: 2,
    generate() {
      const roots = randomDistinctIntegers(
        2,
        -5,
        5,
        { excludeZero: true }
      );
      const polynomial = multiplyPolynomials(
        linearFactor(roots[0]),
        linearFactor(roots[1])
      );
      const distractors = randomDistinctIntegers(
        3,
        -8,
        8,
        { excludeZero: true }
      ).filter((value) => !roots.includes(value));
      while (distractors.length < 3) {
        const value = randomNonZero(-9, 9);
        if (
          !roots.includes(value) &&
          !distractors.includes(value)
        ) {
          distractors.push(value);
        }
      }
      const candidateValues = [
        roots[randomInteger(0, 1)],
        ...distractors.slice(0, 3),
      ].sort(() => Math.random() - 0.5);
      const candidates = candidateValues.map(
        (value, index) => ({
          key: ["a", "b", "c", "d"][index],
          value,
        })
      );
      const choices = candidates.map(({ key, value }) => ({
        key,
        text: factorText(value),
      }));
      const answer = candidates.find(
        ({ value }) =>
          evaluatePolynomial(polynomial, value) === 0
      ).key;

      return {
        prompt:
          `P(x)=${polynomialText(polynomial)}의 인수인 것을 고르세요.`,
        inputMode: "multiple-choice",
        choices,
        answer,
        solution:
          `먼저: 각 선택지를 x-a 꼴로 보고 a를 P(a)에 대입합니다. ` +
          `다음으로: P(${candidates.find((item) => item.key === answer).value})=0이므로 ` +
          `${choices.find((item) => item.key === answer).text}가 인수입니다.`,
        hintText:
          `x-a가 인수인지 확인하려면 P(a)를 계산하세요.`,
        audit: {
          rule: "factor-choice",
          polynomial,
          candidates,
        },
      };
    },
  },
  {
    id: "remainder-quadratic",
    label: "유형 8 · 이차식으로 나눈 나머지",
    difficulty: 3,
    generate() {
      const [firstRoot, secondRoot] =
        randomDistinctIntegers(
          2,
          -4,
          4,
          { excludeZero: true }
        );
      const quotient = [
        randomInteger(-4, 4),
        randomNonZero(-3, 3),
      ];
      const remainder = [
        randomInteger(-7, 7),
        randomInteger(-5, 5),
      ];
      const divisor = multiplyPolynomials(
        linearFactor(firstRoot),
        linearFactor(secondRoot)
      );
      const polynomial = addPolynomials(
        multiplyPolynomials(divisor, quotient),
        remainder
      );
      const answer = evaluatePolynomial(remainder, 1);

      return {
        prompt:
          `P(x)=${polynomialText(polynomial)}를 ` +
          `${factorText(firstRoot)}${factorText(secondRoot)}로 나눈 ` +
          `나머지를 ax+b라 할 때 a+b를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: 나머지를 R(x)=ax+b로 둡니다. ` +
          `다음으로: x=${firstRoot}, ${secondRoot}를 각각 대입해 ` +
          `두 식을 풀면 R(x)=${polynomialText(remainder)}입니다. ` +
          `마지막으로: a+b=R(1)=${answer}입니다.`,
        hintText:
          `나누는 식을 0으로 만드는 두 값을 대입해 R(x)를 구하세요.`,
        audit: {
          rule: "remainder-quadratic",
          polynomial,
          firstRoot,
          secondRoot,
          quotient,
          remainder,
        },
      };
    },
  },
  {
    id: "remainder-two-values",
    label: "유형 9 · 두 나머지의 활용",
    difficulty: 3,
    generate() {
      const [firstRoot, secondRoot] =
        randomDistinctIntegers(
          2,
          -4,
          4,
          { excludeZero: true }
        );
      const slope = randomNonZero(-5, 5);
      const intercept = randomInteger(-7, 7);
      const firstValue = slope * firstRoot + intercept;
      const secondValue = slope * secondRoot + intercept;
      const answer = slope + intercept;

      return {
        prompt:
          `P(x)를 ${factorText(firstRoot)}로 나눈 나머지가 ` +
          `${firstValue}, ${factorText(secondRoot)}로 나눈 나머지가 ` +
          `${secondValue}입니다. P(x)를 ` +
          `${factorText(firstRoot)}${factorText(secondRoot)}로 나눈 ` +
          `나머지를 ax+b라 할 때 a+b를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: R(${firstRoot})=${firstValue}, ` +
          `R(${secondRoot})=${secondValue}이므로 ` +
          `${firstRoot}a+b=${firstValue}, ` +
          `${secondRoot}a+b=${secondValue}입니다. ` +
          `다음으로: 두 식을 풀면 a=${slope}, b=${intercept}이므로 ` +
          `a+b=${answer}입니다.`,
        hintText:
          `R(x)=ax+b에 두 근을 각각 대입해 연립방정식을 만드세요.`,
        audit: {
          rule: "remainder-two-values",
          firstRoot,
          secondRoot,
          firstValue,
          secondValue,
        },
      };
    },
  },
  {
    id: "factor-parameter-cubic",
    label: "유형 10 · 삼차식의 인수정리",
    difficulty: 3,
    generate() {
      const roots = randomDistinctIntegers(
        3,
        -5,
        5,
        { excludeZero: true }
      );
      const polynomial = roots.reduce(
        (result, root) =>
          multiplyPolynomials(result, linearFactor(root)),
        [1]
      );
      const answer = polynomial[2];
      const hidden = polynomialTextWithSymbol(
        polynomial,
        2,
        "k"
      );

      return {
        prompt:
          `P(x)=${hidden}에서 ${factorText(roots[0])}가 ` +
          `인수일 때 k를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: 인수정리에 따라 P(${roots[0]})=0입니다. ` +
          `다음으로: (${roots[0]})^3+k(${roots[0]})^2+` +
          `(${polynomial[1]})(${roots[0]})+(${polynomial[0]})=0을 풀면 ` +
          `k=${answer}입니다.`,
        hintText:
          `${factorText(roots[0])}가 인수이므로 P(${roots[0]})=0을 이용하세요.`,
        audit: {
          rule: "factor-parameter-cubic",
          root: roots[0],
          linearCoefficient: polynomial[1],
          constant: polynomial[0],
        },
      };
    },
  },
];

const problemTypes = createVerifiedProblemTypes(
  definitions,
  {
    conceptId: "identity-remainder-theorem",
    conceptTitle: "항등식과 나머지정리",
    verify,
  }
);

module.exports = {
  key: "common-math-1-identity-remainder-theorem",
  requiredDistinctTypes: 5,
  problemTypes,
  isCorrectAnswer,
  verify,
};
