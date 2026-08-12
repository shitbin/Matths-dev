const {
  randomInteger,
  nonZeroInteger,
  isCorrectAnswer,
} = require("../utils");
const {
  createAlgebraProblemType,
} = require("../algebra/helpers");

function randomNonZero(min = -5, max = 5) {
  return nonZeroInteger(min, max);
}

function randomDistinctIntegers(
  count,
  min = -5,
  max = 5,
  { excludeZero = false } = {}
) {
  const values = [];

  while (values.length < count) {
    const value = randomInteger(min, max);
    if (excludeZero && value === 0) continue;
    if (!values.includes(value)) values.push(value);
  }

  return values;
}

function trimCoefficients(coefficients) {
  const result = [...coefficients];

  while (
    result.length > 1 &&
    result[result.length - 1] === 0
  ) {
    result.pop();
  }

  return result;
}

function addPolynomials(left, right) {
  const length = Math.max(left.length, right.length);
  return trimCoefficients(
    Array.from(
      { length },
      (_, index) =>
        (left[index] || 0) +
        (right[index] || 0)
    )
  );
}

function subtractPolynomials(left, right) {
  return addPolynomials(
    left,
    right.map((value) => -value)
  );
}

function scalePolynomial(coefficients, scalar) {
  return trimCoefficients(
    coefficients.map((value) => value * scalar)
  );
}

function multiplyPolynomials(left, right) {
  const result = Array(
    left.length + right.length - 1
  ).fill(0);

  left.forEach((leftValue, leftIndex) => {
    right.forEach((rightValue, rightIndex) => {
      result[leftIndex + rightIndex] +=
        leftValue * rightValue;
    });
  });

  return trimCoefficients(result);
}

function evaluatePolynomial(coefficients, x) {
  return [...coefficients]
    .reverse()
    .reduce(
      (value, coefficient) =>
        value * x + coefficient,
      0
    );
}

function coefficientAt(coefficients, degree) {
  return coefficients[degree] || 0;
}

function linearFactor(root) {
  return [-root, 1];
}

function termBody(absoluteCoefficient, degree) {
  if (degree === 0) {
    return String(absoluteCoefficient);
  }

  const coefficient =
    absoluteCoefficient === 1
      ? ""
      : String(absoluteCoefficient);
  const variable = degree === 1 ? "x" : `x^${degree}`;

  return `${coefficient}${variable}`;
}

function polynomialText(coefficients) {
  const terms = [];
  const normalized = trimCoefficients(coefficients);

  for (
    let degree = normalized.length - 1;
    degree >= 0;
    degree -= 1
  ) {
    const coefficient = normalized[degree] || 0;
    if (coefficient === 0) continue;

    const body = termBody(
      Math.abs(coefficient),
      degree
    );

    if (terms.length === 0) {
      terms.push(coefficient < 0 ? `-${body}` : body);
    } else {
      terms.push(
        coefficient < 0 ? `- ${body}` : `+ ${body}`
      );
    }
  }

  return terms.length ? terms.join(" ") : "0";
}

function polynomialTextWithSymbol(
  coefficients,
  degree,
  symbol = "k"
) {
  const terms = [];
  const maximumDegree = Math.max(
    coefficients.length - 1,
    degree
  );

  for (
    let currentDegree = maximumDegree;
    currentDegree >= 0;
    currentDegree -= 1
  ) {
    if (currentDegree === degree) {
      const variable =
        currentDegree === 0
          ? ""
          : currentDegree === 1
            ? "x"
            : `x^${currentDegree}`;
      const body = `${symbol}${variable}`;
      terms.push(
        terms.length === 0 ? body : `+ ${body}`
      );
      continue;
    }

    const coefficient = coefficients[currentDegree] || 0;
    if (coefficient === 0) continue;
    const body = termBody(
      Math.abs(coefficient),
      currentDegree
    );
    if (terms.length === 0) {
      terms.push(coefficient < 0 ? `-${body}` : body);
    } else {
      terms.push(
        coefficient < 0 ? `- ${body}` : `+ ${body}`
      );
    }
  }

  return terms.length ? terms.join(" ") : symbol;
}

function factorText(root) {
  if (root === 0) return "x";
  return root > 0
    ? `(x - ${root})`
    : `(x + ${Math.abs(root)})`;
}

function numberClose(left, right) {
  return (
    Number.isFinite(Number(left)) &&
    Number.isFinite(Number(right)) &&
    Math.abs(Number(left) - Number(right)) < 1e-9
  );
}

function createVerifiedProblemTypes(
  definitions,
  { conceptId, conceptTitle, verify }
) {
  return definitions.map((definition) =>
    createAlgebraProblemType(
      {
        ...definition,
        validate(problem) {
          return Boolean(
            problem.audit && verify(problem)
          );
        },
      },
      { conceptId, conceptTitle }
    )
  );
}

module.exports = {
  randomInteger,
  randomNonZero,
  randomDistinctIntegers,
  addPolynomials,
  subtractPolynomials,
  scalePolynomial,
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
};
