/* ============================================================
   유형별 풀이 안무 (solution scenes)

   같은 유형이면 값이 바뀌어도 풀이의 뼈대는 같다 — 그래서 안무를 유형 단위로
   한 번만 짜 두고, 그 회차의 수치를 꽂아 재생한다. 시드가 달라지면 곡선이
   휘는 정도와 눈금 숫자만 달라지고 연출은 같다.

   입력: 생성기가 문항과 함께 내보내는 visualization 파라미터
     { kind: "polynomial", focusX: 2, coefficients: {...} }
   출력: scenario-player.js 가 그대로 먹는 시나리오 {id, beats}

   등록되지 않은 유형은 buildGeneric 이 풀이 단계 텍스트만으로 식 변형 안무를
   만든다 — 어떤 문제도 "재생할 게 없음" 으로 끝나지 않는다.
   ============================================================ */

(function (root) {
  "use strict";

  /* ---------- 팔레트 (시맨틱 그래프 토큰과 같은 값, RG-18) ----------
     주역은 그래프 주 파랑, 강조·소거는 마젠타 — 빨강은 오류 의미로만 남긴다. */
  const C = {
    main: "#327FFA",   // 주역 (graph-primary)
    hot: "#CA44E3",    // 강조·소거 (graph-highlight)
    ok: "#178A4C",     // 성립·정답 (state-correct)
    mute: "#8B8578",   // 보조
    ink: "#26221C",
  };

  /* ---------- 수치 서식 ---------- */
  const nf = (x) => {
    if (!isFinite(x)) return "";
    const r = Math.round(x * 1000) / 1000;
    return Number.isInteger(r) ? String(r) : String(r);
  };
  /** 부호 붙은 항: 3 → "+3", -3 → "-3" */
  const sg = (x) => (x >= 0 ? "+" + nf(x) : "-" + nf(-x));
  /** 계수 항: 1x → x, -1x → -x, 0x → "" */
  const term = (c, sym) => {
    if (c === 0) return "";
    if (sym === "") return sg(c);
    if (c === 1) return "+" + sym;
    if (c === -1) return "-" + sym;
    return sg(c) + sym;
  };
  /** 맨 앞 항의 + 를 떼고 정리 */
  const head = (s) => s.replace(/^\+/, "").replace(/^$/, "0");

  /* ---------- 무대 기하 ---------- */
  const STAGE = { w: 1920, h: 1080 };
  /** 왼쪽 큰 좌표평면 (오른쪽은 수식·설명 자리) */
  const PLANE_RECT = { x: 220, y: 150, w: 880, h: 780 };

  /**
   * 표준 좌표평면 액션. 범위를 주면 눈금을 알아서 고른다.
   */
  function plane(id, xRange, yRange, opts) {
    opts = opts || {};
    const ticks = (lo, hi) => {
      const span = hi - lo;
      const raw = span / 5;
      const mag = Math.pow(10, Math.floor(Math.log10(raw)));
      const step = [1, 2, 2.5, 5, 10].map((m) => m * mag)
        .find((s) => span / s <= 6.5) || mag * 10;
      const out = [];
      for (let t = Math.ceil(lo / step) * step; t <= hi + 1e-9; t += step) {
        const v = Math.round(t * 1000) / 1000;
        if (Math.abs(v) > 1e-9 || opts.keepZero) out.push(v);
      }
      return out.slice(0, 7);
    };
    return {
      type: "plane", id,
      rect: opts.rect || PLANE_RECT,
      xRange, yRange,
      xTicks: opts.xTicks || ticks(xRange[0], xRange[1]),
      yTicks: opts.yTicks || ticks(yRange[0], yRange[1]),
      showGrid: opts.showGrid !== false,
      xLabel: opts.xLabel || "x",
      yLabel: opts.yLabel || "y",
      drawSec: opts.drawSec || 1.0,
    };
  }

  /** 함수를 점렬로 — 발산 구간은 잘라낸다 */
  function sample(fn, x0, x1, opts) {
    opts = opts || {};
    const n = opts.n || 90;
    const yMin = opts.yMin, yMax = opts.yMax;
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const y = fn(x);
      if (!isFinite(y)) continue;
      if (yMin !== undefined && y < yMin) continue;
      if (yMax !== undefined && y > yMax) continue;
      pts.push([x, Math.round(y * 10000) / 10000]);
    }
    return pts;
  }

  /** 오른쪽 설명 열의 라벨 (화면 좌표) */
  function note(id, line, tex, opts) {
    opts = opts || {};
    return {
      type: "glabel", id,
      at: [opts.x || 1200, 250 + line * 110],
      tex: tex,
      size: opts.size || 40,
      color: opts.color || C.ink,
    };
  }
  function noteText(id, line, text, opts) {
    const a = note(id, line, "", opts);
    delete a.tex;
    a.text = text;
    return a;
  }

  const beat = (dur, subtitle, actions) => ({ dur, subtitle, actions });

  /* ============================================================
     등록부 — kind → (viz, ctx) => scenario
     ctx = { steps, statement, answer, typeName }
     ============================================================ */
  const BUILDERS = {};
  const register = (kind, fn) => { BUILDERS[kind] = fn; };

  /* ---------- 다항함수의 극한: 대입하면 끝난다 ---------- */
  register("polynomial", (v, ctx) => {
    const co = v.coefficients || {};
    const a = co.quadratic || 0, b = co.linear || 0, c = co.constant || 0;
    const f = (x) => a * x * x + b * x + c;
    const x0 = v.focusX || 0;
    const y0 = f(x0);
    const xr = [x0 - 3.2, x0 + 3.2];
    const ys = sample(f, xr[0], xr[1]).map((p) => p[1]);
    const pad = Math.max(1, (Math.max(...ys) - Math.min(...ys)) * 0.15);
    const yr = [Math.min(...ys, 0) - pad, Math.max(...ys, 0) + pad];
    const tex = head(term(a, "x^2") + term(b, "x") + term(c, ""));

    return {
      id: "sol-polynomial",
      beats: [
        beat(6, `다항함수 $f(x)=${tex}$ 의 그래프입니다.`, [
          plane("pl", xr, yr),
          { type: "plot", id: "f", plane: "pl", points: sample(f, xr[0], xr[1]), color: C.main, width: 5, drawSec: 1.4 },
          note("n1", 0, `f(x)=${tex}`, { color: C.main }),
        ]),
        beat(7, `$x$ 를 $${nf(x0)}$ 로 보내면 그래프 위의 점도 함께 따라갑니다.`, [
          { type: "mover", id: "m", plane: "pl", points: sample(f, x0 - 2.6, x0), travelSec: 3.0, trail: true, color: C.hot },
          { type: "vline", id: "vx", plane: "pl", x: x0, from: yr[0], to: y0, dashed: true, color: C.mute, label: `$x=${nf(x0)}$` },
        ]),
        beat(7, "다항함수는 끊긴 곳이 없어서 극한값이 곧 함숫값입니다.", [
          { type: "point", id: "P", plane: "pl", at: [x0, y0], r: 11, color: C.hot, label: `$(${nf(x0)},\\ ${nf(y0)})$` },
          note("n2", 1, `\\lim_{x\\to ${nf(x0)}}f(x)=f(${nf(x0)})`, { color: C.ink }),
        ]),
        beat(8, `직접 대입해 계산하면 값이 $${nf(y0)}$ 입니다.`, [
          note("n3", 2, `f(${nf(x0)})=${nf(y0)}`, { color: C.ok, size: 46 }),
          { type: "seg", id: "sy", plane: "pl", from: [x0, y0], to: [0, y0], dashed: true, color: C.ok, width: 3 },
        ]),
      ],
    };
  });

  /* ---------- 유리식의 극한: 구멍 뚫린 직선 ---------- */
  register("hole-linear", (v) => {
    const m = v.slope || 1, k = v.intercept || 0, x0 = v.focusX || 0;
    const g = (x) => m * x + k;
    const y0 = g(x0);
    const xr = [x0 - 3.5, x0 + 3.5];
    const yr = [y0 - Math.abs(m) * 3.5 - 1, y0 + Math.abs(m) * 3.5 + 1];
    const tex = head(term(m, "x") + term(k, ""));

    return {
      id: "sol-hole-linear",
      beats: [
        beat(7, `약분하면 $y=${tex}$ 인 직선입니다. 단 한 점만 빠져 있습니다.`, [
          plane("pl", xr, yr),
          { type: "plot", id: "f", plane: "pl", points: sample(g, xr[0], xr[1]), color: C.main, width: 5, drawSec: 1.4 },
          note("n1", 0, `y=${tex}\\quad(x\\ne ${nf(x0)})`, { color: C.main }),
        ]),
        beat(7, `$x=${nf(x0)}$ 에서는 분모가 0 이라 그 점이 뚫려 있습니다.`, [
          { type: "point", id: "hole", plane: "pl", at: [x0, y0], r: 13, color: C.hot, label: "구멍" },
          { type: "vline", id: "vx", plane: "pl", x: x0, from: yr[0], to: y0, dashed: true, color: C.mute },
        ]),
        beat(8, "극한은 그 점에 도달하지 않고 다가가기만 하므로 구멍과 무관합니다.", [
          { type: "mover", id: "ml", plane: "pl", points: sample(g, x0 - 2.4, x0 - 0.05, { n: 40 }), travelSec: 2.4, trail: true, color: C.ok },
          { type: "mover", id: "mr", plane: "pl", points: sample(g, x0 + 2.4, x0 + 0.05, { n: 40 }), travelSec: 2.4, trail: true, color: C.ok },
        ]),
        beat(7, `양쪽에서 같은 높이 $${nf(y0)}$ 로 모입니다.`, [
          note("n2", 1, `\\lim_{x\\to ${nf(x0)}}f(x)=${nf(y0)}`, { color: C.ok, size: 46 }),
          { type: "seg", id: "sy", plane: "pl", from: [x0, y0], to: [xr[0], y0], dashed: true, color: C.ok, width: 3 },
        ]),
      ],
    };
  });

  /* ---------- 좌우 극한이 다른 조각함수 ---------- */
  register("piecewise-linear", (v) => {
    const x0 = v.focusX || 0;
    const L = v.left || { slope: 1, constant: 0 };
    const R = v.right || { slope: 1, constant: 0 };
    const fl = (x) => L.slope * x + L.constant;
    const fr = (x) => R.slope * x + R.constant;
    const yl = fl(x0), yr0 = fr(x0);
    const xr = [x0 - 3.2, x0 + 3.2];
    const all = [yl, yr0, fl(xr[0]), fr(xr[1])];
    const yr = [Math.min(...all) - 1.2, Math.max(...all) + 1.2];
    const same = Math.abs(yl - yr0) < 1e-9;

    return {
      id: "sol-piecewise-linear",
      beats: [
        beat(7, `경계 $x=${nf(x0)}$ 를 사이에 두고 식이 둘로 나뉩니다.`, [
          plane("pl", xr, yr),
          { type: "plot", id: "fl", plane: "pl", points: sample(fl, xr[0], x0), color: C.main, width: 5, drawSec: 1.2 },
          { type: "plot", id: "fr", plane: "pl", points: sample(fr, x0, xr[1]), color: C.ok, width: 5, drawSec: 1.2 },
          { type: "vline", id: "vx", plane: "pl", x: x0, from: yr[0], to: yr[1], dashed: true, color: C.mute, label: `$x=${nf(x0)}$` },
        ]),
        beat(7, "왼쪽에서 다가가면 왼쪽 식의 값에 닿습니다.", [
          { type: "mover", id: "ml", plane: "pl", points: sample(fl, x0 - 2.6, x0, { n: 40 }), travelSec: 2.6, trail: true, color: C.main },
          note("n1", 0, `\\lim_{x\\to ${nf(x0)}^-}f(x)=${nf(yl)}`, { color: C.main }),
        ]),
        beat(7, "오른쪽에서 다가가면 오른쪽 식의 값에 닿습니다.", [
          { type: "mover", id: "mr", plane: "pl", points: sample(fr, x0 + 2.6, x0, { n: 40 }), travelSec: 2.6, trail: true, color: C.ok },
          note("n2", 1, `\\lim_{x\\to ${nf(x0)}^+}f(x)=${nf(yr0)}`, { color: C.ok }),
        ]),
        beat(8,
          same ? "좌극한과 우극한이 같으므로 극한값이 존재합니다."
               : "좌극한과 우극한이 다르므로 극한값은 존재하지 않습니다.", [
          { type: "point", id: "pl2", plane: "pl", at: [x0, yl], r: 11, color: C.main },
          { type: "point", id: "pr2", plane: "pl", at: [x0, yr0], r: 11, color: C.ok },
          note("n3", 2, same ? `\\lim_{x\\to ${nf(x0)}}f(x)=${nf(yl)}` : `${nf(yl)}\\ne ${nf(yr0)}`,
               { color: same ? C.ok : C.hot, size: 46 }),
        ]),
      ],
    };
  });

  /* ---------- 좌우 극한 값이 직접 주어진 경우 ---------- */
  register("one-sided-limits", (v) => {
    const x0 = v.focusX || 0;
    const l = v.leftLimit ?? 0, r = v.rightLimit ?? 0;
    const same = Math.abs(l - r) < 1e-9;
    const xr = [x0 - 3, x0 + 3];
    const yr = [Math.min(l, r) - 2, Math.max(l, r) + 2];
    const curveL = sample((x) => l + (x - x0) * 0.35, xr[0], x0 - 0.02, { n: 40 });
    const curveR = sample((x) => r + (x - x0) * 0.35, x0 + 0.02, xr[1], { n: 40 });

    return {
      id: "sol-one-sided",
      beats: [
        beat(7, `$x=${nf(x0)}$ 근처만 확대해서 보겠습니다.`, [
          plane("pl", xr, yr),
          { type: "vline", id: "vx", plane: "pl", x: x0, from: yr[0], to: yr[1], dashed: true, color: C.mute, label: `$x=${nf(x0)}$` },
        ]),
        beat(7, `왼쪽 가지는 높이 $${nf(l)}$ 를 향합니다.`, [
          { type: "plot", id: "cl", plane: "pl", points: curveL, color: C.main, width: 5, drawSec: 1.2 },
          { type: "point", id: "pl2", plane: "pl", at: [x0, l], r: 11, color: C.main, label: `$${nf(l)}$` },
          note("n1", 0, `\\lim_{x\\to ${nf(x0)}^-}f(x)=${nf(l)}`, { color: C.main }),
        ]),
        beat(7, `오른쪽 가지는 높이 $${nf(r)}$ 를 향합니다.`, [
          { type: "plot", id: "cr", plane: "pl", points: curveR, color: C.ok, width: 5, drawSec: 1.2 },
          { type: "point", id: "pr2", plane: "pl", at: [x0, r], r: 11, color: C.ok, label: `$${nf(r)}$` },
          note("n2", 1, `\\lim_{x\\to ${nf(x0)}^+}f(x)=${nf(r)}`, { color: C.ok }),
        ]),
        beat(8, same ? "두 값이 같으니 극한값이 존재합니다." : "두 값이 다르니 극한값은 없습니다.", [
          note("n3", 2, same ? `\\lim_{x\\to ${nf(x0)}}f(x)=${nf(l)}` : `\\lim_{x\\to ${nf(x0)}}f(x)\\ \\text{없음}`,
               { color: same ? C.ok : C.hot, size: 44 }),
        ]),
      ],
    };
  });

  /* ---------- 극한의 성질로 결합 ---------- */
  register("limit-law-combination", (v) => {
    const x0 = v.focusX || 0;
    const fl = v.fLimit ?? 0, gl = v.gLimit ?? 0, res = v.resultLimit ?? 0;
    const xr = [x0 - 3, x0 + 3];
    const yr = [Math.min(fl, gl, res, 0) - 2, Math.max(fl, gl, res, 0) + 2];
    return {
      id: "sol-limit-law",
      beats: [
        beat(7, "두 함수가 각각 어느 높이로 향하는지부터 봅니다.", [
          plane("pl", xr, yr),
          { type: "plot", id: "f", plane: "pl", points: sample((x) => fl + (x - x0) * 0.4, xr[0], xr[1]), color: C.main, width: 5 },
          { type: "vline", id: "vx", plane: "pl", x: x0, from: yr[0], to: yr[1], dashed: true, color: C.mute },
        ]),
        beat(7, `$f(x)$ 는 $${nf(fl)}$ 로 갑니다.`, [
          { type: "point", id: "pf", plane: "pl", at: [x0, fl], r: 11, color: C.main, label: `$${nf(fl)}$` },
          note("n1", 0, `\\lim f(x)=${nf(fl)}`, { color: C.main }),
        ]),
        beat(7, `$g(x)$ 는 $${nf(gl)}$ 로 갑니다.`, [
          { type: "plot", id: "g", plane: "pl", points: sample((x) => gl - (x - x0) * 0.4, xr[0], xr[1]), color: C.ok, width: 5 },
          { type: "point", id: "pg", plane: "pl", at: [x0, gl], r: 11, color: C.ok, label: `$${nf(gl)}$` },
          note("n2", 1, `\\lim g(x)=${nf(gl)}`, { color: C.ok }),
        ]),
        beat(8, "극한은 각각 구해서 결합해도 됩니다 — 그게 극한의 성질입니다.", [
          note("n3", 2, `\\Rightarrow\\ ${nf(res)}`, { color: C.hot, size: 48 }),
          { type: "point", id: "pr", plane: "pl", at: [x0, res], r: 13, color: C.hot, label: `$${nf(res)}$` },
        ]),
      ],
    };
  });

  /* ---------- 표로 극한 관찰 ---------- */
  register("table-points", (v) => {
    const x0 = v.focusX || 0, t = v.target ?? 0;
    const xs = v.xValues || [], ys = v.yValues || [];
    const pts = xs.map((x, i) => [x, ys[i]]);
    const xr = [Math.min(x0, ...xs) - 0.3, Math.max(x0, ...xs) + 0.3];
    const yr = [Math.min(t, ...ys) - 0.4, Math.max(t, ...ys) + 0.4];
    const dots = (from, to, color) => pts.slice(from, to).map((p, i) => ({
      type: "point", id: `t${from}${i}`, plane: "pl", at: p, r: 10, color, label: `$${nf(p[1])}$`,
    }));
    return {
      id: "sol-table-points",
      beats: [
        beat(6, `$x$ 를 $${nf(x0)}$ 에 가깝게 넣어 보며 $y$ 값을 관찰합니다.`, [
          plane("pl", xr, yr),
          { type: "vline", id: "vx", plane: "pl", x: x0, from: yr[0], to: yr[1], dashed: true, color: C.mute, label: `$x=${nf(x0)}$` },
        ]),
        beat(7, "왼쪽에서 다가갈 때의 값들입니다.", dots(0, Math.ceil(pts.length / 2), C.main)),
        beat(7, "오른쪽에서 다가갈 때의 값들입니다.", dots(Math.ceil(pts.length / 2), pts.length, C.ok)),
        beat(8, `양쪽 모두 $${nf(t)}$ 로 좁혀집니다.`, [
          { type: "seg", id: "sy", plane: "pl", from: [xr[0], t], to: [xr[1], t], dashed: true, color: C.hot, width: 3 },
          note("n1", 0, `\\lim_{x\\to ${nf(x0)}}f(x)=${nf(t)}`, { color: C.hot, size: 46 }),
        ]),
      ],
    };
  });

  /* ---------- 유리함수의 불연속점 ---------- */
  register("rational-continuity", (v) => {
    const pole = v.pole ?? 0;
    const num = v.numeratorConstant ?? 1;
    const f = (x) => num / (x - pole);
    const xr = [pole - 4, pole + 4];
    const yr = [-6, 6];
    return {
      id: "sol-rational-continuity",
      beats: [
        beat(7, `분모가 $0$ 이 되는 곳은 $x=${nf(pole)}$ 하나뿐입니다.`, [
          plane("pl", xr, yr),
          { type: "vline", id: "vx", plane: "pl", x: pole, from: yr[0], to: yr[1], dashed: true, color: C.hot, label: `$x=${nf(pole)}$` },
          note("n1", 0, `x-(${nf(pole)})=0`, { color: C.hot }),
        ]),
        beat(8, "그 점을 기준으로 그래프가 두 조각으로 끊깁니다.", [
          { type: "plot", id: "fl", plane: "pl", points: sample(f, xr[0], pole - 0.12, { n: 70, yMin: yr[0], yMax: yr[1] }), color: C.main, width: 5, drawSec: 1.3 },
          { type: "plot", id: "fr", plane: "pl", points: sample(f, pole + 0.12, xr[1], { n: 70, yMin: yr[0], yMax: yr[1] }), color: C.main, width: 5, drawSec: 1.3 },
        ]),
        beat(7, "이 점을 포함하지 않는 구간에서는 함수가 이어져 있습니다.", [
          { type: "fill", id: "safe", plane: "pl", points: [[pole + 0.6, yr[0]], [xr[1], yr[0]], [xr[1], yr[1]], [pole + 0.6, yr[1]]], color: C.ok, opacity: 0.16 },
        ]),
        beat(7, v.note || "분모를 0 으로 만드는 값을 피한 구간을 고르면 됩니다.", [
          note("n2", 1, `x\\ne ${nf(pole)}\\ \\Rightarrow\\ \\text{연속}`, { color: C.ok, size: 44 }),
        ]),
      ],
    };
  });

  /* ---------- 닫힌구간에서의 연속 ---------- */
  register("continuous-interval", (v) => {
    const a = v.left ?? -1, b = v.right ?? 1;
    const ya = v.leftValue ?? 0, ym = v.midpointValue ?? 0, yb = v.rightValue ?? 0;
    const mid = v.midpoint ?? (a + b) / 2;
    // 세 점을 지나는 부드러운 곡선 (라그랑주 보간)
    const f = (x) =>
      ya * ((x - mid) * (x - b)) / ((a - mid) * (a - b)) +
      ym * ((x - a) * (x - b)) / ((mid - a) * (mid - b)) +
      yb * ((x - a) * (x - mid)) / ((b - a) * (b - mid));
    const xr = [a - 1, b + 1];
    const ys = sample(f, a, b).map((p) => p[1]);
    const yr = [Math.min(...ys) - 1.5, Math.max(...ys) + 1.5];
    return {
      id: "sol-continuous-interval",
      beats: [
        beat(7, `구간 $[${nf(a)},\\,${nf(b)}]$ 안에서 그래프가 끊기지 않습니다.`, [
          plane("pl", xr, yr),
          { type: "plot", id: "f", plane: "pl", points: sample(f, a, b), color: C.main, width: 5, drawSec: 1.5 },
        ]),
        beat(7, "왼쪽 끝에서는 오른쪽에서 다가간 값이 함숫값과 같습니다.", [
          { type: "point", id: "pa", plane: "pl", at: [a, ya], r: 12, color: C.ok, label: `$f(${nf(a)})$` },
          note("n1", 0, `\\lim_{x\\to ${nf(a)}^+}f(x)=f(${nf(a)})`, { color: C.ok }),
        ]),
        beat(7, "오른쪽 끝에서는 왼쪽에서 다가간 값이 함숫값과 같습니다.", [
          { type: "point", id: "pb", plane: "pl", at: [b, yb], r: 12, color: C.ok, label: `$f(${nf(b)})$` },
          note("n2", 1, `\\lim_{x\\to ${nf(b)}^-}f(x)=f(${nf(b)})`, { color: C.ok }),
        ]),
        beat(8, v.note || "두 끝점까지 이어지므로 닫힌구간 전체에서 연속입니다.", [
          { type: "fill", id: "band", plane: "pl", points: [[a, yr[0]], [b, yr[0]], [b, yr[1]], [a, yr[1]]], color: C.ok, opacity: 0.12 },
          note("n3", 2, `[${nf(a)},\\,${nf(b)}]\\ \\text{에서 연속}`, { color: C.ok, size: 44 }),
        ]),
      ],
    };
  });

  /* ---------- 무리식 유리화 ---------- */
  register("rationalized-root", (v) => {
    const x0 = v.focusX ?? 0, r = v.root ?? Math.sqrt(Math.max(x0, 0));
    const f = (x) => (Math.sqrt(Math.max(x, 0)) - r) / (x - x0 || 1e-9);
    const lim = 1 / (2 * r || 1);
    const xr = [Math.max(0, x0 - 12), x0 + 12];
    const yr = [lim - 0.12, lim + 0.12];
    return {
      id: "sol-rationalized-root",
      beats: [
        beat(7, "그대로 대입하면 분모와 분자가 모두 $0$ 이 됩니다.", [
          plane("pl", xr, yr),
          note("n1", 0, `\\frac{0}{0}\\ \\text{꼴}`, { color: C.hot }),
        ]),
        beat(8, "분자를 유리화하면 약분할 인수가 드러납니다.", [
          note("n2", 1, `\\frac{\\sqrt{x}-${nf(r)}}{x-${nf(x0)}}\\cdot\\frac{\\sqrt{x}+${nf(r)}}{\\sqrt{x}+${nf(r)}}`, { color: C.main, size: 36 }),
        ]),
        beat(8, `약분하고 나면 $\\dfrac{1}{\\sqrt{x}+${nf(r)}}$ 만 남습니다.`, [
          { type: "plot", id: "f", plane: "pl", points: sample(f, xr[0] + 0.2, xr[1], { n: 90, yMin: yr[0], yMax: yr[1] }), color: C.main, width: 5, drawSec: 1.4 },
          note("n3", 2, `=\\frac{1}{\\sqrt{x}+${nf(r)}}`, { color: C.main }),
        ]),
        beat(7, `이제 대입할 수 있습니다 — 값은 $${nf(Math.round(lim * 10000) / 10000)}$ 입니다.`, [
          { type: "point", id: "P", plane: "pl", at: [x0, lim], r: 12, color: C.ok, label: `$${nf(Math.round(lim * 10000) / 10000)}$` },
        ]),
      ],
    };
  });

  /* ---------- 극한값과 함숫값이 다른 예 ---------- */
  register("limit-point-example", (v) => {
    const x0 = v.focusX ?? 0, L = v.limitValue ?? 0, P = v.pointValue ?? 0;
    const xr = [x0 - 3, x0 + 3];
    const yr = [Math.min(L, P) - 1.5, Math.max(L, P) + 1.5];
    return {
      id: "sol-limit-point",
      beats: [
        beat(7, `$x=${nf(x0)}$ 를 뺀 곳에서는 그래프가 매끈합니다.`, [
          plane("pl", xr, yr),
          { type: "plot", id: "fl", plane: "pl", points: sample((x) => L, xr[0], x0 - 0.05, { n: 30 }), color: C.main, width: 5 },
          { type: "plot", id: "fr", plane: "pl", points: sample((x) => L, x0 + 0.05, xr[1], { n: 30 }), color: C.main, width: 5 },
        ]),
        beat(7, `양쪽에서 다가가면 높이 $${nf(L)}$ 로 모입니다 — 이게 극한값입니다.`, [
          { type: "point", id: "hole", plane: "pl", at: [x0, L], r: 12, color: C.mute, label: "극한" },
          note("n1", 0, `\\lim_{x\\to ${nf(x0)}}f(x)=${nf(L)}`, { color: C.main }),
        ]),
        beat(7, `그런데 그 점의 함숫값은 따로 $${nf(P)}$ 로 정해져 있습니다.`, [
          { type: "point", id: "pv", plane: "pl", at: [x0, P], r: 13, color: C.hot, label: `$f(${nf(x0)})=${nf(P)}$` },
          note("n2", 1, `f(${nf(x0)})=${nf(P)}`, { color: C.hot }),
        ]),
        beat(8, "극한값과 함숫값은 다를 수 있습니다 — 극한은 그 점을 보지 않습니다.", [
          note("n3", 2, Math.abs(L - P) < 1e-9 ? `\\text{두 값이 같다}` : `${nf(L)}\\ne ${nf(P)}`,
               { color: C.hot, size: 46 }),
        ]),
      ],
    };
  });

  /* ---------- 역제곱형 발산 ---------- */
  register("inverse-square", (v) => {
    const x0 = v.focusX ?? 0, k = v.coefficient ?? 1;
    const f = (x) => k / ((x - x0) * (x - x0));
    const xr = [x0 - 4, x0 + 4];
    const yr = [-1, 12];
    return {
      id: "sol-inverse-square",
      beats: [
        beat(7, `$x=${nf(x0)}$ 에 가까울수록 분모가 작아집니다.`, [
          plane("pl", xr, yr),
          { type: "vline", id: "vx", plane: "pl", x: x0, from: yr[0], to: yr[1], dashed: true, color: C.hot, label: `$x=${nf(x0)}$` },
        ]),
        beat(8, "작은 수로 나누면 값은 한없이 커집니다.", [
          { type: "plot", id: "fl", plane: "pl", points: sample(f, xr[0], x0 - 0.28, { n: 70, yMax: yr[1] }), color: C.main, width: 5, drawSec: 1.4 },
          { type: "plot", id: "fr", plane: "pl", points: sample(f, x0 + 0.28, xr[1], { n: 70, yMax: yr[1] }), color: C.main, width: 5, drawSec: 1.4 },
        ]),
        beat(7, "제곱이라 좌우 모두 양수 쪽으로 치솟습니다.", [
          { type: "mover", id: "m", plane: "pl", points: sample(f, x0 - 2.2, x0 - 0.3, { n: 40, yMax: yr[1] }), travelSec: 2.6, trail: true, color: C.ok },
        ]),
        beat(7, "정해진 값으로 모이지 않으므로 극한은 $\\infty$ 로 발산합니다.", [
          note("n1", 0, `\\lim_{x\\to ${nf(x0)}}\\frac{${nf(k)}}{(x-${nf(x0)})^2}=\\infty`, { color: C.hot, size: 40 }),
        ]),
      ],
    };
  });

  /* ---------- 지수·로그함수 ---------- */
  register("algebra-exp-log", (v) => {
    const base = v.base || 2;
    const isLog = (v.functionType || v.focusFunction) === "log";
    const sx = v.shiftX || 0, sy = v.shiftY || 0;
    const f = isLog
      ? (x) => Math.log(x - sx) / Math.log(base) + sy
      : (x) => Math.pow(base, x - sx) + sy;
    const xr = isLog ? [sx - 0.5, sx + Math.pow(base, 2.4) + 1] : [-3 + sx, 3 + sx];
    const yr = isLog ? [-3 + sy, 3 + sy] : [sy - 1, sy + Math.pow(base, 3) * 0.9];
    const fx = v.focusX;
    const acts = [
      plane("pl", xr, yr),
      { type: "plot", id: "f", plane: "pl", points: sample(f, xr[0] + 0.02, xr[1], { n: 110, yMin: yr[0], yMax: yr[1] }), color: C.main, width: 5, drawSec: 1.5 },
    ];
    const asym = isLog
      ? { type: "vline", id: "as", plane: "pl", x: sx, from: yr[0], to: yr[1], dashed: true, color: C.mute, label: `$x=${nf(sx)}$` }
      : { type: "seg", id: "as", plane: "pl", from: [xr[0], sy], to: [xr[1], sy], dashed: true, color: C.mute, width: 3, label: `$y=${nf(sy)}$` };

    const beats = [
      beat(7, isLog ? `밑이 $${nf(base)}$ 인 로그함수의 그래프입니다.` : `밑이 $${nf(base)}$ 인 지수함수의 그래프입니다.`, acts),
      beat(7, isLog ? "진수가 0 에 가까워지면 그래프가 수직 점근선에 붙습니다."
                    : "값이 아무리 작아져도 점근선 아래로는 내려가지 않습니다.", [asym]),
    ];
    if (fx !== undefined && fx !== null && isFinite(f(fx))) {
      beats.push(beat(8, `$x=${nf(fx)}$ 을 넣으면 높이가 정해집니다.`, [
        { type: "vline", id: "vf", plane: "pl", x: fx, from: yr[0], to: f(fx), dashed: true, color: C.hot },
        { type: "point", id: "P", plane: "pl", at: [fx, f(fx)], r: 12, color: C.hot, label: `$${nf(Math.round(f(fx) * 100) / 100)}$` },
      ]));
    }
    beats.push(beat(7, v.note || "그래프 위의 점 하나가 곧 식의 값입니다.", [
      note("n1", 0, isLog ? `y=\\log_{${nf(base)}}(x${sx ? sg(-sx) : ""})${sy ? sg(sy) : ""}`
                          : `y=${nf(base)}^{x${sx ? sg(-sx) : ""}}${sy ? sg(sy) : ""}`,
           { color: C.main, size: 38 }),
    ]));
    return { id: "sol-algebra-exp-log", beats };
  });

  /* ---------- 삼각함수 ---------- */
  register("algebra-trig", (v) => {
    const A = v.amplitude || 1, w = v.frequency || 1, k = v.verticalShift || 0;
    const name = v.functionName || "sin";
    const base = name === "cos" ? Math.cos : name === "tan" ? Math.tan : Math.sin;
    const f = (deg) => A * base((w * deg * Math.PI) / 180) + k;
    const xr = [0, 360];
    const yr = [k - Math.abs(A) - 1, k + Math.abs(A) + 1];
    const deg = v.focusDegree;
    const beats = [
      beat(7, `$y=${A === 1 ? "" : nf(A)}\\${name}${w === 1 ? "" : nf(w)}x${k ? sg(k) : ""}$ 의 그래프입니다.`, [
        plane("pl", xr, yr, { xTicks: [90, 180, 270, 360] }),
        { type: "plot", id: "f", plane: "pl", points: sample(f, 0, 360, { n: 140, yMin: yr[0], yMax: yr[1] }), color: C.main, width: 5, drawSec: 1.6 },
      ]),
      beat(7, `진폭이 $${nf(Math.abs(A))}$ 이므로 위아래로 그만큼 흔들립니다.`, [
        { type: "seg", id: "top", plane: "pl", from: [0, k + Math.abs(A)], to: [360, k + Math.abs(A)], dashed: true, color: C.mute, width: 3 },
        { type: "seg", id: "bot", plane: "pl", from: [0, k - Math.abs(A)], to: [360, k - Math.abs(A)], dashed: true, color: C.mute, width: 3 },
      ]),
    ];
    if (deg !== undefined && deg !== null && isFinite(f(deg))) {
      beats.push(beat(8, `$x=${nf(deg)}^\\circ$ 에서의 높이가 함숫값입니다.`, [
        { type: "vline", id: "vf", plane: "pl", x: deg, from: k, to: f(deg), dashed: true, color: C.hot },
        { type: "point", id: "P", plane: "pl", at: [deg, f(deg)], r: 12, color: C.hot, label: `$${nf(Math.round(f(deg) * 100) / 100)}$` },
      ]));
    }
    beats.push(beat(7, v.note || "각을 정하면 그래프의 높이가 곧 삼각함수 값입니다.", [
      note("n1", 0, `${name === "sin" ? "\\sin" : name === "cos" ? "\\cos" : "\\tan"}\\ \\text{값} = \\text{그래프의 높이}`, { color: C.ok, size: 38 }),
    ]));
    return { id: "sol-algebra-trig", beats };
  });

  /* ---------- 수열 ---------- */
  register("algebra-sequence", (v) => {
    const vals = (v.values && v.values.length ? v.values : [1, 2, 3, 4, 5]).slice(0, 8);
    const fi = v.focusIndex ?? 0;
    const xr = [0, vals.length + 1];
    const yr = [Math.min(0, ...vals) - 1, Math.max(...vals) + 2];
    const dots = vals.map((y, i) => ({
      type: "point", id: `a${i}`, plane: "pl", at: [i + 1, y], r: 10,
      color: i === fi ? C.hot : C.main, label: `$${nf(y)}$`,
    }));
    const d = vals.length > 1 ? vals[1] - vals[0] : 0;
    const arith = vals.every((y, i) => i === 0 || Math.abs(y - vals[i - 1] - d) < 1e-9);
    return {
      id: "sol-algebra-sequence",
      beats: [
        beat(7, "수열은 자연수 자리마다 찍힌 점들의 모임입니다.", [
          plane("pl", xr, yr, { xTicks: vals.map((_, i) => i + 1), xLabel: "n", yLabel: "a_n" }),
          ...dots.slice(0, 3),
        ]),
        beat(7, "이어지는 항들을 마저 찍어 봅니다.", dots.slice(3)),
        beat(8, arith ? `이웃한 항의 차이가 항상 $${nf(d)}$ 로 같습니다 — 등차수열입니다.`
                      : "이웃한 항의 관계에서 규칙을 읽습니다.",
          vals.slice(1).map((y, i) => ({
            type: "seg", id: `d${i}`, plane: "pl", from: [i + 1, vals[i]], to: [i + 2, y],
            color: C.ok, width: 3, dashed: true,
          }))),
        beat(7, v.note || "규칙을 식으로 쓰면 임의의 항을 바로 구할 수 있습니다.", [
          { type: "point", id: `a${fi}`, plane: "pl", at: [fi + 1, vals[fi]], r: 15, color: C.hot, label: `$a_{${fi + 1}}=${nf(vals[fi])}$` },
          note("n1", 0, arith ? `a_n=a_1${d >= 0 ? "+" : "-"}(n-1)\\cdot ${nf(Math.abs(d))}` : `a_n\\ \\text{의 규칙}`,
               { color: C.ok, size: 40 }),
        ]),
      ],
    };
  });

  /* ---------- 계산형 대수 유형 — 개념 계열로 그림을 고른다 ----------
     지수·로그·삼각·수열은 파라미터가 따로 오지 않지만, 어느 계열인지는 안다.
     계열마다 "그 단원의 그림" 을 한 장 세워 두고 풀이 단계를 그 위에 얹는다. */
  register("algebra-concept", (v, ctx) => {
    const cid = String(v.conceptId || "");
    const unit = cid.slice(0, 10);          // algebra-01 / algebra-02 / algebra-03
    const idx = Number(cid.slice(11, 13)) || 1;
    const steps = (ctx && ctx.steps) || [];
    const tail = () => beat(7, steps.length ? String(steps[steps.length - 1]).replace(/\$/g, "").slice(0, 60)
                                            : "정리하면 답이 나옵니다.", [
      noteText("ans", 2, ctx && ctx.answer ? `답  ${String(ctx.answer).replace(/\$/g, "").slice(0, 24)}` : "정리",
               { x: 1180, size: 52, color: C.ok }),
    ]);

    // 지수와 로그 (algebra-01)
    if (unit === "algebra-01") {
      const isLog = idx >= 4;
      const b = 2;
      const f = isLog ? (x) => Math.log(x) / Math.log(b) : (x) => Math.pow(b, x);
      const xr = isLog ? [0.05, 9] : [-3, 3.2];
      const yr = isLog ? [-3.2, 3.2] : [-0.6, 9];
      return {
        id: "sol-algebra-01",
        beats: [
          beat(7, isLog ? "로그는 '밑을 몇 번 곱해야 그 수가 되는가' 입니다."
                        : "거듭제곱은 밑을 반복해서 곱한 결과입니다.", [
            plane("pl", xr, yr),
            { type: "plot", id: "f", plane: "pl", points: sample(f, xr[0], xr[1], { n: 110, yMin: yr[0], yMax: yr[1] }), color: C.main, width: 5, drawSec: 1.5 },
          ]),
          beat(7, isLog ? "밑이 같으면 로그끼리 더하고 빼서 합칠 수 있습니다."
                        : "밑이 같으면 지수끼리 더하고 빼서 합칠 수 있습니다.", [
            note("n1", 0, isLog ? "\\log_a M+\\log_a N=\\log_a MN" : "a^m\\cdot a^n=a^{m+n}", { color: C.main, size: 38 }),
          ]),
          beat(7, steps[0] ? String(steps[0]).replace(/\$/g, "").slice(0, 60) : "식을 하나로 모읍니다.", [
            note("n2", 1, isLog ? "\\log_a M^k=k\\log_a M" : "(a^m)^n=a^{mn}", { color: C.ok, size: 38 }),
            { type: "point", id: "P", plane: "pl", at: isLog ? [4, 2] : [2, 4], r: 12, color: C.hot },
          ]),
          tail(),
        ],
      };
    }

    // 삼각함수 (algebra-02) — 단위원과 각
    if (unit === "algebra-02") {
      const rad = Math.PI / 3;
      const arc = [];
      for (let i = 0; i <= 40; i++) {
        const t = (rad * i) / 40;
        arc.push([Math.cos(t), Math.sin(t)]);
      }
      const circle = [];
      for (let i = 0; i <= 96; i++) {
        const t = (i / 96) * Math.PI * 2;
        circle.push([Math.cos(t), Math.sin(t)]);
      }
      return {
        id: "sol-algebra-02",
        beats: [
          beat(7, "반지름 $1$ 인 원 위에서 각을 재면 삼각함수가 보입니다.", [
            plane("pl", [-1.4, 1.4], [-1.4, 1.4], { xTicks: [-1, 1], yTicks: [-1, 1] }),
            { type: "plot", id: "c", plane: "pl", points: circle, color: C.mute, width: 4, drawSec: 1.4 },
          ]),
          beat(7, "각이 커지면 원 위의 점이 그만큼 돌아갑니다.", [
            { type: "plot", id: "arc", plane: "pl", points: arc, color: C.hot, width: 7, drawSec: 1.2 },
            { type: "mover", id: "m", plane: "pl", points: arc, travelSec: 2.4, trail: true, color: C.hot },
          ]),
          beat(8, "그 점의 $x$ 좌표가 코사인, $y$ 좌표가 사인입니다.", [
            { type: "seg", id: "sx", plane: "pl", from: [0, 0], to: [Math.cos(rad), Math.sin(rad)], color: C.main, width: 4 },
            { type: "seg", id: "sy", plane: "pl", from: [Math.cos(rad), 0], to: [Math.cos(rad), Math.sin(rad)], dashed: true, color: C.ok, width: 3 },
            note("n1", 0, "(\\cos\\theta,\\ \\sin\\theta)", { color: C.main, size: 40 }),
          ]),
          tail(),
        ],
      };
    }

    // 수열 (algebra-03) — 항을 블록으로 쌓는다
    const vals = [3, 5, 7, 9, 11];
    return {
      id: "sol-algebra-03",
      beats: [
        beat(7, "수열의 항을 하나씩 늘어놓고 규칙을 찾습니다.", [
          plane("pl", [0, 6], [0, 13], { xTicks: [1, 2, 3, 4, 5], xLabel: "n", yLabel: "a_n" }),
          ...vals.map((y, i) => ({ type: "point", id: `a${i}`, plane: "pl", at: [i + 1, y], r: 10, color: C.main, label: `$${y}$` })),
        ]),
        beat(7, "이웃한 항의 차이가 일정하면 등차수열입니다.", [
          ...vals.slice(1).map((y, i) => ({
            type: "seg", id: `d${i}`, plane: "pl", from: [i + 1, vals[i]], to: [i + 2, y], color: C.ok, width: 3, dashed: true,
          })),
          note("n1", 0, "a_{n+1}-a_n=\\text{일정}", { color: C.ok, size: 38 }),
        ]),
        beat(8, "합은 항을 블록으로 쌓아 세는 것과 같습니다.", [
          { type: "blocks", id: "bk", rect: { x: 1180, y: 480, w: 520, h: 300 }, rows: 5, cols: 7, count: 25, gap: 7, color: C.main, countLabel: true },
        ]),
        tail(),
      ],
    };
  });

  /* ============================================================
     네이티브 생성기(ProblemGenerator.swift) 17유형
     각 유형의 수치가 그대로 넘어오므로, 같은 안무에 값만 갈아 끼운다.
     ============================================================ */

  /* 삼차함수의 극값 — f(x)=x³+px²+qx 의 봉우리와 골짜기 */
  register("swift-cubic-extremum", (v) => {
    const p = v.p || 0, q = v.q || 0, a = v.a || -1, b = v.b || 1;
    const f = (x) => x * x * x + p * x * x + q * x;
    const df = (x) => 3 * x * x + 2 * p * x + q;
    const xr = [a - 1.6, b + 1.6];
    const ys = sample(f, xr[0], xr[1]).map((t) => t[1]);
    const yr = [Math.min(...ys) - 2, Math.max(...ys) + 2];
    return {
      id: "sol-cubic-extremum",
      beats: [
        beat(7, `삼차함수 $f(x)=x^3${term(p, "x^2")}${term(q, "x")}$ 의 그래프입니다.`, [
          plane("pl", xr, yr),
          { type: "plot", id: "f", plane: "pl", points: sample(f, xr[0], xr[1]), color: C.main, width: 5, drawSec: 1.6 },
        ]),
        beat(7, "극값은 봉우리와 골짜기 — 그 자리에서 접선이 눕습니다.", [
          { type: "point", id: "PA", plane: "pl", at: [a, f(a)], r: 12, color: C.hot, label: `극대 $x=${nf(a)}$` },
          { type: "point", id: "PB", plane: "pl", at: [b, f(b)], r: 12, color: C.ok, label: `극소 $x=${nf(b)}$` },
        ]),
        beat(8, `접선의 기울기가 $0$ 인 곳이니 $f'(x)=3x^2${term(2 * p, "x")}${term(q, "")}$ 의 근입니다.`, [
          { type: "plot", id: "df", plane: "pl", points: sample(df, xr[0], xr[1], { yMin: yr[0], yMax: yr[1] }), color: C.mute, width: 4, dashed: true },
          note("n1", 0, `f'(x)=3x^2${term(2 * p, "x")}${term(q, "")}`, { color: C.mute, size: 36 }),
        ]),
        beat(8, "두 근이 곧 극점의 $x$ 좌표이므로 근과 계수의 관계로 상수를 찾습니다.", [
          note("n2", 1, `${nf(a)}+${nf(b)}=-\\frac{2p}{3}\\ \\Rightarrow\\ p=${nf(p)}`, { color: C.main, size: 34 }),
          note("n3", 2, `${nf(a)}\\cdot${nf(b)}=\\frac{q}{3}\\ \\Rightarrow\\ q=${nf(q)}`, { color: C.ok, size: 34 }),
        ]),
      ],
    };
  });

  /* 로그방정식 — 지수와 로그가 서로 되돌리는 관계 */
  register("swift-log-equation", (v) => {
    const base = v.base || 2, k = v.k || 1, c = v.c || 0, x = v.x || 0;
    const f = (t) => Math.log(t - c) / Math.log(base);
    const xr = [c - 0.5, x + Math.max(2, (x - c) * 0.35)];
    const yr = [-2, k + 2];
    return {
      id: "sol-log-equation",
      beats: [
        beat(7, `$y=\\log_{${nf(base)}}(x-${nf(c)})$ 의 그래프에서 높이가 $${nf(k)}$ 인 곳을 찾습니다.`, [
          plane("pl", xr, yr),
          { type: "plot", id: "f", plane: "pl", points: sample(f, c + 0.02, xr[1], { n: 110, yMin: yr[0], yMax: yr[1] }), color: C.main, width: 5, drawSec: 1.6 },
          { type: "vline", id: "as", plane: "pl", x: c, from: yr[0], to: yr[1], dashed: true, color: C.mute, label: `$x=${nf(c)}$` },
        ]),
        beat(7, "로그의 정의를 그대로 쓰면 지수식으로 바뀝니다.", [
          { type: "seg", id: "hk", plane: "pl", from: [xr[0], k], to: [xr[1], k], dashed: true, color: C.ok, width: 3, label: `$y=${nf(k)}$` },
          note("n1", 0, `\\log_{${nf(base)}}A=${nf(k)}\\iff A=${nf(base)}^{${nf(k)}}`, { color: C.ok, size: 34 }),
        ]),
        beat(8, `진수를 통째로 두면 $x-${nf(c)}=${nf(base)}^{${nf(k)}}$ 입니다.`, [
          note("n2", 1, `x-${nf(c)}=${nf(Math.pow(base, k))}`, { color: C.main, size: 38 }),
          { type: "point", id: "P", plane: "pl", at: [x, k], r: 12, color: C.hot, label: `$x=${nf(x)}$` },
        ]),
        beat(7, "진수가 양수인지 확인하면 풀이가 끝납니다.", [
          note("n3", 2, `x=${nf(x)}\\quad(${nf(Math.pow(base, k))}>0)`, { color: C.ok, size: 42 }),
        ]),
      ],
    };
  });

  /* 순열·조합 — 자리를 채우는 블록 */
  register("swift-counting", (v) => {
    const n = v.n || 5, r = v.r || 2, perm = !!v.isPerm, ans = v.answer ?? 0;
    return {
      id: "sol-counting",
      beats: [
        beat(7, `서로 다른 $${nf(n)}$ 명이 있습니다.`, [
          { type: "blocks", id: "all", rect: { x: 260, y: 300, w: 700, h: 320 }, rows: 2, cols: Math.ceil(n / 2), count: n, gap: 10, color: C.main, countLabel: true },
        ]),
        beat(7, perm ? "'일렬로 세운다' — 뽑은 뒤 순서까지 정합니다."
                     : "'뽑는다' 만 있습니다 — 순서는 따지지 않습니다.", [
          { type: "blocks", id: "pick", rect: { x: 260, y: 700, w: 420, h: 150 }, rows: 1, cols: r, count: r, gap: 10, color: C.hot, countLabel: true },
          note("n1", 0, perm ? "\\text{순서 있음}" : "\\text{순서 없음}", { color: C.hot }),
        ]),
        beat(8, perm ? `자리마다 후보가 하나씩 줄어듭니다.`
                     : `순서만큼 중복해서 셌으니 $${nf(r)}!$ 로 나눕니다.`, [
          note("n2", 1, perm ? `{}_{${nf(n)}}P_{${nf(r)}}` : `{}_{${nf(n)}}C_{${nf(r)}}=\\frac{{}_{${nf(n)}}P_{${nf(r)}}}{${nf(r)}!}`,
               { color: C.main, size: 40 }),
        ]),
        beat(7, `계산하면 $${nf(ans)}$ 가지입니다.`, [
          note("n3", 2, `=${nf(ans)}`, { color: C.ok, size: 52 }),
        ]),
      ],
    };
  });

  /* 정적분 — 넓이로 보는 적분 */
  register("swift-definite-integral", (v) => {
    const a = v.a || 1, b = v.b || 1, ans = v.answer ?? 0;
    const f = (x) => 2 * x + b;
    const xr = [-0.6, a + 1];
    const yr = [-0.6, f(a) + 1.5];
    const region = [[0, 0], ...sample(f, 0, a, { n: 40 }), [a, 0]];
    return {
      id: "sol-definite-integral",
      beats: [
        beat(7, `적분할 함수 $y=2x+${nf(b)}$ 를 그립니다.`, [
          plane("pl", xr, yr),
          { type: "plot", id: "f", plane: "pl", points: sample(f, xr[0], xr[1]), color: C.main, width: 5, drawSec: 1.3 },
        ]),
        beat(8, `$0$ 부터 $${nf(a)}$ 까지의 정적분은 이 사다리꼴의 넓이입니다.`, [
          { type: "fill", id: "area", plane: "pl", points: region, color: C.ok, opacity: 0.3 },
          { type: "vline", id: "vb", plane: "pl", x: a, from: 0, to: f(a), dashed: true, color: C.mute, label: `$x=${nf(a)}$` },
        ]),
        beat(8, "항별로 적분하면 부정적분이 나옵니다.", [
          note("n1", 0, `\\int(2x+${nf(b)})dx=x^2+${nf(b)}x+C`, { color: C.main, size: 34 }),
        ]),
        beat(7, `위끝에서 아래끝을 빼면 $${nf(ans)}$ 입니다.`, [
          note("n2", 1, `\\left[x^2+${nf(b)}x\\right]_0^{${nf(a)}}=${nf(ans)}`, { color: C.ok, size: 40 }),
        ]),
      ],
    };
  });

  /* 주기 수열의 합 — 세 항씩 묶기 */
  register("swift-block-sum", (v) => {
    const p = v.p || 2, q = v.q || 1, ans = v.answer ?? 0;
    const vals = [p, p, -q, p, p, -q, p, p, -q];
    const xr = [0, vals.length + 1];
    const yr = [Math.min(-q, 0) - 2, p + 2];
    return {
      id: "sol-block-sum",
      beats: [
        beat(7, `항이 $${nf(p)},\\ ${nf(p)},\\ -${nf(q)}$ 로 계속 반복됩니다.`, [
          plane("pl", xr, yr, { xTicks: [3, 6, 9], xLabel: "n", yLabel: "a_n" }),
          ...vals.map((y, i) => ({
            type: "point", id: `a${i}`, plane: "pl", at: [i + 1, y], r: 9,
            color: y < 0 ? C.hot : C.main,
          })),
        ]),
        beat(8, "세 항씩 묶으면 한 덩어리의 합이 일정합니다.", [
          ...[0, 1, 2].map((k) => ({
            type: "brace", id: `br${k}`, plane: "pl", from: [3 * k + 1, yr[0] + 0.5], to: [3 * k + 3, yr[0] + 0.5],
            label: `$${nf(2 * p - q)}$`, color: C.ok,
          })),
          note("n1", 0, `${nf(p)}+${nf(p)}-${nf(q)}=${nf(2 * p - q)}`, { color: C.ok, size: 36 }),
        ]),
        beat(8, "그래서 $3n$ 개까지의 합은 덩어리 개수만큼입니다.", [
          note("n2", 1, `S_{3n}=n`, { color: C.main, size: 42 }),
        ]),
        beat(7, `두 합이 같아지는 자연수를 풀면 $${nf(ans)}$ 입니다.`, [
          note("n3", 2, `n=${nf(ans)}`, { color: C.ok, size: 52 }),
        ]),
      ],
    };
  });

  /* 판별식 — 축을 몇 번 만나는가 */
  register("swift-quad-disc", (v) => {
    const b = v.b || 2, bound = v.bound ?? (b * b) / 4, ans = v.answer ?? 0;
    const f = (c) => (x) => x * x + b * x + c;
    const xr = [-b / 2 - 4, -b / 2 + 4];
    const yr = [-6, 10];
    return {
      id: "sol-quad-disc",
      beats: [
        beat(7, `$y=x^2+${nf(b)}x+c$ 에서 $c$ 를 키우면 포물선이 위로 올라갑니다.`, [
          plane("pl", xr, yr),
          { type: "plot", id: "f", plane: "pl", points: sample(f(bound - 4), xr[0], xr[1], { yMin: yr[0], yMax: yr[1] }), color: C.main, width: 5, drawSec: 1.4 },
        ]),
        beat(8, "서로 다른 두 실근이란 $x$ 축을 두 점에서 자른다는 뜻입니다.", [
          { type: "plot", id: "f", plane: "pl", points: sample(f(ans), xr[0], xr[1], { yMin: yr[0], yMax: yr[1] }), color: C.main, width: 5, morphSec: 2.0 },
          note("n1", 0, `D=${nf(b)}^2-4c>0`, { color: C.main, size: 40 }),
        ]),
        beat(8, `더 올리면 접했다가 떨어집니다 — 경계는 $c=${nf(bound)}$ 입니다.`, [
          { type: "plot", id: "f", plane: "pl", points: sample(f(bound), xr[0], xr[1], { yMin: yr[0], yMax: yr[1] }), color: C.hot, width: 5, morphSec: 2.0 },
          note("n2", 1, `c<\\frac{${nf(b)}^2}{4}=${nf(bound)}`, { color: C.hot, size: 38 }),
        ]),
        beat(7, `$c$ 는 정수이므로 최댓값은 $${nf(ans)}$ 입니다.`, [
          note("n3", 2, `c_{\\max}=${nf(ans)}`, { color: C.ok, size: 50 }),
        ]),
      ],
    };
  });

  /* 근과 계수의 관계 */
  register("swift-vieta", (v) => {
    const s = v.s || 0, p = v.p || 0, ans = v.answer ?? 0;
    const disc = s * s - 4 * p;
    const r1 = (s - Math.sqrt(Math.max(disc, 0))) / 2;
    const r2 = (s + Math.sqrt(Math.max(disc, 0))) / 2;
    const f = (x) => x * x - s * x + p;
    const xr = [Math.min(r1, 0) - 1.5, Math.max(r2, 0) + 1.5];
    const yr = [Math.min(f(s / 2), 0) - 1.5, Math.max(f(xr[0]), f(xr[1])) + 1];
    return {
      id: "sol-vieta",
      beats: [
        beat(7, `$x^2-${nf(s)}x+${nf(p)}=0$ 의 두 근이 곧 축과 만나는 자리입니다.`, [
          plane("pl", xr, yr),
          { type: "plot", id: "f", plane: "pl", points: sample(f, xr[0], xr[1], { yMin: yr[0], yMax: yr[1] }), color: C.main, width: 5, drawSec: 1.5 },
          { type: "point", id: "r1", plane: "pl", at: [r1, 0], r: 11, color: C.hot, label: "$\\alpha$" },
          { type: "point", id: "r2", plane: "pl", at: [r2, 0], r: 11, color: C.hot, label: "$\\beta$" },
        ]),
        beat(7, "근을 직접 구하지 않아도 합과 곱은 계수에서 바로 읽힙니다.", [
          note("n1", 0, `\\alpha+\\beta=${nf(s)},\\quad \\alpha\\beta=${nf(p)}`, { color: C.main, size: 36 }),
          { type: "brace", id: "br", plane: "pl", from: [r1, -0.6], to: [r2, -0.6], label: "$\\alpha+\\beta$", color: C.mute },
        ]),
        beat(8, "구하려는 식을 합과 곱만으로 바꿔 씁니다.", [
          note("n2", 1, `\\alpha^2+\\beta^2=(\\alpha+\\beta)^2-2\\alpha\\beta`, { color: C.ok, size: 34 }),
        ]),
        beat(7, `대입하면 $${nf(s)}^2-2\\cdot${nf(p)}=${nf(ans)}$ 입니다.`, [
          note("n3", 2, `=${nf(ans)}`, { color: C.ok, size: 50 }),
        ]),
      ],
    };
  });

  /* 원과 점의 거리 */
  register("swift-circle-dist", (v) => {
    const px = v.px || 3, py = v.py || 4, r = v.r || 1, dist = v.dist || 5, ans = v.answer ?? 0;
    const lim = Math.max(Math.abs(px), Math.abs(py), r) + 1.5;
    const ux = px / dist, uy = py / dist;
    return {
      id: "sol-circle-dist",
      beats: [
        beat(7, `원점이 중심이고 반지름이 $${nf(r)}$ 인 원과 점 $P(${nf(px)},${nf(py)})$ 입니다.`, [
          plane("pl", [-lim, lim], [-lim, lim]),
          { type: "circle", id: "c", plane: "pl", center: [0, 0], r: r, stroke: C.main, fill: C.main, fillOpacity: 0.1 },
          { type: "point", id: "P", plane: "pl", at: [px, py], r: 12, color: C.hot, label: "$P$" },
        ]),
        beat(8, `중심에서 $P$ 까지 거리는 피타고라스로 $${nf(dist)}$ 입니다.`, [
          { type: "seg", id: "op", plane: "pl", from: [0, 0], to: [px, py], color: C.mute, width: 4, label: `$${nf(dist)}$` },
          note("n1", 0, `\\sqrt{${nf(px)}^2+${nf(py)}^2}=${nf(dist)}`, { color: C.mute, size: 34 }),
        ]),
        beat(8, "최단거리는 중심·원 위의 점·$P$ 가 한 직선에 놓일 때입니다.", [
          { type: "point", id: "Q", plane: "pl", at: [ux * r, uy * r], r: 11, color: C.ok, label: "$Q$" },
          { type: "seg", id: "qp", plane: "pl", from: [ux * r, uy * r], to: [px, py], color: C.ok, width: 5 },
        ]),
        beat(7, `그래서 거리에서 반지름을 뺀 $${nf(ans)}$ 가 최솟값입니다.`, [
          note("n2", 1, `${nf(dist)}-${nf(r)}=${nf(ans)}`, { color: C.ok, size: 48 }),
        ]),
      ],
    };
  });

  /* 주사위 두 개의 합 — 6×6 격자 */
  register("swift-dice", (v) => {
    const target = v.target || 7, count = v.count || 1;
    const cells = [];
    for (let a = 1; a <= 6; a++) {
      for (let b = 1; b <= 6; b++) {
        if (a + b === target) cells.push([a, b]);
      }
    }
    return {
      id: "sol-dice",
      beats: [
        beat(7, "두 주사위의 눈을 격자로 늘어놓으면 전부 $36$ 가지입니다.", [
          plane("pl", [0, 7], [0, 7], { xTicks: [1, 2, 3, 4, 5, 6], yTicks: [1, 2, 3, 4, 5, 6], xLabel: "a", yLabel: "b" }),
          { type: "blocks", id: "all", rect: { x: 1200, y: 380, w: 380, h: 380 }, rows: 6, cols: 6, count: 36, gap: 6, color: C.mute, countLabel: true },
        ]),
        beat(8, `합이 $${nf(target)}$ 인 칸만 골라 표시합니다.`,
          cells.map((c, i) => ({
            type: "point", id: `h${i}`, plane: "pl", at: c, r: 13, color: C.hot,
          }))),
        beat(7, `대각선 위의 $${nf(count)}$ 칸이 조건을 만족합니다.`, [
          { type: "blocks", id: "hit", rect: { x: 1200, y: 800, w: 380, h: 90 }, rows: 1, cols: 6, count: count, gap: 6, color: C.hot, countLabel: true },
        ]),
        beat(7, `확률은 $\\dfrac{${nf(count)}}{36}$ 입니다.`, [
          note("n1", 0, `P=\\frac{${nf(count)}}{36}`, { color: C.ok, size: 50 }),
        ]),
      ],
    };
  });

  /* 지수법칙 */
  register("swift-exp-law", (v) => {
    const a = v.a || 2, m = v.m || 1, n = v.n || 1, p = v.p || 1, e = v.e ?? (m + n - p), ans = v.answer ?? 0;
    return {
      id: "sol-exp-law",
      beats: [
        beat(7, `밑이 $${nf(a)}$ 로 모두 같으니 지수만 따라가면 됩니다.`, [
          { type: "blocks", id: "bm", rect: { x: 300, y: 300, w: 380, h: 120 }, rows: 1, cols: Math.max(m, 1), count: m, gap: 10, color: C.main, countLabel: true },
          note("n1", 0, `${nf(a)}^{${nf(m)}}\\cdot ${nf(a)}^{${nf(n)}}\\div ${nf(a)}^{${nf(p)}}`, { color: C.ink, size: 38 }),
        ]),
        beat(7, `곱하면 지수는 더해집니다 — $${nf(m)}+${nf(n)}=${nf(m + n)}$.`, [
          { type: "blocks", id: "bn", rect: { x: 300, y: 460, w: 380, h: 120 }, rows: 1, cols: Math.max(n, 1), count: n, gap: 10, color: C.ok, countLabel: true },
          note("n2", 1, `${nf(a)}^{${nf(m)}+${nf(n)}}=${nf(a)}^{${nf(m + n)}}`, { color: C.main, size: 36 }),
        ]),
        beat(8, `나누면 지수는 빠집니다 — $${nf(m + n)}-${nf(p)}=${nf(e)}$.`, [
          { type: "blocks", id: "bp", rect: { x: 300, y: 620, w: 380, h: 120 }, rows: 1, cols: Math.max(p, 1), count: p, gap: 10, color: C.hot, countLabel: true },
          note("n3", 2, `${nf(a)}^{${nf(e)}}`, { color: C.hot, size: 42 }),
        ]),
        beat(7, `계산하면 $${nf(ans)}$ 입니다.`, [
          noteText("ans", 3, `= ${nf(ans)}`, { size: 54, color: C.ok }),
        ]),
      ],
    };
  });

  /* 다항식의 전개 — 넓이 모델 */
  register("swift-poly-expand", (v) => {
    const a = v.a || 1, b = v.b || 1, askLinear = !!v.askLinear, ans = v.answer ?? 0;
    const X = 4;  // x 를 길이 4 로 그린다
    const W2 = X + a, H2 = X + b;
    return {
      id: "sol-poly-expand",
      beats: [
        beat(7, `가로 $x+${nf(a)}$, 세로 $x+${nf(b)}$ 인 직사각형의 넓이입니다.`, [
          plane("pl", [-0.5, W2 + 1], [-0.5, H2 + 1], { showGrid: false, xTicks: [], yTicks: [] }),
          { type: "polygon", id: "R", plane: "pl", points: [[0, 0], [W2, 0], [W2, H2], [0, H2]], stroke: C.ink, fill: C.main, fillOpacity: 0.08 },
          { type: "brace", id: "bw", plane: "pl", from: [0, -0.35], to: [W2, -0.35], label: `$x+${nf(a)}$`, color: C.mute },
        ]),
        beat(8, "가로와 세로를 각각 잘라 네 조각으로 나눕니다.", [
          { type: "seg", id: "cx", plane: "pl", from: [X, 0], to: [X, H2], color: C.hot, width: 3, dashed: true },
          { type: "seg", id: "cy", plane: "pl", from: [0, X], to: [W2, X], color: C.hot, width: 3, dashed: true },
          { type: "glabel", id: "q1", plane: "pl", at: [X / 2 - 0.4, X / 2], tex: "x^2", size: 34, color: C.main },
        ]),
        beat(8, `옆의 두 조각이 $${nf(a)}x$ 와 $${nf(b)}x$ 이고, 모서리가 $${nf(a * b)}$ 입니다.`, [
          { type: "glabel", id: "q2", plane: "pl", at: [X + a / 2 - 0.3, X / 2], tex: `${nf(a)}x`, size: 30, color: C.ok },
          { type: "glabel", id: "q3", plane: "pl", at: [X / 2 - 0.3, X + b / 2], tex: `${nf(b)}x`, size: 30, color: C.ok },
          { type: "glabel", id: "q4", plane: "pl", at: [X + a / 2 - 0.3, X + b / 2], tex: nf(a * b), size: 28, color: C.hot },
        ]),
        beat(7, askLinear ? `$x$ 의 계수는 두 수의 합 $${nf(a + b)}$ 입니다.`
                          : `상수항은 두 수의 곱 $${nf(a * b)}$ 입니다.`, [
          note("n1", 0, `x^2+(${nf(a)}+${nf(b)})x+${nf(a * b)}`, { color: C.ink, size: 36 }),
          noteText("ans", 1, `답  ${nf(ans)}`, { size: 52, color: C.ok }),
        ]),
      ],
    };
  });

  /* 복소수의 곱 — 복소평면 */
  register("swift-complex-mul", (v) => {
    const a = v.a || 1, b = v.b || 1, c = v.c || 1, d = v.d || 1;
    const re = v.re ?? (a * c - b * d), im = v.im ?? (a * d + b * c);
    const askReal = !!v.askReal;
    const lim = Math.max(Math.abs(re), Math.abs(im), a, b, c, d) + 2;
    return {
      id: "sol-complex-mul",
      beats: [
        beat(7, `두 복소수를 복소평면 위의 점으로 봅니다.`, [
          plane("pl", [-lim, lim], [-lim, lim], { xLabel: "실수", yLabel: "허수" }),
          { type: "point", id: "z1", plane: "pl", at: [a, b], r: 12, color: C.main, label: `$${nf(a)}+${nf(b)}i$` },
          { type: "point", id: "z2", plane: "pl", at: [c, d], r: 12, color: C.ok, label: `$${nf(c)}+${nf(d)}i$` },
        ]),
        beat(8, "분배법칙으로 네 항을 만들고 $i^2=-1$ 을 씁니다.", [
          note("n1", 0, `${nf(a * c)}+${nf(a * d)}i+${nf(b * c)}i+${nf(b * d)}i^2`, { color: C.ink, size: 34 }),
          note("n2", 1, `i^2=-1`, { color: C.hot, size: 36 }),
        ]),
        beat(8, `실수부는 $${nf(a * c)}-${nf(b * d)}=${nf(re)}$ 입니다.`, [
          { type: "point", id: "zp", plane: "pl", at: [re, im], r: 14, color: C.hot, label: `$${nf(re)}${sg(im)}i$` },
          { type: "seg", id: "oz", plane: "pl", from: [0, 0], to: [re, im], color: C.hot, width: 4 },
        ]),
        beat(7, askReal ? `묻는 것은 실수부이므로 $${nf(re)}$ 입니다.`
                        : `묻는 것은 허수부이므로 $${nf(im)}$ 입니다.`, [
          noteText("ans", 2, `답  ${askReal ? nf(re) : nf(im)}`, { size: 52, color: C.ok }),
        ]),
      ],
    };
  });

  /* 기댓값·분산의 선형성 — 이 앱의 급소 유형 */
  register("swift-stat-linear", (v) => {
    const isVar = v.mode === "variance";
    const base = v.base || 1, a = v.a || 1, b = v.b || 0, ans = v.answer ?? 0;
    const xs = [-2, -1, 0, 1, 2];
    const bell = (m, s) => (x) => Math.exp(-((x - m) * (x - m)) / (2 * s * s)) / s;
    const s0 = isVar ? Math.sqrt(base) : 1;
    const s1 = isVar ? Math.sqrt(base) * a : 1;
    const xr = [-Math.max(s1 * 3, 6), Math.max(s1 * 3, 6) + b];
    return {
      id: "sol-stat-linear",
      beats: [
        beat(7, isVar ? `분산 $V(X)=${nf(base)}$ 인 분포입니다. 흩어진 정도를 봅니다.`
                      : `평균 $E(X)=${nf(base)}$ 인 분포입니다.`, [
          plane("pl", xr, [0, 1.15], { yTicks: [] }),
          { type: "plot", id: "d", plane: "pl", points: sample(bell(0, s0), xr[0], xr[1], { n: 120 }), color: C.main, width: 5, drawSec: 1.5 },
        ]),
        beat(8, `$${nf(a)}$ 배 하면 분포가 옆으로 ${isVar ? "그만큼 넓어집니다" : "늘어납니다"}.`, [
          { type: "plot", id: "d", plane: "pl", points: sample(bell(0, s1), xr[0], xr[1], { n: 120 }), color: C.main, width: 5, morphSec: 2.0 },
          note("n1", 0, isVar ? `V(aX)=a^2V(X)` : `E(aX)=aE(X)`, { color: C.main, size: 38 }),
        ]),
        beat(8, isVar ? `$+${nf(b)}$ 는 통째로 옮길 뿐 — 흩어짐은 그대로입니다.`
                      : `$+${nf(b)}$ 만큼 통째로 옮겨지므로 평균도 그만큼 커집니다.`, [
          { type: "plot", id: "d", plane: "pl", points: sample(bell(b, s1), xr[0], xr[1], { n: 120 }), color: isVar ? C.mute : C.ok, width: 5, morphSec: 2.0 },
          note("n2", 1, isVar ? `V(aX+b)=a^2V(X)` : `E(aX+b)=aE(X)+b`, { color: isVar ? C.hot : C.ok, size: 36 }),
        ]),
        beat(7, isVar ? `그래서 $${nf(a)}^2\\cdot${nf(base)}=${nf(ans)}$ 입니다.`
                      : `그래서 $${nf(a)}\\cdot${nf(base)}+${nf(b)}=${nf(ans)}$ 입니다.`, [
          noteText("ans", 2, `답  ${nf(ans)}`, { size: 54, color: C.ok }),
        ]),
      ],
    };
  });

  /* 이항분포 */
  register("swift-binomial", (v) => {
    const n = v.n || 4, num = v.num || 1, den = v.den || 2;
    const mean = v.mean ?? (n * num) / den, variance = v.variance ?? 0;
    const askMean = !!v.askMean;
    const p = num / den;
    const logC = (nn, k) => {
      let s = 0;
      for (let i = 1; i <= k; i++) s += Math.log(nn - k + i) - Math.log(i);
      return s;
    };
    const bars = [];
    for (let k = 0; k <= n; k++) {
      const pr = Math.exp(logC(n, k) + k * Math.log(p) + (n - k) * Math.log(1 - p));
      bars.push({ k, pr });
    }
    const top = Math.max(...bars.map((b) => b.pr));
    return {
      id: "sol-binomial",
      beats: [
        beat(7, `성공확률 $${nf(num)}/${nf(den)}$ 인 시행을 $${nf(n)}$ 번 합니다.`, [
          plane("pl", [-0.6, n + 0.6], [0, top * 1.25], { xTicks: bars.map((b) => b.k).slice(0, 7), yTicks: [], xLabel: "k", yLabel: "P" }),
          ...bars.map((b) => ({
            type: "seg", id: `b${b.k}`, plane: "pl", from: [b.k, 0], to: [b.k, b.pr],
            color: C.main, width: 14,
          })),
        ]),
        beat(7, "성공 횟수의 분포가 이렇게 생겼습니다 — 가운데가 가장 두껍습니다.", [
          { type: "vline", id: "vm", plane: "pl", x: mean, from: 0, to: top * 1.1, dashed: true, color: C.hot, label: `$np$` },
        ]),
        beat(8, `평균은 $np=${nf(n)}\\cdot\\dfrac{${nf(num)}}{${nf(den)}}=${nf(mean)}$ 입니다.`, [
          note("n1", 0, `E(X)=np=${nf(mean)}`, { color: C.main, size: 38 }),
        ]),
        beat(7, askMean ? `묻는 것은 평균이므로 답은 $${nf(mean)}$ 입니다.`
                        : `분산은 $np(1-p)=${nf(variance)}$ 입니다.`, [
          note("n2", 1, `V(X)=np(1-p)=${nf(variance)}`, { color: C.ok, size: 36 }),
          noteText("ans", 2, `답  ${nf(askMean ? mean : variance)}`, { size: 50, color: C.ok }),
        ]),
      ],
    };
  });

  /* 정규분포의 표준화 */
  register("swift-normal", (v) => {
    const m = v.mean || 0, s = v.sigma || 1, x0 = v.x0 ?? m, z = v.z ?? 0;
    const bell = (mu, sd) => (x) => Math.exp(-((x - mu) * (x - mu)) / (2 * sd * sd));
    const xr = [m - 4 * s, m + 4 * s];
    return {
      id: "sol-normal",
      beats: [
        beat(7, `평균 $${nf(m)}$, 표준편차 $${nf(s)}$ 인 정규분포입니다.`, [
          plane("pl", xr, [0, 1.2], { yTicks: [] }),
          { type: "plot", id: "d", plane: "pl", points: sample(bell(m, s), xr[0], xr[1], { n: 130 }), color: C.main, width: 5, drawSec: 1.6 },
          { type: "vline", id: "vm", plane: "pl", x: m, from: 0, to: 1.05, dashed: true, color: C.mute, label: `$m=${nf(m)}$` },
        ]),
        beat(8, `$X=${nf(x0)}$ 은 평균에서 얼마나 떨어져 있는지가 관건입니다.`, [
          { type: "vline", id: "vx", plane: "pl", x: x0, from: 0, to: bell(m, s)(x0), color: C.hot, dashed: false, label: `$${nf(x0)}$` },
          { type: "brace", id: "br", plane: "pl", from: [Math.min(m, x0), 1.1], to: [Math.max(m, x0), 1.1], label: `$${nf(Math.abs(x0 - m))}$`, color: C.hot },
        ]),
        beat(8, `그 거리를 표준편차 $${nf(s)}$ 로 재면 몇 칸인지가 나옵니다.`, [
          note("n1", 0, `Z=\\frac{X-m}{\\sigma}=\\frac{${nf(x0)}-${nf(m)}}{${nf(s)}}`, { color: C.main, size: 34 }),
        ]),
        beat(7, `표준편차 $${nf(Math.abs(z))}$ 개만큼 ${z >= 0 ? "위" : "아래"}이므로 $Z=${nf(z)}$ 입니다.`, [
          noteText("ans", 1, `Z = ${nf(z)}`, { size: 54, color: C.ok }),
        ]),
      ],
    };
  });

  /* 표본평균의 분포 */
  register("swift-sample-mean", (v) => {
    const m = v.mean || 0, s = v.sigma || 1, n = v.n || 1;
    const variance = v.variance ?? (s * s) / n;
    const askMean = !!v.askMean;
    const se = Math.sqrt(variance);
    const bell = (sd) => (x) => Math.exp(-((x - m) * (x - m)) / (2 * sd * sd));
    const xr = [m - 3.5 * s, m + 3.5 * s];
    return {
      id: "sol-sample-mean",
      beats: [
        beat(7, `모집단은 평균 $${nf(m)}$, 표준편차 $${nf(s)}$ 로 퍼져 있습니다.`, [
          plane("pl", xr, [0, 1.2], { yTicks: [] }),
          { type: "plot", id: "d", plane: "pl", points: sample(bell(s), xr[0], xr[1], { n: 130 }), color: C.mute, width: 5, drawSec: 1.5 },
        ]),
        beat(8, `크기 $${nf(n)}$ 인 표본의 평균을 모으면 훨씬 좁게 모입니다.`, [
          { type: "plot", id: "d2", plane: "pl", points: sample(bell(se), xr[0], xr[1], { n: 130 }), color: C.main, width: 5, drawSec: 1.5 },
          { type: "vline", id: "vm", plane: "pl", x: m, from: 0, to: 1.1, dashed: true, color: C.hot, label: `$${nf(m)}$` },
        ]),
        beat(8, "중심은 그대로이고 흩어짐만 표본 크기만큼 줄어듭니다.", [
          note("n1", 0, `E(\\bar X)=m=${nf(m)}`, { color: C.main, size: 36 }),
          note("n2", 1, `V(\\bar X)=\\frac{\\sigma^2}{n}=\\frac{${nf(s * s)}}{${nf(n)}}=${nf(variance)}`, { color: C.ok, size: 34 }),
        ]),
        beat(7, askMean ? `묻는 것은 평균이므로 $${nf(m)}$ 입니다.` : `묻는 것은 분산이므로 $${nf(variance)}$ 입니다.`, [
          noteText("ans", 2, `답  ${nf(askMean ? m : variance)}`, { size: 54, color: C.ok }),
        ]),
      ],
    };
  });

  /* ============================================================
     범용 폴백 — 풀이 단계 텍스트만으로 만든 식 변형 안무
     ============================================================ */
  function buildGeneric(ctx) {
    const steps = (ctx.steps || []).filter((s) => String(s || "").trim()).slice(0, 6);
    if (!steps.length) return null;
    const strip = (s) => String(s).replace(/\$/g, "").replace(/\\\(|\\\)/g, "").trim();
    // 단계 진행 레일 — 왼쪽에 세로선을 세우고 통과한 단계에 점을 찍는다.
    // 텍스트만 갈아 끼우는 슬라이드쇼가 되지 않게, 진행이 눈에 보이게 한다.
    const RAIL_X = 300, TOP = 220, GAP = Math.min(150, 640 / Math.max(1, steps.length));
    const rail = {
      type: "seg", id: "rail", from: [RAIL_X, TOP - 40],
      to: [RAIL_X, TOP + GAP * steps.length], color: C.mute, width: 3, drawSec: 1.0,
    };
    const beats = steps.map((s, i) => {
      const text = strip(s);
      const acts = [
        { type: "point", id: `dot${i}`, at: [RAIL_X, TOP + GAP * i], r: 13,
          color: i === steps.length - 1 ? C.ok : C.main },
        noteText(`s${i}`, 0, `${i + 1}. ${text.slice(0, 44)}`,
                 { x: RAIL_X + 60, size: 38, color: C.ink }),
      ];
      // glabel 은 note() 의 줄 간격을 쓰므로 레일 눈금에 맞춰 다시 잡는다
      acts[1].at = [RAIL_X + 60, TOP + GAP * i];
      if (text.length > 44) {
        acts.push(Object.assign(noteText(`s${i}b`, 0, text.slice(44, 88), { x: RAIL_X + 60, size: 32, color: C.mute }),
                                { at: [RAIL_X + 60, TOP + GAP * i + 46] }));
      }
      if (i === 0) acts.unshift(rail);
      return beat(Math.max(5, Math.min(11, 4 + Math.ceil(text.length / 14))), text.slice(0, 70), acts);
    });
    if (ctx.answer) {
      beats.push(beat(6, `답은 $${strip(ctx.answer)}$ 입니다.`, [
        Object.assign(noteText("ans", 0, `답  ${strip(ctx.answer).slice(0, 24)}`, { x: 1180, size: 64, color: C.ok }),
                      { at: [1180, TOP + GAP * Math.max(0, steps.length - 1)] }),
        { type: "point", id: `dot${steps.length - 1}`, at: [RAIL_X, TOP + GAP * (steps.length - 1)], r: 20, color: C.ok },
      ]));
    }
    return { id: "sol-generic", beats };
  }

  /* ============================================================
     공개 API
     ============================================================ */
  const API = {
    /** 이 유형에 전용 안무가 있는가 */
    has(kind) { return !!(kind && BUILDERS[kind]); },
    kinds() { return Object.keys(BUILDERS); },
    /**
     * payload = { kind, viz, steps, statement, answer, typeName }
     * 전용 안무 → 실패하면 범용 폴백 → 그것도 없으면 null
     */
    build(payload) {
      payload = payload || {};
      const viz = payload.viz || (payload.kind ? { kind: payload.kind } : null);
      const kind = (viz && viz.kind) || payload.kind;
      if (kind && BUILDERS[kind]) {
        try {
          const sc = BUILDERS[kind](viz || {}, payload);
          if (sc && sc.beats && sc.beats.length) return sc;
        } catch (e) {
          if (typeof console !== "undefined") console.log("solution scene 실패", kind, e && e.message);
        }
      }
      return buildGeneric(payload);
    },
    register,
    _helpers: { plane, sample, note, noteText, beat, nf, sg, term, head, C },
  };

  root.MatthsSolutionScenes = API;
  if (typeof module !== "undefined" && module.exports) module.exports = API;
})(typeof window !== "undefined" ? window : globalThis);
