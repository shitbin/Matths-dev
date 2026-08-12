const {
  randomInteger,
  randomNonZero,
  addPolynomials,
  subtractPolynomials,
  scalePolynomial,
  multiplyPolynomials,
  evaluatePolynomial,
  coefficientAt,
  linearFactor,
  polynomialText,
  polynomialTextWithSymbol,
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

function buildLinearDivision() {
  const root = randomNonZero(-4, 4);
  const quotient = randomPolynomial(2, -4, 4);
  const remainder = randomInteger(-8, 8);
  const dividend = addPolynomials(
    multiplyPolynomials(
      linearFactor(root),
      quotient
    ),
    [remainder]
  );

  return { root, quotient, remainder, dividend };
}

function degreeLabel(degree) {
  return degree === 0 ? "상수항" : `x^${degree}항`;
}

function verify(problem) {
  const audit = problem.audit;
  let expected;

  switch (audit.rule) {
    case "add-coefficient":
      expected = coefficientAt(
        addPolynomials(audit.left, audit.right),
        audit.degree
      );
      break;
    case "subtract-coefficient":
      expected = coefficientAt(
        subtractPolynomials(audit.left, audit.right),
        audit.degree
      );
      break;
    case "product-coefficient":
      expected = coefficientAt(
        multiplyPolynomials(audit.left, audit.right),
        audit.degree
      );
      break;
    case "evaluate-combination": {
      const combined =
        audit.operation === "add"
          ? addPolynomials(audit.left, audit.right)
          : subtractPolynomials(audit.left, audit.right);
      expected = evaluatePolynomial(combined, audit.x);
      break;
    }
    case "division-quotient-coefficient": {
      const reconstructed = addPolynomials(
        multiplyPolynomials(
          linearFactor(audit.root),
          audit.quotient
        ),
        [audit.remainder]
      );
      const dividendMatches =
        reconstructed.join(",") ===
        audit.dividend.join(",");
      if (!dividendMatches) return false;
      expected = coefficientAt(
        audit.quotient,
        audit.degree
      );
      break;
    }
    case "division-remainder-sum": {
      const reconstructed = addPolynomials(
        multiplyPolynomials(
          audit.divisor,
          audit.quotient
        ),
        audit.remainder
      );
      if (
        reconstructed.join(",") !==
        audit.dividend.join(",")
      ) {
        return false;
      }
      expected = evaluatePolynomial(audit.remainder, 1);
      break;
    }
    case "division-quotient-value":
      expected = evaluatePolynomial(audit.quotient, audit.x);
      break;
    case "linear-combination-coefficient": {
      const combined = addPolynomials(
        scalePolynomial(audit.left, audit.leftScale),
        scalePolynomial(audit.right, audit.rightScale)
      );
      expected = coefficientAt(combined, audit.degree);
      break;
    }
    case "division-constant": {
      const reconstructed = addPolynomials(
        multiplyPolynomials(
          linearFactor(audit.root),
          audit.quotient
        ),
        [audit.remainder]
      );
      expected = reconstructed[0];
      break;
    }
    default:
      return false;
  }

  return numberClose(problem.answer, expected);
}

const definitions = [
  {
    id: "poly-add-coefficient",
    label: "유형 1 · 다항식의 덧셈",
    difficulty: 1,
    generate() {
      const left = randomPolynomial(3);
      const right = randomPolynomial(3);
      const degree = randomInteger(0, 3);
      const answer =
        coefficientAt(left, degree) +
        coefficientAt(right, degree);

      return {
        prompt:
          `A(x)=${polynomialText(left)}, ` +
          `B(x)=${polynomialText(right)}일 때 ` +
          `A(x)+B(x)의 ${degreeLabel(degree)}의 계수를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: ${degreeLabel(degree)}의 계수끼리 모읍니다. ` +
          `다음으로: ${coefficientAt(left, degree)}+` +
          `(${coefficientAt(right, degree)})=${answer}입니다.`,
        hintText:
          `차수가 같은 ${degreeLabel(degree)}의 계수만 더하세요.`,
        audit: {
          rule: "add-coefficient",
          left,
          right,
          degree,
        },
      };
    },
  },
  {
    id: "poly-subtract-coefficient",
    label: "유형 2 · 다항식의 뺄셈",
    difficulty: 1,
    generate() {
      const left = randomPolynomial(3);
      const right = randomPolynomial(3);
      const degree = randomInteger(0, 3);
      const answer =
        coefficientAt(left, degree) -
        coefficientAt(right, degree);

      return {
        prompt:
          `A(x)=${polynomialText(left)}, ` +
          `B(x)=${polynomialText(right)}일 때 ` +
          `A(x)-B(x)의 ${degreeLabel(degree)}의 계수를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: B(x)의 모든 항 앞 부호를 바꿉니다. ` +
          `다음으로: ${degreeLabel(degree)}의 계수는 ` +
          `${coefficientAt(left, degree)}-` +
          `(${coefficientAt(right, degree)})=${answer}입니다.`,
        hintText:
          `B(x)를 빼므로 괄호를 풀 때 각 항의 부호가 바뀝니다.`,
        audit: {
          rule: "subtract-coefficient",
          left,
          right,
          degree,
        },
      };
    },
  },
  {
    id: "poly-linear-product-middle",
    label: "유형 3 · 일차식의 곱",
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
      const answer = coefficientAt(
        multiplyPolynomials(left, right),
        1
      );

      return {
        prompt:
          `(${polynomialText(left)})` +
          `(${polynomialText(right)})를 전개했을 때 ` +
          `x의 계수를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: x항은 두 교차곱에서 나옵니다. ` +
          `다음으로: ${left[1]}×(${right[0]})+` +
          `(${left[0]})×${right[1]}=${answer}입니다.`,
        hintText:
          `첫째 식의 x항×둘째 식의 상수항과 그 반대를 더하세요.`,
        audit: {
          rule: "product-coefficient",
          left,
          right,
          degree: 1,
        },
      };
    },
  },
  {
    id: "poly-square-middle",
    label: "유형 4 · 곱셈공식",
    difficulty: 2,
    generate() {
      const linear = [
        randomNonZero(-7, 7),
        randomNonZero(-4, 4),
      ];
      const answer = coefficientAt(
        multiplyPolynomials(linear, linear),
        1
      );

      return {
        prompt:
          `(${polynomialText(linear)})^2을 전개했을 때 ` +
          `x의 계수를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: (ax+b)^2=a^2x^2+2abx+b^2를 씁니다. ` +
          `다음으로: x의 계수는 2×(${linear[1]})×` +
          `(${linear[0]})=${answer}입니다.`,
        hintText: `가운데 항의 계수는 2ab입니다.`,
        audit: {
          rule: "product-coefficient",
          left: linear,
          right: linear,
          degree: 1,
        },
      };
    },
  },
  {
    id: "poly-evaluate-combination",
    label: "유형 5 · 다항식 계산값",
    difficulty: 2,
    generate() {
      const left = randomPolynomial(2, -4, 4);
      const right = randomPolynomial(2, -4, 4);
      const x = randomNonZero(-2, 2);
      const operation = Math.random() < 0.5 ? "add" : "subtract";
      const combined =
        operation === "add"
          ? addPolynomials(left, right)
          : subtractPolynomials(left, right);
      const answer = evaluatePolynomial(combined, x);
      const symbol = operation === "add" ? "+" : "-";

      return {
        prompt:
          `A(x)=${polynomialText(left)}, ` +
          `B(x)=${polynomialText(right)}일 때 ` +
          `(A${symbol}B)(${x})의 값을 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: A(x)${symbol}B(x)=` +
          `${polynomialText(combined)}로 정리합니다. ` +
          `다음으로: x=${x}를 대입하면 ${answer}입니다.`,
        hintText:
          `먼저 동류항을 정리한 다음 x=${x}를 대입하세요.`,
        audit: {
          rule: "evaluate-combination",
          left,
          right,
          operation,
          x,
        },
      };
    },
  },
  {
    id: "poly-linear-division-coefficient",
    label: "유형 6 · 다항식의 나눗셈",
    difficulty: 2,
    generate() {
      const data = buildLinearDivision();
      const degree = randomInteger(0, 2);
      const answer = coefficientAt(data.quotient, degree);

      return {
        prompt:
          `P(x)=${polynomialText(data.dividend)}를 ` +
          `${factorTextForPrompt(data.root)}로 나눈 몫에서 ` +
          `${degreeLabel(degree)}의 계수를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: 내림차순으로 나누면 몫은 ` +
          `Q(x)=${polynomialText(data.quotient)}입니다. ` +
          `다음으로: 따라서 ${degreeLabel(degree)}의 계수는 ${answer}입니다. ` +
          `검산: P(x)=${factorTextForPrompt(data.root)}` +
          `Q(x)+(${data.remainder})입니다.`,
        hintText:
          `최고차항끼리 나누어 몫을 한 항씩 만든 뒤 곱해서 빼세요.`,
        audit: {
          rule: "division-quotient-coefficient",
          ...data,
          degree,
        },
      };
    },
  },
  {
    id: "poly-quadratic-division-remainder",
    label: "유형 7 · 몫과 나머지",
    difficulty: 3,
    generate() {
      const divisor = [
        randomNonZero(-5, 5),
        randomInteger(-3, 3),
        1,
      ];
      const quotient = [
        randomInteger(-4, 4),
        randomNonZero(-3, 3),
      ];
      const remainder = [
        randomInteger(-7, 7),
        randomInteger(-5, 5),
      ];
      const dividend = addPolynomials(
        multiplyPolynomials(divisor, quotient),
        remainder
      );
      const answer = evaluatePolynomial(remainder, 1);

      return {
        prompt:
          `P(x)=${polynomialText(dividend)}를 ` +
          `B(x)=${polynomialText(divisor)}로 나눈 나머지를 ` +
          `R(x)=ax+b라 할 때 a+b를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: 다항식 나눗셈을 하면 몫은 ` +
          `${polynomialText(quotient)}, 나머지는 ` +
          `${polynomialText(remainder)}입니다. ` +
          `다음으로: a+b=R(1)=${answer}입니다. ` +
          `검산: P(x)=B(x)Q(x)+R(x)입니다.`,
        hintText:
          `나머지의 차수는 이차식 B(x)의 차수보다 낮아야 합니다.`,
        audit: {
          rule: "division-remainder-sum",
          divisor,
          quotient,
          remainder,
          dividend,
        },
      };
    },
  },
  {
    id: "poly-synthetic-division-value",
    label: "유형 8 · 조립제법",
    difficulty: 3,
    generate() {
      const data = buildLinearDivision();
      const x = randomNonZero(-2, 2);
      const answer = evaluatePolynomial(data.quotient, x);

      return {
        prompt:
          `P(x)=${polynomialText(data.dividend)}를 ` +
          `${factorTextForPrompt(data.root)}로 나눈 몫을 Q(x)라 할 때 ` +
          `Q(${x})의 값을 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: ${data.root}로 조립제법을 하면 ` +
          `Q(x)=${polynomialText(data.quotient)}입니다. ` +
          `다음으로: x=${x}를 대입하면 Q(${x})=${answer}입니다.`,
        hintText:
          `x-${data.root}로 나누므로 조립제법 왼쪽에는 ${data.root}를 씁니다.`,
        audit: {
          rule: "division-quotient-value",
          ...data,
          x,
        },
      };
    },
  },
  {
    id: "poly-linear-combination",
    label: "유형 9 · 다항식의 혼합 계산",
    difficulty: 2,
    generate() {
      const left = randomPolynomial(3, -4, 4);
      const right = randomPolynomial(3, -4, 4);
      const leftScale = randomNonZero(-3, 3);
      const rightScale = randomNonZero(-3, 3);
      const degree = randomInteger(0, 3);
      const answer =
        leftScale * coefficientAt(left, degree) +
        rightScale * coefficientAt(right, degree);

      return {
        prompt:
          `A(x)=${polynomialText(left)}, ` +
          `B(x)=${polynomialText(right)}일 때 ` +
          `${leftScale}A(x)+(${rightScale})B(x)의 ` +
          `${degreeLabel(degree)}의 계수를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: ${degreeLabel(degree)}의 계수만 골라 각각 상수를 곱합니다. ` +
          `다음으로: ${leftScale}×(${coefficientAt(left, degree)})+` +
          `(${rightScale})×(${coefficientAt(right, degree)})=${answer}입니다.`,
        hintText:
          `다항식 전체를 전개하지 않고 필요한 차수의 계수만 계산해도 됩니다.`,
        audit: {
          rule: "linear-combination-coefficient",
          left,
          right,
          leftScale,
          rightScale,
          degree,
        },
      };
    },
  },
  {
    id: "poly-division-missing-constant",
    label: "유형 10 · 나눗셈식의 미정계수",
    difficulty: 3,
    generate() {
      const data = buildLinearDivision();
      const answer = data.dividend[0];
      const dividendWithK = polynomialTextWithSymbol(
        data.dividend,
        0,
        "k"
      );

      return {
        prompt:
          `P(x)=${dividendWithK}를 ` +
          `${factorTextForPrompt(data.root)}로 나누었을 때 ` +
          `몫이 ${polynomialText(data.quotient)}, ` +
          `나머지가 ${data.remainder}입니다. k를 구하세요.`,
        inputMode: "short-answer",
        answer,
        solution:
          `먼저: P(x)=${factorTextForPrompt(data.root)}` +
          `(${polynomialText(data.quotient)})+(${data.remainder})를 씁니다. ` +
          `다음으로: 양변에 x=0을 대입하면 k=${answer}입니다.`,
        hintText:
          `나눗셈식 P=(나누는 식)×(몫)+(나머지)에 x=0을 대입하세요.`,
        audit: {
          rule: "division-constant",
          ...data,
        },
      };
    },
  },
];

function factorTextForPrompt(root) {
  return root > 0
    ? `(x-${root})`
    : `(x+${Math.abs(root)})`;
}

const problemTypes = createVerifiedProblemTypes(
  definitions,
  {
    conceptId: "polynomial-arithmetic",
    conceptTitle: "다항식의 사칙연산",
    verify,
  }
);

module.exports = {
  key: "common-math-1-polynomial-arithmetic",
  requiredDistinctTypes: 5,
  problemTypes,
  isCorrectAnswer,
  verify,
};
