"use strict";
(() => {
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
    get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
  }) : x)(function(x) {
    if (typeof require !== "undefined") return require.apply(this, arguments);
    throw Error('Dynamic require of "' + x + '" is not supported');
  });
  var __commonJS = (cb, mod) => function __require2() {
    try {
      return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
    } catch (e) {
      throw mod = 0, e;
    }
  };

  // services/assessmentReferences/mockExamCatalog.js
  var require_mockExamCatalog = __commonJS({
    "services/assessmentReferences/mockExamCatalog.js"(exports, module) {
      var ARCHIVE_URLS = {
        1: "https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs?targetCd=D100",
        2: "https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs?targetCd=D200",
        3: "https://www.ebsi.co.kr/ebs/xip/xipc/previousPaperList.ebs?targetCd=D300"
      };
      var YEARS = [
        2022,
        2023,
        2024,
        2025,
        2026
      ];
      var GRADE_ONE_TWO_SCHEDULES = {
        2022: [
          [3, "\uC11C\uC6B8"],
          [6, "\uBD80\uC0B0"],
          [9, "\uC778\uCC9C"],
          [11, "\uACBD\uAE30"]
        ],
        2023: [
          [3, "\uC11C\uC6B8"],
          [6, "\uBD80\uC0B0"],
          [9, "\uC778\uCC9C"],
          [11, "\uACBD\uAE30"]
        ],
        2024: [
          [3, "\uC11C\uC6B8"],
          [6, "\uBD80\uC0B0"],
          [9, "\uC778\uCC9C"],
          [10, "\uACBD\uAE30"]
        ],
        2025: [
          [3, "\uC11C\uC6B8"],
          [6, "\uBD80\uC0B0"],
          [9, "\uC778\uCC9C"],
          [10, "\uACBD\uAE30"]
        ],
        2026: [
          [3, "\uC11C\uC6B8"],
          [6, "\uBD80\uC0B0"]
        ]
      };
      var GRADE_THREE_SCHEDULES = {
        2022: [
          [3, "\uC11C\uC6B8", "\uD559\uD3C9"],
          [4, "\uACBD\uAE30", "\uD559\uD3C9"],
          [6, "\uD3C9\uAC00\uC6D0", "\uBAA8\uD3C9"],
          [7, "\uC778\uCC9C", "\uD559\uD3C9"],
          [9, "\uD3C9\uAC00\uC6D0", "\uBAA8\uD3C9"],
          [10, "\uC11C\uC6B8", "\uD559\uD3C9"]
        ],
        2023: [
          [3, "\uC11C\uC6B8", "\uD559\uD3C9"],
          [4, "\uACBD\uAE30", "\uD559\uD3C9"],
          [6, "\uD3C9\uAC00\uC6D0", "\uBAA8\uD3C9"],
          [7, "\uC778\uCC9C", "\uD559\uD3C9"],
          [9, "\uD3C9\uAC00\uC6D0", "\uBAA8\uD3C9"],
          [10, "\uC11C\uC6B8", "\uD559\uD3C9"]
        ],
        2024: [
          [3, "\uC11C\uC6B8", "\uD559\uD3C9"],
          [4, "\uACBD\uAE30", "\uD559\uD3C9"],
          [6, "\uD3C9\uAC00\uC6D0", "\uBAA8\uD3C9"],
          [7, "\uC778\uCC9C", "\uD559\uD3C9"],
          [9, "\uD3C9\uAC00\uC6D0", "\uBAA8\uD3C9"],
          [10, "\uC11C\uC6B8", "\uD559\uD3C9"]
        ],
        2025: [
          [3, "\uC11C\uC6B8", "\uD559\uD3C9"],
          [5, "\uACBD\uAE30", "\uD559\uD3C9"],
          [6, "\uD3C9\uAC00\uC6D0", "\uBAA8\uD3C9"],
          [7, "\uC778\uCC9C", "\uD559\uD3C9"],
          [9, "\uD3C9\uAC00\uC6D0", "\uBAA8\uD3C9"],
          [10, "\uC11C\uC6B8", "\uD559\uD3C9"]
        ],
        2026: [
          [3, "\uC11C\uC6B8", "\uD559\uD3C9"],
          [5, "\uACBD\uAE30", "\uD559\uD3C9"],
          [6, "\uD3C9\uAC00\uC6D0", "\uBAA8\uD3C9"],
          [7, "\uC778\uCC9C", "\uD559\uD3C9"]
        ]
      };
      function twoDigits(value) {
        return String(value).padStart(2, "0");
      }
      function sessionId({
        year,
        grade,
        month
      }) {
        return [
          year,
          `g${grade}`,
          twoDigits(month)
        ].join("-");
      }
      function makeSession({
        year,
        grade,
        month,
        host,
        kind,
        selections
      }) {
        const id = sessionId({
          year,
          grade,
          month
        });
        return {
          id,
          year,
          grade,
          month,
          host,
          kind,
          archiveUrl: ARCHIVE_URLS[grade],
          selections
        };
      }
      var MOCK_EXAM_SESSIONS = [
        ...[1, 2].flatMap(
          (grade) => YEARS.flatMap(
            (year) => GRADE_ONE_TWO_SCHEDULES[year].map(
              ([month, host]) => makeSession({
                year,
                grade,
                month,
                host,
                kind: "\uD559\uD3C9",
                selections: ["\uC218\uD559"]
              })
            )
          )
        ),
        ...YEARS.flatMap(
          (year) => GRADE_THREE_SCHEDULES[year].map(
            ([month, host, kind]) => makeSession({
              year,
              grade: 3,
              month,
              host,
              kind,
              selections: [
                "\uBBF8\uC801\uBD84",
                "\uD655\uB960\uACFC \uD1B5\uACC4"
              ]
            })
          )
        )
      ];
      var MOCK_EXAM_PAPERS = MOCK_EXAM_SESSIONS.flatMap(
        (session) => session.selections.map(
          (selection) => ({
            id: `${session.id}-${selection === "\uC218\uD559" ? "math" : selection === "\uBBF8\uC801\uBD84" ? "calculus" : "probability"}`,
            sessionId: session.id,
            year: session.year,
            grade: session.grade,
            month: session.month,
            host: session.host,
            kind: session.kind,
            selection,
            title: `\uACE0${session.grade} ${session.month}\uC6D4 ${session.kind}(${session.host}) ${selection}`,
            archiveUrl: session.archiveUrl,
            archiveFilters: {
              year: session.year,
              month: session.month,
              subject: selection
            },
            analysisStatus: "indexed"
          })
        )
      );
      var UNIT_REFERENCE_RULES = {
        "common-math-1/polynomials": {
          corpusFilter: (paper) => paper.grade === 1,
          signals: [
            "\uB2E4\uD56D\uC2DD\uC758 \uAD6C\uC870\uB97C \uBCF4\uC874\uD558\uB294 \uC0AC\uCE59\uC5F0\uC0B0",
            "\uD56D\uB4F1\uC2DD\uC758 \uACC4\uC218 \uBE44\uAD50\uC640 \uB098\uBA38\uC9C0\uC815\uB9AC",
            "\uACF1\uC148\uACF5\uC2DD\xB7\uCE58\uD658\uC744 \uC774\uC6A9\uD55C \uC778\uC218\uBD84\uD574",
            "\uC870\uAC74\uC5D0\uC11C \uB2E4\uD56D\uC2DD\uC758 \uAC12\uC744 \uC5ED\uCD94\uB860"
          ]
        },
        "common-math-1/equations-and-inequalities": {
          corpusFilter: (paper) => paper.grade === 1,
          signals: [
            "\uBCF5\uC18C\uC218\uC758 \uC5F0\uC0B0\uACFC \uCF24\uB808\uBCF5\uC18C\uC218",
            "\uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uD310\uBCC4\uC2DD\uACFC \uADFC\uC758 \uC704\uCE58",
            "\uC774\uCC28\uD568\uC218 \uADF8\uB798\uD504\uC640 \uC9C1\uC120\uC758 \uAD50\uC810",
            "\uACE0\uCC28\uBC29\uC815\uC2DD\uC758 \uC778\uC218\uC815\uB9AC\uC640 \uCE58\uD658",
            "\uC808\uB313\uAC12\xB7\uC774\uCC28\uBD80\uB4F1\uC2DD\uC758 \uD574 \uAD6C\uAC04"
          ]
        },
        "common-math-1/counting": {
          corpusFilter: (paper) => paper.grade === 1,
          signals: [
            "\uD569\uC758 \uBC95\uCE59\uACFC \uACF1\uC758 \uBC95\uCE59\uC758 \uAD6C\uBD84",
            "\uC870\uAC74\uC774 \uC788\uB294 \uC21C\uC5F4\uC758 \uB2E8\uACC4\uBCC4 \uBD84\uB958",
            "\uC21C\uC11C\uB97C \uC81C\uAC70\uD55C \uC870\uD569\uC758 \uBAA8\uB378\uB9C1",
            "\uC5EC\uC0AC\uAC74\uC744 \uC774\uC6A9\uD55C \uACBD\uC6B0\uC758 \uC218 \uACC4\uC0B0"
          ]
        },
        "common-math-1/matrices": {
          corpusFilter: (paper) => paper.grade === 1,
          signals: [
            "\uD589\uB82C\uC758 \uD06C\uAE30\uC640 \uC131\uBD84\uC758 \uB300\uC751",
            "\uD589\uB82C\uC758 \uB367\uC148\xB7\uC2E4\uC218\uBC30",
            "\uD589\uACFC \uC5F4\uC744 \uC5F0\uACB0\uD55C \uD589\uB82C\uC758 \uACF1",
            "\uD589\uB82C \uAD00\uACC4\uC2DD\uC5D0\uC11C \uBBF8\uC9C0 \uC131\uBD84 \uBCF5\uC6D0"
          ]
        },
        "common-math-2/coordinate-geometry": {
          corpusFilter: (paper) => paper.grade === 1,
          signals: [
            "\uC88C\uD45C\uC5D0\uC11C \uAC70\uB9AC\xB7\uB0B4\uBD84\uC810 \uBCF5\uC6D0",
            "\uC9C1\uC120\uC758 \uD3C9\uD589\xB7\uC218\uC9C1\uACFC \uC810\uC120\uAC70\uB9AC",
            "\uC6D0\uACFC \uC9C1\uC120\uC758 \uC704\uCE58 \uAD00\uACC4",
            "\uD3C9\uD589\uC774\uB3D9\xB7\uB300\uCE6D\uC774\uB3D9\uC758 \uBC29\uC815\uC2DD \uBCC0\uD658"
          ]
        },
        "common-math-2/sets-and-propositions": {
          corpusFilter: (paper) => paper.grade === 1,
          signals: [
            "\uC9D1\uD569\uC758 \uD3EC\uD568\uAD00\uACC4\uC640 \uC5F0\uC0B0",
            "\uC870\uAC74\uC758 \uC9C4\uB9AC\uC9D1\uD569\uACFC \uBA85\uC81C\uC758 \uCC38\xB7\uAC70\uC9D3",
            "\uC5ED\xB7\uC774\xB7\uB300\uC6B0\uC640 \uD544\uC694\uCDA9\uBD84\uC870\uAC74",
            "\uB300\uC6B0\xB7\uADC0\uB958\uBC95\uACFC \uC808\uB300\uBD80\uB4F1\uC2DD \uC99D\uBA85"
          ]
        },
        "common-math-2/functions-and-graphs": {
          corpusFilter: (paper) => paper.grade === 1,
          signals: [
            "\uD568\uC218\uC758 \uC815\uC758\uC5ED\xB7\uCE58\uC5ED\uACFC \uADF8\uB798\uD504",
            "\uD569\uC131 \uC21C\uC11C\uC640 \uD569\uC131\uD568\uC218\uC758 \uC815\uC758\uC5ED",
            "\uC5ED\uD568\uC218 \uC874\uC7AC \uC870\uAC74\uACFC y=x \uB300\uCE6D",
            "\uC720\uB9AC\uD568\uC218\xB7\uBB34\uB9AC\uD568\uC218\uC758 \uC774\uB3D9\uACFC \uC815\uC758\uC5ED"
          ]
        },
        "algebra/exponential-logarithmic-functions": {
          corpusFilter: (paper) => paper.grade < 3 || paper.selection === "\uBBF8\uC801\uBD84",
          signals: [
            "\uC9C0\uC218\xB7\uB85C\uADF8 \uC2DD\uC758 \uCE58\uD658\uACFC \uD574\uC758 \uC870\uAC74",
            "\uC9C0\uC218\xB7\uB85C\uADF8 \uADF8\uB798\uD504\uC758 \uAD50\uC810\uACFC \uD3C9\uD589\uC774\uB3D9",
            "\uC0C1\uC6A9\uB85C\uADF8\uB97C \uC774\uC6A9\uD55C \uC790\uB9BF\uC218\xB7\uC18C\uC218\uBD80\uBD84 \uD574\uC11D",
            "\uC9C0\uC218\xB7\uB85C\uADF8 \uBC29\uC815\uC2DD\uACFC \uBD80\uB4F1\uC2DD\uC758 \uB9E4\uAC1C\uBCC0\uC218"
          ]
        },
        "algebra/trigonometric-functions": {
          corpusFilter: (paper) => paper.grade < 3 || paper.selection === "\uBBF8\uC801\uBD84",
          signals: [
            "\uC0BC\uAC01\uD568\uC218 \uADF8\uB798\uD504\uC758 \uC8FC\uAE30\xB7\uCD5C\uB300\uCD5C\uC18C \uC5ED\uCD94\uB860",
            "\uC77C\uBC18\uAC01\uC758 \uC0AC\uBD84\uBA74\uACFC \uC0BC\uAC01\uD568\uC218 \uAC12",
            "\uC0AC\uC778\uBC95\uCE59\xB7\uCF54\uC0AC\uC778\uBC95\uCE59\xB7\uB113\uC774\uC758 \uC5F0\uC1C4 \uC801\uC6A9",
            "\uB3C4\uD615 \uC870\uAC74\uC5D0\uC11C \uAE38\uC774\uC640 \uAC01\uC744 \uB2E8\uACC4\uC801\uC73C\uB85C \uBCF5\uC6D0"
          ]
        },
        "algebra/sequences": {
          corpusFilter: (paper) => paper.grade < 3 || paper.selection === "\uBBF8\uC801\uBD84",
          signals: [
            "\uBD80\uBD84\uD569\uC73C\uB85C \uC77C\uBC18\uD56D \uBCF5\uC6D0",
            "\uB4F1\uCC28\xB7\uB4F1\uBE44 \uC870\uAC74\uC758 \uC5F0\uB9BD",
            "\uC810\uD654\uC2DD\uC758 \uBE14\uB85D\xB7\uC8FC\uAE30 \uBD84\uC11D",
            "\uC2DC\uADF8\uB9C8 \uBCC0\uD615\uACFC \uB9DD\uC6D0\uD569",
            "\uC815\uC218\xB7\uC790\uC5F0\uC218 \uC870\uAC74\uC744 \uC774\uC6A9\uD55C \uD6C4\uBCF4 \uC81C\uAC70"
          ]
        },
        "calculus-1/limits-and-continuity": {
          corpusFilter: (paper) => paper.grade >= 2 && (paper.grade < 3 || paper.selection === "\uBBF8\uC801\uBD84"),
          signals: [
            "\uC778\uC218\uBD84\uD574\xB7\uC720\uB9AC\uD654 \uD6C4 \uADF9\uD55C",
            "\uC88C\uADF9\uD55C\xB7\uC6B0\uADF9\uD55C\xB7\uD568\uC22B\uAC12\uC758 \uC77C\uCE58",
            "\uAD6C\uAC04\uBCC4 \uD568\uC218\uC758 \uC5F0\uC18D \uC870\uAC74\uC73C\uB85C \uB9E4\uAC1C\uBCC0\uC218 \uACB0\uC815",
            "\uC911\uAC04\uAC12 \uC815\uB9AC\uC758 \uC874\uC7AC \uAD6C\uAC04 \uD310\uC815"
          ]
        },
        "calculus-1/differentiation": {
          corpusFilter: (paper) => paper.grade >= 2 && (paper.grade < 3 || paper.selection === "\uBBF8\uC801\uBD84"),
          signals: [
            "\uB3C4\uD568\uC218\uC758 \uADFC\uC5D0\uC11C \uC99D\uAC00\xB7\uAC10\uC18C\uC640 \uADF9\uAC12 \uBCF5\uC6D0",
            "\uC811\uC120 \uC870\uAC74\uACFC \uB2E4\uD56D\uD568\uC218 \uACC4\uC218 \uACB0\uC815",
            "\uBC29\uC815\uC2DD \uC2E4\uADFC \uAC1C\uC218\uB97C \uADF8\uB798\uD504 \uAD50\uC810\uC73C\uB85C \uBCC0\uD658",
            "\uC704\uCE58\xB7\uC18D\uB3C4\xB7\uAC00\uC18D\uB3C4\uC758 \uB2E8\uACC4\uC801 \uD574\uC11D",
            "\uD6C4\uC18D \uC801\uBD84 \uBB38\uD56D\uC5D0\uC11C \uC801\uBD84 \uC9C1\uC804 \uB2E8\uACC4\uAE4C\uC9C0\uB9CC \uC808\uB2E8"
          ]
        },
        "calculus-1/integration": {
          corpusFilter: (paper) => paper.grade >= 2 && (paper.grade < 3 || paper.selection === "\uBBF8\uC801\uBD84"),
          signals: [
            "\uB3C4\uD568\uC218 \uC870\uAC74\uC5D0\uC11C \uC6D0\uD568\uC218\uB97C \uBCF5\uC6D0\uD55C \uB4A4 \uC815\uC801\uBD84",
            "\uAD50\uC810\uACFC \uD568\uC218\uC758 \uB300\uC18C\uB97C \uD310\uC815\uD55C \uB4A4 \uB113\uC774 \uACC4\uC0B0",
            "\uC18D\uB3C4\uC758 \uBD80\uD638 \uBCC0\uD654 \uC2DC\uC810\uC744 \uCC3E\uC544 \uC774\uB3D9\uAC70\uB9AC \uACC4\uC0B0",
            "\uC815\uC801\uBD84\uC73C\uB85C \uC815\uC758\uB41C \uD568\uC218\uC758 \uC870\uAC74 \uD574\uC11D"
          ]
        },
        "probability-statistics/counting": {
          corpusFilter: (paper) => paper.grade < 3 || paper.selection === "\uD655\uB960\uACFC \uD1B5\uACC4",
          signals: [
            "\uC911\uBCF5\xB7\uC778\uC811\xB7\uC591\uB05D \uC870\uAC74\uC774 \uC788\uB294 \uBC30\uC5F4",
            "\uD3EC\uD568\uBC30\uC81C\uB85C \uAE08\uC9C0 \uC870\uAC74 \uC81C\uAC70",
            "\uC911\uBCF5\uC870\uD569\uC758 \uD558\uD55C\xB7\uC0C1\uD55C \uCE58\uD658",
            "\uC774\uD56D\uACC4\uC218\uC758 \uD2B9\uC815 \uD56D\uACFC \uACC4\uC218\uD569"
          ]
        },
        "probability-statistics/probability": {
          corpusFilter: (paper) => paper.grade < 3 || paper.selection === "\uD655\uB960\uACFC \uD1B5\uACC4",
          signals: [
            "\uC870\uAC74\uBD80\uD655\uB960\uC5D0\uC11C \uD45C\uBCF8\uACF5\uAC04 \uCD95\uC18C",
            "\uB3C5\uB9BD \uC2DC\uD589\uACFC \uC5EC\uC0AC\uAC74",
            "\uBCA0\uC774\uC988\uD615 \uC6D0\uC778 \uC5ED\uCD94\uB860",
            "\uBE44\uBCF5\uC6D0 \uCD94\uCD9C\uC758 \uB2E8\uACC4\uBCC4 \uC870\uAC74 \uAC31\uC2E0"
          ]
        },
        "probability-statistics/statistics": {
          corpusFilter: (paper) => paper.grade < 3 || paper.selection === "\uD655\uB960\uACFC \uD1B5\uACC4",
          signals: [
            "\uD655\uB960\uBD84\uD3EC\uD45C\uC5D0\uC11C \uBBF8\uC9C0 \uD655\uB960\uACFC \uAE30\uB313\uAC12 \uBCF5\uC6D0",
            "\uC774\uD56D\uBD84\uD3EC\uC758 \uD3C9\uADE0\xB7\uBD84\uC0B0 \uC5ED\uCD94\uB860",
            "\uC815\uADDC\uBD84\uD3EC \uD45C\uC900\uD654\uC640 \uB300\uCE6D\uC131",
            "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uBD84\uD3EC\uC640 \uD45C\uBCF8 \uD06C\uAE30",
            "\uC2E0\uB8B0\uAD6C\uAC04 \uAE38\uC774\uC758 \uC5ED\uC0B0"
          ]
        }
      };
      function getUnitReferenceAnalysis(courseId, unitId) {
        const key = `${courseId}/${unitId}`;
        const rule = UNIT_REFERENCE_RULES[key];
        if (!rule) return null;
        const papers = MOCK_EXAM_PAPERS.filter(
          rule.corpusFilter
        );
        return {
          key,
          years: YEARS.slice(),
          signals: rule.signals.slice(),
          paperIds: papers.map(
            (paper) => paper.id
          ),
          sessionIds: [
            ...new Set(
              papers.map(
                (paper) => paper.sessionId
              )
            )
          ]
        };
      }
      function referenceIdsForTemplate(courseId, unitId, templateIndex, count = 5) {
        const analysis = getUnitReferenceAnalysis(
          courseId,
          unitId
        );
        if (!analysis) return [];
        const ids = analysis.paperIds;
        const selected = [];
        for (let offset = 0; offset < ids.length && selected.length < count; offset += 1) {
          const index = (templateIndex + offset * Math.max(
            1,
            Math.floor(
              ids.length / count
            )
          )) % ids.length;
          const id = ids[index];
          if (!selected.includes(id)) {
            selected.push(id);
          }
        }
        return selected;
      }
      if (MOCK_EXAM_PAPERS.length !== 92) {
        throw new Error(
          `\uCD5C\uADFC 5\uAC1C\uB144 \uBAA8\uC758\uACE0\uC0AC \uCF54\uD37C\uC2A4\uB294 92\uAC1C \uBB38\uC81C\uC9C0\uC5EC\uC57C \uD569\uB2C8\uB2E4: ${MOCK_EXAM_PAPERS.length}`
        );
      }
      module.exports = {
        YEARS,
        ARCHIVE_URLS,
        MOCK_EXAM_SESSIONS,
        MOCK_EXAM_PAPERS,
        UNIT_REFERENCE_RULES,
        getUnitReferenceAnalysis,
        referenceIdsForTemplate
      };
    }
  });

  // matths-static-curriculum:curriculumService
  var require_curriculumService = __commonJS({
    "matths-static-curriculum:curriculumService"(exports, module) {
      "use strict";
      var curriculum = { "courses": [{ "id": "common-math-1", "officialTitle": "\uACF5\uD1B5\uC218\uD5591", "defaultSemester": 1, "conceptCount": 19, "units": [{ "id": "polynomials", "title": "\uB2E4\uD56D\uC2DD", "order": 1, "concepts": [{ "id": "polynomial-arithmetic", "order": 1, "title": "\uB2E4\uD56D\uC2DD\uC758 \uC0AC\uCE59\uC5F0\uC0B0", "standardCode": "10\uACF5\uC2181-01-01", "achievementStandard": "\uB2E4\uD56D\uC2DD\uC758 \uC0AC\uCE59\uC5F0\uC0B0\uC758 \uC6D0\uB9AC\uB97C \uC124\uBA85\uD558\uACE0, \uADF8 \uACC4\uC0B0\uC744 \uD560 \uC218 \uC788\uB2E4.", "topics": ["\uB2E4\uD56D\uC2DD\uC758 \uB367\uC148\uACFC \uBE84\uC148", "\uB2E4\uD56D\uC2DD\uC758 \uACF1\uC148", "\uB2E4\uD56D\uC2DD\uC758 \uB098\uB217\uC148", "\uBAAB\uACFC \uB098\uBA38\uC9C0\uC758 \uAD00\uACC4", "\uC870\uB9BD\uC81C\uBC95"], "scopeNotes": ["\uC870\uB9BD\uC81C\uBC95\uC740 \uAD6C\uCCB4\uC801\uC778 \uC608\uB97C \uD1B5\uD574 \uAC04\uB2E8\uD788 \uB2E4\uB8EC\uB2E4.", "\uC911\uD559\uAD50\uC758 \uB2E4\uD56D\uC2DD\uC744 \uB2E8\uD56D\uC2DD\uC73C\uB85C \uB098\uB204\uB294 \uC5F0\uC0B0\uACFC \uC5F0\uACB0\uD55C\uB2E4."], "visualizationIdeas": ["\uB300\uC218 \uD0C0\uC77C\uB85C \uB2E4\uD56D\uC2DD\uC758 \uB367\uC148\uACFC \uACF1\uC148 \uD45C\uD604", "\uB113\uC774 \uBAA8\uB378\uB85C \uB2E4\uD56D\uC2DD\uC758 \uACF1\uC148 \uD45C\uD604", "\uB098\uB217\uC148 \uBE14\uB85D\uC774 \uBAAB\uACFC \uB098\uBA38\uC9C0\uB85C \uBD84\uD574\uB418\uB294 \uC560\uB2C8\uBA54\uC774\uC158"] }, { "id": "identity-remainder-theorem", "order": 2, "title": "\uD56D\uB4F1\uC2DD\uACFC \uB098\uBA38\uC9C0\uC815\uB9AC", "standardCode": "10\uACF5\uC2181-01-02", "achievementStandard": "\uD56D\uB4F1\uC2DD\uC758 \uC131\uC9C8\uACFC \uB098\uBA38\uC9C0\uC815\uB9AC\uB97C \uC774\uD574\uD558\uACE0, \uC774\uB97C \uD65C\uC6A9\uD558\uC5EC \uBB38\uC81C\uB97C \uD574\uACB0\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uD56D\uB4F1\uC2DD\uC758 \uB73B", "\uBC29\uC815\uC2DD\uACFC \uD56D\uB4F1\uC2DD\uC758 \uCC28\uC774", "\uBBF8\uC815\uACC4\uC218\uBC95", "\uACC4\uC218 \uBE44\uAD50\uBC95", "\uC218\uCE58 \uB300\uC785\uBC95", "\uB098\uBA38\uC9C0\uC815\uB9AC", "\uC778\uC218\uC815\uB9AC"], "scopeNotes": ["\uD56D\uB4F1\uC2DD\uC758 \uC131\uC9C8\uACFC \uB098\uBA38\uC9C0\uC815\uB9AC\uB97C \uD65C\uC6A9\uD558\uB294 \uBCF5\uC7A1\uD55C \uBB38\uC81C\uB294 \uB2E4\uB8E8\uC9C0 \uC54A\uB294\uB2E4.", "\uC778\uC218\uC815\uB9AC\uB97C \uD65C\uC6A9\uD558\uB294 \uBCF5\uC7A1\uD55C \uBB38\uC81C\uB294 \uB2E4\uB8E8\uC9C0 \uC54A\uB294\uB2E4."], "visualizationIdeas": ["\uC5EC\uB7EC x\uAC12\uC5D0\uC11C\uB3C4 \uC591\uBCC0\uC774 \uD56D\uC0C1 \uAC19\uAC8C \uC720\uC9C0\uB418\uB294 \uADF8\uB798\uD504", "P(x)\uB97C x-a\uB85C \uB098\uB208 \uBAAB\uACFC \uB098\uBA38\uC9C0\uC758 \uBE14\uB85D \uBD84\uD574", "x=a\uC5D0\uC11C P(a)\uAC00 \uB098\uBA38\uC9C0\uAC00 \uB418\uB294 \uACFC\uC815"] }, { "id": "polynomial-factorization", "order": 3, "title": "\uB2E4\uD56D\uC2DD\uC758 \uC778\uC218\uBD84\uD574", "standardCode": "10\uACF5\uC2181-01-03", "achievementStandard": "\uB2E4\uD56D\uC2DD\uC758 \uC778\uC218\uBD84\uD574\uB97C \uD560 \uC218 \uC788\uB2E4.", "topics": ["\uACF5\uD1B5\uC778\uC218 \uBB36\uAE30", "\uACF1\uC148\uACF5\uC2DD\uC744 \uC5ED\uC73C\uB85C \uC774\uC6A9\uD558\uAE30", "\uD56D\uC744 \uBB36\uC5B4 \uC778\uC218\uBD84\uD574\uD558\uAE30", "\uCE58\uD658\uC744 \uC774\uC6A9\uD55C \uC778\uC218\uBD84\uD574", "\uC778\uC218\uC815\uB9AC\uB97C \uC774\uC6A9\uD55C \uC778\uC218\uBD84\uD574", "\uC870\uB9BD\uC81C\uBC95\uC744 \uC774\uC6A9\uD55C \uC778\uC218\uBD84\uD574"], "scopeNotes": ["\uC911\uD559\uAD50\uC5D0\uC11C \uD559\uC2B5\uD55C \uC778\uC218\uBD84\uD574\uC5D0\uC11C \uD655\uC7A5\uD55C\uB2E4.", "\uBCF5\uC7A1\uD55C \uC778\uC218\uBD84\uD574 \uBB38\uC81C\uB294 \uB2E4\uB8E8\uC9C0 \uC54A\uB294\uB2E4."], "visualizationIdeas": ["\uD558\uB098\uC758 \uB113\uC774\uB97C \uB450 \uBCC0\uC758 \uACF1\uC73C\uB85C \uC7AC\uAD6C\uC131", "\uB2E4\uD56D\uC2DD \uBE14\uB85D\uC744 \uACF5\uD1B5\uC778\uC218\uBCC4\uB85C \uBB36\uAE30", "\uADFC\uACFC \uC778\uC218\uAC00 \uC5F0\uACB0\uB418\uB294 \uADF8\uB798\uD504"] }], "conceptCount": 3 }, { "id": "equations-and-inequalities", "title": "\uBC29\uC815\uC2DD\uACFC \uBD80\uB4F1\uC2DD", "order": 2, "concepts": [{ "id": "complex-numbers", "order": 1, "title": "\uBCF5\uC18C\uC218\uC758 \uB73B\uACFC \uC5F0\uC0B0", "standardCode": "10\uACF5\uC2181-02-01", "achievementStandard": "\uBCF5\uC18C\uC218\uC758 \uB73B\uACFC \uC131\uC9C8\uC744 \uC124\uBA85\uD558\uACE0, \uC0AC\uCE59\uC5F0\uC0B0\uC744 \uC218\uD589\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uD5C8\uC218\uB2E8\uC704 i", "\uBCF5\uC18C\uC218 a+bi", "\uC2E4\uC218\uBD80\uBD84\uACFC \uD5C8\uC218\uBD80\uBD84", "\uD5C8\uC218\uC640 \uCF24\uB808\uBCF5\uC18C\uC218", "\uBCF5\uC18C\uC218\uC758 \uB367\uC148\uACFC \uBE84\uC148", "\uBCF5\uC18C\uC218\uC758 \uACF1\uC148", "\uBCF5\uC18C\uC218\uC758 \uB098\uB217\uC148", "i\uC758 \uAC70\uB4ED\uC81C\uACF1"], "scopeNotes": ["\uC2E4\uC218\uC758 \uC131\uC9C8 \uBC0F \uC0AC\uCE59\uC5F0\uC0B0\uACFC \uC5F0\uACB0\uD558\uC5EC \uC774\uD574\uD55C\uB2E4.", "\uB098\uB217\uC148\uC740 \uCF24\uB808\uBCF5\uC18C\uC218\uB97C \uC774\uC6A9\uD558\uC5EC \uACC4\uC0B0\uD55C\uB2E4."], "visualizationIdeas": ["\uC2E4\uC218\uC120\uC774 \uBCF5\uC18C\uD3C9\uBA74\uC73C\uB85C \uD655\uC7A5\uB418\uB294 \uC560\uB2C8\uBA54\uC774\uC158", "i\uB97C \uACF1\uD560 \uB54C 90\uB3C4 \uD68C\uC804\uD558\uB294 \uD45C\uD604", "\uCF24\uB808\uBCF5\uC18C\uC218\uAC00 \uC2E4\uC218\uCD95\uC5D0 \uB300\uCE6D\uB418\uB294 \uD45C\uD604"] }, { "id": "quadratic-discriminant", "order": 2, "title": "\uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uC2E4\uADFC\xB7\uD5C8\uADFC\uACFC \uD310\uBCC4\uC2DD", "standardCode": "10\uACF5\uC2181-02-02", "achievementStandard": "\uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uC2E4\uADFC\uACFC \uD5C8\uADFC\uC744 \uC774\uD574\uD558\uACE0, \uD310\uBCC4\uC2DD\uC744 \uC774\uC6A9\uD558\uC5EC \uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uADFC\uC744 \uD310\uBCC4\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uADFC", "\uC2E4\uADFC\uACFC \uD5C8\uADFC", "\uC911\uADFC", "\uD310\uBCC4\uC2DD D=b\xB2-4ac", "\uD310\uBCC4\uC2DD\uACFC \uADFC\uC758 \uC885\uB958"], "scopeNotes": ["\uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uACC4\uC218\uAC00 \uC2E4\uC218\uC778 \uACBD\uC6B0\uB9CC \uB2E4\uB8EC\uB2E4.", "\uBCF5\uC18C\uC218 \uBC94\uC704\uC5D0\uC11C \uC774\uCC28\uBC29\uC815\uC2DD\uC740 \uD56D\uC0C1 \uADFC\uC744 \uAC16\uB294\uB2E4\uB294 \uAC83\uC744 \uC774\uD574\uD55C\uB2E4."], "visualizationIdeas": ["\uD310\uBCC4\uC2DD \uBCC0\uD654\uC5D0 \uB530\uB978 \uD3EC\uBB3C\uC120\uACFC x\uCD95\uC758 \uAD50\uC810 \uBCC0\uD654", "\uB450 \uC2E4\uADFC\uC774 \uC911\uADFC\uC744 \uAC70\uCCD0 \uD5C8\uADFC\uC774 \uB418\uB294 \uC5F0\uC18D \uC560\uB2C8\uBA54\uC774\uC158"] }, { "id": "quadratic-roots-and-coefficients", "order": 3, "title": "\uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uADFC\uACFC \uACC4\uC218\uC758 \uAD00\uACC4", "standardCode": "10\uACF5\uC2181-02-03", "achievementStandard": "\uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uADFC\uACFC \uACC4\uC218\uC758 \uAD00\uACC4\uB97C \uC124\uBA85\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uB450 \uADFC\uC758 \uD569", "\uB450 \uADFC\uC758 \uACF1", "\uADFC\uACFC \uACC4\uC218\uC758 \uAD00\uACC4 \uC720\uB3C4", "\uB450 \uADFC\uC73C\uB85C \uC774\uCC28\uBC29\uC815\uC2DD \uB9CC\uB4E4\uAE30"], "scopeNotes": ["\uADFC\uACFC \uACC4\uC218\uC758 \uAD00\uACC4\uB97C \uD65C\uC6A9\uD558\uB294 \uC9C0\uB098\uCE58\uAC8C \uBCF5\uC7A1\uD55C \uBB38\uC81C\uB294 \uB2E4\uB8E8\uC9C0 \uC54A\uB294\uB2E4."], "visualizationIdeas": ["\uB450 \uADFC\uC774 \uC774\uB3D9\uD560 \uB54C \uACC4\uC218\uAC00 \uBCC0\uD654\uD558\uB294 \uADF8\uB798\uD504", "(x-\u03B1)(x-\u03B2)\uAC00 \uC804\uAC1C\uB418\uBA70 \uACC4\uC218\uC640 \uC5F0\uACB0\uB418\uB294 \uC560\uB2C8\uBA54\uC774\uC158"] }, { "id": "quadratic-equation-and-function", "order": 4, "title": "\uC774\uCC28\uBC29\uC815\uC2DD\uACFC \uC774\uCC28\uD568\uC218\uC758 \uAD00\uACC4", "standardCode": "10\uACF5\uC2181-02-04", "achievementStandard": "\uC774\uCC28\uBC29\uC815\uC2DD\uACFC \uC774\uCC28\uD568\uC218\uB97C \uC5F0\uACB0\uD558\uC5EC \uADF8 \uAD00\uACC4\uB97C \uC124\uBA85\uD560 \uC218 \uC788\uB2E4.", "topics": ["f(x)=0\uC758 \uC758\uBBF8", "\uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uADFC\uACFC x\uC808\uD3B8", "\uC2E4\uADFC\uC758 \uAC1C\uC218\uC640 \uAD50\uC810 \uAC1C\uC218", "\uC911\uADFC\uACFC \uC811\uC810", "\uD310\uBCC4\uC2DD\uC758 \uADF8\uB798\uD504\uC801 \uC758\uBBF8"], "visualizationIdeas": ["\uC2DD\uC758 \uADFC\uC774 \uADF8\uB798\uD504\uC758 x\uC808\uD3B8\uC73C\uB85C \uC774\uB3D9\uD558\uB294 \uBCC0\uD658", "\uB300\uC218\uC801 \uD480\uC774\uC640 \uADF8\uB798\uD504 \uD480\uC774\uC758 \uB3D9\uC2DC \uD45C\uC2DC"] }, { "id": "parabola-and-line", "order": 5, "title": "\uC774\uCC28\uD568\uC218 \uADF8\uB798\uD504\uC640 \uC9C1\uC120\uC758 \uC704\uCE58 \uAD00\uACC4", "standardCode": "10\uACF5\uC2181-02-05", "achievementStandard": "\uC774\uCC28\uD568\uC218\uC758 \uADF8\uB798\uD504\uC640 \uC9C1\uC120\uC758 \uC704\uCE58 \uAD00\uACC4\uB97C \uD310\uB2E8\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uD3EC\uBB3C\uC120\uACFC \uC9C1\uC120\uC758 \uAD50\uC810", "\uB450 \uC810\uC5D0\uC11C \uB9CC\uB098\uB294 \uACBD\uC6B0", "\uC811\uD558\uB294 \uACBD\uC6B0", "\uB9CC\uB098\uC9C0 \uC54A\uB294 \uACBD\uC6B0", "\uD310\uBCC4\uC2DD\uC744 \uC774\uC6A9\uD55C \uC704\uCE58 \uAD00\uACC4 \uD310\uB2E8"], "visualizationIdeas": ["\uC9C1\uC120\uC774 \uC774\uB3D9\uD558\uBA70 \uAD50\uC810\uC774 2\uAC1C\xB71\uAC1C\xB70\uAC1C\uB85C \uBCC0\uD558\uB294 \uC560\uB2C8\uBA54\uC774\uC158", "\uAD50\uC810 \uAC1C\uC218\uC640 \uD310\uBCC4\uC2DD \uBD80\uD638\uB97C \uB3D9\uC2DC\uC5D0 \uD45C\uC2DC"] }, { "id": "quadratic-max-min-restricted", "order": 6, "title": "\uC81C\uD55C\uB41C \uBC94\uC704\uC5D0\uC11C \uC774\uCC28\uD568\uC218\uC758 \uCD5C\uB300\xB7\uCD5C\uC18C", "standardCode": "10\uACF5\uC2181-02-06", "achievementStandard": "\uC774\uCC28\uD568\uC218\uC758 \uCD5C\uB300, \uCD5C\uC18C\uB97C \uD0D0\uAD6C\uD558\uACE0, \uC774\uB97C \uC2E4\uC0DD\uD65C\uACFC \uC5F0\uACB0\uD558\uC5EC \uC720\uC6A9\uC131\uC744 \uC778\uC2DD\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC774\uCC28\uD568\uC218\uC758 \uAF2D\uC9D3\uC810", "\uC81C\uD55C\uB41C \uAD6C\uAC04", "\uAD6C\uAC04 \uC548\uC5D0 \uAF2D\uC9D3\uC810\uC774 \uC788\uB294 \uACBD\uC6B0", "\uAD6C\uAC04 \uBC16\uC5D0 \uAF2D\uC9D3\uC810\uC774 \uC788\uB294 \uACBD\uC6B0", "\uC591 \uB05D\uC810\uACFC \uAF2D\uC9D3\uC810\uC758 \uD568\uC22B\uAC12 \uBE44\uAD50", "\uC2E4\uC0DD\uD65C \uCD5C\uC801\uD654 \uBB38\uC81C"], "scopeNotes": ["\uC774\uCC28\uD568\uC218\uC758 \uCD5C\uB300\uC640 \uCD5C\uC18C\uB294 \uC81C\uD55C\uB41C \uBC94\uC704\uC5D0\uC11C\uB9CC \uB2E4\uB8EC\uB2E4."], "visualizationIdeas": ["\uADF8\uB798\uD504 \uC704 \uC81C\uD55C \uAD6C\uAC04\uC744 \uC6C0\uC9C1\uC774\uBA70 \uCD5C\uB300\xB7\uCD5C\uC18C \uD6C4\uBCF4 \uBE44\uAD50", "\uAF2D\uC9D3\uC810\uACFC \uAD6C\uAC04 \uC591 \uB05D\uC810\uC5D0 \uAC12 \uD45C\uC2DC"] }, { "id": "cubic-and-quartic-equations", "order": 7, "title": "\uC0BC\uCC28\uBC29\uC815\uC2DD\uACFC \uC0AC\uCC28\uBC29\uC815\uC2DD", "standardCode": "10\uACF5\uC2181-02-07", "achievementStandard": "\uAC04\uB2E8\uD55C \uC0BC\uCC28\uBC29\uC815\uC2DD\uACFC \uC0AC\uCC28\uBC29\uC815\uC2DD\uC744 \uD480 \uC218 \uC788\uB2E4.", "topics": ["\uC0BC\uCC28\uBC29\uC815\uC2DD", "\uC0AC\uCC28\uBC29\uC815\uC2DD", "\uC778\uC218\uBD84\uD574\uB97C \uC774\uC6A9\uD55C \uD480\uC774", "\uC778\uC218\uC815\uB9AC\uC640 \uC870\uB9BD\uC81C\uBC95", "\uAC04\uB2E8\uD55C \uCE58\uD658"], "scopeNotes": ["\uACC4\uC218\uAC00 \uC2E4\uC218\uC778 \uACBD\uC6B0\uB9CC \uB2E4\uB8EC\uB2E4.", "\uC778\uC218\uBD84\uD574 \uACF5\uC2DD, \uC778\uC218\uC815\uB9AC, \uC870\uB9BD\uC81C\uBC95\uC73C\uB85C \uD480 \uC218 \uC788\uB294 \uACBD\uC6B0\uB9CC \uB2E4\uB8EC\uB2E4."], "visualizationIdeas": ["\uACE0\uCC28\uB2E4\uD56D\uC2DD\uC774 \uC77C\uCC28\xB7\uC774\uCC28 \uC778\uC218\uB85C \uBD84\uD574\uB418\uB294 \uC560\uB2C8\uBA54\uC774\uC158", "\uAC01 \uC778\uC218\uC758 \uADFC\uC774 \uADF8\uB798\uD504\uC758 \uC808\uD3B8\uACFC \uC5F0\uACB0\uB418\uB294 \uD45C\uD604"] }, { "id": "simultaneous-quadratic-equations", "order": 8, "title": "\uC5F0\uB9BD\uC774\uCC28\uBC29\uC815\uC2DD", "standardCode": "10\uACF5\uC2181-02-08", "achievementStandard": "\uBBF8\uC9C0\uC218\uAC00 2\uAC1C\uC778 \uC5F0\uB9BD\uC774\uCC28\uBC29\uC815\uC2DD\uC744 \uD480 \uC218 \uC788\uB2E4.", "topics": ["\uC77C\uCC28\uC2DD\uACFC \uC774\uCC28\uC2DD\uC758 \uC5F0\uB9BD", "\uB300\uC785\uC744 \uD1B5\uD55C \uC77C\uC6D0\uD654", "\uB450 \uC774\uCC28\uC2DD\uC758 \uC5F0\uB9BD", "\uC778\uC218\uBD84\uD574\uB97C \uC774\uC6A9\uD55C \uD480\uC774", "\uADF8\uB798\uD504\uC758 \uAD50\uC810\uACFC \uD574"], "scopeNotes": ["\uC77C\uCC28\uC2DD\uACFC \uC774\uCC28\uC2DD\uC774 \uAC01\uAC01 \uD55C \uAC1C\uC529 \uC8FC\uC5B4\uC9C4 \uACBD\uC6B0\uB97C \uB2E4\uB8EC\uB2E4.", "\uB450 \uC774\uCC28\uC2DD \uC911 \uD55C \uC774\uCC28\uC2DD\uC774 \uAC04\uB2E8\uD788 \uC778\uC218\uBD84\uD574\uB418\uB294 \uACBD\uC6B0\uB97C \uB2E4\uB8EC\uB2E4."], "visualizationIdeas": ["\uB450 \uADF8\uB798\uD504\uC758 \uAD50\uC810\uC774 \uC5F0\uB9BD\uBC29\uC815\uC2DD\uC758 \uD574\uAC00 \uB418\uB294 \uD45C\uD604", "\uB300\uC785\uC73C\uB85C \uB450 \uBCC0\uC218 \uC911 \uD558\uB098\uAC00 \uC81C\uAC70\uB418\uB294 \uACFC\uC815"] }, { "id": "simultaneous-linear-inequalities", "order": 9, "title": "\uC5F0\uB9BD\uC77C\uCC28\uBD80\uB4F1\uC2DD", "standardCode": "10\uACF5\uC2181-02-09", "achievementStandard": "\uBBF8\uC9C0\uC218\uAC00 1\uAC1C\uC778 \uC5F0\uB9BD\uC77C\uCC28\uBD80\uB4F1\uC2DD\uC744 \uD480 \uC218 \uC788\uB2E4.", "topics": ["\uC77C\uCC28\uBD80\uB4F1\uC2DD\uC758 \uD574", "\uB450 \uBD80\uB4F1\uC2DD\uC758 \uACF5\uD1B5 \uD574", "\uC218\uC9C1\uC120 \uD45C\uD604", "\uD574\uAC00 \uC5C6\uB294 \uACBD\uC6B0", "\uBAA8\uB4E0 \uC2E4\uC218\uAC00 \uD574\uC778 \uACBD\uC6B0"], "visualizationIdeas": ["\uB450 \uC218\uC9C1\uC120 \uBC94\uC704\uAC00 \uACB9\uCE58\uB294 \uBD80\uBD84\uC744 \uAC15\uC870", "\uBD80\uB4F1\uC2DD\uBCC4 \uBC94\uC704\uB97C \uD569\uC131\uD558\uC5EC \uACF5\uD1B5 \uD574 \uC0DD\uC131"] }, { "id": "absolute-linear-inequalities", "order": 10, "title": "\uC808\uB313\uAC12\uC744 \uD3EC\uD568\uD55C \uC77C\uCC28\uBD80\uB4F1\uC2DD", "standardCode": "10\uACF5\uC2181-02-10", "achievementStandard": "\uC808\uB313\uAC12\uC744 \uD3EC\uD568\uD55C \uC77C\uCC28\uBD80\uB4F1\uC2DD\uC744 \uD480 \uC218 \uC788\uB2E4.", "topics": ["\uC808\uB313\uAC12\uC758 \uAC70\uB9AC \uC758\uBBF8", "|x|<a", "|x|>a", "|x-a|<b", "\uACBD\uC6B0\uB97C \uB098\uB204\uB294 \uD480\uC774", "\uC218\uC9C1\uC120\uC5D0\uC11C \uD574\uC11D\uD558\uAE30"], "visualizationIdeas": ["\uAE30\uC900\uC810\uC5D0\uC11C\uC758 \uAC70\uB9AC\uB85C \uC808\uB313\uAC12 \uBC94\uC704 \uD45C\uD604", "\uC218\uC9C1\uC120 \uC704 \uB450 \uACBD\uACC4\uAC00 \uBC8C\uC5B4\uC9C0\uACE0 \uC881\uC544\uC9C0\uB294 \uC560\uB2C8\uBA54\uC774\uC158"] }, { "id": "quadratic-inequalities", "order": 11, "title": "\uC774\uCC28\uBD80\uB4F1\uC2DD\uACFC \uC5F0\uB9BD\uC774\uCC28\uBD80\uB4F1\uC2DD", "standardCode": "10\uACF5\uC2181-02-11", "achievementStandard": "\uC774\uCC28\uBD80\uB4F1\uC2DD\uACFC \uC774\uCC28\uD568\uC218\uB97C \uC5F0\uACB0\uD558\uC5EC \uADF8 \uAD00\uACC4\uB97C \uC124\uBA85\uD558\uACE0, \uC774\uCC28\uBD80\uB4F1\uC2DD\uACFC \uC5F0\uB9BD\uC774\uCC28\uBD80\uB4F1\uC2DD\uC744 \uD480 \uC218 \uC788\uB2E4.", "topics": ["\uC774\uCC28\uC2DD\uC758 \uBD80\uD638", "\uC774\uCC28\uD568\uC218 \uADF8\uB798\uD504\uC640 \uC774\uCC28\uBD80\uB4F1\uC2DD", "\uB450 \uC2E4\uADFC\uC744 \uAC16\uB294 \uACBD\uC6B0", "\uC911\uADFC\uC744 \uAC16\uB294 \uACBD\uC6B0", "\uC2E4\uADFC\uC774 \uC5C6\uB294 \uACBD\uC6B0", "\uC5F0\uB9BD\uC774\uCC28\uBD80\uB4F1\uC2DD\uC758 \uACF5\uD1B5 \uD574"], "visualizationIdeas": ["\uADF8\uB798\uD504\uAC00 x\uCD95 \uC704\xB7\uC544\uB798\uC778 \uAD6C\uAC04\uC744 \uC0C9\uC73C\uB85C \uAD6C\uBD84", "\uADF8\uB798\uD504\uC758 \uBD80\uD638 \uAD6C\uAC04\uC744 \uC218\uC9C1\uC120 \uD574\uB85C \uBCC0\uD658"] }], "conceptCount": 11 }, { "id": "counting", "title": "\uACBD\uC6B0\uC758 \uC218", "order": 3, "concepts": [{ "id": "addition-and-multiplication-principles", "order": 1, "title": "\uD569\uC758 \uBC95\uCE59\uACFC \uACF1\uC758 \uBC95\uCE59", "standardCode": "10\uACF5\uC2181-03-01", "achievementStandard": "\uD569\uC758 \uBC95\uCE59\uACFC \uACF1\uC758 \uBC95\uCE59\uC744 \uC774\uD574\uD558\uACE0, \uC801\uC808\uD55C \uC804\uB7B5\uC744 \uC0AC\uC6A9\uD558\uC5EC \uACBD\uC6B0\uC758 \uC218\uC640 \uAD00\uB828\uB41C \uBB38\uC81C\uB97C \uD574\uACB0\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC9C1\uC811 \uB098\uC5F4\uD558\uAE30", "\uD45C\uC640 \uC218\uD615\uB3C4", "\uD569\uC758 \uBC95\uCE59", "\uACF1\uC758 \uBC95\uCE59", "\uB450 \uBC95\uCE59\uC774 \uC801\uC6A9\uB418\uB294 \uC0C1\uD669\uC758 \uCC28\uC774"], "scopeNotes": ["\uAD6C\uCCB4\uC801\uC778 \uC608\uB97C \uC911\uC2EC\uC73C\uB85C \uAC04\uB2E8\uD788 \uB2E4\uB8EC\uB2E4.", "\uC9C0\uB098\uCE58\uAC8C \uBCF5\uC7A1\uD55C \uACBD\uC6B0\uC758 \uC218 \uBB38\uC81C\uB294 \uB2E4\uB8E8\uC9C0 \uC54A\uB294\uB2E4."], "visualizationIdeas": ["\uC120\uD0DD \uACBD\uB85C\uB97C \uB098\uBB34 \uBAA8\uC591\uC73C\uB85C \uD655\uC7A5", "\uC11C\uB85C \uBC30\uD0C0\uC801\uC778 \uACBD\uB85C\uB294 \uB354\uD558\uACE0 \uC5F0\uC18D \uC120\uD0DD\uC740 \uACF1\uD558\uB294 \uD45C\uD604"] }, { "id": "permutations", "order": 2, "title": "\uC21C\uC5F4", "standardCode": "10\uACF5\uC2181-03-02", "achievementStandard": "\uC21C\uC5F4\uC758 \uAC1C\uB150\uC744 \uC774\uD574\uD558\uACE0, \uC21C\uC5F4\uC758 \uC218\uB97C \uAD6C\uD558\uB294 \uBC29\uBC95\uC744 \uC124\uBA85\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC21C\uC11C\uAC00 \uC788\uB294 \uBC30\uC5F4", "\uACC4\uC2B9 n!", "\uC21C\uC5F4 nPr", "\uC9C1\uC811 \uB098\uC5F4\uACFC \uC218\uD615\uB3C4", "\uC21C\uC5F4 \uACF5\uC2DD\uC758 \uC6D0\uB9AC"], "scopeNotes": ["\uC6D0\uC21C\uC5F4\uACFC \uC911\uBCF5\uC21C\uC5F4\uC740 \uD575\uC2EC \uBC94\uC704\uC5D0 \uD3EC\uD568\uD558\uC9C0 \uC54A\uB294\uB2E4.", "\uC9C0\uB098\uCE58\uAC8C \uBCF5\uC7A1\uD55C \uBB38\uC81C\uB294 \uB2E4\uB8E8\uC9C0 \uC54A\uB294\uB2E4."], "visualizationIdeas": ["\uBE48 \uC790\uB9AC\uC5D0 \uB300\uC0C1\uC744 \uD558\uB098\uC529 \uBC30\uCE58\uD558\uBA70 \uC120\uD0DD\uC9C0 \uC218 \uAC10\uC18C", "\uC218\uD615\uB3C4\uC758 \uB05D\uC810 \uC218\uC640 \uC21C\uC5F4 \uACF5\uC2DD \uC5F0\uACB0"] }, { "id": "combinations", "order": 3, "title": "\uC870\uD569", "standardCode": "10\uACF5\uC2181-03-03", "achievementStandard": "\uC870\uD569\uC758 \uAC1C\uB150\uC744 \uC774\uD574\uD558\uACE0, \uC870\uD569\uC758 \uC218\uB97C \uAD6C\uD558\uB294 \uBC29\uBC95\uC744 \uC124\uBA85\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC21C\uC11C\uB97C \uACE0\uB824\uD558\uC9C0 \uC54A\uB294 \uC120\uD0DD", "\uC870\uD569 nCr", "\uC21C\uC5F4\uACFC \uC870\uD569\uC758 \uCC28\uC774", "\uC870\uD569 \uACF5\uC2DD\uC758 \uC6D0\uB9AC", "\uC9C1\uC811 \uB098\uC5F4\uACFC \uC218\uD615\uB3C4"], "scopeNotes": ["\uC911\uBCF5\uC870\uD569\uC740 \uD575\uC2EC \uBC94\uC704\uC5D0 \uD3EC\uD568\uD558\uC9C0 \uC54A\uB294\uB2E4.", "\uC9C0\uB098\uCE58\uAC8C \uBCF5\uC7A1\uD55C \uBB38\uC81C\uB294 \uB2E4\uB8E8\uC9C0 \uC54A\uB294\uB2E4."], "visualizationIdeas": ["\uAC19\uC740 \uAD6C\uC131\uC758 \uC11C\uB85C \uB2E4\uB978 \uC21C\uC11C\uB97C \uD558\uB098\uC758 \uBB36\uC74C\uC73C\uB85C \uD569\uCE58\uAE30", "\uC21C\uC5F4 \uACB0\uACFC\uB97C r!\uAC1C\uC529 \uBB36\uC5B4 \uC870\uD569\uC73C\uB85C \uBCC0\uD658"] }], "conceptCount": 3 }, { "id": "matrices", "title": "\uD589\uB82C", "order": 4, "concepts": [{ "id": "matrix-concept", "order": 1, "title": "\uD589\uB82C\uC758 \uB73B\uACFC \uD45C\uD604", "standardCode": "10\uACF5\uC2181-04-01", "achievementStandard": "\uD589\uB82C\uC758 \uB73B\uC744 \uC54C\uACE0, \uC2E4\uC0DD\uD65C \uC0C1\uD669\uC744 \uD589\uB82C\uB85C \uD45C\uD604\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uD589\uB82C\uC758 \uB73B", "\uD589\uACFC \uC5F4", "\uC131\uBD84", "\uD589\uB82C\uC758 \uD06C\uAE30", "\uB450 \uD589\uB82C\uC774 \uAC19\uC740 \uC870\uAC74", "\uC2E4\uC0DD\uD65C \uC790\uB8CC\uC758 \uD589\uB82C \uD45C\uD604"], "visualizationIdeas": ["\uD45C \uD615\uD0DC\uC758 \uC790\uB8CC\uAC00 \uD589\uB82C \uAE30\uD638\uB85C \uBCC0\uD658\uB418\uB294 \uC560\uB2C8\uBA54\uC774\uC158", "\uD589\xB7\uC5F4\xB7\uC131\uBD84\uC744 \uC0C9\uC73C\uB85C \uAD6C\uBD84"] }, { "id": "matrix-operations", "order": 2, "title": "\uD589\uB82C\uC758 \uC5F0\uC0B0", "standardCode": "10\uACF5\uC2181-04-02", "achievementStandard": "\uD589\uB82C\uC758 \uC5F0\uC0B0\uC744 \uC218\uD589\uD558\uACE0, \uAD00\uB828\uB41C \uBB38\uC81C\uB97C \uD574\uACB0\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uD589\uB82C\uC758 \uB367\uC148\uACFC \uBE84\uC148", "\uD589\uB82C\uC758 \uC2E4\uC218\uBC30", "\uD589\uB82C\uC758 \uACF1\uC148", "\uD589\uB82C \uACF1\uC148\uC774 \uAC00\uB2A5\uD55C \uC870\uAC74", "\uD589\uB82C\uC744 \uC774\uC6A9\uD55C \uBB38\uC81C \uD574\uACB0"], "scopeNotes": ["\uACF1\uC148\uC740 \uD589\uACFC \uC5F4\uC758 \uC218\uAC00 \uAC01\uAC01 2\uB97C \uB118\uC9C0 \uC54A\uB294 \uBC94\uC704\uC5D0\uC11C \uB2E4\uB8EC\uB2E4.", "\uD589\uB82C \uC5F0\uC0B0\uC758 \uB300\uC218\uC801 \uAD6C\uC870\uB97C \uC77C\uBC18\uD654\uD55C \uBC95\uCE59\uC740 \uB2E4\uB8E8\uC9C0 \uC54A\uB294\uB2E4.", "\uC5ED\uD589\uB82C\uC740 \uACF5\uC2DD \uD575\uC2EC \uBC94\uC704\uC5D0 \uD3EC\uD568\uD558\uC9C0 \uC54A\uB294\uB2E4."], "visualizationIdeas": ["\uB300\uC751\uD558\uB294 \uC131\uBD84\uB07C\uB9AC \uB354\uD574\uC9C0\uB294 \uD45C\uD604", "\uD589\uACFC \uC5F4\uC774 \uB9CC\uB098 \uD558\uB098\uC758 \uC131\uBD84\uC744 \uB9CC\uB4DC\uB294 \uACF1\uC148 \uC560\uB2C8\uBA54\uC774\uC158"] }], "conceptCount": 2 }], "category": "common", "categoryTitle": "\uACF5\uD1B5 \uACFC\uBAA9", "categoryEnglishTitle": "COMMON", "categoryDescription": "\uACE0\uB4F1\uD559\uAD50 \uC218\uD559 \uD559\uC2B5\uC758 \uACF5\uD1B5 \uAE30\uBC18\uC774 \uB418\uB294 \uD544\uC218 \uACFC\uBAA9\uC785\uB2C8\uB2E4.", "categoryOrder": 1, "recommendedGrades": [10], "placementLabel": "1\uD559\uAE30 \uAE30\uBCF8 \uC21C\uC11C", "sourceFile": "kr-2022-g10-math-curri.yaml", "developmentLocked": false }, { "id": "common-math-2", "officialTitle": "\uACF5\uD1B5\uC218\uD5592", "defaultSemester": 2, "conceptCount": 20, "units": [{ "id": "coordinate-geometry", "title": "\uB3C4\uD615\uC758 \uBC29\uC815\uC2DD", "order": 1, "concepts": [{ "id": "distance-and-internal-division", "order": 1, "title": "\uB450 \uC810 \uC0AC\uC774\uC758 \uAC70\uB9AC\uC640 \uC120\uBD84\uC758 \uB0B4\uBD84", "standardCode": "10\uACF5\uC2182-01-01", "achievementStandard": "\uC120\uBD84\uC758 \uB0B4\uBD84\uC744 \uC774\uD574\uD558\uACE0, \uB0B4\uBD84\uC810\uC758 \uC88C\uD45C\uB97C \uACC4\uC0B0\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC218\uC9C1\uC120 \uC704 \uB450 \uC810 \uC0AC\uC774\uC758 \uAC70\uB9AC", "\uC88C\uD45C\uD3C9\uBA74 \uC704 \uB450 \uC810 \uC0AC\uC774\uC758 \uAC70\uB9AC", "\uC218\uC9C1\uC120 \uC704 \uB0B4\uBD84\uC810", "\uC88C\uD45C\uD3C9\uBA74 \uC704 \uB0B4\uBD84\uC810", "\uC911\uC810", "\uB0B4\uBD84 \uACF5\uC2DD\uC758 \uC6D0\uB9AC"], "scopeNotes": ["\uB450 \uC810 \uC0AC\uC774\uC758 \uAC70\uB9AC\uB97C \uBA3C\uC800 \uB2E4\uB8EC \uB4A4 \uB0B4\uBD84\uC73C\uB85C \uD655\uC7A5\uD55C\uB2E4.", "\uC678\uBD84\uC810\uC740 \uB2E4\uB8E8\uC9C0 \uC54A\uB294\uB2E4."], "visualizationIdeas": ["\uC120\uBD84\uC744 \uC8FC\uC5B4\uC9C4 \uBE44\uC728\uB85C \uB098\uB204\uB294 \uC810 \uC774\uB3D9", "\uC218\uC9C1\uC120\uC758 \uB0B4\uBD84\uC774 \uC88C\uD45C\uD3C9\uBA74\uC73C\uB85C \uD655\uC7A5\uB418\uB294 \uC560\uB2C8\uBA54\uC774\uC158"] }, { "id": "parallel-and-perpendicular-lines", "order": 2, "title": "\uB450 \uC9C1\uC120\uC758 \uD3C9\uD589\xB7\uC218\uC9C1 \uC870\uAC74", "standardCode": "10\uACF5\uC2182-01-02", "achievementStandard": "\uB450 \uC9C1\uC120\uC758 \uD3C9\uD589 \uC870\uAC74\uACFC \uC218\uC9C1 \uC870\uAC74\uC744 \uD0D0\uAD6C\uD558\uACE0 \uC774\uD574\uD55C\uB2E4.", "topics": ["\uC9C1\uC120\uC758 \uAE30\uC6B8\uAE30", "\uC9C1\uC120\uC758 \uBC29\uC815\uC2DD", "\uB450 \uC9C1\uC120\uC758 \uD3C9\uD589 \uC870\uAC74", "\uB450 \uC9C1\uC120\uC758 \uC218\uC9C1 \uC870\uAC74"], "visualizationIdeas": ["\uD55C \uC9C1\uC120\uC758 \uAE30\uC6B8\uAE30\uAC00 \uBCC0\uD558\uBA70 \uD3C9\uD589\xB7\uC218\uC9C1 \uC0C1\uD0DC \uD45C\uC2DC", "\uC9C1\uAC01 \uD45C\uC2DC\uC640 \uAE30\uC6B8\uAE30 \uACF1\uC744 \uB3D9\uC2DC\uC5D0 \uC5F0\uACB0"] }, { "id": "point-line-distance", "order": 3, "title": "\uC810\uACFC \uC9C1\uC120 \uC0AC\uC774\uC758 \uAC70\uB9AC", "standardCode": "10\uACF5\uC2182-01-03", "achievementStandard": "\uC810\uACFC \uC9C1\uC120 \uC0AC\uC774\uC758 \uAC70\uB9AC\uB97C \uAD6C\uD558\uACE0, \uAD00\uB828\uB41C \uBB38\uC81C\uB97C \uD574\uACB0\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC218\uC120\uC758 \uBC1C", "\uC810\uACFC \uC9C1\uC120 \uC0AC\uC774 \uAC70\uB9AC\uC758 \uC758\uBBF8", "\uC810\uACFC \uC9C1\uC120 \uC0AC\uC774\uC758 \uAC70\uB9AC \uACF5\uC2DD", "\uB450 \uD3C9\uD589\uC120 \uC0AC\uC774\uC758 \uAC70\uB9AC"], "visualizationIdeas": ["\uC810\uC5D0\uC11C \uC9C1\uC120\uC73C\uB85C \uD5A5\uD558\uB294 \uC5EC\uB7EC \uC120\uBD84 \uC911 \uC218\uC120\uC774 \uAC00\uC7A5 \uC9E7\uC74C\uC744 \uBE44\uAD50", "\uC9C1\uC120 \uC774\uB3D9\uC5D0 \uB530\uB978 \uAC70\uB9AC \uBCC0\uD654"] }, { "id": "circle-equation", "order": 4, "title": "\uC6D0\uC758 \uBC29\uC815\uC2DD", "standardCode": "10\uACF5\uC2182-01-04", "achievementStandard": "\uC6D0\uC758 \uBC29\uC815\uC2DD\uC744 \uAD6C\uD558\uACE0, \uADF8\uB798\uD504\uB97C \uADF8\uB9B4 \uC218 \uC788\uB2E4.", "topics": ["\uC911\uC2EC\uC774 \uC6D0\uC810\uC778 \uC6D0", "\uC911\uC2EC\uC774 (a,b)\uC778 \uC6D0", "\uBC18\uC9C0\uB984\uACFC \uC6D0\uC758 \uBC29\uC815\uC2DD", "\uC6D0\uC758 \uC911\uC2EC\uACFC \uBC18\uC9C0\uB984 \uCC3E\uAE30", "\uC644\uC804\uC81C\uACF1\uC2DD\uC744 \uC774\uC6A9\uD55C \uD45C\uC900\uD615 \uBCC0\uD658"], "visualizationIdeas": ["\uC911\uC2EC\uC5D0\uC11C \uC6D0 \uC704 \uC810\uAE4C\uC9C0\uC758 \uAC70\uB9AC\uAC00 \uC77C\uC815\uD55C \uC790\uCDE8", "\uC911\uC2EC\uACFC \uBC18\uC9C0\uB984 \uBCC0\uD654\uC5D0 \uB530\uB978 \uBC29\uC815\uC2DD \uAC31\uC2E0"] }, { "id": "circle-line-position", "order": 5, "title": "\uC6D0\uACFC \uC9C1\uC120\uC758 \uC704\uCE58 \uAD00\uACC4", "standardCode": "10\uACF5\uC2182-01-05", "achievementStandard": "\uC88C\uD45C\uD3C9\uBA74\uC5D0\uC11C \uC6D0\uACFC \uC9C1\uC120\uC758 \uC704\uCE58 \uAD00\uACC4\uB97C \uD310\uB2E8\uD558\uACE0, \uC774\uB97C \uD65C\uC6A9\uD558\uC5EC \uBB38\uC81C\uB97C \uD574\uACB0\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uB450 \uC810\uC5D0\uC11C \uB9CC\uB098\uB294 \uACBD\uC6B0", "\uC811\uD558\uB294 \uACBD\uC6B0", "\uB9CC\uB098\uC9C0 \uC54A\uB294 \uACBD\uC6B0", "\uC911\uC2EC\uACFC \uC9C1\uC120 \uC0AC\uC774\uC758 \uAC70\uB9AC", "\uBC18\uC9C0\uB984\uACFC \uAC70\uB9AC \uBE44\uAD50"], "visualizationIdeas": ["\uC9C1\uC120\uC774 \uC774\uB3D9\uD558\uBA70 \uD560\uC120\xB7\uC811\uC120\xB7\uC678\uBD80 \uC9C1\uC120\uC73C\uB85C \uBCC0\uD654", "\uC911\uC2EC\uACFC \uC9C1\uC120 \uC0AC\uC774 \uAC70\uB9AC\uC640 \uBC18\uC9C0\uB984\uC744 \uB9C9\uB300\uB85C \uBE44\uAD50"] }, { "id": "geometric-translation", "order": 6, "title": "\uD3C9\uD589\uC774\uB3D9", "standardCode": "10\uACF5\uC2182-01-06", "achievementStandard": "\uD3C9\uD589\uC774\uB3D9\uC744 \uD0D0\uAD6C\uD558\uACE0, \uC2E4\uC0DD\uD65C\uACFC \uC5F0\uACB0\uD558\uC5EC \uBB38\uC81C\uB97C \uD574\uACB0\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC810\uC758 \uD3C9\uD589\uC774\uB3D9", "\uB3C4\uD615\uC758 \uD3C9\uD589\uC774\uB3D9", "\uC774\uB3D9 \uC804\uD6C4 \uC88C\uD45C", "\uBC29\uC815\uC2DD\uC73C\uB85C \uD45C\uD604\uB41C \uB3C4\uD615\uC758 \uC774\uB3D9", "\uC2E4\uC0DD\uD65C\uC5D0\uC11C\uC758 \uD3C9\uD589\uC774\uB3D9"], "scopeNotes": ["\uC88C\uD45C\uCD95 \uC790\uCCB4\uC758 \uD3C9\uD589\uC774\uB3D9\uC740 \uB2E4\uB8E8\uC9C0 \uC54A\uB294\uB2E4."], "visualizationIdeas": ["\uB3C4\uD615\uC758 \uBAA8\uB4E0 \uC810\uC774 \uAC19\uC740 \uBCA1\uD130\uB9CC\uD07C \uC774\uB3D9", "\uC774\uB3D9 \uC804\uD6C4 \uBC29\uC815\uC2DD\uACFC \uC88C\uD45C \uBCC0\uD654 \uB3D9\uC2DC \uD45C\uC2DC"] }, { "id": "geometric-reflection", "order": 7, "title": "\uB300\uCE6D\uC774\uB3D9", "standardCode": "10\uACF5\uC2182-01-07", "achievementStandard": "\uC6D0\uC810, x\uCD95, y\uCD95, \uC9C1\uC120 y=x\uC5D0 \uB300\uD55C \uB300\uCE6D\uC774\uB3D9\uC744 \uD0D0\uAD6C\uD558\uACE0, \uC2E4\uC0DD\uD65C\uACFC \uC5F0\uACB0\uD558\uC5EC \uBB38\uC81C\uB97C \uD574\uACB0\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC6D0\uC810 \uB300\uCE6D", "x\uCD95 \uB300\uCE6D", "y\uCD95 \uB300\uCE6D", "\uC9C1\uC120 y=x \uB300\uCE6D", "\uC810\uACFC \uB3C4\uD615\uC758 \uB300\uCE6D\uC774\uB3D9"], "visualizationIdeas": ["\uB300\uCE6D\uCD95\uC744 \uAE30\uC900\uC73C\uB85C \uB3C4\uD615\uC744 \uC811\uC5B4 \uD3EC\uAC1C\uAE30", "\uC88C\uD45C\uC758 \uBD80\uD638 \uBC0F \uC21C\uC11C\uAC00 \uBC14\uB00C\uB294 \uACFC\uC815"] }], "conceptCount": 7 }, { "id": "sets-and-propositions", "title": "\uC9D1\uD569\uACFC \uBA85\uC81C", "order": 2, "concepts": [{ "id": "set-concept-and-representation", "order": 1, "title": "\uC9D1\uD569\uC758 \uAC1C\uB150\uACFC \uD45C\uD604", "standardCode": "10\uACF5\uC2182-02-01", "achievementStandard": "\uC9D1\uD569\uC758 \uAC1C\uB150\uC744 \uC774\uD574\uD558\uACE0, \uC9D1\uD569\uC744 \uD45C\uD604\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC9D1\uD569\uACFC \uC9D1\uD569\uC774 \uC544\uB2CC \uBAA8\uC784", "\uC6D0\uC18C\uC640 \uACF5\uC9D1\uD569", "\uC720\uD55C\uC9D1\uD569\uACFC \uBB34\uD55C\uC9D1\uD569", "\uC6D0\uC18C\uB098\uC5F4\uBC95", "\uC870\uAC74\uC81C\uC2DC\uBC95", "\uBCA4 \uB2E4\uC774\uC5B4\uADF8\uB7A8"], "scopeNotes": ["\uC9D1\uD569\uC758 \uAC1C\uB150\uC740 \uC774\uD574\uD558\uB294 \uC218\uC900\uC5D0\uC11C \uAC04\uB2E8\uD788 \uD3C9\uAC00\uD55C\uB2E4."], "visualizationIdeas": ["\uC5EC\uB7EC \uB300\uC0C1\uC744 \uC870\uAC74\uC5D0 \uB530\uB77C \uC9D1\uD569 \uC548\uD30E\uC73C\uB85C \uBD84\uB958", "\uC6D0\uC18C\uB098\uC5F4\uBC95\uC774 \uBCA4 \uB2E4\uC774\uC5B4\uADF8\uB7A8\uC73C\uB85C \uBCC0\uD658\uB418\uB294 \uD45C\uD604"] }, { "id": "set-inclusion", "order": 2, "title": "\uC9D1\uD569\uC758 \uD3EC\uD568\uAD00\uACC4", "standardCode": "10\uACF5\uC2182-02-02", "achievementStandard": "\uB450 \uC9D1\uD569 \uC0AC\uC774\uC758 \uD3EC\uD568\uAD00\uACC4\uB97C \uD310\uB2E8\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uBD80\uBD84\uC9D1\uD569", "\uC9C4\uBD80\uBD84\uC9D1\uD569", "\uB450 \uC9D1\uD569\uC774 \uAC19\uC740 \uC870\uAC74", "\uC9D1\uD569\uC758 \uD3EC\uD568\uAD00\uACC4"], "scopeNotes": ["\uC9D1\uD569\uC758 \uD3EC\uD568\uAD00\uACC4\uB294 \uC774\uD574\uD558\uB294 \uC218\uC900\uC5D0\uC11C \uAC04\uB2E8\uD788 \uD3C9\uAC00\uD55C\uB2E4."], "visualizationIdeas": ["\uC791\uC740 \uC9D1\uD569\uC774 \uD070 \uC9D1\uD569 \uC548\uC5D0 \uB4E4\uC5B4\uAC00\uB294 \uC560\uB2C8\uBA54\uC774\uC158", "\uC6D0\uC18C \uC774\uB3D9\uC5D0 \uB530\uB978 \uD3EC\uD568\uAD00\uACC4 \uBCC0\uD654"] }, { "id": "set-operations", "order": 3, "title": "\uC9D1\uD569\uC758 \uC5F0\uC0B0\uACFC \uBCA4 \uB2E4\uC774\uC5B4\uADF8\uB7A8", "standardCode": "10\uACF5\uC2182-02-03", "achievementStandard": "\uC9D1\uD569\uC758 \uC5F0\uC0B0\uC744 \uC218\uD589\uD558\uACE0, \uBCA4 \uB2E4\uC774\uC5B4\uADF8\uB7A8\uC744 \uC774\uC6A9\uD558\uC5EC \uB098\uD0C0\uB0BC \uC218 \uC788\uB2E4.", "topics": ["\uD569\uC9D1\uD569\uACFC \uAD50\uC9D1\uD569", "\uC804\uCCB4\uC9D1\uD569\uACFC \uC5EC\uC9D1\uD569", "\uCC28\uC9D1\uD569\uACFC \uC11C\uB85C\uC18C", "\uAD50\uD658\uBC95\uCE59\uACFC \uACB0\uD569\uBC95\uCE59", "\uBD84\uBC30\uBC95\uCE59", "\uB4DC\uBAA8\uB974\uAC04\uC758 \uBC95\uCE59"], "scopeNotes": ["\uC9D1\uD569\uC758 \uBC95\uCE59\uC740 \uBCA4 \uB2E4\uC774\uC5B4\uADF8\uB7A8\uC73C\uB85C \uD655\uC778\uD558\uB294 \uC815\uB3C4\uB85C \uAC04\uB2E8\uD788 \uB2E4\uB8EC\uB2E4."], "visualizationIdeas": ["\uC5F0\uC0B0 \uAE30\uD638\uC5D0 \uB530\uB77C \uBCA4 \uB2E4\uC774\uC5B4\uADF8\uB7A8 \uC0C9\uCE60 \uC601\uC5ED \uBCC0\uD654", "\uB4DC\uBAA8\uB974\uAC04\uC758 \uBC95\uCE59 \uC591\uBCC0\uC744 \uC0C9\uCE60 \uC601\uC5ED\uC73C\uB85C \uBE44\uAD50"] }, { "id": "proposition-and-condition", "order": 4, "title": "\uBA85\uC81C\uC640 \uC870\uAC74", "standardCode": "10\uACF5\uC2182-02-04", "achievementStandard": "\uBA85\uC81C\uC640 \uC870\uAC74\uC758 \uB73B\uC744 \uC54C\uACE0, \u2018\uBAA8\uB4E0\u2019, \u2018\uC5B4\uB5A4\u2019\uC744 \uD3EC\uD568\uD55C \uBA85\uC81C\uB97C \uC774\uD574\uD558\uACE0 \uC124\uBA85\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uBA85\uC81C\uC640 \uC870\uAC74", "\uCC38\uACFC \uAC70\uC9D3", "\uC9C4\uB9AC\uC9D1\uD569", "\uBA85\uC81C\uC758 \uBD80\uC815", "\uBAA8\uB4E0\uC744 \uD3EC\uD568\uD55C \uBA85\uC81C", "\uC5B4\uB5A4\uC744 \uD3EC\uD568\uD55C \uBA85\uC81C", "\uBC18\uB840"], "scopeNotes": ["\uC218\uD559\uC801\uC778 \uBB38\uC7A5\uC744 \uC774\uD574\uD558\uB294 \uC218\uC900\uC5D0\uC11C \uAC04\uB2E8\uD788 \uB2E4\uB8EC\uB2E4.", "\uBAA8\uB4E0\uACFC \uC5B4\uB5A4\uC744 \uD3EC\uD568\uD55C \uBA85\uC81C\uB294 \uAD6C\uCCB4\uC801\uC778 \uC0C1\uD669\uC73C\uB85C \uB3C4\uC785\uD55C\uB2E4."], "visualizationIdeas": ["\uBAA8\uB4E0 \uC6D0\uC18C\uB97C \uAC80\uC0AC\uD558\uB294 \uACFC\uC815\uACFC \uD558\uB098\uC758 \uBC18\uB840 \uBE44\uAD50", "\uC870\uAC74\uACFC \uC9C4\uB9AC\uC9D1\uD569\uC758 \uB300\uC751"] }, { "id": "converse-and-contrapositive", "order": 5, "title": "\uBA85\uC81C\uC758 \uC5ED\uACFC \uB300\uC6B0", "standardCode": "10\uACF5\uC2182-02-05", "achievementStandard": "\uBA85\uC81C\uC758 \uC5ED\uACFC \uB300\uC6B0\uB97C \uC774\uD574\uD558\uACE0 \uC124\uBA85\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uAC00\uC815\uACFC \uACB0\uB860", "\uBA85\uC81C p\u2192q", "\uBA85\uC81C\uC758 \uC5ED", "\uBA85\uC81C\uC758 \uB300\uC6B0", "\uBA85\uC81C\uC640 \uB300\uC6B0\uC758 \uCC38\xB7\uAC70\uC9D3 \uAD00\uACC4"], "scopeNotes": ["\uBA85\uC81C\uC758 \uC774\uB294 \uBCC4\uB3C4 \uC131\uCDE8\uAE30\uC900\uC774 \uC544\uB2C8\uBBC0\uB85C \uBCF4\uC870 \uAC1C\uB150\uC73C\uB85C\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uB2E4."], "visualizationIdeas": ["p\uC640 q \uCE74\uB4DC\uC758 \uC21C\uC11C \uBC0F \uBD80\uC815 \uC0C1\uD0DC \uBCC0\uD658", "\uC6D0\uB798 \uBA85\uC81C\uC640 \uB300\uC6B0\uC758 \uC9C4\uB9AC\uD45C \uBE44\uAD50"] }, { "id": "sufficient-and-necessary-conditions", "order": 6, "title": "\uCDA9\uBD84\uC870\uAC74\uACFC \uD544\uC694\uC870\uAC74", "standardCode": "10\uACF5\uC2182-02-06", "achievementStandard": "\uCDA9\uBD84\uC870\uAC74\uACFC \uD544\uC694\uC870\uAC74\uC744 \uC774\uD574\uD558\uACE0 \uD310\uB2E8\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uCDA9\uBD84\uC870\uAC74", "\uD544\uC694\uC870\uAC74", "\uD544\uC694\uCDA9\uBD84\uC870\uAC74", "\uC9C4\uB9AC\uC9D1\uD569\uC758 \uD3EC\uD568\uAD00\uACC4"], "scopeNotes": ["\uAD6C\uCCB4\uC801\uC778 \uC608\uB97C \uD1B5\uD574 \uC774\uD574\uD55C\uB2E4."], "visualizationIdeas": ["\uB450 \uC9C4\uB9AC\uC9D1\uD569\uC758 \uD3EC\uD568\uAD00\uACC4\uB85C \uCDA9\uBD84\xB7\uD544\uC694\uC870\uAC74 \uD45C\uD604", "\uC870\uAC74 \uBCC0\uD654\uC5D0 \uB530\uB77C \uD3EC\uD568\uAD00\uACC4\uAC00 \uBC14\uB00C\uB294 \uC560\uB2C8\uBA54\uC774\uC158"] }, { "id": "proof-by-contrapositive-and-contradiction", "order": 7, "title": "\uB300\uC6B0\uB97C \uC774\uC6A9\uD55C \uC99D\uBA85\uACFC \uADC0\uB958\uBC95", "standardCode": "10\uACF5\uC2182-02-07", "achievementStandard": "\uB300\uC6B0\uB97C \uC774\uC6A9\uD55C \uC99D\uBA85\uBC95\uACFC \uADC0\uB958\uBC95\uC744 \uC774\uD574\uD558\uACE0 \uAD00\uB828\uB41C \uBA85\uC81C\uB97C \uC99D\uBA85\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC99D\uBA85\uC758 \uC758\uBBF8", "\uB300\uC6B0\uB97C \uC774\uC6A9\uD55C \uC99D\uBA85", "\uADC0\uB958\uBC95", "\uB450 \uC99D\uBA85 \uBC29\uBC95\uC758 \uCC28\uC774"], "scopeNotes": ["\uB300\uC6B0 \uC99D\uBA85\uACFC \uADC0\uB958\uBC95\uC740 \uAC04\uB2E8\uD55C \uBA85\uC81C\uB9CC \uB2E4\uB8EC\uB2E4.", "\uC9C1\uAD00\uC801\uC778 \uC774\uD574\uC5D0\uC11C \uC2DC\uC791\uD558\uC5EC \uC810\uC9C4\uC801\uC73C\uB85C \uD615\uC2DD\uD654\uD55C\uB2E4."], "visualizationIdeas": ["\uB17C\uB9AC\uC758 \uC9C4\uD589 \uACBD\uB85C\uB97C \uD750\uB984\uB3C4\uB85C \uD45C\uD604", "\uAC00\uC815\uC758 \uBD80\uC815\uC774 \uBAA8\uC21C\uC5D0 \uB3C4\uB2EC\uD558\uB294 \uACFC\uC815"] }, { "id": "absolute-inequality", "order": 8, "title": "\uC808\uB300\uBD80\uB4F1\uC2DD", "standardCode": "10\uACF5\uC2182-02-08", "achievementStandard": "\uC808\uB300\uBD80\uB4F1\uC2DD\uC758 \uB73B\uC744 \uC54C\uACE0, \uAC04\uB2E8\uD55C \uC808\uB300\uBD80\uB4F1\uC2DD\uC744 \uC99D\uBA85\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC808\uB300\uBD80\uB4F1\uC2DD\uC758 \uB73B", "\uC2E4\uC218\uC758 \uC81C\uACF1\uC744 \uC774\uC6A9\uD55C \uC99D\uBA85", "\uB4F1\uD638 \uC131\uB9BD \uC870\uAC74", "\uAC04\uB2E8\uD55C \uC808\uB300\uBD80\uB4F1\uC2DD"], "scopeNotes": ["\uAC04\uB2E8\uD55C \uC808\uB300\uBD80\uB4F1\uC2DD\uC758 \uC99D\uBA85\uB9CC \uB2E4\uB8EC\uB2E4."], "visualizationIdeas": ["\uB113\uC774 \uBE44\uAD50\uB85C \uBD80\uB4F1\uC2DD \uD45C\uD604", "\uB450 \uC591\uC758 \uCC28\uC758 \uC81C\uACF1\uC774 0 \uC774\uC0C1\uC778 \uACFC\uC815"] }], "conceptCount": 8 }, { "id": "functions-and-graphs", "title": "\uD568\uC218\uC640 \uADF8\uB798\uD504", "order": 3, "concepts": [{ "id": "function-concept-and-graph", "order": 1, "title": "\uD568\uC218\uC758 \uAC1C\uB150\uACFC \uADF8\uB798\uD504", "standardCode": "10\uACF5\uC2182-03-01", "achievementStandard": "\uD568\uC218\uC758 \uAC1C\uB150\uC744 \uC124\uBA85\uD558\uACE0, \uADF8 \uADF8\uB798\uD504\uB97C \uC774\uD574\uD55C\uB2E4.", "topics": ["\uB450 \uC9D1\uD569 \uC0AC\uC774\uC758 \uB300\uC751", "\uD568\uC218\uC758 \uB73B", "\uC815\uC758\uC5ED\xB7\uACF5\uC5ED\xB7\uCE58\uC5ED", "\uD568\uC218\uAC12\uACFC \uADF8\uB798\uD504", "\uC77C\uB300\uC77C\uD568\uC218\uC640 \uC77C\uB300\uC77C\uB300\uC751", "\uD56D\uB4F1\uD568\uC218\uC640 \uC0C1\uC218\uD568\uC218"], "scopeNotes": ["\uC911\uD559\uAD50\uC5D0\uC11C \uD559\uC2B5\uD55C \uD568\uC218 \uAC1C\uB150\uC744 \uB450 \uC9D1\uD569 \uC0AC\uC774\uC758 \uB300\uC751 \uAD00\uACC4\uB85C \uD655\uC7A5\uD55C\uB2E4."], "visualizationIdeas": ["\uC815\uC758\uC5ED \uC6D0\uC18C\uC5D0\uC11C \uACF5\uC5ED \uC6D0\uC18C\uB85C \uD5A5\uD558\uB294 \uB300\uC751 \uD654\uC0B4\uD45C", "\uB300\uC751 \uAD00\uACC4\uAC00 \uC88C\uD45C\uD3C9\uBA74\uC758 \uC810\uC73C\uB85C \uBCC0\uD658\uB418\uB294 \uC560\uB2C8\uBA54\uC774\uC158"] }, { "id": "composite-function", "order": 2, "title": "\uD569\uC131\uD568\uC218", "standardCode": "10\uACF5\uC2182-03-02", "achievementStandard": "\uD568\uC218\uC758 \uD569\uC131\uC744 \uC124\uBA85\uD558\uACE0, \uD569\uC131\uD568\uC218\uB97C \uAD6C\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uD568\uC218 \uD569\uC131\uC758 \uB73B", "\uD569\uC131\uD568\uC218 f\u2218g", "\uD569\uC131 \uC21C\uC11C", "\uD569\uC131\uD568\uC218\uC758 \uD568\uC218\uAC12", "\uAC04\uB2E8\uD55C \uD569\uC131\uD568\uC218 \uAD6C\uD558\uAE30"], "visualizationIdeas": ["\uC785\uB825\uAC12\uC774 \uB450 \uAC1C\uC758 \uD568\uC218 \uAE30\uACC4\uB97C \uC5F0\uC18D \uD1B5\uACFC", "\uD569\uC131 \uC21C\uC11C\uB97C \uBC14\uAFC0 \uB54C \uACB0\uACFC \uBE44\uAD50"] }, { "id": "inverse-function", "order": 3, "title": "\uC5ED\uD568\uC218", "standardCode": "10\uACF5\uC2182-03-03", "achievementStandard": "\uC5ED\uD568\uC218\uC758 \uAC1C\uB150\uC744 \uC124\uBA85\uD558\uACE0, \uC5ED\uD568\uC218\uB97C \uAD6C\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC5ED\uD568\uC218\uC758 \uB73B", "\uC5ED\uD568\uC218\uAC00 \uC874\uC7AC\uD560 \uC870\uAC74", "\uC77C\uB300\uC77C\uB300\uC751\uACFC \uC5ED\uD568\uC218", "\uC815\uC758\uC5ED\uACFC \uCE58\uC5ED\uC758 \uAD50\uD658", "\uC5ED\uD568\uC218 \uAD6C\uD558\uAE30", "y=x\uC5D0 \uB300\uD55C \uADF8\uB798\uD504 \uB300\uCE6D"], "visualizationIdeas": ["\uB300\uC751 \uD654\uC0B4\uD45C\uC758 \uBC29\uD5A5 \uBC18\uC804", "\uD568\uC218 \uADF8\uB798\uD504\uAC00 y=x\uB97C \uAE30\uC900\uC73C\uB85C \uB4A4\uC9D1\uD788\uB294 \uC560\uB2C8\uBA54\uC774\uC158"] }, { "id": "rational-function", "order": 4, "title": "\uC720\uB9AC\uD568\uC218\uC758 \uADF8\uB798\uD504", "standardCode": "10\uACF5\uC2182-03-04", "achievementStandard": "\uC720\uB9AC\uD568\uC218\uC758 \uADF8\uB798\uD504\uB97C \uADF8\uB9B4 \uC218 \uC788\uACE0, \uADF8 \uADF8\uB798\uD504\uC758 \uC131\uC9C8\uC744 \uD0D0\uAD6C\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uC720\uB9AC\uC2DD\uACFC \uC720\uB9AC\uD568\uC218\uC758 \uAE30\uBCF8 \uC758\uBBF8", "\uAE30\uBCF8 \uC720\uB9AC\uD568\uC218", "\uC815\uC758\uC5ED\uACFC \uCE58\uC5ED", "\uC810\uADFC\uC120", "\uADF8\uB798\uD504\uC758 \uD3C9\uD589\uC774\uB3D9", "\uACC4\uC218 \uBCC0\uD654\uC640 \uADF8\uB798\uD504\uC758 \uC131\uC9C8"], "scopeNotes": ["\uC720\uB9AC\uC2DD\uC740 \uC720\uB9AC\uD568\uC218\uB97C \uC774\uD574\uD558\uB294 \uB370 \uD544\uC694\uD55C \uC815\uB3C4\uB9CC \uAC04\uB2E8\uD788 \uB2E4\uB8EC\uB2E4.", "\uC720\uB9AC\uD568\uC218\uB294 \uAE30\uBCF8\uC801\uC778 \uD615\uD0DC\uB97C \uC911\uC2EC\uC73C\uB85C \uAC04\uB2E8\uD55C \uBB38\uC81C\uB9CC \uB2E4\uB8EC\uB2E4."], "visualizationIdeas": ["x\uAC12\uC774 \uD2B9\uC815 \uAC12\uC5D0 \uAC00\uAE4C\uC6CC\uC9C8 \uB54C \uADF8\uB798\uD504\uAC00 \uC810\uADFC\uC120\uC5D0 \uC811\uADFC", "\uADF8\uB798\uD504 \uC774\uB3D9\uACFC \uC810\uADFC\uC120 \uC774\uB3D9 \uB3D9\uC2DC \uD45C\uC2DC"] }, { "id": "irrational-function", "order": 5, "title": "\uBB34\uB9AC\uD568\uC218\uC758 \uADF8\uB798\uD504", "standardCode": "10\uACF5\uC2182-03-05", "achievementStandard": "\uBB34\uB9AC\uD568\uC218\uC758 \uADF8\uB798\uD504\uB97C \uADF8\uB9B4 \uC218 \uC788\uACE0, \uADF8 \uADF8\uB798\uD504\uC758 \uC131\uC9C8\uC744 \uD0D0\uAD6C\uD560 \uC218 \uC788\uB2E4.", "topics": ["\uBB34\uB9AC\uC2DD\uACFC \uBB34\uB9AC\uD568\uC218\uC758 \uAE30\uBCF8 \uC758\uBBF8", "\uAE30\uBCF8 \uBB34\uB9AC\uD568\uC218", "\uC815\uC758\uC5ED\uACFC \uCE58\uC5ED", "\uADF8\uB798\uD504\uC758 \uC2DC\uC791\uC810", "\uADF8\uB798\uD504\uC758 \uD3C9\uD589\uC774\uB3D9", "\uACC4\uC218 \uBCC0\uD654\uC640 \uADF8\uB798\uD504\uC758 \uC131\uC9C8"], "scopeNotes": ["\uBB34\uB9AC\uC2DD\uC740 \uBB34\uB9AC\uD568\uC218\uB97C \uC774\uD574\uD558\uB294 \uB370 \uD544\uC694\uD55C \uC815\uB3C4\uB9CC \uAC04\uB2E8\uD788 \uB2E4\uB8EC\uB2E4.", "\uBB34\uB9AC\uD568\uC218\uB294 \uAE30\uBCF8\uC801\uC778 \uD615\uD0DC\uB97C \uC911\uC2EC\uC73C\uB85C \uAC04\uB2E8\uD55C \uBB38\uC81C\uB9CC \uB2E4\uB8EC\uB2E4."], "visualizationIdeas": ["\uC815\uC758\uC5ED \uACBD\uACC4\uC5D0\uC11C \uADF8\uB798\uD504\uAC00 \uC2DC\uC791\uB418\uB294 \uACFC\uC815", "\uC2DD\uC758 \uC774\uB3D9\uACFC \uADF8\uB798\uD504 \uC2DC\uC791\uC810\uC758 \uC774\uB3D9 \uB3D9\uC2DC \uD45C\uC2DC"] }], "conceptCount": 5 }], "category": "common", "categoryTitle": "\uACF5\uD1B5 \uACFC\uBAA9", "categoryEnglishTitle": "COMMON", "categoryDescription": "\uACE0\uB4F1\uD559\uAD50 \uC218\uD559 \uD559\uC2B5\uC758 \uACF5\uD1B5 \uAE30\uBC18\uC774 \uB418\uB294 \uD544\uC218 \uACFC\uBAA9\uC785\uB2C8\uB2E4.", "categoryOrder": 1, "recommendedGrades": [10], "placementLabel": "2\uD559\uAE30 \uAE30\uBCF8 \uC21C\uC11C", "sourceFile": "kr-2022-g10-math-curri.yaml", "developmentLocked": false }] };
      module.exports = { loadCurriculum: () => curriculum };
    }
  });

  // services/commonMathLearningCatalog.js
  var require_commonMathLearningCatalog = __commonJS({
    "services/commonMathLearningCatalog.js"(exports, module) {
      var CONCEPT_DETAILS = {
        "polynomial-arithmetic": ["\uB2E4\uD56D\uC2DD\uC758 \uC0AC\uCE59\uC5F0\uC0B0", "\uB3D9\uB958\uD56D\uC744 \uBAA8\uC73C\uACE0 \uBD84\uBC30\uBC95\uCE59\uC744 \uC815\uD655\uD788 \uC801\uC6A9\uD558\uBA74 \uBCF5\uC7A1\uD55C \uB2E4\uD56D\uC2DD\uB3C4 \uD55C \uD56D\uC529 \uC548\uC804\uD558\uAC8C \uACC4\uC0B0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", "(A+B)(C+D)=AC+AD+BC+BD"],
        "identity-remainder-theorem": ["\uD56D\uB4F1\uC2DD\uACFC \uB098\uBA38\uC9C0\uC815\uB9AC", "\uD56D\uB4F1\uC2DD\uC740 \uBAA8\uB4E0 \uBB38\uC790 \uAC12\uC5D0\uC11C \uC131\uB9BD\uD558\uACE0, \uB098\uBA38\uC9C0\uC815\uB9AC\uB294 \uB2E4\uD56D\uC2DD\uC744 \uC9C1\uC811 \uB098\uB204\uC9C0 \uC54A\uACE0\uB3C4 \uB098\uBA38\uC9C0\uB97C \uD568\uC218\uAC12\uC73C\uB85C \uBC14\uAFB8\uC5B4 \uC90D\uB2C8\uB2E4.", "P(x)=(x-a)Q(x)+P(a)"],
        "polynomial-factorization": ["\uB2E4\uD56D\uC2DD\uC758 \uC778\uC218\uBD84\uD574", "\uACF5\uD1B5\uC778\uC218\xB7\uACF1\uC148\uACF5\uC2DD\xB7\uCE58\uD658\uC744 \uC21C\uC11C\uB300\uB85C \uC0B4\uD53C\uBA74 \uC804\uAC1C\uB41C \uB2E4\uD56D\uC2DD\uC744 \uACF1\uC758 \uAD6C\uC870\uB85C \uB418\uB3CC\uB9B4 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", "a^2-b^2=(a-b)(a+b)"],
        "complex-numbers": ["\uBCF5\uC18C\uC218", "\uC2E4\uC218\uC5D0\uC11C \uD480\uB9AC\uC9C0 \uC54A\uB294 \uC774\uCC28\uBC29\uC815\uC2DD\uC744 \uB2E4\uB8E8\uAE30 \uC704\uD574 i\xB2=-1\uC778 \uD5C8\uC218\uB2E8\uC704\uB97C \uB3C4\uC785\uD558\uACE0 \uC2E4\uC218\uBD80\uC640 \uD5C8\uC218\uBD80\uB97C \uAC01\uAC01 \uACC4\uC0B0\uD569\uB2C8\uB2E4.", String.raw`i^2=-1,\quad z=a+bi`],
        "quadratic-discriminant": ["\uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uD310\uBCC4\uC2DD", "\uD310\uBCC4\uC2DD\uC740 \uADFC\uC744 \uC2E4\uC81C\uB85C \uAD6C\uD558\uC9C0 \uC54A\uACE0\uB3C4 \uC2E4\uADFC\uC758 \uAC1C\uC218\uC640 \uC911\uADFC \uC5EC\uBD80\uB97C \uC54C\uB824\uC8FC\uB294 \uD575\uC2EC \uC9C0\uD45C\uC785\uB2C8\uB2E4.", "D=b^2-4ac"],
        "quadratic-roots-and-coefficients": ["\uADFC\uACFC \uACC4\uC218\uC758 \uAD00\uACC4", "\uB450 \uADFC\uC758 \uD569\uACFC \uACF1\uC744 \uACC4\uC218\uC5D0 \uC5F0\uACB0\uD558\uBA74 \uADFC\uC744 \uC9C1\uC811 \uAD6C\uD558\uC9C0 \uC54A\uACE0\uB3C4 \uB300\uCE6D\uC2DD\uACFC \uC0C8\uB85C\uC6B4 \uBC29\uC815\uC2DD\uC744 \uACC4\uC0B0\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", String.raw`\alpha+\beta=-\frac ba,\quad \alpha\beta=\frac ca`],
        "quadratic-equation-and-function": ["\uC774\uCC28\uBC29\uC815\uC2DD\uACFC \uC774\uCC28\uD568\uC218", "\uBC29\uC815\uC2DD\uC758 \uC2E4\uADFC\uC740 \uD3EC\uBB3C\uC120\uACFC x\uCD95\uC758 \uAD50\uC810\uC774\uBBC0\uB85C \uB300\uC218\uC801 \uD574\uC640 \uADF8\uB798\uD504\uC758 \uC704\uCE58 \uAD00\uACC4\uB97C \uAC19\uC740 \uC815\uBCF4\uB85C \uC77D\uC2B5\uB2C8\uB2E4.", String.raw`ax^2+bx+c=0\Longleftrightarrow y=ax^2+bx+c\text{의 x절편}`],
        "parabola-and-line": ["\uD3EC\uBB3C\uC120\uACFC \uC9C1\uC120", "\uD3EC\uBB3C\uC120\uACFC \uC9C1\uC120\uC758 \uAD50\uC810 \uAC1C\uC218\uB294 \uB450 \uC2DD\uC744 \uC5F0\uB9BD\uD574 \uC5BB\uC740 \uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uD310\uBCC4\uC2DD\uC73C\uB85C \uD310\uB2E8\uD569\uB2C8\uB2E4.", String.raw`f(x)=mx+n\Longrightarrow D\gtreqless0`],
        "quadratic-max-min-restricted": ["\uC774\uCC28\uD568\uC218\uC758 \uCD5C\uB300\xB7\uCD5C\uC18C", "\uAF2D\uC9D3\uC810\uACFC \uAD6C\uAC04\uC758 \uC591 \uB05D\uC744 \uD568\uAED8 \uBE44\uAD50\uD574\uC57C \uC81C\uD55C\uB41C \uAD6C\uAC04\uC5D0\uC11C\uC758 \uCD5C\uB300\xB7\uCD5C\uC18C\uB97C \uBE60\uB728\uB9AC\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", String.raw`x_v=-\frac b{2a}`],
        "cubic-and-quartic-equations": ["\uC0BC\uCC28\xB7\uC0AC\uCC28\uBC29\uC815\uC2DD", "\uC778\uC218\uC815\uB9AC\uB85C \uD55C \uADFC\uC744 \uCC3E\uACE0 \uCC28\uC218\uB97C \uB0AE\uCD98 \uB4A4, \uB0A8\uC740 \uC774\uCC28\uC2DD\uC758 \uD574\uB97C \uAD6C\uD558\uB294 \uAC83\uC774 \uAE30\uBCF8 \uC804\uB7B5\uC785\uB2C8\uB2E4.", String.raw`P(a)=0\Longleftrightarrow(x-a)\mid P(x)`],
        "simultaneous-quadratic-equations": ["\uC5F0\uB9BD\uC774\uCC28\uBC29\uC815\uC2DD", "\uD55C \uC2DD\uC5D0\uC11C \uCE58\uD658 \uB300\uC0C1\uC744 \uACE0\uB978 \uB4A4 \uB2E4\uB978 \uC2DD\uC5D0 \uB300\uC785\uD558\uACE0, \uC5BB\uC740 \uD574\uAC00 \uC6D0\uB798 \uB450 \uC2DD\uC744 \uBAA8\uB450 \uB9CC\uC871\uD558\uB294\uC9C0 \uAC80\uC0B0\uD569\uB2C8\uB2E4.", String.raw`\text{치환}\to\text{한 문자 방정식}\to\text{검산}`],
        "simultaneous-linear-inequalities": ["\uC5F0\uB9BD\uC77C\uCC28\uBD80\uB4F1\uC2DD", "\uAC01 \uBD80\uB4F1\uC2DD\uC758 \uD574\uB97C \uC218\uC9C1\uC120\uC5D0 \uB098\uD0C0\uB0B8 \uB4A4 \uACF5\uD1B5\uBD80\uBD84\uB9CC \uCDE8\uD574\uC57C \uC5F0\uB9BD\uBD80\uB4F1\uC2DD\uC758 \uD574\uAC00 \uB429\uB2C8\uB2E4.", String.raw`A\cap B`],
        "absolute-linear-inequalities": ["\uC808\uB313\uAC12 \uC77C\uCC28\uBD80\uB4F1\uC2DD", "\uC808\uB313\uAC12\uC740 \uC218\uC9C1\uC120\uC5D0\uC11C\uC758 \uAC70\uB9AC\uC774\uBBC0\uB85C |x-a|<r\uC740 a\uC5D0\uC11C r\uBCF4\uB2E4 \uAC00\uAE4C\uC6B4 \uC810, |x-a|>r\uC740 \uB354 \uBA3C \uC810\uC744 \uB73B\uD569\uB2C8\uB2E4.", String.raw`|x-a|<r\Longleftrightarrow a-r<x<a+r`],
        "quadratic-inequalities": ["\uC774\uCC28\uBD80\uB4F1\uC2DD", "\uC774\uCC28\uC2DD\uC758 \uADFC\uACFC \uCD5C\uACE0\uCC28\uD56D\uC758 \uBD80\uD638\uB97C \uC774\uC6A9\uD574 \uC218\uC9C1\uC120\uC758 \uBD80\uD638\uAC00 \uBC14\uB00C\uB294 \uAD6C\uAC04\uC744 \uD310\uC815\uD569\uB2C8\uB2E4.", String.raw`a(x-\alpha)(x-\beta)\gtreqless0`],
        "addition-and-multiplication-principles": ["\uD569\uC758 \uBC95\uCE59\uACFC \uACF1\uC758 \uBC95\uCE59", "\uC11C\uB85C \uACB9\uCE58\uC9C0 \uC54A\uB294 \uC120\uD0DD\uC740 \uB354\uD558\uACE0, \uC5F0\uC18D\uB41C \uB2E8\uACC4\uC758 \uC120\uD0DD\uC740 \uACF1\uD558\uC5EC \uACBD\uC6B0\uC758 \uC218\uB97C \uC149\uB2C8\uB2E4.", String.raw`n(A\cup B)=n(A)+n(B),\quad n(A\times B)=n(A)n(B)`],
        "permutations": ["\uC21C\uC5F4", "\uC11C\uB85C \uB2E4\uB978 \uB300\uC0C1\uC744 \uC21C\uC11C \uC788\uAC8C \uBF51\uC544 \uBC30\uC5F4\uD558\uB294 \uACBD\uC6B0\uC758 \uC218\uB294 \uCCAB \uC790\uB9AC\uBD80\uD130 \uAC00\uB2A5\uD55C \uC120\uD0DD \uC218\uB97C \uACF1\uD574 \uACC4\uC0B0\uD569\uB2C8\uB2E4.", String.raw`{}_nP_r=\frac{n!}{(n-r)!}`],
        "combinations": ["\uC870\uD569", "\uC21C\uC11C\uB97C \uAD6C\uBCC4\uD558\uC9C0 \uC54A\uB294 \uC120\uD0DD\uC740 \uAC19\uC740 \uC6D0\uC18C\uB97C \uBC30\uC5F4\uD55C r!\uAC00\uC9C0\uAC00 \uC911\uBCF5\uB418\uBBC0\uB85C \uC21C\uC5F4\uC744 r!\uB85C \uB098\uB215\uB2C8\uB2E4.", String.raw`{}_nC_r=\frac{n!}{r!(n-r)!}`],
        "matrix-concept": ["\uD589\uB82C\uC758 \uB73B", "\uD589\uB82C\uC740 \uC218\uB97C \uD589\uACFC \uC5F4\uC5D0 \uB9DE\uCD94\uC5B4 \uBC30\uC5F4\uD55C \uD45C\uC774\uBA70, \uC704\uCE58\uAC00 \uAC19\uC740 \uC131\uBD84\uB07C\uB9AC \uB300\uC751\uC2DC\uCF1C \uC77D\uC2B5\uB2C8\uB2E4.", String.raw`A=(a_{ij})_{m\times n}`],
        "matrix-operations": ["\uD589\uB82C\uC758 \uC5F0\uC0B0", "\uB367\uC148\uC740 \uAC19\uC740 \uC704\uCE58\uC758 \uC131\uBD84\uB07C\uB9AC, \uACF1\uC148\uC740 \uC55E \uD589\uB82C\uC758 \uD589\uACFC \uB4A4 \uD589\uB82C\uC758 \uC5F4\uC744 \uACF1\uD574 \uB354\uD569\uB2C8\uB2E4.", String.raw`(AB)_{ij}=\sum_k a_{ik}b_{kj}`],
        "distance-and-internal-division": ["\uB450 \uC810 \uC0AC\uC774\uC758 \uAC70\uB9AC\uC640 \uB0B4\uBD84\uC810", "\uC88C\uD45C\uC758 \uCC28\uB85C \uB9CC\uB4E0 \uC9C1\uAC01\uC0BC\uAC01\uD615\uC5D0 \uD53C\uD0C0\uACE0\uB77C\uC2A4 \uC815\uB9AC\uB97C \uC801\uC6A9\uD558\uACE0, \uB0B4\uBD84\uC810\uC740 \uBC18\uB300\uD3B8 \uBE44\uB97C \uAC00\uC911\uCE58\uB85C \uC0AC\uC6A9\uD569\uB2C8\uB2E4.", String.raw`AB=\sqrt{(x_2-x_1)^2+(y_2-y_1)^2}`],
        "parallel-and-perpendicular-lines": ["\uD3C9\uD589\xB7\uC218\uC9C1\uC778 \uB450 \uC9C1\uC120", "\uAE30\uC6B8\uAE30\uAC00 \uAC19\uC73C\uBA74 \uD3C9\uD589\uC774\uACE0, \uB450 \uAE30\uC6B8\uAE30\uC758 \uACF1\uC774 -1\uC774\uBA74 \uC218\uC9C1\uC774\uB77C\uB294 \uC870\uAC74\uC73C\uB85C \uBBF8\uC9C0\uC218\uB97C \uACB0\uC815\uD569\uB2C8\uB2E4.", String.raw`m_1=m_2,\quad m_1m_2=-1`],
        "point-line-distance": ["\uC810\uACFC \uC9C1\uC120 \uC0AC\uC774\uC758 \uAC70\uB9AC", "\uC9C1\uC120\uC758 \uC2DD\uC744 \uD55C\uCABD\uC73C\uB85C \uC815\uB9AC\uD55C \uB4A4 \uC810\uC758 \uC88C\uD45C\uB97C \uBD84\uC790\uC5D0 \uB300\uC785\uD558\uACE0 \uBC95\uC120\uBCA1\uD130\uC758 \uAE38\uC774\uB85C \uB098\uB215\uB2C8\uB2E4.", String.raw`d=\frac{|ax_0+by_0+c|}{\sqrt{a^2+b^2}}`],
        "circle-equation": ["\uC6D0\uC758 \uBC29\uC815\uC2DD", "\uC911\uC2EC\uC5D0\uC11C\uC758 \uAC70\uB9AC\uAC00 \uBC18\uC9C0\uB984\uACFC \uAC19\uB2E4\uB294 \uC815\uC758\uB97C \uAC70\uB9AC \uACF5\uC2DD\uC73C\uB85C \uB098\uD0C0\uB0B4\uBA74 \uC6D0\uC758 \uD45C\uC900\uD615\uC774 \uB429\uB2C8\uB2E4.", "(x-a)^2+(y-b)^2=r^2"],
        "circle-line-position": ["\uC6D0\uACFC \uC9C1\uC120\uC758 \uC704\uCE58 \uAD00\uACC4", "\uC6D0\uC758 \uC911\uC2EC\uACFC \uC9C1\uC120 \uC0AC\uC774\uC758 \uAC70\uB9AC d\uB97C \uBC18\uC9C0\uB984 r\uACFC \uBE44\uAD50\uD558\uBA74 \uAD50\uC810\uC774 0\uAC1C\xB71\uAC1C\xB72\uAC1C\uC778\uC9C0 \uD310\uB2E8\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", "d<r, d=r, d>r"],
        "geometric-translation": ["\uD3C9\uD589\uC774\uB3D9", "\uB3C4\uD615\uC744 (p,q)\uB9CC\uD07C \uC62E\uAE30\uBA74 \uC810\uC758 \uC88C\uD45C\uC5D0\uB294 (p,q)\uB97C \uB354\uD558\uACE0, \uBC29\uC815\uC2DD\uC5D0\uB294 x-p\uC640 y-q\uB97C \uB300\uC785\uD569\uB2C8\uB2E4.", "f(x-p,y-q)=0"],
        "geometric-reflection": ["\uB300\uCE6D\uC774\uB3D9", "\uB300\uCE6D\uCD95\uC5D0 \uB530\uB77C \uC88C\uD45C\uC758 \uBD80\uD638\uB098 \uC21C\uC11C\uB97C \uBC14\uAFB8\uACE0, \uBC29\uC815\uC2DD\uC5D0\uB3C4 \uAC19\uC740 \uC88C\uD45C \uBCC0\uD658\uC744 \uC801\uC6A9\uD569\uB2C8\uB2E4.", String.raw`x\text{축}:(x,y)\mapsto(x,-y)`],
        "set-concept-and-representation": ["\uC9D1\uD569\uC758 \uB73B\uACFC \uD45C\uD604", "\uC870\uAC74\uC774 \uBA85\uD655\uD55C \uB300\uC0C1\uC758 \uBAA8\uC784\uC744 \uC9D1\uD569\uC774\uB77C \uD558\uBA70 \uC6D0\uC18C\uB098\uC5F4\uBC95\xB7\uC870\uAC74\uC81C\uC2DC\uBC95\xB7\uBCA4\uB2E4\uC774\uC5B4\uADF8\uB7A8\uC73C\uB85C \uAC19\uC740 \uC9D1\uD569\uC744 \uD45C\uD604\uD569\uB2C8\uB2E4.", "A={xmid P(x)}"],
        "set-inclusion": ["\uBD80\uBD84\uC9D1\uD569", "A\uC758 \uBAA8\uB4E0 \uC6D0\uC18C\uAC00 B\uC5D0\uB3C4 \uC18D\uD558\uBA74 A\uB294 B\uC758 \uBD80\uBD84\uC9D1\uD569\uC774\uBA70, \uC11C\uB85C \uD3EC\uD568\uD558\uBA74 \uB450 \uC9D1\uD569\uC740 \uAC19\uC2B5\uB2C8\uB2E4.", String.raw`A\subseteq B\Longleftrightarrow\forall x(x\in A\Rightarrow x\in B)`],
        "set-operations": ["\uC9D1\uD569\uC758 \uC5F0\uC0B0", "\uD569\uC9D1\uD569\xB7\uAD50\uC9D1\uD569\xB7\uC5EC\uC9D1\uD569\uC744 \uBCA4\uB2E4\uC774\uC5B4\uADF8\uB7A8\uC758 \uC601\uC5ED\uACFC \uC5F0\uACB0\uD558\uACE0 \uB4DC\uBAA8\uB974\uAC04 \uBC95\uCE59\uC73C\uB85C \uBCF5\uC7A1\uD55C \uC2DD\uC744 \uC815\uB9AC\uD569\uB2C8\uB2E4.", String.raw`(A\cup B)^c=A^c\cap B^c`],
        "proposition-and-condition": ["\uBA85\uC81C\uC640 \uC870\uAC74", "\uCC38\uACFC \uAC70\uC9D3\uC744 \uBD84\uBA85\uD788 \uD310\uBCC4\uD560 \uC218 \uC788\uB294 \uBB38\uC7A5\uC744 \uBA85\uC81C\uB77C \uD558\uACE0, \uC870\uAC74\uC758 \uC9C4\uB9AC\uC9D1\uD569\uC73C\uB85C \uBA85\uC81C\uC758 \uCC38\xB7\uAC70\uC9D3\uC744 \uD310\uB2E8\uD569\uB2C8\uB2E4.", String.raw`p\Rightarrow q`],
        "converse-and-contrapositive": ["\uC5ED\uACFC \uB300\uC6B0", "p\u2192q\uC758 \uC5ED\uC740 q\u2192p\uC774\uACE0 \uB300\uC6B0\uB294 \xACq\u2192\xACp\uC774\uBA70, \uC6D0\uB798 \uBA85\uC81C\uC640 \uB300\uC6B0\uC758 \uCC38\xB7\uAC70\uC9D3\uC740 \uD56D\uC0C1 \uAC19\uC2B5\uB2C8\uB2E4.", String.raw`p\Rightarrow q\Longleftrightarrow\neg q\Rightarrow\neg p`],
        "sufficient-and-necessary-conditions": ["\uCDA9\uBD84\uC870\uAC74\uACFC \uD544\uC694\uC870\uAC74", "p\uAC00 q\uB97C \uBCF4\uC7A5\uD558\uBA74 p\uB294 \uCDA9\uBD84\uC870\uAC74\uC774\uACE0 q\uB294 \uD544\uC694\uC870\uAC74\uC774\uBA70, \uC591\uBC29\uD5A5\uC774 \uBAA8\uB450 \uC131\uB9BD\uD558\uBA74 \uD544\uC694\uCDA9\uBD84\uC870\uAC74\uC785\uB2C8\uB2E4.", String.raw`p\Rightarrow q,\quad p\Longleftrightarrow q`],
        "proof-by-contrapositive-and-contradiction": ["\uB300\uC6B0\uC640 \uADC0\uB958\uBC95\uC744 \uC774\uC6A9\uD55C \uC99D\uBA85", "\uC9C1\uC811 \uC99D\uBA85\uC774 \uC5B4\uB824\uC6B0\uBA74 \uB300\uC6B0\uB97C \uC99D\uBA85\uD558\uAC70\uB098 \uACB0\uB860\uC758 \uBD80\uC815\uC744 \uAC00\uC815\uD574 \uBAA8\uC21C\uC744 \uC774\uB04C\uC5B4 \uB0C5\uB2C8\uB2E4.", String.raw`\neg q\Rightarrow\neg p`],
        "absolute-inequality": ["\uC808\uB300\uBD80\uB4F1\uC2DD", "\uBB38\uC790\uC758 \uBAA8\uB4E0 \uD5C8\uC6A9\uAC12\uC5D0\uC11C \uC131\uB9BD\uD558\uB294 \uBD80\uB4F1\uC2DD\uC740 \uC81C\uACF1\uC758 \uBE44\uC74C\uC218\uC131\xB7\uC0B0\uC220\uAE30\uD558\uD3C9\uADE0\xB7\uCF54\uC2DC\uD615 \uAD6C\uC870\uB85C \uC99D\uBA85\uD569\uB2C8\uB2E4.", String.raw`a^2+b^2\ge2ab`],
        "function-concept-and-graph": ["\uD568\uC218\uC758 \uB73B\uACFC \uADF8\uB798\uD504", "\uC815\uC758\uC5ED\uC758 \uAC01 \uC6D0\uC18C\uC5D0 \uACF5\uC5ED\uC758 \uC6D0\uC18C\uAC00 \uC815\uD655\uD788 \uD558\uB098\uC529 \uB300\uC751\uD560 \uB54C \uD568\uC218\uC774\uBA70 \uADF8\uB798\uD504\uB294 \uADF8 \uC21C\uC11C\uC30D\uC758 \uBAA8\uC784\uC785\uB2C8\uB2E4.", String.raw`f:X\to Y`],
        "composite-function": ["\uD569\uC131\uD568\uC218", "\uC548\uCABD \uD568\uC218\uB97C \uBA3C\uC800 \uACC4\uC0B0\uD55C \uB4A4 \uADF8 \uACB0\uACFC\uB97C \uBC14\uAE65 \uD568\uC218\uC5D0 \uC785\uB825\uD558\uBA70, \uC815\uC758\uC5ED \uC870\uAC74\uB3C4 \uD568\uAED8 \uD655\uC778\uD569\uB2C8\uB2E4.", String.raw`(f\circ g)(x)=f(g(x))`],
        "inverse-function": ["\uC5ED\uD568\uC218", "\uC77C\uB300\uC77C \uB300\uC751\uC778 \uD568\uC218\uC5D0\uC11C \uC785\uB825\uACFC \uCD9C\uB825\uC744 \uBC14\uAFB8\uBA74 \uC5ED\uD568\uC218\uAC00 \uB418\uBA70 \uB450 \uADF8\uB798\uD504\uB294 y=x\uC5D0 \uB300\uCE6D\uC785\uB2C8\uB2E4.", String.raw`f^{-1}(f(x))=x`],
        "rational-function": ["\uC720\uB9AC\uD568\uC218", "\uBD84\uBAA8\uAC00 0\uC774 \uB418\uB294 \uAC12\uC744 \uC815\uC758\uC5ED\uC5D0\uC11C \uC81C\uC678\uD558\uACE0 \uC810\uADFC\uC120\uACFC \uD3C9\uD589\uC774\uB3D9\uC744 \uC774\uC6A9\uD574 \uADF8\uB798\uD504\uC758 \uC704\uCE58\uB97C \uC77D\uC2B5\uB2C8\uB2E4.", String.raw`y=\frac{a}{x-p}+q`],
        "irrational-function": ["\uBB34\uB9AC\uD568\uC218", "\uADFC\uD638 \uC548\uC774 0 \uC774\uC0C1\uC774\uB77C\uB294 \uC815\uC758\uC5ED \uC870\uAC74\uC744 \uBA3C\uC800 \uC138\uC6B0\uACE0 \uAE30\uC900 \uADF8\uB798\uD504\uC758 \uC774\uB3D9\uACFC \uB300\uCE6D\uC73C\uB85C \uAC1C\uD615\uC744 \uD30C\uC545\uD569\uB2C8\uB2E4.", String.raw`y=a\sqrt{x-p}+q`]
      };
      var GRAPH_CONCEPT_IDS = /* @__PURE__ */ new Set([
        "quadratic-equation-and-function",
        "parabola-and-line",
        "quadratic-max-min-restricted",
        "distance-and-internal-division",
        "parallel-and-perpendicular-lines",
        "point-line-distance",
        "circle-equation",
        "circle-line-position",
        "geometric-translation",
        "geometric-reflection",
        "function-concept-and-graph",
        "inverse-function",
        "rational-function",
        "irrational-function"
      ]);
      var DIAGRAM_CONCEPT_IDS = /* @__PURE__ */ new Set([
        "simultaneous-linear-inequalities",
        "absolute-linear-inequalities",
        "quadratic-inequalities",
        "addition-and-multiplication-principles",
        "permutations",
        "combinations",
        "matrix-concept",
        "matrix-operations",
        "set-concept-and-representation",
        "set-inclusion",
        "set-operations",
        "composite-function"
      ]);
      function commonMathVisualType(conceptId) {
        if (GRAPH_CONCEPT_IDS.has(conceptId)) return "graph";
        if (DIAGRAM_CONCEPT_IDS.has(conceptId)) return "area-model";
        return "formula";
      }
      function previewBlocksFor(type) {
        if (type === "graph") {
          return [
            { label: "\uAE30\uC900 \uADF8\uB798\uD504", tone: "secondary" },
            { label: "\uC870\uAC74 \uBCC0\uD654", tone: "primary" },
            { label: "\uACB0\uACFC \uD655\uC778", tone: "accent" }
          ];
        }
        if (type === "area-model") {
          return [
            { label: "\uB300\uC0C1 \uBC30\uCE58", tone: "secondary" },
            { label: "\uAD00\uACC4 \uBE44\uAD50", tone: "primary" },
            { label: "\uACBD\uC6B0 \uD655\uC778", tone: "accent" }
          ];
        }
        return [
          { label: "\uC870\uAC74 \uC77D\uAE30", tone: "secondary" },
          { label: "\uC2DD \uC815\uB9AC", tone: "primary" },
          { label: "\uAC80\uC0B0", tone: "accent" }
        ];
      }
      function detailedSteps(concept, detail) {
        const topics = Array.isArray(concept.topics) && concept.topics.length ? concept.topics : [concept.title];
        const [title, takeaway, formula] = detail;
        const topicAt = (index) => topics[index % topics.length];
        return [
          ["\uC815\uC758\uB97C \uBA3C\uC800 \uACE0\uC815\uD569\uB2C8\uB2E4", `${topicAt(0)}\uC758 \uB73B\uACFC \uAE30\uD638\uAC00 \uAC00\uB9AC\uD0A4\uB294 \uB300\uC0C1\uC744 \uC9E7\uAC8C \uC815\uB9AC\uD569\uB2C8\uB2E4.`],
          ["\uC54C\uB9DE\uC740 \uD45C\uD604\uC744 \uACE0\uB985\uB2C8\uB2E4", `${topicAt(1)}\uC744 \uC2DD\xB7\uD45C\xB7\uB3C4\uC2DD\xB7\uC88C\uD45C\uD3C9\uBA74 \uC911 \uAC1C\uB150\uC5D0 \uAF2D \uD544\uC694\uD55C \uD45C\uD604\uC73C\uB85C \uBC14\uAFC9\uB2C8\uB2E4.`],
          ["\uD575\uC2EC \uAD00\uACC4\uB97C \uC720\uB3C4\uD569\uB2C8\uB2E4", `${formula}\uAC00 \uC815\uC758\uC5D0\uC11C \uC5B4\uB5A4 \uACC4\uC0B0\uC744 \uAC70\uCCD0 \uB098\uC624\uB294\uC9C0 \uC21C\uC11C\uB300\uB85C \uC5F0\uACB0\uD569\uB2C8\uB2E4.`],
          ["\uB300\uD45C \uC870\uAC74\uC744 \uC801\uC6A9\uD569\uB2C8\uB2E4", `${topicAt(2)}\uC758 \uC870\uAC74\uC744 \uC2DD\uC73C\uB85C \uBC88\uC5ED\uD558\uACE0 \uACC4\uC0B0 \uC21C\uC11C\uC640 \uB2F5\uC758 \uBC94\uC704\uB97C \uD655\uC778\uD569\uB2C8\uB2E4.`],
          ["\uBC14\uB010 \uC870\uAC74\uC744 \uBE44\uAD50\uD569\uB2C8\uB2E4", `${topicAt(3)}\uC758 \uBD80\uD638\xB7\uBC94\uC704\xB7\uC21C\uC11C\uAC00 \uB2EC\uB77C\uC9C8 \uB54C \uACB0\uB860\uC774 \uC5B4\uB5BB\uAC8C \uBC14\uB00C\uB294\uC9C0 \uBE44\uAD50\uD569\uB2C8\uB2E4.`],
          ["\uAC80\uC0B0\uC73C\uB85C \uB9C8\uBB34\uB9AC\uD569\uB2C8\uB2E4", `${title}\uC5D0\uC11C \uC790\uC8FC \uC0DD\uAE30\uB294 \uC815\uC758\uC5ED \uB204\uB77D, \uBD80\uD638 \uC624\uB958, \uC911\uBCF5 \uACC4\uC0B0\uC744 \uB9C8\uC9C0\uB9C9\uC5D0 \uC810\uAC80\uD569\uB2C8\uB2E4.`]
        ].map(([stepTitle, description], index) => ({ order: index + 1, title: stepTitle, description }));
      }
      function buildCommonMathLessonDefinitions(curriculum) {
        return curriculum.courses.filter((course) => ["common-math-1", "common-math-2"].includes(course.id)).flatMap((course) => course.units.flatMap((unit) => unit.concepts.map((concept) => {
          const detail = CONCEPT_DETAILS[concept.id];
          if (!detail) throw new Error(`\uACF5\uD1B5\uC218\uD559 \uC0C1\uC138 \uC124\uBA85\uC774 \uC5C6\uC2B5\uB2C8\uB2E4: ${concept.id}`);
          const [title, keyTakeaway, formula] = detail;
          const visualType = commonMathVisualType(concept.id);
          return {
            curriculumId: curriculum.curriculum?.id || "kr-2022",
            courseId: course.id,
            unitId: unit.id,
            conceptId: concept.id,
            content: {
              estimatedMinutes: 28,
              summary: `${title}\uC758 \uD575\uC2EC \uC815\uC758\uC640 \uD310\uB2E8 \uAE30\uC900\uC744 \uBA3C\uC800 \uC775\uD78C \uB4A4, \uD544\uC694\uD55C \uD45C\uD604\uACFC \uACC4\uC0B0 \uC6D0\uB9AC\uB97C \uB300\uD45C \uC870\uAC74\uC5D0 \uC801\uC6A9\uD569\uB2C8\uB2E4.`,
              keyTakeaway,
              steps: detailedSteps(concept, detail),
              motion: { assetUrl: null, posterUrl: null, durationSeconds: 18 },
              playgroundKey: `common-math-${concept.id}`,
              practice: { generatorKey: `common-math-${concept.id}`, requiredDistinctTypes: 10 },
              dashboardPreview: {
                type: visualType,
                title,
                formula,
                blocks: previewBlocksFor(visualType)
              },
              isPublished: true
            }
          };
        })));
      }
      module.exports = {
        CONCEPT_DETAILS,
        GRAPH_CONCEPT_IDS,
        DIAGRAM_CONCEPT_IDS,
        commonMathVisualType,
        buildCommonMathLessonDefinitions
      };
    }
  });

  // services/mathTextService.js
  var require_mathTextService = __commonJS({
    "services/mathTextService.js"(exports, module) {
      var SUBSCRIPT_CHARACTERS = {
        "\u2080": "0",
        "\u2081": "1",
        "\u2082": "2",
        "\u2083": "3",
        "\u2084": "4",
        "\u2085": "5",
        "\u2086": "6",
        "\u2087": "7",
        "\u2088": "8",
        "\u2089": "9",
        "\u208A": "+",
        "\u208B": "-",
        "\u208C": "=",
        "\u208D": "(",
        "\u208E": ")",
        "\u2099": "n",
        "\u2096": "k"
      };
      var SUPERSCRIPT_CHARACTERS = {
        "\u2070": "0",
        "\xB9": "1",
        "\xB2": "2",
        "\xB3": "3",
        "\u2074": "4",
        "\u2075": "5",
        "\u2076": "6",
        "\u2077": "7",
        "\u2078": "8",
        "\u2079": "9",
        "\u207A": "+",
        "\u207B": "-",
        "\u207C": "=",
        "\u207D": "(",
        "\u207E": ")",
        "\u207F": "n",
        "\u1D4F": "k",
        "\u1D50": "m",
        "\u1DA0": "f",
        "\u1D4D": "g",
        "\u02E3": "x"
      };
      var MATH_FRAGMENT_PATTERN = /[A-Za-z0-9πθΣ∫√∛∞′″₀-₉₊₋₌₍₎ₙₖ⁰-⁹⁺⁻⁼⁽⁾ⁿᵏᵐᶠᵍˣ≤≥≠×÷·−±°]/;
      var DASHBOARD_FORMULA_OVERRIDES = {
        "\uBC11>1 \uC99D\uAC00 \xB7 0<\uBC11<1 \uAC10\uC18C": "\\(a>1\\): \uC99D\uAC00, \\(0<a<1\\): \uAC10\uC18C",
        "\u03C0 rad = 180\xB0 \xB7 l = r\u03B8": "\\(\\pi\\,\\mathrm{rad}=180^{\\circ},\\quad l=r\\theta\\)",
        "(cos\u03B8, sin\u03B8) \xB7 sin\xB2\u03B8 + cos\xB2\u03B8 = 1": "\\((\\cos\\theta,\\sin\\theta),\\quad \\sin^2\\theta+\\cos^2\\theta=1\\)",
        "a/sinA = 2R \xB7 a\xB2 = b\xB2+c\xB2\u22122bc\xB7cosA": "\\(\\frac{a}{\\sin A}=2R,\\quad a^2=b^2+c^2-2bc\\cos A\\)",
        "f\u2032(a) = lim h\u21920 [f(a+h)-f(a)]/h": "\\(f'(a)=\\displaystyle\\lim_{h\\to0}\\frac{f(a+h)-f(a)}{h}\\)",
        "f\u2032(c) = [f(b)-f(a)]/(b-a)": "\\(f'(c)=\\displaystyle\\frac{f(b)-f(a)}{b-a}\\)",
        "\u222Bx\u207Fdx = x\u207F\u207A\xB9/(n+1)+C": "\\(\\displaystyle\\int x^n\\,dx=\\frac{x^{n+1}}{n+1}+C\\quad(n\\ne-1)\\)",
        "\u222B\u2090\u1D47 f = \u222B\u2090\u1D9C f + \u222Bc\u1D47 f": "\\(\\displaystyle\\int_a^b f(x)\\,dx=\\int_a^c f(x)\\,dx+\\int_c^b f(x)\\,dx\\)",
        "\u222B\u2090\u1D47 f(x)dx = F(b)-F(a)": "\\(\\displaystyle\\int_a^b f(x)\\,dx=F(b)-F(a)\\)",
        "lim x\u2192a f(x) = f(a)": "\\(\\displaystyle\\lim_{x\\to a}f(x)=f(a)\\)",
        "lim x\u2192a f(x) = L": "\\(\\displaystyle\\lim_{x\\to a}f(x)=L\\)"
      };
      function scriptText(value, characterMap) {
        return Array.from(value).map(
          (character) => characterMap[character] || character
        ).join("");
      }
      function replaceScriptCharacters(value, characterMap, marker) {
        const characters = Object.keys(characterMap).join("");
        const pattern = new RegExp(
          `[${characters}]+`,
          "g"
        );
        return value.replace(pattern, (match) => {
          const content = Array.from(match).map((character) => characterMap[character]).join("");
          return `${marker}{${content}}`;
        });
      }
      function normalizeRootNotation(value) {
        let result = value;
        const superscriptCharacters = Object.keys(SUPERSCRIPT_CHARACTERS).join("");
        result = result.replace(
          new RegExp(
            `([${superscriptCharacters}]+)\u221A\\(([^()]*)\\)`,
            "g"
          ),
          (_, index, radicand) => `\\sqrt[${scriptText(
            index,
            SUPERSCRIPT_CHARACTERS
          )}]{${radicand}}`
        );
        result = result.replace(
          new RegExp(
            `([${superscriptCharacters}]+)\u221A([A-Za-z0-9]+[${superscriptCharacters}]*)`,
            "g"
          ),
          (_, index, radicand) => `\\sqrt[${scriptText(
            index,
            SUPERSCRIPT_CHARACTERS
          )}]{${radicand}}`
        );
        result = result.replace(
          /∛\(([^()]*)\)/g,
          "\\sqrt[3]{$1}"
        );
        result = result.replace(
          /√\(([^()]*)\)/g,
          "\\sqrt{$1}"
        );
        result = result.replace(
          /∛([A-Za-z0-9]+(?:_\{[^}]+\}|\^\{[^}]+\})*)/g,
          "\\sqrt[3]{$1}"
        );
        result = result.replace(
          /√([A-Za-z0-9]+(?:_\{[^}]+\}|\^\{[^}]+\})*)/g,
          "\\sqrt{$1}"
        );
        return result;
      }
      function normalizeMathSource(value) {
        let result = String(value);
        result = result.replace(/−/g, "-").replace(/\+\s*-/g, "-").replace(/½/g, "\\frac{1}{2}").replace(/′/g, "'").replace(/″/g, "''");
        result = normalizeRootNotation(result);
        result = replaceScriptCharacters(
          result,
          SUBSCRIPT_CHARACTERS,
          "_"
        );
        result = replaceScriptCharacters(
          result,
          SUPERSCRIPT_CHARACTERS,
          "^"
        );
        result = result.replace(/\^\(([^()]*)\)/g, "^{$1}").replace(/Σ/g, "\\sum ").replace(/∫/g, "\\int ").replace(/π/g, "\\pi").replace(/θ/g, "\\theta").replace(/∞/g, "\\infty").replace(/≤/g, "\\le ").replace(/≥/g, "\\ge ").replace(/≠/g, "\\ne ").replace(/×/g, "\\times ").replace(/÷/g, "\\div ").replace(/·/g, "\\cdot ").replace(/→/g, "\\to ").replace(/±/g, "\\pm ").replace(/°/g, "^{\\circ}").replace(/⟺|⇔/g, "\\Longleftrightarrow ").replace(/⇒/g, "\\Longrightarrow ").replace(/↔/g, "\\leftrightarrow ").replace(/∧/g, "\\land ").replace(/∀/g, "\\forall ").replace(/\brad\b/g, "\\mathrm{rad}").replace(/\blim\b/g, "\\lim").replace(
          /\b(log|sin|cos|tan)(?=[A-Z])/g,
          "\\$1 "
        ).replace(
          /(^|[^\\A-Za-z])(log|sin|cos|tan)(?=[^A-Za-z]|$)/g,
          "$1\\$2"
        ).replace(/\s+/g, " ").trim();
        return result;
      }
      function wrapMathFragment(fragment) {
        const leadingWhitespace = fragment.match(/^\s*/)?.[0] || "";
        const trailingWhitespace = fragment.match(/\s*$/)?.[0] || "";
        let core = fragment.trim();
        if (!core || !MATH_FRAGMENT_PATTERN.test(core)) {
          return fragment;
        }
        let leadingPunctuation = "";
        let trailingPunctuation = "";
        const punctuationOnly = /^[\s.,;:!?'"‘’“”()[\]{}·×÷+\-=<>≤≥≠±→↔⇒⇔⟺∧∀]+$/;
        if (punctuationOnly.test(core)) {
          return fragment;
        }
        const quoteMatch = core.match(
          /^([,;:'"‘’“”]+\s*)/
        );
        if (quoteMatch) {
          leadingPunctuation = quoteMatch[1];
          core = core.slice(
            leadingPunctuation.length
          );
        }
        const punctuationMatch = core.match(
          /(\s*[,;.!?。]+)$/
        );
        if (punctuationMatch) {
          trailingPunctuation = punctuationMatch[1];
          core = core.slice(
            0,
            -trailingPunctuation.length
          );
        }
        if (core.endsWith("(") && !core.includes(")")) {
          core = core.slice(0, -1).trimEnd();
          trailingPunctuation = ` (${trailingPunctuation}`;
        }
        const normalized = normalizeMathSource(core);
        if (!normalized) return fragment;
        return `${leadingWhitespace}${leadingPunctuation}\\(${normalized}\\)${trailingPunctuation}${trailingWhitespace}`;
      }
      function normalizeDollarMathDelimiters(value) {
        return String(value || "").replace(
          new RegExp("(?<!\\\\)\\$\\$([\\s\\S]*?)(?<!\\\\)\\$\\$", "g"),
          (_, expression) => `\\[${normalizeMathSource(
            expression
          )}\\]`
        ).replace(
          new RegExp("(?<!\\\\)\\$([^$\\n]+?)(?<!\\\\)\\$", "g"),
          (_, expression) => `\\(${normalizeMathSource(
            expression
          )}\\)`
        );
      }
      function formatAlgebraMathText(value) {
        if (value === null || value === void 0) {
          return "";
        }
        const source = normalizeDollarMathDelimiters(
          String(value).replace(/−/g, "-").replace(/\+\s*-/g, "-")
        );
        if (source.includes("\\(") || source.includes("\\[")) {
          return source;
        }
        return source.split(/([가-힣]+)/g).map(
          (fragment) => /[가-힣]/.test(fragment) ? fragment : wrapMathFragment(fragment)
        ).join("");
      }
      function formatAdminMath(value) {
        if (value === null || value === void 0 || value === "") {
          return "\uBBF8\uC751\uB2F5";
        }
        if (typeof value === "object") {
          try {
            return formatAlgebraMathText(
              JSON.stringify(value)
            );
          } catch (error) {
            return formatAlgebraMathText(
              String(value)
            );
          }
        }
        return formatAlgebraMathText(
          String(value)
        );
      }
      function formatAlgebraLesson(lesson) {
        if (!lesson) return lesson;
        return {
          ...lesson,
          clientMotionCaptions: Array.isArray(
            lesson.steps
          ) ? lesson.steps.map(
            (step) => String(step.description || "")
          ) : [],
          clientMotionStageLabels: Array.isArray(
            lesson.steps
          ) ? lesson.steps.map(
            (step) => String(step.title || "")
          ) : [],
          summary: formatAlgebraMathText(
            lesson.summary
          ),
          keyTakeaway: formatAlgebraMathText(
            lesson.keyTakeaway
          ),
          steps: Array.isArray(lesson.steps) ? lesson.steps.map((step) => ({
            ...step,
            title: formatAlgebraMathText(
              step.title
            ),
            description: formatAlgebraMathText(
              step.description
            )
          })) : [],
          dashboardPreview: lesson.dashboardPreview ? {
            ...lesson.dashboardPreview,
            formula: formatDashboardFormula(
              lesson.dashboardPreview.formula
            )
          } : lesson.dashboardPreview
        };
      }
      function formatDashboardFormula(value) {
        if (value === null || value === void 0) {
          return "";
        }
        const source = String(value);
        return DASHBOARD_FORMULA_OVERRIDES[source] || formatAlgebraMathText(source);
      }
      function formatMathTextForCourse(courseId, value) {
        return [
          "common-math-1",
          "common-math-2",
          "algebra",
          "probability-statistics"
        ].includes(courseId) ? formatAlgebraMathText(value) : String(value ?? "");
      }
      module.exports = {
        formatAdminMath,
        formatAlgebraMathText,
        normalizeDollarMathDelimiters,
        formatAlgebraLesson,
        formatDashboardFormula,
        formatMathTextForCourse
      };
    }
  });

  // services/mathAnswerService.js
  var require_mathAnswerService = __commonJS({
    "services/mathAnswerService.js"(exports, module) {
      function normalizeExpressionSource(value) {
        let source = String(value ?? "").trim().toLowerCase().replace(/^\s*\\\((.*)\\\)\s*$/s, "$1").replace(/^\s*\$(.*)\$\s*$/s, "$1").replace(/−/g, "-").replace(/[×·]/g, "*").replace(/÷/g, "/").replace(/\\(?:times|cdot)/g, "*").replace(/\\div/g, "/").replace(/\\pi/g, "pi").replace(/π/g, "pi").replace(/\s+/g, "");
        for (let index = 0; index < 6; index += 1) {
          const next = source.replace(
            /\\frac\{([^{}]+)\}\{([^{}]+)\}/g,
            "(($1)/($2))"
          ).replace(
            /\\sqrt\{([^{}]+)\}/g,
            "sqrt($1)"
          ).replace(
            /\\sqrt\[3\]\{([^{}]+)\}/g,
            "cbrt($1)"
          );
          if (next === source) break;
          source = next;
        }
        source = source.replace(/∛\(([^()]*)\)/g, "cbrt($1)").replace(/√\(([^()]*)\)/g, "sqrt($1)").replace(/∛(-?\d+(?:\.\d+)?)/g, "cbrt($1)").replace(/√(-?\d+(?:\.\d+)?)/g, "sqrt($1)").replace(/\bsqrt\{([^{}]+)\}/g, "sqrt($1)").replace(/\bcbrt\{([^{}]+)\}/g, "cbrt($1)").replace(
          new RegExp("(?<=[0-9.)])x(?=[0-9.(+-])", "g"),
          "*"
        );
        return source;
      }
      function tokenizeExpression(source) {
        const tokens = [];
        let index = 0;
        while (index < source.length) {
          const rest = source.slice(index);
          const number = rest.match(
            /^(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?/
          );
          if (number) {
            tokens.push({
              type: "number",
              value: Number(number[0])
            });
            index += number[0].length;
            continue;
          }
          const name = rest.match(
            /^(sqrt|cbrt|pi)/
          );
          if (name) {
            tokens.push({
              type: "name",
              value: name[1]
            });
            index += name[1].length;
            continue;
          }
          const character = source[index];
          if ("+-*/^()".includes(character)) {
            tokens.push({
              type: character === "(" || character === ")" ? "paren" : "operator",
              value: character
            });
            index += 1;
            continue;
          }
          return null;
        }
        return tokens;
      }
      function parseNumericExpression(value) {
        const source = normalizeExpressionSource(value);
        const tokens = tokenizeExpression(source);
        if (!tokens?.length) return null;
        let cursor = 0;
        const peek = () => tokens[cursor];
        const consume = () => tokens[cursor++];
        const startsPrimary = (token) => token?.type === "number" || token?.type === "name" || token?.type === "paren" && token.value === "(";
        function parsePrimary() {
          const token = consume();
          if (!token) {
            throw new Error("\uD45C\uD604\uC774 \uB05D\uB0AC\uC2B5\uB2C8\uB2E4.");
          }
          if (token.type === "number") {
            return token.value;
          }
          if (token.type === "name" && token.value === "pi") {
            return Math.PI;
          }
          if (token.type === "name" && ["sqrt", "cbrt"].includes(
            token.value
          )) {
            const opening = consume();
            if (opening?.type !== "paren" || opening.value !== "(") {
              throw new Error("\uADFC\uD638 \uAD04\uD638\uAC00 \uD544\uC694\uD569\uB2C8\uB2E4.");
            }
            const inner = parseExpression();
            const closing = consume();
            if (closing?.type !== "paren" || closing.value !== ")") {
              throw new Error("\uADFC\uD638 \uAD04\uD638\uAC00 \uB2EB\uD788\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.");
            }
            if (token.value === "sqrt") {
              if (inner < 0) {
                throw new Error("\uC2E4\uC218 \uBC94\uC704\uC758 \uADFC\uD638\uAC00 \uC544\uB2D9\uB2C8\uB2E4.");
              }
              return Math.sqrt(inner);
            }
            return Math.cbrt(inner);
          }
          if (token.type === "paren" && token.value === "(") {
            const inner = parseExpression();
            const closing = consume();
            if (closing?.type !== "paren" || closing.value !== ")") {
              throw new Error("\uAD04\uD638\uAC00 \uB2EB\uD788\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.");
            }
            return inner;
          }
          throw new Error("\uC22B\uC790 \uD45C\uD604\uC774 \uC544\uB2D9\uB2C8\uB2E4.");
        }
        function parseUnary() {
          const token = peek();
          if (token?.type === "operator" && ["+", "-"].includes(token.value)) {
            consume();
            const value2 = parseUnary();
            return token.value === "-" ? -value2 : value2;
          }
          return parsePrimary();
        }
        function parsePower() {
          let left = parseUnary();
          const token = peek();
          if (token?.type === "operator" && token.value === "^") {
            consume();
            left = left ** parsePower();
          }
          return left;
        }
        function parseTerm() {
          let left = parsePower();
          while (true) {
            const token = peek();
            const explicit = token?.type === "operator" && ["*", "/"].includes(
              token.value
            );
            const implicit = startsPrimary(token);
            if (!explicit && !implicit) break;
            if (explicit) consume();
            const right = parsePower();
            left = explicit && token.value === "/" ? left / right : left * right;
          }
          return left;
        }
        function parseExpression() {
          let left = parseTerm();
          while (true) {
            const token = peek();
            if (token?.type !== "operator" || !["+", "-"].includes(
              token.value
            )) {
              break;
            }
            consume();
            const right = parseTerm();
            left = token.value === "+" ? left + right : left - right;
          }
          return left;
        }
        try {
          const result = parseExpression();
          if (cursor !== tokens.length || !Number.isFinite(result)) {
            return null;
          }
          return result;
        } catch (error) {
          return null;
        }
      }
      function normalizeAnswerText(value) {
        return String(value ?? "").trim().toLowerCase().replace(/−/g, "-").replace(/[;，]/g, ",").replace(/\s+/g, "");
      }
      function answersEquivalent(expected, submitted) {
        const expectedText = normalizeAnswerText(expected);
        const submittedText = normalizeAnswerText(submitted);
        if (expectedText.includes(",") || submittedText.includes(",")) {
          const expectedParts = expectedText.split(",");
          const submittedParts = submittedText.split(",");
          return expectedParts.length === submittedParts.length && expectedParts.every(
            (part, index) => answersEquivalent(
              part,
              submittedParts[index]
            )
          );
        }
        const expectedNumber = parseNumericExpression(expectedText);
        const submittedNumber = parseNumericExpression(submittedText);
        if (expectedNumber !== null && submittedNumber !== null) {
          return Math.abs(
            expectedNumber - submittedNumber
          ) <= Math.max(
            1e-7,
            Math.abs(expectedNumber) * 1e-7
          );
        }
        return expectedText === submittedText;
      }
      module.exports = {
        normalizeExpressionSource,
        parseNumericExpression,
        normalizeAnswerText,
        answersEquivalent
      };
    }
  });

  // services/problemGenerators/utils.js
  var require_utils = __commonJS({
    "services/problemGenerators/utils.js"(exports, module) {
      function randomInteger(min, max) {
        return Math.floor(Math.random() * (max - min + 1)) + min;
      }
      function nonZeroInteger(min = -5, max = 5) {
        let value = 0;
        while (value === 0) {
          value = randomInteger(min, max);
        }
        return value;
      }
      var {
        answersEquivalent
      } = require_mathAnswerService();
      function isCorrectAnswer(expected, submitted) {
        return answersEquivalent(
          expected,
          submitted
        );
      }
      var InvalidGeneratedProblemError = class extends Error {
        constructor(message) {
          super(message);
          this.name = "InvalidGeneratedProblemError";
        }
      };
      var CALCULATOR_REQUIRED_PATTERN = /(?:계산기\s*(?:사용|필요|권장)|calculator\s*(?:required|recommended))/i;
      function validateCalculatorFreeProblem(problem, problemType) {
        const typeLabel = problemType?.id || "unknown-type";
        const calculatorFree = problem?.validation?.calculatorFree ?? problem?.calculatorFree ?? problemType?.calculatorFree;
        if (calculatorFree === false) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uACC4\uC0B0\uAE30 \uC5C6\uC774 \uD480 \uC218 \uC788\uB294 \uBB38\uC81C\uB85C \uAC80\uC99D\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.`
          );
        }
        const readableText = `${problem?.prompt || ""} ${problem?.solution || ""}`;
        if (CALCULATOR_REQUIRED_PATTERN.test(readableText)) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uACC4\uC0B0\uAE30 \uC0AC\uC6A9\uC774 \uD544\uC694\uD55C \uBB38\uAD6C\uAC00 \uD3EC\uD568\uB418\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.`
          );
        }
        const answer = String(problem?.answer ?? "").trim();
        if (!answer || answer.length > 120 || /NaN|undefined|null/i.test(answer)) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uACC4\uC0B0\uAE30 \uC5C6\uC774 \uAC80\uC0B0\uD560 \uC218 \uC788\uB294 \uC815\uB2F5 \uBC94\uC704\uB97C \uBC97\uC5B4\uB0AC\uC2B5\uB2C8\uB2E4.`
          );
        }
        if (problem?.calculatorValidation?.passed === false) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uC720\uD615\uBCC4 \uACC4\uC0B0 \uBCF5\uC7A1\uB3C4 \uAC80\uC99D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.`
          );
        }
        return true;
      }
      function hasOnlyFiniteNumbers(value) {
        if (typeof value === "number") {
          return Number.isFinite(value);
        }
        if (Array.isArray(value)) {
          return value.every(hasOnlyFiniteNumbers);
        }
        if (value && typeof value === "object") {
          return Object.values(value).every(
            hasOnlyFiniteNumbers
          );
        }
        return true;
      }
      function validateGeneratedProblem(problem, problemType) {
        const typeLabel = problemType?.id || "unknown-type";
        if (!problem || typeof problem !== "object") {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uC0DD\uC131 \uACB0\uACFC\uAC00 \uAC1D\uCCB4\uAC00 \uC544\uB2D9\uB2C8\uB2E4.`
          );
        }
        if (typeof problem.prompt !== "string" || !problem.prompt.trim()) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uBB38\uC81C \uBB38\uC7A5\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.`
          );
        }
        const dollarCount = (problem.prompt.match(/\$/g) || []).length;
        if (dollarCount % 2 !== 0) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uBB38\uC81C\uC758 \uC218\uC2DD \uAD6C\uBD84\uC790($)\uAC00 \uB2EB\uD788\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.`
          );
        }
        if (!["short-answer", "multiple-choice"].includes(
          problem.inputMode
        )) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uC9C0\uC6D0\uD558\uC9C0 \uC54A\uB294 \uC785\uB825 \uBC29\uC2DD\uC785\uB2C8\uB2E4.`
          );
        }
        if (problem.answer === void 0 || problem.answer === null || String(problem.answer).trim() === "") {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uC815\uB2F5\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.`
          );
        }
        if (typeof problem.answer === "number" && !Number.isFinite(problem.answer)) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uC815\uB2F5\uC774 \uC720\uD55C\uD55C \uC218\uAC00 \uC544\uB2D9\uB2C8\uB2E4.`
          );
        }
        if (typeof problem.solution !== "string" || !problem.solution.trim()) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uD480\uC774\uAC00 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.`
          );
        }
        validateCalculatorFreeProblem(problem, problemType);
        if (typeof problem.hintText !== "string" || !problem.hintText.trim()) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uD78C\uD2B8\uAC00 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4.`
          );
        }
        if (problem.inputMode === "multiple-choice") {
          if (!Array.isArray(problem.choices) || problem.choices.length < 2) {
            throw new InvalidGeneratedProblemError(
              `${typeLabel}: \uAC1D\uAD00\uC2DD \uBCF4\uAE30\uAC00 \uBD80\uC871\uD569\uB2C8\uB2E4.`
            );
          }
          const choiceKeys = problem.choices.map(
            (choice) => String(choice.key)
          );
          const choiceTexts = problem.choices.map(
            (choice) => String(choice.text).replace(/\s+/g, "").trim()
          );
          const uniqueChoiceKeys = new Set(choiceKeys);
          const uniqueChoiceTexts = new Set(
            choiceTexts
          );
          if (uniqueChoiceKeys.size !== choiceKeys.length) {
            throw new InvalidGeneratedProblemError(
              `${typeLabel}: \uAC1D\uAD00\uC2DD \uBCF4\uAE30 \uD0A4\uAC00 \uC911\uBCF5\uB429\uB2C8\uB2E4.`
            );
          }
          if (!uniqueChoiceKeys.has(
            String(problem.answer)
          )) {
            throw new InvalidGeneratedProblemError(
              `${typeLabel}: \uC815\uB2F5\uACFC \uC77C\uCE58\uD558\uB294 \uBCF4\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.`
            );
          }
          if (uniqueChoiceTexts.size !== choiceTexts.length) {
            throw new InvalidGeneratedProblemError(
              `${typeLabel}: \uAC19\uC740 \uB0B4\uC6A9\uC758 \uBCF4\uAE30\uAC00 \uC911\uBCF5\uB429\uB2C8\uB2E4.`
            );
          }
        }
        if (problem.visualization && !hasOnlyFiniteNumbers(
          problem.visualization
        )) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uADF8\uB798\uD504 \uB370\uC774\uD130\uC5D0 \uC720\uD6A8\uD558\uC9C0 \uC54A\uC740 \uC218\uAC00 \uC788\uC2B5\uB2C8\uB2E4.`
          );
        }
        const validityChecks = Array.isArray(
          problem.validityChecks
        ) ? problem.validityChecks : [];
        const failedCheck = validityChecks.find(
          (check) => !check?.passed
        );
        if (failedCheck) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: ${failedCheck.message || failedCheck.name || "\uC218\uD559\uC801 \uCD9C\uC81C \uC870\uAC74\uC744 \uB9CC\uC871\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."}`
          );
        }
        if (typeof problemType?.validate === "function" && !problemType.validate(problem)) {
          throw new InvalidGeneratedProblemError(
            `${typeLabel}: \uC720\uD615\uBCC4 \uAC80\uC99D\uC5D0 \uC2E4\uD328\uD588\uC2B5\uB2C8\uB2E4.`
          );
        }
        return true;
      }
      function generateValidProblem(problemType, maximumAttempts = 30) {
        let lastValidationError = null;
        for (let attempt = 0; attempt < maximumAttempts; attempt += 1) {
          let problem = null;
          try {
            problem = problemType.generate();
            validateGeneratedProblem(
              problem,
              problemType
            );
            return problem;
          } catch (error2) {
            if (!(error2 instanceof InvalidGeneratedProblemError)) {
              throw error2;
            }
            lastValidationError = error2;
          }
        }
        const error = new Error(
          `\uC720\uD6A8\uD55C \uBB38\uC81C\uB97C \uC0DD\uC131\uD558\uC9C0 \uBABB\uD588\uC2B5\uB2C8\uB2E4: ${problemType?.id || "unknown-type"}`
        );
        error.cause = lastValidationError;
        error.status = 503;
        throw error;
      }
      module.exports = {
        randomInteger,
        nonZeroInteger,
        isCorrectAnswer,
        validateCalculatorFreeProblem,
        validateGeneratedProblem,
        generateValidProblem
      };
    }
  });

  // services/problemGenerators/commonMath/generators.js
  var require_generators = __commonJS({
    "services/problemGenerators/commonMath/generators.js"(exports, module) {
      var { loadCurriculum } = require_curriculumService();
      var { CONCEPT_DETAILS } = require_commonMathLearningCatalog();
      var { formatAlgebraMathText } = require_mathTextService();
      var { isCorrectAnswer } = require_utils();
      var TYPE_BLUEPRINTS = [
        ["core-definition", "\uD575\uC2EC \uC815\uC758 \uD310\uBCC4", 1],
        ["formula-meaning", "\uB300\uD45C \uAD00\uACC4\uC2DD \uD574\uC11D", 2],
        ["condition-reading", "\uC870\uAC74\uACFC \uBC94\uC704 \uD655\uC778", 2],
        ["visual-representation", "\uADF8\uB9BC\xB7\uADF8\uB798\uD504\xB7\uD45C\uB85C \uD45C\uD604", 2],
        ["calculation-plan", "\uACC4\uC0B0 \uC21C\uC11C \uC124\uACC4", 3],
        ["reverse-reasoning", "\uACB0\uB860\uC5D0\uC11C \uC870\uAC74 \uC5ED\uCD94\uB860", 3],
        ["error-diagnosis", "\uC798\uBABB\uB41C \uD480\uC774 \uC9C4\uB2E8", 3],
        ["parameter-change", "\uC870\uAC74 \uBCC0\uD654 \uBE44\uAD50", 4],
        ["application-model", "\uC2E4\uC0DD\uD65C\xB7\uB3C4\uD615 \uC0C1\uD669 \uBAA8\uB378\uB9C1", 4],
        ["integrated-reasoning", "\uBCF5\uD569 \uC870\uAC74 \uC885\uD569", 5]
      ];
      function shuffled(values) {
        const result = values.slice();
        for (let index = result.length - 1; index > 0; index -= 1) {
          const target = Math.floor(Math.random() * (index + 1));
          [result[index], result[target]] = [result[target], result[index]];
        }
        return result;
      }
      function unique(values) {
        return [...new Set(values.map((value) => String(value || "").trim()).filter(Boolean))];
      }
      function multipleChoice({ prompt, correct, distractors, solution, hintText, visualization }) {
        const candidates = unique([correct, ...distractors]).slice(0, 4);
        while (candidates.length < 4) candidates.push(`\uC870\uAC74 ${candidates.length + 1}\uB9CC \uD655\uC778\uD55C\uB2E4.`);
        const choices = shuffled(candidates.map((text, originalIndex) => ({ text, isCorrect: originalIndex === 0 }))).map((choice, index) => ({
          key: ["a", "b", "c", "d"][index],
          text: formatAlgebraMathText(choice.text),
          isCorrect: choice.isCorrect
        }));
        return {
          prompt: formatAlgebraMathText(prompt),
          inputMode: "multiple-choice",
          choices,
          answer: choices.find((choice) => choice.isCorrect).key,
          solution: formatAlgebraMathText(solution),
          hintText: formatAlgebraMathText(hintText),
          visualization: visualization || null,
          validityChecks: [{ name: "common-math-choice", passed: choices.length === 4 }]
        };
      }
      function makeProblem({ concept, unitConcepts, variant, detail }) {
        const [title, takeaway, formula] = detail;
        const topics = concept.topics?.length ? concept.topics : [title];
        const visuals = concept.visualizationIdeas?.length ? concept.visualizationIdeas : [`${title}\uC758 \uC870\uAC74\uC744 \uC2DD\uACFC \uADF8\uB9BC\uC73C\uB85C \uD568\uAED8 \uB098\uD0C0\uB0B4\uAE30`];
        const scopes = concept.scopeNotes?.length ? concept.scopeNotes : [`${title}\uC758 \uC815\uC758\uC640 \uB300\uD45C\uC801\uC778 \uC801\uC6A9\uC744 \uC911\uC2EC\uC73C\uB85C \uB2E4\uB8EC\uB2E4.`];
        const otherDetails = unitConcepts.filter((item) => item.id !== concept.id).map((item) => CONCEPT_DETAILS[item.id]).filter(Boolean);
        const otherTakeaways = otherDetails.map((item) => item[1]);
        const otherFormulas = otherDetails.map((item) => item[2]);
        const topic = topics[variant % topics.length];
        const sharedDistractors = [
          "\uC815\uC758\uC5ED\uACFC \uC870\uAC74\uC740 \uD655\uC778\uD558\uC9C0 \uC54A\uACE0 \uB9C8\uC9C0\uB9C9 \uACC4\uC0B0\uAC12\uB9CC \uBE44\uAD50\uD55C\uB2E4.",
          "\uBAA8\uB4E0 \uAE30\uD638\uB97C \uAC19\uC740 \uAC12\uC73C\uB85C \uB450\uBA74 \uC5B8\uC81C\uB098 \uC131\uB9BD\uD55C\uB2E4\uACE0 \uBCF8\uB2E4.",
          "\uC2DD\uC758 \uBAA8\uC591\uC774 \uBE44\uC2B7\uD558\uBA74 \uC870\uAC74\uACFC \uAD00\uACC4\uC5C6\uC774 \uAC19\uC740 \uACF5\uC2DD\uC744 \uC0AC\uC6A9\uD55C\uB2E4."
        ];
        switch (variant) {
          case 0:
            return multipleChoice({
              prompt: `${title}\uC758 \uD575\uC2EC \uC758\uBBF8\uB85C \uAC00\uC7A5 \uC54C\uB9DE\uC740 \uAC83\uC744 \uACE0\uB974\uC138\uC694.`,
              correct: takeaway,
              distractors: otherTakeaways.concat(sharedDistractors),
              solution: `${title}\uC5D0\uC11C\uB294 ${takeaway}`,
              hintText: "\uACC4\uC0B0\uBCF4\uB2E4 \uBA3C\uC800 \uC815\uC758\uAC00 \uC5B4\uB5A4 \uB300\uC0C1\uC744 \uC5F0\uACB0\uD558\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694."
            });
          case 1:
            return multipleChoice({
              prompt: `${title}\uC744 \uC124\uBA85\uD558\uB294 \uB300\uD45C \uAD00\uACC4\uC2DD\uC73C\uB85C \uAC00\uC7A5 \uC54C\uB9DE\uC740 \uAC83\uC744 \uACE0\uB974\uC138\uC694.`,
              correct: formula,
              distractors: otherFormulas.concat(["x=0", "a+b=ab"]),
              solution: `\uB300\uD45C \uAD00\uACC4\uB294 ${formula}\uC785\uB2C8\uB2E4. \uAC01 \uAE30\uD638\uC758 \uC870\uAC74\uAE4C\uC9C0 \uD568\uAED8 \uAE30\uC5B5\uD574\uC57C \uD569\uB2C8\uB2E4.`,
              hintText: `${title}\uC758 \uC815\uC758\uB97C \uC2DD\uC73C\uB85C \uC62E\uAE34 \uAD00\uACC4\uB97C \uCC3E\uC73C\uC138\uC694.`
            });
          case 2:
            return multipleChoice({
              prompt: `${title} \uBB38\uC81C\uC5D0\uC11C \u2018${topic}\u2019\uC744 \uB2E4\uB8F0 \uB54C \uAC00\uC7A5 \uBA3C\uC800 \uD560 \uC77C\uC740 \uBB34\uC5C7\uC778\uAC00\uC694?`,
              correct: "\uC8FC\uC5B4\uC9C4 \uB300\uC0C1\uC758 \uBC94\uC704\uC640 \uC131\uB9BD \uC870\uAC74\uC744 \uD45C\uC2DC\uD55C\uB2E4.",
              distractors: sharedDistractors,
              solution: "\uC870\uAC74\uACFC \uBC94\uC704\uB97C \uBA3C\uC800 \uD45C\uC2DC\uD574\uC57C \uC774\uD6C4\uC758 \uC2DD \uBCC0\uD615\uACFC \uACC4\uC0B0\uC774 \uD5C8\uC6A9\uB418\uB294\uC9C0 \uD310\uB2E8\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
              hintText: "\uB2F5\uC744 \uACC4\uC0B0\uD558\uAE30 \uC804\uC5D0 \uBB34\uC5C7\uC774 \uD5C8\uC6A9\uB418\uB294\uC9C0 \uBA3C\uC800 \uD655\uC778\uD558\uC138\uC694."
            });
          case 3:
            return multipleChoice({
              prompt: `${title}\uC758 \u2018${topic}\u2019\uC744 \uC2DC\uAC01\uC801\uC73C\uB85C \uD655\uC778\uD558\uB294 \uBC29\uBC95\uC73C\uB85C \uAC00\uC7A5 \uC801\uC808\uD55C \uAC83\uC740 \uBB34\uC5C7\uC778\uAC00\uC694?`,
              correct: visuals[variant % visuals.length],
              distractors: ["\uC870\uAC74\uACFC \uBB34\uAD00\uD55C \uC7A5\uC2DD\uC6A9 \uADF8\uB798\uD504\uB97C \uADF8\uB9B0\uB2E4.", "\uBAA8\uB4E0 \uAC12\uC744 \uD55C \uC810\uC5D0 \uACB9\uCCD0 \uD45C\uC2DC\uD55C\uB2E4.", "\uACC4\uC0B0 \uACB0\uACFC\uB9CC \uC801\uACE0 \uAD00\uACC4\uB294 \uB098\uD0C0\uB0B4\uC9C0 \uC54A\uB294\uB2E4."],
              solution: `${visuals[variant % visuals.length]} \uBC29\uC2DD\uC740 \uC870\uAC74\uACFC \uACB0\uACFC\uAC00 \uD568\uAED8 \uBCC0\uD558\uB294 \uBAA8\uC2B5\uC744 \uBCF4\uC5EC\uC90D\uB2C8\uB2E4.`,
              hintText: "\uBB38\uC81C\uC758 \uC870\uAC74\uC774 \uBCC0\uD560 \uB54C \uADF8\uB9BC\uC758 \uC5B4\uB290 \uBD80\uBD84\uC774 \uD568\uAED8 \uC6C0\uC9C1\uC774\uB294\uC9C0 \uC0DD\uAC01\uD558\uC138\uC694.",
              visualization: { kind: "common-math-concept", conceptId: concept.id, focus: topic }
            });
          case 4:
            return multipleChoice({
              prompt: `${title} \uACC4\uC0B0\uC744 \uAC00\uC7A5 \uC548\uC804\uD558\uAC8C \uC9C4\uD589\uD558\uB294 \uC21C\uC11C\uB97C \uACE0\uB974\uC138\uC694.`,
              correct: "\uC815\uC758 \uD655\uC778 \u2192 \uC870\uAC74 \uD45C\uC2DC \u2192 \uAD00\uACC4\uC2DD \uC801\uC6A9 \u2192 \uACC4\uC0B0 \u2192 \uC6D0\uB798 \uC870\uAC74\uC73C\uB85C \uAC80\uC0B0",
              distractors: ["\uACC4\uC0B0 \u2192 \uACF5\uC2DD \uC120\uD0DD \u2192 \uC870\uAC74 \uC0DD\uB7B5 \u2192 \uB2F5", "\uACF5\uC2DD \uC554\uAE30 \u2192 \uC22B\uC790 \uB300\uC785 \u2192 \uC815\uC758 \uD655\uC778", "\uB2F5 \uCD94\uCE21 \u2192 \uC870\uAC74 \uBCC0\uACBD \u2192 \uACC4\uC0B0 \uC0DD\uB7B5"],
              solution: "\uC815\uC758\uC640 \uC870\uAC74\uC744 \uBA3C\uC800 \uD655\uC778\uD558\uACE0 \uACC4\uC0B0 \uD6C4 \uC6D0\uB798 \uC870\uAC74\uC5D0 \uB300\uC785\uD574 \uAC80\uC0B0\uD574\uC57C \uBD88\uD544\uC694\uD55C \uD574\uC640 \uBD80\uD638 \uC624\uB958\uB97C \uB9C9\uC744 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
              hintText: "\uACC4\uC0B0 \uC804\uACFC \uACC4\uC0B0 \uD6C4\uC5D0 \uAC01\uAC01 \uD655\uC778\uD560 \uD56D\uBAA9\uC744 \uCC3E\uC73C\uC138\uC694."
            });
          case 5:
            return multipleChoice({
              prompt: `${title}\uC5D0\uC11C \uACB0\uB860\uC774 \uC8FC\uC5B4\uC84C\uC744 \uB54C \uC870\uAC74\uC744 \uC5ED\uC73C\uB85C \uCC3E\uB294 \uC62C\uBC14\uB978 \uBC29\uBC95\uC740 \uBB34\uC5C7\uC778\uAC00\uC694?`,
              correct: "\uACB0\uB860\uC744 \uB300\uD45C \uAD00\uACC4\uC2DD\uC5D0 \uB300\uC785\uD558\uACE0, \uC5ED\uACFC \uC6D0\uB798 \uBA85\uC81C\uAC00 \uBAA8\uB450 \uC131\uB9BD\uD558\uB294\uC9C0 \uAC80\uC0B0\uD55C\uB2E4.",
              distractors: sharedDistractors,
              solution: "\uC5ED\uCD94\uB860\uC5D0\uC11C\uB294 \uC5ED\uC774 \uD56D\uC0C1 \uCC38\uC778 \uAC83\uC774 \uC544\uB2C8\uBBC0\uB85C \uC5BB\uC740 \uD6C4\uBCF4\uB97C \uBC18\uB4DC\uC2DC \uC6D0\uB798 \uC870\uAC74\uC5D0 \uB2E4\uC2DC \uB300\uC785\uD574\uC57C \uD569\uB2C8\uB2E4.",
              hintText: "\uD544\uC694\uC870\uAC74\uC73C\uB85C \uC5BB\uC740 \uD6C4\uBCF4\uC640 \uC2E4\uC81C \uD574\uB97C \uAD6C\uBD84\uD558\uC138\uC694."
            });
          case 6:
            return multipleChoice({
              prompt: `${title} \uD480\uC774\uC5D0\uC11C \uAC00\uC7A5 \uBA3C\uC800 \uC218\uC815\uD574\uC57C \uD560 \uC798\uBABB\uB41C \uC811\uADFC\uC744 \uACE0\uB974\uC138\uC694.`,
              correct: "\uC815\uC758\uC5ED\xB7\uBD80\uD638\xB7\uC911\uBCF5 \uAC00\uB2A5\uC131\uC744 \uD655\uC778\uD558\uC9C0 \uC54A\uACE0 \uC2DD\uC758 \uBAA8\uC591\uB9CC \uBCF4\uACE0 \uACF5\uC2DD\uC744 \uC801\uC6A9\uD55C\uB2E4.",
              distractors: ["\uAE30\uD638\uC758 \uB73B\uC744 \uBA3C\uC800 \uC801\uB294\uB2E4.", "\uACC4\uC0B0 \uB4A4 \uC6D0\uB798 \uC870\uAC74\uC5D0 \uB300\uC785\uD55C\uB2E4.", "\uC2DD\uACFC \uADF8\uB9BC\uC758 \uACB0\uACFC\uB97C \uC11C\uB85C \uBE44\uAD50\uD55C\uB2E4."],
              solution: "\uACF5\uC2DD\uC740 \uC131\uB9BD \uC870\uAC74 \uC548\uC5D0\uC11C\uB9CC \uC0AC\uC6A9\uD560 \uC218 \uC788\uC73C\uBBC0\uB85C \uC815\uC758\uC5ED, \uBD80\uD638, \uC911\uBCF5 \uC5EC\uBD80\uB97C \uBA3C\uC800 \uC810\uAC80\uD574\uC57C \uD569\uB2C8\uB2E4.",
              hintText: "\uACF5\uC2DD \uC790\uCCB4\uBCF4\uB2E4 \uACF5\uC2DD\uC774 \uC131\uB9BD\uD558\uB294 \uC870\uAC74\uC744 \uBCF4\uC138\uC694."
            });
          case 7:
            return multipleChoice({
              prompt: `${title}\uC5D0\uC11C \uC218\uB098 \uC870\uAC74 \uD558\uB098\uAC00 \uBC14\uB00C\uC5C8\uC744 \uB54C \uAC00\uC7A5 \uD0C0\uB2F9\uD55C \uB300\uC751\uC740 \uBB34\uC5C7\uC778\uAC00\uC694?`,
              correct: "\uBC14\uB010 \uC870\uAC74\uC774 \uC815\uC758\xB7\uBD80\uD638\xB7\uBC94\uC704\uC5D0 \uBBF8\uCE58\uB294 \uC601\uD5A5\uC744 \uBA3C\uC800 \uD655\uC778\uD55C \uB4A4 \uAC19\uC740 \uD574\uACB0 \uC808\uCC28\uB97C \uB2E4\uC2DC \uC801\uC6A9\uD55C\uB2E4.",
              distractors: sharedDistractors,
              solution: "\uC870\uAC74 \uBCC0\uD654\uB294 \uB2F5\uB9CC \uBC14\uAFB8\uB294 \uAC83\uC774 \uC544\uB2C8\uB77C \uC0AC\uC6A9\uD560 \uC218 \uC788\uB294 \uC131\uC9C8\uACFC \uD574\uC758 \uBC94\uC704\uB97C \uBC14\uAFC0 \uC218 \uC788\uC2B5\uB2C8\uB2E4.",
              hintText: "\uBCC0\uD55C \uC22B\uC790\uBCF4\uB2E4 \uADF8 \uC22B\uC790\uAC00 \uB9E1\uC740 \uC5ED\uD560\uC744 \uD655\uC778\uD558\uC138\uC694."
            });
          case 8:
            return multipleChoice({
              prompt: `\uC2E4\uC81C \uC0C1\uD669\uC744 ${title}\uC73C\uB85C \uBAA8\uB378\uB9C1\uD560 \uB54C \uAC00\uC7A5 \uC54C\uB9DE\uC740 \uCCAB \uB2E8\uACC4\uB294 \uBB34\uC5C7\uC778\uAC00\uC694?`,
              correct: "\uC0C1\uD669\uC758 \uB300\uC0C1\uACFC \uC870\uAC74\uC744 \uBCC0\uC218\xB7\uC9D1\uD569\xB7\uC88C\uD45C\xB7\uACBD\uC6B0 \uC911 \uC54C\uB9DE\uC740 \uC218\uD559\uC801 \uB300\uC0C1\uC73C\uB85C \uBC88\uC5ED\uD55C\uB2E4.",
              distractors: sharedDistractors,
              solution: "\uBAA8\uB378\uB9C1\uC740 \uBB38\uC7A5 \uC18D \uB300\uC0C1\uACFC \uC81C\uD55C\uC744 \uC218\uD559\uC801 \uAE30\uD638\uC640 \uC870\uAC74\uC73C\uB85C \uC815\uD655\uD788 \uBC88\uC5ED\uD558\uB294 \uAC83\uC5D0\uC11C \uC2DC\uC791\uD569\uB2C8\uB2E4.",
              hintText: "\uBB38\uC7A5 \uC18D \uBB34\uC5C7\uC744 \uBCC0\uC218\uB85C \uB458\uC9C0 \uBA3C\uC800 \uC815\uD558\uC138\uC694."
            });
          default:
            return multipleChoice({
              prompt: `${title}\uC758 \u2018${topic}\u2019\uC744 \uD3EC\uD568\uD55C \uC885\uD569 \uBB38\uC81C\uB97C \uD574\uACB0\uD560 \uB54C \uBC18\uB4DC\uC2DC \uC9C0\uCF1C\uC57C \uD560 \uC6D0\uCE59\uC744 \uACE0\uB974\uC138\uC694.`,
              correct: `${takeaway} \uADF8\uB9AC\uACE0 \uACC4\uC0B0 \uACB0\uACFC\uAC00 ${scopes[0]}\uC758 \uBC94\uC704\uB97C \uBC97\uC5B4\uB098\uC9C0 \uC54A\uB294\uC9C0 \uAC80\uC0B0\uD55C\uB2E4.`,
              distractors: sharedDistractors.concat(otherTakeaways),
              solution: `${title}\uC758 \uD575\uC2EC\uC740 ${takeaway} \uB9C8\uC9C0\uB9C9\uC5D0\uB294 \uC6D0\uB798 \uC870\uAC74\uACFC \uD559\uC2B5 \uBC94\uC704\uB97C \uBAA8\uB450 \uB9CC\uC871\uD558\uB294\uC9C0 \uD655\uC778\uD569\uB2C8\uB2E4.`,
              hintText: "\uD575\uC2EC \uAD00\uACC4\uC640 \uCD5C\uC885 \uAC80\uC0B0 \uC870\uAC74\uC744 \uB3D9\uC2DC\uC5D0 \uD3EC\uD568\uD55C \uC120\uD0DD\uC9C0\uB97C \uCC3E\uC73C\uC138\uC694."
            });
        }
      }
      function buildGeneratorMap() {
        const curriculum = loadCurriculum();
        const map = /* @__PURE__ */ new Map();
        for (const course of curriculum.courses.filter((item) => ["common-math-1", "common-math-2"].includes(item.id))) {
          for (const unit of course.units) {
            for (const concept of unit.concepts) {
              const detail = CONCEPT_DETAILS[concept.id];
              if (!detail) throw new Error(`\uACF5\uD1B5\uC218\uD559 \uBB38\uC81C \uBA54\uD0C0\uB370\uC774\uD130\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4: ${concept.id}`);
              const problemTypes = TYPE_BLUEPRINTS.map(([id, label, difficulty], variant) => ({
                id: `${concept.id}-${id}`,
                label: `\uC720\uD615 ${variant + 1} \xB7 ${label}`,
                difficulty,
                generate: () => makeProblem({ concept, unitConcepts: unit.concepts, variant, detail })
              }));
              map.set([course.id, unit.id, concept.id].join("/"), {
                key: `common-math-${concept.id}`,
                requiredDistinctTypes: 10,
                problemTypes,
                isCorrectAnswer
              });
            }
          }
        }
        return map;
      }
      var generatorMap = buildGeneratorMap();
      module.exports = { TYPE_BLUEPRINTS, generatorMap };
    }
  });

  // services/assessmentTemplates/commonMath/index.js
  var require_commonMath = __commonJS({
    "services/assessmentTemplates/commonMath/index.js"(exports, module) {
      var {
        generatorMap
      } = require_generators();
      var {
        generateValidProblem
      } = require_utils();
      var UNIT_CONCEPTS = [
        {
          courseId: "common-math-1",
          unitId: "polynomials",
          conceptIds: [
            "polynomial-arithmetic",
            "identity-remainder-theorem",
            "polynomial-factorization"
          ]
        },
        {
          courseId: "common-math-1",
          unitId: "equations-and-inequalities",
          conceptIds: [
            "complex-numbers",
            "quadratic-discriminant",
            "quadratic-roots-and-coefficients",
            "quadratic-equation-and-function",
            "parabola-and-line",
            "quadratic-max-min-restricted",
            "cubic-and-quartic-equations",
            "simultaneous-quadratic-equations",
            "simultaneous-linear-inequalities",
            "absolute-linear-inequalities",
            "quadratic-inequalities"
          ]
        },
        {
          courseId: "common-math-1",
          unitId: "counting",
          conceptIds: [
            "addition-and-multiplication-principles",
            "permutations",
            "combinations"
          ]
        },
        {
          courseId: "common-math-1",
          unitId: "matrices",
          conceptIds: ["matrix-concept", "matrix-operations"]
        },
        {
          courseId: "common-math-2",
          unitId: "coordinate-geometry",
          conceptIds: [
            "distance-and-internal-division",
            "parallel-and-perpendicular-lines",
            "point-line-distance",
            "circle-equation",
            "circle-line-position",
            "geometric-translation",
            "geometric-reflection"
          ]
        },
        {
          courseId: "common-math-2",
          unitId: "sets-and-propositions",
          conceptIds: [
            "set-concept-and-representation",
            "set-inclusion",
            "set-operations",
            "proposition-and-condition",
            "converse-and-contrapositive",
            "sufficient-and-necessary-conditions",
            "proof-by-contrapositive-and-contradiction",
            "absolute-inequality"
          ]
        },
        {
          courseId: "common-math-2",
          unitId: "functions-and-graphs",
          conceptIds: [
            "function-concept-and-graph",
            "composite-function",
            "inverse-function",
            "rational-function",
            "irrational-function"
          ]
        }
      ];
      function problemTypesForUnit({
        courseId,
        unitId,
        conceptIds
      }) {
        return conceptIds.flatMap((conceptId) => {
          const generator = generatorMap.get(
            [courseId, unitId, conceptId].join("/")
          );
          if (!generator) {
            throw new Error(
              `${courseId}/${unitId}/${conceptId}: \uACF5\uD1B5\uC218\uD559 \uBB38\uC81C \uC0DD\uC131\uAE30\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.`
            );
          }
          return generator.problemTypes.map((problemType) => ({
            conceptId,
            problemType
          }));
        });
      }
      function makeAdvancedTemplates(config) {
        const records = problemTypesForUnit(config);
        if (records.length < 20) {
          throw new Error(
            `${config.courseId}/${config.unitId}: \uD3C9\uAC00\uC6A9 \uC720\uD615\uC774 20\uAC1C \uBBF8\uB9CC\uC785\uB2C8\uB2E4.`
          );
        }
        return records.slice(0, 20).map(({ conceptId, problemType }, index) => {
          const generateAdvancedProblem = () => {
            const problem = generateValidProblem(problemType);
            return {
              ...problem,
              prompt: `\uB2E4\uC74C\uC740 ${problemType.label}\uC744 \uC5EC\uB7EC \uC870\uAC74\uACFC \uD568\uAED8 \uD310\uB2E8\uD558\uB294 \uC2EC\uD654 \uBB38\uD56D\uC785\uB2C8\uB2E4. ` + problem.prompt
            };
          };
          return {
            id: `${config.courseId}:${config.unitId}:advanced:${problemType.id}`,
            title: `\uC2EC\uD654 \uC720\uD615 ${index + 1} \xB7 ${problemType.label}`,
            difficulty: 4,
            level: "advanced",
            estimatedMinutes: 10,
            reasoningSteps: [
              "\uBB38\uC81C\uC758 \uB300\uC0C1\uACFC \uC131\uB9BD \uC870\uAC74\uC744 \uC2DD\xB7\uD45C\xB7\uADF8\uB798\uD504 \uC911 \uC54C\uB9DE\uC740 \uD45C\uD604\uC73C\uB85C \uBC14\uAFBC\uB2E4.",
              "\uD575\uC2EC \uC815\uC758\uC640 \uAD00\uACC4\uC2DD\uC744 \uC801\uC6A9\uD574 \uAC00\uB2A5\uD55C \uACB0\uB860\uC744 \uB2E8\uACC4\uC801\uC73C\uB85C \uC881\uD78C\uB2E4.",
              "\uAD6C\uD55C \uACB0\uACFC\uB97C \uC6D0\uB798 \uC870\uAC74\uC5D0 \uB2E4\uC2DC \uB300\uC785\uD574 \uC815\uC758\uC5ED\xB7\uBD80\uD638\xB7\uC911\uBCF5\uC744 \uAC80\uC0B0\uD55C\uB2E4."
            ],
            requiredConceptIds: [conceptId],
            stages: [
              {
                id: "learned-concepts-only",
                requiredConceptIds: [conceptId],
                generate: generateAdvancedProblem
              }
            ],
            referenceArchetypeId: problemType.id,
            sourcePattern: "\uACF5\uD1B5\uC218\uD559 \uC815\uC758\xB7\uC870\uAC74\xB7\uC2DC\uAC01\uD45C\uD604\uC744 \uACB0\uD569\uD55C \uB2E4\uB2E8\uACC4 \uCD94\uB860",
            generate: generateAdvancedProblem,
            validate(problem) {
              return Array.isArray(problem?.validityChecks) && problem.validityChecks.every((check) => check.passed);
            }
          };
        });
      }
      var configs = UNIT_CONCEPTS.map((config) => ({
        ...config,
        requiredConceptIds: config.conceptIds.slice(),
        minimumAppliedPoolSize: 15,
        appliedPolicy: {
          includeBankTypes: false,
          minimumLocalDifficulty: 2
        },
        advancedTemplates: makeAdvancedTemplates(config)
      }));
      module.exports = configs;
    }
  });

  // services/assessmentTemplates/shared.js
  var require_shared = __commonJS({
    "services/assessmentTemplates/shared.js"(exports, module) {
      var {
        isCorrectAnswer
      } = require_utils();
      function randomInteger(min, max) {
        return Math.floor(
          Math.random() * (max - min + 1)
        ) + min;
      }
      function choose(values) {
        return values[randomInteger(
          0,
          values.length - 1
        )];
      }
      function nonZeroInteger(min = -5, max = 5) {
        let value = 0;
        while (value === 0) {
          value = randomInteger(
            min,
            max
          );
        }
        return value;
      }
      function gcd(left, right) {
        let a = Math.abs(left);
        let b = Math.abs(right);
        while (b) {
          [a, b] = [b, a % b];
        }
        return a || 1;
      }
      function fraction(numerator, denominator) {
        if (denominator === 0) {
          throw new Error(
            "\uBD84\uBAA8\uB294 0\uC77C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
          );
        }
        const sign = denominator < 0 ? -1 : 1;
        const common = gcd(
          numerator,
          denominator
        );
        const top = sign * numerator / common;
        const bottom = Math.abs(denominator) / common;
        return bottom === 1 ? String(top) : `${top}/${bottom}`;
      }
      function nCr(n, r) {
        if (r < 0 || r > n || !Number.isInteger(n) || !Number.isInteger(r)) {
          return 0;
        }
        const k = Math.min(r, n - r);
        let value = 1;
        for (let index = 1; index <= k; index += 1) {
          value = value * (n - k + index) / index;
        }
        return Math.round(value);
      }
      function power(value, exponent) {
        return value ** exponent;
      }
      function signed(value) {
        if (value === 0) return "";
        return value > 0 ? `+${value}` : `${value}`;
      }
      function polynomialTerm(coefficient, exponent, variable = "x") {
        if (coefficient === 0) return "";
        const magnitude = Math.abs(coefficient);
        const coefficientText = exponent > 0 && magnitude === 1 ? "" : String(magnitude);
        const variableText = exponent === 0 ? "" : exponent === 1 ? variable : `${variable}^{${exponent}}`;
        return `${coefficient < 0 ? "-" : ""}${coefficientText}${variableText}`;
      }
      function polynomialTex(coefficients, variable = "x") {
        let result = "";
        for (let exponent = coefficients.length - 1; exponent >= 0; exponent -= 1) {
          const coefficient = coefficients[exponent];
          if (!coefficient) continue;
          const term = polynomialTerm(
            coefficient,
            exponent,
            variable
          );
          if (!result) {
            result = term;
          } else if (coefficient > 0) {
            result += `+${term}`;
          } else {
            result += term;
          }
        }
        return result || "0";
      }
      function linearFactor(root, variable = "x") {
        if (root === 0) return variable;
        return root > 0 ? `${variable}-${root}` : `${variable}+${Math.abs(
          root
        )}`;
      }
      function finiteAnswer(answer) {
        if (typeof answer === "number") {
          return Number.isFinite(answer);
        }
        const value = String(answer).trim();
        return Boolean(value) && !/NaN|Infinity|undefined|null/.test(
          value
        );
      }
      function makeShortAnswer({
        prompt,
        answer,
        independentAnswer,
        solution,
        hintText,
        visualization = null,
        checks = []
      }) {
        const verified = independentAnswer === void 0 ? answer : independentAnswer;
        return {
          prompt,
          inputMode: "short-answer",
          choices: [],
          answer,
          solution,
          hintText,
          visualization,
          validityChecks: [
            {
              name: "finite-answer",
              passed: finiteAnswer(answer),
              message: "\uC815\uB2F5\uC774 \uC720\uD55C\uD55C \uAC12\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4."
            },
            {
              name: "independent-solution-check",
              passed: isCorrectAnswer(
                answer,
                verified
              ),
              message: "\uC0DD\uC131\uC2DD\uACFC \uB3C5\uB9BD \uAC80\uC0B0\uC2DD\uC758 \uB2F5\uC774 \uB2E4\uB985\uB2C8\uB2E4."
            },
            {
              name: "unique-solution",
              passed: true,
              message: "\uC8FC\uC5B4\uC9C4 \uC870\uAC74\uC5D0\uC11C \uC815\uB2F5\uC774 \uD558\uB098\uB85C \uACB0\uC815\uB418\uC5B4\uC57C \uD569\uB2C8\uB2E4."
            },
            ...checks
          ]
        };
      }
      function defineAdvancedTemplates({
        courseId,
        unitId,
        requiredConceptIds,
        families
      }) {
        return families.flatMap(
          (family, familyIndex) => [0, 1].map((mode) => {
            const reasoningSteps = family.reasoningSteps[mode] || family.reasoningSteps[0];
            const title = family.titles[mode];
            const id = `${courseId}:${unitId}:advanced:${family.id}-${mode + 1}`;
            const templateRequiredConceptIds = (family.requiredConceptIds || requiredConceptIds).slice();
            if (!Array.isArray(
              reasoningSteps
            ) || reasoningSteps.length < 3) {
              throw new Error(
                `${id}: \uC2EC\uD654 \uC720\uD615\uC740 \uD480\uC774 \uB2E8\uACC4\uAC00 3\uAC1C \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.`
              );
            }
            return {
              id,
              title,
              difficulty: 4,
              level: "advanced",
              estimatedMinutes: family.estimatedMinutes?.[mode] || family.estimatedMinutes || 10,
              reasoningSteps,
              requiredConceptIds: templateRequiredConceptIds,
              stages: (family.stages || [
                {
                  id: family.stageId || "learned-concepts-only",
                  requiredConceptIds: templateRequiredConceptIds,
                  generate: family.generate
                }
              ]).map((stage) => ({
                id: stage.id,
                requiredConceptIds: (stage.requiredConceptIds || templateRequiredConceptIds).slice(),
                generate: () => stage.generate(mode)
              })),
              referenceArchetypeId: family.referenceArchetypeId || family.id,
              sourcePattern: family.sourcePattern,
              generate() {
                return family.generate(
                  mode
                );
              },
              validate(problem) {
                return finiteAnswer(
                  problem.answer
                ) && problem.validityChecks.every(
                  (check) => check.passed
                );
              }
            };
          })
        );
      }
      function selectDeepestLearnedStage(stages, allowedConceptIds) {
        const allowed = new Set(
          allowedConceptIds
        );
        return stages.filter(
          (stage) => (stage.requiredConceptIds || []).every(
            (conceptId) => allowed.has(conceptId)
          )
        ).sort(
          (left, right) => (right.requiredConceptIds || []).length - (left.requiredConceptIds || []).length
        )[0] || null;
      }
      module.exports = {
        randomInteger,
        choose,
        nonZeroInteger,
        gcd,
        fraction,
        nCr,
        power,
        signed,
        polynomialTerm,
        polynomialTex,
        linearFactor,
        makeShortAnswer,
        defineAdvancedTemplates,
        selectDeepestLearnedStage
      };
    }
  });

  // services/assessmentTemplates/algebra/exponentialLogarithmicFunctions.js
  var require_exponentialLogarithmicFunctions = __commonJS({
    "services/assessmentTemplates/algebra/exponentialLogarithmicFunctions.js"(exports, module) {
      var {
        randomInteger,
        choose,
        fraction,
        power,
        makeShortAnswer,
        defineAdvancedTemplates
      } = require_shared();
      var courseId = "algebra";
      var unitId = "exponential-logarithmic-functions";
      var requiredConceptIds = [
        "algebra-01-01",
        "algebra-01-02",
        "algebra-01-03",
        "algebra-01-04",
        "algebra-01-05",
        "algebra-01-06",
        "algebra-01-07",
        "algebra-01-08"
      ];
      var families = [
        {
          id: "exponential-quadratic-roots",
          titles: [
            "\uC9C0\uC218 \uCE58\uD658 \uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uB450 \uD574 \uD569",
            "\uC9C0\uC218 \uCE58\uD658 \uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uB450 \uD574 \uACF1"
          ],
          sourcePattern: "\uC9C0\uC218\uBC29\uC815\uC2DD\uC744 a^x\uC5D0 \uB300\uD55C \uC774\uCC28\uC2DD\uC73C\uB85C \uCE58\uD658\uD55C \uB4A4 \uC591\uC218 \uC870\uAC74\uACFC \uB85C\uADF8\uB97C \uCC28\uB840\uB85C \uC801\uC6A9",
          estimatedMinutes: [10, 10],
          reasoningSteps: [
            [
              "t=a^x\uB85C \uCE58\uD658\uD55C\uB2E4.",
              "t\uC5D0 \uB300\uD55C \uC774\uCC28\uBC29\uC815\uC2DD\uC744 \uC778\uC218\uBD84\uD574\uD55C\uB2E4.",
              "\uAC01 t\uB97C \uC9C0\uC218 \uAF34\uB85C \uB418\uB3CC\uB824 x\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uD574\uC758 \uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "t=a^x\uB85C \uCE58\uD658\uD55C\uB2E4.",
              "t\uC758 \uB450 \uC591\uC758 \uADFC\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC9C0\uC218\uD568\uC218\uC758 \uC77C\uB300\uC77C\uC131\uC744 \uC774\uC6A9\uD574 x\uB97C \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uB450 \uD574\uC758 \uACF1\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const base = choose([2, 3]);
            const left = randomInteger(
              1,
              3
            );
            const right = left + randomInteger(2, 4);
            const sum = power(base, left) + power(base, right);
            const product = power(
              base,
              left + right
            );
            const answer = mode === 0 ? left + right : left * right;
            return makeShortAnswer({
              prompt: `$${base}^{2x}-${sum}\\cdot${base}^{x}+${product}=0$\uC758 \uC11C\uB85C \uB2E4\uB978 \uB450 \uC2E4\uADFC\uC744 $\\alpha,\\beta$\uB77C \uD560 \uB54C, $${mode === 0 ? "\\alpha+\\beta" : "\\alpha\\beta"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? left + right : left * right,
              solution: `$t=${base}^{x}>0$\uC73C\uB85C \uB193\uC73C\uBA74 $(t-${power(
                base,
                left
              )})(t-${power(
                base,
                right
              )})=0$\uC774\uB2E4. \uB530\uB77C\uC11C $x=${left},${right}$\uC774\uACE0, \uC694\uAD6C\uD55C \uAC12\uC740 $${answer}$\uC774\uB2E4.`,
              hintText: "\uC9C0\uC218\uC2DD \uC804\uCCB4\uB97C \uD55C \uBB38\uC790\uB85C \uCE58\uD658\uD55C \uB4A4 \uC591\uC758 \uADFC\uB9CC \uB418\uB3CC\uB9AC\uC138\uC694."
            });
          }
        },
        {
          id: "log-system-order",
          titles: [
            "\uB85C\uADF8 \uD569\xB7\uC81C\uACF1\uD569\uC5D0\uC11C \uB85C\uADF8\uC758 \uCC28 \uBCF5\uC6D0",
            "\uB85C\uADF8 \uD569\xB7\uC81C\uACF1\uD569\uC5D0\uC11C \uAC00\uC911 \uB85C\uADF8 \uBCF5\uC6D0"
          ],
          sourcePattern: "\uB85C\uADF8\uAC12\uC744 \uB450 \uBBF8\uC9C0\uC218\uB85C \uB193\uACE0 \uB300\uCE6D\uC2DD\uACFC \uB300\uC18C \uC870\uAC74\uC73C\uB85C \uAC01\uAC01\uC758 \uAC12\uC744 \uBCF5\uC6D0",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "u=log_a x, v=log_a y\uB85C \uB193\uB294\uB2E4.",
              "\uD569\uACFC \uC81C\uACF1\uD569\uC5D0\uC11C uv\uB97C \uAD6C\uD55C\uB2E4.",
              "u,v\uB97C \uB450 \uADFC\uC73C\uB85C \uAC16\uB294 \uC774\uCC28\uBC29\uC815\uC2DD\uC744 \uB9CC\uB4E0\uB2E4.",
              "x>y \uC870\uAC74\uC73C\uB85C \uC21C\uC11C\uB97C \uC815\uD574 \uCC28\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uB450 \uB85C\uADF8\uB97C u,v\uB85C \uCE58\uD658\uD55C\uB2E4.",
              "\uB300\uCE6D\uC2DD\uC73C\uB85C \uACF1 uv\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC774\uCC28\uBC29\uC815\uC2DD\uACFC \uB300\uC18C \uC870\uAC74\uC73C\uB85C u,v\uB97C \uAD6C\uBD84\uD55C\uB2E4.",
              "\uB85C\uADF8 \uC131\uC9C8\uB85C \uBAA9\uD45C\uC2DD\uC744 \uC120\uD615\uACB0\uD569\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const base = choose([2, 3, 5]);
            const low = randomInteger(1, 3);
            const high = low + randomInteger(2, 4);
            const sum = low + high;
            const squares = low ** 2 + high ** 2;
            const answer = mode === 0 ? high - low : 2 * high + low;
            return makeShortAnswer({
              prompt: `\uC591\uC218 $x,y$\uAC00 $x>y$, $\\log_{${base}}x+\\log_{${base}}y=${sum}$, $(\\log_{${base}}x)^2+(\\log_{${base}}y)^2=${squares}$\uB97C \uB9CC\uC871\uD55C\uB2E4. $${mode === 0 ? `\\log_{${base}}\\dfrac{x}{y}` : `\\log_{${base}}(x^2y)`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? high - low : 2 * high + low,
              solution: `$u=\\log_{${base}}x$, $v=\\log_{${base}}y$\uB77C \uD558\uC790. $uv=\\{${sum}^2-${squares}\\}/2=${high * low}$\uC774\uBBC0\uB85C $u,v$\uB294 $t^2-${sum}t+${high * low}=0$\uC758 \uB450 \uADFC\uC774\uB2E4. $x>y$\uC5D0\uC11C $u=${high},v=${low}$\uC774\uBBC0\uB85C \uB2F5\uC740 $${answer}$\uC774\uB2E4.`,
              hintText: "\uB450 \uB85C\uADF8\uAC12\uC758 \uD569\uACFC \uACF1\uC744 \uBA3C\uC800 \uB9CC\uB4E0 \uB4A4 \uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uB450 \uADFC\uC73C\uB85C \uBCF4\uC138\uC694."
            });
          }
        },
        {
          id: "symmetric-exponential-intersections",
          titles: [
            "\uB300\uCE6D \uC9C0\uC218\uD568\uC218 \uAD50\uC810\uC758 x\uC88C\uD45C \uD569",
            "\uB300\uCE6D \uC9C0\uC218\uD568\uC218 \uAD50\uC810 \uC0AC\uC774 \uAC70\uB9AC"
          ],
          sourcePattern: "a^x+a^{m-x}\uC758 \uB300\uCE6D\uC131\uACFC \uC9C0\uC218 \uCE58\uD658\uC744 \uD568\uAED8 \uC774\uC6A9\uD558\uB294 \uAD50\uC810 \uC720\uD615",
          estimatedMinutes: [11, 11],
          reasoningSteps: [
            [
              "t=a^x\uB85C \uCE58\uD658\uD574 \uBD84\uBAA8\uB97C \uC81C\uAC70\uD55C\uB2E4.",
              "t\uC5D0 \uB300\uD55C \uC774\uCC28\uBC29\uC815\uC2DD\uC744 \uC778\uC218\uBD84\uD574\uD55C\uB2E4.",
              "\uB450 \uAD50\uC810\uC758 x\uC88C\uD45C\uB97C \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uB300\uCE6D\uCD95\uC744 \uD655\uC778\uD574 \uD569\uC744 \uAC80\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uC9C0\uC218 \uCE58\uD658\uC73C\uB85C \uB450 \uC591\uC758 \uADFC\uC744 \uCC3E\uB294\uB2E4.",
              "\uC77C\uB300\uC77C\uC131\uC744 \uC774\uC6A9\uD574 \uB450 x\uC88C\uD45C\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uC88C\uD45C\uC758 \uC21C\uC11C\uB97C \uC815\uD55C\uB2E4.",
              "\uAD50\uC810 \uC0AC\uC774\uC758 \uAC70\uB9AC\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const base = choose([2, 3]);
            const total = randomInteger(
              5,
              8
            );
            const left = randomInteger(
              1,
              Math.floor(total / 2) - 1
            );
            const right = total - left;
            const constant = power(base, left) + power(base, right);
            const answer = mode === 0 ? total : right - left;
            return makeShortAnswer({
              prompt: `\uBC29\uC815\uC2DD $${base}^{x}+${base}^{${total}-x}=${constant}$\uC758 \uC11C\uB85C \uB2E4\uB978 \uB450 \uC2E4\uADFC\uC744 $\\alpha<\\beta$\uB77C \uD560 \uB54C, $${mode === 0 ? "\\alpha+\\beta" : "\\beta-\\alpha"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? left + right : right - left,
              solution: `$t=${base}^{x}$\uB85C \uB193\uACE0 ${base}^{x}\uB97C \uACF1\uD574 \uC815\uB9AC\uD558\uBA74 $t^2-${constant}t+${power(
                base,
                total
              )}=0$\uC774\uB2E4. \uB450 \uADFC\uC740 $${base}^{${left}},${base}^{${right}}$\uC774\uBBC0\uB85C $\\alpha=${left},\\beta=${right}$\uC774\uACE0 \uB2F5\uC740 $${answer}$\uC774\uB2E4.`,
              hintText: "\uB450 \uBC88\uC9F8 \uC9C0\uC218\uD56D\uC744 a^m/a^x\uB85C \uBC14\uAFBC \uB4A4 a^x\uB97C \uCE58\uD658\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "common-log-place-value",
          titles: [
            "\uC0C1\uC6A9\uB85C\uADF8\uB85C \uD070 \uC218\uC758 \uC790\uB9BF\uC218 \uD310\uC815",
            "\uC0C1\uC6A9\uB85C\uADF8\uB85C \uC791\uC740 \uC218\uC758 \uCCAB \uC720\uD6A8\uC790\uB9AC \uC704\uCE58 \uD310\uC815"
          ],
          sourcePattern: "\uC0C1\uC6A9\uB85C\uADF8\uC758 \uC815\uC218\uBD80\uBD84\uC744 \uC2E4\uC81C \uC218\uC758 \uC790\uB9BF\uC218 \uB610\uB294 \uC18C\uC218\uC810 \uC704\uCE58\uB85C \uD574\uC11D",
          estimatedMinutes: [10, 10],
          reasoningSteps: [
            [
              "\uC8FC\uC5B4\uC9C4 \uB85C\uADF8\uAC12\uC73C\uB85C \uBC11\uC758 \uC0C1\uC6A9\uB85C\uADF8\uB97C \uB9CC\uB4E0\uB2E4.",
              "\uAC70\uB4ED\uC81C\uACF1\uC758 \uB85C\uADF8\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uB85C\uADF8\uC758 \uC815\uC218\uBD80\uBD84\uC744 \uCC3E\uB294\uB2E4.",
              "\uC815\uC218\uC758 \uC790\uB9BF\uC218\uB85C \uBCC0\uD658\uD55C\uB2E4."
            ],
            [
              "\uC74C\uC758 \uC9C0\uC218\uC758 \uC0C1\uC6A9\uB85C\uADF8\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uD2B9\uC131\uC758 \uBC94\uC704\uB97C \uC815\uD55C\uB2E4.",
              "\uC6D0\uB798 \uC218\uAC00 \uB193\uC774\uB294 10\uC758 \uAC70\uB4ED\uC81C\uACF1 \uAD6C\uAC04\uC744 \uCC3E\uB294\uB2E4.",
              "\uC18C\uC218\uC810 \uC544\uB798 \uCCAB \uC720\uD6A8\uC790\uB9AC \uC704\uCE58\uB97C \uACB0\uC815\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const exponent = randomInteger(
              18,
              32
            );
            const log2 = 0.301;
            const logValue = exponent * log2;
            const digits = Math.floor(logValue) + 1;
            const firstPlace = Math.floor(logValue) + 1;
            const answer = mode === 0 ? digits : firstPlace;
            return makeShortAnswer({
              prompt: `$\\log 2=0.3010$\uC73C\uB85C \uACC4\uC0B0\uD560 \uB54C, ${mode === 0 ? `$2^{${exponent}}$\uC758 \uC790\uB9BF\uC218` : `$2^{-${exponent}}$\uC5D0\uC11C \uC18C\uC218\uC810 \uC544\uB798 \uCC98\uC74C\uC73C\uB85C 0\uC774 \uC544\uB2CC \uC22B\uC790\uAC00 \uB098\uD0C0\uB098\uB294 \uC790\uB9AC`}\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? Math.floor(
                exponent * 0.301
              ) + 1 : Math.floor(
                exponent * 0.301
              ) + 1,
              solution: `$${exponent}\\log2=${logValue.toFixed(
                4
              )}$. ${mode === 0 ? `\uB530\uB77C\uC11C $10^{${digits - 1}}<2^{${exponent}}<10^{${digits}}$\uC774\uBBC0\uB85C ${digits}\uC790\uB9AC\uC774\uB2E4.` : `\uB530\uB77C\uC11C $10^{-${firstPlace}}<2^{-${exponent}}<10^{-${firstPlace - 1}}$\uC758 \uACBD\uACC4\uB97C \uD574\uC11D\uD558\uBA74 \uCCAB \uC720\uD6A8\uC22B\uC790\uB294 \uC18C\uC218\uC810 \uC544\uB798 ${firstPlace}\uBC88\uC9F8\uC5D0 \uB098\uD0C0\uB09C\uB2E4.`}`,
              hintText: "\uC0C1\uC6A9\uB85C\uADF8\uC758 \uC815\uC218\uBD80\uBD84\uC744 10\uC758 \uAC70\uB4ED\uC81C\uACF1 \uAD6C\uAC04\uC73C\uB85C \uBC14\uAFB8\uC138\uC694."
            });
          }
        },
        {
          id: "exponential-inequality-integers",
          titles: [
            "\uC9C0\uC218 \uC774\uCC28\uBD80\uB4F1\uC2DD\uC758 \uC815\uC218\uD574 \uAC1C\uC218",
            "\uB85C\uADF8 \uC774\uCC28\uBD80\uB4F1\uC2DD\uC758 \uC790\uC5F0\uC218\uD574 \uAC1C\uC218"
          ],
          sourcePattern: "\uCE58\uD658 \uBD80\uB4F1\uC2DD\uC758 \uADFC \uAD6C\uAC04\uC744 \uC6D0\uB798 \uBCC0\uC218\uC758 \uC815\uC218\xB7\uC790\uC5F0\uC218 \uC870\uAC74\uACFC \uACB0\uD569",
          estimatedMinutes: [12, 12],
          reasoningSteps: [
            [
              "t=a^x\uB85C \uCE58\uD658\uD55C\uB2E4.",
              "\uC774\uCC28\uBD80\uB4F1\uC2DD\uC758 t \uAD6C\uAC04\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC9C0\uC218\uD568\uC218\uC758 \uB2E8\uC870\uC131\uC73C\uB85C x \uAD6C\uAC04\uC744 \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uB05D\uC810 \uD3EC\uD568 \uC5EC\uBD80\uB97C \uD655\uC778\uD574 \uC815\uC218\uD574\uB97C \uC13C\uB2E4."
            ],
            [
              "u=log_a x\uB85C \uCE58\uD658\uD55C\uB2E4.",
              "u\uC5D0 \uB300\uD55C \uC774\uCC28\uBD80\uB4F1\uC2DD\uC744 \uD47C\uB2E4.",
              "\uB85C\uADF8\uC758 \uB2E8\uC870\uC131\uC73C\uB85C x \uBC94\uC704\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC790\uC5F0\uC218 \uC870\uAC74\uC744 \uC801\uC6A9\uD574 \uAC1C\uC218\uB97C \uC13C\uB2E4."
            ]
          ],
          generate(mode) {
            const base = choose([2, 3]);
            const left = randomInteger(
              1,
              2
            );
            const right = left + randomInteger(2, 3);
            const answer = mode === 0 ? right - left + 1 : power(base, right) - power(base, left) + 1;
            if (mode === 0) {
              const sum = power(base, left) + power(base, right);
              const product = power(
                base,
                left + right
              );
              return makeShortAnswer({
                prompt: `\uBD80\uB4F1\uC2DD $${base}^{2x}-${sum}\\cdot${base}^{x}+${product}\\le0$\uC744 \uB9CC\uC871\uD558\uB294 \uC815\uC218 $x$\uC758 \uAC1C\uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
                answer,
                independentAnswer: right - left + 1,
                solution: `$t=${base}^{x}$\uB85C \uB193\uC73C\uBA74 $(t-${power(
                  base,
                  left
                )})(t-${power(
                  base,
                  right
                )})\\le0$\uC774\uB2E4. \uB530\uB77C\uC11C $${left}\\le x\\le${right}$\uC774\uACE0 \uC815\uC218\uD574\uB294 ${answer}\uAC1C\uC774\uB2E4.`,
                hintText: "\uC9C0\uC218 \uCE58\uD658 \uD6C4 \uADFC \uC0AC\uC774 \uAD6C\uAC04\uC744 \uAD6C\uD558\uACE0 \uB2E4\uC2DC x\uC758 \uBC94\uC704\uB85C \uB3CC\uC544\uC624\uC138\uC694."
              });
            }
            return makeShortAnswer({
              prompt: `\uBD80\uB4F1\uC2DD $(\\log_{${base}}x-${left})(\\log_{${base}}x-${right})\\le0$\uC744 \uB9CC\uC871\uD558\uB294 \uC790\uC5F0\uC218 $x$\uC758 \uAC1C\uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: power(base, right) - power(base, left) + 1,
              solution: `$${left}\\le\\log_{${base}}x\\le${right}$\uC774\uACE0 \uBC11\uC774 1\uBCF4\uB2E4 \uD06C\uBBC0\uB85C $${power(
                base,
                left
              )}\\le x\\le${power(
                base,
                right
              )}$. \uC790\uC5F0\uC218\uB294 ${answer}\uAC1C\uC774\uB2E4.`,
              hintText: "\uB85C\uADF8\uAC12\uC758 \uBC94\uC704\uB97C \uBA3C\uC800 \uAD6C\uD55C \uB4A4 \uBC11\uC774 1\uBCF4\uB2E4 \uD070\uC9C0 \uD655\uC778\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "nested-change-of-base",
          titles: [
            "\uC5F0\uC1C4 \uB85C\uADF8 \uC870\uAC74\uC5D0\uC11C \uBC11\uBCC0\uD658 \uAC12 \uBCF5\uC6D0",
            "\uB85C\uADF8\uC758 \uBC11\uC774 \uC774\uC5B4\uC9C0\uB294 \uC870\uAC74\uC5D0\uC11C \uC5ED\uC218 \uB85C\uADF8 \uACC4\uC0B0"
          ],
          sourcePattern: "log_a x\uC640 log_x y\uB97C \uC5F0\uACB0\uD574 log_a y\uB97C \uB9CC\uB4E0 \uB4A4 \uBC11\uBCC0\uD658\uACFC \uC5ED\uC218 \uAD00\uACC4\uB97C \uC801\uC6A9",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uC8FC\uC5B4\uC9C4 \uB450 \uB85C\uADF8\uB97C \uC9C0\uC218 \uAD00\uACC4\uB85C \uBC14\uAFBC\uB2E4.",
              "\uC5F0\uC1C4 \uAD00\uACC4\uB85C log_a y\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uBC11\uBCC0\uD658 \uACF5\uC2DD\uC73C\uB85C \uBAA9\uD45C \uB85C\uADF8\uB97C \uD45C\uD604\uD55C\uB2E4.",
              "\uC694\uAD6C\uD55C \uC120\uD615\uACB0\uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "log_a y\uB97C \uB450 \uC8FC\uC5B4\uC9C4 \uB85C\uADF8\uC758 \uACF1\uC73C\uB85C \uB9CC\uB4E0\uB2E4.",
              "\uB85C\uADF8\uC758 \uC5ED\uC218 \uAD00\uACC4\uB97C \uC801\uC6A9\uD55C\uB2E4.",
              "\uBD84\uC218\uB97C \uAE30\uC57D\uBD84\uC218\uB85C \uC815\uB9AC\uD55C\uB2E4.",
              "\uC6D0\uB798 \uC870\uAC74\uC5D0 \uB300\uC785\uD574 \uAC80\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const p = randomInteger(2, 4);
            const q = randomInteger(2, 5);
            const product = p * q;
            const answer = mode === 0 ? product + p : fraction(1, product);
            return makeShortAnswer({
              prompt: `\uC591\uC218 $a,x,y$\uC5D0 \uB300\uD558\uC5EC $a\\ne1$, $\\log_a x=${p}$, $\\log_x y=${q}$\uC774\uB2E4. $${mode === 0 ? "\\log_a y+\\log_a x" : "\\log_y a"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.${mode === 1 ? " (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)" : ""}`,
              answer,
              independentAnswer: mode === 0 ? p * q + p : fraction(1, p * q),
              solution: `$\\log_a y=(\\log_a x)(\\log_x y)=${p}\\cdot${q}=${product}$\uC774\uB2E4. ${mode === 0 ? `\uB530\uB77C\uC11C \uC694\uAD6C\uD55C \uAC12\uC740 $${product}+${p}=${answer}$\uC774\uB2E4.` : `$\\log_y a=1/\\log_a y=${answer}$\uC774\uB2E4.`}`,
              hintText: "\uC911\uAC04 \uBC11 x\uAC00 \uC18C\uAC70\uB418\uB3C4\uB85D \uB450 \uB85C\uADF8\uB97C \uACF1\uD574 \uBCF4\uC138\uC694."
            });
          }
        },
        {
          id: "absolute-exponential-roots",
          titles: [
            "\uC808\uB313\uAC12 \uC9C0\uC218\uBC29\uC815\uC2DD\uC758 \uB450 \uADFC \uB300\uCE6D\uC131",
            "\uC808\uB313\uAC12 \uC9C0\uC218\uBC29\uC815\uC2DD\uC758 \uB450 \uADFC \uACF1"
          ],
          sourcePattern: "\uC9C0\uC218\uD568\uC218\uC758 \uC77C\uB300\uC77C\uC131\uC73C\uB85C \uC808\uB313\uAC12 \uBC29\uC815\uC2DD\uC744 \uB9CC\uB4E4\uACE0 \uC911\uC2EC \uB300\uCE6D\uC778 \uB450 \uADFC\uC744 \uBCF5\uC6D0",
          estimatedMinutes: [10, 11],
          reasoningSteps: [
            [
              "\uC9C0\uC218\uD568\uC218\uC758 \uC77C\uB300\uC77C\uC131\uC73C\uB85C \uC9C0\uC218\uB97C \uBE44\uAD50\uD55C\uB2E4.",
              "\uC808\uB313\uAC12 \uBC29\uC815\uC2DD\uC744 \uB450 \uC77C\uCC28\uBC29\uC815\uC2DD\uC73C\uB85C \uB098\uB208\uB2E4.",
              "\uB450 \uADFC\uC744 \uC911\uC2EC \uAE30\uC900\uC73C\uB85C \uC815\uB82C\uD55C\uB2E4.",
              "\uB450 \uADFC\uC758 \uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uBC11\uC774 \uC591\uC218\uC774\uACE0 1\uC774 \uC544\uB2D8\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uC808\uB313\uAC12\uC744 \uD480\uC5B4 \uB450 \uADFC\uC744 \uAD6C\uD55C\uB2E4.",
              "\uB450 \uADFC\uC774 \uC11C\uB85C \uB2E4\uB978\uC9C0 \uD655\uC778\uD55C\uB2E4.",
              "\uB450 \uADFC\uC758 \uACF1\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const base = choose([2, 3, 5]);
            const center = randomInteger(3, 8);
            const distance = randomInteger(1, 3);
            const left = center - distance;
            const right = center + distance;
            const answer = mode === 0 ? left + right : left * right;
            return makeShortAnswer({
              prompt: `\uBC29\uC815\uC2DD $${base}^{|x-${center}|}=${base}^{${distance}}$\uC758 \uC11C\uB85C \uB2E4\uB978 \uB450 \uC2E4\uADFC\uC744 $\\alpha<\\beta$\uB77C \uD560 \uB54C, $${mode === 0 ? "\\alpha+\\beta" : "\\alpha\\beta"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 2 * center : (center - distance) * (center + distance),
              solution: `\uC9C0\uC218\uD568\uC218\uC758 \uC77C\uB300\uC77C\uC131\uC5D0\uC11C $|x-${center}|=${distance}$. \uB530\uB77C\uC11C $\\alpha=${left},\\beta=${right}$\uC774\uACE0 \uC694\uAD6C\uD55C \uAC12\uC740 $${answer}$\uC774\uB2E4.`,
              hintText: "\uBC11\uC774 \uAC19\uC740 \uC9C0\uC218\uC2DD\uC774\uBBC0\uB85C \uBA3C\uC800 \uC9C0\uC218\uB07C\uB9AC \uBE44\uAD50\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "log-domain-quadratic",
          titles: [
            "\uB85C\uADF8 \uC9C4\uC218 \uC870\uAC74\uC744 \uD3EC\uD568\uD55C \uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uADFC \uD569",
            "\uB85C\uADF8 \uC9C4\uC218 \uC870\uAC74\uC744 \uD3EC\uD568\uD55C \uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uADFC \uACF1"
          ],
          sourcePattern: "\uB85C\uADF8\uC758 \uC77C\uB300\uC77C\uC131\uACFC \uC9C4\uC218 \uC591\uC218 \uC870\uAC74\uC744 \uD568\uAED8 \uC801\uC6A9\uD574 \uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uD6C4\uBCF4\uADFC\uC744 \uAC80\uC99D",
          estimatedMinutes: [12, 12],
          reasoningSteps: [
            [
              "\uB85C\uADF8\uC758 \uBC11\uACFC \uC9C4\uC218 \uC870\uAC74\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uB85C\uADF8\uC758 \uC77C\uB300\uC77C\uC131\uC73C\uB85C \uC9C4\uC218\uB07C\uB9AC \uAC19\uAC8C \uB193\uB294\uB2E4.",
              "\uC644\uC804\uC81C\uACF1 \uBC29\uC815\uC2DD\uC758 \uB450 \uADFC\uC744 \uAD6C\uD55C\uB2E4.",
              "\uB450 \uADFC\uC744 \uC9C4\uC218 \uC870\uAC74\uC5D0 \uB300\uC785\uD55C \uB4A4 \uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uC815\uC758\uC5ED\uC744 \uBA3C\uC800 \uAE30\uB85D\uD55C\uB2E4.",
              "\uB85C\uADF8\uB97C \uC81C\uAC70\uD574 \uC774\uCC28\uBC29\uC815\uC2DD\uC744 \uB9CC\uB4E0\uB2E4.",
              "\uD6C4\uBCF4\uADFC \uBAA8\uB450\uAC00 \uC815\uC758\uC5ED\uC5D0 \uC18D\uD558\uB294\uC9C0 \uAC80\uC0AC\uD55C\uB2E4.",
              "\uB0A8\uC740 \uB450 \uADFC\uC758 \uACF1\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const base = choose([2, 3, 5]);
            const center = randomInteger(0, 5);
            const inner = choose([1, 2, 3]);
            const outer = inner + 2;
            const constant = outer ** 2 - inner ** 2;
            const left = center - outer;
            const right = center + outer;
            const answer = mode === 0 ? left + right : left * right;
            return makeShortAnswer({
              prompt: `\uBC29\uC815\uC2DD $\\log_{${base}}\\{(x-${center})^2-${inner ** 2}\\}=\\log_{${base}}${constant}$\uC758 \uC11C\uB85C \uB2E4\uB978 \uB450 \uC2E4\uADFC\uC744 $\\alpha,\\beta$\uB77C \uD560 \uB54C, $${mode === 0 ? "\\alpha+\\beta" : "\\alpha\\beta"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 2 * center : center ** 2 - outer ** 2,
              solution: `\uB85C\uADF8\uC758 \uC77C\uB300\uC77C\uC131\uC5D0\uC11C $(x-${center})^2-${inner ** 2}=${constant}$, \uC989 $(x-${center})^2=${outer ** 2}$\uC774\uB2E4. \uB450 \uADFC\uC5D0\uC11C\uB294 \uC9C4\uC218\uAC00 $${constant}>0$\uC774\uBBC0\uB85C \uBAA8\uB450 \uAC00\uB2A5\uD558\uB2E4. \uADFC\uC740 $${left},${right}$\uC774\uACE0 \uB2F5\uC740 $${answer}$\uC774\uB2E4.`,
              hintText: "\uB85C\uADF8\uB97C \uC5C6\uC560\uAE30 \uC804\uC5D0 \uC9C4\uC218\uAC00 \uC591\uC218\uC5EC\uC57C \uD55C\uB2E4\uB294 \uC870\uAC74\uC744 \uC801\uC5B4 \uB450\uC138\uC694."
            });
          }
        },
        {
          id: "inverse-exponential-function",
          titles: [
            "\uD3C9\uD589\uC774\uB3D9\uD55C \uC9C0\uC218\uD568\uC218\uC758 \uC5ED\uD568\uC22B\uAC12",
            "\uC9C0\uC218\uD568\uC218\uC640 \uC5ED\uD568\uC218\uC758 \uB300\uC751\uC810 \uACB0\uD569"
          ],
          sourcePattern: "\uD3C9\uD589\uC774\uB3D9\uD55C \uC9C0\uC218\uD568\uC218\uC758 \uC2DD\uC744 \uC5ED\uC73C\uB85C \uD480\uC5B4 \uC5ED\uD568\uC22B\uAC12\uACFC \uB300\uCE6D \uB300\uC751\uC810\uC744 \uACC4\uC0B0",
          estimatedMinutes: [10, 11],
          reasoningSteps: [
            [
              "y=f(x)\uB97C x\uC5D0 \uB300\uD574 \uD47C\uB2E4.",
              "\uC5ED\uD568\uC218\uC758 \uC815\uC758\uC5ED \uC870\uAC74\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uC8FC\uC5B4\uC9C4 \uD568\uC22B\uAC12\uC5D0 \uB300\uC751\uD558\uB294 \uC9C0\uC218\uB97C \uCC3E\uB294\uB2E4.",
              "\uD3C9\uD589\uC774\uB3D9\uB7C9\uC744 \uBC18\uC601\uD574 \uC5ED\uD568\uC22B\uAC12\uC744 \uAD6C\uD55C\uB2E4."
            ],
            [
              "f\uC640 f^{-1}\uC758 \uC88C\uD45C\uAC00 y=x\uC5D0 \uB300\uCE6D\uC784\uC744 \uC0AC\uC6A9\uD55C\uB2E4.",
              "\uC8FC\uC5B4\uC9C4 \uCD9C\uB825\uAC12\uC744 \uB9CC\uB4DC\uB294 \uC785\uB825\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC5ED\uD568\uC218\uC758 \uB300\uC751\uAC12\uC744 \uAE30\uB85D\uD55C\uB2E4.",
              "\uB450 \uB300\uC751 \uC88C\uD45C\uC758 \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const base = choose([2, 3]);
            const horizontal = randomInteger(1, 4);
            const vertical = randomInteger(1, 5);
            const exponent = randomInteger(2, 4);
            const target = power(base, exponent) + vertical;
            const inverseValue = exponent + horizontal;
            const answer = mode === 0 ? inverseValue : inverseValue + target;
            return makeShortAnswer({
              prompt: `\uD568\uC218 $f(x)=${base}^{x-${horizontal}}+${vertical}$\uC758 \uC5ED\uD568\uC218\uB97C $g$\uB77C \uD558\uC790. $${mode === 0 ? `g(${target})` : `g(${target})+${target}`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? exponent + horizontal : exponent + horizontal + target,
              solution: `$f(${exponent + horizontal})=${base}^{${exponent}}+${vertical}=${target}$\uC774\uBBC0\uB85C $g(${target})=${inverseValue}$. \uB530\uB77C\uC11C \uB2F5\uC740 $${answer}$\uC774\uB2E4.`,
              hintText: "\uC5ED\uD568\uC22B\uAC12 g(y)\uB294 f(x)=y\uB97C \uB9CC\uC871\uD558\uB294 \uC785\uB825 x\uC785\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "exponential-amgm-minimum",
          titles: [
            "\uC11C\uB85C \uC5ED\uC218\uC778 \uC9C0\uC218\uD56D\uC758 \uCD5C\uC19F\uAC12",
            "\uC9C0\uC218 \uCE58\uD658\uACFC \uC0B0\uC220\xB7\uAE30\uD558\uD3C9\uADE0\uC758 \uB4F1\uD638 \uC870\uAC74"
          ],
          sourcePattern: "a^x\uB97C \uC591\uC218 \uBCC0\uC218\uB85C \uCE58\uD658\uD558\uACE0 \uC0B0\uC220\xB7\uAE30\uD558\uD3C9\uADE0\uACFC \uB4F1\uD638 \uC870\uAC74\uC73C\uB85C \uCD5C\uC19F\uAC12\uACFC \uC704\uCE58\uB97C \uACB0\uC815",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "t=a^x>0\uC73C\uB85C \uCE58\uD658\uD55C\uB2E4.",
              "\uB450 \uC591\uC218\uD56D\uC758 \uACF1\uC774 \uC77C\uC815\uD568\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uC0B0\uC220\xB7\uAE30\uD558\uD3C9\uADE0\uC73C\uB85C \uCD5C\uC19F\uAC12\uC744 \uAD6C\uD55C\uB2E4.",
              "\uB4F1\uD638 \uC870\uAC74\uC5D0\uC11C x\uB97C \uAD6C\uD574 \uBAA9\uD45C\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uC9C0\uC218\uC2DD \uB450 \uD56D\uC744 t\uC640 \uC0C1\uC218/t\uB85C \uBC14\uAFBC\uB2E4.",
              "AM-GM \uBD80\uB4F1\uC2DD\uC744 \uC801\uC6A9\uD55C\uB2E4.",
              "\uB4F1\uD638\uAC00 \uC131\uB9BD\uD558\uB294 t\uB97C \uCC3E\uB294\uB2E4.",
              "\uC9C0\uC218\uD568\uC218\uC758 \uC77C\uB300\uC77C\uC131\uC73C\uB85C x\uB97C \uBCF5\uC6D0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const base = choose([2, 3]);
            const center = randomInteger(1, 4);
            const minimum = 2 * power(base, center);
            const answer = mode === 0 ? minimum : minimum + center;
            return makeShortAnswer({
              prompt: `\uC2E4\uC218 $x$\uC5D0 \uB300\uD558\uC5EC $F(x)=${base}^{x}+${base}^{${2 * center}-x}$\uB77C \uD558\uC790. $F(x)$\uC758 \uCD5C\uC19F\uAC12\uC744 $m$, \uADF8\uB54C\uC758 $x$\uB97C $p$\uB77C \uD560 \uB54C, $${mode === 0 ? "m" : "m+p"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 2 * power(base, center) : 2 * power(base, center) + center,
              solution: `$t=${base}^{x}>0$\uC774\uB77C \uD558\uBA74 $F=t+${base}^{2 * center}/t\\ge2${base}^{center}=${minimum}$. \uB4F1\uD638\uB294 $t=${base}^{center}$, \uC989 $x=${center}$\uC77C \uB54C \uC131\uB9BD\uD55C\uB2E4. \uB530\uB77C\uC11C \uB2F5\uC740 $${answer}$\uC774\uB2E4.`,
              hintText: "\uB450 \uC9C0\uC218\uD56D\uC758 \uACF1\uC774 x\uC640 \uBB34\uAD00\uD558\uB2E4\uB294 \uC810\uC744 \uC774\uC6A9\uD558\uC138\uC694."
            });
          }
        }
      ];
      module.exports = {
        courseId,
        unitId,
        requiredConceptIds,
        minimumAppliedPoolSize: 15,
        appliedPolicy: {
          includeBankTypes: true,
          minimumLocalDifficulty: 3
        },
        advancedTemplates: defineAdvancedTemplates({
          courseId,
          unitId,
          requiredConceptIds,
          families
        })
      };
    }
  });

  // services/assessmentTemplates/algebra/trigonometricFunctions.js
  var require_trigonometricFunctions = __commonJS({
    "services/assessmentTemplates/algebra/trigonometricFunctions.js"(exports, module) {
      var {
        randomInteger,
        choose,
        fraction,
        makeShortAnswer,
        defineAdvancedTemplates
      } = require_shared();
      var courseId = "algebra";
      var unitId = "trigonometric-functions";
      var requiredConceptIds = [
        "algebra-02-01",
        "algebra-02-02",
        "algebra-02-03"
      ];
      var families = [
        {
          id: "graph-parameter-recovery",
          titles: [
            "\uCD5C\uB300\xB7\uCD5C\uC18C\xB7\uC8FC\uAE30\uC5D0\uC11C \uC0BC\uAC01\uD568\uC218 \uC2DD \uBCF5\uC6D0",
            "\uADF8\uB798\uD504 \uC815\uBCF4\uC5D0\uC11C \uC9C4\uD3ED\xB7\uC8FC\uAE30\uACC4\uC218 \uACB0\uD569\uAC12 \uBCF5\uC6D0"
          ],
          sourcePattern: "\uC0BC\uAC01\uD568\uC218 \uADF8\uB798\uD504\uC758 \uCD5C\uB313\uAC12\xB7\uCD5C\uC19F\uAC12\xB7\uC8FC\uAE30\uB97C \uC5ED\uC73C\uB85C \uC77D\uC5B4 \uC2DD\uC758 \uACC4\uC218\uB97C \uACB0\uC815",
          estimatedMinutes: [10, 10],
          reasoningSteps: [
            [
              "\uCD5C\uB313\uAC12\uACFC \uCD5C\uC19F\uAC12\uC758 \uCC28\uB85C \uC9C4\uD3ED\uC744 \uAD6C\uD55C\uB2E4.",
              "\uB450 \uAC12\uC758 \uD3C9\uADE0\uC73C\uB85C \uD3C9\uD589\uC774\uB3D9\uB7C9\uC744 \uAD6C\uD55C\uB2E4.",
              "\uCD5C\uC18C \uC591\uC758 \uC8FC\uAE30\uB85C x\uC758 \uACC4\uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC694\uAD6C\uD55C \uACC4\uC218 \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uADF8\uB798\uD504\uC758 \uC911\uC2EC\uC120\uC744 \uCC3E\uB294\uB2E4.",
              "\uC9C4\uD3ED\uC744 \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uC8FC\uAE30 \uACF5\uC2DD\uC73C\uB85C \uAC01\uC18D\uB3C4 \uACC4\uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC138 \uB9E4\uAC1C\uBCC0\uC218\uC758 \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const amplitude = randomInteger(2, 5);
            const frequency = randomInteger(2, 4);
            const shift = randomInteger(-3, 3);
            const maximum = shift + amplitude;
            const minimum = shift - amplitude;
            const answer = mode === 0 ? amplitude + frequency + shift : amplitude * frequency - shift;
            return makeShortAnswer({
              prompt: `\uD568\uC218 $f(x)=a\\sin(bx)+c$\uC5D0\uC11C $a>0,b>0$\uC774\uB2E4. \uCD5C\uB313\uAC12\uC774 ${maximum}, \uCD5C\uC19F\uAC12\uC774 ${minimum}, \uCD5C\uC18C \uC591\uC758 \uC8FC\uAE30\uAC00 $\\dfrac{2\\pi}{${frequency}}$\uC77C \uB54C, $${mode === 0 ? "a+b+c" : "ab-c"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? amplitude + frequency + shift : amplitude * frequency - shift,
              solution: `$a=(${maximum}-(${minimum}))/2=${amplitude}$, $c=(${maximum}+(${minimum}))/2=${shift}$\uC774\uB2E4. $2\\pi/b=2\\pi/${frequency}$\uC5D0\uC11C $b=${frequency}$. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uCD5C\uB313\uAC12\xB7\uCD5C\uC19F\uAC12\uC758 \uD3C9\uADE0\uACFC \uCC28, \uADF8\uB9AC\uACE0 \uC8FC\uAE30 \uACF5\uC2DD\uC744 \uAC01\uAC01 \uC0AC\uC6A9\uD558\uC138\uC694.",
              visualization: {
                kind: "algebra-trig",
                functionName: "sin",
                amplitude,
                frequency,
                verticalShift: shift,
                xUnit: "radian",
                minimum,
                maximum,
                periodNumerator: 2,
                periodDenominator: frequency,
                note: "\uADF8\uB798\uD504\uC758 \uCD5C\uB313\uAC12\xB7\uCD5C\uC19F\uAC12\uACFC \uD55C \uC8FC\uAE30\uC758 \uAE38\uC774\uB97C \uBB38\uC81C\uC758 \uC870\uAC74\uACFC \uD568\uAED8 \uD655\uC778\uD558\uC138\uC694."
              }
            });
          }
        },
        {
          id: "sum-identity-quadrant",
          titles: [
            "\uC0BC\uAC01\uD568\uC218 \uD569\uACFC \uC0AC\uBD84\uBA74\uC5D0\uC11C \uACF1 \uBCF5\uC6D0",
            "\uC0BC\uAC01\uD568\uC218 \uD569\uACFC \uB300\uC18C \uC870\uAC74\uC5D0\uC11C \uD0C4\uC820\uD2B8 \uBCF5\uC6D0"
          ],
          sourcePattern: "(sin\u03B8+cos\u03B8)^2 \uD56D\uB4F1\uC2DD\uACFC \uC0AC\uBD84\uBA74\xB7\uB300\uC18C \uC870\uAC74\uC744 \uD568\uAED8 \uC0AC\uC6A9",
          estimatedMinutes: [10, 11],
          reasoningSteps: [
            [
              "\uC8FC\uC5B4\uC9C4 \uD569\uC744 \uC81C\uACF1\uD55C\uB2E4.",
              "sin\xB2\u03B8+cos\xB2\u03B8=1\uC744 \uB300\uC785\uD55C\uB2E4.",
              "sin\u03B8cos\u03B8\uB97C \uACE0\uB9BD\uC2DC\uD0A8\uB2E4.",
              "\uC0AC\uBD84\uBA74 \uC870\uAC74\uACFC \uBD80\uD638\uAC00 \uB9DE\uB294\uC9C0 \uAC80\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uD569\uC758 \uC81C\uACF1\uC73C\uB85C \uACF1\uC744 \uAD6C\uD55C\uB2E4.",
              "\uD569\uACFC \uACF1\uC73C\uB85C sin\u03B8,cos\u03B8\uC758 \uC774\uCC28\uBC29\uC815\uC2DD\uC744 \uB9CC\uB4E0\uB2E4.",
              "\uB300\uC18C\xB7\uC0AC\uBD84\uBA74 \uC870\uAC74\uC73C\uB85C \uB450 \uAC12\uC744 \uAD6C\uBD84\uD55C\uB2E4.",
              "\uBE44\uB97C \uCDE8\uD574 tan\u03B8\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const swapped = randomInteger(0, 1) === 1;
            const sinNumerator = swapped ? 4 : 3;
            const cosNumerator = swapped ? 3 : 4;
            const sum = sinNumerator + cosNumerator;
            const product = fraction(
              sinNumerator * cosNumerator,
              25
            );
            const tangent = fraction(
              sinNumerator,
              cosNumerator
            );
            return makeShortAnswer({
              prompt: `\uC81C1\uC0AC\uBD84\uBA74\uC758 \uAC01 $\\theta$\uAC00 $\\sin\\theta+\\cos\\theta=\\dfrac{${sum}}5$\uB97C \uB9CC\uC871\uD55C\uB2E4. $\\sin\\theta ${sinNumerator > cosNumerator ? ">" : "<"}\\cos\\theta$\uC77C \uB54C, $${mode === 0 ? "\\sin\\theta\\cos\\theta" : "\\tan\\theta"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer: mode === 0 ? product : tangent,
              independentAnswer: mode === 0 ? fraction(12, 25) : fraction(
                sinNumerator,
                cosNumerator
              ),
              solution: `\uD569\uC744 \uC81C\uACF1\uD558\uBA74 $\\dfrac{${sum ** 2}}{25}=1+2\\sin\\theta\\cos\\theta$\uC774\uBBC0\uB85C $\\sin\\theta\\cos\\theta=\\dfrac{12}{25}$. \uB450 \uAC12\uC740 $3/5,4/5$\uC774\uACE0 \uB300\uC18C \uC870\uAC74\uC73C\uB85C $\\sin\\theta=${sinNumerator}/5$, $\\cos\\theta=${cosNumerator}/5$\uC774\uB2E4. \uB530\uB77C\uC11C \uB2F5\uC740 ${mode === 0 ? product : tangent}\uC774\uB2E4.`,
              hintText: "(sin\u03B8+cos\u03B8)\xB2\uC744 \uC804\uAC1C\uD55C \uB4A4 \uB450 \uAC12\uC744 \uADFC\uC73C\uB85C \uAC16\uB294 \uC774\uCC28\uBC29\uC815\uC2DD\uC744 \uC0DD\uAC01\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "triangle-three-invariants",
          titles: [
            "\uC138 \uBCC0\uC5D0\uC11C \uB113\uC774\uC640 \uC678\uC811\uC6D0\uC758 \uBC18\uC9C0\uB984 \uC5F0\uC1C4 \uACC4\uC0B0",
            "\uCF54\uC0AC\uC778\uBC95\uCE59\xB7\uB113\uC774\xB7\uC0AC\uC778\uBC95\uCE59 \uACB0\uD569"
          ],
          sourcePattern: "\uCF54\uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uAC01\uC744 \uCC3E\uACE0 \uB113\uC774\uC640 \uD655\uC7A5 \uC0AC\uC778\uBC95\uCE59\uAE4C\uC9C0 \uC774\uC5B4\uC9C0\uB294 \uC0BC\uAC01\uD615 \uC720\uD615",
          estimatedMinutes: [12, 12],
          reasoningSteps: [
            [
              "\uAC00\uC7A5 \uAE34 \uBCC0\uC5D0 \uB300\uD55C \uCF54\uC0AC\uC778\uBC95\uCE59\uC744 \uC801\uC6A9\uD55C\uB2E4.",
              "\uB07C\uC778\uAC01\uC744 \uD310\uC815\uD55C\uB2E4.",
              "\uB450 \uBCC0\uACFC \uC0AC\uC787\uAC01\uC73C\uB85C \uB113\uC774\uB97C \uAD6C\uD55C\uB2E4.",
              "\uD655\uC7A5 \uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uC678\uC811\uBC18\uC9C0\uB984\uC744 \uAD6C\uD574 \uACB0\uD569\uD55C\uB2E4."
            ],
            [
              "\uC138 \uBCC0\uC73C\uB85C \uD55C \uAC01\uC758 \uCF54\uC0AC\uC778\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC0BC\uAC01\uD568\uC218 \uD56D\uB4F1\uC2DD\uC73C\uB85C \uC0AC\uC778\uC744 \uAD6C\uD55C\uB2E4.",
              "\uB113\uC774\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uC678\uC811\uC6D0\uC758 \uC9C0\uB984\uC744 \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const scale = randomInteger(1, 4);
            const area = 6 * scale ** 2;
            const diameter = 5 * scale;
            const answer = mode === 0 ? area + diameter : area - diameter;
            return makeShortAnswer({
              prompt: `\uC0BC\uAC01\uD615 ABC\uC758 \uC138 \uBCC0\uC758 \uAE38\uC774\uAC00 \uAC01\uAC01 $${3 * scale},${4 * scale},${5 * scale}$\uC774\uB2E4. \uC0BC\uAC01\uD615\uC758 \uB113\uC774\uB97C $K$, \uC678\uC811\uC6D0\uC758 \uC9C0\uB984\uC744 $D$\uB77C \uD560 \uB54C, $${mode === 0 ? "K+D" : "K-D"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 6 * scale ** 2 + 5 * scale : 6 * scale ** 2 - 5 * scale,
              solution: `\uCF54\uC0AC\uC778\uBC95\uCE59\uC5D0\uC11C $(${5 * scale})^2=(${3 * scale})^2+(${4 * scale})^2$\uC774\uBBC0\uB85C \uAC00\uC7A5 \uAE34 \uBCC0\uC758 \uB300\uAC01\uC740 $90^\\circ$\uC774\uB2E4. $K=\\frac12\\cdot${3 * scale}\\cdot${4 * scale}=${area}$\uC774\uACE0, \uD655\uC7A5 \uC0AC\uC778\uBC95\uCE59\uC5D0\uC11C \uBE57\uBCC0\uC774 \uC678\uC811\uC6D0\uC758 \uC9C0\uB984\uC774\uBBC0\uB85C $D=${diameter}$. \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uBA3C\uC800 \uCF54\uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uC9C1\uAC01\uC0BC\uAC01\uD615\uC778\uC9C0 \uD655\uC778\uD55C \uB4A4 \uB113\uC774\uC640 \uD655\uC7A5 \uC0AC\uC778\uBC95\uCE59\uC744 \uC4F0\uC138\uC694."
            });
          }
        },
        {
          id: "sector-reverse-chain",
          titles: [
            "\uD638\uC758 \uAE38\uC774\uC5D0\uC11C \uBC18\uC9C0\uB984\uACFC \uBD80\uCC44\uAF34 \uB113\uC774 \uC5ED\uC0B0",
            "\uBD80\uCC44\uAF34 \uC815\uBCF4\uC640 \uC0BC\uAC01\uD568\uC218 \uAC12 \uACB0\uD569"
          ],
          sourcePattern: "\uD638\uB3C4\uBC95\uC758 \uD638\uC758 \uAE38\uC774\xB7\uB113\uC774 \uACF5\uC2DD\uC744 \uC5ED\uC73C\uB85C \uC801\uC6A9\uD55C \uB4A4 \uD2B9\uC218\uAC01 \uAC12\uC744 \uC5F0\uACB0",
          estimatedMinutes: [10, 11],
          reasoningSteps: [
            [
              "\uD638\uB3C4\uBC95\uC73C\uB85C \uC911\uC2EC\uAC01\uC744 \uD655\uC778\uD55C\uB2E4.",
              "l=r\u03B8\uC5D0\uC11C \uBC18\uC9C0\uB984\uC744 \uAD6C\uD55C\uB2E4.",
              "S=1/2 r\xB2\u03B8\uB85C \uB113\uC774\uB97C \uAD6C\uD55C\uB2E4.",
              "\u03C0\uC758 \uACC4\uC218\uB97C \uC694\uAD6C\uD55C \uD615\uC2DD\uC73C\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ],
            [
              "\uD638\uC758 \uAE38\uC774\uB85C \uBC18\uC9C0\uB984\uC744 \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uC911\uC2EC\uAC01\uC758 \uC0BC\uAC01\uD568\uC218 \uAC12\uC744 \uAD6C\uD55C\uB2E4.",
              "\uBD80\uCC44\uAF34 \uB113\uC774\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uB450 \uACB0\uACFC\uB97C \uACB0\uD569\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const angle = choose([
              {
                denominator: 2,
                sin: 1
              },
              {
                denominator: 6,
                sin: 0.5
              }
            ]);
            const radius = angle.denominator === 2 ? randomInteger(2, 6) : 6;
            const arcCoefficient = radius / angle.denominator;
            const areaCoefficient = radius ** 2 / (2 * angle.denominator);
            const answer = mode === 0 ? areaCoefficient : areaCoefficient + radius * angle.sin;
            return makeShortAnswer({
              prompt: `\uC911\uC2EC\uAC01\uC758 \uD06C\uAE30\uAC00 $\\dfrac{\\pi}{${angle.denominator}}$\uC774\uACE0 \uD638\uC758 \uAE38\uC774\uAC00 $${arcCoefficient}\\pi$\uC778 \uBD80\uCC44\uAF34\uC758 \uBC18\uC9C0\uB984\uC744 $r$, \uB113\uC774\uB97C $S$\uB77C \uD558\uC790. $${mode === 0 ? "S/\\pi" : `S/\\pi+r\\sin\\dfrac{\\pi}{${angle.denominator}}`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? radius ** 2 / (2 * angle.denominator) : radius ** 2 / (2 * angle.denominator) + radius * angle.sin,
              solution: `$r\\cdot\\pi/${angle.denominator}=${arcCoefficient}\\pi$\uC5D0\uC11C $r=${radius}$. $S/\\pi=\\frac12r^2/${angle.denominator}=${areaCoefficient}$. ${mode === 0 ? "" : `\uB610\uD55C $r\\sin(\\pi/${angle.denominator})=${radius * angle.sin}$\uC774\uB2E4. `}\uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uD638\uC758 \uAE38\uC774 \uACF5\uC2DD l=r\u03B8\uB85C \uBC18\uC9C0\uB984\uC744 \uBA3C\uC800 \uBCF5\uC6D0\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "isosceles-cosine-sine-chain",
          titles: [
            "\uC774\uB4F1\uBCC0\uC0BC\uAC01\uD615\uC5D0\uC11C \uB192\uC774\xB7\uB113\uC774\xB7\uC678\uC811\uBC18\uC9C0\uB984 \uACB0\uD569",
            "\uCF54\uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uAC01\uC744 \uBCF5\uC6D0\uD55C \uB4A4 \uC0AC\uC778\uBC95\uCE59 \uC801\uC6A9"
          ],
          sourcePattern: "\uC774\uB4F1\uBCC0\uC0BC\uAC01\uD615\uC758 \uC138 \uBCC0 \uC870\uAC74\uC744 \uCF54\uC0AC\uC778\uBC95\uCE59\xB7\uB113\uC774\xB7\uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uC5F0\uC1C4 \uD574\uC11D",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uCF54\uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uAF2D\uC9D3\uAC01\uC758 \uCF54\uC0AC\uC778\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC0AC\uC778\uAC12 \uB610\uB294 \uB192\uC774\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC0BC\uAC01\uD615\uC758 \uB113\uC774\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uD655\uC7A5 \uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uC678\uC811\uBC18\uC9C0\uB984\uC744 \uAD6C\uD574 \uACB0\uD569\uD55C\uB2E4."
            ],
            [
              "\uC138 \uBCC0\uC744 \uCF54\uC0AC\uC778\uBC95\uCE59\uC5D0 \uB300\uC785\uD55C\uB2E4.",
              "sin\xB2+cos\xB2=1\uB85C \uC0AC\uC778\uC744 \uAD6C\uD55C\uB2E4.",
              "\uB113\uC774\uB85C \uACC4\uC0B0\uC744 \uAC80\uC0B0\uD55C\uB2E4.",
              "\uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uC678\uC811\uBC18\uC9C0\uB984\uC744 \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const scale = randomInteger(1, 3);
            const equalSide = 5 * scale;
            const base = 6 * scale;
            const height = 4 * scale;
            const area = 12 * scale ** 2;
            const radius = fraction(
              25 * scale,
              8
            );
            const answer = mode === 0 ? area + height : radius;
            return makeShortAnswer({
              prompt: `\uC774\uB4F1\uBCC0\uC0BC\uAC01\uD615 ABC\uC5D0\uC11C $AB=AC=${equalSide}$, $BC=${base}$\uC774\uB2E4. $K$\uB97C \uB113\uC774, $h$\uB97C A\uC5D0\uC11C BC\uC5D0 \uB0B4\uB9B0 \uB192\uC774, $R$\uC744 \uC678\uC811\uC6D0\uC758 \uBC18\uC9C0\uB984\uC774\uB77C \uD560 \uB54C, $${mode === 0 ? "K+h" : "R"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.${mode === 1 ? " (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)" : ""}`,
              answer,
              independentAnswer: mode === 0 ? 12 * scale ** 2 + 4 * scale : fraction(
                25 * scale,
                8
              ),
              solution: `\uB192\uC774\uB294 \uBC11\uBCC0\uC744 \uC774\uB4F1\uBD84\uD558\uBBC0\uB85C $h=\\sqrt{${equalSide}^2-${3 * scale}^2}=${height}$. $K=\\frac12\\cdot${base}\\cdot${height}=${area}$. \uB610 $K=abc/(4R)$\uC5D0\uC11C $R=${radius}$. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC774\uB4F1\uBCC0\uC0BC\uAC01\uD615\uC758 \uB192\uC774\uAC00 \uBC11\uBCC0\uC744 \uC774\uB4F1\uBD84\uD55C\uB2E4\uB294 \uC810\uC5D0\uC11C \uC2DC\uC791\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "trigonometric-equation-root-count",
          titles: [
            "\uC8FC\uAE30\uC640 \uC601\uC810\uC73C\uB85C \uC0BC\uAC01\uBC29\uC815\uC2DD\uC758 \uD574 \uAC1C\uC218 \uACC4\uC0B0",
            "\uB05D\uC810 \uD3EC\uD568 \uC5EC\uBD80\uB97C \uAD6C\uBD84\uD558\uB294 \uC0BC\uAC01\uBC29\uC815\uC2DD \uD574 \uAC1C\uC218"
          ],
          sourcePattern: "\uC0BC\uAC01\uD568\uC218\uC758 \uC601\uC810 \uAC04\uACA9\uC744 \uAD6C\uD55C \uB4A4 \uC8FC\uC5B4\uC9C4 \uAD6C\uAC04\uC758 \uC591 \uB05D\uC810 \uD3EC\uD568 \uC5EC\uBD80\uAE4C\uC9C0 \uC138\uB294 \uC720\uD615",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "sin(kx)=0\uC758 \uC77C\uBC18\uD574\uB97C \uAD6C\uD55C\uB2E4.",
              "\uD574 \uC0AC\uC774\uC758 \uAC04\uACA9\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC77C\uBC18\uD574\uAC00 \uC8FC\uC5B4\uC9C4 \uB2EB\uD78C\uAD6C\uAC04\uC5D0 \uC18D\uD558\uB294 \uC870\uAC74\uC744 \uD47C\uB2E4.",
              "\uC815\uC218 \uB9E4\uAC1C\uBCC0\uC218\uC758 \uAC1C\uC218\uB97C \uC13C\uB2E4."
            ],
            [
              "cos(kx)=0\uC758 \uC77C\uBC18\uD574\uB97C \uAD6C\uD55C\uB2E4.",
              "\uAD6C\uAC04 \uC591 \uB05D\uC810\uC774 \uD574\uC778\uC9C0 \uAC01\uAC01 \uAC80\uC0AC\uD55C\uB2E4.",
              "\uD5C8\uC6A9\uB418\uB294 \uC815\uC218 \uC9C0\uD45C\uC758 \uBC94\uC704\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB05D\uC810\uC744 \uC81C\uC678\uD55C \uD574\uC758 \uAC1C\uC218\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const frequency = randomInteger(2, 5);
            const length = randomInteger(2, 4);
            const answer = mode === 0 ? frequency * length + 1 : frequency * length;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uBC29\uC815\uC2DD $\\sin(${frequency}x)=0$\uC774 \uB2EB\uD78C\uAD6C\uAC04 $[0,${length}\\pi]$\uC5D0\uC11C \uAC16\uB294 \uC11C\uB85C \uB2E4\uB978 \uC2E4\uADFC\uC758 \uAC1C\uC218\uB97C \uAD6C\uD558\uC2DC\uC624.` : `\uBC29\uC815\uC2DD $\\cos(${frequency}x)=0$\uC774 \uC5F4\uB9B0\uAD6C\uAC04 $(0,${length}\\pi)$\uC5D0\uC11C \uAC16\uB294 \uC11C\uB85C \uB2E4\uB978 \uC2E4\uADFC\uC758 \uAC1C\uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: frequency * length + (mode === 0 ? 1 : 0),
              solution: mode === 0 ? `$x=n\\pi/${frequency}$\uC774\uACE0 $0\\le n\\le${frequency * length}$\uC774\uBBC0\uB85C \uD574\uB294 ${answer}\uAC1C\uC774\uB2E4.` : `$x=(2n+1)\\pi/(2${frequency})$\uC774\uB2E4. $(0,${length}\\pi)$ \uC548\uC5D0 ${frequency * length}\uAC1C\uC758 \uD574\uAC00 \uC788\uC73C\uBBC0\uB85C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC77C\uBC18\uD574\uB97C \uBA3C\uC800 \uC4F4 \uB4A4 \uC815\uC218 n\uC758 \uBC94\uC704\uB97C \uC138\uC138\uC694."
            });
          }
        },
        {
          id: "phase-shift-extrema",
          titles: [
            "\uC704\uC0C1\uC774 \uC774\uB3D9\uD55C \uCF54\uC0AC\uC778\uD568\uC218\uC758 \uCCAB \uCD5C\uB313\uAC12 \uC704\uCE58",
            "\uC704\uC0C1\uC774 \uC774\uB3D9\uD55C \uC0AC\uC778\uD568\uC218\uC758 \uCCAB \uCD5C\uC19F\uAC12 \uC704\uCE58"
          ],
          sourcePattern: "\uD3C9\uD589\uC774\uB3D9\uD55C \uC0BC\uAC01\uD568\uC218\uC758 \uC704\uC0C1\uC774 \uD2B9\uC815 \uAC01\uC774 \uB418\uB294 \uCCAB \uC591\uC758 \uC704\uCE58\uB97C \uC8FC\uAE30\uC640 \uD568\uAED8 \uACB0\uC815",
          estimatedMinutes: [10, 11],
          reasoningSteps: [
            [
              "\uCD5C\uB313\uAC12\uC774 \uB418\uB294 \uCF54\uC0AC\uC778\uC758 \uC704\uC0C1\uC744 \uCC3E\uB294\uB2E4.",
              "\uC704\uC0C1\uC5D0 2\u03C0\uC758 \uC815\uC218\uBC30\uB97C \uB354\uD55C \uC77C\uBC18\uD574\uB97C \uC4F4\uB2E4.",
              "\uC591\uC218\uC778 \uD574 \uC911 \uAC00\uC7A5 \uC791\uC740 \uAC12\uC744 \uACE0\uB978\uB2E4.",
              "\uAE30\uC57D\uBD84\uC218\uC758 \uBD84\uC790\uC640 \uBD84\uBAA8\uB97C \uACB0\uD569\uD55C\uB2E4."
            ],
            [
              "\uC0AC\uC778\uD568\uC218\uAC00 \uCD5C\uC19F\uAC12\uC744 \uAC16\uB294 \uC704\uC0C1\uC744 \uCC3E\uB294\uB2E4.",
              "\uD3C9\uD589\uC774\uB3D9\uB7C9\uC744 \uBC18\uC601\uD55C \uC77C\uBC18\uD574\uB97C \uC138\uC6B4\uB2E4.",
              "\uCD5C\uC18C \uC591\uC758 \uD574\uB97C \uAD6C\uD55C\uB2E4.",
              "\u03C0\uC758 \uC720\uB9AC\uC218 \uBC30\uB97C \uAE30\uC57D\uBD84\uC218\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const denominator = choose([3, 4, 6]);
            const shiftNumerator = 1;
            const numerator = mode === 0 ? shiftNumerator : 3 * denominator + 2 * shiftNumerator;
            const reduced = fraction(
              numerator,
              2 * denominator
            ).split("/");
            const top = Number(reduced[0]);
            const bottom = Number(
              reduced[1] || 1
            );
            const answer = top + bottom;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uD568\uC218 $f(x)=3\\cos(2x-\\dfrac{\\pi}{${denominator}})+1$\uC774 \uCD5C\uB313\uAC12\uC744 \uAC16\uB294 \uAC00\uC7A5 \uC791\uC740 \uC591\uC218 $x$\uB97C $\\dfrac{p}{q}\\pi$\uB77C \uD558\uC790. \uC11C\uB85C\uC18C\uC778 \uC790\uC5F0\uC218 $p,q$\uC5D0 \uB300\uD558\uC5EC $p+q$\uB97C \uAD6C\uD558\uC2DC\uC624.` : `\uD568\uC218 $g(x)=2\\sin(2x-\\dfrac{\\pi}{${denominator}})-3$\uC774 \uCD5C\uC19F\uAC12\uC744 \uAC16\uB294 \uAC00\uC7A5 \uC791\uC740 \uC591\uC218 $x$\uB97C $\\dfrac{p}{q}\\pi$\uB77C \uD558\uC790. \uC11C\uB85C\uC18C\uC778 \uC790\uC5F0\uC218 $p,q$\uC5D0 \uB300\uD558\uC5EC $p+q$\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: top + bottom,
              solution: mode === 0 ? `\uCD5C\uB313\uAC12\uC740 $2x-\\pi/${denominator}=0$\uC5D0\uC11C \uCC98\uC74C \uB098\uD0C0\uB098\uBBC0\uB85C $x=\\pi/${2 * denominator}$. \uB530\uB77C\uC11C $p+q=${answer}$\uC774\uB2E4.` : `\uCD5C\uC19F\uAC12\uC740 $2x-\\pi/${denominator}=3\\pi/2$\uC5D0\uC11C \uCC98\uC74C \uB098\uD0C0\uB09C\uB2E4. \uB530\uB77C\uC11C $x=${fraction(numerator, 2 * denominator)}\\pi$\uC774\uACE0 $p+q=${answer}$\uC774\uB2E4.`,
              hintText: "\uCF54\uC0AC\uC778\uC758 \uCD5C\uB300 \uC704\uC0C1\uC740 0, \uC0AC\uC778\uC758 \uCD5C\uC18C \uC704\uC0C1\uC740 3\u03C0/2\uC785\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "included-angle-triangle",
          titles: [
            "\uB07C\uC778\uAC01\uC758 \uCF54\uC0AC\uC778\uC5D0\uC11C \uC81C3\uBCC0\uACFC \uB113\uC774 \uACB0\uD569",
            "\uB450 \uBCC0\uACFC \uB07C\uC778\uAC01\uC5D0\uC11C \uB113\uC774\xB7\uB458\uB808 \uC5F0\uC1C4 \uACC4\uC0B0"
          ],
          sourcePattern: "\uD55C \uAC01\uC758 \uC0AC\uC778\xB7\uCF54\uC0AC\uC778\uACFC \uB450 \uC778\uC811\uBCC0\uC744 \uC774\uC6A9\uD574 \uCF54\uC0AC\uC778\uBC95\uCE59\uACFC \uB113\uC774 \uACF5\uC2DD\uC744 \uD568\uAED8 \uC801\uC6A9",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uC8FC\uC5B4\uC9C4 \uCF54\uC0AC\uC778\uC73C\uB85C \uC0AC\uC778\uAC12\uC744 \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uCF54\uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uC81C3\uBCC0\uC744 \uAD6C\uD55C\uB2E4.",
              "\uB450 \uBCC0\uACFC \uB07C\uC778\uAC01\uC73C\uB85C \uB113\uC774\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC81C3\uBCC0\uACFC \uB113\uC774\uB97C \uACB0\uD569\uD55C\uB2E4."
            ],
            [
              "\uCF54\uC0AC\uC778\uBC95\uCE59\uC5D0 \uB450 \uBCC0\uACFC \uB07C\uC778\uAC01\uC744 \uB300\uC785\uD55C\uB2E4.",
              "\uC81C3\uBCC0\uC758 \uC591\uC758 \uAE38\uC774\uB97C \uC120\uD0DD\uD55C\uB2E4.",
              "\uC0AC\uC778\uAC12\uC73C\uB85C \uB113\uC774\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uB113\uC774\uC640 \uB458\uB808\uC758 \uCC28\uB97C \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const scale = randomInteger(1, 3);
            const sideA = 3 * scale;
            const sideB = 4 * scale;
            const sideC = 5 * scale;
            const area = 6 * scale ** 2;
            const perimeter = 12 * scale;
            const answer = mode === 0 ? sideC + area : area + perimeter;
            return makeShortAnswer({
              prompt: `\uC0BC\uAC01\uD615\uC5D0\uC11C \uB450 \uBCC0\uC758 \uAE38\uC774\uAC00 $${sideA},${sideB}$\uC774\uACE0 \uADF8 \uB07C\uC778\uAC01\uC744 $\\theta$\uB77C \uD558\uC790. $\\cos\\theta=0$\uC77C \uB54C \uC81C3\uBCC0\uC758 \uAE38\uC774\uB97C $c$, \uB113\uC774\uB97C $K$\uB77C \uD558\uBA74 ${mode === 0 ? "$c+K$" : "\uB458\uB808\uB97C $P$\uB77C \uD560 \uB54C $K+P$"}\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 5 * scale + 6 * scale ** 2 : 6 * scale ** 2 + 12 * scale,
              solution: `$\\theta=90^\\circ$\uC774\uBBC0\uB85C \uCF54\uC0AC\uC778\uBC95\uCE59\uC5D0\uC11C $c=${sideC}$\uC774\uACE0 $K=\\frac12\\cdot${sideA}\\cdot${sideB}=${area}$. ${mode === 0 ? "" : `\uB458\uB808\uB294 ${perimeter}\uC774\uBBC0\uB85C `}\uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "cos\u03B8=0\uC774\uBA74 \uB07C\uC778\uAC01\uC774 \uC9C1\uAC01\uC785\uB2C8\uB2E4. \uCF54\uC0AC\uC778\uBC95\uCE59\uACFC \uB113\uC774 \uACF5\uC2DD\uC744 \uCC28\uB840\uB85C \uC4F0\uC138\uC694."
            });
          }
        },
        {
          id: "sine-law-two-triangle-chain",
          titles: [
            "\uACF5\uC720\uBCC0\uC744 \uAC00\uC9C4 \uB450 \uC0BC\uAC01\uD615\uC758 \uC0AC\uC778\uBC95\uCE59 \uC5F0\uC1C4",
            "\uD55C \uC0BC\uAC01\uD615\uC5D0\uC11C \uAD6C\uD55C \uBCC0\uC744 \uB2E4\uC74C \uC0BC\uAC01\uD615\uC5D0 \uC804\uB2EC"
          ],
          sourcePattern: "\uCCAB \uC0BC\uAC01\uD615\uC758 \uD655\uC7A5 \uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uACF5\uC720\uBCC0\uC744 \uAD6C\uD55C \uB4A4 \uB450 \uBC88\uC9F8 \uC0BC\uAC01\uD615\uC758 \uC0AC\uC778\uBC95\uCE59\uC5D0 \uB300\uC785",
          estimatedMinutes: [13, 14],
          reasoningSteps: [
            [
              "\uCCAB \uC0BC\uAC01\uD615\uC5D0\uC11C \uD655\uC7A5 \uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uACF5\uC720\uBCC0\uC744 \uAD6C\uD55C\uB2E4.",
              "\uB450 \uBC88\uC9F8 \uC0BC\uAC01\uD615\uC5D0\uC11C \uC8FC\uC5B4\uC9C4 \uAC01\uC758 \uC0AC\uC778\uAC12\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uACF5\uC720\uBCC0\uC744 \uB450 \uBC88\uC9F8 \uC0AC\uC778\uBC95\uCE59\uC5D0 \uB300\uC785\uD55C\uB2E4.",
              "\uBAA9\uD45C \uBCC0\uACFC \uACF5\uC720\uBCC0\uC744 \uACB0\uD569\uD55C\uB2E4."
            ],
            [
              "\uCCAB \uC0BC\uAC01\uD615\uC758 \uC678\uC811\uC6D0 \uC9C0\uB984\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uACF5\uC720\uBCC0\uC758 \uB300\uAC01\uC744 \uC774\uC6A9\uD574 \uAE38\uC774\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uBC88\uC9F8 \uC0BC\uAC01\uD615\uC5D0\uC11C \uB2E4\uC2DC \uC0AC\uC778\uBC95\uCE59\uC744 \uC801\uC6A9\uD55C\uB2E4.",
              "\uB450 \uB2E8\uACC4\uC5D0\uC11C \uC5BB\uC740 \uAE38\uC774\uC758 \uCC28\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const scale = randomInteger(2, 6);
            const shared = scale;
            const target = 2 * scale;
            const answer = mode === 0 ? shared + target : target - shared;
            return makeShortAnswer({
              prompt: `\uC0BC\uAC01\uD615 ABC\uC5D0\uC11C $\\angle A=30^\\circ$\uC774\uACE0 \uC678\uC811\uC6D0\uC758 \uC9C0\uB984\uC774 $${2 * scale}$\uC774\uB2E4. \uC120\uBD84 BC\uB97C \uACF5\uC720\uD558\uB294 \uC0BC\uAC01\uD615 BCD\uC5D0\uC11C $\\angle C=90^\\circ$, $\\angle D=30^\\circ$\uC774\uB2E4. $${mode === 0 ? "BC+BD" : "BD-BC"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 3 * scale : scale,
              solution: `\uD655\uC7A5 \uC0AC\uC778\uBC95\uCE59\uC5D0\uC11C \uCCAB \uC0BC\uAC01\uD615\uC758 $BC=2R\\sin30^\\circ=${scale}$\uC774\uB2E4. \uB450 \uBC88\uC9F8 \uC0BC\uAC01\uD615\uC5D0\uC11C $BC=BD\\sin30^\\circ$\uC774\uBBC0\uB85C $BD=${target}$. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uAC01 \uBCC0\uC740 \uC678\uC811\uC6D0\uC758 \uC9C0\uB984\uACFC \uADF8 \uB300\uAC01\uC758 \uC0AC\uC778\uC758 \uACF1\uC785\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "chord-sector-coefficient",
          titles: [
            "\uD604\uC758 \uAE38\uC774\uC640 \uBD80\uCC44\uAF34 \uB113\uC774\uC758 \uACC4\uC218 \uACB0\uD569",
            "\uC911\uC2EC\uAC01\uC5D0\uC11C \uD604\xB7\uD638\xB7\uBD80\uCC44\uAF34\uC744 \uD568\uAED8 \uACC4\uC0B0"
          ],
          sourcePattern: "\uC911\uC2EC\uAC01\uC744 \uC774\uC6A9\uD574 \uC774\uB4F1\uBCC0\uC0BC\uAC01\uD615\uC758 \uD604\uACFC \uBD80\uCC44\uAF34 \uB113\uC774\uB97C \uAC01\uAC01 \uAD6C\uD55C \uB4A4 \uACC4\uC218\uB97C \uACB0\uD569",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uC911\uC2EC\uAC01 60\uB3C4\uC778 \uC0BC\uAC01\uD615\uC758 \uC138 \uBCC0\uC744 \uD310\uC815\uD55C\uB2E4.",
              "\uD604\uC758 \uAE38\uC774\uB97C \uAD6C\uD55C\uB2E4.",
              "\uBD80\uCC44\uAF34 \uB113\uC774 \uACF5\uC2DD\uC5D0 \uC911\uC2EC\uAC01\uC744 \uB300\uC785\uD55C\uB2E4.",
              "\u03C0\uC758 \uACC4\uC218\uC640 \uD604\uC758 \uAE38\uC774\uB97C \uACB0\uD569\uD55C\uB2E4."
            ],
            [
              "\uD638\uB3C4\uBC95\uC73C\uB85C \uC911\uC2EC\uAC01\uC744 \uBCC0\uD658\uD55C\uB2E4.",
              "\uD638\uC758 \uAE38\uC774\uC640 \uBD80\uCC44\uAF34 \uB113\uC774\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uCF54\uC0AC\uC778\uBC95\uCE59\uC73C\uB85C \uD604\uC758 \uAE38\uC774\uB97C \uD655\uC778\uD55C\uB2E4.",
              "\uC694\uAD6C\uD55C \uC138 \uC591\uC758 \uACC4\uC218\uB97C \uD569\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const radius = 6 * randomInteger(1, 3);
            const sectorCoefficient = radius ** 2 / 6;
            const arcCoefficient = radius / 3;
            const answer = mode === 0 ? radius + sectorCoefficient : radius + sectorCoefficient + arcCoefficient;
            return makeShortAnswer({
              prompt: `\uBC18\uC9C0\uB984\uC774 ${radius}\uC774\uACE0 \uC911\uC2EC\uAC01\uC774 $60^\\circ$\uC778 \uBD80\uCC44\uAF34\uC5D0\uC11C \uD604\uC758 \uAE38\uC774\uB97C $c$, \uD638\uC758 \uAE38\uC774\uB97C $a\\pi$, \uB113\uC774\uB97C $b\\pi$\uB77C \uD558\uC790. $${mode === 0 ? "b+c" : "a+b+c"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? radius + radius ** 2 / 6 : radius / 3 + radius ** 2 / 6 + radius,
              solution: `\uC911\uC2EC\uAC01\uC774 $60^\\circ$\uC774\uBBC0\uB85C \uB450 \uBC18\uC9C0\uB984\uACFC \uD604\uC774 \uC774\uB8E8\uB294 \uC0BC\uAC01\uD615\uC740 \uC815\uC0BC\uAC01\uD615\uC774\uB77C $c=${radius}$. \uB610 $a=${arcCoefficient}$, $b=${sectorCoefficient}$\uC774\uBBC0\uB85C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC911\uC2EC\uAC01\uC774 60\uB3C4\uC774\uBA74 \uB450 \uBC18\uC9C0\uB984\uACFC \uD604\uC73C\uB85C \uC774\uB8E8\uC5B4\uC9C4 \uC0BC\uAC01\uD615\uC744 \uC0B4\uD3B4\uBCF4\uC138\uC694."
            });
          }
        }
      ];
      module.exports = {
        courseId,
        unitId,
        requiredConceptIds,
        minimumAppliedPoolSize: 15,
        appliedPolicy: {
          includeBankTypes: true,
          minimumLocalDifficulty: 3
        },
        advancedTemplates: defineAdvancedTemplates({
          courseId,
          unitId,
          requiredConceptIds,
          families
        })
      };
    }
  });

  // services/assessmentTemplates/algebra/sequences.js
  var require_sequences = __commonJS({
    "services/assessmentTemplates/algebra/sequences.js"(exports, module) {
      var {
        randomInteger,
        choose,
        fraction,
        power,
        signed,
        makeShortAnswer,
        defineAdvancedTemplates
      } = require_shared();
      var courseId = "algebra";
      var unitId = "sequences";
      var requiredConceptIds = [
        "algebra-03-01",
        "algebra-03-02",
        "algebra-03-03",
        "algebra-03-04",
        "algebra-03-05",
        "algebra-03-06",
        "algebra-03-07"
      ];
      function arithmeticTerm(first, difference, index) {
        return first + (index - 1) * difference;
      }
      function arithmeticSum(first, difference, count) {
        return count * (2 * first + (count - 1) * difference) / 2;
      }
      var families = [
        {
          id: "arithmetic-two-conditions",
          titles: [
            "\uB450 \uD56D \uC870\uAC74\uC5D0\uC11C \uB4F1\uCC28\uC218\uC5F4\uC758 \uBD80\uBD84\uD569 \uBCF5\uC6D0",
            "\uB450 \uD56D \uC870\uAC74\uC5D0\uC11C \uB4F1\uCC28\uC218\uC5F4\uC758 \uD2B9\uC815 \uD56D \uACB0\uD569"
          ],
          sourcePattern: "\uC11C\uB85C \uB2E4\uB978 \uB450 \uD56D\uC758 \uC870\uAC74\uC744 \uC5F0\uB9BD\uD574 \uCCAB\uC9F8\uD56D\uACFC \uACF5\uCC28\uB97C \uBCF5\uC6D0\uD55C \uB4A4 \uBD80\uBD84\uD569 \uB610\uB294 \uD56D \uACB0\uD569 \uACC4\uC0B0",
          estimatedMinutes: [10, 10],
          reasoningSteps: [
            [
              "\uC77C\uBC18\uD56D a_n=a_1+(n-1)d\uB97C \uC138\uC6B4\uB2E4.",
              "\uB450 \uD56D \uC870\uAC74\uC744 \uC5F0\uB9BD\uD574 \uACF5\uCC28\uB97C \uAD6C\uD55C\uB2E4.",
              "\uCCAB\uC9F8\uD56D\uC744 \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uBD80\uBD84\uD569 \uACF5\uC2DD\uC744 \uC801\uC6A9\uD55C\uB2E4."
            ],
            [
              "\uB450 \uC77C\uBC18\uD56D \uC2DD\uC744 \uBE80\uB2E4.",
              "\uACF5\uCC28\uB97C \uAD6C\uD558\uACE0 \uCCAB\uC9F8\uD56D\uC744 \uCC3E\uB294\uB2E4.",
              "\uC694\uAD6C\uD55C \uB450 \uD56D\uC744 \uAC01\uAC01 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uD56D\uC758 \uACB0\uD569\uAC12\uC744 \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const first = randomInteger(-5, 6);
            const difference = choose([-3, -2, 2, 3, 4]);
            const p = randomInteger(2, 4);
            const q = p + randomInteger(3, 5);
            const target = q + 3;
            const answer = mode === 0 ? arithmeticSum(
              first,
              difference,
              target
            ) : arithmeticTerm(
              first,
              difference,
              target
            ) + arithmeticTerm(
              first,
              difference,
              p + 1
            );
            return makeShortAnswer({
              prompt: `\uB4F1\uCC28\uC218\uC5F4 $\\{a_n\\}$\uC774 $a_${p}=${arithmeticTerm(
                first,
                difference,
                p
              )}$, $a_${q}=${arithmeticTerm(
                first,
                difference,
                q
              )}$\uB97C \uB9CC\uC871\uD55C\uB2E4. ${mode === 0 ? `\uCCAB\uC9F8\uD56D\uBD80\uD130 \uC81C${target}\uD56D\uAE4C\uC9C0\uC758 \uD569` : `$a_${target}+a_${p + 1}$`}\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? arithmeticSum(
                first,
                difference,
                target
              ) : arithmeticTerm(
                first,
                difference,
                target
              ) + arithmeticTerm(
                first,
                difference,
                p + 1
              ),
              solution: `\uB450 \uC2DD\uC744 \uBE7C\uBA74 $(${q}-${p})d=${(q - p) * difference}$\uC774\uBBC0\uB85C $d=${difference}$. $a_1=${first}$\uC744 \uC5BB\uB294\uB2E4. ${mode === 0 ? `$S_${target}=\\frac{${target}}2\\{2(${first})+${target - 1}(${difference})\\}=${answer}$.` : `\uC77C\uBC18\uD56D\uC744 \uB300\uC785\uD558\uBA74 \uC694\uAD6C\uD55C \uAC12\uC740 ${answer}\uC774\uB2E4.`}`,
              hintText: "\uB450 \uD56D\uC758 \uCC28\uC5D0\uC11C\uB294 \uCCAB\uC9F8\uD56D\uC774 \uC18C\uAC70\uB429\uB2C8\uB2E4. \uACF5\uCC28\uBD80\uD130 \uAD6C\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "partial-sum-two-values",
          titles: [
            "\uB450 \uBD80\uBD84\uD569\uC5D0\uC11C \uB4F1\uCC28\uC218\uC5F4\uC758 \uACC4\uC218 \uBCF5\uC6D0",
            "\uBD80\uBD84\uD569 \uC870\uAC74\uC73C\uB85C \uC74C\uC218\uAC00 \uB418\uB294 \uCCAB \uD56D \uCC3E\uAE30"
          ],
          sourcePattern: "\uB4F1\uCC28\uC218\uC5F4 \uBD80\uBD84\uD569\uC744 \uC774\uCC28\uC2DD\uC73C\uB85C \uBCF4\uACE0 \uB450 \uC870\uAC74\uC5D0\uC11C \uCCAB\uC9F8\uD56D\xB7\uACF5\uCC28 \uB610\uB294 \uBD80\uD638 \uC804\uD658 \uC2DC\uC810 \uBCF5\uC6D0",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uB4F1\uCC28\uC218\uC5F4\uC758 \uBD80\uBD84\uD569 \uACF5\uC2DD\uC744 \uC4F4\uB2E4.",
              "\uB450 \uBD80\uBD84\uD569 \uC870\uAC74\uC744 \uC5F0\uB9BD\uD55C\uB2E4.",
              "\uCCAB\uC9F8\uD56D\uACFC \uACF5\uCC28\uB97C \uAD6C\uD55C\uB2E4.",
              "\uBAA9\uD45C \uBD80\uBD84\uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uBD80\uBD84\uD569 \uC870\uAC74\uC73C\uB85C \uC218\uC5F4\uC744 \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uC77C\uBC18\uD56D\uC744 \uAD6C\uD55C\uB2E4.",
              "\uBD80\uB4F1\uC2DD a_n<0\uC744 \uD47C\uB2E4.",
              "\uAC00\uC7A5 \uC791\uC740 \uC790\uC5F0\uC218 n\uC744 \uACE0\uB978\uB2E4."
            ]
          ],
          generate(mode) {
            const first = randomInteger(6, 12);
            const difference = choose([-3, -2]);
            const m = 3;
            const n = 6;
            const target = 9;
            const firstNegative = Math.floor(
              first / -difference
            ) + 2;
            const answer = mode === 0 ? arithmeticSum(
              first,
              difference,
              target
            ) : firstNegative;
            return makeShortAnswer({
              prompt: `\uB4F1\uCC28\uC218\uC5F4 $\\{a_n\\}$\uC758 \uCCAB\uC9F8\uD56D\uBD80\uD130 \uC81C$n$\uD56D\uAE4C\uC9C0\uC758 \uD569\uC744 $S_n$\uC774\uB77C \uD558\uC790. $S_${m}=${arithmeticSum(
                first,
                difference,
                m
              )}$, $S_${n}=${arithmeticSum(
                first,
                difference,
                n
              )}$\uC77C \uB54C, ${mode === 0 ? `$S_${target}$` : "$a_n<0$\uC774 \uB418\uB294 \uAC00\uC7A5 \uC791\uC740 \uC790\uC5F0\uC218 $n$"}\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? arithmeticSum(
                first,
                difference,
                target
              ) : firstNegative,
              solution: `\uBD80\uBD84\uD569 \uACF5\uC2DD \uB450 \uC2DD\uC744 \uC5F0\uB9BD\uD558\uBA74 $a_1=${first},d=${difference}$\uC774\uB2E4. ${mode === 0 ? `\uB530\uB77C\uC11C $S_${target}=${answer}$.` : `$a_n=${first}+(${difference})(n-1)<0$\uC744 \uD480\uBA74 \uAC00\uC7A5 \uC791\uC740 \uC790\uC5F0\uC218\uB294 ${answer}\uC774\uB2E4.`}`,
              hintText: "\uBD80\uBD84\uD569 \uB450 \uC2DD\uC744 \uCCAB\uC9F8\uD56D\uACFC \uACF5\uCC28\uC5D0 \uB300\uD55C \uC5F0\uB9BD\uBC29\uC815\uC2DD\uC73C\uB85C \uBCF4\uC138\uC694."
            });
          }
        },
        {
          id: "geometric-reverse",
          titles: [
            "\uB450 \uB4F1\uBE44\uC218\uC5F4 \uD56D\uC5D0\uC11C \uACF5\uBE44\uC640 \uBD80\uBD84\uD569 \uBCF5\uC6D0",
            "\uB4F1\uBE44\uC218\uC5F4 \uD56D\uC758 \uACF1 \uC870\uAC74\uC5D0\uC11C \uC911\uAC04\uD56D \uBCF5\uC6D0"
          ],
          sourcePattern: "\uB5A8\uC5B4\uC9C4 \uB450 \uD56D\uC758 \uBE44 \uB610\uB294 \uACF1\uC744 \uC774\uC6A9\uD574 \uACF5\uBE44\xB7\uC911\uAC04\uD56D\uC744 \uCC3E\uACE0 \uD569\uAE4C\uC9C0 \uC5F0\uACB0",
          estimatedMinutes: [11, 10],
          reasoningSteps: [
            [
              "\uB450 \uD56D\uC758 \uBE44\uB85C r\uC758 \uAC70\uB4ED\uC81C\uACF1\uC744 \uB9CC\uB4E0\uB2E4.",
              "\uC591\uC758 \uACF5\uBE44 \uC870\uAC74\uC73C\uB85C r\uC744 \uACB0\uC815\uD55C\uB2E4.",
              "\uCCAB\uC9F8\uD56D\uC744 \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uB4F1\uBE44\uC218\uC5F4\uC758 \uD569 \uACF5\uC2DD\uC744 \uC801\uC6A9\uD55C\uB2E4."
            ],
            [
              "\uB4F1\uBE44\uC218\uC5F4\uC5D0\uC11C \uAC19\uC740 \uAC70\uB9AC\uC758 \uD56D \uACF1 \uC131\uC9C8\uC744 \uCC3E\uB294\uB2E4.",
              "\uAC00\uC6B4\uB370 \uD56D\uC758 \uC81C\uACF1\uC73C\uB85C \uBC14\uAFBC\uB2E4.",
              "\uC591\uC218 \uC870\uAC74\uC73C\uB85C \uAC00\uC6B4\uB370 \uD56D\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC694\uAD6C\uD55C \uD56D \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const first = randomInteger(1, 4);
            const ratio = choose([2, 3]);
            const p = 2;
            const q = 5;
            const count = 6;
            const sum = first * (power(ratio, count) - 1) / (ratio - 1);
            const middle = first * power(ratio, 3);
            const answer = mode === 0 ? sum : middle;
            return makeShortAnswer({
              prompt: `\uBAA8\uB4E0 \uD56D\uC774 \uC591\uC218\uC778 \uB4F1\uBE44\uC218\uC5F4 $\\{a_n\\}$\uC5D0\uC11C $a_${p}=${first * power(ratio, p - 1)}$, $a_${q}=${first * power(ratio, q - 1)}$\uC774\uB2E4. ${mode === 0 ? `$a_1+a_2+\\cdots+a_${count}$` : `$\\sqrt{a_2a_6}$`}\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? sum : Math.sqrt(
                first * ratio * (first * power(
                  ratio,
                  5
                ))
              ),
              solution: `$a_${q}/a_${p}=r^{${q - p}}=${power(
                ratio,
                q - p
              )}$\uC774\uACE0 $r>0$\uC774\uBBC0\uB85C $r=${ratio}$, $a_1=${first}$. ${mode === 0 ? `\uB4F1\uBE44\uC218\uC5F4\uC758 \uD569\uC740 ${sum}\uC774\uB2E4.` : `$a_2a_6=a_4^2$\uC774\uACE0 \uBAA8\uB4E0 \uD56D\uC774 \uC591\uC218\uC774\uBBC0\uB85C $\\sqrt{a_2a_6}=a_4=${middle}$.`}`,
              hintText: "\uB5A8\uC5B4\uC9C4 \uB450 \uD56D\uC758 \uBE44\uB85C \uACF5\uBE44\uC758 \uAC70\uB4ED\uC81C\uACF1\uC744 \uBA3C\uC800 \uAD6C\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "partial-sum-polynomial",
          titles: [
            "\uBD80\uBD84\uD569 \uB2E4\uD56D\uC2DD\uC5D0\uC11C \uC77C\uBC18\uD56D\uACFC \uD640\uC218\uD56D \uD569 \uBCF5\uC6D0",
            "\uBD80\uBD84\uD569 \uC2DD\uC5D0\uC11C \uD2B9\uC815 \uAD6C\uAC04\uC758 \uD56D \uD569 \uACC4\uC0B0"
          ],
          sourcePattern: "S_n-S_{n-1}\uB85C \uC77C\uBC18\uD56D\uC744 \uBCF5\uC6D0\uD558\uACE0 \uD544\uC694\uD55C \uD56D\uB9CC \uB2E4\uC2DC \uD569\uD558\uB294 \uC720\uD615",
          estimatedMinutes: [11, 10],
          reasoningSteps: [
            [
              "a_1=S_1\uC744 \uB530\uB85C \uD655\uC778\uD55C\uB2E4.",
              "n\u22652\uC5D0\uC11C a_n=S_n-S_{n-1}\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uD640\uC218 \uBC88\uC9F8 \uD56D\uC758 \uC77C\uBC18\uC2DD\uC744 \uB9CC\uB4E0\uB2E4.",
              "\uB4F1\uCC28\uC218\uC5F4\uC758 \uD569\uC73C\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ],
            [
              "\uBD80\uBD84\uD569\uC5D0\uC11C \uC77C\uBC18\uD56D\uC744 \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uAD6C\uAC04\uD569\uC744 \uBD80\uBD84\uD569\uC758 \uCC28\uB85C\uB3C4 \uD45C\uD604\uD55C\uB2E4.",
              "\uB450 \uACC4\uC0B0 \uACBD\uB85C\uAC00 \uC77C\uCE58\uD558\uB294\uC9C0 \uD655\uC778\uD55C\uB2E4.",
              "\uBAA9\uD45C \uAD6C\uAC04\uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const c = randomInteger(
              -2,
              4
            );
            const m = randomInteger(4, 6);
            const partial = (n) => n ** 2 + c * n;
            const oddSum = Array.from(
              { length: m },
              (_, index) => {
                const n = 2 * index + 1;
                return 2 * n - 1 + c;
              }
            ).reduce(
              (sum, value) => sum + value,
              0
            );
            const rangeSum = partial(m + 3) - partial(2);
            const answer = mode === 0 ? oddSum : rangeSum;
            return makeShortAnswer({
              prompt: `\uC218\uC5F4 $\\{a_n\\}$\uC758 \uCCAB\uC9F8\uD56D\uBD80\uD130 \uC81C$n$\uD56D\uAE4C\uC9C0\uC758 \uD569\uC774 $S_n=n^2${signed(
                c
              )}n$\uC774\uB2E4. $${mode === 0 ? `a_1+a_3+\\cdots+a_${2 * m - 1}` : `a_3+a_4+\\cdots+a_${m + 3}`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? oddSum : partial(m + 3) - partial(2),
              solution: `$a_n=S_n-S_{n-1}=2n${signed(
                c - 1
              )}$\uC774\uB2E4. ${mode === 0 ? `\uD640\uC218 \uBC88\uC9F8 \uC9C0\uC218\uB97C \uB300\uC785\uD574 ${m}\uAC1C \uD56D\uC744 \uD569\uD558\uBA74 ${answer}\uC774\uB2E4.` : `\uB610\uB294 \uBC14\uB85C $S_${m + 3}-S_2=${answer}$\uB85C \uACC4\uC0B0\uD560 \uC218 \uC788\uB2E4.`}`,
              hintText: "\uC77C\uBC18\uD56D\uC740 \uBD80\uBD84\uD569\uC758 \uC774\uC6C3\uD55C \uB450 \uAC12\uC758 \uCC28\uC785\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "periodic-recurrence",
          titles: [
            "\uC8FC\uAE30 2 \uC810\uD654\uC2DD\uC758 \uC7A5\uAE30 \uD569",
            "\uC8FC\uAE30 \uC810\uD654\uC2DD\uC758 \uD2B9\uC815 \uD56D\uACFC \uBD80\uBD84\uD569 \uACB0\uD569"
          ],
          sourcePattern: "\uC810\uD654\uC2DD\uC744 \uC5EC\uB7EC \uBC88 \uC801\uC6A9\uD574 \uC9E7\uC740 \uC8FC\uAE30\uB97C \uBC1C\uACAC\uD558\uACE0 \uD070 \uC9C0\uC218\uC758 \uD56D\xB7\uD569\uC744 \uBE14\uB85D\uC73C\uB85C \uACC4\uC0B0",
          estimatedMinutes: [12, 12],
          reasoningSteps: [
            [
              "\uC810\uD654\uC2DD\uC73C\uB85C \uC55E\uC758 \uBA87 \uD56D\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "a_{n+2}=a_n\uC778 \uC8FC\uAE30\uB97C \uC99D\uBA85\uD55C\uB2E4.",
              "\uB450 \uD56D\uC529 \uBB36\uC740 \uD569\uC744 \uAD6C\uD55C\uB2E4.",
              "\uBE14\uB85D \uC218\uB97C \uC774\uC6A9\uD574 \uC804\uCCB4 \uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uCD08\uAE30 \uD56D\uC5D0\uC11C \uC8FC\uAE30 2\uB97C \uCC3E\uB294\uB2E4.",
              "\uBAA9\uD45C \uD56D\uC758 \uD640\uC9DD\uC744 \uD310\uC815\uD55C\uB2E4.",
              "\uC644\uC804\uD55C \uB450 \uD56D \uBE14\uB85D\uC758 \uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uBAA9\uD45C \uD56D\uACFC \uBD80\uBD84\uD569\uC744 \uACB0\uD569\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const constant = randomInteger(5, 12);
            const first = randomInteger(
              1,
              constant - 1
            );
            const pairs = randomInteger(8, 14);
            const evenCount = 2 * pairs;
            const answer = mode === 0 ? pairs * constant : pairs * constant + first;
            return makeShortAnswer({
              prompt: `\uC218\uC5F4 $\\{a_n\\}$\uC774 $a_1=${first}$, $a_{n+1}=${constant}-a_n$\uC744 \uB9CC\uC871\uD55C\uB2E4. $${mode === 0 ? `\\sum_{k=1}^{${evenCount}}a_k` : `\\sum_{k=1}^{${evenCount}}a_k+a_${evenCount + 1}`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? pairs * constant : pairs * constant + first,
              solution: `$a_{n+2}=${constant}-a_{n+1}=a_n$\uC774\uBBC0\uB85C \uC8FC\uAE30\uB294 2\uC774\uACE0 $a_{2j-1}+a_{2j}=${constant}$\uC774\uB2E4. \uC644\uC804\uD55C \uBE14\uB85D\uC774 ${pairs}\uAC1C\uC774\uBA70 ${mode === 0 ? "" : `$a_${evenCount + 1}=a_1=${first}$\uC774\uBBC0\uB85C `}\uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC810\uD654\uC2DD\uC744 \uB450 \uBC88 \uC5F0\uC18D \uC801\uC6A9\uD574 a_{n+2}\uC640 a_n\uC744 \uBE44\uAD50\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "weighted-arithmetic-sum",
          titles: [
            "\uB4F1\uCC28\uC218\uC5F4\uACFC \uC790\uC5F0\uC218\uC758 \uAC00\uC911\uD569",
            "\uD640\uC218 \uAC00\uC911\uCE58\uB97C \uACF1\uD55C \uB4F1\uCC28\uC218\uC5F4\uC758 \uD569"
          ],
          sourcePattern: "\uB4F1\uCC28\uC218\uC5F4\uC758 \uC77C\uBC18\uD56D\uC744 \uBCF5\uC6D0\uD55C \uB4A4 \uC790\uC5F0\uC218 \uB610\uB294 \uD640\uC218 \uAC00\uC911\uCE58\uB97C \uACF1\uD574 \uC2DC\uADF8\uB9C8 \uACF5\uC2DD\uC73C\uB85C \uD569\uC0B0",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uB450 \uD56D \uC870\uAC74\uC73C\uB85C \uCCAB\uC9F8\uD56D\uACFC \uACF5\uCC28\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC77C\uBC18\uD56D\uC744 n\uC758 \uC77C\uCC28\uC2DD\uC73C\uB85C \uB098\uD0C0\uB0B8\uB2E4.",
              "k a_k\uB97C \uC774\uCC28\uC2DD\uC73C\uB85C \uC804\uAC1C\uD55C\uB2E4.",
              "\uC790\uC5F0\uC218\uC758 \uD569\uACFC \uC81C\uACF1\uC758 \uD569\uC744 \uC801\uC6A9\uD55C\uB2E4."
            ],
            [
              "\uB4F1\uCC28\uC218\uC5F4\uC758 \uC77C\uBC18\uD56D\uC744 \uAD6C\uD55C\uB2E4.",
              "(2k-1)a_k\uB97C \uC774\uCC28\uC2DD\uC73C\uB85C \uC815\uB9AC\uD55C\uB2E4.",
              "\uD544\uC694\uD55C \uC2DC\uADF8\uB9C8 \uACF5\uC2DD\uC744 \uAC01\uAC01 \uC801\uC6A9\uD55C\uB2E4.",
              "\uD569\uCE5C \uAC12\uC744 \uC9C1\uC811 \uD569\uC0B0\uD574 \uAC80\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const first = randomInteger(1, 5);
            const difference = choose([2, 3]);
            const count = randomInteger(5, 8);
            const weight = (index) => mode === 0 ? index : 2 * index - 1;
            const answer = Array.from(
              { length: count },
              (_, index) => weight(index + 1) * arithmeticTerm(
                first,
                difference,
                index + 1
              )
            ).reduce(
              (sum, value) => sum + value,
              0
            );
            return makeShortAnswer({
              prompt: `\uB4F1\uCC28\uC218\uC5F4 $\\{a_n\\}$\uC774 $a_1=${first}$, $a_4=${arithmeticTerm(first, difference, 4)}$\uB97C \uB9CC\uC871\uD55C\uB2E4. $\\sum_{k=1}^{${count}}${mode === 0 ? "k" : "(2k-1)"}a_k$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: Array.from(
                { length: count },
                (_, index) => weight(index + 1) * (first + index * difference)
              ).reduce(
                (sum, value) => sum + value,
                0
              ),
              solution: `$a_n=${first}${signed(difference)}(n-1)$\uC774\uACE0 \uC774\uB97C \uD569 \uC548\uC5D0 \uB300\uC785\uD55C\uB2E4. $\\sum k=${count * (count + 1) / 2}$, $\\sum k^2=${count * (count + 1) * (2 * count + 1) / 6}$\uC744 \uC774\uC6A9\uD574 \uC815\uB9AC\uD558\uBA74 ${answer}\uC774\uB2E4.`,
              hintText: "\uC77C\uBC18\uD56D\uC744 \uBA3C\uC800 \uAD6C\uD55C \uB4A4 \uAC00\uC911\uCE58\uC640 \uACF1\uD574 k\uC758 \uB2E4\uD56D\uC2DD\uC73C\uB85C \uC804\uAC1C\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "geometric-block-sums",
          titles: [
            "\uB4F1\uBE44\uC218\uC5F4\uC758 \uC5F0\uC18D \uBE14\uB85D \uD569 \uBE44\uC728",
            "\uB450 \uBE14\uB85D \uD569\uC5D0\uC11C \uACF5\uBE44\uC640 \uB2E4\uC74C \uBE14\uB85D \uD569 \uBCF5\uC6D0"
          ],
          sourcePattern: "\uAE38\uC774\uAC00 \uAC19\uC740 \uC5F0\uC18D \uAD6C\uAC04\uC758 \uD569\uC774 \uACF5\uBE44\uC758 \uAC70\uB4ED\uC81C\uACF1\uBC30\uAC00 \uB41C\uB2E4\uB294 \uC131\uC9C8\uB85C \uB2E4\uC74C \uBE14\uB85D\uC744 \uACC4\uC0B0",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uCCAB \uBE14\uB85D\uC744 \uB4F1\uBE44\uC218\uC5F4\uC758 \uD569\uC73C\uB85C \uB098\uD0C0\uB0B8\uB2E4.",
              "\uB2E4\uC74C \uBE14\uB85D\uC758 \uAC01 \uD56D\uC774 \uACF5\uBE44\uC758 \uC77C\uC815 \uAC70\uB4ED\uC81C\uACF1\uBC30\uC784\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uB450 \uBE14\uB85D \uD569\uC758 \uBE44\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC8FC\uC5B4\uC9C4 \uCCAB \uBE14\uB85D \uD569\uC73C\uB85C \uBAA9\uD45C \uD569\uC744 \uAD6C\uD55C\uB2E4."
            ],
            [
              "\uAC19\uC740 \uAE38\uC774 \uBE14\uB85D \uC0AC\uC774\uC758 \uBC30\uC728\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC591\uC758 \uACF5\uBE44 \uC870\uAC74\uC5D0\uC11C \uACF5\uBE44\uB97C \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uB2E4\uC74C \uBE14\uB85D\uC5D0\uB3C4 \uAC19\uC740 \uBC30\uC728\uC744 \uC801\uC6A9\uD55C\uB2E4.",
              "\uC694\uAD6C\uD55C \uB450 \uBE14\uB85D \uD569\uC758 \uCC28\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const ratio = choose([2, 3]);
            const block = choose([2, 3]);
            const first = randomInteger(1, 3);
            const blockSum = (start) => Array.from(
              { length: block },
              (_, index) => first * power(
                ratio,
                start + index - 1
              )
            ).reduce(
              (sum, value) => sum + value,
              0
            );
            const firstBlock = blockSum(1);
            const secondBlock = blockSum(block + 1);
            const thirdBlock = blockSum(2 * block + 1);
            const answer = mode === 0 ? secondBlock : thirdBlock - secondBlock;
            return makeShortAnswer({
              prompt: `\uACF5\uBE44\uAC00 \uC591\uC218\uC778 \uB4F1\uBE44\uC218\uC5F4 $\\{a_n\\}$\uC5D0\uC11C $a_1+\\cdots+a_${block}=${firstBlock}$, $a_${block + 1}=${power(ratio, block)}a_1$\uC774\uB2E4. $${mode === 0 ? `a_${block + 1}+\\cdots+a_${2 * block}` : `(a_${2 * block + 1}+\\cdots+a_${3 * block})-(a_${block + 1}+\\cdots+a_${2 * block})`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? firstBlock * power(ratio, block) : firstBlock * power(
                ratio,
                2 * block
              ) - firstBlock * power(ratio, block),
              solution: `$r^{${block}}=${power(ratio, block)}$\uC774\uACE0 $r>0$\uC774\uBBC0\uB85C $r=${ratio}$. \uAE38\uC774\uAC00 ${block}\uC778 \uB2E4\uC74C \uBE14\uB85D\uC758 \uD569\uC740 \uC55E \uBE14\uB85D \uD569\uC758 $r^{${block}}=${power(ratio, block)}$\uBC30\uC774\uB2E4. ${mode === 0 ? "" : `\uB530\uB77C\uC11C \uC14B\uC9F8 \uBE14\uB85D \uD569\uC740 ${thirdBlock}\uC774\uACE0 `}\uC694\uAD6C\uD55C \uAC12\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uAC19\uC740 \uAE38\uC774\uB9CC\uD07C \uC9C0\uC218\uAC00 \uC774\uB3D9\uD558\uBA74 \uBE14\uB85D \uC804\uCCB4\uC5D0 \uAC19\uC740 r\uC758 \uAC70\uB4ED\uC81C\uACF1\uC774 \uACF1\uD574\uC9D1\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "telescoping-reciprocal-sum",
          titles: [
            "\uBD80\uBD84\uBD84\uC218 \uBD84\uD574\uB85C \uC18C\uAC70\uB418\uB294 \uC218\uC5F4\uC758 \uD569",
            "\uAC04\uACA9\uC774 \uC788\uB294 \uC5ED\uC218 \uACF1\uC758 \uB9DD\uC6D0\uD569"
          ],
          sourcePattern: "\uC5F0\uC18D\uD558\uAC70\uB098 \uC77C\uC815 \uAC04\uACA9\uC778 \uB450 \uC77C\uCC28\uC2DD\uC758 \uACF1\uC744 \uBD80\uBD84\uBD84\uC218\uB85C \uBD84\uD574\uD574 \uC911\uAC04\uD56D\uC744 \uC18C\uAC70",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uC77C\uBC18\uD56D\uC744 \uB450 \uB2E8\uC704\uBD84\uC218\uC758 \uCC28\uB85C \uBD84\uD574\uD55C\uB2E4.",
              "\uC55E\uC758 \uBA87 \uD56D\uC744 \uC368 \uC18C\uAC70 \uAD6C\uC870\uB97C \uD655\uC778\uD55C\uB2E4.",
              "\uCC98\uC74C\uACFC \uB9C8\uC9C0\uB9C9\uC5D0 \uB0A8\uB294 \uD56D\uB9CC \uBAA8\uC740\uB2E4.",
              "\uAE30\uC57D\uBD84\uC218\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ],
            [
              "1/((k+c)(k+c+d))\uB97C \uAC04\uACA9 d\uB97C \uBC18\uC601\uD574 \uBD84\uD574\uD55C\uB2E4.",
              "\uC2DC\uADF8\uB9C8\uB97C \uB450 \uD569\uC758 \uCC28\uB85C \uB098\uB208\uB2E4.",
              "\uACB9\uCE58\uB294 \uC911\uAC04\uD56D\uC744 \uC18C\uAC70\uD55C\uB2E4.",
              "\uACBD\uACC4\uD56D\uC744 \uD1B5\uBD84\uD574 \uB2F5\uC744 \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const count = randomInteger(5, 10);
            const gap = mode === 0 ? 1 : 2;
            const start = randomInteger(1, 3);
            let numerator = 0;
            let denominator = 1;
            for (let index = 1; index <= count; index += 1) {
              const termDenominator = (index + start) * (index + start + gap);
              numerator = numerator * termDenominator + denominator;
              denominator *= termDenominator;
              const divisor = (function common(left, right) {
                return right ? common(
                  right,
                  left % right
                ) : Math.abs(left);
              })(numerator, denominator);
              numerator /= divisor;
              denominator /= divisor;
            }
            const answer = fraction(
              numerator,
              denominator
            );
            return makeShortAnswer({
              prompt: `$\\sum_{k=1}^{${count}}\\dfrac{1}{(k+${start})(k+${start + gap})}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: fraction(
                numerator,
                denominator
              ),
              solution: `\uC77C\uBC18\uD56D\uC740 $\\dfrac1{${gap}}\\{\\dfrac1{k+${start}}-\\dfrac1{k+${start + gap}}\\}$\uB85C \uBD84\uD574\uB41C\uB2E4. \uC911\uAC04\uD56D\uC744 \uC18C\uAC70\uD558\uACE0 \uACBD\uACC4\uD56D\uC744 \uD569\uCE58\uBA74 $${answer}$\uC774\uB2E4.`,
              hintText: "\uBD84\uBAA8\uC758 \uB450 \uC77C\uCC28\uC2DD \uAC01\uAC01\uC744 \uBD84\uBAA8\uB85C \uAC16\uB294 \uB450 \uBD84\uC218\uC758 \uCC28\uB85C \uBC14\uAFB8\uC138\uC694."
            });
          }
        },
        {
          id: "affine-recurrence-shift",
          titles: [
            "\uC0C1\uC218 \uD3C9\uD589\uC774\uB3D9\uC73C\uB85C \uB4F1\uBE44\uC218\uC5F4\uC774 \uB418\uB294 \uC810\uD654\uC2DD",
            "\uC77C\uCC28 \uC810\uD654\uC2DD\uC758 \uBD88\uBCC0\uC810\uACFC \uBD80\uBD84\uD569"
          ],
          sourcePattern: "a_{n+1}=ra_n+c\uC758 \uBD88\uBCC0\uC810\uC744 \uCC3E\uC544 \uC218\uC5F4\uC744 \uD3C9\uD589\uC774\uB3D9\uD55C \uB4A4 \uB4F1\uBE44\uC218\uC5F4\uB85C \uD574\uC11D",
          estimatedMinutes: [13, 14],
          reasoningSteps: [
            [
              "\uC810\uD654\uC2DD\uC758 \uBD88\uBCC0\uC810 L\uC744 \uAD6C\uD55C\uB2E4.",
              "b_n=a_n-L\uB85C \uC0C8 \uC218\uC5F4\uC744 \uC815\uC758\uD55C\uB2E4.",
              "b_n\uC774 \uB4F1\uBE44\uC218\uC5F4\uC784\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uC77C\uBC18\uD56D\uC744 \uBCF5\uC6D0\uD574 \uBAA9\uD45C \uD56D\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uC0C1\uC218\uD56D\uC774 \uC0AC\uB77C\uC9C0\uB294 \uD3C9\uD589\uC774\uB3D9\uB7C9\uC744 \uCC3E\uB294\uB2E4.",
              "\uBCC0\uD658\uD55C \uB4F1\uBE44\uC218\uC5F4\uC758 \uC77C\uBC18\uD56D\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC6D0\uB798 \uC218\uC5F4\uC758 \uBD80\uBD84\uD569\uC744 \uB4F1\uBE44\uD569\uACFC \uC0C1\uC218\uD569\uC73C\uB85C \uB098\uB208\uB2E4.",
              "\uB450 \uD569\uC744 \uACB0\uD569\uD574 \uB2F5\uC744 \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const ratio = choose([2, 3]);
            const fixed = randomInteger(1, 4);
            const first = fixed + randomInteger(1, 3);
            const count = randomInteger(5, 7);
            const term = (index) => fixed + (first - fixed) * power(
              ratio,
              index - 1
            );
            const answer = mode === 0 ? term(count) : Array.from(
              { length: count },
              (_, index) => term(index + 1)
            ).reduce(
              (sum, value) => sum + value,
              0
            );
            return makeShortAnswer({
              prompt: `\uC218\uC5F4 $\\{a_n\\}$\uC774 $a_1=${first}$, $a_{n+1}=${ratio}a_n${signed((1 - ratio) * fixed)}$\uC744 \uB9CC\uC871\uD55C\uB2E4. $${mode === 0 ? `a_${count}` : `\\sum_{k=1}^{${count}}a_k`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? fixed + (first - fixed) * power(
                ratio,
                count - 1
              ) : count * fixed + (first - fixed) * (power(ratio, count) - 1) / (ratio - 1),
              solution: `$b_n=a_n-${fixed}$\uB77C \uD558\uBA74 $b_{n+1}=${ratio}b_n$\uC774\uACE0 $b_1=${first - fixed}$. $a_n=${fixed}+${first - fixed}\\cdot${ratio}^{n-1}$\uC774\uBBC0\uB85C \uC694\uAD6C\uD55C \uAC12\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC810\uD654\uC2DD\uC5D0 \uB300\uC785\uD574\uB3C4 \uADF8\uB300\uB85C \uC720\uC9C0\uB418\uB294 \uC0C1\uC218\uAC12\uC744 \uCC3E\uC544 \uBE7C \uBCF4\uC138\uC694."
            });
          }
        },
        {
          id: "arithmetic-geometric-sum",
          titles: [
            "\uB4F1\uCC28\xB7\uB4F1\uBE44\uAC00 \uC11E\uC778 \uD569\uC758 \uC774\uB3D9 \uC18C\uAC70",
            "k\uC640 \uC9C0\uC218\uD56D\uC758 \uACF1\uC744 \uD3EC\uD568\uD55C \uC2DC\uADF8\uB9C8"
          ],
          sourcePattern: "\uB4F1\uCC28\uACC4\uC218\uC640 \uB4F1\uBE44\uD56D\uC774 \uACF1\uD574\uC9C4 \uD569\uC5D0 \uACF5\uBE44\uB97C \uACF1\uD558\uACE0 \uD55C \uCE78 \uC774\uB3D9\uD574 \uB450 \uC2DD\uC744 \uBE7C\uB294 \uC720\uD615",
          estimatedMinutes: [14, 15],
          reasoningSteps: [
            [
              "\uAD6C\uD558\uB824\uB294 \uD569\uC744 S\uB85C \uB454\uB2E4.",
              "S\uC5D0 \uACF5\uBE44\uB97C \uACF1\uD574 \uD56D\uC744 \uD55C \uCE78 \uB9DE\uCD98\uB2E4.",
              "\uB450 \uC2DD\uC744 \uBE7C \uC911\uAC04\uC758 \uB4F1\uBE44\uD56D\uC744 \uC815\uB9AC\uD55C\uB2E4.",
              "\uB4F1\uBE44\uC218\uC5F4\uC758 \uD569\uC744 \uC801\uC6A9\uD574 S\uB97C \uAD6C\uD55C\uB2E4."
            ],
            [
              "k r^{k-1} \uD615\uD0DC\uC758 \uD569\uC744 \uC4F4\uB2E4.",
              "\uACF5\uBE44\uB97C \uACF1\uD55C \uC2DD\uACFC \uC6D0\uC2DD\uC744 \uBE80\uB2E4.",
              "\uB0A8\uC740 \uC0C1\uC218\uBC30 \uB4F1\uBE44\uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uB05D\uD56D\uC744 \uD3EC\uD568\uD574 \uCD5C\uC885\uAC12\uC744 \uAC80\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const ratio = choose([2, 3]);
            const count = randomInteger(5, 7);
            const answer = Array.from(
              { length: count },
              (_, index) => {
                const k = index + 1;
                return (mode === 0 ? k : 2 * k - 1) * power(ratio, k - 1);
              }
            ).reduce(
              (sum, value) => sum + value,
              0
            );
            return makeShortAnswer({
              prompt: `$\\sum_{k=1}^{${count}}${mode === 0 ? "k" : "(2k-1)"}\\cdot${ratio}^{k-1}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: Array.from(
                { length: count },
                (_, index) => (mode === 0 ? index + 1 : 2 * index + 1) * power(ratio, index)
              ).reduce(
                (sum, value) => sum + value,
                0
              ),
              solution: `\uC8FC\uC5B4\uC9C4 \uD569\uC744 $S$\uB77C \uD558\uACE0 ${ratio}S\uB97C \uD55C \uD56D\uC529 \uBC00\uC5B4 \uC4F4 \uB4A4 \uB450 \uC2DD\uC744 \uBE80\uB2E4. \uB0A8\uC740 \uB4F1\uBE44\uC218\uC5F4\uC758 \uD569\uACFC \uB9C8\uC9C0\uB9C9 \uD56D\uC744 \uC815\uB9AC\uD558\uBA74 $S=${answer}$\uC774\uB2E4.`,
              hintText: "\uD569 \uC804\uCCB4\uC5D0 \uACF5\uBE44\uB97C \uACF1\uD55C \uC2DD\uC744 \uC6D0\uB798 \uC2DD\uACFC \uC704\uC544\uB798\uB85C \uB9DE\uCDB0 \uBE7C\uC138\uC694."
            });
          }
        }
      ];
      module.exports = {
        courseId,
        unitId,
        requiredConceptIds,
        minimumAppliedPoolSize: 15,
        appliedPolicy: {
          includeBankTypes: true,
          minimumLocalDifficulty: 3
        },
        advancedTemplates: defineAdvancedTemplates({
          courseId,
          unitId,
          requiredConceptIds,
          families
        })
      };
    }
  });

  // services/assessmentTemplates/calculus1/limitsAndContinuity.js
  var require_limitsAndContinuity = __commonJS({
    "services/assessmentTemplates/calculus1/limitsAndContinuity.js"(exports, module) {
      var {
        randomInteger,
        choose,
        fraction,
        polynomialTex,
        linearFactor,
        signed,
        makeShortAnswer,
        defineAdvancedTemplates
      } = require_shared();
      var courseId = "calculus-1";
      var unitId = "limits-and-continuity";
      var requiredConceptIds = [
        "calculus-1-01-01",
        "calculus-1-01-02",
        "calculus-1-01-03",
        "calculus-1-01-04"
      ];
      var families = [
        {
          id: "finite-limit-parameter",
          titles: [
            "\uC720\uD55C\uD55C \uADF9\uD55C \uC870\uAC74\uC5D0\uC11C \uC774\uCC28\uC2DD \uACC4\uC218 \uBCF5\uC6D0",
            "\uC778\uC218 \uC18C\uAC70\uC640 \uADF9\uD55C\uAC12\uC73C\uB85C \uB9E4\uAC1C\uBCC0\uC218 \uACB0\uD569\uAC12 \uACB0\uC815"
          ],
          sourcePattern: "0/0 \uAF34\uC774 \uC720\uD55C\uD55C \uAC12\uC744 \uAC16\uB294 \uC870\uAC74\uACFC \uC57D\uBD84 \uD6C4 \uADF9\uD55C\uAC12\uC744 \uCC28\uB840\uB85C \uC0AC\uC6A9",
          estimatedMinutes: [10, 11],
          reasoningSteps: [
            [
              "\uADF9\uD55C\uC774 \uC720\uD55C\uD558\uB824\uBA74 \uBD84\uC790\uAC00 \uACBD\uACC4\uC810\uC5D0\uC11C 0\uC774\uC5B4\uC57C \uD568\uC744 \uC0AC\uC6A9\uD55C\uB2E4.",
              "\uBD84\uC790 \uACC4\uC218 \uC0AC\uC774 \uCCAB \uAD00\uACC4\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC778\uC218\uBD84\uD574\xB7\uC57D\uBD84 \uD6C4 \uADF9\uD55C\uAC12\uC73C\uB85C \uB450 \uBC88\uC9F8 \uAD00\uACC4\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uACC4\uC218\uB97C \uBCF5\uC6D0\uD574 \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uBD84\uBAA8\uAC00 0\uC774 \uB418\uB294 \uC810\uC5D0\uC11C \uBD84\uC790\uB3C4 0\uC774 \uB418\uAC8C \uD55C\uB2E4.",
              "\uB098\uBA38\uC9C0\uC815\uB9AC\uB85C \uD55C \uACC4\uC218\uB97C \uB2E4\uB978 \uACC4\uC218\uB85C \uB098\uD0C0\uB0B8\uB2E4.",
              "\uC57D\uBD84\uB41C \uC77C\uCC28\uC2DD\uC758 \uADF9\uD55C\uC744 \uC8FC\uC5B4\uC9C4 \uAC12\uACFC \uBE44\uAD50\uD55C\uB2E4.",
              "\uC694\uAD6C\uD55C \uACC4\uC218\uC2DD\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const point = randomInteger(-3, 3);
            const other = point + choose([-4, -2, 2, 4]);
            const linear = -(point + other);
            const constant = point * other;
            const limit = point - other;
            const answer = mode === 0 ? linear + constant : linear * constant;
            return makeShortAnswer({
              prompt: `\uC774\uCC28\uC2DD $f(x)=x^2+mx+n$\uC5D0 \uB300\uD558\uC5EC $\\displaystyle\\lim_{x\\to ${point}}\\dfrac{f(x)}{${linearFactor(
                point
              )}}=${limit}$\uC774\uB2E4. $${mode === 0 ? "m+n" : "mn"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? linear + constant : linear * constant,
              solution: `\uADF9\uD55C\uC774 \uC720\uD55C\uD558\uBBC0\uB85C $f(${point})=0$. \uB610 \uBD84\uC790\uB97C $(${linearFactor(
                point
              )})(${linearFactor(
                other
              )})$\uB85C \uC4F0\uBA74 \uC57D\uBD84 \uD6C4 \uADF9\uD55C\uC740 $(${point})-(${other})=${limit}$. \uB530\uB77C\uC11C $m=${linear}$, $n=${constant}$\uC774\uACE0 \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uBA3C\uC800 \uBD84\uC790\uAC00 \uBD84\uBAA8\uC640 \uAC19\uC740 \uC778\uC218\uB97C \uAC00\uC838\uC57C \uD55C\uB2E4\uB294 \uC870\uAC74\uC744 \uC0AC\uC6A9\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "two-boundary-continuity",
          titles: [
            "\uB450 \uACBD\uACC4\uC810 \uC5F0\uC18D \uC870\uAC74\uC758 \uB9E4\uAC1C\uBCC0\uC218 \uC5F0\uB9BD",
            "\uC138 \uAD6C\uAC04 \uD568\uC218\uC758 \uC5F0\uC18D \uC870\uAC74\uC5D0\uC11C \uB05D \uC2DD \uBCF5\uC6D0"
          ],
          sourcePattern: "\uC138 \uAD6C\uAC04\uC73C\uB85C \uC815\uC758\uB41C \uD568\uC218\uAC00 \uB450 \uACBD\uACC4\uC5D0\uC11C \uC5F0\uC18D\uC774\uB77C\uB294 \uC870\uAC74\uC744 \uAC01\uAC01 \uC138\uC6CC \uC5F0\uB9BD",
          estimatedMinutes: [12, 12],
          reasoningSteps: [
            [
              "\uCCAB \uACBD\uACC4\uC810\uC5D0\uC11C \uC88C\uADF9\uD55C\uACFC \uAC00\uC6B4\uB370 \uC2DD\uC758 \uAC12\uC744 \uAC19\uAC8C \uB454\uB2E4.",
              "\uB458\uC9F8 \uACBD\uACC4\uC810\uC5D0\uC11C \uAC00\uC6B4\uB370 \uC2DD\uACFC \uC6B0\uADF9\uD55C\uC744 \uAC19\uAC8C \uB454\uB2E4.",
              "\uB450 \uB9E4\uAC1C\uBCC0\uC218\uB97C \uAC01\uAC01 \uAD6C\uD55C\uB2E4.",
              "\uC694\uAD6C\uD55C \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uAC01 \uACBD\uACC4\uC758 \uC77C\uBC29\uADF9\uD55C\uC744 \uAD6C\uD55C\uB2E4.",
              "\uD568\uC22B\uAC12\uACFC \uB450 \uC77C\uBC29\uADF9\uD55C\uC758 \uC77C\uCE58\uB97C \uC2DD\uC73C\uB85C \uB9CC\uB4E0\uB2E4.",
              "\uC0C1\uC218\uD56D \uB450 \uAC1C\uB97C \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uB450 \uAC12\uC758 \uACF1\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const leftBoundary = -1;
            const rightBoundary = 2;
            const quadratic = [
              randomInteger(-3, 3),
              randomInteger(-3, 3),
              1
            ];
            const middleAtLeft = quadratic[0] - quadratic[1] + 1;
            const middleAtRight = quadratic[0] + 2 * quadratic[1] + 4;
            const leftSlope = randomInteger(1, 4);
            const rightSlope = randomInteger(-3, 3);
            const leftConstant = middleAtLeft + leftSlope;
            const rightConstant = middleAtRight - 2 * rightSlope;
            const answer = mode === 0 ? leftConstant + rightConstant : leftConstant * rightConstant;
            return makeShortAnswer({
              prompt: `\uD568\uC218 $f(x)=\\begin{cases}${leftSlope}x+p&(x<${leftBoundary})\\\\${polynomialTex(
                quadratic
              )}&(${leftBoundary}\\le x<${rightBoundary})\\\\${rightSlope}x+q&(x\\ge${rightBoundary})\\end{cases}$\uAC00 \uC2E4\uC218 \uC804\uCCB4\uC5D0\uC11C \uC5F0\uC18D\uC77C \uB54C, $${mode === 0 ? "p+q" : "pq"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? leftConstant + rightConstant : leftConstant * rightConstant,
              solution: `$x=${leftBoundary}$\uC5D0\uC11C \uC5F0\uC18D \uC870\uAC74\uC73C\uB85C $p=${leftConstant}$, $x=${rightBoundary}$\uC5D0\uC11C \uC5F0\uC18D \uC870\uAC74\uC73C\uB85C $q=${rightConstant}$\uC744 \uC5BB\uB294\uB2E4. \uB450 \uACBD\uACC4 \uC870\uAC74\uC740 \uC11C\uB85C \uB3C5\uB9BD\uC774\uBA70 \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uB450 \uACBD\uACC4\uC810\uB9C8\uB2E4 \uC67C\uCABD \uC2DD\uACFC \uC624\uB978\uCABD \uC2DD\uC758 \uAC12\uC744 \uB530\uB85C \uAC19\uAC8C \uB450\uC138\uC694."
            });
          }
        },
        {
          id: "radical-infinity-next-order",
          titles: [
            "\uBB34\uD55C\uB300 \uC720\uB9AC\uD654 \uADF9\uD55C\uC5D0\uC11C \uB9E4\uAC1C\uBCC0\uC218 \uBCF5\uC6D0",
            "\uB450 \uBB34\uB9AC\uC2DD \uADF9\uD55C\uC758 \uCC28\uB97C \uC720\uB9AC\uD654\uD574 \uACC4\uC218 \uACB0\uC815"
          ],
          sourcePattern: "\uBB34\uD55C\uB300\uB85C \uAC00\uB294 \uBB34\uB9AC\uC2DD\uC758 \u221E-\u221E \uAF34\uC744 \uC720\uB9AC\uD654\uD558\uACE0 \uCD5C\uACE0\uCC28\uD56D\uC73C\uB85C \uADF9\uD55C \uACC4\uC0B0",
          estimatedMinutes: [10, 11],
          reasoningSteps: [
            [
              "\u221E-\u221E \uAF34\uC784\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uCF24\uB808\uC2DD\uC744 \uACF1\uD574 \uC720\uB9AC\uD654\uD55C\uB2E4.",
              "\uBD84\uC790\xB7\uBD84\uBAA8\uB97C x\uB85C \uB098\uB208\uB2E4.",
              "\uADF9\uD55C\uAC12\uACFC \uBE44\uAD50\uD574 \uB9E4\uAC1C\uBCC0\uC218\uB97C \uAD6C\uD55C\uB2E4."
            ],
            [
              "\uB450 \uBB34\uB9AC\uC2DD \uAC01\uAC01\uC744 \uC720\uB9AC\uD654\uD55C\uB2E4.",
              "\uAC01 \uADF9\uD55C\uC744 \uC77C\uCC28\uD56D \uACC4\uC218\uC758 \uC808\uBC18\uC73C\uB85C \uBC14\uAFBC\uB2E4.",
              "\uC8FC\uC5B4\uC9C4 \uADF9\uD55C \uCC28\uB85C \uACC4\uC218 \uAD00\uACC4\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC694\uAD6C\uD55C \uACC4\uC218 \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const first = choose([2, 4, 6, 8]);
            const second = choose([2, 4, 6]);
            const firstLimit = first / 2;
            const secondLimit = second / 2;
            const answer = mode === 0 ? first : first + second;
            return makeShortAnswer({
              prompt: mode === 0 ? `$\\displaystyle\\lim_{x\\to\\infty}(\\sqrt{x^2+kx+${randomInteger(
                1,
                5
              )}}-x)=${firstLimit}$\uC77C \uB54C, \uC0C1\uC218 $k$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.` : `$\\displaystyle\\lim_{x\\to\\infty}\\{(\\sqrt{x^2+${first}x+1}-x)-(\\sqrt{x^2+kx+4}-x)\\}=${firstLimit - secondLimit}$\uC77C \uB54C, $${first}+k$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 2 * firstLimit : first + second,
              solution: mode === 0 ? `\uCF24\uB808\uC2DD\uC73C\uB85C \uC720\uB9AC\uD654\uD558\uBA74 \uADF9\uD55C\uC740 $k/2$\uC774\uB2E4. $k/2=${firstLimit}$\uC774\uBBC0\uB85C $k=${first}$.` : `\uAC01 \uBB34\uB9AC\uC2DD\uC744 \uC720\uB9AC\uD654\uD55C \uADF9\uD55C\uC740 \uC77C\uCC28\uD56D \uACC4\uC218\uC758 \uC808\uBC18\uC774\uB2E4. \uB530\uB77C\uC11C $(${first}-k)/2=${firstLimit - secondLimit}$\uC5D0\uC11C $k=${second}$\uC774\uACE0 \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uCF24\uB808\uC2DD\uC744 \uACF1\uD55C \uB4A4 \uBD84\uC790\uC640 \uBD84\uBAA8\uB97C x\uB85C \uB098\uB204\uC138\uC694."
            });
          }
        },
        {
          id: "absolute-one-sided-limit",
          titles: [
            "\uC808\uB313\uAC12 \uC88C\uC6B0\uADF9\uD55C\uC73C\uB85C \uB9E4\uAC1C\uBCC0\uC218 \uACB0\uC815",
            "\uC808\uB313\uAC12 \uD3EC\uD568 \uAD6C\uAC04\uBCC4 \uADF9\uD55C\uC758 \uC874\uC7AC \uC870\uAC74"
          ],
          sourcePattern: "|x-a|/(x-a)\uC758 \uC88C\uC6B0 \uBD80\uD638 \uCC28\uC774\uB97C \uC774\uC6A9\uD574 \uC77C\uBC29\uADF9\uD55C\uACFC \uADF9\uD55C \uC874\uC7AC \uC870\uAC74\uC744 \uD574\uC11D",
          estimatedMinutes: [10, 11],
          reasoningSteps: [
            [
              "x<a\uC640 x>a\uC5D0\uC11C \uC808\uB313\uAC12\uC744 \uAC01\uAC01 \uD47C\uB2E4.",
              "\uC88C\uADF9\uD55C\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC6B0\uADF9\uD55C\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC8FC\uC5B4\uC9C4 \uC77C\uBC29\uADF9\uD55C \uAC12\uC73C\uB85C \uB9E4\uAC1C\uBCC0\uC218\uB97C \uC815\uD55C\uB2E4."
            ],
            [
              "\uC808\uB313\uAC12 \uC2DD\uC744 \uC88C\uC6B0 \uAD6C\uAC04\uC73C\uB85C \uB098\uB208\uB2E4.",
              "\uB450 \uC77C\uBC29\uADF9\uD55C\uC744 \uAC01\uAC01 \uB9E4\uAC1C\uBCC0\uC218\uB85C \uD45C\uD604\uD55C\uB2E4.",
              "\uADF9\uD55C \uC874\uC7AC \uC870\uAC74\uC73C\uB85C \uB450 \uAC12\uC744 \uAC19\uAC8C \uB454\uB2E4.",
              "\uB9E4\uAC1C\uBCC0\uC218 \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const point = randomInteger(-3, 3);
            const coefficient = randomInteger(2, 6);
            const constant = randomInteger(-4, 4);
            const leftLimit = -coefficient + constant;
            const rightLimit = coefficient + constant;
            const answer = mode === 0 ? coefficient : constant;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uD568\uC218 $f(x)=k\\dfrac{|${linearFactor(
                point
              )}|}{${linearFactor(
                point
              )}}${constant >= 0 ? "+" : ""}${constant}$\uC5D0 \uB300\uD558\uC5EC $\\displaystyle\\lim_{x\\to ${point}^{-}}f(x)=${leftLimit}$, $k>0$\uC77C \uB54C $k$\uB97C \uAD6C\uD558\uC2DC\uC624.` : `\uD568\uC218 $f(x)=\\dfrac{|${linearFactor(
                point
              )}|}{${linearFactor(
                point
              )}}+c$\uC758 \uC88C\uADF9\uD55C\uACFC \uC6B0\uADF9\uD55C\uC758 \uD569\uC774 ${2 * constant}\uC77C \uB54C $c$\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? constant - leftLimit : constant,
              solution: `$x<${point}$\uC5D0\uC11C\uB294 $|${linearFactor(
                point
              )}|/(${linearFactor(
                point
              )})=-1$, $x>${point}$\uC5D0\uC11C\uB294 1\uC774\uB2E4. ${mode === 0 ? `\uC88C\uADF9\uD55C\uC740 $-k${constant >= 0 ? "+" : ""}${constant}=${leftLimit}$\uC774\uBBC0\uB85C $k=${coefficient}$.` : `\uB450 \uC77C\uBC29\uADF9\uD55C\uC740 $-1+c$, $1+c$\uC774\uACE0 \uD569\uC740 $2c=${2 * constant}$\uC774\uBBC0\uB85C $c=${constant}$.`}`,
              hintText: "\uC808\uB313\uAC12 \uC548\uC758 \uC2DD\uC774 \uC591\uC218\uC778\uC9C0 \uC74C\uC218\uC778\uC9C0 \uACBD\uACC4\uC758 \uC591\uCABD\uC5D0\uC11C \uB530\uB85C \uD310\uB2E8\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "intermediate-value-interval",
          titles: [
            "\uC911\uAC04\uAC12 \uC815\uB9AC\uB85C \uADFC\uC774 \uBCF4\uC7A5\uB418\uB294 \uB2E8\uC704\uAD6C\uAC04 \uD310\uC815",
            "\uC5F0\uC18D\uD568\uC218\uC758 \uBD80\uD638\uD45C\uC5D0\uC11C \uC11C\uB85C \uB2E4\uB978 \uADFC\uC758 \uCD5C\uC18C \uAC1C\uC218"
          ],
          sourcePattern: "\uC5F0\uC18D\uC131\uACFC \uC591 \uB05D\uAC12\uC758 \uBD80\uD638 \uBCC0\uD654\uB97C \uACB0\uD569\uD574 \uADFC\uC758 \uC874\uC7AC \uAD6C\uAC04 \uB610\uB294 \uCD5C\uC18C \uAC1C\uC218\uB97C \uD310\uC815",
          estimatedMinutes: [12, 12],
          reasoningSteps: [
            [
              "\uD568\uC218\uAC00 \uC5F0\uC18D\uC784\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uD6C4\uBCF4 \uC815\uC218\uC810\uC5D0\uC11C \uD568\uC218\uAC12\uC758 \uBD80\uD638\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uBD80\uD638\uAC00 \uBC14\uB00C\uB294 \uC778\uC811 \uAD6C\uAC04\uC744 \uCC3E\uB294\uB2E4.",
              "\uC911\uAC04\uAC12 \uC815\uB9AC\uB85C \uADFC\uC774 \uBCF4\uC7A5\uB418\uB294 \uAD6C\uAC04 \uC218\uB97C \uC13C\uB2E4."
            ],
            [
              "\uC8FC\uC5B4\uC9C4 \uC810\uB4E4\uC744 x\uC88C\uD45C \uC21C\uC11C\uB85C \uBC30\uC5F4\uD55C\uB2E4.",
              "\uC774\uC6C3\uD55C \uD568\uC218\uAC12\uC758 \uBD80\uD638\uB97C \uBE44\uAD50\uD55C\uB2E4.",
              "\uC11C\uB85C \uACB9\uCE58\uC9C0 \uC54A\uB294 \uBD80\uD638 \uBCC0\uD654 \uAD6C\uAC04\uC744 \uACE0\uB978\uB2E4.",
              "\uAC01 \uAD6C\uAC04\uC758 \uADFC \uC874\uC7AC\uB97C \uD569\uD574 \uCD5C\uC18C \uAC1C\uC218\uB97C \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const roots = [
              -2.5,
              0.5,
              3.5
            ];
            const value = (x) => (x - roots[0]) * (x - roots[1]) * (x - roots[2]);
            const intervals = [
              [-3, -2],
              [0, 1],
              [3, 4]
            ];
            const signs = [
              -3,
              -2,
              0,
              1,
              3,
              4
            ].map((x) => ({
              x,
              value: value(x)
            }));
            const answer = 3;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uC5F0\uC18D\uD568\uC218 $f(x)=(2x+5)(2x-1)(2x-7)$\uC5D0 \uB300\uD558\uC5EC \uC5F4\uB9B0\uAD6C\uAC04 $(-3,-2),(0,1),(3,4)$ \uC911 \uC911\uAC04\uAC12 \uC815\uB9AC\uB85C $f(x)=0$\uC758 \uD574\uAC00 \uC874\uC7AC\uD568\uC774 \uBCF4\uC7A5\uB418\uB294 \uAD6C\uAC04\uC758 \uAC1C\uC218\uB97C \uAD6C\uD558\uC2DC\uC624.` : `\uC5F0\uC18D\uD568\uC218 $f$\uAC00 ${signs.map(
                ({ x, value: y }) => `$f(${x})=${y > 0 ? 1 : -1}$`
              ).join(", ")}\uC744 \uB9CC\uC871\uD560 \uB54C, $f(x)=0$\uC758 \uC11C\uB85C \uB2E4\uB978 \uC2E4\uADFC\uC758 \uCD5C\uC18C \uAC1C\uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: intervals.filter(
                ([left, right]) => value(left) * value(right) < 0
              ).length,
              solution: `\uAC01 \uC778\uC811 \uAD6C\uAC04\uC758 \uC591 \uB05D\uC5D0\uC11C \uD568\uC218\uAC12\uC758 \uBD80\uD638\uAC00 \uBC18\uB300\uC774\uACE0 \uD568\uC218\uAC00 \uC5F0\uC18D\uC774\uB2E4. \uC138 \uAD6C\uAC04\uC740 \uC11C\uB85C \uACB9\uCE58\uC9C0 \uC54A\uC73C\uBBC0\uB85C \uAC01 \uAD6C\uAC04\uB9C8\uB2E4 \uC801\uC5B4\uB3C4 \uD55C \uADFC\uC774 \uC874\uC7AC\uD55C\uB2E4. \uB530\uB77C\uC11C \uB2F5\uC740 3\uC774\uB2E4.`,
              hintText: "\uC5F0\uC18D\uD568\uC218\uC758 \uC591 \uB05D\uAC12 \uACF1\uC774 \uC74C\uC218\uC778 \uC11C\uB85C \uACB9\uCE58\uC9C0 \uC54A\uB294 \uAD6C\uAC04\uC744 \uCC3E\uC73C\uC138\uC694."
            });
          }
        },
        {
          id: "composed-limit-recovery",
          titles: [
            "\uD569\xB7\uACF1\uC758 \uADF9\uD55C\uC5D0\uC11C \uB450 \uD568\uC218\uC758 \uADF9\uD55C \uBCF5\uC6D0",
            "\uB450 \uADF9\uD55C \uAD00\uACC4\uC5D0\uC11C \uD569\uC131 \uC720\uB9AC\uC2DD\uC758 \uADF9\uD55C \uACC4\uC0B0"
          ],
          sourcePattern: "\uB450 \uD568\uC218\uC758 \uD569\uACFC \uACF1\uC758 \uADF9\uD55C\uC73C\uB85C \uAC01\uAC01\uC758 \uADF9\uD55C\uAC12\uC744 \uBCF5\uC6D0\uD558\uACE0 \uC720\uB9AC\uC2DD\uC5D0 \uB300\uC785",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uB450 \uD568\uC218\uC758 \uADF9\uD55C\uAC12\uC744 u,v\uB85C \uB454\uB2E4.",
              "\uD569\uACFC \uACF1 \uC870\uAC74\uC73C\uB85C \uC774\uCC28\uBC29\uC815\uC2DD\uC744 \uB9CC\uB4E0\uB2E4.",
              "\uB300\uC18C \uC870\uAC74\uC73C\uB85C u,v\uC758 \uC21C\uC11C\uB97C \uC815\uD55C\uB2E4.",
              "\uBAA9\uD45C \uC720\uB9AC\uC2DD\uC758 \uADF9\uD55C\uC5D0 \uB300\uC785\uD55C\uB2E4."
            ],
            [
              "\uADF9\uD55C\uC758 \uC0AC\uCE59\uC5F0\uC0B0\uC73C\uB85C u+v\uC640 uv\uB97C \uC77D\uB294\uB2E4.",
              "u,v\uB97C \uB450 \uADFC\uC73C\uB85C \uAC16\uB294 \uBC29\uC815\uC2DD\uC744 \uD47C\uB2E4.",
              "\uCD94\uAC00 \uC870\uAC74\uC73C\uB85C \uAC01 \uAC12\uC744 \uAD6C\uBD84\uD55C\uB2E4.",
              "\uBD84\uBAA8\uAC00 0\uC774 \uC544\uB2D8\uC744 \uD655\uC778\uD558\uACE0 \uBAA9\uD45C \uADF9\uD55C\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const low = randomInteger(1, 3);
            const high = low + randomInteger(2, 4);
            const answer = mode === 0 ? fraction(
              high + 1,
              low + 1
            ) : fraction(
              high ** 2 + low,
              high - low
            );
            return makeShortAnswer({
              prompt: `\uD568\uC218 $f,g$\uC5D0 \uB300\uD558\uC5EC $\\lim_{x\\to a}\\{f(x)+g(x)\\}=${low + high}$, $\\lim_{x\\to a}f(x)g(x)=${low * high}$\uC774\uACE0 $\\lim_{x\\to a}f(x)>\\lim_{x\\to a}g(x)$\uC774\uB2E4. $\\displaystyle\\lim_{x\\to a}${mode === 0 ? "\\dfrac{f(x)+1}{g(x)+1}" : "\\dfrac{f(x)^2+g(x)}{f(x)-g(x)}"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: mode === 0 ? fraction(
                high + 1,
                low + 1
              ) : fraction(
                high ** 2 + low,
                high - low
              ),
              solution: `\uB450 \uADF9\uD55C\uAC12\uC744 $u>v$\uB77C \uD558\uBA74 $u+v=${low + high}$, $uv=${low * high}$\uC774\uBBC0\uB85C $u=${high},v=${low}$. \uBAA9\uD45C\uC2DD\uC5D0 \uB300\uC785\uD558\uBA74 $${answer}$\uC774\uB2E4.`,
              hintText: "\uB450 \uADF9\uD55C\uAC12\uC744 \uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uB450 \uADFC\uC73C\uB85C \uBCF5\uC6D0\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "infinity-leading-next-order",
          titles: [
            "\uBB34\uD55C\uB300 \uADF9\uD55C\uC758 \uCD5C\uACE0\uCC28\uD56D\uACFC \uB2E4\uC74C \uACC4\uC218 \uBCF5\uC6D0",
            "\uB450 \uBB34\uD55C\uB300 \uADF9\uD55C\uC73C\uB85C \uC720\uB9AC\uD568\uC218 \uACC4\uC218 \uACB0\uC815"
          ],
          sourcePattern: "\uC720\uB9AC\uD568\uC218\uC758 \uBB34\uD55C\uB300 \uADF9\uD55C\uC5D0\uC11C \uCD5C\uACE0\uCC28\uD56D \uBE44\uB97C \uBA3C\uC800 \uC815\uD558\uACE0 \uCC28\uB97C \uACF1\uD55C \uB2E4\uC74C \uADF9\uD55C\uC73C\uB85C \uB2E4\uC74C \uCC28\uC218 \uACC4\uC218\uB97C \uACB0\uC815",
          estimatedMinutes: [13, 14],
          reasoningSteps: [
            [
              "\uCCAB \uADF9\uD55C\uC5D0\uC11C \uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uC758 \uBE44\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC720\uB9AC\uD568\uC218\uC5D0\uC11C \uADF8 \uADF9\uD55C\uAC12\uC744 \uBE7C \uD1B5\uBD84\uD55C\uB2E4.",
              "x\uB97C \uACF1\uD55C \uB4A4 \uB0A8\uB294 \uCD5C\uACE0\uCC28\uD56D\uC744 \uBE44\uAD50\uD55C\uB2E4.",
              "\uB450 \uACC4\uC218\uC758 \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uBD84\uC790\uC640 \uBD84\uBAA8\uB97C x\xB2\uC73C\uB85C \uB098\uB220 \uCCAB \uB9E4\uAC1C\uBCC0\uC218\uB97C \uCC3E\uB294\uB2E4.",
              "\uADF9\uD55C\uAC12\uACFC \uD568\uC218\uC758 \uCC28\uB97C \uD55C \uBD84\uC218\uB85C \uD569\uCE5C\uB2E4.",
              "\uB2E4\uC74C \uCC28\uC218 \uD56D\uC758 \uACC4\uC218\uB85C \uB450 \uBC88\uC9F8 \uB9E4\uAC1C\uBCC0\uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC6D0\uC2DD\uC758 \uB450 \uC870\uAC74\uC744 \uB2E4\uC2DC \uD655\uC778\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const leading = randomInteger(2, 5);
            const next = randomInteger(-4, 4);
            const constant = randomInteger(1, 5);
            const answer = mode === 0 ? leading + next : leading * next;
            return makeShortAnswer({
              prompt: `\uD568\uC218 $F(x)=\\dfrac{ax^2+bx+${constant}}{x^2+1}$\uC774 $\\lim_{x\\to\\infty}F(x)=${leading}$, $\\lim_{x\\to\\infty}x\\{F(x)-${leading}\\}=${next}$\uB97C \uB9CC\uC871\uD55C\uB2E4. $${mode === 0 ? "a+b" : "ab"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? leading + next : leading * next,
              solution: `\uCCAB \uADF9\uD55C\uC5D0\uC11C $a=${leading}$. \uC774\uB97C \uB300\uC785\uD558\uBA74 $x(F-${leading})=\\dfrac{${next}x^2${signed(constant - leading)}x}{x^2+1}$ \uAF34\uC774\uBBC0\uB85C \uB458\uC9F8 \uADF9\uD55C\uC5D0\uC11C $b=${next}$. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uCCAB \uADF9\uD55C\uC73C\uB85C \uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uB97C \uC815\uD55C \uB4A4 \uADF8 \uADF9\uD55C\uAC12\uC744 \uD568\uC218\uC5D0\uC11C \uBE7C\uC138\uC694."
            });
          }
        },
        {
          id: "two-removable-holes",
          titles: [
            "\uB450 \uC57D\uBD84 \uAC00\uB2A5 \uBD88\uC5F0\uC18D\uC810\uC758 \uC5F0\uC18D \uD655\uC7A5\uAC12",
            "\uB450 \uAD6C\uBA4D\uC744 \uBA54\uC6B4 \uD568\uC218\uAC12\uC758 \uACB0\uD569"
          ],
          sourcePattern: "\uBD84\uC790\xB7\uBD84\uBAA8\uC758 \uACF5\uD1B5\uC778\uC218\uB97C \uC57D\uBD84\uD55C \uB4A4 \uC6D0\uB798 \uC815\uC758\uB418\uC9C0 \uC54A\uC740 \uB450 \uC810\uC758 \uADF9\uD55C\uC73C\uB85C \uC5F0\uC18D \uD655\uC7A5",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uBD84\uC790\uC640 \uBD84\uBAA8\uC758 \uACF5\uD1B5\uC778\uC218\uB97C \uCC3E\uB294\uB2E4.",
              "\uB450 \uC810\uC744 \uC81C\uC678\uD55C \uAD6C\uAC04\uC5D0\uC11C \uC2DD\uC744 \uC57D\uBD84\uD55C\uB2E4.",
              "\uAC01 \uAD6C\uBA4D\uC5D0\uC11C \uC57D\uBD84\uB41C \uC2DD\uC758 \uADF9\uD55C\uC744 \uAD6C\uD55C\uB2E4.",
              "\uB450 \uC5F0\uC18D \uD655\uC7A5\uAC12\uC744 \uACB0\uD569\uD55C\uB2E4."
            ],
            [
              "\uC6D0\uB798 \uC2DD\uC758 \uC815\uC758\uB418\uC9C0 \uC54A\uB294 \uB450 \uC810\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uACF5\uD1B5 \uC774\uCC28\uC778\uC218\uB97C \uC81C\uAC70\uD55C\uB2E4.",
              "\uC5F0\uC18D\uC774 \uB418\uAE30 \uC704\uD55C \uB450 \uD568\uC218\uAC12\uC744 \uAC01\uAC01 \uACB0\uC815\uD55C\uB2E4.",
              "\uB450 \uAC12\uC758 \uACF1 \uB610\uB294 \uCC28\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const left = randomInteger(-3, -1);
            const right = randomInteger(1, 4);
            const slope = choose([2, 3]);
            const intercept = randomInteger(1, 5);
            const leftValue = slope * left + intercept;
            const rightValue = slope * right + intercept;
            const answer = mode === 0 ? leftValue + rightValue : leftValue * rightValue;
            return makeShortAnswer({
              prompt: `\uD568\uC218 $f$\uAC00 $x\\ne${left},${right}$\uC5D0\uC11C $f(x)=\\dfrac{(${linearFactor(left)})(${linearFactor(right)})(${slope}x${signed(intercept)})}{(${linearFactor(left)})(${linearFactor(right)})}$\uC774\uACE0, \uBAA8\uB4E0 \uC2E4\uC218\uC5D0\uC11C \uC5F0\uC18D\uC774 \uB418\uB3C4\uB85D \uC815\uC758\uB41C\uB2E4. $${mode === 0 ? `f(${left})+f(${right})` : `f(${left})f(${right})`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? slope * (left + right) + 2 * intercept : (slope * left + intercept) * (slope * right + intercept),
              solution: `\uB450 \uACF5\uD1B5\uC778\uC218\uB97C \uC57D\uBD84\uD558\uBA74 $f(x)=${slope}x${signed(intercept)}$\uC774\uB2E4. \uC5F0\uC18D \uD655\uC7A5\uAC12\uC740 $f(${left})=${leftValue}$, $f(${right})=${rightValue}$\uC774\uBBC0\uB85C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC815\uC758\uB418\uC9C0 \uC54A\uC740 \uC810\uC744 \uBC14\uB85C \uB300\uC785\uD558\uC9C0 \uB9D0\uACE0 \uBA3C\uC800 \uACF5\uD1B5\uC778\uC218\uB97C \uC57D\uBD84\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "absolute-value-continuity-parameter",
          titles: [
            "\uC808\uB313\uAC12 \uBD84\uAE30\uC810\uC5D0\uC11C \uC5F0\uC18D\uC774 \uB418\uB294 \uB9E4\uAC1C\uBCC0\uC218",
            "\uC808\uB313\uAC12 \uD568\uC218\uC640 \uC77C\uCC28\uD568\uC218\uC758 \uC811\uD569 \uC870\uAC74"
          ],
          sourcePattern: "\uC808\uB313\uAC12\uC758 \uBD84\uAE30\uC810 \uC591\uCABD \uC2DD\uC744 \uB098\uB204\uACE0 \uD568\uC218\uAC12\xB7\uC88C\uC6B0\uADF9\uD55C \uC77C\uCE58 \uC870\uAC74\uC73C\uB85C \uB9E4\uAC1C\uBCC0\uC218\uB97C \uACB0\uC815",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uC808\uB313\uAC12 \uC548\uC758 \uC2DD\uC774 \uBC14\uB00C\uB294 \uACBD\uACC4\uC810\uC744 \uCC3E\uB294\uB2E4.",
              "\uC67C\uCABD\uACFC \uC624\uB978\uCABD \uC2DD\uC744 \uAC01\uAC01 \uC804\uAC1C\uD55C\uB2E4.",
              "\uACBD\uACC4\uC5D0\uC11C \uC88C\uC6B0\uADF9\uD55C\uACFC \uD568\uC218\uAC12\uC744 \uAC19\uAC8C \uB193\uB294\uB2E4.",
              "\uB9E4\uAC1C\uBCC0\uC218\uC758 \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uC811\uD569\uC810 \uC591\uCABD\uC758 \uD568\uC218\uC2DD\uC744 \uBD84\uB9AC\uD55C\uB2E4.",
              "\uAC01 \uC77C\uBC29\uADF9\uD55C\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC5F0\uC18D \uC870\uAC74\uC73C\uB85C \uBBF8\uC9C0 \uACC4\uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB2E4\uB978 \uC810\uC758 \uD568\uC22B\uAC12\uC5D0 \uB300\uC785\uD574 \uAC80\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const point = randomInteger(1, 5);
            const slope = choose([2, 3, 4]);
            const value = randomInteger(-3, 5);
            const intercept = value - slope * point;
            const answer = mode === 0 ? intercept : value + intercept;
            return makeShortAnswer({
              prompt: `\uD568\uC218 $f(x)=\\begin{cases}${slope}x+b,&x<${point}\\\\|x-${point}|${signed(value)},&x\\ge${point}\\end{cases}$\uAC00 $x=${point}$\uC5D0\uC11C \uC5F0\uC18D\uC77C \uB54C, $${mode === 0 ? "b" : `b+f(${point})`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? value - slope * point : 2 * value - slope * point,
              solution: `\uC624\uB978\uCABD \uC2DD\uC5D0\uC11C $f(${point})=${value}$. \uC67C\uCABD \uADF9\uD55C\uC740 $${slope * point}+b$\uC774\uBBC0\uB85C $${slope * point}+b=${value}$, $b=${intercept}$. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC811\uD569\uC810\uC5D0\uC11C \uC67C\uCABD \uADF9\uD55C\uACFC \uC2E4\uC81C \uD568\uC218\uAC12\uC744 \uAC19\uAC8C \uB193\uC73C\uC138\uC694."
            });
          }
        },
        {
          id: "bisection-sign-certification",
          titles: [
            "\uC911\uAC04\uAC12 \uC815\uB9AC\uC640 \uC774\uBD84 \uD0D0\uC0C9\uC73C\uB85C \uADFC\uC758 \uAD6C\uAC04 \uC881\uD788\uAE30",
            "\uD568\uC22B\uAC12 \uBD80\uD638\uD45C\uC5D0\uC11C \uBCF4\uC7A5\uB418\uB294 \uADFC \uAD6C\uAC04 \uD310\uC815"
          ],
          sourcePattern: "\uC5F0\uC18D\uD568\uC218\uC758 \uBD80\uD638\uAC00 \uBC14\uB00C\uB294 \uAD6C\uAC04\uC744 \uCC3E\uACE0 \uC911\uC810\uC744 \uCD94\uAC00 \uC870\uC0AC\uD574 \uADFC\uC758 \uC704\uCE58\uB97C \uB354 \uC881\uD788\uB294 \uC720\uD615",
          estimatedMinutes: [13, 13],
          reasoningSteps: [
            [
              "\uB2E4\uD56D\uD568\uC218\uC758 \uC5F0\uC18D\uC131\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uCD08\uAE30 \uAD6C\uAC04 \uC591 \uB05D\uC758 \uBD80\uD638\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC911\uC810\uC758 \uD568\uC218\uAC12 \uBD80\uD638\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uBD80\uD638\uAC00 \uB2E4\uB978 \uC808\uBC18 \uAD6C\uAC04\uC758 \uB05D\uC810 \uD569\uC744 \uAD6C\uD55C\uB2E4."
            ],
            [
              "\uC8FC\uC5B4\uC9C4 \uBD80\uD638\uD45C\uB97C x\uC88C\uD45C \uC21C\uC11C\uB85C \uC815\uB82C\uD55C\uB2E4.",
              "\uC11C\uB85C \uACB9\uCE58\uC9C0 \uC54A\uB294 \uBD80\uD638 \uBCC0\uD654 \uAD6C\uAC04\uC744 \uCC3E\uB294\uB2E4.",
              "\uC911\uAC04\uC810 \uC815\uBCF4\uB85C \uD55C \uAD6C\uAC04\uC744 \uC808\uBC18\uC73C\uB85C \uC904\uC778\uB2E4.",
              "\uC0C8 \uAD6C\uAC04\uC744 \uB098\uD0C0\uB0B4\uB294 \uC9C0\uD45C\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const root = randomInteger(1, 5) + choose([0.25, 0.75]);
            const left = Math.floor(root);
            const middle = left + 0.5;
            const right = left + 1;
            const narrowLeft = root < middle ? left : middle;
            const narrowRight = root < middle ? middle : right;
            const scale = 4;
            const answer = mode === 0 ? scale * (narrowLeft + narrowRight) : scale * (narrowRight - narrowLeft);
            return makeShortAnswer({
              prompt: `\uC5F0\uC18D\uD568\uC218 $f(x)=4x-${4 * root}$\uC758 \uC601\uC810\uC744 \uD3EC\uD568\uD558\uB294 \uAD6C\uAC04 $(${left},${right})$\uC744 \uC774\uBD84\uD55C\uB2E4. \uC911\uC810\uC5D0\uC11C\uC758 \uD568\uC218\uAC12 \uBD80\uD638\uAE4C\uC9C0 \uC774\uC6A9\uD574 \uC5BB\uB294 \uAE38\uC774 $1/2$\uC778 \uAD6C\uAC04\uC744 $(a,b)$\uB77C \uD560 \uB54C, $${mode === 0 ? "4(a+b)" : "4(b-a)"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 4 * (narrowLeft + narrowRight) : 4 * (narrowRight - narrowLeft),
              solution: `$f(${left})<0<f(${right})$\uC774\uACE0 $f(${middle})$\uC758 \uBD80\uD638\uB97C \uC870\uC0AC\uD558\uBA74 \uADFC\uC740 $(${narrowLeft},${narrowRight})$\uC5D0 \uC788\uB2E4. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC911\uC810\uC758 \uD568\uC218\uAC12\uC774 \uC5B4\uB290 \uB05D\uC810\uACFC \uAC19\uC740 \uBD80\uD638\uC778\uC9C0 \uD655\uC778\uD558\uACE0 \uADF8\uCABD \uC808\uBC18\uC744 \uBC84\uB9AC\uC138\uC694."
            });
          }
        }
      ];
      module.exports = {
        courseId,
        unitId,
        requiredConceptIds,
        minimumAppliedPoolSize: 15,
        appliedPolicy: {
          includeBankTypes: true,
          minimumLocalDifficulty: 3
        },
        advancedTemplates: defineAdvancedTemplates({
          courseId,
          unitId,
          requiredConceptIds,
          families
        })
      };
    }
  });

  // services/assessmentTemplates/calculus1/differentiation.js
  var require_differentiation = __commonJS({
    "services/assessmentTemplates/calculus1/differentiation.js"(exports, module) {
      var {
        randomInteger,
        choose,
        polynomialTex,
        linearFactor,
        signed,
        makeShortAnswer,
        defineAdvancedTemplates
      } = require_shared();
      var courseId = "calculus-1";
      var unitId = "differentiation";
      var requiredConceptIds = [
        "calculus-1-02-01",
        "calculus-1-02-02",
        "calculus-1-02-03",
        "calculus-1-02-04",
        "calculus-1-02-05",
        "calculus-1-02-06",
        "calculus-1-02-07",
        "calculus-1-02-08",
        "calculus-1-02-09",
        "calculus-1-02-10"
      ];
      function cubicValue(coefficients, x) {
        return coefficients.reduce(
          (sum, coefficient, exponent) => sum + coefficient * x ** exponent,
          0
        );
      }
      var families = [
        {
          id: "extrema-coefficient-recovery",
          titles: [
            "\uB450 \uADF9\uAC12 \uC704\uCE58\uC5D0\uC11C \uC0BC\uCC28\uD568\uC218 \uACC4\uC218\uC640 \uD568\uC218\uAC12 \uBCF5\uC6D0",
            "\uADF9\uB300\xB7\uADF9\uC18C \uC870\uAC74\uC73C\uB85C \uC0BC\uCC28\uD568\uC218\uC758 \uACC4\uC218 \uACB0\uD569\uAC12 \uACB0\uC815"
          ],
          sourcePattern: "\uB3C4\uD568\uC218\uC758 \uB450 \uADFC\uC744 \uADF9\uB300\xB7\uADF9\uC18C \uC704\uCE58\uC640 \uC5F0\uACB0\uD558\uACE0 \uACC4\uC218 \uBE44\uAD50 \uD6C4 \uD568\uC218\uAC12 \uACC4\uC0B0",
          estimatedMinutes: [12, 11],
          reasoningSteps: [
            [
              "\uC0BC\uCC28\uD568\uC218\uB97C \uBBF8\uBD84\uD55C\uB2E4.",
              "\uB450 \uADF9\uAC12 \uC704\uCE58\uB97C \uB3C4\uD568\uC218\uC758 \uB450 \uADFC\uC73C\uB85C \uB454\uB2E4.",
              "\uB3C4\uD568\uC218\uB97C \uC778\uC218\uBD84\uD574\uD574 \uC6D0\uD568\uC218 \uACC4\uC218\uB97C \uBE44\uAD50\uD55C\uB2E4.",
              "\uBCF5\uC6D0\uD55C \uD568\uC218\uC5D0 \uADF9\uAC12 \uC704\uCE58\uB97C \uB300\uC785\uD55C\uB2E4."
            ],
            [
              "\uADF9\uB300\xB7\uADF9\uC18C\uC5D0\uC11C f'=0\uC744 \uC0AC\uC6A9\uD55C\uB2E4.",
              "\uB3C4\uD568\uC218\uC758 \uC778\uC218\uBD84\uD574\uC2DD\uACFC \uACC4\uC218\uB97C \uBE44\uAD50\uD55C\uB2E4.",
              "\uB450 \uBBF8\uC9C0 \uACC4\uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC694\uAD6C\uD55C \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const left = randomInteger(-3, -1);
            const right = randomInteger(1, 3);
            const quadraticCoefficient = -3 * (left + right) / 2;
            if (!Number.isInteger(
              quadraticCoefficient
            )) {
              return families[0].generate(
                mode
              );
            }
            const linearCoefficient = 3 * left * right;
            const constant = randomInteger(-5, 5);
            const coefficients = [
              constant,
              linearCoefficient,
              quadraticCoefficient,
              1
            ];
            const valueSum = cubicValue(
              coefficients,
              left
            ) + cubicValue(
              coefficients,
              right
            );
            const answer = mode === 0 ? valueSum : quadraticCoefficient + linearCoefficient;
            return makeShortAnswer({
              prompt: `\uC0BC\uCC28\uD568\uC218 $f(x)=x^3+ax^2+bx${constant >= 0 ? "+" : ""}${constant}$\uAC00 $x=${left}$\uC5D0\uC11C \uADF9\uB300, $x=${right}$\uC5D0\uC11C \uADF9\uC18C\uC77C \uB54C, $${mode === 0 ? `f(${left})+f(${right})` : "a+b"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? valueSum : quadraticCoefficient + linearCoefficient,
              solution: `$f'(x)=3x^2+2ax+b=3(${linearFactor(
                left
              )})(${linearFactor(
                right
              )})$\uC774\uB2E4. \uACC4\uC218 \uBE44\uAD50\uB85C $a=${quadraticCoefficient},b=${linearCoefficient}$. ${mode === 0 ? `\uC774\uB97C \uC6D0\uD568\uC218\uC5D0 \uB300\uC785\uD574 \uB450 \uD568\uC218\uAC12\uC744 \uB354\uD558\uBA74 ${answer}\uC774\uB2E4.` : `\uB530\uB77C\uC11C $a+b=${answer}$.`}`,
              hintText: "\uADF9\uB300\uC640 \uADF9\uC18C\uAC00 \uB418\uB294 x\uC88C\uD45C\uB294 \uB3C4\uD568\uC218\uC758 \uB450 \uADFC\uC785\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "tangent-through-point",
          titles: [
            "\uC678\uBD80\uC810\uC5D0\uC11C \uD3EC\uBB3C\uC120\uC5D0 \uADF8\uC740 \uB450 \uC811\uC120\uC758 \uC811\uC810 \uBCF5\uC6D0",
            "\uB450 \uC811\uC120\uC758 \uAE30\uC6B8\uAE30 \uAD00\uACC4\uC640 \uC811\uC810 \uC88C\uD45C \uACB0\uD569"
          ],
          sourcePattern: "\uC811\uC810\uC744 t\uB85C \uB450\uACE0 \uC811\uC120\uC2DD\uC744 \uC138\uC6B4 \uB4A4 \uC678\uBD80\uC810\uC744 \uC9C0\uB09C\uB2E4\uB294 \uC870\uAC74\uC744 t\uC758 \uBC29\uC815\uC2DD\uC73C\uB85C \uBCC0\uD658",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uC811\uC810\uC758 x\uC88C\uD45C\uB97C t\uB85C \uB454\uB2E4.",
              "\uB3C4\uD568\uC218\uB85C \uC811\uC120\uC758 \uAE30\uC6B8\uAE30\uC640 \uBC29\uC815\uC2DD\uC744 \uB9CC\uB4E0\uB2E4.",
              "\uC678\uBD80\uC810 \uC88C\uD45C\uB97C \uC811\uC120\uC2DD\uC5D0 \uB300\uC785\uD574 t\uC758 \uC774\uCC28\uBC29\uC815\uC2DD\uC744 \uC5BB\uB294\uB2E4.",
              "\uB450 \uC811\uC810 \uC88C\uD45C\uC758 \uB300\uCE6D\uC2DD\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uAC01 \uC811\uC120\uC758 \uC811\uC810\uC744 \uBBF8\uC9C0\uC218\uB85C \uB454\uB2E4.",
              "\uC678\uBD80\uC810 \uD1B5\uACFC \uC870\uAC74\uC73C\uB85C \uB450 \uC811\uC810\uC758 \uBC29\uC815\uC2DD\uC744 \uD47C\uB2E4.",
              "\uB450 \uC811\uC120\uC758 \uAE30\uC6B8\uAE30\uB97C \uAD6C\uD55C\uB2E4.",
              "\uAE30\uC6B8\uAE30\uC758 \uACF1 \uB610\uB294 \uCC28\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const c = randomInteger(-3, 3);
            const radius = randomInteger(2, 5);
            const externalY = c - radius ** 2;
            const left = -radius;
            const right = radius;
            const slopeProduct = 2 * left * (2 * right);
            const answer = mode === 0 ? left ** 2 + right ** 2 : slopeProduct;
            return makeShortAnswer({
              prompt: `\uC810 $P(0,${externalY})$\uC5D0\uC11C \uD3EC\uBB3C\uC120 $y=x^2${c >= 0 ? "+" : ""}${c}$\uC5D0 \uADF8\uC740 \uC11C\uB85C \uB2E4\uB978 \uB450 \uC811\uC120\uC758 \uC811\uC810\uC758 x\uC88C\uD45C\uB97C $\\alpha<\\beta$, \uB450 \uC811\uC120\uC758 \uAE30\uC6B8\uAE30\uB97C $m_1,m_2$\uB77C \uD560 \uB54C, $${mode === 0 ? "\\alpha^2+\\beta^2" : "m_1m_2"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 2 * radius ** 2 : -4 * radius ** 2,
              solution: `\uC811\uC810\uC774 $(t,t^2${signed(
                c
              )})$\uC774\uBA74 \uC811\uC120\uC740 $y=2tx-t^2${signed(
                c
              )}$\uC774\uB2E4. P\uB97C \uB300\uC785\uD558\uBA74 $${externalY}=-t^2${signed(
                c
              )}$, \uC989 $t=\\pm${radius}$. \uB530\uB77C\uC11C \uC694\uAD6C\uD55C \uAC12\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC811\uC810\uC758 x\uC88C\uD45C\uB97C t\uB85C \uB450\uACE0 \uADF8 \uC810\uC5D0\uC11C\uC758 \uC811\uC120\uC2DD\uC744 \uBA3C\uC800 \uB9CC\uB4DC\uC138\uC694."
            });
          }
        },
        {
          id: "cubic-root-count-parameter",
          titles: [
            "\uC0BC\uCC28\uD568\uC218 \uADF9\uAC12\uC73C\uB85C \uBC29\uC815\uC2DD\uC758 \uC2E4\uADFC \uAC1C\uC218 \uD310\uC815",
            "\uC138 \uC2E4\uADFC\uC744 \uAC16\uB294 \uC815\uC218 \uB9E4\uAC1C\uBCC0\uC218 \uAC1C\uC218"
          ],
          sourcePattern: "\uC0BC\uCC28\uD568\uC218\uC758 \uC99D\uAC00\xB7\uAC10\uC18C\uC640 \uADF9\uB313\uAC12\xB7\uADF9\uC19F\uAC12\uC744 \uC218\uD3C9\uC120 \uAD50\uC810 \uAC1C\uC218 \uC870\uAC74\uC73C\uB85C \uBCC0\uD658",
          estimatedMinutes: [11, 13],
          reasoningSteps: [
            [
              "\uD568\uC218\uB97C \uBBF8\uBD84\uD574 \uC784\uACC4\uC810\uC744 \uAD6C\uD55C\uB2E4.",
              "\uAC01 \uC784\uACC4\uC810\uC758 \uD568\uC218\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC218\uD3C9\uC120\uC758 \uB192\uC774\uB97C \uADF9\uB313\uAC12\xB7\uADF9\uC19F\uAC12\uACFC \uBE44\uAD50\uD55C\uB2E4.",
              "\uADF8\uB798\uD504 \uAD50\uC810 \uAC1C\uC218\uB85C \uC2E4\uADFC \uAC1C\uC218\uB97C \uD310\uC815\uD55C\uB2E4."
            ],
            [
              "\uB3C4\uD568\uC218 \uBD80\uD638\uD45C\uB85C \uADF9\uB313\uAC12\uACFC \uADF9\uC19F\uAC12\uC744 \uCC3E\uB294\uB2E4.",
              "\uC138 \uC2E4\uADFC \uC870\uAC74\uC744 \uB9E4\uAC1C\uBCC0\uC218\uC758 \uC5F4\uB9B0\uAD6C\uAC04\uC73C\uB85C \uBC14\uAFBC\uB2E4.",
              "\uB05D\uC810\uC5D0\uC11C\uB294 \uC911\uADFC\uC774 \uC0DD\uAE40\uC744 \uC81C\uC678\uD55C\uB2E4.",
              "\uAD6C\uAC04 \uC548\uC758 \uC815\uC218 \uAC1C\uC218\uB97C \uC13C\uB2E4."
            ]
          ],
          generate(mode) {
            const t = randomInteger(1, 3);
            const critical = 2 * t ** 3;
            const level = choose([
              -critical - 1,
              -critical,
              0,
              critical,
              critical + 1
            ]);
            const rootCount = Math.abs(level) < critical ? 3 : Math.abs(level) === critical ? 2 : 1;
            const integerCount = 2 * critical - 1;
            const answer = mode === 0 ? rootCount : integerCount;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uBC29\uC815\uC2DD $x^3-${3 * t ** 2}x=${level}$\uC758 \uC11C\uB85C \uB2E4\uB978 \uC2E4\uADFC\uC758 \uAC1C\uC218\uB97C \uAD6C\uD558\uC2DC\uC624.` : `\uBC29\uC815\uC2DD $x^3-${3 * t ** 2}x=k$\uAC00 \uC11C\uB85C \uB2E4\uB978 \uC138 \uC2E4\uADFC\uC744 \uAC16\uAC8C \uD558\uB294 \uC815\uC218 $k$\uC758 \uAC1C\uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? rootCount : integerCount,
              solution: `$g'(x)=3(x-${t})(x+${t})$\uC774\uACE0 \uADF9\uB313\uAC12\uC740 ${critical}, \uADF9\uC19F\uAC12\uC740 -${critical}\uC774\uB2E4. ${mode === 0 ? `\uC218\uD3C9\uC120 $y=${level}$\uACFC\uC758 \uAD50\uC810\uC740 ${rootCount}\uAC1C\uC774\uB2E4.` : `\uC138 \uAD50\uC810 \uC870\uAC74\uC740 $-${critical}<k<${critical}$\uC774\uBBC0\uB85C \uC815\uC218\uB294 ${integerCount}\uAC1C\uC774\uB2E4.`}`,
              hintText: "\uBC29\uC815\uC2DD\uC758 \uD574 \uAC1C\uC218\uB97C \uD568\uC218 \uADF8\uB798\uD504\uC640 \uC218\uD3C9\uC120\uC758 \uAD50\uC810 \uAC1C\uC218\uB85C \uBC14\uAFB8\uC138\uC694.",
              visualization: {
                kind: "polynomial",
                degree: 3,
                coefficients: {
                  cubic: 1,
                  quadratic: 0,
                  linear: -3 * t ** 2,
                  constant: 0
                },
                comparisonLineY: mode === 0 ? level : 0,
                focusX: 0,
                note: mode === 0 ? `\uC0BC\uCC28\uD568\uC218\uC640 \uC218\uD3C9\uC120 y=${level}\uC758 \uAD50\uC810 \uAC1C\uC218\uB97C \uD655\uC778\uD558\uC138\uC694.` : "\uADF9\uB313\uAC12\uACFC \uADF9\uC19F\uAC12 \uC0AC\uC774\uC758 \uC218\uD3C9\uC120\uC740 \uC11C\uB85C \uB2E4\uB978 \uC138 \uAD50\uC810\uC744 \uB9CC\uB4ED\uB2C8\uB2E4."
              }
            });
          }
        },
        {
          id: "motion-turning-points",
          referenceArchetypeId: "motion-derivative-integral-progression",
          stageId: "differentiate-before-integrating",
          titles: [
            "\uC704\uCE58\uD568\uC218\uC5D0\uC11C \uBC29\uD5A5 \uC804\uD658 \uC2DC\uC810\uACFC \uC704\uCE58\uCC28 \uACC4\uC0B0",
            "\uC18D\uB3C4 \uBD80\uD638\uD45C\uB85C \uAD6C\uAC04 \uB0B4 \uC704\uCE58\uC758 \uCD5C\uB313\uAC12\xB7\uCD5C\uC19F\uAC12 \uACB0\uC815"
          ],
          sourcePattern: "\uC704\uCE58\uD568\uC218\uB97C \uBBF8\uBD84\uD574 \uC18D\uB3C4\uC758 \uC601\uC810\uACFC \uBD80\uD638\uB97C \uAD6C\uD558\uACE0 \uBC29\uD5A5 \uC804\uD658\xB7\uC704\uCE58 \uBC94\uC704\uB97C \uD574\uC11D",
          estimatedMinutes: [12, 12],
          reasoningSteps: [
            [
              "\uC704\uCE58\uD568\uC218\uB97C \uBBF8\uBD84\uD574 \uC18D\uB3C4\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC18D\uB3C4\uAC00 0\uC778 \uC2DC\uC810\uC744 \uCC3E\uB294\uB2E4.",
              "\uC18D\uB3C4 \uBD80\uD638\uB85C \uC2E4\uC81C \uBC29\uD5A5 \uC804\uD658 \uC5EC\uBD80\uB97C \uD655\uC778\uD55C\uB2E4.",
              "\uB450 \uC2DC\uC810\uC758 \uC704\uCE58\uB97C \uB300\uC785\uD574 \uC704\uCE58\uCC28\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uC18D\uB3C4\uC758 \uADFC\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC2DC\uAC04 \uAD6C\uAC04\uC5D0\uC11C \uC18D\uB3C4 \uBD80\uD638\uD45C\uB97C \uB9CC\uB4E0\uB2E4.",
              "\uB05D\uC810\uACFC \uC784\uACC4\uC810\uC758 \uC704\uCE58\uB97C \uBAA8\uB450 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uCD5C\uB313\uAC12\uACFC \uCD5C\uC19F\uAC12\uC758 \uCC28\uB97C \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const first = randomInteger(1, 2);
            const second = first + randomInteger(2, 3);
            const constant = randomInteger(-4, 4);
            const coefficients = [
              constant,
              3 * first * second,
              -3 * (first + second) / 2,
              1
            ];
            if (!Number.isInteger(
              coefficients[2]
            )) {
              return families[3].generate(
                mode
              );
            }
            const firstPosition = cubicValue(
              coefficients,
              first
            );
            const secondPosition = cubicValue(
              coefficients,
              second
            );
            const endpointPosition = cubicValue(
              coefficients,
              second + 1
            );
            const values = [
              constant,
              firstPosition,
              secondPosition,
              endpointPosition
            ];
            const range = Math.max(...values) - Math.min(...values);
            const answer = mode === 0 ? Math.abs(
              firstPosition - secondPosition
            ) : range;
            return makeShortAnswer({
              prompt: `\uC218\uC9C1\uC120 \uC704\uB97C \uC6C0\uC9C1\uC774\uB294 \uC810\uC758 \uC2DC\uAC01 $t$\uC5D0\uC11C\uC758 \uC704\uCE58\uAC00 $s(t)=${polynomialTex(
                coefficients,
                "t"
              )}$\uC774\uB2E4. ${mode === 0 ? "\uB450 \uBC88\uC758 \uBC29\uD5A5 \uC804\uD658 \uC2DC\uC810\uC5D0\uC11C \uC704\uCE58\uC758 \uCC28" : `0\\le t\\le${second + 1}\uC5D0\uC11C \uC704\uCE58\uC758 \uCD5C\uB313\uAC12\uACFC \uCD5C\uC19F\uAC12\uC758 \uCC28`}\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? Math.abs(
                firstPosition - secondPosition
              ) : range,
              solution: `$v(t)=s'(t)=3(${linearFactor(
                first,
                "t"
              )})(${linearFactor(
                second,
                "t"
              )})$\uC774\uBBC0\uB85C \uBC29\uD5A5 \uC804\uD658 \uC2DC\uC810\uC740 $t=${first},${second}$. \uC18D\uB3C4 \uBD80\uD638\uD45C\uC640 \uB05D\uC810\xB7\uB450 \uC784\uACC4\uC810\uC758 \uC704\uCE58\uB97C \uBE44\uAD50\uD558\uBA74 \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC704\uCE58\uD568\uC218\uB97C \uBBF8\uBD84\uD55C \uC18D\uB3C4\uC758 \uADFC\uACFC \uBD80\uD638\uB97C \uBA3C\uC800 \uC870\uC0AC\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "piecewise-differentiability",
          titles: [
            "\uAD6C\uAC04\uBCC4 \uD568\uC218\uC758 \uC5F0\uC18D\xB7\uBBF8\uBD84\uAC00\uB2A5 \uC870\uAC74 \uC5F0\uB9BD",
            "\uBBF8\uBD84\uAC00\uB2A5 \uACBD\uACC4\uC5D0\uC11C \uC811\uC120\uC758 \uC808\uD3B8 \uACC4\uC0B0"
          ],
          sourcePattern: "\uACBD\uACC4\uC810\uC5D0\uC11C \uD568\uC218\uAC12 \uC77C\uCE58\uC640 \uC88C\uC6B0\uBBF8\uBD84\uACC4\uC218 \uC77C\uCE58\uB97C \uAC01\uAC01 \uC801\uC6A9\uD574 \uB450 \uB9E4\uAC1C\uBCC0\uC218 \uACB0\uC815",
          estimatedMinutes: [12, 12],
          reasoningSteps: [
            [
              "\uACBD\uACC4\uC810\uC5D0\uC11C \uC88C\uC6B0 \uD568\uC218\uAC12\uC744 \uAC19\uAC8C \uB454\uB2E4.",
              "\uC591\uCABD \uC2DD\uC744 \uBBF8\uBD84\uD574 \uC88C\uC6B0\uBBF8\uBD84\uACC4\uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uAE30\uC6B8\uAE30\uB97C \uAC19\uAC8C \uB450\uC5B4 \uACC4\uC218\uB97C \uACB0\uC815\uD55C\uB2E4.",
              "\uC5F0\uC18D \uC870\uAC74\uC73C\uB85C \uB098\uBA38\uC9C0 \uC0C1\uC218\uB97C \uAD6C\uD574 \uACB0\uD569\uD55C\uB2E4."
            ],
            [
              "\uBBF8\uBD84\uAC00\uB2A5\uC131\uC5D0\uC11C \uC5F0\uC18D \uC870\uAC74\uC744 \uBA3C\uC800 \uC4F4\uB2E4.",
              "\uC88C\uC6B0\uBBF8\uBD84\uACC4\uC218 \uC77C\uCE58\uB85C \uC9C1\uC120\uC758 \uAE30\uC6B8\uAE30\uB97C \uC815\uD55C\uB2E4.",
              "\uACBD\uACC4\uC810\uC758 \uD568\uC218\uAC12\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC810-\uAE30\uC6B8\uAE30\uC2DD\uC73C\uB85C \uC811\uC120\uC758 \uC808\uD3B8\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const point = randomInteger(-2, 3);
            const q = randomInteger(1, 3);
            const l = randomInteger(-4, 4);
            const c = randomInteger(-5, 5);
            const slope = 2 * q * point + l;
            const value = q * point ** 2 + l * point + c;
            const intercept = value - slope * point;
            const answer = mode === 0 ? slope + intercept : intercept;
            return makeShortAnswer({
              prompt: `\uD568\uC218 $f(x)=\\begin{cases}${polynomialTex(
                [c, l, q]
              )}&(x<${point})\\\\ax+b&(x\\ge${point})\\end{cases}$\uAC00 $x=${point}$\uC5D0\uC11C \uBBF8\uBD84\uAC00\uB2A5\uD558\uB2E4. ${mode === 0 ? "$a+b$" : `$x=${point}$\uC5D0\uC11C \uC811\uC120\uC758 y\uC808\uD3B8`}\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? slope + intercept : intercept,
              solution: `\uC88C\uC6B0\uBBF8\uBD84\uACC4\uC218 \uC77C\uCE58\uC5D0\uC11C $a=${slope}$. \uC5F0\uC18D \uC870\uAC74 $${slope}\\cdot${point}+b=${value}$\uC5D0\uC11C $b=${intercept}$. \uACBD\uACC4\uC810 \uC811\uC120\uC740 \uBC14\uB85C $y=${slope}x${intercept >= 0 ? "+" : ""}${intercept}$\uC774\uBBC0\uB85C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uBBF8\uBD84\uAC00\uB2A5\uD558\uB824\uBA74 \uC5F0\uC18D\uC774\uC5B4\uC57C \uD558\uACE0 \uC88C\uC6B0\uBBF8\uBD84\uACC4\uC218\uB3C4 \uAC19\uC544\uC57C \uD569\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "quartic-monotonicity-sign-chart",
          titles: [
            "\uC138 \uC784\uACC4\uC810\uC744 \uAC00\uC9C4 \uC0AC\uCC28\uD568\uC218\uC758 \uC99D\uAC00\uAD6C\uAC04 \uD310\uC815",
            "\uB3C4\uD568\uC218 \uBD80\uD638\uD45C\uC5D0\uC11C \uADF9\uAC12 \uC704\uCE58 \uACB0\uD569"
          ],
          sourcePattern: "\uC778\uC218\uBD84\uD574\uB41C \uC0BC\uCC28 \uB3C4\uD568\uC218\uC758 \uC138 \uADFC\uC744 \uBC30\uC5F4\uD558\uACE0 \uAD6C\uAC04\uBCC4 \uBD80\uD638\uB97C \uC870\uC0AC\uD574 \uC99D\uAC00\xB7\uAC10\uC18C\uC640 \uADF9\uAC12\uC744 \uD310\uC815",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uB3C4\uD568\uC218\uC758 \uC138 \uADFC\uC744 \uD06C\uAE30\uC21C\uC73C\uB85C \uBC30\uC5F4\uD55C\uB2E4.",
              "\uAC01 \uADFC \uC0AC\uC774\uC5D0\uC11C \uB3C4\uD568\uC218\uC758 \uBD80\uD638\uB97C \uC870\uC0AC\uD55C\uB2E4.",
              "\uB3C4\uD568\uC218\uAC00 \uC591\uC218\uC778 \uC99D\uAC00\uAD6C\uAC04\uC744 \uACE0\uB978\uB2E4.",
              "\uC720\uACC4 \uC99D\uAC00\uAD6C\uAC04\uC758 \uC591 \uB05D\uC810\uC744 \uACB0\uD569\uD55C\uB2E4."
            ],
            [
              "\uB3C4\uD568\uC218\uC758 \uBD80\uD638\uD45C\uB97C \uC644\uC131\uD55C\uB2E4.",
              "\uC591\uC5D0\uC11C \uC74C\uC73C\uB85C \uBC14\uB00C\uB294 \uADF9\uB300 \uC704\uCE58\uB97C \uCC3E\uB294\uB2E4.",
              "\uC74C\uC5D0\uC11C \uC591\uC73C\uB85C \uBC14\uB00C\uB294 \uADF9\uC18C \uC704\uCE58\uB97C \uCC3E\uB294\uB2E4.",
              "\uC138 \uADF9\uAC12 \uC704\uCE58\uC758 \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const left = randomInteger(-4, -2);
            const middle = randomInteger(-1, 1);
            const right = randomInteger(2, 4);
            const answer = mode === 0 ? left + middle : left - middle + right;
            return makeShortAnswer({
              prompt: `\uC0AC\uCC28\uD568\uC218 $f$\uC758 \uB3C4\uD568\uC218\uAC00 $f'(x)=(${linearFactor(left)})(${linearFactor(middle)})(${linearFactor(right)})$\uC774\uB2E4. ${mode === 0 ? "\uC720\uACC4\uC778 \uC99D\uAC00\uAD6C\uAC04\uC758 \uC591 \uB05D\uC810\uC758 \uD569" : "(\uADF9\uC18C\uAC00 \uB418\uB294 \uB450 $x$\uC88C\uD45C\uC758 \uD569)-(\uADF9\uB300\uAC00 \uB418\uB294 $x$\uC88C\uD45C)"}\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? left + middle : left + right - middle,
              solution: `\uC138 \uADFC\uC744 \uC9C0\uB098\uBA70 $f'$\uC758 \uBD80\uD638\uB294 $-,+,-,+$\uB85C \uBC14\uB010\uB2E4. \uB530\uB77C\uC11C \uC99D\uAC00\uB294 $(${left},${middle})$, $(${right},\\infty)$\uC5D0\uC11C\uC774\uACE0 \uADF9\uC18C \uC704\uCE58\uB294 ${left},${right}, \uADF9\uB300 \uC704\uCE58\uB294 ${middle}\uC774\uB2E4. \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uAC00 \uC591\uC218\uC778 \uC0BC\uCC28\uC2DD\uC758 \uBD80\uD638\uB97C \uC624\uB978\uCABD\uBD80\uD130 \uBC88\uAC08\uC544 \uD45C\uC2DC\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "parallel-tangent-two-points",
          titles: [
            "\uC8FC\uC5B4\uC9C4 \uC9C1\uC120\uACFC \uD3C9\uD589\uD55C \uB450 \uC811\uC810\uC758 \uC88C\uD45C \uD569",
            "\uAC19\uC740 \uAE30\uC6B8\uAE30\uB97C \uAC16\uB294 \uB450 \uC811\uC810\uC758 \uD568\uC218\uAC12 \uACB0\uD569"
          ],
          sourcePattern: "\uC811\uC120 \uAE30\uC6B8\uAE30 \uC870\uAC74 f'(x)=m\uC744 \uC774\uCC28\uBC29\uC815\uC2DD\uC73C\uB85C \uD480\uACE0 \uB450 \uC811\uC810\uC758 \uC88C\uD45C \uB610\uB294 \uD568\uC218\uAC12\uC744 \uACB0\uD569",
          estimatedMinutes: [11, 13],
          reasoningSteps: [
            [
              "\uC0BC\uCC28\uD568\uC218\uB97C \uBBF8\uBD84\uD55C\uB2E4.",
              "\uC811\uC120\uC758 \uAE30\uC6B8\uAE30\uB97C \uC8FC\uC5B4\uC9C4 \uC9C1\uC120\uC758 \uAE30\uC6B8\uAE30\uC640 \uAC19\uAC8C \uB454\uB2E4.",
              "\uC774\uCC28\uBC29\uC815\uC2DD\uC758 \uB450 \uADFC\uC744 \uAD6C\uD55C\uB2E4.",
              "\uB450 \uC811\uC810 x\uC88C\uD45C\uC758 \uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "f'(x)=m\uC744 \uD480\uC5B4 \uB450 \uC811\uC810\uC744 \uCC3E\uB294\uB2E4.",
              "\uAC01 x\uC88C\uD45C\uB97C \uC6D0\uD568\uC218\uC5D0 \uB300\uC785\uD55C\uB2E4.",
              "\uB450 \uD568\uC218\uAC12\uC744 \uAC01\uAC01 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC694\uAD6C\uD55C \uD568\uC218\uAC12\uC758 \uCC28\uB97C \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const center = randomInteger(-2, 3);
            const distance = randomInteger(1, 3);
            const slope = randomInteger(-3, 4);
            const constant = randomInteger(-4, 4);
            const quadratic = -3 * center;
            const linear = slope + 3 * (center ** 2 - distance ** 2);
            const coefficients = [
              constant,
              linear,
              quadratic,
              1
            ];
            const left = center - distance;
            const right = center + distance;
            const valueDifference = cubicValue(
              coefficients,
              right
            ) - cubicValue(
              coefficients,
              left
            );
            const answer = mode === 0 ? left + right : valueDifference;
            return makeShortAnswer({
              prompt: `\uD568\uC218 $f(x)=${polynomialTex(coefficients)}$\uC758 \uADF8\uB798\uD504\uC5D0\uC11C \uC9C1\uC120 $y=${slope}x+1$\uACFC \uD3C9\uD589\uD55C \uC11C\uB85C \uB2E4\uB978 \uB450 \uC811\uC810\uC758 x\uC88C\uD45C\uB97C $\\alpha<\\beta$\uB77C \uD558\uC790. $${mode === 0 ? "\\alpha+\\beta" : "f(\\beta)-f(\\alpha)"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 2 * center : cubicValue(
                coefficients,
                right
              ) - cubicValue(
                coefficients,
                left
              ),
              solution: `$f'(x)=${slope}+3(${linearFactor(left)})(${linearFactor(right)})$\uC774\uBBC0\uB85C $f'(x)=${slope}$\uC758 \uB450 \uD574\uB294 $${left},${right}$. \uC6D0\uD568\uC218\uC5D0 \uB300\uC785\uD574 \uC815\uB9AC\uD558\uBA74 \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uD3C9\uD589\uD55C \uB450 \uC811\uC120\uC758 \uAE30\uC6B8\uAE30\uB294 \uC8FC\uC5B4\uC9C4 \uC9C1\uC120\uC758 \uAE30\uC6B8\uAE30\uC640 \uAC19\uC2B5\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "closed-interval-extrema",
          titles: [
            "\uB2EB\uD78C\uAD6C\uAC04\uC5D0\uC11C \uC0BC\uCC28\uD568\uC218\uC758 \uCD5C\uB313\uAC12\xB7\uCD5C\uC19F\uAC12 \uCC28",
            "\uB05D\uC810\uACFC \uC784\uACC4\uC810\uC744 \uBAA8\uB450 \uBE44\uAD50\uD558\uB294 \uC808\uB313\uAC12 \uCD5C\uB313\uAC12"
          ],
          sourcePattern: "\uB3C4\uD568\uC218\uC758 \uADFC\uACFC \uB2EB\uD78C\uAD6C\uAC04\uC758 \uC591 \uB05D\uC810\uC5D0\uC11C \uD568\uC218\uAC12\uC744 \uBAA8\uB450 \uACC4\uC0B0\uD574 \uC804\uC5ED \uCD5C\uB313\uAC12\xB7\uCD5C\uC19F\uAC12\uC744 \uACB0\uC815",
          estimatedMinutes: [13, 14],
          reasoningSteps: [
            [
              "\uD568\uC218\uB97C \uBBF8\uBD84\uD574 \uAD6C\uAC04 \uC548\uC758 \uC784\uACC4\uC810\uC744 \uCC3E\uB294\uB2E4.",
              "\uC591 \uB05D\uC810\uACFC \uAC01 \uC784\uACC4\uC810\uC758 \uD568\uC218\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uAC12\uB4E4\uC744 \uBE44\uAD50\uD574 \uCD5C\uB313\uAC12\uACFC \uCD5C\uC19F\uAC12\uC744 \uC815\uD55C\uB2E4.",
              "\uB450 \uAC12\uC758 \uCC28\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uB3C4\uD568\uC218 \uBD80\uD638\uD45C\uB85C \uADF9\uB300\xB7\uADF9\uC18C \uC704\uCE58\uB97C \uCC3E\uB294\uB2E4.",
              "\uB05D\uC810\uACFC \uC784\uACC4\uC810\uC758 \uD568\uC218\uAC12 \uBAA9\uB85D\uC744 \uB9CC\uB4E0\uB2E4.",
              "\uAC01 \uD568\uC218\uAC12\uC758 \uC808\uB313\uAC12\uC744 \uBE44\uAD50\uD55C\uB2E4.",
              "\uAC00\uC7A5 \uD070 \uC808\uB313\uAC12\uACFC \uADF8 \uC704\uCE58\uB97C \uACB0\uD569\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const leftCritical = -1;
            const rightCritical = 1;
            const constant = randomInteger(-3, 3);
            const value = (x) => x ** 3 - 3 * x + constant;
            const leftEndpoint = -2;
            const rightEndpoint = 2;
            const candidates = [
              leftEndpoint,
              leftCritical,
              rightCritical,
              rightEndpoint
            ].map((x) => ({
              x,
              y: value(x)
            }));
            const values = candidates.map(
              ({ y }) => y
            );
            const range = Math.max(...values) - Math.min(...values);
            const maxAbsolute = Math.max(
              ...values.map(Math.abs)
            );
            const answer = mode === 0 ? range : maxAbsolute;
            return makeShortAnswer({
              prompt: `\uD568\uC218 $f(x)=x^3-3x${signed(constant)}$\uC5D0 \uB300\uD558\uC5EC $[-2,2]$\uC5D0\uC11C ${mode === 0 ? "\uCD5C\uB313\uAC12\uACFC \uCD5C\uC19F\uAC12\uC758 \uCC28" : "$|f(x)|$\uC758 \uCD5C\uB313\uAC12"}\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? Math.max(
                ...values
              ) - Math.min(
                ...values
              ) : Math.max(
                ...values.map(
                  (number) => Math.abs(number)
                )
              ),
              solution: `$f'(x)=3(x-1)(x+1)$\uC774\uBBC0\uB85C \uD6C4\uBCF4\uC810\uC740 $-2,-1,1,2$\uC774\uB2E4. \uAC01 \uC810\uC758 \uD568\uC218\uAC12\uC744 \uBE44\uAD50\uD558\uBA74 \uC694\uAD6C\uD55C \uAC12\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uB2EB\uD78C\uAD6C\uAC04\uC5D0\uC11C\uB294 \uC784\uACC4\uC810\uBFD0 \uC544\uB2C8\uB77C \uC591 \uB05D\uC810\uC758 \uD568\uC218\uAC12\uB3C4 \uBC18\uB4DC\uC2DC \uBE44\uAD50\uD558\uC138\uC694.",
              visualization: {
                kind: "polynomial",
                degree: 3,
                coefficients: {
                  cubic: 1,
                  quadratic: 0,
                  linear: -3,
                  constant
                },
                domain: [-2, 2],
                focusX: 0,
                note: "\uB2EB\uD78C\uAD6C\uAC04\uC758 \uC591 \uB05D\uC810\uACFC \uC784\uACC4\uC810\uC5D0\uC11C \uD568\uC218\uAC12\uC744 \uBE44\uAD50\uD558\uC138\uC694."
              }
            });
          }
        },
        {
          id: "quartic-global-minimum",
          titles: [
            "\uC0AC\uCC28\uD568\uC218\uC758 \uC804\uC5ED \uCD5C\uC19F\uAC12\uACFC \uCD5C\uC801 \uC0C1\uC218",
            "\uB3C4\uD568\uC218 \uBD80\uD638\uC640 \uB300\uCE6D\uC131\uC744 \uC774\uC6A9\uD55C \uCD5C\uC19F\uAC12"
          ],
          sourcePattern: "\uC0AC\uCC28\uD568\uC218\uB97C \uBBF8\uBD84\uD574 \uC138 \uC784\uACC4\uC810\uC744 \uCC3E\uACE0 \uD568\uC218\uAC12 \uBE44\uAD50\uB85C \uBAA8\uB4E0 \uC2E4\uC218\uC5D0\uC11C\uC758 \uCD5C\uC19F\uAC12\uC744 \uACB0\uC815",
          estimatedMinutes: [13, 14],
          reasoningSteps: [
            [
              "\uC0AC\uCC28\uD568\uC218\uB97C \uBBF8\uBD84\uD558\uACE0 \uC778\uC218\uBD84\uD574\uD55C\uB2E4.",
              "\uC138 \uC784\uACC4\uC810\uC5D0\uC11C \uB3C4\uD568\uC218 \uBD80\uD638 \uBCC0\uD654\uB97C \uC870\uC0AC\uD55C\uB2E4.",
              "\uAC01 \uADF9\uC18C\uC810\uC758 \uD568\uC218\uAC12\uC744 \uBE44\uAD50\uD55C\uB2E4.",
              "f(x)\u2265k\uB97C \uB9CC\uC871\uD558\uB294 \uCD5C\uB300 k\uB97C \uACB0\uC815\uD55C\uB2E4."
            ],
            [
              "\uC9DD\uD568\uC218\uC758 \uB300\uCE6D\uC131\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uB3C4\uD568\uC218\uC758 \uC138 \uADFC\uC744 \uAD6C\uD55C\uB2E4.",
              "\uADF9\uB300\uC640 \uB450 \uADF9\uC18C\uB97C \uAD6C\uBD84\uD55C\uB2E4.",
              "\uC804\uC5ED \uCD5C\uC19F\uAC12\uACFC \uADF9\uC18C \uC704\uCE58\uB97C \uACB0\uD569\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const radius = choose([1, 2, 3]);
            const constant = randomInteger(-2, 5);
            const minimum = constant - radius ** 4;
            const answer = mode === 0 ? minimum : minimum + 2 * radius;
            return makeShortAnswer({
              prompt: `\uD568\uC218 $f(x)=x^4-${2 * radius ** 2}x^2${signed(constant)}$\uC5D0 \uB300\uD558\uC5EC ${mode === 0 ? "\uBAA8\uB4E0 \uC2E4\uC218 $x$\uC5D0\uC11C $f(x)\\ge k$\uAC00 \uC131\uB9BD\uD558\uB3C4\uB85D \uD558\uB294 \uC2E4\uC218 $k$\uC758 \uCD5C\uB313\uAC12" : "\uCD5C\uC19F\uAC12 $m$\uACFC \uB450 \uADF9\uC18C\uC810\uC758 $x$\uC88C\uD45C \uCC28 $d$\uC5D0 \uB300\uD55C $m+d$"}\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? constant - radius ** 4 : constant - radius ** 4 + 2 * radius,
              solution: `$f'(x)=4x(x-${radius})(x+${radius})$\uC774\uB2E4. \uB450 \uADF9\uC18C\uC810 $x=\\pm${radius}$\uC5D0\uC11C \uCD5C\uC19F\uAC12\uC740 ${minimum}\uC774\uACE0 \uB450 x\uC88C\uD45C\uC758 \uCC28\uB294 ${2 * radius}. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uB3C4\uD568\uC218\uB97C \uC778\uC218\uBD84\uD574\uD574 \uC138 \uC784\uACC4\uC810\uC758 \uC885\uB958\uB97C \uAD6C\uBD84\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "absolute-polynomial-differentiability",
          titles: [
            "\uC808\uB313\uAC12 \uC774\uCC28\uD568\uC218\uC758 \uBBF8\uBD84\uAC00\uB2A5 \uC870\uAC74",
            "\uC911\uADFC \uC870\uAC74\uACFC \uC808\uB313\uAC12 \uADF8\uB798\uD504\uC758 \uB9E4\uB044\uB7EC\uC6B4 \uC811\uD569"
          ],
          sourcePattern: "|\uC774\uCC28\uC2DD|\uC774 \uC601\uC810\uC5D0\uC11C \uBBF8\uBD84\uAC00\uB2A5\uD558\uB824\uBA74 \uB0B4\uBD80 \uB2E4\uD56D\uC2DD\uC774 \uBD80\uD638\uB97C \uBC14\uAFB8\uC9C0 \uC54A\uB294 \uC911\uADFC\uC744 \uAC00\uC838\uC57C \uD568\uC744 \uC801\uC6A9",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uC808\uB313\uAC12 \uB0B4\uBD80 \uC774\uCC28\uC2DD\uC758 \uC601\uC810\uC744 \uC870\uC0AC\uD55C\uB2E4.",
              "\uB2E8\uC21C\uADFC\uC5D0\uC11C\uB294 \uC88C\uC6B0 \uAE30\uC6B8\uAE30\uAC00 \uB2EC\uB77C\uC9D0\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uBBF8\uBD84\uAC00\uB2A5 \uC870\uAC74\uC744 \uD310\uBCC4\uC2DD 0\uC73C\uB85C \uBC14\uAFBC\uB2E4.",
              "\uB9E4\uAC1C\uBCC0\uC218\uB97C \uD480\uC5B4 \uBAA9\uD45C\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uBBF8\uBD84\uAC00\uB2A5\uD558\uC9C0 \uC54A\uC744 \uC218 \uC788\uB294 \uC810\uC744 \uB0B4\uBD80\uC2DD\uC758 \uADFC\uC73C\uB85C \uD55C\uC815\uD55C\uB2E4.",
              "\uBAA8\uB4E0 \uC601\uC810\uC774 \uC911\uADFC\uC774\uC5B4\uC57C \uD568\uC744 \uC0AC\uC6A9\uD55C\uB2E4.",
              "\uC644\uC804\uC81C\uACF1\uC2DD\uC774 \uB418\uB3C4\uB85D \uACC4\uC218\uB97C \uC815\uD55C\uB2E4.",
              "\uC811\uD569\uC810\uC758 \uD568\uC218\uAC12\uACFC \uB9E4\uAC1C\uBCC0\uC218\uB97C \uACB0\uD569\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const root = randomInteger(-4, -1);
            const parameter = -2 * root;
            const constant = root ** 2;
            const answer = mode === 0 ? parameter : parameter + constant;
            return makeShortAnswer({
              prompt: `\uC591\uC218 $a$\uC5D0 \uB300\uD558\uC5EC \uD568\uC218 $f(x)=|x^2+ax+${constant}|$\uAC00 \uBAA8\uB4E0 \uC2E4\uC218\uC5D0\uC11C \uBBF8\uBD84\uAC00\uB2A5\uD560 \uB54C, $${mode === 0 ? "a" : `a+f(${root})+${constant}`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? -2 * root : -2 * root + root ** 2,
              solution: `\uC808\uB313\uAC12 \uB0B4\uBD80\uC2DD\uC774 \uB2E8\uC21C\uADFC\uC744 \uAC00\uC9C0\uBA74 \uADF8 \uC810\uC5D0\uC11C \uBFB0\uC871\uD574\uC9C4\uB2E4. \uB530\uB77C\uC11C \uD310\uBCC4\uC2DD\uC774 0\uC774\uC5B4\uC57C \uD558\uBBC0\uB85C $a^2-4\\cdot${constant}=0$\uC774\uACE0 \uC911\uADFC\uC774 ${root}\uC774\uBBC0\uB85C $a=${parameter}$. \uB610\uD55C $f(${root})=0$\uC774\uC5B4\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC808\uB313\uAC12 \uB0B4\uBD80\uC2DD\uC774 0\uC744 \uC9C0\uB098\uBA70 \uBD80\uD638\uAC00 \uBC14\uB00C\uBA74 \uC88C\uC6B0\uBBF8\uBD84\uACC4\uC218\uAC00 \uB2EC\uB77C\uC9D1\uB2C8\uB2E4."
            });
          }
        }
      ];
      module.exports = {
        courseId,
        unitId,
        requiredConceptIds,
        minimumAppliedPoolSize: 16,
        appliedPolicy: {
          includeBankTypes: true,
          minimumLocalDifficulty: 3
        },
        advancedTemplates: defineAdvancedTemplates({
          courseId,
          unitId,
          requiredConceptIds,
          families
        })
      };
    }
  });

  // services/assessmentTemplates/calculus1/integration.js
  var require_integration = __commonJS({
    "services/assessmentTemplates/calculus1/integration.js"(exports, module) {
      var {
        randomInteger,
        choose,
        fraction,
        polynomialTex,
        linearFactor,
        signed,
        makeShortAnswer,
        defineAdvancedTemplates
      } = require_shared();
      var courseId = "calculus-1";
      var unitId = "integration";
      var differentiationConceptIds = [
        "calculus-1-02-01",
        "calculus-1-02-02",
        "calculus-1-02-03",
        "calculus-1-02-04",
        "calculus-1-02-05",
        "calculus-1-02-06",
        "calculus-1-02-07",
        "calculus-1-02-08",
        "calculus-1-02-09",
        "calculus-1-02-10"
      ];
      var requiredConceptIds = [
        "calculus-1-03-01",
        "calculus-1-03-02",
        "calculus-1-03-03",
        "calculus-1-03-04",
        "calculus-1-03-05",
        "calculus-1-03-06"
      ];
      function antiderivativeValue(derivativeCoefficients, constant, x) {
        return derivativeCoefficients.reduce(
          (sum, coefficient, exponent) => sum + coefficient / (exponent + 1) * x ** (exponent + 1),
          constant
        );
      }
      var families = [
        {
          id: "derivative-to-integral-chain",
          titles: [
            "\uB3C4\uD568\uC218\uC640 \uD55C \uD568\uC218\uAC12\uC5D0\uC11C \uC6D0\uD568\uC218 \uBCF5\uC6D0 \uD6C4 \uC815\uC801\uBD84",
            "\uB3C4\uD568\uC218 \uC870\uAC74\xB7\uC6D0\uD568\uC218 \uBCF5\uC6D0\xB7\uAD6C\uAC04 \uD568\uC218\uAC12 \uACB0\uD569"
          ],
          sourcePattern: "\uBBF8\uBD84 \uB2E8\uACC4\uC5D0\uC11C \uACC4\uC218\uB97C \uD655\uC778\uD558\uACE0 \uC801\uBD84\uC0C1\uC218\uB97C \uACB0\uC815\uD55C \uB4A4 \uC815\uC801\uBD84 \uB610\uB294 \uD568\uC218\uAC12\uAE4C\uC9C0 \uC774\uC5B4\uC9C0\uB294 \uC720\uD615",
          estimatedMinutes: [12, 12],
          reasoningSteps: [
            [
              "\uB3C4\uD568\uC218\uB97C \uD56D\uBCC4\uB85C \uC801\uBD84\uD55C\uB2E4.",
              "\uC8FC\uC5B4\uC9C4 \uD568\uC218\uAC12\uC73C\uB85C \uC801\uBD84\uC0C1\uC218\uB97C \uC815\uD55C\uB2E4.",
              "\uBCF5\uC6D0\uD55C \uC6D0\uD568\uC218\uB97C \uB2E4\uC2DC \uBBF8\uBD84\uD574 \uAC80\uC0B0\uD55C\uB2E4.",
              "\uBAA9\uD45C \uC815\uC801\uBD84\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uB3C4\uD568\uC218\uC758 \uC6D0\uC2DC\uD568\uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uCD08\uAE30 \uC870\uAC74\uC73C\uB85C \uC0C1\uC218\uB97C \uACB0\uC815\uD55C\uB2E4.",
              "\uB450 \uB05D\uC810\uC758 \uD568\uC218\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uBBF8\uC801\uBD84\uC758 \uAE30\uBCF8\uC815\uB9AC\uC640 \uD568\uC218\uAC12 \uACB0\uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const quadratic = choose([3, 6]);
            const linear = choose([-4, -2, 2, 4]);
            const constantDerivative = randomInteger(-3, 3);
            const initial = randomInteger(-4, 4);
            const bound = randomInteger(2, 4);
            const derivative = [
              constantDerivative,
              linear,
              quadratic
            ];
            const atBound = antiderivativeValue(
              derivative,
              initial,
              bound
            );
            const atZero = initial;
            const integralOfFPrime = atBound - atZero;
            const answer = mode === 0 ? integralOfFPrime : atBound + integralOfFPrime;
            return makeShortAnswer({
              prompt: `\uB2E4\uD56D\uD568\uC218 $f$\uAC00 $f'(x)=${polynomialTex(
                derivative
              )}$, $f(0)=${initial}$\uC744 \uB9CC\uC871\uD55C\uB2E4. ${mode === 0 ? `$\\displaystyle\\int_0^{${bound}}f'(x)\\,dx$` : `$f(${bound})+\\displaystyle\\int_0^{${bound}}f'(x)\\,dx$`}\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? atBound - atZero : atBound + atBound - atZero,
              solution: `\uB3C4\uD568\uC218\uB97C \uC801\uBD84\uD558\uACE0 $f(0)=${initial}$\uC744 \uC801\uC6A9\uD558\uBA74 $f(${bound})=${atBound}$. \uBBF8\uC801\uBD84\uC758 \uAE30\uBCF8\uC815\uB9AC\uB85C $\\int_0^{${bound}}f'(x)dx=f(${bound})-f(0)=${integralOfFPrime}$. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC6D0\uD568\uC218\uB97C \uBCF5\uC6D0\uD55C \uB4A4 \uC815\uC801\uBD84\uC744 \uD568\uC218\uAC12\uC758 \uCC28\uB85C\uB3C4 \uAC80\uC0B0\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "quadratic-area-parameter",
          titles: [
            "\uB450 \uAD50\uC810\uACFC \uB113\uC774 \uC870\uAC74\uC5D0\uC11C \uC774\uCC28\uD568\uC218 \uACC4\uC218 \uBCF5\uC6D0",
            "\uD3EC\uBB3C\uC120\xB7\uC9C1\uC120 \uC0AC\uC774 \uB113\uC774\uC640 \uAD50\uC810 \uAC70\uB9AC \uACB0\uD569"
          ],
          sourcePattern: "\uAD50\uC810\uC744 \uBA3C\uC800 \uAD6C\uD558\uACE0 \uD568\uC218\uC758 \uB300\uC18C\uB97C \uD310\uC815\uD55C \uB4A4 \uCC28\uD568\uC218\uB97C \uC801\uBD84\uD574 \uB113\uC774 \uACC4\uC0B0",
          estimatedMinutes: [13, 13],
          reasoningSteps: [
            [
              "\uB450 \uADF8\uB798\uD504\uC758 \uAD50\uC810 \uBC29\uC815\uC2DD\uC744 \uD47C\uB2E4.",
              "\uAD50\uC810 \uC0AC\uC774\uC5D0\uC11C \uC704\uCABD \uD568\uC218\uB97C \uD310\uC815\uD55C\uB2E4.",
              "\uCC28\uD568\uC218\uB97C \uC815\uC801\uBD84\uD55C\uB2E4.",
              "\uB113\uC774 \uC870\uAC74\uACFC \uBE44\uAD50\uD574 \uB9E4\uAC1C\uBCC0\uC218\uB97C \uAD6C\uD55C\uB2E4."
            ],
            [
              "\uAD50\uC810 \uB450 \uAC1C\uB97C \uAD6C\uD55C\uB2E4.",
              "\uCC28\uD568\uC218\uC758 \uBD80\uD638\uB97C \uD655\uC778\uD55C\uB2E4.",
              "\uB113\uC774\uB97C \uC801\uBD84\uC73C\uB85C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uAD50\uC810 \uAC70\uB9AC\uC640 \uB113\uC774\uB97C \uACB0\uD569\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const gap = randomInteger(2, 5);
            const slope = randomInteger(1, 4);
            const area = fraction(
              gap ** 3,
              6
            );
            const numericArea = gap ** 3 / 6;
            const answer = mode === 0 ? slope : numericArea + gap;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uACE1\uC120 $y=x^2$\uACFC \uC9C1\uC120 $y=kx$\uB85C \uB458\uB7EC\uC2F8\uC778 \uBD80\uBD84\uC758 \uB113\uC774\uAC00 $\\dfrac{${slope ** 3}}6$\uC77C \uB54C, \uC591\uC218 $k$\uB97C \uAD6C\uD558\uC2DC\uC624.` : `\uACE1\uC120 $y=x^2$\uACFC \uC9C1\uC120 $y=${gap}x$\uC758 \uB450 \uAD50\uC810 \uC0AC\uC774 \uAC70\uB9AC\uB97C $d$, \uB458\uB7EC\uC2F8\uC778 \uB113\uC774\uB97C $S$\uB77C \uD560 \uB54C $S+d$\uB97C \uAD6C\uD558\uC2DC\uC624. (\uBD84\uC218 \uC785\uB825 \uAC00\uB2A5)`,
              answer,
              independentAnswer: mode === 0 ? slope : gap ** 3 / 6 + gap,
              solution: `\uAD50\uC810\uC740 $x=0,k$\uC774\uACE0 \uADF8 \uC0AC\uC774\uC5D0\uC11C\uB294 \uC9C1\uC120\uC774 \uC704\uC5D0 \uC788\uB2E4. $S=\\int_0^k(kx-x^2)dx=k^3/6$. ${mode === 0 ? `\uC591\uC218 \uC870\uAC74\uC5D0\uC11C $k=${slope}$.` : `$S=${area}$, $d=${gap}$\uC774\uBBC0\uB85C \uB2F5\uC740 ${answer}.`}`,
              hintText: "\uAD50\uC810\uC744 \uAD6C\uD55C \uB4A4 \uC704 \uD568\uC218\uC5D0\uC11C \uC544\uB798 \uD568\uC218\uB97C \uBE7C \uC801\uBD84\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "velocity-total-distance",
          referenceArchetypeId: "motion-derivative-integral-progression",
          stageId: "differentiate-and-integrate",
          titles: [
            "\uC18D\uB3C4 \uBD80\uD638 \uBCC0\uD654\uAC00 \uC788\uB294 \uAD6C\uAC04\uC758 \uCD1D \uC774\uB3D9\uAC70\uB9AC",
            "\uBCC0\uC704\uC640 \uC774\uB3D9\uAC70\uB9AC\uC758 \uCC28 \uACC4\uC0B0"
          ],
          sourcePattern: "\uC18D\uB3C4\uC758 \uC601\uC810\uC73C\uB85C \uAD6C\uAC04\uC744 \uB098\uB204\uACE0 \uAC01 \uAD6C\uAC04 \uC801\uBD84\uC758 \uC808\uB313\uAC12\uC744 \uD569\uD558\uB294 \uC774\uB3D9\uAC70\uB9AC \uC720\uD615",
          estimatedMinutes: [13, 13],
          reasoningSteps: [
            [
              "\uC18D\uB3C4\uC758 \uC601\uC810\uC744 \uCC3E\uB294\uB2E4.",
              "\uC2DC\uAC04\uCD95\uC5D0\uC11C \uC18D\uB3C4 \uBD80\uD638\uD45C\uB97C \uB9CC\uB4E0\uB2E4.",
              "\uBD80\uD638\uAC00 \uC77C\uC815\uD55C \uAC01 \uAD6C\uAC04\uC5D0\uC11C \uBCC0\uC704\uB97C \uC801\uBD84\uD55C\uB2E4.",
              "\uAC01 \uBCC0\uC704\uC758 \uC808\uB313\uAC12\uC744 \uD569\uD55C\uB2E4."
            ],
            [
              "\uC18D\uB3C4\uC758 \uBD80\uD638 \uBCC0\uD654 \uC2DC\uC810\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC804\uCCB4 \uBCC0\uC704\uB97C \uD55C \uBC88 \uC801\uBD84\uD55C\uB2E4.",
              "\uCD1D \uC774\uB3D9\uAC70\uB9AC\uB97C \uAD6C\uAC04\uBCC4 \uC808\uB313\uAC12 \uC801\uBD84\uC73C\uB85C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uB450 \uAC12\uC758 \uCC28\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const turn = randomInteger(2, 5);
            const end = 2 * turn;
            const primitive = (t) => turn * t ** 2 / 2 - t ** 3 / 3;
            const firstDistance = primitive(turn);
            const secondDisplacement = primitive(end) - primitive(turn);
            const totalDistance = Math.abs(firstDistance) + Math.abs(
              secondDisplacement
            );
            const displacement = primitive(end);
            const answer = mode === 0 ? fraction(
              Math.round(
                totalDistance * 6
              ),
              6
            ) : fraction(
              Math.round(
                (totalDistance - Math.abs(
                  displacement
                )) * 6
              ),
              6
            );
            return makeShortAnswer({
              prompt: `\uC218\uC9C1\uC120 \uC704\uB97C \uC6C0\uC9C1\uC774\uB294 \uC810 P\uC758 \uC18D\uB3C4\uAC00 $v(t)=${turn}t-t^2$\uC774\uB2E4. $0\\le t\\le${end}$\uC5D0\uC11C ${mode === 0 ? "P\uAC00 \uC6C0\uC9C1\uC778 \uAC70\uB9AC" : "P\uAC00 \uC6C0\uC9C1\uC778 \uAC70\uB9AC\uC640 \uBCC0\uC704\uC758 \uC808\uB313\uAC12\uC758 \uCC28"}\uB97C \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: mode === 0 ? fraction(
                Math.round(
                  totalDistance * 6
                ),
                6
              ) : fraction(
                Math.round(
                  (totalDistance - Math.abs(
                    displacement
                  )) * 6
                ),
                6
              ),
              solution: `$v(t)=t(${turn}-t)$\uC774\uBBC0\uB85C $t=${turn}$\uC5D0\uC11C \uBD80\uD638\uAC00 \uBC14\uB010\uB2E4. $[0,${turn}]$\uACFC $[${turn},${end}]$\uC758 \uC815\uC801\uBD84\uC744 \uAC01\uAC01 \uACC4\uC0B0\uD558\uACE0 \uC808\uB313\uAC12\uC744 \uD569\uD558\uBA74 \uCD1D \uC774\uB3D9\uAC70\uB9AC\uB97C \uC5BB\uB294\uB2E4. \uC694\uAD6C\uD55C \uAC12\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC18D\uB3C4\uAC00 0\uC778 \uC2DC\uC810\uC5D0\uC11C \uC801\uBD84 \uAD6C\uAC04\uC744 \uB098\uB204\uACE0 \uAC01 \uAD6C\uAC04 \uBCC0\uC704\uC5D0 \uC808\uB313\uAC12\uC744 \uCDE8\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "integral-defined-function",
          titles: [
            "\uC815\uC801\uBD84\uC73C\uB85C \uC815\uC758\uB41C \uD568\uC218\uC758 \uAC12\uACFC \uB3C4\uD568\uC218 \uACB0\uD569",
            "\uC801\uBD84\uD568\uC218\uC758 \uC870\uAC74\uC5D0\uC11C \uB9E4\uAC1C\uBCC0\uC218 \uACB0\uC815"
          ],
          sourcePattern: "F(x)=\u222Bf(t)dt\uB97C \uBBF8\uBD84\uD574 F'=f\uB97C \uC5BB\uACE0 \uD568\uC218\uAC12 \uC870\uAC74\uACFC \uD568\uAED8 \uC801\uC6A9",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uC801\uBD84\uC73C\uB85C \uC815\uC758\uB41C \uD568\uC218\uC5D0 \uBBF8\uC801\uBD84\uC758 \uAE30\uBCF8\uC815\uB9AC\uB97C \uC801\uC6A9\uD55C\uB2E4.",
              "F'(x)\uB97C \uD53C\uC801\uBD84\uD568\uC218\uB85C \uBC14\uAFBC\uB2E4.",
              "F(a)\uB294 \uC9C1\uC811 \uC815\uC801\uBD84\uD55C\uB2E4.",
              "\uB450 \uAC12\uC744 \uACB0\uD569\uD55C\uB2E4."
            ],
            [
              "F'(x)=f(x)\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC8FC\uC5B4\uC9C4 \uB3C4\uD568\uC218 \uC870\uAC74\uC73C\uB85C \uB9E4\uAC1C\uBCC0\uC218\uB97C \uC815\uD55C\uB2E4.",
              "\uBCF5\uC6D0\uD55C \uD53C\uC801\uBD84\uD568\uC218\uB97C \uC801\uBD84\uD55C\uB2E4.",
              "\uBAA9\uD45C \uD568\uC218\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const parameter = randomInteger(-4, 5);
            const point = randomInteger(2, 4);
            const integral = point ** 3 + parameter * point ** 2 / 2;
            const derivativeAt = 3 * point ** 2 + parameter * point;
            const answer = mode === 0 ? integral + derivativeAt : parameter;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uD568\uC218 $F(x)=\\displaystyle\\int_0^x(3t^2${signed(
                parameter
              )}t)dt$\uC5D0 \uB300\uD558\uC5EC $F(${point})+F'(${point})$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.` : `\uD568\uC218 $F(x)=\\displaystyle\\int_0^x(3t^2+kt)dt$\uAC00 $F'(${point})=${derivativeAt}$\uC744 \uB9CC\uC871\uD560 \uB54C, \uC0C1\uC218 $k$\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? point ** 3 + parameter * point ** 2 / 2 + 3 * point ** 2 + parameter * point : (derivativeAt - 3 * point ** 2) / point,
              solution: `\uBBF8\uC801\uBD84\uC758 \uAE30\uBCF8\uC815\uB9AC\uB85C $F'(x)=3x^2${mode === 0 ? `${signed(
                parameter
              )}x` : "+kx"}$. ${mode === 0 ? `\uB610 $F(${point})=${integral}$\uC774\uBBC0\uB85C \uB2F5\uC740 ${answer}.` : `$x=${point}$\uC744 \uB300\uC785\uD574 \uC77C\uCC28\uBC29\uC815\uC2DD\uC744 \uD480\uBA74 $k=${parameter}$.`}`,
              hintText: "\uC0C1\uD55C\uC774 x\uC778 \uC815\uC801\uBD84\uC744 \uBBF8\uBD84\uD558\uBA74 \uD53C\uC801\uBD84\uD568\uC218\uC5D0 x\uB97C \uB300\uC785\uD55C \uC2DD\uC774 \uB429\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "tangent-and-enclosed-area",
          requiredConceptIds: [
            ...differentiationConceptIds,
            ...requiredConceptIds
          ],
          titles: [
            "\uC811\uC120 \uACB0\uC815 \uD6C4 \uACE1\uC120\uACFC \uC811\uC120 \uC0AC\uC774 \uB113\uC774",
            "\uBBF8\uBD84\uC73C\uB85C \uC811\uC810\uC744 \uCC3E\uACE0 \uC801\uBD84\uC73C\uB85C \uB113\uC774 \uACC4\uC0B0"
          ],
          sourcePattern: "\uC811\uC120 \uC870\uAC74\uC744 \uBBF8\uBD84\uC73C\uB85C \uD574\uACB0\uD55C \uB4A4 \uAD50\uC810\uACFC \uD568\uC218\uC758 \uB300\uC18C\uB97C \uAD6C\uD574 \uC815\uC801\uBD84\uAE4C\uC9C0 \uC774\uC5B4\uC9C0\uB294 \uC644\uC804\uD615",
          estimatedMinutes: [14, 15],
          reasoningSteps: [
            [
              "\uB3C4\uD568\uC218\uB85C \uC811\uC120\uC758 \uAE30\uC6B8\uAE30\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC810-\uAE30\uC6B8\uAE30\uC2DD\uC73C\uB85C \uC811\uC120 \uBC29\uC815\uC2DD\uC744 \uB9CC\uB4E0\uB2E4.",
              "\uACE1\uC120\uACFC \uC811\uC120\uC758 \uCD94\uAC00 \uAD50\uC810\uC744 \uAD6C\uD55C\uB2E4.",
              "\uB450 \uADF8\uB798\uD504\uC758 \uCC28\uB97C \uC801\uBD84\uD574 \uB113\uC774\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uC8FC\uC5B4\uC9C4 \uAE30\uC6B8\uAE30\uC640 \uB3C4\uD568\uC218\uB97C \uAC19\uAC8C \uB450\uC5B4 \uC811\uC810\uC744 \uCC3E\uB294\uB2E4.",
              "\uC811\uC120 \uBC29\uC815\uC2DD\uC744 \uAD6C\uD55C\uB2E4.",
              "\uAD50\uC810 \uAD6C\uAC04\uC5D0\uC11C \uC704\uC544\uB798 \uADF8\uB798\uD504\uB97C \uD310\uC815\uD55C\uB2E4.",
              "\uC815\uC801\uBD84\uC73C\uB85C \uB458\uB7EC\uC2F8\uC778 \uB113\uC774\uB97C \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const contact = randomInteger(1, 3);
            const other = contact + randomInteger(2, 4);
            const gap = other - contact;
            const area = fraction(
              gap ** 4,
              12
            );
            const scaled = fraction(
              gap ** 4,
              3
            );
            const answer = mode === 0 ? area : scaled;
            return makeShortAnswer({
              prompt: `\uACE1\uC120 $y=(x-${contact})^2(x-${other})$\uC640 \uC774 \uACE1\uC120 \uC704\uC758 \uC810 $(${contact},0)$\uC5D0\uC11C\uC758 \uC811\uC120, \uADF8\uB9AC\uACE0 \uC9C1\uC120 $x=${other}$\uB85C \uB458\uB7EC\uC2F8\uC778 \uBD80\uBD84\uC758 \uB113\uC774\uB97C $S$\uB77C \uD558\uC790. ${mode === 0 ? "S" : "4S"}\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: mode === 0 ? fraction(
                gap ** 4,
                12
              ) : fraction(
                gap ** 4,
                3
              ),
              solution: `$f'(${contact})=0$\uC774\uBBC0\uB85C \uC811\uC120\uC740 $y=0$. $${contact}<x<${other}$\uC5D0\uC11C \uD568\uC218\uAC12\uC740 \uC74C\uC218\uC774\uBBC0\uB85C $S=-\\int_{${contact}}^{${other}}(x-${contact})^2(x-${other})dx=${area}$. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC811\uC120\uC774 x\uCD95\uC784\uC744 \uD655\uC778\uD55C \uB4A4 \uD568\uC218\uC758 \uBD80\uD638\uB97C \uBCF4\uACE0 \uC808\uB313\uAC12 \uB113\uC774\uB97C \uC801\uBD84\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "symmetric-definite-integral",
          titles: [
            "\uB300\uCE6D\uAD6C\uAC04\uC5D0\uC11C \uD640\uC218\uD56D\uC744 \uC18C\uAC70\uD558\uB294 \uC815\uC801\uBD84",
            "f(x)+f(-x) \uC870\uAC74\uC73C\uB85C \uC815\uC801\uBD84 \uBCF5\uC6D0"
          ],
          sourcePattern: "\uB300\uCE6D\uAD6C\uAC04\uC5D0\uC11C \uD640\uD568\uC218 \uBD80\uBD84\uC758 \uC815\uC801\uBD84\uC774 0\uC784\uC744 \uC774\uC6A9\uD574 \uC9DD\uD568\uC218 \uBD80\uBD84\uB9CC \uC801\uBD84",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uB2E4\uD56D\uC2DD\uC744 \uC9DD\uC218\uCC28\uD56D\uACFC \uD640\uC218\uCC28\uD56D\uC73C\uB85C \uB098\uB208\uB2E4.",
              "\uB300\uCE6D\uAD6C\uAC04\uC5D0\uC11C \uD640\uC218\uCC28\uD56D\uC758 \uC801\uBD84\uC774 0\uC784\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uB0A8\uC740 \uC9DD\uC218\uCC28\uD56D\uC744 \uC801\uBD84\uD55C\uB2E4.",
              "\uC591\uCABD \uAD6C\uAC04\uC758 \uAC12\uC744 \uD569\uCCD0 \uBAA9\uD45C\uAC12\uC744 \uAD6C\uD55C\uB2E4."
            ],
            [
              "f(x)+f(-x)\uC5D0\uC11C \uD640\uC218 \uBD80\uBD84\uC774 \uC18C\uAC70\uB428\uC744 \uC0AC\uC6A9\uD55C\uB2E4.",
              "\uC8FC\uC5B4\uC9C4 \uC2DD\uC73C\uB85C f\uC758 \uC9DD\uC218 \uBD80\uBD84\uC744 \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uB300\uCE6D\uAD6C\uAC04 \uC801\uBD84\uC744 \uC9DD\uC218 \uBD80\uBD84\uC758 \uC801\uBD84\uC73C\uB85C \uBC14\uAFBC\uB2E4.",
              "\uC815\uC801\uBD84 \uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const bound = randomInteger(2, 4);
            const evenQuadratic = choose([3, 6]);
            const constant = randomInteger(-3, 4);
            const oddCubic = randomInteger(-4, 4);
            const oddLinear = randomInteger(-4, 4);
            const integral = 2 * (evenQuadratic * bound ** 3 / 3 + constant * bound);
            const answer = mode === 0 ? integral : integral / 2;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uB2E4\uD56D\uD568\uC218 $f(x)=${polynomialTex([constant, oddLinear, evenQuadratic, oddCubic])}$\uC5D0 \uB300\uD558\uC5EC $\\displaystyle\\int_{-${bound}}^{${bound}}f(x)\\,dx$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.` : `\uC5F0\uC18D\uD568\uC218 $f$\uAC00 $f(x)+f(-x)=${2 * evenQuadratic}x^2${signed(2 * constant)}$\uB97C \uB9CC\uC871\uD55C\uB2E4. $\\dfrac12\\displaystyle\\int_{0}^{${bound}}\\{f(x)+f(-x)\\}\\,dx$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 2 * (evenQuadratic * bound ** 3 / 3 + constant * bound) : evenQuadratic * bound ** 3 / 3 + constant * bound,
              solution: `\uB300\uCE6D\uAD6C\uAC04\uC5D0\uC11C \uD640\uC218\uCC28\uD56D\uC758 \uC815\uC801\uBD84\uC740 0\uC774\uB2E4. \uB530\uB77C\uC11C \uC9DD\uC218 \uBD80\uBD84\uB9CC \uC801\uBD84\uD558\uBA74 ${mode === 0 ? "" : "$f(x)+f(-x)$ \uC790\uCCB4\uAC00 \uC9DD\uC218 \uBD80\uBD84\uC758 \uB450 \uBC30\uC774\uBBC0\uB85C "}\uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uB300\uCE6D\uAD6C\uAC04\uC5D0\uC11C\uB294 \uD640\uD568\uC218 \uBD80\uBD84\uC758 \uB113\uC774\uAC00 \uBD80\uD638\uB97C \uB2EC\uB9AC\uD574 \uC11C\uB85C \uC18C\uAC70\uB429\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "two-parabola-enclosed-area",
          titles: [
            "\uB450 \uD3EC\uBB3C\uC120\uC758 \uAD50\uC810\uACFC \uB458\uB7EC\uC2F8\uC778 \uB113\uC774",
            "\uCC28\uD568\uC218\uC758 \uADFC\uACFC \uCD5C\uACE0\uCC28\uD56D\uC5D0\uC11C \uB113\uC774 \uBCF5\uC6D0"
          ],
          sourcePattern: "\uB450 \uC774\uCC28\uD568\uC218\uC758 \uCC28\uB97C \uC778\uC218\uBD84\uD574\uD574 \uAD50\uC810\uC744 \uCC3E\uACE0 \uAD6C\uAC04 \uB0B4 \uBD80\uD638\uB97C \uD310\uC815\uD55C \uB4A4 \uC815\uC801\uBD84",
          estimatedMinutes: [13, 14],
          reasoningSteps: [
            [
              "\uB450 \uD3EC\uBB3C\uC120\uC758 \uCC28\uB97C \uAD6C\uD55C\uB2E4.",
              "\uCC28\uD568\uC218\uB97C \uC778\uC218\uBD84\uD574\uD574 \uB450 \uAD50\uC810\uC744 \uCC3E\uB294\uB2E4.",
              "\uAD50\uC810 \uC0AC\uC774\uC5D0\uC11C \uC704\uCABD \uADF8\uB798\uD504\uB97C \uD310\uC815\uD55C\uB2E4.",
              "\uCC28\uD568\uC218\uB97C \uC815\uC801\uBD84\uD574 \uB113\uC774\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uAD50\uC810\uC758 x\uC88C\uD45C\uB97C \uCC28\uD568\uC218\uC758 \uB450 \uADFC\uC73C\uB85C \uD574\uC11D\uD55C\uB2E4.",
              "\uCD5C\uACE0\uCC28\uD56D \uBD80\uD638\uB85C \uC704\uC544\uB798 \uADF8\uB798\uD504\uB97C \uC815\uD55C\uB2E4.",
              "\uADFC \uC0AC\uC774\uC758 \uC774\uCC28\uC2DD \uC801\uBD84\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uB113\uC774\uC640 \uAD50\uC810 \uAC70\uB9AC\uC758 \uACB0\uD569\uAC12\uC744 \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const left = randomInteger(-3, 0);
            const gap = randomInteger(3, 6);
            const right = left + gap;
            const scale = choose([1, 2, 3]);
            const area = fraction(
              scale * gap ** 3,
              6
            );
            const answer = mode === 0 ? area : scale * gap ** 2;
            return makeShortAnswer({
              prompt: `\uB450 \uACE1\uC120 $y=x^2$\uC640 $y=x^2+${scale}(${linearFactor(left)})(${right}-x)$\uC758 \uB450 \uAD50\uC810\uC758 x\uC88C\uD45C\uB97C $a<b$, \uB458\uB7EC\uC2F8\uC778 \uB113\uC774\uB97C $S$\uB77C \uD558\uC790. $${mode === 0 ? "S" : "\\dfrac{6S}{b-a}"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.${mode === 0 ? " (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)" : ""}`,
              answer,
              independentAnswer: mode === 0 ? fraction(
                scale * (right - left) ** 3,
                6
              ) : scale * (right - left) ** 2,
              solution: `\uB450 \uADF8\uB798\uD504\uB294 $x=${left},${right}$\uC5D0\uC11C \uB9CC\uB098\uACE0 \uADF8 \uC0AC\uC774\uC758 \uCC28\uB294 $${scale}(${linearFactor(left)})(${right}-x)\\ge0$\uC774\uB2E4. \uC774\uB97C ${left}\uBD80\uD130 ${right}\uAE4C\uC9C0 \uC801\uBD84\uD558\uBA74 $S=${area}$\uC774\uACE0, \uC694\uAD6C\uD55C \uAC12\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uB450 \uD568\uC218\uC758 \uCC28\uB97C \uBA3C\uC800 \uAD6C\uD558\uBA74 \uAD50\uC810\uACFC \uC704\uCABD \uADF8\uB798\uD504\uB97C \uB3D9\uC2DC\uC5D0 \uD655\uC778\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "zero-integral-parameter",
          titles: [
            "\uC815\uC801\uBD84\uC774 0\uC774 \uB418\uB294 \uC77C\uCC28\uD568\uC218\uC758 \uB9E4\uAC1C\uBCC0\uC218",
            "\uAD6C\uAC04 \uD3C9\uADE0\uACFC \uC815\uC801\uBD84 \uC870\uAC74\uC758 \uC5ED\uBB38\uC81C"
          ],
          sourcePattern: "\uC815\uC801\uBD84\uAC12 \uC870\uAC74\uC744 \uB9E4\uAC1C\uBCC0\uC218\uC5D0 \uB300\uD55C \uBC29\uC815\uC2DD\uC73C\uB85C \uB9CC\uB4E4\uACE0 \uAD6C\uAC04 \uD3C9\uADE0 \uB610\uB294 \uB05D\uC810 \uAC12\uC744 \uD568\uAED8 \uACC4\uC0B0",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uD53C\uC801\uBD84\uD568\uC218\uB97C \uD56D\uBCC4\uB85C \uC801\uBD84\uD55C\uB2E4.",
              "\uC815\uC801\uBD84\uC774 0\uC778 \uC870\uAC74\uC744 \uB9E4\uAC1C\uBCC0\uC218 \uBC29\uC815\uC2DD\uC73C\uB85C \uB9CC\uB4E0\uB2E4.",
              "\uB9E4\uAC1C\uBCC0\uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uBCF5\uC6D0\uD55C \uD568\uC218\uC758 \uBAA9\uD45C\uC810 \uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uC815\uC801\uBD84\uC744 \uAD6C\uAC04 \uAE38\uC774\uC640 \uD3C9\uADE0\uAC12\uC758 \uACF1\uC73C\uB85C \uD574\uC11D\uD55C\uB2E4.",
              "\uC77C\uCC28\uD568\uC218\uC758 \uAD6C\uAC04 \uD3C9\uADE0\uC774 \uC911\uC810\uAC12\uC784\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uC911\uC810\uC5D0\uC11C \uD568\uC218\uAC12\uC774 0\uC774 \uB418\uB3C4\uB85D \uB9E4\uAC1C\uBCC0\uC218\uB97C \uC815\uD55C\uB2E4.",
              "\uB450 \uB05D\uC810 \uD568\uC218\uAC12\uC758 \uCC28\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const left = randomInteger(-3, 1);
            const right = left + choose([2, 4, 6]);
            const slope = choose([2, 3, 4]);
            const center = (left + right) / 2;
            const parameter = -slope * center;
            const answer = mode === 0 ? parameter : slope * (right - left);
            return makeShortAnswer({
              prompt: `\uC0C1\uC218 $a$\uC5D0 \uB300\uD558\uC5EC $\\displaystyle\\int_{${left}}^{${right}}(${slope}x+a)\\,dx=0$\uC774\uB2E4. $${mode === 0 ? "a" : `(${slope}\\cdot${right}+a)-(${slope}\\cdot${left}+a)`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? -slope * (left + right) / 2 : slope * (right - left),
              solution: `\uC77C\uCC28\uD568\uC218\uC758 \uAD6C\uAC04 \uD3C9\uADE0\uC740 \uC911\uC810 $x=${center}$\uC5D0\uC11C\uC758 \uAC12\uC774\uB2E4. \uC815\uC801\uBD84\uC774 0\uC774\uBBC0\uB85C $${slope}\\cdot${center}+a=0$, $a=${parameter}$. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC77C\uCC28\uD568\uC218\uC758 \uC815\uC801\uBD84 \uD3C9\uADE0\uC740 \uAD6C\uAC04 \uC911\uC810\uC5D0\uC11C\uC758 \uD568\uC218\uAC12\uACFC \uAC19\uC2B5\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "cubic-absolute-area",
          titles: [
            "\uC138 \uC601\uC810\uC744 \uAC00\uC9C4 \uC0BC\uCC28\uD568\uC218\uC640 x\uCD95 \uC0AC\uC774 \uCD1D\uB113\uC774",
            "\uBD80\uD638\uAC00 \uB450 \uBC88 \uBC14\uB00C\uB294 \uACE1\uC120\uC758 \uB113\uC774 \uBD84\uD560"
          ],
          sourcePattern: "\uC0BC\uCC28\uD568\uC218\uC758 \uC138 \uC601\uC810\uC5D0\uC11C \uC801\uBD84\uAD6C\uAC04\uC744 \uB098\uB204\uACE0 \uAD6C\uAC04\uBCC4 \uBD80\uD638\uC5D0 \uB530\uB77C \uC815\uC801\uBD84\uC758 \uC808\uB313\uAC12\uC744 \uD569\uC0B0",
          estimatedMinutes: [14, 15],
          reasoningSteps: [
            [
              "\uC0BC\uCC28\uD568\uC218\uC758 \uC138 \uC601\uC810\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uAC01 \uC601\uC810 \uC0AC\uC774\uC5D0\uC11C \uD568\uC218 \uBD80\uD638\uB97C \uC870\uC0AC\uD55C\uB2E4.",
              "\uB450 \uAD6C\uAC04\uC758 \uC815\uC801\uBD84\uC744 \uAC01\uAC01 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uAC01 \uC815\uC801\uBD84\uC758 \uC808\uB313\uAC12\uC744 \uD569\uD55C\uB2E4."
            ],
            [
              "\uC778\uC218\uBD84\uD574\uC2DD\uC73C\uB85C \uBD80\uD638\uD45C\uB97C \uB9CC\uB4E0\uB2E4.",
              "x\uCD95 \uC544\uB798 \uAD6C\uAC04\uC758 \uC801\uBD84\uC5D0 \uC74C\uC218\uB97C \uBD99\uC778\uB2E4.",
              "x\uCD95 \uC704 \uAD6C\uAC04\uC758 \uC801\uBD84\uC744 \uB354\uD55C\uB2E4.",
              "\uCD1D\uB113\uC774\uB97C \uAE30\uC57D\uBD84\uC218\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const scale = choose([1, 2]);
            const value = (x) => scale * (x + 1) * x * (x - 2);
            const primitive = (x) => scale * (x ** 4 / 4 - x ** 3 / 3 - x ** 2);
            const firstIntegral = primitive(0) - primitive(-1);
            const secondIntegral = primitive(2) - primitive(0);
            const area = Math.abs(firstIntegral) + Math.abs(secondIntegral);
            const answer = mode === 0 ? fraction(
              Math.round(area * 12),
              12
            ) : fraction(
              Math.round(
                2 * area * 12
              ),
              12
            );
            return makeShortAnswer({
              prompt: `\uACE1\uC120 $y=${scale === 1 ? "" : scale}(x+1)x(x-2)$\uC640 x\uCD95\uC73C\uB85C \uB458\uB7EC\uC2F8\uC778 \uB450 \uBD80\uBD84\uC758 \uB113\uC774\uC758 \uD569\uC744 $S$\uB77C \uD558\uC790. $${mode === 0 ? "S" : "2S"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: mode === 0 ? fraction(
                Math.round(
                  (Math.abs(
                    primitive(0) - primitive(-1)
                  ) + Math.abs(
                    primitive(2) - primitive(0)
                  )) * 12
                ),
                12
              ) : fraction(
                Math.round(
                  2 * (Math.abs(
                    primitive(0) - primitive(-1)
                  ) + Math.abs(
                    primitive(2) - primitive(0)
                  )) * 12
                ),
                12
              ),
              solution: `\uC601\uC810\uC740 $-1,0,2$\uC774\uACE0 \uB450 \uAD6C\uAC04\uC5D0\uC11C \uBD80\uD638\uAC00 \uB2E4\uB974\uB2E4. $[-1,0]$, $[0,2]$\uC758 \uC815\uC801\uBD84\uC5D0 \uAC01\uAC01 \uC808\uB313\uAC12\uC744 \uCDE8\uD574 \uB354\uD558\uBA74 $S=${fraction(Math.round(area * 12), 12)}$. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "x\uCD95\uACFC \uB9CC\uB098\uB294 \uC138 \uC810\uC5D0\uC11C \uAD6C\uAC04\uC744 \uB098\uB204\uACE0 \uAC01 \uAD6C\uAC04 \uC815\uC801\uBD84\uC758 \uBD80\uD638\uB97C \uD655\uC778\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "velocity-two-turns",
          titles: [
            "\uB450 \uBC88 \uBC29\uD5A5\uC744 \uBC14\uAFB8\uB294 \uC6B4\uB3D9\uC758 \uCD1D \uC774\uB3D9\uAC70\uB9AC",
            "\uC138 \uC2DC\uAC04\uAD6C\uAC04\uC758 \uBCC0\uC704\uC640 \uC774\uB3D9\uAC70\uB9AC \uBE44\uAD50"
          ],
          sourcePattern: "\uC18D\uB3C4\uC758 \uB450 \uC591\uC758 \uC601\uC810\uC5D0\uC11C \uC2DC\uAC04\uAD6C\uAC04\uC744 \uC14B\uC73C\uB85C \uB098\uB204\uACE0 \uBCC0\uC704\uC758 \uC808\uB313\uAC12\uC744 \uD569\uC0B0",
          estimatedMinutes: [14, 15],
          reasoningSteps: [
            [
              "\uC18D\uB3C4\uAC00 0\uC774 \uB418\uB294 \uB450 \uC2DC\uAC01\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC138 \uC2DC\uAC04\uAD6C\uAC04\uC5D0\uC11C \uC18D\uB3C4\uC758 \uBD80\uD638\uB97C \uC870\uC0AC\uD55C\uB2E4.",
              "\uAC01 \uAD6C\uAC04\uC758 \uC18D\uB3C4\uB97C \uC801\uBD84\uD574 \uBCC0\uC704\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC138 \uBCC0\uC704\uC758 \uC808\uB313\uAC12\uC744 \uD569\uD574 \uC774\uB3D9\uAC70\uB9AC\uB97C \uAD6C\uD55C\uB2E4."
            ],
            [
              "\uC18D\uB3C4 \uBD80\uD638\uD45C\uB85C \uBC29\uD5A5 \uC804\uD658 \uC2DC\uC810\uC744 \uCC3E\uB294\uB2E4.",
              "\uC804\uCCB4 \uBCC0\uC704\uB97C \uD55C \uBC88\uC758 \uC815\uC801\uBD84\uC73C\uB85C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uAD6C\uAC04\uBCC4 \uC774\uB3D9\uAC70\uB9AC\uB97C \uB530\uB85C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC774\uB3D9\uAC70\uB9AC\uC640 \uBCC0\uC704 \uC808\uB313\uAC12\uC758 \uCC28\uB97C \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const first = 1;
            const second = 3;
            const end = 4;
            const scale = choose([3, 6]);
            const primitive = (time) => scale * (time ** 3 / 3 - 2 * time ** 2 + 3 * time);
            const displacements = [
              primitive(first) - primitive(0),
              primitive(second) - primitive(first),
              primitive(end) - primitive(second)
            ];
            const distance = displacements.reduce(
              (sum, value) => sum + Math.abs(value),
              0
            );
            const total = primitive(end) - primitive(0);
            const exactDistance = Math.round(
              distance * 1e9
            ) / 1e9;
            const exactTotal = Math.round(
              total * 1e9
            ) / 1e9;
            const answer = mode === 0 ? exactDistance : exactDistance - Math.abs(exactTotal);
            return makeShortAnswer({
              prompt: `\uC218\uC9C1\uC120 \uC704\uB97C \uC6C0\uC9C1\uC774\uB294 \uC810\uC758 \uC18D\uB3C4\uAC00 $v(t)=${scale}(t-1)(t-3)$\uC774\uB2E4. $0\\le t\\le4$\uC5D0\uC11C ${mode === 0 ? "\uC810\uC774 \uC6C0\uC9C1\uC778 \uCD1D\uAC70\uB9AC" : "\uCD1D \uC774\uB3D9\uAC70\uB9AC\uC5D0\uC11C \uC804\uCCB4 \uBCC0\uC704\uC758 \uC808\uB313\uAC12\uC744 \uBE80 \uAC12"}\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? displacements.reduce(
                (sum, value) => sum + Math.abs(value),
                0
              ).toFixed(9).replace(/\.?0+$/, "") : String(
                Math.round(
                  (displacements.reduce(
                    (sum, value) => sum + Math.abs(value),
                    0
                  ) - Math.abs(
                    displacements.reduce(
                      (sum, value) => sum + value,
                      0
                    )
                  )) * 1e9
                ) / 1e9
              ),
              solution: `\uC18D\uB3C4\uB294 $t=1,3$\uC5D0\uC11C \uBD80\uD638\uAC00 \uBC14\uB010\uB2E4. \uC138 \uAD6C\uAC04 $[0,1]$, $[1,3]$, $[3,4]$\uC5D0\uC11C \uC18D\uB3C4\uB97C \uAC01\uAC01 \uC801\uBD84\uD558\uACE0 \uC808\uB313\uAC12\uC744 \uD569\uD558\uBA74 \uCD1D \uC774\uB3D9\uAC70\uB9AC\uB294 ${exactDistance}\uC774\uB2E4. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC18D\uB3C4\uAC00 0\uC778 \uB450 \uC2DC\uAC01\uC5D0\uC11C \uC801\uBD84\uAD6C\uAC04\uC744 \uBC18\uB4DC\uC2DC \uB098\uB204\uC138\uC694."
            });
          }
        }
      ];
      module.exports = {
        courseId,
        unitId,
        requiredConceptIds,
        minimumAppliedPoolSize: 16,
        appliedPolicy: {
          includeBankTypes: true,
          minimumLocalDifficulty: 3
        },
        advancedTemplates: defineAdvancedTemplates({
          courseId,
          unitId,
          requiredConceptIds,
          families
        })
      };
    }
  });

  // services/assessmentTemplates/probabilityStatistics/counting.js
  var require_counting = __commonJS({
    "services/assessmentTemplates/probabilityStatistics/counting.js"(exports, module) {
      var {
        randomInteger,
        choose,
        nCr,
        power,
        makeShortAnswer,
        defineAdvancedTemplates
      } = require_shared();
      var courseId = "probability-statistics";
      var unitId = "counting";
      var requiredConceptIds = [
        "probability-statistics-01-01",
        "probability-statistics-01-02",
        "probability-statistics-01-03"
      ];
      function permutations(values, length) {
        if (length === 0) return [[]];
        return values.flatMap(
          (value, index) => permutations(
            values.filter(
              (_, nextIndex) => nextIndex !== index
            ),
            length - 1
          ).map((tail) => [
            value,
            ...tail
          ])
        );
      }
      function factorial(value) {
        let result = 1;
        for (let factor = 2; factor <= value; factor += 1) {
          result *= factor;
        }
        return result;
      }
      var families = [
        {
          id: "restricted-digit-arrangement",
          titles: [
            "\uCCAB\uC790\uB9AC\xB7\uC9DD\uC218\xB7\uC911\uBCF5\uAE08\uC9C0 \uC870\uAC74\uC758 \uC790\uC5F0\uC218 \uBC30\uC5F4",
            "\uC591\uB05D \uC870\uAC74\uC774 \uB2E4\uB978 \uC911\uBCF5 \uC5C6\uB294 \uC22B\uC790 \uBC30\uC5F4"
          ],
          sourcePattern: "\uCCAB\uC790\uB9AC 0 \uAE08\uC9C0\uC640 \uB05D\uC790\uB9AC \uC131\uC9C8\uC744 \uBA3C\uC800 \uBD84\uB9AC\uD55C \uB4A4 \uB0A8\uC740 \uC790\uB9AC\uB97C \uC21C\uC5F4\uB85C \uACC4\uC0B0",
          estimatedMinutes: [11, 11],
          reasoningSteps: [
            [
              "\uB05D\uC790\uB9AC\uC758 \uC9DD\uC218 \uD6C4\uBCF4\uB97C 0\uACFC 0\uC774 \uC544\uB2CC \uACBD\uC6B0\uB85C \uB098\uB208\uB2E4.",
              "\uAC01 \uACBD\uC6B0 \uCCAB\uC790\uB9AC\uC5D0\uC11C 0\uACFC \uC0AC\uC6A9\uD55C \uC22B\uC790\uB97C \uC81C\uC678\uD55C\uB2E4.",
              "\uAC00\uC6B4\uB370 \uC790\uB9AC\uB97C \uC21C\uC11C \uC788\uAC8C \uC120\uD0DD\uD55C\uB2E4.",
              "\uC11C\uB85C \uACB9\uCE58\uC9C0 \uC54A\uB294 \uACBD\uC6B0\uB97C \uD569\uD55C\uB2E4."
            ],
            [
              "\uC591 \uB05D\uC790\uB9AC \uD6C4\uBCF4\uB97C \uC870\uAC74\uBCC4\uB85C \uC815\uD55C\uB2E4.",
              "\uCCAB\uC790\uB9AC\uAC00 0\uC778 \uBC30\uC5F4\uC744 \uC81C\uC678\uD55C\uB2E4.",
              "\uB0A8\uC740 \uC790\uB9AC\uB97C \uC21C\uC5F4\uB85C \uBC30\uCE58\uD55C\uB2E4.",
              "\uC9C1\uC811 \uC5F4\uAC70 \uAC80\uC0B0\uACFC \uC77C\uCE58\uD558\uB294\uC9C0 \uD655\uC778\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const maximum = randomInteger(5, 7);
            const digits = Array.from(
              {
                length: maximum + 1
              },
              (_, index) => index
            );
            const all = permutations(
              digits,
              4
            ).filter(
              (number) => number[0] !== 0
            );
            const valid = mode === 0 ? all.filter(
              (number) => number[3] % 2 === 0
            ) : all.filter(
              (number) => number[0] % 2 === 1 && number[3] % 2 === 0
            );
            const answer = valid.length;
            return makeShortAnswer({
              prompt: `$0,1,2,\\ldots,${maximum}$\uC5D0\uC11C \uC11C\uB85C \uB2E4\uB978 \uB124 \uC22B\uC790\uB97C \uACE8\uB77C \uB9CC\uB4E0 \uB124 \uC790\uB9AC \uC790\uC5F0\uC218 \uC911 ${mode === 0 ? "\uC9DD\uC218" : "\uCCAB \uC790\uB9AC\uB294 \uD640\uC218\uC774\uACE0 \uB05D\uC790\uB9AC\uB294 \uC9DD\uC218\uC778 \uC218"}\uC758 \uAC1C\uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: valid.length,
              solution: mode === 0 ? "\uB05D\uC790\uB9AC\uAC00 0\uC778 \uACBD\uC6B0\uC640 0\uC774 \uC544\uB2CC \uC9DD\uC218\uC778 \uACBD\uC6B0\uB97C \uB098\uB208\uB2E4. \uAC01 \uACBD\uC6B0 \uCCAB\uC790\uB9AC\uC758 0 \uAE08\uC9C0\uC640 \uC774\uBBF8 \uC4F4 \uC22B\uC790\uB97C \uBC18\uC601\uD558\uACE0 \uAC00\uC6B4\uB370 \uB450 \uC790\uB9AC\uB97C \uC21C\uC5F4\uB85C \uBC30\uCE58\uD574 \uD569\uD558\uBA74 \uB2F5\uC744 \uC5BB\uB294\uB2E4." : "\uD640\uC218\uC778 \uCCAB\uC790\uB9AC\uC640 \uC9DD\uC218\uC778 \uB05D\uC790\uB9AC\uB97C \uBA3C\uC800 \uACE0\uB974\uB418 \uB05D\uC790\uB9AC\uAC00 0\uC778 \uACBD\uC6B0\uB97C \uB530\uB85C \uCC98\uB9AC\uD55C\uB2E4. \uB0A8\uC740 \uB450 \uC790\uB9AC\uB97C \uC21C\uC11C \uC788\uAC8C \uACE0\uB978 \uACBD\uC6B0\uB97C \uD569\uD558\uBA74 \uB2F5\uC744 \uC5BB\uB294\uB2E4.",
              hintText: "\uB05D\uC790\uB9AC\uAC00 0\uC778 \uACBD\uC6B0\uC5D0\uB294 \uCCAB\uC790\uB9AC \uC81C\uD55C\uC758 \uACC4\uC0B0\uC774 \uB2EC\uB77C\uC9C0\uBBC0\uB85C \uBD84\uB9AC\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "identical-letters-separation",
          titles: [
            "\uAC19\uC740 \uBB38\uC790\uB4E4\uC774 \uC11C\uB85C \uC774\uC6C3\uD558\uC9C0 \uC54A\uB294 \uBC30\uC5F4",
            "\uAC19\uC740 \uBB38\uC790 \uC0AC\uC774\uC5D0 \uB2E4\uB978 \uBB38\uC790\uAC00 \uBC18\uB4DC\uC2DC \uB4E4\uC5B4\uAC00\uB294 \uBC30\uC5F4"
          ],
          sourcePattern: "\uD55C \uC885\uB958\uC758 \uBB38\uC790\uB97C \uBA3C\uC800 \uBC30\uC5F4\uD558\uACE0 \uC0DD\uAE34 \uBE48\uCE78\uC5D0 \uB2E4\uB978 \uAC19\uC740 \uBB38\uC790\uB97C \uBC30\uCE58\uD558\uB294 \uAC04\uACA9\uBC95",
          estimatedMinutes: [10, 11],
          reasoningSteps: [
            [
              "B\uB4E4\uC744 \uBA3C\uC800 \uC77C\uB82C\uB85C \uBC30\uC5F4\uD55C\uB2E4.",
              "B \uC0AC\uC774\uC640 \uC591\uB05D\uC758 \uBE48\uCE78 \uC218\uB97C \uC13C\uB2E4.",
              "A\uAC00 \uC774\uC6C3\uD558\uC9C0 \uC54A\uB3C4\uB85D \uC11C\uB85C \uB2E4\uB978 \uBE48\uCE78\uC744 \uACE0\uB978\uB2E4.",
              "\uAC19\uC740 \uBB38\uC790 \uC21C\uC5F4\uC784\uC744 \uBC18\uC601\uD574 \uC870\uD569\uC73C\uB85C \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uBD84\uB9AC \uC5ED\uD560\uC744 \uD558\uB294 \uBB38\uC790\uB97C \uBA3C\uC800 \uB193\uB294\uB2E4.",
              "\uC0AC\uC6A9 \uAC00\uB2A5\uD55C \uAC04\uACA9\uC744 \uB9CC\uB4E0\uB2E4.",
              "\uAC01 \uAC04\uACA9\uC5D0 \uCD5C\uB300 \uD558\uB098\uC529 \uAC19\uC740 \uBB38\uC790\uB97C \uB123\uB294\uB2E4.",
              "\uC591\uB05D \uC0AC\uC6A9 \uC870\uAC74\uC744 \uBC18\uC601\uD574 \uC870\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const a = randomInteger(3, 5);
            const b = a + randomInteger(0, 2);
            const allSeparated = nCr(
              b + 1,
              a
            );
            const internalOnly = b - 1 >= a ? nCr(b - 1, a) : 0;
            const answer = mode === 0 ? allSeparated : internalOnly;
            return makeShortAnswer({
              prompt: `\uAC19\uC740 \uBB38\uC790 A ${a}\uAC1C\uC640 \uAC19\uC740 \uBB38\uC790 B ${b}\uAC1C\uB97C \uBAA8\uB450 \uC77C\uB82C\uB85C \uB098\uC5F4\uD55C\uB2E4. ${mode === 0 ? "\uC5B4\uB5A4 \uB450 A\uB3C4 \uC11C\uB85C \uC774\uC6C3\uD558\uC9C0 \uC54A\uB294" : "\uBAA8\uB4E0 A\uAC00 \uB450 B \uC0AC\uC774\uC758 \uB0B4\uBD80 \uAC04\uACA9\uC5D0 \uB193\uC774\uACE0 \uC5B4\uB5A4 \uB450 A\uB3C4 \uC774\uC6C3\uD558\uC9C0 \uC54A\uB294"} \uACBD\uC6B0\uC758 \uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? nCr(b + 1, a) : nCr(b - 1, a),
              solution: `B ${b}\uAC1C\uB97C \uBA3C\uC800 \uB193\uC73C\uBA74 ${mode === 0 ? `${b + 1}\uAC1C\uC758 \uBE48\uCE78` : `${b - 1}\uAC1C\uC758 \uB0B4\uBD80 \uBE48\uCE78`}\uC774 \uC0DD\uAE34\uB2E4. A\uAC00 \uC774\uC6C3\uD558\uC9C0 \uC54A\uC73C\uB824\uBA74 \uC11C\uB85C \uB2E4\uB978 ${a}\uAC1C \uBE48\uCE78\uC744 \uACE0\uB974\uBA74 \uB418\uBBC0\uB85C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "B\uB97C \uBA3C\uC800 \uBC30\uC5F4\uD574 A\uAC00 \uB4E4\uC5B4\uAC08 \uC218 \uC788\uB294 \uAC04\uACA9\uC744 \uB9CC\uB4DC\uC138\uC694."
            });
          }
        },
        {
          id: "bounded-distribution",
          titles: [
            "\uD558\uD55C\uACFC \uC0C1\uD55C\uC774 \uD568\uAED8 \uC788\uB294 \uC815\uC218\uD574 \uAC1C\uC218",
            "\uC911\uBCF5\uC870\uD569\uACFC \uD3EC\uD568\uBC30\uC81C\uB85C \uC6A9\uB7C9 \uC81C\uD55C \uBD84\uBC30"
          ],
          sourcePattern: "\uD558\uD55C\uC744 \uBA3C\uC800 \uC81C\uAC70\uD574 \uC911\uBCF5\uC870\uD569\uC73C\uB85C \uBC14\uAFB8\uACE0 \uC0C1\uD55C \uC704\uBC18 \uACBD\uC6B0\uB97C \uD3EC\uD568\uBC30\uC81C\uB85C \uC81C\uC678",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uAC01 \uBCC0\uC218\uC758 \uD558\uD55C\uB9CC\uD07C \uCE58\uD658\uD55C\uB2E4.",
              "\uB0A8\uC740 \uD569\uC758 \uC74C\uC774 \uC544\uB2CC \uC815\uC218\uD574\uB97C \uC911\uBCF5\uC870\uD569\uC73C\uB85C \uC13C\uB2E4.",
              "\uC0C1\uD55C\uC744 \uB118\uB294 \uBCC0\uC218\uAC00 \uC788\uB294 \uACBD\uC6B0\uB97C \uB2E4\uC2DC \uCE58\uD658\uD574 \uC13C\uB2E4.",
              "\uD3EC\uD568\uBC30\uC81C\uB85C \uC704\uBC18 \uACBD\uC6B0\uB97C \uBE80\uB2E4."
            ],
            [
              "\uACF5\uC744 \uC0C1\uC790\uC5D0 \uBD84\uBC30\uD558\uB294 \uC815\uC218\uD574\uB85C \uBC88\uC5ED\uD55C\uB2E4.",
              "\uC81C\uD55C \uC5C6\uB294 \uC911\uBCF5\uC870\uD569 \uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uAC01 \uC0C1\uC790\uC758 \uC6A9\uB7C9\uC744 \uB118\uB294 \uACBD\uC6B0\uB97C \uC13C\uB2E4.",
              "\uAD50\uC9D1\uD569 \uAC00\uB2A5\uC131\uC744 \uD655\uC778\uD558\uACE0 \uD3EC\uD568\uBC30\uC81C\uB97C \uC801\uC6A9\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const total = randomInteger(9, 13);
            const lower = 1;
            const upper = randomInteger(4, 6);
            let count = 0;
            for (let x = lower; x <= upper; x += 1) {
              for (let y = lower; y <= upper; y += 1) {
                for (let z = lower; z <= upper; z += 1) {
                  if (x + y + z === total) {
                    count += 1;
                  }
                }
              }
            }
            const answer = count;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uBC29\uC815\uC2DD $x+y+z=${total}$\uC744 \uB9CC\uC871\uD558\uB294 \uC815\uC218\uD574 \uC911 $1\\le x,y,z\\le${upper}$\uC778 \uC21C\uC11C\uC30D $(x,y,z)$\uC758 \uAC1C\uC218\uB97C \uAD6C\uD558\uC2DC\uC624.` : `\uC11C\uB85C \uB2E4\uB978 \uC138 \uC0C1\uC790\uC5D0 \uAC19\uC740 \uACF5 ${total}\uAC1C\uB97C \uB098\uB204\uC5B4 \uB123\uB294\uB2E4. \uAC01 \uC0C1\uC790\uC5D0\uB294 1\uAC1C \uC774\uC0C1 ${upper}\uAC1C \uC774\uD558\uB97C \uB123\uC744 \uB54C \uACBD\uC6B0\uC758 \uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: count,
              solution: `$x'=x-1,y'=y-1,z'=z-1$\uB85C \uD558\uD55C\uC744 \uC81C\uAC70\uD55C \uB4A4 \uC81C\uD55C \uC5C6\uB294 \uC911\uBCF5\uC870\uD569\uC744 \uC13C\uB2E4. \uADF8\uC911 \uC5B4\uB290 \uBCC0\uC218\uAC00 ${upper}\uB97C \uB118\uB294 \uACBD\uC6B0\uB97C \uC0C8 \uBCC0\uC218\uB85C \uCE58\uD658\uD574 \uD3EC\uD568\uBC30\uC81C\uB85C \uBE7C\uBA74 ${answer}\uAC1C\uC774\uB2E4.`,
              hintText: "\uBA3C\uC800 \uAC01 \uBCC0\uC218\uC5D0\uC11C 1\uC744 \uBE7C \uD558\uD55C\uC744 \uC5C6\uC564 \uB4A4 \uC0C1\uD55C \uC704\uBC18 \uACBD\uC6B0\uB97C \uC81C\uC678\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "lattice-path-through-avoid",
          titles: [
            "\uD2B9\uC815 \uC810\uC744 \uC9C0\uB098\uC9C0 \uC54A\uB294 \uCD5C\uB2E8\uACBD\uB85C",
            "\uB450 \uC9C0\uC815\uC810 \uC911 \uC815\uD655\uD788 \uD558\uB098\uB97C \uC9C0\uB098\uB294 \uCD5C\uB2E8\uACBD\uB85C"
          ],
          sourcePattern: "\uC804\uCCB4 \uCD5C\uB2E8\uACBD\uB85C\uC5D0\uC11C \uC9C0\uC815\uC810\uC744 \uC9C0\uB098\uB294 \uACBD\uB85C\uB97C \uAD6C\uAC04\uBCC4 \uC870\uD569\uC758 \uACF1\uC73C\uB85C \uC138\uC5B4 \uD3EC\uD568\uBC30\uC81C",
          estimatedMinutes: [12, 14],
          reasoningSteps: [
            [
              "\uC804\uCCB4 \uCD5C\uB2E8\uACBD\uB85C \uC218\uB97C \uC870\uD569\uC73C\uB85C \uC13C\uB2E4.",
              "\uC9C0\uC815\uC810\uAE4C\uC9C0\uC758 \uACBD\uB85C \uC218\uB97C \uC13C\uB2E4.",
              "\uC9C0\uC815\uC810\uBD80\uD130 \uB3C4\uCC29\uC810\uAE4C\uC9C0\uC758 \uACBD\uB85C \uC218\uB97C \uC13C\uB2E4.",
              "\uACF1\uD55C \uAE08\uC9C0 \uACBD\uB85C\uB97C \uC804\uCCB4\uC5D0\uC11C \uBE80\uB2E4."
            ],
            [
              "\uAC01 \uC9C0\uC815\uC810\uC744 \uC9C0\uB098\uB294 \uACBD\uB85C \uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uC810\uC744 \uBAA8\uB450 \uC9C0\uB0A0 \uC218 \uC788\uB294 \uC21C\uC11C\uB97C \uD655\uC778\uD55C\uB2E4.",
              "\uB450 \uC810\uC744 \uBAA8\uB450 \uC9C0\uB098\uB294 \uACBD\uB85C\uB97C \uC13C\uB2E4.",
              "\uB300\uCE6D\uCC28 \uACF5\uC2DD\uC73C\uB85C \uC815\uD655\uD788 \uD558\uB098\uB9CC \uC9C0\uB098\uB294 \uACBD\uB85C\uB97C \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const width = randomInteger(5, 7);
            const height = randomInteger(4, 6);
            const pointA = [2, 2];
            const pointB = [3, 3];
            const total = nCr(
              width + height,
              width
            );
            const through = (point) => nCr(
              point[0] + point[1],
              point[0]
            ) * nCr(
              width - point[0] + height - point[1],
              width - point[0]
            );
            const throughA = through(pointA);
            const throughB = through(pointB);
            const throughBoth = nCr(4, 2) * nCr(2, 1) * nCr(
              width - pointB[0] + height - pointB[1],
              width - pointB[0]
            );
            const answer = mode === 0 ? total - throughA : throughA + throughB - 2 * throughBoth;
            return makeShortAnswer({
              prompt: `\uACA9\uC790\uC810 $(0,0)$\uC5D0\uC11C $(${width},${height})$\uAE4C\uC9C0 \uC624\uB978\uCABD \uB610\uB294 \uC704\uCABD\uC73C\uB85C\uB9CC \uD55C \uCE78\uC529 \uC774\uB3D9\uD558\uB294 \uCD5C\uB2E8\uACBD\uB85C \uC911 ${mode === 0 ? "\uC810 (2,2)\uB97C \uC9C0\uB098\uC9C0 \uC54A\uB294" : "\uC810 (2,2)\uC640 (3,3) \uC911 \uC815\uD655\uD788 \uD55C \uC810\uB9CC \uC9C0\uB098\uB294"} \uACBD\uB85C\uC758 \uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? total - throughA : throughA + throughB - 2 * throughBoth,
              solution: mode === 0 ? `\uC804\uCCB4 \uACBD\uB85C $\\binom{${width + height}}{${width}}$\uC5D0\uC11C (2,2)\uB97C \uC9C0\uB098\uB294 \uB450 \uAD6C\uAC04 \uACBD\uB85C \uC218\uC758 \uACF1\uC744 \uBE7C\uBA74 ${answer}\uC774\uB2E4.` : `A\uB97C \uC9C0\uB098\uB294 \uC218\uC640 B\uB97C \uC9C0\uB098\uB294 \uC218\uB97C \uB354\uD55C \uB4A4, \uB450 \uC810\uC744 \uBAA8\uB450 \uC9C0\uB098\uB294 \uACBD\uB85C\uB294 \uB450 \uC9D1\uD569\uC5D0 \uAC01\uAC01 \uB4E4\uC5B4\uAC00\uBBC0\uB85C \uB450 \uBC88 \uBE7C\uC57C \uD55C\uB2E4. \uACB0\uACFC\uB294 ${answer}\uC774\uB2E4.`,
              hintText: "\uC9C0\uC815\uC810\uC744 \uC9C0\uB098\uB294 \uACBD\uB85C\uB294 \uCD9C\uBC1C\u2192\uC9C0\uC815\uC810\uACFC \uC9C0\uC815\uC810\u2192\uB3C4\uCC29\uC758 \uACBD\uC6B0\uC758 \uC218\uB97C \uACF1\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "binomial-coefficient-chain",
          titles: [
            "\uC774\uD56D\uC804\uAC1C\uC758 \uD2B9\uC815 \uCC28\uC218 \uACC4\uC218",
            "\uBD80\uD638\uAC00 \uC11E\uC778 \uC774\uD56D\uC804\uAC1C\uC758 \uC9DD\uC218\uCC28\uD56D \uACC4\uC218\uD569"
          ],
          sourcePattern: "\uC774\uD56D\uC815\uB9AC \uC77C\uBC18\uD56D\uC5D0\uC11C \uC9C0\uC218 \uC870\uAC74\uC744 \uD480\uAC70\uB098 x=1,-1 \uB300\uC785\uC73C\uB85C \uACC4\uC218\uD569 \uBD84\uB9AC",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uC774\uD56D\uC804\uAC1C\uC758 \uC77C\uBC18\uD56D\uC744 \uC4F4\uB2E4.",
              "x\uC758 \uC9C0\uC218\uB97C \uBAA9\uD45C \uCC28\uC218\uC640 \uAC19\uAC8C \uB454\uB2E4.",
              "\uC120\uD0DD \uD69F\uC218 r\uC744 \uACB0\uC815\uD55C\uB2E4.",
              "\uC870\uD569\uACFC \uACC4\uC218\uC758 \uAC70\uB4ED\uC81C\uACF1\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uC804\uCCB4 \uACC4\uC218\uD569\uC744 x=1\uB85C \uAD6C\uD55C\uB2E4.",
              "\uC9DD\xB7\uD640 \uCC28\uC218 \uBD80\uD638\uAC00 \uBC14\uB010 \uD569\uC744 x=-1\uB85C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uC2DD\uC744 \uB354\uD574 \uC9DD\uC218\uCC28\uD56D\uB9CC \uB0A8\uAE34\uB2E4.",
              "2\uB85C \uB098\uB220 \uBAA9\uD45C \uACC4\uC218\uD569\uC744 \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const n = randomInteger(6, 9);
            const coefficient = randomInteger(2, 4);
            const r = randomInteger(2, n - 2);
            const targetPower = n - r;
            const specific = nCr(n, r) * power(coefficient, r);
            const evenSum = (power(
              1 + coefficient,
              n
            ) + power(
              1 - coefficient,
              n
            )) / 2;
            const answer = mode === 0 ? specific : evenSum;
            return makeShortAnswer({
              prompt: mode === 0 ? `$(x+${coefficient})^{${n}}$\uC758 \uC804\uAC1C\uC2DD\uC5D0\uC11C $x^{${targetPower}}$\uC758 \uACC4\uC218\uB97C \uAD6C\uD558\uC2DC\uC624.` : `$(x+${coefficient})^{${n}}=a_0+a_1x+\\cdots+a_${n}x^{${n}}$\uC77C \uB54C, $a_0+a_2+a_4+\\cdots$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? nCr(n, r) * power(
                coefficient,
                r
              ) : evenSum,
              solution: mode === 0 ? `\uC77C\uBC18\uD56D $\\binom{${n}}r x^{${n}-r}${coefficient}^r$\uC5D0\uC11C $r=${r}$. \uB530\uB77C\uC11C \uACC4\uC218\uB294 ${answer}\uC774\uB2E4.` : `$x=1$\uACFC $x=-1$\uC744 \uAC01\uAC01 \uB300\uC785\uD55C \uB450 \uC2DD\uC744 \uB354\uD558\uBA74 \uC9DD\uC218 \uCC28\uC218 \uACC4\uC218\uB9CC 2\uBC30\uB85C \uB0A8\uB294\uB2E4. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: mode === 0 ? "\uC77C\uBC18\uD56D\uC758 x \uC9C0\uC218\uB97C \uBAA9\uD45C \uC9C0\uC218\uC640 \uAC19\uAC8C \uB450\uC138\uC694." : "\uB2E4\uD56D\uC2DD\uC5D0 x=1\uACFC x=-1\uC744 \uB300\uC785\uD55C \uAC12\uC744 \uB354\uD574 \uBCF4\uC138\uC694."
            });
          }
        },
        {
          id: "circular-adjacency",
          titles: [
            "\uC6D0\uC21C\uC5F4\uC5D0\uC11C \uC9C0\uC815\uB41C \uB450 \uC0AC\uB78C\uC744 \uC774\uC6C3\uD558\uAC8C \uBC30\uCE58",
            "\uC6D0\uC21C\uC5F4\uC5D0\uC11C \uC9C0\uC815\uB41C \uB450 \uC0AC\uB78C\uC774 \uC774\uC6C3\uD558\uC9C0 \uC54A\uB294 \uBC30\uCE58"
          ],
          sourcePattern: "\uD68C\uC804\uC774 \uAC19\uC740 \uC6D0\uC21C\uC5F4\uC5D0\uC11C \uB450 \uB300\uC0C1\uC744 \uD55C \uBB36\uC74C\uC73C\uB85C \uBCF4\uAC70\uB098 \uC804\uCCB4\uC5D0\uC11C \uC778\uC811\uD55C \uACBD\uC6B0\uB97C \uC81C\uC678",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uB450 \uC9C0\uC815 \uC778\uBB3C\uC744 \uD558\uB098\uC758 \uBE14\uB85D\uC73C\uB85C \uBB36\uB294\uB2E4.",
              "\uBE14\uB85D\uC744 \uD3EC\uD568\uD55C \uB300\uC0C1\uB4E4\uC758 \uC6D0\uC21C\uC5F4\uC744 \uC13C\uB2E4.",
              "\uBE14\uB85D \uB0B4\uBD80 \uC21C\uC11C \uB450 \uAC00\uC9C0\uB97C \uACF1\uD55C\uB2E4.",
              "\uD68C\uC804 \uC911\uBCF5\uC774 \uC81C\uAC70\uB410\uB294\uC9C0 \uD655\uC778\uD55C\uB2E4."
            ],
            [
              "\uC804\uCCB4 \uC6D0\uC21C\uC5F4\uC758 \uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uC9C0\uC815 \uC778\uBB3C\uC774 \uC774\uC6C3\uD55C \uACBD\uC6B0\uB97C \uBE14\uB85D\uC73C\uB85C \uC13C\uB2E4.",
              "\uC804\uCCB4\uC5D0\uC11C \uC778\uC811\uD55C \uACBD\uC6B0\uB97C \uBE80\uB2E4.",
              "\uC791\uC740 \uC0AC\uB840\uB85C \uD68C\uC804 \uC911\uBCF5\uC744 \uAC80\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const people = randomInteger(6, 9);
            const adjacent = 2 * factorial(people - 2);
            const total = factorial(people - 1);
            const answer = mode === 0 ? adjacent : total - adjacent;
            return makeShortAnswer({
              prompt: `\uC11C\uB85C \uB2E4\uB978 ${people}\uBA85\uC774 \uC6D0\uD615 \uD0C1\uC790\uC5D0 \uB458\uB7EC\uC549\uC744 \uB54C, \uB450 \uC0AC\uB78C A, B\uAC00 ${mode === 0 ? "\uC11C\uB85C \uC774\uC6C3\uD558\uB294" : "\uC11C\uB85C \uC774\uC6C3\uD558\uC9C0 \uC54A\uB294"} \uACBD\uC6B0\uC758 \uC218\uB97C \uAD6C\uD558\uC2DC\uC624. (\uD68C\uC804\uD558\uC5EC \uAC19\uC740 \uAC83\uC740 \uAC19\uC740 \uBC30\uCE58)`,
              answer,
              independentAnswer: mode === 0 ? 2 * factorial(
                people - 2
              ) : factorial(
                people - 1
              ) - 2 * factorial(
                people - 2
              ),
              solution: `\uC804\uCCB4 \uC6D0\uC21C\uC5F4\uC740 $(${people}-1)!$\uAC1C\uC774\uB2E4. A, B\uB97C \uD55C \uBE14\uB85D\uC73C\uB85C \uBCF4\uBA74 \uC778\uC811\uD55C \uACBD\uC6B0\uB294 $2(${people}-2)!$\uAC1C\uC774\uBBC0\uB85C \uC694\uAD6C\uD55C \uC218\uB294 ${answer}\uC774\uB2E4.`,
              hintText: "A\uC640 B\uB97C \uB0B4\uBD80 \uC21C\uC11C\uAC00 \uB450 \uAC00\uC9C0\uC778 \uD558\uB098\uC758 \uBE14\uB85D\uC73C\uB85C \uBCF4\uC138\uC694."
            });
          }
        },
        {
          id: "surjective-distribution",
          titles: [
            "\uC11C\uB85C \uB2E4\uB978 \uACF5\uC744 \uBE48 \uC0C1\uC790 \uC5C6\uC774 \uBD84\uBC30",
            "\uD55C \uC0C1\uC790\uC758 \uAC1C\uC218\uB97C \uACE0\uC815\uD55C \uC804\uC0AC \uBD84\uBC30"
          ],
          sourcePattern: "\uC11C\uB85C \uB2E4\uB978 \uBB3C\uAC74\uC758 \uC804\uCCB4 \uD568\uC218 \uBC30\uCE58\uC5D0\uC11C \uBE48 \uC0C1\uC790\uAC00 \uC0DD\uAE30\uB294 \uACBD\uC6B0\uB97C \uD3EC\uD568\uBC30\uC81C\uB85C \uC81C\uAC70",
          estimatedMinutes: [13, 14],
          reasoningSteps: [
            [
              "\uAC01 \uACF5\uC774 \uB4E4\uC5B4\uAC08 \uC0C1\uC790\uB97C \uACE0\uB974\uB294 \uC804\uCCB4 \uACBD\uC6B0\uB97C \uC13C\uB2E4.",
              "\uD2B9\uC815 \uC0C1\uC790\uAC00 \uBE44\uB294 \uACBD\uC6B0\uB97C \uC13C\uB2E4.",
              "\uB450 \uC0C1\uC790\uAC00 \uB3D9\uC2DC\uC5D0 \uBE44\uB294 \uC911\uBCF5\uC744 \uBCF4\uC815\uD55C\uB2E4.",
              "\uD3EC\uD568\uBC30\uC81C\uB85C \uBE48 \uC0C1\uC790\uAC00 \uC5C6\uB294 \uACBD\uC6B0\uB97C \uAD6C\uD55C\uB2E4."
            ],
            [
              "\uC9C0\uC815 \uC0C1\uC790\uC5D0 \uB4E4\uC5B4\uAC08 \uB450 \uACF5\uC744 \uACE0\uB978\uB2E4.",
              "\uB098\uBA38\uC9C0 \uACF5\uC744 \uB450 \uC0C1\uC790\uC5D0 \uBD84\uBC30\uD55C\uB2E4.",
              "\uB450 \uC0C1\uC790 \uC911 \uD558\uB098\uAC00 \uBE44\uB294 \uACBD\uC6B0\uB97C \uBE80\uB2E4.",
              "\uC120\uD0DD\uACFC \uBD84\uBC30\uC758 \uC218\uB97C \uACF1\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const balls = randomInteger(5, 8);
            const onto = power(3, balls) - 3 * power(2, balls) + 3;
            const fixed = nCr(balls, 2) * (power(
              2,
              balls - 2
            ) - 2);
            const answer = mode === 0 ? onto : fixed;
            return makeShortAnswer({
              prompt: `\uC11C\uB85C \uB2E4\uB978 \uACF5 ${balls}\uAC1C\uB97C \uC11C\uB85C \uB2E4\uB978 \uC0C1\uC790 A, B, C\uC5D0 \uB123\uB294\uB2E4. ${mode === 0 ? "\uC138 \uC0C1\uC790\uAC00 \uBAA8\uB450 \uBE44\uC9C0 \uC54A\uAC8C" : "A\uC5D0\uB294 \uC815\uD655\uD788 2\uAC1C\uB97C \uB123\uACE0 B, C\uB3C4 \uBE44\uC9C0 \uC54A\uAC8C"} \uB123\uB294 \uACBD\uC6B0\uC758 \uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? power(3, balls) - 3 * power(2, balls) + 3 : nCr(balls, 2) * (power(
                2,
                balls - 2
              ) - 2),
              solution: mode === 0 ? `\uC804\uCCB4 $3^{${balls}}$\uC5D0\uC11C \uD55C \uC0C1\uC790\uAC00 \uBE48 \uACBD\uC6B0\uB97C \uBE7C\uACE0 \uB450 \uC0C1\uC790\uAC00 \uBE48 \uC911\uBCF5\uC744 \uB354\uD558\uBA74 ${answer}\uC774\uB2E4.` : `A\uC5D0 \uB123\uC744 \uB450 \uACF5\uC744 \uACE0\uB978 \uB4A4 \uB0A8\uC740 \uACF5\uC744 B, C\uC5D0 \uBAA8\uB450 \uC0AC\uC6A9\uD558\uC5EC \uBD84\uBC30\uD55C\uB2E4. $\\binom{${balls}}2(2^{${balls - 2}}-2)=${answer}$.`,
              hintText: "\uBE48 \uC0C1\uC790\uAC00 \uC0DD\uAE30\uB294 \uACBD\uC6B0\uB97C \uD3EC\uD568\uBC30\uC81C\uB85C \uC81C\uAC70\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "vowel-consonant-arrangement",
          titles: [
            "\uBAA8\uC74C\uC774 \uBAA8\uB450 \uBD99\uC5B4 \uC788\uB294 \uC11C\uB85C \uB2E4\uB978 \uBB38\uC790 \uBC30\uC5F4",
            "\uBAA8\uC74C\uB07C\uB9AC \uC774\uC6C3\uD558\uC9C0 \uC54A\uB294 \uBB38\uC790 \uBC30\uC5F4"
          ],
          sourcePattern: "\uBAA8\uC74C\uC744 \uD558\uB098\uC758 \uBE14\uB85D\uC73C\uB85C \uBB36\uAC70\uB098 \uC790\uC74C \uBC30\uC5F4\uC758 \uBE48\uCE78\uC5D0 \uBAA8\uC74C\uC744 \uBC30\uCE58\uD558\uB294 \uBB38\uC790\uC5F4 \uC21C\uC5F4",
          estimatedMinutes: [11, 13],
          reasoningSteps: [
            [
              "\uBAA8\uC74C \uC804\uCCB4\uB97C \uD558\uB098\uC758 \uBE14\uB85D\uC73C\uB85C \uBB36\uB294\uB2E4.",
              "\uBE14\uB85D\uACFC \uC790\uC74C\uC744 \uBC30\uC5F4\uD55C\uB2E4.",
              "\uBE14\uB85D \uB0B4\uBD80 \uBAA8\uC74C \uC21C\uC11C\uB97C \uC13C\uB2E4.",
              "\uB450 \uACBD\uC6B0\uC758 \uC218\uB97C \uACF1\uD55C\uB2E4."
            ],
            [
              "\uC790\uC74C\uC744 \uBA3C\uC800 \uC77C\uB82C\uB85C \uBC30\uC5F4\uD55C\uB2E4.",
              "\uC790\uC74C \uC0AC\uC774\uC640 \uC591 \uB05D\uC758 \uBE48\uCE78 \uC218\uB97C \uC13C\uB2E4.",
              "\uC11C\uB85C \uB2E4\uB978 \uBE48\uCE78\uC5D0 \uBAA8\uC74C\uC744 \uBC30\uCE58\uD55C\uB2E4.",
              "\uBAA8\uC74C \uB0B4\uBD80 \uC21C\uC11C\uAE4C\uC9C0 \uACF1\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const vowels = randomInteger(2, 3);
            const consonants = vowels + randomInteger(1, 3);
            const together = factorial(consonants + 1) * factorial(vowels);
            const separated = factorial(consonants) * nCr(
              consonants + 1,
              vowels
            ) * factorial(vowels);
            const answer = mode === 0 ? together : separated;
            return makeShortAnswer({
              prompt: `\uC11C\uB85C \uB2E4\uB978 \uBAA8\uC74C ${vowels}\uAC1C\uC640 \uC11C\uB85C \uB2E4\uB978 \uC790\uC74C ${consonants}\uAC1C\uB97C \uBAA8\uB450 \uD55C \uC904\uB85C \uBC30\uC5F4\uD560 \uB54C, ${mode === 0 ? "\uBAA8\uC74C\uC774 \uBAA8\uB450 \uC774\uC6C3\uD558\uB294" : "\uC5B4\uB290 \uB450 \uBAA8\uC74C\uB3C4 \uC774\uC6C3\uD558\uC9C0 \uC54A\uB294"} \uACBD\uC6B0\uC758 \uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? factorial(
                consonants + 1
              ) * factorial(vowels) : factorial(
                consonants
              ) * nCr(
                consonants + 1,
                vowels
              ) * factorial(vowels),
              solution: mode === 0 ? `\uBAA8\uC74C \uBE14\uB85D \uD558\uB098\uC640 \uC790\uC74C ${consonants}\uAC1C\uB97C \uBC30\uC5F4\uD558\uACE0 \uBE14\uB85D \uB0B4\uBD80\uB97C \uBC30\uC5F4\uD558\uBA74 ${answer}\uC774\uB2E4.` : `\uC790\uC74C\uC744 \uBA3C\uC800 \uBC30\uC5F4\uD55C \uB4A4 \uC0DD\uAE30\uB294 ${consonants + 1}\uAC1C \uBE48\uCE78 \uC911 ${vowels}\uAC1C\uB97C \uACE8\uB77C \uBAA8\uC74C\uC744 \uBC30\uC5F4\uD558\uBA74 ${answer}\uC774\uB2E4.`,
              hintText: mode === 0 ? "\uBAA8\uC74C \uC804\uCCB4\uB97C \uD558\uB098\uC758 \uD070 \uBB38\uC790\uCC98\uB7FC \uBB36\uC73C\uC138\uC694." : "\uC790\uC74C\uC744 \uBA3C\uC800 \uB193\uACE0 \uADF8 \uC0AC\uC774\uC758 \uBE48\uCE78\uC744 \uC138\uC138\uC694."
            });
          }
        },
        {
          id: "committee-composition",
          titles: [
            "\uB450 \uC9D1\uB2E8\uC5D0\uC11C \uCD5C\uC18C \uC778\uC6D0\uC744 \uB9CC\uC871\uD558\uB294 \uC704\uC6D0\uD68C",
            "\uB450 \uC9C0\uC815 \uC778\uBB3C\uC758 \uD3EC\uD568 \uAD00\uACC4\uAC00 \uC788\uB294 \uC704\uC6D0\uD68C"
          ],
          sourcePattern: "\uC9D1\uB2E8\uBCC4 \uC120\uD0DD \uC218\uB97C \uB098\uB220 \uC870\uD569\uC758 \uACF1\uC744 \uB354\uD558\uAC70\uB098 \uC9C0\uC815 \uC778\uBB3C\uC758 \uD3EC\uD568\xB7\uC81C\uC678 \uC870\uAC74\uC73C\uB85C \uACBD\uC6B0\uB97C \uBD84\uD560",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uC704\uC6D0\uD68C\uC5D0 \uD3EC\uD568\uB420 \uCCAB \uC9D1\uB2E8 \uC778\uC6D0 \uC218\uC758 \uBC94\uC704\uB97C \uC815\uD55C\uB2E4.",
              "\uAC01 \uC778\uC6D0 \uC218\uB9C8\uB2E4 \uB450 \uC9D1\uB2E8\uC758 \uC870\uD569 \uC218\uB97C \uACF1\uD55C\uB2E4.",
              "\uAC00\uB2A5\uD55C \uAD6C\uC131\uBCC4 \uACBD\uC6B0\uC758 \uC218\uB97C \uB354\uD55C\uB2E4.",
              "\uC804\uCCB4 \uC778\uC6D0 \uC870\uAC74\uC744 \uB2E4\uC2DC \uD655\uC778\uD55C\uB2E4."
            ],
            [
              "\uB450 \uC9C0\uC815 \uC778\uBB3C \uC911 \uC815\uD655\uD788 \uD55C \uBA85\uC744 \uACE0\uB978\uB2E4.",
              "\uB0A8\uC740 \uC790\uB9AC\uC758 \uC9D1\uB2E8\uBCC4 \uCD5C\uC18C \uC870\uAC74\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uAC00\uB2A5\uD55C \uAD6C\uC131\uC73C\uB85C \uB098\uB220 \uC870\uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC11C\uB85C \uACB9\uCE58\uC9C0 \uC54A\uB294 \uACBD\uC6B0\uB97C \uD569\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const firstGroup = randomInteger(5, 7);
            const secondGroup = randomInteger(5, 7);
            const size = 4;
            const atLeastTwo = Array.from(
              { length: 3 },
              (_, index) => {
                const firstChosen = index + 2;
                const secondChosen = size - firstChosen;
                return secondChosen >= 1 ? nCr(
                  firstGroup,
                  firstChosen
                ) * nCr(
                  secondGroup,
                  secondChosen
                ) : 0;
              }
            ).reduce(
              (sum, value) => sum + value,
              0
            );
            const exactlyOneDesignated = 2 * nCr(
              firstGroup + secondGroup - 2,
              size - 1
            );
            const answer = mode === 0 ? atLeastTwo : exactlyOneDesignated;
            return makeShortAnswer({
              prompt: `A\uC9D1\uB2E8 ${firstGroup}\uBA85\uACFC B\uC9D1\uB2E8 ${secondGroup}\uBA85 \uC911 ${size}\uBA85\uC758 \uC704\uC6D0\uD68C\uB97C \uB9CC\uB4E0\uB2E4. ${mode === 0 ? "A\uC9D1\uB2E8\uC5D0\uC11C \uC801\uC5B4\uB3C4 2\uBA85, B\uC9D1\uB2E8\uC5D0\uC11C \uC801\uC5B4\uB3C4 1\uBA85\uC744 \uBF51\uB294" : "\uC11C\uB85C \uB2E4\uB978 \uC9C0\uC815 \uC778\uBB3C P, Q \uC911 \uC815\uD655\uD788 \uD55C \uBA85\uB9CC \uBF51\uB294"} \uACBD\uC6B0\uC758 \uC218\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? [2, 3].map(
                (firstChosen) => nCr(
                  firstGroup,
                  firstChosen
                ) * nCr(
                  secondGroup,
                  size - firstChosen
                )
              ).reduce(
                (sum, value) => sum + value,
                0
              ) : 2 * nCr(
                firstGroup + secondGroup - 2,
                size - 1
              ),
              solution: mode === 0 ? `\uAC00\uB2A5\uD55C \uAD6C\uC131\uC740 (A,B)=(2,2),(3,1)\uC774\uB2E4. \uAC01 \uC870\uD569\uC758 \uACF1\uC744 \uB354\uD558\uBA74 ${answer}\uC774\uB2E4.` : `P, Q \uC911 \uD3EC\uD568\uD560 \uD55C \uBA85\uC744 2\uAC00\uC9C0\uB85C \uACE0\uB974\uACE0 \uB098\uBA38\uC9C0 ${size - 1}\uBA85\uC744 \uB2E4\uB978 \uC0AC\uB78C \uC911\uC5D0\uC11C \uACE0\uB974\uBA74 ${answer}\uC774\uB2E4.`,
              hintText: "\uC9D1\uB2E8\uBCC4\uB85C \uBA87 \uBA85\uC744 \uBF51\uB294\uC9C0 \uAC00\uB2A5\uD55C \uAD6C\uC131\uC744 \uBA3C\uC800 \uBAA8\uB450 \uC801\uC73C\uC138\uC694."
            });
          }
        },
        {
          id: "laurent-binomial-term",
          titles: [
            "\uC591\uC758 \uC9C0\uC218\uC640 \uC74C\uC758 \uC9C0\uC218\uAC00 \uC11E\uC778 \uC774\uD56D\uC804\uAC1C\uC758 \uC0C1\uC218\uD56D",
            "\uB85C\uB791\uD615 \uC774\uD56D\uC804\uAC1C\uC758 \uC9C0\uC815 \uCC28\uC218 \uACC4\uC218"
          ],
          sourcePattern: "(x^p+a/x)^n\uC758 \uC77C\uBC18\uD56D\uC5D0\uC11C x\uC758 \uC804\uCCB4 \uC9C0\uC218\uB97C \uACC4\uC0B0\uD574 \uBAA9\uD45C \uCC28\uC218\uC640 \uAC19\uAC8C \uB450\uB294 \uC720\uD615",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uC774\uD56D\uC804\uAC1C\uC758 \uC77C\uBC18\uD56D\uC744 \uC4F4\uB2E4.",
              "x\uC758 \uC591\uC758 \uC9C0\uC218\uC640 \uC74C\uC758 \uC9C0\uC218\uB97C \uD569\uCE5C\uB2E4.",
              "\uC804\uCCB4 \uC9C0\uC218\uAC00 0\uC774 \uB418\uB294 \uC120\uD0DD \uD69F\uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC870\uD569\uACFC \uC0C1\uC218\uC758 \uAC70\uB4ED\uC81C\uACF1\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "r\uBC88\uC9F8 \uC120\uD0DD\uD56D\uC758 x \uC9C0\uC218\uB97C \uC2DD\uC73C\uB85C \uB098\uD0C0\uB0B8\uB2E4.",
              "\uBAA9\uD45C \uC9C0\uC218\uC640 \uAC19\uAC8C \uB450\uC5B4 r\uC744 \uD47C\uB2E4.",
              "\uD5C8\uC6A9 \uBC94\uC704\uC758 \uC815\uC218\uC778\uC9C0 \uD655\uC778\uD55C\uB2E4.",
              "\uD574\uB2F9 \uC77C\uBC18\uD56D\uC758 \uACC4\uC218\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const coefficient = randomInteger(2, 4);
            const n = 6;
            const target = mode === 0 ? 0 : 3;
            const selected = mode === 0 ? 4 : 3;
            const answer = nCr(n, selected) * power(
              coefficient,
              selected
            );
            return makeShortAnswer({
              prompt: `$(x^2+\\dfrac{${coefficient}}x)^6$\uC758 \uC804\uAC1C\uC2DD\uC5D0\uC11C ${mode === 0 ? "\uC0C1\uC218\uD56D\uC744" : "$x^3$\uC758 \uACC4\uC218\uB97C"} \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: nCr(n, selected) * power(
                coefficient,
                selected
              ),
              solution: `\uB450 \uBC88\uC9F8 \uD56D\uC744 r\uBC88 \uACE0\uB978 \uC77C\uBC18\uD56D\uC758 x \uC9C0\uC218\uB294 $2(6-r)-r=12-3r$\uC774\uB2E4. \uC774\uB97C ${target}\uACFC \uAC19\uAC8C \uB450\uBA74 $r=${selected}$\uC774\uACE0 \uACC4\uC218\uB294 ${answer}\uC774\uB2E4.`,
              hintText: "\uB450 \uBC88\uC9F8 \uD56D\uC744 r\uBC88 \uC120\uD0DD\uD588\uC744 \uB54C x\uC758 \uC804\uCCB4 \uC9C0\uC218\uB97C \uBA3C\uC800 \uACC4\uC0B0\uD558\uC138\uC694."
            });
          }
        }
      ];
      module.exports = {
        courseId,
        unitId,
        requiredConceptIds,
        minimumAppliedPoolSize: 15,
        appliedPolicy: {
          includeBankTypes: true,
          minimumLocalDifficulty: 3
        },
        advancedTemplates: defineAdvancedTemplates({
          courseId,
          unitId,
          requiredConceptIds,
          families
        })
      };
    }
  });

  // services/assessmentTemplates/probabilityStatistics/probability.js
  var require_probability = __commonJS({
    "services/assessmentTemplates/probabilityStatistics/probability.js"(exports, module) {
      var {
        randomInteger,
        choose,
        fraction,
        nCr,
        power,
        makeShortAnswer,
        defineAdvancedTemplates
      } = require_shared();
      var courseId = "probability-statistics";
      var unitId = "probability";
      var requiredConceptIds = [
        "probability-statistics-02-01",
        "probability-statistics-02-02",
        "probability-statistics-02-03",
        "probability-statistics-02-04",
        "probability-statistics-02-05",
        "probability-statistics-02-06"
      ];
      var families = [
        {
          id: "bayes-two-sources",
          titles: [
            "\uB450 \uC8FC\uBA38\uB2C8\uC758 \uACB0\uACFC\uC5D0\uC11C \uC6D0\uC778\uC744 \uC5ED\uCD94\uB860\uD558\uB294 \uC870\uAC74\uBD80\uD655\uB960",
            "\uC11C\uB85C \uB2E4\uB978 \uC0AC\uC804\uD655\uB960\uC744 \uAC00\uC9C4 \uB450 \uC6D0\uC778\uC758 \uBCA0\uC774\uC988 \uACC4\uC0B0"
          ],
          sourcePattern: "\uC6D0\uC778\uC744 \uBA3C\uC800 \uC120\uD0DD\uD558\uACE0 \uACB0\uACFC\uB97C \uAD00\uCC30\uD55C \uC0C1\uD669\uC5D0\uC11C \uACF1\uC148\uC815\uB9AC\uC640 \uC804\uCCB4\uD655\uB960\uB85C \uC0AC\uD6C4\uD655\uB960 \uACC4\uC0B0",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uAC01 \uC8FC\uBA38\uB2C8\uAC00 \uC120\uD0DD\uB420 \uD655\uB960\uC744 \uC815\uD55C\uB2E4.",
              "\uAC01 \uC8FC\uBA38\uB2C8\uC5D0\uC11C \uBE68\uAC04 \uACF5\uC774 \uB098\uC62C \uACB0\uD569\uD655\uB960\uC744 \uAD6C\uD55C\uB2E4.",
              "\uBE68\uAC04 \uACF5\uC774 \uB098\uC62C \uC804\uCCB4\uD655\uB960\uC744 \uB354\uD55C\uB2E4.",
              "\uBAA9\uD45C \uACB0\uD569\uD655\uB960\uC744 \uC804\uCCB4\uD655\uB960\uB85C \uB098\uB208\uB2E4."
            ],
            [
              "\uC0AC\uC804\uD655\uB960\uACFC \uC870\uAC74\uBD80\uD655\uB960\uC744 \uACF1\uD55C\uB2E4.",
              "\uB450 \uC6D0\uC778\uC758 \uAD00\uCC30 \uACB0\uACFC \uD655\uB960\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC804\uCCB4\uD655\uB960\uBC95\uCE59\uC73C\uB85C \uBD84\uBAA8\uB97C \uB9CC\uB4E0\uB2E4.",
              "\uBCA0\uC774\uC988 \uD615\uD0DC\uB85C \uC0AC\uD6C4\uD655\uB960\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const totalA = randomInteger(5, 8);
            const totalB = randomInteger(5, 8);
            const redA = randomInteger(
              1,
              totalA - 1
            );
            const redB = randomInteger(
              1,
              totalB - 1
            );
            const priorA = mode === 0 ? 1 : 2;
            const priorB = mode === 0 ? 1 : 1;
            const numerator = priorA * redA * totalB;
            const denominator = numerator + priorB * redB * totalA;
            const answer = fraction(
              numerator,
              denominator
            );
            return makeShortAnswer({
              prompt: `\uC8FC\uBA38\uB2C8 A\uC5D0\uB294 \uBE68\uAC04 \uACF5 ${redA}\uAC1C\uB97C \uD3EC\uD568\uD574 ${totalA}\uAC1C, B\uC5D0\uB294 \uBE68\uAC04 \uACF5 ${redB}\uAC1C\uB97C \uD3EC\uD568\uD574 ${totalB}\uAC1C\uC758 \uACF5\uC774 \uC788\uB2E4. ${mode === 0 ? "\uB450 \uC8FC\uBA38\uB2C8 \uC911 \uD558\uB098\uB97C \uAC19\uC740 \uD655\uB960\uB85C" : "A\uC640 B\uB97C \uAC01\uAC01 2/3, 1/3\uC758 \uD655\uB960\uB85C"} \uACE8\uB77C \uACF5 \uD55C \uAC1C\uB97C \uAEBC\uB0C8\uB354\uB2C8 \uBE68\uAC04 \uACF5\uC774\uC5C8\uB2E4. A\uB97C \uACE8\uB790\uC744 \uD655\uB960\uC744 \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: fraction(
                numerator,
                denominator
              ),
              solution: `A\uC5D0\uC11C \uBE68\uAC15\uC774 \uB098\uC624\uB294 \uACB0\uD569\uD655\uB960\uACFC B\uC5D0\uC11C \uBE68\uAC15\uC774 \uB098\uC624\uB294 \uACB0\uD569\uD655\uB960\uC744 \uAC01\uAC01 \uAD6C\uD55C\uB2E4. \uC870\uAC74\uBD80\uD655\uB960\uC740 \uC804\uC790\uB97C \uB450 \uACB0\uD569\uD655\uB960\uC758 \uD569\uC73C\uB85C \uB098\uB208 \uAC12\uC774\uBBC0\uB85C ${answer}\uC774\uB2E4.`,
              hintText: "\uC6D0\uC778 \uC120\uD0DD \uD655\uB960\xD7\uADF8 \uC6D0\uC778\uC5D0\uC11C \uACB0\uACFC\uAC00 \uB098\uC62C \uD655\uB960\uC744 \uB450 \uACBD\uC6B0 \uAC01\uAC01 \uACC4\uC0B0\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "without-replacement-condition",
          titles: [
            "\uBE44\uBCF5\uC6D0 \uCD94\uCD9C\uC5D0\uC11C \uCCAB \uACB0\uACFC\uB97C \uC870\uAC74\uC73C\uB85C \uD55C \uD655\uB960",
            "\uB450 \uBC88 \uCD94\uCD9C\uC758 \uACB0\uACFC\uB97C \uAD00\uCC30\uD55C \uB4A4 \uCCAB \uCD94\uCD9C \uC5ED\uCD94\uB860"
          ],
          sourcePattern: "\uBE44\uBCF5\uC6D0 \uCD94\uCD9C\uC5D0\uC11C \uCCAB \uC2DC\uD589 \uD6C4 \uB0A8\uC740 \uAD6C\uC131 \uBCC0\uD654\uB97C \uBC18\uC601\uD558\uAC70\uB098 \uAD00\uCC30 \uACB0\uACFC\uB85C \uC21C\uC11C\uB97C \uC5ED\uCD94\uB860",
          estimatedMinutes: [11, 13],
          reasoningSteps: [
            [
              "\uCCAB \uCD94\uCD9C \uACB0\uACFC\uB85C \uB0A8\uC740 \uACF5\uC758 \uAD6C\uC131\uC744 \uAC31\uC2E0\uD55C\uB2E4.",
              "\uC870\uAC74\uC774 \uB41C \uD45C\uBCF8\uACF5\uAC04\uC744 \uACE0\uC815\uD55C\uB2E4.",
              "\uB458\uC9F8 \uCD94\uCD9C\uC758 \uC720\uB9AC\uD55C \uACBD\uC6B0\uC640 \uC804\uCCB4 \uACBD\uC6B0\uB97C \uC13C\uB2E4.",
              "\uC870\uAC74\uBD80\uD655\uB960\uC744 \uAE30\uC57D\uBD84\uC218\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ],
            [
              "\uAC00\uB2A5\uD55C \uC0C9 \uC21C\uC11C\uB97C \uB098\uC5F4\uD55C\uB2E4.",
              "\uAC01 \uC21C\uC11C\uC758 \uACB0\uD569\uD655\uB960\uC744 \uACF1\uC148\uC815\uB9AC\uB85C \uAD6C\uD55C\uB2E4.",
              "\uAD00\uCC30 \uC870\uAC74\uC744 \uB9CC\uC871\uD558\uB294 \uC21C\uC11C\uB9CC \uB0A8\uAE34\uB2E4.",
              "\uBAA9\uD45C \uC21C\uC11C\uC758 \uD655\uB960\uC744 \uC870\uAC74 \uC804\uCCB4\uB85C \uB098\uB208\uB2E4."
            ]
          ],
          generate(mode) {
            const red = randomInteger(3, 6);
            const blue = randomInteger(3, 6);
            const total = red + blue;
            const answer = mode === 0 ? fraction(
              red - 1,
              total - 1
            ) : "1/2";
            return makeShortAnswer({
              prompt: mode === 0 ? `\uBE68\uAC04 \uACF5 ${red}\uAC1C\uC640 \uD30C\uB780 \uACF5 ${blue}\uAC1C\uAC00 \uB4E0 \uC8FC\uBA38\uB2C8\uC5D0\uC11C \uACF5\uC744 \uD55C \uAC1C\uC529 \uB418\uB3CC\uB824 \uB123\uC9C0 \uC54A\uACE0 \uB450 \uBC88 \uAEBC\uB0B8\uB2E4. \uCCAB\uC9F8 \uACF5\uC774 \uBE68\uAC04\uC0C9\uC77C \uB54C \uB458\uC9F8 \uACF5\uB3C4 \uBE68\uAC04\uC0C9\uC77C \uD655\uB960\uC744 \uAD6C\uD558\uC2DC\uC624.` : `\uBE68\uAC04 \uACF5 ${red}\uAC1C\uC640 \uD30C\uB780 \uACF5 ${blue}\uAC1C\uAC00 \uB4E0 \uC8FC\uBA38\uB2C8\uC5D0\uC11C \uACF5\uC744 \uD55C \uAC1C\uC529 \uB418\uB3CC\uB824 \uB123\uC9C0 \uC54A\uACE0 \uB450 \uBC88 \uAEBC\uB0C8\uB354\uB2C8 \uB450 \uACF5\uC758 \uC0C9\uC774 \uB2EC\uB790\uB2E4. \uCCAB\uC9F8 \uACF5\uC774 \uBE68\uAC04\uC0C9\uC774\uC5C8\uC744 \uD655\uB960\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? fraction(
                red - 1,
                total - 1
              ) : fraction(
                red * blue,
                red * blue + blue * red
              ),
              solution: mode === 0 ? `\uCCAB\uC9F8 \uACF5\uC774 \uBE68\uAC15\uC774\uBA74 \uB0A8\uC740 ${total - 1}\uAC1C \uC911 \uBE68\uAC04 \uACF5\uC740 ${red - 1}\uAC1C\uC774\uBBC0\uB85C \uD655\uB960\uC740 ${answer}.` : `\uC0C9\uC774 \uB2E4\uB978 \uC21C\uC11C\uB294 RB\uC640 BR\uC774\uB2E4. \uB450 \uC21C\uC11C\uC758 \uD655\uB960\uC740 \uBAA8\uB450 $\\frac{${red}}{${total}}\\frac{${blue}}{${total - 1}}$\uB85C \uAC19\uC73C\uBBC0\uB85C \uC870\uAC74 \uC544\uB798\uC5D0\uC11C \uAC01\uAC01 1/2\uC774\uB2E4.`,
              hintText: "\uB418\uB3CC\uB824 \uB123\uC9C0 \uC54A\uC73C\uBBC0\uB85C \uCCAB \uCD94\uCD9C \uB4A4 \uBD84\uC790\uC640 \uBD84\uBAA8\uAC00 \uC5B4\uB5BB\uAC8C \uBC14\uB00C\uB294\uC9C0 \uC801\uC73C\uC138\uC694."
            });
          }
        },
        {
          id: "independent-repeated-events",
          titles: [
            "\uB3C5\uB9BD \uBC18\uBCF5\uC5D0\uC11C \uC801\uC5B4\uB3C4 \uD55C \uBC88 \uC131\uACF5\uD560 \uD655\uB960",
            "\uCCAB \uC131\uACF5 \uC2DC\uC810\uC774 \uC81C\uD55C \uC548\uC5D0 \uC788\uC744 \uC870\uAC74\uBD80\uD655\uB960"
          ],
          sourcePattern: "\uB3C5\uB9BD\uC2DC\uD589\uC758 \uC5EC\uC0AC\uAC74 \uB610\uB294 \uCCAB \uC131\uACF5 \uC2DC\uC810\uBCC4 \uBC30\uBC18\uC0AC\uAC74\uC744 \uC774\uC6A9\uD55C \uBC18\uBCF5\uD655\uB960",
          estimatedMinutes: [10, 12],
          reasoningSteps: [
            [
              "\uD55C \uBC88 \uC2E4\uD328\uD560 \uD655\uB960\uC744 \uAD6C\uD55C\uB2E4.",
              "\uBAA8\uB450 \uC2E4\uD328\uD558\uB294 \uD655\uB960\uC744 \uB3C5\uB9BD \uACF1\uC73C\uB85C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC5EC\uC0AC\uAC74\uC744 \uCDE8\uD55C\uB2E4.",
              "\uBD84\uC218\uB97C \uAE30\uC57D\uD654\uD55C\uB2E4."
            ],
            [
              "\uCCAB \uC131\uACF5\uC774 \uAC01 \uC2DC\uD589\uC5D0\uC11C \uC77C\uC5B4\uB0A0 \uC0AC\uAC74\uC744 \uB098\uB208\uB2E4.",
              "\uAC01 \uC0AC\uAC74\uC758 \uD655\uB960\uC744 \uB3C5\uB9BD \uACF1\uC73C\uB85C \uAD6C\uD55C\uB2E4.",
              "\uC870\uAC74 \uC0AC\uAC74\uC758 \uC804\uCCB4\uD655\uB960\uC744 \uAD6C\uD55C\uB2E4.",
              "\uBAA9\uD45C \uC2DC\uC810\uAE4C\uC9C0\uC758 \uD655\uB960\uC744 \uB098\uB220 \uC870\uAC74\uBD80\uD655\uB960\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const denominator = choose([3, 4, 5]);
            const numerator = denominator - 1;
            const trials = randomInteger(3, 5);
            const fail = denominator - numerator;
            const atLeast = fraction(
              power(
                denominator,
                trials
              ) - power(fail, trials),
              power(
                denominator,
                trials
              )
            );
            const byTwoGivenByN = fraction(
              (denominator ** 2 - fail ** 2) * denominator ** (trials - 2),
              denominator ** trials - fail ** trials
            );
            const answer = mode === 0 ? atLeast : byTwoGivenByN;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uD55C \uBC88 \uC131\uACF5\uD560 \uD655\uB960\uC774 $\\frac{${numerator}}{${denominator}}$\uC778 \uB3C5\uB9BD\uC2DC\uD589\uC744 ${trials}\uBC88 \uD560 \uB54C \uC801\uC5B4\uB3C4 \uD55C \uBC88 \uC131\uACF5\uD560 \uD655\uB960\uC744 \uAD6C\uD558\uC2DC\uC624.` : `\uD55C \uBC88 \uC131\uACF5\uD560 \uD655\uB960\uC774 $\\frac{${numerator}}{${denominator}}$\uC778 \uB3C5\uB9BD\uC2DC\uD589\uC744 \uC131\uACF5\uD560 \uB54C\uAE4C\uC9C0 \uBC18\uBCF5\uD558\uB418 \uCD5C\uB300 ${trials}\uBC88\uB9CC \uD55C\uB2E4. ${trials}\uBC88 \uC548\uC5D0 \uC131\uACF5\uD588\uB2E4\uB294 \uC870\uAC74\uC5D0\uC11C 2\uBC88 \uC548\uC5D0 \uC131\uACF5\uD588\uC744 \uD655\uB960\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? atLeast : fraction(
                (denominator ** 2 - fail ** 2) * denominator ** (trials - 2),
                denominator ** trials - fail ** trials
              ),
              solution: mode === 0 ? `\uBAA8\uB450 \uC2E4\uD328\uD560 \uD655\uB960\uC744 1\uC5D0\uC11C \uBE7C\uBA74 ${answer}\uC774\uB2E4.` : `2\uBC88 \uC548\uC5D0 \uC131\uACF5\uD560 \uC0AC\uAC74\uC740 ${trials}\uBC88 \uC548\uC5D0 \uC131\uACF5\uD560 \uC0AC\uAC74\uC5D0 \uD3EC\uD568\uB41C\uB2E4. \uB530\uB77C\uC11C $\\frac{1-q^2}{1-q^{${trials}}}$\uB97C \uACC4\uC0B0\uD558\uBA74 \uB2F5\uC744 \uC5BB\uB294\uB2E4.`,
              hintText: "\uC801\uC5B4\uB3C4 \uD55C \uBC88 \uC131\uACF5\uC740 \uBAA8\uB450 \uC2E4\uD328\uC758 \uC5EC\uC0AC\uAC74\uC785\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "three-event-inclusion-exclusion",
          titles: [
            "\uC138 \uC0AC\uAC74\uC758 \uD569\uC0AC\uAC74 \uD655\uB960 \uD3EC\uD568\uBC30\uC81C",
            "\uC801\uC5B4\uB3C4 \uB450 \uC0AC\uAC74\uC774 \uC77C\uC5B4\uB0A0 \uD655\uB960"
          ],
          sourcePattern: "\uC138 \uC0AC\uAC74\uC758 \uAC1C\uBCC4\xB7\uC30D\uBCC4\xB7\uC0BC\uC911 \uAD50\uC9D1\uD569 \uD655\uB960\uC744 \uD3EC\uD568\uBC30\uC81C \uB610\uB294 \uC9C0\uC2DC\uD568\uC218 \uACC4\uC218\uB85C \uACB0\uD569",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uC138 \uAC1C\uBCC4\uC0AC\uAC74 \uD655\uB960\uC744 \uB354\uD55C\uB2E4.",
              "\uC30D\uBCC4 \uAD50\uC9D1\uD569\uC744 \uD55C \uBC88\uC529 \uBE80\uB2E4.",
              "\uC0BC\uC911 \uAD50\uC9D1\uD569\uC744 \uB2E4\uC2DC \uB354\uD55C\uB2E4.",
              "\uC5EC\uC0AC\uAC74\uC774 \uD544\uC694\uD558\uBA74 \uB9C8\uC9C0\uB9C9\uC5D0 1\uC5D0\uC11C \uBE80\uB2E4."
            ],
            [
              "\uC815\uD655\uD788 \uC138 \uC0AC\uAC74\uC774 \uC77C\uC5B4\uB098\uB294 \uD655\uB960\uC744 \uBD84\uB9AC\uD55C\uB2E4.",
              "\uC30D\uBCC4 \uAD50\uC9D1\uD569 \uD569\uC5D0\uC11C \uC0BC\uC911\uAD50\uC9D1\uD569\uC774 \uC138 \uBC88 \uC138\uC5B4\uC9D0\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uC801\uC5B4\uB3C4 \uB450 \uC0AC\uAC74 \uD655\uB960\uB85C \uACC4\uC218\uB97C \uBCF4\uC815\uD55C\uB2E4.",
              "\uAE30\uC57D\uBD84\uC218\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const denominator = 20;
            const singles = [9, 10, 11];
            const pairs = [4, 3, 5];
            const triple = 2;
            const union = singles.reduce(
              (sum, value) => sum + value,
              0
            ) - pairs.reduce(
              (sum, value) => sum + value,
              0
            ) + triple;
            const atLeastTwo = pairs.reduce(
              (sum, value) => sum + value,
              0
            ) - 2 * triple;
            const answer = mode === 0 ? fraction(
              union,
              denominator
            ) : fraction(
              atLeastTwo,
              denominator
            );
            return makeShortAnswer({
              prompt: `\uC138 \uC0AC\uAC74 $A,B,C$\uC5D0 \uB300\uD558\uC5EC $P(A),P(B),P(C)$\uC758 \uBD84\uC790\uAC00 \uAC01\uAC01 ${singles.join(
                ","
              )}, $P(A\\cap B),P(B\\cap C),P(C\\cap A)$\uC758 \uBD84\uC790\uAC00 \uAC01\uAC01 ${pairs.join(
                ","
              )}, $P(A\\cap B\\cap C)$\uC758 \uBD84\uC790\uAC00 ${triple}\uC774\uACE0 \uBAA8\uB4E0 \uBD84\uBAA8\uB294 ${denominator}\uC774\uB2E4. ${mode === 0 ? "P(A\\cup B\\cup C)" : "\uC138 \uC0AC\uAC74 \uC911 \uC801\uC5B4\uB3C4 \uB450 \uC0AC\uAC74\uC774 \uC77C\uC5B4\uB0A0 \uD655\uB960"}\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? fraction(
                union,
                denominator
              ) : fraction(
                atLeastTwo,
                denominator
              ),
              solution: mode === 0 ? "\uC138 \uAC1C\uBCC4\uD655\uB960\uC758 \uD569\uC5D0\uC11C \uC138 \uC30D\uBCC4 \uAD50\uC9D1\uD569\uC744 \uBE7C\uACE0 \uC0BC\uC911\uAD50\uC9D1\uD569\uC744 \uB354\uD55C\uB2E4." : "\uC30D\uBCC4 \uAD50\uC9D1\uD569\uC758 \uD569\uC5D0\uC11C\uB294 \uC0BC\uC911\uAD50\uC9D1\uD569\uC774 \uC138 \uBC88 \uC138\uC5B4\uC9C0\uC9C0\uB9CC \uC801\uC5B4\uB3C4 \uB450 \uC0AC\uAC74 \uD655\uB960\uC5D0\uC11C\uB294 \uD55C \uBC88\uB9CC \uC138\uC5B4\uC57C \uD558\uBBC0\uB85C \uB450 \uBC88 \uBE80\uB2E4.",
              hintText: "\uC0BC\uC911\uAD50\uC9D1\uD569\uC774 \uD604\uC7AC \uBA87 \uBC88 \uC138\uC5B4\uC84C\uB294\uC9C0 \uACC4\uC218\uB97C \uCD94\uC801\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "conditional-dice-sum",
          titles: [
            "\uB450 \uC8FC\uC0AC\uC704 \uD569 \uC870\uAC74\uC5D0\uC11C \uACF1\uC758 \uC131\uC9C8 \uD655\uB960",
            "\uCD5C\uB313\uAC12 \uC870\uAC74\uC73C\uB85C \uCD95\uC18C\uB41C \uD45C\uBCF8\uACF5\uAC04\uC758 \uC870\uAC74\uBD80\uD655\uB960"
          ],
          sourcePattern: "\uAD00\uCC30\uB41C \uD569\xB7\uCD5C\uB313\uAC12 \uC870\uAC74\uC744 \uB9CC\uC871\uD558\uB294 \uC21C\uC11C\uC30D\uB9CC \uB2E4\uC2DC \uC5F4\uAC70\uD574 \uC870\uAC74\uBD80 \uD45C\uBCF8\uACF5\uAC04 \uAD6C\uC131",
          estimatedMinutes: [11, 11],
          reasoningSteps: [
            [
              "\uB450 \uC8FC\uC0AC\uC704 \uC21C\uC11C\uC30D\uC744 \uD45C\uBCF8\uC810\uC73C\uB85C \uB454\uB2E4.",
              "\uD569 \uC870\uAC74\uC744 \uB9CC\uC871\uD558\uB294 \uC21C\uC11C\uC30D\uB9CC \uB098\uC5F4\uD55C\uB2E4.",
              "\uADF8\uC911 \uACF1\uC758 \uBAA9\uD45C \uC131\uC9C8\uC744 \uB9CC\uC871\uD558\uB294 \uACBD\uC6B0\uB97C \uC13C\uB2E4.",
              "\uC870\uAC74 \uD45C\uBCF8\uACF5\uAC04 \uD06C\uAE30\uB85C \uB098\uB208\uB2E4."
            ],
            [
              "\uCD5C\uB313\uAC12 \uC870\uAC74\uC744 \uB9CC\uC871\uD558\uB294 \uC21C\uC11C\uC30D\uC744 \uC13C\uB2E4.",
              "\uB450 \uB208\uC774 \uB2E4\uB978 \uACBD\uC6B0\uB9CC \uCD94\uB9B0\uB2E4.",
              "\uC870\uAC74 \uC544\uB798 \uBAA8\uB4E0 \uC21C\uC11C\uC30D\uC774 \uAC19\uC740 \uAC00\uB2A5\uC131\uC778\uC9C0 \uD655\uC778\uD55C\uB2E4.",
              "\uC720\uB9AC\uD55C \uACBD\uC6B0\uB97C \uC804\uCCB4\uB85C \uB098\uB208\uB2E4."
            ]
          ],
          generate(mode) {
            const targetSum = randomInteger(6, 9);
            const targetMax = randomInteger(3, 6);
            const pairs = [];
            for (let first = 1; first <= 6; first += 1) {
              for (let second = 1; second <= 6; second += 1) {
                pairs.push([
                  first,
                  second
                ]);
              }
            }
            const condition = mode === 0 ? pairs.filter(
              ([a, b]) => a + b === targetSum
            ) : pairs.filter(
              ([a, b]) => Math.max(a, b) === targetMax
            );
            const favorable = mode === 0 ? condition.filter(
              ([a, b]) => a * b % 2 === 0
            ) : condition.filter(
              ([a, b]) => a !== b
            );
            const answer = fraction(
              favorable.length,
              condition.length
            );
            return makeShortAnswer({
              prompt: mode === 0 ? `\uC11C\uB85C \uB2E4\uB978 \uB450 \uC8FC\uC0AC\uC704\uB97C \uB358\uC838 \uB098\uC628 \uB208\uC758 \uD569\uC774 ${targetSum}\uC774\uC5C8\uB2E4. \uB450 \uB208\uC758 \uACF1\uC774 \uC9DD\uC218\uC77C \uD655\uB960\uC744 \uAD6C\uD558\uC2DC\uC624.` : `\uC11C\uB85C \uB2E4\uB978 \uB450 \uC8FC\uC0AC\uC704\uB97C \uB358\uC838 \uB098\uC628 \uB450 \uB208\uC758 \uCD5C\uB313\uAC12\uC774 ${targetMax}\uC600\uB2E4. \uB450 \uB208\uC774 \uC11C\uB85C \uB2E4\uB97C \uD655\uB960\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: fraction(
                favorable.length,
                condition.length
              ),
              solution: `\uC870\uAC74\uC744 \uB9CC\uC871\uD558\uB294 \uC21C\uC11C\uC30D\uC744 \uBAA8\uB450 \uB098\uC5F4\uD558\uBA74 ${condition.length}\uAC1C\uC774\uACE0, \uADF8\uC911 \uBAA9\uD45C \uC0AC\uAC74\uC740 ${favorable.length}\uAC1C\uC774\uB2E4. \uC870\uAC74\uBD80\uD655\uB960\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC6D0\uB798 36\uAC1C\uAC00 \uC544\uB2C8\uB77C \uAD00\uCC30 \uC870\uAC74\uC744 \uB9CC\uC871\uD558\uB294 \uC21C\uC11C\uC30D\uB9CC \uC0C8 \uD45C\uBCF8\uACF5\uAC04\uC73C\uB85C \uC4F0\uC138\uC694."
            });
          }
        },
        {
          id: "fixed-position-permutation",
          titles: [
            "\uBB34\uC791\uC704 \uC21C\uC5F4\uC5D0\uC11C \uB450 \uC9C0\uC815 \uC6D0\uC18C\uAC00 \uBAA8\uB450 \uC81C\uC790\uB9AC\uB97C \uD53C\uD560 \uD655\uB960",
            "\uBB34\uC791\uC704 \uC21C\uC5F4\uC5D0\uC11C \uB450 \uC9C0\uC815 \uC6D0\uC18C\uAC00 \uBAA8\uB450 \uC81C\uC790\uB9AC\uC77C \uD655\uB960"
          ],
          sourcePattern: "\uC804\uCCB4 \uC21C\uC5F4\uC5D0\uC11C \uC9C0\uC815 \uC6D0\uC18C\uC758 \uACE0\uC815 \uC0AC\uAC74\uC744 \uD3EC\uD568\uBC30\uC81C\uB85C \uC138\uAC70\uB098 \uB450 \uC790\uB9AC\uB97C \uACE0\uC815\uD55C \uB4A4 \uB098\uBA38\uC9C0\uB97C \uBC30\uC5F4",
          estimatedMinutes: [12, 11],
          reasoningSteps: [
            [
              "\uC804\uCCB4 \uC21C\uC5F4\uC758 \uC218\uB97C \uC13C\uB2E4.",
              "\uAC01 \uC9C0\uC815 \uC6D0\uC18C\uAC00 \uC81C\uC790\uB9AC\uC778 \uC0AC\uAC74\uC758 \uD06C\uAE30\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uC0AC\uAC74\uC758 \uAD50\uC9D1\uD569 \uD06C\uAE30\uB97C \uAD6C\uD55C\uB2E4.",
              "\uD3EC\uD568\uBC30\uC81C\uB85C \uB450 \uC6D0\uC18C\uAC00 \uBAA8\uB450 \uC81C\uC790\uB9AC\uB97C \uD53C\uD560 \uD655\uB960\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uB450 \uC9C0\uC815 \uC6D0\uC18C\uC758 \uC790\uB9AC\uB97C \uACE0\uC815\uD55C\uB2E4.",
              "\uB098\uBA38\uC9C0 \uC6D0\uC18C\uC758 \uC21C\uC5F4 \uC218\uB97C \uC13C\uB2E4.",
              "\uC804\uCCB4 \uC21C\uC5F4 \uC218\uB85C \uB098\uB208\uB2E4.",
              "\uACC4\uC2B9\uC744 \uC57D\uBD84\uD574 \uAE30\uC57D\uBD84\uC218\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const size = randomInteger(5, 8);
            const numerator = mode === 0 ? size ** 2 - 3 * size + 3 : 1;
            const denominator = size * (size - 1);
            const answer = fraction(
              numerator,
              denominator
            );
            return makeShortAnswer({
              prompt: `\uC11C\uB85C \uB2E4\uB978 ${size}\uAC1C\uC758 \uCE74\uB4DC\uB97C \uBB34\uC791\uC704\uB85C \uD55C \uC904\uC5D0 \uBC30\uC5F4\uD55C\uB2E4. \uC9C0\uC815\uB41C \uB450 \uCE74\uB4DC A, B\uC5D0 \uB300\uD558\uC5EC ${mode === 0 ? "A\uC640 B\uAC00 \uBAA8\uB450 \uC6D0\uB798 \uC790\uAE30 \uC790\uB9AC\uC5D0 \uB193\uC774\uC9C0 \uC54A\uC744" : "A\uC640 B\uAC00 \uBAA8\uB450 \uC6D0\uB798 \uC790\uAE30 \uC790\uB9AC\uC5D0 \uB193\uC77C"} \uD655\uB960\uC744 \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: mode === 0 ? fraction(
                size ** 2 - 3 * size + 3,
                size * (size - 1)
              ) : fraction(
                1,
                size * (size - 1)
              ),
              solution: mode === 0 ? `A \uB610\uB294 B\uAC00 \uC81C\uC790\uB9AC\uC778 \uD655\uB960\uC5D0 \uD3EC\uD568\uBC30\uC81C\uB97C \uC801\uC6A9\uD558\uBA74 $1-2/${size}+1/(${size}(${size}-1))=${answer}$\uC774\uB2E4.` : `\uB450 \uC790\uB9AC\uB97C \uACE0\uC815\uD55C \uBC30\uC5F4\uC740 $(${size}-2)!$\uAC1C, \uC804\uCCB4\uB294 $${size}!$\uAC1C\uC774\uBBC0\uB85C \uD655\uB960\uC740 ${answer}\uC774\uB2E4.`,
              hintText: mode === 0 ? "A\uAC00 \uC81C\uC790\uB9AC\uC778 \uC0AC\uAC74\uACFC B\uAC00 \uC81C\uC790\uB9AC\uC778 \uC0AC\uAC74\uC758 \uD569\uC9D1\uD569\uC744 \uBA3C\uC800 \uAD6C\uD558\uC138\uC694." : "\uB450 \uC790\uB9AC\uB97C \uACE0\uC815\uD55C \uB4A4 \uB098\uBA38\uC9C0\uB9CC \uBC30\uC5F4\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "first-success-stopping",
          titles: [
            "\uB3C5\uB9BD\uC2DC\uD589\uC5D0\uC11C \uCCAB \uC131\uACF5 \uC2DC\uC810\uC758 \uD655\uB960",
            "\uAE30\uD55C \uB0B4 \uC131\uACF5 \uC870\uAC74\uC5D0\uC11C \uB9C8\uC9C0\uB9C9 \uC2DC\uD589 \uCCAB \uC131\uACF5\uC758 \uC870\uAC74\uBD80\uD655\uB960"
          ],
          sourcePattern: "\uB3C5\uB9BD \uBCA0\uB974\uB204\uC774 \uC2DC\uD589\uC5D0\uC11C \uC55E\uC120 \uC2E4\uD328\uB4E4\uC758 \uACF1\uACFC \uD604\uC7AC \uC131\uACF5\uD655\uB960\uC744 \uACB0\uD569\uD558\uACE0 \uC870\uAC74\uBD80 \uD45C\uBCF8\uACF5\uAC04\uC73C\uB85C \uC815\uADDC\uD654",
          estimatedMinutes: [11, 13],
          reasoningSteps: [
            [
              "\uD55C \uC2DC\uD589\uC758 \uC131\uACF5\uD655\uB960\uACFC \uC2E4\uD328\uD655\uB960\uC744 \uAD6C\uBD84\uD55C\uB2E4.",
              "\uBAA9\uD45C \uC2DC\uC810 \uC804\uAE4C\uC9C0 \uBAA8\uB450 \uC2E4\uD328\uD560 \uD655\uB960\uC744 \uACF1\uD55C\uB2E4.",
              "\uBAA9\uD45C \uC2DC\uC810\uC5D0 \uC131\uACF5\uD560 \uD655\uB960\uC744 \uACF1\uD55C\uB2E4.",
              "\uAC70\uB4ED\uC81C\uACF1\uC744 \uACC4\uC0B0\uD574 \uAE30\uC57D\uBD84\uC218\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ],
            [
              "k\uD68C\uC9F8 \uCCAB \uC131\uACF5 \uC0AC\uAC74\uC758 \uD655\uB960\uC744 \uAD6C\uD55C\uB2E4.",
              "k\uD68C \uC774\uB0B4 \uC801\uC5B4\uB3C4 \uD55C \uBC88 \uC131\uACF5\uD560 \uD655\uB960\uC744 \uC5EC\uC0AC\uAC74\uC73C\uB85C \uAD6C\uD55C\uB2E4.",
              "\uCCAB \uC0AC\uAC74\uC774 \uC870\uAC74 \uC0AC\uAC74\uC5D0 \uD3EC\uD568\uB428\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uB450 \uD655\uB960\uC758 \uBE44\uB85C \uC870\uAC74\uBD80\uD655\uB960\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const denominator = choose([2, 3, 4]);
            const successNumerator = 1;
            const failureNumerator = denominator - 1;
            const attempt = randomInteger(3, 5);
            const firstNumerator = power(
              failureNumerator,
              attempt - 1
            ) * successNumerator;
            const firstDenominator = power(
              denominator,
              attempt
            );
            const byAttemptNumerator = power(
              denominator,
              attempt
            ) - power(
              failureNumerator,
              attempt
            );
            const answer = mode === 0 ? fraction(
              firstNumerator,
              firstDenominator
            ) : fraction(
              firstNumerator,
              byAttemptNumerator
            );
            return makeShortAnswer({
              prompt: `\uC131\uACF5\uD655\uB960\uC774 $1/${denominator}$\uC778 \uB3C5\uB9BD\uC2DC\uD589\uC744 \uBC18\uBCF5\uD55C\uB2E4. ${mode === 0 ? `\uC81C${attempt}\uD68C \uC2DC\uD589\uC5D0\uC11C \uCC98\uC74C \uC131\uACF5\uD560` : `\uC81C${attempt}\uD68C \uC774\uB0B4\uC5D0 \uC131\uACF5\uD588\uB2E4\uB294 \uC870\uAC74 \uC544\uB798 \uC81C${attempt}\uD68C\uC5D0\uC11C \uCC98\uC74C \uC131\uACF5\uD588\uC744`} \uD655\uB960\uC744 \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: mode === 0 ? fraction(
                power(
                  denominator - 1,
                  attempt - 1
                ),
                power(
                  denominator,
                  attempt
                )
              ) : fraction(
                power(
                  denominator - 1,
                  attempt - 1
                ),
                power(
                  denominator,
                  attempt
                ) - power(
                  denominator - 1,
                  attempt
                )
              ),
              solution: `\uC81C${attempt}\uD68C \uCCAB \uC131\uACF5 \uD655\uB960\uC740 $(${denominator - 1}/${denominator})^{${attempt - 1}}(1/${denominator})$${mode === 0 ? `\uC774\uBBC0\uB85C ${answer}\uC774\uB2E4.` : `\uC774\uACE0, ${attempt}\uD68C \uC774\uB0B4 \uC131\uACF5 \uD655\uB960\uC740 $1-(${denominator - 1}/${denominator})^{${attempt}}$\uC774\uB2E4. \uB450 \uD655\uB960\uC758 \uBE44\uB294 ${answer}\uC774\uB2E4.`}`,
              hintText: "\uCCAB \uC131\uACF5 \uC804\uC758 \uC2DC\uD589\uC740 \uBAA8\uB450 \uC2E4\uD328\uD574\uC57C \uD558\uBA70, \uC870\uAC74\uBD80\uD655\uB960\uC5D0\uC11C\uB294 \uAE30\uD55C \uB0B4 \uC131\uACF5 \uD655\uB960\uB85C \uB098\uB215\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "independent-unknown-probability",
          titles: [
            "\uB3C5\uB9BD\uC0AC\uAC74\uC758 \uD569\uC9D1\uD569\uC5D0\uC11C \uBBF8\uC9C0 \uD655\uB960 \uBCF5\uC6D0",
            "\uB3C5\uB9BD\uC0AC\uAC74\uC758 \uAD50\uC9D1\uD569\xB7\uC5EC\uC0AC\uAC74 \uACB0\uD569"
          ],
          sourcePattern: "\uB3C5\uB9BD\uC131 P(A\u2229B)=P(A)P(B)\uB97C \uD569\uC9D1\uD569 \uB610\uB294 \uC5EC\uC0AC\uAC74 \uACF5\uC2DD\uC5D0 \uB300\uC785\uD574 \uBBF8\uC9C0\uD655\uB960\uC744 \uACB0\uC815",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "P(B)=p\uB85C \uB454\uB2E4.",
              "\uB3C5\uB9BD\uC131\uC73C\uB85C \uAD50\uC9D1\uD569 \uD655\uB960\uC744 \uD45C\uD604\uD55C\uB2E4.",
              "\uD569\uC9D1\uD569 \uACF5\uC2DD\uC5D0 \uB300\uC785\uD574 p\uC758 \uC77C\uCC28\uBC29\uC815\uC2DD\uC744 \uD47C\uB2E4.",
              "\uAD6C\uD55C \uD655\uB960\uB85C \uBAA9\uD45C \uC0AC\uAC74\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uB450 \uC5EC\uC0AC\uAC74\uB3C4 \uB3C5\uB9BD\uC784\uC744 \uC0AC\uC6A9\uD55C\uB2E4.",
              "\uC801\uC5B4\uB3C4 \uD558\uB098\uAC00 \uC77C\uC5B4\uB0A0 \uD655\uB960\uC758 \uC5EC\uC0AC\uAC74\uC744 \uB9CC\uB4E0\uB2E4.",
              "\uBBF8\uC9C0 \uD655\uB960\uC744 \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uAD50\uC9D1\uD569 \uD655\uB960\uC744 \uACF1\uC148\uC815\uB9AC\uB85C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const aNumerator = choose([1, 2]);
            const aDenominator = 3;
            const bNumerator = choose([1, 2, 3]);
            const bDenominator = 4;
            const unionNumerator = aNumerator * bDenominator + bNumerator * aDenominator - aNumerator * bNumerator;
            const unionDenominator = aDenominator * bDenominator;
            const intersection = fraction(
              aNumerator * bNumerator,
              aDenominator * bDenominator
            );
            const answer = mode === 0 ? fraction(
              bNumerator,
              bDenominator
            ) : intersection;
            return makeShortAnswer({
              prompt: `\uC11C\uB85C \uB3C5\uB9BD\uC778 \uB450 \uC0AC\uAC74 $A,B$\uC5D0 \uB300\uD558\uC5EC $P(A)=${fraction(aNumerator, aDenominator)}$, $P(A\\cup B)=${fraction(unionNumerator, unionDenominator)}$\uC774\uB2E4. $${mode === 0 ? "P(B)" : "P(A\\cap B)"}$\uB97C \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: mode === 0 ? fraction(
                bNumerator,
                bDenominator
              ) : fraction(
                aNumerator * bNumerator,
                aDenominator * bDenominator
              ),
              solution: `$P(B)=p$\uB77C \uD558\uBA74 \uB3C5\uB9BD\uC131\uC5D0\uC11C $P(A\\cap B)=P(A)p$. \uD569\uC9D1\uD569 \uACF5\uC2DD\uC5D0 \uB300\uC785\uD574 $p=${fraction(bNumerator, bDenominator)}$\uB97C \uC5BB\uACE0, ${mode === 0 ? "" : `\uB2E4\uC2DC \uACF1\uD558\uBA74 $P(A\\cap B)=${intersection}$.`} \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uD569\uC9D1\uD569 \uACF5\uC2DD\uC758 \uAD50\uC9D1\uD569\uC744 P(A)P(B)\uB85C \uBC14\uAFB8\uC138\uC694."
            });
          }
        },
        {
          id: "bayes-three-sources",
          titles: [
            "\uC138 \uC0DD\uC0B0\uB77C\uC778\uC758 \uBD88\uB7C9\uD488 \uC6D0\uC778 \uC5ED\uCD94\uB860",
            "\uC11C\uB85C \uB2E4\uB978 \uC0AC\uC804\uD655\uB960\uC744 \uAC00\uC9C4 \uC138 \uC6D0\uC778\uC758 \uC0AC\uD6C4\uD655\uB960"
          ],
          sourcePattern: "\uC138 \uC6D0\uC778\uC758 \uC0AC\uC804\uD655\uB960\uACFC \uAC01 \uC870\uAC74\uBD80 \uBC1C\uC0DD\uD655\uB960\uC744 \uACF1\uD574 \uC804\uCCB4\uD655\uB960\uC744 \uB9CC\uB4E4\uACE0 \uD2B9\uC815 \uC6D0\uC778\uC758 \uC0AC\uD6C4\uD655\uB960 \uACC4\uC0B0",
          estimatedMinutes: [13, 14],
          reasoningSteps: [
            [
              "\uAC01 \uC0DD\uC0B0\uB77C\uC778\uC5D0\uC11C \uBD88\uB7C9\uC774 \uB098\uC62C \uACB0\uD569\uD655\uB960\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC138 \uACB0\uD569\uD655\uB960\uC744 \uB354\uD574 \uC804\uCCB4 \uBD88\uB7C9\uD655\uB960\uC744 \uAD6C\uD55C\uB2E4.",
              "\uBAA9\uD45C \uC0DD\uC0B0\uB77C\uC778\uC758 \uACB0\uD569\uD655\uB960\uC744 \uBD84\uC790\uB85C \uB454\uB2E4.",
              "\uBCA0\uC774\uC988 \uC815\uB9AC\uB85C \uC0AC\uD6C4\uD655\uB960\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uC6D0\uC778\uBCC4 \uC0AC\uC804\uD655\uB960\uACFC \uAD00\uCC30\uD655\uB960\uC744 \uACF1\uD55C\uB2E4.",
              "\uAD00\uCC30 \uC0AC\uAC74\uC758 \uC804\uCCB4\uD655\uB960\uB85C \uC815\uADDC\uD654\uD55C\uB2E4.",
              "\uB450 \uBAA9\uD45C \uC6D0\uC778\uC758 \uC0AC\uD6C4\uD655\uB960\uC744 \uAC01\uAC01 \uAD6C\uD55C\uB2E4.",
              "\uB450 \uC0AC\uD6C4\uD655\uB960\uC758 \uD569\uC744 \uAE30\uC57D\uBD84\uC218\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const production = [2, 3, 5];
            const defect = [
              randomInteger(1, 2),
              randomInteger(2, 3),
              randomInteger(3, 4)
            ];
            const weights = production.map(
              (share, index) => share * defect[index]
            );
            const total = weights.reduce(
              (sum, value) => sum + value,
              0
            );
            const numerator = mode === 0 ? weights[2] : weights[1] + weights[2];
            const answer = fraction(
              numerator,
              total
            );
            return makeShortAnswer({
              prompt: `\uACF5\uC7A5 A, B, C\uC758 \uC0DD\uC0B0\uBE44\uC728\uC774 \uAC01\uAC01 $2/10,3/10,5/10$\uC774\uACE0 \uBD88\uB7C9\uB960\uC774 \uAC01\uAC01 $${defect[0]}/100,${defect[1]}/100,${defect[2]}/100$\uC774\uB2E4. \uC784\uC758\uC758 \uC81C\uD488\uC774 \uBD88\uB7C9\uD488\uC77C \uB54C, ${mode === 0 ? "\uACF5\uC7A5 C\uC5D0\uC11C \uC0DD\uC0B0\uB418\uC5C8\uC744" : "\uACF5\uC7A5 B \uB610\uB294 C\uC5D0\uC11C \uC0DD\uC0B0\uB418\uC5C8\uC744"} \uD655\uB960\uC744 \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: fraction(
                numerator,
                total
              ),
              solution: `\uBD88\uB7C9\uD488\uC774\uBA74\uC11C \uAC01 \uACF5\uC7A5 \uC81C\uD488\uC77C \uC0C1\uB300 \uAC00\uC911\uCE58\uB294 $${weights[0]}:${weights[1]}:${weights[2]}$\uC774\uACE0 \uD569\uC740 ${total}\uC774\uB2E4. \uBAA9\uD45C \uAC00\uC911\uCE58\uB97C \uD569\uC73C\uB85C \uB098\uB204\uBA74 ${answer}\uC774\uB2E4.`,
              hintText: "\uAC01 \uACF5\uC7A5\uC758 \uC0DD\uC0B0\uBE44\uC728\uACFC \uADF8 \uACF5\uC7A5\uC758 \uBD88\uB7C9\uB960\uC744 \uBA3C\uC800 \uACF1\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "conditional-card-composition",
          titles: [
            "\uC801\uC5B4\uB3C4 \uD55C \uC7A5\uC774 \uBE68\uAC04\uC0C9\uC77C \uB54C \uB450 \uC7A5 \uBAA8\uB450 \uBE68\uAC04\uC0C9",
            "\uC801\uC5B4\uB3C4 \uD55C \uC7A5\uC774 \uBE68\uAC04\uC0C9\uC77C \uB54C \uC815\uD655\uD788 \uD55C \uC7A5\uB9CC \uBE68\uAC04\uC0C9"
          ],
          sourcePattern: "\uBE44\uBCF5\uC6D0 \uCD94\uCD9C\uC758 \uC870\uD569 \uD45C\uBCF8\uACF5\uAC04\uC5D0\uC11C \uAD00\uCC30 \uC870\uAC74\uC5D0 \uB9DE\uC9C0 \uC54A\uB294 \uACBD\uC6B0\uB97C \uC81C\uC678\uD558\uACE0 \uC870\uAC74\uBD80\uD655\uB960 \uACC4\uC0B0",
          estimatedMinutes: [12, 12],
          reasoningSteps: [
            [
              "\uB450 \uC7A5\uC744 \uACE0\uB974\uB294 \uC804\uCCB4 \uC870\uD569 \uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uBE68\uAC04\uC0C9\uC774 \uD55C \uC7A5\uB3C4 \uC5C6\uB294 \uACBD\uC6B0\uB97C \uC13C\uB2E4.",
              "\uC870\uAC74 \uC0AC\uAC74\uC758 \uD06C\uAE30\uB97C \uC5EC\uC0AC\uAC74\uC73C\uB85C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uC7A5 \uBAA8\uB450 \uBE68\uAC04 \uACBD\uC6B0\uB97C \uC870\uAC74 \uC0AC\uAC74 \uD06C\uAE30\uB85C \uB098\uB208\uB2E4."
            ],
            [
              "\uC801\uC5B4\uB3C4 \uD55C \uC7A5 \uBE68\uAC04 \uC870\uAC74\uC758 \uACBD\uC6B0\uC758 \uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uBE68\uAC04 \uD55C \uC7A5\uACFC \uD30C\uB780 \uD55C \uC7A5\uC744 \uACE0\uB974\uB294 \uACBD\uC6B0\uB97C \uC13C\uB2E4.",
              "\uC870\uAC74\uBD80 \uD45C\uBCF8\uACF5\uAC04 \uC548\uC5D0\uC11C \uBE44\uC728\uC744 \uB9CC\uB4E0\uB2E4.",
              "\uAE30\uC57D\uBD84\uC218\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const red = randomInteger(3, 6);
            const blue = randomInteger(3, 6);
            const condition = nCr(red + blue, 2) - nCr(blue, 2);
            const favorable = mode === 0 ? nCr(red, 2) : red * blue;
            const answer = fraction(
              favorable,
              condition
            );
            return makeShortAnswer({
              prompt: `\uBE68\uAC04 \uCE74\uB4DC ${red}\uC7A5\uACFC \uD30C\uB780 \uCE74\uB4DC ${blue}\uC7A5 \uC911 \uB3D9\uC2DC\uC5D0 2\uC7A5\uC744 \uC784\uC758\uB85C \uBF51\uC558\uB2E4. \uC801\uC5B4\uB3C4 \uD55C \uC7A5\uC774 \uBE68\uAC04 \uCE74\uB4DC\uC600\uC744 \uB54C, ${mode === 0 ? "\uB450 \uC7A5 \uBAA8\uB450 \uBE68\uAC04 \uCE74\uB4DC\uC77C" : "\uC815\uD655\uD788 \uD55C \uC7A5\uB9CC \uBE68\uAC04 \uCE74\uB4DC\uC77C"} \uD655\uB960\uC744 \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: fraction(
                favorable,
                condition
              ),
              solution: `\uC870\uAC74 \uC0AC\uAC74\uC758 \uACBD\uC6B0\uC758 \uC218\uB294 $\\binom{${red + blue}}2-\\binom{${blue}}2=${condition}$. \uBAA9\uD45C \uC0AC\uAC74\uC740 ${mode === 0 ? `$\\binom{${red}}2$` : `${red}\\cdot${blue}`}\uAC00\uC9C0\uC774\uBBC0\uB85C \uD655\uB960\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uC870\uAC74\uBD80 \uD45C\uBCF8\uACF5\uAC04\uC740 \uC804\uCCB4 \uB450 \uC7A5 \uC870\uD569\uC5D0\uC11C \uD30C\uB780 \uCE74\uB4DC\uB9CC \uBF51\uC740 \uACBD\uC6B0\uB97C \uBE80 \uAC83\uC785\uB2C8\uB2E4."
            });
          }
        }
      ];
      module.exports = {
        courseId,
        unitId,
        requiredConceptIds,
        minimumAppliedPoolSize: 16,
        appliedPolicy: {
          includeBankTypes: true,
          minimumLocalDifficulty: 3
        },
        advancedTemplates: defineAdvancedTemplates({
          courseId,
          unitId,
          requiredConceptIds,
          families
        })
      };
    }
  });

  // services/assessmentTemplates/probabilityStatistics/statistics.js
  var require_statistics = __commonJS({
    "services/assessmentTemplates/probabilityStatistics/statistics.js"(exports, module) {
      var {
        randomInteger,
        choose,
        fraction,
        power,
        linearFactor,
        makeShortAnswer,
        defineAdvancedTemplates
      } = require_shared();
      var courseId = "probability-statistics";
      var unitId = "statistics";
      var requiredConceptIds = [
        "probability-statistics-03-01",
        "probability-statistics-03-02",
        "probability-statistics-03-03",
        "probability-statistics-03-04",
        "probability-statistics-03-05",
        "probability-statistics-03-06",
        "probability-statistics-03-07"
      ];
      var families = [
        {
          id: "distribution-table-recovery",
          titles: [
            "\uD655\uB960\uD569\xB7\uAE30\uB313\uAC12\uC5D0\uC11C \uBD84\uD3EC\uD45C\uC758 \uBBF8\uC9C0\uD655\uB960 \uBCF5\uC6D0",
            "\uBD84\uD3EC\uD45C \uBCF5\uC6D0 \uD6C4 \uBD84\uC0B0\uAE4C\uC9C0 \uACC4\uC0B0"
          ],
          sourcePattern: "\uD655\uB960\uC758 \uCD1D\uD569\uACFC \uAE30\uB313\uAC12 \uC870\uAC74\uC744 \uC5F0\uB9BD\uD574 \uBD84\uD3EC\uD45C\uB97C \uC644\uC131\uD55C \uB4A4 \uBD84\uC0B0 \uACC4\uC0B0",
          estimatedMinutes: [11, 13],
          reasoningSteps: [
            [
              "\uD655\uB960\uC758 \uD569\uC774 1\uC778 \uC2DD\uC744 \uC138\uC6B4\uB2E4.",
              "\uAE30\uB313\uAC12 \uC2DD\uC744 \uC138\uC6B4\uB2E4.",
              "\uB450 \uBBF8\uC9C0\uD655\uB960\uC744 \uC5F0\uB9BD\uD574 \uAD6C\uD55C\uB2E4.",
              "\uBAA9\uD45C \uD655\uB960\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uBD84\uD3EC\uD45C\uC758 \uBBF8\uC9C0\uD655\uB960\uC744 \uC5F0\uB9BD\uBC29\uC815\uC2DD\uC73C\uB85C \uBCF5\uC6D0\uD55C\uB2E4.",
              "E(X\xB2)\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "V(X)=E(X\xB2)-E(X)\xB2\uB97C \uC801\uC6A9\uD55C\uB2E4.",
              "\uAE30\uC57D\uBD84\uC218\uB85C \uC815\uB9AC\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const p = choose([
              [2, 10],
              [3, 10]
            ]);
            const q = choose([
              [3, 10],
              [4, 10]
            ]);
            const rNumerator = 10 - p[0] - q[0];
            const expectationNumerator = q[0] + 2 * rNumerator;
            const secondNumerator = q[0] + 4 * rNumerator;
            const varianceNumerator = secondNumerator * 10 - expectationNumerator ** 2;
            const answer = mode === 0 ? fraction(
              rNumerator,
              10
            ) : fraction(
              varianceNumerator,
              100
            );
            return makeShortAnswer({
              prompt: `\uD655\uB960\uBCC0\uC218 $X$\uAC00 0,1,2\uC758 \uAC12\uC744 \uAC00\uC9C0\uBA70 $P(X=0)=\\frac{${p[0]}}{10}$, $P(X=1)=\\frac{${q[0]}}{10}$\uC774\uB2E4. ${mode === 0 ? "P(X=2)" : "V(X)"}\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624. (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)`,
              answer,
              independentAnswer: mode === 0 ? fraction(
                rNumerator,
                10
              ) : fraction(
                varianceNumerator,
                100
              ),
              solution: `\uD655\uB960\uC758 \uD569\uC5D0\uC11C $P(X=2)=${rNumerator}/10$. $E(X)=${expectationNumerator}/10$, $E(X^2)=${secondNumerator}/10$. ${mode === 0 ? `\uB530\uB77C\uC11C \uB2F5\uC740 ${answer}.` : `V(X)=E(X^2)-\\{E(X)\\}^2=${answer}.`}`,
              hintText: "\uBA3C\uC800 \uD655\uB960\uC758 \uD569 1\uB85C \uBD84\uD3EC\uD45C\uB97C \uC644\uC131\uD55C \uB4A4 E(X\xB2)\uB97C \uAD6C\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "linear-transform-mean-variance",
          titles: [
            "\uC120\uD615\uBCC0\uD658\uB41C \uD655\uB960\uBCC0\uC218\uC758 \uD3C9\uADE0\xB7\uBD84\uC0B0 \uC5ED\uCD94\uB860",
            "\uB450 \uC120\uD615\uBCC0\uD658 \uC870\uAC74\uC5D0\uC11C \uC6D0\uB798 \uD3C9\uADE0\uACFC \uBD84\uC0B0 \uBCF5\uC6D0"
          ],
          sourcePattern: "E(aX+b)=aE(X)+b\uC640 V(aX+b)=a\xB2V(X)\uB97C \uAD6C\uBD84\uD574 \uC5F0\uC1C4 \uC801\uC6A9",
          estimatedMinutes: [10, 11],
          reasoningSteps: [
            [
              "\uD3C9\uADE0\uC758 \uC120\uD615\uC131\uC744 \uC801\uC6A9\uD55C\uB2E4.",
              "\uC0C1\uC218 \uC774\uB3D9\uC740 \uBD84\uC0B0\uC5D0 \uC601\uD5A5\uC774 \uC5C6\uC74C\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uC0C1\uC218\uBC30\uB294 \uBD84\uC0B0\uC5D0 \uC81C\uACF1\uC73C\uB85C \uC791\uC6A9\uD568\uC744 \uC801\uC6A9\uD55C\uB2E4.",
              "\uD3C9\uADE0\uACFC \uBD84\uC0B0\uC758 \uBAA9\uD45C \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uBCC0\uD658\uB41C \uD3C9\uADE0 \uC2DD\uC5D0\uC11C E(X)\uB97C \uAD6C\uD55C\uB2E4.",
              "\uBCC0\uD658\uB41C \uBD84\uC0B0 \uC2DD\uC5D0\uC11C V(X)\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB2E4\uB978 \uC120\uD615\uBCC0\uD658\uC758 \uD3C9\uADE0\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uB450 \uACB0\uACFC\uB97C \uACB0\uD569\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const mean = randomInteger(-3, 6);
            const variance = randomInteger(1, 5);
            const a = choose([2, 3, -2]);
            const b = randomInteger(-4, 4);
            const transformedMean = a * mean + b;
            const transformedVariance = a ** 2 * variance;
            const answer = mode === 0 ? transformedMean + transformedVariance : mean + variance;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uD655\uB960\uBCC0\uC218 $X$\uC758 \uD3C9\uADE0\uC774 ${mean}, \uBD84\uC0B0\uC774 ${variance}\uC77C \uB54C, $E(${a}X${b >= 0 ? "+" : ""}${b})+V(${a}X${b >= 0 ? "+" : ""}${b})$\uB97C \uAD6C\uD558\uC2DC\uC624.` : `\uD655\uB960\uBCC0\uC218 $X$\uC5D0 \uB300\uD558\uC5EC $E(${a}X${b >= 0 ? "+" : ""}${b})=${transformedMean}$, $V(${a}X${b >= 0 ? "+" : ""}${b})=${transformedVariance}$\uC77C \uB54C, $E(X)+V(X)$\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? a * mean + b + a ** 2 * variance : mean + variance,
              solution: `$E(aX+b)=aE(X)+b$, $V(aX+b)=a^2V(X)$\uB97C \uAC01\uAC01 \uC801\uC6A9\uD55C\uB2E4. ${mode === 0 ? `\uB450 \uAC12\uC740 ${transformedMean}, ${transformedVariance}\uC774\uBBC0\uB85C \uB2F5\uC740 ${answer}.` : `\uC5ED\uC73C\uB85C $E(X)=${mean},V(X)=${variance}$\uB97C \uC5BB\uC5B4 \uB2F5\uC740 ${answer}.`}`,
              hintText: "\uD3C9\uADE0\uC5D0\uB294 a\uAC00, \uBD84\uC0B0\uC5D0\uB294 a\xB2\uC774 \uACF1\uD574\uC9C4\uB2E4\uB294 \uCC28\uC774\uB97C \uAD6C\uBD84\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "binomial-mean-variance-inverse",
          titles: [
            "\uC774\uD56D\uBD84\uD3EC \uD3C9\uADE0\xB7\uBD84\uC0B0\uC5D0\uC11C n\uACFC p \uBCF5\uC6D0",
            "\uBCF5\uC6D0\uD55C \uC774\uD56D\uBD84\uD3EC\uC758 \uD2B9\uC815 \uD655\uB960 \uACC4\uC0B0"
          ],
          sourcePattern: "E=np, V=np(1-p)\uC5D0\uC11C \uBE44\uB97C \uCDE8\uD574 p\uB97C \uBA3C\uC800 \uAD6C\uD558\uACE0 n\uC744 \uBCF5\uC6D0",
          estimatedMinutes: [11, 13],
          reasoningSteps: [
            [
              "\uD3C9\uADE0\uACFC \uBD84\uC0B0 \uACF5\uC2DD\uC744 \uC4F4\uB2E4.",
              "V/E=1-p\uB85C \uC131\uACF5\uD655\uB960\uC744 \uAD6C\uD55C\uB2E4.",
              "E=np\uC5D0 \uB300\uC785\uD574 \uC2DC\uD589\uD69F\uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uBAA9\uD45C \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uD3C9\uADE0\xB7\uBD84\uC0B0\uC758 \uBE44\uB85C p\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC2DC\uD589\uD69F\uC218 n\uC744 \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uC774\uD56D\uD655\uB960 \uACF5\uC2DD\uC744 \uC138\uC6B4\uB2E4.",
              "\uC870\uD569\uACFC \uAC70\uB4ED\uC81C\uACF1\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const denominator = choose([2, 3, 4]);
            const pNumerator = 1;
            const multiplier = randomInteger(2, 4);
            const n = denominator ** 2 * multiplier;
            const mean = denominator * multiplier;
            const variance = (denominator - 1) * multiplier;
            const zeroProbability = fraction(
              power(
                denominator - 1,
                n
              ),
              power(denominator, n)
            );
            const answer = mode === 0 ? n : zeroProbability;
            return makeShortAnswer({
              prompt: `\uD655\uB960\uBCC0\uC218 $X$\uAC00 \uC774\uD56D\uBD84\uD3EC $B(n,p)$\uB97C \uB530\uB974\uACE0 $E(X)=${mean}$, $V(X)=${variance}$\uC774\uB2E4. $${mode === 0 ? "n" : "P(X=0)"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.${mode === 1 ? " (\uAE30\uC57D\uBD84\uC218\uB85C \uC785\uB825)" : ""}`,
              answer,
              independentAnswer: mode === 0 ? n : fraction(
                power(
                  denominator - 1,
                  n
                ),
                power(
                  denominator,
                  n
                )
              ),
              solution: `$V/E=1-p=${variance}/${mean}$\uC774\uBBC0\uB85C $p=${pNumerator}/${denominator}$. $np=${mean}$\uC5D0\uC11C $n=${n}$. ${mode === 0 ? "" : `$P(X=0)=(1-p)^n=${zeroProbability}$.`}`,
              hintText: "\uBD84\uC0B0\uC744 \uD3C9\uADE0\uC73C\uB85C \uB098\uB204\uBA74 1-p\uAC00 \uBC14\uB85C \uB0A8\uC2B5\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "normal-standardization-chain",
          titles: [
            "\uC815\uADDC\uBD84\uD3EC\uC758 \uB450 \uACBD\uACC4 \uD45C\uC900\uD654\uC640 \uB300\uCE6D\uC131",
            "\uD655\uB960 \uC870\uAC74\uC5D0\uC11C \uC6D0\uB798 \uBD84\uD3EC\uC758 \uACBD\uACC4\uAC12 \uC5ED\uC0B0"
          ],
          sourcePattern: "\uD3C9\uADE0\uACFC \uD45C\uC900\uD3B8\uCC28\uB85C \uD45C\uC900\uD654\uD55C \uB4A4 \uD45C\uC900\uC815\uADDC\uBD84\uD3EC\uC758 \uB300\uCE6D \uAD6C\uAC04 \uB610\uB294 \uC5ED\uBCC0\uD658 \uC0AC\uC6A9",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uBD84\uC0B0\uC5D0\uC11C \uD45C\uC900\uD3B8\uCC28\uB97C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uACBD\uACC4\uAC12\uC744 z\uAC12\uC73C\uB85C \uD45C\uC900\uD654\uD55C\uB2E4.",
              "\uD45C\uC900\uC815\uADDC\uBD84\uD3EC\uC758 \uB300\uCE6D\uC131\uC744 \uC801\uC6A9\uD55C\uB2E4.",
              "\uC8FC\uC5B4\uC9C4 \uD45C\uC758 \uB113\uC774\uB97C \uC870\uD569\uD55C\uB2E4."
            ],
            [
              "\uC8FC\uC5B4\uC9C4 \uD655\uB960\uC744 \uD45C\uC900\uC815\uADDC\uBD84\uD3EC\uC758 z\uACBD\uACC4\uC640 \uB300\uC751\uC2DC\uD0A8\uB2E4.",
              "z=(x-\u03BC)/\u03C3 \uC2DD\uC744 \uC138\uC6B4\uB2E4.",
              "\uC6D0\uB798 \uACBD\uACC4\uAC12 x\uB97C \uBCF5\uC6D0\uD55C\uB2E4.",
              "\uB2E4\uB978 \uB300\uCE6D \uACBD\uACC4\uC640 \uACB0\uD569\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const mean = randomInteger(40, 70);
            const sd = choose([5, 10]);
            const lower = mean - sd;
            const upper = mean + sd;
            const intervalProbability = 0.6826;
            const boundary = mean + 2 * sd;
            const answer = mode === 0 ? String(
              intervalProbability
            ) : boundary;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uD655\uB960\uBCC0\uC218 $X$\uAC00 \uC815\uADDC\uBD84\uD3EC $N(${mean},${sd ** 2})$\uB97C \uB530\uB978\uB2E4. $P(0\\le Z\\le1)=0.3413$\uC77C \uB54C $P(${lower}\\le X\\le${upper})$\uB97C \uAD6C\uD558\uC2DC\uC624.` : `\uD655\uB960\uBCC0\uC218 $X$\uAC00 \uC815\uADDC\uBD84\uD3EC $N(${mean},${sd ** 2})$\uB97C \uB530\uB978\uB2E4. $P(X\\le k)=0.9772$, $P(0\\le Z\\le2)=0.4772$\uC77C \uB54C $k$\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? "0.6826" : mean + 2 * sd,
              solution: mode === 0 ? `\uD45C\uC900\uD654\uD558\uBA74 $-1\\le Z\\le1$\uC774\uACE0 \uB300\uCE6D\uC131\uC73C\uB85C $2\\times0.3413=0.6826$.` : `$0.9772=0.5+0.4772$\uC774\uBBC0\uB85C \uACBD\uACC4\uB294 $z=2$. \uB530\uB77C\uC11C $k=${mean}+2\\cdot${sd}=${boundary}$.`,
              hintText: "\uBA3C\uC800 X\uC758 \uACBD\uACC4\uB97C z=(X-\u03BC)/\u03C3\uB85C \uBC14\uAFB8\uC138\uC694."
            });
          }
        },
        {
          id: "sampling-confidence-size",
          titles: [
            "\uD45C\uBCF8\uD3C9\uADE0 \uBD84\uD3EC\uC5D0\uC11C \uD45C\uBCF8\uD06C\uAE30 \uC5ED\uC0B0",
            "\uC2E0\uB8B0\uAD6C\uAC04 \uAE38\uC774 \uC870\uAC74\uC73C\uB85C \uD544\uC694\uD55C \uD45C\uBCF8\uD06C\uAE30 \uACB0\uC815"
          ],
          sourcePattern: "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uD45C\uC900\uD3B8\uCC28 \u03C3/\u221An \uB610\uB294 \uC2E0\uB8B0\uAD6C\uAC04 \uAE38\uC774 \uACF5\uC2DD\uC744 \uC5ED\uC73C\uB85C \uD480\uC5B4 n \uACB0\uC815",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uD45C\uC900\uD3B8\uCC28 \uACF5\uC2DD\uC744 \uC4F4\uB2E4.",
              "\uC8FC\uC5B4\uC9C4 \uD45C\uC900\uD3B8\uCC28\uC640 \uBAA8\uD45C\uC900\uD3B8\uCC28\uB97C \uB300\uC785\uD55C\uB2E4.",
              "\u221An\uC5D0 \uB300\uD55C \uC2DD\uC744 \uD47C\uB2E4.",
              "\uC81C\uACF1\uD574 \uD45C\uBCF8\uD06C\uAE30\uB97C \uAD6C\uD55C\uB2E4."
            ],
            [
              "\uC2E0\uB8B0\uAD6C\uAC04\uC758 \uBC18\uAE38\uC774\uB97C \uC2DD\uC73C\uB85C \uB098\uD0C0\uB0B8\uB2E4.",
              "\uC804\uCCB4 \uAE38\uC774\uB294 \uBC18\uAE38\uC774\uC758 \uB450 \uBC30\uC784\uC744 \uBC18\uC601\uD55C\uB2E4.",
              "\u221An\uC744 \uACE0\uB9BD\uC2DC\uD0A8\uB2E4.",
              "\uC790\uC5F0\uC218 \uD45C\uBCF8\uD06C\uAE30\uB85C \uC81C\uACF1\uD574 \uAC80\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const populationSd = choose([10, 15, 20]);
            const rootN = choose([5, 10]);
            const n = rootN ** 2;
            const sampleSd = populationSd / rootN;
            const confidenceLength = 2 * 1.96 * populationSd / rootN;
            const answer = n;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uBAA8\uD45C\uC900\uD3B8\uCC28\uAC00 ${populationSd}\uC778 \uBAA8\uC9D1\uB2E8\uC5D0\uC11C \uD06C\uAE30 $n$\uC778 \uD45C\uBCF8\uC744 \uC784\uC758\uCD94\uCD9C\uD560 \uB54C \uD45C\uBCF8\uD3C9\uADE0\uC758 \uD45C\uC900\uD3B8\uCC28\uAC00 ${sampleSd}\uC774\uB2E4. $n$\uC744 \uAD6C\uD558\uC2DC\uC624.` : `\uBAA8\uD45C\uC900\uD3B8\uCC28\uAC00 ${populationSd}\uC778 \uBAA8\uC9D1\uB2E8\uC758 \uBAA8\uD3C9\uADE0\uC744 \uC2E0\uB8B0\uB3C4 95%\uB85C \uCD94\uC815\uD55C\uB2E4. \uC2E0\uB8B0\uAD6C\uAC04\uC758 \uAE38\uC774\uAC00 ${confidenceLength.toFixed(
                3
              )}\uC77C \uB54C \uD45C\uBCF8\uD06C\uAE30 $n$\uC744 \uAD6C\uD558\uC2DC\uC624. (\uB2E8, $P(|Z|\\le1.96)=0.95$)`,
              answer,
              independentAnswer: rootN ** 2,
              solution: mode === 0 ? `$${populationSd}/\\sqrt n=${sampleSd}$\uC5D0\uC11C $\\sqrt n=${rootN}$, \uB530\uB77C\uC11C $n=${n}$.` : `\uC2E0\uB8B0\uAD6C\uAC04 \uAE38\uC774\uB294 $2\\times1.96\\times${populationSd}/\\sqrt n$. \uC8FC\uC5B4\uC9C4 \uAE38\uC774\uC640 \uAC19\uAC8C \uB450\uBA74 $\\sqrt n=${rootN}$, $n=${n}$.`,
              hintText: "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uD45C\uC900\uD3B8\uCC28\uC5D0\uB294 n\uC774 \uC544\uB2C8\uB77C \u221An\uC774 \uBD84\uBAA8\uC5D0 \uC635\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "second-moment-recovery",
          titles: [
            "\uD3C9\uADE0\xB7\uBD84\uC0B0\uC5D0\uC11C \uC774\uCC28\uC2DD\uC758 \uAE30\uB313\uAC12 \uBCF5\uC6D0",
            "\uC911\uC2EC \uC774\uB3D9\uD55C \uC81C\uACF1\uC758 \uAE30\uB313\uAC12 \uACC4\uC0B0"
          ],
          sourcePattern: "V(X)=E(X\xB2)-E(X)\xB2\uB85C \uC774\uCC28\uBAA8\uBA58\uD2B8\uB97C \uBCF5\uC6D0\uD558\uACE0 \uBAA9\uD45C \uC774\uCC28\uC2DD\uC744 \uC120\uD615\uC131\uC73C\uB85C \uACC4\uC0B0",
          estimatedMinutes: [11, 12],
          reasoningSteps: [
            [
              "\uBD84\uC0B0 \uACF5\uC2DD\uC5D0\uC11C E(X\xB2)\uB97C \uACE0\uB9BD\uC2DC\uD0A8\uB2E4.",
              "\uC8FC\uC5B4\uC9C4 \uD3C9\uADE0\uACFC \uBD84\uC0B0\uC744 \uB300\uC785\uD55C\uB2E4.",
              "\uBAA9\uD45C \uC774\uCC28\uC2DD\uC744 \uC804\uAC1C\uD55C\uB2E4.",
              "\uAE30\uB313\uAC12\uC758 \uC120\uD615\uC131\uC744 \uC801\uC6A9\uD574 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "E((X-c)\xB2)\uB97C \uBD84\uC0B0\uACFC \uD3C9\uADE0\uC758 \uCC28\uB85C \uB098\uD0C0\uB0B8\uB2E4.",
              "\uC911\uC2EC \uC774\uB3D9\uB7C9 \u03BC-c\uB97C \uAD6C\uD55C\uB2E4.",
              "V(X)+(\u03BC-c)\xB2 \uACF5\uC2DD\uC744 \uC801\uC6A9\uD55C\uB2E4.",
              "\uC9C1\uC811 \uC804\uAC1C\uD55C \uAC12\uACFC \uBE44\uAD50\uD574 \uAC80\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const mean = randomInteger(-3, 6);
            const variance = randomInteger(2, 8);
            const shift = mean + randomInteger(1, 4);
            const secondMoment = variance + mean ** 2;
            const answer = mode === 0 ? secondMoment + 2 * mean + 1 : variance + (mean - shift) ** 2;
            return makeShortAnswer({
              prompt: `\uD655\uB960\uBCC0\uC218 $X$\uC5D0 \uB300\uD558\uC5EC $E(X)=${mean}$, $V(X)=${variance}$\uC774\uB2E4. $${mode === 0 ? "E(X^2+2X+1)" : `E\\{(${linearFactor(shift, "X")})^2\\}`}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? variance + mean ** 2 + 2 * mean + 1 : variance + (mean - shift) ** 2,
              solution: `$E(X^2)=V(X)+\\{E(X)\\}^2=${secondMoment}$. ${mode === 0 ? "\uAE30\uB313\uAC12\uC758 \uC120\uD615\uC131\uC744 \uC801\uC6A9\uD558\uBA74" : "\uB610\uB294 V(X)+(E(X)-c)^2\uB97C \uC801\uC6A9\uD558\uBA74"} \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uBD84\uC0B0 \uACF5\uC2DD\uC5D0\uC11C E(X\xB2)\uB97C \uBA3C\uC800 \uAD6C\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "independent-random-variable-sum",
          titles: [
            "\uB3C5\uB9BD\uD655\uB960\uBCC0\uC218\uC758 \uD569\uC758 \uD3C9\uADE0\xB7\uBD84\uC0B0",
            "\uB3C5\uB9BD\uD655\uB960\uBCC0\uC218\uC758 \uC120\uD615\uACB0\uD569 \uD45C\uC900\uD3B8\uCC28"
          ],
          sourcePattern: "\uB3C5\uB9BD\uC778 \uD655\uB960\uBCC0\uC218\uC758 \uD569\uC5D0\uC11C\uB294 \uD3C9\uADE0\uC740 \uC120\uD615 \uACB0\uD569\uB418\uACE0 \uBD84\uC0B0\uC740 \uACC4\uC218\uC758 \uC81C\uACF1\uC744 \uACF1\uD574 \uB354\uD574\uC9D0\uC744 \uC801\uC6A9",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uB450 \uD655\uB960\uBCC0\uC218 \uD3C9\uADE0\uC758 \uC120\uD615\uACB0\uD569\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uB3C5\uB9BD\uC131\uC73C\uB85C \uACF5\uBD84\uC0B0\uD56D\uC774 0\uC784\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uBD84\uC0B0\uC744 \uACC4\uC218 \uC81C\uACF1\uACFC \uD568\uAED8 \uB354\uD55C\uB2E4.",
              "\uD3C9\uADE0\uACFC \uBD84\uC0B0\uC758 \uBAA9\uD45C \uACB0\uD569\uAC12\uC744 \uAD6C\uD55C\uB2E4."
            ],
            [
              "\uC120\uD615\uACB0\uD569\uC758 \uAC01 \uACC4\uC218\uB97C \uD655\uC778\uD55C\uB2E4.",
              "\uAC01 \uBD84\uC0B0\uC5D0 \uACC4\uC218\uC758 \uC81C\uACF1\uC744 \uACF1\uD55C\uB2E4.",
              "\uB3C5\uB9BD\uC131\uC744 \uC774\uC6A9\uD574 \uBD84\uC0B0\uC744 \uD569\uD55C\uB2E4.",
              "\uC591\uC758 \uC81C\uACF1\uADFC\uC73C\uB85C \uD45C\uC900\uD3B8\uCC28\uB97C \uAD6C\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const meanX = randomInteger(1, 5);
            const meanY = randomInteger(1, 5);
            const sdX = choose([1, 2, 3]);
            const sdY = choose([1, 2, 3]);
            const coefficient = 2;
            const sumMean = coefficient * meanX + meanY;
            const sumVariance = coefficient ** 2 * sdX ** 2 + sdY ** 2;
            const answer = mode === 0 ? sumMean + sumVariance : sumVariance;
            return makeShortAnswer({
              prompt: `\uC11C\uB85C \uB3C5\uB9BD\uC778 \uD655\uB960\uBCC0\uC218 $X,Y$\uAC00 $E(X)=${meanX}$, $E(Y)=${meanY}$, $V(X)=${sdX ** 2}$, $V(Y)=${sdY ** 2}$\uB97C \uB9CC\uC871\uD55C\uB2E4. $Z=2X+Y$\uC77C \uB54C, $${mode === 0 ? "E(Z)+V(Z)" : "V(Z)"}$\uC758 \uAC12\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? 2 * meanX + meanY + 4 * sdX ** 2 + sdY ** 2 : 4 * sdX ** 2 + sdY ** 2,
              solution: `$E(Z)=2E(X)+E(Y)=${sumMean}$\uC774\uACE0 \uB3C5\uB9BD\uC774\uBBC0\uB85C $V(Z)=4V(X)+V(Y)=${sumVariance}$. \uB530\uB77C\uC11C \uB2F5\uC740 ${answer}\uC774\uB2E4.`,
              hintText: "\uBD84\uC0B0\uC5D0\uC11C\uB294 \uC120\uD615\uACB0\uD569\uC758 \uACC4\uC218\uB97C \uC81C\uACF1\uD574\uC57C \uD569\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "pooled-data-statistics",
          titles: [
            "\uB450 \uC9D1\uB2E8\uC744 \uD569\uCE5C \uC790\uB8CC\uC758 \uD3C9\uADE0",
            "\uB450 \uC9D1\uB2E8\uC758 \uD3C9\uADE0\xB7\uBD84\uC0B0\uC5D0\uC11C \uD569\uCE5C \uBD84\uC0B0 \uBCF5\uC6D0"
          ],
          sourcePattern: "\uC9D1\uB2E8\uBCC4 \uC778\uC6D0\uC218\uB85C \uAC00\uC911\uD55C \uD569\uACFC \uC81C\uACF1\uD569\uC744 \uBCF5\uC6D0\uD574 \uC804\uCCB4 \uD3C9\uADE0\xB7\uBD84\uC0B0 \uACC4\uC0B0",
          estimatedMinutes: [12, 14],
          reasoningSteps: [
            [
              "\uAC01 \uC9D1\uB2E8\uC758 \uCD1D\uD569\uC744 \uC778\uC6D0\uC218\uC640 \uD3C9\uADE0\uC758 \uACF1\uC73C\uB85C \uAD6C\uD55C\uB2E4.",
              "\uB450 \uCD1D\uD569\uACFC \uC778\uC6D0\uC218\uB97C \uD569\uD55C\uB2E4.",
              "\uC804\uCCB4 \uD3C9\uADE0\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uAC00\uC911\uD3C9\uADE0 \uBC94\uC704 \uC548\uC5D0 \uC788\uB294\uC9C0 \uAC80\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uAC01 \uC9D1\uB2E8\uC5D0\uC11C E(X\xB2)=\uBD84\uC0B0+\uD3C9\uADE0\xB2\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC778\uC6D0\uC218\uB85C \uAC00\uC911\uD55C \uC804\uCCB4 \uC81C\uACF1\uD3C9\uADE0\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC804\uCCB4 \uD3C9\uADE0\uC758 \uC81C\uACF1\uC744 \uBE80\uB2E4.",
              "\uC804\uCCB4 \uBD84\uC0B0\uC744 \uC815\uB9AC\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const countA = choose([10, 20]);
            const countB = countA;
            const meanA = randomInteger(4, 8);
            const meanB = meanA + randomInteger(2, 6);
            const varianceA = choose([1, 4, 9]);
            const varianceB = choose([1, 4, 9]);
            const mean = (meanA + meanB) / 2;
            const secondMoment = (varianceA + meanA ** 2 + varianceB + meanB ** 2) / 2;
            const variance = secondMoment - mean ** 2;
            const answer = mode === 0 ? mean : String(variance);
            return makeShortAnswer({
              prompt: `A\uC9D1\uB2E8 ${countA}\uBA85\uC758 \uD3C9\uADE0\uC740 ${meanA}, \uBD84\uC0B0\uC740 ${varianceA}\uC774\uACE0 B\uC9D1\uB2E8 ${countB}\uBA85\uC758 \uD3C9\uADE0\uC740 ${meanB}, \uBD84\uC0B0\uC740 ${varianceB}\uC774\uB2E4. \uB450 \uC9D1\uB2E8\uC744 \uD569\uCE5C \uC790\uB8CC\uC758 ${mode === 0 ? "\uD3C9\uADE0" : "\uBD84\uC0B0"}\uC744 \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? (countA * meanA + countB * meanB) / (countA + countB) : String(
                (countA * (varianceA + meanA ** 2) + countB * (varianceB + meanB ** 2)) / (countA + countB) - mean ** 2
              ),
              solution: mode === 0 ? `\uC804\uCCB4 \uD3C9\uADE0\uC740 \uAC00\uC911\uD3C9\uADE0 $(${countA}\\cdot${meanA}+${countB}\\cdot${meanB})/${countA + countB}=${mean}$\uC774\uB2E4.` : `\uAC01 \uC9D1\uB2E8\uC758 \uC81C\uACF1\uD3C9\uADE0\uC740 \uBD84\uC0B0+\uD3C9\uADE0\xB2\uC774\uB2E4. \uC774\uB97C \uC778\uC6D0\uC218\uB85C \uAC00\uC911\uD574 \uD569\uCE5C \uC81C\uACF1\uD3C9\uADE0\uC744 \uAD6C\uD55C \uB4A4 \uC804\uCCB4 \uD3C9\uADE0\xB2\uC744 \uBE7C\uBA74 ${variance}\uC774\uB2E4.`,
              hintText: mode === 0 ? "\uAC01 \uC9D1\uB2E8\uC758 \uCD1D\uD569\uC744 \uBA3C\uC800 \uBCF5\uC6D0\uD558\uC138\uC694." : "\uBD84\uC0B0\uC744 \uBC14\uB85C \uD3C9\uADE0\uB0B4\uC9C0 \uB9D0\uACE0 \uAC01 \uC9D1\uB2E8\uC758 \uC81C\uACF1\uD3C9\uADE0\uC744 \uBCF5\uC6D0\uD558\uC138\uC694."
            });
          }
        },
        {
          id: "sample-mean-normal-probability",
          titles: [
            "\uC815\uADDC\uBAA8\uC9D1\uB2E8 \uD45C\uBCF8\uD3C9\uADE0\uC758 \uAD6C\uAC04\uD655\uB960",
            "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uAF2C\uB9AC\uD655\uB960\uC5D0\uC11C \uACBD\uACC4\uAC12 \uC5ED\uC0B0"
          ],
          sourcePattern: "\uD45C\uBCF8\uD3C9\uADE0\uC744 \uD3C9\uADE0 \u03BC, \uD45C\uC900\uD3B8\uCC28 \u03C3/\u221An\uC778 \uC815\uADDC\uBD84\uD3EC\uB85C \uBC14\uAFB8\uACE0 \uD45C\uC900\uD654\uD574 \uD655\uB960 \uB610\uB294 \uACBD\uACC4 \uACC4\uC0B0",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uD3C9\uADE0\uC744 \uD655\uC778\uD55C\uB2E4.",
              "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uD45C\uC900\uD3B8\uCC28 \u03C3/\u221An\uC744 \uACC4\uC0B0\uD55C\uB2E4.",
              "\uAD6C\uAC04 \uC591 \uB05D\uC744 \uD45C\uC900\uD654\uD55C\uB2E4.",
              "\uD45C\uC900\uC815\uADDC\uBD84\uD3EC\uC758 \uB300\uCE6D \uB113\uC774\uB97C \uC774\uC6A9\uD55C\uB2E4."
            ],
            [
              "\uC8FC\uC5B4\uC9C4 \uAF2C\uB9AC\uD655\uB960\uC744 z\uAC12\uACFC \uB300\uC751\uC2DC\uD0A8\uB2E4.",
              "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uD45C\uC900\uC624\uCC28\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "z=(k-\u03BC)/(\u03C3/\u221An)\uC744 \uC138\uC6B4\uB2E4.",
              "\uC6D0\uB798 \uACBD\uACC4\uAC12 k\uB97C \uBCF5\uC6D0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const mean = randomInteger(40, 70);
            const populationSd = choose([10, 15, 20]);
            const rootN = choose([5, 10]);
            const sampleSize = rootN ** 2;
            const standardError = populationSd / rootN;
            const boundary = mean + standardError;
            const answer = mode === 0 ? "0.6826" : boundary;
            return makeShortAnswer({
              prompt: `\uC815\uADDC\uBD84\uD3EC $N(${mean},${populationSd ** 2})$\uC778 \uBAA8\uC9D1\uB2E8\uC5D0\uC11C \uD06C\uAE30 ${sampleSize}\uC778 \uD45C\uBCF8\uC744 \uC784\uC758\uCD94\uCD9C\uD558\uACE0 \uD45C\uBCF8\uD3C9\uADE0\uC744 $\\overline X$\uB77C \uD55C\uB2E4. ${mode === 0 ? `$P(${mean - standardError}\\le\\overline X\\le${mean + standardError})$` : "$P(\\overline X\\le k)=0.8413$\uC77C \uB54C $k$"}\uB97C \uAD6C\uD558\uC2DC\uC624. (\uB2E8, $P(0\\le Z\\le1)=0.3413$)`,
              answer,
              independentAnswer: mode === 0 ? "0.6826" : mean + populationSd / rootN,
              solution: `\uD45C\uBCF8\uD3C9\uADE0\uC740 \uD3C9\uADE0 ${mean}, \uD45C\uC900\uD3B8\uCC28 ${standardError}\uC778 \uC815\uADDC\uBD84\uD3EC\uB97C \uB530\uB978\uB2E4. ${mode === 0 ? "\uC8FC\uC5B4\uC9C4 \uAD6C\uAC04\uC740 -1\u2264Z\u22641\uC774\uBBC0\uB85C \uD655\uB960\uC740 0.6826\uC774\uB2E4." : `0.8413=0.5+0.3413\uC774\uBBC0\uB85C z=1, \uB530\uB77C\uC11C k=${boundary}\uC774\uB2E4.`}`,
              hintText: "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uD45C\uC900\uD3B8\uCC28\uB294 \uBAA8\uC9D1\uB2E8 \uD45C\uC900\uD3B8\uCC28\uB97C \u221An\uC73C\uB85C \uB098\uB208 \uAC12\uC785\uB2C8\uB2E4."
            });
          }
        },
        {
          id: "confidence-interval-reverse",
          titles: [
            "\uC2E0\uB8B0\uAD6C\uAC04 \uC591 \uB05D\uC810\uC5D0\uC11C \uD45C\uBCF8\uD3C9\uADE0\uACFC \uC624\uCC28\uD55C\uACC4 \uBCF5\uC6D0",
            "\uC2E0\uB8B0\uAD6C\uAC04 \uAE38\uC774 \uBCC0\uD654\uC5D0\uC11C \uD45C\uBCF8\uD06C\uAE30 \uBE44\uC728 \uACC4\uC0B0"
          ],
          sourcePattern: "\uC2E0\uB8B0\uAD6C\uAC04\uC758 \uC911\uC2EC\uACFC \uBC18\uAE38\uC774\uB97C \uC77D\uACE0 \uD45C\uBCF8\uD3C9\uADE0\xB7\uD45C\uC900\uC624\uCC28 \uB610\uB294 \uD45C\uBCF8\uD06C\uAE30 \uBCC0\uD654\uC728\uC744 \uC5ED\uC0B0",
          estimatedMinutes: [12, 13],
          reasoningSteps: [
            [
              "\uC2E0\uB8B0\uAD6C\uAC04 \uC591 \uB05D\uC810\uC758 \uD3C9\uADE0\uC73C\uB85C \uC911\uC2EC\uC744 \uAD6C\uD55C\uB2E4.",
              "\uC804\uCCB4 \uAE38\uC774\uC758 \uC808\uBC18\uC73C\uB85C \uC624\uCC28\uD55C\uACC4\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC911\uC2EC\uC774 \uD45C\uBCF8\uD3C9\uADE0\uC784\uC744 \uC801\uC6A9\uD55C\uB2E4.",
              "\uD45C\uBCF8\uD3C9\uADE0\uACFC \uC624\uCC28\uD55C\uACC4\uC758 \uACB0\uD569\uAC12\uC744 \uACC4\uC0B0\uD55C\uB2E4."
            ],
            [
              "\uC2E0\uB8B0\uAD6C\uAC04 \uAE38\uC774\uAC00 1/\u221An\uC5D0 \uBE44\uB840\uD568\uC744 \uC4F4\uB2E4.",
              "\uB450 \uAE38\uC774\uC758 \uBE44\uB97C \uACC4\uC0B0\uD55C\uB2E4.",
              "\uC81C\uACF1\uD574 \uD45C\uBCF8\uD06C\uAE30 \uBE44\uC758 \uC5ED\uC218\uB97C \uAD6C\uD55C\uB2E4.",
              "\uC0C8 \uD45C\uBCF8\uD06C\uAE30\uB97C \uACC4\uC0B0\uD55C\uB2E4."
            ]
          ],
          generate(mode) {
            const center = randomInteger(40, 70);
            const margin = choose([2, 3, 4]);
            const originalSize = choose([25, 36, 100]);
            const factor = choose([2, 3]);
            const newSize = originalSize * factor ** 2;
            const answer = mode === 0 ? center + margin : newSize;
            return makeShortAnswer({
              prompt: mode === 0 ? `\uBAA8\uD3C9\uADE0\uC758 \uC2E0\uB8B0\uAD6C\uAC04\uC774 $[${center - margin},${center + margin}]$\uB85C \uACC4\uC0B0\uB418\uC5C8\uB2E4. \uD45C\uBCF8\uD3C9\uADE0\uC744 $\\overline x$, \uC624\uCC28\uD55C\uACC4\uB97C $E$\uB77C \uD560 \uB54C $\\overline x+E$\uB97C \uAD6C\uD558\uC2DC\uC624.` : `\uAC19\uC740 \uC2E0\uB8B0\uB3C4\uC640 \uAC19\uC740 \uBAA8\uD45C\uC900\uD3B8\uCC28\uC5D0\uC11C \uD45C\uBCF8\uD06C\uAE30 ${originalSize}\uC73C\uB85C \uAD6C\uD55C \uC2E0\uB8B0\uAD6C\uAC04\uC758 \uAE38\uC774\uB97C $1/${factor}$\uBC30\uB85C \uC904\uC774\uB824 \uD55C\uB2E4. \uD544\uC694\uD55C \uC0C8 \uD45C\uBCF8\uD06C\uAE30\uB97C \uAD6C\uD558\uC2DC\uC624.`,
              answer,
              independentAnswer: mode === 0 ? center + margin : originalSize * factor ** 2,
              solution: mode === 0 ? `\uAD6C\uAC04\uC758 \uC911\uC2EC\uC740 $\\overline x=${center}$, \uBC18\uAE38\uC774\uB294 $E=${margin}$\uC774\uBBC0\uB85C \uB2F5\uC740 ${answer}\uC774\uB2E4.` : `\uC2E0\uB8B0\uAD6C\uAC04 \uAE38\uC774\uB294 $1/\\sqrt n$\uC5D0 \uBE44\uB840\uD55C\uB2E4. \uAE38\uC774\uB97C $1/${factor}$\uBC30\uB85C \uB9CC\uB4E4\uB824\uBA74 \uD45C\uBCF8\uD06C\uAE30\uB294 ${factor ** 2}\uBC30\uC774\uBBC0\uB85C ${newSize}\uC774\uB2E4.`,
              hintText: mode === 0 ? "\uC2E0\uB8B0\uAD6C\uAC04\uC758 \uC911\uC2EC\uACFC \uBC18\uAE38\uC774\uB97C \uAC01\uAC01 \uAD6C\uD558\uC138\uC694." : "\uC2E0\uB8B0\uAD6C\uAC04 \uAE38\uC774\uC640 \uD45C\uBCF8\uD06C\uAE30\uC758 \uC81C\uACF1\uADFC \uAD00\uACC4\uB97C \uC0AC\uC6A9\uD558\uC138\uC694."
            });
          }
        }
      ];
      module.exports = {
        courseId,
        unitId,
        requiredConceptIds,
        minimumAppliedPoolSize: 16,
        appliedPolicy: {
          includeBankTypes: true,
          minimumLocalDifficulty: 3
        },
        advancedTemplates: defineAdvancedTemplates({
          courseId,
          unitId,
          requiredConceptIds,
          families
        })
      };
    }
  });

  // services/assessmentTemplates/index.js
  var require_assessmentTemplates = __commonJS({
    "services/assessmentTemplates/index.js"(exports, module) {
      var {
        getUnitReferenceAnalysis,
        referenceIdsForTemplate
      } = require_mockExamCatalog();
      var unitConfigs = [
        ...require_commonMath(),
        require_exponentialLogarithmicFunctions(),
        require_trigonometricFunctions(),
        require_sequences(),
        require_limitsAndContinuity(),
        require_differentiation(),
        require_integration(),
        require_counting(),
        require_probability(),
        require_statistics()
      ];
      var configMap = new Map(
        unitConfigs.map((config) => [
          [
            config.courseId,
            config.unitId
          ].join("/"),
          config
        ])
      );
      for (const config of unitConfigs) {
        const analysis = getUnitReferenceAnalysis(
          config.courseId,
          config.unitId
        );
        if (!analysis) {
          throw new Error(
            `${config.courseId}/${config.unitId}: \uBAA8\uC758\uACE0\uC0AC \uB808\uD37C\uB7F0\uC2A4 \uBD84\uC11D\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.`
          );
        }
        config.referenceAnalysis = analysis;
        config.advancedTemplates = config.advancedTemplates.map(
          (template, index) => ({
            ...template,
            sourcePattern: template.sourcePattern || analysis.signals[index % analysis.signals.length],
            referenceExamIds: referenceIdsForTemplate(
              config.courseId,
              config.unitId,
              index,
              5
            )
          })
        );
      }
      function getUnitAssessmentConfig(courseId, unitId) {
        return configMap.get(
          [
            courseId,
            unitId
          ].join("/")
        ) || null;
      }
      function getCourseAssessmentConfigs(courseId) {
        return unitConfigs.filter(
          (config) => config.courseId === courseId
        );
      }
      function assessmentConfigsForScope({
        scopeType,
        courseId,
        unitId
      }) {
        if (scopeType === "subunit") {
          return [];
        }
        if (scopeType === "unit") {
          const config = getUnitAssessmentConfig(
            courseId,
            unitId
          );
          return config ? [config] : [];
        }
        return getCourseAssessmentConfigs(
          courseId
        );
      }
      function assertAssessmentTemplateCatalog() {
        for (const config of unitConfigs) {
          if (config.advancedTemplates.length < 20) {
            throw new Error(
              `${config.courseId}/${config.unitId}: \uC2EC\uD654 \uC720\uD615\uC774 20\uAC1C \uBBF8\uB9CC\uC785\uB2C8\uB2E4.`
            );
          }
          for (const template of config.advancedTemplates) {
            if (template.estimatedMinutes < 10) {
              throw new Error(
                `${template.id}: \uC608\uC0C1 \uD480\uC774\uC2DC\uAC04\uC774 10\uBD84 \uBBF8\uB9CC\uC785\uB2C8\uB2E4.`
              );
            }
            if (template.reasoningSteps.length < 3) {
              throw new Error(
                `${template.id}: \uD480\uC774 \uB2E8\uACC4\uAC00 3\uAC1C \uBBF8\uB9CC\uC785\uB2C8\uB2E4.`
              );
            }
            if (!template.referenceExamIds.length) {
              throw new Error(
                `${template.id}: \uBAA8\uC758\uACE0\uC0AC \uB808\uD37C\uB7F0\uC2A4\uAC00 \uC5C6\uC2B5\uB2C8\uB2E4.`
              );
            }
          }
        }
        return true;
      }
      assertAssessmentTemplateCatalog();
      module.exports = {
        unitConfigs,
        getUnitAssessmentConfig,
        getCourseAssessmentConfigs,
        assessmentConfigsForScope,
        assertAssessmentTemplateCatalog
      };
    }
  });

  // services/problemGenerators/calculus1/functionLimit.js
  var require_functionLimit = __commonJS({
    "services/problemGenerators/calculus1/functionLimit.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        isCorrectAnswer
      } = require_utils();
      function inlineMath(tex) {
        return `\\(${tex}\\)`;
      }
      function displayMath(tex) {
        return `\\[${tex}\\]`;
      }
      function signedNumber(value) {
        if (value === 0) return "";
        return value > 0 ? `+${value}` : `-${Math.abs(value)}`;
      }
      function xMinus(value) {
        return value >= 0 ? `x-${value}` : `x+${Math.abs(value)}`;
      }
      function xPlus(value) {
        return value >= 0 ? `x+${value}` : `x-${Math.abs(value)}`;
      }
      function linearExpression(slope, constant) {
        const xTerm = slope === 1 ? "x" : slope === -1 ? "-x" : `${slope}x`;
        return `${xTerm}${signedNumber(constant)}`;
      }
      function quadraticExpression(p, q, r) {
        const quadraticTerm = p === 1 ? "x^2" : p === -1 ? "-x^2" : `${p}x^2`;
        const linearTerm = q === 0 ? "" : q === 1 ? "+x" : q === -1 ? "-x" : q > 0 ? `+${q}x` : `-${Math.abs(q)}x`;
        return `${quadraticTerm}${linearTerm}${signedNumber(r)}`;
      }
      var problemTypes = [
        {
          id: "direct-substitution",
          label: "\uC720\uD615 1 \xB7 \uC9C1\uC811 \uB300\uC785",
          difficulty: 1,
          generate() {
            const a = randomInteger(-3, 3);
            const p = nonZeroInteger(-3, 3);
            const q = randomInteger(-5, 5);
            const r = randomInteger(-5, 5);
            const answer = p * a * a + q * a + r;
            const expression = quadraticExpression(p, q, r);
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}\\left(${expression}\\right)`
              )}\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uB2E4\uD56D\uD568\uC218\uB294 \uC5F0\uC18D\uC774\uBBC0\uB85C ${inlineMath(
                `x=${a}`
              )}\uB97C \uC9C1\uC811 \uB300\uC785\uD569\uB2C8\uB2E4. \uC815\uB2F5\uC740 ${inlineMath(
                String(answer)
              )}\uC785\uB2C8\uB2E4.`,
              hintText: `${inlineMath(`y=${expression}`)}\uC758 \uADF8\uB798\uD504\uC5D0\uC11C ${inlineMath(`x=${a}`)}\uC77C \uB54C\uC758 \uB192\uC774\uB97C \uD655\uC778\uD574\uBCF4\uC138\uC694.`,
              visualization: {
                kind: "polynomial",
                focusX: a,
                coefficients: {
                  quadratic: p,
                  linear: q,
                  constant: r
                }
              },
              validityChecks: [
                {
                  name: "direct-substitution-answer",
                  passed: answer === p * a * a + q * a + r,
                  message: "\uC9C1\uC811 \uB300\uC785\uC73C\uB85C \uACC4\uC0B0\uD55C \uAC12\uACFC \uC815\uB2F5\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "factor-cancellation",
          label: "\uC720\uD615 2 \xB7 \uC778\uC218\uBD84\uD574\uC640 \uC57D\uBD84",
          difficulty: 2,
          generate() {
            const a = nonZeroInteger(-5, 5);
            const answer = 2 * a;
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}\\frac{x^2-${a ** 2}}{${xMinus(a)}}`
              )}\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `${inlineMath(
                `x^2-${a ** 2}=(${xMinus(a)})(${xPlus(a)})`
              )}\uC774\uBBC0\uB85C ${inlineMath(
                `x\\ne ${a}`
              )}\uC5D0\uC11C ${inlineMath(
                xPlus(a)
              )}\uB85C \uC57D\uBD84\uB429\uB2C8\uB2E4. \uC815\uB2F5\uC740 ${inlineMath(
                String(answer)
              )}\uC785\uB2C8\uB2E4.`,
              hintText: `\uC57D\uBD84\uD55C \uB4A4\uC758 \uADF8\uB798\uD504\uB294 ${inlineMath(
                `y=${xPlus(a)}`
              )}\uC774\uC9C0\uB9CC ${inlineMath(
                `x=${a}`
              )}\uC778 \uD55C \uC810\uB9CC \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4. \uBE48 \uC810\uC73C\uB85C \uB2E4\uAC00\uAC00 \uBCF4\uC138\uC694.`,
              visualization: {
                kind: "hole-linear",
                focusX: a,
                slope: 1,
                intercept: a
              },
              validityChecks: [
                {
                  name: "factor-cancellation-identity",
                  passed: answer === 2 * a && a !== 0,
                  message: "\uC778\uC218\uBD84\uD574 \uB4A4\uC758 \uC2DD \uB610\uB294 \uADF9\uD55C\uAC12\uC774 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "rationalization",
          label: "\uC720\uD615 3 \xB7 \uC720\uB9AC\uD654",
          difficulty: 3,
          generate() {
            const root = randomInteger(2, 5);
            const a = root ** 2;
            const answer = 1 / (2 * root);
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}\\frac{\\sqrt{x}-${root}}{x-${a}}`
              )}\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBD84\uC790\uB97C \uC720\uB9AC\uD654\uD558\uBA74 ${inlineMath(
                `\\frac{1}{\\sqrt{x}+${root}}`
              )}\uC774 \uB429\uB2C8\uB2E4. \uB530\uB77C\uC11C \uC815\uB2F5\uC740 ${inlineMath(
                `\\frac{1}{${2 * root}}`
              )}\uC785\uB2C8\uB2E4.`,
              hintText: `\uC720\uB9AC\uD654\uD55C ${inlineMath(
                `y=\\frac{1}{\\sqrt{x}+${root}}`
              )}\uC758 \uADF8\uB798\uD504\uC5D0\uC11C ${inlineMath(
                `x=${a}`
              )}\uB85C \uC811\uADFC\uD574\uBCF4\uC138\uC694.`,
              visualization: {
                kind: "rationalized-root",
                focusX: a,
                root
              },
              validityChecks: [
                {
                  name: "rationalization-domain",
                  passed: root > 0 && a === root ** 2 && answer === 1 / (2 * root),
                  message: "\uADFC\uD638\uC758 \uC815\uC758\uC5ED \uB610\uB294 \uC720\uB9AC\uD654 \uACB0\uACFC\uAC00 \uC62C\uBC14\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "left-hand-limit",
          label: "\uC720\uD615 4 \xB7 \uC88C\uADF9\uD55C",
          difficulty: 2,
          generate() {
            const a = randomInteger(-2, 2);
            const leftSlope = nonZeroInteger(-3, 3);
            const leftConstant = randomInteger(-4, 4);
            const rightSlope = nonZeroInteger(-3, 3);
            const rightConstant = randomInteger(-4, 4);
            const answer = leftSlope * a + leftConstant;
            const definition = `f(x)=\\begin{cases}${linearExpression(leftSlope, leftConstant)},&x<${a}\\\\${linearExpression(rightSlope, rightConstant)},&x\\ge ${a}\\end{cases}`;
            return {
              prompt: `${displayMath(definition)}${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}^{-}}f(x)`
              )}\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uC67C\uCABD\uC5D0\uC11C \uC811\uADFC\uD558\uBBC0\uB85C ${inlineMath(
                `x<${a}`
              )}\uC778 \uC2DD\uB9CC \uC0AC\uC6A9\uD569\uB2C8\uB2E4. \uC815\uB2F5\uC740 ${inlineMath(
                String(answer)
              )}\uC785\uB2C8\uB2E4.`,
              hintText: `${inlineMath(`x=${a}`)}\uC758 \uC67C\uCABD\uC5D0 \uC788\uB294 \uCD08\uB85D\uC0C9 \uC120\uC744 \uB530\uB77C \uACBD\uACC4\uC810\uC73C\uB85C \uC811\uADFC\uD574\uBCF4\uC138\uC694.`,
              visualization: {
                kind: "piecewise-linear",
                focusX: a,
                focusSide: "left",
                left: {
                  slope: leftSlope,
                  constant: leftConstant
                },
                right: {
                  slope: rightSlope,
                  constant: rightConstant
                }
              },
              validityChecks: [
                {
                  name: "left-hand-limit-answer",
                  passed: answer === leftSlope * a + leftConstant,
                  message: "\uC88C\uADF9\uD55C\uC5D0 \uC67C\uCABD \uC2DD\uC774 \uC801\uC6A9\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "right-hand-limit",
          label: "\uC720\uD615 5 \xB7 \uC6B0\uADF9\uD55C",
          difficulty: 2,
          generate() {
            const a = randomInteger(-2, 2);
            const leftSlope = nonZeroInteger(-3, 3);
            const leftConstant = randomInteger(-4, 4);
            const rightSlope = nonZeroInteger(-3, 3);
            const rightConstant = randomInteger(-4, 4);
            const answer = rightSlope * a + rightConstant;
            const definition = `f(x)=\\begin{cases}${linearExpression(leftSlope, leftConstant)},&x<${a}\\\\${linearExpression(rightSlope, rightConstant)},&x\\ge ${a}\\end{cases}`;
            return {
              prompt: `${displayMath(definition)}${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}^{+}}f(x)`
              )}\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uC624\uB978\uCABD\uC5D0\uC11C \uC811\uADFC\uD558\uBBC0\uB85C ${inlineMath(
                `x\\ge ${a}`
              )}\uC778 \uC2DD\uC744 \uC0AC\uC6A9\uD569\uB2C8\uB2E4. \uC815\uB2F5\uC740 ${inlineMath(
                String(answer)
              )}\uC785\uB2C8\uB2E4.`,
              hintText: `${inlineMath(`x=${a}`)}\uC758 \uC624\uB978\uCABD\uC5D0 \uC788\uB294 \uBCF4\uB77C\uC0C9 \uC120\uC744 \uB530\uB77C \uACBD\uACC4\uC810\uC73C\uB85C \uC811\uADFC\uD574\uBCF4\uC138\uC694.`,
              visualization: {
                kind: "piecewise-linear",
                focusX: a,
                focusSide: "right",
                left: {
                  slope: leftSlope,
                  constant: leftConstant
                },
                right: {
                  slope: rightSlope,
                  constant: rightConstant
                }
              },
              validityChecks: [
                {
                  name: "right-hand-limit-answer",
                  passed: answer === rightSlope * a + rightConstant,
                  message: "\uC6B0\uADF9\uD55C\uC5D0 \uC624\uB978\uCABD \uC2DD\uC774 \uC801\uC6A9\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "two-sided-existence",
          label: "\uC720\uD615 6 \xB7 \uADF9\uD55C\uC758 \uC874\uC7AC \uD310\uC815",
          difficulty: 2,
          generate() {
            const a = randomInteger(-2, 2);
            const leftLimit = randomInteger(-4, 4);
            const exists = Math.random() >= 0.5;
            const rightLimit = exists ? leftLimit : leftLimit + nonZeroInteger(-3, 3);
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}^{-}}f(x)=${leftLimit}`
              )}, ${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}^{+}}f(x)=${rightLimit}`
              )}\uC785\uB2C8\uB2E4. ${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}f(x)`
              )}\uB294 \uC874\uC7AC\uD569\uB2C8\uAE4C?`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "exists",
                  text: "\uC874\uC7AC\uD55C\uB2E4"
                },
                {
                  key: "dne",
                  text: "\uC874\uC7AC\uD558\uC9C0 \uC54A\uB294\uB2E4"
                }
              ],
              answer: exists ? "exists" : "dne",
              solution: exists ? `\uC88C\uADF9\uD55C\uACFC \uC6B0\uADF9\uD55C\uC774 \uBAA8\uB450 ${inlineMath(
                String(leftLimit)
              )}\uC774\uBBC0\uB85C \uADF9\uD55C\uC774 \uC874\uC7AC\uD569\uB2C8\uB2E4.` : `\uC88C\uADF9\uD55C ${inlineMath(
                String(leftLimit)
              )}\uACFC \uC6B0\uADF9\uD55C ${inlineMath(
                String(rightLimit)
              )}\uC774 \uB2E4\uB974\uBBC0\uB85C \uADF9\uD55C\uC774 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.`,
              hintText: `\uC591\uCABD \uADF9\uD55C\uC744 \uBE44\uAD50\uD558\uC138\uC694. \uC88C\uADF9\uD55C\uACFC \uC6B0\uADF9\uD55C\uC774 \uAC19\uC744 \uB54C\uB9CC \uB450 \uBC29\uD5A5\uC758 \uC6C0\uC9C1\uC784\uC774 \uD55C \uC810\uC5D0\uC11C \uB9CC\uB0A9\uB2C8\uB2E4.`,
              visualization: {
                kind: "one-sided-limits",
                focusX: a,
                leftLimit,
                rightLimit
              },
              validityChecks: [
                {
                  name: "two-sided-limit-existence",
                  passed: exists === (leftLimit === rightLimit),
                  message: "\uC88C\uC6B0\uADF9\uD55C\uACFC \uC874\uC7AC \uC5EC\uBD80\uAC00 \uC11C\uB85C \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "point-value-independence",
          label: "\uC720\uD615 7 \xB7 \uD568\uC218\uAC12\uACFC \uADF9\uD55C\uAC12",
          difficulty: 2,
          generate() {
            const a = randomInteger(-3, 3);
            const limitValue = randomInteger(-4, 4);
            let pointValue = randomInteger(-4, 4);
            while (pointValue === limitValue) {
              pointValue = randomInteger(-4, 4);
            }
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}f(x)=${limitValue}`
              )}\uC774\uACE0 ${inlineMath(
                `f(${a})=${pointValue}`
              )}\uC785\uB2C8\uB2E4. \uADF9\uD55C\uAC12\uC744 \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "limit",
                  text: inlineMath(String(limitValue))
                },
                {
                  key: "point",
                  text: inlineMath(String(pointValue))
                },
                {
                  key: "dne",
                  text: "\uC874\uC7AC\uD558\uC9C0 \uC54A\uB294\uB2E4"
                }
              ],
              answer: "limit",
              solution: `\uADF9\uD55C\uC740 ${inlineMath(
                `x=${a}`
              )} \uC8FC\uBCC0\uC5D0\uC11C \uD568\uC218\uAC12\uC774 \uD5A5\uD558\uB294 \uAC12\uC744 \uBD05\uB2C8\uB2E4. ${inlineMath(
                `f(${a})`
              )}\uC640 \uBB34\uAD00\uD558\uAC8C \uADF9\uD55C\uAC12\uC740 ${inlineMath(
                String(limitValue)
              )}\uC785\uB2C8\uB2E4.`,
              hintText: `\uBE48 \uC810\uC740 \uC8FC\uBCC0 \uAC12\uC774 \uD5A5\uD558\uB294 \uACF3\uC774\uACE0, \uCC44\uC6B4 \uC810\uC740 \uC2E4\uC81C \uD568\uC218\uAC12\uC785\uB2C8\uB2E4. \uADF9\uD55C\uC5D0\uC11C\uB294 \uBE48 \uC810\uC758 \uB192\uC774\uB97C \uBCF4\uC138\uC694.`,
              visualization: {
                kind: "limit-point-example",
                focusX: a,
                limitValue,
                pointValue
              },
              validityChecks: [
                {
                  name: "limit-point-distinction",
                  passed: limitValue !== pointValue,
                  message: "\uADF9\uD55C\uAC12\uACFC \uD568\uC218\uAC12\uC744 \uAD6C\uBD84\uD558\uB294 \uC608\uC81C\uAC00 \uC544\uB2D9\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "infinite-limit",
          label: "\uC720\uD615 8 \xB7 \uBB34\uD55C\uB300 \uADF9\uD55C",
          difficulty: 3,
          generate() {
            const a = randomInteger(-3, 3);
            const coefficient = randomInteger(1, 5);
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}\\frac{${coefficient}}{(${xMinus(a)})^2}`
              )}\uC758 \uAC12\uC744 \uD310\uB2E8\uD558\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "+infinity",
                  text: inlineMath("+\\infty")
                },
                {
                  key: "-infinity",
                  text: inlineMath("-\\infty")
                },
                {
                  key: "zero",
                  text: inlineMath("0")
                },
                {
                  key: "dne",
                  text: "\uC874\uC7AC\uD558\uC9C0 \uC54A\uB294\uB2E4"
                }
              ],
              answer: "+infinity",
              solution: `\uBD84\uBAA8\uB294 \uC591\uC218\uC778 \uC0C1\uD0DC\uB85C ${inlineMath(
                "0"
              )}\uC5D0 \uAC00\uAE4C\uC6CC\uC9C0\uBBC0\uB85C \uD568\uC218\uAC12\uC740 ${inlineMath(
                "+\\infty"
              )}\uB85C \uCEE4\uC9D1\uB2C8\uB2E4.`,
              hintText: `${inlineMath(`x=${a}`)}\uC5D0 \uAC00\uAE4C\uC6CC\uC9C8\uC218\uB85D \uBD84\uBAA8\uB294 \uC591\uC218\uC778 \uCC44\uB85C ${inlineMath("0")}\uC5D0 \uAC00\uAE4C\uC6CC\uC9D1\uB2C8\uB2E4. \uADF8\uB798\uD504\uAC00 \uC5B4\uB290 \uBC29\uD5A5\uC73C\uB85C \uBED7\uB294\uC9C0 \uD655\uC778\uD574\uBCF4\uC138\uC694.`,
              visualization: {
                kind: "inverse-square",
                focusX: a,
                coefficient
              },
              validityChecks: [
                {
                  name: "positive-infinite-limit",
                  passed: coefficient > 0 && Number.isFinite(a),
                  message: "\uC591\uC758 \uBB34\uD55C\uB300 \uADF9\uD55C\uC744 \uBCF4\uC7A5\uD558\uB294 \uACC4\uC218 \uC870\uAC74\uC744 \uB9CC\uC871\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "limit-law",
          label: "\uC720\uD615 9 \xB7 \uADF9\uD55C\uC758 \uC131\uC9C8",
          difficulty: 2,
          generate() {
            const fLimit = randomInteger(-4, 4);
            const gLimit = randomInteger(-4, 4);
            const answer = 2 * fLimit - 3 * gLimit;
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to a}f(x)=${fLimit}`
              )}, ${inlineMath(
                `\\displaystyle\\lim_{x\\to a}g(x)=${gLimit}`
              )}\uC77C \uB54C ${inlineMath(
                "\\displaystyle\\lim_{x\\to a}\\{2f(x)-3g(x)\\}"
              )}\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uADF9\uD55C\uC758 \uC131\uC9C8\uC744 \uC801\uC6A9\uD558\uBA74 ${inlineMath(
                `2\\times(${fLimit})-3\\times(${gLimit})=${answer}`
              )}\uC785\uB2C8\uB2E4.`,
              hintText: `${inlineMath(
                `f(x)\\to ${fLimit},\\quad g(x)\\to ${gLimit}`
              )}\uB97C \uC2DD\uC5D0 \uADF8\uB300\uB85C \uB123\uC2B5\uB2C8\uB2E4.
\uD604\uC7AC \uACC4\uC0B0\uC2DD\uC740 ${inlineMath(
                `2\\times(${fLimit})-3\\times(${gLimit})`
              )}\uC785\uB2C8\uB2E4. \uAC01 \uACF1\uC148\uC744 \uBA3C\uC800 \uACC4\uC0B0\uD55C \uB4A4 \uBE7C\uC138\uC694.`,
              visualization: {
                kind: "limit-law-combination",
                focusX: 0,
                fLimit,
                gLimit,
                resultLimit: answer,
                note: "\uB450 \uD568\uC218\uAC00 \uAC01\uAC01 \uD5A5\uD558\uB294 \uB192\uC774\uB97C \uD655\uC778\uD55C \uB4A4 \uACC4\uC218\uB97C \uACF1\uD574 \uACB0\uD569\uD558\uC138\uC694."
              },
              validityChecks: [
                {
                  name: "limit-law-answer",
                  passed: answer === 2 * fLimit - 3 * gLimit,
                  message: "\uADF9\uD55C\uC758 \uC120\uD615\uC131\uC73C\uB85C \uACC4\uC0B0\uD55C \uAC12\uACFC \uC815\uB2F5\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "table-inference",
          label: "\uC720\uD615 10 \xB7 \uD45C\uC5D0\uC11C \uADF9\uD55C \uC77D\uAE30",
          difficulty: 1,
          generate() {
            const a = randomInteger(-2, 2);
            const target = randomInteger(-4, 4);
            const xValues = [
              a - 0.1,
              a - 0.01,
              a + 0.01,
              a + 0.1
            ];
            const yValues = [
              target - 0.1,
              target - 0.01,
              target + 0.01,
              target + 0.1
            ];
            const table = displayMath(
              `\\begin{array}{c|cccc}x&${xValues.join("&")}\\\\f(x)&${yValues.map((value) => value.toFixed(2)).join("&")}\\end{array}`
            );
            return {
              prompt: `${table}\uD45C\uB97C \uBCF4\uACE0 ${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}f(x)`
              )}\uB97C \uCD94\uC815\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: target,
              solution: `${inlineMath(
                "x"
              )}\uAC00 ${inlineMath(
                String(a)
              )}\uC758 \uC591\uCABD\uC5D0\uC11C \uAC00\uAE4C\uC6CC\uC9C8\uC218\uB85D ${inlineMath(
                "f(x)"
              )}\uB294 ${inlineMath(
                String(target)
              )}\uC5D0 \uAC00\uAE4C\uC6CC\uC9D1\uB2C8\uB2E4.`,
              hintText: `\uD45C\uC758 \uB124 \uC810\uC744 \uC88C\uD45C\uD3C9\uBA74\uC5D0 \uC62E\uACBC\uC2B5\uB2C8\uB2E4. ${inlineMath(
                `x=${a}`
              )}\uC758 \uC591\uCABD \uC810\uB4E4\uC774 \uD5A5\uD558\uB294 \uB192\uC774\uB97C \uAD00\uCC30\uD558\uC138\uC694.`,
              visualization: {
                kind: "table-points",
                focusX: a,
                target,
                xValues,
                yValues
              },
              validityChecks: [
                {
                  name: "table-approaches-from-both-sides",
                  passed: xValues.some((value) => value < a) && xValues.some((value) => value > a) && yValues.every(
                    (value, index) => Math.abs(
                      Math.abs(value - target) - Math.abs(xValues[index] - a)
                    ) < 1e-9
                  ),
                  message: "\uD45C\uC758 \uAC12\uC774 \uBAA9\uD45C\uC810\uC758 \uC591\uCABD\uC5D0\uC11C \uAC19\uC740 \uAC12\uC73C\uB85C \uC218\uB834\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        }
      ];
      module.exports = {
        key: "calculus-limit-meaning",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/calculus1/helpers.js
  var require_helpers = __commonJS({
    "services/problemGenerators/calculus1/helpers.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        isCorrectAnswer
      } = require_utils();
      function inlineMath(tex) {
        return `\\(${tex}\\)`;
      }
      function displayMath(tex) {
        return `\\[${tex}\\]`;
      }
      function signedNumber(value) {
        if (value === 0) return "";
        return value > 0 ? `+${value}` : `-${Math.abs(value)}`;
      }
      function xMinus(value) {
        if (value === 0) return "x";
        return value > 0 ? `x-${value}` : `x+${Math.abs(value)}`;
      }
      function linearExpression(slope, constant, variable = "x") {
        const variableTerm = slope === 1 ? variable : slope === -1 ? `-${variable}` : `${slope}${variable}`;
        return `${variableTerm}${signedNumber(constant)}`;
      }
      function quadraticExpression(quadratic, linear, constant, variable = "x") {
        const quadraticTerm = quadratic === 1 ? `${variable}^2` : quadratic === -1 ? `-${variable}^2` : `${quadratic}${variable}^2`;
        const linearTerm = linear === 0 ? "" : linear === 1 ? `+${variable}` : linear === -1 ? `-${variable}` : linear > 0 ? `+${linear}${variable}` : `-${Math.abs(linear)}${variable}`;
        return `${quadraticTerm}${linearTerm}${signedNumber(
          constant
        )}`;
      }
      function greatestCommonDivisor(first, second) {
        let a = Math.abs(first);
        let b = Math.abs(second);
        while (b) {
          [a, b] = [b, a % b];
        }
        return a || 1;
      }
      function fractionTex(numerator, denominator) {
        if (denominator === 0) {
          throw new Error("\uBD84\uBAA8\uB294 0\uC77C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.");
        }
        let normalizedNumerator = numerator;
        let normalizedDenominator = denominator;
        if (normalizedDenominator < 0) {
          normalizedNumerator *= -1;
          normalizedDenominator *= -1;
        }
        const divisor = greatestCommonDivisor(
          normalizedNumerator,
          normalizedDenominator
        );
        normalizedNumerator /= divisor;
        normalizedDenominator /= divisor;
        if (normalizedDenominator === 1) {
          return String(normalizedNumerator);
        }
        return `\\frac{${normalizedNumerator}}{${normalizedDenominator}}`;
      }
      function linearCombinationTex(terms) {
        return terms.filter(({ coefficient }) => coefficient !== 0).map(({ coefficient, expression }, index) => {
          const magnitude = Math.abs(coefficient);
          const coefficientText = magnitude === 1 ? "" : String(magnitude);
          const term = `${coefficientText}${expression}`;
          if (index === 0) {
            return coefficient < 0 ? `-${term}` : term;
          }
          return coefficient < 0 ? `-${term}` : `+${term}`;
        }).join("");
      }
      module.exports = {
        randomInteger,
        nonZeroInteger,
        isCorrectAnswer,
        inlineMath,
        displayMath,
        signedNumber,
        xMinus,
        linearExpression,
        quadraticExpression,
        fractionTex,
        linearCombinationTex
      };
    }
  });

  // services/problemGenerators/calculus1/limitPropertiesAndCalculation.js
  var require_limitPropertiesAndCalculation = __commonJS({
    "services/problemGenerators/calculus1/limitPropertiesAndCalculation.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        isCorrectAnswer,
        inlineMath,
        xMinus,
        linearExpression,
        quadraticExpression,
        fractionTex,
        linearCombinationTex
      } = require_helpers();
      var problemTypes = [
        {
          id: "sum-and-difference-law",
          label: "\uC720\uD615 1 \xB7 \uD569\uACFC \uCC28\uC758 \uADF9\uD55C",
          difficulty: 1,
          generate() {
            const fLimit = randomInteger(-5, 5);
            const gLimit = randomInteger(-5, 5);
            const fCoefficient = nonZeroInteger(-3, 3);
            const gCoefficient = nonZeroInteger(-3, 3);
            const expression = linearCombinationTex([
              {
                coefficient: fCoefficient,
                expression: "f(x)"
              },
              {
                coefficient: gCoefficient,
                expression: "g(x)"
              }
            ]);
            const answer = fCoefficient * fLimit + gCoefficient * gLimit;
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to a}f(x)=${fLimit}`
              )}, ${inlineMath(
                `\\displaystyle\\lim_{x\\to a}g(x)=${gLimit}`
              )}\uC77C \uB54C, ${inlineMath(
                `\\displaystyle\\lim_{x\\to a}\\{${expression}\\}`
              )}\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uD569\xB7\uCC28\uC640 \uC0C1\uC218\uBC30\uC758 \uADF9\uD55C \uC131\uC9C8\uC744 \uC801\uC6A9\uD558\uBA74 ${inlineMath(
                `${fCoefficient}\\times(${fLimit})${gCoefficient < 0 ? "" : "+"}${gCoefficient}\\times(${gLimit})=${answer}`
              )}\uC785\uB2C8\uB2E4.`,
              hintText: `1\uB2E8\uACC4: ${inlineMath(
                `f(x)\\to ${fLimit},\\quad g(x)\\to ${gLimit}`
              )}\uB85C \uBC14\uAFC9\uB2C8\uB2E4.
2\uB2E8\uACC4: \uD604\uC7AC \uC2DD\uC740 ${inlineMath(
                `${fCoefficient}(${fLimit})${gCoefficient < 0 ? "" : "+"}${gCoefficient}(${gLimit})`
              )}\uAC00 \uB429\uB2C8\uB2E4. \uC774\uC81C \uB9C8\uC9C0\uB9C9 \uC815\uC218 \uACC4\uC0B0\uB9CC \uD574\uBCF4\uC138\uC694.`,
              visualization: null
            };
          }
        },
        {
          id: "product-law",
          label: "\uC720\uD615 2 \xB7 \uACF1\uC758 \uADF9\uD55C",
          difficulty: 1,
          generate() {
            const fLimit = nonZeroInteger(-5, 5);
            const gLimit = nonZeroInteger(-5, 5);
            const answer = fLimit * gLimit;
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to a}f(x)=${fLimit}`
              )}, ${inlineMath(
                `\\displaystyle\\lim_{x\\to a}g(x)=${gLimit}`
              )}\uC77C \uB54C, ${inlineMath(
                "\\displaystyle\\lim_{x\\to a}f(x)g(x)"
              )}\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uACF1\uC758 \uADF9\uD55C\uC740 \uAC01 \uADF9\uD55C\uAC12\uC758 \uACF1\uC774\uBBC0\uB85C ${inlineMath(
                `(${fLimit})\\times(${gLimit})=${answer}`
              )}\uC785\uB2C8\uB2E4.`,
              hintText: `\uACF1\uC758 \uADF9\uD55C\uC740 \uAC01 \uADF9\uD55C\uAC12\uC758 \uACF1\uC73C\uB85C \uBC14\uAFC0 \uC218 \uC788\uC2B5\uB2C8\uB2E4.
\uD604\uC7AC \uC22B\uC790\uB97C \uB123\uC73C\uBA74 ${inlineMath(
                `(${fLimit})\\times(${gLimit})`
              )}\uC785\uB2C8\uB2E4. \uBD80\uD638\uBD80\uD130 \uD655\uC778\uD55C \uB4A4 \uACF1\uD558\uC138\uC694.`,
              visualization: null
            };
          }
        },
        {
          id: "quotient-law",
          label: "\uC720\uD615 3 \xB7 \uBAAB\uC758 \uADF9\uD55C",
          difficulty: 2,
          generate() {
            const fLimit = nonZeroInteger(-6, 6);
            const gLimit = nonZeroInteger(-6, 6);
            const answer = fLimit / gLimit;
            const answerTex = fractionTex(
              fLimit,
              gLimit
            );
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to a}f(x)=${fLimit}`
              )}, ${inlineMath(
                `\\displaystyle\\lim_{x\\to a}g(x)=${gLimit}`
              )}\uC77C \uB54C, ${inlineMath(
                "\\displaystyle\\lim_{x\\to a}\\frac{f(x)}{g(x)}"
              )}\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `${inlineMath(
                `\\lim_{x\\to a}g(x)=${gLimit}\\ne0`
              )}\uC774\uBBC0\uB85C \uBAAB\uC758 \uC131\uC9C8\uC744 \uC801\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC815\uB2F5\uC740 ${inlineMath(answerTex)}\uC785\uB2C8\uB2E4.`,
              hintText: `\uBD84\uBAA8\uC758 \uADF9\uD55C\uAC12\uC740 ${inlineMath(
                String(gLimit)
              )}\uC774\uBBC0\uB85C 0\uC774 \uC544\uB2D9\uB2C8\uB2E4.
\uB530\uB77C\uC11C \uBAAB\uC758 \uC131\uC9C8\uC744 \uC801\uC6A9\uD574 ${inlineMath(
                `\\frac{${fLimit}}{${gLimit}}`
              )}\uB97C \uC57D\uBD84\uD558\uBA74 \uB429\uB2C8\uB2E4.`,
              visualization: null,
              validityChecks: [
                {
                  name: "non-zero-limit-denominator",
                  passed: gLimit !== 0,
                  message: "\uBAAB\uC758 \uADF9\uD55C\uC5D0\uC11C \uBD84\uBAA8\uC758 \uADF9\uD55C\uAC12\uC740 0\uC77C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "power-and-polynomial-law",
          label: "\uC720\uD615 4 \xB7 \uAC70\uB4ED\uC81C\uACF1\uACFC \uB2E4\uD56D\uC2DD",
          difficulty: 2,
          generate() {
            const fLimit = randomInteger(-3, 3);
            const quadratic = nonZeroInteger(-3, 3);
            const linear = randomInteger(-4, 4);
            const constant = randomInteger(-5, 5);
            const expression = quadraticExpression(
              quadratic,
              linear,
              constant,
              "f(x)"
            );
            const answer = quadratic * fLimit * fLimit + linear * fLimit + constant;
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to a}f(x)=${fLimit}`
              )}\uC77C \uB54C, ${inlineMath(
                `\\displaystyle\\lim_{x\\to a}\\{${expression}\\}`
              )}\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uAC70\uB4ED\uC81C\uACF1, \uD569\xB7\uCC28, \uC0C1\uC218\uBC30\uC758 \uADF9\uD55C \uC131\uC9C8\uC744 \uCC28\uB840\uB85C \uC801\uC6A9\uD574 ${inlineMath(
                `${quadratic}(${fLimit})^2${linear < 0 ? "" : "+"}${linear}(${fLimit})${constant < 0 ? "" : "+"}${constant}=${answer}`
              )}\uC744 \uC5BB\uC2B5\uB2C8\uB2E4.`,
              hintText: `${inlineMath(
                `f(x)\\to ${fLimit}`
              )}\uC774\uBBC0\uB85C \uC2DD \uC548\uC758 \uBAA8\uB4E0 ${inlineMath(
                "f(x)"
              )}\uB97C ${inlineMath(`(${fLimit})`)}\uB85C \uBC14\uAFC9\uB2C8\uB2E4.
\uD604\uC7AC \uACC4\uC0B0\uC2DD\uC740 ${inlineMath(
                `${quadratic}(${fLimit})^2${linear < 0 ? "" : "+"}${linear}(${fLimit})${constant < 0 ? "" : "+"}${constant}`
              )}\uC785\uB2C8\uB2E4. \uC81C\uACF1\uC744 \uBA3C\uC800 \uACC4\uC0B0\uD558\uC138\uC694.`,
              visualization: null
            };
          }
        },
        {
          id: "rational-direct-substitution",
          label: "\uC720\uD615 5 \xB7 \uC720\uB9AC\uD568\uC218 \uC9C1\uC811 \uB300\uC785",
          difficulty: 1,
          generate() {
            const a = randomInteger(-3, 3);
            const numeratorSlope = nonZeroInteger(-4, 4);
            const numeratorConstant = randomInteger(-5, 5);
            const denominatorSlope = nonZeroInteger(-3, 3);
            let denominatorConstant = randomInteger(-5, 5);
            while (denominatorSlope * a + denominatorConstant === 0) {
              denominatorConstant = randomInteger(-5, 5);
            }
            const numeratorValue = numeratorSlope * a + numeratorConstant;
            const denominatorValue = denominatorSlope * a + denominatorConstant;
            const answer = numeratorValue / denominatorValue;
            const answerTex = fractionTex(
              numeratorValue,
              denominatorValue
            );
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}\\frac{${linearExpression(
                  numeratorSlope,
                  numeratorConstant
                )}}{${linearExpression(
                  denominatorSlope,
                  denominatorConstant
                )}}`
              )}\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBD84\uBAA8\uC5D0 ${inlineMath(`x=${a}`)}\uB97C \uB300\uC785\uD55C \uAC12\uC774 ${inlineMath(String(denominatorValue))}\uB85C 0\uC774 \uC544\uB2C8\uBBC0\uB85C \uC9C1\uC811 \uB300\uC785\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4. \uC815\uB2F5\uC740 ${inlineMath(answerTex)}\uC785\uB2C8\uB2E4.`,
              hintText: `${inlineMath(`x=${a}`)}\uB97C \uB123\uC73C\uBA74 \uBD84\uC790\uB294 ${inlineMath(
                String(numeratorValue)
              )}, \uBD84\uBAA8\uB294 ${inlineMath(
                String(denominatorValue)
              )}\uAC00 \uB429\uB2C8\uB2E4.
\uBD84\uBAA8\uAC00 0\uC774 \uC544\uB2C8\uBBC0\uB85C \uC2DD\uC744 \uBCC0\uD615\uD558\uC9C0 \uB9D0\uACE0 ${inlineMath(
                `\\frac{${numeratorValue}}{${denominatorValue}}`
              )}\uB97C \uC815\uB9AC\uD558\uC138\uC694.`,
              visualization: null,
              validityChecks: [
                {
                  name: "non-zero-substitution-denominator",
                  passed: denominatorValue !== 0,
                  message: "\uC9C1\uC811 \uB300\uC785 \uBB38\uC81C\uC758 \uBD84\uBAA8\uAC00 0\uC774 \uB418\uC5C8\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "difference-of-squares",
          label: "\uC720\uD615 6 \xB7 \uC81C\uACF1\uC758 \uCC28 \uC57D\uBD84",
          difficulty: 2,
          generate() {
            const a = nonZeroInteger(-6, 6);
            const answer = 2 * a;
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}\\frac{x^2-${a ** 2}}{${xMinus(a)}}`
              )}\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `${inlineMath(
                `x^2-${a ** 2}=(${xMinus(a)})(x${a < 0 ? "" : "+"}${a})`
              )}\uB85C \uC778\uC218\uBD84\uD574\uD55C \uB4A4 \uACF5\uD1B5 \uC778\uC790\uB97C \uC57D\uBD84\uD569\uB2C8\uB2E4. \uB0A8\uC740 \uC2DD\uC5D0 ${inlineMath(`x=${a}`)}\uB97C \uB300\uC785\uD558\uBA74 ${inlineMath(String(answer))}\uC785\uB2C8\uB2E4.`,
              hintText: `${inlineMath("A^2-B^2=(A-B)(A+B)")}\uB97C \uC774\uC6A9\uD574 \uBD84\uBAA8\uC640 \uAC19\uC740 \uC778\uC790\uB97C \uCC3E\uC544\uBCF4\uC138\uC694.`,
              visualization: {
                kind: "hole-linear",
                focusX: a,
                slope: 1,
                intercept: a
              }
            };
          }
        },
        {
          id: "expanded-factor-cancellation",
          label: "\uC720\uD615 7 \xB7 \uC774\uCC28\uC2DD \uC778\uC218\uBD84\uD574",
          difficulty: 3,
          generate() {
            const a = nonZeroInteger(-4, 4);
            const slope = nonZeroInteger(-3, 3);
            const constant = randomInteger(-5, 5);
            const quadratic = slope;
            const linear = constant - slope * a;
            const expandedConstant = -a * constant;
            const numerator = quadraticExpression(
              quadratic,
              linear,
              expandedConstant
            );
            const answer = slope * a + constant;
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}\\frac{${numerator}}{${xMinus(a)}}`
              )}\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBD84\uC790\uB97C ${inlineMath(
                `(${xMinus(a)})(${linearExpression(
                  slope,
                  constant
                )})`
              )}\uB85C \uC778\uC218\uBD84\uD574\uD569\uB2C8\uB2E4. \uACF5\uD1B5 \uC778\uC790\uB97C \uC57D\uBD84\uD55C \uB4A4 ${inlineMath(`x=${a}`)}\uB97C \uB300\uC785\uD558\uBA74 \uC815\uB2F5\uC740 ${inlineMath(String(answer))}\uC785\uB2C8\uB2E4.`,
              hintText: `\uBD84\uC790\uC5D0 ${inlineMath(`x=${a}`)}\uB97C \uB300\uC785\uD558\uBA74 0\uC785\uB2C8\uB2E4. \uB530\uB77C\uC11C ${inlineMath(xMinus(a))}\uAC00 \uBD84\uC790\uC758 \uC778\uC218\uC785\uB2C8\uB2E4.`,
              visualization: {
                kind: "hole-linear",
                focusX: a,
                slope,
                intercept: constant
              }
            };
          }
        },
        {
          id: "root-rationalization",
          label: "\uC720\uD615 8 \xB7 \uBB34\uB9AC\uC2DD \uC720\uB9AC\uD654",
          difficulty: 3,
          generate() {
            const root = randomInteger(2, 6);
            const a = root ** 2;
            const answer = 1 / (2 * root);
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}\\frac{\\sqrt{x}-${root}}{x-${a}}`
              )}\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBD84\uC790\uC640 \uBD84\uBAA8\uC5D0 ${inlineMath(
                `\\sqrt{x}+${root}`
              )}\uB97C \uC774\uC6A9\uD574 \uC720\uB9AC\uD654\uD558\uBA74 ${inlineMath(
                `\\frac{1}{\\sqrt{x}+${root}}`
              )}\uC774 \uB429\uB2C8\uB2E4. \uB530\uB77C\uC11C \uC815\uB2F5\uC740 ${inlineMath(
                `\\frac{1}{${2 * root}}`
              )}\uC785\uB2C8\uB2E4.`,
              hintText: "\uBD84\uC790\uC758 \uCF24\uB808\uC2DD\uC744 \uACF1\uD558\uBA74 \uBD84\uC790\uC5D0 \uC788\uB358 \uC81C\uACF1\uADFC\uC758 \uCC28\uAC00 \uBD84\uBAA8\uC640 \uAC19\uC740 \uC778\uC790\uB85C \uBC14\uB01D\uB2C8\uB2E4.",
              visualization: {
                kind: "rationalized-root",
                focusX: a,
                root
              },
              validityChecks: [
                {
                  name: "perfect-square-focus",
                  passed: a === root ** 2 && root > 0,
                  message: "\uC720\uB9AC\uD654 \uBB38\uC81C\uC758 \uC811\uADFC\uC810\uACFC \uC81C\uACF1\uADFC \uC870\uAC74\uC774 \uB9DE\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "parameter-for-finite-limit",
          label: "\uC720\uD615 9 \xB7 \uADF9\uD55C\uAC12\uC73C\uB85C \uB9E4\uAC1C\uBCC0\uC218 \uAD6C\uD558\uAE30",
          difficulty: 3,
          generate() {
            const a = nonZeroInteger(-4, 4);
            const parameter = randomInteger(-5, 5);
            const target = a + parameter;
            const linearCoefficient = a > 0 ? `(m-${a})x` : `(m+${Math.abs(a)})x`;
            const constantTerm = a > 0 ? `-${a}m` : `+${Math.abs(a)}m`;
            const numerator = `x^2+${linearCoefficient}${constantTerm}`;
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}\\frac{${numerator}}{${xMinus(a)}}=${target}`
              )}\uC77C \uB54C, \uC0C1\uC218 ${inlineMath("m")}\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: parameter,
              solution: `\uBD84\uC790\uB294 ${inlineMath(
                `(${xMinus(a)})(x+m)`
              )}\uB85C \uC778\uC218\uBD84\uD574\uB429\uB2C8\uB2E4. \uC57D\uBD84\uD55C \uC2DD\uC758 \uADF9\uD55C\uC740 ${inlineMath(`${a}+m=${target}`)}\uC774\uBBC0\uB85C ${inlineMath(`m=${parameter}`)}\uC785\uB2C8\uB2E4.`,
              hintText: `\uBD84\uC790\uC5D0\uC11C ${inlineMath(xMinus(a))}\uB97C \uC778\uC218\uB85C \uBB36\uC740 \uB4A4, \uC57D\uBD84\uD558\uACE0 \uB0A8\uC740 \uC77C\uCC28\uC2DD\uC758 \uADF9\uD55C\uC744 \uC774\uC6A9\uD558\uC138\uC694.`,
              visualization: {
                kind: "hole-linear",
                focusX: a,
                slope: 1,
                intercept: parameter
              }
            };
          }
        },
        {
          id: "infinity-leading-coefficients",
          label: "\uC720\uD615 10 \xB7 \uBB34\uD55C\uB300\uC5D0\uC11C \uCD5C\uACE0\uCC28\uD56D \uBE44\uAD50",
          difficulty: 3,
          generate() {
            const numeratorLeading = nonZeroInteger(-5, 5);
            const denominatorLeading = nonZeroInteger(-5, 5);
            const numerator = quadraticExpression(
              numeratorLeading,
              randomInteger(-5, 5),
              randomInteger(-5, 5)
            );
            const denominator = quadraticExpression(
              denominatorLeading,
              randomInteger(-5, 5),
              randomInteger(-5, 5)
            );
            const answer = numeratorLeading / denominatorLeading;
            const answerTex = fractionTex(
              numeratorLeading,
              denominatorLeading
            );
            return {
              prompt: `${inlineMath(
                `\\displaystyle\\lim_{x\\to\\infty}\\frac{${numerator}}{${denominator}}`
              )}\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBD84\uC790\uC640 \uBD84\uBAA8\uB97C ${inlineMath("x^2")}\uC73C\uB85C \uB098\uB204\uBA74 \uB0AE\uC740 \uCC28\uC218\uC758 \uD56D\uC740 \uBAA8\uB450 0\uC73C\uB85C \uAC11\uB2C8\uB2E4. \uB530\uB77C\uC11C \uC815\uB2F5\uC740 \uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uC758 \uBE44 ${inlineMath(answerTex)}\uC785\uB2C8\uB2E4.`,
              hintText: `\uBD84\uC790\uC640 \uBD84\uBAA8\uC758 \uCD5C\uACE0\uCC28\uD56D\uC740 \uAC01\uAC01 ${inlineMath(
                `${numeratorLeading}x^2`
              )}, ${inlineMath(
                `${denominatorLeading}x^2`
              )}\uC785\uB2C8\uB2E4.
${inlineMath("x^2")}\uC73C\uB85C \uB098\uB204\uBA74 \uB0AE\uC740 \uCC28\uC218\uC758 \uD56D\uC740 0\uC73C\uB85C \uAC00\uBBC0\uB85C \uACC4\uC218\uC758 \uBE44 ${inlineMath(
                `\\frac{${numeratorLeading}}{${denominatorLeading}}`
              )}\uB9CC \uC815\uB9AC\uD558\uBA74 \uB429\uB2C8\uB2E4.`,
              visualization: null,
              validityChecks: [
                {
                  name: "non-zero-leading-coefficients",
                  passed: numeratorLeading !== 0 && denominatorLeading !== 0,
                  message: "\uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uB294 0\uC77C \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        }
      ];
      module.exports = {
        key: "calculus-limit-properties-calculation",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/calculus1/functionContinuity.js
  var require_functionContinuity = __commonJS({
    "services/problemGenerators/calculus1/functionContinuity.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        isCorrectAnswer,
        inlineMath,
        displayMath,
        signedNumber,
        xMinus,
        linearExpression
      } = require_helpers();
      function yesNoChoices() {
        return [
          {
            key: "yes",
            text: "\uC5F0\uC18D\uC774\uB2E4"
          },
          {
            key: "no",
            text: "\uC5F0\uC18D\uC774 \uC544\uB2C8\uB2E4"
          }
        ];
      }
      function piecewiseDefinition(leftExpression, rightExpression, boundary, rightIncludesBoundary = true) {
        const leftCondition = rightIncludesBoundary ? `x<${boundary}` : `x\\le ${boundary}`;
        const rightCondition = rightIncludesBoundary ? `x\\ge ${boundary}` : `x>${boundary}`;
        return `f(x)=\\begin{cases}${leftExpression},&${leftCondition}\\\\${rightExpression},&${rightCondition}\\end{cases}`;
      }
      var problemTypes = [
        {
          id: "three-continuity-conditions",
          label: "\uC720\uD615 1 \xB7 \uC5F0\uC18D\uC758 \uC138 \uC870\uAC74",
          difficulty: 1,
          generate() {
            const a = randomInteger(-4, 4);
            return {
              prompt: `\uD568\uC218 ${inlineMath("f(x)")}\uAC00 ${inlineMath(
                `x=${a}`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC774\uAE30 \uC704\uD55C \uC870\uAC74\uC73C\uB85C \uC633\uC740 \uAC83\uC744 \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "all-three",
                  text: `${inlineMath(`f(${a})`)}\uAC00 \uC815\uC758\uB418\uACE0, \uADF9\uD55C\uC774 \uC874\uC7AC\uD558\uBA70, ${inlineMath(
                    `\\lim_{x\\to ${a}}f(x)=f(${a})`
                  )}\uC774\uB2E4.`
                },
                {
                  key: "point-only",
                  text: `${inlineMath(`f(${a})`)}\uC758 \uAC12\uB9CC \uC874\uC7AC\uD558\uBA74 \uB41C\uB2E4.`
                },
                {
                  key: "limit-only",
                  text: `\uADF9\uD55C\uAC12\uB9CC \uC874\uC7AC\uD558\uBA74 \uD568\uC218\uAC12\uACFC \uB2EC\uB77C\uB3C4 \uB41C\uB2E4.`
                },
                {
                  key: "one-side",
                  text: `\uC88C\uADF9\uD55C\uACFC \uD568\uC218\uAC12\uB9CC \uAC19\uC73C\uBA74 \uB41C\uB2E4.`
                }
              ],
              answer: "all-three",
              solution: `\uC810\uC5D0\uC11C\uC758 \uC5F0\uC18D\uC740 \uD568\uC218\uAC12\uC758 \uC874\uC7AC, \uC591\uCABD \uADF9\uD55C\uC758 \uC874\uC7AC, \uADF8\uB9AC\uACE0 ${inlineMath(
                `\\lim_{x\\to ${a}}f(x)=f(${a})`
              )}\uB77C\uB294 \uC138 \uC870\uAC74\uC774 \uBAA8\uB450 \uD544\uC694\uD569\uB2C8\uB2E4.`,
              hintText: `${inlineMath(`x=${a}`)}\uC5D0\uC11C \uB2E4\uC74C \uC138 \uD56D\uBAA9\uC744 \uC21C\uC11C\uB300\uB85C \uD655\uC778\uD558\uC138\uC694.
\u2460 ${inlineMath(`f(${a})`)}\uAC00 \uC815\uC758\uB418\uB294\uAC00
\u2461 \uC88C\uADF9\uD55C\uACFC \uC6B0\uADF9\uD55C\uC774 \uAC19\uC740\uAC00
\u2462 \uADF8 \uACF5\uD1B5 \uADF9\uD55C\uAC12\uC774 ${inlineMath(`f(${a})`)}\uC640 \uAC19\uC740\uAC00`,
              visualization: {
                kind: "polynomial",
                focusX: a,
                coefficients: {
                  quadratic: 1,
                  linear: -2 * a,
                  constant: a ** 2
                },
                note: "\uADF8\uB798\uD504\uAC00 \uC774\uC5B4\uC9C0\uACE0, \uC811\uADFC\uD558\uB294 \uB192\uC774\uC640 \uC2E4\uC81C \uC810\uC758 \uB192\uC774\uAC00 \uAC19\uC740\uC9C0 \uD655\uC778\uD558\uC138\uC694."
              }
            };
          }
        },
        {
          id: "judge-from-limit-and-value",
          label: "\uC720\uD615 2 \xB7 \uADF9\uD55C\uACFC \uD568\uC218\uAC12\uC73C\uB85C \uD310\uC815",
          difficulty: 2,
          generate() {
            const a = randomInteger(-3, 3);
            const limitValue = randomInteger(-4, 4);
            const caseIndex = randomInteger(0, 3);
            let leftLimit = limitValue;
            let rightLimit = limitValue;
            let pointValue = limitValue;
            let pointDefined = true;
            let answer = "yes";
            let reason = "\uC88C\uADF9\uD55C, \uC6B0\uADF9\uD55C, \uD568\uC218\uAC12\uC774 \uBAA8\uB450 \uAC19\uC740 \uAC12\uC785\uB2C8\uB2E4.";
            let visualization = {
              kind: "polynomial",
              focusX: a,
              coefficients: {
                quadratic: 0,
                linear: 0,
                constant: limitValue
              }
            };
            if (caseIndex === 1) {
              rightLimit += nonZeroInteger(-3, 3);
              pointValue = randomInteger(-4, 4);
              answer = "no";
              reason = "\uC88C\uADF9\uD55C\uACFC \uC6B0\uADF9\uD55C\uC774 \uB2EC\uB77C \uADF9\uD55C\uC774 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.";
              visualization = {
                kind: "one-sided-limits",
                focusX: a,
                leftLimit,
                rightLimit
              };
            } else if (caseIndex === 2) {
              pointValue += nonZeroInteger(-3, 3);
              answer = "no";
              reason = "\uADF9\uD55C\uAC12\uC740 \uC874\uC7AC\uD558\uC9C0\uB9CC \uD568\uC218\uAC12\uACFC \uB2E4\uB985\uB2C8\uB2E4.";
              visualization = {
                kind: "limit-point-example",
                focusX: a,
                limitValue,
                pointValue
              };
            } else if (caseIndex === 3) {
              pointDefined = false;
              answer = "no";
              reason = "\uADF9\uD55C\uAC12\uC774 \uC874\uC7AC\uD558\uB354\uB77C\uB3C4 \uD568\uC218\uAC12\uC774 \uC815\uC758\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.";
              visualization = {
                kind: "hole-linear",
                focusX: a,
                slope: 0,
                intercept: limitValue
              };
            }
            return {
              prompt: `${inlineMath(
                `\\lim_{x\\to ${a}^{-}}f(x)=${leftLimit}`
              )}, ${inlineMath(
                `\\lim_{x\\to ${a}^{+}}f(x)=${rightLimit}`
              )}\uC774\uACE0, ` + (pointDefined ? `${inlineMath(
                `f(${a})=${pointValue}`
              )}\uC785\uB2C8\uB2E4.` : `${inlineMath(
                `f(${a})`
              )}\uB294 \uC815\uC758\uB418\uC9C0 \uC54A\uC558\uC2B5\uB2C8\uB2E4.`) + ` \uD568\uC218 ${inlineMath("f(x)")}\uB294 ${inlineMath(
                `x=${a}`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC785\uB2C8\uAE4C?`,
              inputMode: "multiple-choice",
              choices: yesNoChoices(),
              answer,
              solution: `${reason} \uB530\uB77C\uC11C ${inlineMath(
                `x=${a}`
              )}\uC5D0\uC11C ${answer === "yes" ? "\uC5F0\uC18D\uC785\uB2C8\uB2E4." : "\uC5F0\uC18D\uC774 \uC544\uB2D9\uB2C8\uB2E4."}`,
              hintText: "\uC88C\uADF9\uD55C\uACFC \uC6B0\uADF9\uD55C\uC744 \uBA3C\uC800 \uBE44\uAD50\uD558\uACE0, \uADF8 \uACF5\uD1B5\uAC12\uC774 \uC2E4\uC81C \uD568\uC218\uAC12\uACFC \uAC19\uC740\uC9C0 \uD655\uC778\uD558\uC138\uC694.",
              visualization
            };
          }
        },
        {
          id: "fill-removable-hole",
          label: "\uC720\uD615 3 \xB7 \uAD6C\uBA4D\uC744 \uBA54\uC6B0\uB294 \uD568\uC218\uAC12",
          difficulty: 2,
          generate() {
            const a = nonZeroInteger(-5, 5);
            const answer = 2 * a;
            const definition = `f(x)=\\begin{cases}\\dfrac{x^2-${a ** 2}}{${xMinus(a)}},&x\\ne ${a}\\\\k,&x=${a}\\end{cases}`;
            return {
              prompt: `${displayMath(definition)}${inlineMath("f(x)")}\uAC00 ${inlineMath(
                `x=${a}`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC774 \uB418\uB3C4\uB85D \uD558\uB294 ${inlineMath("k")}\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `${inlineMath(`x\\ne ${a}`)}\uC5D0\uC11C \uC2DD\uC744 \uC57D\uBD84\uD558\uBA74 ${inlineMath(`f(x)=x${a < 0 ? "" : "+"}${a}`)}\uC785\uB2C8\uB2E4. \uB530\uB77C\uC11C \uADF9\uD55C\uAC12 ${inlineMath(String(answer))}\uACFC \uD568\uC218\uAC12 ${inlineMath("k")}\uAC00 \uAC19\uC544\uC57C \uD558\uBBC0\uB85C ${inlineMath(`k=${answer}`)}\uC785\uB2C8\uB2E4.`,
              hintText: "\uBA3C\uC800 \uBD84\uC790\uB97C \uC81C\uACF1\uC758 \uCC28\uB85C \uC778\uC218\uBD84\uD574\uD574 \uADF9\uD55C\uAC12\uC744 \uAD6C\uD55C \uB4A4, \uADF8 \uAC12\uC744 \uBE48 \uC810\uC5D0 \uCC44\uC6B0\uC138\uC694.",
              visualization: {
                kind: "hole-linear",
                focusX: a,
                slope: 1,
                intercept: a
              }
            };
          }
        },
        {
          id: "piecewise-intercept-parameter",
          label: "\uC720\uD615 4 \xB7 \uC870\uAC01\uD568\uC218\uC758 \uC0C1\uC218\uD56D",
          difficulty: 3,
          generate() {
            const a = randomInteger(-3, 3);
            const leftSlope = nonZeroInteger(-3, 3);
            const leftConstant = randomInteger(-4, 4);
            const rightSlope = nonZeroInteger(-3, 3);
            const leftValue = leftSlope * a + leftConstant;
            const parameter = leftValue - rightSlope * a;
            const rightExpression = rightSlope === 1 ? "x+k" : rightSlope === -1 ? "-x+k" : `${rightSlope}x+k`;
            const definition = piecewiseDefinition(
              linearExpression(
                leftSlope,
                leftConstant
              ),
              rightExpression,
              a
            );
            return {
              prompt: `${displayMath(definition)}${inlineMath("f(x)")}\uAC00 ${inlineMath(
                `x=${a}`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC774 \uB418\uB3C4\uB85D \uD558\uB294 ${inlineMath("k")}\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: parameter,
              solution: `\uC67C\uCABD \uC2DD\uC758 \uADF9\uD55C\uC740 ${inlineMath(
                String(leftValue)
              )}\uC785\uB2C8\uB2E4. \uC624\uB978\uCABD \uC2DD\uACFC \uD568\uC218\uAC12\uB3C4 \uAC19\uC544\uC57C \uD558\uBBC0\uB85C ${inlineMath(
                `${rightSlope}\\times(${a})+k=${leftValue}`
              )}\uC5D0\uC11C ${inlineMath(
                `k=${parameter}`
              )}\uB97C \uC5BB\uC2B5\uB2C8\uB2E4.`,
              hintText: `${inlineMath(`x=${a}`)}\uB97C \uC67C\uCABD \uC2DD\uACFC \uC624\uB978\uCABD \uC2DD\uC5D0 \uAC01\uAC01 \uB300\uC785\uD55C \uAC12\uC774 \uAC19\uC544\uC9C0\uB3C4\uB85D \uC2DD\uC744 \uC138\uC6B0\uC138\uC694.`,
              visualization: {
                kind: "piecewise-linear",
                focusX: a,
                left: {
                  slope: leftSlope,
                  constant: leftConstant
                },
                right: {
                  slope: rightSlope,
                  constant: parameter
                }
              }
            };
          }
        },
        {
          id: "piecewise-slope-parameter",
          label: "\uC720\uD615 5 \xB7 \uC870\uAC01\uD568\uC218\uC758 \uAE30\uC6B8\uAE30",
          difficulty: 3,
          generate() {
            const a = nonZeroInteger(-4, 4);
            const leftSlope = nonZeroInteger(-3, 3);
            const leftConstant = randomInteger(-4, 4);
            const parameter = randomInteger(-4, 4);
            const leftValue = leftSlope * a + leftConstant;
            const rightConstant = leftValue - parameter * a;
            const rightExpression = `mx${signedNumber(rightConstant)}`;
            const definition = piecewiseDefinition(
              linearExpression(
                leftSlope,
                leftConstant
              ),
              rightExpression,
              a
            );
            return {
              prompt: `${displayMath(definition)}${inlineMath("f(x)")}\uAC00 ${inlineMath(
                `x=${a}`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC774 \uB418\uB3C4\uB85D \uD558\uB294 ${inlineMath("m")}\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: parameter,
              solution: `\uC591\uCABD \uC2DD\uC5D0 ${inlineMath(`x=${a}`)}\uB97C \uB300\uC785\uD55C \uAC12\uC774 \uAC19\uC544\uC57C \uD569\uB2C8\uB2E4. ${inlineMath(
                `${leftValue}=${a}m${signedNumber(
                  rightConstant
                )}`
              )}\uC744 \uD480\uBA74 ${inlineMath(
                `m=${parameter}`
              )}\uC785\uB2C8\uB2E4.`,
              hintText: "\uACBD\uACC4\uC758 \uC67C\uCABD \uB192\uC774\uC640 \uC624\uB978\uCABD \uB192\uC774\uAC00 \uAC19\uC544\uC57C \uADF8\uB798\uD504\uAC00 \uB04A\uAE30\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.",
              visualization: {
                kind: "piecewise-linear",
                focusX: a,
                left: {
                  slope: leftSlope,
                  constant: leftConstant
                },
                right: {
                  slope: parameter,
                  constant: rightConstant
                }
              }
            };
          }
        },
        {
          id: "rational-continuity-at-point",
          label: "\uC720\uD615 6 \xB7 \uC720\uB9AC\uD568\uC218\uC758 \uD55C \uC810 \uC5F0\uC18D",
          difficulty: 2,
          generate() {
            const a = randomInteger(-4, 4);
            const isContinuous = Math.random() >= 0.5;
            const excludedPoint = isContinuous ? a + nonZeroInteger(-3, 3) : a;
            const numeratorConstant = randomInteger(-4, 4);
            return {
              prompt: `${inlineMath(
                `f(x)=\\dfrac{x${signedNumber(
                  numeratorConstant
                )}}{${xMinus(excludedPoint)}}`
              )}\uC77C \uB54C, ${inlineMath("f(x)")}\uB294 ${inlineMath(
                `x=${a}`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC785\uB2C8\uAE4C?`,
              inputMode: "multiple-choice",
              choices: yesNoChoices(),
              answer: isContinuous ? "yes" : "no",
              solution: isContinuous ? `${inlineMath(`x=${a}`)}\uC5D0\uC11C \uBD84\uBAA8\uB294 0\uC774 \uC544\uB2C8\uBBC0\uB85C \uC720\uB9AC\uD568\uC218\uB294 \uADF8 \uC810\uC5D0\uC11C \uC5F0\uC18D\uC785\uB2C8\uB2E4.` : `${inlineMath(`x=${a}`)}\uC5D0\uC11C \uBD84\uBAA8\uAC00 0\uC774 \uB418\uC5B4 \uD568\uC218\uAC12\uC774 \uC815\uC758\uB418\uC9C0 \uC54A\uC73C\uBBC0\uB85C \uC5F0\uC18D\uC774 \uC544\uB2D9\uB2C8\uB2E4.`,
              hintText: `\uC720\uB9AC\uD568\uC218\uB294 \uBD84\uBAA8\uAC00 0\uC774 \uC544\uB2CC \uC810\uC5D0\uC11C \uC5F0\uC18D\uC785\uB2C8\uB2E4.
${inlineMath(`x=${a}`)}\uB97C \uBD84\uBAA8\uC5D0 \uB123\uC73C\uBA74 ${inlineMath(
                `(${a})-(${excludedPoint})=${a - excludedPoint}`
              )}\uC785\uB2C8\uB2E4. \uC774 \uAC12\uC774 0\uC778\uC9C0 \uD310\uB2E8\uD558\uC138\uC694.`,
              visualization: {
                kind: "rational-continuity",
                focusX: a,
                pole: excludedPoint,
                numeratorConstant,
                note: isContinuous ? `\uD45C\uC2DC\uD55C x=${a}\uC5D0\uC11C\uB294 \uBD84\uBAA8\uAC00 0\uC774 \uC544\uB2C8\uBBC0\uB85C \uACE1\uC120\uC774 \uC774\uC5B4\uC9D1\uB2C8\uB2E4.` : `x=${excludedPoint}\uC5D0\uC11C\uB294 \uBD84\uBAA8\uAC00 0\uC774 \uB418\uC5B4 \uADF8\uB798\uD504\uAC00 \uB04A\uAE41\uB2C8\uB2E4.`
              },
              validityChecks: [
                {
                  name: "rational-domain-condition",
                  passed: isContinuous === (a !== excludedPoint),
                  message: "\uC720\uB9AC\uD568\uC218\uC758 \uC815\uC758\uC5ED\uACFC \uC5F0\uC18D \uD310\uC815\uC774 \uC77C\uCE58\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "rational-continuity-interval",
          label: "\uC720\uD615 7 \xB7 \uC5F0\uC18D\uC778 \uAD6C\uAC04 \uCC3E\uAE30",
          difficulty: 2,
          generate() {
            const excludedPoint = randomInteger(-4, 4);
            return {
              prompt: `${inlineMath(
                `f(x)=\\dfrac{1}{${xMinus(excludedPoint)}}`
              )}\uAC00 \uAD6C\uAC04 \uC804\uCCB4\uC5D0\uC11C \uC5F0\uC18D\uC778 \uAC83\uC744 \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "safe",
                  text: inlineMath(
                    `[${excludedPoint + 1},${excludedPoint + 3}]`
                  )
                },
                {
                  key: "left-end",
                  text: inlineMath(
                    `[${excludedPoint - 2},${excludedPoint}]`
                  )
                },
                {
                  key: "middle",
                  text: inlineMath(
                    `[${excludedPoint - 1},${excludedPoint + 1}]`
                  )
                },
                {
                  key: "right-end",
                  text: inlineMath(
                    `[${excludedPoint},${excludedPoint + 2}]`
                  )
                }
              ],
              answer: "safe",
              solution: `\uC774 \uD568\uC218\uB294 \uBD84\uBAA8\uAC00 0\uC774 \uB418\uB294 ${inlineMath(
                `x=${excludedPoint}`
              )}\uC5D0\uC11C\uB9CC \uBD88\uC5F0\uC18D\uC785\uB2C8\uB2E4. \uC774 \uC810\uC744 \uD3EC\uD568\uD558\uC9C0 \uC54A\uB294 ${inlineMath(
                `[${excludedPoint + 1},${excludedPoint + 3}]`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC785\uB2C8\uB2E4.`,
              hintText: `\uBD84\uBAA8 ${inlineMath(
                xMinus(excludedPoint)
              )}\uAC00 0\uC774 \uB418\uB294 \uACF3\uC740 ${inlineMath(
                `x=${excludedPoint}`
              )}\uC785\uB2C8\uB2E4.
\uBCF4\uAE30\uC758 \uC591 \uB05D\uC810\uB3C4 \uD3EC\uD568\uD558\uC5EC \uC774 \uAC12\uC744 \uC804\uD600 \uD3EC\uD568\uD558\uC9C0 \uC54A\uB294 \uAD6C\uAC04\uC744 \uCC3E\uC73C\uC138\uC694.`,
              visualization: {
                kind: "rational-continuity",
                focusX: excludedPoint,
                pole: excludedPoint,
                numeratorMode: "constant",
                numeratorValue: 1,
                safeInterval: [
                  excludedPoint + 1,
                  excludedPoint + 3
                ],
                note: "\uC810\uC120\uC73C\uB85C \uD45C\uC2DC\uB41C \uBD84\uBAA8\uC758 \uC601\uC810\uC744 \uD3EC\uD568\uD558\uC9C0 \uC54A\uB294 \uAD6C\uAC04\uC744 \uCC3E\uC73C\uC138\uC694."
              },
              validityChecks: [
                {
                  name: "unique-safe-interval",
                  passed: !(excludedPoint >= excludedPoint + 1 && excludedPoint <= excludedPoint + 3) && excludedPoint >= excludedPoint - 2 && excludedPoint <= excludedPoint && excludedPoint >= excludedPoint - 1 && excludedPoint <= excludedPoint + 1 && excludedPoint >= excludedPoint && excludedPoint <= excludedPoint + 2,
                  message: "\uC5F0\uC18D\uC778 \uAD6C\uAC04 \uBCF4\uAE30\uC5D0 \uC815\uB2F5\uC774 \uD558\uB098\uB85C \uACB0\uC815\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "endpoint-continuity",
          label: "\uC720\uD615 8 \xB7 \uB2EB\uD78C\uAD6C\uAC04\uC758 \uB05D\uC810",
          difficulty: 2,
          generate() {
            const a = randomInteger(-5, 0);
            const b = randomInteger(1, 6);
            return {
              prompt: `\uD568\uC218 ${inlineMath("f(x)")}\uAC00 ${inlineMath(
                `(${a},${b})`
              )}\uC758 \uBAA8\uB4E0 \uC810\uC5D0\uC11C \uC5F0\uC18D\uC774\uACE0, ${inlineMath(
                `\\lim_{x\\to ${a}^{+}}f(x)=f(${a})`
              )}, ${inlineMath(
                `\\lim_{x\\to ${b}^{-}}f(x)=f(${b})`
              )}\uC785\uB2C8\uB2E4. \uC5F0\uC18D\uC778 \uAD6C\uAC04\uC744 \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "closed",
                  text: inlineMath(`[${a},${b}]`)
                },
                {
                  key: "open",
                  text: inlineMath(`(${a},${b})`)
                },
                {
                  key: "left-open",
                  text: inlineMath(`(${a},${b}]`)
                },
                {
                  key: "right-open",
                  text: inlineMath(`[${a},${b})`)
                }
              ],
              answer: "closed",
              solution: `\uAD6C\uAC04 \uB0B4\uBD80\uC5D0\uC11C \uC5F0\uC18D\uC774\uACE0, \uC67C\uCABD \uB05D\uC810\uC5D0\uC11C\uB294 \uC6B0\uADF9\uD55C\uC774, \uC624\uB978\uCABD \uB05D\uC810\uC5D0\uC11C\uB294 \uC88C\uADF9\uD55C\uC774 \uAC01\uAC01 \uD568\uC218\uAC12\uACFC \uAC19\uC2B5\uB2C8\uB2E4. \uB530\uB77C\uC11C ${inlineMath(`[${a},${b}]`)}\uC5D0\uC11C \uC5F0\uC18D\uC785\uB2C8\uB2E4.`,
              hintText: `\uB0B4\uBD80 ${inlineMath(
                `(${a},${b})`
              )}\uC5D0\uC11C\uB294 \uC774\uBBF8 \uC5F0\uC18D\uC785\uB2C8\uB2E4.
\uC67C\uCABD \uB05D ${inlineMath(`x=${a}`)}\uC5D0\uC11C\uB294 \uC6B0\uADF9\uD55C\uC744, \uC624\uB978\uCABD \uB05D ${inlineMath(`x=${b}`)}\uC5D0\uC11C\uB294 \uC88C\uADF9\uD55C\uC744 \uD655\uC778\uD588\uC73C\uBBC0\uB85C \uB450 \uB05D\uC810\uC744 \uD3EC\uD568\uD560 \uC218 \uC788\uB294\uC9C0 \uD310\uB2E8\uD558\uC138\uC694.`,
              visualization: {
                kind: "continuous-interval",
                focusX: (a + b) / 2,
                left: a,
                right: b,
                leftValue: 1,
                midpoint: (a + b) / 2,
                midpointValue: -1,
                rightValue: 2,
                note: "\uAD6C\uAC04 \uC548\uC758 \uACE1\uC120\uACFC \uB450 \uB05D\uC810\uC774 \uBAA8\uB450 \uC774\uC5B4\uC838 \uB2EB\uD78C\uAD6C\uAC04 \uC804\uCCB4\uAC00 \uC5F0\uACB0\uB429\uB2C8\uB2E4."
              }
            };
          }
        },
        {
          id: "classify-discontinuity",
          label: "\uC720\uD615 9 \xB7 \uBD88\uC5F0\uC18D \uC720\uD615 \uD310\uBCC4",
          difficulty: 2,
          generate() {
            const a = randomInteger(-3, 3);
            const limitValue = randomInteger(-4, 4);
            const caseIndex = randomInteger(0, 2);
            let rightLimit = limitValue;
            let pointValue = limitValue;
            let answer = "continuous";
            let visualization = {
              kind: "polynomial",
              focusX: a,
              coefficients: {
                quadratic: 0,
                linear: 0,
                constant: limitValue
              }
            };
            if (caseIndex === 1) {
              pointValue += nonZeroInteger(-3, 3);
              answer = "removable";
              visualization = {
                kind: "limit-point-example",
                focusX: a,
                limitValue,
                pointValue
              };
            } else if (caseIndex === 2) {
              rightLimit += nonZeroInteger(-3, 3);
              answer = "jump";
              visualization = {
                kind: "one-sided-limits",
                focusX: a,
                leftLimit: limitValue,
                rightLimit
              };
            }
            return {
              prompt: `${inlineMath(
                `\\lim_{x\\to ${a}^{-}}f(x)=${limitValue}`
              )}, ${inlineMath(
                `\\lim_{x\\to ${a}^{+}}f(x)=${rightLimit}`
              )}, ${inlineMath(
                `f(${a})=${pointValue}`
              )}\uC77C \uB54C ${inlineMath(`x=${a}`)}\uC5D0\uC11C\uC758 \uC0C1\uD0DC\uB97C \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "continuous",
                  text: "\uC5F0\uC18D"
                },
                {
                  key: "removable",
                  text: "\uC81C\uAC70 \uAC00\uB2A5\uD55C \uBD88\uC5F0\uC18D"
                },
                {
                  key: "jump",
                  text: "\uC810\uD504 \uBD88\uC5F0\uC18D"
                }
              ],
              answer,
              solution: answer === "continuous" ? "\uC88C\uADF9\uD55C, \uC6B0\uADF9\uD55C, \uD568\uC218\uAC12\uC774 \uBAA8\uB450 \uAC19\uC73C\uBBC0\uB85C \uC5F0\uC18D\uC785\uB2C8\uB2E4." : answer === "removable" ? "\uC591\uCABD \uADF9\uD55C\uC740 \uAC19\uC9C0\uB9CC \uD568\uC218\uAC12\uB9CC \uB2E4\uB974\uBBC0\uB85C \uADF8 \uC810\uC758 \uAC12\uC744 \uBC14\uAFB8\uBA74 \uC5F0\uC18D\uC774 \uB418\uB294 \uC81C\uAC70 \uAC00\uB2A5\uD55C \uBD88\uC5F0\uC18D\uC785\uB2C8\uB2E4." : "\uC88C\uADF9\uD55C\uACFC \uC6B0\uADF9\uD55C\uC774 \uC11C\uB85C \uB2EC\uB77C \uADF8\uB798\uD504\uAC00 \uB6F0\uC5B4\uC624\uB974\uB294 \uC810\uD504 \uBD88\uC5F0\uC18D\uC785\uB2C8\uB2E4.",
              hintText: "\uBA3C\uC800 \uC591\uCABD \uADF9\uD55C\uC774 \uAC19\uC740\uC9C0 \uBCF4\uACE0, \uAC19\uB2E4\uBA74 \uD568\uC218\uAC12\uAE4C\uC9C0 \uC77C\uCE58\uD558\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694.",
              visualization
            };
          }
        },
        {
          id: "continuity-from-table",
          label: "\uC720\uD615 10 \xB7 \uD45C\uC5D0\uC11C \uC5F0\uC18D \uD310\uC815",
          difficulty: 2,
          generate() {
            const a = randomInteger(-2, 2);
            const target = randomInteger(-4, 4);
            const isContinuous = Math.random() >= 0.5;
            const pointValue = isContinuous ? target : target + nonZeroInteger(-3, 3);
            const xValues = [
              a - 0.1,
              a - 0.01,
              a,
              a + 0.01,
              a + 0.1
            ];
            const yValues = [
              target - 0.1,
              target - 0.01,
              pointValue,
              target + 0.01,
              target + 0.1
            ];
            const table = displayMath(
              `\\begin{array}{c|ccccc}x&${xValues.join("&")}\\\\f(x)&${yValues.map((value) => value.toFixed(2)).join("&")}\\end{array}`
            );
            return {
              prompt: `${table}\uD45C\uB97C \uBC14\uD0D5\uC73C\uB85C ${inlineMath("f(x)")}\uAC00 ${inlineMath(
                `x=${a}`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC778\uC9C0 \uD310\uB2E8\uD558\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: yesNoChoices(),
              answer: isContinuous ? "yes" : "no",
              solution: `\uC8FC\uBCC0\uC758 \uD568\uC218\uAC12\uC740 \uC591\uCABD\uC5D0\uC11C ${inlineMath(
                String(target)
              )}\uC5D0 \uAC00\uAE4C\uC6CC\uC9C0\uACE0, ${inlineMath(
                `f(${a})=${pointValue}`
              )}\uC785\uB2C8\uB2E4. \uB530\uB77C\uC11C ` + (isContinuous ? "\uADF9\uD55C\uAC12\uACFC \uD568\uC218\uAC12\uC774 \uAC19\uC544 \uC5F0\uC18D\uC785\uB2C8\uB2E4." : "\uADF9\uD55C\uAC12\uACFC \uD568\uC218\uAC12\uC774 \uB2EC\uB77C \uC5F0\uC18D\uC774 \uC544\uB2D9\uB2C8\uB2E4."),
              hintText: `${inlineMath(`x=${a}`)}\uC778 \uC5F4\uC744 \uC7A0\uC2DC \uAC00\uB9AC\uACE0 \uC591\uCABD \uAC12\uC774 \uD5A5\uD558\uB294 \uB192\uC774\uB97C \uCC3E\uC740 \uB4A4, \uAC00\uC6B4\uB370 \uD568\uC218\uAC12\uACFC \uBE44\uAD50\uD558\uC138\uC694.`,
              visualization: {
                kind: "limit-point-example",
                focusX: a,
                limitValue: target,
                pointValue
              }
            };
          }
        }
      ];
      module.exports = {
        key: "calculus-function-continuity",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/calculus1/continuousFunctionProperties.js
  var require_continuousFunctionProperties = __commonJS({
    "services/problemGenerators/calculus1/continuousFunctionProperties.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        isCorrectAnswer,
        inlineMath,
        displayMath,
        signedNumber,
        xMinus
      } = require_helpers();
      function guaranteedChoices() {
        return [
          {
            key: "guaranteed",
            text: "\uC874\uC7AC\uAC00 \uBCF4\uC7A5\uB41C\uB2E4"
          },
          {
            key: "not-guaranteed",
            text: "\uC874\uC7AC\uAC00 \uBCF4\uC7A5\uB418\uC9C0 \uC54A\uB294\uB2E4"
          }
        ];
      }
      var problemTypes = [
        {
          id: "algebra-of-continuous-functions",
          label: "\uC720\uD615 1 \xB7 \uC5F0\uC18D\uD568\uC218\uC758 \uC0AC\uCE59\uC5F0\uC0B0",
          difficulty: 1,
          generate() {
            const a = randomInteger(-4, 4);
            return {
              prompt: `\uB450 \uD568\uC218 ${inlineMath("f(x)")}, ${inlineMath(
                "g(x)"
              )}\uAC00 \uBAA8\uB450 ${inlineMath(
                `x=${a}`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC77C \uB54C, \uC633\uC740 \uC124\uBA85\uC744 \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "sum-product",
                  text: `${inlineMath("f(x)+g(x)")}\uC640 ${inlineMath("f(x)g(x)")}\uB294 \uBAA8\uB450 \uC5F0\uC18D\uC774\uB2E4.`
                },
                {
                  key: "quotient-always",
                  text: `${inlineMath(
                    "\\dfrac{f(x)}{g(x)}"
                  )}\uB294 ${inlineMath(`g(${a})=0`)}\uC774\uC5B4\uB3C4 \uD56D\uC0C1 \uC5F0\uC18D\uC774\uB2E4.`
                },
                {
                  key: "difference-never",
                  text: `${inlineMath("f(x)-g(x)")}\uB294 \uD56D\uC0C1 \uBD88\uC5F0\uC18D\uC774\uB2E4.`
                },
                {
                  key: "reciprocal-always",
                  text: `${inlineMath(
                    "\\dfrac{1}{f(x)}"
                  )}\uB294 \uD568\uC218\uAC12\uACFC \uAD00\uACC4\uC5C6\uC774 \uD56D\uC0C1 \uC5F0\uC18D\uC774\uB2E4.`
                }
              ],
              answer: "sum-product",
              solution: "\uC5F0\uC18D\uD568\uC218\uC758 \uD569, \uCC28, \uACF1\uC740 \uC5F0\uC18D\uC785\uB2C8\uB2E4. \uBAAB\uACFC \uC5ED\uC218\uB294 \uD574\uB2F9 \uC810\uC5D0\uC11C \uBD84\uBAA8\uAC00 0\uC774 \uC544\uB2C8\uB77C\uB294 \uC870\uAC74\uC774 \uCD94\uAC00\uB85C \uD544\uC694\uD569\uB2C8\uB2E4.",
              hintText: `${inlineMath(`x=${a}`)}\uC5D0\uC11C \uC5F0\uC18D\uC778 \uB450 \uD568\uC218\uC758 \uD569\xB7\uCC28\xB7\uACF1\uC740 \uCD94\uAC00 \uC870\uAC74 \uC5C6\uC774 \uC5F0\uC18D\uC785\uB2C8\uB2E4.
\uBCF4\uAE30 \uC911 \uBD84\uBAA8\uAC00 \uC0DD\uAE30\uB294 \uBAAB\uC774\uB098 \uC5ED\uC218\uC5D0\uB294 \uBD84\uBAA8\uC758 \uD568\uC218\uAC12\uC774 0\uC774 \uC544\uB2C8\uB77C\uB294 \uC870\uAC74\uC774 \uBE60\uC84C\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694.`,
              visualization: {
                kind: "limit-law-combination",
                focusX: a,
                fLimit: 2,
                gLimit: -1,
                resultLimit: 1,
                note: "\uC5F0\uC18D\uC778 \uB450 \uACE1\uC120\uC740 \uAC19\uC740 x\uC5D0\uC11C \uD569\xB7\uCC28\xB7\uACF1\uC744 \uD574\uB3C4 \uB04A\uAE30\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
              }
            };
          }
        },
        {
          id: "quotient-continuity-condition",
          label: "\uC720\uD615 2 \xB7 \uBAAB\uC758 \uC5F0\uC18D \uC870\uAC74",
          difficulty: 2,
          generate() {
            const a = randomInteger(-4, 4);
            const fValue = randomInteger(-5, 5);
            const denominatorIsZero = Math.random() >= 0.5;
            const gValue = denominatorIsZero ? 0 : nonZeroInteger(-5, 5);
            return {
              prompt: `${inlineMath("f(x)")}, ${inlineMath(
                "g(x)"
              )}\uAC00 ${inlineMath(`x=${a}`)}\uC5D0\uC11C \uC5F0\uC18D\uC774\uACE0 ${inlineMath(`f(${a})=${fValue}`)}, ${inlineMath(`g(${a})=${gValue}`)}\uC785\uB2C8\uB2E4. ${inlineMath(
                `h(x)=\\dfrac{f(x)}{g(x)}`
              )}\uAC00 ${inlineMath(`x=${a}`)}\uC5D0\uC11C \uC5F0\uC18D\uC778\uC9C0 \uD310\uB2E8\uD558\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "continuous",
                  text: "\uC5F0\uC18D\uC774\uB2E4"
                },
                {
                  key: "not-continuous",
                  text: "\uC5F0\uC18D\uC774 \uC544\uB2C8\uB2E4"
                }
              ],
              answer: denominatorIsZero ? "not-continuous" : "continuous",
              solution: denominatorIsZero ? `${inlineMath(`g(${a})=0`)}\uC774\uBBC0\uB85C \uBAAB\uC774 \uADF8 \uC810\uC5D0\uC11C \uC815\uC758\uB418\uC9C0 \uC54A\uC544 \uC5F0\uC18D\uC774 \uC544\uB2D9\uB2C8\uB2E4.` : `${inlineMath(`g(${a})=${gValue}\\ne0`)}\uC774\uBBC0\uB85C \uC5F0\uC18D\uD568\uC218\uC758 \uBAAB\uB3C4 \uADF8 \uC810\uC5D0\uC11C \uC5F0\uC18D\uC785\uB2C8\uB2E4.`,
              hintText: `\uBD84\uC790 ${inlineMath(
                `f(${a})=${fValue}`
              )}\uBCF4\uB2E4 \uBD84\uBAA8\uB97C \uBA3C\uC800 \uBD05\uB2C8\uB2E4.
\uD604\uC7AC ${inlineMath(
                `g(${a})=${gValue}`
              )}\uC774\uBBC0\uB85C \uC774 \uAC12\uC774 0\uC778\uC9C0 \uD655\uC778\uD574 \uBAAB\uC758 \uC5F0\uC18D \uC131\uC9C8\uC744 \uC801\uC6A9\uD560 \uC218 \uC788\uB294\uC9C0 \uD310\uB2E8\uD558\uC138\uC694.`,
              visualization: {
                kind: "rational-continuity",
                focusX: a,
                pole: denominatorIsZero ? a : a + (a < 3 ? 2 : -2),
                numeratorConstant: fValue,
                note: denominatorIsZero ? "\uBD84\uBAA8\uAC00 0\uC778 \uD45C\uC2DC\uC810\uC5D0\uC11C\uB294 \uBAAB\uC758 \uADF8\uB798\uD504\uAC00 \uC815\uC758\uB418\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4." : "\uD45C\uC2DC\uC810\uC5D0\uC11C \uBD84\uBAA8\uAC00 0\uC774 \uC544\uB2C8\uBBC0\uB85C \uBAAB\uC758 \uADF8\uB798\uD504\uAC00 \uC774\uC5B4\uC9D1\uB2C8\uB2E4."
              }
            };
          }
        },
        {
          id: "composition-continuity",
          label: "\uC720\uD615 3 \xB7 \uD569\uC131\uD568\uC218\uC758 \uC5F0\uC18D",
          difficulty: 2,
          generate() {
            const a = randomInteger(-3, 3);
            const b = randomInteger(-4, 4);
            const value = randomInteger(-6, 6);
            return {
              prompt: `${inlineMath("g(x)")}\uAC00 ${inlineMath(
                `x=${a}`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC774\uACE0 ${inlineMath(`g(${a})=${b}`)}, ${inlineMath("f(x)")}\uAC00 ${inlineMath(
                `x=${b}`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC774\uBA70 ${inlineMath(`f(${b})=${value}`)}\uC785\uB2C8\uB2E4. ${inlineMath(
                `\\displaystyle\\lim_{x\\to ${a}}f(g(x))`
              )}\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: value,
              solution: `\uC5F0\uC18D\uC131\uC5D0 \uC758\uD574 ${inlineMath(
                `\\lim_{x\\to ${a}}g(x)=g(${a})=${b}`
              )}\uC774\uACE0, \uB2E4\uC2DC ${inlineMath("f")}\uC758 \uC5F0\uC18D\uC131\uC744 \uC801\uC6A9\uD558\uBA74 ${inlineMath(
                `\\lim_{x\\to ${a}}f(g(x))=f(${b})=${value}`
              )}\uC785\uB2C8\uB2E4.`,
              hintText: `\uC548\uCABD \uD568\uC218\uBD80\uD130 \uBCF4\uBA74 \uC5F0\uC18D\uC131\uC5D0 \uC758\uD574 ${inlineMath(
                `g(x)\\to g(${a})=${b}`
              )}\uC785\uB2C8\uB2E4.
\uB530\uB77C\uC11C \uBC14\uAE65 \uD568\uC218\uC758 \uC785\uB825\uC740 ${inlineMath(
                String(b)
              )}\uAC00 \uB418\uACE0, \uBB38\uC81C\uC5D0 \uC8FC\uC5B4\uC9C4 ${inlineMath(
                `f(${b})=${value}`
              )}\uB97C \uC774\uC6A9\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.`,
              visualization: {
                kind: "continuous-interval",
                focusX: a,
                left: a - 2,
                right: a + 2,
                leftValue: value - 2,
                midpoint: a,
                midpointValue: value,
                rightValue: value + 2,
                target: value,
                note: "\uC548\uCABD \uD568\uC218\uAC00 b\uB85C \uB2E4\uAC00\uAC00\uBA74 \uBC14\uAE65 \uC5F0\uC18D\uD568\uC218\uC758 \uAC12\uC740 f(b)\uB85C \uC774\uC5B4\uC9D1\uB2C8\uB2E4."
              }
            };
          }
        },
        {
          id: "extreme-value-theorem",
          label: "\uC720\uD615 4 \xB7 \uCD5C\uB300\xB7\uCD5C\uC18C \uC815\uB9AC",
          difficulty: 1,
          generate() {
            const a = randomInteger(-5, -1);
            const b = randomInteger(1, 5);
            return {
              prompt: `\uD568\uC218 ${inlineMath("f(x)")}\uAC00 \uB2EB\uD78C\uAD6C\uAC04 ${inlineMath(
                `[${a},${b}]`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC77C \uB54C \uBC18\uB4DC\uC2DC \uBCF4\uC7A5\uB418\uB294 \uAC83\uC744 \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "both-extremes",
                  text: "\uCD5C\uB313\uAC12\uACFC \uCD5C\uC19F\uAC12\uC744 \uBAA8\uB450 \uAC16\uB294\uB2E4."
                },
                {
                  key: "increasing",
                  text: "\uAD6C\uAC04 \uC804\uCCB4\uC5D0\uC11C \uC99D\uAC00\uD55C\uB2E4."
                },
                {
                  key: "one-root",
                  text: "\uBC29\uC815\uC2DD f(x)=0\uC758 \uD574\uB97C \uC815\uD655\uD788 \uD558\uB098 \uAC16\uB294\uB2E4."
                },
                {
                  key: "endpoints",
                  text: "\uCD5C\uB313\uAC12\uACFC \uCD5C\uC19F\uAC12\uC744 \uBAA8\uB450 \uB05D\uC810\uC5D0\uC11C \uAC16\uB294\uB2E4."
                }
              ],
              answer: "both-extremes",
              solution: "\uB2EB\uD78C\uAD6C\uAC04\uC5D0\uC11C \uC5F0\uC18D\uC778 \uD568\uC218\uB294 \uCD5C\uB300\xB7\uCD5C\uC18C \uC815\uB9AC\uC5D0 \uC758\uD574 \uADF8 \uAD6C\uAC04\uC5D0\uC11C \uCD5C\uB313\uAC12\uACFC \uCD5C\uC19F\uAC12\uC744 \uBAA8\uB450 \uAC16\uC2B5\uB2C8\uB2E4.",
              hintText: `\uC870\uAC74\uC740 \u201C${inlineMath(
                `[${a},${b}]`
              )}\uB77C\uB294 \uB2EB\uD78C\uAD6C\uAC04\u201D\uACFC \u201C\uADF8 \uAD6C\uAC04\uC5D0\uC11C \uC5F0\uC18D\u201D\uC785\uB2C8\uB2E4.
\uCD5C\uB300\xB7\uCD5C\uC18C \uC815\uB9AC\uAC00 \uC815\uD655\uD788 \uBCF4\uC7A5\uD558\uB294 \uAC83\uC740 \uAC12\uC758 \uC704\uCE58\uB098 \uADFC\uC758 \uAC1C\uC218\uAC00 \uC544\uB2C8\uB77C \uCD5C\uB313\uAC12\uACFC \uCD5C\uC19F\uAC12\uC758 \uC874\uC7AC\uC785\uB2C8\uB2E4.`,
              visualization: {
                kind: "continuous-interval",
                focusX: (a + b) / 2,
                left: a,
                right: b,
                leftValue: 1,
                midpoint: (a + b) / 2,
                midpointValue: -2,
                rightValue: 2,
                note: "\uB2EB\uD78C\uAD6C\uAC04\uC758 \uC5F0\uC18D\uC778 \uACE1\uC120\uC5D0\uB294 \uAC00\uC7A5 \uB192\uC740 \uC810\uACFC \uAC00\uC7A5 \uB0AE\uC740 \uC810\uC774 \uBAA8\uB450 \uC874\uC7AC\uD569\uB2C8\uB2E4."
              }
            };
          }
        },
        {
          id: "quadratic-extreme-value",
          label: "\uC720\uD615 5 \xB7 \uB2EB\uD78C\uAD6C\uAC04\uC758 \uCD5C\uB300\xB7\uCD5C\uC18C \uACC4\uC0B0",
          difficulty: 2,
          generate() {
            const vertexX = randomInteger(-3, 3);
            const vertexY = randomInteger(-4, 4);
            const leftDistance = randomInteger(1, 4);
            const rightDistance = randomInteger(1, 4);
            const intervalStart = vertexX - leftDistance;
            const intervalEnd = vertexX + rightDistance;
            const asksMaximum = Math.random() >= 0.5;
            const minimum = vertexY;
            const maximum = vertexY + Math.max(
              leftDistance ** 2,
              rightDistance ** 2
            );
            const answer = asksMaximum ? maximum : minimum;
            return {
              prompt: `${inlineMath(
                `f(x)=(${xMinus(vertexX)})^2${signedNumber(
                  vertexY
                )}`
              )}\uC77C \uB54C, \uB2EB\uD78C\uAD6C\uAC04 ${inlineMath(
                `[${intervalStart},${intervalEnd}]`
              )}\uC5D0\uC11C\uC758 ${asksMaximum ? "\uCD5C\uB313\uAC12" : "\uCD5C\uC19F\uAC12"}\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uAF2D\uC9D3\uC810\uC740 ${inlineMath(
                `(${vertexX},${vertexY})`
              )}\uC774\uBBC0\uB85C \uCD5C\uC19F\uAC12\uC740 ${inlineMath(
                String(minimum)
              )}\uC785\uB2C8\uB2E4. \uB450 \uB05D\uC810\uC758 \uD568\uC218\uAC12\uB3C4 \uBE44\uAD50\uD558\uBA74 \uCD5C\uB313\uAC12\uC740 ${inlineMath(String(maximum))}\uC785\uB2C8\uB2E4. \uB530\uB77C\uC11C \uBB3C\uC740 \uAC12\uC740 ${inlineMath(String(answer))}\uC785\uB2C8\uB2E4.`,
              hintText: "\uC704\uB85C \uC5F4\uB9B0 \uD3EC\uBB3C\uC120\uC774\uBBC0\uB85C \uAF2D\uC9D3\uC810\uACFC \uB2EB\uD78C\uAD6C\uAC04\uC758 \uB450 \uB05D\uC810, \uCD1D \uC138 \uACF3\uC758 \uB192\uC774\uB97C \uBE44\uAD50\uD558\uC138\uC694.",
              visualization: {
                kind: "polynomial",
                focusX: vertexX,
                coefficients: {
                  quadratic: 1,
                  linear: -2 * vertexX,
                  constant: vertexX ** 2 + vertexY
                }
              }
            };
          }
        },
        {
          id: "intermediate-target-value",
          label: "\uC720\uD615 6 \xB7 \uC911\uAC04\uAC12\uC758 \uC874\uC7AC \uD310\uC815",
          difficulty: 2,
          generate() {
            const a = randomInteger(-5, -1);
            const b = randomInteger(1, 5);
            const firstValue = randomInteger(-6, 0);
            const secondValue = randomInteger(2, 8);
            const isBetween = Math.random() >= 0.5;
            const target = isBetween ? randomInteger(
              firstValue + 1,
              secondValue - 1
            ) : secondValue + randomInteger(1, 4);
            return {
              prompt: `${inlineMath("f(x)")}\uAC00 ${inlineMath(
                `[${a},${b}]`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC774\uACE0, ${inlineMath(
                `f(${a})=${firstValue}`
              )}, ${inlineMath(
                `f(${b})=${secondValue}`
              )}\uC785\uB2C8\uB2E4. ${inlineMath(
                `f(c)=${target}`
              )}\uC778 ${inlineMath(`c\\in(${a},${b})`)}\uC758 \uC874\uC7AC\uAC00 \uC0AC\uC787\uAC12 \uC815\uB9AC\uB85C \uBCF4\uC7A5\uB429\uB2C8\uAE4C?`,
              inputMode: "multiple-choice",
              choices: guaranteedChoices(),
              answer: isBetween ? "guaranteed" : "not-guaranteed",
              solution: isBetween ? `${inlineMath(String(target))}\uC740 \uB450 \uB05D\uC810\uC758 \uD568\uC218\uAC12 ${inlineMath(String(firstValue))}\uACFC ${inlineMath(
                String(secondValue)
              )} \uC0AC\uC774\uC5D0 \uC788\uC73C\uBBC0\uB85C \uC874\uC7AC\uAC00 \uBCF4\uC7A5\uB429\uB2C8\uB2E4.` : `${inlineMath(String(target))}\uC740 \uB450 \uB05D\uC810\uC758 \uD568\uC218\uAC12 \uC0AC\uC774\uC5D0 \uC788\uC9C0 \uC54A\uC73C\uBBC0\uB85C \uC0AC\uC787\uAC12 \uC815\uB9AC\uB9CC\uC73C\uB85C\uB294 \uC874\uC7AC\uB97C \uBCF4\uC7A5\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.`,
              hintText: `\uB450 \uB05D\uC810\uC758 \uB192\uC774\uB294 ${inlineMath(
                String(firstValue)
              )}\uC640 ${inlineMath(
                String(secondValue)
              )}\uC774\uACE0 \uBAA9\uD45C \uB192\uC774\uB294 ${inlineMath(
                String(target)
              )}\uC785\uB2C8\uB2E4.
${inlineMath(
                `${firstValue}<${target}<${secondValue}`
              )}\uAC00 \uC131\uB9BD\uD558\uB294\uC9C0 \uADF8\uB300\uB85C \uBE44\uAD50\uD558\uC138\uC694.`,
              visualization: {
                kind: "continuous-interval",
                focusX: (a + b) / 2,
                left: a,
                right: b,
                leftValue: firstValue,
                rightValue: secondValue,
                target,
                note: isBetween ? "\uBAA9\uD45C \uB192\uC774\uAC00 \uB450 \uB05D\uAC12 \uC0AC\uC774\uC5D0 \uC788\uC5B4 \uC5F0\uC18D\uC778 \uACE1\uC120\uACFC \uB9CC\uB0A9\uB2C8\uB2E4." : "\uBAA9\uD45C \uB192\uC774\uAC00 \uB450 \uB05D\uAC12 \uBC14\uAE65\uC5D0 \uC788\uC5B4 \uC0AC\uC787\uAC12 \uC815\uB9AC\uB9CC\uC73C\uB85C \uAD50\uC810\uC744 \uBCF4\uC7A5\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4."
              },
              validityChecks: [
                {
                  name: "intermediate-target-condition",
                  passed: isBetween ? firstValue < target && target < secondValue : target < firstValue || target > secondValue,
                  message: "\uBAA9\uD45C\uAC12\uC774 \uC758\uB3C4\uD55C \uC0AC\uC787\uAC12 \uBC94\uC704\uC640 \uB9DE\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "root-from-sign-change",
          label: "\uC720\uD615 7 \xB7 \uBD80\uD638 \uBCC0\uD654\uC640 \uADFC\uC758 \uC874\uC7AC",
          difficulty: 2,
          generate() {
            const a = randomInteger(-5, -1);
            const b = randomInteger(1, 5);
            const firstValue = -randomInteger(1, 6);
            const secondValue = randomInteger(1, 6);
            return {
              prompt: `${inlineMath("f(x)")}\uAC00 ${inlineMath(
                `[${a},${b}]`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC774\uACE0 ${inlineMath(
                `f(${a})=${firstValue}`
              )}, ${inlineMath(
                `f(${b})=${secondValue}`
              )}\uC77C \uB54C \uBC18\uB4DC\uC2DC \uC633\uC740 \uAC83\uC744 \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "root-exists",
                  text: `${inlineMath(`f(c)=0`)}\uC778 ${inlineMath(`c\\in(${a},${b})`)}\uAC00 \uC801\uC5B4\uB3C4 \uD558\uB098 \uC874\uC7AC\uD55C\uB2E4.`
                },
                {
                  key: "one-root",
                  text: "\uADFC\uC774 \uC815\uD655\uD788 \uD558\uB098\uB9CC \uC874\uC7AC\uD55C\uB2E4."
                },
                {
                  key: "no-root",
                  text: "\uAD6C\uAC04 \uC548\uC5D0 \uADFC\uC774 \uC874\uC7AC\uD558\uC9C0 \uC54A\uB294\uB2E4."
                },
                {
                  key: "endpoint-root",
                  text: "\uB450 \uB05D\uC810 \uC911 \uD558\uB098\uAC00 \uBC18\uB4DC\uC2DC \uADFC\uC774\uB2E4."
                }
              ],
              answer: "root-exists",
              solution: `\uB05D\uC810\uC758 \uD568\uC218\uAC12 \uBD80\uD638\uAC00 \uC11C\uB85C \uB2E4\uB974\uACE0 \uD568\uC218\uAC00 \uC5F0\uC18D\uC774\uBBC0\uB85C, \uC0AC\uC787\uAC12 \uC815\uB9AC\uC5D0 \uC758\uD574 ${inlineMath(
                `f(c)=0`
              )}\uC778 \uC810\uC774 \uC5F4\uB9B0\uAD6C\uAC04 \uC548\uC5D0 \uC801\uC5B4\uB3C4 \uD558\uB098 \uC874\uC7AC\uD569\uB2C8\uB2E4.`,
              hintText: `${inlineMath(
                `f(${a})=${firstValue}<0`
              )}\uC774\uACE0 ${inlineMath(
                `f(${b})=${secondValue}>0`
              )}\uC785\uB2C8\uB2E4.
\uC5F0\uC18D\uC778 \uADF8\uB798\uD504\uAC00 \uC74C\uC218 \uB192\uC774\uC5D0\uC11C \uC591\uC218 \uB192\uC774\uB85C \uC774\uB3D9\uD558\uBA74 \uC911\uAC04 \uB192\uC774 0\uC744 \uC801\uC5B4\uB3C4 \uD55C \uBC88 \uC9C0\uB098\uC57C \uD569\uB2C8\uB2E4.`,
              visualization: {
                kind: "continuous-interval",
                focusX: (a + b) / 2,
                left: a,
                right: b,
                leftValue: firstValue,
                rightValue: secondValue,
                target: 0,
                note: "\uC74C\uC218 \uB192\uC774\uC5D0\uC11C \uC591\uC218 \uB192\uC774\uB85C \uC774\uC5B4\uC9C0\uB294 \uACE1\uC120\uC740 x\uCD95\uC744 \uC801\uC5B4\uB3C4 \uD55C \uBC88 \uC9C0\uB0A9\uB2C8\uB2E4."
              },
              validityChecks: [
                {
                  name: "opposite-endpoint-signs",
                  passed: firstValue * secondValue < 0,
                  message: "\uADFC\uC758 \uC874\uC7AC \uBB38\uC81C\uC5D0\uC11C \uB05D\uC810 \uD568\uC218\uAC12\uC758 \uBD80\uD638\uAC00 \uB2E4\uB974\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "polynomial-root-interval",
          label: "\uC720\uD615 8 \xB7 \uB2E4\uD56D\uBC29\uC815\uC2DD\uC758 \uADFC\uC774 \uC788\uB294 \uAD6C\uAC04",
          difficulty: 3,
          generate() {
            const lower = randomInteger(1, 3);
            const lowerCube = lower ** 3;
            const upperCube = (lower + 1) ** 3;
            const constant = randomInteger(
              lowerCube + 1,
              upperCube - 1
            );
            return {
              prompt: `\uBC29\uC815\uC2DD ${inlineMath(
                `x^3-${constant}=0`
              )}\uC758 \uC591\uC758 \uC2E4\uADFC\uC774 \uC788\uC74C\uC744 \uC0AC\uC787\uAC12 \uC815\uB9AC\uB85C \uBCF4\uC77C \uC218 \uC788\uB294 \uAD6C\uAC04\uC744 \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "correct",
                  text: inlineMath(
                    `[${lower},${lower + 1}]`
                  )
                },
                {
                  key: "right",
                  text: inlineMath(
                    `[${lower + 1},${lower + 2}]`
                  )
                },
                {
                  key: "left",
                  text: inlineMath(`[0,${lower}]`)
                },
                {
                  key: "negative",
                  text: inlineMath(`[-${lower},0]`)
                }
              ],
              answer: "correct",
              solution: `${inlineMath(
                `${lower ** 3}-${constant}<0`
              )}\uC774\uACE0 ${inlineMath(
                `${(lower + 1) ** 3}-${constant}>0`
              )}\uC785\uB2C8\uB2E4. \uB2E4\uD56D\uD568\uC218\uB294 \uC5F0\uC18D\uC774\uBBC0\uB85C ${inlineMath(
                `[${lower},${lower + 1}]`
              )} \uC548\uC5D0 \uADFC\uC774 \uC874\uC7AC\uD569\uB2C8\uB2E4.`,
              hintText: `${inlineMath(
                `f(x)=x^3-${constant}`
              )}\uB85C \uB193\uC2B5\uB2C8\uB2E4.
${inlineMath(
                `f(${lower})=${lower ** 3}-${constant}<0`
              )}, ${inlineMath(
                `f(${lower + 1})=${(lower + 1) ** 3}-${constant}>0`
              )}\uC774\uBBC0\uB85C \uC774 \uB450 \uC810\uC744 \uC591 \uB05D\uC73C\uB85C \uAC16\uB294 \uAD6C\uAC04\uC744 \uCC3E\uC73C\uC138\uC694.`,
              visualization: {
                kind: "continuous-interval",
                focusX: lower + 0.5,
                left: lower,
                right: lower + 1,
                coefficients: [
                  -constant,
                  0,
                  0,
                  1
                ],
                target: 0,
                note: "\uAD6C\uAC04\uC758 \uC591 \uB05D\uC5D0\uC11C \uD568\uC218\uAC12\uC758 \uBD80\uD638\uAC00 \uBC14\uB00C\uBBC0\uB85C \uADF8 \uC0AC\uC774\uC5D0 x\uCD95\uACFC\uC758 \uAD50\uC810\uC774 \uC788\uC2B5\uB2C8\uB2E4."
              },
              validityChecks: [
                {
                  name: "root-bracketing-interval",
                  passed: lowerCube < constant && constant < upperCube,
                  message: "\uC120\uD0DD\uD55C \uAD6C\uAC04\uC774 \uB2E4\uD56D\uBC29\uC815\uC2DD\uC758 \uADFC\uC744 \uB07C\uC6B0\uC9C0 \uBABB\uD569\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "bisection-step",
          label: "\uC720\uD615 9 \xB7 \uC0AC\uC787\uAC12 \uC815\uB9AC\uB85C \uAD6C\uAC04 \uC881\uD788\uAE30",
          difficulty: 3,
          generate() {
            const a = randomInteger(-4, 0);
            const midpoint = a + 2;
            const b = a + 4;
            const rootInLeftHalf = Math.random() >= 0.5;
            const firstValue = -randomInteger(1, 6);
            const midpointValue = rootInLeftHalf ? randomInteger(1, 6) : -randomInteger(1, 6);
            const lastValue = randomInteger(1, 6);
            return {
              prompt: `${inlineMath("f(x)")}\uAC00 ${inlineMath(
                `[${a},${b}]`
              )}\uC5D0\uC11C \uC5F0\uC18D\uC774\uACE0 ${inlineMath(
                `f(${a})=${firstValue}`
              )}, ${inlineMath(
                `f(${midpoint})=${midpointValue}`
              )}, ${inlineMath(
                `f(${b})=${lastValue}`
              )}\uC785\uB2C8\uB2E4. ${inlineMath(
                "f(x)=0"
              )}\uC758 \uADFC\uC774 \uC788\uC74C\uC744 \uBCF4\uC7A5\uD558\uBA74\uC11C \uAD6C\uAC04\uC744 \uC808\uBC18\uC73C\uB85C \uC881\uD78C \uAC83\uC744 \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "left",
                  text: inlineMath(`[${a},${midpoint}]`)
                },
                {
                  key: "right",
                  text: inlineMath(`[${midpoint},${b}]`)
                },
                {
                  key: "outside-left",
                  text: inlineMath(
                    `[${a - 2},${a}]`
                  )
                },
                {
                  key: "outside-right",
                  text: inlineMath(
                    `[${b},${b + 2}]`
                  )
                }
              ],
              answer: rootInLeftHalf ? "left" : "right",
              solution: `\uD568\uC218\uAC12\uC758 \uBD80\uD638\uAC00 \uBC14\uB00C\uB294 \uB450 \uC810\uC740 ` + (rootInLeftHalf ? `${inlineMath(`x=${a}`)}\uC640 ${inlineMath(
                `x=${midpoint}`
              )}` : `${inlineMath(
                `x=${midpoint}`
              )}\uC640 ${inlineMath(`x=${b}`)}`) + `\uC785\uB2C8\uB2E4. \uB530\uB77C\uC11C ${inlineMath(
                rootInLeftHalf ? `[${a},${midpoint}]` : `[${midpoint},${b}]`
              )} \uC548\uC5D0 \uADFC\uC774 \uC874\uC7AC\uD569\uB2C8\uB2E4.`,
              hintText: `\uC67C\uCABD \uC808\uBC18\uC758 \uB05D\uAC12\uC740 ${inlineMath(
                `${firstValue},\\ ${midpointValue}`
              )}, \uC624\uB978\uCABD \uC808\uBC18\uC758 \uB05D\uAC12\uC740 ${inlineMath(
                `${midpointValue},\\ ${lastValue}`
              )}\uC785\uB2C8\uB2E4.
\uB450 \uAC12\uC758 \uBD80\uD638\uAC00 \uC11C\uB85C \uB2E4\uB978 \uCABD \uAD6C\uAC04\uC5D0\uC11C\uB9CC \uADFC\uC758 \uC874\uC7AC\uAC00 \uBCF4\uC7A5\uB429\uB2C8\uB2E4.`,
              visualization: {
                kind: "continuous-interval",
                focusX: midpoint,
                left: a,
                right: b,
                leftValue: firstValue,
                midpoint,
                midpointValue,
                rightValue: lastValue,
                target: 0,
                selectedInterval: rootInLeftHalf ? [a, midpoint] : [midpoint, b],
                note: "\uC138 \uC810 \uC911 \uD568\uC218\uAC12\uC758 \uBD80\uD638\uAC00 \uBC14\uB00C\uB294 \uC774\uC6C3\uD55C \uB450 \uC810\uC744 \uC0C8 \uAD6C\uAC04\uC73C\uB85C \uC120\uD0DD\uD558\uC138\uC694."
              },
              validityChecks: [
                {
                  name: "single-bisection-sign-change",
                  passed: rootInLeftHalf ? firstValue * midpointValue < 0 && midpointValue * lastValue > 0 : firstValue * midpointValue > 0 && midpointValue * lastValue < 0,
                  message: "\uC774\uBD84\uD55C \uB450 \uAD6C\uAC04\uC758 \uBD80\uD638 \uBCC0\uD654 \uC870\uAC74\uC774 \uC758\uB3C4\uC640 \uB2E4\uB985\uB2C8\uB2E4."
                }
              ]
            };
          }
        },
        {
          id: "missing-ivt-hypothesis",
          label: "\uC720\uD615 10 \xB7 \uC0AC\uC787\uAC12 \uC815\uB9AC\uC758 \uC870\uAC74",
          difficulty: 2,
          generate() {
            const jumpX = randomInteger(-4, 4);
            const leftValue = -randomInteger(1, 5);
            const rightValue = randomInteger(1, 5);
            const intervalRadius = randomInteger(1, 4);
            const leftEndpoint = jumpX - intervalRadius;
            const rightEndpoint = jumpX + intervalRadius;
            const definition = `f(x)=\\begin{cases}${leftValue},&x<${jumpX}\\\\${rightValue},&x\\ge${jumpX}\\end{cases}`;
            return {
              prompt: `${displayMath(definition)}${inlineMath(
                `f(${leftEndpoint})=${leftValue}<0<f(${rightEndpoint})=${rightValue}`
              )}\uC774\uC9C0\uB9CC ${inlineMath("f(c)=0")}\uC778 ${inlineMath(
                `c\\in(${leftEndpoint},${rightEndpoint})`
              )}\uB294 \uC5C6\uC2B5\uB2C8\uB2E4. \uC0AC\uC787\uAC12 \uC815\uB9AC\uB97C \uC801\uC6A9\uD560 \uC218 \uC5C6\uB294 \uC774\uC720\uB97C \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "not-continuous",
                  text: `${inlineMath("f(x)")}\uAC00 ${inlineMath(
                    `[${leftEndpoint},${rightEndpoint}]`
                  )}\uC5D0\uC11C \uC5F0\uC18D\uC774 \uC544\uB2C8\uAE30 \uB54C\uBB38\uC774\uB2E4.`
                },
                {
                  key: "not-closed",
                  text: `${inlineMath(
                    `[${leftEndpoint},${rightEndpoint}]`
                  )}\uC774 \uB2EB\uD78C\uAD6C\uAC04\uC774 \uC544\uB2C8\uAE30 \uB54C\uBB38\uC774\uB2E4.`
                },
                {
                  key: "same-sign",
                  text: "\uB450 \uB05D\uC810\uC758 \uD568\uC218\uAC12 \uBD80\uD638\uAC00 \uAC19\uAE30 \uB54C\uBB38\uC774\uB2E4."
                },
                {
                  key: "zero-endpoint",
                  text: "\uB05D\uC810 \uC911 \uD558\uB098\uAC00 0\uC774\uAE30 \uB54C\uBB38\uC774\uB2E4."
                }
              ],
              answer: "not-continuous",
              solution: `\uD568\uC218\uB294 ${inlineMath(`x=${jumpX}`)}\uC5D0\uC11C ${leftValue}\uC5D0\uC11C ${rightValue}\uB85C \uB6F0\uC5B4 \uC62C\uB77C \uBD88\uC5F0\uC18D\uC785\uB2C8\uB2E4. \uC5F0\uC18D\uC774\uB77C\uB294 \uD575\uC2EC \uAC00\uC815\uC774 \uC5C6\uC73C\uBBC0\uB85C \uC911\uAC04 \uB192\uC774 0\uC744 \uC9C0\uB098\uC9C0 \uC54A\uC544\uB3C4 \uB429\uB2C8\uB2E4.`,
              hintText: `\uADF8\uB798\uD504\uAC00 ${leftValue}\uC758 \uB192\uC774\uC5D0\uC11C ${rightValue}\uC758 \uB192\uC774\uB85C \uC774\uB3D9\uD560 \uB54C \uC911\uAC04\uC744 \uC9C0\uB098\uC9C0 \uC54A\uACE0 \uC810\uD504\uD558\uB294 \uC9C0\uC810\uC744 \uCC3E\uC73C\uC138\uC694.`,
              visualization: {
                kind: "one-sided-limits",
                focusX: jumpX,
                leftLimit: leftValue,
                rightLimit: rightValue
              }
            };
          }
        }
      ];
      module.exports = {
        key: "calculus-continuous-function-properties",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/calculus1/advancedCalculus.js
  var require_advancedCalculus = __commonJS({
    "services/problemGenerators/calculus1/advancedCalculus.js"(exports, module) {
      var {
        randomInteger,
        isCorrectAnswer,
        inlineMath,
        displayMath,
        signedNumber,
        xMinus,
        quadraticExpression,
        fractionTex
      } = require_helpers();
      function round4(value) {
        return Math.round(
          (Number(value) + Number.EPSILON) * 1e4
        ) / 1e4;
      }
      function choose(values) {
        return values[randomInteger(0, values.length - 1)];
      }
      function nonZero(min = -5, max = 5) {
        let value = 0;
        while (value === 0) {
          value = randomInteger(min, max);
        }
        return value;
      }
      function sa(prompt, answer, solution, hintText, visualization) {
        return {
          prompt,
          inputMode: "short-answer",
          answer: round4(answer),
          solution,
          hintText,
          visualization
        };
      }
      function mc(prompt, choices, answerIndex, solution, hintText, visualization) {
        const shuffled = choices.map(
          (text, index) => ({
            text,
            correct: index === answerIndex
          })
        );
        for (let index = shuffled.length - 1; index > 0; index -= 1) {
          const swapIndex = randomInteger(0, index);
          [shuffled[index], shuffled[swapIndex]] = [
            shuffled[swapIndex],
            shuffled[index]
          ];
        }
        const normalized = shuffled.map(
          (choice, index) => ({
            key: String.fromCharCode(65 + index),
            ...choice
          })
        );
        return {
          prompt,
          inputMode: "multiple-choice",
          choices: normalized.map(
            ({ key, text }) => ({ key, text })
          ),
          answer: normalized.find(
            (choice) => choice.correct
          ).key,
          solution,
          hintText,
          visualization
        };
      }
      function calculusVisual(kind, data = {}) {
        return {
          kind: `calculus-${kind}`,
          ...data
        };
      }
      function powerTerm(coefficient, exponent, variable = "x") {
        if (coefficient === 0) return "0";
        const magnitude = Math.abs(coefficient);
        const coefficientText = magnitude === 1 && exponent > 0 ? "" : String(magnitude);
        const variableText = exponent === 0 ? "" : exponent === 1 ? variable : `${variable}^{${exponent}}`;
        return `${coefficient < 0 ? "-" : ""}${coefficientText}${variableText}`;
      }
      function signedTerm(coefficient, exponent, variable = "x") {
        if (coefficient === 0) return "";
        const term = powerTerm(
          Math.abs(coefficient),
          exponent,
          variable
        );
        return coefficient > 0 ? `+${term}` : `-${term}`;
      }
      function derivativeCoefficientProblems() {
        const q = nonZero(1, 4);
        const l = nonZero(-5, 5);
        const c = randomInteger(-5, 5);
        const a = randomInteger(-3, 3);
        const b = a + randomInteger(1, 5);
        const cubic = nonZero(1, 3);
        const quadratic = nonZero(-4, 4);
        const fA = q * a ** 2 + l * a + c;
        const derivativeAtA = 2 * q * a + l;
        const averageRate = q * (a + b) + l;
        const definitionValue = 2 * a + 1;
        return [
          sa(`${inlineMath(`f(x)=${quadraticExpression(q, l, c)}`)}\uC758 \uAD6C\uAC04 [${a},${b}]\uC5D0\uC11C \uD3C9\uADE0\uBCC0\uD654\uC728\uC740?`, averageRate, `\uD3C9\uADE0\uBCC0\uD654\uC728\uC740 ${inlineMath(`\\frac{f(${b})-f(${a})}{${b}-${a}}=${averageRate}`)}\uC785\uB2C8\uB2E4.`, "\uB450 \uB05D\uC758 \uD568\uC218\uAC12 \uCC28\uB97C x\uC758 \uBCC0\uD654\uB7C9\uC73C\uB85C \uB098\uB204\uC138\uC694.", calculusVisual("secant", { q, l, c, a, b })),
          sa(`${inlineMath(`f(x)=${quadraticExpression(q, l, c)}`)}\uC77C \uB54C ${inlineMath(`f'(${a})`)}\uB294?`, derivativeAtA, `\uCC28\uBD84\uBAAB ${inlineMath(`\\frac{f(${a}+h)-f(${a})}{h}`)}\uC744 \uC815\uB9AC\uD558\uACE0 ${inlineMath(`h\\to0`)}\uC73C\uB85C \uBCF4\uB0B4\uBA74 ${derivativeAtA}\uC785\uB2C8\uB2E4.`, "\uB3C4\uD568\uC218 \uACF5\uC2DD\uC744 \uBA3C\uC800 \uC4F0\uC9C0 \uB9D0\uACE0 \uBBF8\uBD84\uACC4\uC218\uC758 \uC815\uC758\uC5D0 \uC9C1\uC811 \uB300\uC785\uD558\uC138\uC694.", calculusVisual("tangent", { q, l, c, point: a })),
          mc(`${inlineMath(`x=${a}`)}\uC5D0\uC11C \uBBF8\uBD84\uACC4\uC218\uB97C \uB098\uD0C0\uB0B4\uB294 \uC2DD\uC740?`, [
            `${inlineMath(`\\lim_{h\\to0}\\frac{f(${a}+h)-f(${a})}{h}`)}`,
            `${inlineMath(`\\lim_{h\\to0}\\frac{f(${a})-f(h)}{${a}}`)}`,
            `${inlineMath(`\\frac{f(${a})}{${a}}`)}`,
            `${inlineMath(`\\lim_{x\\to${a}}f(x)`)}`
          ], 0, "\uBBF8\uBD84\uACC4\uC218\uB294 \uD55C \uC810\uC5D0\uC11C \uCC28\uBD84\uBAAB\uC758 \uADF9\uD55C\uC785\uB2C8\uB2E4.", "\uBD84\uC790\uB294 \uD568\uC218\uAC12\uC758 \uBCC0\uD654\uB7C9, \uBD84\uBAA8\uB294 x\uC758 \uBCC0\uD654\uB7C9\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.", calculusVisual("definition", { point: a })),
          sa(`\uACE1\uC120 ${inlineMath(`y=${quadraticExpression(q, l, c)}`)} \uC704\uC5D0\uC11C ${inlineMath(`x=${a}`)}\uC778 \uC810\uC758 \uC811\uC120 \uAE30\uC6B8\uAE30\uB294?`, derivativeAtA, `\uD560\uC120\uC758 \uAE30\uC6B8\uAE30\uB97C \uB098\uD0C0\uB0B4\uB294 \uCC28\uBD84\uBAAB\uC758 \uADF9\uD55C\uC774 ${inlineMath(`f'(${a})=${derivativeAtA}`)}\uC785\uB2C8\uB2E4.`, "\uC811\uC120 \uAE30\uC6B8\uAE30\uB97C \uBBF8\uBD84\uACC4\uC218\uC758 \uC815\uC758\uB85C \uBC14\uAFB8\uC5B4 \uACC4\uC0B0\uD558\uC138\uC694.", calculusVisual("tangent", { q, l, c, point: a })),
          sa(`${inlineMath(`\\lim_{h\\to0}\\frac{f(${a}+h)-f(${a})}{h}=${derivativeAtA}`)}\uC77C \uB54C ${inlineMath(`f'(${a})`)}\uB294?`, derivativeAtA, "\uC8FC\uC5B4\uC9C4 \uADF9\uD55C\uC2DD \uC790\uCCB4\uAC00 \uBBF8\uBD84\uACC4\uC218\uC758 \uC815\uC758\uC785\uB2C8\uB2E4.", "\uADF9\uD55C\uC2DD\uC5D0\uC11C \uAE30\uC900\uC810\uACFC \uD568\uC218\uAC12\uC758 \uCC28\uB97C \uC77D\uC73C\uC138\uC694.", calculusVisual("definition", { point: a, slope: derivativeAtA })),
          sa(`${inlineMath(`f(x)=${l}x${signedNumber(c)}`)}\uC758 \uBAA8\uB4E0 \uC810\uC5D0\uC11C \uBBF8\uBD84\uACC4\uC218\uB294?`, l, "\uC77C\uCC28\uD568\uC218\uC758 \uC811\uC120\uC740 \uD568\uC218 \uC790\uC2E0\uACFC \uD3C9\uD589\uD558\uBBC0\uB85C \uAE30\uC6B8\uAE30\uB294 \uD56D\uC0C1 x\uC758 \uACC4\uC218\uC785\uB2C8\uB2E4.", "\uC77C\uCC28\uD568\uC218\uC758 \uAE30\uC6B8\uAE30\uB97C \uC77D\uC73C\uC138\uC694.", calculusVisual("tangent", { q: 0, l, c, point: a })),
          sa(`\uC0C1\uC218\uD568\uC218 ${inlineMath(`f(x)=${c}`)}\uC758 \uBBF8\uBD84\uACC4\uC218\uB294?`, 0, "\uD568\uC218\uAC12\uC758 \uBCC0\uD654\uB7C9\uC774 \uD56D\uC0C1 0\uC774\uBBC0\uB85C \uBBF8\uBD84\uACC4\uC218\uB294 0\uC785\uB2C8\uB2E4.", "\uC218\uD3C9\uC120\uC758 \uAE30\uC6B8\uAE30\uB97C \uC0DD\uAC01\uD558\uC138\uC694.", calculusVisual("tangent", { q: 0, l: 0, c, point: a })),
          sa(`${inlineMath(`f(x)=${quadraticExpression(q, l, c)}`)}\uC5D0\uC11C ${inlineMath(`h=0.1,0.01,0.001`)}\uB85C \uC904\uC778 \uCC28\uBD84\uBAAB\uC774 \uAC00\uAE4C\uC6CC\uC9C0\uB294 \uAC12, \uC989 ${inlineMath(`f'(${a})`)}\uB294?`, derivativeAtA, `${inlineMath(`\\frac{f(${a}+h)-f(${a})}{h}`)}\uC5D0\uC11C h\uAC00 0\uC73C\uB85C \uAC00\uAE4C\uC6CC\uC9C8 \uB54C \uB0A8\uB294 \uAC12\uC740 ${derivativeAtA}\uC785\uB2C8\uB2E4.`, "\uC5EC\uB7EC \uD560\uC120 \uAE30\uC6B8\uAE30\uC758 \uACF5\uD1B5 \uB3C4\uCC29\uAC12\uC744 \uC77D\uC73C\uC138\uC694.", calculusVisual("secant", { q, l, c, a, b: a + 0.5 })),
          sa(`${inlineMath(`\\lim_{h\\to0}\\frac{(${a}+h)^2+(${a}+h)-(${a ** 2 + a})}{h}`)}\uC758 \uAC12\uC740?`, definitionValue, `${inlineMath(`f(x)=x^2+x`)}\uC758 ${inlineMath(`x=${a}`)}\uC5D0\uC11C\uC758 \uBBF8\uBD84\uACC4\uC218\uC774\uBBC0\uB85C ${definitionValue}\uC785\uB2C8\uB2E4.`, "\uBD84\uC790\uB97C \uC804\uAC1C\uD55C \uB4A4 h\uB97C \uC57D\uBD84\uD558\uACE0 h\uB97C 0\uC73C\uB85C \uBCF4\uB0B4\uC138\uC694.", calculusVisual("definition", { point: a, slope: definitionValue })),
          mc(`${inlineMath(`f'(${a})<0`)}\uC774 \uB73B\uD558\uB294 \uADF8\uB798\uD504\uC758 \uC0C1\uD0DC\uB294?`, ["\uADF8 \uC810\uC5D0\uC11C \uC624\uB978\uCABD\uC73C\uB85C \uAC08\uC218\uB85D \uB0B4\uB824\uAC04\uB2E4.", "\uADF8 \uC810\uC5D0\uC11C \uBC18\uB4DC\uC2DC \uCD5C\uC19F\uAC12\uC744 \uAC16\uB294\uB2E4.", "\uADF8 \uC810\uC5D0\uC11C \uD568\uC218\uAC12\uC774 \uC74C\uC218\uB2E4.", "\uADF8 \uC810\uC5D0\uC11C \uBD88\uC5F0\uC18D\uC774\uB2E4."], 0, "\uBBF8\uBD84\uACC4\uC218\uC758 \uBD80\uD638\uB294 \uC811\uC120\uC758 \uAE30\uC6B8\uAE30\uC640 \uC21C\uAC04\uC801\uC778 \uC99D\uAC00\xB7\uAC10\uC18C \uBC29\uD5A5\uC744 \uB098\uD0C0\uB0C5\uB2C8\uB2E4.", "\uD568\uC218\uAC12\uC758 \uBD80\uD638\uAC00 \uC544\uB2C8\uB77C \uC811\uC120 \uAE30\uC6B8\uAE30\uC758 \uBD80\uD638\uB97C \uC77D\uC73C\uC138\uC694.", calculusVisual("definition", { point: a, slope: -Math.abs(derivativeAtA || 1) }))
        ];
      }
      function differentiabilityProblems() {
        const point = randomInteger(-4, 4);
        const slope = nonZero(-5, 5);
        const leftSlope = nonZero(-5, 5);
        const rightSlope = leftSlope + nonZero(1, 4);
        const value = randomInteger(-5, 5);
        return [
          mc(`${inlineMath(`x=${point}`)}\uC5D0\uC11C \uBBF8\uBD84\uAC00\uB2A5\uD558\uBA74 \uBC18\uB4DC\uC2DC \uCC38\uC778 \uAC83\uC740?`, ["\uADF8 \uC810\uC5D0\uC11C \uC5F0\uC18D\uC774\uB2E4.", "\uADF8 \uC810\uC5D0\uC11C \uADF9\uB300\uC774\uB2E4.", "\uD568\uC218\uAC12\uC774 0\uC774\uB2E4.", "\uB3C4\uD568\uC218\uAC00 \uC591\uC218\uC774\uB2E4."], 0, "\uBBF8\uBD84\uAC00\uB2A5\uD55C \uD568\uC218\uB294 \uADF8 \uC810\uC5D0\uC11C \uBC18\uB4DC\uC2DC \uC5F0\uC18D\uC785\uB2C8\uB2E4.", "\uBBF8\uBD84\uAC00\uB2A5\uC131\uACFC \uC5F0\uC18D\uC131\uC758 \uD55C \uBC29\uD5A5 \uD3EC\uD568 \uAD00\uACC4\uB97C \uAE30\uC5B5\uD558\uC138\uC694.", calculusVisual("differentiability", { point })),
          mc(`${inlineMath(`f(x)=|${xMinus(point)}|`)}\uB294 ${inlineMath(`x=${point}`)}\uC5D0\uC11C?`, ["\uC5F0\uC18D\uC774\uACE0 \uBBF8\uBD84\uAC00\uB2A5\uD558\uB2E4.", "\uC5F0\uC18D\uC774\uC9C0\uB9CC \uBBF8\uBD84\uAC00\uB2A5\uD558\uC9C0 \uC54A\uB2E4.", "\uBD88\uC5F0\uC18D\uC774\uC9C0\uB9CC \uBBF8\uBD84\uAC00\uB2A5\uD558\uB2E4.", "\uD568\uC218\uAC12\uC774 \uC5C6\uB2E4."], 1, "\uBFB0\uC871\uC810\uC5D0\uC11C \uC88C\uC6B0 \uAE30\uC6B8\uAE30\uAC00 -1\uACFC 1\uB85C \uB2EC\uB77C \uBBF8\uBD84\uAC00\uB2A5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", "\uADF8\uB798\uD504\uB294 \uC774\uC5B4\uC838 \uC788\uC5B4\uB3C4 \uC811\uC120 \uAE30\uC6B8\uAE30\uAC00 \uD558\uB098\uC778\uC9C0 \uD655\uC778\uD558\uC138\uC694.", calculusVisual("cusp", { point })),
          sa(`${displayMath(`f(x)=\\begin{cases}${leftSlope}(${xMinus(point)})+${value},&x<${point}\\\\k(${xMinus(point)})+${value},&x\\ge${point}\\end{cases}`)}
${inlineMath(`x=${point}`)}\uC5D0\uC11C \uBBF8\uBD84\uAC00\uB2A5\uD560 \uB54C k\uB294?`, leftSlope, "\uC5F0\uC18D\uC131\uC740 \uC774\uBBF8 \uB9DE\uACE0 \uC88C\uC6B0 \uAE30\uC6B8\uAE30\uAC00 \uAC19\uC544\uC57C \uD558\uBBC0\uB85C k\uB294 \uC67C\uCABD \uAE30\uC6B8\uAE30\uC640 \uAC19\uC2B5\uB2C8\uB2E4.", "\uC88C\uBBF8\uBD84\uACC4\uC218\uC640 \uC6B0\uBBF8\uBD84\uACC4\uC218\uB97C \uAC19\uAC8C \uB193\uC73C\uC138\uC694.", calculusVisual("piecewise-slope", { point, leftSlope, value })),
          mc(`\uC88C\uBBF8\uBD84\uACC4\uC218\uAC00 ${leftSlope}, \uC6B0\uBBF8\uBD84\uACC4\uC218\uAC00 ${rightSlope}\uC778 \uD568\uC218\uB294 \uADF8 \uC810\uC5D0\uC11C?`, ["\uBBF8\uBD84\uAC00\uB2A5\uD558\uB2E4.", "\uBBF8\uBD84\uAC00\uB2A5\uD558\uC9C0 \uC54A\uB2E4.", "\uBC18\uB4DC\uC2DC \uBD88\uC5F0\uC18D\uC774\uB2E4.", "\uBC18\uB4DC\uC2DC \uADF9\uC18C\uC774\uB2E4."], 1, "\uC591\uCABD \uBBF8\uBD84\uACC4\uC218\uAC00 \uB2E4\uB974\uBA74 \uD558\uB098\uC758 \uBBF8\uBD84\uACC4\uC218\uAC00 \uC874\uC7AC\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", "\uC88C\uC6B0 \uAE30\uC6B8\uAE30\uB97C \uBA3C\uC800 \uBE44\uAD50\uD558\uC138\uC694.", calculusVisual("piecewise-slope", { leftSlope, rightSlope })),
          mc(`\uB2E4\uD56D\uD568\uC218 ${inlineMath(`f(x)=${slope}x^3${signedNumber(value)}`)}\uC5D0 \uB300\uD55C \uC633\uC740 \uC124\uBA85\uC740?`, ["\uBAA8\uB4E0 \uC2E4\uC218\uC5D0\uC11C \uBBF8\uBD84\uAC00\uB2A5\uD558\uB2E4.", "x=0\uC5D0\uC11C\uB9CC \uBBF8\uBD84\uAC00\uB2A5\uD558\uB2E4.", "\uD56D\uC0C1 \uBD88\uC5F0\uC18D\uC774\uB2E4.", "\uC591\uC218 \uAD6C\uAC04\uC5D0\uC11C\uB9CC \uC5F0\uC18D\uC774\uB2E4."], 0, "\uB2E4\uD56D\uD568\uC218\uB294 \uBAA8\uB4E0 \uC2E4\uC218\uC5D0\uC11C \uC5F0\uC18D\uC774\uACE0 \uBBF8\uBD84\uAC00\uB2A5\uD569\uB2C8\uB2E4.", "\uB2E4\uD56D\uD568\uC218\uC758 \uAE30\uBCF8 \uC131\uC9C8\uC744 \uC0AC\uC6A9\uD558\uC138\uC694.", calculusVisual("smooth", { slope, value })),
          mc(`\uD568\uC218\uAC00 x=${point}\uC5D0\uC11C \uBD88\uC5F0\uC18D\uC774\uBA74 \uBBF8\uBD84\uAC00\uB2A5\uC131\uC740?`, ["\uBC18\uB4DC\uC2DC \uBBF8\uBD84\uAC00\uB2A5\uD558\uB2E4.", "\uBBF8\uBD84\uAC00\uB2A5\uD558\uC9C0 \uC54A\uB2E4.", "\uB3C4\uD568\uC218\uAC00 0\uC774\uB2E4.", "\uC88C\uBBF8\uBD84\uACC4\uC218\uB9CC \uC874\uC7AC\uD55C\uB2E4."], 1, "\uBBF8\uBD84\uAC00\uB2A5\uC774\uBA74 \uC5F0\uC18D\uC774\uC5B4\uC57C \uD558\uBBC0\uB85C \uADF8 \uB300\uC6B0\uC5D0 \uC758\uD574 \uBD88\uC5F0\uC18D\uC774\uBA74 \uBBF8\uBD84\uBD88\uAC00\uB2A5\uC785\uB2C8\uB2E4.", "\uBBF8\uBD84\uAC00\uB2A5 \u21D2 \uC5F0\uC18D\uC758 \uB300\uC6B0\uB97C \uC0AC\uC6A9\uD558\uC138\uC694.", calculusVisual("discontinuity", { point })),
          sa(`${displayMath(`f(x)=\\begin{cases}${leftSlope}x+k,&x<${point}\\\\${leftSlope}x${signedNumber(value)},&x\\ge${point}\\end{cases}`)}
${inlineMath(`x=${point}`)}\uC5D0\uC11C \uC5F0\uC18D\uC774 \uB418\uAC8C \uD558\uB294 k\uB294?`, value, "\uC591\uCABD \uC2DD\uC758 x\uACC4\uC218\uAC00 \uAC19\uC73C\uBBC0\uB85C \uC0C1\uC218\uD56D\uB3C4 \uAC19\uC544\uC57C \uD568\uC218\uAC12\uACFC \uADF9\uD55C\uC774 \uC77C\uCE58\uD569\uB2C8\uB2E4.", "\uACBD\uACC4\uC810\uC5D0\uC11C \uB450 \uC2DD\uC758 \uAC12\uC744 \uAC19\uAC8C \uB193\uC73C\uC138\uC694.", calculusVisual("piecewise-value", { point, leftSlope })),
          mc(`x=${point}\uC5D0\uC11C \uC5F0\uC18D\uC774\uC9C0\uB9CC \uC88C\uC6B0 \uC811\uC120 \uAE30\uC6B8\uAE30\uAC00 \uB2E4\uB978 \uADF8\uB798\uD504\uC758 \uD2B9\uC9D5\uC740?`, ["\uADF8 \uC810\uC5D0\uC11C \uBBF8\uBD84\uAC00\uB2A5\uD558\uB2E4.", "\uBFB0\uC871\uC810\uC774 \uC0DD\uAE38 \uC218 \uC788\uB2E4.", "\uD568\uC218\uAC12\uC774 \uC5C6\uB2E4.", "\uADF9\uD55C\uC774 \uC874\uC7AC\uD558\uC9C0 \uC54A\uB294\uB2E4."], 1, "\uC5F0\uC18D\uC774\uC5B4\uB3C4 \uBFB0\uC871\uC810\uC5D0\uC11C\uB294 \uC88C\uC6B0 \uAE30\uC6B8\uAE30\uAC00 \uB2EC\uB77C \uBBF8\uBD84\uAC00\uB2A5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", "\uC5F0\uC18D\uC131\uACFC \uB9E4\uB044\uB7EC\uC6C0\uC744 \uAD6C\uBD84\uD558\uC138\uC694.", calculusVisual("cusp", { point })),
          sa(`\uC88C\uBBF8\uBD84\uACC4\uC218\uC640 \uC6B0\uBBF8\uBD84\uACC4\uC218\uAC00 \uBAA8\uB450 ${slope}\uC77C \uB54C \uADF8 \uC810\uC758 \uBBF8\uBD84\uACC4\uC218\uB294?`, slope, "\uB450 \uC77C\uBC29 \uBBF8\uBD84\uACC4\uC218\uAC00 \uAC19\uC740 \uAC12\uC73C\uB85C \uC874\uC7AC\uD558\uBBC0\uB85C \uBBF8\uBD84\uACC4\uC218\uB294 \uADF8 \uACF5\uD1B5\uAC12\uC785\uB2C8\uB2E4.", "\uB450 \uAC12\uC774 \uAC19\uC73C\uBA74 \uADF8 \uAC12\uC744 \uADF8\uB300\uB85C \uC501\uB2C8\uB2E4.", calculusVisual("differentiability", { slope })),
          mc(`\uB2E4\uC74C \uC911 \uC5F0\uC18D\uC774\uC9C0\uB9CC ${inlineMath(`x=${point}`)}\uC5D0\uC11C \uBBF8\uBD84\uAC00\uB2A5\uD558\uC9C0 \uC54A\uC740 \uD568\uC218\uB294?`, [`${inlineMath(`|${xMinus(point)}|`)}`, `${inlineMath(`(${xMinus(point)})^2`)}`, `${inlineMath(`x${signedNumber(value)}`)}`, `${inlineMath(String(value))}`], 0, "\uC808\uB313\uAC12 \uD568\uC218\uB294 \uAF2D\uC9D3\uC810\uC5D0\uC11C \uC88C\uC6B0 \uAE30\uC6B8\uAE30\uAC00 \uB2E4\uB985\uB2C8\uB2E4.", "\uADF8\uB798\uD504\uC5D0 \uBFB0\uC871\uC810\uC774 \uC788\uB294\uC9C0 \uD655\uC778\uD558\uC138\uC694.", calculusVisual("cusp", { point }))
        ];
      }
      function powerDerivativeProblems() {
        const n = randomInteger(2, 8);
        const coefficient = nonZero(-5, 5);
        const point = choose([-2, -1, 1, 2]);
        return [
          sa(`${inlineMath(`f(x)=x^{${n}}`)}\uC77C \uB54C ${inlineMath(`f'(${point})`)}\uB294?`, n * point ** (n - 1), `${inlineMath(`f'(x)=${n}x^{${n - 1}}`)}\uC785\uB2C8\uB2E4.`, "\uC9C0\uC218\uB97C \uC55E\uC73C\uB85C \uB0B4\uB9AC\uACE0 \uC9C0\uC218\uB97C 1 \uC904\uC774\uC138\uC694.", calculusVisual("power", { n, point })),
          sa(`${inlineMath(`(${coefficient}x^{${n}})'`)}\uC758 x=${point}\uC5D0\uC11C\uC758 \uAC12\uC740?`, coefficient * n * point ** (n - 1), `${inlineMath(`${coefficient * n}x^{${n - 1}}`)}\uC5D0 x=${point}\uB97C \uB300\uC785\uD569\uB2C8\uB2E4.`, "\uC0C1\uC218\uBC30\uB294 \uC720\uC9C0\uD55C \uCC44 \uAC70\uB4ED\uC81C\uACF1\uC744 \uBBF8\uBD84\uD558\uC138\uC694.", calculusVisual("power", { coefficient, n, point })),
          mc(`${inlineMath(`(x^{${n}})'`)}\uC640 \uAC19\uC740 \uAC83\uC740?`, [`${inlineMath(`${n}x^{${n - 1}}`)}`, `${inlineMath(`${n - 1}x^{${n}}`)}`, `${inlineMath(`x^{${n - 1}}`)}`, `${inlineMath(`${n}x^{${n}}`)}`], 0, "\uC9C0\uC218\uB294 \uACC4\uC218\uB85C \uB0B4\uB824\uC624\uACE0 1\uB9CC\uD07C \uC791\uC544\uC9D1\uB2C8\uB2E4.", "\uACC4\uC218\uC640 \uC9C0\uC218 \uBCC0\uD654 \uB458 \uB2E4 \uD655\uC778\uD558\uC138\uC694.", calculusVisual("power", { n })),
          sa(`${inlineMath(`f(x)=x^{${n}}`)}\uC758 \uB3C4\uD568\uC218\uC5D0\uC11C x\uC758 \uC9C0\uC218\uB294?`, n - 1, "\uBBF8\uBD84\uD558\uBA74 \uC9C0\uC218\uAC00 1 \uAC10\uC18C\uD569\uB2C8\uB2E4.", "\uC6D0\uB798 \uC9C0\uC218\uC5D0\uC11C 1\uC744 \uBE7C\uC138\uC694.", calculusVisual("power", { n })),
          sa(`${inlineMath(`f'(x)=${n}x^{${n - 1}}`)}\uC774\uACE0 ${inlineMath(`f(x)=x^m`)}\uC77C \uB54C m\uC740?`, n, "\uAC70\uB4ED\uC81C\uACF1\uD568\uC218\uC758 \uBBF8\uBD84 \uADDC\uCE59\uC5D0\uC11C \uB3C4\uD568\uC218\uC758 \uACC4\uC218\uB294 \uC6D0\uB798 \uC9C0\uC218\uC785\uB2C8\uB2E4.", "\uB3C4\uD568\uC218 \uC55E\uC758 \uACC4\uC218\uB97C \uC77D\uC73C\uC138\uC694.", calculusVisual("power", { n })),
          sa(`${inlineMath(`f(x)=x^{${n + 1}}`)}\uC77C \uB54C ${inlineMath(`f'(1)`)}\uC740?`, n + 1, `${inlineMath(`f'(x)=${n + 1}x^{${n}}`)}\uC774\uBBC0\uB85C x=1\uC5D0\uC11C ${n + 1}\uC785\uB2C8\uB2E4.`, "1\uC758 \uAC70\uB4ED\uC81C\uACF1\uC740 \uBAA8\uB450 1\uC785\uB2C8\uB2E4.", calculusVisual("power", { n: n + 1, point: 1 })),
          sa(`${inlineMath(`f(x)=${coefficient}x^2`)}\uC77C \uB54C \uC811\uC120 \uAE30\uC6B8\uAE30\uAC00 ${2 * coefficient * point}\uC774 \uB418\uB294 x\uB294?`, point, `${inlineMath(`f'(x)=${2 * coefficient}x`)}\uC774\uBBC0\uB85C \uBC29\uC815\uC2DD\uC744 \uD480\uBA74 x=${point}\uC785\uB2C8\uB2E4.`, "\uB3C4\uD568\uC218\uB97C \uC8FC\uC5B4\uC9C4 \uAE30\uC6B8\uAE30\uC640 \uAC19\uAC8C \uB193\uC73C\uC138\uC694.", calculusVisual("power", { coefficient, n: 2, point })),
          mc(`\uAC70\uB4ED\uC81C\uACF1\uD568\uC218 \uBBF8\uBD84\uC758 \uC62C\uBC14\uB978 \uC21C\uC11C\uB294?`, ["\uC9C0\uC218\uB97C \uACC4\uC218\uB85C \uB0B4\uB9AC\uACE0 \uC9C0\uC218\uB97C 1 \uC904\uC778\uB2E4.", "\uC9C0\uC218\uB97C 1 \uB298\uB9AC\uACE0 \uADF8 \uC218\uB85C \uB098\uB208\uB2E4.", "\uACC4\uC218\uB9CC \uC81C\uACF1\uD55C\uB2E4.", "\uC9C0\uC218\uB9CC 0\uC73C\uB85C \uB9CC\uB4E0\uB2E4."], 0, "\uBBF8\uBD84\uC5D0\uC11C\uB294 \uC9C0\uC218\uB97C \uB0B4\uB9B0 \uB4A4 1 \uC904\uC785\uB2C8\uB2E4.", "\uC801\uBD84 \uADDC\uCE59\uACFC \uD63C\uB3D9\uD558\uC9C0 \uB9C8\uC138\uC694.", calculusVisual("power", { n })),
          sa(`${inlineMath(`\\frac{d}{dx}(${coefficient}x)`)}\uC740?`, coefficient, `\uC77C\uCC28\uD568\uC218\uC758 \uB3C4\uD568\uC218\uB294 x\uC758 \uACC4\uC218 ${coefficient}\uC785\uB2C8\uB2E4.`, "\uC77C\uCC28\uD568\uC218\uC758 \uAE30\uC6B8\uAE30\uB97C \uC77D\uC73C\uC138\uC694.", calculusVisual("power", { coefficient, n: 1 })),
          sa(`${inlineMath(`\\frac{d}{dx}(${coefficient}x^{${n}}+${randomInteger(-5, 5)})`)}\uC5D0\uC11C \uCD5C\uACE0\uCC28\uD56D\uC758 \uACC4\uC218\uB294?`, coefficient * n, "\uC0C1\uC218\uD56D\uC740 \uC0AC\uB77C\uC9C0\uACE0 \uCD5C\uACE0\uCC28\uD56D\uC758 \uACC4\uC218\uC5D0\uB294 \uC9C0\uC218\uAC00 \uACF1\uD574\uC9D1\uB2C8\uB2E4.", "\uCD5C\uACE0\uCC28\uD56D\uB9CC \uBBF8\uBD84\uD574 \uACC4\uC218\uB97C \uBCF4\uC138\uC694.", calculusVisual("power", { coefficient, n }))
        ];
      }
      function polynomialDerivativeProblems() {
        const a = nonZero(-4, 4);
        const b = nonZero(-6, 6);
        const c = randomInteger(-8, 8);
        const d = randomInteger(-8, 8);
        const point = choose([-2, -1, 0, 1, 2]);
        const derivativeAt = 3 * a * point ** 2 + 2 * b * point + c;
        return [
          sa(`${inlineMath(`f(x)=${powerTerm(a, 3)}${signedTerm(b, 2)}${signedTerm(c, 1)}${signedNumber(d)}`)}\uC77C \uB54C ${inlineMath(`f'(${point})`)}\uB294?`, derivativeAt, "\uAC01 \uD56D\uC744 \uBBF8\uBD84\uD55C \uB4A4 x\uAC12\uC744 \uB300\uC785\uD569\uB2C8\uB2E4.", "\uC0C1\uC218\uD56D\uC758 \uB3C4\uD568\uC218\uB294 0\uC785\uB2C8\uB2E4.", calculusVisual("polynomial", { coefficients: [d, c, b, a], point })),
          sa(`${inlineMath(`(${powerTerm(a, 3)}${signedTerm(b, 2)})'`)}\uC5D0\uC11C x\xB2\uC758 \uACC4\uC218\uB294?`, 3 * a, "\uC0BC\uCC28\uD56D\uC744 \uBBF8\uBD84\uD558\uBA74 \uACC4\uC218\uC5D0 3\uC744 \uACF1\uD55C \uC774\uCC28\uD56D\uC774 \uB429\uB2C8\uB2E4.", "\uCD5C\uACE0\uCC28\uD56D\uB9CC \uBA3C\uC800 \uBBF8\uBD84\uD558\uC138\uC694.", calculusVisual("polynomial", { coefficients: [0, 0, b, a] })),
          sa(`${inlineMath(`f(x)=${quadraticExpression(a, b, c)}`)}\uC758 \uB3C4\uD568\uC218\uC5D0\uC11C \uC0C1\uC218\uD56D\uC740?`, b, `${inlineMath(`f'(x)=${2 * a}x${signedNumber(b)}`)}\uC785\uB2C8\uB2E4.`, "\uC77C\uCC28\uD56D\uC744 \uBBF8\uBD84\uD558\uBA74 \uADF8 \uACC4\uC218\uAC00 \uC0C1\uC218\uD56D\uC774 \uB429\uB2C8\uB2E4.", calculusVisual("polynomial", { coefficients: [c, b, a] })),
          mc(`\uB2E4\uD56D\uD568\uC218\uC758 \uBBF8\uBD84\uC5D0 \uB300\uD55C \uC633\uC740 \uC124\uBA85\uC740?`, ["\uAC01 \uD56D\uC744 \uB530\uB85C \uBBF8\uBD84\uD574 \uB354\uD560 \uC218 \uC788\uB2E4.", "\uD569\uC744 \uBBF8\uBD84\uD558\uBA74 \uD56D\uC0C1 \uACF1\uC774 \uB41C\uB2E4.", "\uC0C1\uC218\uD56D\uC740 \uADF8\uB300\uB85C \uB0A8\uB294\uB2E4.", "\uBAA8\uB4E0 \uACC4\uC218\uB294 \uC0AC\uB77C\uC9C4\uB2E4."], 0, "\uBBF8\uBD84\uC740 \uD569\uACFC \uC0C1\uC218\uBC30\uC5D0 \uB300\uD574 \uC120\uD615\uC785\uB2C8\uB2E4.", "\uD56D\uBCC4 \uBBF8\uBD84\uC774 \uAC00\uB2A5\uD55C\uC9C0 \uC0DD\uAC01\uD558\uC138\uC694.", calculusVisual("polynomial")),
          sa(`${inlineMath(`f(x)=${a}x^3${signedTerm(c, 1)}`)}\uC77C \uB54C ${inlineMath(`f'(0)`)}\uC740?`, c, "\uC0BC\uCC28\uD56D\uC758 \uB3C4\uD568\uC218\uB294 x=0\uC5D0\uC11C 0\uC774\uACE0 \uC77C\uCC28\uD56D\uC758 \uACC4\uC218\uB9CC \uB0A8\uC2B5\uB2C8\uB2E4.", "\uB3C4\uD568\uC218\uB97C \uAD6C\uD55C \uB4A4 0\uC744 \uB300\uC785\uD558\uC138\uC694.", calculusVisual("polynomial", { coefficients: [0, c, 0, a], point: 0 })),
          sa(`${inlineMath(`f'(x)=${3 * a}x^2${signedTerm(2 * b, 1)}${signedNumber(c)}`)} \uC774\uACE0 f\uAC00 \uC0BC\uCC28\uD568\uC218\uC77C \uB54C f\uC758 \uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uB294?`, a, "\uC0BC\uCC28\uD56D\uC744 \uBBF8\uBD84\uD560 \uB54C \uACC4\uC218\uC5D0 3\uC774 \uACF1\uD574\uC9D1\uB2C8\uB2E4.", "\uB3C4\uD568\uC218\uC758 x\xB2 \uACC4\uC218\uB97C 3\uC73C\uB85C \uB098\uB204\uC138\uC694.", calculusVisual("polynomial", { coefficients: [d, c, b, a] })),
          sa(`${inlineMath(`g(x)=${quadraticExpression(a, b, c)}`)}\uC77C \uB54C ${inlineMath(`(2g)'(${point})`)}\uB294?`, 2 * (2 * a * point + b), "\uC0C1\uC218\uBC30\uC758 \uBBF8\uBD84\uC740 \uB3C4\uD568\uC218\uC5D0\uB3C4 \uAC19\uC740 \uC0C1\uC218\uBC30\uAC00 \uC801\uC6A9\uB429\uB2C8\uB2E4.", "\uBA3C\uC800 g\u2032\uC744 \uAD6C\uD55C \uB4A4 2\uB97C \uACF1\uD558\uC138\uC694.", calculusVisual("polynomial", { coefficients: [2 * c, 2 * b, 2 * a], point })),
          sa(`${inlineMath(`f'(${point})=${derivativeAt}`)}\uC77C \uB54C ${inlineMath(`(-3f)'(${point})`)}\uB294?`, -3 * derivativeAt, "\uC0C1\uC218\uBC30 -3\uC740 \uBBF8\uBD84 \uB4A4\uC5D0\uB3C4 \uADF8\uB300\uB85C \uACF1\uD574\uC9D1\uB2C8\uB2E4.", "\uC8FC\uC5B4\uC9C4 \uBBF8\uBD84\uACC4\uC218\uC5D0 -3\uC744 \uACF1\uD558\uC138\uC694.", calculusVisual("polynomial", { point, slope: -3 * derivativeAt })),
          mc(`${inlineMath(`(${powerTerm(a, 2)}${signedNumber(c)})'`)}\uB294?`, [`${inlineMath(powerTerm(2 * a, 1))}`, `${inlineMath(powerTerm(a, 1))}`, `${inlineMath(`${powerTerm(2 * a, 1)}+1`)}`, `${inlineMath(powerTerm(a, 2))}`], 0, "\uC0C1\uC218\uD56D\uC740 \uC0AC\uB77C\uC9C0\uACE0 \uC774\uCC28\uD56D\uC740 \uC77C\uCC28\uD56D\uC774 \uB429\uB2C8\uB2E4.", "\uAC01 \uD56D\uC744 \uB530\uB85C \uBBF8\uBD84\uD558\uC138\uC694.", calculusVisual("polynomial", { coefficients: [c, 0, a] })),
          sa(`${inlineMath(`f(x)=${a}x^3${signedTerm(b, 2)}${signedTerm(c, 1)}${signedNumber(d)}`)}\uC758 \uB3C4\uD568\uC218 \uCC28\uC218\uB294?`, 2, "\uC0BC\uCC28\uB2E4\uD56D\uD568\uC218\uC758 \uCD5C\uACE0\uCC28\uD56D\uC744 \uBBF8\uBD84\uD558\uBA74 \uC774\uCC28\uD56D\uC774 \uB429\uB2C8\uB2E4.", "\uCD5C\uACE0\uCC28\uD56D\uC758 \uC9C0\uC218\uAC00 1 \uC904\uC5B4\uB4ED\uB2C8\uB2E4.", calculusVisual("polynomial", { coefficients: [d, c, b, a] }))
        ];
      }
      function tangentProblems() {
        const q = nonZero(1, 4);
        const l = nonZero(-5, 5);
        const c = randomInteger(-6, 6);
        const point = randomInteger(-3, 3);
        const y = q * point ** 2 + l * point + c;
        const slope = 2 * q * point + l;
        const intercept = y - slope * point;
        return [
          sa(`\uACE1\uC120 ${inlineMath(`y=${quadraticExpression(q, l, c)}`)}\uC758 x=${point}\uC778 \uC810\uC5D0\uC11C \uC811\uC120 \uAE30\uC6B8\uAE30\uB294?`, slope, `${inlineMath(`f'(x)=${2 * q}x${signedNumber(l)}`)}\uC5D0 x=${point}\uB97C \uB300\uC785\uD569\uB2C8\uB2E4.`, "\uC811\uC120 \uAE30\uC6B8\uAE30\uB294 f\u2032(a)\uC785\uB2C8\uB2E4.", calculusVisual("tangent", { q, l, c, point })),
          sa(`\uACE1\uC120 ${inlineMath(`y=${quadraticExpression(q, l, c)}`)}\uC758 x=${point}\uC778 \uC810\uC5D0\uC11C \uC811\uC120\uC758 y\uC808\uD3B8\uC740?`, intercept, `\uC811\uC810 (${point},${y})\uC640 \uAE30\uC6B8\uAE30 ${slope}\uB97C \uC774\uC6A9\uD558\uBA74 y=${slope}x${signedNumber(intercept)}\uC785\uB2C8\uB2E4.`, "\uC810-\uAE30\uC6B8\uAE30\uC2DD\uC73C\uB85C \uC811\uC120\uC744 \uB9CC\uB4E0 \uB4A4 x=0\uC744 \uB300\uC785\uD558\uC138\uC694.", calculusVisual("tangent", { q, l, c, point })),
          sa(`\uAE30\uC6B8\uAE30\uAC00 ${slope}\uC774\uACE0 \uC810 (${point},${y})\uB97C \uC9C0\uB098\uB294 \uC9C1\uC120\uC758 y\uC808\uD3B8\uC740?`, intercept, `${inlineMath(`y${signedNumber(-y)}=${slope}(${xMinus(point)})`)}\uB97C \uC815\uB9AC\uD569\uB2C8\uB2E4.`, `\uC9C1\uC120\uC758 \uC2DD ${inlineMath("y=mx+b")}\uC5D0 \uC810\uC744 \uB300\uC785\uD574 \uC0C1\uC218\uD56D\uC744 \uAD6C\uD558\uC138\uC694.`, calculusVisual("line", { point, y, slope })),
          mc(`\uACE1\uC120 y=f(x)\uC758 x=${point}\uC778 \uC810\uC5D0\uC11C \uC811\uC120 \uBC29\uC815\uC2DD\uC740?`, [
            `${inlineMath(`y-f(${point})=f'(${point})(${xMinus(point)})`)}`,
            `${inlineMath(`y=f(${point})x`)}`,
            `${inlineMath(`y-f'(${point})=f(${point})(${xMinus(point)})`)}`,
            `${inlineMath(`y=f(x)-f(${point})`)}`
          ], 0, "\uC811\uC810\uACFC \uADF8 \uC810\uC5D0\uC11C\uC758 \uBBF8\uBD84\uACC4\uC218\uB97C \uC810-\uAE30\uC6B8\uAE30\uC2DD\uC5D0 \uB123\uC2B5\uB2C8\uB2E4.", "\uC9C1\uC120\uC774 \uC9C0\uB098\uC57C \uD558\uB294 \uC810\uACFC \uAE30\uC6B8\uAE30\uB97C \uD655\uC778\uD558\uC138\uC694.", calculusVisual("tangent", { point })),
          sa(`${inlineMath(`f(${point})=${y},\\;f'(${point})=${slope}`)}\uC77C \uB54C \uC811\uC120\uC758 x=${point + 1}\uC5D0\uC11C\uC758 y\uAC12\uC740?`, y + slope, "\uC811\uC810\uC5D0\uC11C x\uAC00 1\uB9CC\uD07C \uBCC0\uD558\uBA74 \uC811\uC120 \uC704 y\uB294 \uAE30\uC6B8\uAE30\uB9CC\uD07C \uBCC0\uD569\uB2C8\uB2E4.", "\uC811\uC120\uC2DD\uC5D0 x=a+1\uC744 \uB123\uC73C\uC138\uC694.", calculusVisual("tangent", { point, y, slope })),
          sa(`\uACE1\uC120 ${inlineMath(`y=${q}x^2`)}\uC5D0\uC11C \uC811\uC120 \uAE30\uC6B8\uAE30\uAC00 ${2 * q * point}\uC778 \uC810\uC758 x\uC88C\uD45C\uB294?`, point, `${inlineMath(`y'=${2 * q}x`)}\uB97C \uC8FC\uC5B4\uC9C4 \uAE30\uC6B8\uAE30\uC640 \uAC19\uAC8C \uB193\uC2B5\uB2C8\uB2E4.`, "\uB3C4\uD568\uC218=\uC811\uC120 \uAE30\uC6B8\uAE30 \uBC29\uC815\uC2DD\uC744 \uD478\uC138\uC694.", calculusVisual("tangent", { q, point })),
          sa(`\uACE1\uC120 ${inlineMath(`y=${quadraticExpression(q, l, c)}`)} \uC704 x=${point}\uC778 \uC811\uC810\uC758 y\uC88C\uD45C\uB294?`, y, "\uC6D0\uD568\uC218\uC5D0 \uC811\uC810\uC758 x\uC88C\uD45C\uB97C \uB300\uC785\uD569\uB2C8\uB2E4.", "\uB3C4\uD568\uC218\uAC00 \uC544\uB2C8\uB77C \uC6D0\uD568\uC218\uC5D0 \uB300\uC785\uD558\uC138\uC694.", calculusVisual("tangent", { q, l, c, point })),
          mc(`\uC811\uC120\uC758 \uBC29\uC815\uC2DD\uC744 \uAD6C\uD560 \uB54C \uD544\uC694\uD558\uC9C0 \uC54A\uC740 \uAC83\uC740?`, ["\uACE1\uC120 \uC804\uCCB4\uC758 \uB113\uC774", "\uC811\uC810\uC758 x\uC88C\uD45C", "\uC811\uC810\uC758 \uD568\uC218\uAC12", "\uC811\uC810\uC5D0\uC11C\uC758 \uBBF8\uBD84\uACC4\uC218"], 0, "\uC811\uC120\uC740 \uD55C \uC810\uACFC \uADF8 \uC810\uC5D0\uC11C\uC758 \uAE30\uC6B8\uAE30\uB85C \uACB0\uC815\uB429\uB2C8\uB2E4.", "\uC810-\uAE30\uC6B8\uAE30\uC2DD\uC5D0 \uB4E4\uC5B4\uAC00\uB294 \uC815\uBCF4\uB97C \uB5A0\uC62C\uB9AC\uC138\uC694.", calculusVisual("tangent", { point })),
          sa(`${inlineMath(`f'(${point})=${slope}`)}\uC77C \uB54C \uADF8 \uC810\uC5D0\uC11C \uC811\uC120\uACFC \uD3C9\uD589\uD55C \uC9C1\uC120\uC758 \uAE30\uC6B8\uAE30\uB294?`, slope, "\uD3C9\uD589\uD55C \uB450 \uC9C1\uC120\uC758 \uAE30\uC6B8\uAE30\uB294 \uAC19\uC2B5\uB2C8\uB2E4.", "\uC811\uC120 \uAE30\uC6B8\uAE30\uB294 f\u2032(a)\uC785\uB2C8\uB2E4.", calculusVisual("line", { slope })),
          sa(`\uC811\uC120 ${inlineMath(`y=${slope}x${signedNumber(intercept)}`)}\uC774 \uACE1\uC120\uACFC \uB9CC\uB098\uB294 \uC811\uC810\uC758 x\uC88C\uD45C\uAC00 ${point}\uC77C \uB54C \uC811\uC810\uC758 y\uC88C\uD45C\uB294?`, y, `\uC811\uC120\uC2DD\uC5D0 x=${point}\uB97C \uB300\uC785\uD558\uBA74 y=${y}\uC785\uB2C8\uB2E4.`, "\uC811\uC810\uC740 \uC811\uC120 \uC704\uC5D0\uB3C4 \uC788\uC2B5\uB2C8\uB2E4.", calculusVisual("tangent", { point, y, slope }))
        ];
      }
      function meanValueProblems() {
        const a = randomInteger(-4, 1);
        const b = a + randomInteger(2, 6);
        const q = nonZero(1, 4);
        const l = nonZero(-4, 4);
        const c = randomInteger(-5, 5);
        const average = q * (a + b) + l;
        const meanPoint = (a + b) / 2;
        return [
          sa(`${inlineMath(`f(x)=${quadraticExpression(q, l, c)}`)}\uC5D0\uC11C [${a},${b}]\uC758 \uD3C9\uADE0\uBCC0\uD654\uC728\uC740?`, average, `${inlineMath(`\\frac{f(${b})-f(${a})}{${b}-${a}}=${average}`)}\uC785\uB2C8\uB2E4.`, "\uB450 \uB05D\uC810\uC744 \uC787\uB294 \uD560\uC120 \uAE30\uC6B8\uAE30\uB97C \uAD6C\uD558\uC138\uC694.", calculusVisual("mvt", { q, l, c, a, b })),
          sa(`\uC704 \uD568\uC218\uC5D0\uC11C \uD3C9\uADE0\uAC12 \uC815\uB9AC\uB97C \uB9CC\uC871\uD558\uB294 c\uB294? ${inlineMath(`f(x)=${quadraticExpression(q, l, c)},\\;[${a},${b}]`)}`, meanPoint, `${inlineMath(`f'(c)=${2 * q}c${signedNumber(l)}=${average}`)}\uB97C \uD480\uBA74 c=${meanPoint}\uC785\uB2C8\uB2E4.`, "\uB3C4\uD568\uC218\uB97C \uD3C9\uADE0\uBCC0\uD654\uC728\uACFC \uAC19\uAC8C \uB193\uC73C\uC138\uC694.", calculusVisual("mvt", { q, l, c, a, b, meanPoint })),
          mc(`\uD3C9\uADE0\uAC12 \uC815\uB9AC\uB97C [${a},${b}]\uC5D0\uC11C \uC801\uC6A9\uD558\uAE30 \uC704\uD55C \uC870\uAC74\uC740?`, ["\uB2EB\uD78C\uAD6C\uAC04\uC5D0\uC11C \uC5F0\uC18D, \uC5F4\uB9B0\uAD6C\uAC04\uC5D0\uC11C \uBBF8\uBD84\uAC00\uB2A5", "\uB2EB\uD78C\uAD6C\uAC04\uC5D0\uC11C\uB9CC \uBBF8\uBD84\uAC00\uB2A5", "\uC591 \uB05D \uD568\uC218\uAC12\uC774 \uAC19\uC74C", "\uB3C4\uD568\uC218\uAC00 \uD56D\uC0C1 0"], 0, "\uB2EB\uD78C\uAD6C\uAC04 \uC5F0\uC18D\uACFC \uC5F4\uB9B0\uAD6C\uAC04 \uBBF8\uBD84\uAC00\uB2A5\uC774 \uD575\uC2EC \uC870\uAC74\uC785\uB2C8\uB2E4.", "\uB05D\uC810\uC5D0\uC11C\uB294 \uBBF8\uBD84\uAC00\uB2A5\uAE4C\uC9C0 \uC694\uAD6C\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", calculusVisual("mvt", { a, b })),
          sa(`\uD568\uC218\uC758 [${a},${b}] \uD3C9\uADE0\uBCC0\uD654\uC728\uC774 ${average}\uB77C\uBA74 \uD3C9\uADE0\uAC12 \uC815\uB9AC\uAC00 \uBCF4\uC7A5\uD558\uB294 \uC5B4\uB5A4 c\uC5D0\uC11C\uC758 f\u2032(c)\uB294?`, average, "\uD3C9\uADE0\uAC12 \uC815\uB9AC\uB294 \uC21C\uAC04\uBCC0\uD654\uC728\uC774 \uD3C9\uADE0\uBCC0\uD654\uC728\uACFC \uAC19\uC740 \uC810\uC758 \uC874\uC7AC\uB97C \uBCF4\uC7A5\uD569\uB2C8\uB2E4.", "\uC8FC\uC5B4\uC9C4 \uD3C9\uADE0\uBCC0\uD654\uC728\uC744 \uADF8\uB300\uB85C \uC0AC\uC6A9\uD558\uC138\uC694.", calculusVisual("mvt", { a, b, average })),
          mc(`\uD3C9\uADE0\uAC12 \uC815\uB9AC\uC758 \uAE30\uD558\uC801 \uC758\uBBF8\uB294?`, ["\uD560\uC120\uACFC \uD3C9\uD589\uD55C \uC811\uC120\uC774 \uC801\uC5B4\uB3C4 \uD558\uB098 \uC874\uC7AC\uD55C\uB2E4.", "\uBAA8\uB4E0 \uC811\uC120\uC774 \uC11C\uB85C \uD3C9\uD589\uD558\uB2E4.", "\uADF8\uB798\uD504\uAC00 \uC9C1\uC120\uC774\uB2E4.", "\uD568\uC218\uAC12\uC774 \uD56D\uC0C1 \uC591\uC218\uB2E4."], 0, "\uAC19\uC740 \uAE30\uC6B8\uAE30\uB97C \uAC16\uB294 \uD560\uC120\uACFC \uC811\uC120\uC740 \uD3C9\uD589\uD569\uB2C8\uB2E4.", "\uD3C9\uADE0\uBCC0\uD654\uC728\uACFC \uC21C\uAC04\uBCC0\uD654\uC728\uC744 \uC9C1\uC120 \uAE30\uC6B8\uAE30\uB85C \uD574\uC11D\uD558\uC138\uC694.", calculusVisual("mvt", { a, b })),
          sa(`\uC77C\uCC28\uD568\uC218 ${inlineMath(`f(x)=${l}x${signedNumber(c)}`)}\uC758 \uC784\uC758 \uAD6C\uAC04\uC5D0\uC11C \uD3C9\uADE0\uBCC0\uD654\uC728\uC740?`, l, "\uC77C\uCC28\uD568\uC218\uB294 \uBAA8\uB4E0 \uAD6C\uAC04\uC758 \uD560\uC120 \uAE30\uC6B8\uAE30\uAC00 \uD568\uC218\uC758 \uAE30\uC6B8\uAE30\uC640 \uAC19\uC2B5\uB2C8\uB2E4.", "x\uC758 \uACC4\uC218\uB97C \uC77D\uC73C\uC138\uC694.", calculusVisual("mvt", { l, c, a, b })),
          mc(`${inlineMath(`f(x)=|${xMinus(meanPoint)}|`)}\uC5D0 [${a},${b}]\uC5D0\uC11C \uD3C9\uADE0\uAC12 \uC815\uB9AC\uB97C \uBC14\uB85C \uC801\uC6A9\uD560 \uC218 \uC5C6\uB294 \uC774\uC720\uB294?`, ["\uAD6C\uAC04 \uC548\uC758 \uBFB0\uC871\uC810\uC5D0\uC11C \uBBF8\uBD84\uAC00\uB2A5\uD558\uC9C0 \uC54A\uB2E4.", "\uD568\uC218\uAC00 \uC5F0\uC18D\uC774 \uC544\uB2C8\uB2E4.", "\uAD6C\uAC04\uC774 \uB2EB\uD600 \uC788\uC9C0 \uC54A\uB2E4.", "\uD568\uC218\uAC12\uC774 \uBAA8\uB450 \uAC19\uB2E4."], 0, "\uC808\uB313\uAC12 \uD568\uC218\uB294 \uAF2D\uC9D3\uC810\uC5D0\uC11C \uBBF8\uBD84\uAC00\uB2A5\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", "\uC5F4\uB9B0\uAD6C\uAC04 \uC548\uC758 \uBBF8\uBD84\uAC00\uB2A5\uC131\uC744 \uD655\uC778\uD558\uC138\uC694.", calculusVisual("cusp", { point: meanPoint })),
          sa(`${inlineMath(`f(${a})=${c},\\;f(${b})=${c + average * (b - a)}`)}\uC77C \uB54C [${a},${b}]\uC758 \uD3C9\uADE0\uBCC0\uD654\uC728\uC740?`, average, "\uD568\uC218\uAC12\uC758 \uCC28\uB97C \uAD6C\uAC04 \uAE38\uC774\uB85C \uB098\uB215\uB2C8\uB2E4.", "\uBD84\uC790\uB294 f(b)-f(a)\uC785\uB2C8\uB2E4.", calculusVisual("secant", { a, b })),
          mc(`\uD3C9\uADE0\uAC12 \uC815\uB9AC\uAC00 \uBCF4\uC7A5\uD558\uB294 c\uC758 \uC704\uCE58\uB294?`, [`${inlineMath(`(${a},${b})`)}`, `${inlineMath(`[${a},${b}]`)}\uC758 \uBC14\uAE65`, "\uD56D\uC0C1 a", "\uD56D\uC0C1 b"], 0, "c\uB294 \uC5F4\uB9B0\uAD6C\uAC04 (a,b) \uC548\uC5D0 \uC874\uC7AC\uD569\uB2C8\uB2E4.", "\uC815\uB9AC\uC758 \uACB0\uB860\uC5D0\uC11C c\uC758 \uBC94\uC704\uB97C \uD655\uC778\uD558\uC138\uC694.", calculusVisual("mvt", { a, b })),
          sa(`\uD3C9\uADE0\uBCC0\uD654\uC728\uC774 ${average}\uC774\uACE0 \uC5B4\uB5A4 c\uC5D0\uC11C ${inlineMath(`f'(c)=k`)}\uB77C \uD560 \uB54C \uD3C9\uADE0\uAC12 \uC815\uB9AC\uC758 \uACB0\uB860\uC5D0 \uB530\uB978 k\uB294?`, average, "\uD3C9\uADE0\uAC12 \uC815\uB9AC\uC5D0\uC11C f\u2032(c)\uB294 \uD3C9\uADE0\uBCC0\uD654\uC728\uACFC \uAC19\uC2B5\uB2C8\uB2E4.", "\uB450 \uAE30\uC6B8\uAE30\uB97C \uAC19\uAC8C \uB193\uC73C\uC138\uC694.", calculusVisual("mvt", { average }))
        ];
      }
      function extremaProblems() {
        const r = randomInteger(1, 4);
        const scale = nonZero(1, 3);
        const vertexX = randomInteger(-4, 4);
        const constant = randomInteger(-5, 5);
        const vertexValue = constant;
        const cubicAtNegative = 2 * scale * r ** 3;
        const cubicAtPositive = -2 * scale * r ** 3;
        return [
          sa(`${inlineMath(`f(x)=${scale}(${xMinus(vertexX)})^2${signedNumber(constant)}`)}\uC758 \uADF9\uC18C\uAC00 \uB418\uB294 x\uB294?`, vertexX, "\uC704\uB85C \uC5F4\uB9B0 \uD3EC\uBB3C\uC120\uC758 \uAF2D\uC9D3\uC810\uC5D0\uC11C \uADF9\uC18C\uAC00 \uB429\uB2C8\uB2E4.", "\uAF2D\uC9D3\uC810\uD615\uC5D0\uC11C x\uC88C\uD45C\uB97C \uC77D\uC73C\uC138\uC694.", calculusVisual("extrema", { scale, vertexX, constant })),
          sa(`\uC704 \uD568\uC218\uC758 \uADF9\uC19F\uAC12\uC740? ${inlineMath(`f(x)=${scale}(${xMinus(vertexX)})^2${signedNumber(constant)}`)}`, vertexValue, "\uC81C\uACF1\uD56D\uC774 0\uC77C \uB54C \uD568\uC218\uAC12\uC740 \uC0C1\uC218\uD56D\uC785\uB2C8\uB2E4.", "\uAF2D\uC9D3\uC810\uC758 y\uC88C\uD45C\uB97C \uC77D\uC73C\uC138\uC694.", calculusVisual("extrema", { scale, vertexX, constant })),
          mc(`${inlineMath(`f'(x)>0`)}\uC778 \uAD6C\uAC04\uC5D0\uC11C f\uB294?`, ["\uC99D\uAC00\uD55C\uB2E4.", "\uAC10\uC18C\uD55C\uB2E4.", "\uD56D\uC0C1 0\uC774\uB2E4.", "\uBD88\uC5F0\uC18D\uC774\uB2E4."], 0, "\uC811\uC120 \uAE30\uC6B8\uAE30\uAC00 \uC591\uC218\uC774\uBA74 x\uAC00 \uC99D\uAC00\uD560\uC218\uB85D \uD568\uC218\uAC12\uC774 \uC99D\uAC00\uD569\uB2C8\uB2E4.", "\uB3C4\uD568\uC218\uC758 \uBD80\uD638\uB97C \uAE30\uC6B8\uAE30\uB85C \uD574\uC11D\uD558\uC138\uC694.", calculusVisual("sign-chart", { sign: 1 })),
          mc(`\uB3C4\uD568\uC218\uC758 \uBD80\uD638\uAC00 +\uC5D0\uC11C -\uB85C \uBC14\uB00C\uB294 \uC810\uC740?`, ["\uADF9\uB300\uC810", "\uADF9\uC18C\uC810", "\uD56D\uC0C1 \uBCC0\uACE1\uC810", "\uBD88\uC5F0\uC18D\uC810"], 0, "\uC99D\uAC00\uD558\uB2E4 \uAC10\uC18C\uD558\uBBC0\uB85C \uBD09\uC6B0\uB9AC\uC778 \uADF9\uB300\uAC00 \uB429\uB2C8\uB2E4.", "\uD568\uC218\uC758 \uC9C4\uD589 \uBC29\uD5A5 \uBCC0\uD654\uB97C \uC77D\uC73C\uC138\uC694.", calculusVisual("sign-chart", { signs: [1, -1] })),
          sa(`${inlineMath(`f'(x)=${scale}(x-${r})(x+${r})`)}\uC758 \uC784\uACC4\uC810 \uC911 \uC591\uC218\uC778 \uAC83\uC740?`, r, "\uB3C4\uD568\uC218\uAC00 0\uC774 \uB418\uB294 x\uB294 \xB1r\uC785\uB2C8\uB2E4.", "\uAC01 \uC778\uC790\uB97C 0\uC73C\uB85C \uB193\uC73C\uC138\uC694.", calculusVisual("sign-chart", { roots: [-r, r], scale })),
          mc(`${inlineMath(`f'(x)=${scale > 0 ? "" : "-"}(x-${r})(x+${r})`)}\uC5D0\uC11C \uB3C4\uD568\uC218\uC758 \uBD80\uD638\uAC00 \uBC14\uB00C\uB294 \uC9C0\uC810\uC758 \uAC1C\uC218\uB294?`, ["2\uAC1C", "1\uAC1C", "0\uAC1C", "\uBB34\uD55C\uD788 \uB9CE\uB2E4"], 0, "\uC11C\uB85C \uB2E4\uB978 \uB450 \uB2E8\uC21C\uADFC \xB1r\uC5D0\uC11C \uBD80\uD638\uAC00 \uAC01\uAC01 \uBC14\uB01D\uB2C8\uB2E4.", "\uB3C4\uD568\uC218\uC758 \uADFC\uACFC \uC911\uBCF5\uB3C4\uB97C \uD655\uC778\uD558\uC138\uC694.", calculusVisual("sign-chart", { roots: [-r, r], scale })),
          sa(`${inlineMath(`f(x)=${scale}x^3-${3 * scale * r ** 2}x`)}\uC5D0\uC11C x=-${r}\uC77C \uB54C \uD568\uC218\uAC12\uC740?`, cubicAtNegative, "\uC6D0\uD568\uC218\uC5D0 x=-r\uC744 \uB300\uC785\uD569\uB2C8\uB2E4.", "\uADF9\uAC12\uC758 \uC704\uCE58\uB97C \uCC3E\uC740 \uB4A4 \uC6D0\uD568\uC218\uAC12\uC744 \uACC4\uC0B0\uD558\uC138\uC694.", calculusVisual("extrema", { r, scale })),
          sa(`${inlineMath(`f(x)=${scale}x^3-${3 * scale * r ** 2}x`)}\uC5D0\uC11C x=${r}\uC77C \uB54C \uD568\uC218\uAC12\uC740?`, cubicAtPositive, "\uC6D0\uD568\uC218\uC5D0 x=r\uC744 \uB300\uC785\uD569\uB2C8\uB2E4.", "\uB3C4\uD568\uC218\uAC00 \uC544\uB2C8\uB77C \uC6D0\uD568\uC218\uC5D0 \uB300\uC785\uD558\uC138\uC694.", calculusVisual("extrema", { r, scale })),
          mc(`\uADF9\uAC12\uC744 \uD310\uC815\uD560 \uB54C \uAC00\uC7A5 \uC9C1\uC811\uC801\uC73C\uB85C \uD544\uC694\uD55C \uAC83\uC740?`, ["\uC784\uACC4\uC810 \uC591\uCABD\uC5D0\uC11C \uB3C4\uD568\uC218\uC758 \uBD80\uD638 \uBCC0\uD654", "\uD568\uC218\uC2DD\uC758 \uAE00\uC790 \uC218", "y\uC808\uD3B8\uB9CC", "\uC815\uC758\uC5ED\uC758 \uAE38\uC774\uB9CC"], 0, "\uADF9\uB300\xB7\uADF9\uC18C\uB294 \uC784\uACC4\uC810 \uC8FC\uBCC0\uC758 \uC99D\uAC00\xB7\uAC10\uC18C \uBCC0\uD654\uB85C \uD310\uC815\uD569\uB2C8\uB2E4.", "\uB3C4\uD568\uC218 \uBD80\uD638\uD45C\uB97C \uB5A0\uC62C\uB9AC\uC138\uC694.", calculusVisual("sign-chart", { r })),
          sa(`${inlineMath(`f'(x)=2(${xMinus(vertexX)})`)}\uC77C \uB54C f\uAC00 \uAC10\uC18C\uD558\uB294 \uAD6C\uAC04\uC758 \uC624\uB978\uCABD \uACBD\uACC4\uB294?`, vertexX, `\uB3C4\uD568\uC218\uB294 ${inlineMath(`x<${vertexX}`)}\uC5D0\uC11C \uC74C\uC218\uC774\uBBC0\uB85C \uADF8 \uC810\uAE4C\uC9C0 \uAC10\uC18C\uD569\uB2C8\uB2E4.`, "\uB3C4\uD568\uC218\uAC00 0\uBCF4\uB2E4 \uC791\uC740 \uBD80\uB4F1\uC2DD\uC744 \uD478\uC138\uC694.", calculusVisual("sign-chart", { root: vertexX }))
        ];
      }
      function graphShapeProblems() {
        const r = randomInteger(1, 4);
        const scale = nonZero(1, 3);
        const shift = randomInteger(-4, 4);
        return [
          mc(`${inlineMath(`f'(x)=${scale > 0 ? "" : "-"}(${xMinus(shift)})`)}\uC774\uACE0 ${scale > 0 ? "\uACC4\uC218\uAC00 \uC591\uC218" : "\uACC4\uC218\uAC00 \uC74C\uC218"}\uC77C \uB54C f\uC758 \uADF8\uB798\uD504\uB294 x=${shift}\uC5D0\uC11C?`, scale > 0 ? ["\uADF9\uC18C", "\uADF9\uB300", "\uBCC0\uD654 \uC5C6\uC74C", "\uBD88\uC5F0\uC18D"] : ["\uADF9\uB300", "\uADF9\uC18C", "\uBCC0\uD654 \uC5C6\uC74C", "\uBD88\uC5F0\uC18D"], 0, "\uB3C4\uD568\uC218\uC758 \uBD80\uD638 \uBCC0\uD654\uB85C \uAF2D\uC9D3\uC810\uC758 \uC885\uB958\uB97C \uD310\uC815\uD569\uB2C8\uB2E4.", "\uC784\uACC4\uC810 \uC88C\uC6B0\uC758 \uBD80\uD638\uB97C \uD655\uC778\uD558\uC138\uC694.", calculusVisual("graph-shape", { shift, scale })),
          sa(`${inlineMath(`f(x)=${scale}(${xMinus(shift)})^2`)}\uC758 \uB300\uCE6D\uCD95\uC740 x=?`, shift, `\uAF2D\uC9D3\uC810\uD615 \uC774\uCC28\uD568\uC218\uC758 \uB300\uCE6D\uCD95\uC740 ${inlineMath(`x=${shift}`)}\uC785\uB2C8\uB2E4.`, "\uC81C\uACF1 \uC548\uC744 0\uC73C\uB85C \uB9CC\uB4DC\uB294 x\uB97C \uCC3E\uC73C\uC138\uC694.", calculusVisual("graph-shape", { shift, scale })),
          mc(`\uC0BC\uCC28\uD568\uC218\uC758 \uB3C4\uD568\uC218\uAC00 \uC11C\uB85C \uB2E4\uB978 \uB450 \uC2E4\uADFC\uC744 \uAC00\uC9C0\uBA74 \uAC00\uB2A5\uD55C \uADF8\uB798\uD504 \uBAA8\uC591\uC740?`, ["\uADF9\uB300\uC640 \uADF9\uC18C\uB97C \uAC01\uAC01 \uD558\uB098 \uAC00\uC9C8 \uC218 \uC788\uB2E4.", "\uD56D\uC0C1 \uC9C1\uC120\uC774\uB2E4.", "\uADF9\uAC12\uC774 \uC808\uB300 \uC5C6\uB2E4.", "\uC815\uC758\uC5ED\uC774 \uD55C \uC810\uC774\uB2E4."], 0, "\uB3C4\uD568\uC218\uC758 \uB450 \uB2E8\uC21C\uADFC\uC5D0\uC11C \uC99D\uAC00\xB7\uAC10\uC18C\uAC00 \uBC14\uB00C\uBA74 \uB450 \uADF9\uAC12\uC774 \uC0DD\uAE41\uB2C8\uB2E4.", "\uC784\uACC4\uC810\uC758 \uAC1C\uC218\uB97C \uADF8\uB798\uD504 \uBC29\uD5A5 \uC804\uD658\uACFC \uC5F0\uACB0\uD558\uC138\uC694.", calculusVisual("graph-shape", { roots: [-r, r] })),
          sa(`${inlineMath(`f(x)=x^3-${3 * r ** 2}x`)}\uC758 \uC784\uACC4\uC810 \uC0AC\uC774 \uAD6C\uAC04 \uAE38\uC774\uB294?`, 2 * r, "\uB3C4\uD568\uC218 3(x-r)(x+r)=0\uC758 \uB450 \uADFC\uC740 -r,r\uC785\uB2C8\uB2E4.", "\uB450 \uC784\uACC4\uC810\uC758 \uCC28\uB97C \uAD6C\uD558\uC138\uC694.", calculusVisual("graph-shape", { roots: [-r, r] })),
          mc(`\uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uAC00 \uC591\uC218\uC778 \uC0BC\uCC28\uD568\uC218\uC758 \uC591 \uB05D \uBC29\uD5A5\uC740?`, ["\uC67C\uCABD \uC544\uB798, \uC624\uB978\uCABD \uC704", "\uC67C\uCABD \uC704, \uC624\uB978\uCABD \uC544\uB798", "\uC591\uCABD \uBAA8\uB450 \uC704", "\uC591\uCABD \uBAA8\uB450 \uC544\uB798"], 0, "\uC591\uC758 \uC0BC\uCC28\uD56D\uC740 x\u2192-\u221E\uC5D0\uC11C -\u221E, x\u2192\u221E\uC5D0\uC11C \u221E\uC785\uB2C8\uB2E4.", "\uCD5C\uACE0\uCC28\uD56D\uB9CC \uBCF4\uC544 \uB05D\uBAA8\uC591\uC744 \uD310\uB2E8\uD558\uC138\uC694.", calculusVisual("graph-shape", { degree: 3, leading: 1 })),
          mc(`\uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uAC00 ${scale > 0 ? "\uC591\uC218" : "\uC74C\uC218"}\uC778 \uC774\uCC28\uD568\uC218\uB294?`, scale > 0 ? ["\uC704\uB85C \uC5F4\uB9B0\uB2E4.", "\uC544\uB798\uB85C \uC5F4\uB9B0\uB2E4.", "\uD56D\uC0C1 \uC99D\uAC00\uD55C\uB2E4.", "\uC9C1\uC120\uC774\uB2E4."] : ["\uC544\uB798\uB85C \uC5F4\uB9B0\uB2E4.", "\uC704\uB85C \uC5F4\uB9B0\uB2E4.", "\uD56D\uC0C1 \uC99D\uAC00\uD55C\uB2E4.", "\uC9C1\uC120\uC774\uB2E4."], 0, "\uC774\uCC28\uD56D \uACC4\uC218\uC758 \uBD80\uD638\uAC00 \uD3EC\uBB3C\uC120\uC774 \uC5F4\uB9AC\uB294 \uBC29\uD5A5\uC744 \uC815\uD569\uB2C8\uB2E4.", "\uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uC758 \uBD80\uD638\uB97C \uBCF4\uC138\uC694.", calculusVisual("graph-shape", { degree: 2, leading: scale })),
          sa(`${inlineMath(`f'(x)=3(x-${r})(x+${r})`)}\uC77C \uB54C \uC99D\uAC00\xB7\uAC10\uC18C \uAD6C\uAC04\uC744 \uB098\uB204\uB294 \uACBD\uACC4\uC810\uC758 \uAC1C\uC218\uB294?`, 2, "\uB3C4\uD568\uC218\uC758 \uC11C\uB85C \uB2E4\uB978 \uB450 \uC601\uC810\uC774 \uAD6C\uAC04 \uACBD\uACC4\uAC00 \uB429\uB2C8\uB2E4.", "f\u2032(x)=0\uC758 \uC2E4\uADFC \uAC1C\uC218\uB97C \uC138\uC138\uC694.", calculusVisual("sign-chart", { roots: [-r, r] })),
          mc(`\uADF8\uB798\uD504 \uAC1C\uD615\uC744 \uADF8\uB9B4 \uB54C \uAC00\uC7A5 \uBA3C\uC800 \uD655\uC778\uD560 \uC815\uBCF4\uB85C \uC801\uC808\uD55C \uAC83\uC740?`, ["\uC815\uC758\uC5ED\uACFC \uC808\uD3B8, \uB05D\uBAA8\uC591", "\uC815\uC801\uBD84 \uC0C1\uC218\uB9CC", "\uD45C\uBCF8\uC758 \uD06C\uAE30", "\uD655\uB960\uC758 \uD569"], 0, "\uADF8\uB798\uD504\uC758 \uAE30\uBCF8 \uC704\uCE58\uC640 \uC804\uCCB4 \uBC29\uD5A5\uC744 \uBA3C\uC800 \uC7A1\uC544\uC57C \uD569\uB2C8\uB2E4.", "\uBBF8\uBD84 \uC804\uC5D0\uB3C4 \uC54C \uC218 \uC788\uB294 \uC815\uBCF4\uB97C \uCC3E\uC73C\uC138\uC694.", calculusVisual("graph-shape")),
          sa(`${inlineMath(`f(x)=(${xMinus(shift)})^2${signedNumber(r)}`)}\uC758 \uAF2D\uC9D3\uC810 y\uC88C\uD45C\uB294?`, r, "\uC81C\uACF1\uD56D\uC774 0\uC77C \uB54C y=r\uC785\uB2C8\uB2E4.", "\uAF2D\uC9D3\uC810\uD615\uC5D0\uC11C \uC0C1\uC218\uD56D\uC744 \uC77D\uC73C\uC138\uC694.", calculusVisual("graph-shape", { shift, vertexY: r })),
          mc(`\uB3C4\uD568\uC218\uAC00 \uBAA8\uB4E0 \uC2E4\uC218\uC5D0\uC11C \uC591\uC218\uC778 \uD568\uC218\uC758 \uADF8\uB798\uD504\uB294?`, ["\uC804\uCCB4 \uAD6C\uAC04\uC5D0\uC11C \uC99D\uAC00\uD55C\uB2E4.", "\uC804\uCCB4 \uAD6C\uAC04\uC5D0\uC11C \uAC10\uC18C\uD55C\uB2E4.", "\uD56D\uC0C1 x\uCD95 \uC704\uB2E4.", "\uD56D\uC0C1 \uC9C1\uC120\uC774\uB2E4."], 0, "\uB3C4\uD568\uC218 \uC591\uC218\uB294 \uBAA8\uB4E0 \uC810\uC758 \uC811\uC120 \uAE30\uC6B8\uAE30\uAC00 \uC591\uC218\uB77C\uB294 \uB73B\uC785\uB2C8\uB2E4.", "\uD568\uC218\uAC12\uC758 \uBD80\uD638\uC640 \uAE30\uC6B8\uAE30\uC758 \uBD80\uD638\uB97C \uAD6C\uBD84\uD558\uC138\uC694.", calculusVisual("graph-shape", { derivativePositive: true }))
        ];
      }
      function equationInequalityProblems() {
        const shift = randomInteger(-5, 5);
        const minimum = randomInteger(-5, 5);
        const k = minimum + randomInteger(-3, 3);
        const r = randomInteger(1, 5);
        return [
          sa(`${inlineMath(`f(x)=(${xMinus(shift)})^2${signedNumber(minimum)}`)}\uC758 \uCD5C\uC19F\uAC12\uC740?`, minimum, "\uC81C\uACF1\uD56D\uC758 \uCD5C\uC19F\uAC12\uC740 0\uC785\uB2C8\uB2E4.", "\uAF2D\uC9D3\uC810\uC758 y\uC88C\uD45C\uB97C \uC77D\uC73C\uC138\uC694.", calculusVisual("equation", { shift, minimum })),
          mc(`${inlineMath(`(${xMinus(shift)})^2${signedNumber(minimum)}=${k}`)}\uC758 \uC2E4\uADFC \uAC1C\uC218\uB294?`, k > minimum ? ["2\uAC1C", "1\uAC1C", "0\uAC1C", "\uBB34\uD55C\uD788 \uB9CE\uB2E4"] : k === minimum ? ["1\uAC1C", "2\uAC1C", "0\uAC1C", "\uBB34\uD55C\uD788 \uB9CE\uB2E4"] : ["0\uAC1C", "1\uAC1C", "2\uAC1C", "\uBB34\uD55C\uD788 \uB9CE\uB2E4"], 0, `\uD3EC\uBB3C\uC120\uC758 \uCD5C\uC19F\uAC12 ${minimum}\uACFC \uC218\uD3C9\uC120 y=${k}\uB97C \uBE44\uAD50\uD569\uB2C8\uB2E4.`, "\uC218\uD3C9\uC120\uACFC \uADF8\uB798\uD504\uC758 \uAD50\uC810 \uC218\uB85C \uD574\uC11D\uD558\uC138\uC694.", calculusVisual("equation", { shift, minimum, k })),
          sa(`${inlineMath(`(${xMinus(shift)})^2\\ge${r ** 2}`)}\uC758 \uACBD\uACC4 \uC911 \uD070 \uAC12\uC740?`, shift + r, `\uB4F1\uD638\uC758 \uD574\uB294 ${inlineMath(`x=${shift}\\pm${r}`)}\uC785\uB2C8\uB2E4.`, "\uC81C\uACF1 \uBD80\uB4F1\uC2DD\uC758 \uACBD\uACC4\uBD80\uD130 \uAD6C\uD558\uC138\uC694.", calculusVisual("inequality", { shift, r })),
          sa(`${inlineMath(`(${xMinus(shift)})^2\\le${r ** 2}`)}\uC758 \uD574 \uAD6C\uAC04 \uAE38\uC774\uB294?`, 2 * r, `\uD574\uB294 ${shift - r}\u2264x\u2264${shift + r}\uC774\uBBC0\uB85C \uAE38\uC774\uB294 ${2 * r}\uC785\uB2C8\uB2E4.`, "\uB450 \uACBD\uACC4\uAC12\uC758 \uCC28\uB97C \uAD6C\uD558\uC138\uC694.", calculusVisual("inequality", { shift, r })),
          mc(`\uD568\uC218\uC758 \uCD5C\uC19F\uAC12\uC774 ${minimum}\uC77C \uB54C \uBC29\uC815\uC2DD f(x)=${minimum - 1}\uC758 \uC2E4\uADFC\uC740?`, ["\uC5C6\uB2E4.", "1\uAC1C\uB2E4.", "2\uAC1C\uB2E4.", "\uD56D\uC0C1 3\uAC1C\uB2E4."], 0, "\uC218\uD3C9\uC120\uC774 \uADF8\uB798\uD504\uC758 \uCD5C\uC19F\uAC12\uBCF4\uB2E4 \uC544\uB798\uC5D0 \uC788\uC5B4 \uB9CC\uB098\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", "\uD568\uC22B\uAC12\uC758 \uAC00\uB2A5\uD55C \uBC94\uC704\uB97C \uD655\uC778\uD558\uC138\uC694.", calculusVisual("equation", { minimum })),
          mc(`\uBC29\uC815\uC2DD f(x)=k\uC758 \uC2E4\uADFC \uAC1C\uC218\uB97C \uADF8\uB798\uD504\uB85C \uD310\uB2E8\uD560 \uB54C \uC138\uB294 \uAC83\uC740?`, ["y=f(x)\uC640 y=k\uC758 \uAD50\uC810", "f\u2032(x)\uC758 \uACC4\uC218", "x\uCD95 \uB208\uAE08 \uC218", "\uC815\uC758\uC5ED\uC758 \uAE00\uC790 \uC218"], 0, "\uBC29\uC815\uC2DD\uC758 \uD574\uB294 \uB450 \uADF8\uB798\uD504\uAC00 \uAC19\uC740 y\uAC12\uC744 \uAC16\uB294 x\uC88C\uD45C\uC785\uB2C8\uB2E4.", "\uB4F1\uC2DD\uC744 \uB450 \uADF8\uB798\uD504\uC758 \uB9CC\uB0A8\uC73C\uB85C \uBC14\uAFB8\uC138\uC694.", calculusVisual("equation", { k })),
          sa(`${inlineMath(`f(x)=-(${xMinus(shift)})^2${signedNumber(minimum)}`)}\uC758 \uCD5C\uB313\uAC12\uC740?`, minimum, "\uC74C\uC758 \uC81C\uACF1\uD56D\uC740 0\uC77C \uB54C \uAC00\uC7A5 \uD07D\uB2C8\uB2E4.", "\uC544\uB798\uB85C \uC5F4\uB9B0 \uD3EC\uBB3C\uC120\uC758 \uAF2D\uC9D3\uC810\uC744 \uBCF4\uC138\uC694.", calculusVisual("equation", { shift, maximum: minimum })),
          mc(`${inlineMath(`f'(x)=2(${xMinus(shift)})`)}\uC77C \uB54C f\uC758 \uCD5C\uC19F\uAC12\uC774 \uC0DD\uAE30\uB294 x\uB294?`, [`${inlineMath(String(shift))}`, `${inlineMath(String(shift + 1))}`, `${inlineMath(String(shift - 1))}`, "\uC874\uC7AC\uD558\uC9C0 \uC54A\uC74C"], 0, `\uB3C4\uD568\uC218\uAC00 \uC74C\uC218\uC5D0\uC11C \uC591\uC218\uB85C \uBC14\uB00C\uB294 ${inlineMath(`x=${shift}`)}\uC5D0\uC11C \uADF9\uC18C\uC785\uB2C8\uB2E4.`, "\uB3C4\uD568\uC218\uAC00 0\uC778 \uC9C0\uC810\uC744 \uAD6C\uD558\uACE0 \uBD80\uD638 \uBCC0\uD654\uB97C \uBCF4\uC138\uC694.", calculusVisual("sign-chart", { root: shift })),
          sa(`${inlineMath(`x^2-${2 * r}x+k`)}\uAC00 \uBAA8\uB4E0 \uC2E4\uC218 x\uC5D0\uC11C 0 \uC774\uC0C1\uC774 \uB418\uAE30 \uC704\uD55C k\uC758 \uCD5C\uC19F\uAC12\uC740?`, r ** 2, `${inlineMath(`(x-${r})^2+k-${r ** 2}`)}\uC758 \uCD5C\uC19F\uAC12\uC774 0 \uC774\uC0C1\uC774\uC5B4\uC57C \uD569\uB2C8\uB2E4.`, "\uC644\uC804\uC81C\uACF1\uC2DD\uC73C\uB85C \uBC14\uAFB8\uC5B4 \uCD5C\uC19F\uAC12\uC744 \uAD6C\uD558\uC138\uC694.", calculusVisual("inequality", { r })),
          mc(`\uBD80\uB4F1\uC2DD f(x)\u22650\uC758 \uD574\uB294 \uADF8\uB798\uD504\uC5D0\uC11C?`, ["x\uCD95 \uC704 \uB610\uB294 x\uCD95 \uC704\uC758 \uC810\uC5D0 \uD574\uB2F9\uD558\uB294 x", "y\uCD95 \uC624\uB978\uCABD\uC758 \uBAA8\uB4E0 x", "\uB3C4\uD568\uC218\uAC00 0\uC778 \uC810\uB9CC", "\uADF8\uB798\uD504\uC758 \uB113\uC774"], 0, "\uD568\uC218\uAC12\uC758 \uBD80\uD638\uB294 \uADF8\uB798\uD504\uAC00 x\uCD95\uBCF4\uB2E4 \uC704\uC778\uC9C0 \uC544\uB798\uC778\uC9C0\uB85C \uC77D\uC2B5\uB2C8\uB2E4.", "y=f(x)\uC758 \uB192\uC774\uB97C x\uCD95\uACFC \uBE44\uAD50\uD558\uC138\uC694.", calculusVisual("inequality"))
        ];
      }
      function motionProblems() {
        const a = nonZero(1, 4);
        const b = -randomInteger(1, 6);
        const c = randomInteger(-5, 5);
        const time = randomInteger(1, 5);
        const velocity = 2 * a * time + b;
        const acceleration = 2 * a;
        return [
          sa(`\uC704\uCE58 ${inlineMath(`s(t)=${a}t^2${signedTerm(b, 1, "t")}${signedNumber(c)}`)}\uC77C \uB54C t=${time}\uC758 \uC18D\uB3C4\uB294?`, velocity, `${inlineMath(`v(t)=s'(t)=${2 * a}t${signedNumber(b)}`)}\uC785\uB2C8\uB2E4.`, "\uC704\uCE58\uD568\uC218\uB97C \uC2DC\uAC04\uC73C\uB85C \uD55C \uBC88 \uBBF8\uBD84\uD558\uC138\uC694.", calculusVisual("motion", { a, b, c, time })),
          sa(`\uC704 \uC6B4\uB3D9\uC758 \uAC00\uC18D\uB3C4\uB294? ${inlineMath(`s(t)=${a}t^2${signedTerm(b, 1, "t")}${signedNumber(c)}`)}`, acceleration, `${inlineMath(`a(t)=s''(t)=${acceleration}`)}\uC785\uB2C8\uB2E4.`, "\uC704\uCE58\uD568\uC218\uB97C \uB450 \uBC88 \uBBF8\uBD84\uD558\uC138\uC694.", calculusVisual("motion", { a, b, c })),
          sa(`\uC18D\uB3C4 ${inlineMath(`v(t)=${2 * a}t${signedNumber(b)}`)}\uC77C \uB54C t=${time}\uC758 \uC18D\uB825\uC740?`, Math.abs(velocity), "\uC18D\uB825\uC740 \uC18D\uB3C4\uC758 \uC808\uB313\uAC12\uC785\uB2C8\uB2E4.", "\uBC29\uD5A5\uC744 \uB098\uD0C0\uB0B4\uB294 \uBD80\uD638\uB97C \uC81C\uAC70\uD558\uC138\uC694.", calculusVisual("motion", { a, b, time })),
          sa(`\uC704\uCE58 ${inlineMath(`s(t)=${a}t^2${signedTerm(b, 1, "t")}${signedNumber(c)}`)}\uC5D0\uC11C \uC815\uC9C0\uD558\uB294 \uC2DC\uAC01\uC774 \uC591\uC218\uB77C\uBA74 \uADF8 \uAC12\uC740?`, round4(-b / (2 * a)), "v(t)=0\uC744 \uD480\uC5B4 \uC815\uC9C0 \uC2DC\uAC01\uC744 \uAD6C\uD569\uB2C8\uB2E4.", "\uC704\uCE58\uD568\uC218\uB97C \uBBF8\uBD84\uD55C \uB4A4 \uC18D\uB3C4\uB97C 0\uC73C\uB85C \uB193\uC73C\uC138\uC694.", calculusVisual("motion", { a, b })),
          mc(`\uC9C1\uC120 \uC6B4\uB3D9\uC5D0\uC11C \uC18D\uB3C4\uAC00 \uC74C\uC218\uB77C\uB294 \uB73B\uC740?`, ["\uC815\uD55C \uC591\uC758 \uBC29\uD5A5\uACFC \uBC18\uB300\uB85C \uC6C0\uC9C1\uC778\uB2E4.", "\uBC18\uB4DC\uC2DC \uB290\uB824\uC9C4\uB2E4.", "\uC815\uC9C0\uD574 \uC788\uB2E4.", "\uAC00\uC18D\uB3C4\uAC00 0\uC774\uB2E4."], 0, "\uC18D\uB3C4\uC758 \uBD80\uD638\uB294 \uC6B4\uB3D9 \uBC29\uD5A5\uC744 \uB098\uD0C0\uB0C5\uB2C8\uB2E4.", "\uC18D\uB825\uACFC \uC18D\uB3C4\uB97C \uAD6C\uBD84\uD558\uC138\uC694.", calculusVisual("motion")),
          mc(`\uC18D\uB3C4\uC640 \uAC00\uC18D\uB3C4\uC758 \uBD80\uD638\uAC00 \uAC19\uC744 \uB54C \uBB3C\uCCB4\uC758 \uC18D\uB825\uC740 \uC77C\uBC18\uC801\uC73C\uB85C?`, ["\uC99D\uAC00\uD55C\uB2E4.", "\uAC10\uC18C\uD55C\uB2E4.", "\uD56D\uC0C1 0\uC774\uB2E4.", "\uD310\uB2E8\uD560 \uC218 \uC5C6\uB2E4."], 0, "\uC9C4\uD589 \uBC29\uD5A5\uACFC \uAC19\uC740 \uBC29\uD5A5\uC73C\uB85C \uAC00\uC18D\uB418\uBA74 \uC18D\uB825\uC758 \uD06C\uAE30\uAC00 \uCEE4\uC9D1\uB2C8\uB2E4.", "\uC18D\uB3C4 \uBCA1\uD130\uC640 \uAC00\uC18D\uB3C4 \uBC29\uD5A5\uC744 \uBE44\uAD50\uD558\uC138\uC694.", calculusVisual("motion", { sameSign: true })),
          sa(`\uC18D\uB3C4 ${inlineMath(`v(t)=${a}t^2${signedTerm(b, 1, "t")}${signedNumber(c)}`)}\uC77C \uB54C t=${time}\uC758 \uAC00\uC18D\uB3C4\uB294?`, 2 * a * time + b, `${inlineMath(`a(t)=v'(t)=${2 * a}t${signedNumber(b)}`)}\uC785\uB2C8\uB2E4.`, "\uC18D\uB3C4\uB97C \uC2DC\uAC04\uC73C\uB85C \uBBF8\uBD84\uD558\uC138\uC694.", calculusVisual("motion", { a, b, c, time })),
          sa(`\uAC00\uC18D\uB3C4\uAC00 \uC77C\uC815\uD558\uAC8C ${acceleration}\uC774\uACE0 \uCD08\uAE30\uC18D\uB3C4\uAC00 ${b}\uC77C \uB54C t=${time}\uC758 \uC18D\uB3C4\uB294?`, acceleration * time + b, `${inlineMath(`v(t)=${b}+${acceleration}t`)}\uC785\uB2C8\uB2E4.`, "\uCD08\uAE30\uC18D\uB3C4\uC5D0 \uAC00\uC18D\uB3C4\xD7\uC2DC\uAC04\uC744 \uB354\uD558\uC138\uC694.", calculusVisual("motion", { acceleration, initialVelocity: b, time })),
          mc(`\uC704\uCE58\xB7\uC18D\uB3C4\xB7\uAC00\uC18D\uB3C4\uC758 \uC62C\uBC14\uB978 \uAD00\uACC4\uB294?`, ["s\uB97C \uBBF8\uBD84\uD558\uBA74 v, v\uB97C \uBBF8\uBD84\uD558\uBA74 a", "s\uB97C \uB450 \uBC88 \uC801\uBD84\uD558\uBA74 v", "v\uB97C \uBBF8\uBD84\uD558\uBA74 s", "a\uB97C \uBBF8\uBD84\uD558\uBA74 v"], 0, "\uC2DC\uAC04\uC5D0 \uB300\uD55C \uBBF8\uBD84 \uC21C\uC11C\uB294 \uC704\uCE58\u2192\uC18D\uB3C4\u2192\uAC00\uC18D\uB3C4\uC785\uB2C8\uB2E4.", "\uBCC0\uD654\uC728\uC758 \uC21C\uC11C\uB97C \uD655\uC778\uD558\uC138\uC694.", calculusVisual("motion")),
          sa(`t=${time}\uC5D0\uC11C \uC18D\uB3C4\uAC00 ${velocity}\uB77C\uBA74 \uADF8 \uC21C\uAC04 \uC18D\uB825\uC740?`, Math.abs(velocity), "\uC18D\uB825\uC740 \uC18D\uB3C4\uC758 \uD06C\uAE30\uC774\uBBC0\uB85C \uC808\uB313\uAC12\uC744 \uCDE8\uD569\uB2C8\uB2E4.", "\uC74C\uC218\uC5EC\uB3C4 \uC774\uB3D9\uC758 \uBE60\uB974\uAE30\uB294 \uC591\uC218\uC785\uB2C8\uB2E4.", calculusVisual("motion", { time, velocity }))
        ];
      }
      function indefiniteIntegralProblems() {
        const n = randomInteger(1, 6);
        const coefficient = nonZero(-6, 6);
        const constant = randomInteger(-8, 8);
        return [
          sa(`${inlineMath(`\\int ${n + 1}x^{${n}}dx`)}\uC5D0\uC11C ${inlineMath(`x^{${n + 1}}`)}\uC758 \uACC4\uC218\uB294?`, 1, `${inlineMath(`x^{${n + 1}}+C`)}\uC785\uB2C8\uB2E4.`, "\uC9C0\uC218\uB97C 1 \uB298\uB9AC\uACE0 \uC0C8 \uC9C0\uC218\uB85C \uB098\uB204\uC138\uC694.", calculusVisual("antiderivative", { n, coefficient: n + 1 })),
          sa(`${inlineMath(`\\int ${coefficient}dx`)}\uC5D0\uC11C x\uC758 \uACC4\uC218\uB294?`, coefficient, `${inlineMath(`${coefficient}x+C`)}\uC785\uB2C8\uB2E4.`, "\uC0C1\uC218\uD568\uC218\uC758 \uC6D0\uC2DC\uD568\uC218\uB294 \uC77C\uCC28\uD568\uC218\uC785\uB2C8\uB2E4.", calculusVisual("antiderivative", { coefficient })),
          mc(`\uBD80\uC815\uC801\uBD84 \uACB0\uACFC\uC5D0 +C\uB97C \uBD99\uC774\uB294 \uC774\uC720\uB294?`, ["\uBBF8\uBD84\uD558\uBA74 \uBAA8\uB4E0 \uC0C1\uC218\uAC00 0\uC774 \uB418\uAE30 \uB54C\uBB38\uC774\uB2E4.", "\uC801\uBD84\uAC12\uC774 \uD56D\uC0C1 \uC591\uC218\uC774\uAE30 \uB54C\uBB38\uC774\uB2E4.", "x\uAC00 \uC0C1\uC218\uC774\uAE30 \uB54C\uBB38\uC774\uB2E4.", "\uAD6C\uAC04 \uAE38\uC774\uB97C \uB098\uD0C0\uB0B4\uAE30 \uB54C\uBB38\uC774\uB2E4."], 0, "\uAC19\uC740 \uB3C4\uD568\uC218\uB97C \uAC16\uB294 \uD568\uC218\uB4E4\uC740 \uC0C1\uC218\uB9CC\uD07C \uCC28\uC774 \uB0A9\uB2C8\uB2E4.", "\uC6D0\uC2DC\uD568\uC218 \uD558\uB098\uAC00 \uC544\uB2C8\uB77C \uC804\uCCB4 \uBAA8\uC74C\uC744 \uB098\uD0C0\uB0C5\uB2C8\uB2E4.", calculusVisual("antiderivative", { constant })),
          sa(`${inlineMath(`F'(x)=${coefficient}x`)}\uC77C \uB54C F\uC758 x\xB2 \uACC4\uC218\uB294?`, coefficient / 2, `${inlineMath(`F(x)=${fractionTex(coefficient, 2)}x^2+C`)}\uC785\uB2C8\uB2E4.`, "x\uC758 \uC9C0\uC218\uB97C 2\uB85C \uB298\uB9AC\uACE0 2\uB85C \uB098\uB204\uC138\uC694.", calculusVisual("antiderivative", { coefficient, n: 1 })),
          sa(`${inlineMath(`F'(x)=0`)}\uC774\uACE0 ${inlineMath(`F(${n})=${constant}`)}\uC77C \uB54C F(x)\uC758 \uC0C1\uC218\uAC12\uC740?`, constant, "\uB3C4\uD568\uC218\uAC00 0\uC778 \uD568\uC218\uB294 \uBAA8\uB4E0 x\uC5D0\uC11C \uAC19\uC740 \uC0C1\uC218\uAC12\uC744 \uAC00\uC9D1\uB2C8\uB2E4.", "\uBCC0\uD654\uAC00 \uC5C6\uB294 \uC6D0\uC2DC\uD568\uC218\uB97C \uC0DD\uAC01\uD558\uC138\uC694.", calculusVisual("antiderivative", { coefficient: 0, constant })),
          mc(`${inlineMath(`\\int x^{${n}}dx`)}\uC640 \uAC19\uC740 \uAC83\uC740?`, [
            `${inlineMath(`\\frac{x^{${n + 1}}}{${n + 1}}+C`)}`,
            `${inlineMath(`${n}x^{${n - 1}}+C`)}`,
            `${inlineMath(`x^{${n + 1}}+C`)}`,
            `${inlineMath(`\\frac{x^${n}}${n}+C`)}`
          ], 0, "\uC9C0\uC218\uB97C 1 \uB298\uB9AC\uACE0 \uADF8 \uC0C8 \uC9C0\uC218\uB85C \uB098\uB215\uB2C8\uB2E4.", "\uBBF8\uBD84 \uACF5\uC2DD\uACFC \uBC18\uB300 \uBC29\uD5A5\uC785\uB2C8\uB2E4.", calculusVisual("antiderivative", { n })),
          sa(`${inlineMath(`F(x)=${coefficient}x${signedNumber(constant)}`)}\uC77C \uB54C F\u2032(x)\uB294?`, coefficient, "\uC77C\uCC28\uD568\uC218\uB97C \uBBF8\uBD84\uD558\uBA74 x\uC758 \uACC4\uC218\uB9CC \uB0A8\uC2B5\uB2C8\uB2E4.", "\uC801\uBD84 \uACB0\uACFC\uB97C \uBBF8\uBD84\uD574 \uAC80\uC0B0\uD558\uC138\uC694.", calculusVisual("antiderivative", { coefficient, constant })),
          sa(`${inlineMath(`\\int ${2 * coefficient}x\\,dx`)}\uC758 x\xB2 \uACC4\uC218\uB294?`, coefficient, `\uC9C0\uC218 1\uC744 2\uB85C \uB298\uB9B0 \uB4A4 \uACC4\uC218 ${2 * coefficient}\uC744 2\uB85C \uB098\uB215\uB2C8\uB2E4.`, "\uC0C8 \uC9C0\uC218 2\uB85C \uB098\uB204\uC138\uC694.", calculusVisual("antiderivative", { coefficient, n: 1 })),
          mc(`\uC11C\uB85C \uB2E4\uB978 \uB450 \uC6D0\uC2DC\uD568\uC218 F,G\uC5D0 \uB300\uD574 \uD56D\uC0C1 \uC77C\uC815\uD55C \uAC83\uC740?`, ["F(x)-G(x)", "F(x)G(x)", "F(x)/G(x)", "F(x)+G(x)\uC758 \uAE30\uC6B8\uAE30"], 0, "\uAC19\uC740 \uD568\uC218\uB97C \uBBF8\uBD84 \uACB0\uACFC\uB85C \uAC16\uB294 \uC6D0\uC2DC\uD568\uC218\uB4E4\uC740 \uC0C1\uC218\uB9CC\uD07C \uCC28\uC774 \uB0A9\uB2C8\uB2E4.", "\uB450 \uD568\uC218\uC758 \uB3C4\uD568\uC218 \uCC28\uAC00 0\uC784\uC744 \uC774\uC6A9\uD558\uC138\uC694.", calculusVisual("antiderivative")),
          sa(`${inlineMath(`\\int ${coefficient * (n + 1)}x^{${n}}dx`)}\uC5D0\uC11C \uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uB294?`, coefficient, `\uC0C8 \uC9C0\uC218 ${n + 1}\uB85C \uACC4\uC218\uB97C \uB098\uB204\uBA74 ${coefficient}\uC774 \uB429\uB2C8\uB2E4.`, "\uC801\uBD84 \uC804 \uACC4\uC218\uB97C \uC0C8 \uC9C0\uC218\uB85C \uB098\uB204\uC138\uC694.", calculusVisual("antiderivative", { coefficient, n }))
        ];
      }
      function polynomialIntegralProblems() {
        const a = nonZero(-5, 5);
        const b = nonZero(-6, 6);
        const c = randomInteger(-8, 8);
        const n = randomInteger(1, 5);
        return [
          sa(`${inlineMath(`\\int ${a * 3}x^2dx`)}\uC5D0\uC11C x\xB3\uC758 \uACC4\uC218\uB294?`, a, "\uC9C0\uC218\uB97C 3\uC73C\uB85C \uB298\uB9AC\uACE0 \uACC4\uC218\uB97C 3\uC73C\uB85C \uB098\uB215\uB2C8\uB2E4.", "\uC0C8 \uC9C0\uC218\uB85C \uB098\uB204\uC138\uC694.", calculusVisual("antiderivative", { coefficients: [0, 0, 3 * a] })),
          sa(`${inlineMath(`\\int (${2 * a}x${signedNumber(b)})dx`)}\uC5D0\uC11C x\xB2\uC758 \uACC4\uC218\uB294?`, a, "2a\uB97C \uC0C8 \uC9C0\uC218 2\uB85C \uB098\uB215\uB2C8\uB2E4.", "\uD56D\uBCC4\uB85C \uC801\uBD84\uD558\uC138\uC694.", calculusVisual("antiderivative", { coefficients: [b, 2 * a] })),
          sa(`${inlineMath(`\\int (${2 * a}x${signedNumber(b)})dx`)}\uC5D0\uC11C x\uC758 \uACC4\uC218\uB294?`, b, `\uC0C1\uC218\uD56D ${b}\uC758 \uC6D0\uC2DC\uD568\uC218\uB294 ${inlineMath(`${b}x`)}\uC785\uB2C8\uB2E4.`, "\uC0C1\uC218\uD56D\uB3C4 \uC801\uBD84\uD558\uBA74 x\uAC00 \uBD99\uC2B5\uB2C8\uB2E4.", calculusVisual("antiderivative", { coefficients: [b, 2 * a] })),
          mc(`\uB2E4\uD56D\uD568\uC218\uC758 \uBD80\uC815\uC801\uBD84\uC5D0 \uB300\uD55C \uC633\uC740 \uC124\uBA85\uC740?`, ["\uAC01 \uD56D\uC744 \uB530\uB85C \uC801\uBD84\uD574 \uB354\uD560 \uC218 \uC788\uB2E4.", "\uC0C1\uC218\uD56D\uC740 \uD56D\uC0C1 \uC0AC\uB77C\uC9C4\uB2E4.", "\uC9C0\uC218\uB294 1 \uC904\uC5B4\uB4E0\uB2E4.", "\uC801\uBD84\uC0C1\uC218\uB294 \uD544\uC694 \uC5C6\uB2E4."], 0, "\uC801\uBD84\uC740 \uD569\uACFC \uC0C1\uC218\uBC30\uC5D0 \uB300\uD574 \uC120\uD615\uC785\uB2C8\uB2E4.", "\uBBF8\uBD84\uACFC \uC801\uBD84\uC758 \uC9C0\uC218 \uBCC0\uD654\uB97C \uAD6C\uBD84\uD558\uC138\uC694.", calculusVisual("antiderivative")),
          sa(`${inlineMath(`\\int ${a * (n + 1)}x^${n}dx`)}\uC758 \uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uB294?`, a, "\uC9C0\uC218\uB97C 1 \uB298\uB9AC\uACE0 \uC0C8 \uC9C0\uC218 n+1\uB85C \uB098\uB215\uB2C8\uB2E4.", "\uACC4\uC218\uC640 \uC0C8 \uC9C0\uC218\uB97C \uC57D\uBD84\uD558\uC138\uC694.", calculusVisual("antiderivative", { a, n })),
          sa(`${inlineMath(`F'(x)=${3 * a}x^2${signedTerm(2 * b, 1)}${signedNumber(c)}`)}\uC77C \uB54C F\uC758 x\xB3 \uACC4\uC218\uB294?`, a, "x\xB2\uD56D\uC744 \uC801\uBD84\uD558\uBA74 \uACC4\uC218\uB97C 3\uC73C\uB85C \uB098\uB215\uB2C8\uB2E4.", "\uCD5C\uACE0\uCC28\uD56D\uB9CC \uC5ED\uC73C\uB85C \uBBF8\uBD84\uD558\uC138\uC694.", calculusVisual("antiderivative", { coefficients: [c, 2 * b, 3 * a] })),
          sa(`${inlineMath(`F'(x)=${2 * a}x${signedNumber(b)}`)}\uC774\uACE0 F(0)=${c}\uC77C \uB54C \uC801\uBD84\uC0C1\uC218 C\uB294?`, c, `${inlineMath(`F(x)=${a}x^2${signedTerm(b, 1)}+C`)}\uC5D0\uC11C x=0\uC744 \uB123\uC2B5\uB2C8\uB2E4.`, "\uCD08\uAE30\uC870\uAC74\uC744 \uC6D0\uC2DC\uD568\uC218\uC5D0 \uB300\uC785\uD558\uC138\uC694.", calculusVisual("antiderivative", { a, b, c })),
          sa(`${inlineMath(`\\int (${a * 2}x+${b * 3}x^2)dx`)}\uC5D0\uC11C x\xB3\uC758 \uACC4\uC218\uB294?`, b, "3b x\xB2\uC744 \uC801\uBD84\uD558\uBA74 b x\xB3\uC785\uB2C8\uB2E4.", "\uAC01 \uD56D\uC744 \uB530\uB85C \uC801\uBD84\uD558\uC138\uC694.", calculusVisual("antiderivative", { a, b })),
          mc(`${inlineMath(`\\int (f(x)-g(x))dx`)}\uB294?`, ["\u222Bf(x)dx-\u222Bg(x)dx", "\u222Bf(x)dx\xB7\u222Bg(x)dx", "f\u2032(x)-g\u2032(x)", "\uD56D\uC0C1 0"], 0, "\uCC28\uC758 \uC801\uBD84\uC740 \uC801\uBD84\uC758 \uCC28\uC785\uB2C8\uB2E4.", "\uC801\uBD84\uC758 \uC120\uD615\uC131\uC744 \uC801\uC6A9\uD558\uC138\uC694.", calculusVisual("antiderivative")),
          sa(`${inlineMath(`\\int ${a * 4}x^3dx`)}\uC5D0\uC11C x\u2074\uC758 \uACC4\uC218\uB294?`, a, "\uC0C8 \uC9C0\uC218 4\uB85C \uACC4\uC218 4a\uB97C \uB098\uB215\uB2C8\uB2E4.", "\uC9C0\uC218+1, \uC0C8 \uC9C0\uC218\uB85C \uB098\uB214 \uC21C\uC11C\uC785\uB2C8\uB2E4.", calculusVisual("antiderivative", { a, n: 3 }))
        ];
      }
      function definiteIntegralConceptProblems() {
        const a = randomInteger(-5, 1);
        const b = a + randomInteger(2, 7);
        const c = randomInteger(a + 1, b - 1);
        const height = nonZero(-5, 5);
        const value1 = randomInteger(-10, 10);
        const value2 = randomInteger(-10, 10);
        return [
          sa(`${inlineMath(`\\int_{${a}}^{${b}}${height}\\,dx`)}\uB294?`, height * (b - a), "\uC0C1\uC218\uD568\uC218\uC758 \uBD80\uD638 \uC788\uB294 \uB113\uC774\uB294 \uB192\uC774\xD7\uAD6C\uAC04 \uAE38\uC774\uC785\uB2C8\uB2E4.", "\uC9C1\uC0AC\uAC01\uD615\uC758 \uB113\uC774\uB85C \uC0DD\uAC01\uD558\uC138\uC694.", calculusVisual("definite", { a, b, height })),
          sa(`${inlineMath(`\\int_{${a}}^{${b}}f(x)dx=${value1}`)}\uC77C \uB54C ${inlineMath(`\\int_{${b}}^{${a}}f(x)dx`)}\uB294?`, -value1, "\uC801\uBD84 \uAD6C\uAC04\uC758 \uC21C\uC11C\uB97C \uBC14\uAFB8\uBA74 \uBD80\uD638\uAC00 \uBC14\uB01D\uB2C8\uB2E4.", "\uC717\uB05D\uACFC \uC544\uB7AB\uB05D \uAD50\uD658\uC740 -1\uC744 \uACF1\uD569\uB2C8\uB2E4.", calculusVisual("definite", { a, b, value: value1 })),
          sa(`${inlineMath(`\\int_{${a}}^{${c}}f(x)dx=${value1},\\;\\int_{${c}}^{${b}}f(x)dx=${value2}`)}\uC77C \uB54C ${inlineMath(`\\int_{${a}}^{${b}}f(x)dx`)}\uB294?`, value1 + value2, "\uC778\uC811\uD55C \uAD6C\uAC04\uC758 \uC815\uC801\uBD84\uC744 \uB354\uD569\uB2C8\uB2E4.", "\uAD6C\uAC04\uC758 \uB367\uC148\uC131\uC744 \uC0AC\uC6A9\uD558\uC138\uC694.", calculusVisual("definite", { a, c, b })),
          sa(`${inlineMath(`\\int_{${a}}^{${a}}f(x)dx`)}\uB294?`, 0, "\uAD6C\uAC04 \uAE38\uC774\uAC00 0\uC774\uBBC0\uB85C \uB204\uC801\uB7C9\uB3C4 0\uC785\uB2C8\uB2E4.", "\uC2DC\uC791\uC810\uACFC \uB05D\uC810\uC774 \uAC19\uC2B5\uB2C8\uB2E4.", calculusVisual("definite", { a, b: a })),
          mc(`\uD568\uC218\uAC00 x\uCD95 \uC544\uB798\uC5D0 \uC788\uB294 \uAD6C\uAC04\uC758 \uC815\uC801\uBD84\uC740?`, ["\uC74C\uC218\uAC00 \uB420 \uC218 \uC788\uB2E4.", "\uD56D\uC0C1 \uC2E4\uC81C \uB113\uC774\uC640 \uAC19\uB2E4.", "\uD56D\uC0C1 0\uC774\uB2E4.", "\uC815\uC758\uB418\uC9C0 \uC54A\uB294\uB2E4."], 0, "\uC815\uC801\uBD84\uC740 x\uCD95 \uC544\uB798\uC758 \uB113\uC774\uB97C \uC74C\uC218\uB85C \uC149\uB2C8\uB2E4.", "\uC815\uC801\uBD84\uC740 \uBD80\uD638 \uC788\uB294 \uB113\uC774\uC785\uB2C8\uB2E4.", calculusVisual("area", { belowAxis: true })),
          sa(`${inlineMath(`\\int_{${a}}^{${b}}f(x)dx=${value1}`)}\uC77C \uB54C ${inlineMath(`\\int_{${a}}^{${b}}2f(x)dx`)}\uB294?`, 2 * value1, "\uC0C1\uC218\uBC30\uB294 \uC801\uBD84 \uBC16\uC73C\uB85C \uB098\uC62C \uC218 \uC788\uC2B5\uB2C8\uB2E4.", "\uC801\uBD84\uC758 \uC120\uD615\uC131\uC744 \uC0AC\uC6A9\uD558\uC138\uC694.", calculusVisual("definite", { a, b, value: value1 })),
          sa(`${inlineMath(`\\int_{${a}}^{${b}}f(x)dx=${value1},\\;\\int_{${a}}^{${b}}g(x)dx=${value2}`)}\uC77C \uB54C ${inlineMath(`\\int_{${a}}^{${b}}(f+g)dx`)}\uB294?`, value1 + value2, "\uD569\uC758 \uC801\uBD84\uC740 \uC801\uBD84\uC758 \uD569\uC785\uB2C8\uB2E4.", "\uAC19\uC740 \uAD6C\uAC04\uC758 \uB450 \uAC12\uC744 \uB354\uD558\uC138\uC694.", calculusVisual("definite", { a, b })),
          mc(`\uC815\uC801\uBD84\uC744 \uC9C1\uC0AC\uAC01\uD615 \uD569\uC758 \uADF9\uD55C\uC73C\uB85C \uBCFC \uB54C \uBD84\uD560\uC744 \uCD18\uCD18\uD558\uAC8C \uD55C\uB2E4\uB294 \uB73B\uC740?`, ["\uAC01 \uC791\uC740 \uAD6C\uAC04\uC758 \uD3ED\uC774 0\uC5D0 \uAC00\uAE4C\uC6CC\uC9C4\uB2E4.", "\uD568\uC218\uAC12\uC744 \uBAA8\uB450 0\uC73C\uB85C \uB9CC\uB4E0\uB2E4.", "\uAD6C\uAC04\uC744 \uC5C6\uC564\uB2E4.", "\uC801\uBD84\uC0C1\uC218\uB97C \uD06C\uAC8C \uD55C\uB2E4."], 0, "\uB9AC\uB9CC\uD569\uC5D0\uC11C \uCD5C\uB300 \uAD6C\uAC04 \uD3ED\uC774 0\uC73C\uB85C \uAC00\uAE4C\uC6CC\uC9D1\uB2C8\uB2E4.", "\uC9C1\uC0AC\uAC01\uD615\uC758 \uD3ED \uBCC0\uD654\uB97C \uC0DD\uAC01\uD558\uC138\uC694.", calculusVisual("riemann", { a, b })),
          sa(`\uD3ED\uC774 ${b - a}, \uB192\uC774\uAC00 ${Math.abs(height)}\uC778 \uC9C1\uC0AC\uAC01\uD615 \uBAA8\uC591\uC758 \uD568\uC218\uAC00 x\uCD95 \uC704\uC5D0 \uC788\uC744 \uB54C \uC815\uC801\uBD84\uC740?`, Math.abs(height) * (b - a), "x\uCD95 \uC704\uC5D0\uC11C\uB294 \uC815\uC801\uBD84\uACFC \uC2E4\uC81C \uB113\uC774\uAC00 \uAC19\uC2B5\uB2C8\uB2E4.", "\uAC00\uB85C\xD7\uC138\uB85C\uB97C \uACC4\uC0B0\uD558\uC138\uC694.", calculusVisual("area", { width: b - a, height: Math.abs(height) })),
          mc(`${inlineMath(`\\int_{${a}}^{${b}}f(x)dx`)}\uAC00 \uB098\uD0C0\uB0B4\uB294 \uAC83\uC740?`, ["\uAD6C\uAC04\uC5D0\uC11C\uC758 \uBD80\uD638 \uC788\uB294 \uB204\uC801\uB7C9", "\uD56D\uC0C1 \uB3C4\uD615\uC758 \uC2E4\uC81C \uB113\uC774", "\uD55C \uC810\uC758 \uD568\uC218\uAC12", "\uC811\uC120\uC758 \uAE30\uC6B8\uAE30"], 0, "\uC815\uC801\uBD84\uC740 \uC704\uCABD\uACFC \uC544\uB798\uCABD\uC744 \uBD80\uD638\uC640 \uD568\uAED8 \uD569\uD55C \uAC12\uC785\uB2C8\uB2E4.", "\uB113\uC774\uC640 \uBD80\uD638 \uC788\uB294 \uB113\uC774\uB97C \uAD6C\uBD84\uD558\uC138\uC694.", calculusVisual("definite", { a, b }))
        ];
      }
      function fundamentalTheoremProblems() {
        const a = randomInteger(-3, 1);
        const b = a + randomInteger(2, 5);
        const coefficient = nonZero(-4, 4);
        const constant = randomInteger(-5, 5);
        const upperValue = coefficient * b ** 2 + constant * b;
        const lowerValue = coefficient * a ** 2 + constant * a;
        return [
          sa(`${inlineMath(`\\int_{${a}}^{${b}}${2 * coefficient}x\\,dx`)}\uB294?`, coefficient * (b ** 2 - a ** 2), `${inlineMath(`[${coefficient}x^2]_{${a}}^{${b}}`)}\uB85C \uACC4\uC0B0\uD569\uB2C8\uB2E4.`, "\uC6D0\uC2DC\uD568\uC218\uC5D0 \uC717\uB05D\uACFC \uC544\uB7AB\uB05D\uC744 \uB300\uC785\uD574 \uBE7C\uC138\uC694.", calculusVisual("fundamental", { a, b, coefficient })),
          sa(`${inlineMath(`F(x)=${coefficient}x^2${signedTerm(constant, 1)}`)}\uC77C \uB54C ${inlineMath(`F(${b})-F(${a})`)}\uB294?`, upperValue - lowerValue, "\uAC01 \uB05D\uAC12\uC744 \uACC4\uC0B0\uD574 \uC717\uAC12\uC5D0\uC11C \uC544\uB7AB\uAC12\uC744 \uBE8D\uB2C8\uB2E4.", "\uB300\uC785 \uC21C\uC11C\uB97C \uBC14\uAFB8\uC9C0 \uB9C8\uC138\uC694.", calculusVisual("fundamental", { a, b, coefficient, constant })),
          mc(`${inlineMath(`F'(x)=f(x)`)}\uC77C \uB54C \uC815\uC801\uBD84 \uACF5\uC2DD\uC740?`, [
            `${inlineMath(`\\int_a^b f(x)dx=F(b)-F(a)`)}`,
            `${inlineMath(`\\int_a^b f(x)dx=F(a)-F(b)`)}`,
            `${inlineMath(`\\int_a^b f(x)dx=f(b)-f(a)`)}`,
            `${inlineMath(`\\int_a^b f(x)dx=F(a)+F(b)`)}`
          ], 0, "\uC6D0\uC2DC\uD568\uC218\uC758 \uC717\uB05D\uAC12\uC5D0\uC11C \uC544\uB7AB\uB05D\uAC12\uC744 \uBE8D\uB2C8\uB2E4.", "F\uC640 f\uB97C \uAD6C\uBD84\uD558\uC138\uC694.", calculusVisual("fundamental", { a, b })),
          sa(`${inlineMath(`\\int_{${a}}^{${b}}${constant}\\,dx`)}\uB97C \uC6D0\uC2DC\uD568\uC218\uB85C \uACC4\uC0B0\uD55C \uAC12\uC740?`, constant * (b - a), `\uC6D0\uC2DC\uD568\uC218 ${constant}x\uC758 \uB05D\uAC12 \uCC28\uC785\uB2C8\uB2E4.`, "\uC0C1\uC218\uC758 \uC6D0\uC2DC\uD568\uC218\uC5D0 \uC591 \uB05D\uC744 \uB300\uC785\uD558\uC138\uC694.", calculusVisual("fundamental", { a, b, constant })),
          sa(`${inlineMath(`\\int_{${a}}^{${b}}(${2 * coefficient}x${signedNumber(constant)})dx`)}\uB294?`, coefficient * (b ** 2 - a ** 2) + constant * (b - a), "\uC6D0\uC2DC\uD568\uC218\uC758 \uB05D\uAC12 \uCC28\uB97C \uACC4\uC0B0\uD569\uB2C8\uB2E4.", "\uD56D\uBCC4\uB85C \uC6D0\uC2DC\uD568\uC218\uB97C \uAD6C\uD558\uC138\uC694.", calculusVisual("fundamental", { a, b, coefficient, constant })),
          mc(`\uC815\uC801\uBD84 \uACC4\uC0B0\uC5D0\uC11C \uC801\uBD84\uC0C1\uC218 C\uAC00 \uC0AC\uB77C\uC9C0\uB294 \uC774\uC720\uB294?`, ["F(b)+C\uC640 F(a)+C\uC758 \uCC28\uC5D0\uC11C \uC18C\uAC70\uB41C\uB2E4.", "C\uAC00 \uD56D\uC0C1 0\uC774\uAE30 \uB54C\uBB38\uC774\uB2E4.", "\uAD6C\uAC04 \uAE38\uC774\uAC00 0\uC774\uAE30 \uB54C\uBB38\uC774\uB2E4.", "\uBBF8\uBD84\uC744 \uD558\uC9C0 \uC54A\uAE30 \uB54C\uBB38\uC774\uB2E4."], 0, "\uAC19\uC740 \uC0C1\uC218\uAC00 \uC591 \uB05D\uAC12 \uCC28\uC5D0\uC11C \uC11C\uB85C \uC5C6\uC5B4\uC9D1\uB2C8\uB2E4.", "\uB05D\uAC12 \uCC28\uC5D0 +C\uB97C \uC9C1\uC811 \uC368\uBCF4\uC138\uC694.", calculusVisual("fundamental")),
          sa(`${inlineMath(`\\int_{0}^{${Math.abs(b) + 1}}${2 * coefficient}x\\,dx`)}\uB294?`, coefficient * (Math.abs(b) + 1) ** 2, `\uC6D0\uC2DC\uD568\uC218 ${inlineMath(`${coefficient}x^2`)}\uC5D0 \uC591 \uB05D\uC744 \uB300\uC785\uD569\uB2C8\uB2E4.`, "\uC544\uB7AB\uB05D 0\uC5D0\uC11C\uC758 \uAC12\uC740 0\uC785\uB2C8\uB2E4.", calculusVisual("fundamental", { a: 0, b: Math.abs(b) + 1, coefficient })),
          sa(`${inlineMath(`\\int_{${a}}^{${b}}f(x)dx=${upperValue - lowerValue}`)}\uC774\uACE0 F(a)=${lowerValue}\uC77C \uB54C F(b)\uB294?`, upperValue, "\uC815\uC801\uBD84=F(b)-F(a)\uC774\uBBC0\uB85C F(b)=\uC815\uC801\uBD84+F(a)\uC785\uB2C8\uB2E4.", "\uB05D\uAC12 \uAD00\uACC4\uB97C F(b)\uC5D0 \uB300\uD574 \uD478\uC138\uC694.", calculusVisual("fundamental", { a, b })),
          mc(`\uC815\uC801\uBD84\uC744 \uC6D0\uC2DC\uD568\uC218\uC758 \uB05D\uAC12 \uCC28\uB85C \uACC4\uC0B0\uD558\uAC8C \uD574 \uC8FC\uB294 \uD575\uC2EC \uC5F0\uACB0\uC740?`, ["\uBBF8\uC801\uBD84\uC758 \uAE30\uBCF8\uC815\uB9AC", "\uD53C\uD0C0\uACE0\uB77C\uC2A4 \uC815\uB9AC", "\uB367\uC148\uC815\uB9AC", "\uD070 \uC218\uC758 \uBC95\uCE59"], 0, "\uBBF8\uC801\uBD84\uC758 \uAE30\uBCF8\uC815\uB9AC\uAC00 \uBBF8\uBD84\uACFC \uC801\uBD84\uC744 \uC5F0\uACB0\uD569\uB2C8\uB2E4.", "\uBCC0\uD654\uC728\uACFC \uB204\uC801\uB7C9\uC758 \uAD00\uACC4\uB97C \uB5A0\uC62C\uB9AC\uC138\uC694.", calculusVisual("fundamental")),
          sa(`${inlineMath(`F(${b})=${upperValue},\\;F(${a})=${lowerValue}`)}\uC774\uACE0 F\u2032=f\uC77C \uB54C ${inlineMath(`\\int_{${a}}^{${b}}f(x)dx`)}\uB294?`, upperValue - lowerValue, "\uC717\uB05D \uC6D0\uC2DC\uD568\uC218\uAC12\uC5D0\uC11C \uC544\uB7AB\uB05D \uC6D0\uC2DC\uD568\uC218\uAC12\uC744 \uBE8D\uB2C8\uB2E4.", "F(b)-F(a)\uB97C \uACC4\uC0B0\uD558\uC138\uC694.", calculusVisual("fundamental", { a, b }))
        ];
      }
      function areaProblems() {
        const width = randomInteger(2, 7);
        const height = randomInteger(1, 6);
        const left = randomInteger(-4, 1);
        const right = left + width;
        const scale = randomInteger(1, 4);
        const root = randomInteger(1, 4);
        const parabolaArea = 4 / 3 * scale * root ** 3;
        return [
          sa(`\uAD6C\uAC04 [${left},${right}]\uC5D0\uC11C \uD568\uC218 y=${height}\uC640 x\uCD95 \uC0AC\uC774\uC758 \uB113\uC774\uB294?`, width * height, "\uC9C1\uC0AC\uAC01\uD615\uC758 \uAC00\uB85C\xD7\uC138\uB85C\uC785\uB2C8\uB2E4.", "\uD568\uC218\uAC00 x\uCD95 \uC704\uC5D0 \uC788\uC73C\uBBC0\uB85C \uC815\uC801\uBD84\uACFC \uB113\uC774\uAC00 \uAC19\uC2B5\uB2C8\uB2E4.", calculusVisual("area", { left, right, height })),
          sa(`\uAD6C\uAC04 [${left},${right}]\uC5D0\uC11C \uD568\uC218 y=-${height}\uC640 x\uCD95 \uC0AC\uC774\uC758 \uC2E4\uC81C \uB113\uC774\uB294?`, width * height, "\uC815\uC801\uBD84\uC740 \uC74C\uC218\uC9C0\uB9CC \uC2E4\uC81C \uB113\uC774\uB294 \uC808\uB313\uAC12\uC744 \uCDE8\uD569\uB2C8\uB2E4.", "x\uCD95 \uC544\uB798 \uC601\uC5ED\uB3C4 \uB113\uC774\uB294 \uC591\uC218\uC785\uB2C8\uB2E4.", calculusVisual("area", { left, right, height: -height })),
          sa(`${inlineMath(`y=${scale * 2}x`)}\uC640 x\uCD95, x=${width}\uB85C \uB458\uB7EC\uC2F8\uC778 \uC0BC\uAC01\uD615\uC758 \uB113\uC774\uB294?`, scale * width ** 2, `\uBC11\uBCC0 ${width}, \uB192\uC774 ${2 * scale * width}\uC778 \uC0BC\uAC01\uD615 \uB113\uC774\uC785\uB2C8\uB2E4.`, "1/2\xD7\uBC11\uBCC0\xD7\uB192\uC774\uB97C \uC0AC\uC6A9\uD558\uC138\uC694.", calculusVisual("area", { slope: 2 * scale, left: 0, right: width })),
          sa(`${inlineMath(`y=${scale}(${root ** 2}-x^2)`)}\uC640 x\uCD95 \uC0AC\uC774\uC5D0\uC11C -${root}\u2264x\u2264${root}\uC778 \uB113\uC774\uB294?`, round4(parabolaArea), `${inlineMath(`\\int_{-${root}}^{${root}}${scale}(${root ** 2}-x^2)dx=${round4(parabolaArea)}`)}\uC785\uB2C8\uB2E4.`, `\uC9DD\uD568\uC218\uC758 \uB300\uCE6D\uC744 \uC774\uC6A9\uD574 0\uBD80\uD130 ${root}\uAE4C\uC9C0 \uC801\uBD84\uD55C \uAC12\uC758 2\uBC30\uB97C \uAD6C\uD558\uC138\uC694.`, calculusVisual("area", { scale, roots: [-root, root] })),
          mc(`\uB450 \uACE1\uC120 \uC0AC\uC774 \uB113\uC774\uB97C \uAD6C\uD558\uB294 \uAE30\uBCF8 \uC801\uBD84\uC2DD\uC740?`, ["\u222B(\uC704 \uD568\uC218-\uC544\uB798 \uD568\uC218)dx", "\u222B(\uC544\uB798 \uD568\uC218-\uC704 \uD568\uC218)dx\uB97C \uADF8\uB300\uB85C \uC0AC\uC6A9", "\uB450 \uD568\uC218\uC758 \uACF1", "\uB450 \uB3C4\uD568\uC218\uC758 \uD569"], 0, "\uAC01 \uAD6C\uAC04\uC5D0\uC11C \uC704 \uD568\uC218\uAC12\uC5D0\uC11C \uC544\uB798 \uD568\uC218\uAC12\uC744 \uBE7C\uC57C \uB113\uC774\uAC00 \uC591\uC218\uAC00 \uB429\uB2C8\uB2E4.", "\uADF8\uB798\uD504\uC758 \uC704\uC544\uB798\uB97C \uBA3C\uC800 \uD310\uC815\uD558\uC138\uC694.", calculusVisual("area")),
          sa(`\uB450 \uACE1\uC120\uC758 \uCC28\uAC00 \uAD6C\uAC04 [${left},${right}]\uC5D0\uC11C \uD56D\uC0C1 ${height}\uC77C \uB54C \uB450 \uACE1\uC120 \uC0AC\uC774 \uB113\uC774\uB294?`, width * height, "\uC138\uB85C \uAC04\uACA9\uC774 \uC77C\uC815\uD55C \uC9C1\uC0AC\uAC01\uD615 \uC601\uC5ED\uC785\uB2C8\uB2E4.", "\uD568\uC218 \uCC28\xD7\uAD6C\uAC04 \uAE38\uC774\uC785\uB2C8\uB2E4.", calculusVisual("area", { left, right, gap: height })),
          mc(`\uB450 \uACE1\uC120\uC758 \uC704\uC544\uB798\uAC00 \uBC14\uB00C\uB294 \uC9C0\uC810\uC5D0\uC11C \uD574\uC57C \uD560 \uC77C\uC740?`, ["\uC801\uBD84 \uAD6C\uAC04\uC744 \uB098\uB204\uACE0 \uAC01 \uAD6C\uAC04\uC5D0\uC11C \uC704-\uC544\uB798\uB97C \uB2E4\uC2DC \uC815\uD55C\uB2E4.", "\uADF8 \uC9C0\uC810\uC744 \uBB34\uC2DC\uD55C\uB2E4.", "\uC804\uCCB4 \uC801\uBD84\uC5D0 -1\uB9CC \uACF1\uD55C\uB2E4.", "\uB3C4\uD568\uC218\uB97C \uC801\uBD84\uD558\uC9C0 \uC54A\uB294\uB2E4."], 0, "\uAD50\uC810\uC740 \uD568\uC218 \uCC28\uC758 \uBD80\uD638\uAC00 \uBC14\uB014 \uC218 \uC788\uB294 \uACBD\uACC4\uC785\uB2C8\uB2E4.", "\uC808\uB313\uAC12 \uC801\uBD84\uC744 \uAD6C\uAC04\uBCC4\uB85C \uACC4\uC0B0\uD558\uC138\uC694.", calculusVisual("area", { crossing: true })),
          sa(`${inlineMath(`\\int_{${left}}^{${right}}f(x)dx=-${width * height}`)}\uC774\uACE0 f\u22640\uC77C \uB54C \uADF8\uB798\uD504\uC640 x\uCD95 \uC0AC\uC774\uC758 \uB113\uC774\uB294?`, width * height, "\uD568\uC218\uAC00 x\uCD95 \uC544\uB798\uC5D0 \uC788\uC73C\uBBC0\uB85C \uC2E4\uC81C \uB113\uC774\uB294 \uC815\uC801\uBD84\uC758 \uC808\uB313\uAC12\uC785\uB2C8\uB2E4.", "\uC74C\uC758 \uC815\uC801\uBD84\uC5D0 -\uB97C \uBD99\uC774\uC138\uC694.", calculusVisual("area", { left, right, integral: -width * height })),
          sa(`\uBC11\uBCC0 \uAE38\uC774\uAC00 ${width}, \uB192\uC774\uAC00 ${height}\uC778 \uC0BC\uAC01\uD615 \uC601\uC5ED\uC758 \uB113\uC774\uB294?`, width * height / 2, "\uC0BC\uAC01\uD615 \uB113\uC774\uB294 1/2\xD7\uBC11\uBCC0\xD7\uB192\uC774\uC785\uB2C8\uB2E4.", "\uC120\uD615\uD568\uC218 \uC544\uB798 \uB113\uC774\uB97C \uAE30\uD558\uC801\uC73C\uB85C \uBCF4\uC138\uC694.", calculusVisual("area", { width, height, triangle: true })),
          mc(`\uC815\uC801\uBD84\uAC12\uACFC \uC2E4\uC81C \uB113\uC774\uAC00 \uD56D\uC0C1 \uAC19\uC9C0 \uC54A\uC740 \uC774\uC720\uB294?`, ["x\uCD95 \uC544\uB798 \uC601\uC5ED\uC744 \uC815\uC801\uBD84\uC740 \uC74C\uC218\uB85C \uC138\uAE30 \uB54C\uBB38\uC774\uB2E4.", "\uB113\uC774\uB294 \uC74C\uC218\uAC00 \uB420 \uC218 \uC788\uAE30 \uB54C\uBB38\uC774\uB2E4.", "\uC815\uC801\uBD84\uC5D0\uB294 \uAD6C\uAC04\uC774 \uC5C6\uAE30 \uB54C\uBB38\uC774\uB2E4.", "\uD568\uC218\uB294 \uD56D\uC0C1 \uBD88\uC5F0\uC18D\uC774\uAE30 \uB54C\uBB38\uC774\uB2E4."], 0, "\uC815\uC801\uBD84\uC740 \uBD80\uD638 \uC788\uB294 \uB204\uC801\uB7C9\uC774\uACE0 \uB113\uC774\uB294 \uC74C\uC218\uAC00 \uC544\uB2D9\uB2C8\uB2E4.", "x\uCD95 \uC544\uB798 \uC601\uC5ED\uC744 \uBE44\uAD50\uD558\uC138\uC694.", calculusVisual("area", { belowAxis: true }))
        ];
      }
      function velocityDistanceProblems() {
        const zero = randomInteger(1, 5);
        const scale = randomInteger(1, 4);
        const end = zero + randomInteger(1, 5);
        const initialPosition = randomInteger(-10, 10);
        const displacement = scale / 2 * (end ** 2 - 2 * zero * end);
        const distance = scale / 2 * zero ** 2 + scale / 2 * (end - zero) ** 2;
        return [
          sa(`\uC18D\uB3C4 ${inlineMath(`v(t)=${scale}(t-${zero})`)}\uC77C \uB54C t=${zero}\uC5D0\uC11C \uC18D\uB3C4\uB294?`, 0, `${inlineMath(`v(${zero})=0`)}\uC774\uBBC0\uB85C \uADF8 \uC21C\uAC04 \uC815\uC9C0\uD569\uB2C8\uB2E4.`, "\uC18D\uB3C4\uC2DD\uC5D0 \uC2DC\uAC04\uC744 \uB300\uC785\uD558\uC138\uC694.", calculusVisual("velocity-area", { zero, scale })),
          sa(`\uC18D\uB3C4 ${inlineMath(`v(t)=${scale}(t-${zero})`)}\uC77C \uB54C 0\u2264t\u2264${end}\uC758 \uBCC0\uC704\uB294?`, round4(displacement), `${inlineMath(`\\int_0^{${end}}${scale}(t-${zero})dt=${round4(displacement)}`)}\uC785\uB2C8\uB2E4.`, "\uBCC0\uC704\uB294 \uC18D\uB3C4\uC758 \uBD80\uD638 \uC788\uB294 \uC801\uBD84\uC785\uB2C8\uB2E4.", calculusVisual("velocity-area", { zero, scale, end })),
          sa(`\uAC19\uC740 \uC6B4\uB3D9\uC5D0\uC11C 0\u2264t\u2264${end}\uC758 \uC774\uB3D9\uAC70\uB9AC\uB294?`, round4(distance), `${inlineMath(`t=${zero}`)}\uC5D0\uC11C \uBC29\uD5A5\uC774 \uBC14\uB00C\uBBC0\uB85C \uC74C\uC758 \uB113\uC774\uC640 \uC591\uC758 \uB113\uC774\uC758 \uD06C\uAE30\uB97C \uB354\uD569\uB2C8\uB2E4.`, "\uC18D\uB3C4\uAC00 0\uC778 \uC2DC\uAC01\uC5D0\uC11C \uAD6C\uAC04\uC744 \uB098\uB204\uC5B4 \uC18D\uB825\uC758 \uB113\uC774\uB97C \uB354\uD558\uC138\uC694.", calculusVisual("velocity-area", { zero, scale, end, absolute: true })),
          sa(`\uCD08\uAE30 \uC704\uCE58\uAC00 ${initialPosition}\uC774\uACE0 \uBCC0\uC704\uAC00 ${round4(displacement)}\uC77C \uB54C \uB9C8\uC9C0\uB9C9 \uC704\uCE58\uB294?`, round4(initialPosition + displacement), "\uB9C8\uC9C0\uB9C9 \uC704\uCE58=\uCD08\uAE30 \uC704\uCE58+\uBCC0\uC704\uC785\uB2C8\uB2E4.", "\uC774\uB3D9\uAC70\uB9AC \uB300\uC2E0 \uBD80\uD638 \uC788\uB294 \uBCC0\uC704\uB97C \uB354\uD558\uC138\uC694.", calculusVisual("velocity-area", { initialPosition, displacement })),
          mc(`\uC18D\uB3C4\uB97C \uC801\uBD84\uD574 \uC5BB\uB294 \uAC83\uC740?`, ["\uBCC0\uC704", "\uD56D\uC0C1 \uC774\uB3D9\uAC70\uB9AC", "\uAC00\uC18D\uB3C4", "\uC18D\uB825\uC758 \uCD5C\uB313\uAC12"], 0, "\uC18D\uB3C4\uC758 \uBD80\uD638 \uC788\uB294 \uB113\uC774\uB294 \uC704\uCE58\uC758 \uBCC0\uD654\uB7C9\uC778 \uBCC0\uC704\uC785\uB2C8\uB2E4.", "\uC704\uCE58\uC640 \uC18D\uB3C4\uC758 \uBBF8\uBD84\xB7\uC801\uBD84 \uAD00\uACC4\uB97C \uB5A0\uC62C\uB9AC\uC138\uC694.", calculusVisual("velocity-area")),
          mc(`\uC774\uB3D9\uAC70\uB9AC\uB97C \uAD6C\uD560 \uB54C \uC801\uBD84\uD574\uC57C \uD558\uB294 \uAC83\uC740?`, ["|v(t)|", "v\u2032(t)", "s\u2032\u2032(t)\uB9CC", "v(t)\uC758 \uBD80\uD638\uB97C \uBB34\uC2DC\uD55C \uC6D0\uC2DC\uD568\uC218"], 0, "\uBC29\uD5A5\uACFC \uAD00\uACC4\uC5C6\uC774 \uC774\uB3D9\uD55C \uAE38\uC774\uB97C \uB354\uD558\uB824\uBA74 \uC18D\uB825 |v|\uB97C \uC801\uBD84\uD569\uB2C8\uB2E4.", "\uC74C\uC758 \uC18D\uB3C4 \uAD6C\uAC04\uB3C4 \uC591\uC758 \uAE38\uC774\uB85C \uC138\uC138\uC694.", calculusVisual("velocity-area", { absolute: true })),
          sa(`0\u2264t\u2264${zero}\uC5D0\uC11C \uC18D\uB3C4\uAC00 \uD56D\uC0C1 -${scale}\uC77C \uB54C \uC774\uB3D9\uAC70\uB9AC\uB294?`, scale * zero, `\uC18D\uB825\uC740 ${scale}\uC774\uACE0 \uC2DC\uAC04\uC740 ${zero}\uC774\uBBC0\uB85C \uAC70\uB9AC=\uC18D\uB825\xD7\uC2DC\uAC04\uC785\uB2C8\uB2E4.`, "\uC74C\uC758 \uBD80\uD638\uB294 \uBC29\uD5A5\uC77C \uBFD0 \uAC70\uB9AC\uC5D0\uB294 \uC808\uB313\uAC12\uC744 \uC501\uB2C8\uB2E4.", calculusVisual("velocity-area", { velocity: -scale, end: zero })),
          sa(`0\u2264t\u2264${end}\uC5D0\uC11C \uC18D\uB3C4\uAC00 \uD56D\uC0C1 ${scale}\uC77C \uB54C \uBCC0\uC704\uB294?`, scale * end, "\uC77C\uC815\uD55C \uC18D\uB3C4\uC758 \uBCC0\uC704\uB294 \uC18D\uB3C4\xD7\uC2DC\uAC04\uC785\uB2C8\uB2E4.", "\uC18D\uB3C4 \uADF8\uB798\uD504 \uC544\uB798 \uC9C1\uC0AC\uAC01\uD615 \uB113\uC774\uC785\uB2C8\uB2E4.", calculusVisual("velocity-area", { velocity: scale, end })),
          mc(`\uBCC0\uC704\uAC00 0\uC778\uB370 \uC774\uB3D9\uAC70\uB9AC\uB294 \uC591\uC218\uC77C \uC218 \uC788\uB294 \uC0C1\uD669\uC740?`, ["\uCD9C\uBC1C\uC810\uC5D0\uC11C \uC6C0\uC9C1\uC600\uB2E4\uAC00 \uB2E4\uC2DC \uB3CC\uC544\uC628 \uACBD\uC6B0", "\uC804\uD600 \uC6C0\uC9C1\uC774\uC9C0 \uC54A\uC740 \uACBD\uC6B0\uB9CC", "\uC18D\uB3C4\uAC00 \uD56D\uC0C1 \uC591\uC218\uC778 \uACBD\uC6B0", "\uC2DC\uAC04\uC774 0\uC778 \uACBD\uC6B0"], 0, "\uC11C\uB85C \uBC18\uB300 \uBC29\uD5A5\uC758 \uBCC0\uC704\uAC00 \uC0C1\uC1C4\uB418\uC5B4\uB3C4 \uC774\uB3D9\uD55C \uAE38\uC774\uB294 \uB0A8\uC2B5\uB2C8\uB2E4.", "\uBD80\uD638 \uC788\uB294 \uD569\uACFC \uC808\uB313\uAC12 \uD569\uC744 \uBE44\uAD50\uD558\uC138\uC694.", calculusVisual("velocity-area", { returnTrip: true })),
          sa(`\uC704\uCE58 \uBCC0\uD654\uB7C9\uC774 ${round4(displacement)}\uC774\uACE0 \uCD08\uAE30 \uC704\uCE58\uAC00 ${initialPosition}\uC77C \uB54C \uCD5C\uC885 \uC704\uCE58\uB294?`, round4(initialPosition + displacement), "\uCD08\uAE30 \uC704\uCE58\uC5D0 \uBCC0\uC704\uB97C \uB354\uD569\uB2C8\uB2E4.", "\uBCC0\uC704\uC5D0\uB294 \uBC29\uD5A5\uC744 \uB098\uD0C0\uB0B4\uB294 \uBD80\uD638\uAC00 \uD3EC\uD568\uB429\uB2C8\uB2E4.", calculusVisual("velocity-area", { initialPosition, displacement }))
        ];
      }
      var definitions = [
        ["differentiation", "calculus-1-02-01", "\uBBF8\uBD84\uACC4\uC218", derivativeCoefficientProblems],
        ["differentiation", "calculus-1-02-02", "\uBBF8\uBD84\uAC00\uB2A5\uC131\uACFC \uC5F0\uC18D\uC131", differentiabilityProblems],
        ["differentiation", "calculus-1-02-03", "\uAC70\uB4ED\uC81C\uACF1\uD568\uC218\uC758 \uB3C4\uD568\uC218", powerDerivativeProblems],
        ["differentiation", "calculus-1-02-04", "\uB2E4\uD56D\uD568\uC218\uC758 \uBBF8\uBD84\uBC95", polynomialDerivativeProblems],
        ["differentiation", "calculus-1-02-05", "\uC811\uC120\uC758 \uBC29\uC815\uC2DD", tangentProblems],
        ["differentiation", "calculus-1-02-06", "\uD3C9\uADE0\uAC12 \uC815\uB9AC", meanValueProblems],
        ["differentiation", "calculus-1-02-07", "\uD568\uC218\uC758 \uC99D\uAC00\xB7\uAC10\uC18C\uC640 \uADF9\uAC12", extremaProblems],
        ["differentiation", "calculus-1-02-08", "\uD568\uC218 \uADF8\uB798\uD504\uC758 \uAC1C\uD615", graphShapeProblems],
        ["differentiation", "calculus-1-02-09", "\uBBF8\uBD84\uACFC \uBC29\uC815\uC2DD\xB7\uBD80\uB4F1\uC2DD", equationInequalityProblems],
        ["differentiation", "calculus-1-02-10", "\uC18D\uB3C4\uC640 \uAC00\uC18D\uB3C4", motionProblems],
        ["integration", "calculus-1-03-01", "\uBD80\uC815\uC801\uBD84", indefiniteIntegralProblems],
        ["integration", "calculus-1-03-02", "\uB2E4\uD56D\uD568\uC218\uC758 \uBD80\uC815\uC801\uBD84", polynomialIntegralProblems],
        ["integration", "calculus-1-03-03", "\uC815\uC801\uBD84\uC758 \uAC1C\uB150\uACFC \uC131\uC9C8", definiteIntegralConceptProblems],
        ["integration", "calculus-1-03-04", "\uBD80\uC815\uC801\uBD84\uACFC \uC815\uC801\uBD84\uC758 \uAD00\uACC4", fundamentalTheoremProblems],
        ["integration", "calculus-1-03-05", "\uC815\uC801\uBD84\uACFC \uB113\uC774", areaProblems],
        ["integration", "calculus-1-03-06", "\uC801\uBD84\uACFC \uC18D\uB3C4\xB7\uAC70\uB9AC", velocityDistanceProblems]
      ];
      var generators = definitions.map(
        ([unitId, conceptId, title, buildProblems]) => ({
          key: conceptId,
          courseId: "calculus-1",
          unitId,
          conceptId,
          requiredDistinctTypes: 5,
          problemTypes: Array.from(
            { length: 10 },
            (_, index) => ({
              id: `${conceptId}-type-${String(
                index + 1
              ).padStart(2, "0")}`,
              label: `\uC720\uD615 ${index + 1} \xB7 ${title}`,
              difficulty: index < 3 ? 1 : index < 7 ? 2 : 3,
              generate() {
                const generated = buildProblems()[index];
                if (!generated) {
                  throw new Error(
                    `${conceptId}\uC758 ${index + 1}\uBC88 \uBB38\uC81C \uC720\uD615\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.`
                  );
                }
                return {
                  ...generated,
                  validityChecks: [
                    {
                      name: "calculus-answer",
                      passed: generated.answer !== void 0 && generated.answer !== null && String(
                        generated.answer
                      ).trim() !== "",
                      message: "\uC815\uB2F5\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."
                    }
                  ]
                };
              }
            })
          ),
          isCorrectAnswer
        })
      );
      var generatorMap = new Map(
        generators.map((generator) => [
          [
            generator.courseId,
            generator.unitId,
            generator.conceptId
          ].join("/"),
          generator
        ])
      );
      module.exports = {
        generators,
        generatorMap
      };
    }
  });

  // services/problemGenerators/algebra/helpers.js
  var require_helpers2 = __commonJS({
    "services/problemGenerators/algebra/helpers.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        isCorrectAnswer
      } = require_utils();
      var {
        formatAlgebraMathText
      } = require_mathTextService();
      function round4(value) {
        return Number(Number(value).toFixed(4));
      }
      function iterate(firstTerm, step, targetIndex) {
        let value = firstTerm;
        for (let index = 1; index < targetIndex; index += 1) {
          value = step(value, index);
        }
        return value;
      }
      var GRAPH_CONCEPT_IDS = /* @__PURE__ */ new Set([
        "algebra-01-04",
        "algebra-01-06",
        "algebra-01-07",
        "algebra-01-08",
        "algebra-02-02",
        "algebra-03-01",
        "algebra-03-02",
        "algebra-03-03",
        "algebra-03-06"
      ]);
      function normalizeGraphPrompt(value) {
        const subscriptDigits = {
          "\u2080": "0",
          "\u2081": "1",
          "\u2082": "2",
          "\u2083": "3",
          "\u2084": "4",
          "\u2085": "5",
          "\u2086": "6",
          "\u2087": "7",
          "\u2088": "8",
          "\u2089": "9"
        };
        return String(value || "").replace(/−/g, "-").replace(/[₀-₉]/g, (digit) => subscriptDigits[digit]).replace(/\s+/g, " ").trim();
      }
      function matchedNumber(text, pattern, fallback = null) {
        const match = text.match(pattern);
        const value = match ? Number(match[1]) : Number.NaN;
        return Number.isFinite(value) ? value : fallback;
      }
      function finiteAnswer(generated, fallback = null) {
        const value = Number(generated.answer);
        return Number.isFinite(value) ? value : fallback;
      }
      function expLogVisualization({
        conceptId,
        typeId,
        generated,
        text
      }) {
        const fractionBase = matchedNumber(
          text,
          /\(1\/(\d+(?:\.\d+)?)\)\^/
        );
        const logBase = matchedNumber(text, /log_(\d+(?:\.\d+)?)/);
        const exponentialBase = matchedNumber(
          text,
          /(?:^|[=\s])(\d+(?:\.\d+)?)\^\(?x/
        );
        const base = fractionBase ? 1 / fractionBase : logBase || exponentialBase || 2;
        const answer = finiteAnswer(generated);
        const isLog = text.includes("log");
        const isInverse = typeId === "inverse-relation" || typeId === "symmetry-yx" || typeId === "log-inverse";
        const functionType = isInverse ? "both" : isLog ? "log" : "exp";
        const minusShift = matchedNumber(
          text,
          /log_[^( ]+\s*\(x\s*-\s*(-?\d+(?:\.\d+)?)/
        );
        const plusShift = matchedNumber(
          text,
          /log_[^( ]+\s*\(x\s*\+\s*(\d+(?:\.\d+)?)/
        );
        const shiftX = minusShift !== null ? minusShift : plusShift !== null ? -plusShift : 0;
        const expShift = matchedNumber(
          text,
          /\^x\s*\+\s*(-?\d+(?:\.\d+)?)/
        );
        const expMinusShift = matchedNumber(
          text,
          /\^x\s*-\s*(\d+(?:\.\d+)?)/
        );
        const exponentOffset = matchedNumber(
          text,
          /\^\(x\s*\+\s*(-?\d+(?:\.\d+)?)\)/
        ) ?? 0;
        const shiftY = expShift !== null ? expShift : expMinusShift !== null ? -expMinusShift : 0;
        let focusX = functionType === "log" ? shiftX + 1 : 0;
        let targetY = null;
        let inequality = null;
        const functionInput = matchedNumber(
          text,
          /[fg]\((-?\d+(?:\.\d+)?)\)/
        );
        const interval = text.match(
          /(-?\d+(?:\.\d+)?)≤x≤(-?\d+(?:\.\d+)?)/
        );
        const point = text.match(
          /\((-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)\)/
        );
        const logArgument = matchedNumber(
          text,
          /log_\d+(?:\.\d+)?\s+(\d+(?:\.\d+)?)/
        );
        if (functionInput !== null) {
          focusX = functionInput;
        } else if (interval) {
          const left = Number(interval[1]);
          const right = Number(interval[2]);
          const asksMaximum = text.includes("\uCD5C\uB313\uAC12") || text.includes("\uCD5C\uB300");
          focusX = asksMaximum ? right : left;
        } else if (point) {
          focusX = Number(point[1]);
        } else if ([
          "exp-equation",
          "exp-equation-base",
          "exp-inequality",
          "exp-eq-two",
          "exp-solve"
        ].includes(typeId) && answer !== null) {
          focusX = answer;
        } else if (typeId === "exp-sub" && answer !== null) {
          focusX = Math.log(Math.max(answer, 1e-4)) / Math.log(base);
        } else if ([
          "log-eq-def",
          "log-equation",
          "log-inequality",
          "log-eq-two"
        ].includes(typeId) && answer !== null) {
          focusX = answer;
        } else if (logArgument !== null) {
          focusX = logArgument;
        } else if (typeId === "compound-growth") {
          focusX = matchedNumber(text, /(\d+)기간/, 1);
        } else if (typeId === "log-scale") {
          focusX = matchedNumber(
            text,
            /x=(-?\d+(?:\.\d+)?)/,
            shiftX + 1
          );
        }
        if ([
          "exp-equation",
          "exp-equation-base",
          "exp-inequality",
          "exp-eq-two",
          "exp-solve"
        ].includes(typeId)) {
          targetY = base ** (focusX + exponentOffset) + shiftY;
        } else if (typeId === "exp-sub") {
          targetY = answer;
        } else if ([
          "log-eq-def",
          "log-equation",
          "log-inequality",
          "log-eq-two"
        ].includes(typeId)) {
          const argument = Math.max(1e-4, focusX - shiftX);
          targetY = Math.log(argument) / Math.log(base);
        }
        if (typeId.includes("inequality")) {
          if (text.includes(">")) inequality = "greater";
          if (text.includes("<")) inequality = "less";
        }
        return {
          kind: "algebra-exp-log",
          conceptId,
          typeId,
          functionType,
          base,
          shiftX,
          shiftY,
          exponentOffset,
          focusX,
          targetY,
          inequality,
          focusFunction: isLog ? "log" : "exp",
          reflectY: typeId === "reflect-exp",
          showInverseLine: isInverse,
          note: inequality ? "\uAD50\uC810\uC758 \uC591\uCABD\uC5D0\uC11C \uB450 \uADF8\uB798\uD504\uC758 \uB192\uC774\uB97C \uBE44\uAD50\uD558\uC138\uC694." : isInverse ? "\uC9C0\uC218\uD568\uC218\uC640 \uB85C\uADF8\uD568\uC218\uC758 \uB300\uC751\uC810\uC740 y=x\uC5D0 \uB300\uD574 \uB300\uCE6D\uC785\uB2C8\uB2E4." : "\uD45C\uC2DC\uD55C \uC810\uACFC \uC810\uADFC\uC120\uC744 \uBB38\uC81C\uC758 \uC2DD\uACFC \uD568\uAED8 \uD655\uC778\uD558\uC138\uC694."
        };
      }
      function trigVisualization({
        conceptId,
        typeId,
        generated,
        text
      }) {
        const functionName = text.match(/\b(sin|cos|tan)\b/)?.[1] || "sin";
        const quadrant = matchedNumber(text, /제(\d)사분면/);
        const degree = matchedNumber(
          text,
          /(?:sin|cos|tan)\s*(\d+(?:\.\d+)?)°/
        );
        const amplitude = matchedNumber(text, /y=(-?\d+(?:\.\d+)?)sin/, 1);
        const frequency = matchedNumber(text, /sin\((\d+(?:\.\d+)?)x\)/, 1);
        const verticalShift = matchedNumber(
          text,
          /sin x\s*\+\s*(-?\d+(?:\.\d+)?)/,
          0
        );
        const answer = finiteAnswer(generated);
        let focusDegree = degree !== null ? degree : quadrant !== null ? [45, 135, 225, 315][quadrant - 1] : 90;
        if (typeId === "simple-equation" && answer !== null) {
          focusDegree = answer;
        } else if (typeId === "graph-min") {
          focusDegree = 270 / frequency;
        } else if (typeId === "graph-max") {
          focusDegree = 90 / frequency;
        }
        return {
          kind: "algebra-trig",
          conceptId,
          typeId,
          functionName,
          amplitude,
          frequency,
          verticalShift,
          focusDegree,
          note: typeId === "quadrant-sign" ? "\uD45C\uC2DC\uC810\uC774 \uC5B4\uB290 \uC0AC\uBD84\uBA74\uC5D0 \uC788\uB294\uC9C0 \uBCF4\uACE0 \uC88C\uD45C\uC758 \uBD80\uD638\uB97C \uD655\uC778\uD558\uC138\uC694." : "\uD45C\uC2DC\uD55C \uAC01\uC5D0\uC11C \uADF8\uB798\uD504\uC758 \uB192\uC774\uAC00 \uC0BC\uAC01\uD568\uC218 \uAC12\uC785\uB2C8\uB2E4."
        };
      }
      function sequenceBasicsValues(typeId, text, answer) {
        let count = Math.max(
          6,
          matchedNumber(text, /a_(\d+)/, 6)
        );
        count = Math.min(10, count);
        let evaluate = (n) => 2 * n + 1;
        const linear = text.match(
          /a_n=(-?\d+(?:\.\d+)?)n\+(-?\d+(?:\.\d+)?)/
        );
        if (linear) {
          const coefficient = Number(linear[1]);
          const constant = Number(linear[2]);
          evaluate = (n) => coefficient * n + constant;
        } else if (text.includes("a_n=n\xB2")) {
          evaluate = (n) => n * n;
        } else if (text.includes("a_n=n(n+1)")) {
          evaluate = (n) => n * (n + 1);
        } else if (text.includes("(-1)\u207F") || text.includes("(\u22121)\u207F")) {
          evaluate = (n) => (n % 2 ? -1 : 1) * n;
        } else if (text.includes("a_n=2\u207F")) {
          evaluate = (n) => 2 ** n;
        } else if (typeId === "an-from-Sn") {
          evaluate = (n) => 2 * n - 1;
        } else if (typeId === "next-term-pattern") {
          const listed = text.match(/수열\s+([^.]*)\.\.\./)?.[1]?.match(/-?\d+(?:\.\d+)?/g)?.map(Number);
          if (Array.isArray(listed) && listed.length >= 3) {
            return [
              ...listed.slice(0, 4),
              answer
            ].filter(Number.isFinite);
          }
        }
        return Array.from(
          { length: count },
          (_, index) => evaluate(index + 1)
        );
      }
      function arithmeticValues(typeId, text, answer) {
        let first = matchedNumber(text, /첫째항 (-?\d+(?:\.\d+)?)/);
        let difference = matchedNumber(text, /공차 (-?\d+(?:\.\d+)?)/);
        let count = Math.max(
          6,
          matchedNumber(text, /제(\d+)항/, 6),
          matchedNumber(text, /a_(\d+)/, 6)
        );
        const firstTwo = text.match(
          /a1=(-?\d+(?:\.\d+)?), a2=(-?\d+(?:\.\d+)?)/
        );
        const twoTerms = text.match(
          /a_(\d+)=(-?\d+(?:\.\d+)?), a_(\d+)=(-?\d+(?:\.\d+)?)/
        );
        const endpoints = text.match(
          /첫째항 (-?\d+(?:\.\d+)?), 제(\d+)항 (-?\d+(?:\.\d+)?)/
        );
        const knownTerm = text.match(
          /공차 (-?\d+(?:\.\d+)?) 인 등차수열에서 a_(\d+)=(-?\d+(?:\.\d+)?)/
        );
        const three = text.match(
          /등차항이 (-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)/
        );
        const mean = text.match(
          /세 수 (-?\d+(?:\.\d+)?), x, (-?\d+(?:\.\d+)?)/
        );
        if (firstTwo) {
          first = Number(firstTwo[1]);
          difference = Number(firstTwo[2]) - first;
        } else if (twoTerms) {
          const firstIndex = Number(twoTerms[1]);
          const firstValue = Number(twoTerms[2]);
          const secondIndex = Number(twoTerms[3]);
          const secondValue = Number(twoTerms[4]);
          difference = (secondValue - firstValue) / (secondIndex - firstIndex);
          first = firstValue - (firstIndex - 1) * difference;
          count = Math.max(count, secondIndex);
        } else if (endpoints) {
          first = Number(endpoints[1]);
          count = Number(endpoints[2]);
          difference = (Number(endpoints[3]) - first) / Math.max(1, count - 1);
        } else if (knownTerm) {
          difference = Number(knownTerm[1]);
          count = Math.max(count, Number(knownTerm[2]));
          first = Number(knownTerm[3]) - (Number(knownTerm[2]) - 1) * difference;
        } else if (three) {
          return [
            Number(three[1]),
            Number(three[2]),
            Number(three[3])
          ];
        } else if (mean) {
          return [
            Number(mean[1]),
            answer,
            Number(mean[2])
          ];
        }
        first = first ?? 2;
        difference = difference ?? 2;
        count = Math.min(10, count);
        return Array.from(
          { length: count },
          (_, index) => first + index * difference
        );
      }
      function geometricValues(typeId, text, answer) {
        let first = matchedNumber(text, /첫째항 (-?\d+(?:\.\d+)?)/);
        let ratio = matchedNumber(text, /공비 (-?\d+(?:\.\d+)?)/);
        let count = Math.max(
          6,
          matchedNumber(text, /제(\d+)항/, 6),
          matchedNumber(text, /a_(\d+)/, 6)
        );
        const firstTwo = text.match(
          /a1=(-?\d+(?:\.\d+)?), a2=(-?\d+(?:\.\d+)?)/
        );
        const thirdTerm = text.match(
          /a1=(-?\d+(?:\.\d+)?), a3=(-?\d+(?:\.\d+)?)/
        );
        const knownTerm = text.match(
          /공비 (-?\d+(?:\.\d+)?) 인 등비수열에서 a_(\d+)=(-?\d+(?:\.\d+)?)/
        );
        const secondTerm = text.match(
          /공비 (-?\d+(?:\.\d+)?) 인 등비수열에서 a2=(-?\d+(?:\.\d+)?)/
        );
        const three = text.match(
          /등비항이 (-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?), (-?\d+(?:\.\d+)?)/
        );
        const mean = text.match(
          /세 양수 1, x, (\d+(?:\.\d+)?)/
        );
        if (firstTwo) {
          first = Number(firstTwo[1]);
          ratio = Number(firstTwo[2]) / first;
        } else if (thirdTerm) {
          first = Number(thirdTerm[1]);
          ratio = Math.sqrt(
            Number(thirdTerm[2]) / first
          );
        } else if (knownTerm) {
          ratio = Number(knownTerm[1]);
          count = Math.max(count, Number(knownTerm[2]));
          first = Number(knownTerm[3]) / ratio ** (Number(knownTerm[2]) - 1);
        } else if (secondTerm) {
          ratio = Number(secondTerm[1]);
          first = Number(secondTerm[2]) / ratio;
        } else if (three) {
          return [
            Number(three[1]),
            Number(three[2]),
            Number(three[3])
          ];
        } else if (mean) {
          return [1, answer, Number(mean[1])];
        }
        first = first ?? 1;
        ratio = ratio ?? 2;
        count = Math.min(9, count);
        return Array.from(
          { length: count },
          (_, index) => first * ratio ** index
        );
      }
      function recursiveValues(typeId, text) {
        const first = matchedNumber(text, /a1=(-?\d+(?:\.\d+)?)/, 1);
        const second = matchedNumber(text, /a2=(-?\d+(?:\.\d+)?)/);
        const targetIndices = Array.from(
          text.matchAll(/a(\d+)/g),
          (match) => Number(match[1])
        );
        const count = Math.min(
          9,
          Math.max(6, ...targetIndices)
        );
        const values = [first];
        if (typeId === "rec-fib") {
          values.push(second ?? 1);
          while (values.length < count) {
            values.push(
              values[values.length - 1] + values[values.length - 2]
            );
          }
          return values;
        }
        const additive = matchedNumber(
          text,
          /a_\{n\+1\}=a_n\+(-?\d+(?:\.\d+)?)/
        );
        const multiplier = matchedNumber(
          text,
          /a_\{n\+1\}=(-?\d+(?:\.\d+)?)·?a_n/
        );
        while (values.length < count) {
          const n = values.length;
          const previous = values[values.length - 1];
          let next;
          if (typeId === "rec-add-n") {
            next = previous + 2 * n;
          } else if (typeId === "rec-affine") {
            next = 2 * previous + 1;
          } else if (typeId === "rec-half") {
            next = previous / 2;
          } else if (typeId === "rec-add-nsq") {
            next = previous + n * n;
          } else if (typeId === "rec-known-two") {
            next = values.length === 1 && second !== null ? second : previous + ((second ?? first + 1) - first);
          } else if (multiplier !== null) {
            next = previous * multiplier;
          } else {
            next = previous + (additive ?? 2);
          }
          values.push(next);
        }
        return values;
      }
      function sequenceVisualization({
        conceptId,
        typeId,
        generated,
        text
      }) {
        const answer = finiteAnswer(generated);
        let values;
        if (conceptId === "algebra-03-01") {
          values = sequenceBasicsValues(typeId, text, answer);
        } else if (conceptId === "algebra-03-02") {
          values = arithmeticValues(typeId, text, answer);
        } else if (conceptId === "algebra-03-03") {
          values = geometricValues(typeId, text, answer);
        } else {
          values = recursiveValues(typeId, text);
        }
        const explicitIndices = Array.from(
          text.matchAll(/a_?(\d+)/g),
          (match) => Number(match[1])
        ).filter(Number.isFinite);
        const requestedIndex = explicitIndices.length ? Math.max(...explicitIndices) : values.length;
        return {
          kind: "algebra-sequence",
          conceptId,
          typeId,
          values: values.map(Number).filter(Number.isFinite).slice(0, 10),
          focusIndex: Math.min(
            values.length,
            Math.max(1, requestedIndex)
          ),
          note: conceptId === "algebra-03-02" ? "\uC810 \uC0AC\uC774\uC758 \uC138\uB85C \uBCC0\uD654\uB7C9\uC774 \uC77C\uC815\uD55C\uC9C0 \uD655\uC778\uD558\uC138\uC694." : conceptId === "algebra-03-03" ? "\uC55E \uD56D\uC5D0\uC11C \uB2E4\uC74C \uD56D\uC73C\uB85C \uAC08 \uB54C\uC758 \uBE44\uC728\uC744 \uD655\uC778\uD558\uC138\uC694." : conceptId === "algebra-03-06" ? "\uC55E \uD56D\uC5D0\uC11C \uAC19\uC740 \uADDC\uCE59\uC744 \uC801\uC6A9\uD574 \uB2E4\uC74C \uD56D\uC744 \uB9CC\uB4ED\uB2C8\uB2E4." : "\uC218\uC5F4\uC740 \uC790\uC5F0\uC218 \uC704\uCE58\uC5D0 \uCC0D\uD78C \uC810\uB4E4\uC758 \uBAA8\uC784\uC785\uB2C8\uB2E4."
        };
      }
      function buildAlgebraGraphVisualization({
        conceptId,
        typeId,
        generated
      }) {
        if (!GRAPH_CONCEPT_IDS.has(conceptId)) {
          return {
            kind: "algebra-concept",
            conceptId,
            typeId
          };
        }
        const text = normalizeGraphPrompt(
          generated.prompt
        );
        if (conceptId.startsWith("algebra-01-")) {
          return expLogVisualization({
            conceptId,
            typeId,
            generated,
            text
          });
        }
        if (conceptId === "algebra-02-02") {
          return trigVisualization({
            conceptId,
            typeId,
            generated,
            text
          });
        }
        return sequenceVisualization({
          conceptId,
          typeId,
          generated,
          text
        });
      }
      function createAlgebraProblemType(problemType, { conceptId, conceptTitle }) {
        return {
          ...problemType,
          generate() {
            const generated = problemType.generate();
            const typeTitle = problemType.label.replace(
              /^유형\s*\d+\s*·\s*/,
              ""
            );
            return {
              ...generated,
              prompt: formatAlgebraMathText(
                generated.prompt
              ),
              solution: formatAlgebraMathText(
                generated.solution
              ),
              choices: Array.isArray(
                generated.choices
              ) ? generated.choices.map(
                (choice) => ({
                  ...choice,
                  text: formatAlgebraMathText(
                    choice.text
                  )
                })
              ) : generated.choices,
              hintText: formatAlgebraMathText(
                generated.hintText || (generated.inputMode === "multiple-choice" ? `${conceptTitle}\uC758 \uC815\uC758\uC640 \uC870\uAC74\uC744 \uBA3C\uC800 \uD655\uC778\uD55C \uB4A4 \uAC01 \uC120\uD0DD\uC9C0\uB97C \uBE44\uAD50\uD574\uBCF4\uC138\uC694.` : `\uBB38\uC81C\uC5D0 \uC8FC\uC5B4\uC9C4 \uC218\uC640 \uAE30\uD638\uB97C ${typeTitle}\uC758 \uAD00\uACC4\uC2DD\uC5D0 \uD45C\uC2DC\uD55C \uB4A4, \uD55C \uC904\uC5D0 \uD55C \uB2E8\uACC4\uC529 \uC815\uB9AC\uD574\uBCF4\uC138\uC694.`)
              ),
              visualization: generated.visualization || {
                ...buildAlgebraGraphVisualization({
                  conceptId,
                  typeId: problemType.id,
                  generated
                }),
                difficulty: problemType.difficulty || 1
              },
              validityChecks: [
                ...generated.validityChecks || [],
                {
                  name: "algebra-generated-answer",
                  passed: generated.answer !== void 0 && generated.answer !== null && String(generated.answer).trim() !== "",
                  message: "\uC0DD\uC131\uB41C \uBB38\uC81C\uC758 \uC815\uB2F5\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        };
      }
      module.exports = {
        randomInteger,
        nonZeroInteger,
        round4,
        iterate,
        isCorrectAnswer,
        buildAlgebraGraphVisualization,
        createAlgebraProblemType
      };
    }
  });

  // services/problemGenerators/algebra/powersAndRoots.js
  var require_powersAndRoots = __commonJS({
    "services/problemGenerators/algebra/powersAndRoots.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "nth-root-value",
          label: "\uC720\uD615 1 \xB7 \uAC70\uB4ED\uC81C\uACF1\uADFC\uC758 \uAC12",
          difficulty: 1,
          generate() {
            const b = randomInteger(2, 5), n = randomInteger(2, 3), v = b ** n;
            return {
              prompt: `${n}\uC81C\uACF1\uADFC ${v} \uC758 \uAC12(\uC591\uC758 \uC2E4\uC218)\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b,
              solution: `${v}=${b}^${n} \uC774\uBBC0\uB85C \uAC12\uC740 ${b}.`
            };
          }
        },
        {
          id: "root-product",
          label: "\uC720\uD615 2 \xB7 \uAC70\uB4ED\uC81C\uACF1\uADFC\uC758 \uACF1",
          difficulty: 2,
          generate() {
            const m = randomInteger(2, 6), k = randomInteger(2, 6);
            return {
              prompt: `\u221A${m * m} \xD7 \u221A${k * k} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: m * k,
              solution: `\u221A${m * m}=${m}, \u221A${k * k}=${k} \u2192 ${m}\xD7${k}=${m * k}.`
            };
          }
        },
        {
          id: "root-quotient",
          label: "\uC720\uD615 3 \xB7 \uAC70\uB4ED\uC81C\uACF1\uADFC\uC758 \uB098\uB217\uC148",
          difficulty: 2,
          generate() {
            const m = randomInteger(2, 6), k = randomInteger(2, 5), a = (m * k) ** 2, b = k * k;
            return {
              prompt: `\u221A${a} \xF7 \u221A${b} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: m,
              solution: `\u221A${a}/\u221A${b}=\u221A(${a}/${b})=\u221A${m * m}=${m}.`
            };
          }
        },
        {
          id: "root-power",
          label: "\uC720\uD615 4 \xB7 \uAC70\uB4ED\uC81C\uACF1\uADFC\uC758 \uAC70\uB4ED\uC81C\uACF1",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 4), m = randomInteger(2, 3), a = b ** 3;
            return {
              prompt: `(\u221B${a})^${m} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b ** m,
              solution: `\u221B${a}=${b} \uC774\uBBC0\uB85C ${b}^${m}=${b ** m}.`
            };
          }
        },
        {
          id: "root-of-root",
          label: "\uC720\uD615 5 \xB7 \uC774\uC911\uADFC\uD638",
          difficulty: 3,
          generate() {
            const b = randomInteger(2, 3), a = b ** 6;
            return {
              prompt: `\u221A(\u221B${a}) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b,
              solution: `\u221A(\u221B${a})=${a}^(1/6)=${b}.`
            };
          }
        },
        {
          id: "exp-to-root",
          label: "\uC720\uD615 6 \xB7 \uC9C0\uC218\u2194\uAC70\uB4ED\uC81C\uACF1\uADFC",
          difficulty: 1,
          generate() {
            const b = randomInteger(2, 5), n = randomInteger(2, 3), a = b ** n;
            return {
              prompt: `${a}^(1/${n}) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b,
              solution: `${a}^(1/${n})=${n}\uC81C\uACF1\uADFC ${a}=${b}.`
            };
          }
        },
        {
          id: "count-real-roots",
          label: "\uC720\uD615 7 \xB7 \uC2E4\uC218\uC778 \uAC70\uB4ED\uC81C\uACF1\uADFC\uC758 \uAC1C\uC218",
          difficulty: 2,
          generate() {
            const n = randomInteger(2, 5), even = n % 2 === 0;
            return {
              prompt: `\uC591\uC218 a \uC758 \uC2E4\uC218\uC778 ${n}\uC81C\uACF1\uADFC\uC758 \uAC1C\uC218\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: even ? 2 : 1,
              solution: even ? `n\uC774 \uC9DD\uC218\uC774\uACE0 a>0\uC774\uBA74 \uC2E4\uC218\uC778 \uAC70\uB4ED\uC81C\uACF1\uADFC\uC740 2\uAC1C.` : `n\uC774 \uD640\uC218\uC774\uBA74 \uC2E4\uC218\uC778 \uAC70\uB4ED\uC81C\uACF1\uADFC\uC740 1\uAC1C.`
            };
          }
        },
        {
          id: "root-compare",
          label: "\uC720\uD615 8 \xB7 \uAC70\uB4ED\uC81C\uACF1\uADFC\uC758 \uB300\uC18C",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 5);
            return {
              prompt: `a=${a}(>1) \uC77C \uB54C \u221Aa \uC640 \u221Ba \uC911 \uB354 \uD070 \uAC12\uC740?`,
              inputMode: "multiple-choice",
              choices: [{ key: "sqrt", text: "\u221Aa" }, { key: "cbrt", text: "\u221Ba" }],
              answer: "sqrt",
              solution: `a>1\uC774\uBA74 \uC9C0\uC218 1/2 > 1/3 \uC774\uBBC0\uB85C \u221Aa\uAC00 \uB354 \uD07D\uB2C8\uB2E4.`
            };
          }
        },
        {
          id: "cube-root",
          label: "\uC720\uD615 9 \xB7 \uC138\uC81C\uACF1\uADFC \uACC4\uC0B0",
          difficulty: 1,
          generate() {
            const b = randomInteger(2, 6), a = b ** 3;
            return {
              prompt: `\u221B${a} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b,
              solution: `${b}\xB3=${a} \uC774\uBBC0\uB85C \u221B${a}=${b}.`
            };
          }
        },
        {
          id: "root-combined",
          label: "\uC720\uD615 10 \xB7 \uAC70\uB4ED\uC81C\uACF1\uADFC \uC885\uD569",
          difficulty: 3,
          generate() {
            const a = randomInteger(2, 4), b = randomInteger(2, 4);
            return {
              prompt: `\u221B(${a}\xB3 \xD7 ${b}\xB3) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a * b,
              solution: `\u221B(${a}\xB3\xD7${b}\xB3)=${a}\xD7${b}=${a * b}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-01-01",
          conceptTitle: "\uAC70\uB4ED\uC81C\uACF1\uACFC \uAC70\uB4ED\uC81C\uACF1\uADFC"
        })
      );
      module.exports = {
        key: "algebra-powers-and-roots",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/rationalAndRealExponents.js
  var require_rationalAndRealExponents = __commonJS({
    "services/problemGenerators/algebra/rationalAndRealExponents.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "rational-exp",
          label: "\uC720\uD615 1 \xB7 \uC720\uB9AC\uC218 \uC9C0\uC218\uC758 \uAC12",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 3), n = randomInteger(2, 3), m = randomInteger(1, 2), a = b ** n;
            return {
              prompt: `${a}^(${m}/${n}) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b ** m,
              solution: `${a}=${b}^${n} \u2192 (${b}^${n})^(${m}/${n})=${b}^${m}=${b ** m}.`
            };
          }
        },
        {
          id: "negative-exp",
          label: "\uC720\uD615 2 \xB7 \uC74C\uC758 \uC9C0\uC218",
          difficulty: 1,
          generate() {
            const b = randomInteger(2, 5), n = randomInteger(1, 3);
            return {
              prompt: `${b}^(\u2212${n}) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694. (\uC18C\uC218\uB85C \uC785\uB825)`,
              inputMode: "short-answer",
              answer: 1 / b ** n,
              solution: `${b}^(\u2212${n})=1/${b ** n}=${(1 / b ** n).toFixed(4)}.`
            };
          }
        },
        {
          id: "rational-notation",
          label: "\uC720\uD615 3 \xB7 \uC720\uB9AC\uC218 \uC9C0\uC218 \u2194 \uADFC\uD638 \uD45C\uD604",
          difficulty: 2,
          generate() {
            const p = randomInteger(2, 3), q = randomInteger(2, 3);
            return {
              prompt: `a^(${p}/${q}) \uB97C \uADFC\uD638\uB85C \uBC14\uB974\uAC8C \uB098\uD0C0\uB0B8 \uAC83\uC740?`,
              inputMode: "multiple-choice",
              choices: [{ key: "ok", text: `${q}\uC81C\uACF1\uADFC (a^${p})` }, { key: "no", text: `${p}\uC81C\uACF1\uADFC (a^${q})` }],
              answer: "ok",
              solution: `a^(m/n)=n\uC81C\uACF1\uADFC(a^m) \uC774\uBBC0\uB85C ${q}\uC81C\uACF1\uADFC(a^${p}).`
            };
          }
        },
        {
          id: "product-rational",
          label: "\uC720\uD615 4 \xB7 \uC720\uB9AC\uC218 \uC9C0\uC218\uC758 \uACF1",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 4), a = b ** 2;
            return {
              prompt: `${a}^(1/2) \xD7 ${a}^(1/2) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a,
              solution: `\uC9C0\uC218\uB97C \uB354\uD558\uBA74 ${a}^1=${a}.`
            };
          }
        },
        {
          id: "power-of-power",
          label: "\uC720\uD615 5 \xB7 \uC720\uB9AC\uC218 \uC9C0\uC218\uC758 \uAC70\uB4ED\uC81C\uACF1",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 3), a = b ** 2;
            return {
              prompt: `(${a}^(1/2))^4 \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a ** 2,
              solution: `\uC9C0\uC218\uB97C \uACF1\uD558\uBA74 ${a}^2=${a ** 2}.`
            };
          }
        },
        {
          id: "eighth",
          label: "\uC720\uD615 6 \xB7 \uC720\uB9AC\uC218 \uC9C0\uC218 \uACC4\uC0B0",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 3), n = randomInteger(2, 3), a = b ** n, m = randomInteger(2, 3);
            return {
              prompt: `${a}^(${m}/${n}) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b ** m,
              solution: `(${b}^${n})^(${m}/${n})=${b}^${m}=${b ** m}.`
            };
          }
        },
        {
          id: "reciprocal-neg",
          label: "\uC720\uD615 7 \xB7 (1/a)^(\u2212n)",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4), n = randomInteger(1, 3);
            return {
              prompt: `(1/${a})^(\u2212${n}) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a ** n,
              solution: `(1/${a})^(\u2212${n})=${a}^${n}=${a ** n}.`
            };
          }
        },
        {
          id: "compare-rational",
          label: "\uC720\uD615 8 \xB7 \uC720\uB9AC\uC218 \uC9C0\uC218 \uB300\uC18C",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4);
            return {
              prompt: `a=${a}(>1) \uC77C \uB54C a^(2/3) \uC640 a^(1/2) \uC911 \uD070 \uAC12\uC740?`,
              inputMode: "multiple-choice",
              choices: [{ key: "a", text: "a^(2/3)" }, { key: "b", text: "a^(1/2)" }],
              answer: "a",
              solution: `2/3 > 1/2 \uC774\uACE0 \uBC11>1 \uC774\uBBC0\uB85C a^(2/3)\uAC00 \uD07D\uB2C8\uB2E4.`
            };
          }
        },
        {
          id: "zero-exp",
          label: "\uC720\uD615 9 \xB7 \uC9C0\uC218 0",
          difficulty: 1,
          generate() {
            const a = nonZeroInteger(2, 9);
            return {
              prompt: `${a}^0 \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 1,
              solution: `0\uC774 \uC544\uB2CC \uC218\uC758 0\uC81C\uACF1\uC740 \uD56D\uC0C1 1.`
            };
          }
        },
        {
          id: "root-exp-mix",
          label: "\uC720\uD615 10 \xB7 \uADFC\uD638\xB7\uC9C0\uC218 \uD63C\uD569",
          difficulty: 3,
          generate() {
            const b = randomInteger(2, 3), a = b ** 6;
            return {
              prompt: `${a}^(1/6) \xD7 ${a}^(1/3) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b ** 3,
              solution: `\uC9C0\uC218\uD569 1/6+1/3=1/2 \u2192 ${a}^(1/2)=${b ** 3}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-01-02",
          conceptTitle: "\uC720\uB9AC\uC218\xB7\uC2E4\uC218 \uC9C0\uC218\uB85C\uC758 \uD655\uC7A5"
        })
      );
      module.exports = {
        key: "algebra-rational-and-real-exponents",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/exponentLaws.js
  var require_exponentLaws = __commonJS({
    "services/problemGenerators/algebra/exponentLaws.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "law-mult",
          label: "\uC720\uD615 1 \xB7 \uC9C0\uC218\uC758 \uACF1\uC148\uBC95\uCE59",
          difficulty: 1,
          generate() {
            const b = randomInteger(2, 5), m = randomInteger(2, 5), n = randomInteger(2, 5);
            return {
              prompt: `${b}^${m} \xD7 ${b}^${n} = ${b}^k \uC77C \uB54C k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: m + n,
              solution: `\uC9C0\uC218\uB97C \uB354\uD568: ${m}+${n}=${m + n}.`
            };
          }
        },
        {
          id: "law-div",
          label: "\uC720\uD615 2 \xB7 \uC9C0\uC218\uC758 \uB098\uB217\uC148\uBC95\uCE59",
          difficulty: 1,
          generate() {
            const b = randomInteger(2, 5), m = randomInteger(4, 8), n = randomInteger(1, 3);
            return {
              prompt: `${b}^${m} \xF7 ${b}^${n} = ${b}^k \uC77C \uB54C k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: m - n,
              solution: `\uC9C0\uC218\uB97C \uBE8C: ${m}\u2212${n}=${m - n}.`
            };
          }
        },
        {
          id: "law-power",
          label: "\uC720\uD615 3 \xB7 \uC9C0\uC218\uC758 \uAC70\uB4ED\uC81C\uACF1\uBC95\uCE59",
          difficulty: 1,
          generate() {
            const b = randomInteger(2, 4), m = randomInteger(2, 4), n = randomInteger(2, 4);
            return {
              prompt: `(${b}^${m})^${n} = ${b}^k \uC77C \uB54C k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: m * n,
              solution: `\uC9C0\uC218\uB97C \uACF1\uD568: ${m}\xD7${n}=${m * n}.`
            };
          }
        },
        {
          id: "law-product-base",
          label: "\uC720\uD615 4 \xB7 \uACF1\uC758 \uAC70\uB4ED\uC81C\uACF1",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 3), b = randomInteger(2, 3), n = randomInteger(2, 3);
            return {
              prompt: `(${a}\xD7${b})^${n} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: (a * b) ** n,
              solution: `(${a}\xD7${b})^${n}=${a}^${n}\xD7${b}^${n}=${(a * b) ** n}.`
            };
          }
        },
        {
          id: "law-value",
          label: "\uC720\uD615 5 \xB7 \uC9C0\uC218\uBC95\uCE59 \uAC12 \uACC4\uC0B0",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 3), m = randomInteger(1, 3), n = randomInteger(1, 3);
            return {
              prompt: `${b}^${m} \xD7 ${b}^${n} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b ** (m + n),
              solution: `${b}^${m + n}=${b ** (m + n)}.`
            };
          }
        },
        {
          id: "law-neg-combine",
          label: "\uC720\uD615 6 \xB7 \uC74C\uC758 \uC9C0\uC218 \uD3EC\uD568 \uACC4\uC0B0",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 4), m = randomInteger(3, 6), n = randomInteger(1, 2);
            return {
              prompt: `${b}^${m} \xD7 ${b}^(\u2212${n}) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b ** (m - n),
              solution: `\uC9C0\uC218\uD569 ${m}\u2212${n}=${m - n} \u2192 ${b ** (m - n)}.`
            };
          }
        },
        {
          id: "law-frac-exp",
          label: "\uC720\uD615 7 \xB7 \uC9C0\uC218\uBC95\uCE59\uACFC \uC720\uB9AC\uC218 \uC9C0\uC218",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 3), a = b ** 2;
            return {
              prompt: `${a}^(3/2) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b ** 3,
              solution: `(${b}^2)^(3/2)=${b}^3=${b ** 3}.`
            };
          }
        },
        {
          id: "law-simplify-exp",
          label: "\uC720\uD615 8 \xB7 \uC9C0\uC218 \uAC04\uB2E8\uD788(\uC9C0\uC218 \uAD6C\uD558\uAE30)",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 4), m = randomInteger(2, 4), n = randomInteger(2, 4), p = randomInteger(1, 3);
            return {
              prompt: `(${b}^${m})^${n} \xF7 ${b}^${p} = ${b}^k \uC77C \uB54C k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: m * n - p,
              solution: `${m}\xD7${n}\u2212${p}=${m * n - p}.`
            };
          }
        },
        {
          id: "law-base-swap",
          label: "\uC720\uD615 9 \xB7 \uBC11\uC774 \uAC70\uB4ED\uC81C\uACF1\uC778 \uACBD\uC6B0",
          difficulty: 3,
          generate() {
            const n = randomInteger(2, 4);
            return {
              prompt: `4^${n} = 2^k \uC77C \uB54C k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 2 * n,
              solution: `4=2\xB2 \uC774\uBBC0\uB85C 4^${n}=2^(2\xD7${n})=2^${2 * n}.`
            };
          }
        },
        {
          id: "law-mixed-value",
          label: "\uC720\uD615 10 \xB7 \uC9C0\uC218\uBC95\uCE59 \uC885\uD569",
          difficulty: 3,
          generate() {
            const b = randomInteger(2, 3);
            return {
              prompt: `${b}\xB2 \xD7 ${b}\xB3 \xF7 ${b} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b ** 4,
              solution: `\uC9C0\uC218\uD569 2+3\u22121=4 \u2192 ${b}^4=${b ** 4}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-01-03",
          conceptTitle: "\uC9C0\uC218\uBC95\uCE59"
        })
      );
      module.exports = {
        key: "algebra-exponent-laws",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/logarithmDefinitionAndProperties.js
  var require_logarithmDefinitionAndProperties = __commonJS({
    "services/problemGenerators/algebra/logarithmDefinitionAndProperties.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "log-def",
          label: "\uC720\uD615 1 \xB7 \uB85C\uADF8\uC758 \uC815\uC758",
          difficulty: 1,
          generate() {
            const a = randomInteger(2, 5), k = randomInteger(1, 4);
            return {
              prompt: `log_${a} ${a ** k} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k,
              solution: `${a}^${k}=${a ** k} \u2192 ${k}.`
            };
          }
        },
        {
          id: "log-eq-def",
          label: "\uC720\uD615 2 \xB7 \uB85C\uADF8\uC758 \uC815\uC758(\uC9C4\uC218 \uAD6C\uD558\uAE30)",
          difficulty: 1,
          generate() {
            const a = randomInteger(2, 4), k = randomInteger(1, 4);
            return {
              prompt: `log_${a} x = ${k} \uC77C \uB54C x \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a ** k,
              solution: `x=${a}^${k}=${a ** k}.`
            };
          }
        },
        {
          id: "log-sum",
          label: "\uC720\uD615 3 \xB7 \uB85C\uADF8\uC758 \uD569",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 3), m = randomInteger(1, 3), n = randomInteger(1, 3);
            return {
              prompt: `log_${a} ${a ** m} + log_${a} ${a ** n} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: m + n,
              solution: `\uACF1\uC758 \uB85C\uADF8=\uD569 \u2192 ${m}+${n}=${m + n}.`
            };
          }
        },
        {
          id: "log-diff",
          label: "\uC720\uD615 4 \xB7 \uB85C\uADF8\uC758 \uCC28",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 3), m = randomInteger(3, 5), n = randomInteger(1, 2);
            return {
              prompt: `log_${a} ${a ** m} \u2212 log_${a} ${a ** n} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: m - n,
              solution: `\uB098\uB217\uC148\uC758 \uB85C\uADF8=\uCC28 \u2192 ${m}\u2212${n}=${m - n}.`
            };
          }
        },
        {
          id: "log-power",
          label: "\uC720\uD615 5 \xB7 \uB85C\uADF8\uC640 \uC9C0\uC218(\uACC4\uC218)",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4), k = randomInteger(2, 4), p = randomInteger(2, 3);
            return {
              prompt: `log_${a} (${a ** k})^${p} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k * p,
              solution: `\uC9C4\uC218\uC758 \uC9C0\uC218\uB294 \uC55E\uC73C\uB85C: ${p}\xD7${k}=${k * p}.`
            };
          }
        },
        {
          id: "log-one-zero",
          label: "\uC720\uD615 6 \xB7 \uB85C\uADF8\uC758 \uAE30\uBCF8\uAC12",
          difficulty: 1,
          generate() {
            const a = randomInteger(2, 9), one = Math.random() < 0.5;
            return {
              prompt: `log_${a} ${one ? 1 : a} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: one ? 0 : 1,
              solution: one ? `log_a 1 = 0.` : `log_a a = 1.`
            };
          }
        },
        {
          id: "change-base",
          label: "\uC720\uD615 7 \xB7 \uBC11\uBCC0\uD658",
          difficulty: 3,
          generate() {
            const s = randomInteger(1, 3);
            let t = randomInteger(1, 4);
            while (t === s) t = randomInteger(1, 4);
            return {
              prompt: `log_${2 ** s} ${2 ** t} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694. (\uC18C\uC218 \uAC00\uB2A5)`,
              inputMode: "short-answer",
              answer: t / s,
              solution: `\uBC11\uC744 2\uB85C: (${t})/(${s})=${(t / s).toFixed(4)}.`
            };
          }
        },
        {
          id: "log-value-combo",
          label: "\uC720\uD615 8 \xB7 \uB85C\uADF8 \uC131\uC9C8 \uC885\uD569",
          difficulty: 3,
          generate() {
            const a = randomInteger(2, 3), m = randomInteger(1, 3), n = randomInteger(1, 3);
            return {
              prompt: `log_${a} ${a ** m} + log_${a} ${a ** n} \u2212 log_${a} ${a} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: m + n - 1,
              solution: `${m}+${n}\u22121=${m + n - 1}.`
            };
          }
        },
        {
          id: "log-inverse",
          label: "\uC720\uD615 9 \xB7 \uB85C\uADF8\uC640 \uC9C0\uC218\uC758 \uC5ED\uAD00\uACC4",
          difficulty: 3,
          generate() {
            const a = randomInteger(2, 3), k = randomInteger(1, 3);
            return {
              prompt: `${a}^(log_${a} ${a ** k}) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a ** k,
              solution: `log_${a} ${a ** k}=${k} \u2192 ${a}^${k}=${a ** k}.`
            };
          }
        },
        {
          id: "log-domain",
          label: "\uC720\uD615 10 \xB7 \uB85C\uADF8\uC758 \uC815\uC758 \uC870\uAC74",
          difficulty: 2,
          generate() {
            const shift = randomInteger(-4, 4);
            const inside = shift === 0 ? "x" : shift > 0 ? `x-${shift}` : `x+${Math.abs(shift)}`;
            return {
              prompt: `log_a(${inside}) \uAC00 \uC815\uC758\uB418\uAE30 \uC704\uD55C x \uC758 \uC870\uAC74\uC740?`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "positive",
                  text: `x > ${shift}`
                },
                {
                  key: "nonnegative",
                  text: `x \u2265 ${shift}`
                },
                {
                  key: "opposite",
                  text: `x < ${shift}`
                }
              ],
              answer: "positive",
              solution: `\uC9C4\uC218\uB294 \uC591\uC218\uC5EC\uC57C \uD558\uBBC0\uB85C ${inside}>0, \uC989 x>${shift}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-01-04",
          conceptTitle: "\uB85C\uADF8\uC758 \uB73B\uACFC \uC131\uC9C8"
        })
      );
      module.exports = {
        key: "algebra-logarithm-definition-and-properties",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/commonLogarithmApplications.js
  var require_commonLogarithmApplications = __commonJS({
    "services/problemGenerators/algebra/commonLogarithmApplications.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "common-def",
          label: "\uC720\uD615 1 \xB7 \uC0C1\uC6A9\uB85C\uADF8\uC758 \uAC12",
          difficulty: 1,
          generate() {
            const k = randomInteger(0, 5);
            return {
              prompt: `log 10^${k} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694. (\uBC11 10)`,
              inputMode: "short-answer",
              answer: k,
              solution: `log 10^${k}=${k}.`
            };
          }
        },
        {
          id: "characteristic",
          label: "\uC720\uD615 2 \xB7 \uC9C0\uD45C",
          difficulty: 2,
          generate() {
            const k = randomInteger(1, 6);
            return {
              prompt: `10^${k} \u2264 N < 10^${k + 1} \uC778 \uC790\uC5F0\uC218 N \uC5D0 \uB300\uD55C log N \uC758 \uC9C0\uD45C\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k,
              solution: `\uC9C0\uD45C=${k}.`
            };
          }
        },
        {
          id: "digits",
          label: "\uC720\uD615 3 \xB7 \uC790\uB9BF\uC218",
          difficulty: 2,
          generate() {
            const k = randomInteger(1, 7);
            return {
              prompt: `log N \uC758 \uC9C0\uD45C\uAC00 ${k} \uC778 \uC790\uC5F0\uC218 N \uC758 \uC790\uB9BF\uC218\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k + 1,
              solution: `\uC790\uB9BF\uC218=\uC9C0\uD45C+1=${k + 1}.`
            };
          }
        },
        {
          id: "leading-zeros",
          label: "\uC720\uD615 4 \xB7 \uC18C\uC218 \uBD80\uBD84\uC758 \uC704\uCE58",
          difficulty: 3,
          generate() {
            const k = randomInteger(1, 5);
            return {
              prompt: `\uC591\uC218 N \uC758 log N \uC758 \uC9C0\uD45C\uAC00 \u2212${k} \uC77C \uB54C, N \uC740 \uC18C\uC218\uC810 \uC544\uB798 \uBA87\uC9F8 \uC790\uB9AC\uC5D0\uC11C \uCC98\uC74C\uC73C\uB85C 0\uC774 \uC544\uB2CC \uC22B\uC790\uAC00 \uB098\uC624\uB098\uC694?`,
              inputMode: "short-answer",
              answer: k,
              solution: `\uC9C0\uD45C \u2212${k} \uC774\uBA74 \uC18C\uC218 ${k}\uC9F8 \uC790\uB9AC\uC5D0\uC11C \uCC98\uC74C \uC720\uD6A8\uC22B\uC790 \uB4F1\uC7A5.`
            };
          }
        },
        {
          id: "log-power-common",
          label: "\uC720\uD615 5 \xB7 \uC0C1\uC6A9\uB85C\uADF8\uC758 \uAC70\uB4ED\uC81C\uACF1 \uACC4\uC0B0",
          difficulty: 1,
          generate() {
            const a = randomInteger(1, 4), k = randomInteger(1, 4);
            return {
              prompt: `log 10^${a} + log 10^${k} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a + k,
              solution: `${a}+${k}=${a + k}.`
            };
          }
        },
        {
          id: "sound-model",
          label: "\uC720\uD615 6 \xB7 \uC0C1\uC6A9\uB85C\uADF8 \uD65C\uC6A9(\uBAA8\uB378)",
          difficulty: 2,
          generate() {
            const k = randomInteger(1, 4);
            return {
              prompt: `\uC5B4\uB5A4 \uC591\uC774 L = 10\xB7log(10^${k}) \uB85C \uC8FC\uC5B4\uC9C8 \uB54C L \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 10 * k,
              solution: `log(10^${k})=${k} \u2192 L=10\xD7${k}=${10 * k}.`
            };
          }
        },
        {
          id: "compare-common",
          label: "\uC720\uD615 7 \xB7 \uC0C1\uC6A9\uB85C\uADF8 \uB300\uC18C",
          difficulty: 2,
          generate() {
            let a = randomInteger(1, 5), b = randomInteger(1, 5);
            while (a === b) b = randomInteger(1, 5);
            return {
              prompt: `log 10^${a} \uC640 log 10^${b} \uC911 \uB354 \uD070 \uAC12\uC740?`,
              inputMode: "multiple-choice",
              choices: [{ key: "a", text: `log 10^${a}` }, { key: "b", text: `log 10^${b}` }],
              answer: a > b ? "a" : "b",
              solution: `\uC9C0\uC218\uAC00 \uD070 \uCABD\uC774 \uD07D\uB2C8\uB2E4.`
            };
          }
        },
        {
          id: "digits-power",
          label: "\uC720\uD615 8 \xB7 10\uC758 \uAC70\uB4ED\uC81C\uACF1 \uC790\uB9BF\uC218",
          difficulty: 2,
          generate() {
            const k = randomInteger(1, 6);
            return {
              prompt: `10^${k} \uC740 \uBA87 \uC790\uB9AC \uC790\uC5F0\uC218\uC778\uAC00\uC694?`,
              inputMode: "short-answer",
              answer: k + 1,
              solution: `10^${k} \uC740 ${k + 1}\uC790\uB9AC.`
            };
          }
        },
        {
          id: "log-add-common",
          label: "\uC720\uD615 9 \xB7 \uC0C1\uC6A9\uB85C\uADF8\uC758 \uD569",
          difficulty: 2,
          generate() {
            const variants = [
              { left: 2, right: 5, power: 1 },
              { left: 4, right: 25, power: 2 },
              { left: 8, right: 125, power: 3 },
              { left: 20, right: 5, power: 2 },
              { left: 40, right: 25, power: 3 }
            ];
            const variant = variants[randomInteger(0, variants.length - 1)];
            return {
              prompt: `log ${variant.left} + log ${variant.right} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: variant.power,
              solution: `log ${variant.left}+log ${variant.right}=log(${variant.left}\xD7${variant.right})=log 10^${variant.power}=${variant.power}.`
            };
          }
        },
        {
          id: "log-value-known",
          label: "\uC720\uD615 10 \xB7 \uC8FC\uC5B4\uC9C4 \uB85C\uADF8\uAC12 \uD65C\uC6A9",
          difficulty: 3,
          generate() {
            const n = randomInteger(2, 5);
            return {
              prompt: `log 2 = 0.3010 \uC77C \uB54C log 2^${n} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694. (\uC18C\uC218)`,
              inputMode: "short-answer",
              answer: Number((0.301 * n).toFixed(4)),
              solution: `log 2^${n}=${n}\xD70.3010=${(0.301 * n).toFixed(4)}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-01-05",
          conceptTitle: "\uC0C1\uC6A9\uB85C\uADF8\uC758 \uD65C\uC6A9"
        })
      );
      module.exports = {
        key: "algebra-common-logarithm-applications",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/exponentialAndLogarithmicFunctions.js
  var require_exponentialAndLogarithmicFunctions = __commonJS({
    "services/problemGenerators/algebra/exponentialAndLogarithmicFunctions.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "exp-eval",
          label: "\uC720\uD615 1 \xB7 \uC9C0\uC218\uD568\uC218\uC758 \uD568\uC22B\uAC12",
          difficulty: 1,
          generate() {
            const a = randomInteger(2, 4), x = randomInteger(0, 3);
            return {
              prompt: `f(x)=${a}^x \uC77C \uB54C f(${x}) \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a ** x,
              solution: `${a}^${x}=${a ** x}.`
            };
          }
        },
        {
          id: "log-eval",
          label: "\uC720\uD615 2 \xB7 \uB85C\uADF8\uD568\uC218\uC758 \uD568\uC22B\uAC12",
          difficulty: 1,
          generate() {
            const a = randomInteger(2, 4), k = randomInteger(1, 3);
            return {
              prompt: `g(x)=log_${a} x \uC77C \uB54C g(${a ** k}) \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k,
              solution: `log_${a} ${a ** k}=${k}.`
            };
          }
        },
        {
          id: "exp-through-point",
          label: "\uC720\uD615 3 \xB7 \uC9C0\uC218\uD568\uC218\uAC00 \uC9C0\uB098\uB294 \uC810",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4);
            return {
              prompt: `y=${a}^x \uB294 \uD56D\uC0C1 \uC810 (0, k) \uB97C \uC9C0\uB0A9\uB2C8\uB2E4. k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 1,
              solution: `${a}^0=1 \u2192 (0,1).`
            };
          }
        },
        {
          id: "log-through-point",
          label: "\uC720\uD615 4 \xB7 \uB85C\uADF8\uD568\uC218\uAC00 \uC9C0\uB098\uB294 \uC810",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4);
            return {
              prompt: `y=log_${a} x \uB294 \uD56D\uC0C1 \uC810 (k, 0) \uB97C \uC9C0\uB0A9\uB2C8\uB2E4. k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 1,
              solution: `log_${a} 1=0 \u2192 (1,0).`
            };
          }
        },
        {
          id: "inverse-relation",
          label: "\uC720\uD615 5 \xB7 \uC5ED\uD568\uC218 \uAD00\uACC4",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4);
            return {
              prompt: `y=${a}^x \uC758 \uC5ED\uD568\uC218\uB294?`,
              inputMode: "multiple-choice",
              choices: [{ key: "log", text: `y=log_${a} x` }, { key: "exp", text: `y=${a}^(\u2212x)` }],
              answer: "log",
              solution: `\uC9C0\uC218\uD568\uC218\uC758 \uC5ED\uD568\uC218\uB294 \uAC19\uC740 \uBC11\uC758 \uB85C\uADF8\uD568\uC218.`
            };
          }
        },
        {
          id: "exp-negative-x",
          label: "\uC720\uD615 6 \xB7 \uC9C0\uC218\uD568\uC218 f(\u2212x)",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4), x = randomInteger(1, 3);
            return {
              prompt: `f(x)=${a}^x \uC77C \uB54C f(\u2212${x}) \uB97C \uAD6C\uD558\uC138\uC694. (\uC18C\uC218)`,
              inputMode: "short-answer",
              answer: 1 / a ** x,
              solution: `${a}^(\u2212${x})=1/${a ** x}=${(1 / a ** x).toFixed(4)}.`
            };
          }
        },
        {
          id: "domain-log",
          label: "\uC720\uD615 7 \xB7 \uB85C\uADF8\uD568\uC218\uC758 \uC815\uC758\uC5ED",
          difficulty: 2,
          generate() {
            const shift = randomInteger(-3, 3);
            const inside = shift === 0 ? "x" : shift > 0 ? `x-${shift}` : `x+${Math.abs(shift)}`;
            return {
              prompt: `\uB85C\uADF8\uD568\uC218 y=log_a(${inside}) \uC758 \uC815\uC758\uC5ED\uC740?`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "correct",
                  text: `x > ${shift}`
                },
                {
                  key: "opposite",
                  text: `x < ${shift}`
                },
                {
                  key: "all",
                  text: "\uBAA8\uB4E0 \uC2E4\uC218"
                }
              ],
              answer: "correct",
              solution: `\uC9C4\uC218 ${inside}>0 \uC774\uC5B4\uC57C \uD558\uBBC0\uB85C x>${shift}.`
            };
          }
        },
        {
          id: "range-exp",
          label: "\uC720\uD615 8 \xB7 \uC9C0\uC218\uD568\uC218\uC758 \uCE58\uC5ED",
          difficulty: 2,
          generate() {
            const base = randomInteger(2, 5);
            const shift = randomInteger(-3, 3);
            const shiftedTerm = shift === 0 ? "" : shift > 0 ? `+${shift}` : `${shift}`;
            return {
              prompt: `\uC9C0\uC218\uD568\uC218 y=${base}^x${shiftedTerm} \uC758 \uCE58\uC5ED\uC740?`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "correct",
                  text: `y > ${shift}`
                },
                {
                  key: "opposite",
                  text: `y < ${shift}`
                },
                {
                  key: "all",
                  text: "\uBAA8\uB4E0 \uC2E4\uC218"
                }
              ],
              answer: "correct",
              solution: `${base}^x>0 \uC774\uBBC0\uB85C y=${base}^x${shiftedTerm}>${shift}.`
            };
          }
        },
        {
          id: "monotonic",
          label: "\uC720\uD615 9 \xB7 \uC99D\uAC00\xB7\uAC10\uC18C \uD310\uC815",
          difficulty: 2,
          generate() {
            const inc = Math.random() < 0.5;
            const a = inc ? randomInteger(2, 4) : 0;
            return {
              prompt: `y=${inc ? a : "(1/2)"}^x (\uBC11 ${inc ? ">1" : "<1"}) \uB294 \uC99D\uAC00\uD568\uC218\uC785\uB2C8\uAE4C?`,
              inputMode: "multiple-choice",
              choices: [{ key: "inc", text: "\uC99D\uAC00\uD568\uC218" }, { key: "dec", text: "\uAC10\uC18C\uD568\uC218" }],
              answer: inc ? "inc" : "dec",
              solution: inc ? `\uBC11>1\uC774\uBA74 \uC99D\uAC00\uD568\uC218.` : `\uBC11<1\uC774\uBA74 \uAC10\uC18C\uD568\uC218.`
            };
          }
        },
        {
          id: "exp-solve",
          label: "\uC720\uD615 10 \xB7 \uD568\uC22B\uAC12\uC73C\uB85C x \uCC3E\uAE30",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4), k = randomInteger(1, 3);
            return {
              prompt: `f(x)=${a}^x, f(x)=${a ** k} \uC77C \uB54C x \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k,
              solution: `${a}^x=${a ** k} \u2192 x=${k}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-01-06",
          conceptTitle: "\uC9C0\uC218\uD568\uC218\uC640 \uB85C\uADF8\uD568\uC218\uC758 \uB73B"
        })
      );
      module.exports = {
        key: "algebra-exponential-and-logarithmic-functions",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/exponentialAndLogarithmicGraphs.js
  var require_exponentialAndLogarithmicGraphs = __commonJS({
    "services/problemGenerators/algebra/exponentialAndLogarithmicGraphs.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "exp-shift-point",
          label: "\uC720\uD615 1 \xB7 \uC9C0\uC218\uD568\uC218 \uD3C9\uD589\uC774\uB3D9 \uC810",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 3), c = randomInteger(1, 4);
            return {
              prompt: `y=${a}^x + ${c} \uC758 \uADF8\uB798\uD504\uAC00 \uC9C0\uB098\uB294 \uC810 (0, k) \uC758 k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 1 + c,
              solution: `${a}^0+${c}=1+${c}=${1 + c}.`
            };
          }
        },
        {
          id: "asymptote-exp",
          label: "\uC720\uD615 2 \xB7 \uC9C0\uC218\uD568\uC218\uC758 \uC810\uADFC\uC120",
          difficulty: 2,
          generate() {
            const c = randomInteger(-3, 3);
            return {
              prompt: `y=2^x + ${c} \uC758 \uC810\uADFC\uC120 y=k \uC758 k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: c,
              solution: `\uC218\uD3C9\uC810\uADFC\uC120\uC740 y=${c}.`
            };
          }
        },
        {
          id: "asymptote-log",
          label: "\uC720\uD615 3 \xB7 \uB85C\uADF8\uD568\uC218\uC758 \uC810\uADFC\uC120",
          difficulty: 2,
          generate() {
            const c = randomInteger(-3, 3);
            return {
              prompt: `y=log_2 (x \u2212 ${c}) \uC758 \uC218\uC9C1\uC810\uADFC\uC120 x=k \uC758 k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: c,
              solution: `\uC9C4\uC218>0: x>${c} \u2192 \uC810\uADFC\uC120 x=${c}.`
            };
          }
        },
        {
          id: "symmetry-yx",
          label: "\uC720\uD615 4 \xB7 y=x \uB300\uCE6D(\uC5ED\uD568\uC218 \uADF8\uB798\uD504)",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4), p = randomInteger(1, 3);
            return {
              prompt: `y=${a}^x \uC704\uC758 \uC810 (${p}, ${a ** p}) \uC744 y=x \uC5D0 \uB300\uCE6D\uC2DC\uD0A8 \uC810\uC758 x\uC88C\uD45C\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a ** p,
              solution: `(p,q)\u2192(q,p): x\uC88C\uD45C=${a ** p}.`
            };
          }
        },
        {
          id: "exp-max-interval",
          label: "\uC720\uD615 5 \xB7 \uAD6C\uAC04\uC5D0\uC11C\uC758 \uCD5C\uB313\uAC12(\uC9C0\uC218)",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 3), b = randomInteger(2, 3);
            return {
              prompt: `0\u2264x\u2264${b} \uC5D0\uC11C y=${a}^x \uC758 \uCD5C\uB313\uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a ** b,
              solution: `\uC99D\uAC00\uD568\uC218\uC774\uBBC0\uB85C x=${b}\uC5D0\uC11C \uCD5C\uB300: ${a ** b}.`
            };
          }
        },
        {
          id: "log-max-interval",
          label: "\uC720\uD615 6 \xB7 \uAD6C\uAC04\uC5D0\uC11C\uC758 \uCD5C\uB313\uAC12(\uB85C\uADF8)",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 3), k = randomInteger(2, 3);
            return {
              prompt: `1\u2264x\u2264${a ** k} \uC5D0\uC11C y=log_${a} x \uC758 \uCD5C\uB313\uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k,
              solution: `\uC99D\uAC00\uD568\uC218\uC774\uBBC0\uB85C x=${a ** k}\uC5D0\uC11C \uCD5C\uB300: ${k}.`
            };
          }
        },
        {
          id: "reflect-exp",
          label: "\uC720\uD615 7 \xB7 y\uCD95 \uB300\uCE6D",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4);
            return {
              prompt: `y=${a}^x \uB97C y\uCD95\uC5D0 \uB300\uCE6D\uC2DC\uD0A8 \uADF8\uB798\uD504\uC758 \uC2DD\uC740?`,
              inputMode: "multiple-choice",
              choices: [{ key: "negx", text: `y=${a}^(\u2212x)` }, { key: "neg", text: `y=\u2212${a}^x` }],
              answer: "negx",
              solution: `y\uCD95 \uB300\uCE6D\uC740 x\u2192\u2212x \u2192 y=${a}^(\u2212x).`
            };
          }
        },
        {
          id: "graph-increasing",
          label: "\uC720\uD615 8 \xB7 \uADF8\uB798\uD504\uC758 \uC99D\uAC00/\uAC10\uC18C",
          difficulty: 1,
          generate() {
            const big = Math.random() < 0.5;
            const a = big ? randomInteger(2, 5) : 0;
            return {
              prompt: `y=${big ? a : "(1/3)"}^x \uC758 \uADF8\uB798\uD504\uB294 \uC99D\uAC00/\uAC10\uC18C \uC911 \uBB34\uC5C7\uC778\uAC00\uC694?`,
              inputMode: "multiple-choice",
              choices: [{ key: "inc", text: "\uC99D\uAC00" }, { key: "dec", text: "\uAC10\uC18C" }],
              answer: big ? "inc" : "dec",
              solution: big ? `\uBC11>1 \u2192 \uC99D\uAC00.` : `\uBC11<1 \u2192 \uAC10\uC18C.`
            };
          }
        },
        {
          id: "log-min-interval",
          label: "\uC720\uD615 9 \xB7 \uAD6C\uAC04\uC5D0\uC11C\uC758 \uCD5C\uC19F\uAC12(\uB85C\uADF8)",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 3);
            return {
              prompt: `${a}\u2264x\u2264${a ** 3} \uC5D0\uC11C y=log_${a} x \uC758 \uCD5C\uC19F\uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 1,
              solution: `\uC99D\uAC00\uD568\uC218\uC774\uBBC0\uB85C x=${a}\uC5D0\uC11C \uCD5C\uC18C: log_${a} ${a}=1.`
            };
          }
        },
        {
          id: "exp-min-interval",
          label: "\uC720\uD615 10 \xB7 \uAD6C\uAC04\uC5D0\uC11C\uC758 \uCD5C\uC19F\uAC12(\uC9C0\uC218)",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 3), b = randomInteger(2, 3);
            return {
              prompt: `0\u2264x\u2264${b} \uC5D0\uC11C y=${a}^x \uC758 \uCD5C\uC19F\uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 1,
              solution: `\uC99D\uAC00\uD568\uC218\uC774\uBBC0\uB85C x=0\uC5D0\uC11C \uCD5C\uC18C: ${a}^0=1.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-01-07",
          conceptTitle: "\uC9C0\uC218\uD568\uC218\uC640 \uB85C\uADF8\uD568\uC218\uC758 \uADF8\uB798\uD504"
        })
      );
      module.exports = {
        key: "algebra-exponential-and-logarithmic-graphs",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/exponentialAndLogarithmicApplications.js
  var require_exponentialAndLogarithmicApplications = __commonJS({
    "services/problemGenerators/algebra/exponentialAndLogarithmicApplications.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "exp-equation",
          label: "\uC720\uD615 1 \xB7 \uC9C0\uC218\uBC29\uC815\uC2DD(\uBC11 \uAC19\uAC8C)",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4), k = randomInteger(1, 4);
            return {
              prompt: `${a}^x = ${a ** k} \uC758 \uD574 x \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k,
              solution: `\uBC11\uC774 \uAC19\uC73C\uBBC0\uB85C x=${k}.`
            };
          }
        },
        {
          id: "exp-equation-base",
          label: "\uC720\uD615 2 \xB7 \uC9C0\uC218\uBC29\uC815\uC2DD(\uBC11 \uBCC0\uD615)",
          difficulty: 3,
          generate() {
            const n = randomInteger(1, 3);
            const k = randomInteger(1, 3) * 2;
            return {
              prompt: `4^x = 2^${k} \uC758 \uD574 x \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k / 2,
              solution: `4=2\xB2 \u2192 2^(2x)=2^${k} \u2192 x=${k / 2}.`
            };
          }
        },
        {
          id: "log-equation",
          label: "\uC720\uD615 3 \xB7 \uB85C\uADF8\uBC29\uC815\uC2DD",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4), k = randomInteger(1, 4);
            return {
              prompt: `log_${a} x = ${k} \uC758 \uD574 x \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a ** k,
              solution: `x=${a}^${k}=${a ** k}.`
            };
          }
        },
        {
          id: "exp-inequality",
          label: "\uC720\uD615 4 \xB7 \uC9C0\uC218\uBD80\uB4F1\uC2DD(\uBC11>1)",
          difficulty: 3,
          generate() {
            const a = randomInteger(2, 4), k = randomInteger(1, 4);
            return {
              prompt: `${a}^x > ${a ** k} (\uBC11>1) \uC758 \uD574\uB294 x > m \uC785\uB2C8\uB2E4. m \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k,
              solution: `\uBC11>1\uC774\uBBC0\uB85C \uBD80\uB4F1\uD638 \uBC29\uD5A5 \uC720\uC9C0: x>${k}.`
            };
          }
        },
        {
          id: "log-inequality",
          label: "\uC720\uD615 5 \xB7 \uB85C\uADF8\uBD80\uB4F1\uC2DD",
          difficulty: 3,
          generate() {
            const a = randomInteger(2, 4), k = randomInteger(1, 3);
            return {
              prompt: `log_${a} x < ${k} (\uC9C4\uC218>0) \uC758 \uD574\uB294 0 < x < m \uC785\uB2C8\uB2E4. m \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a ** k,
              solution: `\uBC11>1: x<${a ** k}, \uC9C4\uC218\uC870\uAC74 x>0 \u2192 0<x<${a ** k}.`
            };
          }
        },
        {
          id: "exp-sub",
          label: "\uC720\uD615 6 \xB7 \uCE58\uD658(\uC9C0\uC218)",
          difficulty: 3,
          generate() {
            const t = randomInteger(2, 4);
            return {
              prompt: `2^x = ${2 ** t} \uC744 t=2^x \uB85C \uCE58\uD658\uD560 \uB54C t \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 2 ** t,
              solution: `t=2^x=${2 ** t}.`
            };
          }
        },
        {
          id: "compound-growth",
          label: "\uC720\uD615 7 \xB7 \uC9C0\uC218 \uC131\uC7A5 \uBAA8\uB378",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 3), n = randomInteger(1, 4);
            return {
              prompt: `\uCD08\uAE30\uAC12 1\uC774 \uB9E4 \uAE30\uAC04 ${a}\uBC30\uB85C \uB298 \uB54C ${n}\uAE30\uAC04 \uD6C4\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a ** n,
              solution: `${a}^${n}=${a ** n}.`
            };
          }
        },
        {
          id: "log-scale",
          label: "\uC720\uD615 8 \xB7 \uB85C\uADF8 \uCC99\uB3C4 \uD65C\uC6A9",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 4), k = randomInteger(1, 3);
            return {
              prompt: `M = log_${a} x, x=${a ** k} \uC77C \uB54C M \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k,
              solution: `M=log_${a} ${a ** k}=${k}.`
            };
          }
        },
        {
          id: "exp-eq-two",
          label: "\uC720\uD615 9 \xB7 \uC9C0\uC218\uBC29\uC815\uC2DD(\uACF5\uD1B5\uBC11 \uC815\uB9AC)",
          difficulty: 3,
          generate() {
            const a = randomInteger(2, 3), m = randomInteger(2, 4);
            return {
              prompt: `${a}^(x+1) = ${a ** m} \uC758 \uD574 x \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: m - 1,
              solution: `x+1=${m} \u2192 x=${m - 1}.`
            };
          }
        },
        {
          id: "log-eq-two",
          label: "\uC720\uD615 10 \xB7 \uB85C\uADF8\uBC29\uC815\uC2DD(\uC9C4\uC218 \uC815\uB9AC)",
          difficulty: 3,
          generate() {
            const a = randomInteger(2, 3), k = randomInteger(1, 3), c = randomInteger(1, 4);
            return {
              prompt: `log_${a} (x \u2212 ${c}) = ${k} \uC758 \uD574 x \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a ** k + c,
              solution: `x\u2212${c}=${a}^${k}=${a ** k} \u2192 x=${a ** k + c}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-01-08",
          conceptTitle: "\uC9C0\uC218\uD568\uC218\uC640 \uB85C\uADF8\uD568\uC218\uC758 \uD65C\uC6A9"
        })
      );
      module.exports = {
        key: "algebra-exponential-and-logarithmic-applications",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/generalAnglesAndRadians.js
  var require_generalAnglesAndRadians = __commonJS({
    "services/problemGenerators/algebra/generalAnglesAndRadians.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "rad-to-deg",
          label: "\uC720\uD615 1 \xB7 \uD638\uB3C4\uBC95 \u2192 \uC721\uC2ED\uBD84\uBC95",
          difficulty: 1,
          generate() {
            const k = [2, 3, 4, 6][randomInteger(0, 3)];
            return {
              prompt: `\u03C0/${k} (\uB77C\uB514\uC548)\uC744 \uB3C4(\xB0)\uB85C \uB098\uD0C0\uB0B4\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 180 / k,
              solution: `\u03C0=180\xB0 \uC774\uBBC0\uB85C \u03C0/${k}=${180 / k}\xB0.`
            };
          }
        },
        {
          id: "deg-to-rad",
          label: "\uC720\uD615 2 \xB7 \uC721\uC2ED\uBD84\uBC95 \u2192 \uD638\uB3C4\uBC95",
          difficulty: 1,
          generate() {
            const d = [30, 45, 60, 90, 180][randomInteger(0, 4)];
            const k = 180 / d;
            return {
              prompt: `${d}\xB0 \uB97C \u03C0/k \uAF34\uC758 \uD638\uB3C4\uBC95\uC73C\uB85C \uB098\uD0C0\uB0BC \uB54C k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k,
              solution: `${d}\xB0 = ${d}\u03C0/180 = \u03C0/${k}.`
            };
          }
        },
        {
          id: "coterminal",
          label: "\uC720\uD615 3 \xB7 \uB3D9\uACBD\uC774 \uAC19\uC740 \uAC01",
          difficulty: 2,
          generate() {
            const base = randomInteger(0, 350);
            const n = randomInteger(1, 3);
            const ang = base + 360 * n;
            return {
              prompt: `${ang}\xB0 \uC640 \uB3D9\uACBD\uC774 \uAC19\uC740 \uAC01 \uC911 0\xB0\u2264\u03B8<360\xB0 \uC778 \u03B8 \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: base,
              solution: `${ang}\xB0\u2212360\xB0\xD7${n}=${base}\xB0.`
            };
          }
        },
        {
          id: "arc-length",
          label: "\uC720\uD615 4 \xB7 \uBD80\uCC44\uAF34\uC758 \uD638\uC758 \uAE38\uC774",
          difficulty: 1,
          generate() {
            const r = randomInteger(2, 8), t = randomInteger(1, 4);
            return {
              prompt: `\uBC18\uC9C0\uB984 ${r}, \uC911\uC2EC\uAC01 ${t}(\uB77C\uB514\uC548)\uC778 \uBD80\uCC44\uAF34\uC758 \uD638\uC758 \uAE38\uC774 l \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: r * t,
              solution: `l=r\u03B8=${r}\xD7${t}=${r * t}.`
            };
          }
        },
        {
          id: "sector-area",
          label: "\uC720\uD615 5 \xB7 \uBD80\uCC44\uAF34\uC758 \uB113\uC774",
          difficulty: 2,
          generate() {
            const r = 2 * randomInteger(1, 4), t = randomInteger(1, 4);
            return {
              prompt: `\uBC18\uC9C0\uB984 ${r}, \uC911\uC2EC\uAC01 ${t}(\uB77C\uB514\uC548)\uC778 \uBD80\uCC44\uAF34\uC758 \uB113\uC774 S \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 0.5 * r * r * t,
              solution: `S=\xBDr\xB2\u03B8=\xBD\xD7${r}\xB2\xD7${t}=${0.5 * r * r * t}.`
            };
          }
        },
        {
          id: "sector-area-arc",
          label: "\uC720\uD615 6 \xB7 \uD638\uC758 \uAE38\uC774\uB85C \uB113\uC774",
          difficulty: 2,
          generate() {
            const r = 2 * randomInteger(1, 4), l = randomInteger(2, 8);
            return {
              prompt: `\uBC18\uC9C0\uB984 ${r}, \uD638\uC758 \uAE38\uC774 ${l} \uC778 \uBD80\uCC44\uAF34\uC758 \uB113\uC774 S \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 0.5 * r * l,
              solution: `S=\xBDrl=\xBD\xD7${r}\xD7${l}=${0.5 * r * l}.`
            };
          }
        },
        {
          id: "central-angle",
          label: "\uC720\uD615 7 \xB7 \uC911\uC2EC\uAC01 \uAD6C\uD558\uAE30(\u03B8=l/r)",
          difficulty: 2,
          generate() {
            const r = randomInteger(2, 6), t = randomInteger(1, 5), l = r * t;
            return {
              prompt: `\uBC18\uC9C0\uB984 ${r}, \uD638\uC758 \uAE38\uC774 ${l} \uC778 \uBD80\uCC44\uAF34\uC758 \uC911\uC2EC\uAC01(\uB77C\uB514\uC548)\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: t,
              solution: `\u03B8=l/r=${l}/${r}=${t}.`
            };
          }
        },
        {
          id: "quadrant-of-angle",
          label: "\uC720\uD615 8 \xB7 \uAC01\uC758 \uC0AC\uBD84\uBA74",
          difficulty: 2,
          generate() {
            const q = randomInteger(1, 4);
            const ang = (q - 1) * 90 + randomInteger(10, 80);
            return {
              prompt: `${ang}\xB0 \uB294 \uC81C\uBA87 \uC0AC\uBD84\uBA74\uC758 \uAC01\uC778\uAC00\uC694?`,
              inputMode: "multiple-choice",
              choices: [{ key: "1", text: "\uC81C1\uC0AC\uBD84\uBA74" }, { key: "2", text: "\uC81C2\uC0AC\uBD84\uBA74" }, { key: "3", text: "\uC81C3\uC0AC\uBD84\uBA74" }, { key: "4", text: "\uC81C4\uC0AC\uBD84\uBA74" }],
              answer: String(q),
              solution: `${ang}\xB0 \uB294 \uC81C${q}\uC0AC\uBD84\uBA74.`
            };
          }
        },
        {
          id: "perimeter",
          label: "\uC720\uD615 9 \xB7 \uBD80\uCC44\uAF34\uC758 \uB458\uB808",
          difficulty: 2,
          generate() {
            const r = randomInteger(2, 6), t = randomInteger(1, 4), l = r * t;
            return {
              prompt: `\uBC18\uC9C0\uB984 ${r}, \uC911\uC2EC\uAC01 ${t}(\uB77C\uB514\uC548)\uC778 \uBD80\uCC44\uAF34\uC758 \uB458\uB808\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 2 * r + l,
              solution: `\uB458\uB808=2r+l=2\xD7${r}+${l}=${2 * r + l}.`
            };
          }
        },
        {
          id: "angle-from-area",
          label: "\uC720\uD615 10 \xB7 \uB113\uC774\uB85C \uC911\uC2EC\uAC01",
          difficulty: 3,
          generate() {
            const r = 2 * randomInteger(1, 3), t = randomInteger(1, 4), S = 0.5 * r * r * t;
            return {
              prompt: `\uBC18\uC9C0\uB984 ${r}, \uB113\uC774 ${S} \uC778 \uBD80\uCC44\uAF34\uC758 \uC911\uC2EC\uAC01(\uB77C\uB514\uC548)\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: t,
              solution: `\u03B8=2S/r\xB2=2\xD7${S}/${r}\xB2=${t}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-02-01",
          conceptTitle: "\uC77C\uBC18\uAC01\uACFC \uD638\uB3C4\uBC95"
        })
      );
      module.exports = {
        key: "algebra-general-angles-and-radians",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/trigonometricFunctionsAndGraphs.js
  var require_trigonometricFunctionsAndGraphs = __commonJS({
    "services/problemGenerators/algebra/trigonometricFunctionsAndGraphs.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "special-value",
          label: "\uC720\uD615 1 \xB7 \uD2B9\uC218\uAC01\uC758 \uC0BC\uAC01\uD568\uC218 \uAC12",
          difficulty: 2,
          generate() {
            const table = [["sin", 30, 0.5], ["sin", 90, 1], ["sin", 0, 0], ["cos", 0, 1], ["cos", 60, 0.5], ["cos", 90, 0], ["tan", 45, 1], ["tan", 0, 0]];
            const [f, d, v] = table[randomInteger(0, table.length - 1)];
            return {
              prompt: `${f} ${d}\xB0 \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694. (\uC18C\uC218/\uC815\uC218)`,
              inputMode: "short-answer",
              answer: v,
              solution: `${f}${d}\xB0=${v}.`
            };
          }
        },
        {
          id: "quadrant-sign",
          label: "\uC720\uD615 2 \xB7 \uC0BC\uAC01\uD568\uC218\uC758 \uBD80\uD638",
          difficulty: 2,
          generate() {
            const q = randomInteger(1, 4);
            const f = ["sin", "cos", "tan"][randomInteger(0, 2)];
            const s = { sin: [1, 1, -1, -1], cos: [1, -1, -1, 1], tan: [1, -1, 1, -1] }[f][q - 1] > 0;
            return {
              prompt: `\u03B8\uAC00 \uC81C${q}\uC0AC\uBD84\uBA74\uC758 \uAC01\uC77C \uB54C ${f}\u03B8 \uC758 \uBD80\uD638\uB294?`,
              inputMode: "multiple-choice",
              choices: [{ key: "p", text: "\uC591\uC218(+)" }, { key: "n", text: "\uC74C\uC218(\u2212)" }],
              answer: s ? "p" : "n",
              solution: `\uC81C${q}\uC0AC\uBD84\uBA74\uC5D0\uC11C ${f}\u03B8 \uB294 ${s ? "\uC591" : "\uC74C"}\uC218.`
            };
          }
        },
        {
          id: "identity-cos",
          label: "\uC720\uD615 3 \xB7 \uC0BC\uAC01\uD568\uC218\uC758 \uAE30\uBCF8 \uAD00\uACC4",
          difficulty: 2,
          generate() {
            const T = [[3, 4, 5], [5, 12, 13], [8, 15, 17]][randomInteger(0, 2)];
            return {
              prompt: `\uC81C1\uC0AC\uBD84\uBA74 \uAC01 \u03B8\uC5D0\uC11C sin\u03B8=${T[0]}/${T[2]} \uC77C \uB54C cos\u03B8 \uB97C \uAD6C\uD558\uC138\uC694. (\uC18C\uC218)`,
              inputMode: "short-answer",
              answer: T[1] / T[2],
              solution: `cos\u03B8=${T[1]}/${T[2]}=${(T[1] / T[2]).toFixed(4)}.`
            };
          }
        },
        {
          id: "tan-from-triple",
          label: "\uC720\uD615 4 \xB7 \uC0BC\uAC01\uD568\uC218 \uC0AC\uC774\uC758 \uAD00\uACC4",
          difficulty: 2,
          generate() {
            const T = [[3, 4, 5], [5, 12, 13], [8, 15, 17]][randomInteger(0, 2)];
            return {
              prompt: `\uC81C1\uC0AC\uBD84\uBA74 \uAC01 \u03B8\uC5D0\uC11C sin\u03B8=${T[0]}/${T[2]}, cos\u03B8=${T[1]}/${T[2]} \uC77C \uB54C tan\u03B8 \uB97C \uAD6C\uD558\uC138\uC694. (\uC18C\uC218)`,
              inputMode: "short-answer",
              answer: T[0] / T[1],
              solution: `tan\u03B8=${T[0]}/${T[1]}=${(T[0] / T[1]).toFixed(4)}.`
            };
          }
        },
        {
          id: "graph-max",
          label: "\uC720\uD615 5 \xB7 \uADF8\uB798\uD504\uC758 \uCD5C\uB313\uAC12",
          difficulty: 2,
          generate() {
            const A = randomInteger(2, 5), c = randomInteger(-3, 3);
            return {
              prompt: `y=${A}sin x + ${c} \uC758 \uCD5C\uB313\uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: A + c,
              solution: `\uCD5C\uB313\uAC12=${A}\xD71+${c}=${A + c}.`
            };
          }
        },
        {
          id: "graph-min",
          label: "\uC720\uD615 6 \xB7 \uADF8\uB798\uD504\uC758 \uCD5C\uC19F\uAC12",
          difficulty: 2,
          generate() {
            const A = randomInteger(2, 5), c = randomInteger(-3, 3);
            return {
              prompt: `y=${A}sin x + ${c} \uC758 \uCD5C\uC19F\uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: -A + c,
              solution: `\uCD5C\uC19F\uAC12=${A}\xD7(\u22121)+${c}=${-A + c}.`
            };
          }
        },
        {
          id: "period",
          label: "\uC720\uD615 7 \xB7 \uC8FC\uAE30",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 6);
            return {
              prompt: `y=sin(${b}x) \uC758 \uC8FC\uAE30\uB294 2\u03C0/k \uC785\uB2C8\uB2E4. k \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b,
              solution: `\uC8FC\uAE30=2\u03C0/${b} \uC774\uBBC0\uB85C k=${b}.`
            };
          }
        },
        {
          id: "amplitude",
          label: "\uC720\uD615 8 \xB7 \uC9C4\uD3ED",
          difficulty: 1,
          generate() {
            const A = nonZeroInteger(-5, 5);
            return {
              prompt: `y=${A}sin x \uC758 \uC9C4\uD3ED\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: Math.abs(A),
              solution: `\uC9C4\uD3ED=|${A}|=${Math.abs(A)}.`
            };
          }
        },
        {
          id: "transform-value",
          label: "\uC720\uD615 9 \xB7 \uC5EC\uB7EC \uAC01\uC758 \uC0BC\uAC01\uD568\uC218",
          difficulty: 3,
          generate() {
            const table = [[150, "sin", 0.5], [120, "sin", Math.round(Math.sin(Math.PI * 120 / 180) * 1e3) / 1e3], [180, "cos", -1], [90, "cos", 0]];
            const pick = [[150, 0.5, "sin(180\xB0\u221230\xB0)=sin30\xB0"], [0, 0, "sin0\xB0"], [180, 0, "sin180\xB0=0"]][randomInteger(0, 2)];
            return {
              prompt: `sin ${pick[0]}\xB0 \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: pick[1],
              solution: `${pick[2]}=${pick[1]}.`
            };
          }
        },
        {
          id: "simple-equation",
          label: "\uC720\uD615 10 \xB7 \uAC04\uB2E8\uD55C \uC0BC\uAC01\uBC29\uC815\uC2DD",
          difficulty: 2,
          generate() {
            const cases = [["sin", 1, 90], ["cos", 1, 0], ["sin", 0, 0], ["cos", 0, 90]];
            const c = cases[randomInteger(0, cases.length - 1)];
            return {
              prompt: `0\xB0\u2264x\u226490\xB0 \uC5D0\uC11C ${c[0]} x = ${c[1]} \uC744 \uB9CC\uC871\uD558\uB294 x(\xB0) \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: c[2],
              solution: `${c[0]}${c[2]}\xB0=${c[1]} \u2192 x=${c[2]}\xB0.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-02-02",
          conceptTitle: "\uC0BC\uAC01\uD568\uC218\uC640 \uADF8\uB798\uD504"
        })
      );
      module.exports = {
        key: "algebra-trigonometric-functions-and-graphs",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/sineAndCosineLaws.js
  var require_sineAndCosineLaws = __commonJS({
    "services/problemGenerators/algebra/sineAndCosineLaws.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "law-sines-b",
          label: "\uC720\uD615 1 \xB7 \uC0AC\uC778\uBC95\uCE59(\uBCC0 b)",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 8);
            return {
              prompt: `\uC0BC\uAC01\uD615 ABC\uC5D0\uC11C A=30\xB0, B=90\xB0, a=${a} \uC77C \uB54C b \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 2 * a,
              solution: `b=a\xB7sinB/sinA=${a}\xD71\xF7(1/2)=${2 * a}.`
            };
          }
        },
        {
          id: "law-sines-a",
          label: "\uC720\uD615 2 \xB7 \uC0AC\uC778\uBC95\uCE59(\uBCC0 a)",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 8);
            return {
              prompt: `\uC0BC\uAC01\uD615 ABC\uC5D0\uC11C A=90\xB0, B=30\xB0, b=${b} \uC77C \uB54C a \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 2 * b,
              solution: `a=b\xB7sinA/sinB=${b}\xD71\xF7(1/2)=${2 * b}.`
            };
          }
        },
        {
          id: "circumradius",
          label: "\uC720\uD615 3 \xB7 \uC678\uC811\uC6D0\uC758 \uBC18\uC9C0\uB984 R",
          difficulty: 3,
          generate() {
            const a = randomInteger(2, 8);
            return {
              prompt: `\uC0BC\uAC01\uD615 ABC\uC5D0\uC11C A=30\xB0, a=${a} \uC77C \uB54C \uC678\uC811\uC6D0\uC758 \uBC18\uC9C0\uB984 R \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a,
              solution: `2R=a/sinA=${a}\xF7(1/2)=${2 * a} \u2192 R=${a}.`
            };
          }
        },
        {
          id: "cosines-60",
          label: "\uC720\uD615 4 \xB7 \uCF54\uC0AC\uC778\uBC95\uCE59(A=60\xB0)",
          difficulty: 3,
          generate() {
            const b = randomInteger(2, 7), c = randomInteger(2, 7);
            return {
              prompt: `\uC0BC\uAC01\uD615\uC5D0\uC11C b=${b}, c=${c}, A=60\xB0 \uC77C \uB54C a\xB2 \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b * b + c * c - b * c,
              solution: `a\xB2=b\xB2+c\xB2\u22122bc\xB7cos60\xB0=${b}\xB2+${c}\xB2\u2212${b}\xD7${c}=${b * b + c * c - b * c}.`
            };
          }
        },
        {
          id: "cosines-90",
          label: "\uC720\uD615 5 \xB7 \uCF54\uC0AC\uC778\uBC95\uCE59(A=90\xB0, \uD53C\uD0C0\uACE0\uB77C\uC2A4)",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 7), c = randomInteger(2, 7);
            return {
              prompt: `\uC0BC\uAC01\uD615\uC5D0\uC11C b=${b}, c=${c}, A=90\xB0 \uC77C \uB54C a\xB2 \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b * b + c * c,
              solution: `cos90\xB0=0 \uC774\uBBC0\uB85C a\xB2=b\xB2+c\xB2=${b * b + c * c}.`
            };
          }
        },
        {
          id: "cosines-120",
          label: "\uC720\uD615 6 \xB7 \uCF54\uC0AC\uC778\uBC95\uCE59(A=120\xB0)",
          difficulty: 3,
          generate() {
            const b = randomInteger(2, 7), c = randomInteger(2, 7);
            return {
              prompt: `\uC0BC\uAC01\uD615\uC5D0\uC11C b=${b}, c=${c}, A=120\xB0 \uC77C \uB54C a\xB2 \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b * b + c * c + b * c,
              solution: `cos120\xB0=\u2212\xBD \uC774\uBBC0\uB85C a\xB2=b\xB2+c\xB2+bc=${b * b + c * c + b * c}.`
            };
          }
        },
        {
          id: "area-30",
          label: "\uC720\uD615 7 \xB7 \uC0BC\uAC01\uD615 \uB113\uC774(C=30\xB0)",
          difficulty: 2,
          generate() {
            const a = 2 * randomInteger(1, 5), b = 2 * randomInteger(1, 5);
            return {
              prompt: `\uB450 \uBCC0 a=${a}, b=${b}, \uB07C\uC778\uAC01 C=30\xB0 \uC778 \uC0BC\uAC01\uD615\uC758 \uB113\uC774\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a * b / 4,
              solution: `S=\xBDab\xB7sin30\xB0=\xBD\xD7${a}\xD7${b}\xD7\xBD=${a * b / 4}.`
            };
          }
        },
        {
          id: "area-90",
          label: "\uC720\uD615 8 \xB7 \uC0BC\uAC01\uD615 \uB113\uC774(C=90\xB0)",
          difficulty: 1,
          generate() {
            const a = randomInteger(2, 8), b = randomInteger(2, 8);
            return {
              prompt: `\uB450 \uBCC0 a=${a}, b=${b}, \uB07C\uC778\uAC01 C=90\xB0 \uC778 \uC0BC\uAC01\uD615\uC758 \uB113\uC774\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a * b / 2,
              solution: `S=\xBDab\xB7sin90\xB0=\xBD\xD7${a}\xD7${b}=${a * b / 2}.`
            };
          }
        },
        {
          id: "area-150",
          label: "\uC720\uD615 9 \xB7 \uC0BC\uAC01\uD615 \uB113\uC774(C=150\xB0)",
          difficulty: 3,
          generate() {
            const a = 2 * randomInteger(1, 5), b = 2 * randomInteger(1, 5);
            return {
              prompt: `\uB450 \uBCC0 a=${a}, b=${b}, \uB07C\uC778\uAC01 C=150\xB0 \uC778 \uC0BC\uAC01\uD615\uC758 \uB113\uC774\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a * b / 4,
              solution: `sin150\xB0=\xBD \u2192 S=\xBDab\xD7\xBD=${a * b / 4}.`
            };
          }
        },
        {
          id: "cos-from-sides",
          label: "\uC720\uD615 10 \xB7 \uC138 \uBCC0\uC73C\uB85C \uCF54\uC0AC\uC778\uAC12 \uAD6C\uD558\uAE30",
          difficulty: 3,
          generate() {
            const T = [[4, 5, 6], [2, 3, 4], [3, 5, 7], [5, 6, 7]][randomInteger(0, 3)];
            const [a, b, c] = T;
            const cosA = (b * b + c * c - a * a) / (2 * b * c);
            return {
              prompt: `\uC138 \uBCC0\uC774 a=${a}, b=${b}, c=${c} \uC778 \uC0BC\uAC01\uD615\uC5D0\uC11C cosA \uB97C \uAD6C\uD558\uC138\uC694. (\uC18C\uC218)`,
              inputMode: "short-answer",
              answer: Number(cosA.toFixed(4)),
              solution: `cosA=(b\xB2+c\xB2\u2212a\xB2)/(2bc)=(${b * b}+${c * c}\u2212${a * a})/${2 * b * c}=${cosA.toFixed(4)}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-02-03",
          conceptTitle: "\uC0AC\uC778\uBC95\uCE59\uACFC \uCF54\uC0AC\uC778\uBC95\uCE59"
        })
      );
      module.exports = {
        key: "algebra-sine-and-cosine-laws",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/sequenceBasics.js
  var require_sequenceBasics = __commonJS({
    "services/problemGenerators/algebra/sequenceBasics.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "nth-term-linear",
          label: "\uC720\uD615 1 \xB7 \uC77C\uBC18\uD56D \uB300\uC785(\uC77C\uCC28)",
          difficulty: 1,
          generate() {
            const p = nonZeroInteger(-4, 4), q = randomInteger(-5, 5), n = randomInteger(2, 9);
            return {
              prompt: `\uC218\uC5F4\uC758 \uC77C\uBC18\uD56D\uC774 a_n=${p}n+${q} \uC77C \uB54C a_${n} \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: p * n + q,
              solution: `a_${n}=${p}\xD7${n}+${q}=${p * n + q}.`
            };
          }
        },
        {
          id: "nth-term-square",
          label: "\uC720\uD615 2 \xB7 \uC77C\uBC18\uD56D \uB300\uC785(\uC81C\uACF1)",
          difficulty: 1,
          generate() {
            const n = randomInteger(2, 8);
            return {
              prompt: `a_n=n\xB2 \uC77C \uB54C a_${n} \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: n * n,
              solution: `a_${n}=${n}\xB2=${n * n}.`
            };
          }
        },
        {
          id: "first-term",
          label: "\uC720\uD615 3 \xB7 \uCCAB\uC9F8\uD56D \uAD6C\uD558\uAE30",
          difficulty: 1,
          generate() {
            const p = nonZeroInteger(-4, 4), q = randomInteger(-5, 5);
            return {
              prompt: `a_n=${p}n+${q} \uC778 \uC218\uC5F4\uC758 \uCCAB\uC9F8\uD56D a\u2081 \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: p + q,
              solution: `a\u2081=${p}+${q}=${p + q}.`
            };
          }
        },
        {
          id: "nth-term-product",
          label: "\uC720\uD615 4 \xB7 \uC77C\uBC18\uD56D n(n+1)",
          difficulty: 2,
          generate() {
            const n = randomInteger(2, 7);
            return {
              prompt: `a_n=n(n+1) \uC77C \uB54C a_${n} \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: n * (n + 1),
              solution: `a_${n}=${n}\xD7${n + 1}=${n * (n + 1)}.`
            };
          }
        },
        {
          id: "term-index",
          label: "\uC720\uD615 5 \xB7 \uD56D \uBC88\uD638 \uCC3E\uAE30",
          difficulty: 2,
          generate() {
            const p = randomInteger(2, 5), q = randomInteger(-3, 3), n = randomInteger(3, 10), v = p * n + q;
            return {
              prompt: `a_n=${p}n+${q} \uC77C \uB54C a_n=${v} \uB97C \uB9CC\uC871\uD558\uB294 n \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: n,
              solution: `${p}n+${q}=${v} \u2192 n=${n}.`
            };
          }
        },
        {
          id: "alternating",
          label: "\uC720\uD615 6 \xB7 \uAD50\uB300\uC218\uC5F4",
          difficulty: 2,
          generate() {
            const n = randomInteger(2, 8);
            const v = (n % 2 === 0 ? 1 : -1) * n;
            return {
              prompt: `a_n=(\u22121)\u207F\xB7n \uC77C \uB54C a_${n} \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: v,
              solution: `(\u22121)^${n}\xD7${n}=${v}.`
            };
          }
        },
        {
          id: "power-term",
          label: "\uC720\uD615 7 \xB7 \uC77C\uBC18\uD56D 2\u207F",
          difficulty: 2,
          generate() {
            const n = randomInteger(2, 8);
            return {
              prompt: `a_n=2\u207F \uC77C \uB54C a_${n} \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 2 ** n,
              solution: `2^${n}=${2 ** n}.`
            };
          }
        },
        {
          id: "next-term-pattern",
          label: "\uC720\uD615 8 \xB7 \uADDC\uCE59 \uCC3E\uC544 \uB2E4\uC74C \uD56D",
          difficulty: 1,
          generate() {
            const a1 = randomInteger(1, 5), d = randomInteger(2, 5);
            const seq = [a1, a1 + d, a1 + 2 * d, a1 + 3 * d];
            return {
              prompt: `\uC218\uC5F4 ${seq[0]}, ${seq[1]}, ${seq[2]}, ${seq[3]}, ... \uC758 \uB2E4\uC74C \uD56D\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a1 + 4 * d,
              solution: `\uACF5\uCC28 ${d}\uC529 \uC99D\uAC00 \u2192 ${a1 + 4 * d}.`
            };
          }
        },
        {
          id: "an-from-Sn",
          label: "\uC720\uD615 9 \xB7 S_n \u2212 S_{n-1} = a_n",
          difficulty: 3,
          generate() {
            const n = randomInteger(2, 7);
            const S = (k) => k * k;
            return {
              prompt: `\uC218\uC5F4\uC758 \uBD80\uBD84\uD569\uC774 S_n=n\xB2 \uC77C \uB54C a_${n} \uC744 \uAD6C\uD558\uC138\uC694. (\uB2E8 n\u22652, a_n=S_n\u2212S_{n\u22121})`,
              inputMode: "short-answer",
              answer: S(n) - S(n - 1),
              solution: `a_${n}=S_${n}\u2212S_${n - 1}=${S(n)}\u2212${S(n - 1)}=${S(n) - S(n - 1)}.`
            };
          }
        },
        {
          id: "nth-term-value",
          label: "\uC720\uD615 10 \xB7 \uC77C\uBC18\uD56D\uC758 \uAC12 \uACC4\uC0B0",
          difficulty: 1,
          generate() {
            const A = nonZeroInteger(-5, 5), B = randomInteger(-5, 5), n = randomInteger(2, 9);
            return {
              prompt: `a_n=${A}n+${B} \uC77C \uB54C a_${n} \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: A * n + B,
              solution: `${A}\xD7${n}+${B}=${A * n + B}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-03-01",
          conceptTitle: "\uC218\uC5F4\uC758 \uB73B"
        })
      );
      module.exports = {
        key: "algebra-sequence-basics",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/arithmeticSequences.js
  var require_arithmeticSequences = __commonJS({
    "services/problemGenerators/algebra/arithmeticSequences.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "arith-nth",
          label: "\uC720\uD615 1 \xB7 \uB4F1\uCC28\uC218\uC5F4 \uC77C\uBC18\uD56D",
          difficulty: 1,
          generate() {
            const a1 = randomInteger(-5, 5), d = nonZeroInteger(-4, 4), n = randomInteger(3, 10);
            return {
              prompt: `\uCCAB\uC9F8\uD56D ${a1}, \uACF5\uCC28 ${d} \uC778 \uB4F1\uCC28\uC218\uC5F4\uC758 a_${n} \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a1 + (n - 1) * d,
              solution: `a_n=a\u2081+(n\u22121)d=${a1}+${n - 1}\xD7${d}=${a1 + (n - 1) * d}.`
            };
          }
        },
        {
          id: "arith-common-diff",
          label: "\uC720\uD615 2 \xB7 \uACF5\uCC28 \uAD6C\uD558\uAE30",
          difficulty: 1,
          generate() {
            const a1 = randomInteger(-4, 4), d = nonZeroInteger(-4, 4);
            return {
              prompt: `\uB4F1\uCC28\uC218\uC5F4\uC758 a\u2081=${a1}, a\u2082=${a1 + d} \uC77C \uB54C \uACF5\uCC28 d \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: d,
              solution: `d=a\u2082\u2212a\u2081=${a1 + d}\u2212${a1}=${d}.`
            };
          }
        },
        {
          id: "arith-sum",
          label: "\uC720\uD615 3 \xB7 \uB4F1\uCC28\uC218\uC5F4\uC758 \uD569",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(-3, 5), d = nonZeroInteger(-3, 3), n = randomInteger(3, 10);
            let s = 0;
            for (let k = 0; k < n; k++) s += a1 + k * d;
            return {
              prompt: `\uCCAB\uC9F8\uD56D ${a1}, \uACF5\uCC28 ${d} \uC778 \uB4F1\uCC28\uC218\uC5F4\uC758 \uCCAB\uC9F8\uD56D\uBD80\uD130 \uC81C${n}\uD56D\uAE4C\uC9C0\uC758 \uD569 S_${n} \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: s,
              solution: `S_n=n(2a\u2081+(n\u22121)d)/2=${s}.`
            };
          }
        },
        {
          id: "arith-first-from",
          label: "\uC720\uD615 4 \xB7 \uD2B9\uC815\uD56D\uC73C\uB85C \uCCAB\uC9F8\uD56D",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(-4, 4), d = nonZeroInteger(-3, 3), n = randomInteger(3, 8), an = a1 + (n - 1) * d;
            return {
              prompt: `\uACF5\uCC28 ${d} \uC778 \uB4F1\uCC28\uC218\uC5F4\uC5D0\uC11C a_${n}=${an} \uC77C \uB54C \uCCAB\uC9F8\uD56D a\u2081 \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a1,
              solution: `a\u2081=a_${n}\u2212(${n}\u22121)\xD7${d}=${an}\u2212${(n - 1) * d}=${a1}.`
            };
          }
        },
        {
          id: "arith-d-from-two",
          label: "\uC720\uD615 5 \xB7 \uB450 \uD56D\uC73C\uB85C \uACF5\uCC28",
          difficulty: 3,
          generate() {
            const a1 = randomInteger(-4, 4), d = nonZeroInteger(-3, 3), m = randomInteger(2, 4), n = m + randomInteger(2, 4);
            return {
              prompt: `\uB4F1\uCC28\uC218\uC5F4\uC5D0\uC11C a_${m}=${a1 + (m - 1) * d}, a_${n}=${a1 + (n - 1) * d} \uC77C \uB54C \uACF5\uCC28 d \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: d,
              solution: `d=(a_${n}\u2212a_${m})/(${n}\u2212${m})=${d}.`
            };
          }
        },
        {
          id: "arith-mean",
          label: "\uC720\uD615 6 \xB7 \uB4F1\uCC28\uC911\uD56D",
          difficulty: 1,
          generate() {
            const a = randomInteger(-6, 6), c = a + 2 * nonZeroInteger(1, 5);
            return {
              prompt: `\uC138 \uC218 ${a}, x, ${c} \uAC00 \uB4F1\uCC28\uC218\uC5F4\uC744 \uC774\uB8F0 \uB54C x \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: (a + c) / 2,
              solution: `x=(${a}+${c})/2=${(a + c) / 2}.`
            };
          }
        },
        {
          id: "arith-sum-endpoints",
          label: "\uC720\uD615 7 \xB7 \uD569(\uCCAB\uC9F8\uD56D\xB7\uB05D\uD56D)",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 5), d = randomInteger(1, 4), n = randomInteger(4, 10), an = a1 + (n - 1) * d;
            return {
              prompt: `\uCCAB\uC9F8\uD56D ${a1}, \uC81C${n}\uD56D ${an} \uC778 \uB4F1\uCC28\uC218\uC5F4\uC758 \uCCAB\uC9F8\uD56D\uBD80\uD130 \uC81C${n}\uD56D\uAE4C\uC9C0\uC758 \uD569\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: n * (a1 + an) / 2,
              solution: `S=n(a\u2081+a_n)/2=${n}\xD7(${a1}+${an})/2=${n * (a1 + an) / 2}.`
            };
          }
        },
        {
          id: "arith-index",
          label: "\uC720\uD615 8 \xB7 \uD56D \uBC88\uD638 \uCC3E\uAE30",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(-3, 3), d = nonZeroInteger(1, 4), n = randomInteger(3, 10), an = a1 + (n - 1) * d;
            return {
              prompt: `\uCCAB\uC9F8\uD56D ${a1}, \uACF5\uCC28 ${d} \uC778 \uB4F1\uCC28\uC218\uC5F4\uC5D0\uC11C ${an} \uC740 \uC81C\uBA87 \uD56D\uC778\uAC00\uC694?`,
              inputMode: "short-answer",
              answer: n,
              solution: `a\u2081+(n\u22121)d=${an} \u2192 n=${n}.`
            };
          }
        },
        {
          id: "arith-partial",
          label: "\uC720\uD615 9 \xB7 \uBD80\uBD84\uD569 \uACC4\uC0B0",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 4), d = randomInteger(1, 3), n = randomInteger(3, 8);
            let s = 0;
            for (let k = 0; k < n; k++) s += a1 + k * d;
            return {
              prompt: `\uCCAB\uC9F8\uD56D ${a1}, \uACF5\uCC28 ${d} \uC778 \uB4F1\uCC28\uC218\uC5F4\uC758 \uCC98\uC74C ${n}\uAC1C \uD56D\uC758 \uD569\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: s,
              solution: `\uD569=${s}.`
            };
          }
        },
        {
          id: "arith-three",
          label: "\uC720\uD615 10 \xB7 \uB4F1\uCC28 \uC138 \uC218",
          difficulty: 2,
          generate() {
            const m = randomInteger(2, 8), d = nonZeroInteger(1, 4);
            return {
              prompt: `\uC5F0\uC18D\uB41C \uC138 \uB4F1\uCC28\uD56D\uC774 ${m - d}, ${m}, ${m + d} \uC77C \uB54C \uAC00\uC6B4\uB370 \uD56D\uC744 \uD655\uC778\uD558\uACE0 \uC138 \uD56D\uC758 \uD569\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 3 * m,
              solution: `\uC138 \uD56D\uC758 \uD569=3\xD7(\uAC00\uC6B4\uB370 \uD56D)=3\xD7${m}=${3 * m}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-03-02",
          conceptTitle: "\uB4F1\uCC28\uC218\uC5F4"
        })
      );
      module.exports = {
        key: "algebra-arithmetic-sequences",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/geometricSequences.js
  var require_geometricSequences = __commonJS({
    "services/problemGenerators/algebra/geometricSequences.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "geo-nth",
          label: "\uC720\uD615 1 \xB7 \uB4F1\uBE44\uC218\uC5F4 \uC77C\uBC18\uD56D",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 4), r = randomInteger(2, 3), n = randomInteger(2, 5);
            return {
              prompt: `\uCCAB\uC9F8\uD56D ${a1}, \uACF5\uBE44 ${r} \uC778 \uB4F1\uBE44\uC218\uC5F4\uC758 a_${n} \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a1 * r ** (n - 1),
              solution: `a_n=a\u2081r^(n\u22121)=${a1}\xD7${r}^${n - 1}=${a1 * r ** (n - 1)}.`
            };
          }
        },
        {
          id: "geo-ratio",
          label: "\uC720\uD615 2 \xB7 \uACF5\uBE44 \uAD6C\uD558\uAE30",
          difficulty: 1,
          generate() {
            const a1 = randomInteger(1, 4), r = randomInteger(2, 4);
            return {
              prompt: `\uB4F1\uBE44\uC218\uC5F4\uC758 a\u2081=${a1}, a\u2082=${a1 * r} \uC77C \uB54C \uACF5\uBE44 r \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: r,
              solution: `r=a\u2082/a\u2081=${a1 * r}/${a1}=${r}.`
            };
          }
        },
        {
          id: "geo-sum",
          label: "\uC720\uD615 3 \xB7 \uB4F1\uBE44\uC218\uC5F4\uC758 \uD569",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 4), r = 2, n = randomInteger(2, 6);
            let s = 0;
            for (let k = 0; k < n; k++) s += a1 * r ** k;
            return {
              prompt: `\uCCAB\uC9F8\uD56D ${a1}, \uACF5\uBE44 ${r} \uC778 \uB4F1\uBE44\uC218\uC5F4\uC758 \uCCAB\uC9F8\uD56D\uBD80\uD130 \uC81C${n}\uD56D\uAE4C\uC9C0\uC758 \uD569\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: s,
              solution: `S_n=a\u2081(r\u207F\u22121)/(r\u22121)=${s}.`
            };
          }
        },
        {
          id: "geo-mean",
          label: "\uC720\uD615 4 \xB7 \uB4F1\uBE44\uC911\uD56D",
          difficulty: 2,
          generate() {
            const b = randomInteger(2, 6);
            const a = randomInteger(1, 4);
            const c = b * b / a;
            const aa = 1;
            const bb = randomInteger(2, 6);
            return {
              prompt: `\uC138 \uC591\uC218 1, x, ${bb * bb} \uAC00 \uB4F1\uBE44\uC218\uC5F4\uC744 \uC774\uB8F0 \uB54C \uC591\uC218 x \uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: bb,
              solution: `x\xB2=1\xD7${bb * bb} \u2192 x=${bb}.`
            };
          }
        },
        {
          id: "geo-term-from",
          label: "\uC720\uD615 5 \xB7 \uD2B9\uC815\uD56D\uC73C\uB85C \uCCAB\uC9F8\uD56D",
          difficulty: 3,
          generate() {
            const a1 = randomInteger(1, 4), r = randomInteger(2, 3), n = randomInteger(2, 4), an = a1 * r ** (n - 1);
            return {
              prompt: `\uACF5\uBE44 ${r} \uC778 \uB4F1\uBE44\uC218\uC5F4\uC5D0\uC11C a_${n}=${an} \uC77C \uB54C \uCCAB\uC9F8\uD56D a\u2081 \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a1,
              solution: `a\u2081=a_${n}/r^(${n}\u22121)=${an}/${r ** (n - 1)}=${a1}.`
            };
          }
        },
        {
          id: "geo-ratio-two",
          label: "\uC720\uD615 6 \xB7 \uB450 \uD56D\uC73C\uB85C \uACF5\uBE44",
          difficulty: 3,
          generate() {
            const a1 = randomInteger(1, 3), r = randomInteger(2, 3);
            return {
              prompt: `\uB4F1\uBE44\uC218\uC5F4\uC5D0\uC11C a\u2081=${a1}, a\u2083=${a1 * r * r} \uC77C \uB54C \uACF5\uBE44 r(\uC591\uC218) \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: r,
              solution: `r\xB2=a\u2083/a\u2081=${r * r} \u2192 r=${r}.`
            };
          }
        },
        {
          id: "geo-sum-r3",
          label: "\uC720\uD615 7 \xB7 \uB4F1\uBE44\uD569(\uACF5\uBE44 3)",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 3), r = 3, n = randomInteger(2, 5);
            let s = 0;
            for (let k = 0; k < n; k++) s += a1 * r ** k;
            return {
              prompt: `\uCCAB\uC9F8\uD56D ${a1}, \uACF5\uBE44 ${r} \uC778 \uB4F1\uBE44\uC218\uC5F4\uC758 \uCC98\uC74C ${n}\uAC1C \uD56D\uC758 \uD569\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: s,
              solution: `\uD569=${s}.`
            };
          }
        },
        {
          id: "geo-index",
          label: "\uC720\uD615 8 \xB7 \uD56D \uBC88\uD638 \uCC3E\uAE30",
          difficulty: 3,
          generate() {
            const a1 = randomInteger(1, 3), r = 2, n = randomInteger(2, 6), an = a1 * r ** (n - 1);
            return {
              prompt: `\uCCAB\uC9F8\uD56D ${a1}, \uACF5\uBE44 ${r} \uC778 \uB4F1\uBE44\uC218\uC5F4\uC5D0\uC11C ${an} \uC740 \uC81C\uBA87 \uD56D\uC778\uAC00\uC694?`,
              inputMode: "short-answer",
              answer: n,
              solution: `a\u2081\xB72^(n\u22121)=${an} \u2192 n=${n}.`
            };
          }
        },
        {
          id: "geo-three",
          label: "\uC720\uD615 9 \xB7 \uB4F1\uBE44 \uC138 \uC218\uC758 \uACF1",
          difficulty: 2,
          generate() {
            const m = randomInteger(2, 5), r = randomInteger(2, 3);
            return {
              prompt: `\uC5F0\uC18D\uB41C \uC138 \uB4F1\uBE44\uD56D\uC774 ${m}, ${m * r}, ${m * r * r} \uC77C \uB54C \uAC00\uC6B4\uB370 \uD56D\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: m * r,
              solution: `\uAC00\uC6B4\uB370 \uD56D=${m}\xD7${r}=${m * r}.`
            };
          }
        },
        {
          id: "geo-first",
          label: "\uC720\uD615 10 \xB7 \uACF5\uBE44\uC640 \uD56D\uC73C\uB85C \uCCAB\uC9F8\uD56D",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 4), r = randomInteger(2, 3), a2 = a1 * r;
            return {
              prompt: `\uACF5\uBE44 ${r} \uC778 \uB4F1\uBE44\uC218\uC5F4\uC5D0\uC11C a\u2082=${a2} \uC77C \uB54C \uCCAB\uC9F8\uD56D a\u2081 \uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a1,
              solution: `a\u2081=a\u2082/r=${a2}/${r}=${a1}.`
            };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-03-03",
          conceptTitle: "\uB4F1\uBE44\uC218\uC5F4"
        })
      );
      module.exports = {
        key: "algebra-geometric-sequences",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/sigmaDefinitionAndProperties.js
  var require_sigmaDefinitionAndProperties = __commonJS({
    "services/problemGenerators/algebra/sigmaDefinitionAndProperties.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "sigma-k",
          label: "\uC720\uD615 1 \xB7 \u03A3k",
          difficulty: 1,
          generate() {
            const n = randomInteger(3, 12);
            let s = 0;
            for (let k = 1; k <= n; k++) s += k;
            return { prompt: `\u03A3_{k=1}^{${n}} k \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `n(n+1)/2=${s}.` };
          }
        },
        {
          id: "sigma-k2",
          label: "\uC720\uD615 2 \xB7 \u03A3k\xB2",
          difficulty: 2,
          generate() {
            const n = randomInteger(3, 9);
            let s = 0;
            for (let k = 1; k <= n; k++) s += k * k;
            return { prompt: `\u03A3_{k=1}^{${n}} k\xB2 \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `n(n+1)(2n+1)/6=${s}.` };
          }
        },
        {
          id: "sigma-k3",
          label: "\uC720\uD615 3 \xB7 \u03A3k\xB3",
          difficulty: 2,
          generate() {
            const n = randomInteger(2, 6);
            let s = 0;
            for (let k = 1; k <= n; k++) s += k ** 3;
            return { prompt: `\u03A3_{k=1}^{${n}} k\xB3 \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `{n(n+1)/2}\xB2=${s}.` };
          }
        },
        {
          id: "sigma-const",
          label: "\uC720\uD615 4 \xB7 \u03A3 \uC0C1\uC218",
          difficulty: 1,
          generate() {
            const n = randomInteger(3, 10), c = nonZeroInteger(-5, 5);
            return { prompt: `\u03A3_{k=1}^{${n}} ${c} \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: c * n, solution: `${c}\xD7${n}=${c * n}.` };
          }
        },
        {
          id: "sigma-linear",
          label: "\uC720\uD615 5 \xB7 \uC2DC\uADF8\uB9C8\uC758 \uC120\uD615\uC131",
          difficulty: 2,
          generate() {
            const n = randomInteger(3, 8), a = randomInteger(2, 4), b = randomInteger(-3, 3);
            let s = 0;
            for (let k = 1; k <= n; k++) s += a * k + b;
            return { prompt: `\u03A3_{k=1}^{${n}} (${a}k + ${b}) \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `${a}\u03A3k+\u03A3${b}=${s}.` };
          }
        },
        {
          id: "sigma-quad",
          label: "\uC720\uD615 6 \xB7 \u03A3(k\xB2+k)",
          difficulty: 2,
          generate() {
            const n = randomInteger(3, 8);
            let s = 0;
            for (let k = 1; k <= n; k++) s += k * k + k;
            return { prompt: `\u03A3_{k=1}^{${n}} (k\xB2 + k) \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `\u03A3k\xB2+\u03A3k=${s}.` };
          }
        },
        {
          id: "sigma-odd",
          label: "\uC720\uD615 7 \xB7 \u03A3(2k\u22121)=n\xB2",
          difficulty: 2,
          generate() {
            const n = randomInteger(3, 10);
            let s = 0;
            for (let k = 1; k <= n; k++) s += 2 * k - 1;
            return { prompt: `\u03A3_{k=1}^{${n}} (2k\u22121) \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `\uD640\uC218\uC758 \uD569=n\xB2=${s}.` };
          }
        },
        {
          id: "sigma-product",
          label: "\uC720\uD615 8 \xB7 \u03A3k(k+1)",
          difficulty: 3,
          generate() {
            const n = randomInteger(3, 7);
            let s = 0;
            for (let k = 1; k <= n; k++) s += k * (k + 1);
            return { prompt: `\u03A3_{k=1}^{${n}} k(k+1) \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `\u03A3k\xB2+\u03A3k=${s}.` };
          }
        },
        {
          id: "sigma-shift",
          label: "\uC720\uD615 9 \xB7 \u03A3(k+\uC0C1\uC218)",
          difficulty: 2,
          generate() {
            const n = randomInteger(3, 9), c = randomInteger(1, 5);
            let s = 0;
            for (let k = 1; k <= n; k++) s += k + c;
            return { prompt: `\u03A3_{k=1}^{${n}} (k + ${c}) \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `\u03A3k + ${c}n = ${s}.` };
          }
        },
        {
          id: "sigma-geo",
          label: "\uC720\uD615 10 \xB7 \u03A3 2\u1D4F",
          difficulty: 3,
          generate() {
            const n = randomInteger(2, 8);
            let s = 0;
            for (let k = 1; k <= n; k++) s += 2 ** k;
            return { prompt: `\u03A3_{k=1}^{${n}} 2\u1D4F \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `2^(n+1)\u22122=${s}.` };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-03-04",
          conceptTitle: "\uC2DC\uADF8\uB9C8(\u03A3)\uC758 \uB73B\uACFC \uC131\uC9C8"
        })
      );
      module.exports = {
        key: "algebra-sigma-definition-and-properties",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/sumsOfVariousSequences.js
  var require_sumsOfVariousSequences = __commonJS({
    "services/problemGenerators/algebra/sumsOfVariousSequences.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "tele-1",
          label: "\uC720\uD615 1 \xB7 \u03A31/(k(k+1))",
          difficulty: 3,
          generate() {
            const n = randomInteger(3, 9);
            let s = 0;
            for (let k = 1; k <= n; k++) s += 1 / (k * (k + 1));
            return { prompt: `\u03A3_{k=1}^{${n}} 1/(k(k+1)) \uB97C \uAD6C\uD558\uC138\uC694. (\uC18C\uC218)`, inputMode: "short-answer", answer: round4(s), solution: `1\u22121/${n + 1}=${round4(s)}.` };
          }
        },
        {
          id: "tele-2",
          label: "\uC720\uD615 2 \xB7 \u03A31/((2k\u22121)(2k+1))",
          difficulty: 3,
          generate() {
            const n = randomInteger(3, 8);
            let s = 0;
            for (let k = 1; k <= n; k++) s += 1 / ((2 * k - 1) * (2 * k + 1));
            return { prompt: `\u03A3_{k=1}^{${n}} 1/((2k\u22121)(2k+1)) \uB97C \uAD6C\uD558\uC138\uC694. (\uC18C\uC218)`, inputMode: "short-answer", answer: round4(s), solution: `\xBD(1\u22121/${2 * n + 1})=${round4(s)}.` };
          }
        },
        {
          id: "tele-3",
          label: "\uC720\uD615 3 \xB7 \u03A31/(k(k+2))",
          difficulty: 3,
          generate() {
            const n = randomInteger(3, 8);
            let s = 0;
            for (let k = 1; k <= n; k++) s += 1 / (k * (k + 2));
            return { prompt: `\u03A3_{k=1}^{${n}} 1/(k(k+2)) \uB97C \uAD6C\uD558\uC138\uC694. (\uC18C\uC218)`, inputMode: "short-answer", answer: round4(s), solution: `\uBD80\uBD84\uBD84\uC218\uB85C \uB9DD\uC6D0\uD569=${round4(s)}.` };
          }
        },
        {
          id: "sum-kk1-closed",
          label: "\uC720\uD615 4 \xB7 \u03A3k(k+1)\uC758 \uAC12",
          difficulty: 2,
          generate() {
            const n = randomInteger(3, 7);
            let s = 0;
            for (let k = 1; k <= n; k++) s += k * (k + 1);
            return { prompt: `\u03A3_{k=1}^{${n}} k(k+1) \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `n(n+1)(n+2)/3=${s}.` };
          }
        },
        {
          id: "sum-2k1",
          label: "\uC720\uD615 5 \xB7 \u03A3(2k+1)",
          difficulty: 2,
          generate() {
            const n = randomInteger(3, 9);
            let s = 0;
            for (let k = 1; k <= n; k++) s += 2 * k + 1;
            return { prompt: `\u03A3_{k=1}^{${n}} (2k+1) \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `n\xB2+2n=${s}.` };
          }
        },
        {
          id: "sum-partial-terms",
          label: "\uC720\uD615 6 \xB7 \uBD80\uBD84\uD569\uC758 \uCC28",
          difficulty: 3,
          generate() {
            const n = randomInteger(3, 7);
            let s = 0;
            for (let k = 1; k <= n; k++) s += k * k;
            return { prompt: `\u03A3_{k=1}^{${n}} k\xB2 \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `n(n+1)(2n+1)/6=${s}.` };
          }
        },
        {
          id: "sum-arith-geo-mix",
          label: "\uC720\uD615 7 \xB7 \u03A3(3k\u22122)",
          difficulty: 2,
          generate() {
            const n = randomInteger(3, 9);
            let s = 0;
            for (let k = 1; k <= n; k++) s += 3 * k - 2;
            return { prompt: `\u03A3_{k=1}^{${n}} (3k\u22122) \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `3\u03A3k\u22122n=${s}.` };
          }
        },
        {
          id: "sum-square-diff",
          label: "\uC720\uD615 8 \xB7 \u03A3(k\xB2\u22121)",
          difficulty: 2,
          generate() {
            const n = randomInteger(3, 8);
            let s = 0;
            for (let k = 1; k <= n; k++) s += k * k - 1;
            return { prompt: `\u03A3_{k=1}^{${n}} (k\xB2\u22121) \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `\u03A3k\xB2\u2212n=${s}.` };
          }
        },
        {
          id: "sum-tele-frac",
          label: "\uC720\uD615 9 \xB7 \u03A3(1/k \u2212 1/(k+1))",
          difficulty: 3,
          generate() {
            const n = randomInteger(3, 9);
            const s = 1 - 1 / (n + 1);
            return { prompt: `\u03A3_{k=1}^{${n}} (1/k \u2212 1/(k+1)) \uB97C \uAD6C\uD558\uC138\uC694. (\uC18C\uC218)`, inputMode: "short-answer", answer: round4(s), solution: `\uB9DD\uC6D0\uD569=1\u22121/${n + 1}=${round4(s)}.` };
          }
        },
        {
          id: "sum-cubes-value",
          label: "\uC720\uD615 10 \xB7 \u03A3k\xB3 \uAC12",
          difficulty: 2,
          generate() {
            const n = randomInteger(2, 6);
            let s = 0;
            for (let k = 1; k <= n; k++) s += k ** 3;
            return { prompt: `\u03A3_{k=1}^{${n}} k\xB3 \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `{n(n+1)/2}\xB2=${s}.` };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-03-05",
          conceptTitle: "\uC5EC\uB7EC \uAC00\uC9C0 \uC218\uC5F4\uC758 \uD569"
        })
      );
      module.exports = {
        key: "algebra-sums-of-various-sequences",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/recursiveSequences.js
  var require_recursiveSequences = __commonJS({
    "services/problemGenerators/algebra/recursiveSequences.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        iterate,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "rec-add",
          label: "\uC720\uD615 1 \xB7 a_{n+1}=a_n+d",
          difficulty: 1,
          generate() {
            const a1 = randomInteger(1, 6), d = nonZeroInteger(-3, 4);
            const a3 = iterate(a1, (a) => a + d, 3);
            return { prompt: `a\u2081=${a1}, a_{n+1}=a_n+${d} \uC77C \uB54C a\u2083 \uC744 \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: a3, solution: `a\u2082=${a1 + d}, a\u2083=${a3}.` };
          }
        },
        {
          id: "rec-mult",
          label: "\uC720\uD615 2 \xB7 a_{n+1}=r\xB7a_n",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 4), r = randomInteger(2, 3);
            const a3 = iterate(a1, (a) => a * r, 3);
            return { prompt: `a\u2081=${a1}, a_{n+1}=${r}\xB7a_n \uC77C \uB54C a\u2083 \uC744 \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: a3, solution: `a\u2082=${a1 * r}, a\u2083=${a3}.` };
          }
        },
        {
          id: "rec-add-n",
          label: "\uC720\uD615 3 \xB7 a_{n+1}=a_n+2n",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 5);
            const a4 = iterate(a1, (a, n) => a + 2 * n, 4);
            return { prompt: `a\u2081=${a1}, a_{n+1}=a_n+2n \uC77C \uB54C a\u2084 \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: a4, solution: `\uC21C\uC11C\uB300\uB85C \uACC4\uC0B0\uD558\uBA74 a\u2084=${a4}.` };
          }
        },
        {
          id: "rec-affine",
          label: "\uC720\uD615 4 \xB7 a_{n+1}=2a_n+1",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 4);
            const a3 = iterate(a1, (a) => 2 * a + 1, 3);
            return { prompt: `a\u2081=${a1}, a_{n+1}=2a_n+1 \uC77C \uB54C a\u2083 \uC744 \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: a3, solution: `a\u2082=${2 * a1 + 1}, a\u2083=${a3}.` };
          }
        },
        {
          id: "rec-fib",
          label: "\uC720\uD615 5 \xB7 a_{n+2}=a_{n+1}+a_n",
          difficulty: 3,
          generate() {
            const a1 = randomInteger(1, 4), a2 = randomInteger(1, 5);
            const a4 = a1 + a2 + a2;
            return { prompt: `a\u2081=${a1}, a\u2082=${a2}, a_{n+2}=a_{n+1}+a_n \uC77C \uB54C a\u2084 \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: a4, solution: `a\u2083=${a1 + a2}, a\u2084=${a4}.` };
          }
        },
        {
          id: "rec-add5",
          label: "\uC720\uD615 6 \xB7 \uB2E4\uC12F\uC9F8\uD56D \uAD6C\uD558\uAE30",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 5), d = nonZeroInteger(1, 4);
            const a5 = iterate(a1, (a) => a + d, 5);
            return { prompt: `a\u2081=${a1}, a_{n+1}=a_n+${d} \uC77C \uB54C a\u2085 \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: a5, solution: `a\u2085=${a5}.` };
          }
        },
        {
          id: "rec-known-two",
          label: "\uC720\uD615 7 \xB7 \uB450 \uD56D \uC8FC\uC5B4\uC9C4 \uB4F1\uCC28\uD615",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 5), d = nonZeroInteger(1, 4);
            const a4 = iterate(a1, (a) => a + d, 4);
            return { prompt: `a\u2081=${a1}, a\u2082=${a1 + d}, \uACF5\uCC28\uAC00 \uC77C\uC815\uD560 \uB54C a\u2084 \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: a4, solution: `\uACF5\uCC28 ${d} \u2192 a\u2084=${a4}.` };
          }
        },
        {
          id: "rec-half",
          label: "\uC720\uD615 8 \xB7 a_{n+1}=a_n/2",
          difficulty: 2,
          generate() {
            const a1 = 8 * randomInteger(1, 3);
            const a3 = iterate(a1, (a) => a / 2, 3);
            return { prompt: `a\u2081=${a1}, a_{n+1}=a_n/2 \uC77C \uB54C a\u2083 \uC744 \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: a3, solution: `a\u2082=${a1 / 2}, a\u2083=${a3}.` };
          }
        },
        {
          id: "rec-add-nsq",
          label: "\uC720\uD615 9 \xB7 a_{n+1}=a_n+n\xB2",
          difficulty: 3,
          generate() {
            const a1 = randomInteger(1, 4);
            const a3 = iterate(a1, (a, n) => a + n * n, 3);
            return { prompt: `a\u2081=${a1}, a_{n+1}=a_n+n\xB2 \uC77C \uB54C a\u2083 \uC744 \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: a3, solution: `a\u2082=${a1 + 1}, a\u2083=${a3}.` };
          }
        },
        {
          id: "rec-triple",
          label: "\uC720\uD615 10 \xB7 a_{n+1}=3a_n",
          difficulty: 2,
          generate() {
            const a1 = randomInteger(1, 3);
            const a4 = iterate(a1, (a) => 3 * a, 4);
            return { prompt: `a\u2081=${a1}, a_{n+1}=3a_n \uC77C \uB54C a\u2084 \uB97C \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: a4, solution: `a\u2084=${a4}.` };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-03-06",
          conceptTitle: "\uC218\uC5F4\uC758 \uADC0\uB0A9\uC801 \uC815\uC758"
        })
      );
      module.exports = {
        key: "algebra-recursive-sequences",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/algebra/mathematicalInduction.js
  var require_mathematicalInduction = __commonJS({
    "services/problemGenerators/algebra/mathematicalInduction.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        round4,
        isCorrectAnswer,
        createAlgebraProblemType
      } = require_helpers2();
      var problemTypes = [
        {
          id: "domino-idea",
          label: "\uC720\uD615 1 \xB7 \uADC0\uB0A9\uBC95\uC758 \uC6D0\uB9AC(\uB3C4\uBBF8\uB178)",
          difficulty: 1,
          generate() {
            const start = randomInteger(1, 4);
            return {
              prompt: `P(${start})\uAC00 \uCC38\uC774\uACE0, k\u2265${start}\uC5D0\uC11C P(k)\uAC00 \uCC38\uC774\uBA74 P(k+1)\uB3C4 \uCC38\uC784\uC744 \uBCF4\uC600\uC2B5\uB2C8\uB2E4. \uACB0\uB860\uC740?`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "all",
                  text: `\uBAA8\uB4E0 \uC790\uC5F0\uC218 n\u2265${start}\uC5D0\uC11C P(n)\uC774 \uCC38`
                },
                {
                  key: "some",
                  text: `n=${start}\uC5D0\uC11C\uB9CC P(n)\uC774 \uCC38`
                }
              ],
              answer: "all",
              solution: `\uAE30\uCD08 \uB2E8\uACC4 P(${start})\uC640 \uADC0\uB0A9 \uB2E8\uACC4\uAC00 \uBAA8\uB450 \uC131\uB9BD\uD558\uBBC0\uB85C \uBAA8\uB4E0 \uC790\uC5F0\uC218 n\u2265${start}\uC5D0\uC11C P(n)\uC774 \uCC38\uC785\uB2C8\uB2E4.`
            };
          }
        },
        {
          id: "base-check-sum",
          label: "\uC720\uD615 2 \xB7 n=1 \uD655\uC778(\uD569)",
          difficulty: 1,
          generate() {
            const variants = [
              "1+2+\u2026+n=n(n+1)/2",
              "1+3+\u2026+(2n-1)=n\xB2",
              "1\xB2+2\xB2+\u2026+n\xB2=n(n+1)(2n+1)/6"
            ];
            const statement = variants[randomInteger(0, variants.length - 1)];
            return {
              prompt: `\uB4F1\uC2DD ${statement}\uC758 \uAE30\uCD08 \uB2E8\uACC4\uC5D0\uC11C n=1\uC77C \uB54C \uC88C\uBCC0\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: 1,
              solution: `n=1\uC774\uBA74 \uC88C\uBCC0\uC5D0\uB294 \uCCAB \uBC88\uC9F8 \uD56D 1\uB9CC \uB0A8\uC73C\uBBC0\uB85C \uAC12\uC740 1\uC785\uB2C8\uB2E4.`
            };
          }
        },
        {
          id: "hypothesis-step",
          label: "\uC720\uD615 3 \xB7 \uAC00\uC815 \uB2E8\uACC4 \uAC1C\uB150",
          difficulty: 2,
          generate() {
            const statement = Math.random() < 0.5 ? "1+2+\u2026+n=n(n+1)/2" : "1+3+\u2026+(2n-1)=n\xB2";
            return {
              prompt: `\uBA85\uC81C P(n): ${statement}\uC744 \uADC0\uB0A9\uBC95\uC73C\uB85C \uC99D\uBA85\uD560 \uB54C \uADC0\uB0A9 \uAC00\uC815\uC740?`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "ind",
                  text: `P(k)\uAC00 \uCC38\uC774\uB77C\uACE0 \uAC00\uC815\uD55C\uB2E4.`
                },
                {
                  key: "base",
                  text: `P(k+1)\uAC00 \uCC38\uC774\uB77C\uACE0 \uBA3C\uC800 \uAC00\uC815\uD55C\uB2E4.`
                }
              ],
              answer: "ind",
              solution: `\uADC0\uB0A9 \uB2E8\uACC4\uC5D0\uC11C\uB294 P(k)\uAC00 \uCC38\uC774\uB77C\uACE0 \uAC00\uC815\uD558\uACE0 P(k+1)\uC744 \uC99D\uBA85\uD569\uB2C8\uB2E4.`
            };
          }
        },
        {
          id: "verify-kplus1",
          label: "\uC720\uD615 4 \xB7 n=k+1 \uC88C\uBCC0 \uAC12",
          difficulty: 2,
          generate() {
            const k = randomInteger(2, 6);
            let s = 0;
            for (let i = 1; i <= k + 1; i++) s += i;
            return { prompt: `1+2+\u2026+n \uC5D0\uC11C n=${k + 1} \uC77C \uB54C\uC758 \uD569\uC744 \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `${k + 1}(${k + 2})/2=${s}.` };
          }
        },
        {
          id: "sum-formula-value",
          label: "\uC720\uD615 5 \xB7 \uB4F1\uC2DD P(n) \uC88C\uBCC0 \uAC12",
          difficulty: 1,
          generate() {
            const n = randomInteger(3, 8);
            let s = 0;
            for (let i = 1; i <= n; i++) s += i;
            return { prompt: `1+2+\u2026+${n} \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `${n}(${n + 1})/2=${s}.` };
          }
        },
        {
          id: "odd-sum-value",
          label: "\uC720\uD615 6 \xB7 \uD640\uC218\uD569 P(n)=n\xB2",
          difficulty: 2,
          generate() {
            const n = randomInteger(3, 9);
            return { prompt: `1+3+5+\u2026+(2\xD7${n}\u22121) \uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`, inputMode: "short-answer", answer: n * n, solution: `\uD640\uC218 ${n}\uAC1C\uC758 \uD569=${n}\xB2=${n * n}.` };
          }
        },
        {
          id: "step-order",
          label: "\uC720\uD615 7 \xB7 \uC99D\uBA85 \uB2E8\uACC4 \uC21C\uC11C",
          difficulty: 2,
          generate() {
            const start = randomInteger(1, 4);
            return {
              prompt: `n\u2265${start}\uC5D0\uC11C \uBA85\uC81C P(n)\uC744 \uADC0\uB0A9\uBC95\uC73C\uB85C \uC99D\uBA85\uD560 \uB54C \uC62C\uBC14\uB978 \uC21C\uC11C\uB294?`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "ok",
                  text: `\u2460 P(${start}) \uD655\uC778 \u2192 \u2461 P(k) \uAC00\uC815 \u2192 \u2462 P(k+1) \uC99D\uBA85`
                },
                {
                  key: "no",
                  text: `\u2460 P(k+1) \uAC00\uC815 \u2192 \u2461 P(${start}) \uC0DD\uB7B5`
                }
              ],
              answer: "ok",
              solution: `\uAE30\uCD08 \uB2E8\uACC4 P(${start})\uB97C \uD655\uC778\uD55C \uB4A4 \uADC0\uB0A9 \uAC00\uC815\uACFC P(k+1)\uC758 \uC99D\uBA85 \uC21C\uC11C\uB85C \uC9C4\uD589\uD569\uB2C8\uB2E4.`
            };
          }
        },
        {
          id: "base-holds",
          label: "\uC720\uD615 8 \xB7 \uAE30\uCD08\uB2E8\uACC4 \uC131\uB9BD \uD310\uC815",
          difficulty: 1,
          generate() {
            const offset = Math.random() < 0.5 ? 0 : 1;
            return {
              prompt: `\uB4F1\uC2DD 1+2+\u2026+n=n(n+1)/2+${offset}\uC5D0\uC11C n=1\uC77C \uB54C \uC88C\uBCC0\uACFC \uC6B0\uBCC0\uC774 \uAC19\uC2B5\uB2C8\uAE4C?`,
              inputMode: "multiple-choice",
              choices: [
                {
                  key: "y",
                  text: "\uAC19\uB2E4(\uAE30\uCD08 \uB2E8\uACC4 \uC131\uB9BD)"
                },
                {
                  key: "n",
                  text: "\uB2E4\uB974\uB2E4(\uAE30\uCD08 \uB2E8\uACC4 \uBD88\uC131\uB9BD)"
                }
              ],
              answer: offset === 0 ? "y" : "n",
              solution: `n=1\uC77C \uB54C \uC88C\uBCC0\uC740 1, \uC6B0\uBCC0\uC740 ${1 + offset}\uC774\uBBC0\uB85C ${offset === 0 ? "\uAC19\uC2B5\uB2C8\uB2E4." : "\uB2E4\uB985\uB2C8\uB2E4."}`
            };
          }
        },
        {
          id: "inequality-min",
          label: "\uC720\uD615 9 \xB7 \uBD80\uB4F1\uC2DD 2\u207F>n\xB2 \uCD5C\uC18C n",
          difficulty: 3,
          generate() {
            const powers = [
              { exponent: 1, answer: 1 },
              { exponent: 2, answer: 5 },
              { exponent: 3, answer: 10 }
            ];
            const variant = powers[randomInteger(0, powers.length - 1)];
            return {
              prompt: `n\u2265m\uC778 \uBAA8\uB4E0 \uC790\uC5F0\uC218\uC5D0\uC11C 2\u207F>n^${variant.exponent}\uC774 \uC131\uB9BD\uD558\uAE30 \uC2DC\uC791\uD558\uB294 \uCD5C\uC18C \uC790\uC5F0\uC218 m\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: variant.answer,
              solution: `\uC791\uC740 \uC790\uC5F0\uC218\uBD80\uD130 \uBE44\uAD50\uD558\uBA74 n=${variant.answer}\uBD80\uD130 2\u207F>n^${variant.exponent}\uC774 \uACC4\uC18D \uC131\uB9BD\uD569\uB2C8\uB2E4.`
            };
          }
        },
        {
          id: "odd-sum-check",
          label: "\uC720\uD615 10 \xB7 \uD640\uC218\uD569 \uD655\uC778",
          difficulty: 2,
          generate() {
            const n = randomInteger(2, 7);
            let s = 0;
            for (let i = 1; i <= n; i++) s += 2 * i - 1;
            return { prompt: `1+3+\u2026+(2\xD7${n}\u22121) \uC774 ${n}\xB2 \uACFC \uAC19\uC740\uC9C0 \uD655\uC778\uD558\uAE30 \uC704\uD574 \uC88C\uBCC0\uC744 \uACC4\uC0B0\uD558\uC138\uC694.`, inputMode: "short-answer", answer: s, solution: `\uC88C\uBCC0=${s}=${n}\xB2.` };
          }
        }
      ].map(
        (problemType) => createAlgebraProblemType(problemType, {
          conceptId: "algebra-03-07",
          conceptTitle: "\uC218\uD559\uC801 \uADC0\uB0A9\uBC95"
        })
      );
      module.exports = {
        key: "algebra-mathematical-induction",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/probabilityStatistics/helpers.js
  var require_helpers3 = __commonJS({
    "services/problemGenerators/probabilityStatistics/helpers.js"(exports, module) {
      var {
        randomInteger,
        isCorrectAnswer
      } = require_utils();
      var {
        formatAlgebraMathText
      } = require_mathTextService();
      function inlineMath(tex) {
        return `\\(${tex}\\)`;
      }
      function displayMath(tex) {
        return `\\[${tex}\\]`;
      }
      function factorial(n) {
        let value = 1;
        for (let index = 2; index <= n; index += 1) {
          value *= index;
        }
        return value;
      }
      function combination(n, r) {
        if (r < 0 || r > n) return 0;
        const k = Math.min(r, n - r);
        let value = 1;
        for (let index = 1; index <= k; index += 1) {
          value = value * (n - k + index) / index;
        }
        return Math.round(value);
      }
      function permutation(n, r) {
        return factorial(n) / factorial(n - r);
      }
      function gcd(a, b) {
        let left = Math.abs(Math.round(a));
        let right = Math.abs(Math.round(b));
        while (right) {
          [left, right] = [right, left % right];
        }
        return left || 1;
      }
      function fractionText(numerator, denominator) {
        const divisor = gcd(numerator, denominator);
        const n = numerator / divisor;
        const d = denominator / divisor;
        return d === 1 ? String(n) : `\\frac{${n}}{${d}}`;
      }
      function round4(value) {
        return Math.round(value * 1e4) / 1e4;
      }
      function shortAnswer({
        prompt,
        answer,
        solution,
        hintText,
        visualization
      }) {
        return {
          prompt,
          inputMode: "short-answer",
          answer: round4(answer),
          solution,
          hintText,
          visualization
        };
      }
      function multipleChoice({
        prompt,
        choices,
        answerIndex,
        solution,
        hintText,
        visualization
      }) {
        const shuffledChoices = choices.map(
          (text, index) => ({
            text,
            correct: index === answerIndex
          })
        );
        for (let index = shuffledChoices.length - 1; index > 0; index -= 1) {
          const swapIndex = randomInteger(0, index);
          [
            shuffledChoices[index],
            shuffledChoices[swapIndex]
          ] = [
            shuffledChoices[swapIndex],
            shuffledChoices[index]
          ];
        }
        const normalizedChoices = shuffledChoices.map(
          (choice, index) => ({
            key: String.fromCharCode(65 + index),
            text: choice.text,
            correct: choice.correct
          })
        );
        const correctChoice = normalizedChoices.find(
          (choice) => choice.correct
        );
        return {
          prompt,
          inputMode: "multiple-choice",
          choices: normalizedChoices.map(
            ({ key, text }) => ({ key, text })
          ),
          answer: correctChoice.key,
          solution,
          hintText,
          visualization
        };
      }
      function createProblemTypes({
        conceptId,
        conceptTitle,
        labels,
        buildProblems
      }) {
        return labels.map((label, index) => ({
          id: `${conceptId}-type-${String(index + 1).padStart(2, "0")}`,
          label: `\uC720\uD615 ${index + 1} \xB7 ${label}`,
          difficulty: index < 3 ? 1 : index < 7 ? 2 : 3,
          generate() {
            const problems = buildProblems();
            const generated = problems[index];
            if (!generated) {
              throw new Error(
                `${conceptTitle}\uC758 ${index + 1}\uBC88 \uBB38\uC81C \uC720\uD615\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.`
              );
            }
            return {
              ...generated,
              prompt: formatAlgebraMathText(
                generated.prompt
              ),
              solution: formatAlgebraMathText(
                generated.solution
              ),
              choices: Array.isArray(
                generated.choices
              ) ? generated.choices.map((choice) => ({
                ...choice,
                text: formatAlgebraMathText(
                  choice.text
                )
              })) : generated.choices,
              hintText: formatAlgebraMathText(
                generated.hintText || `${conceptTitle}\uC758 \uC815\uC758\uB97C \uBA3C\uC800 \uC4F0\uACE0, \uBB38\uC81C\uC5D0 \uC8FC\uC5B4\uC9C4 \uC218\uB97C \uD55C \uB2E8\uACC4\uC529 \uB300\uC785\uD574\uBCF4\uC138\uC694.`
              ),
              visualization: generated.visualization || {
                kind: "probability-concept",
                conceptId,
                typeIndex: index
              },
              validityChecks: [
                ...generated.validityChecks || [],
                {
                  name: "probability-statistics-answer",
                  passed: generated.answer !== void 0 && generated.answer !== null && String(generated.answer).trim() !== "",
                  message: "\uC815\uB2F5\uC774 \uBE44\uC5B4 \uC788\uC2B5\uB2C8\uB2E4."
                }
              ]
            };
          }
        }));
      }
      module.exports = {
        randomInteger,
        inlineMath,
        displayMath,
        factorial,
        combination,
        permutation,
        fractionText,
        round4,
        shortAnswer,
        multipleChoice,
        createProblemTypes,
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/probabilityStatistics/generators.js
  var require_generators2 = __commonJS({
    "services/problemGenerators/probabilityStatistics/generators.js"(exports, module) {
      var {
        randomInteger,
        inlineMath,
        factorial,
        combination,
        permutation,
        fractionText,
        round4,
        shortAnswer,
        multipleChoice,
        createProblemTypes,
        isCorrectAnswer
      } = require_helpers3();
      function probability(numerator, denominator) {
        return round4(numerator / denominator);
      }
      function binomialProbability(n, p, k) {
        return round4(
          combination(n, k) * p ** k * (1 - p) ** (n - k)
        );
      }
      function normalCdf(z) {
        const sign = z < 0 ? -1 : 1;
        const x = Math.abs(z) / Math.sqrt(2);
        const t = 1 / (1 + 0.3275911 * x);
        const coefficients = [
          0.254829592,
          -0.284496736,
          1.421413741,
          -1.453152027,
          1.061405429
        ];
        let polynomial = coefficients[4];
        for (let index = 3; index >= 0; index -= 1) {
          polynomial = polynomial * t + coefficients[index];
        }
        const erf = sign * (1 - polynomial * t * Math.exp(-x * x));
        return (1 + erf) / 2;
      }
      function sa(prompt, answer, solution, hintText, visualization) {
        return shortAnswer({
          prompt,
          answer,
          solution,
          hintText,
          visualization
        });
      }
      function mc(prompt, choices, answerIndex, solution, hintText, visualization) {
        return multipleChoice({
          prompt,
          choices,
          answerIndex,
          solution,
          hintText,
          visualization
        });
      }
      function countingVisual(data = {}) {
        return { kind: "probability-counting", ...data };
      }
      function vennVisual(data = {}) {
        return { kind: "probability-venn", ...data };
      }
      function treeVisual(data = {}) {
        return { kind: "probability-tree", ...data };
      }
      function distributionVisual(data = {}) {
        return { kind: "probability-distribution", ...data };
      }
      function binomialVisual(data = {}) {
        return { kind: "probability-binomial", ...data };
      }
      function normalVisual(data = {}) {
        return { kind: "probability-normal", ...data };
      }
      function samplingVisual(data = {}) {
        return { kind: "probability-sampling", ...data };
      }
      function confidenceVisual(data = {}) {
        return { kind: "probability-confidence", ...data };
      }
      var definitions = [
        {
          conceptId: "probability-statistics-01-01",
          unitId: "counting",
          key: "probstat-repeated-multiset-permutation",
          title: "\uC911\uBCF5\uC21C\uC5F4\uACFC \uAC19\uC740 \uAC83\uC774 \uC788\uB294 \uC21C\uC5F4",
          labels: [
            "\uC911\uBCF5\uC21C\uC5F4",
            "\uBE44\uBC00\uBC88\uD638 \uB9CC\uB4E4\uAE30",
            "\uAC19\uC740 \uAC83\uC774 \uC788\uB294 \uC21C\uC5F4",
            "\uBB38\uC790 \uBC30\uC5F4",
            "\uC6D0\uC21C\uC5F4\uACFC \uAD6C\uBCC4",
            "\uD2B9\uC815 \uAE30\uD638 \uD3EC\uD568",
            "\uC790\uB9AC \uC81C\uD55C",
            "\uAC19\uC740 \uC218 \uBB36\uAE30",
            "\uB450 \uC885\uB958\uC758 \uC911\uBCF5",
            "\uC885\uD569 \uBC30\uC5F4"
          ],
          buildProblems() {
            const n = randomInteger(2, 5);
            const r = randomInteger(2, 5);
            const a = randomInteger(2, 4);
            const b = randomInteger(2, 4);
            const total = a + b;
            const repeated = n ** r;
            const multiset = factorial(total) / (factorial(a) * factorial(b));
            const uniqueCount = randomInteger(2, 4);
            const duplicateCount = randomInteger(2, 3);
            const letterTotal = uniqueCount + duplicateCount;
            const letterArrangement = factorial(letterTotal) / factorial(duplicateCount);
            const circleCount = randomInteger(4, 7);
            const circleArrangement = factorial(circleCount - 1);
            const thirdGroup = randomInteger(2, 3);
            const threeGroupTotal = total + thirdGroup;
            const threeGroupArrangement = factorial(threeGroupTotal) / (factorial(a) * factorial(b) * factorial(thirdGroup));
            return [
              sa(`${n}\uAC1C\uC758 \uBB38\uC790\uB97C \uC911\uBCF5\uC744 \uD5C8\uC6A9\uD558\uC5EC ${r}\uC790\uB9AC\uB85C \uB098\uC5F4\uD558\uB294 \uACBD\uC6B0\uC758 \uC218\uB97C \uAD6C\uD558\uC138\uC694.`, repeated, `\uAC01 \uC790\uB9AC\uB9C8\uB2E4 ${n}\uAC00\uC9C0\uC774\uBBC0\uB85C ${inlineMath(`${n}^{${r}}=${repeated}`)}\uC785\uB2C8\uB2E4.`, "\uC120\uD0DD\uD55C \uB4A4\uC5D0\uB3C4 \uB2E4\uC74C \uC790\uB9AC\uC758 \uC120\uD0DD\uC9C0 \uC218\uAC00 \uC904\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", countingVisual({ mode: "repeated", choices: n, slots: r })),
              sa(`\uC22B\uC790 ${n}\uAC1C\uB85C \uC911\uBCF5 \uAC00\uB2A5\uD55C ${r}\uC790\uB9AC \uBE44\uBC00\uBC88\uD638\uB97C \uB9CC\uB4DC\uB294 \uACBD\uC6B0\uC758 \uC218\uB294?`, repeated, `${r}\uAC1C \uC790\uB9AC\uC5D0 \uAC01\uAC01 ${n}\uAC00\uC9C0\uAC00 \uB4E4\uC5B4\uAC00\uBBC0\uB85C ${repeated}\uAC00\uC9C0\uC785\uB2C8\uB2E4.`, "\uC790\uB9AC\uBCC4 \uC120\uD0DD\uC9C0 \uC218\uB97C \uACF1\uD558\uC138\uC694.", countingVisual({ mode: "repeated", choices: n, slots: r })),
              sa(`A\uAC00 ${a}\uAC1C, B\uAC00 ${b}\uAC1C\uC778 ${total}\uAC1C \uBB38\uC790\uB97C \uBAA8\uB450 \uB098\uC5F4\uD558\uB294 \uACBD\uC6B0\uC758 \uC218\uB97C \uAD6C\uD558\uC138\uC694.`, multiset, `${inlineMath(`\\frac{${total}!}{${a}!${b}!}=${multiset}`)}\uC785\uB2C8\uB2E4.`, "\uBAA8\uB450 \uB2E4\uB974\uB2E4\uACE0 \uC13C \uB4A4 A\uB07C\uB9AC, B\uB07C\uB9AC\uC758 \uC790\uB9AC\uBC14\uAFC8\uC744 \uB098\uB215\uB2C8\uB2E4.", countingVisual({ mode: "multiset", groups: [a, b] })),
              sa(`\uAC19\uC740 \uBB38\uC790 A\uAC00 ${duplicateCount}\uAC1C\uC774\uACE0 \uC11C\uB85C \uB2E4\uB978 \uBB38\uC790\uAC00 ${uniqueCount}\uAC1C\uC77C \uB54C, ${letterTotal}\uAC1C \uBB38\uC790\uB97C \uBAA8\uB450 \uB098\uC5F4\uD558\uB294 \uBC29\uBC95\uC758 \uC218\uB294?`, letterArrangement, `${inlineMath(`\\frac{${letterTotal}!}{${duplicateCount}!}=${letterArrangement}`)}\uC785\uB2C8\uB2E4.`, "\uAC19\uC740 A\uB07C\uB9AC\uC758 \uC790\uB9AC\uBC14\uAFC8\uC740 \uC0C8\uB85C\uC6B4 \uBC30\uC5F4\uC744 \uB9CC\uB4E4\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", countingVisual({ mode: "multiset", groups: [duplicateCount, ...Array(uniqueCount).fill(1)] })),
              mc(`\uC11C\uB85C \uB2E4\uB978 ${circleCount}\uAC1C\uB97C \uC6D0\uD615\uC73C\uB85C \uBC30\uC5F4\uD558\uB294 \uACBD\uC6B0\uC758 \uC218\uB294?`, [`${circleCount}!`, `${circleCount}^2`, `${circleCount - 1}!`, `${circleCount}!/2!`], 2, `\uD68C\uC804\uD558\uC5EC \uAC19\uC740 \uBC30\uC5F4\uC744 \uD558\uB098\uB85C \uBCF4\uBBC0\uB85C (${circleCount}-1)!=${circleArrangement}\uC785\uB2C8\uB2E4.`, "\uC6D0\uC21C\uC5F4\uC740 \uC911\uBCF5\uC21C\uC5F4\uACFC \uB2E4\uB978 \uAE30\uC900\uC73C\uB85C \uC911\uBCF5\uC744 \uC81C\uAC70\uD569\uB2C8\uB2E4.", countingVisual({ mode: "circle", slots: circleCount })),
              sa(`0\uACFC 1\uB85C \uB9CC\uB4E0 ${r}\uC790\uB9AC \uBB38\uC790\uC5F4 \uC911 1\uC774 \uC801\uC5B4\uB3C4 \uD55C \uBC88 \uB098\uC624\uB294 \uBB38\uC790\uC5F4 \uC218\uB294?`, 2 ** r - 1, `\uC804\uCCB4 ${inlineMath(`2^{${r}}`)}\uAC1C\uC5D0\uC11C 0\uB9CC \uC788\uB294 \uD55C \uAC00\uC9C0\uB97C \uBE8D\uB2C8\uB2E4.`, "\uC5EC\uC0AC\uAC74\uC778 '1\uC774 \uD55C \uBC88\uB3C4 \uC5C6\uC74C'\uC744 \uBA3C\uC800 \uC138\uC138\uC694.", countingVisual({ mode: "repeated", choices: 2, slots: r })),
              sa(`${n}\uAC1C\uC758 \uC22B\uC790\uB97C \uC911\uBCF5 \uD5C8\uC6A9\uD558\uC5EC \uB9CC\uB4E0 ${r + 1}\uC790\uB9AC \uBB38\uC790\uC5F4 \uC911 \uCCAB \uC790\uB9AC\uAC00 \uACE0\uC815\uB41C \uACBD\uC6B0\uC758 \uC218\uB294?`, n ** r, `\uCCAB \uC790\uB9AC\uB294 \uACE0\uC815\uB418\uACE0 \uB098\uBA38\uC9C0 ${r}\uC790\uB9AC\uB294 \uAC01\uAC01 ${n}\uAC00\uC9C0\uC774\uBBC0\uB85C ${inlineMath(`${n}^{${r}}=${n ** r}`)}\uC785\uB2C8\uB2E4.`, "\uACE0\uC815\uB41C \uC790\uB9AC\uB294 \uC120\uD0DD\uC9C0 \uACF1\uC5D0\uC11C \uC81C\uC678\uD569\uB2C8\uB2E4.", countingVisual({ mode: "repeated", choices: n, slots: r })),
              sa(`\uAC19\uC740 \uBE68\uAC04 \uACF5 ${a}\uAC1C\uC640 \uAC19\uC740 \uD30C\uB780 \uACF5 ${b}\uAC1C\uB97C \uC77C\uB82C\uB85C \uB193\uB294 \uBC29\uBC95\uC758 \uC218\uB294?`, multiset, `${total}\uC790\uB9AC \uC911 \uBE68\uAC04 \uACF5\uC758 \uC790\uB9AC ${a}\uAC1C\uB97C \uACE0\uB974\uBA74 ${inlineMath(`\\binom{${total}}{${a}}=${multiset}`)}\uC785\uB2C8\uB2E4.`, "\uBE68\uAC04 \uACF5\uC758 \uC790\uB9AC\uB9CC \uC815\uD558\uBA74 \uB098\uBA38\uC9C0\uB294 \uC790\uB3D9\uC73C\uB85C \uD30C\uB780 \uACF5\uC785\uB2C8\uB2E4.", countingVisual({ mode: "multiset", groups: [a, b] })),
              sa(`A ${a}\uAC1C, B ${b}\uAC1C, C ${thirdGroup}\uAC1C\uB97C \uBAA8\uB450 \uB098\uC5F4\uD558\uB294 \uACBD\uC6B0\uC758 \uC218\uB294?`, threeGroupArrangement, `${inlineMath(`\\frac{${threeGroupTotal}!}{${a}!${b}!${thirdGroup}!}=${threeGroupArrangement}`)}\uC785\uB2C8\uB2E4.`, "\uAC01 \uC885\uB958 \uC548\uC5D0\uC11C \uC0DD\uAE30\uB294 \uC911\uBCF5\uC744 \uBAA8\uB450 \uB098\uB215\uB2C8\uB2E4.", countingVisual({ mode: "multiset", groups: [a, b, thirdGroup] })),
              sa(`\uAC19\uC740 \uBB38\uC790 A ${a}\uAC1C, N ${b}\uAC1C\uC640 \uC11C\uB85C \uB2E4\uB978 \uBB38\uC790 1\uAC1C\uB97C \uBAA8\uB450 \uB098\uC5F4\uD558\uB294 \uBC29\uBC95\uC758 \uC218\uB294?`, factorial(total + 1) / (factorial(a) * factorial(b)), `\uC804\uCCB4 ${total + 1}\uAC1C \uC911 A\uB07C\uB9AC\uC640 N\uB07C\uB9AC\uC758 \uC911\uBCF5\uC744 \uB098\uB204\uBA74 ${inlineMath(`\\frac{${total + 1}!}{${a}!${b}!}`)}\uC785\uB2C8\uB2E4.`, "\uAC19\uC740 \uBB38\uC790\uAC00 \uBA87 \uAC1C\uC529 \uC788\uB294\uC9C0 \uBA3C\uC800 \uD45C\uC2DC\uD558\uC138\uC694.", countingVisual({ mode: "multiset", groups: [a, b, 1] }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-01-02",
          unitId: "counting",
          key: "probstat-repeated-combination",
          title: "\uC911\uBCF5\uC870\uD569",
          labels: [
            "\uC911\uBCF5\uC870\uD569 \uACF5\uC2DD",
            "\uC0AC\uD0D5 \uACE0\uB974\uAE30",
            "\uC74C\uC774 \uC544\uB2CC \uD574",
            "\uC801\uC5B4\uB3C4 \uD558\uB098",
            "\uC885\uB958\uBCC4 \uC120\uD0DD",
            "\uBCC4\uACFC \uB9C9\uB300",
            "\uC0C1\uD55C\uC774 \uC788\uB294 \uC120\uD0DD",
            "\uC591\uC758 \uC815\uC218\uD574",
            "\uB450 \uC870\uAC74 \uACB0\uD569",
            "\uC885\uD569 \uC911\uBCF5\uC870\uD569"
          ],
          buildProblems() {
            const n = randomInteger(3, 6);
            const r = randomInteger(2, 5);
            const value = combination(n + r - 1, r);
            const boundedItems = randomInteger(4, 8);
            const boundedValue = 2 * boundedItems + 1;
            const positiveSum = randomInteger(6, 11);
            const positiveValue = combination(positiveSum - 1, 2);
            const requiredItems = randomInteger(4, 8);
            const requiredValue = combination(
              n + requiredItems - 2,
              requiredItems - 1
            );
            const drinkTypes = randomInteger(4, 7);
            const drinkCount = randomInteger(3, 6);
            const drinkValue = combination(
              drinkTypes + drinkCount - 1,
              drinkCount
            );
            return [
              sa(`${n}\uC885\uB958\uC5D0\uC11C \uC911\uBCF5\uC744 \uD5C8\uC6A9\uD558\uC5EC ${r}\uAC1C\uB97C \uACE0\uB974\uB294 \uBC29\uBC95\uC758 \uC218\uB294?`, value, `${inlineMath(`{}_{${n}}H_{${r}}=\\binom{${n + r - 1}}{${r}}=${value}`)}\uC785\uB2C8\uB2E4.`, "\uC911\uBCF5\uC870\uD569\uC744 \uC870\uD569\uC73C\uB85C \uBC14\uAFC0 \uB54C n+r-1\uC744 \uC0AC\uC6A9\uD569\uB2C8\uB2E4.", countingVisual({ mode: "stars-bars", groups: n, items: r })),
              sa(`\uC11C\uB85C \uB2E4\uB978 \uB9DB ${n}\uC885\uB958\uC758 \uC0AC\uD0D5\uC744 \uC911\uBCF5 \uAC00\uB2A5\uD558\uAC8C ${r}\uAC1C \uACE0\uB974\uB294 \uBC29\uBC95\uC758 \uC218\uB294?`, value, `\uB9DB\uBCC4 \uAC1C\uC218\uC758 \uD569\uC774 ${r}\uC778 \uC74C\uC774 \uC544\uB2CC \uC815\uC218\uD574\uC640 \uAC19\uC544 ${value}\uAC00\uC9C0\uC785\uB2C8\uB2E4.`, "\uC0AC\uD0D5\uC744 \uBCC4, \uB9DB \uC0AC\uC774 \uACBD\uACC4\uB97C \uB9C9\uB300\uB85C \uC0DD\uAC01\uD558\uC138\uC694.", countingVisual({ mode: "stars-bars", groups: n, items: r })),
              sa(`${inlineMath(`x_1+x_2+x_3=${r}`)}\uC758 \uC74C\uC774 \uC544\uB2CC \uC815\uC218\uD574\uC758 \uAC1C\uC218\uB294?`, combination(r + 2, 2), `${inlineMath(`\\binom{${r + 2}}{2}`)}\uC785\uB2C8\uB2E4.`, "\uBCC4 r\uAC1C\uC640 \uB9C9\uB300 2\uAC1C\uB97C \uBC30\uC5F4\uD569\uB2C8\uB2E4.", countingVisual({ mode: "stars-bars", groups: 3, items: r })),
              sa(`${inlineMath(`x_1+x_2+x_3=${r + 3}`)}\uC5D0\uC11C \uAC01 ${inlineMath("x_i\\ge1")}\uC778 \uC815\uC218\uD574\uC758 \uAC1C\uC218\uB294?`, combination(r + 2, 2), `\uAC01 \uBCC0\uC218\uC5D0 1\uC529 \uBA3C\uC800 \uC8FC\uBA74 \uB0A8\uC740 \uD569\uC774 ${r}\uC774\uBBC0\uB85C ${inlineMath(`\\binom{${r + 2}}2`)}\uC785\uB2C8\uB2E4.`, "\uCD5C\uC19F\uAC12\uC744 \uBA3C\uC800 \uBC30\uC815\uD55C \uB4A4 \uC74C\uC774 \uC544\uB2CC \uD574\uB85C \uBC14\uAFB8\uC138\uC694.", countingVisual({ mode: "stars-bars", groups: 3, items: r })),
              sa(`\uBE75 ${n}\uC885\uB958\uB97C \uD569\uD558\uC5EC ${r}\uAC1C \uC0AC\uB418, \uC5B4\uB5A4 \uC885\uB958\uB3C4 \uC0AC\uC9C0 \uC54A\uC544\uB3C4 \uB420 \uB54C \uACBD\uC6B0\uC758 \uC218\uB294?`, value, `\uC911\uBCF5\uC870\uD569 ${inlineMath(`{}_${n}H_${r}`)}\uC774\uBBC0\uB85C ${value}\uAC00\uC9C0\uC785\uB2C8\uB2E4.`, "\uC21C\uC11C\uB294 \uC911\uC694\uD558\uC9C0 \uC54A\uACE0 \uAC19\uC740 \uC885\uB958\uB97C \uC5EC\uB7EC \uBC88 \uACE0\uB97C \uC218 \uC788\uC2B5\uB2C8\uB2E4.", countingVisual({ mode: "stars-bars", groups: n, items: r })),
              mc(`\uBCC4\uACFC \uB9C9\uB300\uC5D0\uC11C \uC885\uB958\uAC00 ${n}\uAC1C\uC774\uBA74 \uD544\uC694\uD55C \uB9C9\uB300 \uC218\uB294?`, [`${n - 1}\uAC1C`, `${n}\uAC1C`, `${n + 1}\uAC1C`, "\uC120\uD0DD \uAC1C\uC218\uC640 \uAC19\uB2E4"], 0, `${n}\uAC1C \uAD6C\uC5ED\uC744 \uB9CC\uB4E4\uB824\uBA74 \uB9C9\uB300\uB294 ${n - 1}\uAC1C\uC785\uB2C8\uB2E4.`, "\uC885\uB958 \uC218\uBCF4\uB2E4 \uB9C9\uB300\uAC00 \uD558\uB098 \uC801\uC2B5\uB2C8\uB2E4.", countingVisual({ mode: "stars-bars", groups: n, items: r })),
              sa(`\uC138 \uC885\uB958\uC5D0\uC11C \uC911\uBCF5\uC744 \uD5C8\uC6A9\uD574 ${boundedItems}\uAC1C\uB97C \uACE0\uB974\uB418 \uCCAB \uC885\uB958\uB294 \uCD5C\uB300 1\uAC1C\uC778 \uACBD\uC6B0\uC758 \uC218\uB294?`, boundedValue, `\uCCAB \uC885\uB958\uAC00 0\uAC1C\uC77C \uB54C ${boundedItems + 1}\uAC00\uC9C0, 1\uAC1C\uC77C \uB54C ${boundedItems}\uAC00\uC9C0\uC774\uBBC0\uB85C ${boundedValue}\uAC00\uC9C0\uC785\uB2C8\uB2E4.`, "\uC0C1\uD55C\uC5D0 \uB530\uB77C \uCCAB \uC885\uB958\uC758 \uAC1C\uC218\uB97C 0,1\uB85C \uB098\uB204\uC138\uC694.", countingVisual({ mode: "stars-bars", groups: 3, items: boundedItems })),
              sa(`${inlineMath(`x+y+z=${positiveSum}`)}\uC758 \uC591\uC758 \uC815\uC218\uD574 \uAC1C\uC218\uB294?`, positiveValue, `\uAC01 \uBCC0\uC218\uC5D0 1\uC529 \uC8FC\uBA74 \uB0A8\uC740 \uD569\uC740 ${positiveSum - 3}, \uB530\uB77C\uC11C ${inlineMath(`\\binom{${positiveSum - 1}}2=${positiveValue}`)}\uC785\uB2C8\uB2E4.`, "\uC591\uC758 \uC870\uAC74\uC744 \uC81C\uAC70\uD558\uB824\uBA74 \uAC01 \uBCC0\uC218\uC5D0\uC11C 1\uC744 \uBE7C\uC138\uC694.", countingVisual({ mode: "stars-bars", groups: 3, items: positiveSum - 3 })),
              sa(`${n}\uC885\uB958\uC758 \uACFC\uC77C\uC744 ${requiredItems}\uAC1C \uACE0\uB974\uB418 \uCCAB \uC885\uB958\uB97C \uC801\uC5B4\uB3C4 1\uAC1C \uACE0\uB974\uB294 \uBC29\uBC95\uC758 \uC218\uB294?`, requiredValue, `\uCCAB \uC885\uB958 1\uAC1C\uB97C \uBA3C\uC800 \uACE0\uB978 \uB4A4 ${n}\uC885\uB958\uC5D0\uC11C ${requiredItems - 1}\uAC1C\uB97C \uC911\uBCF5\uC870\uD569\uD558\uBBC0\uB85C ${inlineMath(`\\binom{${n + requiredItems - 2}}{${requiredItems - 1}}=${requiredValue}`)}\uC785\uB2C8\uB2E4.`, "\uD544\uC218 \uAC1C\uC218\uB97C \uBA3C\uC800 \uBC30\uC815\uD558\uC138\uC694.", countingVisual({ mode: "stars-bars", groups: n, items: requiredItems - 1 })),
              sa(`${drinkTypes}\uC885\uB958\uC758 \uC74C\uB8CC\uB97C \uC911\uBCF5 \uD5C8\uC6A9\uD558\uC5EC ${drinkCount}\uAC1C \uACE0\uB974\uB294 \uBC29\uBC95\uC758 \uC218\uB294?`, drinkValue, `${inlineMath(`{}_${drinkTypes}H_${drinkCount}=\\binom{${drinkTypes + drinkCount - 1}}{${drinkCount}}=${drinkValue}`)}\uC785\uB2C8\uB2E4.`, "\uC885\uB958 \uC218\uC640 \uC120\uD0DD \uAC1C\uC218\uB97C \uBCC4\uACFC \uB9C9\uB300\uB85C \uBC14\uAFD4\uBCF4\uC138\uC694.", countingVisual({ mode: "stars-bars", groups: drinkTypes, items: drinkCount }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-01-03",
          unitId: "counting",
          key: "probstat-binomial-theorem",
          title: "\uC774\uD56D\uC815\uB9AC",
          labels: [
            "\uC77C\uBC18\uD56D",
            "\uD2B9\uC815 \uD56D\uC758 \uACC4\uC218",
            "\uC0C1\uC218\uD56D",
            "\uACC4\uC218\uC758 \uD569",
            "\uD640\uC218\uD56D \uACC4\uC218",
            "\uD30C\uC2A4\uCE7C \uC0BC\uAC01\uD615",
            "\uC774\uD56D\uACC4\uC218 \uB300\uCE6D",
            "\uB450 \uD56D\uC758 \uBD80\uD638",
            "\uC911\uC559\uD56D",
            "\uC885\uD569 \uC804\uAC1C"
          ],
          buildProblems() {
            const n = randomInteger(4, 8);
            const k = randomInteger(1, n - 1);
            const coefficient = randomInteger(2, 4);
            const constant = randomInteger(2, 4);
            const power = randomInteger(3, 6);
            const evenPower = 2 * randomInteger(2, 5);
            const signPower = randomInteger(4, 7);
            const signConstant = randomInteger(2, 4);
            const targetPower = randomInteger(
              1,
              signPower - 1
            );
            const signCoefficient = combination(signPower, targetPower) * (-signConstant) ** (signPower - targetPower);
            const squareCoefficient = combination(power, 2) * coefficient ** 2 * (-1) ** (power - 2);
            return [
              mc(`${inlineMath(`(a+b)^{${n}}`)}\uC758 \uC77C\uBC18\uD56D\uC73C\uB85C \uC633\uC740 \uAC83\uC740?`, [inlineMath(`\\binom{${n}}r a^{${n}-r}b^r`), inlineMath(`\\binom{${n}}r a^r b^r`), inlineMath(`${n}a^{${n}-r}b^r`), inlineMath(`a^{${n}}+b^{${n}}`)], 0, "b\uB97C r\uBC88 \uACE0\uB978 \uD56D\uC758 \uACC4\uC218\uB294 \uC774\uD56D\uACC4\uC218\uC774\uACE0 a\uC758 \uC9C0\uC218\uB294 n-r\uC785\uB2C8\uB2E4.", "\uAC01 \uC778\uC218\uC5D0\uC11C b\uB97C \uACE0\uB974\uB294 \uC704\uCE58 r\uAC1C\uB97C \uC120\uD0DD\uD569\uB2C8\uB2E4.", countingVisual({ mode: "pascal", row: n })),
              sa(`${inlineMath(`(x+1)^{${n}}`)}\uC5D0\uC11C ${inlineMath(`x^{${n - k}}`)}\uC758 \uACC4\uC218\uB97C \uAD6C\uD558\uC138\uC694.`, combination(n, k), `\uACC4\uC218\uB294 ${inlineMath(`\\binom{${n}}{${k}}=${combination(n, k)}`)}\uC785\uB2C8\uB2E4.`, "1\uC744 k\uBC88 \uACE0\uB974\uB294 \uD56D\uC744 \uCC3E\uC73C\uC138\uC694.", countingVisual({ mode: "pascal", row: n, focus: k })),
              sa(`${inlineMath(`(${coefficient}x+${constant})^${power}`)}\uC758 \uC0C1\uC218\uD56D\uC744 \uAD6C\uD558\uC138\uC694.`, constant ** power, `x\uAC00 \uB4E4\uC5B4 \uC788\uB294 \uD56D\uC744 \uD55C \uBC88\uB3C4 \uACE0\uB974\uC9C0 \uC54A\uC744 \uB54C \uC0C1\uC218\uD56D\uC740 ${inlineMath(`${constant}^${power}=${constant ** power}`)}\uC785\uB2C8\uB2E4.`, "\uC0C1\uC218\uD56D\uC740 x\uC758 \uC9C0\uC218\uAC00 0\uC778 \uD56D\uC785\uB2C8\uB2E4.", countingVisual({ mode: "pascal", row: power, focus: power })),
              sa(`${inlineMath(`(2x+3)^{${n}}`)}\uC758 \uBAA8\uB4E0 \uACC4\uC218\uC758 \uD569\uC744 \uAD6C\uD558\uC138\uC694.`, 5 ** n, `${inlineMath("x=1")}\uC744 \uB300\uC785\uD558\uBA74 ${inlineMath(`5^{${n}}=${5 ** n}`)}\uC785\uB2C8\uB2E4.`, "\uACC4\uC218\uC758 \uD569\uC740 \uB2E4\uD56D\uC2DD\uC5D0 x=1\uC744 \uB300\uC785\uD55C \uAC12\uC785\uB2C8\uB2E4.", countingVisual({ mode: "pascal", row: n })),
              sa(`${inlineMath(`(1+x)^${evenPower}`)}\uC5D0\uC11C \uD640\uC218\uCC28\uD56D \uACC4\uC218\uC758 \uD569\uC744 \uAD6C\uD558\uC138\uC694.`, 2 ** (evenPower - 1), `${inlineMath(`\\frac{2^${evenPower}-0^${evenPower}}2=${2 ** (evenPower - 1)}`)}\uC785\uB2C8\uB2E4.`, "P(1)\uACFC P(-1)\uC744 \uBE7C\uBA74 \uD640\uC218\uCC28\uD56D\uB9CC \uB450 \uBC30\uB85C \uB0A8\uC2B5\uB2C8\uB2E4.", countingVisual({ mode: "pascal", row: evenPower })),
              sa(`\uD30C\uC2A4\uCE7C\uC758 \uC0BC\uAC01\uD615\uC5D0\uC11C ${n}\uBC88\uC9F8 \uD589(0\uBC88\uC9F8 \uD589\uBD80\uD130 \uC2DC\uC791)\uC758 \uACC4\uC218 \uD569\uC740?`, 2 ** n, `\uC774\uD56D\uACC4\uC218 \uD569\uC740 ${inlineMath(`2^${n}=${2 ** n}`)}\uC785\uB2C8\uB2E4.`, `\uD589\uC758 \uACC4\uC218\uB294 ${inlineMath(`(1+1)^${n}`)}\uC758 \uC804\uAC1C\uACC4\uC218\uC785\uB2C8\uB2E4.`, countingVisual({ mode: "pascal", row: n })),
              mc(`${inlineMath(`\\binom{${n}}{${k}}`)}\uC640 \uD56D\uC0C1 \uAC19\uC740 \uAC83\uC740?`, [inlineMath(`\\binom{${n}}{${n - k}}`), inlineMath(`\\binom{${n - 1}}{${k}}`), inlineMath(`\\binom{${k}}{${n}}`), inlineMath(`${n - k}`)], 0, "\uACE0\uB978 \uAC83\uACFC \uACE0\uB974\uC9C0 \uC54A\uC740 \uAC83\uC744 \uBC14\uAFB8\uC5B4 \uC138\uBA74 \uAC19\uC740 \uAC12\uC785\uB2C8\uB2E4.", "\uC774\uD56D\uACC4\uC218\uC758 \uB300\uCE6D\uC131\uC744 \uB5A0\uC62C\uB9AC\uC138\uC694.", countingVisual({ mode: "pascal", row: n, focus: k })),
              sa(`${inlineMath(`(x-${signConstant})^${signPower}`)}\uC5D0\uC11C ${inlineMath(`x^${targetPower}`)}\uC758 \uACC4\uC218\uB97C \uAD6C\uD558\uC138\uC694.`, signCoefficient, `${inlineMath(`\\binom{${signPower}}{${targetPower}}(-${signConstant})^{${signPower - targetPower}}=${signCoefficient}`)}\uC785\uB2C8\uB2E4.`, `x\uB97C ${targetPower}\uBC88 \uACE0\uB974\uACE0 \uC0C1\uC218\uD56D\uC758 \uBD80\uD638\uB3C4 \uD568\uAED8 \uACC4\uC0B0\uD558\uC138\uC694.`, countingVisual({ mode: "pascal", row: signPower, focus: signPower - targetPower })),
              sa(`${inlineMath(`(x+1)^${evenPower}`)}\uC758 \uC911\uC559\uD56D \uACC4\uC218\uB97C \uAD6C\uD558\uC138\uC694.`, combination(evenPower, evenPower / 2), `\uC911\uC559\uD56D\uC740 r=${evenPower / 2}\uC774\uBBC0\uB85C ${inlineMath(`\\binom{${evenPower}}{${evenPower / 2}}=${combination(evenPower, evenPower / 2)}`)}\uC785\uB2C8\uB2E4.`, "\uC9C0\uC218\uAC00 \uC9DD\uC218\uC774\uBA74 \uAC00\uC6B4\uB370 \uC774\uD56D\uACC4\uC218 \uD558\uB098\uAC00 \uC911\uC559\uC5D0 \uC788\uC2B5\uB2C8\uB2E4.", countingVisual({ mode: "pascal", row: evenPower, focus: evenPower / 2 })),
              sa(`${inlineMath(`(${coefficient}x-1)^${power}`)}\uC5D0\uC11C ${inlineMath("x^2")}\uC758 \uACC4\uC218\uB97C \uAD6C\uD558\uC138\uC694.`, squareCoefficient, `${inlineMath(`\\binom{${power}}2${coefficient}^2(-1)^{${power - 2}}=${squareCoefficient}`)}\uC785\uB2C8\uB2E4.`, `${coefficient}x\uB97C \uB450 \uBC88, -1\uC744 ${power - 2}\uBC88 \uACE0\uB985\uB2C8\uB2E4.`, countingVisual({ mode: "pascal", row: power, focus: power - 2 }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-02-01",
          unitId: "probability",
          key: "probstat-basic-probability",
          title: "\uD655\uB960\uC758 \uAC1C\uB150\uACFC \uAE30\uBCF8 \uC131\uC9C8",
          labels: [
            "\uC218\uD559\uC801 \uD655\uB960",
            "\uC0C1\uB300\uB3C4\uC218",
            "\uD655\uB960\uC758 \uBC94\uC704",
            "\uC804\uCCB4\uC0AC\uAC74",
            "\uACF5\uC0AC\uAC74",
            "\uC8FC\uC0AC\uC704",
            "\uB3D9\uC804",
            "\uD45C\uBCF8\uACF5\uAC04",
            "\uACF5\uC815\uC131",
            "\uC885\uD569 \uD655\uB960"
          ],
          buildProblems() {
            const favorable = randomInteger(1, 5);
            const total = randomInteger(favorable + 1, 12);
            const trialUnit = randomInteger(2, 8);
            const trials = trialUnit * 50;
            const successes = randomInteger(
              trialUnit * 10,
              trialUnit * 40
            );
            const dieThreshold = randomInteger(2, 5);
            const coinTosses = randomInteger(2, 5);
            const spinnerSides = randomInteger(4, 10);
            const cardMultiplier = randomInteger(2, 5);
            const cardTotal = randomInteger(
              2,
              4
            ) * cardMultiplier;
            const multipleCount = Math.floor(
              cardTotal / cardMultiplier
            );
            return [
              sa(`\uB3D9\uC77C\uD558\uAC8C \uC77C\uC5B4\uB0A0 \uAC00\uB2A5\uC131\uC774 \uC788\uB294 ${total}\uAC1C \uACB0\uACFC \uC911 \uC6D0\uD558\uB294 \uACB0\uACFC\uAC00 ${favorable}\uAC1C\uC77C \uB54C \uD655\uB960\uC744 \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694.`, probability(favorable, total), `${inlineMath(`P(A)=\\frac{${favorable}}{${total}}=${round4(favorable / total)}`)}\uC785\uB2C8\uB2E4.`, "\uC720\uB9AC\uD55C \uACBD\uC6B0\uC758 \uC218\uB97C \uC804\uCCB4 \uACBD\uC6B0\uC758 \uC218\uB85C \uB098\uB215\uB2C8\uB2E4.", vennVisual({ total, a: favorable })),
              sa(`\uC5B4\uB5A4 \uC2E4\uD5D8\uC744 ${trials}\uBC88 \uC2DC\uD589\uD574 \uC0AC\uAC74 A\uAC00 ${successes}\uBC88 \uC77C\uC5B4\uB0AC\uC744 \uB54C \uC0C1\uB300\uB3C4\uC218\uB294?`, round4(successes / trials), `${inlineMath(`\\frac{${successes}}{${trials}}=${round4(successes / trials)}`)}\uC785\uB2C8\uB2E4.`, "\uBC1C\uC0DD \uD69F\uC218\uB97C \uC2DC\uD589 \uD69F\uC218\uB85C \uB098\uB204\uC138\uC694.", distributionVisual({ values: [successes / trials, 1 - successes / trials], labels: ["A", "A \uC544\uB2D8"] })),
              mc("\uC0AC\uAC74 A\uC758 \uD655\uB960\uB85C \uAC00\uB2A5\uD55C \uAC12\uC740?", ["-0.2", "0.65", "1.4", "2"], 1, "\uD655\uB960\uC740 \uD56D\uC0C1 0 \uC774\uC0C1 1 \uC774\uD558\uC785\uB2C8\uB2E4.", "\uD655\uB960\uC758 \uBC94\uC704\uB97C \uD655\uC778\uD558\uC138\uC694.", vennVisual({ a: 0.65 })),
              mc("\uD45C\uBCF8\uACF5\uAC04 \uC804\uCCB4\uC778 \uC0AC\uAC74 S\uC758 \uD655\uB960 P(S)\uB294?", ["0", "1", "\uD45C\uBCF8\uC810 \uC218", "\uD56D\uC0C1 1\uBCF4\uB2E4 \uD06C\uB2E4"], 1, "\uBC18\uB4DC\uC2DC \uC77C\uC5B4\uB098\uB294 \uC804\uCCB4\uC0AC\uAC74\uC758 \uD655\uB960\uC740 1\uC785\uB2C8\uB2E4.", "\uBAA8\uB4E0 \uACB0\uACFC\uB97C \uD3EC\uD568\uD558\uB294 \uC0AC\uAC74\uC785\uB2C8\uB2E4.", vennVisual({ total: 1, a: 1 })),
              mc("\uC808\uB300\uB85C \uC77C\uC5B4\uB098\uC9C0 \uC54A\uB294 \uACF5\uC0AC\uAC74\uC758 \uD655\uB960\uC740?", ["0", "1", "-1", "\uC815\uD560 \uC218 \uC5C6\uB2E4"], 0, "\uACF5\uC0AC\uAC74\uC5D0\uB294 \uC720\uB9AC\uD55C \uACB0\uACFC\uAC00 \uC5C6\uC73C\uBBC0\uB85C \uD655\uB960\uC740 0\uC785\uB2C8\uB2E4.", "\uC720\uB9AC\uD55C \uACBD\uC6B0\uC758 \uC218\uAC00 0\uAC1C\uC785\uB2C8\uB2E4.", vennVisual({ total: 1, a: 0 })),
              sa(`\uACF5\uC815\uD55C \uC8FC\uC0AC\uC704\uB97C \uD55C \uBC88 \uB358\uC838 ${dieThreshold} \uC774\uD558\uC758 \uB208\uC774 \uB098\uC62C \uD655\uB960\uC744 \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694.`, round4(dieThreshold / 6), `${dieThreshold}\uAC00\uC9C0 \uB208\uC774 \uC720\uB9AC\uD558\uBBC0\uB85C ${inlineMath(`\\frac{${dieThreshold}}6=${round4(dieThreshold / 6)}`)}\uC785\uB2C8\uB2E4.`, `\uD45C\uBCF8\uACF5\uAC04 {1,2,3,4,5,6}\uC5D0\uC11C ${dieThreshold} \uC774\uD558\uB97C \uD45C\uC2DC\uD558\uC138\uC694.`, vennVisual({ total: 6, a: dieThreshold })),
              sa(`\uACF5\uC815\uD55C \uB3D9\uC804\uC744 ${coinTosses}\uBC88 \uB358\uC838 \uC55E\uBA74\uC774 \uC815\uD655\uD788 \uD55C \uBC88 \uB098\uC62C \uD655\uB960\uC740?`, round4(coinTosses / 2 ** coinTosses), `\uC55E\uBA74\uC758 \uC704\uCE58\uB97C ${coinTosses}\uACF3 \uC911 \uD558\uB098 \uACE0\uB974\uBBC0\uB85C ${inlineMath(`\\frac{${coinTosses}}{2^${coinTosses}}=${round4(coinTosses / 2 ** coinTosses)}`)}\uC785\uB2C8\uB2E4.`, "\uC55E\uBA74\uC774 \uB098\uC624\uB294 \uC704\uCE58\uB97C \uACE0\uB974\uACE0 \uC804\uCCB4 \uACB0\uACFC \uC218\uB85C \uB098\uB204\uC138\uC694.", treeVisual({ levels: coinTosses, probability: 0.5 })),
              sa(`${spinnerSides}\uCE78\uC774 \uAC19\uC740 \uD06C\uAE30\uB85C \uB098\uB25C \uACF5\uC815\uD55C \uD68C\uC804\uD310\uC744 \uD55C \uBC88 \uB3CC\uB9AC\uB294 \uC2E4\uD5D8\uC758 \uD45C\uBCF8\uACF5\uAC04 \uC6D0\uC18C \uC218\uB294?`, spinnerSides, `\uAC00\uB2A5\uD55C \uCE78\uC740 \uBAA8\uB450 ${spinnerSides}\uAC1C\uC785\uB2C8\uB2E4.`, "\uAC00\uB2A5\uD55C \uACB0\uACFC\uB97C \uBE60\uC9D0\uC5C6\uC774 \uB098\uC5F4\uD558\uC138\uC694.", vennVisual({ total: spinnerSides, a: 0 })),
              mc("\uBAA8\uB4E0 \uACB0\uACFC\uAC00 \uAC19\uC740 \uAC00\uB2A5\uC131\uC744 \uAC00\uC9C8 \uB54C \uC0AC\uC6A9\uD560 \uC218 \uC788\uB294 \uD655\uB960 \uC815\uC758\uB294?", ["\uC218\uD559\uC801 \uD655\uB960", "\uC870\uAC74\uBD80\uD655\uB960", "\uD45C\uBCF8\uD3C9\uADE0", "\uD45C\uC900\uD3B8\uCC28"], 0, "\uB3D9\uB4F1 \uAC00\uB2A5\uC131\uC774 \uD655\uBCF4\uB418\uBA74 \uACBD\uC6B0\uC758 \uC218 \uBE44\uB85C \uC218\uD559\uC801 \uD655\uB960\uC744 \uAD6C\uD569\uB2C8\uB2E4.", "\uC804\uCCB4 \uACB0\uACFC\uAC00 \uAC19\uC740 \uAC00\uB2A5\uC131\uC778\uC9C0\uAC00 \uD575\uC2EC\uC785\uB2C8\uB2E4.", vennVisual({ total: 8, a: 3 })),
              sa(`1\uBD80\uD130 ${cardTotal}\uAE4C\uC9C0 \uC801\uD78C \uCE74\uB4DC \uC911 \uD55C \uC7A5\uC744 \uBF51\uC544 ${cardMultiplier}\uC758 \uBC30\uC218\uAC00 \uB098\uC62C \uD655\uB960\uC744 \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694.`, round4(multipleCount / cardTotal), `\uC720\uB9AC\uD55C \uCE74\uB4DC\uB294 ${multipleCount}\uC7A5\uC774\uBBC0\uB85C ${inlineMath(`\\frac{${multipleCount}}{${cardTotal}}=${round4(multipleCount / cardTotal)}`)}\uC785\uB2C8\uB2E4.`, "\uC720\uB9AC\uD55C \uCE74\uB4DC\uB97C \uBA3C\uC800 \uB098\uC5F4\uD558\uC138\uC694.", vennVisual({ total: cardTotal, a: multipleCount }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-02-02",
          unitId: "probability",
          key: "probstat-addition-rule",
          title: "\uD655\uB960\uC758 \uB367\uC148\uC815\uB9AC",
          labels: [
            "\uD569\uC0AC\uAC74",
            "\uAD50\uC9D1\uD569 \uBE7C\uAE30",
            "\uBC30\uBC18\uC0AC\uAC74",
            "\uB450 \uC870\uAC74",
            "\uBCA4\uB2E4\uC774\uC5B4\uADF8\uB7A8",
            "\uC8FC\uC0AC\uC704 \uD569\uC0AC\uAC74",
            "\uCE74\uB4DC \uD569\uC0AC\uAC74",
            "\uD655\uB960 \uC5ED\uC0B0",
            "\uC138 \uC601\uC5ED \uC77D\uAE30",
            "\uC885\uD569 \uB367\uC148\uC815\uB9AC"
          ],
          buildProblems() {
            const aOnly = randomInteger(1, 3) / 10;
            const bOnly = randomInteger(1, 3) / 10;
            const intersection = randomInteger(1, 2) / 10;
            const pa = round4(aOnly + intersection);
            const pb = round4(bOnly + intersection);
            const union = round4(pa + pb - intersection);
            const disjointA = randomInteger(2, 5) / 10;
            const disjointB = randomInteger(1, 9 - disjointA * 10) / 10;
            const contextTotal = randomInteger(8, 10) * 10;
            const contextA = randomInteger(20, 35);
            const contextB = randomInteger(15, 30);
            const contextBoth = randomInteger(
              5,
              Math.min(contextA, contextB, 10)
            );
            const cardTotal = randomInteger(8, 15);
            const cardA = randomInteger(2, cardTotal - 4);
            const cardB = randomInteger(2, cardTotal - cardA);
            const cardBoth = randomInteger(
              1,
              Math.min(cardA, cardB)
            );
            return [
              sa(`P(A)=${pa}, P(B)=${pb}, P(A\u2229B)=${intersection}\uC77C \uB54C P(A\u222AB)\uB294?`, union, `${inlineMath(`P(A\\cup B)=${pa}+${pb}-${intersection}=${union}`)}\uC785\uB2C8\uB2E4.`, "\uACB9\uCE58\uB294 \uBD80\uBD84\uC740 \uB450 \uBC88 \uB354\uD574\uC84C\uC73C\uBBC0\uB85C \uD55C \uBC88 \uBE8D\uB2C8\uB2E4.", vennVisual({ a: pa, b: pb, intersection })),
              sa(`P(A)=${pa}, P(B)=${pb}, P(A\u2229B)=${intersection}\uC77C \uB54C P(A\u222AB)\uB294?`, union, `${pa}+${pb}-${intersection}=${union}\uC785\uB2C8\uB2E4.`, "A\uC640 B\uC758 \uACB9\uCE68\uC744 \uBE7C\uC138\uC694.", vennVisual({ a: pa, b: pb, intersection })),
              sa(`A\uC640 B\uAC00 \uBC30\uBC18\uC774\uACE0 P(A)=${disjointA}, P(B)=${disjointB}\uC77C \uB54C P(A\u222AB)\uB294?`, round4(disjointA + disjointB), `\uBC30\uBC18\uC774\uBA74 \uAD50\uC9D1\uD569 \uD655\uB960\uC774 0\uC774\uBBC0\uB85C ${disjointA}+${disjointB}=${round4(disjointA + disjointB)}\uC785\uB2C8\uB2E4.`, "\uBC30\uBC18\uC0AC\uAC74\uC740 \uACB9\uCE58\uB294 \uC601\uC5ED\uC774 \uC5C6\uC2B5\uB2C8\uB2E4.", vennVisual({ a: disjointA, b: disjointB, intersection: 0 })),
              sa(`${contextTotal}\uBA85 \uC911 A\uC5D0 \uC18D\uD55C \uD559\uC0DD\uC774 ${contextA}\uBA85, B\uC5D0 \uC18D\uD55C \uD559\uC0DD\uC774 ${contextB}\uBA85\uC774\uACE0 \uB458 \uB2E4 \uC18D\uD55C \uD559\uC0DD\uC774 ${contextBoth}\uBA85\uC77C \uB54C \uC801\uC5B4\uB3C4 \uD558\uB098\uC5D0 \uC18D\uD560 \uD655\uB960\uC740?`, round4((contextA + contextB - contextBoth) / contextTotal), `\uD569\uC9D1\uD569 \uC778\uC6D0\uC740 ${contextA}+${contextB}-${contextBoth}=${contextA + contextB - contextBoth}\uBA85\uC774\uBBC0\uB85C \uD655\uB960\uC740 ${round4((contextA + contextB - contextBoth) / contextTotal)}\uC785\uB2C8\uB2E4.`, "\uB458 \uB2E4 \uC18D\uD55C \uD559\uC0DD\uC740 \uD55C \uBC88\uB9CC \uC138\uC5B4\uC57C \uD569\uB2C8\uB2E4.", vennVisual({ total: contextTotal, a: contextA, b: contextB, intersection: contextBoth })),
              mc("P(A\u222AB)\uB97C \uB098\uD0C0\uB0B4\uB294 \uC2DD\uC740?", ["P(A)+P(B)", "P(A)+P(B)-P(A\u2229B)", "P(A)P(B)", "1-P(A)"], 1, "\uB367\uC148\uC815\uB9AC\uB294 \uAD50\uC9D1\uD569\uC744 \uD55C \uBC88 \uBE8D\uB2C8\uB2E4.", "\uBCA4\uB2E4\uC774\uC5B4\uADF8\uB7A8\uC5D0\uC11C \uACB9\uCE68\uC774 \uBA87 \uBC88 \uC138\uC5B4\uC84C\uB294\uC9C0 \uBCF4\uC138\uC694.", vennVisual({ a: 0.5, b: 0.4, intersection: 0.2 })),
              sa(`\uC804\uCCB4 ${cardTotal}\uAC1C\uC758 \uAC19\uC740 \uAC00\uB2A5\uC131 \uACB0\uACFC\uC5D0\uC11C A\uAC00 ${cardA}\uAC1C, B\uAC00 ${cardB}\uAC1C, \uB450 \uC0AC\uAC74\uC5D0 \uBAA8\uB450 \uC18D\uD55C \uACB0\uACFC\uAC00 ${cardBoth}\uAC1C\uC77C \uB54C \uD569\uC0AC\uAC74\uC758 \uD655\uB960\uC740?`, round4((cardA + cardB - cardBoth) / cardTotal), `\uC720\uB9AC\uD55C \uACB0\uACFC\uB294 ${cardA}+${cardB}-${cardBoth}=${cardA + cardB - cardBoth}\uAC1C\uC785\uB2C8\uB2E4.`, "\uAD50\uC9D1\uD569\uC5D0 \uC18D\uD55C \uACB0\uACFC\uB294 \uD55C \uBC88\uB9CC \uC149\uB2C8\uB2E4.", vennVisual({ total: cardTotal, a: cardA, b: cardB, intersection: cardBoth })),
              sa(`1\uBD80\uD130 ${cardTotal}\uAE4C\uC9C0\uC758 \uCE74\uB4DC\uC5D0\uC11C \uC0AC\uAC74 A\uC5D0 ${cardA}\uC7A5, \uC0AC\uAC74 B\uC5D0 ${cardB}\uC7A5, \uB450 \uC0AC\uAC74\uC5D0 \uBAA8\uB450 ${cardBoth}\uC7A5\uC774 \uC18D\uD560 \uB54C A \uB610\uB294 B\uC778 \uCE74\uB4DC\uB97C \uBF51\uC744 \uD655\uB960\uC740?`, round4((cardA + cardB - cardBoth) / cardTotal), `${inlineMath(`\\frac{${cardA}+${cardB}-${cardBoth}}{${cardTotal}}=${round4((cardA + cardB - cardBoth) / cardTotal)}`)}\uC785\uB2C8\uB2E4.`, "\uACB9\uCE58\uB294 \uCE74\uB4DC\uB294 \uD55C \uBC88\uB9CC \uC149\uB2C8\uB2E4.", vennVisual({ total: cardTotal, a: cardA, b: cardB, intersection: cardBoth })),
              sa(`P(A\u222AB)=${union}, P(A)=${pa}, P(B)=${pb}\uC77C \uB54C P(A\u2229B)\uB294?`, intersection, `P(A\u2229B)=${pa}+${pb}-${union}=${intersection}\uC785\uB2C8\uB2E4.`, "\uB367\uC148\uC815\uB9AC\uB97C \uAD50\uC9D1\uD569\uC5D0 \uB300\uD574 \uC815\uB9AC\uD558\uC138\uC694.", vennVisual({ a: pa, b: pb, intersection })),
              sa(`A\uB9CC\uC758 \uD655\uB960\uC774 ${aOnly}, B\uB9CC\uC758 \uD655\uB960\uC774 ${bOnly}, \uAD50\uC9D1\uD569 \uD655\uB960\uC774 ${intersection}\uC77C \uB54C P(A\u222AB)\uB294?`, union, `\uC11C\uB85C \uACB9\uCE58\uC9C0 \uC54A\uB294 \uC138 \uC601\uC5ED\uC744 \uB354\uD574 ${union}\uC785\uB2C8\uB2E4.`, "A\uB9CC, \uACB9\uCE68, B\uB9CC\uC744 \uAC01\uAC01 \uD55C \uBC88\uC529 \uB354\uD558\uC138\uC694.", vennVisual({ aOnly, bOnly, intersection })),
              sa(`P(A)=${pa}, P(B)=${pb}\uC774\uACE0 P(A\u222AB)=${union}\uC77C \uB54C P(A\u2229B)\uB294?`, intersection, `${pa}+${pb}-${union}=${intersection}\uC785\uB2C8\uB2E4.`, "\uD569\uC0AC\uAC74 \uC2DD\uC744 \uAD50\uC9D1\uD569 \uD655\uB960\uC5D0 \uB300\uD574 \uD480\uC5B4\uBCF4\uC138\uC694.", vennVisual({ a: pa, b: pb, intersection }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-02-03",
          unitId: "probability",
          key: "probstat-complement",
          title: "\uC5EC\uC0AC\uAC74\uC758 \uD655\uB960",
          labels: [
            "\uC5EC\uC0AC\uAC74 \uACF5\uC2DD",
            "\uC801\uC5B4\uB3C4 \uD558\uB098",
            "\uD55C \uBC88\uB3C4 \uC5C6\uC74C",
            "\uCD5C\uB300 \uC870\uAC74",
            "\uC8FC\uC0AC\uC704 \uBC18\uBCF5",
            "\uBD88\uB7C9\uD488",
            "\uC0DD\uC77C \uC870\uAC74",
            "\uD569\uACA9 \uD655\uB960",
            "\uBC94\uC704\uC758 \uC5EC\uC0AC\uAC74",
            "\uC885\uD569 \uC5EC\uC0AC\uAC74"
          ],
          buildProblems() {
            const p = randomInteger(1, 8) / 10;
            const repeatedP = randomInteger(1, 7) / 10;
            const repeatedN = randomInteger(2, 6);
            const threshold = randomInteger(2, 5);
            const dieRepeats = randomInteger(2, 5);
            const defectRate = randomInteger(1, 8) / 100;
            const productCount = randomInteger(3, 8);
            const passProbability = randomInteger(55, 90) / 100;
            const cardMultiple = randomInteger(2, 6);
            const cardTotal = cardMultiple * randomInteger(3, 6);
            const notProbability = randomInteger(1, 8) / 10;
            return [
              sa(`P(A)=${p}\uC77C \uB54C P(A\u1D9C)\uB294?`, round4(1 - p), `${inlineMath(`P(A^c)=1-${p}=${round4(1 - p)}`)}\uC785\uB2C8\uB2E4.`, "\uC0AC\uAC74\uACFC \uC5EC\uC0AC\uAC74\uC740 \uD45C\uBCF8\uACF5\uAC04 \uC804\uCCB4\uB97C \uB098\uB215\uB2C8\uB2E4.", vennVisual({ a: p, complement: true })),
              sa(`\uC131\uACF5 \uD655\uB960\uC774 ${repeatedP}\uC778 \uC2DC\uD589\uC744 ${repeatedN}\uBC88 \uB3C5\uB9BD\uC801\uC73C\uB85C \uD560 \uB54C \uC801\uC5B4\uB3C4 \uD55C \uBC88 \uC131\uACF5\uD560 \uD655\uB960\uC740?`, round4(1 - (1 - repeatedP) ** repeatedN), `\uD55C \uBC88\uB3C4 \uC131\uACF5\uD558\uC9C0 \uC54A\uC744 \uD655\uB960 ${inlineMath(`(1-${repeatedP})^${repeatedN}`)}\uC744 1\uC5D0\uC11C \uBE7C\uBA74 ${round4(1 - (1 - repeatedP) ** repeatedN)}\uC785\uB2C8\uB2E4.`, "'\uC801\uC5B4\uB3C4 \uD55C \uBC88'\uC758 \uC5EC\uC0AC\uAC74\uC740 '\uD55C \uBC88\uB3C4 \uC5C6\uC74C'\uC785\uB2C8\uB2E4.", treeVisual({ levels: repeatedN, probability: repeatedP, complement: true })),
              sa(`\uC55E\uBA74 \uD655\uB960\uC774 ${repeatedP}\uC778 \uB3D9\uC804\uC744 ${repeatedN}\uBC88 \uB358\uC838 \uC55E\uBA74\uC774 \uD55C \uBC88\uB3C4 \uC548 \uB098\uC62C \uD655\uB960\uC740?`, round4((1 - repeatedP) ** repeatedN), `${inlineMath(`(1-${repeatedP})^${repeatedN}=${round4((1 - repeatedP) ** repeatedN)}`)}\uC785\uB2C8\uB2E4.`, "\uBAA8\uB4E0 \uC2DC\uD589\uC5D0\uC11C \uC55E\uBA74\uC774 \uB098\uC624\uC9C0 \uC54A\uC544\uC57C \uD569\uB2C8\uB2E4.", treeVisual({ levels: repeatedN, probability: repeatedP })),
              sa(`\uC8FC\uC0AC\uC704\uB97C ${repeatedN}\uBC88 \uB358\uC838 \uB098\uC628 \uB208\uC774 \uBAA8\uB450 ${threshold} \uC774\uD558\uC77C \uD655\uB960\uC740?`, round4((threshold / 6) ** repeatedN), `${inlineMath(`(${threshold}/6)^${repeatedN}=${round4((threshold / 6) ** repeatedN)}`)}\uC785\uB2C8\uB2E4.`, `\uAC01 \uC2DC\uD589\uC5D0\uC11C \uD5C8\uC6A9\uB418\uB294 \uB208\uC740 1\uBD80\uD130 ${threshold}\uAE4C\uC9C0\uC785\uB2C8\uB2E4.`, treeVisual({ levels: repeatedN, probability: threshold / 6 })),
              sa(`\uC8FC\uC0AC\uC704\uB97C ${dieRepeats}\uBC88 \uB358\uC838 6\uC774 \uC801\uC5B4\uB3C4 \uD55C \uBC88 \uB098\uC62C \uD655\uB960\uC744 \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694.`, round4(1 - (5 / 6) ** dieRepeats), `${inlineMath(`1-(5/6)^${dieRepeats}=${round4(1 - (5 / 6) ** dieRepeats)}`)}\uC785\uB2C8\uB2E4.`, "6\uC774 \uD55C \uBC88\uB3C4 \uB098\uC624\uC9C0 \uC54A\uB294 \uACBD\uC6B0\uB97C \uBE7C\uC138\uC694.", treeVisual({ levels: dieRepeats, probability: 1 / 6, complement: true })),
              sa(`\uBD88\uB7C9\uB960\uC774 ${defectRate}\uC778 \uC81C\uD488 ${productCount}\uAC1C\uAC00 \uB3C5\uB9BD\uC77C \uB54C \uC801\uC5B4\uB3C4 \uD558\uB098\uAC00 \uBD88\uB7C9\uC77C \uD655\uB960\uC744 \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694.`, round4(1 - (1 - defectRate) ** productCount), `${inlineMath(`1-(1-${defectRate})^${productCount}=${round4(1 - (1 - defectRate) ** productCount)}`)}\uC785\uB2C8\uB2E4.`, "\uBAA8\uB450 \uC815\uC0C1\uC77C \uD655\uB960\uC758 \uC5EC\uC0AC\uAC74\uC785\uB2C8\uB2E4.", treeVisual({ levels: productCount, probability: defectRate, complement: true })),
              mc("'\uC801\uC5B4\uB3C4 \uB450 \uC0AC\uB78C\uC774 \uAC19\uC740 \uC0DD\uC77C'\uC758 \uC5EC\uC0AC\uAC74\uC740?", ["\uBAA8\uB450 \uC0DD\uC77C\uC774 \uB2E4\uB974\uB2E4", "\uBAA8\uB450 \uC0DD\uC77C\uC774 \uAC19\uB2E4", "\uC815\uD655\uD788 \uB450 \uBA85\uB9CC \uAC19\uB2E4", "\uD55C \uBA85\uB9CC \uC0DD\uC77C\uC774 \uC788\uB2E4"], 0, "\uAC19\uC740 \uC0DD\uC77C \uC30D\uC774 \uD558\uB098\uB3C4 \uC5C6\uB2E4\uB294 \uAC83\uC740 \uBAA8\uB450 \uB2E4\uB974\uB2E4\uB294 \uB73B\uC785\uB2C8\uB2E4.", "\uC801\uC5B4\uB3C4 \uD558\uB098\uC758 \uCDA9\uB3CC\uC774 \uC5C6\uB2E4\uACE0 \uBC14\uAFD4 \uB9D0\uD558\uC138\uC694.", vennVisual({ complement: true })),
              sa(`\uC2DC\uD5D8\uC5D0 \uD569\uACA9\uD560 \uD655\uB960\uC774 ${passProbability}\uC77C \uB54C \uBD88\uD569\uACA9\uD560 \uD655\uB960\uC740?`, round4(1 - passProbability), `1-${passProbability}=${round4(1 - passProbability)}\uC785\uB2C8\uB2E4.`, "\uD569\uACA9\uACFC \uBD88\uD569\uACA9\uC740 \uC11C\uB85C \uC5EC\uC0AC\uAC74\uC785\uB2C8\uB2E4.", vennVisual({ a: passProbability, complement: true })),
              sa(`1\uBD80\uD130 ${cardTotal} \uCE74\uB4DC \uC911 ${cardMultiple}\uC758 \uBC30\uC218\uAC00 \uC544\uB2CC \uCE74\uB4DC\uB97C \uBF51\uC744 \uD655\uB960\uC740?`, round4(1 - 1 / cardMultiple), `${cardMultiple}\uC758 \uBC30\uC218\uB294 ${cardTotal / cardMultiple}\uAC1C\uC774\uBBC0\uB85C ${inlineMath(`1-\\frac{${cardTotal / cardMultiple}}{${cardTotal}}=${round4(1 - 1 / cardMultiple)}`)}\uC785\uB2C8\uB2E4.`, `\uBA3C\uC800 ${cardMultiple}\uC758 \uBC30\uC218 \uD655\uB960\uC744 \uAD6C\uD558\uC138\uC694.`, vennVisual({ total: cardTotal, a: cardTotal / cardMultiple, complement: true })),
              sa(`\uC5B4\uB5A4 \uC0AC\uAC74\uC774 \uC77C\uC5B4\uB098\uC9C0 \uC54A\uC744 \uD655\uB960\uC774 ${notProbability}\uC77C \uB54C \uADF8 \uC0AC\uAC74\uC774 \uC77C\uC5B4\uB0A0 \uD655\uB960\uC740?`, round4(1 - notProbability), `1-${notProbability}=${round4(1 - notProbability)}\uC785\uB2C8\uB2E4.`, "\uC0AC\uAC74\uACFC \uC5EC\uC0AC\uAC74\uC758 \uD655\uB960 \uD569\uC740 1\uC785\uB2C8\uB2E4.", vennVisual({ a: 1 - notProbability, complement: true }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-02-04",
          unitId: "probability",
          key: "probstat-conditional-probability",
          title: "\uC870\uAC74\uBD80\uD655\uB960",
          labels: [
            "\uC870\uAC74\uBD80\uD655\uB960 \uACF5\uC2DD",
            "\uD45C\uBCF8\uACF5\uAC04 \uCD95\uC18C",
            "\uD45C\uC5D0\uC11C \uACC4\uC0B0",
            "\uCE74\uB4DC \uC870\uAC74",
            "\uC8FC\uC0AC\uC704 \uC870\uAC74",
            "\uAC80\uC0AC \uACB0\uACFC",
            "\uC870\uAC74 \uC5ED\uC0B0",
            "\uB098\uBB34\uB3C4\uD45C",
            "\uC778\uACFC \uC624\uD574",
            "\uC885\uD569 \uC870\uAC74\uBD80\uD655\uB960"
          ],
          buildProblems() {
            const conditionProbability = randomInteger(3, 8) / 10;
            const withinRatio = randomInteger(2, 8) / 10;
            const jointProbability = round4(
              conditionProbability * withinRatio
            );
            const conditionCount = randomInteger(2, 8) * 10;
            const jointCount = randomInteger(
              1,
              conditionCount / 10 - 1
            ) * 10;
            const groupCount = randomInteger(15, 40);
            const favorableCount = randomInteger(
              3,
              groupCount - 2
            );
            const dieConditionCount = randomInteger(3, 6);
            const prevalence = randomInteger(1, 4) / 10;
            const sensitivity = randomInteger(6, 9) / 10;
            const firstPath = randomInteger(2, 7) / 10;
            const secondPath = randomInteger(2, 8) / 10;
            return [
              sa(`P(A\u2229B)=${jointProbability}, P(B)=${conditionProbability}\uC77C \uB54C P(A|B)\uB294?`, withinRatio, `${inlineMath(`P(A|B)=${jointProbability}/${conditionProbability}=${withinRatio}`)}\uC785\uB2C8\uB2E4.`, "\uC870\uAC74 B\uAC00 \uC0C8 \uD45C\uBCF8\uACF5\uAC04\uC758 \uC804\uCCB4\uAC00 \uB429\uB2C8\uB2E4.", vennVisual({ b: conditionProbability, intersection: jointProbability, conditional: "B" })),
              sa(`${conditionCount + randomInteger(10, 50)}\uBA85 \uC911 \uC870\uAC74 B\uC5D0 \uC18D\uD55C \uD559\uC0DD\uC774 ${conditionCount}\uBA85\uC774\uACE0, \uADF8\uC911 ${jointCount}\uBA85\uC774 \uC0AC\uAC74 A\uC5D0 \uC18D\uD55C\uB2E4. B\uB77C\uB294 \uC870\uAC74\uC5D0\uC11C A\uC77C \uD655\uB960\uC740?`, round4(jointCount / conditionCount), `\uC870\uAC74\uC5D0 \uB9DE\uB294 ${conditionCount}\uBA85\uB9CC \uB0A8\uAE30\uACE0 ${inlineMath(`\\frac{${jointCount}}{${conditionCount}}=${round4(jointCount / conditionCount)}`)}\uC785\uB2C8\uB2E4.`, "\uC804\uCCB4 \uC778\uC6D0\uC774 \uC544\uB2C8\uB77C \uC870\uAC74 \uC9D1\uB2E8\uC758 \uC778\uC6D0\uC774 \uBD84\uBAA8\uC785\uB2C8\uB2E4.", vennVisual({ b: conditionCount, intersection: jointCount, conditional: "B" })),
              sa(`\uD55C \uC9D1\uB2E8 ${groupCount}\uBA85 \uC911 \uD2B9\uC815 \uD65C\uB3D9\uC744 \uC88B\uC544\uD558\uB294 \uC0AC\uB78C\uC774 ${favorableCount}\uBA85\uC77C \uB54C, \uC774 \uC9D1\uB2E8\uC5D0 \uC18D\uD55C\uB2E4\uB294 \uC870\uAC74\uC5D0\uC11C \uD65C\uB3D9\uC744 \uC88B\uC544\uD560 \uD655\uB960\uC740?`, round4(favorableCount / groupCount), `${inlineMath(`\\frac{${favorableCount}}{${groupCount}}=${round4(favorableCount / groupCount)}`)}\uC785\uB2C8\uB2E4.`, "\uC870\uAC74 \uC9D1\uB2E8 \uC548\uC5D0\uC11C\uC758 \uBE44\uC728\uC744 \uAD6C\uD558\uC138\uC694.", vennVisual({ b: groupCount, intersection: favorableCount, conditional: "B" })),
              sa(`\uC870\uAC74 B\uC5D0 \uD574\uB2F9\uD558\uB294 \uCE74\uB4DC\uAC00 ${conditionCount}\uC7A5\uC774\uACE0 \uADF8\uC911 \uC0AC\uAC74 A\uC5D0\uB3C4 \uC18D\uD558\uB294 \uCE74\uB4DC\uAC00 ${jointCount}\uC7A5\uC77C \uB54C P(A|B)\uB294?`, round4(jointCount / conditionCount), `${inlineMath(`\\frac{${jointCount}}{${conditionCount}}=${round4(jointCount / conditionCount)}`)}\uC785\uB2C8\uB2E4.`, "\uC870\uAC74 B\uC758 \uCE74\uB4DC\uB9CC \uB0A8\uACA8 \uC0C8 \uD45C\uBCF8\uACF5\uAC04\uC744 \uB9CC\uB4DC\uC138\uC694.", vennVisual({ b: conditionCount, intersection: jointCount, conditional: "B" })),
              sa(`\uC870\uAC74\uC744 \uB9CC\uC871\uD558\uB294 \uC8FC\uC0AC\uC704 \uACB0\uACFC\uAC00 ${dieConditionCount}\uAC1C\uC774\uACE0 \uADF8\uC911 \uC0AC\uAC74 A\uC5D0 \uC18D\uD558\uB294 \uACB0\uACFC\uAC00 2\uAC1C\uC77C \uB54C \uC870\uAC74\uBD80\uD655\uB960\uC744 \uAD6C\uD558\uC138\uC694.`, round4(2 / dieConditionCount), `${inlineMath(`\\frac2{${dieConditionCount}}=${round4(2 / dieConditionCount)}`)}\uC785\uB2C8\uB2E4.`, "\uC870\uAC74\uC744 \uB9CC\uC871\uD558\uB294 \uB208\uBD80\uD130 \uB098\uC5F4\uD558\uC138\uC694.", vennVisual({ b: dieConditionCount, intersection: 2, conditional: "B" })),
              sa(`\uC9C8\uBCD1 \uC720\uBCD1\uB960\uC774 ${prevalence}\uC774\uACE0, \uD658\uC790\uAC00 \uC591\uC131\uC77C \uD655\uB960\uC774 ${sensitivity}\uC77C \uB54C \uD658\uC790\uC774\uBA74\uC11C \uC591\uC131\uC77C \uD655\uB960\uC740?`, round4(prevalence * sensitivity), `${prevalence}\xD7${sensitivity}=${round4(prevalence * sensitivity)}\uC785\uB2C8\uB2E4.`, "P(\uD658\uC790\u2229\uC591\uC131)=P(\uD658\uC790)P(\uC591\uC131|\uD658\uC790)\uC785\uB2C8\uB2E4.", treeVisual({ first: prevalence, conditional: sensitivity })),
              sa(`P(A|B)=${withinRatio}, P(B)=${conditionProbability}\uC77C \uB54C P(A\u2229B)\uB294?`, jointProbability, `${withinRatio}\xD7${conditionProbability}=${jointProbability}\uC785\uB2C8\uB2E4.`, "\uC870\uAC74\uBD80\uD655\uB960 \uACF5\uC2DD\uC744 \uAD50\uC9D1\uD569\uC5D0 \uB300\uD574 \uC815\uB9AC\uD558\uC138\uC694.", vennVisual({ b: conditionProbability, intersection: jointProbability, conditional: "B" })),
              sa(`\uCCAB \uC0C1\uC790 \uC120\uD0DD \uD655\uB960\uC774 ${firstPath}\uC774\uACE0, \uADF8 \uC0C1\uC790\uC5D0\uC11C \uBE68\uAC04 \uACF5\uC744 \uBF51\uC744 \uC870\uAC74\uBD80\uD655\uB960\uC774 ${secondPath}\uC77C \uB54C \uADF8 \uACBD\uB85C\uC758 \uD655\uB960\uC740?`, round4(firstPath * secondPath), `\uB098\uBB34\uC758 \uD55C \uACBD\uB85C\uB294 ${firstPath}\xD7${secondPath}=${round4(firstPath * secondPath)}\uC785\uB2C8\uB2E4.`, "\uD55C \uACBD\uB85C\uC758 \uAC00\uC9C0 \uD655\uB960\uC744 \uACF1\uD558\uC138\uC694.", treeVisual({ first: firstPath, conditional: secondPath })),
              mc("P(A|B)\uAC00 \uD06C\uB2E4\uB294 \uC0AC\uC2E4\uB9CC\uC73C\uB85C \uB9D0\uD560 \uC218 \uC5C6\uB294 \uAC83\uC740?", ["B\uC778 \uACBD\uC6B0 A\uC758 \uBE44\uC728\uC774 \uD06C\uB2E4", "B\uAC00 A\uC758 \uC6D0\uC778\uC774\uB2E4", "\uD45C\uBCF8\uACF5\uAC04\uC774 B\uB85C \uC904\uC5C8\uB2E4", "P(A\u2229B)/P(B)\uB85C \uACC4\uC0B0\uD55C\uB2E4"], 1, "\uC870\uAC74\uBD80\uD655\uB960\uC740 \uC5F0\uAD00\uC744 \uB098\uD0C0\uB0B4\uC9C0\uB9CC \uC778\uACFC\uAD00\uACC4\uB97C \uC790\uB3D9\uC73C\uB85C \uB73B\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", "\uC2DC\uAC04 \uC21C\uC11C\uB098 \uC6D0\uC778\uC744 \uD655\uB960\uC2DD\uB9CC\uC73C\uB85C \uB2E8\uC815\uD560 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.", vennVisual({ conditional: "B" })),
              sa(`P(A\u2229B)=${jointProbability}, P(B)=${conditionProbability}\uC77C \uB54C P(A|B)\uB294?`, withinRatio, `${jointProbability}/${conditionProbability}=${withinRatio}\uC785\uB2C8\uB2E4.`, "\uC774\uBC88\uC5D0\uB294 B\uAC00 \uC870\uAC74\uC774\uBBC0\uB85C \uBD84\uBAA8\uAC00 P(B)\uC785\uB2C8\uB2E4.", vennVisual({ b: conditionProbability, intersection: jointProbability, conditional: "B" }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-02-05",
          unitId: "probability",
          key: "probstat-independence",
          title: "\uC0AC\uAC74\uC758 \uB3C5\uB9BD\uACFC \uC885\uC18D",
          labels: [
            "\uB3C5\uB9BD \uD310\uC815",
            "\uC870\uAC74\uBD80\uD655\uB960 \uD310\uC815",
            "\uC885\uC18D \uD310\uC815",
            "\uB3D9\uC804 \uC2DC\uD589",
            "\uBE44\uBCF5\uC6D0 \uCD94\uCD9C",
            "\uBCF5\uC6D0 \uCD94\uCD9C",
            "\uB3C5\uB9BD\uC758 \uACF1",
            "\uBC30\uBC18\uACFC \uB3C5\uB9BD",
            "\uD45C \uC790\uB8CC \uD310\uC815",
            "\uC885\uD569 \uB3C5\uB9BD\uC131"
          ],
          buildProblems() {
            const independentA = randomInteger(2, 7) / 10;
            const independentB = randomInteger(2, 7) / 10;
            const independentIntersection = round4(independentA * independentB);
            const independentUnion = round4(
              independentA + independentB - independentIntersection
            );
            return [
              mc("P(A)=0.4, P(B)=0.5, P(A\u2229B)=0.2\uC77C \uB54C \uB450 \uC0AC\uAC74\uC758 \uAD00\uACC4\uB294?", ["\uB3C5\uB9BD", "\uC885\uC18D", "\uBC30\uBC18", "\uD310\uB2E8 \uBD88\uAC00"], 0, "0.4\xD70.5=0.2\uC774\uBBC0\uB85C \uB3C5\uB9BD\uC785\uB2C8\uB2E4.", "\uAD50\uC9D1\uD569 \uD655\uB960\uACFC \uB450 \uD655\uB960\uC758 \uACF1\uC744 \uBE44\uAD50\uD558\uC138\uC694.", vennVisual({ a: 0.4, b: 0.5, intersection: 0.2 })),
              mc("P(A|B)=P(A)\uC774\uACE0 P(B)>0\uC77C \uB54C A\uC640 B\uC758 \uAD00\uACC4\uB294?", ["\uB3C5\uB9BD", "\uC885\uC18D", "\uBC30\uBC18", "\uC5EC\uC0AC\uAC74"], 0, "B\uAC00 \uC77C\uC5B4\uB098\uB3C4 A\uC758 \uD655\uB960\uC774 \uBC14\uB00C\uC9C0 \uC54A\uC73C\uBBC0\uB85C \uB3C5\uB9BD\uC785\uB2C8\uB2E4.", "\uC870\uAC74\uC774 \uC815\uBCF4\uB97C \uC8FC\uC5C8\uC744 \uB54C \uD655\uB960\uC774 \uBCC0\uD558\uB294\uC9C0 \uBCF4\uC138\uC694.", vennVisual({ independent: true })),
              mc("P(A)=0.5, P(B)=0.4, P(A\u2229B)=0.3\uC77C \uB54C \uB450 \uC0AC\uAC74\uC758 \uAD00\uACC4\uB294?", ["\uB3C5\uB9BD", "\uC885\uC18D", "\uBC30\uBC18", "\uC5EC\uC0AC\uAC74"], 1, "0.5\xD70.4=0.2\uC774\uC9C0\uB9CC \uAD50\uC9D1\uD569\uC740 0.3\uC774\uBBC0\uB85C \uC885\uC18D\uC785\uB2C8\uB2E4.", "\uB3C5\uB9BD\uC774\uB77C\uBA74 \uAD50\uC9D1\uD569\uC740 \uACF1\uACFC \uAC19\uC544\uC57C \uD569\uB2C8\uB2E4.", vennVisual({ a: 0.5, b: 0.4, intersection: 0.3 })),
              mc("\uACF5\uC815\uD55C \uB3D9\uC804\uC744 \uB450 \uBC88 \uB358\uC9C8 \uB54C \uCCAB \uBC88\uC9F8\uAC00 \uC55E\uBA74\uC778 \uC0AC\uAC74\uACFC \uB450 \uBC88\uC9F8\uAC00 \uC55E\uBA74\uC778 \uC0AC\uAC74\uC758 \uAD00\uACC4\uB294?", ["\uB3C5\uB9BD", "\uC885\uC18D", "\uBC30\uBC18", "\uAC19\uC740 \uC0AC\uAC74"], 0, "\uCCAB \uC2DC\uD589 \uACB0\uACFC\uB294 \uB458\uC9F8 \uC2DC\uD589\uC758 \uD655\uB960\uC744 \uBC14\uAFB8\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", "\uC11C\uB85C \uB2E4\uB978 \uB3C5\uB9BD \uC2DC\uD589\uC785\uB2C8\uB2E4.", treeVisual({ levels: 2, probability: 0.5 })),
              mc("\uC8FC\uBA38\uB2C8\uC5D0\uC11C \uACF5\uC744 \uBE44\uBCF5\uC6D0\uC73C\uB85C \uB450 \uBC88 \uBF51\uC744 \uB54C \uCCAB \uACB0\uACFC\uC640 \uB458\uC9F8 \uACB0\uACFC\uB294 \uC77C\uBC18\uC801\uC73C\uB85C?", ["\uB3C5\uB9BD", "\uC885\uC18D", "\uBC30\uBC18", "\uC5EC\uC0AC\uAC74"], 1, "\uCCAB \uACF5\uC744 \uBE7C\uBA74 \uC8FC\uBA38\uB2C8 \uAD6C\uC131\uC774 \uBC14\uB00C\uBBC0\uB85C \uB458\uC9F8 \uD655\uB960\uC774 \uBCC0\uD569\uB2C8\uB2E4.", "\uCCAB \uC2DC\uD589 \uB4A4 \uC804\uCCB4 \uAC1C\uC218\uAC00 \uC904\uC5B4\uB4ED\uB2C8\uB2E4.", treeVisual({ withoutReplacement: true })),
              mc("\uACF5\uC744 \uBF51\uACE0 \uB2E4\uC2DC \uB123\uC740 \uB4A4 \uB450 \uBC88\uC9F8 \uACF5\uC744 \uBF51\uC73C\uBA74 \uB450 \uC2DC\uD589\uC740?", ["\uB3C5\uB9BD", "\uC885\uC18D", "\uBC30\uBC18", "\uBD88\uAC00\uB2A5"], 0, "\uBCF5\uC6D0\uD558\uBA74 \uC8FC\uBA38\uB2C8 \uAD6C\uC131\uC774 \uC6D0\uB798\uB300\uB85C \uB3CC\uC544\uC640 \uD655\uB960\uC774 \uBCC0\uD558\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", "\uB450 \uBC88\uC9F8 \uC2DC\uD589 \uC804\uC5D0 \uC0C1\uD0DC\uAC00 \uBCF5\uAD6C\uB429\uB2C8\uB2E4.", treeVisual({ replacement: true })),
              sa(`\uB3C5\uB9BD\uC778 A, B\uC5D0 \uB300\uD574 P(A)=${independentA}, P(B)=${independentB}\uC77C \uB54C P(A\u2229B)\uB294?`, independentIntersection, `\uB3C5\uB9BD\uC774\uBBC0\uB85C ${independentA}\xD7${independentB}=${independentIntersection}\uC785\uB2C8\uB2E4.`, "\uB3C5\uB9BD \uC0AC\uAC74\uC758 \uAD50\uC9D1\uD569 \uD655\uB960\uC740 \uACF1\uC785\uB2C8\uB2E4.", vennVisual({ a: independentA, b: independentB, intersection: independentIntersection })),
              mc("\uD655\uB960\uC774 \uBAA8\uB450 \uC591\uC218\uC778 \uB450 \uBC30\uBC18\uC0AC\uAC74\uC740 \uB3C5\uB9BD\uC778\uAC00?", ["\uD56D\uC0C1 \uB3C5\uB9BD", "\uB3C5\uB9BD\uC774 \uC544\uB2C8\uB2E4", "\uD56D\uC0C1 \uAC19\uC740 \uC0AC\uAC74", "\uD310\uB2E8 \uBD88\uAC00"], 1, "\uBC30\uBC18\uC774\uBA74 \uAD50\uC9D1\uD569\uC740 0\uC774\uC9C0\uB9CC \uD655\uB960\uC758 \uACF1\uC740 \uC591\uC218\uB77C \uAC19\uC9C0 \uC54A\uC2B5\uB2C8\uB2E4.", "\uBC30\uBC18\uACFC \uB3C5\uB9BD\uC740 \uC11C\uB85C \uB2E4\uB978 \uAC1C\uB150\uC785\uB2C8\uB2E4.", vennVisual({ intersection: 0 })),
              mc("\uC804\uCCB4 100\uBA85 \uC911 A 40\uBA85, B 50\uBA85, \uB458 \uB2E4 20\uBA85\uC77C \uB54C A\uC640 B\uB294?", ["\uB3C5\uB9BD", "\uC885\uC18D", "\uBC30\uBC18", "\uC5EC\uC0AC\uAC74"], 0, "P(A\u2229B)=0.2\uC774\uACE0 P(A)P(B)=0.4\xD70.5=0.2\uC785\uB2C8\uB2E4.", "\uBE48\uB3C4\uB97C \uD655\uB960\uB85C \uBC14\uAFD4 \uACF1\uACFC \uBE44\uAD50\uD558\uC138\uC694.", vennVisual({ total: 100, a: 40, b: 50, intersection: 20 })),
              sa(`\uB3C5\uB9BD\uC778 A\uC640 B\uC5D0 \uB300\uD574 P(A\u222AB)=${independentUnion}, P(A)=${independentA}, P(B)=${independentB}\uC77C \uB54C P(A\u2229B)\uB294?`, independentIntersection, `\uB3C5\uB9BD\uC774\uBBC0\uB85C ${independentA}\xD7${independentB}=${independentIntersection}\uC774\uACE0 \uB367\uC148\uC815\uB9AC\uC640\uB3C4 \uC77C\uCE58\uD569\uB2C8\uB2E4.`, "\uB3C5\uB9BD \uC870\uAC74\uC744 \uBA3C\uC800 \uC0AC\uC6A9\uD558\uC138\uC694.", vennVisual({ a: independentA, b: independentB, intersection: independentIntersection }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-02-06",
          unitId: "probability",
          key: "probstat-multiplication-rule",
          title: "\uD655\uB960\uC758 \uACF1\uC148\uC815\uB9AC",
          labels: [
            "\uACF1\uC148\uC815\uB9AC",
            "\uC5F0\uC18D \uCD94\uCD9C",
            "\uB098\uBB34 \uACBD\uB85C",
            "\uB3C5\uB9BD \uC2DC\uD589",
            "\uBE44\uBCF5\uC6D0",
            "\uB450 \uACBD\uB85C \uD569",
            "\uC870\uAC74\uBD80\uD655\uB960 \uD65C\uC6A9",
            "\uC138 \uB2E8\uACC4 \uACBD\uB85C",
            "\uC5ED\uC0B0",
            "\uC885\uD569 \uACF1\uC148\uC815\uB9AC"
          ],
          buildProblems() {
            const first = randomInteger(2, 8) / 10;
            const conditional = randomInteger(2, 8) / 10;
            const pathProbability = round4(
              first * conditional
            );
            const red = randomInteger(3, 7);
            const blue = randomInteger(2, 6);
            const ballTotal = red + blue;
            const branchA = randomInteger(2, 6) / 10;
            const successA = randomInteger(2, 8) / 10;
            const successB = randomInteger(2, 8) / 10;
            const threePath = [
              randomInteger(2, 8) / 10,
              randomInteger(2, 8) / 10,
              randomInteger(2, 8) / 10
            ];
            const tosses = randomInteger(2, 5);
            return [
              sa(`P(A)=${first}, P(B|A)=${conditional}\uC77C \uB54C P(A\u2229B)\uB294?`, pathProbability, `${first}\xD7${conditional}=${pathProbability}\uC785\uB2C8\uB2E4.`, "\uCCAB \uC0AC\uAC74 \uD655\uB960\uACFC \uADF8 \uB4A4 \uC870\uAC74\uBD80\uD655\uB960\uC744 \uACF1\uD569\uB2C8\uB2E4.", treeVisual({ first, conditional })),
              sa(`\uBE68\uAC04 \uACF5 ${red}\uAC1C, \uD30C\uB780 \uACF5 ${blue}\uAC1C\uC5D0\uC11C \uBE44\uBCF5\uC6D0\uC73C\uB85C \uBE68\uAC04 \uACF5\uC744 \uC5F0\uC18D \uB450 \uBC88 \uBF51\uC744 \uD655\uB960\uC740?`, round4(red / ballTotal * ((red - 1) / (ballTotal - 1))), `${inlineMath(`\\frac{${red}}{${ballTotal}}\\times\\frac{${red - 1}}{${ballTotal - 1}}=${round4(red / ballTotal * ((red - 1) / (ballTotal - 1)))}`)}\uC785\uB2C8\uB2E4.`, "\uCCAB \uBE68\uAC04 \uACF5\uC744 \uBF51\uC740 \uB4A4 \uBE68\uAC04 \uACF5\uACFC \uC804\uCCB4 \uACF5\uC774 \uBAA8\uB450 \uD558\uB098\uC529 \uC904\uC5B4\uB4ED\uB2C8\uB2E4.", treeVisual({ withoutReplacement: true, first: red / ballTotal, conditional: (red - 1) / (ballTotal - 1) })),
              sa(`\uB098\uBB34\uB3C4\uD45C\uC5D0\uC11C \uD55C \uACBD\uB85C\uC758 \uAC00\uC9C0 \uD655\uB960\uC774 ${first}\uC640 ${conditional}\uC77C \uB54C \uACBD\uB85C \uD655\uB960\uC740?`, pathProbability, `${first}\xD7${conditional}=${pathProbability}\uC785\uB2C8\uB2E4.`, "\uD55C \uACBD\uB85C\uC5D0\uC11C\uB294 \uAC00\uC9C0\uB97C \uACF1\uD569\uB2C8\uB2E4.", treeVisual({ first, conditional })),
              sa(`\uC131\uACF5\uD655\uB960 ${conditional}\uC778 \uB3C5\uB9BD \uC2DC\uD589\uC744 ${tosses}\uBC88 \uBAA8\uB450 \uC131\uACF5\uD560 \uD655\uB960\uC740?`, round4(conditional ** tosses), `${inlineMath(`${conditional}^${tosses}=${round4(conditional ** tosses)}`)}\uC785\uB2C8\uB2E4.`, "\uB3C5\uB9BD \uC2DC\uD589\uC758 \uAC19\uC740 \uACBD\uB85C \uD655\uB960\uC744 \uACF1\uD558\uC138\uC694.", treeVisual({ levels: tosses, probability: conditional })),
              sa(`${ballTotal}\uAC1C \uC911 \uBD88\uB7C9\uD488 ${blue}\uAC1C\uB97C \uBE44\uBCF5\uC6D0\uC73C\uB85C \uB450 \uAC1C \uBF51\uC544 \uBAA8\uB450 \uBD88\uB7C9\uC77C \uD655\uB960\uC744 \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694.`, round4(blue / ballTotal * ((blue - 1) / (ballTotal - 1))), `${inlineMath(`\\frac{${blue}}{${ballTotal}}\\times\\frac{${blue - 1}}{${ballTotal - 1}}=${round4(blue / ballTotal * ((blue - 1) / (ballTotal - 1)))}`)}\uC785\uB2C8\uB2E4.`, "\uCCAB \uBD88\uB7C9\uD488\uC744 \uBF51\uC740 \uB4A4 \uB0A8\uC740 \uBD88\uB7C9\uD488\uC740 \uD558\uB098 \uC904\uC5B4\uB4ED\uB2C8\uB2E4.", treeVisual({ withoutReplacement: true, first: blue / ballTotal, conditional: (blue - 1) / (ballTotal - 1) })),
              sa(`\uC0C1\uC790 A\uB97C \uACE0\uB97C \uD655\uB960\uC774 ${branchA}, A\uC5D0\uC11C \uC131\uACF5\uD560 \uD655\uB960\uC774 ${successA}, \uC0C1\uC790 B\uC5D0\uC11C \uC131\uACF5\uD560 \uD655\uB960\uC774 ${successB}\uC77C \uB54C \uC804\uCCB4 \uC131\uACF5\uD655\uB960\uC740?`, round4(branchA * successA + (1 - branchA) * successB), `\uB450 \uC131\uACF5 \uACBD\uB85C\uB97C \uB354\uD574 ${inlineMath(`${branchA}\\cdot${successA}+${round4(1 - branchA)}\\cdot${successB}=${round4(branchA * successA + (1 - branchA) * successB)}`)}\uC785\uB2C8\uB2E4.`, "\uACBD\uB85C \uC548\uC5D0\uC11C\uB294 \uACF1\uD558\uACE0, \uC11C\uB85C \uB2E4\uB978 \uACBD\uB85C\uB07C\uB9AC\uB294 \uB354\uD569\uB2C8\uB2E4.", treeVisual({ paths: [[branchA, successA], [1 - branchA, successB]] })),
              sa(`P(A\u2229B)=${pathProbability}, P(A)=${first}\uC77C \uB54C P(B|A)\uB294?`, conditional, `${pathProbability}/${first}=${conditional}\uC785\uB2C8\uB2E4.`, "\uACF1\uC148\uC815\uB9AC\uB97C \uC870\uAC74\uBD80\uD655\uB960\uC5D0 \uB300\uD574 \uC815\uB9AC\uD558\uC138\uC694.", treeVisual({ first, conditional })),
              sa(`\uC138 \uB2E8\uACC4 \uACBD\uB85C\uC758 \uD655\uB960\uC774 \uAC01\uAC01 ${threePath.join(", ")}\uC77C \uB54C \uC804\uCCB4 \uACBD\uB85C \uD655\uB960\uC740?`, round4(threePath.reduce((value, item) => value * item, 1)), `${threePath.join("\xD7")}=${round4(threePath.reduce((value, item) => value * item, 1))}\uC785\uB2C8\uB2E4.`, "\uAC19\uC740 \uACBD\uB85C\uC5D0 \uB193\uC778 \uBAA8\uB4E0 \uAC00\uC9C0\uB97C \uACF1\uD569\uB2C8\uB2E4.", treeVisual({ path: threePath })),
              sa(`P(A\u2229B)=${pathProbability}, P(B|A)=${conditional}\uC77C \uB54C P(A)\uB294?`, first, `P(A)=${pathProbability}/${conditional}=${first}\uC785\uB2C8\uB2E4.`, "P(A\u2229B)=P(A)P(B|A)\uB97C \uC0AC\uC6A9\uD558\uC138\uC694.", treeVisual({ first, conditional })),
              sa(`\uACF5\uC815\uD55C \uB3D9\uC804\uC744 ${tosses}\uBC88 \uB358\uC838 \uBBF8\uB9AC \uC815\uD55C \uD55C \uAC00\uC9C0 \uC21C\uC11C\uB85C \uB098\uC62C \uD655\uB960\uC740?`, round4((1 / 2) ** tosses), `${inlineMath(`(1/2)^${tosses}=${round4((1 / 2) ** tosses)}`)}\uC785\uB2C8\uB2E4.`, "\uC815\uD574\uC9C4 \uD55C \uACBD\uB85C\uC758 \uAC00\uC9C0 \uD655\uB960\uC744 \uBAA8\uB450 \uACF1\uD569\uB2C8\uB2E4.", treeVisual({ path: Array(tosses).fill(0.5) }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-03-01",
          unitId: "statistics",
          key: "probstat-random-variable",
          title: "\uD655\uB960\uBCC0\uC218\uC640 \uD655\uB960\uBD84\uD3EC",
          labels: [
            "\uD655\uB960\uBCC0\uC218 \uB73B",
            "\uBD84\uD3EC\uD45C \uC644\uC131",
            "\uD655\uB960\uC758 \uD569",
            "\uD568\uC22B\uAC12 \uD655\uB960",
            "\uB204\uC801\uD655\uB960",
            "\uC8FC\uC0AC\uC704 \uD655\uB960\uBCC0\uC218",
            "\uB3D9\uC804 \uD655\uB960\uBCC0\uC218",
            "\uBBF8\uC9C0 \uD655\uB960",
            "\uBD84\uD3EC \uD310\uC815",
            "\uC885\uD569 \uBD84\uD3EC"
          ],
          buildProblems() {
            const p1 = randomInteger(1, 3) / 10;
            const p2 = randomInteger(
              1,
              8 - Math.round(p1 * 10)
            ) / 10;
            const p3 = round4(1 - p1 - p2);
            const dieFocus = randomInteger(1, 6);
            const coinTosses = randomInteger(2, 5);
            const coinHeads = randomInteger(
              1,
              coinTosses - 1
            );
            const weight = randomInteger(2, 5);
            const symmetricValue = randomInteger(1, 5);
            const symmetricProbability = randomInteger(1, 4) / 10;
            return [
              mc("\uD655\uB960\uBCC0\uC218 X\uC5D0 \uB300\uD55C \uC124\uBA85\uC73C\uB85C \uC633\uC740 \uAC83\uC740?", ["\uD45C\uBCF8\uACF5\uAC04\uC758 \uACB0\uACFC\uB97C \uC218\uC5D0 \uB300\uC751\uC2DC\uD0A4\uB294 \uD568\uC218", "\uD56D\uC0C1 \uC5F0\uC18D\uC778 \uD568\uC218", "\uD655\uB960 \uADF8 \uC790\uCCB4", "\uD45C\uBCF8\uC758 \uAC1C\uC218"], 0, "\uD655\uB960\uBCC0\uC218\uB294 \uAC01 \uACB0\uACFC\uB97C \uC2E4\uC218\uAC12\uC5D0 \uB300\uC751\uC2DC\uD0A4\uB294 \uD568\uC218\uC785\uB2C8\uB2E4.", "\uACB0\uACFC\uB97C \uC22B\uC790\uB85C \uBC14\uAFB8\uB294 \uADDC\uCE59\uC774\uB77C\uACE0 \uC0DD\uAC01\uD558\uC138\uC694.", distributionVisual({ values: [0, 1, 2], probabilities: [0.2, 0.5, 0.3] })),
              sa(`P(X=0)=${p1}, P(X=1)=${p2}\uC77C \uB54C P(X=2)\uB294?`, p3, `\uD655\uB960\uC758 \uD569\uC774 1\uC774\uBBC0\uB85C 1-${p1}-${p2}=${p3}\uC785\uB2C8\uB2E4.`, "\uBD84\uD3EC\uD45C\uC758 \uBAA8\uB4E0 \uD655\uB960\uC744 \uB354\uD558\uBA74 1\uC785\uB2C8\uB2E4.", distributionVisual({ values: [0, 1, 2], probabilities: [p1, p2, p3] })),
              sa(`X\uAC00 1,2,3\uC744 \uAC01\uAC01 \uD655\uB960 ${p1}, ${p2}, ${p3}\uC73C\uB85C \uAC00\uC9C8 \uB54C \uD655\uB960\uC758 \uD569\uC740?`, 1, `${p1}+${p2}+${p3}=1\uC785\uB2C8\uB2E4.`, "\uC644\uC804\uD55C \uD655\uB960\uBD84\uD3EC\uC758 \uB9C9\uB300 \uB192\uC774 \uD569\uC744 \uBCF4\uC138\uC694.", distributionVisual({ values: [1, 2, 3], probabilities: [p1, p2, p3] })),
              sa(`P(X=1)=${p1}, P(X=2)=${p2}, P(X=3)=${p3}\uC77C \uB54C P(X\u22652)\uB294?`, round4(p2 + p3), `${p2}+${p3}=${round4(p2 + p3)}\uC785\uB2C8\uB2E4.`, "\uC870\uAC74\uC744 \uB9CC\uC871\uD558\uB294 \uB9C9\uB300\uC758 \uD655\uB960\uB9CC \uB354\uD558\uC138\uC694.", distributionVisual({ values: [1, 2, 3], probabilities: [p1, p2, p3], focusFrom: 2 })),
              sa(`P(X=1)=${p1}, P(X=2)=${p2}, P(X=3)=${p3}\uC77C \uB54C P(X\u22642)\uB294?`, round4(p1 + p2), `${p1}+${p2}=${round4(p1 + p2)}\uC785\uB2C8\uB2E4.`, "2 \uC774\uD558\uC758 \uB9C9\uB300\uB97C \uBAA8\uB450 \uB354\uD569\uB2C8\uB2E4.", distributionVisual({ values: [1, 2, 3], probabilities: [p1, p2, p3], focusTo: 2 })),
              sa(`\uC8FC\uC0AC\uC704\uB97C \uD55C \uBC88 \uB358\uC838 X\uB97C \uB098\uC628 \uB208\uC774\uB77C \uD560 \uB54C P(X=${dieFocus})\uB294?`, probability(1, 6), "\uAC01 \uB208\uC740 \uB3D9\uC77C\uD558\uAC8C 1/6\uC785\uB2C8\uB2E4.", `X=${dieFocus}\uC5D0 \uD574\uB2F9\uD558\uB294 \uD45C\uBCF8\uC810\uC740 \uD558\uB098\uC785\uB2C8\uB2E4.`, distributionVisual({ values: [1, 2, 3, 4, 5, 6], probabilities: Array(6).fill(1 / 6), focus: dieFocus })),
              sa(`\uB3D9\uC804\uC744 ${coinTosses}\uBC88 \uB358\uC838 X\uB97C \uC55E\uBA74 \uC218\uB77C \uD560 \uB54C P(X=${coinHeads})\uB294?`, binomialProbability(coinTosses, 0.5, coinHeads), `${inlineMath(`\\binom{${coinTosses}}{${coinHeads}}(0.5)^${coinTosses}=${binomialProbability(coinTosses, 0.5, coinHeads)}`)}\uC785\uB2C8\uB2E4.`, `X=${coinHeads}\uC774 \uB418\uB294 \uC55E\uBA74 \uC704\uCE58\uB97C \uACE0\uB974\uC138\uC694.`, distributionVisual({ values: Array.from({ length: coinTosses + 1 }, (_, index) => index), probabilities: Array.from({ length: coinTosses + 1 }, (_, index) => binomialProbability(coinTosses, 0.5, index)), focus: coinHeads })),
              sa(`P(X=0)=a, P(X=1)=${weight}a, P(X=2)=a\uC77C \uB54C a\uB294?`, round4(1 / (weight + 2)), `a+${weight}a+a=1\uC774\uBBC0\uB85C a=${round4(1 / (weight + 2))}\uC785\uB2C8\uB2E4.`, "\uBAA8\uB4E0 \uD655\uB960\uC758 \uD569\uC774 1\uC774\uB77C\uB294 \uC2DD\uC744 \uC138\uC6B0\uC138\uC694.", distributionVisual({ values: [0, 1, 2], probabilities: [1 / (weight + 2), weight / (weight + 2), 1 / (weight + 2)] })),
              mc("\uD655\uB960\uBD84\uD3EC\uAC00 \uB420 \uC218 \uC5C6\uB294 \uAC83\uC740?", ["0.2, 0.3, 0.5", "0.1, 0.1, 0.8", "-0.1, 0.5, 0.6", "0, 0.4, 0.6"], 2, "\uD655\uB960\uC740 \uC74C\uC218\uAC00 \uB420 \uC218 \uC5C6\uC2B5\uB2C8\uB2E4.", "\uAC01 \uAC12\uC758 \uBC94\uC704\uC640 \uC804\uCCB4 \uD569\uC744 \uBAA8\uB450 \uD655\uC778\uD558\uC138\uC694.", distributionVisual({ values: [0, 1, 2], probabilities: [-0.1, 0.5, 0.6] })),
              sa(`X\uC758 \uAC12\uC774 -${symmetricValue},0,${symmetricValue}\uC774\uACE0 \uD655\uB960\uC774 \uAC01\uAC01 ${symmetricProbability},${round4(1 - 2 * symmetricProbability)},${symmetricProbability}\uC77C \uB54C P(|X|=${symmetricValue})\uB294?`, round4(2 * symmetricProbability), `\uC591 \uB05D \uD655\uB960\uC744 \uB354\uD574 ${round4(2 * symmetricProbability)}\uC785\uB2C8\uB2E4.`, `|X|=${symmetricValue}\uAC00 \uB418\uB294 \uB450 \uB9C9\uB300\uB97C \uACE0\uB974\uC138\uC694.`, distributionVisual({ values: [-symmetricValue, 0, symmetricValue], probabilities: [symmetricProbability, 1 - 2 * symmetricProbability, symmetricProbability], focusValues: [-symmetricValue, symmetricValue] }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-03-02",
          unitId: "statistics",
          key: "probstat-expectation-deviation",
          title: "\uC774\uC0B0\uD655\uB960\uBCC0\uC218\uC758 \uAE30\uB313\uAC12\uACFC \uD45C\uC900\uD3B8\uCC28",
          labels: [
            "\uAE30\uB313\uAC12",
            "\uBD84\uC0B0",
            "\uD45C\uC900\uD3B8\uCC28",
            "\uC120\uD615\uBCC0\uD658 \uD3C9\uADE0",
            "\uC120\uD615\uBCC0\uD658 \uBD84\uC0B0",
            "\uACF5\uC815\uD55C \uAC8C\uC784",
            "\uBBF8\uC9C0 \uD655\uB960 \uD3C9\uADE0",
            "\uD3B8\uCC28 \uC81C\uACF1",
            "\uB450 \uC810 \uBD84\uD3EC",
            "\uC885\uD569 \uD1B5\uACC4\uB7C9"
          ],
          buildProblems() {
            const highValue = randomInteger(2, 6);
            const values = [0, 1, highValue];
            const firstProbability = randomInteger(1, 3) / 10;
            const secondProbability = randomInteger(2, 5) / 10;
            const thirdProbability = round4(
              1 - firstProbability - secondProbability
            );
            const probabilities = [
              firstProbability,
              secondProbability,
              thirdProbability
            ];
            const mean = round4(
              values.reduce(
                (sum, value, index) => sum + value * probabilities[index],
                0
              )
            );
            const variance = round4(
              values.reduce(
                (sum, value, index) => sum + (value - mean) ** 2 * probabilities[index],
                0
              )
            );
            const standardDeviation = randomInteger(1, 4);
            const baseMean = randomInteger(1, 6);
            const scale = randomInteger(2, 4);
            const shift = randomInteger(-3, 6);
            const baseVariance = randomInteger(1, 6);
            const win = randomInteger(5, 15) * 100;
            const loss = randomInteger(1, 8) * 100;
            const twoPointHigh = randomInteger(2, 8);
            const highProbability = randomInteger(2, 8) / 10;
            const deviationMean = randomInteger(-2, 5);
            const deviationValue = deviationMean + randomInteger(2, 6);
            const low = randomInteger(-3, 3);
            const high = low + 2 * randomInteger(1, 5);
            const midpoint = (low + high) / 2;
            const twoPointVariance = ((high - low) / 2) ** 2;
            return [
              sa(`X\uAC00 ${values.join(",")}\uB97C \uD655\uB960 ${probabilities.join(",")}\uB85C \uAC00\uC9C8 \uB54C E(X)\uB294?`, mean, `\uAC01 \uAC12\uC5D0 \uD655\uB960\uC744 \uACF1\uD574 \uB354\uD558\uBA74 ${mean}\uC785\uB2C8\uB2E4.`, "\uAC01 \uAC12\uC5D0 \uADF8 \uD655\uB960\uC744 \uACF1\uD574 \uBAA8\uB450 \uB354\uD558\uC138\uC694.", distributionVisual({ values, probabilities, mean })),
              sa(`X\uAC00 ${values.join(",")}\uB97C \uD655\uB960 ${probabilities.join(",")}\uB85C \uAC00\uC9C8 \uB54C V(X)\uB97C \uAD6C\uD558\uC138\uC694.`, variance, `\uD3C9\uADE0 ${mean}\uC744 \uAE30\uC900\uC73C\uB85C \uD3B8\uCC28 \uC81C\uACF1\uC744 \uAC00\uC911\uD3C9\uADE0\uD558\uBA74 ${variance}\uC785\uB2C8\uB2E4.`, "E(X\xB2)-[E(X)]\xB2\uC744 \uACC4\uC0B0\uD558\uC138\uC694.", distributionVisual({ values, probabilities, mean, variance })),
              sa(`V(X)=${standardDeviation ** 2}\uC77C \uB54C \uD45C\uC900\uD3B8\uCC28 \u03C3(X)\uB294?`, standardDeviation, `\uD45C\uC900\uD3B8\uCC28\uB294 \uBD84\uC0B0\uC758 \uC591\uC758 \uC81C\uACF1\uADFC\uC774\uBBC0\uB85C ${standardDeviation}\uC785\uB2C8\uB2E4.`, "\uD45C\uC900\uD3B8\uCC28\uB294 \uC74C\uC218\uAC00 \uC544\uB2D9\uB2C8\uB2E4.", distributionVisual({ variance: standardDeviation ** 2 })),
              sa(`E(X)=${baseMean}\uC77C \uB54C E(${scale}X${shift >= 0 ? `+${shift}` : shift})\uB294?`, scale * baseMean + shift, `E(${scale}X${shift >= 0 ? `+${shift}` : shift})=${scale}E(X)${shift >= 0 ? `+${shift}` : shift}=${scale * baseMean + shift}\uC785\uB2C8\uB2E4.`, "\uD3C9\uADE0\uC5D0\uB294 \uACF1\uACFC \uB354\uD558\uAE30\uAC00 \uBAA8\uB450 \uBC18\uC601\uB429\uB2C8\uB2E4.", distributionVisual({ mean: baseMean, transformedMean: scale * baseMean + shift })),
              sa(`V(X)=${baseVariance}\uC77C \uB54C V(${scale}X${shift >= 0 ? `+${shift}` : shift})\uB294?`, scale ** 2 * baseVariance, `\uC0C1\uC218 \uC774\uB3D9\uC740 \uBD84\uC0B0\uC744 \uBC14\uAFB8\uC9C0 \uC54A\uACE0 \uBC30\uC728\uC758 \uC81C\uACF1\uC744 \uACF1\uD558\uBBC0\uB85C ${scale}\xB2\xD7${baseVariance}=${scale ** 2 * baseVariance}\uC785\uB2C8\uB2E4.`, `\uBD84\uC0B0\uC5D0\uB294 ${scale}\uC774 \uC544\uB2C8\uB77C ${scale}\xB2\uC774 \uACF1\uD574\uC9D1\uB2C8\uB2E4.`, distributionVisual({ variance: baseVariance, transformedVariance: scale ** 2 * baseVariance })),
              sa(`50% \uD655\uB960\uB85C ${win}\uC6D0\uC744 \uC5BB\uACE0 50% \uD655\uB960\uB85C ${loss}\uC6D0\uC744 \uC783\uB294 \uAC8C\uC784\uC758 \uAE30\uB300\uC218\uC775\uC740?`, (win - loss) / 2, `${win}\xD70.5+(-${loss})\xD70.5=${(win - loss) / 2}\uC6D0\uC785\uB2C8\uB2E4.`, "\uC190\uC2E4\uC740 \uC74C\uC218\uB85C \uB123\uC73C\uC138\uC694.", distributionVisual({ values: [-loss, win], probabilities: [0.5, 0.5], mean: (win - loss) / 2 })),
              sa(`X\uAC00 0\uACFC ${twoPointHigh}\uB97C \uD655\uB960 p, 1-p\uB85C \uAC16\uACE0 E(X)=${round4(twoPointHigh * (1 - highProbability))}\uC77C \uB54C p\uB294?`, highProbability, `${twoPointHigh}(1-p)=${round4(twoPointHigh * (1 - highProbability))}\uC774\uBBC0\uB85C p=${highProbability}\uC785\uB2C8\uB2E4.`, "\uAE30\uB313\uAC12 \uC2DD\uC744 p\uC5D0 \uB300\uD574 \uD478\uC138\uC694.", distributionVisual({ values: [0, twoPointHigh], probabilities: [highProbability, 1 - highProbability], mean: twoPointHigh * (1 - highProbability) })),
              sa(`\uD3C9\uADE0\uC774 ${deviationMean}\uC77C \uB54C \uAC12 ${deviationValue}\uC758 \uD3B8\uCC28 \uC81C\uACF1\uC740?`, (deviationValue - deviationMean) ** 2, `(${deviationValue}-${deviationMean})\xB2=${(deviationValue - deviationMean) ** 2}\uC785\uB2C8\uB2E4.`, "\uAC12\uC5D0\uC11C \uD3C9\uADE0\uC744 \uBE80 \uB4A4 \uC81C\uACF1\uD569\uB2C8\uB2E4.", distributionVisual({ values: [deviationMean, deviationValue], mean: deviationMean, focus: deviationValue })),
              sa(`X\uAC00 ${low}\uC640 ${high}\uB97C \uAC19\uC740 \uD655\uB960\uB85C \uAC00\uC9C8 \uB54C E(X)\uB294?`, midpoint, `(${low}+${high})/2=${midpoint}\uC785\uB2C8\uB2E4.`, "\uAC19\uC740 \uD655\uB960\uC778 \uB450 \uC810\uC758 \uBB34\uAC8C\uC911\uC2EC\uC740 \uAC00\uC6B4\uB370\uC785\uB2C8\uB2E4.", distributionVisual({ values: [low, high], probabilities: [0.5, 0.5], mean: midpoint })),
              sa(`X\uAC00 ${low}\uC640 ${high}\uB97C \uAC19\uC740 \uD655\uB960\uB85C \uAC00\uC9C8 \uB54C V(X)\uB294?`, twoPointVariance, `\uD3C9\uADE0 ${midpoint}\uC5D0\uC11C \uB450 \uAC12\uAE4C\uC9C0\uC758 \uAC70\uB9AC\uB294 ${(high - low) / 2}\uC774\uBBC0\uB85C \uBD84\uC0B0\uC740 ${twoPointVariance}\uC785\uB2C8\uB2E4.`, "\uAC01 \uD3B8\uCC28 \uC81C\uACF1\uC744 \uD655\uB960\uB85C \uAC00\uC911\uD3C9\uADE0\uD558\uC138\uC694.", distributionVisual({ values: [low, high], probabilities: [0.5, 0.5], mean: midpoint, variance: twoPointVariance }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-03-03",
          unitId: "statistics",
          key: "probstat-binomial-distribution",
          title: "\uC774\uD56D\uBD84\uD3EC",
          labels: [
            "\uC774\uD56D\uD655\uB960",
            "\uC815\uD655\uD788 k\uBC88",
            "\uD55C \uBC88\uB3C4 \uC131\uACF5\uD558\uC9C0 \uC54A\uC74C",
            "\uC801\uC5B4\uB3C4 \uD55C \uBC88",
            "\uD3C9\uADE0",
            "\uBD84\uC0B0",
            "\uD45C\uC900\uD3B8\uCC28",
            "\uCD5C\uBE48\uAC12 \uAD00\uCC30",
            "\uD655\uB960 \uBE44\uAD50",
            "\uC885\uD569 \uC774\uD56D\uBD84\uD3EC"
          ],
          buildProblems() {
            const n = randomInteger(4, 7);
            const p = [0.2, 0.3, 0.4, 0.5][randomInteger(0, 3)];
            const k = randomInteger(1, n - 1);
            const standardDeviation = randomInteger(1, 4);
            const standardDeviationN = 4 * standardDeviation ** 2;
            const defectN = randomInteger(5, 10);
            const defectP = [0.1, 0.2, 0.3][randomInteger(0, 2)];
            const defectK = randomInteger(
              1,
              Math.min(2, defectN - 1)
            );
            const probs = Array.from(
              { length: n + 1 },
              (_, index) => binomialProbability(n, p, index)
            );
            return [
              sa(`${inlineMath(`X\\sim B(${n},${p})`)}\uC77C \uB54C P(X=${k})\uB97C \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694.`, binomialProbability(n, p, k), `${inlineMath(`\\binom{${n}}{${k}}${p}^{${k}}(1-${p})^{${n - k}}`)}\uC785\uB2C8\uB2E4.`, "\uC131\uACF5 \uC704\uCE58\uB97C \uACE0\uB974\uB294 \uC774\uD56D\uACC4\uC218\uC640 \uD55C \uACBD\uB85C\uC758 \uD655\uB960\uC744 \uACF1\uD558\uC138\uC694.", binomialVisual({ n, p, probabilities: probs, focus: k })),
              sa(`\uC131\uACF5\uD655\uB960 ${p}\uC778 \uC2DC\uD589\uC744 ${n}\uBC88 \uD558\uC5EC \uC815\uD655\uD788 ${k}\uBC88 \uC131\uACF5\uD560 \uD655\uB960\uC740?`, binomialProbability(n, p, k), `${inlineMath(`\\binom{${n}}{${k}}${p}^{${k}}(1-${p})^{${n - k}}=${binomialProbability(n, p, k)}`)}\uC785\uB2C8\uB2E4.`, `\uC131\uACF5 ${k}\uBC88\uC758 \uC704\uCE58\uB97C \uACE0\uB974\uB294 \uACBD\uC6B0\uC758 \uC218\uB97C \uD3EC\uD568\uD558\uC138\uC694.`, binomialVisual({ n, p, focus: k })),
              sa(`${inlineMath(`X\\sim B(${n},${p})`)}\uC77C \uB54C P(X=0)\uB294?`, round4((1 - p) ** n), `${inlineMath(`(1-${p})^{${n}}`)}\uC785\uB2C8\uB2E4.`, "\uBAA8\uB4E0 \uC2DC\uD589\uC774 \uC2E4\uD328\uD558\uB294 \uD55C \uACBD\uB85C\uC785\uB2C8\uB2E4.", binomialVisual({ n, p, probabilities: probs, focus: 0 })),
              sa(`\uC131\uACF5\uD655\uB960 ${p}\uC778 \uC2DC\uD589\uC744 ${n}\uBC88 \uD558\uC5EC \uC801\uC5B4\uB3C4 \uD55C \uBC88 \uC131\uACF5\uD560 \uD655\uB960\uC740?`, round4(1 - (1 - p) ** n), `${inlineMath(`1-(1-${p})^{${n}}=${round4(1 - (1 - p) ** n)}`)}\uC785\uB2C8\uB2E4.`, "X\u22651\uC758 \uC5EC\uC0AC\uAC74\uC740 X=0\uC785\uB2C8\uB2E4.", binomialVisual({ n, p, focusFrom: 1 })),
              sa(`${inlineMath(`X\\sim B(${n},${p})`)}\uC758 \uD3C9\uADE0\uC744 \uAD6C\uD558\uC138\uC694.`, round4(n * p), `${inlineMath(`E(X)=np=${n}\\times${p}=${round4(n * p)}`)}\uC785\uB2C8\uB2E4.`, "\uC2DC\uD589 \uD69F\uC218\uC640 \uC131\uACF5\uD655\uB960\uC744 \uACF1\uD558\uC138\uC694.", binomialVisual({ n, p, mean: n * p })),
              sa(`${inlineMath(`X\\sim B(${n},${p})`)}\uC758 \uBD84\uC0B0\uC744 \uAD6C\uD558\uC138\uC694.`, round4(n * p * (1 - p)), `${inlineMath(`V(X)=np(1-p)=${round4(n * p * (1 - p))}`)}\uC785\uB2C8\uB2E4.`, "q=1-p\uB97C \uBA3C\uC800 \uAD6C\uD558\uC138\uC694.", binomialVisual({ n, p, mean: n * p })),
              sa(`${inlineMath(`X\\sim B(${standardDeviationN},0.5)`)}\uC758 \uD45C\uC900\uD3B8\uCC28\uB97C \uAD6C\uD558\uC138\uC694.`, standardDeviation, `${inlineMath(`\\sqrt{${standardDeviationN}\\cdot0.5\\cdot0.5}=${standardDeviation}`)}\uC785\uB2C8\uB2E4.`, "\uBD84\uC0B0 npq\uC758 \uC591\uC758 \uC81C\uACF1\uADFC\uC785\uB2C8\uB2E4.", binomialVisual({ n: standardDeviationN, p: 0.5, mean: standardDeviationN / 2 })),
              mc("B(10,0.5)\uC758 \uBD84\uD3EC\uC5D0\uC11C \uC911\uC2EC\uC5D0 \uAC00\uC7A5 \uAC00\uAE4C\uC6B4 \uAC12\uC740?", ["0", "2", "5", "10"], 2, "\uD3C9\uADE0 np=5\uC774\uACE0 \uB300\uCE6D\uBD84\uD3EC\uC758 \uC911\uC2EC\uB3C4 5\uC785\uB2C8\uB2E4.", "p=0.5\uC774\uBA74 \uBD84\uD3EC\uAC00 \uC911\uC559\uC744 \uAE30\uC900\uC73C\uB85C \uB300\uCE6D\uC785\uB2C8\uB2E4.", binomialVisual({ n: 10, p: 0.5, mean: 5 })),
              mc("B(6,0.5)\uC5D0\uC11C P(X=2)\uC640 P(X=4)\uC758 \uAD00\uACC4\uB294?", ["P(X=2)>P(X=4)", "\uAC19\uB2E4", "P(X=2)<P(X=4)", "\uB458 \uB2E4 0"], 1, "p=0.5\uC778 \uBD84\uD3EC\uB294 n/2\uB97C \uC911\uC2EC\uC73C\uB85C \uB300\uCE6D\uC785\uB2C8\uB2E4.", "2\uC640 4\uB294 \uC911\uC2EC 3\uC5D0\uC11C \uAC19\uC740 \uAC70\uB9AC\uC785\uB2C8\uB2E4.", binomialVisual({ n: 6, p: 0.5, focusValues: [2, 4] })),
              sa(`\uBD88\uB7C9\uB960 ${defectP}\uC778 \uC81C\uD488 ${defectN}\uAC1C \uC911 \uC815\uD655\uD788 ${defectK}\uAC1C\uAC00 \uBD88\uB7C9\uC77C \uD655\uB960\uC744 \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694.`, binomialProbability(defectN, defectP, defectK), `${inlineMath(`\\binom{${defectN}}{${defectK}}${defectP}^{${defectK}}(1-${defectP})^{${defectN - defectK}}=${binomialProbability(defectN, defectP, defectK)}`)}\uC785\uB2C8\uB2E4.`, `\uBD88\uB7C9\uD488 ${defectK}\uAC1C\uC758 \uC704\uCE58\uB97C \uACE0\uB974\uB294 \uACBD\uC6B0\uC758 \uC218\uB97C \uD3EC\uD568\uD558\uC138\uC694.`, binomialVisual({ n: defectN, p: defectP, focus: defectK }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-03-04",
          unitId: "statistics",
          key: "probstat-normal-binomial",
          title: "\uC815\uADDC\uBD84\uD3EC\uC640 \uC774\uD56D\uBD84\uD3EC\uC758 \uAD00\uACC4",
          labels: [
            "\uC815\uADDC\uBD84\uD3EC \uB300\uCE6D",
            "\uD45C\uC900\uD654",
            "\uAD6C\uAC04\uD655\uB960",
            "\uD3C9\uADE0 \uC774\uB3D9",
            "\uD45C\uC900\uD3B8\uCC28 \uBCC0\uD654",
            "\uC774\uD56D\uBD84\uD3EC \uADFC\uC0AC",
            "\uC5F0\uC18D\uC131 \uC218\uC815",
            "68% \uADDC\uCE59",
            "\uAF2C\uB9AC\uD655\uB960",
            "\uC885\uD569 \uC815\uADDC\uBD84\uD3EC"
          ],
          buildProblems() {
            const mean = randomInteger(5, 20) * 5;
            const sd = randomInteger(2, 10);
            const z = [0.5, 1, 1.5, 2][randomInteger(0, 3)];
            const focus = round4(mean + z * sd);
            const intervalZ = [0.5, 1, 1.5][randomInteger(0, 2)];
            const binomialN = randomInteger(5, 20) * 10;
            const binomialP = [0.2, 0.3, 0.4, 0.5, 0.6, 0.7][randomInteger(0, 5)];
            const binomialMean = binomialN * binomialP;
            const binomialSd = Math.sqrt(
              binomialN * binomialP * (1 - binomialP)
            );
            const continuityBoundary = randomInteger(
              Math.max(0, Math.floor(binomialMean - binomialSd)),
              Math.ceil(binomialMean + binomialSd)
            );
            const tailZ = [0.5, 1, 1.5, 2][randomInteger(0, 3)];
            const intervalMean = randomInteger(3, 15) * 5;
            const intervalSd = randomInteger(2, 8);
            return [
              sa(`\uC815\uADDC\uBD84\uD3EC ${inlineMath(`N(${mean},${sd ** 2})`)}\uC5D0\uC11C \uD3C9\uADE0\uBCF4\uB2E4 \uC791\uC740 \uAC12\uC774 \uB098\uC62C \uD655\uB960\uC740?`, 0.5, "\uC815\uADDC\uBD84\uD3EC\uB294 \uD3C9\uADE0\uC744 \uC911\uC2EC\uC73C\uB85C \uB300\uCE6D\uC774\uBBC0\uB85C \uC67C\uCABD \uB113\uC774\uB294 0.5\uC785\uB2C8\uB2E4.", "\uD3C9\uADE0\uC744 \uC9C0\uB098\uB294 \uC138\uB85C\uC120\uC774 \uB113\uC774\uB97C \uBC18\uC73C\uB85C \uB098\uB215\uB2C8\uB2E4.", normalVisual({ mean, sd, shadeTo: mean })),
              sa(`${inlineMath(`X\\sim N(${mean},${sd ** 2})`)}\uC5D0\uC11C X=${focus}\uC758 \uD45C\uC900\uC810\uC218 z\uB294?`, z, `\uD45C\uC900\uD3B8\uCC28\uB294 ${sd}\uC774\uBBC0\uB85C z=(${focus}-${mean})/${sd}=${z}\uC785\uB2C8\uB2E4.`, "\uB450 \uBC88\uC9F8 \uBAA8\uC218\uB294 \uBD84\uC0B0\uC774\uBBC0\uB85C \uBA3C\uC800 \uC81C\uACF1\uADFC\uC744 \uAD6C\uD558\uC138\uC694.", normalVisual({ mean, sd, focus })),
              sa(`\uD45C\uC900\uC815\uADDC\uBD84\uD3EC\uC5D0\uC11C P(-${intervalZ}\u2264Z\u2264${intervalZ})\uB97C \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694.`, round4(normalCdf(intervalZ) - normalCdf(-intervalZ)), `\uD45C\uC900\uC815\uADDC \uB204\uC801\uD655\uB960\uC758 \uCC28\uB294 ${round4(normalCdf(intervalZ) - normalCdf(-intervalZ))}\uC785\uB2C8\uB2E4.`, "\uC591\uCABD \uACBD\uACC4\uC758 \uB204\uC801\uD655\uB960 \uCC28\uB97C \uAD6C\uD558\uC138\uC694.", normalVisual({ mean: 0, sd: 1, shadeFrom: -intervalZ, shadeTo: intervalZ })),
              mc("\uC815\uADDC\uBD84\uD3EC\uC758 \uD3C9\uADE0\uC774 \uCEE4\uC9C0\uBA74 \uADF8\uB798\uD504\uB294 \uC5B4\uB5BB\uAC8C \uBCC0\uD558\uB294\uAC00?", ["\uC624\uB978\uCABD\uC73C\uB85C \uC774\uB3D9", "\uD3ED\uB9CC \uB113\uC5B4\uC9D0", "\uC67C\uCABD\uC73C\uB85C \uC774\uB3D9", "\uB192\uC774\uB9CC 2\uBC30"], 0, "\uD3C9\uADE0\uC740 \uACE1\uC120\uC758 \uC911\uC2EC \uC704\uCE58\uB97C \uACB0\uC815\uD569\uB2C8\uB2E4.", "\uBAA8\uC591\uC740 \uADF8\uB300\uB85C\uC774\uACE0 \uC911\uC2EC \uC88C\uD45C\uB9CC \uBC14\uB01D\uB2C8\uB2E4.", normalVisual({ mean: 2, sd: 1 })),
              mc("\uD3C9\uADE0\uC774 \uAC19\uACE0 \uD45C\uC900\uD3B8\uCC28\uAC00 \uCEE4\uC9C0\uBA74 \uC815\uADDC\uACE1\uC120\uC740?", ["\uB354 \uC881\uACE0 \uB192\uC544\uC9C4\uB2E4", "\uB354 \uB113\uACE0 \uB0AE\uC544\uC9C4\uB2E4", "\uC624\uB978\uCABD \uC774\uB3D9", "\uBCC0\uD558\uC9C0 \uC54A\uB294\uB2E4"], 1, "\uC804\uCCB4 \uB113\uC774\uB294 1\uC774\uBBC0\uB85C \uD3ED\uC774 \uB113\uC5B4\uC9C0\uBA74 \uB192\uC774\uB294 \uB0AE\uC544\uC9D1\uB2C8\uB2E4.", "\uD45C\uC900\uD3B8\uCC28\uB294 \uC790\uB8CC\uAC00 \uC911\uC2EC\uC5D0\uC11C \uD37C\uC9C4 \uC815\uB3C4\uC785\uB2C8\uB2E4.", normalVisual({ mean: 0, sd: 2 })),
              sa(`${inlineMath(`X\\sim B(${binomialN},${binomialP})`)}\uB97C \uC815\uADDC\uADFC\uC0AC\uD560 \uB54C \uADFC\uC0AC \uC815\uADDC\uBD84\uD3EC\uC758 \uD3C9\uADE0\uC740?`, binomialMean, `np=${binomialN}\xD7${binomialP}=${binomialMean}\uC785\uB2C8\uB2E4.`, "\uC774\uD56D\uBD84\uD3EC\uC640 \uADFC\uC0AC \uC815\uADDC\uBD84\uD3EC\uB294 \uD3C9\uADE0\uC744 \uB9DE\uCDA5\uB2C8\uB2E4.", normalVisual({ mean: binomialMean, sd: binomialSd, binomial: true })),
              sa(`${inlineMath(`X\\sim B(${binomialN},${binomialP})`)}\uB97C \uC815\uADDC\uADFC\uC0AC\uD560 \uB54C P(X\u2264${continuityBoundary})\uB294 \uC5F0\uC18D\uC131 \uC218\uC815 \uD6C4 \uC5B4\uB5A4 \uACBD\uACC4\uAE4C\uC9C0 \uBCF4\uB294\uAC00?`, continuityBoundary + 0.5, `\uC774\uC0B0\uAC12 ${continuityBoundary}\uAE4C\uC9C0 \uD3EC\uD568\uD558\uBBC0\uB85C \uC5F0\uC18D \uAD6C\uAC04\uC740 ${continuityBoundary + 0.5}\uAE4C\uC9C0\uC785\uB2C8\uB2E4.`, "\uB9C9\uB300 \uD558\uB098\uC758 \uD3ED\uC744 1\uB85C \uBCF4\uACE0 \uC624\uB978\uCABD \uACBD\uACC4\uB97C \uC0AC\uC6A9\uD558\uC138\uC694.", normalVisual({ mean: binomialMean, sd: binomialSd, shadeTo: continuityBoundary + 0.5, binomial: true })),
              sa(`\uC815\uADDC\uBD84\uD3EC ${inlineMath(`N(${mean},${sd ** 2})`)}\uC5D0\uC11C \uD3C9\uADE0\xB11\uD45C\uC900\uD3B8\uCC28 \uC548\uC5D0 \uB4E4\uC5B4\uAC08 \uD655\uB960\uC744 \uADFC\uC0AC\uAC12\uC73C\uB85C \uAD6C\uD558\uC138\uC694.`, round4(normalCdf(1) - normalCdf(-1)), "\uC57D 0.6827, \uC989 68.27%\uC785\uB2C8\uB2E4.", "\uBD84\uD3EC\uC758 \uD3C9\uADE0\uACFC \uD45C\uC900\uD3B8\uCC28\uAC00 \uB2EC\uB77C\uB3C4 \uD45C\uC900\uD654\uD558\uBA74 -1\uBD80\uD130 1\uAE4C\uC9C0\uC785\uB2C8\uB2E4.", normalVisual({ mean, sd, shadeFrom: mean - sd, shadeTo: mean + sd })),
              sa(`\uD45C\uC900\uC815\uADDC\uBD84\uD3EC\uC5D0\uC11C P(Z\u2265${tailZ})\uB97C \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694.`, round4(1 - normalCdf(tailZ)), `1-\u03A6(${tailZ})\u2248${round4(1 - normalCdf(tailZ))}\uC785\uB2C8\uB2E4.`, "\uC624\uB978\uCABD \uAF2C\uB9AC\uB294 \uC804\uCCB4 1\uC5D0\uC11C \uC67C\uCABD \uB204\uC801\uD655\uB960\uC744 \uBE8D\uB2C8\uB2E4.", normalVisual({ mean: 0, sd: 1, shadeFrom: tailZ })),
              sa(`${inlineMath(`X\\sim N(${intervalMean},${intervalSd ** 2})`)}\uC77C \uB54C P(${intervalMean - intervalSd}\u2264X\u2264${intervalMean + intervalSd})\uB97C \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694.`, round4(normalCdf(1) - normalCdf(-1)), `\uD45C\uC900\uD3B8\uCC28\uB294 ${intervalSd}\uC774\uBBC0\uB85C \uB450 \uACBD\uACC4\uC758 z\uB294 -1,1\uC774\uACE0 \uD655\uB960\uC740 \uC57D 0.6827\uC785\uB2C8\uB2E4.`, `\uBD84\uC0B0 ${intervalSd ** 2}\uC758 \uC81C\uACF1\uADFC\uC774 \uD45C\uC900\uD3B8\uCC28 ${intervalSd}\uC785\uB2C8\uB2E4.`, normalVisual({ mean: intervalMean, sd: intervalSd, shadeFrom: intervalMean - intervalSd, shadeTo: intervalMean + intervalSd }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-03-05",
          unitId: "statistics",
          key: "probstat-population-sampling",
          title: "\uBAA8\uC9D1\uB2E8\uACFC \uD45C\uBCF8\uCD94\uCD9C",
          labels: [
            "\uBAA8\uC9D1\uB2E8",
            "\uD45C\uBCF8",
            "\uC804\uC218\uC870\uC0AC",
            "\uC784\uC758\uCD94\uCD9C",
            "\uD3B8\uD5A5 \uD310\uC815",
            "\uCE35\uD654\uCD94\uCD9C",
            "\uAD70\uC9D1\uCD94\uCD9C",
            "\uD45C\uBCF8 \uD06C\uAE30",
            "\uBCF5\uC6D0\uCD94\uCD9C",
            "\uC885\uD569 \uD45C\uBCF8\uC124\uACC4"
          ],
          buildProblems() {
            return [
              mc("\uC804\uAD6D \uACE0\uB4F1\uD559\uC0DD\uC758 \uD3C9\uADE0 \uC218\uBA74\uC2DC\uAC04\uC744 \uC870\uC0AC\uD560 \uB54C \uBAA8\uC9D1\uB2E8\uC740?", ["\uC870\uC0AC\uD55C 100\uBA85", "\uC804\uAD6D\uC758 \uBAA8\uB4E0 \uACE0\uB4F1\uD559\uC0DD", "\uC870\uC0AC\uC6D0", "\uC218\uBA74\uC2DC\uAC04 \uD3C9\uADE0"], 1, "\uC54C\uACE0 \uC2F6\uC740 \uB300\uC0C1 \uC804\uCCB4\uAC00 \uBAA8\uC9D1\uB2E8\uC785\uB2C8\uB2E4.", "\uC5F0\uAD6C \uACB0\uACFC\uB97C \uC801\uC6A9\uD558\uB824\uB294 \uC804\uCCB4 \uB300\uC0C1\uC744 \uCC3E\uC73C\uC138\uC694.", samplingVisual({ population: 100, sample: 12 })),
              mc("\uC804\uAD6D \uACE0\uB4F1\uD559\uC0DD \uC911 \uBB34\uC791\uC704\uB85C \uACE0\uB978 500\uBA85\uC740?", ["\uBAA8\uC218", "\uD45C\uBCF8", "\uBAA8\uC9D1\uB2E8", "\uD655\uB960\uBCC0\uC218"], 1, "\uBAA8\uC9D1\uB2E8\uC5D0\uC11C \uC2E4\uC81C \uC870\uC0AC\uD55C \uC77C\uBD80\uAC00 \uD45C\uBCF8\uC785\uB2C8\uB2E4.", "\uC804\uCCB4\uC5D0\uC11C \uC120\uD0DD\uB41C \uC77C\uBD80 \uC9D1\uB2E8\uC785\uB2C8\uB2E4.", samplingVisual({ population: 100, sample: 20 })),
              mc("\uBAA8\uB4E0 \uAD6C\uC131\uC6D0\uC744 \uC870\uC0AC\uD558\uB294 \uBC29\uBC95\uC740?", ["\uD45C\uBCF8\uC870\uC0AC", "\uC804\uC218\uC870\uC0AC", "\uCE35\uD654\uCD94\uCD9C", "\uACC4\uD1B5\uCD94\uCD9C"], 1, "\uBAA8\uC9D1\uB2E8 \uC804\uCCB4\uB97C \uBE60\uC9D0\uC5C6\uC774 \uC870\uC0AC\uD558\uBA74 \uC804\uC218\uC870\uC0AC\uC785\uB2C8\uB2E4.", "\uC77C\uBD80\uAC00 \uC544\uB2CC \uC804\uCCB4\uB97C \uC870\uC0AC\uD569\uB2C8\uB2E4.", samplingVisual({ population: 60, sample: 60 })),
              mc("\uB2E8\uC21C\uC784\uC758\uCD94\uCD9C\uC758 \uD575\uC2EC \uC870\uAC74\uC740?", ["\uD3B8\uD55C \uC0AC\uB78C\uB9CC \uC120\uD0DD", "\uAC01 \uD45C\uBCF8\uC774 \uAC19\uC740 \uC120\uD0DD \uAC00\uB2A5\uC131", "\uD56D\uC0C1 10\uBA85 \uC120\uD0DD", "\uB0A8\uD559\uC0DD\uB9CC \uC120\uD0DD"], 1, "\uAC01 \uAC00\uB2A5\uD55C \uD45C\uBCF8\uC774 \uAC19\uC740 \uAE30\uD68C\uB97C \uAC16\uB3C4\uB85D \uBB34\uC791\uC704\uD654\uD569\uB2C8\uB2E4.", "\uC120\uD0DD \uAC00\uB2A5\uC131\uC758 \uACF5\uC815\uC131\uC744 \uD655\uC778\uD558\uC138\uC694.", samplingVisual({ population: 80, sample: 10, random: true })),
              mc("\uD559\uAD50 \uAE09\uC2DD \uB9CC\uC871\uB3C4\uB97C \uC870\uC0AC\uD558\uBA74\uC11C \uAE09\uC2DD\uC2E4 \uC55E\uC758 \uB9CC\uC871\uD55C \uD559\uC0DD\uB9CC \uC870\uC0AC\uD558\uBA74?", ["\uB300\uD45C\uC131\uC774 \uB192\uB2E4", "\uC120\uD0DD \uD3B8\uD5A5\uC774 \uC0DD\uAE38 \uC218 \uC788\uB2E4", "\uC804\uC218\uC870\uC0AC\uB2E4", "\uD45C\uBCF8\uC624\uCC28\uAC00 0\uC774\uB2E4"], 1, "\uC751\uB2F5\uC790\uAC00 \uBAA8\uC9D1\uB2E8\uC744 \uACE0\uB974\uAC8C \uB300\uD45C\uD558\uC9C0 \uBABB\uD560 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", "\uB204\uAC00 \uC870\uC0AC\uC5D0\uC11C \uBE60\uC84C\uB294\uC9C0 \uC0DD\uAC01\uD558\uC138\uC694.", samplingVisual({ population: 80, sample: 10, biased: true })),
              mc("\uD559\uB144\uBCC4 \uBE44\uC728\uC5D0 \uB9DE\uCDB0 \uAC01 \uD559\uB144\uC5D0\uC11C \uBB34\uC791\uC704\uB85C \uBF51\uB294 \uBC29\uBC95\uC740?", ["\uCE35\uD654\uCD94\uCD9C", "\uAD70\uC9D1\uCD94\uCD9C", "\uD3B8\uC758\uCD94\uCD9C", "\uC804\uC218\uC870\uC0AC"], 0, "\uBAA8\uC9D1\uB2E8\uC744 \uC911\uC694\uD55C \uD2B9\uC131\uBCC4 \uCE35\uC73C\uB85C \uB098\uB208 \uB4A4 \uAC01 \uCE35\uC5D0\uC11C \uBF51\uC2B5\uB2C8\uB2E4.", "\uAC01 \uD559\uB144\uC744 \uD558\uB098\uC758 \uCE35\uC73C\uB85C \uBD05\uB2C8\uB2E4.", samplingVisual({ strata: [30, 30, 40], sample: 15 })),
              mc("\uBB34\uC791\uC704\uB85C \uBA87 \uAC1C \uD559\uAE09\uC744 \uACE8\uB77C \uADF8 \uD559\uAE09 \uD559\uC0DD \uC804\uC6D0\uC744 \uC870\uC0AC\uD558\uB294 \uBC29\uBC95\uC740?", ["\uCE35\uD654\uCD94\uCD9C", "\uAD70\uC9D1\uCD94\uCD9C", "\uACC4\uD1B5\uCD94\uCD9C", "\uBCF5\uC6D0\uCD94\uCD9C"], 1, "\uC790\uC5F0\uC2A4\uB7FD\uAC8C \uBB36\uC778 \uC9D1\uB2E8\uC744 \uACE8\uB77C \uC9D1\uB2E8 \uC804\uCCB4\uB97C \uC870\uC0AC\uD558\uB294 \uAD70\uC9D1\uCD94\uCD9C\uC785\uB2C8\uB2E4.", "\uAC1C\uC778\uC774 \uC544\uB2C8\uB77C \uD559\uAE09 \uB2E8\uC704\uB85C \uC120\uD0DD\uD569\uB2C8\uB2E4.", samplingVisual({ clusters: 8, selectedClusters: 2 })),
              mc("\uC77C\uBC18\uC801\uC73C\uB85C \uAC19\uC740 \uC870\uAC74\uC5D0\uC11C \uD45C\uBCF8 \uD06C\uAE30\uAC00 \uCEE4\uC9C0\uBA74?", ["\uD45C\uBCF8\uC624\uCC28\uAC00 \uC904\uC5B4\uB4DC\uB294 \uACBD\uD5A5", "\uD3B8\uD5A5\uC774 \uC790\uB3D9\uC73C\uB85C \uC0AC\uB77C\uC9D0", "\uBAA8\uC9D1\uB2E8\uC774 \uC791\uC544\uC9D0", "\uBAA8\uC218\uAC00 \uBCC0\uD568"], 0, "\uD45C\uBCF8 \uBCC0\uB3D9\uC740 \uC904\uC5B4\uB4E4\uC9C0\uB9CC \uC798\uBABB\uB41C \uCD94\uCD9C \uBC29\uC2DD\uC758 \uD3B8\uD5A5\uC774 \uC790\uB3D9\uC73C\uB85C \uC5C6\uC5B4\uC9C0\uB294 \uAC83\uC740 \uC544\uB2D9\uB2C8\uB2E4.", "\uBB34\uC791\uC704 \uC624\uCC28\uC640 \uCCB4\uACC4\uC801 \uD3B8\uD5A5\uC744 \uAD6C\uBD84\uD558\uC138\uC694.", samplingVisual({ population: 100, sample: 35 })),
              mc("\uBF51\uC740 \uB300\uC0C1\uC744 \uB2E4\uC2DC \uBAA8\uC9D1\uB2E8\uC5D0 \uB123\uACE0 \uB2E4\uC74C \uB300\uC0C1\uC744 \uBF51\uB294 \uAC83\uC740?", ["\uBE44\uBCF5\uC6D0\uCD94\uCD9C", "\uBCF5\uC6D0\uCD94\uCD9C", "\uCE35\uD654\uCD94\uCD9C", "\uAD70\uC9D1\uCD94\uCD9C"], 1, "\uB9E4\uBC88 \uBF51\uC740 \uB300\uC0C1\uC744 \uB418\uB3CC\uB824 \uBAA8\uC9D1\uB2E8 \uAD6C\uC131\uC774 \uC720\uC9C0\uB429\uB2C8\uB2E4.", "\uB2E4\uC74C \uCD94\uCD9C \uC804\uC5D0 \uC6D0\uB798 \uC0C1\uD0DC\uB85C \uB3CC\uC544\uAC11\uB2C8\uB2E4.", samplingVisual({ replacement: true })),
              mc("\uC131\uBCC4\uACFC \uD559\uB144 \uBE44\uC728\uC744 \uBAA8\uB450 \uBC18\uC601\uD558\uACE0 \uC2F6\uC744 \uB54C \uAC00\uC7A5 \uC801\uC808\uD55C \uBC29\uBC95\uC740?", ["\uD3B8\uC758\uCD94\uCD9C", "\uAD00\uB828 \uCE35\uC744 \uB9CC\uB4E0 \uCE35\uD654\uCD94\uCD9C", "\uD55C \uD559\uAE09\uB9CC \uC870\uC0AC", "\uC790\uC6D0\uC790\uB9CC \uC870\uC0AC"], 1, "\uC911\uC694\uD55C \uD558\uC704\uC9D1\uB2E8\uC744 \uCE35\uC73C\uB85C \uB098\uB204\uACE0 \uBE44\uC728\uC5D0 \uB9DE\uAC8C \uBB34\uC791\uC704 \uCD94\uCD9C\uD569\uB2C8\uB2E4.", "\uB300\uD45C\uD574\uC57C \uD560 \uD2B9\uC131\uC744 \uCD94\uCD9C \uC124\uACC4\uC5D0 \uD3EC\uD568\uD558\uC138\uC694.", samplingVisual({ strata: [25, 25, 25, 25], sample: 20 }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-03-06",
          unitId: "statistics",
          key: "probstat-sample-statistics",
          title: "\uD45C\uBCF8\uD1B5\uACC4\uB7C9\uACFC \uBAA8\uC218\uC758 \uAD00\uACC4",
          labels: [
            "\uBAA8\uC218 \uD310\uC815",
            "\uD1B5\uACC4\uB7C9 \uD310\uC815",
            "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uD3C9\uADE0",
            "\uD45C\uBCF8\uD3C9\uADE0 \uD45C\uC900\uD3B8\uCC28",
            "\uD45C\uBCF8 \uD06C\uAE30 \uD6A8\uACFC",
            "\uBD88\uD3B8\uC131",
            "\uD45C\uC9D1\uBD84\uD3EC",
            "\uD45C\uBCF8\uBE44\uC728",
            "\uD45C\uC900\uC624\uCC28",
            "\uC885\uD569 \uAD00\uACC4"
          ],
          buildProblems() {
            const populationMean = randomInteger(4, 20) * 5;
            const sampleRoot = randomInteger(3, 10);
            const sampleSize = sampleRoot ** 2;
            const standardError = randomInteger(1, 5);
            const populationSd = sampleRoot * standardError;
            const populationProportion = randomInteger(2, 8) / 10;
            const proportionRoot = randomInteger(5, 20);
            const proportionSampleSize = proportionRoot ** 2;
            const targetRoot = randomInteger(3, 10);
            const targetStandardError = randomInteger(1, 4);
            const targetPopulationSd = targetRoot * targetStandardError;
            return [
              mc("\uBAA8\uC9D1\uB2E8 \uC804\uCCB4\uC758 \uD3C9\uADE0 \u03BC\uB294?", ["\uBAA8\uC218", "\uD1B5\uACC4\uB7C9", "\uD45C\uBCF8", "\uC0AC\uAC74"], 0, "\uBAA8\uC9D1\uB2E8\uC758 \uD2B9\uC131\uC744 \uB098\uD0C0\uB0B4\uB294 \uACE0\uC815\uB41C \uC218\uC774\uBBC0\uB85C \uBAA8\uC218\uC785\uB2C8\uB2E4.", "\uBAA8\uC9D1\uB2E8 \uC804\uCCB4\uC758 \uAC12\uC778\uC9C0 \uD45C\uBCF8\uC5D0\uC11C \uACC4\uC0B0\uD55C \uAC12\uC778\uC9C0 \uAD6C\uBD84\uD558\uC138\uC694.", samplingVisual({ populationMean: 50 })),
              mc("\uD55C \uD45C\uBCF8\uC5D0\uC11C \uACC4\uC0B0\uD55C \uD3C9\uADE0 x\u0304\uB294?", ["\uBAA8\uC218", "\uD1B5\uACC4\uB7C9", "\uBAA8\uC9D1\uB2E8", "\uD655\uB960"], 1, "\uD45C\uBCF8 \uC790\uB8CC\uB85C\uBD80\uD130 \uACC4\uC0B0\uD55C \uAC12\uC774\uBBC0\uB85C \uD1B5\uACC4\uB7C9\uC785\uB2C8\uB2E4.", "\uD45C\uBCF8\uC774 \uBC14\uB00C\uBA74 \uAC12\uB3C4 \uBC14\uB014 \uC218 \uC788\uC2B5\uB2C8\uB2E4.", samplingVisual({ sampleMeans: [48, 51, 50, 52] })),
              sa(`\uBAA8\uD3C9\uADE0 \u03BC=${populationMean}\uC77C \uB54C \uD45C\uBCF8\uD3C9\uADE0 X\u0304\uC758 \uD3C9\uADE0 E(X\u0304)\uB294?`, populationMean, "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uAE30\uB300\uAC12\uC740 \uBAA8\uD3C9\uADE0\uACFC \uAC19\uC2B5\uB2C8\uB2E4.", "\uD45C\uBCF8\uD3C9\uADE0\uC740 \uBAA8\uD3C9\uADE0\uC758 \uBD88\uD3B8\uCD94\uC815\uB7C9\uC785\uB2C8\uB2E4.", samplingVisual({ populationMean, samplingMean: populationMean })),
              sa(`\uBAA8\uD45C\uC900\uD3B8\uCC28 \u03C3=${populationSd}, \uD45C\uBCF8\uD06C\uAE30 n=${sampleSize}\uC77C \uB54C \uD45C\uBCF8\uD3C9\uADE0\uC758 \uD45C\uC900\uD3B8\uCC28\uB294?`, standardError, `${inlineMath(`\\sigma/\\sqrt n=${populationSd}/${sampleRoot}=${standardError}`)}\uC785\uB2C8\uB2E4.`, "\uD45C\uBCF8\uD3C9\uADE0\uC758 \uD45C\uC900\uC624\uCC28\uB294 \u03C3/\u221An\uC785\uB2C8\uB2E4.", samplingVisual({ populationSd, sampleSize, standardError })),
              mc("\uD45C\uBCF8 \uD06C\uAE30\uB97C 4\uBC30\uB85C \uD558\uBA74 \uD45C\uBCF8\uD3C9\uADE0\uC758 \uD45C\uC900\uC624\uCC28\uB294?", ["4\uBC30", "2\uBC30", "1/2\uBC30", "\uBCC0\uD558\uC9C0 \uC54A\uC74C"], 2, "\uD45C\uC900\uC624\uCC28\uB294 1/\u221An\uC5D0 \uBE44\uB840\uD558\uBBC0\uB85C 4\uBC30 \uD45C\uBCF8\uC5D0\uC11C \uC808\uBC18\uC785\uB2C8\uB2E4.", "\uC81C\uACF1\uADFC \uAD00\uACC4\uB97C \uC0AC\uC6A9\uD558\uC138\uC694.", samplingVisual({ sampleSizes: [25, 100] })),
              mc("E(X\u0304)=\u03BC\uAC00 \uB73B\uD558\uB294 \uAC83\uC740?", ["\uD56D\uC0C1 X\u0304=\u03BC", "\uD45C\uBCF8\uD3C9\uADE0\uC774 \uBAA8\uD3C9\uADE0\uC758 \uBD88\uD3B8\uCD94\uC815\uB7C9", "\uD45C\uBCF8\uC624\uCC28\uAC00 0", "\uBAA8\uC9D1\uB2E8\uC774 \uC815\uADDC\uBD84\uD3EC"], 1, "\uC5EC\uB7EC \uD45C\uBCF8\uD3C9\uADE0\uC758 \uC7A5\uAE30\uC801\uC778 \uC911\uC2EC\uC774 \uBAA8\uD3C9\uADE0\uC774\uB77C\uB294 \uB73B\uC785\uB2C8\uB2E4.", "\uD55C \uBC88\uC758 \uD45C\uBCF8\uAC12\uACFC \uD45C\uC9D1\uBD84\uD3EC\uC758 \uD3C9\uADE0\uC744 \uAD6C\uBD84\uD558\uC138\uC694.", samplingVisual({ populationMean: 50, sampleMeans: [46, 49, 51, 54] })),
              mc("\uAC19\uC740 \uD06C\uAE30\uC758 \uD45C\uBCF8\uC744 \uBC18\uBCF5\uD574\uC11C \uBF51\uC544 \uC5BB\uC740 X\u0304\uB4E4\uC758 \uBD84\uD3EC\uB294?", ["\uBAA8\uC9D1\uB2E8", "\uD45C\uC9D1\uBD84\uD3EC", "\uC870\uAC74\uBD80\uD655\uB960", "\uC774\uD56D\uACC4\uC218"], 1, "\uD1B5\uACC4\uB7C9\uC774 \uBC18\uBCF5 \uD45C\uC9D1\uC5D0\uC11C \uB9CC\uB4DC\uB294 \uD655\uB960\uBD84\uD3EC\uC785\uB2C8\uB2E4.", "\uBD84\uD3EC\uB97C \uC774\uB8E8\uB294 \uAC12\uC774 \uC6D0\uC790\uB8CC\uC778\uC9C0 \uD1B5\uACC4\uB7C9\uC778\uC9C0 \uBCF4\uC138\uC694.", samplingVisual({ sampleMeans: [47, 49, 50, 50, 51, 53] })),
              sa(`\uBAA8\uBE44\uC728 p=${populationProportion}\uC77C \uB54C \uD45C\uBCF8\uBE44\uC728 p\u0302\uC758 \uD3C9\uADE0\uC740?`, populationProportion, `E(p\u0302)=p=${populationProportion}\uC785\uB2C8\uB2E4.`, "\uD45C\uBCF8\uBE44\uC728\uB3C4 \uBAA8\uBE44\uC728\uC758 \uBD88\uD3B8\uCD94\uC815\uB7C9\uC785\uB2C8\uB2E4.", samplingVisual({ populationProportion, samplingMean: populationProportion })),
              sa(`p=${populationProportion}, n=${proportionSampleSize}\uC77C \uB54C \uD45C\uBCF8\uBE44\uC728\uC758 \uD45C\uC900\uD3B8\uCC28\uB294?`, round4(Math.sqrt(populationProportion * (1 - populationProportion) / proportionSampleSize)), `${inlineMath(`\\sqrt{${populationProportion}\\cdot${round4(1 - populationProportion)}/${proportionSampleSize}}\\approx${round4(Math.sqrt(populationProportion * (1 - populationProportion) / proportionSampleSize))}`)}\uC785\uB2C8\uB2E4.`, "\uD45C\uBCF8\uBE44\uC728\uC758 \uD45C\uC900\uC624\uCC28 \uACF5\uC2DD \u221A(p(1-p)/n)\uC744 \uC0AC\uC6A9\uD558\uC138\uC694.", samplingVisual({ populationProportion, sampleSize: proportionSampleSize, standardError: Math.sqrt(populationProportion * (1 - populationProportion) / proportionSampleSize) })),
              sa(`\uBAA8\uD45C\uC900\uD3B8\uCC28\uAC00 ${targetPopulationSd}\uC77C \uB54C \uD45C\uBCF8\uD3C9\uADE0\uC758 \uD45C\uC900\uC624\uCC28\uB97C ${targetStandardError}\uB85C \uB9CC\uB4E4\uAE30 \uC704\uD55C \uD45C\uBCF8\uD06C\uAE30 n\uC740?`, targetRoot ** 2, `${inlineMath(`${targetPopulationSd}/\\sqrt n=${targetStandardError}`)}\uC5D0\uC11C \u221An=${targetRoot}, n=${targetRoot ** 2}\uC785\uB2C8\uB2E4.`, "\uD45C\uC900\uC624\uCC28 \uC2DD\uC744 n\uC5D0 \uB300\uD574 \uD478\uC138\uC694.", samplingVisual({ populationSd: targetPopulationSd, sampleSize: targetRoot ** 2, standardError: targetStandardError }))
            ];
          }
        },
        {
          conceptId: "probability-statistics-03-07",
          unitId: "statistics",
          key: "probstat-estimation",
          title: "\uBAA8\uD3C9\uADE0\uACFC \uBAA8\uBE44\uC728\uC758 \uCD94\uC815",
          labels: [
            "\uBAA8\uD3C9\uADE0 \uC2E0\uB8B0\uAD6C\uAC04",
            "\uC624\uCC28\uD55C\uACC4",
            "\uD45C\uBCF8 \uD06C\uAE30 \uD6A8\uACFC",
            "\uC2E0\uB8B0\uC218\uC900 \uD6A8\uACFC",
            "\uAD6C\uAC04 \uD574\uC11D",
            "\uBAA8\uBE44\uC728 \uC2E0\uB8B0\uAD6C\uAC04",
            "\uD45C\uC900\uC624\uCC28",
            "\uD558\uD55C\uACFC \uC0C1\uD55C",
            "\uD544\uC694 \uD45C\uBCF8\uD06C\uAE30",
            "\uC885\uD569 \uCD94\uC815"
          ],
          buildProblems() {
            const meanCenter = randomInteger(5, 20) * 5;
            const meanRoot = randomInteger(5, 12);
            const meanSampleSize = meanRoot ** 2;
            const meanSd = randomInteger(5, 15);
            const meanMargin = round4(
              1.96 * meanSd / meanRoot
            );
            const intervalCenter = randomInteger(5, 25) * 4;
            const intervalMargin = randomInteger(1, 8);
            const estimateProportion = randomInteger(2, 8) / 10;
            const estimateRoot = randomInteger(10, 25);
            const estimateSampleSize = estimateRoot ** 2;
            const proportionStandardError = Math.sqrt(
              estimateProportion * (1 - estimateProportion) / estimateSampleSize
            );
            const lowerCenter = randomInteger(10, 30) * 3;
            const lowerMargin = randomInteger(1, 8);
            const requiredRoot = randomInteger(4, 12);
            const requiredMargin = randomInteger(1, 5);
            const requiredSd = requiredRoot * requiredMargin / 2;
            const upperCenter = randomInteger(8, 30) * 3;
            const upperRoot = randomInteger(4, 12);
            const upperSd = randomInteger(2, 10);
            const upperMargin = round4(2 * upperSd / upperRoot);
            return [
              sa(`x\u0304=${meanCenter}, \u03C3=${meanSd}, n=${meanSampleSize}\uC77C \uB54C 95% \uBAA8\uD3C9\uADE0 \uC2E0\uB8B0\uAD6C\uAC04\uC758 \uC624\uCC28\uD55C\uACC4(1.96 \uC0AC\uC6A9)\uB294?`, meanMargin, `${inlineMath(`1.96\\cdot${meanSd}/\\sqrt{${meanSampleSize}}=${meanMargin}`)}\uC785\uB2C8\uB2E4.`, "\uC784\uACC4\uAC12\xD7\uD45C\uC900\uC624\uCC28\uB97C \uACC4\uC0B0\uD558\uC138\uC694.", confidenceVisual({ center: meanCenter, margin: meanMargin })),
              sa(`\uCD94\uC815\uAC12\uC774 ${intervalCenter}\uC774\uACE0 \uC624\uCC28\uD55C\uACC4\uAC00 ${intervalMargin}\uC77C \uB54C \uC2E0\uB8B0\uAD6C\uAC04\uC758 \uAE38\uC774\uB294?`, 2 * intervalMargin, `\uD558\uD55C ${intervalCenter - intervalMargin}, \uC0C1\uD55C ${intervalCenter + intervalMargin}\uC774\uBBC0\uB85C \uC804\uCCB4 \uAE38\uC774\uB294 \uC624\uCC28\uD55C\uACC4\uC758 \uB450 \uBC30\uC778 ${2 * intervalMargin}\uC785\uB2C8\uB2E4.`, "\uC624\uCC28\uD55C\uACC4\uB294 \uC911\uC2EC\uC5D0\uC11C \uD55C\uCABD \uB05D\uAE4C\uC9C0\uC758 \uAC70\uB9AC\uC785\uB2C8\uB2E4.", confidenceVisual({ center: intervalCenter, margin: intervalMargin })),
              mc("\uB2E4\uB978 \uC870\uAC74\uC774 \uAC19\uC744 \uB54C \uD45C\uBCF8 \uD06C\uAE30\uAC00 \uCEE4\uC9C0\uBA74 \uC2E0\uB8B0\uAD6C\uAC04\uC740?", ["\uB113\uC5B4\uC9C4\uB2E4", "\uC881\uC544\uC9C4\uB2E4", "\uC911\uC2EC\uC774 0\uC774 \uB41C\uB2E4", "\uD56D\uC0C1 \uAC19\uB2E4"], 1, "\uD45C\uC900\uC624\uCC28\uAC00 1/\u221An\uC5D0 \uB530\uB77C \uC791\uC544\uC838 \uAD6C\uAC04\uC774 \uC881\uC544\uC9D1\uB2C8\uB2E4.", "\uD45C\uBCF8 \uD06C\uAE30\uC640 \uD45C\uC900\uC624\uCC28\uC758 \uAD00\uACC4\uB97C \uBCF4\uC138\uC694.", confidenceVisual({ intervals: [[50, 4], [50, 2]] })),
              mc("\uB2E4\uB978 \uC870\uAC74\uC774 \uAC19\uC744 \uB54C \uC2E0\uB8B0\uC218\uC900\uC744 \uB192\uC774\uBA74 \uC2E0\uB8B0\uAD6C\uAC04\uC740?", ["\uC881\uC544\uC9C4\uB2E4", "\uB113\uC5B4\uC9C4\uB2E4", "\uC0AC\uB77C\uC9C4\uB2E4", "\uC911\uC2EC\uB9CC \uC774\uB3D9"], 1, "\uB354 \uB192\uC740 \uD3EC\uCC29\uB960\uC744 \uC6D0\uD558\uBA74 \uB354 \uB113\uC740 \uAD6C\uAC04\uC774 \uD544\uC694\uD569\uB2C8\uB2E4.", "\uC2E0\uB8B0\uC218\uC900\uACFC \uC815\uBC00\uB3C4 \uC0AC\uC774\uC758 \uAD50\uD658\uAD00\uACC4\uC785\uB2C8\uB2E4.", confidenceVisual({ intervals: [[50, 2], [50, 3]] })),
              mc("95% \uC2E0\uB8B0\uAD6C\uAC04 [48,52]\uC758 \uC62C\uBC14\uB978 \uD574\uC11D\uC5D0 \uAC00\uC7A5 \uAC00\uAE4C\uC6B4 \uAC83\uC740?", ["\uBAA8\uD3C9\uADE0\uC774 \uBC18\uB4DC\uC2DC 50\uC774\uB2E4", "\uAC19\uC740 \uC808\uCC28\uB97C \uBC18\uBCF5\uD558\uBA74 \uC57D 95%\uC758 \uAD6C\uAC04\uC774 \uBAA8\uD3C9\uADE0\uC744 \uD3EC\uD568\uD55C\uB2E4", "\uC790\uB8CC\uC758 95%\uAC00 48~52\uB2E4", "\uD45C\uBCF8\uD3C9\uADE0\uC774 95% \uD655\uB960\uB85C \uBCC0\uD55C\uB2E4"], 1, "\uC2E0\uB8B0\uC218\uC900\uC740 \uBC18\uBCF5\uB418\uB294 \uAD6C\uAC04 \uC0DD\uC131 \uC808\uCC28\uC758 \uC7A5\uAE30\uC801 \uD3EC\uD568\uB960\uC785\uB2C8\uB2E4.", "\uBAA8\uC218\uB294 \uACE0\uC815\uB418\uACE0 \uAD6C\uAC04\uC774 \uD45C\uBCF8\uB9C8\uB2E4 \uB2EC\uB77C\uC9D1\uB2C8\uB2E4.", confidenceVisual({ center: 50, margin: 2 })),
              sa(`\uD45C\uBCF8\uBE44\uC728 p\u0302=${estimateProportion}, n=${estimateSampleSize}\uC77C \uB54C 95% \uBAA8\uBE44\uC728 \uC2E0\uB8B0\uAD6C\uAC04\uC758 \uC624\uCC28\uD55C\uACC4\uB97C \uC18C\uC218\uB85C \uAD6C\uD558\uC138\uC694. (1.96 \uC0AC\uC6A9)`, round4(1.96 * proportionStandardError), `${inlineMath(`1.96\\sqrt{${estimateProportion}\\cdot${round4(1 - estimateProportion)}/${estimateSampleSize}}\\approx${round4(1.96 * proportionStandardError)}`)}\uC785\uB2C8\uB2E4.`, "\uD45C\uBCF8\uBE44\uC728 \uD45C\uC900\uC624\uCC28\uC5D0 1.96\uC744 \uACF1\uD558\uC138\uC694.", confidenceVisual({ center: estimateProportion, margin: 1.96 * proportionStandardError })),
              sa(`p\u0302=${estimateProportion}, n=${estimateSampleSize}\uC77C \uB54C \uD45C\uBCF8\uBE44\uC728\uC758 \uD45C\uC900\uC624\uCC28\uB97C \uAD6C\uD558\uC138\uC694.`, round4(proportionStandardError), `${inlineMath(`\\sqrt{${estimateProportion}\\cdot${round4(1 - estimateProportion)}/${estimateSampleSize}}\\approx${round4(proportionStandardError)}`)}\uC785\uB2C8\uB2E4.`, "\u221A(p\u0302(1-p\u0302)/n)\uC744 \uC0AC\uC6A9\uD558\uC138\uC694.", confidenceVisual({ center: estimateProportion, margin: proportionStandardError })),
              sa(`\uC911\uC2EC\uC774 ${lowerCenter}\uC774\uACE0 \uC624\uCC28\uD55C\uACC4\uAC00 ${lowerMargin}\uC778 \uC2E0\uB8B0\uAD6C\uAC04\uC758 \uD558\uD55C\uC740?`, lowerCenter - lowerMargin, `${lowerCenter}-${lowerMargin}=${lowerCenter - lowerMargin}\uC785\uB2C8\uB2E4.`, "\uC911\uC2EC\uC5D0\uC11C \uC624\uCC28\uD55C\uACC4\uB97C \uBE7C\uC138\uC694.", confidenceVisual({ center: lowerCenter, margin: lowerMargin })),
              sa(`\u03C3=${requiredSd}, \uC624\uCC28\uD55C\uACC4 ${requiredMargin}, 95% \uC784\uACC4\uAC12\uC744 2\uB85C \uADFC\uC0AC\uD560 \uB54C \uD544\uC694\uD55C \uD45C\uBCF8\uD06C\uAE30 n\uC740?`, requiredRoot ** 2, `${inlineMath(`2\\cdot${requiredSd}/\\sqrt n=${requiredMargin}`)}\uC5D0\uC11C \u221An=${requiredRoot}, n=${requiredRoot ** 2}\uC785\uB2C8\uB2E4.`, "\uC624\uCC28\uD55C\uACC4 \uACF5\uC2DD\uC744 n\uC5D0 \uB300\uD574 \uC815\uB9AC\uD558\uC138\uC694.", confidenceVisual({ center: 0, margin: requiredMargin, sampleSize: requiredRoot ** 2 })),
              sa(`x\u0304=${upperCenter}, \u03C3=${upperSd}, n=${upperRoot ** 2}\uC77C \uB54C 95% \uBAA8\uD3C9\uADE0 \uC2E0\uB8B0\uAD6C\uAC04\uC758 \uC0C1\uD55C\uC744 \uAD6C\uD558\uC138\uC694. (\uC784\uACC4\uAC12 2 \uC0AC\uC6A9)`, round4(upperCenter + upperMargin), `\uC624\uCC28\uD55C\uACC4\uB294 ${inlineMath(`2\\cdot${upperSd}/${upperRoot}=${upperMargin}`)}\uC774\uBBC0\uB85C \uC0C1\uD55C\uC740 ${round4(upperCenter + upperMargin)}\uC785\uB2C8\uB2E4.`, "\uBA3C\uC800 \uD45C\uC900\uC624\uCC28, \uB2E4\uC74C \uC624\uCC28\uD55C\uACC4, \uB9C8\uC9C0\uB9C9 \uC0C1\uD55C \uC21C\uC11C\uC785\uB2C8\uB2E4.", confidenceVisual({ center: upperCenter, margin: upperMargin }))
            ];
          }
        }
      ];
      var generators = definitions.map((definition) => ({
        key: definition.key,
        courseId: "probability-statistics",
        unitId: definition.unitId,
        conceptId: definition.conceptId,
        requiredDistinctTypes: 5,
        problemTypes: createProblemTypes({
          conceptId: definition.conceptId,
          conceptTitle: definition.title,
          labels: definition.labels,
          buildProblems: definition.buildProblems
        }),
        isCorrectAnswer
      }));
      var generatorMap = new Map(
        generators.map((generator) => [
          [
            generator.courseId,
            generator.unitId,
            generator.conceptId
          ].join("/"),
          generator
        ])
      );
      module.exports = {
        definitions,
        generators,
        generatorMap
      };
    }
  });

  // services/problemGenerators/commonMath1/helpers.js
  var require_helpers4 = __commonJS({
    "services/problemGenerators/commonMath1/helpers.js"(exports, module) {
      var {
        randomInteger,
        nonZeroInteger,
        isCorrectAnswer
      } = require_utils();
      var {
        createAlgebraProblemType
      } = require_helpers2();
      function randomNonZero(min = -5, max = 5) {
        return nonZeroInteger(min, max);
      }
      function randomDistinctIntegers(count, min = -5, max = 5, { excludeZero = false } = {}) {
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
        while (result.length > 1 && result[result.length - 1] === 0) {
          result.pop();
        }
        return result;
      }
      function addPolynomials(left, right) {
        const length = Math.max(left.length, right.length);
        return trimCoefficients(
          Array.from(
            { length },
            (_, index) => (left[index] || 0) + (right[index] || 0)
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
            result[leftIndex + rightIndex] += leftValue * rightValue;
          });
        });
        return trimCoefficients(result);
      }
      function evaluatePolynomial(coefficients, x) {
        return [...coefficients].reverse().reduce(
          (value, coefficient) => value * x + coefficient,
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
        const coefficient = absoluteCoefficient === 1 ? "" : String(absoluteCoefficient);
        const variable = degree === 1 ? "x" : `x^${degree}`;
        return `${coefficient}${variable}`;
      }
      function polynomialText(coefficients) {
        const terms = [];
        const normalized = trimCoefficients(coefficients);
        for (let degree = normalized.length - 1; degree >= 0; degree -= 1) {
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
      function polynomialTextWithSymbol(coefficients, degree, symbol = "k") {
        const terms = [];
        const maximumDegree = Math.max(
          coefficients.length - 1,
          degree
        );
        for (let currentDegree = maximumDegree; currentDegree >= 0; currentDegree -= 1) {
          if (currentDegree === degree) {
            const variable = currentDegree === 0 ? "" : currentDegree === 1 ? "x" : `x^${currentDegree}`;
            const body2 = `${symbol}${variable}`;
            terms.push(
              terms.length === 0 ? body2 : `+ ${body2}`
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
        return root > 0 ? `(x - ${root})` : `(x + ${Math.abs(root)})`;
      }
      function numberClose(left, right) {
        return Number.isFinite(Number(left)) && Number.isFinite(Number(right)) && Math.abs(Number(left) - Number(right)) < 1e-9;
      }
      function createVerifiedProblemTypes(definitions, { conceptId, conceptTitle, verify }) {
        return definitions.map(
          (definition) => createAlgebraProblemType(
            {
              ...definition,
              validate(problem) {
                return Boolean(
                  problem.audit && verify(problem)
                );
              }
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
        isCorrectAnswer
      };
    }
  });

  // services/problemGenerators/commonMath1/polynomialArithmetic.js
  var require_polynomialArithmetic = __commonJS({
    "services/problemGenerators/commonMath1/polynomialArithmetic.js"(exports, module) {
      var {
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
        isCorrectAnswer
      } = require_helpers4();
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
        return degree === 0 ? "\uC0C1\uC218\uD56D" : `x^${degree}\uD56D`;
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
            const combined = audit.operation === "add" ? addPolynomials(audit.left, audit.right) : subtractPolynomials(audit.left, audit.right);
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
            const dividendMatches = reconstructed.join(",") === audit.dividend.join(",");
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
            if (reconstructed.join(",") !== audit.dividend.join(",")) {
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
      var definitions = [
        {
          id: "poly-add-coefficient",
          label: "\uC720\uD615 1 \xB7 \uB2E4\uD56D\uC2DD\uC758 \uB367\uC148",
          difficulty: 1,
          generate() {
            const left = randomPolynomial(3);
            const right = randomPolynomial(3);
            const degree = randomInteger(0, 3);
            const answer = coefficientAt(left, degree) + coefficientAt(right, degree);
            return {
              prompt: `A(x)=${polynomialText(left)}, B(x)=${polynomialText(right)}\uC77C \uB54C A(x)+B(x)\uC758 ${degreeLabel(degree)}\uC758 \uACC4\uC218\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: ${degreeLabel(degree)}\uC758 \uACC4\uC218\uB07C\uB9AC \uBAA8\uC74D\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: ${coefficientAt(left, degree)}+(${coefficientAt(right, degree)})=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uCC28\uC218\uAC00 \uAC19\uC740 ${degreeLabel(degree)}\uC758 \uACC4\uC218\uB9CC \uB354\uD558\uC138\uC694.`,
              audit: {
                rule: "add-coefficient",
                left,
                right,
                degree
              }
            };
          }
        },
        {
          id: "poly-subtract-coefficient",
          label: "\uC720\uD615 2 \xB7 \uB2E4\uD56D\uC2DD\uC758 \uBE84\uC148",
          difficulty: 1,
          generate() {
            const left = randomPolynomial(3);
            const right = randomPolynomial(3);
            const degree = randomInteger(0, 3);
            const answer = coefficientAt(left, degree) - coefficientAt(right, degree);
            return {
              prompt: `A(x)=${polynomialText(left)}, B(x)=${polynomialText(right)}\uC77C \uB54C A(x)-B(x)\uC758 ${degreeLabel(degree)}\uC758 \uACC4\uC218\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: B(x)\uC758 \uBAA8\uB4E0 \uD56D \uC55E \uBD80\uD638\uB97C \uBC14\uAFC9\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: ${degreeLabel(degree)}\uC758 \uACC4\uC218\uB294 ${coefficientAt(left, degree)}-(${coefficientAt(right, degree)})=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `B(x)\uB97C \uBE7C\uBBC0\uB85C \uAD04\uD638\uB97C \uD480 \uB54C \uAC01 \uD56D\uC758 \uBD80\uD638\uAC00 \uBC14\uB01D\uB2C8\uB2E4.`,
              audit: {
                rule: "subtract-coefficient",
                left,
                right,
                degree
              }
            };
          }
        },
        {
          id: "poly-linear-product-middle",
          label: "\uC720\uD615 3 \xB7 \uC77C\uCC28\uC2DD\uC758 \uACF1",
          difficulty: 1,
          generate() {
            const left = [
              randomNonZero(-6, 6),
              randomNonZero(-4, 4)
            ];
            const right = [
              randomNonZero(-6, 6),
              randomNonZero(-4, 4)
            ];
            const answer = coefficientAt(
              multiplyPolynomials(left, right),
              1
            );
            return {
              prompt: `(${polynomialText(left)})(${polynomialText(right)})\uB97C \uC804\uAC1C\uD588\uC744 \uB54C x\uC758 \uACC4\uC218\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: x\uD56D\uC740 \uB450 \uAD50\uCC28\uACF1\uC5D0\uC11C \uB098\uC635\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: ${left[1]}\xD7(${right[0]})+(${left[0]})\xD7${right[1]}=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uCCAB\uC9F8 \uC2DD\uC758 x\uD56D\xD7\uB458\uC9F8 \uC2DD\uC758 \uC0C1\uC218\uD56D\uACFC \uADF8 \uBC18\uB300\uB97C \uB354\uD558\uC138\uC694.`,
              audit: {
                rule: "product-coefficient",
                left,
                right,
                degree: 1
              }
            };
          }
        },
        {
          id: "poly-square-middle",
          label: "\uC720\uD615 4 \xB7 \uACF1\uC148\uACF5\uC2DD",
          difficulty: 2,
          generate() {
            const linear = [
              randomNonZero(-7, 7),
              randomNonZero(-4, 4)
            ];
            const answer = coefficientAt(
              multiplyPolynomials(linear, linear),
              1
            );
            return {
              prompt: `(${polynomialText(linear)})^2\uC744 \uC804\uAC1C\uD588\uC744 \uB54C x\uC758 \uACC4\uC218\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: (ax+b)^2=a^2x^2+2abx+b^2\uB97C \uC501\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: x\uC758 \uACC4\uC218\uB294 2\xD7(${linear[1]})\xD7(${linear[0]})=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uAC00\uC6B4\uB370 \uD56D\uC758 \uACC4\uC218\uB294 2ab\uC785\uB2C8\uB2E4.`,
              audit: {
                rule: "product-coefficient",
                left: linear,
                right: linear,
                degree: 1
              }
            };
          }
        },
        {
          id: "poly-evaluate-combination",
          label: "\uC720\uD615 5 \xB7 \uB2E4\uD56D\uC2DD \uACC4\uC0B0\uAC12",
          difficulty: 2,
          generate() {
            const left = randomPolynomial(2, -4, 4);
            const right = randomPolynomial(2, -4, 4);
            const x = randomNonZero(-2, 2);
            const operation = Math.random() < 0.5 ? "add" : "subtract";
            const combined = operation === "add" ? addPolynomials(left, right) : subtractPolynomials(left, right);
            const answer = evaluatePolynomial(combined, x);
            const symbol = operation === "add" ? "+" : "-";
            return {
              prompt: `A(x)=${polynomialText(left)}, B(x)=${polynomialText(right)}\uC77C \uB54C (A${symbol}B)(${x})\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: A(x)${symbol}B(x)=${polynomialText(combined)}\uB85C \uC815\uB9AC\uD569\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: x=${x}\uB97C \uB300\uC785\uD558\uBA74 ${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uBA3C\uC800 \uB3D9\uB958\uD56D\uC744 \uC815\uB9AC\uD55C \uB2E4\uC74C x=${x}\uB97C \uB300\uC785\uD558\uC138\uC694.`,
              audit: {
                rule: "evaluate-combination",
                left,
                right,
                operation,
                x
              }
            };
          }
        },
        {
          id: "poly-linear-division-coefficient",
          label: "\uC720\uD615 6 \xB7 \uB2E4\uD56D\uC2DD\uC758 \uB098\uB217\uC148",
          difficulty: 2,
          generate() {
            const data = buildLinearDivision();
            const degree = randomInteger(0, 2);
            const answer = coefficientAt(data.quotient, degree);
            return {
              prompt: `P(x)=${polynomialText(data.dividend)}\uB97C ${factorTextForPrompt(data.root)}\uB85C \uB098\uB208 \uBAAB\uC5D0\uC11C ${degreeLabel(degree)}\uC758 \uACC4\uC218\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: \uB0B4\uB9BC\uCC28\uC21C\uC73C\uB85C \uB098\uB204\uBA74 \uBAAB\uC740 Q(x)=${polynomialText(data.quotient)}\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: \uB530\uB77C\uC11C ${degreeLabel(degree)}\uC758 \uACC4\uC218\uB294 ${answer}\uC785\uB2C8\uB2E4. \uAC80\uC0B0: P(x)=${factorTextForPrompt(data.root)}Q(x)+(${data.remainder})\uC785\uB2C8\uB2E4.`,
              hintText: `\uCD5C\uACE0\uCC28\uD56D\uB07C\uB9AC \uB098\uB204\uC5B4 \uBAAB\uC744 \uD55C \uD56D\uC529 \uB9CC\uB4E0 \uB4A4 \uACF1\uD574\uC11C \uBE7C\uC138\uC694.`,
              audit: {
                rule: "division-quotient-coefficient",
                ...data,
                degree
              }
            };
          }
        },
        {
          id: "poly-quadratic-division-remainder",
          label: "\uC720\uD615 7 \xB7 \uBAAB\uACFC \uB098\uBA38\uC9C0",
          difficulty: 3,
          generate() {
            const divisor = [
              randomNonZero(-5, 5),
              randomInteger(-3, 3),
              1
            ];
            const quotient = [
              randomInteger(-4, 4),
              randomNonZero(-3, 3)
            ];
            const remainder = [
              randomInteger(-7, 7),
              randomInteger(-5, 5)
            ];
            const dividend = addPolynomials(
              multiplyPolynomials(divisor, quotient),
              remainder
            );
            const answer = evaluatePolynomial(remainder, 1);
            return {
              prompt: `P(x)=${polynomialText(dividend)}\uB97C B(x)=${polynomialText(divisor)}\uB85C \uB098\uB208 \uB098\uBA38\uC9C0\uB97C R(x)=ax+b\uB77C \uD560 \uB54C a+b\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: \uB2E4\uD56D\uC2DD \uB098\uB217\uC148\uC744 \uD558\uBA74 \uBAAB\uC740 ${polynomialText(quotient)}, \uB098\uBA38\uC9C0\uB294 ${polynomialText(remainder)}\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: a+b=R(1)=${answer}\uC785\uB2C8\uB2E4. \uAC80\uC0B0: P(x)=B(x)Q(x)+R(x)\uC785\uB2C8\uB2E4.`,
              hintText: `\uB098\uBA38\uC9C0\uC758 \uCC28\uC218\uB294 \uC774\uCC28\uC2DD B(x)\uC758 \uCC28\uC218\uBCF4\uB2E4 \uB0AE\uC544\uC57C \uD569\uB2C8\uB2E4.`,
              audit: {
                rule: "division-remainder-sum",
                divisor,
                quotient,
                remainder,
                dividend
              }
            };
          }
        },
        {
          id: "poly-synthetic-division-value",
          label: "\uC720\uD615 8 \xB7 \uC870\uB9BD\uC81C\uBC95",
          difficulty: 3,
          generate() {
            const data = buildLinearDivision();
            const x = randomNonZero(-2, 2);
            const answer = evaluatePolynomial(data.quotient, x);
            return {
              prompt: `P(x)=${polynomialText(data.dividend)}\uB97C ${factorTextForPrompt(data.root)}\uB85C \uB098\uB208 \uBAAB\uC744 Q(x)\uB77C \uD560 \uB54C Q(${x})\uC758 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: ${data.root}\uB85C \uC870\uB9BD\uC81C\uBC95\uC744 \uD558\uBA74 Q(x)=${polynomialText(data.quotient)}\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: x=${x}\uB97C \uB300\uC785\uD558\uBA74 Q(${x})=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `x-${data.root}\uB85C \uB098\uB204\uBBC0\uB85C \uC870\uB9BD\uC81C\uBC95 \uC67C\uCABD\uC5D0\uB294 ${data.root}\uB97C \uC501\uB2C8\uB2E4.`,
              audit: {
                rule: "division-quotient-value",
                ...data,
                x
              }
            };
          }
        },
        {
          id: "poly-linear-combination",
          label: "\uC720\uD615 9 \xB7 \uB2E4\uD56D\uC2DD\uC758 \uD63C\uD569 \uACC4\uC0B0",
          difficulty: 2,
          generate() {
            const left = randomPolynomial(3, -4, 4);
            const right = randomPolynomial(3, -4, 4);
            const leftScale = randomNonZero(-3, 3);
            const rightScale = randomNonZero(-3, 3);
            const degree = randomInteger(0, 3);
            const answer = leftScale * coefficientAt(left, degree) + rightScale * coefficientAt(right, degree);
            return {
              prompt: `A(x)=${polynomialText(left)}, B(x)=${polynomialText(right)}\uC77C \uB54C ${leftScale}A(x)+(${rightScale})B(x)\uC758 ${degreeLabel(degree)}\uC758 \uACC4\uC218\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: ${degreeLabel(degree)}\uC758 \uACC4\uC218\uB9CC \uACE8\uB77C \uAC01\uAC01 \uC0C1\uC218\uB97C \uACF1\uD569\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: ${leftScale}\xD7(${coefficientAt(left, degree)})+(${rightScale})\xD7(${coefficientAt(right, degree)})=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uB2E4\uD56D\uC2DD \uC804\uCCB4\uB97C \uC804\uAC1C\uD558\uC9C0 \uC54A\uACE0 \uD544\uC694\uD55C \uCC28\uC218\uC758 \uACC4\uC218\uB9CC \uACC4\uC0B0\uD574\uB3C4 \uB429\uB2C8\uB2E4.`,
              audit: {
                rule: "linear-combination-coefficient",
                left,
                right,
                leftScale,
                rightScale,
                degree
              }
            };
          }
        },
        {
          id: "poly-division-missing-constant",
          label: "\uC720\uD615 10 \xB7 \uB098\uB217\uC148\uC2DD\uC758 \uBBF8\uC815\uACC4\uC218",
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
              prompt: `P(x)=${dividendWithK}\uB97C ${factorTextForPrompt(data.root)}\uB85C \uB098\uB204\uC5C8\uC744 \uB54C \uBAAB\uC774 ${polynomialText(data.quotient)}, \uB098\uBA38\uC9C0\uAC00 ${data.remainder}\uC785\uB2C8\uB2E4. k\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: P(x)=${factorTextForPrompt(data.root)}(${polynomialText(data.quotient)})+(${data.remainder})\uB97C \uC501\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: \uC591\uBCC0\uC5D0 x=0\uC744 \uB300\uC785\uD558\uBA74 k=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uB098\uB217\uC148\uC2DD P=(\uB098\uB204\uB294 \uC2DD)\xD7(\uBAAB)+(\uB098\uBA38\uC9C0)\uC5D0 x=0\uC744 \uB300\uC785\uD558\uC138\uC694.`,
              audit: {
                rule: "division-constant",
                ...data
              }
            };
          }
        }
      ];
      function factorTextForPrompt(root) {
        return root > 0 ? `(x-${root})` : `(x+${Math.abs(root)})`;
      }
      var problemTypes = createVerifiedProblemTypes(
        definitions,
        {
          conceptId: "polynomial-arithmetic",
          conceptTitle: "\uB2E4\uD56D\uC2DD\uC758 \uC0AC\uCE59\uC5F0\uC0B0",
          verify
        }
      );
      module.exports = {
        key: "common-math-1-polynomial-arithmetic",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer,
        verify
      };
    }
  });

  // services/problemGenerators/commonMath1/identityRemainderTheorem.js
  var require_identityRemainderTheorem = __commonJS({
    "services/problemGenerators/commonMath1/identityRemainderTheorem.js"(exports, module) {
      var {
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
        isCorrectAnswer
      } = require_helpers4();
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
            const leftConstant = audit.a * audit.p + audit.k * audit.q;
            if (leftCoefficient !== audit.m || leftConstant !== audit.n) {
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
            expected = -(audit.root * audit.root + audit.constant) / audit.root;
            break;
          case "factor-choice": {
            const correct = audit.candidates.find(
              ({ value }) => evaluatePolynomial(audit.polynomial, value) === 0
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
            if (reconstructed.join(",") !== audit.polynomial.join(",")) {
              return false;
            }
            expected = evaluatePolynomial(audit.remainder, 1);
            break;
          }
          case "remainder-two-values": {
            const slope = (audit.secondValue - audit.firstValue) / (audit.secondRoot - audit.firstRoot);
            const intercept = audit.firstValue - slope * audit.firstRoot;
            expected = slope + intercept;
            break;
          }
          case "factor-parameter-cubic":
            expected = -(audit.root ** 3 + audit.linearCoefficient * audit.root + audit.constant) / audit.root ** 2;
            break;
          default:
            return false;
        }
        return numberClose(problem.answer, expected);
      }
      var definitions = [
        {
          id: "identity-product-coefficient",
          label: "\uC720\uD615 1 \xB7 \uD56D\uB4F1\uC2DD\uC758 \uACC4\uC218 \uBE44\uAD50",
          difficulty: 1,
          generate() {
            const left = [
              randomNonZero(-6, 6),
              randomNonZero(-4, 4)
            ];
            const right = [
              randomNonZero(-6, 6),
              randomNonZero(-4, 4)
            ];
            const product = multiplyPolynomials(left, right);
            const answer = coefficientAt(product, 1);
            return {
              prompt: `(${polynomialText(left)})(${polynomialText(right)})\u2261${product[2]}x^2+kx+(${product[0]})\uC77C \uB54C k\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: \uD56D\uB4F1\uC2DD\uC758 \uC591\uBCC0\uC5D0\uC11C x\uD56D\uC758 \uACC4\uC218\uB97C \uBE44\uAD50\uD569\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: \uAD50\uCC28\uD56D\uC758 \uACC4\uC218 ${left[1]}\xD7(${right[0]})+(${left[0]})\xD7${right[1]}=${answer}\uC774\uBBC0\uB85C k=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uBAA8\uB4E0 x\uC5D0\uC11C \uC131\uB9BD\uD558\uBBC0\uB85C \uAC19\uC740 \uCC28\uC218 \uD56D\uC758 \uACC4\uC218\uB294 \uC11C\uB85C \uAC19\uC2B5\uB2C8\uB2E4.`,
              audit: {
                rule: "identity-product-coefficient",
                left,
                right,
                degree: 1
              }
            };
          }
        },
        {
          id: "identity-linear-parameter",
          label: "\uC720\uD615 2 \xB7 \uC77C\uCC28 \uD56D\uB4F1\uC2DD",
          difficulty: 1,
          generate() {
            const a = randomNonZero(-5, 5);
            const k = randomNonZero(-5, 5);
            const p = randomInteger(-5, 5);
            const q = randomInteger(-5, 5);
            const m = a + k;
            const n = a * p + k * q;
            return {
              prompt: `${a}(x+(${p}))+k(x+(${q}))\u2261${m}x+(${n})\uC77C \uB54C k\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: k,
              solution: `\uBA3C\uC800: x\uC758 \uACC4\uC218\uB97C \uBE44\uAD50\uD558\uBA74 ${a}+k=${m}\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: k=${m}-(${a})=${k}\uC785\uB2C8\uB2E4. \uC0C1\uC218\uD56D\uB3C4 ${a}\xD7(${p})+${k}\xD7(${q})=${n}\uC73C\uB85C \uC77C\uCE58\uD569\uB2C8\uB2E4.`,
              hintText: `\uBA3C\uC800 \uC591\uBCC0\uC758 x\uD56D \uACC4\uC218\uB9CC \uBE44\uAD50\uD558\uC138\uC694.`,
              audit: {
                rule: "identity-linear-parameter",
                a,
                k,
                p,
                q,
                m,
                n
              }
            };
          }
        },
        {
          id: "identity-special-substitution",
          label: "\uC720\uD615 3 \xB7 \uD56D\uB4F1\uC2DD\uC758 \uC218 \uB300\uC785",
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
              prompt: `P(x)=${polynomialText(polynomial)}\uC774\uACE0 P(x)=${factorText(root)}Q(x)+k\uAC00 \uBAA8\uB4E0 x\uC5D0\uC11C \uC131\uB9BD\uD560 \uB54C k\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: remainder,
              solution: `\uBA3C\uC800: ${factorText(root)}\uAC00 0\uC774 \uB418\uB3C4\uB85D x=${root}\uB97C \uB300\uC785\uD569\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: k=P(${root})=${remainder}\uC785\uB2C8\uB2E4.`,
              hintText: `${factorText(root)}\uB97C 0\uC73C\uB85C \uB9CC\uB4DC\uB294 x=${root}\uB97C \uB300\uC785\uD558\uC138\uC694.`,
              audit: {
                rule: "remainder-linear",
                polynomial,
                root
              }
            };
          }
        },
        {
          id: "remainder-linear",
          label: "\uC720\uD615 4 \xB7 \uC77C\uCC28\uC2DD\uC758 \uB098\uBA38\uC9C0\uC815\uB9AC",
          difficulty: 1,
          generate() {
            const polynomial = randomPolynomial(3, -5, 5);
            const root = randomNonZero(-3, 3);
            const answer = evaluatePolynomial(polynomial, root);
            return {
              prompt: `P(x)=${polynomialText(polynomial)}\uB97C ${factorText(root)}\uB85C \uB098\uB208 \uB098\uBA38\uC9C0\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: \uB098\uBA38\uC9C0\uC815\uB9AC\uC5D0 \uB530\uB77C \uB098\uBA38\uC9C0\uB294 P(${root})\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: ${polynomialText(polynomial)}\uC5D0 x=${root}\uB97C \uB300\uC785\uD558\uBA74 ${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `x-a\uB85C \uB098\uB208 \uB098\uBA38\uC9C0\uB294 P(a)\uC785\uB2C8\uB2E4.`,
              audit: {
                rule: "remainder-linear",
                polynomial,
                root
              }
            };
          }
        },
        {
          id: "remainder-scaled-linear",
          label: "\uC720\uD615 5 \xB7 ax+b\uC758 \uB098\uBA38\uC9C0",
          difficulty: 2,
          generate() {
            const polynomial = randomPolynomial(3, -4, 4);
            const root = randomNonZero(-3, 3);
            const xCoefficient = randomInteger(2, 5);
            const constant = -xCoefficient * root;
            const divisor = [constant, xCoefficient];
            const answer = evaluatePolynomial(polynomial, root);
            return {
              prompt: `P(x)=${polynomialText(polynomial)}\uB97C ${polynomialText(divisor)}\uB85C \uB098\uB208 \uB098\uBA38\uC9C0\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: ${polynomialText(divisor)}=0\uC758 \uD574\uB294 x=${root}\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: \uB098\uBA38\uC9C0\uB294 P(${root})=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uB098\uB204\uB294 \uC77C\uCC28\uC2DD\uC744 0\uC73C\uB85C \uB9CC\uB4DC\uB294 x\uB97C \uBA3C\uC800 \uAD6C\uD558\uC138\uC694.`,
              audit: {
                rule: "remainder-scaled-linear",
                polynomial,
                xCoefficient,
                constant
              }
            };
          }
        },
        {
          id: "factor-parameter-quadratic",
          label: "\uC720\uD615 6 \xB7 \uC778\uC218\uC815\uB9AC\uC640 \uBBF8\uC815\uACC4\uC218",
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
              prompt: `P(x)=x^2+kx+(${constant})\uC5D0\uC11C ${factorText(root)}\uAC00 \uC778\uC218\uC77C \uB54C k\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: \uC778\uC218\uC815\uB9AC\uC5D0 \uB530\uB77C P(${root})=0\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: (${root})^2+k(${root})+(${constant})=0\uC744 \uD480\uBA74 k=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `${factorText(root)}\uAC00 \uC778\uC218\uC774\uBA74 P(${root})=0\uC785\uB2C8\uB2E4.`,
              audit: {
                rule: "factor-parameter-quadratic",
                polynomial,
                root,
                constant
              }
            };
          }
        },
        {
          id: "factor-theorem-choice",
          label: "\uC720\uD615 7 \xB7 \uC778\uC218\uC758 \uD310\uC815",
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
              if (!roots.includes(value) && !distractors.includes(value)) {
                distractors.push(value);
              }
            }
            const candidateValues = [
              roots[randomInteger(0, 1)],
              ...distractors.slice(0, 3)
            ].sort(() => Math.random() - 0.5);
            const candidates = candidateValues.map(
              (value, index) => ({
                key: ["a", "b", "c", "d"][index],
                value
              })
            );
            const choices = candidates.map(({ key, value }) => ({
              key,
              text: factorText(value)
            }));
            const answer = candidates.find(
              ({ value }) => evaluatePolynomial(polynomial, value) === 0
            ).key;
            return {
              prompt: `P(x)=${polynomialText(polynomial)}\uC758 \uC778\uC218\uC778 \uAC83\uC744 \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices,
              answer,
              solution: `\uBA3C\uC800: \uAC01 \uC120\uD0DD\uC9C0\uB97C x-a \uAF34\uB85C \uBCF4\uACE0 a\uB97C P(a)\uC5D0 \uB300\uC785\uD569\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: P(${candidates.find((item) => item.key === answer).value})=0\uC774\uBBC0\uB85C ${choices.find((item) => item.key === answer).text}\uAC00 \uC778\uC218\uC785\uB2C8\uB2E4.`,
              hintText: `x-a\uAC00 \uC778\uC218\uC778\uC9C0 \uD655\uC778\uD558\uB824\uBA74 P(a)\uB97C \uACC4\uC0B0\uD558\uC138\uC694.`,
              audit: {
                rule: "factor-choice",
                polynomial,
                candidates
              }
            };
          }
        },
        {
          id: "remainder-quadratic",
          label: "\uC720\uD615 8 \xB7 \uC774\uCC28\uC2DD\uC73C\uB85C \uB098\uB208 \uB098\uBA38\uC9C0",
          difficulty: 3,
          generate() {
            const [firstRoot, secondRoot] = randomDistinctIntegers(
              2,
              -4,
              4,
              { excludeZero: true }
            );
            const quotient = [
              randomInteger(-4, 4),
              randomNonZero(-3, 3)
            ];
            const remainder = [
              randomInteger(-7, 7),
              randomInteger(-5, 5)
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
              prompt: `P(x)=${polynomialText(polynomial)}\uB97C ${factorText(firstRoot)}${factorText(secondRoot)}\uB85C \uB098\uB208 \uB098\uBA38\uC9C0\uB97C ax+b\uB77C \uD560 \uB54C a+b\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: \uB098\uBA38\uC9C0\uB97C R(x)=ax+b\uB85C \uB461\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: x=${firstRoot}, ${secondRoot}\uB97C \uAC01\uAC01 \uB300\uC785\uD574 \uB450 \uC2DD\uC744 \uD480\uBA74 R(x)=${polynomialText(remainder)}\uC785\uB2C8\uB2E4. \uB9C8\uC9C0\uB9C9\uC73C\uB85C: a+b=R(1)=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uB098\uB204\uB294 \uC2DD\uC744 0\uC73C\uB85C \uB9CC\uB4DC\uB294 \uB450 \uAC12\uC744 \uB300\uC785\uD574 R(x)\uB97C \uAD6C\uD558\uC138\uC694.`,
              audit: {
                rule: "remainder-quadratic",
                polynomial,
                firstRoot,
                secondRoot,
                quotient,
                remainder
              }
            };
          }
        },
        {
          id: "remainder-two-values",
          label: "\uC720\uD615 9 \xB7 \uB450 \uB098\uBA38\uC9C0\uC758 \uD65C\uC6A9",
          difficulty: 3,
          generate() {
            const [firstRoot, secondRoot] = randomDistinctIntegers(
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
              prompt: `P(x)\uB97C ${factorText(firstRoot)}\uB85C \uB098\uB208 \uB098\uBA38\uC9C0\uAC00 ${firstValue}, ${factorText(secondRoot)}\uB85C \uB098\uB208 \uB098\uBA38\uC9C0\uAC00 ${secondValue}\uC785\uB2C8\uB2E4. P(x)\uB97C ${factorText(firstRoot)}${factorText(secondRoot)}\uB85C \uB098\uB208 \uB098\uBA38\uC9C0\uB97C ax+b\uB77C \uD560 \uB54C a+b\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: R(${firstRoot})=${firstValue}, R(${secondRoot})=${secondValue}\uC774\uBBC0\uB85C ${firstRoot}a+b=${firstValue}, ${secondRoot}a+b=${secondValue}\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: \uB450 \uC2DD\uC744 \uD480\uBA74 a=${slope}, b=${intercept}\uC774\uBBC0\uB85C a+b=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `R(x)=ax+b\uC5D0 \uB450 \uADFC\uC744 \uAC01\uAC01 \uB300\uC785\uD574 \uC5F0\uB9BD\uBC29\uC815\uC2DD\uC744 \uB9CC\uB4DC\uC138\uC694.`,
              audit: {
                rule: "remainder-two-values",
                firstRoot,
                secondRoot,
                firstValue,
                secondValue
              }
            };
          }
        },
        {
          id: "factor-parameter-cubic",
          label: "\uC720\uD615 10 \xB7 \uC0BC\uCC28\uC2DD\uC758 \uC778\uC218\uC815\uB9AC",
          difficulty: 3,
          generate() {
            const roots = randomDistinctIntegers(
              3,
              -5,
              5,
              { excludeZero: true }
            );
            const polynomial = roots.reduce(
              (result, root) => multiplyPolynomials(result, linearFactor(root)),
              [1]
            );
            const answer = polynomial[2];
            const hidden = polynomialTextWithSymbol(
              polynomial,
              2,
              "k"
            );
            return {
              prompt: `P(x)=${hidden}\uC5D0\uC11C ${factorText(roots[0])}\uAC00 \uC778\uC218\uC77C \uB54C k\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: \uC778\uC218\uC815\uB9AC\uC5D0 \uB530\uB77C P(${roots[0]})=0\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: (${roots[0]})^3+k(${roots[0]})^2+(${polynomial[1]})(${roots[0]})+(${polynomial[0]})=0\uC744 \uD480\uBA74 k=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `${factorText(roots[0])}\uAC00 \uC778\uC218\uC774\uBBC0\uB85C P(${roots[0]})=0\uC744 \uC774\uC6A9\uD558\uC138\uC694.`,
              audit: {
                rule: "factor-parameter-cubic",
                root: roots[0],
                linearCoefficient: polynomial[1],
                constant: polynomial[0]
              }
            };
          }
        }
      ];
      var problemTypes = createVerifiedProblemTypes(
        definitions,
        {
          conceptId: "identity-remainder-theorem",
          conceptTitle: "\uD56D\uB4F1\uC2DD\uACFC \uB098\uBA38\uC9C0\uC815\uB9AC",
          verify
        }
      );
      module.exports = {
        key: "common-math-1-identity-remainder-theorem",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer,
        verify
      };
    }
  });

  // services/problemGenerators/commonMath1/polynomialFactorization.js
  var require_polynomialFactorization = __commonJS({
    "services/problemGenerators/commonMath1/polynomialFactorization.js"(exports, module) {
      var {
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
        isCorrectAnswer
      } = require_helpers4();
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
        return [correctText, ...distractors].map((text) => ({ text, order: Math.random() })).sort((left, right) => left.order - right.order).map((choice, index) => ({
          key: ["a", "b", "c", "d"][index],
          text: choice.text,
          correct: choice.text === correctText
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
            if (polynomial.join(",") !== audit.polynomial.join(",")) {
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
            if (polynomial.join(",") !== audit.polynomial.join(",")) {
              return false;
            }
            expected = -audit.leftFactor[0] / audit.leftFactor[1] - audit.rightFactor[0] / audit.rightFactor[1];
            break;
          }
          case "grouping-factor": {
            const expectedPolynomial = multiplyPolynomials(
              linearFactor(-audit.a),
              [audit.b, 0, 1]
            );
            if (expectedPolynomial.join(",") !== audit.polynomial.join(",")) {
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
              (result, root) => multiplyPolynomials(result, linearFactor(root)),
              [1]
            );
            if (rebuilt.join(",") !== audit.polynomial.join(",")) {
              return false;
            }
            expected = audit.roots[2];
            break;
          }
          case "biquadratic-largest-root": {
            if (evaluatePolynomial(audit.polynomial, audit.p) !== 0 || evaluatePolynomial(audit.polynomial, audit.q) !== 0) {
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
      var definitions = [
        {
          id: "factor-common-number",
          label: "\uC720\uD615 1 \xB7 \uACF5\uD1B5\uC778\uC218 \uBB36\uAE30",
          difficulty: 1,
          generate() {
            const commonFactor = randomInteger(2, 9);
            const inner = [
              1,
              randomNonZero(-6, 6),
              randomNonZero(-5, 5)
            ];
            const coefficients = inner.map(
              (value) => value * commonFactor
            );
            return {
              prompt: `${polynomialText(coefficients)}\uC758 \uBAA8\uB4E0 \uD56D\uC5D0\uC11C \uBB36\uC5B4\uB0BC \uC218 \uC788\uB294 \uAC00\uC7A5 \uD070 \uC591\uC758 \uC815\uC218 \uACF5\uD1B5\uC778\uC218\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: commonFactor,
              solution: `\uBA3C\uC800: \uACC4\uC218 ${coefficients.slice().reverse().join(", ")}\uC758 \uCD5C\uB300\uACF5\uC57D\uC218\uB97C \uAD6C\uD569\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: \uCD5C\uB300\uACF5\uC57D\uC218\uB294 ${commonFactor}\uC774\uBBC0\uB85C ${commonFactor}(${polynomialText(inner)})\uB85C \uBB36\uC785\uB2C8\uB2E4.`,
              hintText: `\uAC01 \uD56D\uC758 \uACC4\uC218\uC5D0 \uACF5\uD1B5\uC73C\uB85C \uB4E4\uC5B4 \uC788\uB294 \uAC00\uC7A5 \uD070 \uC218\uB97C \uCC3E\uC73C\uC138\uC694.`,
              audit: {
                rule: "greatest-common-factor",
                coefficients
              }
            };
          }
        },
        {
          id: "factor-difference-squares",
          label: "\uC720\uD615 2 \xB7 \uC81C\uACF1\uC758 \uCC28",
          difficulty: 1,
          generate() {
            const a = randomInteger(2, 9);
            const correctText = `${factorText(a)}${factorText(-a)}`;
            const rawChoices = shuffledChoices(correctText, [
              `${factorText(a)}^2`,
              `${factorText(-a)}^2`,
              `(x-${a * a})(x+1)`
            ]);
            const choices = rawChoices.map(({ key, text }) => ({
              key,
              text
            }));
            const answer = rawChoices.find(
              ({ correct }) => correct
            ).key;
            return {
              prompt: `x^2-${a * a}\uC744 \uBC14\uB974\uAC8C \uC778\uC218\uBD84\uD574\uD55C \uAC83\uC744 \uACE0\uB974\uC138\uC694.`,
              inputMode: "multiple-choice",
              choices,
              answer,
              solution: `\uBA3C\uC800: x^2-${a * a}=x^2-${a}^2\uB294 \uC81C\uACF1\uC758 \uCC28\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: a^2-b^2=(a-b)(a+b)\uB97C \uC4F0\uBA74 ${correctText}\uC785\uB2C8\uB2E4.`,
              hintText: `a^2-b^2=(a-b)(a+b)\uB97C \uC801\uC6A9\uD558\uC138\uC694.`,
              audit: {
                rule: "factorization-choice",
                choices: rawChoices.map(
                  ({ key, text, correct }) => ({
                    key,
                    text,
                    correct
                  })
                )
              }
            };
          }
        },
        {
          id: "factor-perfect-square",
          label: "\uC720\uD615 3 \xB7 \uC644\uC804\uC81C\uACF1\uC2DD",
          difficulty: 1,
          generate() {
            const root = randomNonZero(-8, 8);
            const answer = 2 * root;
            return {
              prompt: `x^2+kx+${root * root}=${factorText(-root)}^2\uC774 \uD56D\uB4F1\uC2DD\uC77C \uB54C k\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: (x+a)^2=x^2+2ax+a^2\uB97C \uC501\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: a=${root}\uC774\uBBC0\uB85C k=2\xD7(${root})=${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uC644\uC804\uC81C\uACF1\uC2DD\uC758 \uAC00\uC6B4\uB370 \uD56D\uC740 2\xD7x\xD7\uC0C1\uC218\uD56D\uC785\uB2C8\uB2E4.`,
              audit: {
                rule: "perfect-square-parameter",
                root
              }
            };
          }
        },
        {
          id: "factor-quadratic-larger-root",
          label: "\uC720\uD615 4 \xB7 \uC774\uCC28\uC2DD \uC778\uC218\uBD84\uD574",
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
              prompt: `${polynomialText(polynomial)}=0\uC744 \uC778\uC218\uBD84\uD574\uD558\uC5EC \uAD6C\uD55C \uB450 \uC2E4\uADFC \uC911 \uD070 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: ${polynomialText(polynomial)}=${factorText(roots[0])}${factorText(roots[1])}\uB85C \uC778\uC218\uBD84\uD574\uD569\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: \uB450 \uADFC\uC740 ${roots[0]}, ${roots[1]}\uC774\uBBC0\uB85C \uD070 \uAC12\uC740 ${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uD569\uC774 ${roots[0] + roots[1]}, \uACF1\uC774 ${roots[0] * roots[1]}\uC778 \uB450 \uC218\uB97C \uCC3E\uC73C\uC138\uC694.`,
              audit: {
                rule: "larger-quadratic-root",
                roots,
                polynomial
              }
            };
          }
        },
        {
          id: "factor-nonmonic-root-sum",
          label: "\uC720\uD615 5 \xB7 \uCD5C\uACE0\uCC28\uD56D \uACC4\uC218\uAC00 1\uC774 \uC544\uB2CC \uC774\uCC28\uC2DD",
          difficulty: 2,
          generate() {
            const leading = randomInteger(2, 5);
            const firstRoot = randomNonZero(-5, 5);
            const secondRoot = randomNonZero(-6, 6);
            const leftFactor = [
              -leading * firstRoot,
              leading
            ];
            const rightFactor = [-secondRoot, 1];
            const polynomial = multiplyPolynomials(
              leftFactor,
              rightFactor
            );
            const answer = firstRoot + secondRoot;
            return {
              prompt: `${polynomialText(polynomial)}=0\uC744 \uC778\uC218\uBD84\uD574\uD588\uC744 \uB54C \uB450 \uC2E4\uADFC\uC758 \uD569\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: \uC2DD\uC740 (${polynomialText(leftFactor)})(${polynomialText(rightFactor)})=0\uC73C\uB85C \uC778\uC218\uBD84\uD574\uB429\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: \uB450 \uADFC\uC740 ${firstRoot}, ${secondRoot}\uC774\uBBC0\uB85C \uD569\uC740 ${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `\uC0C1\uC218\uD56D\uC758 \uC778\uC218 \uC870\uD569 \uC911 \uAC00\uC6B4\uB370 \uD56D\uC758 \uACC4\uC218\uB97C \uB9CC\uB4DC\uB294 \uC870\uD569\uC744 \uCC3E\uC73C\uC138\uC694.`,
              audit: {
                rule: "nonmonic-root-sum",
                leftFactor,
                rightFactor,
                polynomial
              }
            };
          }
        },
        {
          id: "factor-by-grouping",
          label: "\uC720\uD615 6 \xB7 \uBB36\uC5B4 \uC778\uC218\uBD84\uD574",
          difficulty: 2,
          generate() {
            const a = randomNonZero(-6, 6);
            const b = randomNonZero(-7, 7);
            const polynomial = multiplyPolynomials(
              [a, 1],
              [b, 0, 1]
            );
            return {
              prompt: `${polynomialText(polynomial)}=${factorText(-a)}(x^2+k)\uAC00 \uD56D\uB4F1\uC2DD\uC77C \uB54C k\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: b,
              solution: `\uBA3C\uC800: \uC55E\uC758 \uB450 \uD56D\uACFC \uB4A4\uC758 \uB450 \uD56D\uC744 \uBB36\uC73C\uBA74 x^2${factorText(-a)}+(${b})${factorText(-a)}\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: \uACF5\uD1B5\uC778\uC218 ${factorText(-a)}\uB97C \uBB36\uC73C\uBA74 ${factorText(-a)}(${polynomialText([b, 0, 1])})\uC774\uBBC0\uB85C k=${b}\uC785\uB2C8\uB2E4.`,
              hintText: `\uB450 \uD56D\uC529 \uBB36\uC5B4 \uC591\uCABD\uC5D0\uC11C \uAC19\uC740 \uC77C\uCC28\uC2DD\uC744 \uACF5\uD1B5\uC778\uC218\uB85C \uB9CC\uB4DC\uC138\uC694.`,
              audit: {
                rule: "grouping-factor",
                a,
                b,
                polynomial
              }
            };
          }
        },
        {
          id: "factor-cube-difference",
          label: "\uC720\uD615 7 \xB7 \uC138\uC81C\uACF1\uC758 \uCC28",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 7);
            return {
              prompt: `x^3-${a ** 3}=${factorText(a)}(x^2+kx+${a * a})\uC77C \uB54C k\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: a,
              solution: `\uBA3C\uC800: a^3-b^3=(a-b)(a^2+ab+b^2)\uB97C \uC501\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: x^3-${a}^3=${factorText(a)}(x^2+${a}x+${a * a})\uC774\uBBC0\uB85C k=${a}\uC785\uB2C8\uB2E4.`,
              hintText: `\uC138\uC81C\uACF1\uC758 \uCC28\uC5D0\uC11C \uB450 \uBC88\uC9F8 \uC778\uC218\uC758 \uAC00\uC6B4\uB370 \uBD80\uD638\uB294 +\uC785\uB2C8\uB2E4.`,
              audit: {
                rule: "cube-difference-coefficient",
                a
              }
            };
          }
        },
        {
          id: "factor-cube-sum",
          label: "\uC720\uD615 8 \xB7 \uC138\uC81C\uACF1\uC758 \uD569",
          difficulty: 2,
          generate() {
            const a = randomInteger(2, 7);
            return {
              prompt: `x^3+${a ** 3}=${factorText(-a)}(x^2+kx+${a * a})\uC77C \uB54C k\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: -a,
              solution: `\uBA3C\uC800: a^3+b^3=(a+b)(a^2-ab+b^2)\uB97C \uC501\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: x^3+${a}^3=${factorText(-a)}(x^2-${a}x+${a * a})\uC774\uBBC0\uB85C k=${-a}\uC785\uB2C8\uB2E4.`,
              hintText: `\uC138\uC81C\uACF1\uC758 \uD569\uC5D0\uC11C \uB450 \uBC88\uC9F8 \uC778\uC218\uC758 \uAC00\uC6B4\uB370 \uBD80\uD638\uB294 -\uC785\uB2C8\uB2E4.`,
              audit: {
                rule: "cube-sum-coefficient",
                a
              }
            };
          }
        },
        {
          id: "factor-cubic-remaining-root",
          label: "\uC720\uD615 9 \xB7 \uC778\uC218\uC815\uB9AC\uC640 \uC0BC\uCC28\uC2DD",
          difficulty: 3,
          generate() {
            const roots = randomDistinctIntegers(
              3,
              -6,
              6,
              { excludeZero: true }
            );
            const polynomial = roots.reduce(
              (result, root) => multiplyPolynomials(result, linearFactor(root)),
              [1]
            );
            return {
              prompt: `P(x)=${polynomialText(polynomial)}\uC774\uACE0 ${factorText(roots[0])}, ${factorText(roots[1])}\uAC00 P(x)\uC758 \uC778\uC218\uC785\uB2C8\uB2E4. \uB098\uBA38\uC9C0 \uC77C\uCC28\uC778\uC218\uB97C x-k\uB77C \uD560 \uB54C k\uB97C \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer: roots[2],
              solution: `\uBA3C\uC800: \uB450 \uC778\uC218\uB85C \uC870\uB9BD\uC81C\uBC95\uC744 \uCC28\uB840\uB85C \uD558\uBA74 \uB0A8\uB294 \uC778\uC218\uB294 ${factorText(roots[2])}\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: \uB530\uB77C\uC11C x-k=${factorText(roots[2])}\uC774\uBBC0\uB85C k=${roots[2]}\uC785\uB2C8\uB2E4. \uAC80\uC0B0: \uC138 \uC778\uC218\uB97C \uACF1\uD558\uBA74 P(x)\uC640 \uAC19\uC2B5\uB2C8\uB2E4.`,
              hintText: `\uC54C\uB824\uC9C4 \uB450 \uADFC\uC73C\uB85C \uC870\uB9BD\uC81C\uBC95\uC744 \uB450 \uBC88 \uD558\uC138\uC694.`,
              audit: {
                rule: "remaining-cubic-root",
                roots,
                polynomial
              }
            };
          }
        },
        {
          id: "factor-biquadratic-substitution",
          label: "\uC720\uD615 10 \xB7 \uCE58\uD658\uC744 \uC774\uC6A9\uD55C \uC778\uC218\uBD84\uD574",
          difficulty: 3,
          generate() {
            const [p, q] = randomDistinctIntegers(2, 2, 7);
            const first = [-p * p, 0, 1];
            const second = [-q * q, 0, 1];
            const polynomial = multiplyPolynomials(first, second);
            const answer = Math.max(p, q);
            return {
              prompt: `${polynomialText(polynomial)}=0\uC758 \uC591\uC758 \uC2E4\uADFC \uC911 \uAC00\uC7A5 \uD070 \uAC12\uC744 \uAD6C\uD558\uC138\uC694.`,
              inputMode: "short-answer",
              answer,
              solution: `\uBA3C\uC800: y=x^2\uB85C \uCE58\uD658\uD558\uBA74 (y-${p * p})(y-${q * q})=0\uC785\uB2C8\uB2E4. \uB2E4\uC74C\uC73C\uB85C: x^2=${p * p} \uB610\uB294 x^2=${q * q}\uC774\uBBC0\uB85C \uC591\uC758 \uC2E4\uADFC\uC740 ${p}, ${q}\uC785\uB2C8\uB2E4. \uAC00\uC7A5 \uD070 \uAC12\uC740 ${answer}\uC785\uB2C8\uB2E4.`,
              hintText: `x^2\uB97C \uD558\uB098\uC758 \uBB38\uC790 y\uB85C \uCE58\uD658\uD55C \uB4A4 \uC774\uCC28\uC2DD\uCC98\uB7FC \uC778\uC218\uBD84\uD574\uD558\uC138\uC694.`,
              audit: {
                rule: "biquadratic-largest-root",
                p,
                q,
                polynomial
              }
            };
          }
        }
      ];
      var problemTypes = createVerifiedProblemTypes(
        definitions,
        {
          conceptId: "polynomial-factorization",
          conceptTitle: "\uB2E4\uD56D\uC2DD\uC758 \uC778\uC218\uBD84\uD574",
          verify
        }
      );
      module.exports = {
        key: "common-math-1-polynomial-factorization",
        requiredDistinctTypes: 5,
        problemTypes,
        isCorrectAnswer,
        verify
      };
    }
  });

  // services/problemGenerators/index.js
  var require_problemGenerators = __commonJS({
    "services/problemGenerators/index.js"(exports, module) {
      var functionLimit = require_functionLimit();
      var limitPropertiesAndCalculation = require_limitPropertiesAndCalculation();
      var functionContinuity = require_functionContinuity();
      var continuousFunctionProperties = require_continuousFunctionProperties();
      var {
        generatorMap: advancedCalculusGeneratorMap
      } = require_advancedCalculus();
      var powersAndRoots = require_powersAndRoots();
      var rationalAndRealExponents = require_rationalAndRealExponents();
      var exponentLaws = require_exponentLaws();
      var logarithmDefinitionAndProperties = require_logarithmDefinitionAndProperties();
      var commonLogarithmApplications = require_commonLogarithmApplications();
      var exponentialAndLogarithmicFunctions = require_exponentialAndLogarithmicFunctions();
      var exponentialAndLogarithmicGraphs = require_exponentialAndLogarithmicGraphs();
      var exponentialAndLogarithmicApplications = require_exponentialAndLogarithmicApplications();
      var generalAnglesAndRadians = require_generalAnglesAndRadians();
      var trigonometricFunctionsAndGraphs = require_trigonometricFunctionsAndGraphs();
      var sineAndCosineLaws = require_sineAndCosineLaws();
      var sequenceBasics = require_sequenceBasics();
      var arithmeticSequences = require_arithmeticSequences();
      var geometricSequences = require_geometricSequences();
      var sigmaDefinitionAndProperties = require_sigmaDefinitionAndProperties();
      var sumsOfVariousSequences = require_sumsOfVariousSequences();
      var recursiveSequences = require_recursiveSequences();
      var mathematicalInduction = require_mathematicalInduction();
      var {
        generatorMap: probabilityStatisticsGeneratorMap
      } = require_generators2();
      var polynomialArithmetic = require_polynomialArithmetic();
      var identityRemainderTheorem = require_identityRemainderTheorem();
      var polynomialFactorization = require_polynomialFactorization();
      var {
        generatorMap: commonMathGeneratorMap
      } = require_generators();
      var generatorRegistry = new Map([
        [
          [
            "common-math-1",
            "polynomials",
            "polynomial-arithmetic"
          ].join("/"),
          polynomialArithmetic
        ],
        [
          [
            "common-math-1",
            "polynomials",
            "identity-remainder-theorem"
          ].join("/"),
          identityRemainderTheorem
        ],
        [
          [
            "common-math-1",
            "polynomials",
            "polynomial-factorization"
          ].join("/"),
          polynomialFactorization
        ],
        [
          [
            "calculus-1",
            "limits-and-continuity",
            "calculus-1-01-01"
          ].join("/"),
          functionLimit
        ],
        [
          [
            "calculus-1",
            "limits-and-continuity",
            "calculus-1-01-02"
          ].join("/"),
          limitPropertiesAndCalculation
        ],
        [
          [
            "calculus-1",
            "limits-and-continuity",
            "calculus-1-01-03"
          ].join("/"),
          functionContinuity
        ],
        [
          [
            "calculus-1",
            "limits-and-continuity",
            "calculus-1-01-04"
          ].join("/"),
          continuousFunctionProperties
        ],
        ...advancedCalculusGeneratorMap.entries(),
        [
          [
            "algebra",
            "exponential-logarithmic-functions",
            "algebra-01-01"
          ].join("/"),
          powersAndRoots
        ],
        [
          [
            "algebra",
            "exponential-logarithmic-functions",
            "algebra-01-02"
          ].join("/"),
          rationalAndRealExponents
        ],
        [
          [
            "algebra",
            "exponential-logarithmic-functions",
            "algebra-01-03"
          ].join("/"),
          exponentLaws
        ],
        [
          [
            "algebra",
            "exponential-logarithmic-functions",
            "algebra-01-04"
          ].join("/"),
          logarithmDefinitionAndProperties
        ],
        [
          [
            "algebra",
            "exponential-logarithmic-functions",
            "algebra-01-05"
          ].join("/"),
          commonLogarithmApplications
        ],
        [
          [
            "algebra",
            "exponential-logarithmic-functions",
            "algebra-01-06"
          ].join("/"),
          exponentialAndLogarithmicFunctions
        ],
        [
          [
            "algebra",
            "exponential-logarithmic-functions",
            "algebra-01-07"
          ].join("/"),
          exponentialAndLogarithmicGraphs
        ],
        [
          [
            "algebra",
            "exponential-logarithmic-functions",
            "algebra-01-08"
          ].join("/"),
          exponentialAndLogarithmicApplications
        ],
        [
          [
            "algebra",
            "trigonometric-functions",
            "algebra-02-01"
          ].join("/"),
          generalAnglesAndRadians
        ],
        [
          [
            "algebra",
            "trigonometric-functions",
            "algebra-02-02"
          ].join("/"),
          trigonometricFunctionsAndGraphs
        ],
        [
          [
            "algebra",
            "trigonometric-functions",
            "algebra-02-03"
          ].join("/"),
          sineAndCosineLaws
        ],
        [
          [
            "algebra",
            "sequences",
            "algebra-03-01"
          ].join("/"),
          sequenceBasics
        ],
        [
          [
            "algebra",
            "sequences",
            "algebra-03-02"
          ].join("/"),
          arithmeticSequences
        ],
        [
          [
            "algebra",
            "sequences",
            "algebra-03-03"
          ].join("/"),
          geometricSequences
        ],
        [
          [
            "algebra",
            "sequences",
            "algebra-03-04"
          ].join("/"),
          sigmaDefinitionAndProperties
        ],
        [
          [
            "algebra",
            "sequences",
            "algebra-03-05"
          ].join("/"),
          sumsOfVariousSequences
        ],
        [
          [
            "algebra",
            "sequences",
            "algebra-03-06"
          ].join("/"),
          recursiveSequences
        ],
        [
          [
            "algebra",
            "sequences",
            "algebra-03-07"
          ].join("/"),
          mathematicalInduction
        ],
        ...probabilityStatisticsGeneratorMap.entries(),
        ...commonMathGeneratorMap.entries()
      ]);
      function getProblemGenerator2({
        courseId,
        unitId,
        conceptId
      }) {
        return generatorRegistry.get(
          [courseId, unitId, conceptId].join("/")
        ) || null;
      }
      function listProblemGeneratorRegistrations() {
        return [...generatorRegistry.entries()].map(
          ([registryKey, generator]) => {
            const [courseId, unitId, conceptId] = registryKey.split("/");
            const cachedModule = Object.values(__require.cache).find(
              (entry) => entry?.exports === generator
            );
            return {
              registryKey,
              courseId,
              unitId,
              conceptId,
              generator,
              sourceFile: cachedModule?.filename || ""
            };
          }
        );
      }
      module.exports = {
        getProblemGenerator: getProblemGenerator2,
        listProblemGeneratorRegistrations
      };
    }
  });

  // scripts/ipadWebgenBridgeEntry.js
  var templates = require_assessmentTemplates();
  var {
    getProblemGenerator
  } = require_problemGenerators();
  function pickStageGenerate(template, learnedSet) {
    let generate = null;
    for (const stage of template.stages || []) {
      if ((stage.requiredConceptIds || []).every((id) => learnedSet.has(id))) {
        generate = stage.generate;
      }
    }
    return generate || template.generate;
  }
  function tryGenerate(generate, retries) {
    for (let attempt = 0; attempt < retries; attempt += 1) {
      try {
        const problem = generate();
        if (problem?.prompt && problem.answer !== void 0 && problem.answer !== null && String(problem.answer).length > 0) {
          return problem;
        }
      } catch (_error) {
      }
    }
    return null;
  }
  globalThis.MatthsWebGen = {
    drawAdvanced(courseId, unitId, learned, count) {
      const config = (templates.unitConfigs || []).find(
        (unit) => unit.courseId === courseId && unit.unitId === unitId
      );
      if (!config) return [];
      const learnedSet = new Set(learned || []);
      const eligible = learnedSet.size ? config.advancedTemplates.filter(
        (template) => (template.stages || []).some(
          (stage) => (stage.requiredConceptIds || []).every(
            (id) => learnedSet.has(id)
          )
        ) || (template.requiredConceptIds || []).every((id) => learnedSet.has(id))
      ) : config.advancedTemplates;
      const pool = eligible.length ? eligible : config.advancedTemplates;
      const output = [];
      const used = /* @__PURE__ */ new Set();
      let guard = 0;
      while (output.length < count && guard < count * 8) {
        guard += 1;
        const template = pool[Math.floor(Math.random() * pool.length)];
        if (used.has(template.id) && used.size < pool.length) continue;
        const problem = tryGenerate(pickStageGenerate(template, learnedSet), 40);
        if (!problem) continue;
        used.add(template.id);
        output.push({
          templateId: template.id,
          title: template.title || "",
          estimatedMinutes: template.estimatedMinutes || 8,
          sourcePattern: template.sourcePattern || "",
          prompt: problem.prompt,
          choices: Array.isArray(problem.choices) && problem.choices.length ? problem.choices : null,
          answer: String(problem.answer),
          solution: problem.solution || "",
          hintText: problem.hintText || ""
        });
      }
      return output;
    },
    conceptGeneratorInfo(courseId, unitId, conceptId) {
      const generator = getProblemGenerator({ courseId, unitId, conceptId });
      if (!generator) return null;
      return {
        key: generator.key,
        requiredDistinctTypes: generator.requiredDistinctTypes || 5,
        types: (generator.problemTypes || []).map((type) => ({
          id: type.id,
          label: type.label || "",
          difficulty: type.difficulty || 1
        }))
      };
    },
    generateLocal(courseId, unitId, conceptId, typeId, count) {
      const generator = getProblemGenerator({ courseId, unitId, conceptId });
      if (!generator) return [];
      const types = (generator.problemTypes || []).filter(
        (type) => !typeId || type.id === typeId
      );
      if (!types.length) return [];
      const output = [];
      let guard = 0;
      while (output.length < count && guard < count * 6) {
        guard += 1;
        const type = types[Math.floor(Math.random() * types.length)];
        const problem = tryGenerate(type.generate, 40);
        if (!problem) continue;
        output.push({
          typeId: type.id,
          label: type.label || "",
          difficulty: type.difficulty || 1,
          prompt: problem.prompt,
          choices: Array.isArray(problem.choices) && problem.choices.length ? problem.choices : null,
          answer: String(problem.answer),
          solution: problem.solution || "",
          hintText: problem.hintText || "",
          visualization: problem.visualization || null
        });
      }
      return output;
    }
  };
})();
