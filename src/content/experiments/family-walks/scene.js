// Family Walks: the scene itself. Everything is drawn on one canvas in code; there are no image files.
// sketch.ts hands the stage to startScene(), which adds the canvas and a strip of controls (the timeline, then
// Season / Time / Wind / Weather) and returns stop / pause / resume / restart for the stage buttons.
// The stage's own Pause stops everything, timeline included, so the strip has no play button of its own:
// dragging the timeline holds the date and letting go carries on from there; Season skips ahead to the next one.
// Plain JavaScript on purpose: it grew through a lot of small prompted tweaks, and typing ~1,000 lines of drawing
// code wouldn't make it any clearer. scene.d.ts gives sketch.ts its type.

const STYLE = `
.fw{position:absolute;inset:0;z-index:1;display:flex;flex-direction:column;cursor:default;background:var(--bg)}
.fw-view{position:relative;flex:1;min-height:0;cursor:pointer}
.fw-ctl{flex:none;display:flex;flex-direction:column;gap:2px;padding:8px 14px 4px;border-top:1px solid var(--line);background:var(--bg)}
.fw-row{display:flex;align-items:center;gap:14px;min-height:36px}
.fw-when{display:flex;flex-direction:column;gap:3px;min-width:118px}
.fw-date{font:700 15px/1 var(--font-display);letter-spacing:-0.01em;white-space:nowrap;font-variant-numeric:tabular-nums}
.fw-ctl .fw-note{font-size:9px;white-space:nowrap}
.fw-track{position:relative;flex:1;min-width:0;padding-bottom:7px}
.fw-track input{display:block;width:100%;height:24px;margin:0;background:transparent;accent-color:var(--accent)}
.fw-tick{position:absolute;bottom:0;width:2px;height:5px;border-radius:1px;background:var(--accent);opacity:.8;pointer-events:none}
.fw-opts{display:flex;flex-wrap:wrap;gap:0 18px}
.fw-opts button{min-height:36px;padding:0;white-space:nowrap;border:0;background:none;font:inherit;letter-spacing:inherit;text-transform:inherit;color:var(--muted);cursor:pointer}
.fw-opts b{font-weight:500;color:var(--fg)}
.fw-opts button:hover b{color:var(--accent)}
.fw button:focus-visible,.fw input:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
@media (max-width:640px){.fw-ctl{padding:6px 10px 2px}.fw-row{gap:8px}.fw-when{min-width:0}.fw-date{font-size:13px}.fw .fw-opts{gap:0 10px;font-size:9.5px;letter-spacing:.06em}}
`;

const MARKUP = `
<div class="fw-view"><canvas role="img" aria-label="An isometric street: a row of townhouses, a parking road with a family walking along it, and a wood. The season, time of day, wind and weather change with the controls below."></canvas></div>
<div class="fw-ctl">
  <div class="fw-row" role="group" aria-label="Timeline">
    <div class="fw-when"><span class="fw-date" data-fw="tl-date">January 2025</span><span class="fw-note label" data-fw="tl-note">Just the two of us</span></div>
    <div class="fw-track"><span class="fw-tick" data-fw="tick-a"></span><span class="fw-tick" data-fw="tick-b"></span><input type="range" data-fw="tl-range" min="0" max="24" step="0.01" value="0" aria-label="Date, January 2025 to December 2026"></div>
  </div>
  <div class="fw-opts label" role="group" aria-label="Scene settings">
    <button type="button" data-fw="btn-season" data-name="Season">Season <b data-fw="val-season">Winter</b></button>
    <button type="button" data-fw="btn-time" data-name="Time">Time <b data-fw="val-time">Day</b></button>
    <button type="button" data-fw="btn-wind" data-name="Wind">Wind <b data-fw="val-wind">Breeze</b></button>
    <button type="button" data-fw="btn-weather" data-name="Weather">Weather <b data-fw="val-weather">Clear</b></button>
  </div>
</div>`;

export function startScene(stage) {
  var root = document.createElement('div');
  root.className = 'fw';
  root.innerHTML = '<style>' + STYLE + '</style>' + MARKUP;
  stage.appendChild(root);
  var viewEl = root.querySelector('.fw-view'),
    cv = root.querySelector('canvas');
  function $(id) {
    return root.querySelector('[data-fw="' + id + '"]');
  }
  /* the stage's own background, so the scene sits on the lab page without a seam */
  function stageBg() {
    var h = getComputedStyle(stage).getPropertyValue('--bg').trim(),
      m = /^#([0-9a-f]{6})$/i.exec(h);
    return m
      ? [parseInt(m[1].slice(0, 2), 16), parseInt(m[1].slice(2, 4), 16), parseInt(m[1].slice(4, 6), 16)]
      : [241, 239, 234];
  }

  var W = 1140,
    H = 790,
    OX = 40,
    OY = 460,
    UX = 0.866,
    UY = 0.5,
    VX = 0.866,
    VY = 0.5,
    UMAX = 625,
    VMAX = 600;
  function P(u, v, z) {
    return [OX + UX * u + VX * v, OY - UY * u + VY * v - (z || 0)];
  }
  function mulberry(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function hex(h) {
    return [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  }
  function shade(h, f) {
    var c = hex(h);
    function m(x) {
      return Math.max(0, Math.min(255, Math.round(f <= 1 ? x * f : x + (255 - x) * (f - 1))));
    }
    return 'rgb(' + m(c[0]) + ',' + m(c[1]) + ',' + m(c[2]) + ')';
  }
  function clamp(x, a, b) {
    return x < a ? a : x > b ? b : x;
  }
  function lerp(a, b, t) {
    return a + (b - a) * t;
  }

  /* ---------- drawing helpers ---------- */
  function poly(g, pts, fill) {
    g.beginPath();
    for (var i = 0; i < pts.length; i++) {
      var p = P(pts[i][0], pts[i][1], pts[i][2]);
      if (i) g.lineTo(p[0], p[1]);
      else g.moveTo(p[0], p[1]);
    }
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  }
  function wline(g, a, b, style, w) {
    var p = P(a[0], a[1], a[2]),
      q = P(b[0], b[1], b[2]);
    g.beginPath();
    g.moveTo(p[0], p[1]);
    g.lineTo(q[0], q[1]);
    g.strokeStyle = style;
    g.lineWidth = w;
    g.stroke();
  }
  function ell(g, x, y, rx, ry, fill, rot) {
    g.beginPath();
    g.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, 6.2832);
    g.fillStyle = fill;
    g.fill();
  }
  function circ(g, x, y, r, fill) {
    g.beginPath();
    g.arc(x, y, Math.max(0.01, r), 0, 6.2832);
    g.fillStyle = fill;
    g.fill();
  }
  function rr(g, x, y, w, h, r, fill) {
    r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
    g.beginPath();
    g.moveTo(x + r, y);
    g.lineTo(x + w - r, y);
    g.quadraticCurveTo(x + w, y, x + w, y + r);
    g.lineTo(x + w, y + h - r);
    g.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    g.lineTo(x + r, y + h);
    g.quadraticCurveTo(x, y + h, x, y + h - r);
    g.lineTo(x, y + r);
    g.quadraticCurveTo(x, y, x + r, y);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  }
  function seg(g, x1, y1, x2, y2, style, w) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.lineTo(x2, y2);
    g.strokeStyle = style;
    g.lineWidth = w;
    g.lineCap = 'round';
    g.stroke();
  }

  /* ---------- seasons ---------- */
  var LEAF = ['#e8c03e', '#e58a35', '#c95b33', '#f0d463', '#b9502c', '#d9762f'];
  var PETAL = ['#f7c9d8', '#fbe3ea', '#f3b6cb', '#ffffff'];
  var SEASONS = {
    Autumn: {
      grass: '#a9cc66',
      blade: ['rgba(190,222,124,0.55)', 'rgba(130,176,74,0.5)'],
      flowerN: 160,
      flowerCols: ['#fbf3a8', '#ffffff'],
      hedge: ['#6fa544', '#7fb04a'],
      woods: '#c9b958',
      foot: '#bfb658',
      fuzz: ['#d6a445', '#b8bf5a', '#cf8a3a'],
      patches: [
        'rgba(214,164,69,0.5)',
        'rgba(184,191,90,0.5)',
        'rgba(207,138,58,0.45)',
        'rgba(169,181,82,0.5)',
        'rgba(226,188,80,0.5)',
      ],
      litterN: 900,
      litter: LEAF,
      tuftN: 200,
      tuft: '#93ad4c',
      roadLeafN: 90,
      edgeLeafN: 45,
      walkLeafN: 14,
      roofLeafN: 4,
      walk: '#e6dfd0',
      bed: true,
      bedCols: ['#e77a9a', '#f6e98a', '#ffffff', '#e2674f'],
      snow: false,
      tree: [
        '#7fb04a',
        '#8fb850',
        '#b9c44c',
        '#e6bf3f',
        '#ecc644',
        '#e38b36',
        '#de7a30',
        '#c85c34',
        '#b8452f',
      ],
      pine: ['#4f8a4a', '#57924f', '#467d49', '#5a9a55'],
      bush: ['#86b34c', '#b9c44c', '#d9762f', '#e6bf3f', '#7fb04a', '#c85c34'],
      fall: { cols: LEAF, mult: 1 },
      fly: 1,
    },
    Winter: {
      grass: '#edf2f7',
      blade: ['rgba(255,255,255,0.85)', 'rgba(190,206,226,0.45)'],
      flowerN: 0,
      flowerCols: ['#ffffff'],
      hedge: ['#6b8a5e', '#7a9869'],
      woods: '#e6edf4',
      foot: '#dfe7f0',
      fuzz: ['#f4f7fb', '#d6e0ec', '#ffffff'],
      patches: ['rgba(255,255,255,0.6)', 'rgba(196,210,230,0.45)', 'rgba(214,224,238,0.5)'],
      litterN: 110,
      litter: ['#8d7a66', '#a08a72'],
      tuftN: 0,
      tuft: '#ffffff',
      roadLeafN: 0,
      edgeLeafN: 0,
      walkLeafN: 0,
      roofLeafN: 0,
      walk: '#f1f0ec',
      bed: false,
      bedCols: ['#ffffff'],
      snow: true,
      tree: [
        '#6b5645',
        '#6b5645',
        '#6b5645',
        '#6b5645',
        '#6b5645',
        '#6b5645',
        '#6b5645',
        '#6b5645',
        '#6b5645',
      ],
      pine: ['#3f7a4a', '#47824f', '#3a7048', '#4a8a55'],
      bush: ['#8d7a66', '#7d8f6c', '#8d7a66', '#9a876f', '#7d8f6c', '#8d7a66'],
      fall: { cols: ['#ffffff'], mult: 0 },
      fly: 0,
    },
    Spring: {
      grass: '#b3dc70',
      blade: ['rgba(205,236,140,0.55)', 'rgba(140,196,84,0.5)'],
      flowerN: 620,
      flowerCols: ['#fbf3a8', '#ffffff', '#f6b8cf', '#c9b3f0'],
      hedge: ['#7fba4c', '#93c95a'],
      woods: '#b9d878',
      foot: '#b0d070',
      fuzz: ['#a8cf68', '#cfe690', '#f3cbd9'],
      patches: [
        'rgba(160,205,96,0.45)',
        'rgba(214,236,150,0.45)',
        'rgba(246,200,216,0.35)',
        'rgba(190,224,120,0.4)',
      ],
      litterN: 380,
      litter: PETAL,
      tuftN: 500,
      tuft: '#8cc254',
      roadLeafN: 40,
      edgeLeafN: 30,
      walkLeafN: 10,
      roofLeafN: 2,
      walk: '#e6dfd0',
      bed: true,
      bedCols: ['#f25f7a', '#ffd84d', '#ffffff', '#b78bf0', '#ff8fb3'],
      snow: false,
      tree: [
        '#9fd16a',
        '#b2db78',
        '#a8d672',
        '#f3b6cb',
        '#b7de80',
        '#f7c9d8',
        '#9fd16a',
        '#fbe3ea',
        '#a6d46f',
      ],
      pine: ['#4f8a4a', '#57924f', '#467d49', '#5a9a55'],
      bush: ['#93c95a', '#a8d672', '#f3b6cb', '#b2db78', '#7fba4c', '#f7c9d8'],
      fall: { cols: PETAL, mult: 0.55 },
      fly: 0.6,
    },
    Summer: {
      grass: '#9bcb58',
      blade: ['rgba(176,216,110,0.55)', 'rgba(110,165,62,0.5)'],
      flowerN: 120,
      flowerCols: ['#fbf3a8', '#ffffff'],
      hedge: ['#5f9a40', '#6fa544'],
      woods: '#a4c462',
      foot: '#9bbb5a',
      fuzz: ['#93b955', '#b2cf6c', '#8cb14f'],
      patches: [
        'rgba(120,165,70,0.45)',
        'rgba(190,214,110,0.45)',
        'rgba(140,180,80,0.4)',
        'rgba(214,226,130,0.35)',
      ],
      litterN: 120,
      litter: ['#7fa94a', '#b9a25c', '#8fb850'],
      tuftN: 700,
      tuft: '#7fae48',
      roadLeafN: 8,
      edgeLeafN: 6,
      walkLeafN: 0,
      roofLeafN: 0,
      walk: '#e6dfd0',
      bed: true,
      bedCols: ['#e77a9a', '#ffd84d', '#ffffff', '#e2674f', '#f29a3d'],
      snow: false,
      tree: [
        '#6fa544',
        '#7fb04a',
        '#86b34c',
        '#79ad47',
        '#8fb850',
        '#6a9f42',
        '#7fb04a',
        '#5f9a44',
        '#74a94a',
      ],
      pine: ['#4f8a4a', '#57924f', '#467d49', '#5a9a55'],
      bush: ['#6fa544', '#86b34c', '#7fb04a', '#8fb850', '#5f9a44', '#79ad47'],
      fall: { cols: ['#8fb850', '#7fb04a'], mult: 0.12 },
      fly: 1,
    },
  };
  var SEASON_ORDER = ['Autumn', 'Winter', 'Spring', 'Summer'],
    SEASON = SEASONS.Autumn;

  /* ---------- scene data ---------- */
  var BLOCKS = [
    { u0: 20, u1: 195, wall: '#e9dfc8', lower: '#b4654a', roof: '#8a7b6e', sh: '#3f4a5a' },
    { u0: 225, u1: 400, wall: '#cfd6d5', lower: '#a9a297', roof: '#7d7068', sh: '#6b3b34' },
    { u0: 430, u1: 605, wall: '#e3d2ae', lower: '#b4654a', roof: '#8a7b6e', sh: '#3f5a4a' },
  ];
  var V0 = 14,
    V1 = 124,
    VR = 69,
    HH = 66,
    RZ = 104;
  var windows = [],
    lights = [],
    porch = [],
    smokeSrc = [];
  var trees = [],
    props = [],
    stars = [],
    flies = [];
  var doors = [];
  BLOCKS.forEach(function (b) {
    var n = 4,
      w = (b.u1 - b.u0) / n;
    for (var i = 0; i < n; i++) doors.push(b.u0 + i * w + 11);
  });

  (function build() {
    var r = mulberry(20261113);
    var weights = [0.14, 0.1, 0.14, 0.17, 0.1, 0.15, 0.07, 0.09, 0.04];
    function pick() {
      var x = r(),
        acc = 0;
      for (var i = 0; i < weights.length; i++) {
        acc += weights[i];
        if (x < acc) return i;
      }
      return 0;
    }
    for (var u = 18; u < UMAX - 6; u += 44) {
      for (var v = 392; v < VMAX - 8; v += 43) {
        if (r() < 0.1) continue;
        var tu = u + (r() - 0.5) * 30,
          tv = v + (r() - 0.5) * 26;
        var pine = r() < 0.13;
        trees.push({
          u: tu,
          v: tv,
          s: (pine ? 0.48 : 0.4) + r() * 0.22,
          pine: pine,
          ci: pick(),
          seed: (r() * 4) | 0,
          ph: r() * 6.28,
          shake: 0,
        });
      }
    }
    [
      [210, 146, 5],
      [415, 146, 3],
      [110, 150, 4],
      [520, 150, 5],
    ].forEach(function (a) {
      trees.push({
        u: a[0],
        v: a[1],
        s: 0.34,
        pine: false,
        ci: a[2],
        seed: (r() * 4) | 0,
        ph: r() * 6.28,
        shake: 0,
        lawn: true,
      });
    });
    trees.forEach(function (t) {
      var p = P(t.u, t.v, 0);
      t.x = p[0];
      t.y = p[1];
      props.push({ k: t.u - t.v, tree: t });
    });
    function stall(k) {
      return 20 + 34 * k + 17;
    }
    [
      [0, '#8d9298', 1],
      [1, '#f1eee8'],
      [2, '#f4c833'],
      [3, '#7d93a8'],
      [4, '#3f4654'],
      [7, '#5d7f6a'],
      [9, '#e8e4da'],
      [10, '#2f3b52'],
    ].forEach(function (c) {
      var bu = 22 + 52 * c[0] + (c[2] ? 7 : 9);
      props.push({ k: bu - 200, carU: { u: bu, v0: 190, col: c[1], suv: !!c[2] } });
    });
    props.push({ k: 8 - 183, stop: { u: 8, v: 183 } });
    [
      [3, '#c7b08a'],
      [7, '#e8e4da'],
      [11, '#4a6d8c'],
      [13, '#8c8f96'],
    ].forEach(function (c) {
      props.push({ k: stall(c[0]) - 10.5 - 320, car: { u: stall(c[0]), v0: 303, col: c[1] } });
    });
    [
      [120, 181],
      [340, 181],
      [560, 181],
      [230, 344],
      [450, 344],
    ].forEach(function (l) {
      var a = P(l[0], l[1], 0),
        b = P(l[0], l[1], 46);
      lights.push({ x: b[0], y: b[1] - 2, gx: a[0], gy: a[1] });
      props.push({ k: l[0] - l[1], lamp: { u: l[0], v: l[1] } });
    });
    for (var bu = 14; bu < UMAX; bu += 27 + r() * 16) {
      props.push({ k: bu - 354, bush: { u: bu, v: 350 + r() * 8, ci: (r() * 6) | 0, s: 0.8 + r() * 0.5 } });
    }
    props.push({ k: 505 - 352, dumpster: true });
    props.push({ k: 412 - 156, mailbox: { u: 412, v: 156 } });
    props.push({ k: 210 - 166, bench: { u: 210, v: 166 } });
    props.push({ k: 300 - 180, hydrant: { u: 300, v: 180 } });
    props.push({ k: 345 - 148, snowman: { u: 345, v: 148 } });
    props.sort(function (a, b) {
      return b.k - a.k;
    });
    props.forEach(function (p) {
      var o = p.lamp || p.bush || p.mailbox || p.bench || p.hydrant || p.snowman || p.stop,
        q = p.tree
          ? [p.tree.x, p.tree.y]
          : p.car
            ? P(p.car.u, p.car.v0 + 17, 0)
            : p.carU
              ? P(p.carU.u + 17, p.carU.v0 + 10, 0)
              : o
                ? P(o.u, o.v, 0)
                : P(518, 352, 0);
      p.x = q[0];
      p.y = q[1];
    });
    var rs = mulberry(77);
    for (var i = 0; i < 1600 && stars.length < 260; i++) {
      var x = -700 + rs() * (W + 1400),
        y = -900 + rs() * (H + 1800),
        ok = true;
      for (var z = 0; z <= 200; z += 50) {
        var sx = (x - OX) / UX,
          dd = (y + z - OY) / UY,
          uu = (sx - dd) / 2,
          vv = (sx + dd) / 2;
        if (uu > -30 && uu < UMAX + 30 && vv > -30 && vv < VMAX + 40) {
          ok = false;
          break;
        }
      }
      if (ok) stars.push([x, y, 0.6 + rs() * 1.1, rs() * 6.28]);
    }
    for (var f = 0; f < 26; f++) {
      flies.push([20 + r() * 580, 380 + r() * 210, 6 + r() * 26, r() * 6.28, 0.6 + r() * 1.2]);
    }
  })();

  /* ---------- static layer: ground and houses ---------- */
  function fuzz(g, a, b, cols, r) {
    var A = P(a[0], a[1], 0),
      B = P(b[0], b[1], 0),
      L = Math.hypot(B[0] - A[0], B[1] - A[1]),
      n = Math.ceil(L / 5);
    for (var i = 0; i <= n; i++) {
      var t = i / n;
      for (var j = 0; j < 2; j++) {
        circ(
          g,
          A[0] + (B[0] - A[0]) * t + (r() - 0.5) * 16,
          A[1] + (B[1] - A[1]) * t + (r() - 0.5) * 14,
          1.5 + r() * 4.5,
          cols[(r() * cols.length) | 0],
        );
      }
    }
  }
  function flat(g, u0, u1, v0, v1, fill) {
    poly(
      g,
      [
        [u0, v0],
        [u1, v0],
        [u1, v1],
        [u0, v1],
      ],
      fill,
    );
  }
  function drawGround(g) {
    var r = mulberry(4242),
      i,
      p,
      S = SEASON;
    var GR = [S.grass, shade(S.grass, 0.93), shade(S.grass, 1.12)],
      RD = ['#666570', '#5d5c68', '#706f7a'],
      WD = [S.woods].concat(S.fuzz);
    for (i = 0; i < 6; i++) {
      g.save();
      g.translate(0, 6 + i * 4);
      g.globalAlpha = 0.03;
      g.beginPath();
      [
        [-6, -6],
        [UMAX + 6, -6],
        [UMAX + 6, VMAX + 6],
        [-6, VMAX + 6],
      ].forEach(function (q, k) {
        var s = P(q[0], q[1], 0);
        if (k) g.lineTo(s[0], s[1]);
        else g.moveTo(s[0], s[1]);
      });
      g.closePath();
      g.fillStyle = '#6b5a3f';
      g.fill();
      g.restore();
    }
    [[0], [UMAX]].forEach(function (e) {
      var u = e[0];
      fuzz(g, [u, 0], [u, 186], GR, r);
      fuzz(g, [u, 186], [u, 340], RD, r);
      fuzz(g, [u, 340], [u, VMAX], WD, r);
    });
    fuzz(g, [0, 0], [UMAX, 0], GR, r);
    fuzz(g, [0, VMAX], [UMAX, VMAX], WD, r);
    flat(g, 0, UMAX, 0, 186, S.grass);
    flat(g, 0, UMAX, 186, 340, '#666570');
    flat(g, 0, UMAX, 340, 346, '#d9d3c6');
    flat(g, 0, UMAX, 346, 360, S.foot);
    flat(g, 0, UMAX, 360, VMAX, S.woods);
    if (!S.snow) {
      for (i = 0; i < UMAX; i += 60) {
        flat(g, i, Math.min(UMAX, i + 30), 0, 186, 'rgba(255,255,255,0.06)');
      }
    }
    for (i = 0; i < 3200; i++) {
      p = P(r() * UMAX, r() * 186, 0);
      ell(g, p[0], p[1], 2.6, 1.1, r() < 0.5 ? S.blade[0] : S.blade[1], -0.9 + r() * 0.5);
    }
    for (i = 0; i < S.flowerN; i++) {
      p = P(r() * UMAX, 126 + r() * 56, 0);
      circ(g, p[0], p[1], 1.1, S.flowerCols[(r() * S.flowerCols.length) | 0]);
    }
    for (i = 4; i < UMAX; i += 11) {
      p = P(i, 3 + r() * 5, 0);
      circ(g, p[0], p[1] - 5, 6 + r() * 3, r() < 0.5 ? S.hedge[0] : S.hedge[1]);
      circ(g, p[0] - 2, p[1] - 8, 3, S.snow ? 'rgba(255,255,255,0.95)' : 'rgba(255,255,255,0.14)');
    }
    for (i = 0; i < 110; i++) {
      p = P(r() * UMAX, 356 + r() * 236, 0);
      ell(g, p[0], p[1], 16 + r() * 30, 8 + r() * 14, S.patches[(r() * S.patches.length) | 0], 0.5);
    }
    flat(g, 0, UMAX, 360, 384, S.snow ? 'rgba(120,140,170,0.07)' : 'rgba(70,50,20,0.10)');
    flat(g, 0, UMAX, 560, VMAX, 'rgba(255,240,180,0.10)');
    for (i = 0; i < S.litterN; i++) {
      p = P(r() * UMAX, 348 + r() * 250, 0);
      ell(g, p[0], p[1], 3.1, 1.7, S.litter[(r() * S.litter.length) | 0], r() * 3.14);
    }
    for (i = 0; i < S.tuftN; i++) {
      p = P(r() * UMAX, 348 + r() * 250, 0);
      ell(g, p[0], p[1], 2.6, 1.4, S.tuft, r() * 3.14);
    }
    for (i = 0; i < 3200; i++) {
      p = P(r() * UMAX, 187 + r() * 152, 0);
      circ(g, p[0], p[1], 0.5 + r() * 0.8, r() < 0.5 ? 'rgba(255,255,255,0.13)' : 'rgba(0,0,0,0.16)');
    }
    for (i = 0; i < 14; i++) {
      var cu = r() * UMAX,
        cv = 195 + r() * 135;
      g.beginPath();
      p = P(cu, cv, 0);
      g.moveTo(p[0], p[1]);
      for (var k = 0; k < 5; k++) {
        cu += (r() - 0.3) * 26;
        cv += (r() - 0.5) * 22;
        cv = clamp(cv, 188, 338);
        p = P(clamp(cu, 0, UMAX), cv, 0);
        g.lineTo(p[0], p[1]);
      }
      g.strokeStyle = 'rgba(40,38,48,0.5)';
      g.lineWidth = 0.9;
      g.stroke();
    }
    for (i = 0; i < 6; i++) {
      p = P(60 + r() * 520, 232 + r() * 62, 0);
      ell(g, p[0], p[1], 14 + r() * 14, 6 + r() * 5, 'rgba(60,58,70,0.35)', 0);
    }
    for (i = 20; i <= UMAX - 10; i += 34) {
      wline(g, [i, 300], [i, 338], 'rgba(245,241,232,0.9)', 1.8);
    }
    for (i = 22; i <= UMAX; i += 52) {
      wline(g, [i, 188], [i, 211], 'rgba(245,241,232,0.9)', 1.8);
      wline(g, [i - 5, 211], [i + 5, 211], 'rgba(245,241,232,0.9)', 1.8);
    }
    flat(g, 330, 342, 214, 300, '#e3b93c');
    for (i = 0; i < 10; i++) {
      flat(g, 330, 342, 216 + i * 9, 220 + i * 9, '#4a4852');
    }
    [150, 480].forEach(function (au) {
      poly(
        g,
        [
          [au + 42, 261],
          [au + 42, 265],
          [au + 12, 265],
          [au + 12, 271],
          [au, 263],
          [au + 12, 255],
          [au + 12, 261],
        ],
        'rgba(245,241,232,0.75)',
      );
    });
    [
      [300, 333],
      [540, 333],
    ].forEach(function (d) {
      flat(g, d[0], d[0] + 14, d[1], d[1] + 6, '#3f3e48');
      for (var k = 2; k < 14; k += 3) wline(g, [d[0] + k, d[1]], [d[0] + k, d[1] + 6], '#77767f', 0.8);
    });
    if (S.snow) {
      for (i = 0; i < 420; i++) {
        var q0 = r(),
          sv = r() < 0.5 ? 187 + q0 * q0 * 46 : 340 - q0 * q0 * 46;
        p = P(r() * UMAX, sv, 0);
        ell(
          g,
          p[0],
          p[1],
          5 + r() * 11,
          2.4 + r() * 4,
          'rgba(244,247,251,' + (0.35 + r() * 0.4).toFixed(2) + ')',
          0.5,
        );
      }
      for (i = 0; i < 70; i++) {
        p = P(r() * UMAX, 232 + r() * 62, 0);
        ell(g, p[0], p[1], 4 + r() * 8, 1.6 + r() * 2.4, 'rgba(244,247,251,0.28)', 0.5);
      }
      [246, 258, 270, 282].forEach(function (tv) {
        wline(g, [0, tv], [UMAX, tv], 'rgba(50,50,60,0.18)', 2.2);
      });
    }
    for (i = 0; i < S.roadLeafN; i++) {
      var q = r();
      p = P(r() * UMAX, 340 - q * q * 154, 0);
      ell(g, p[0], p[1], 2.8, 1.6, S.litter[(r() * S.litter.length) | 0], r() * 3.14);
    }
    for (i = 0; i < S.edgeLeafN; i++) {
      p = P(r() * UMAX, 334 + r() * 12, 0);
      ell(g, p[0], p[1], 3, 1.7, S.litter[(r() * S.litter.length) | 0], r() * 3.14);
    }
    flat(g, 0, UMAX, 183, 187, S.snow ? '#f4f7fb' : '#dcd6c9');
    flat(g, 0, UMAX, 160, 178, S.walk);
    for (i = 0; i < UMAX; i += 22) {
      wline(g, [i, 160], [i, 178], 'rgba(120,105,85,0.28)', 0.8);
    }
    wline(g, [0, 160], [UMAX, 160], 'rgba(120,105,85,0.25)', 0.8);
    wline(g, [0, 178], [UMAX, 178], 'rgba(120,105,85,0.25)', 0.8);
    for (i = 0; i < S.walkLeafN; i++) {
      p = P(r() * UMAX, 160 + r() * 18, 0);
      ell(g, p[0], p[1], 2.6, 1.5, S.litter[(r() * S.litter.length) | 0], r() * 3.14);
    }
    doors.forEach(function (d) {
      flat(g, d - 4.5, d + 4.5, 124, 160, S.walk);
      wline(g, [d - 4.5, 142], [d + 4.5, 142], 'rgba(120,105,85,0.28)', 0.8);
    });
    BLOCKS.forEach(function (b) {
      var n = 4,
        w = (b.u1 - b.u0) / n;
      for (var k = 0; k < n; k++) {
        var a = b.u0 + k * w + 19,
          e = b.u0 + (k + 1) * w + 2;
        flat(g, a, e, 124, 131, S.snow ? '#e9eef4' : '#7a6248');
        for (var x = a + 2; x < e - 1; x += 3.2) {
          var s = P(x, 126 + r() * 4, 0);
          if (S.snow) {
            if (r() < 0.5) circ(g, s[0], s[1] - 2, 2.6 + r() * 1.4, r() < 0.5 ? '#7d8f6c' : '#ffffff');
          } else {
            circ(g, s[0], s[1] - 2.5, 2.6 + r() * 1.4, r() < 0.5 ? S.hedge[0] : S.hedge[1]);
            if (r() < 0.6)
              circ(g, s[0] + (r() - 0.5) * 2, s[1] - 4.5, 1.1, S.bedCols[(r() * S.bedCols.length) | 0]);
          }
        }
      }
    });
    windows.length = 0;
    porch.length = 0;
    smokeSrc.length = 0;
    for (i = BLOCKS.length - 1; i >= 0; i--) drawBlock(g, BLOCKS[i], mulberry(900 + i));
  }
  function winFace(g, x, z, w, h) {
    g.fillStyle = '#fbf9f4';
    g.fillRect(x - 1.2, z - 1.2, w + 2.4, h + 2.4);
    g.fillStyle = '#b9cfdc';
    g.fillRect(x, z, w, h);
    g.fillStyle = 'rgba(255,255,255,0.28)';
    g.fillRect(x, z + h * 0.5, w, h * 0.5);
    g.fillStyle = '#fbf9f4';
    g.fillRect(x + w / 2 - 0.5, z, 1, h);
    g.fillRect(x, z + h / 2 - 0.5, w, 1);
  }
  function drawBlock(g, b, r) {
    var u0 = b.u0,
      u1 = b.u1,
      len = u1 - u0,
      n = 4,
      w = len / n,
      i,
      z,
      o,
      S = SEASON;
    var slope = (RZ - HH) / (V1 - VR);
    flat(g, u0, u1, V1, V1 + 7, 'rgba(40,40,20,0.14)');
    poly(
      g,
      [
        [u0, V0 - 4, HH - 3],
        [u1, V0 - 4, HH - 3],
        [u1, VR, RZ],
        [u0, VR, RZ],
      ],
      shade(b.roof, 0.82),
    );
    for (i = 1; i < 8; i++) {
      var tb = i / 8;
      wline(
        g,
        [u0, V0 - 4 + (VR - V0 + 4) * tb, HH - 3 + (RZ - HH + 3) * tb],
        [u1, V0 - 4 + (VR - V0 + 4) * tb, HH - 3 + (RZ - HH + 3) * tb],
        'rgba(0,0,0,0.13)',
        0.7,
      );
    }
    if (S.snow)
      poly(
        g,
        [
          [u0, V0 - 4, HH - 3],
          [u1, V0 - 4, HH - 3],
          [u1, VR, RZ],
          [u0, VR, RZ],
        ],
        'rgba(214,224,238,0.95)',
      );
    o = P(u0, V1, 0);
    g.save();
    g.transform(UX, -UY, 0, -1, o[0], o[1]);
    g.fillStyle = b.wall;
    g.fillRect(0, 0, len, HH);
    g.fillStyle = b.lower;
    g.fillRect(0, 0, len, 30);
    g.strokeStyle = 'rgba(0,0,0,0.13)';
    g.lineWidth = 0.5;
    for (z = 4; z < 30; z += 4) {
      g.beginPath();
      g.moveTo(0, z);
      g.lineTo(len, z);
      g.stroke();
    }
    for (z = 2; z < 30; z += 4) {
      for (var bx = ((z / 2) % 4) * 3; bx < len; bx += 12) {
        g.beginPath();
        g.moveTo(bx, z - 2);
        g.lineTo(bx, z + 2);
        g.stroke();
      }
    }
    g.strokeStyle = 'rgba(0,0,0,0.08)';
    for (z = 34; z < HH; z += 4.4) {
      g.beginPath();
      g.moveTo(0, z);
      g.lineTo(len, z);
      g.stroke();
    }
    g.fillStyle = '#8e8a84';
    g.fillRect(0, 0, len, 2.5);
    for (i = 0; i < n; i++) {
      var x0 = i * w;
      if (i > 0) {
        g.fillStyle = '#f6f3ec';
        g.fillRect(x0 - 0.9, 0, 1.8, HH);
        g.fillStyle = 'rgba(0,0,0,0.15)';
        g.fillRect(x0 + 0.9, 0, 0.7, HH);
      }
      g.fillStyle = '#d8d2c6';
      g.fillRect(x0 + 4.5, 0, 13, 2);
      g.fillStyle = '#f6f3ec';
      g.fillRect(x0 + 6, 2, 10, 23.5);
      g.fillStyle = i % 2 ? b.sh : '#f6f3ec';
      g.fillRect(x0 + 7, 3, 8, 21.5);
      g.fillStyle = '#cfdde6';
      g.fillRect(x0 + 8.5, 15, 5, 7.5);
      g.fillStyle = '#c9a94e';
      g.fillRect(x0 + 13.2, 11, 1.1, 1.6);
      g.fillStyle = S.snow ? '#f4f7fb' : '#6c5f55';
      g.fillRect(x0 + 3.5, 26.5, 15, 3);
      winFace(g, x0 + 23, 9, 17, 15);
      g.fillStyle = '#7a5a3c';
      g.fillRect(x0 + 23, 5, 17, 3);
      for (var fx = x0 + 24.5; fx < x0 + 40; fx += 3) {
        var fc = S.bedCols[(r() * S.bedCols.length) | 0];
        g.fillStyle = S.snow ? '#f4f7fb' : fc;
        g.fillRect(fx - 1, 7.5, 2, 2);
      }
      g.fillStyle = b.sh;
      g.fillRect(x0 + 3, 40, 2.4, 16);
      g.fillRect(x0 + 17.6, 40, 2.4, 16);
      g.fillRect(x0 + 22.6, 40, 2.4, 16);
      g.fillRect(x0 + 40, 40, 2.4, 16);
      winFace(g, x0 + 6, 40, 11, 16);
      winFace(g, x0 + 25.6, 40, 14, 16);
      if (r() < 0.7) {
        g.fillStyle = '#ecebe6';
        g.fillRect(x0 + 28, 35.5, 9, 4.5);
        g.fillStyle = '#bdbab2';
        g.fillRect(x0 + 29, 37, 7, 0.6);
        g.fillRect(x0 + 29, 38.4, 7, 0.6);
      }
      g.fillStyle = '#3d4047';
      g.fillRect(x0 + 18.6, 19, 1.6, 3.4);
      g.fillStyle = '#f7e2a0';
      g.fillRect(x0 + 18.4, 17, 2, 2.2);
      porch.push([u0 + x0 + 19.4, V1, 18.5]);
      windows.push({
        q: [
          [u0 + x0 + 23, V1, 9],
          [u0 + x0 + 40, V1, 9],
          [u0 + x0 + 40, V1, 24],
          [u0 + x0 + 23, V1, 24],
        ],
        r: r(),
        spill: [u0 + x0 + 31.5, V1 + 15],
      });
      windows.push({
        q: [
          [u0 + x0 + 6, V1, 40],
          [u0 + x0 + 17, V1, 40],
          [u0 + x0 + 17, V1, 56],
          [u0 + x0 + 6, V1, 56],
        ],
        r: r(),
      });
      windows.push({
        q: [
          [u0 + x0 + 25.6, V1, 40],
          [u0 + x0 + 39.6, V1, 40],
          [u0 + x0 + 39.6, V1, 56],
          [u0 + x0 + 25.6, V1, 56],
        ],
        r: r(),
      });
      windows.push({
        q: [
          [u0 + x0 + 8.5, V1, 15],
          [u0 + x0 + 13.5, V1, 15],
          [u0 + x0 + 13.5, V1, 22.5],
          [u0 + x0 + 8.5, V1, 22.5],
        ],
        r: 0.3 + r() * 0.5,
      });
    }
    g.fillStyle = '#f6f3ec';
    g.fillRect(-1, HH - 2.4, len + 2, 2.6);
    g.restore();
    poly(
      g,
      [
        [u0, V1 + 5, HH - 3.4],
        [u1, V1 + 5, HH - 3.4],
        [u1, VR, RZ],
        [u0, VR, RZ],
      ],
      b.roof,
    );
    for (i = 1; i < 9; i++) {
      var t = i / 9,
        sv = V1 + 5 + (VR - V1 - 5) * t,
        sz = HH - 3.4 + (RZ - HH + 3.4) * t;
      wline(g, [u0, sv, sz], [u1, sv, sz], 'rgba(0,0,0,0.15)', 0.7);
      for (var su = u0 + r() * 8; su < u1; su += 7 + r() * 5) {
        var t2 = (i + 1) / 9;
        wline(
          g,
          [su, sv, sz],
          [su, V1 + 5 + (VR - V1 - 5) * t2, HH - 3.4 + (RZ - HH + 3.4) * t2],
          'rgba(0,0,0,0.10)',
          0.6,
        );
      }
    }
    for (i = 0; i < S.roofLeafN; i++) {
      var lu = u0 + r() * len,
        lt = r() * 0.5,
        p = P(lu, V1 + 5 + (VR - V1 - 5) * lt, HH - 3.4 + (RZ - HH + 3.4) * lt);
      ell(g, p[0], p[1], 2.4, 1.4, S.litter[(r() * S.litter.length) | 0], r() * 3.14);
    }
    if (S.snow) {
      poly(
        g,
        [
          [u0, V1 + 5, HH - 3.4],
          [u1, V1 + 5, HH - 3.4],
          [u1, VR, RZ],
          [u0, VR, RZ],
        ],
        'rgba(246,249,252,0.95)',
      );
      for (i = 0; i < 5; i++) {
        var pu = u0 + 10 + r() * (len - 30),
          pt = 0.05 + r() * 0.25,
          pp = P(pu, V1 + 5 + (VR - V1 - 5) * pt, HH - 3.4 + (RZ - HH + 3.4) * pt);
        ell(g, pp[0], pp[1], 7 + r() * 8, 2 + r() * 2, shade(b.roof, 0.95), -0.5);
      }
      for (i = 1; i < 4; i++) {
        var ts = i / 4,
          svv = V1 + 5 + (VR - V1 - 5) * ts,
          szz = HH - 3.4 + (RZ - HH + 3.4) * ts;
        wline(g, [u0, svv, szz], [u1, svv, szz], 'rgba(170,188,214,0.35)', 1);
      }
    }
    wline(
      g,
      [u0, V1 + 5, HH - 3.4],
      [u1, V1 + 5, HH - 3.4],
      S.snow ? '#ffffff' : shade(b.roof, 0.7),
      S.snow ? 2.6 : 1.6,
    );
    wline(g, [u0, VR, RZ], [u1, VR, RZ], S.snow ? '#ffffff' : shade(b.roof, 1.25), 2.2);
    [
      [0.3, 0.55],
      [0.72, 0.4],
    ].forEach(function (vt) {
      var pv = P(u0 + len * vt[0], V1 + 5 + (VR - V1 - 5) * vt[1], HH - 3.4 + (RZ - HH + 3.4) * vt[1]);
      rr(g, pv[0] - 2.5, pv[1] - 4, 5, 4.5, 1, '#4c423b');
    });
    var uc = u0 + len * 0.58,
      va = VR + 12,
      vb = VR + 22,
      top = RZ + 16,
      za = RZ - (va - VR) * slope,
      zb = RZ - (vb - VR) * slope;
    poly(
      g,
      [
        [uc, vb, zb],
        [uc + 9, vb, zb],
        [uc + 9, vb, top],
        [uc, vb, top],
      ],
      '#c27458',
    );
    poly(
      g,
      [
        [uc, va, za],
        [uc, vb, zb],
        [uc, vb, top],
        [uc, va, top],
      ],
      '#a55f47',
    );
    poly(
      g,
      [
        [uc - 1, va - 1, top],
        [uc + 10, va - 1, top],
        [uc + 10, vb + 1, top],
        [uc - 1, vb + 1, top],
      ],
      S.snow ? '#f4f7fb' : '#5a4e46',
    );
    poly(
      g,
      [
        [uc + 2, va + 2, top],
        [uc + 7, va + 2, top],
        [uc + 7, vb - 2, top],
        [uc + 2, vb - 2, top],
      ],
      '#2f2925',
    );
    for (z = za + 3; z < top; z += 3.5) {
      wline(g, [uc, va, z], [uc, vb, z], 'rgba(0,0,0,0.14)', 0.5);
    }
    smokeSrc.push(P(uc + 4.5, (va + vb) / 2, top + 2));
    o = P(u0, V0, 0);
    g.save();
    g.transform(VX, VY, 0, -1, o[0], o[1]);
    var D = V1 - V0,
      mid = VR - V0;
    g.beginPath();
    g.moveTo(0, 0);
    g.lineTo(D, 0);
    g.lineTo(D, HH);
    g.lineTo(mid, RZ);
    g.lineTo(0, HH);
    g.closePath();
    g.save();
    g.clip();
    g.fillStyle = shade(b.wall, 0.9);
    g.fillRect(0, 0, D, RZ);
    g.fillStyle = shade(b.lower, 0.9);
    g.fillRect(0, 0, D, 30);
    g.strokeStyle = 'rgba(0,0,0,0.13)';
    g.lineWidth = 0.5;
    for (z = 4; z < 30; z += 4) {
      g.beginPath();
      g.moveTo(0, z);
      g.lineTo(D, z);
      g.stroke();
      for (var gx = z % 8 ? 0 : 6; gx < D; gx += 12) {
        g.beginPath();
        g.moveTo(gx, z - 4);
        g.lineTo(gx, z);
        g.stroke();
      }
    }
    g.strokeStyle = 'rgba(0,0,0,0.08)';
    for (z = 34; z < RZ; z += 4.4) {
      g.beginPath();
      g.moveTo(0, z);
      g.lineTo(D, z);
      g.stroke();
    }
    g.fillStyle = '#8e8a84';
    g.fillRect(0, 0, D, 2.5);
    g.restore();
    g.fillStyle = b.sh;
    g.fillRect(17, 40, 3, 17);
    g.fillRect(37, 40, 3, 17);
    g.fillRect(70, 40, 3, 17);
    g.fillRect(90, 40, 3, 17);
    winFace(g, 21, 40, 15, 17);
    winFace(g, 74, 40, 15, 17);
    winFace(g, 22, 9, 18, 15);
    winFace(g, 70, 9, 18, 15);
    g.fillStyle = '#5c5148';
    g.beginPath();
    g.arc(mid, 82, 5.5, 0, 6.2832);
    g.fill();
    g.fillStyle = '#877a6e';
    g.beginPath();
    g.arc(mid, 82, 3.2, 0, 6.2832);
    g.fill();
    g.fillStyle = '#9a9a96';
    g.fillRect(48, 5, 7, 10);
    g.fillStyle = '#c9c9c4';
    g.fillRect(49.2, 9, 4.6, 4.6);
    g.fillStyle = '#d9d6cf';
    g.fillRect(96, 2, 11, 9);
    g.fillStyle = '#b3b0a8';
    g.fillRect(97.5, 3.5, 8, 6);
    g.strokeStyle = '#f6f3ec';
    g.lineWidth = 2.6;
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(-3, HH - 3);
    g.lineTo(mid, RZ + 1.5);
    g.lineTo(D + 5, HH - 4.5);
    g.stroke();
    g.fillStyle = '#f6f3ec';
    g.fillRect(D - 1.6, 0, 1.6, HH);
    g.restore();
    windows.push({
      q: [
        [u0, V0 + 21, 40],
        [u0, V0 + 36, 40],
        [u0, V0 + 36, 57],
        [u0, V0 + 21, 57],
      ],
      r: r(),
    });
    windows.push({
      q: [
        [u0, V0 + 74, 40],
        [u0, V0 + 89, 40],
        [u0, V0 + 89, 57],
        [u0, V0 + 74, 57],
      ],
      r: r(),
    });
    windows.push({
      q: [
        [u0, V0 + 22, 9],
        [u0, V0 + 40, 9],
        [u0, V0 + 40, 24],
        [u0, V0 + 22, 24],
      ],
      r: r(),
    });
    windows.push({
      q: [
        [u0, V0 + 70, 9],
        [u0, V0 + 88, 9],
        [u0, V0 + 88, 24],
        [u0, V0 + 70, 24],
      ],
      r: r(),
    });
    var c1 = P(u0 - 3, V0 + 12, 0),
      c2 = P(u0 - 3, V0 + 58, 0);
    circ(g, c1[0], c1[1] - 5, 7, S.hedge[0]);
    circ(g, c1[0] + 6, c1[1] - 3, 5, S.hedge[1]);
    circ(g, c2[0], c2[1] - 5, 6.5, S.hedge[1]);
    circ(g, c2[0] - 6, c2[1] - 3, 5, S.hedge[0]);
    if (S.snow) {
      circ(g, c1[0] - 1, c1[1] - 9, 4.5, '#f6f9fc');
      circ(g, c2[0] - 1, c2[1] - 9, 4.2, '#f6f9fc');
    } else if (S.bed) circ(g, c2[0] - 1, c2[1] - 8, 1.4, S.bedCols[0]);
  }

  /* ---------- sprites ---------- */
  var sprites = {};
  function newSprite(k) {
    var c = document.createElement('canvas');
    c.width = Math.ceil(150 * k);
    c.height = Math.ceil(170 * k);
    var g = c.getContext('2d');
    g.scale(k, k);
    return [c, g];
  }
  function makeTree(col, seed, k) {
    var cg = newSprite(k),
      c = cg[0],
      g = cg[1],
      r = mulberry(seed * 131 + 7),
      i;
    g.fillStyle = col;
    var n = 10 + ((r() * 4) | 0);
    for (i = 0; i < n; i++) {
      var a = r() * 6.283,
        d = Math.sqrt(r()) * 25;
      g.beginPath();
      g.arc(75 + Math.cos(a) * d * 1.15, 72 + Math.sin(a) * d * 0.95, 12 + r() * 9, 0, 6.2832);
      g.fill();
    }
    g.beginPath();
    g.arc(75, 74, 23, 0, 6.2832);
    g.fill();
    g.globalCompositeOperation = 'source-atop';
    for (i = 0; i < 170; i++) {
      var x = 75 + (r() * 2 - 1) * 48,
        y = 72 + (r() * 2 - 1) * 44,
        wt = ((x - 75) * 0.55 + (y - 72)) / 40;
      g.fillStyle =
        wt > 0.05
          ? 'rgba(60,25,10,' + (0.05 + 0.11 * r()).toFixed(3) + ')'
          : 'rgba(255,250,200,' + (0.05 + 0.14 * r()).toFixed(3) + ')';
      g.beginPath();
      g.arc(x, y, 3 + r() * 6, 0, 6.2832);
      g.fill();
    }
    for (i = 0; i < 90; i++) {
      g.fillStyle = r() < 0.5 ? shade(col, 1.3) : shade(col, 0.72);
      g.beginPath();
      g.ellipse(75 + (r() * 2 - 1) * 46, 72 + (r() * 2 - 1) * 42, 2.3, 1.3, r() * 3.14, 0, 6.2832);
      g.fill();
    }
    g.globalCompositeOperation = 'destination-over';
    g.strokeStyle = '#6f4f35';
    g.lineCap = 'round';
    g.lineWidth = 3;
    g.beginPath();
    g.moveTo(75, 108);
    g.lineTo(60, 84);
    g.moveTo(75, 112);
    g.lineTo(91, 86);
    g.stroke();
    g.fillStyle = '#6f4f35';
    g.beginPath();
    g.moveTo(71, 162);
    g.lineTo(72.6, 80);
    g.lineTo(77.4, 80);
    g.lineTo(79, 162);
    g.closePath();
    g.fill();
    g.globalCompositeOperation = 'source-over';
    g.fillStyle = 'rgba(0,0,0,0.18)';
    g.beginPath();
    g.moveTo(76, 162);
    g.lineTo(76, 100);
    g.lineTo(77.6, 100);
    g.lineTo(79, 162);
    g.closePath();
    g.fill();
    return c;
  }
  function makeBare(seed, k) {
    var cg = newSprite(k),
      c = cg[0],
      g = cg[1],
      r = mulberry(seed * 517 + 11);
    g.lineCap = 'round';
    function br(x, y, a, len, w, d) {
      var x2 = x + Math.cos(a) * len,
        y2 = y + Math.sin(a) * len;
      g.strokeStyle = '#6b5645';
      g.lineWidth = w;
      g.beginPath();
      g.moveTo(x, y);
      g.lineTo(x2, y2);
      g.stroke();
      if (Math.abs(Math.cos(a)) > 0.25 && w > 0.9) {
        g.strokeStyle = 'rgba(255,255,255,0.94)';
        g.lineWidth = Math.max(0.9, w * 0.5);
        g.beginPath();
        g.moveTo(x, y - w * 0.42);
        g.lineTo(x2, y2 - w * 0.42);
        g.stroke();
      }
      if (d > 0) {
        var n = 2 + (r() < 0.4 ? 1 : 0);
        for (var i = 0; i < n; i++)
          br(
            x2,
            y2,
            a + (i - (n - 1) / 2) * 0.75 + (r() - 0.5) * 0.5,
            len * (0.66 + r() * 0.12),
            w * 0.66,
            d - 1,
          );
      }
    }
    g.strokeStyle = '#6b5645';
    g.lineWidth = 5.5;
    g.beginPath();
    g.moveTo(75, 162);
    g.lineTo(75, 112);
    g.stroke();
    br(75, 114, -1.5708 + (r() - 0.5) * 0.2, 24, 4.2, 4);
    br(75, 130, -1.5708 - 0.8, 18, 2.6, 3);
    br(75, 125, -1.5708 + 0.85, 18, 2.6, 3);
    return c;
  }
  function makePine(col, seed, k, snow) {
    var cg = newSprite(k),
      c = cg[0],
      g = cg[1],
      r = mulberry(seed * 311 + 3),
      i,
      t;
    g.fillStyle = col;
    for (t = 0; t < 6; t++) {
      var yb = 150 - t * 20,
        half = 34 - t * 5,
        yt = yb - 34;
      g.beginPath();
      g.moveTo(75, yt);
      g.lineTo(75 + half, yb);
      for (i = 1; i <= 6; i++) {
        g.lineTo(75 + half - (2 * half * (i - 0.5)) / 6, yb - 5 - r() * 3);
        g.lineTo(75 + half - (2 * half * i) / 6, yb + (i < 6 ? r() * 2 : 0));
      }
      g.closePath();
      g.fill();
    }
    g.globalCompositeOperation = 'source-atop';
    for (i = 0; i < 150; i++) {
      var x = 75 + (r() * 2 - 1) * 36,
        y = 20 + r() * 132;
      g.fillStyle =
        x > 77
          ? 'rgba(10,30,20,' + (0.05 + 0.13 * r()).toFixed(3) + ')'
          : 'rgba(230,255,200,' + (0.04 + 0.12 * r()).toFixed(3) + ')';
      g.beginPath();
      g.ellipse(x, y, 5 + r() * 5, 2 + r() * 2, 0.3, 0, 6.2832);
      g.fill();
    }
    if (snow) {
      for (t = 0; t < 6; t++) {
        var yb2 = 150 - t * 20,
          half2 = 34 - t * 5;
        g.fillStyle = 'rgba(255,255,255,0.93)';
        g.beginPath();
        g.ellipse(75 - 3, yb2 - 22, half2 * 0.5, 6, 0.25, 0, 6.2832);
        g.fill();
        g.beginPath();
        g.ellipse(75 - half2 * 0.45, yb2 - 9, half2 * 0.3, 3.6, 0.4, 0, 6.2832);
        g.fill();
      }
    }
    g.globalCompositeOperation = 'destination-over';
    g.fillStyle = '#5f4530';
    g.fillRect(72, 140, 6, 22);
    g.globalCompositeOperation = 'source-over';
    return c;
  }
  function buildSprites(k) {
    var sprites = {},
      S = SEASON;
    for (var ci = 0; ci < 9; ci++)
      for (var s = 0; s < 4; s++)
        sprites['t' + ci + '_' + s] = S.snow
          ? makeBare(ci * 10 + s, k)
          : makeTree(S.tree[ci], ci * 10 + s, k);
    for (var p = 0; p < 4; p++) sprites['p' + p] = makePine(S.pine[p], p, k, S.snow);
    return sprites;
  }

  /* ---------- props ---------- */
  var DS = SEASON,
    prev = null,
    mix = 1,
    sweep = { x: 565, y: 400 },
    tmpC = null;
  var SW_R = 1500,
    SW_SOFT = 260,
    SW_DUR = 2.6;
  /* a new season ripples outward from the family instead of fading everywhere at once */
  function mmAt(x, y) {
    if (!prev) return 1;
    var d = Math.hypot(x - sweep.x, (y - sweep.y) / 0.6),
      v = clamp((mix * SW_R - d) / SW_SOFT, 0, 1);
    return v * v * (3 - 2 * v);
  }
  function drawTree(g, t, time, wind) {
    var sp = t.pine ? sprites['p' + t.seed] : sprites['t' + t.ci + '_' + t.seed];
    if (!sp) return;
    var amp = (t.pine ? 0.5 : 1) * (t.lawn ? 0.6 : 1) * (SEASON.snow && !t.pine ? 0.5 : 1);
    var sh =
      wind * amp * (0.035 * Math.sin(time * 1.4 + t.ph) + 0.02 * Math.sin(time * 2.7 + t.ph * 1.7)) -
      wind * 0.02 * amp +
      t.shake * 0.09 * Math.sin(time * 26);
    var s = t.s * 1.6;
    g.save();
    g.translate(t.x, t.y);
    g.transform(1, 0, sh, 1, 0, 0);
    if (prev) {
      var tm = mmAt(t.x, t.y - 50 * s),
        osp = t.pine ? prev.sprites['p' + t.seed] : prev.sprites['t' + t.ci + '_' + t.seed];
      if (osp && tm < 1) {
        g.globalAlpha = 1 - tm;
        g.drawImage(osp, -75 * s, -162 * s, 150 * s, 170 * s);
      }
      g.globalAlpha = tm;
    }
    g.drawImage(sp, -75 * s, -162 * s, 150 * s, 170 * s);
    g.restore();
  }
  function drawCar(g, c) {
    var ua = c.u - 10,
      ub = c.u + 10,
      v0 = c.v0,
      v1 = c.v0 + 34,
      col = c.col,
      sn = DS.snow;
    poly(
      g,
      [
        [ua - 3, v0 - 1],
        [ub + 1, v0 - 1],
        [ub + 1, v1 + 4],
        [ua - 3, v1 + 4],
      ],
      'rgba(0,0,0,0.2)',
    );
    poly(
      g,
      [
        [ua, v1, 2.5],
        [ub, v1, 2.5],
        [ub, v1, 11],
        [ua, v1, 11],
      ],
      shade(col, 0.72),
    );
    poly(
      g,
      [
        [ua + 1.5, v1, 7],
        [ua + 6, v1, 7],
        [ua + 6, v1, 9.6],
        [ua + 1.5, v1, 9.6],
      ],
      '#fff3c4',
    );
    poly(
      g,
      [
        [ub - 6, v1, 7],
        [ub - 1.5, v1, 7],
        [ub - 1.5, v1, 9.6],
        [ub - 6, v1, 9.6],
      ],
      '#fff3c4',
    );
    poly(
      g,
      [
        [ua + 7.5, v1, 4],
        [ub - 7.5, v1, 4],
        [ub - 7.5, v1, 6],
        [ua + 7.5, v1, 6],
      ],
      'rgba(20,20,25,0.55)',
    );
    poly(
      g,
      [
        [ua, v0, 11],
        [ub, v0, 11],
        [ub, v1, 11],
        [ua, v1, 11],
      ],
      sn ? '#f1f5f9' : shade(col, 1.14),
    );
    poly(
      g,
      [
        [ua, v0, 2.5],
        [ua, v1, 2.5],
        [ua, v1, 11],
        [ua, v0, 11],
      ],
      col,
    );
    var c0 = v0 + 7,
      c1 = v1 - 9,
      ca = ua + 1.6,
      cb = ub - 1.6;
    poly(
      g,
      [
        [ca, c1, 11],
        [cb, c1, 11],
        [cb, c1 - 3, 18.5],
        [ca, c1 - 3, 18.5],
      ],
      '#5f8299',
    );
    poly(
      g,
      [
        [ca, c0 + 2.5, 18.5],
        [cb, c0 + 2.5, 18.5],
        [cb, c1 - 3, 18.5],
        [ca, c1 - 3, 18.5],
      ],
      sn ? '#f6f9fc' : shade(col, 1.24),
    );
    poly(
      g,
      [
        [ca, c0, 11],
        [ca, c1, 11],
        [ca, c1 - 3, 18.5],
        [ca, c0 + 2.5, 18.5],
      ],
      col,
    );
    poly(
      g,
      [
        [ca, c0 + 1.6, 12],
        [ca, c1 - 1.6, 12],
        [ca, c1 - 3.6, 17.3],
        [ca, c0 + 3.4, 17.3],
      ],
      '#a8c6d8',
    );
    poly(
      g,
      [
        [ca, (c0 + c1) / 2 - 0.8, 12],
        [ca, (c0 + c1) / 2 + 0.8, 12],
        [ca, (c0 + c1) / 2 + 0.8, 17.3],
        [ca, (c0 + c1) / 2 - 0.8, 17.3],
      ],
      col,
    );
    wline(g, [ua, (v0 + v1) / 2, 3.5], [ua, (v0 + v1) / 2, 10.5], 'rgba(0,0,0,0.18)', 0.6);
    var w1 = P(ua, v0 + 7, 3.4),
      w2 = P(ua, v1 - 7, 3.4);
    circ(g, w1[0], w1[1], 4, '#2a2b30');
    circ(g, w1[0], w1[1], 1.7, '#c6c6c6');
    circ(g, w2[0], w2[1], 4, '#2a2b30');
    circ(g, w2[0], w2[1], 1.7, '#c6c6c6');
  }
  function drawLamp(g, l) {
    var a = P(l.u, l.v, 0),
      b = P(l.u, l.v, 46);
    rr(g, a[0] - 2.4, a[1] - 4, 4.8, 5, 1.2, '#33363d');
    seg(g, a[0], a[1] - 2, b[0], b[1] + 2, '#33363d', 1.9);
    rr(g, b[0] - 4.4, b[1] - 7.4, 8.8, 3, 1.4, DS.snow ? '#f4f7fb' : '#33363d');
    rr(g, b[0] - 3.2, b[1] - 4.6, 6.4, 6, 2, '#f7e9b0');
    seg(g, b[0] - 3.2, b[1] + 1.6, b[0] + 3.2, b[1] + 1.6, '#33363d', 1.2);
  }
  function drawBush(g, b) {
    var p = P(b.u, b.v, 0),
      s = b.s,
      col = DS.bush[b.ci];
    ell(g, p[0] + 4 * s, p[1] + 1, 13 * s, 4.4 * s, 'rgba(40,45,20,0.16)');
    circ(g, p[0] - 6 * s, p[1] - 6 * s, 7.5 * s, col);
    circ(g, p[0] + 6 * s, p[1] - 7 * s, 8.5 * s, col);
    circ(g, p[0], p[1] - 12 * s, 7.5 * s, col);
    if (DS.snow) {
      circ(g, p[0] - 1 * s, p[1] - 14 * s, 6 * s, '#f6f9fc');
      circ(g, p[0] + 6 * s, p[1] - 11 * s, 4.6 * s, '#f6f9fc');
      circ(g, p[0] - 7 * s, p[1] - 9.5 * s, 4 * s, '#f6f9fc');
    } else {
      circ(g, p[0] - 3 * s, p[1] - 13 * s, 4.5 * s, 'rgba(255,255,220,0.2)');
      circ(g, p[0] + 8 * s, p[1] - 4 * s, 5.5 * s, 'rgba(40,20,0,0.12)');
    }
  }
  function drawDumpster(g) {
    var a = 505,
      b = 531,
      v0 = 345,
      v1 = 359;
    poly(
      g,
      [
        [a - 3, v0 - 1],
        [b + 1, v0 - 1],
        [b + 1, v1 + 3],
        [a - 3, v1 + 3],
      ],
      'rgba(0,0,0,0.18)',
    );
    poly(
      g,
      [
        [a, v1, 0],
        [b, v1, 0],
        [b, v1, 17],
        [a, v1, 17],
      ],
      '#2f4a3c',
    );
    poly(
      g,
      [
        [a, v0, 0],
        [a, v1, 0],
        [a, v1, 17],
        [a, v0, 17],
      ],
      '#3d5f4d',
    );
    poly(
      g,
      [
        [a, v0, 17],
        [b, v0, 20],
        [b, v1, 20],
        [a, v1, 17],
      ],
      DS.snow ? '#f1f5f9' : '#23382d',
    );
    wline(g, [a, v0 + 3, 9], [a, v1 - 3, 9], 'rgba(255,255,255,0.25)', 1);
  }
  function drawMailbox(g, m) {
    var a = P(m.u, m.v, 0);
    ell(g, a[0] + 4, a[1] + 1, 8, 2.5, 'rgba(0,0,0,0.16)');
    seg(g, a[0], a[1], a[0], a[1] - 9, '#5b5f66', 2);
    rr(g, a[0] - 7, a[1] - 21, 14, 12, 1.6, '#8d949c');
    g.fillStyle = '#6f757d';
    for (var i = 0; i < 3; i++)
      for (var j = 0; j < 2; j++) g.fillRect(a[0] - 5.6 + i * 4, a[1] - 19.6 + j * 5, 3.2, 4);
    if (DS.snow) rr(g, a[0] - 7.5, a[1] - 23, 15, 3.4, 1.6, '#f6f9fc');
  }
  function drawBench(g, b) {
    var a = P(b.u, b.v, 0);
    ell(g, a[0] + 3, a[1] + 1, 12, 3, 'rgba(0,0,0,0.16)');
    rr(g, a[0] - 10, a[1] - 7, 20, 3, 1, DS.snow ? '#f1f5f9' : '#8a623d');
    rr(g, a[0] - 10, a[1] - 13, 20, 4, 1, '#9b7048');
    seg(g, a[0] - 8, a[1], a[0] - 8, a[1] - 6, '#3d4047', 1.6);
    seg(g, a[0] + 8, a[1], a[0] + 8, a[1] - 6, '#3d4047', 1.6);
  }
  function drawHydrant(g, h) {
    var a = P(h.u, h.v, 0);
    ell(g, a[0] + 2, a[1] + 0.5, 5, 1.8, 'rgba(0,0,0,0.18)');
    rr(g, a[0] - 2.6, a[1] - 9, 5.2, 9, 1.4, '#d2483c');
    circ(g, a[0], a[1] - 9.5, 2.8, DS.snow ? '#f6f9fc' : '#d2483c');
    rr(g, a[0] - 4.4, a[1] - 6.6, 8.8, 2.4, 1.2, '#b53a30');
  }
  function drawSnowman(g, m) {
    var a = P(m.u, m.v, 0),
      x = a[0],
      y = a[1];
    ell(g, x + 4, y + 1, 13, 4, 'rgba(90,110,140,0.22)');
    circ(g, x, y - 8, 9.5, '#fbfdff');
    circ(g, x + 2.5, y - 6, 7, 'rgba(190,205,225,0.35)');
    circ(g, x, y - 21, 7, '#fbfdff');
    circ(g, x, y - 31, 5.2, '#fbfdff');
    seg(g, x - 6, y - 22, x - 15, y - 27, '#6b4a36', 1.3);
    seg(g, x + 6, y - 22, x + 15, y - 28, '#6b4a36', 1.3);
    rr(g, x - 5.5, y - 27.6, 11, 2.8, 1.4, '#d2483c');
    rr(g, x + 2, y - 27, 2.8, 7, 1.2, '#d2483c');
    circ(g, x - 1.8, y - 32, 0.75, '#2b2624');
    circ(g, x + 1.8, y - 32, 0.75, '#2b2624');
    g.beginPath();
    g.moveTo(x, y - 30.6);
    g.lineTo(x + 5, y - 29.6);
    g.lineTo(x, y - 29);
    g.closePath();
    g.fillStyle = '#f08a2c';
    g.fill();
    circ(g, x, y - 22, 0.8, '#2b2624');
    circ(g, x, y - 18.5, 0.8, '#2b2624');
    rr(g, x - 4.6, y - 39.5, 9.2, 5.5, 1, '#33363d');
    rr(g, x - 6.6, y - 35.4, 13.2, 2, 1, '#33363d');
  }

  /* ---------- the family and what they wear ---------- */
  function ext(base, over) {
    var o = {},
      k;
    for (k in base) o[k] = base[k];
    for (k in over) o[k] = over[k];
    return o;
  }
  var MAN = {
    h: 58,
    body: '#4d6c8e',
    arm: '#42607f',
    legs: '#333a4b',
    shoes: '#f1eee8',
    hair: '#2b2624',
    skin: '#c8905f',
    long: false,
    scarf: null,
  };
  var WOMAN = {
    h: 44,
    body: '#c8798b',
    arm: '#b96a7c',
    legs: '#4a4f63',
    shoes: '#2b2624',
    hair: '#3a2a22',
    skin: '#cf9968',
    long: true,
    scarf: '#f1e8d6',
  };
  var NEIGHBOR = {
    h: 50,
    body: '#5d7f6a',
    arm: '#4f6e5b',
    legs: '#3b3f4a',
    shoes: '#2b2624',
    hair: '#9a9c9f',
    skin: '#d9a67c',
    long: false,
    scarf: '#d9762f',
  };
  var OUTFITS = {
    autumn: {
      m: MAN,
      w: WOMAN,
      n: NEIGHBOR,
      umb: false,
      cover: false,
      blanket: '#f7f1e2',
      babyHat: '#f3ead8',
      dog: null,
    },
    spring: {
      m: ext(MAN, { body: '#8fae8a', arm: '#7f9e7a', legs: '#4a5568' }),
      w: ext(WOMAN, { body: '#b9a3d8', arm: '#a892c8', legs: '#5a6078', scarf: null }),
      n: ext(NEIGHBOR, { body: '#d9b25a', arm: '#c9a24c', scarf: null }),
      umb: false,
      cover: false,
      blanket: '#fbe3ea',
      babyHat: '#f7c9d8',
      dog: null,
    },
    summer: {
      m: ext(MAN, {
        body: '#f4f1e9',
        arm: '#e4e0d6',
        legs: '#8a8f62',
        tee: true,
        short: true,
        shorts: true,
        hat: 'cap',
        hatCol: '#3f5f7f',
      }),
      w: ext(WOMAN, {
        body: '#ef8f6f',
        arm: '#e07f60',
        tee: true,
        short: true,
        dress: true,
        bare: true,
        shoes: '#b98a5a',
        scarf: null,
        hat: 'sunhat',
        hatCol: '#ecd9a0',
      }),
      n: ext(NEIGHBOR, {
        body: '#6fa8c9',
        arm: '#5f98b9',
        legs: '#55595f',
        tee: true,
        short: true,
        shorts: true,
        scarf: null,
        hat: 'cap',
        hatCol: '#d9d3c6',
      }),
      umb: false,
      cover: false,
      blanket: '#fdf6d8',
      babyHat: '#ecd9a0',
      dog: null,
    },
    winter: {
      m: ext(MAN, {
        body: '#34506e',
        arm: '#2d4660',
        legs: '#2b2f3a',
        shoes: '#4a3528',
        puffy: true,
        hat: 'beanie',
        hatCol: '#c8452f',
        pom: '#f1eee8',
        scarf: '#d9d3c6',
        mitt: '#2b2f3a',
      }),
      w: ext(WOMAN, {
        body: '#a84a5f',
        arm: '#983f54',
        legs: '#3a3f52',
        shoes: '#4a3528',
        puffy: true,
        coat: true,
        hat: 'beanie',
        hatCol: '#f1e8d6',
        pom: '#c8798b',
        scarf: '#e7d9b8',
        mitt: '#f1e8d6',
      }),
      n: ext(NEIGHBOR, {
        body: '#4f6b58',
        arm: '#435c4b',
        puffy: true,
        hat: 'beanie',
        hatCol: '#d9762f',
        pom: '#f1eee8',
        scarf: '#e7d9b8',
        mitt: '#3b3f4a',
      }),
      umb: false,
      cover: false,
      blanket: '#c8d6e8',
      babyHat: '#c8452f',
      dog: '#c8452f',
    },
    rain: {
      m: ext(MAN, {
        body: '#2f4f6f',
        arm: '#284662',
        legs: '#2b2f3a',
        shoes: '#3a4a5a',
        hat: 'hood',
        hatCol: '#2f4f6f',
      }),
      w: ext(WOMAN, {
        body: '#f0c63c',
        arm: '#e0b62f',
        legs: '#4a4f63',
        shoes: '#3d6a8a',
        coat: true,
        scarf: null,
        hat: 'hood',
        hatCol: '#f0c63c',
      }),
      n: ext(NEIGHBOR, { body: '#566b7d', arm: '#4a5e6f', scarf: null, hat: 'hood', hatCol: '#566b7d' }),
      umb: true,
      cover: true,
      blanket: '#f7f1e2',
      babyHat: '#f3ead8',
      dog: '#f0c63c',
    },
  };
  var ofCur = 'autumn',
    ofPrev = null,
    ofMix = 1;
  function drawPerson(g, x, y, o, ph, hx1, hy1, hx2, hy2) {
    var s = o.h / 40,
      i,
      skin = o.skin;
    ell(g, x + 3 * s, y + 1, 8.5 * s, 3 * s, 'rgba(0,0,0,0.2)');
    var bob = -Math.abs(Math.sin(ph)) * 1.3 * s;
    for (i = 0; i < 2; i++) {
      var lift = Math.max(0, Math.sin(ph + i * Math.PI)) * 3.2 * s,
        lx = x + (i ? 0.4 : -4.8) * s;
      rr(g, lx, y - 14.5 * s + bob, 4.4 * s, 14 * s - lift - bob, 2 * s, o.bare || o.shorts ? skin : o.legs);
      if (o.shorts) rr(g, lx - 0.3 * s, y - 14.5 * s + bob, 5 * s, 6.5 * s, 1.4 * s, o.legs);
      ell(g, lx + 2.2 * s, y - lift + 0.3, 3 * s, 1.7 * s, o.shoes);
    }
    var by = y + bob,
      bw = o.puffy ? 1.1 : 1,
      bl = o.coat ? 23.5 : 19.5;
    if (o.hat === 'hood') circ(g, x, by - 36.8 * s, 7.7 * s, o.hatCol);
    else if (o.long) rr(g, x - 6.8 * s, by - 42.5 * s, 13.6 * s, 18 * s, 6 * s, o.hair);
    if (o.dress) {
      g.beginPath();
      g.moveTo(x - 6.5 * s, by - 20 * s);
      g.lineTo(x + 6.5 * s, by - 20 * s);
      g.lineTo(x + 9.8 * s, by - 7.5 * s);
      g.lineTo(x - 9.8 * s, by - 7.5 * s);
      g.closePath();
      g.fillStyle = o.body;
      g.fill();
    }
    rr(g, x - 7.6 * s * bw, by - 31.5 * s, 15.2 * s * bw, bl * s, 6.5 * s, o.body);
    rr(g, x + 2.6 * s * bw, by - 31.5 * s, 5 * s * bw, bl * s, 3 * s, 'rgba(0,0,0,0.1)');
    if (o.belly) {
      var bs = o.belly === true ? 1 : o.belly,
        bx = x - 3.6 * s,
        bby = by - 17.2 * s,
        brx = 10.4 * s * bs,
        bry = 9 * s * bs;
      ell(g, bx + 0.8 * s, bby + 1.8 * s, brx, bry, 'rgba(0,0,0,0.16)', 0);
      ell(g, bx, bby, brx, bry, o.body, 0);
      g.beginPath();
      g.ellipse(bx, bby, brx, bry, 0, 0.1 * Math.PI, 0.95 * Math.PI);
      g.strokeStyle = 'rgba(0,0,0,0.28)';
      g.lineWidth = 1.4 * s;
      g.lineCap = 'round';
      g.stroke();
      circ(g, bx - 2.8 * s, bby - 3 * s, 3 * s * bs, 'rgba(255,255,255,0.22)');
    }
    if (!o.tee) seg(g, x, by - 29 * s, x, by - (o.coat ? 9.5 : 13.5) * s, 'rgba(0,0,0,0.16)', 0.8 * s);
    if (o.puffy) {
      [-25.5, -20, -14.5].forEach(function (q, qi) {
        if (qi < 2 || o.coat)
          seg(g, x - 6.6 * s * bw, by + q * s, x + 6.6 * s * bw, by + q * s, 'rgba(0,0,0,0.14)', 0.7 * s);
      });
    }
    if (o.scarf) {
      rr(g, x - 5.6 * s, by - 33 * s, 11.2 * s, 4.6 * s, 2.2 * s, o.scarf);
      rr(g, x + 1.4 * s, by - 31.5 * s, 3.6 * s, 9.5 * s, 1.6 * s, o.scarf);
    } else if (o.tee) {
      g.beginPath();
      g.arc(x, by - 31.6 * s, 2.6 * s, 0, Math.PI);
      g.fillStyle = skin;
      g.fill();
    } else if (o.hat !== 'hood') {
      g.beginPath();
      g.moveTo(x - 4 * s, by - 31.5 * s);
      g.lineTo(x, by - 27.5 * s);
      g.lineTo(x + 4 * s, by - 31.5 * s);
      g.strokeStyle = 'rgba(0,0,0,0.25)';
      g.lineWidth = 1.8 * s;
      g.lineJoin = 'round';
      g.stroke();
    }
    circ(g, x, by - 36.6 * s, 5.7 * s, skin);
    if (o.hat === 'hood') {
      g.beginPath();
      g.arc(x, by - 36.6 * s, 6.5 * s, Math.PI * 0.92, Math.PI * 2.08);
      g.strokeStyle = o.hatCol;
      g.lineWidth = 2.8 * s;
      g.lineCap = 'round';
      g.stroke();
    } else {
      g.beginPath();
      g.arc(x, by - 37.6 * s, 6 * s, Math.PI, 6.2832);
      g.closePath();
      g.fillStyle = o.hair;
      g.fill();
    }
    if (o.hat === 'beanie') {
      g.beginPath();
      g.arc(x, by - 38 * s, 6.4 * s, Math.PI, 6.2832);
      g.closePath();
      g.fillStyle = o.hatCol;
      g.fill();
      rr(g, x - 6.4 * s, by - 39.4 * s, 12.8 * s, 2.6 * s, 1.2 * s, 'rgba(255,255,255,0.32)');
      circ(g, x, by - 45 * s, 2.3 * s, o.pom || '#ffffff');
    } else if (o.hat === 'sunhat') {
      ell(g, x, by - 39.4 * s, 10 * s, 3 * s, o.hatCol);
      g.beginPath();
      g.arc(x, by - 39.8 * s, 5.5 * s, Math.PI, 6.2832);
      g.closePath();
      g.fillStyle = o.hatCol;
      g.fill();
      rr(g, x - 5.5 * s, by - 41.6 * s, 11 * s, 1.7 * s, 0.6 * s, '#c8798b');
    } else if (o.hat === 'cap') {
      g.beginPath();
      g.arc(x, by - 38 * s, 6.2 * s, Math.PI, 6.2832);
      g.closePath();
      g.fillStyle = o.hatCol;
      g.fill();
      ell(g, x, by - 37.6 * s, 6.6 * s, 1.7 * s, 'rgba(0,0,0,0.28)');
      ell(g, x, by - 38 * s, 6.4 * s, 1.5 * s, o.hatCol);
    }
    circ(g, x - 2.1 * s, by - 36 * s, 0.75 * s, '#2b2624');
    circ(g, x + 2.1 * s, by - 36 * s, 0.75 * s, '#2b2624');
    g.beginPath();
    g.arc(x, by - 34.6 * s, 1.9 * s, 0.25 * Math.PI, 0.75 * Math.PI);
    g.strokeStyle = '#9c5d49';
    g.lineWidth = 0.75 * s;
    g.lineCap = 'round';
    g.stroke();
    circ(g, x - 3.6 * s, by - 34.4 * s, 1.1 * s, 'rgba(226,120,110,0.35)');
    circ(g, x + 3.6 * s, by - 34.4 * s, 1.1 * s, 'rgba(226,120,110,0.35)');
    [
      [-6.4, hx1, hy1],
      [6.4, hx2, hy2],
    ].forEach(function (a) {
      var sx0 = x + a[0] * s,
        sy0 = by - 28 * s;
      if (o.short) {
        seg(g, sx0, sy0, a[1], a[2], skin, 3.1 * s);
        seg(g, sx0, sy0, lerp(sx0, a[1], 0.36), lerp(sy0, a[2], 0.36), o.arm, 3.7 * s);
      } else seg(g, sx0, sy0, a[1], a[2], o.arm, 3.5 * s);
      circ(g, a[1], a[2], 1.9 * s, o.mitt || skin);
    });
  }
  function drawUmbrella(g, hx, hy, cx, topY, r, col) {
    seg(g, hx, hy, cx, topY, '#4a4038', 1.6);
    var yb = topY + r * 0.42,
      yt = topY - r * 0.55,
      n = 4,
      i;
    g.beginPath();
    g.moveTo(cx - r, yb);
    g.quadraticCurveTo(cx - r * 0.92, yt + r * 0.05, cx, yt);
    g.quadraticCurveTo(cx + r * 0.92, yt + r * 0.05, cx + r, yb);
    for (i = n - 1; i >= 0; i--) {
      var x1 = cx - r + (2 * r * i) / n;
      g.quadraticCurveTo(x1 + r / n, topY + r * 0.14, x1, yb);
    }
    g.closePath();
    g.fillStyle = col;
    g.fill();
    g.beginPath();
    g.moveTo(cx, yt);
    g.quadraticCurveTo(cx + r * 0.92, yt + r * 0.05, cx + r, yb);
    g.quadraticCurveTo(cx + r * 0.75, topY + r * 0.14, cx + r * 0.5, yb);
    g.quadraticCurveTo(cx + r * 0.3, topY - r * 0.2, cx, yt);
    g.closePath();
    g.fillStyle = 'rgba(0,0,0,0.13)';
    g.fill();
    g.beginPath();
    g.moveTo(cx, yt);
    g.quadraticCurveTo(cx - r * 0.92, yt + r * 0.05, cx - r, yb);
    g.quadraticCurveTo(cx - r * 0.75, topY + r * 0.14, cx - r * 0.5, yb);
    g.quadraticCurveTo(cx - r * 0.3, topY - r * 0.2, cx, yt);
    g.closePath();
    g.fillStyle = 'rgba(255,255,255,0.14)';
    g.fill();
    circ(g, cx, yt - 1.6, 1.4, '#4a4038');
  }
  function drawStroller(g, x, y, ph, b1, b2, of) {
    var k = 1.62,
      wob = Math.sin(ph * 2) * 0.4;
    g.save();
    g.translate(x, y + wob);
    g.scale(k, k);
    ell(g, 3, 2.2, 16, 5.6, 'rgba(0,0,0,0.2)');
    circ(g, -4, -7, 3, '#2a2b30');
    circ(g, 12, -7, 3, '#2a2b30');
    seg(g, -9, 0, -6, -13, '#5a5148', 1.7);
    seg(g, 9, 0, 6, -13, '#5a5148', 1.7);
    seg(g, -4, -7, -5, -13, '#5a5148', 1.5);
    seg(g, 12, -7, 8, -14, '#5a5148', 1.5);
    g.restore();
    var mx = (b1[0] + b2[0]) / 2,
      my = (b1[1] + b2[1]) / 2;
    seg(g, x - 6 * k, y - 17 * k, lerp(b1[0], b2[0], 0.2), lerp(b1[1], b2[1], 0.2), '#5a5148', 2);
    seg(g, x + 9 * k, y - 17 * k, lerp(b1[0], b2[0], 0.8), lerp(b1[1], b2[1], 0.8), '#5a5148', 2);
    seg(g, b1[0], b1[1], b2[0], b2[1], '#6b4a36', 3.4);
    g.lineWidth = 1.3;
    g.strokeStyle = '#e58a35';
    g.beginPath();
    g.arc(mx - 1, my + 3.4, 2.4, 0, 6.2832);
    g.stroke();
    g.strokeStyle = '#3fb5a3';
    g.beginPath();
    g.arc(mx + 0.4, my + 7, 2.2, 0, 6.2832);
    g.stroke();
    g.strokeStyle = '#f2c94c';
    g.beginPath();
    g.arc(mx - 0.6, my + 10.4, 2, 0, 6.2832);
    g.stroke();
    g.save();
    g.translate(x, y + wob);
    g.scale(k, k);
    rr(g, -7.5, -10.5, 15, 5, 2, '#8c8375');
    g.beginPath();
    g.arc(1, -22, 12.5, Math.PI, 6.2832);
    g.closePath();
    g.fillStyle = '#ebe3d3';
    g.fill();
    g.beginPath();
    g.arc(1, -22, 12.5, Math.PI, Math.PI * 1.45);
    g.lineTo(1, -22);
    g.closePath();
    g.fillStyle = '#f5efe3';
    g.fill();
    g.strokeStyle = '#cfc4ae';
    g.lineWidth = 0.7;
    g.beginPath();
    g.moveTo(1, -22);
    g.lineTo(-5, -33);
    g.moveTo(1, -22);
    g.lineTo(1, -34.5);
    g.moveTo(1, -22);
    g.lineTo(7, -33);
    g.stroke();
    ell(g, 0.5, -22, 9.4, 6.4, '#a99d87');
    rr(g, -6, -23, 13, 7, 3.2, '#7fb8ea');
    seg(g, 5.2, -21, 8.6, -26 + Math.sin(ph) * 1.2, '#7fb8ea', 2.1);
    circ(g, 8.6, -26 + Math.sin(ph) * 1.2, 1.2, '#dcaa80');
    circ(g, 0.5, -25.6, 4.7, '#dcaa80');
    g.beginPath();
    g.arc(0.5, -26.3, 4.95, Math.PI * 0.98, Math.PI * 2.02);
    g.closePath();
    g.fillStyle = of.babyHat;
    g.fill();
    circ(g, -1.3, -25, 0.62, '#2b2624');
    circ(g, 2.3, -25, 0.62, '#2b2624');
    g.beginPath();
    g.arc(0.5, -23.8, 1.3, 0.15 * Math.PI, 0.85 * Math.PI);
    g.strokeStyle = '#9c5d49';
    g.lineWidth = 0.55;
    g.lineCap = 'round';
    g.stroke();
    circ(g, -2.6, -23.9, 0.9, 'rgba(232,120,120,0.45)');
    circ(g, 3.6, -23.9, 0.9, 'rgba(232,120,120,0.45)');
    rr(g, -10.5, -21, 21, 10.5, 5, '#d9cfbb');
    rr(g, -10.5, -15, 21, 4.5, 2.2, '#c9bea8');
    rr(g, -8.5, -20, 17, 3.8, 1.9, of.blanket);
    if (of.cover) {
      g.beginPath();
      g.ellipse(0.8, -21.5, 13.6, 13, 0, 0, 6.2832);
      g.fillStyle = 'rgba(205,228,245,0.36)';
      g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.65)';
      g.lineWidth = 0.7;
      g.stroke();
      g.beginPath();
      g.arc(0.8, -21.5, 10.5, Math.PI * 1.15, Math.PI * 1.5);
      g.strokeStyle = 'rgba(255,255,255,0.7)';
      g.lineWidth = 1;
      g.stroke();
    }
    circ(g, -9, 0, 3.7, '#2a2b30');
    circ(g, -9, 0, 1.4, '#bdb7ab');
    circ(g, 9, 0, 3.7, '#2a2b30');
    circ(g, 9, 0, 1.4, '#bdb7ab');
    g.restore();
  }
  /* the walk tells a story: expecting, then carrying the newborn, then the stroller */
  var stCur = 3,
    stPrev = -1,
    stMix = 1,
    hearts = [];
  function heart(g, x, y, s, fill) {
    g.beginPath();
    g.moveTo(x, y + s * 0.9);
    g.bezierCurveTo(x - s * 1.5, y - s * 0.2, x - s * 0.75, y - s * 1.3, x, y - s * 0.45);
    g.bezierCurveTo(x + s * 0.75, y - s * 1.3, x + s * 1.5, y - s * 0.2, x, y + s * 0.9);
    g.closePath();
    g.fillStyle = fill;
    g.fill();
  }
  function spawnHearts(n, u) {
    var q = P(u - 12, 270, 0);
    for (var i = 0; i < n; i++)
      hearts.push({
        x: q[0] + (lr() - 0.5) * 30,
        y: q[1] - 48 - lr() * 14,
        age: -i * 0.22,
        ph: lr() * 6.28,
        s: 3.4 + lr() * 2.6,
      });
  }
  function swingHand(p, s, side, ph) {
    return [p[0] + side * 8.2 * s, p[1] - 16 * s + Math.sin(ph + (side > 0 ? Math.PI : 0)) * 2.2 * s];
  }
  function familyIn(g, u, ph, of, stage) {
    var sm = of.m.h / 40,
      sw = of.w.h / 40;
    if (stage === 2) {
      var us = u - 26,
        ps = P(us, 275, 0),
        pw = P(u, 262, 0),
        pm = P(u, 288, 0);
      var cx = ps[0] + UX * 20,
        cy = ps[1] - UY * 20 - 31,
        b1 = [cx - 13, cy - 7.5],
        b2 = [cx + 13, cy + 7.5];
      var ux = (pm[0] + pw[0]) / 2 + 3,
        uy = pm[1] - 88,
        mh1x = lerp(b1[0], b2[0], 0.72),
        mh1y = lerp(b1[1], b2[1], 0.72);
      if (of.umb) {
        mh1x = pm[0] - 10;
        mh1y = pm[1] - 40;
      }
      drawPerson(
        g,
        pw[0],
        pw[1],
        of.w,
        ph + 1.3,
        b1[0],
        b1[1],
        lerp(b1[0], b2[0], 0.28),
        lerp(b1[1], b2[1], 0.28),
      );
      drawPerson(g, pm[0], pm[1], of.m, ph, mh1x, mh1y, b2[0], b2[1]);
      if (of.umb) drawUmbrella(g, mh1x, mh1y, ux, uy, 29, '#d2483c');
      drawStroller(g, ps[0], ps[1], ph, b1, b2, of);
      return;
    }
    var qw = P(u - 12, 266, 0),
      qm = P(u - 12, 285, 0),
      wph = ph + 1.3,
      wbob = -Math.abs(Math.sin(wph)) * 1.3 * sw,
      wby = qw[1] + wbob;
    var hold = [(qw[0] + qm[0]) / 2 + 1, (qw[1] + qm[1]) / 2 - 17 * sw],
      mIn = hold,
      mOut = swingHand(qm, sm, 1, ph);
    if (of.umb) {
      mIn = [qm[0] - 10, qm[1] - 40];
    }
    if (stage === 0 || stage === 3) {
      var preg = stage === 0,
        wl = preg ? [qw[0] - 9.5 * sw, wby - 11.5 * sw] : swingHand(qw, sw, -1, wph),
        wr = of.umb ? (preg ? [qw[0] + 4 * sw, wby - 21.5 * sw] : swingHand(qw, sw, 1, wph)) : hold;
      drawPerson(
        g,
        qw[0],
        qw[1],
        preg ? ext(of.w, { belly: bellyK }) : of.w,
        wph,
        wl[0],
        wl[1],
        wr[0],
        wr[1],
      );
      drawPerson(g, qm[0], qm[1], of.m, ph, mIn[0], mIn[1], mOut[0], mOut[1]);
    } else {
      if (!of.umb) mIn = swingHand(qm, sm, -1, ph);
      var hl = [qw[0] - 8.4 * sw, wby - 17.5 * sw],
        hr = [qw[0] + 8.8 * sw, wby - 21 * sw];
      drawPerson(g, qw[0], qw[1], of.w, wph, hl[0], hl[1], hr[0], hr[1]);
      /* the newborn in a blue swaddle, held across her chest */
      var bx = qw[0] + 0.8 * sw,
        byy = wby - 21.5 * sw + Math.sin(ph * 0.5) * 0.5;
      ell(g, bx + 0.8 * sw, byy + 1 * sw, 11.4 * sw, 7 * sw, 'rgba(0,0,0,0.12)', -0.3);
      ell(g, bx, byy, 11 * sw, 6.6 * sw, '#7fb8ea', -0.3);
      ell(g, bx + 2.2 * sw, byy + 1.2 * sw, 7.6 * sw, 3.6 * sw, '#6aa6dc', -0.3);
      seg(g, bx - 5 * sw, byy - 1.4 * sw, bx + 7.4 * sw, byy - 5 * sw, '#cfe6f8', 1.5 * sw);
      seg(g, bx - 2 * sw, byy + 3.6 * sw, bx + 8.6 * sw, byy + 0.2 * sw, '#cfe6f8', 1.1 * sw);
      var hx0 = bx - 7.4 * sw,
        hy0 = byy - 3.4 * sw;
      circ(g, hx0, hy0, 4.5 * sw, '#dcaa80');
      g.beginPath();
      g.arc(hx0, hy0 - 0.5 * sw, 4.8 * sw, Math.PI * 0.95, Math.PI * 1.98);
      g.closePath();
      g.fillStyle = '#cfe6f8';
      g.fill();
      seg(g, hx0 - 4.4 * sw, hy0 - 0.7 * sw, hx0 + 4.6 * sw, hy0 - 1.3 * sw, '#7fb8ea', 1 * sw);
      g.strokeStyle = '#2b2624';
      g.lineWidth = 0.6 * sw;
      g.lineCap = 'round';
      g.beginPath();
      g.arc(hx0 - 1.7 * sw, hy0 + 0.9 * sw, 0.95 * sw, 0, Math.PI);
      g.stroke();
      g.beginPath();
      g.arc(hx0 + 1.7 * sw, hy0 + 0.7 * sw, 0.95 * sw, 0, Math.PI);
      g.stroke();
      circ(g, hx0 - 2.9 * sw, hy0 + 2.2 * sw, 0.95 * sw, 'rgba(232,120,120,0.45)');
      circ(g, hx0 + 2.9 * sw, hy0 + 2 * sw, 0.95 * sw, 'rgba(232,120,120,0.45)');
      circ(g, hl[0], hl[1], 2 * sw, of.w.mitt || of.w.skin);
      circ(g, hr[0], hr[1], 2 * sw, of.w.mitt || of.w.skin);
      drawPerson(g, qm[0], qm[1], of.m, ph, mIn[0], mIn[1], mOut[0], mOut[1]);
    }
    if (of.umb) drawUmbrella(g, mIn[0], mIn[1], (qm[0] + qw[0]) / 2 + 3, qm[1] - 88, 29, '#d2483c');
  }
  function drawFamily(g, u, ph, alpha) {
    g.save();
    if (ofPrev && ofMix < 1) {
      g.globalAlpha = alpha * (1 - ofMix * ofMix * ofMix);
      familyIn(g, u, ph, OUTFITS[ofPrev], stCur);
      g.globalAlpha = alpha * ofMix;
      familyIn(g, u, ph, OUTFITS[ofCur], stCur);
    } else if (stPrev >= 0 && stMix < 1) {
      g.globalAlpha = alpha * (1 - stMix * stMix * stMix);
      familyIn(g, u, ph, OUTFITS[ofCur], stPrev);
      g.globalAlpha = alpha * stMix;
      familyIn(g, u, ph, OUTFITS[ofCur], stCur);
    } else {
      g.globalAlpha = alpha;
      familyIn(g, u, ph, OUTFITS[ofCur], stCur);
    }
    g.restore();
  }

  /* ---------- neighbours, animals, traffic ---------- */
  function fadeU(u) {
    return clamp(Math.min(u - 4, UMAX - 4 - u) / 40, 0, 1);
  }
  function drawDog(g, x, y, ph, col, coat) {
    ell(g, x + 1, y + 1, 9, 3, 'rgba(0,0,0,0.2)');
    var a = Math.sin(ph * 2) * 2.2;
    seg(g, x - 4, y - 4, x - 4 - a, y, col, 1.9);
    seg(g, x - 1.5, y - 4, x - 1.5 + a, y, col, 1.9);
    seg(g, x + 3, y - 5, x + 3 + a, y - 1, col, 1.9);
    seg(g, x + 5.5, y - 5, x + 5.5 - a, y - 1, col, 1.9);
    rr(g, x - 6.5, y - 10.5, 13.5, 6.5, 3.2, col);
    if (coat) rr(g, x - 4.6, y - 11, 9.6, 5.6, 2.4, coat);
    seg(g, x + 6.5, y - 9, x + 10, y - 13 + Math.sin(ph * 3) * 2, col, 1.8);
    circ(g, x - 7.5, y - 11.5, 3.6, col);
    ell(g, x - 10.6, y - 10.2, 2.2, 1.6, shade(col, 0.82), 0.3);
    circ(g, x - 12.2, y - 10.6, 0.8, '#2b2624');
    circ(g, x - 8.4, y - 12.4, 0.6, '#2b2624');
    ell(g, x - 5.6, y - 13.6, 1.5, 2.4, shade(col, 0.7), 0.5);
    seg(g, x - 5.4, y - 9.2, x - 4.6, y - 9.8, '#c8452f', 1.6);
  }
  function neighborIn(g, u, ph, of) {
    var pn = P(u, 168, 0),
      pd = P(u - 24, 172, 0),
      s = of.n.h / 40;
    var hx = pn[0] - 9 * s,
      hy = pn[1] - 15 * s,
      rx = pn[0] + 8 * s,
      ry = pn[1] - 15 * s + Math.sin(ph) * 1.5;
    if (of.umb) {
      rx = pn[0] + 9 * s;
      ry = pn[1] - 30 * s;
    }
    seg(g, hx, hy, pd[0] - 4.6, pd[1] - 9.6, '#7a4a3a', 0.9);
    drawPerson(g, pn[0], pn[1], of.n, ph, hx, hy, rx, ry);
    if (of.umb) drawUmbrella(g, rx, ry, pn[0] + 3, pn[1] - 74, 22, '#3fb5a3');
    drawDog(g, pd[0], pd[1], ph, '#c99a5b', of.dog);
  }
  function drawNeighbor(g, u, ph, alpha) {
    g.save();
    if (ofPrev && ofMix < 1) {
      g.globalAlpha = alpha * (1 - ofMix * ofMix * ofMix);
      neighborIn(g, u, ph, OUTFITS[ofPrev]);
      g.globalAlpha = alpha * ofMix;
      neighborIn(g, u, ph, OUTFITS[ofCur]);
    } else {
      g.globalAlpha = alpha;
      neighborIn(g, u, ph, OUTFITS[ofCur]);
    }
    g.restore();
  }
  function drawSquirrel(g, q, T) {
    var p = P(q.u, q.v, 0),
      x = p[0],
      y = p[1] - q.hop,
      d = q.dir,
      col = '#a8552c',
      tail = '#c06a36';
    ell(g, p[0], p[1] + 0.6, 5, 1.8, 'rgba(0,0,0,0.18)');
    if (q.run) {
      ell(g, x - d * 6, y - 5.5, 5.2, 2.6, tail, -d * 0.5);
      ell(g, x, y - 3.4, 4.8, 2.9, col, 0);
      circ(g, x + d * 4.6, y - 5, 2.3, col);
      circ(g, x + d * 4.2, y - 7.2, 0.9, col);
      circ(g, x + d * 5.4, y - 5.4, 0.5, '#2b2624');
    } else {
      var fl = Math.sin(T * 5 + q.u) * 0.25;
      ell(g, x - d * 3.6, y - 7.5, 2.8, 6, tail, d * (0.35 + fl));
      ell(g, x, y - 4.2, 3.1, 4.3, col, 0);
      ell(g, x + d * 0.8, y - 3.4, 1.6, 2.6, '#e7c9a5', 0);
      circ(g, x + d * 1.4, y - 9, 2.3, col);
      circ(g, x + d * 0.6, y - 11.2, 0.9, col);
      circ(g, x + d * 2.3, y - 9.3, 0.5, '#2b2624');
    }
  }
  function squirrelState(T, A, B, off) {
    var c = (T + off) % 10,
      f,
      run = false,
      from = A,
      to = B;
    if (c < 3.2) {
      f = 0;
    } else if (c < 4.6) {
      f = (c - 3.2) / 1.4;
      run = true;
    } else if (c < 8.4) {
      f = 1;
    } else {
      f = 1 - (c - 8.4) / 1.6;
      run = true;
      from = B;
      to = A;
    }
    var dx = P(to[0], to[1], 0)[0] - P(from[0], from[1], 0)[0];
    return {
      u: lerp(A[0], B[0], f),
      v: lerp(A[1], B[1], f),
      run: run,
      dir: dx >= 0 ? 1 : -1,
      hop: run ? Math.abs(Math.sin(c * 14)) * 3.5 : 0,
    };
  }
  var LAWNBIRDS = [
    [150, 140, 0],
    [162, 134, 1.7],
    [505, 152, 3.1],
    [330, 170, 4.4],
  ];
  function drawLawnBird(g, b, T) {
    var hopT = (T * 0.5 + b[2]) % 4,
      hop = hopT < 0.3 ? Math.sin((hopT / 0.3) * 3.1416) * 3 : 0,
      shift = (Math.floor((T * 0.5 + b[2]) / 4) % 3) * 4;
    var p = P(b[0] + shift, b[1], 0),
      x = p[0],
      y = p[1] - hop,
      peck = Math.max(0, Math.sin(T * 4 + b[2] * 3)) * 1.6;
    ell(g, p[0], p[1] + 0.5, 3.4, 1.2, 'rgba(0,0,0,0.18)');
    seg(g, x + 2.4, y - 2.6, x + 5, y - 3.4, '#4f4640', 1.3);
    ell(g, x, y - 2.6, 3.2, 2.2, '#6b5f58', 0);
    ell(g, x - 0.4, y - 2, 2, 1.3, '#b9aea2', 0);
    circ(g, x - 2.6, y - 4.4 + peck, 1.6, '#6b5f58');
    seg(g, x - 4, y - 4.2 + peck, x - 5.2, y - 3.8 + peck * 1.3, '#e0902f', 1);
  }
  function drawFlock(g, T) {
    var fx = -80 + ((T * 62) % (W + 1100));
    if (fx > W + 80) return;
    g.strokeStyle = '#4a4038';
    g.lineWidth = 1.5;
    g.lineCap = 'round';
    g.lineJoin = 'round';
    for (var i = 0; i < 5; i++) {
      var x = fx - Math.abs(i - 2) * 20,
        y = 150 + Math.sin(fx * 0.006) * 36 + (i - 2) * 13,
        fl = Math.sin(T * 9 + i * 1.3) * 4.5;
      g.beginPath();
      g.moveTo(x - 6.5, y - fl);
      g.quadraticCurveTo(x - 3, y - fl * 0.2 - 1.5, x, y);
      g.quadraticCurveTo(x + 3, y - fl * 0.2 - 1.5, x + 6.5, y - fl);
      g.stroke();
    }
  }
  function drawCarU(g, u, v0, col, sn) {
    var ua = u,
      ub = u + 34,
      v1 = v0 + 20;
    poly(
      g,
      [
        [ua - 2, v0 - 1],
        [ub + 3, v0 - 1],
        [ub + 3, v1 + 3],
        [ua - 2, v1 + 3],
      ],
      'rgba(0,0,0,0.2)',
    );
    poly(
      g,
      [
        [ua, v1, 2.5],
        [ub, v1, 2.5],
        [ub, v1, 11],
        [ua, v1, 11],
      ],
      shade(col, 0.86),
    );
    poly(
      g,
      [
        [ua, v0, 2.5],
        [ua, v1, 2.5],
        [ua, v1, 11],
        [ua, v0, 11],
      ],
      shade(col, 0.7),
    );
    poly(
      g,
      [
        [ua, v0 + 1.5, 7],
        [ua, v0 + 6, 7],
        [ua, v0 + 6, 9.6],
        [ua, v0 + 1.5, 9.6],
      ],
      '#fff3c4',
    );
    poly(
      g,
      [
        [ua, v1 - 6, 7],
        [ua, v1 - 1.5, 7],
        [ua, v1 - 1.5, 9.6],
        [ua, v1 - 6, 9.6],
      ],
      '#fff3c4',
    );
    poly(
      g,
      [
        [ua, v0 + 7.5, 4],
        [ua, v1 - 7.5, 4],
        [ua, v1 - 7.5, 6],
        [ua, v0 + 7.5, 6],
      ],
      'rgba(20,20,25,0.55)',
    );
    poly(
      g,
      [
        [ua, v0, 11],
        [ub, v0, 11],
        [ub, v1, 11],
        [ua, v1, 11],
      ],
      sn ? '#f1f5f9' : shade(col, 1.12),
    );
    var c0 = ua + 9,
      c1 = ub - 7,
      ca = v0 + 1.6,
      cb = v1 - 1.6;
    poly(
      g,
      [
        [c0, ca, 11],
        [c0, cb, 11],
        [c0 + 3, cb, 18.5],
        [c0 + 3, ca, 18.5],
      ],
      '#5f8299',
    );
    poly(
      g,
      [
        [c0, cb, 11],
        [c1, cb, 11],
        [c1 - 2.5, cb, 18.5],
        [c0 + 3, cb, 18.5],
      ],
      shade(col, 0.86),
    );
    poly(
      g,
      [
        [c0 + 1.6, cb, 12],
        [c1 - 1.6, cb, 12],
        [c1 - 3.4, cb, 17.3],
        [c0 + 3.6, cb, 17.3],
      ],
      '#a8c6d8',
    );
    poly(
      g,
      [
        [(c0 + c1) / 2 - 0.8, cb, 12],
        [(c0 + c1) / 2 + 0.8, cb, 12],
        [(c0 + c1) / 2 + 0.8, cb, 17.3],
        [(c0 + c1) / 2 - 0.8, cb, 17.3],
      ],
      shade(col, 0.86),
    );
    poly(
      g,
      [
        [c0 + 3, ca, 18.5],
        [c1 - 2.5, ca, 18.5],
        [c1 - 2.5, cb, 18.5],
        [c0 + 3, cb, 18.5],
      ],
      sn ? '#f6f9fc' : shade(col, 1.22),
    );
    var w1 = P(ua + 7, v1, 3.4),
      w2 = P(ub - 7, v1, 3.4);
    circ(g, w1[0], w1[1], 4, '#2a2b30');
    circ(g, w1[0], w1[1], 1.7, '#c6c6c6');
    circ(g, w2[0], w2[1], 4, '#2a2b30');
    circ(g, w2[0], w2[1], 1.7, '#c6c6c6');
  }
  function drawSUV(g, u, v0, col, sn) {
    var ua = u,
      ub = u + 38,
      v1 = v0 + 21,
      zb = 14,
      zt = 24.5;
    poly(
      g,
      [
        [ua - 2, v0 - 1],
        [ub + 3, v0 - 1],
        [ub + 3, v1 + 3],
        [ua - 2, v1 + 3],
      ],
      'rgba(0,0,0,0.22)',
    );
    poly(
      g,
      [
        [ua, v1, 3],
        [ub, v1, 3],
        [ub, v1, zb],
        [ua, v1, zb],
      ],
      shade(col, 0.88),
    );
    poly(
      g,
      [
        [ua, v1, 3],
        [ub, v1, 3],
        [ub, v1, 5.5],
        [ua, v1, 5.5],
      ],
      'rgba(30,32,36,0.55)',
    );
    poly(
      g,
      [
        [ua, v0, 3],
        [ua, v1, 3],
        [ua, v1, zb],
        [ua, v0, zb],
      ],
      shade(col, 0.72),
    );
    poly(
      g,
      [
        [ua, v0 + 6, 6.5],
        [ua, v1 - 6, 6.5],
        [ua, v1 - 7, 11.5],
        [ua, v0 + 7, 11.5],
      ],
      '#2c2f34',
    );
    poly(
      g,
      [
        [ua, v0 + 1.2, 10],
        [ua, v0 + 5.6, 10],
        [ua, v0 + 5.6, 12.6],
        [ua, v0 + 1.2, 12.6],
      ],
      '#fff3c4',
    );
    poly(
      g,
      [
        [ua, v1 - 5.6, 10],
        [ua, v1 - 1.2, 10],
        [ua, v1 - 1.2, 12.6],
        [ua, v1 - 5.6, 12.6],
      ],
      '#fff3c4',
    );
    poly(
      g,
      [
        [ua, v0, zb],
        [ub, v0, zb],
        [ub, v1, zb],
        [ua, v1, zb],
      ],
      sn ? '#f1f5f9' : shade(col, 1.12),
    );
    var c0 = ua + 9,
      c1 = ub - 1.5,
      ca = v0 + 1.5,
      cb = v1 - 1.5;
    poly(
      g,
      [
        [c0, ca, zb],
        [c0, cb, zb],
        [c0 + 4, cb, zt],
        [c0 + 4, ca, zt],
      ],
      '#56788f',
    );
    poly(
      g,
      [
        [c0, cb, zb],
        [c1, cb, zb],
        [c1 - 1, cb, zt],
        [c0 + 4, cb, zt],
      ],
      shade(col, 0.88),
    );
    poly(
      g,
      [
        [c0 + 2.2, cb, 15.2],
        [c1 - 2, cb, 15.2],
        [c1 - 2.8, cb, 22.8],
        [c0 + 5, cb, 22.8],
      ],
      '#9fbdd0',
    );
    [0.36, 0.68].forEach(function (f) {
      var pu = lerp(c0 + 3, c1 - 2, f);
      poly(
        g,
        [
          [pu - 0.8, cb, 15.2],
          [pu + 0.8, cb, 15.2],
          [pu + 0.8, cb, 22.8],
          [pu - 0.8, cb, 22.8],
        ],
        shade(col, 0.88),
      );
    });
    poly(
      g,
      [
        [c0 + 4, ca, zt],
        [c1 - 1, ca, zt],
        [c1 - 1, cb, zt],
        [c0 + 4, cb, zt],
      ],
      sn ? '#f6f9fc' : shade(col, 1.2),
    );
    if (!sn) {
      wline(g, [c0 + 7, ca + 2, zt + 1], [c1 - 3, ca + 2, zt + 1], '#3a3d42', 1.1);
      wline(g, [c0 + 7, cb - 2, zt + 1], [c1 - 3, cb - 2, zt + 1], '#3a3d42', 1.1);
    }
    wline(g, [ua + 19, v1, 6], [ua + 19, v1, zb], 'rgba(0,0,0,0.2)', 0.6);
    var w1 = P(ua + 8, v1, 4),
      w2 = P(ub - 8, v1, 4);
    circ(g, w1[0], w1[1], 4.8, '#222327');
    circ(g, w1[0], w1[1], 2.2, '#c9cbce');
    circ(g, w2[0], w2[1], 4.8, '#222327');
    circ(g, w2[0], w2[1], 2.2, '#c9cbce');
  }
  function drawStop(g, m) {
    var a = P(m.u, m.v, 0),
      x = a[0],
      y = a[1];
    ell(g, x + 3, y + 0.6, 6, 2, 'rgba(0,0,0,0.18)');
    seg(g, x, y, x, y - 27, '#8f959c', 1.8);
    g.beginPath();
    for (var i = 0; i < 8; i++) {
      var an = Math.PI / 8 + (i * Math.PI) / 4,
        px = x + Math.cos(an) * 8.6,
        py = y - 33 + Math.sin(an) * 8.6;
      if (i) g.lineTo(px, py);
      else g.moveTo(px, py);
    }
    g.closePath();
    g.fillStyle = '#ffffff';
    g.fill();
    g.beginPath();
    for (var j = 0; j < 8; j++) {
      var an2 = Math.PI / 8 + (j * Math.PI) / 4,
        qx = x + Math.cos(an2) * 7.4,
        qy = y - 33 + Math.sin(an2) * 7.4;
      if (j) g.lineTo(qx, qy);
      else g.moveTo(qx, qy);
    }
    g.closePath();
    g.fillStyle = '#cf3b30';
    g.fill();
    g.fillStyle = '#ffffff';
    g.font = '800 4.6px Arial, sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText('STOP', x, y - 32.8);
  }
  /* the red car arrives, parks in an empty bay, and later leaves by the stop sign */
  function redCarState(T) {
    var c = (T + 2) % 74,
      BU = 343,
      u,
      v = 214,
      lit = 1,
      f;
    if (c < 8) {
      f = c / 8;
      f = 1 - (1 - f) * (1 - f);
      u = lerp(UMAX + 50, BU + 26, f);
    } else if (c < 11) {
      f = (c - 8) / 3;
      f = f * f * (3 - 2 * f);
      u = lerp(BU + 26, BU, f);
      v = lerp(214, 190, f);
    } else if (c < 56) {
      u = BU;
      v = 190;
      lit = c < 12.5 ? 1 : 0;
    } else if (c < 59) {
      f = (c - 56) / 3;
      f = f * f * (3 - 2 * f);
      u = lerp(BU, BU - 26, f);
      v = lerp(190, 214, f);
    } else if (c < 63.5) {
      f = (c - 59) / 4.5;
      f = f * f * (3 - 2 * f);
      u = lerp(BU - 26, 30, f);
    } else if (c < 65) {
      u = 30;
    } else if (c < 68) {
      f = (c - 65) / 3;
      u = lerp(30, -70, f * f);
    } else return null;
    return { u: u, v: v, lit: lit, a: clamp(Math.min(u + 60, UMAX + 30 - u) / 36, 0, 1) };
  }
  var carGlow = null;

  /* ---------- state ---------- */
  var TIMES = ['Day', 'Dusk', 'Night', 'Dawn', 'Auto'],
    AUTO = ['Dawn', 'Day', 'Dusk', 'Night'],
    WINDS = ['Calm', 'Breeze', 'Gusty'],
    WEATHERS = ['Clear', 'Rain', 'Fog', 'Snow', 'Storm'];
  var TP = {
    Day: {
      tint: [255, 255, 255],
      lamp: 0,
      win: 0,
      star: 0,
      fly: 0,
      mist: 0,
      sx: 1.0,
      sy: 0.15,
      sa: 0.17,
      grad: 0,
    },
    Dusk: {
      tint: [250, 178, 140],
      lamp: 0.9,
      win: 0.62,
      star: 0.12,
      fly: 0.8,
      mist: 0,
      sx: 2.8,
      sy: 1.6,
      sa: 0.22,
      grad: 1,
    },
    Night: {
      tint: [72, 94, 160],
      lamp: 1,
      win: 0.86,
      star: 1,
      fly: 1,
      mist: 0,
      sx: 1.1,
      sy: 0.65,
      sa: 0.09,
      grad: 0.5,
    },
    Dawn: {
      tint: [246, 212, 214],
      lamp: 0.45,
      win: 0.24,
      star: 0.08,
      fly: 0,
      mist: 1,
      sx: -2.8,
      sy: -1.6,
      sa: 0.18,
      grad: 0.8,
    },
  };
  var WX = {
    Clear: { t: [1, 1, 1], rain: 0, fog: 0, snow: 0, storm: 0, over: 0 },
    Rain: { t: [0.82, 0.86, 0.93], rain: 1, fog: 0, snow: 0, storm: 0, over: 0.8 },
    Fog: { t: [0.93, 0.94, 0.96], rain: 0, fog: 1, snow: 0, storm: 0, over: 0.9 },
    Snow: { t: [0.92, 0.95, 1], rain: 0, fog: 0.15, snow: 1, storm: 0, over: 0.7 },
    Storm: { t: [0.6, 0.64, 0.74], rain: 1.7, fog: 0, snow: 0, storm: 1, over: 1 },
  };
  var WP = {
    Calm: { sway: 0.2, leaves: 4, drift: 4 },
    Breeze: { sway: 0.9, leaves: 14, drift: 15 },
    Gusty: { sway: 2.1, leaves: 45, drift: 40 },
  };
  var st = { season: 0, time: 0, wind: 1, weather: 0 };
  var cur = {
    wt: [1, 1, 1],
    leafN: 14,
    sfly: 1,
    tint: [255, 255, 255],
    lamp: 0,
    win: 0,
    star: 0,
    fly: 0,
    mist: 0,
    sx: 1,
    sy: 0.15,
    sa: 0.17,
    grad: 0,
    rain: 0,
    fog: 0,
    snow: 0,
    storm: 0,
    over: 0,
    sway: 0.9,
    drift: 15,
  };
  var BG = stageBg();

  var leaves = [],
    lr = mulberry(5150);
  function spawnLeaf(l, first) {
    var fc = SEASON.fall.cols;
    l.u = lr() * UMAX;
    l.v = 280 + lr() * 320;
    l.z = first ? lr() * 110 : 70 + lr() * 60;
    l.vz = 12 + lr() * 12;
    l.col = fc[(lr() * fc.length) | 0];
    l.rot = lr() * 6.28;
    l.vr = (lr() - 0.5) * 6;
    l.ph = lr() * 6.28;
    l.rest = 0;
    l.burst = false;
  }
  for (var li = 0; li < 150; li++) {
    var L0 = {};
    spawnLeaf(L0, true);
    leaves.push(L0);
  }
  var clouds = [
    { x: 210, y: 120, s: 1.05 },
    { x: 900, y: 150, s: 0.8 },
    { x: -240, y: 60, s: 0.9 },
  ];
  var gust = 0,
    gustT = 4,
    flash = 0,
    flashT = 3;

  /* ---------- canvas and view ---------- */
  var canvas = cv,
    ctx = canvas.getContext('2d'),
    staticLayer = null;
  var dpr = 1,
    cssW = 360,
    cssH = 640,
    ucy = 320,
    KS = 2;
  var view = { z: 0.5, cx: 565, cy: 405, zMin: 0.3, zMax: 2, touched: false };
  var seasonCache = {};
  function buildSeason(name) {
    if (seasonCache[name]) return seasonCache[name];
    var saved = SEASON;
    SEASON = SEASONS[name];
    var layer = document.createElement('canvas');
    layer.width = Math.round(W * KS);
    layer.height = Math.round(H * KS);
    var g = layer.getContext('2d');
    g.setTransform(KS, 0, 0, KS, 0, 0);
    drawGround(g);
    var c = { layer: layer, sprites: buildSprites(KS) };
    SEASON = saved;
    seasonCache[name] = c;
    return c;
  }
  function showSeason(idx, animate) {
    var oldS = SEASON,
      oldLayer = staticLayer,
      oldSprites = sprites,
      name = SEASON_ORDER[idx],
      c = buildSeason(name);
    st.season = idx;
    SEASON = SEASONS[name];
    staticLayer = c.layer;
    sprites = c.sprites;
    var v = $('val-season');
    if (v) v.textContent = name;
    if (animate && oldLayer && oldS !== SEASON) {
      prev = { layer: oldLayer, sprites: oldSprites, S: oldS };
      mix = 0;
      var fp = P(walkU - 12, 275, 0);
      sweep.x = fp[0];
      sweep.y = fp[1] - 10;
      var fc = SEASON.fall.cols,
        n = 0;
      for (var i = leaves.length - 1; i >= 0 && n < 36; i--) {
        var l = leaves[i];
        if (l.burst) continue;
        l.burst = true;
        l.u = walkU - 12 + (lr() - 0.5) * 300;
        l.v = 275 + (lr() - 0.5) * 220;
        l.z = 12 + lr() * 80;
        l.vz = 9 + lr() * 12;
        l.col = fc[(lr() * fc.length) | 0];
        l.rest = 0;
        n++;
      }
    }
  }
  /* ---------- timeline: January 2025 to December 2026 ---------- */
  var MONTHS = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ];
  var TL = {
    m: 0,
    END: 24,
    rate: 1 / 1.9,
    play: true,
    manual: false,
    hold: 0,
    EXPECT: 9,
    BORN: 17.97,
    STROLLER: 20,
  };
  var bellyK = 1;
  function tlSeasonIdx(m) {
    var mo = Math.floor(Math.min(m, TL.END - 0.01)) % 12;
    return mo === 11 || mo < 2 ? 1 : mo < 5 ? 2 : mo < 8 ? 3 : 0;
  }
  function tlStage(m) {
    return m < TL.EXPECT ? 3 : m < TL.BORN ? 0 : m < TL.STROLLER ? 1 : 2;
  }
  function tlLabel(m) {
    var k = Math.floor(Math.min(m, TL.END - 0.01));
    return MONTHS[k % 12] + ' ' + (2025 + Math.floor(k / 12));
  }
  function tlNote(m) {
    return m < TL.EXPECT ? 'Just the two of us' : m < TL.BORN ? 'Expecting' : 'The three of us';
  }
  var tlDateEl = null,
    tlNoteEl = null,
    tlRangeEl = null,
    tlShown = '';
  function tlRender() {
    if (!tlDateEl) {
      tlDateEl = $('tl-date');
      tlNoteEl = $('tl-note');
      tlRangeEl = $('tl-range');
    }
    var mm = Math.min(TL.m, TL.END),
      lab = tlLabel(mm);
    if (lab !== tlShown) {
      tlShown = lab;
      tlDateEl.textContent = lab;
      tlNoteEl.textContent = tlNote(mm);
      tlRangeEl.setAttribute('aria-valuetext', lab);
    }
    if (document.activeElement !== tlRangeEl || TL.play) tlRangeEl.value = mm;
  }
  function tlSetPlay(on) {
    TL.play = on;
  }
  function drawProp(g, p) {
    if (p.car) drawCar(g, p.car);
    else if (p.carU) {
      if (p.carU.suv) drawSUV(g, p.carU.u, p.carU.v0, p.carU.col, DS.snow);
      else drawCarU(g, p.carU.u, p.carU.v0, p.carU.col, DS.snow);
    } else if (p.stop) drawStop(g, p.stop);
    else if (p.lamp) drawLamp(g, p.lamp);
    else if (p.bush) drawBush(g, p.bush);
    else if (p.dumpster) drawDumpster(g);
    else if (p.mailbox) drawMailbox(g, p.mailbox);
    else if (p.bench) drawBench(g, p.bench);
    else if (p.hydrant) drawHydrant(g, p.hydrant);
    else if (p.snowman) {
      if (DS.snow) drawSnowman(g, p.snowman);
    }
  }
  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    cssW = viewEl.clientWidth || 360;
    cssH = viewEl.clientHeight || 240;
    canvas.width = Math.round(cssW * dpr);
    canvas.height = Math.round(cssH * dpr);
    var top = 4,
      bot = cssH - 4;
    if (!(bot > top + 80)) {
      top = 0;
      bot = cssH;
    }
    ucy = (top + bot) / 2;
    var fitW = cssW / W,
      fitH = (bot - top) / H,
      lo = Math.min(fitW, fitH);
    var zDef = lo;
    view.zMin = lo * 0.85;
    view.zMax = Math.max(zDef * 4, 1.5);
    if (!view.touched) {
      view.z = zDef;
      view.cx = 565;
      view.cy = 405;
    }
    view.z = clamp(view.z, view.zMin, view.zMax);
  }
  var ro = new ResizeObserver(function () {
    resize();
    if (!running) drawOnce();
  });
  ro.observe(viewEl);
  function toLogical(px, py) {
    return [view.cx + (px - cssW / 2) / view.z, view.cy + (py - ucy) / view.z];
  }

  function drawCloud(g, c, over) {
    var s = c.s,
      o = over || 0,
      w =
        'rgb(' +
        Math.round(255 - 66 * o) +
        ',' +
        Math.round(255 - 62 * o) +
        ',' +
        Math.round(255 - 50 * o) +
        ')',
      sh =
        'rgba(' +
        Math.round(196 - 66 * o) +
        ',' +
        Math.round(190 - 58 * o) +
        ',' +
        Math.round(228 - 82 * o) +
        ',0.42)';
    circ(g, c.x, c.y, 24 * s, w);
    circ(g, c.x - 26 * s, c.y + 8 * s, 17 * s, w);
    circ(g, c.x + 28 * s, c.y + 6 * s, 19 * s, w);
    circ(g, c.x + 14 * s, c.y - 14 * s, 17 * s, w);
    circ(g, c.x - 12 * s, c.y - 12 * s, 15 * s, w);
    circ(g, c.x + 6 * s, c.y + 13 * s, 15 * s, sh);
    circ(g, c.x + 30 * s, c.y + 13 * s, 12 * s, sh);
    circ(g, c.x - 22 * s, c.y + 15 * s, 10 * s, sh);
  }
  var STORMCLOUDS = [
    { x: 300, y: 40, s: 1.5, p: 0 },
    { x: 470, y: -20, s: 1.8, p: 1.3 },
    { x: 650, y: 10, s: 1.7, p: 2.1 },
    { x: 820, y: 60, s: 1.4, p: 3.4 },
    { x: 560, y: 70, s: 1.3, p: 4.2 },
    { x: 390, y: -40, s: 1.2, p: 5 },
  ];
  /* rain and snow fall in the scene itself, land on the ground, and splash or settle */
  var pr = mulberry(9091),
    rainP = [],
    snowP = [];
  function newDrop(d, first) {
    d.u = -30 + pr() * (UMAX + 60);
    d.v = -30 + pr() * (VMAX + 60);
    d.z = first ? pr() * 300 : 250 + pr() * 70;
    d.vz = 540 + pr() * 200;
    d.len = 11 + pr() * 13;
    d.sp = 0;
    d.a = pr();
  }
  function newFlake(f, first) {
    f.u = -30 + pr() * (UMAX + 60);
    f.v = -30 + pr() * (VMAX + 60);
    f.z = first ? pr() * 290 : 250 + pr() * 60;
    f.vz = 24 + pr() * 30;
    f.r = 1.25 + pr() * pr() * 2.6;
    f.ph = pr() * 6.28;
    f.w = 0.6 + pr() * 1.4;
    f.rest = 0;
  }
  (function () {
    for (var i = 0; i < 270; i++) {
      var d = {};
      newDrop(d, true);
      rainP.push(d);
    }
    for (var j = 0; j < 300; j++) {
      var f = {};
      newFlake(f, true);
      snowP.push(f);
    }
  })();
  function drawRain(g, dt, amt, drift, storm) {
    var n = Math.min(rainP.length, Math.round(185 * amt)),
      i,
      d,
      a = Math.min(1, amt),
      sl = drift * 2.4 + storm * 60;
    flat(g, 0, UMAX, 187, 340, 'rgba(190,208,232,' + (0.07 * a).toFixed(3) + ')');
    for (var pass = 0; pass < 2; pass++) {
      g.beginPath();
      for (i = pass; i < n; i += 2) {
        d = rainP[i];
        if (d.sp > 0) continue;
        var k = d.len / d.vz,
          p1 = P(d.u, d.v, d.z),
          p2 = P(d.u + sl * 0.3 * k, d.v + sl * k, d.z + d.len);
        g.moveTo(p1[0], p1[1]);
        g.lineTo(p2[0], p2[1]);
      }
      g.strokeStyle = 'rgba(200,216,238,' + ((pass ? 0.46 : 0.72) * a).toFixed(3) + ')';
      g.lineWidth = pass ? 0.8 : 1.2;
      g.lineCap = 'round';
      g.stroke();
    }
    for (i = 0; i < n; i++) {
      d = rainP[i];
      if (d.sp > 0) {
        var t = 1 - d.sp / 0.3,
          pp = P(d.u, d.v, 0);
        g.beginPath();
        g.ellipse(pp[0], pp[1], 1.5 + t * 5.5, (1.5 + t * 5.5) * 0.5, 0, 0, 6.2832);
        g.strokeStyle = 'rgba(225,235,250,' + (0.55 * (1 - t) * a).toFixed(3) + ')';
        g.lineWidth = 0.8;
        g.stroke();
        if (t < 0.5) {
          circ(
            g,
            pp[0] - 2.2,
            pp[1] - 3.5 * Math.sin(t * 6.28),
            0.7,
            'rgba(225,235,250,' + (0.6 * a).toFixed(3) + ')',
          );
          circ(
            g,
            pp[0] + 2.4,
            pp[1] - 2.8 * Math.sin(t * 6.28),
            0.6,
            'rgba(225,235,250,' + (0.6 * a).toFixed(3) + ')',
          );
        }
        d.sp -= dt;
        if (d.sp <= 0) newDrop(d, false);
        continue;
      }
      d.z -= d.vz * (1 + storm * 0.25) * dt;
      d.v -= sl * dt;
      d.u -= sl * 0.3 * dt;
      if (d.z <= 0) {
        d.z = 0;
        if (d.u > 0 && d.u < UMAX && d.v > 0 && d.v < VMAX) d.sp = 0.3;
        else newDrop(d, false);
      }
    }
  }
  function drawSnow(g, dt, amt, drift, T) {
    var n = Math.min(snowP.length, Math.round(300 * amt)),
      i,
      f,
      a = Math.min(1, amt);
    for (i = 0; i < n; i++) {
      f = snowP[i];
      if (f.z > 0) {
        f.z -= f.vz * dt;
        var wob = Math.sin(T * f.w + f.ph);
        f.v -= (drift * 0.9 + wob * 7) * dt;
        f.u -= (drift * 0.3 + Math.cos(T * f.w * 0.8 + f.ph) * 5) * dt;
        if (f.z <= 0) {
          f.z = 0;
          if (!(f.u > 0 && f.u < UMAX && f.v > 0 && f.v < VMAX)) {
            newFlake(f, false);
            continue;
          }
        }
      } else {
        f.rest += dt;
        if (f.rest > 1.6) {
          newFlake(f, false);
          continue;
        }
      }
      var p = P(f.u, f.v, f.z),
        al = (f.z > 0 ? clamp((300 - f.z) / 50, 0, 1) : 1 - f.rest / 1.6) * a;
      if (f.r > 2.7) circ(g, p[0], p[1], f.r * 1.5, 'rgba(255,255,255,' + (0.28 * al).toFixed(3) + ')');
      circ(g, p[0], p[1], f.r, 'rgba(255,255,255,' + (0.92 * al).toFixed(3) + ')');
    }
  }
  function rgb(c) {
    return 'rgb(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ')';
  }

  var last = 0,
    T = 0,
    walkU = UMAX - 30,
    walkPh = 0;
  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(now) {
    var dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    T += dt;
    var S = SEASON,
      tname = TIMES[st.time];
    if (tname === 'Auto') tname = AUTO[Math.floor(T / 9) % 4];
    var tp = TP[tname],
      wp = WP[WINDS[st.wind]],
      wx = WX[WEATHERS[st.weather]],
      e = 1 - Math.exp(-dt * 1.7),
      eW = 1 - Math.exp(-dt * 0.85),
      i;
    for (i = 0; i < 3; i++) {
      cur.tint[i] = lerp(cur.tint[i], tp.tint[i], e);
      cur.wt[i] = lerp(cur.wt[i], wx.t[i], eW);
    }
    cur.leafN = lerp(cur.leafN, (reduce ? Math.min(8, wp.leaves) : wp.leaves) * S.fall.mult, eW);
    cur.sfly = lerp(cur.sfly, S.fly, eW);
    ['lamp', 'win', 'star', 'fly', 'mist', 'sx', 'sy', 'sa', 'grad'].forEach(function (k) {
      cur[k] = lerp(cur[k], tp[k], e);
    });
    ['rain', 'fog', 'snow', 'storm', 'over'].forEach(function (k) {
      cur[k] = lerp(cur[k], wx[k], eW);
    });
    cur.sway = lerp(cur.sway, wp.sway + wx.storm * 0.9, eW);
    cur.drift = lerp(cur.drift, wp.drift + wx.storm * 18, eW);
    var wname = WEATHERS[st.weather],
      okey =
        wname === 'Rain' || wname === 'Storm'
          ? 'rain'
          : wname === 'Snow'
            ? 'winter'
            : SEASON_ORDER[st.season].toLowerCase();
    if (okey !== ofCur) {
      ofPrev = ofCur;
      ofCur = okey;
      ofMix = 0;
    }
    if (ofMix < 1) {
      ofMix = Math.min(1, ofMix + dt / 1.3);
      if (ofMix >= 1) ofPrev = null;
    }
    if (TL.play) {
      if (TL.m < TL.END) TL.m = Math.min(TL.END, TL.m + dt * TL.rate);
      else {
        TL.hold += dt;
        if (TL.hold > 3) {
          TL.hold = 0;
          TL.m = 0;
        }
      }
    }
    var tm = Math.min(TL.m, TL.END),
      sidx = tlStage(tm);
    bellyK = 0.8 + 0.2 * clamp((tm - TL.EXPECT) / 7, 0, 1);
    if (!TL.manual) {
      var wantS = tlSeasonIdx(tm);
      if (wantS !== st.season) {
        showSeason(wantS, true);
        S = SEASON;
      }
    }
    tlRender();
    if (sidx !== stCur) {
      if (sidx === 1 && stCur === 0) spawnHearts(9, walkU);
      stPrev = stCur;
      stCur = sidx;
      stMix = 0;
    }
    if (stMix < 1) stMix = Math.min(1, stMix + dt / 1.1);
    /* gusts send a wave across the road */
    if (st.wind === 2 && !reduce) {
      gustT -= dt;
      if (gustT < 0) {
        gustT = 6 + lr() * 4;
        gust = 1;
        var fc = S.fall.cols,
          gn = 0;
        for (i = leaves.length - 1; i >= 0 && gn < 26; i--) {
          var gl = leaves[i];
          if (gl.burst) continue;
          gl.burst = true;
          gl.u = lr() * UMAX;
          gl.v = 345 + lr() * 40;
          gl.z = 3 + lr() * 24;
          gl.vz = 3 + lr() * 5;
          gl.col = fc[(lr() * fc.length) | 0];
          gl.rest = 0;
          gn++;
        }
      }
    }
    gust = Math.max(0, gust - dt * 0.45);
    var g = ctx,
      cw = canvas.width,
      ch = canvas.height,
      sc = view.z * dpr,
      tx = cw / 2 - view.cx * sc,
      ty = ucy * dpr - view.cy * sc;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    g.fillStyle = rgb(BG);
    g.fillRect(0, 0, cw, ch);
    g.setTransform(sc, 0, 0, sc, tx, ty);
    if (prev) {
      mix = Math.min(1, mix + dt / SW_DUR);
      g.drawImage(prev.layer, 0, 0, W, H);
      var front = mix * SW_R;
      if (front > 1) {
        if (!tmpC) tmpC = document.createElement('canvas');
        if (tmpC.width !== cw || tmpC.height !== ch) {
          tmpC.width = cw;
          tmpC.height = ch;
        }
        var tg = tmpC.getContext('2d');
        tg.setTransform(1, 0, 0, 1, 0, 0);
        tg.globalCompositeOperation = 'source-over';
        tg.clearRect(0, 0, cw, ch);
        tg.setTransform(sc, 0, 0, sc, tx, ty);
        tg.drawImage(staticLayer, 0, 0, W, H);
        tg.globalCompositeOperation = 'destination-in';
        tg.translate(sweep.x, sweep.y);
        tg.scale(1, 0.6);
        var mg0 = tg.createRadialGradient(0, 0, Math.max(0, front - SW_SOFT), 0, 0, front);
        mg0.addColorStop(0, 'rgba(0,0,0,1)');
        mg0.addColorStop(1, 'rgba(0,0,0,0)');
        tg.fillStyle = mg0;
        tg.fillRect(-6000, -6000, 12000, 12000);
        g.setTransform(1, 0, 0, 1, 0, 0);
        g.drawImage(tmpC, 0, 0);
        g.setTransform(sc, 0, 0, sc, tx, ty);
      }
    } else {
      g.drawImage(staticLayer, 0, 0, W, H);
    }
    clouds.forEach(function (c) {
      c.x += (5 + cur.drift * 0.7) * dt;
      if (c.x > W + 500) c.x = -500;
    });
    /* cast shadows that swing and stretch with the sun */
    var sl = Math.hypot(cur.sx, cur.sy) || 1,
      sdx = cur.sx / sl,
      sdy = cur.sy / sl,
      sang = Math.atan2(cur.sy, cur.sx),
      salpha = cur.sa * (1 - 0.75 * cur.over);
    if (salpha > 0.01) {
      g.save();
      g.globalAlpha = salpha;
      g.fillStyle = S.snow ? '#5a6f96' : '#28301a';
      var hf = clamp(cur.sx * 0.866 + cur.sy * 0.5 - 1.1, 0, 3);
      if (hf > 0.02) {
        BLOCKS.forEach(function (b) {
          var Lv = HH * hf * 0.82;
          g.beginPath();
          [
            [b.u0, V1],
            [b.u1, V1],
            [b.u1 + Lv * 0.12, V1 + Lv],
            [b.u0 + Lv * 0.12 + 20, V1 + Lv * 1.3],
            [b.u0 + Lv * 0.12, V1 + Lv],
          ].forEach(function (q, k) {
            var s2 = P(q[0], q[1], 0);
            if (k) g.lineTo(s2[0], s2[1]);
            else g.moveTo(s2[0], s2[1]);
          });
          g.closePath();
          g.fill();
        });
      }
      for (i = 0; i < trees.length; i++) {
        var t = trees[i],
          h = t.s * 1.6,
          Ls = sl * 30 * h;
        if (t.lawn && cur.sx < 0) Ls = Math.min(Ls, 24 * h);
        g.beginPath();
        g.ellipse(
          t.x + sdx * Ls * 0.5,
          t.y + sdy * Ls * 0.5 + 1,
          Ls * 0.5 + 9 * h,
          (S.snow && !t.pine ? 4.5 : 9) * h,
          sang,
          0,
          6.2832,
        );
        g.fill();
      }
      for (i = 0; i < lights.length; i++) {
        var lt0 = lights[i];
        g.beginPath();
        g.ellipse(lt0.gx + sdx * sl * 11, lt0.gy + sdy * sl * 11, sl * 11 + 3, 1.6, sang, 0, 6.2832);
        g.fill();
      }
      var fp0 = P(walkU - 8, 275, 0),
        fl0 = sl * 14;
      g.globalAlpha = salpha * fadeU(walkU);
      g.beginPath();
      g.ellipse(fp0[0] + sdx * fl0, fp0[1] + sdy * fl0, fl0 + 18, 9, sang, 0, 6.2832);
      g.fill();
      g.restore();
    }
    /* everyone and everything, sorted back to front */
    if (!reduce) {
      walkU -= 21 * dt;
      walkPh += dt * 6.2;
    }
    if (walkU < -10) walkU = UMAX + 10;
    var fam = fadeU(walkU),
      TA = reduce ? 0 : T,
      dyn = [],
      dj = 0,
      swayNow = cur.sway + gust * 1.2;
    dyn.push({
      k: walkU - 26 - 275,
      d: function () {
        drawFamily(g, walkU, walkPh, fam);
      },
    });
    var nbU = UMAX + 20 - ((TA * 15 + 260) % (UMAX + 70));
    dyn.push({
      k: nbU - 24 - 172,
      d: function () {
        drawNeighbor(g, nbU, TA * 5.4, fadeU(nbU));
      },
    });
    [
      squirrelState(TA, [112, 140], [205, 138], 0),
      squirrelState(TA, [380, 364], [470, 372], 4.3),
      squirrelState(TA, [560, 150], [520, 142], 7.1),
    ].forEach(function (q) {
      dyn.push({
        k: q.u - q.v,
        d: function () {
          drawSquirrel(g, q, TA);
        },
      });
    });
    LAWNBIRDS.forEach(function (b) {
      dyn.push({
        k: b[0] - b[1],
        d: function () {
          drawLawnBird(g, b, TA);
        },
      });
    });
    carGlow = null;
    var rc = reduce ? { u: 343, v: 190, lit: 0, a: 1 } : redCarState(T);
    if (rc) {
      if (rc.lit) carGlow = [rc.u, rc.a, rc.v];
      dyn.push({
        k: rc.u - (rc.v + 10),
        d: function () {
          g.save();
          g.globalAlpha = rc.a;
          drawCarU(g, rc.u, rc.v, '#c7523f', false);
          g.restore();
        },
      });
    }
    dyn.sort(function (a, b) {
      return b.k - a.k;
    });
    for (i = 0; i < props.length; i++) {
      var p = props[i];
      while (dj < dyn.length && dyn[dj].k > p.k) {
        dyn[dj++].d();
      }
      if (p.tree) {
        if (p.tree.shake > 0) p.tree.shake = Math.max(0, p.tree.shake - dt * 1.6);
        drawTree(g, p.tree, T, swayNow);
      } else if (prev) {
        var pm2 = mmAt(p.x, p.y);
        DS = prev.S;
        g.globalAlpha = p.snowman ? 1 - pm2 : 1;
        drawProp(g, p);
        DS = SEASON;
        g.globalAlpha = pm2;
        drawProp(g, p);
        g.globalAlpha = 1;
      } else {
        DS = SEASON;
        drawProp(g, p);
      }
    }
    while (dj < dyn.length) {
      dyn[dj++].d();
    }
    if (!reduce && cur.star < 0.9 && cur.over < 0.6) {
      g.save();
      g.globalAlpha = (1 - cur.star) * (1 - cur.over);
      drawFlock(g, T);
      g.restore();
    }
    for (var si = 0; si < smokeSrc.length; si++) {
      if (si === 1 && !S.snow) continue;
      var sp = smokeSrc[si];
      for (i = 0; i < 7; i++) {
        var age = (T * 0.22 + i / 7 + si * 0.13) % 1;
        circ(
          g,
          sp[0] - age * cur.drift * 1.6 - Math.sin(age * 5 + i) * 3,
          sp[1] - age * 46,
          3 + age * 9,
          'rgba(245,243,238,' + (0.42 * (1 - age)).toFixed(3) + ')',
        );
      }
    }
    /* drifting leaves, petals or blown snow */
    var nLeaves = Math.round(cur.leafN),
      dr = cur.drift * (1 + gust * 2.6);
    for (i = 0; i < leaves.length; i++) {
      var l = leaves[i];
      if (i >= nLeaves && !l.burst) continue;
      if (l.z > 0) {
        l.z -= l.vz * dt;
        l.v -= (dr * 1.4 + Math.sin(T * 2 + l.ph) * 8) * dt;
        l.u -= (dr * 0.5 + Math.cos(T * 1.7 + l.ph) * 5) * dt;
        l.rot += l.vr * dt;
      } else {
        l.z = 0;
        l.rest += dt;
        if (l.rest > 2.5) {
          spawnLeaf(l, false);
        }
      }
      if (l.u < -10 || l.v < -10 || l.u > UMAX + 10) {
        spawnLeaf(l, false);
        continue;
      }
      var lp = P(l.u, l.v, l.z);
      ell(g, lp[0], lp[1], 3.4, 1.9, l.col, l.rot);
    }
    if (cur.rain > 0.02) drawRain(g, dt, cur.rain, cur.drift, cur.storm);
    if (cur.snow > 0.02) drawSnow(g, dt, cur.snow, cur.drift, T);
    for (i = hearts.length - 1; i >= 0; i--) {
      var hh = hearts[i];
      hh.age += dt;
      if (hh.age < 0) continue;
      if (hh.age > 2.6) {
        hearts.splice(i, 1);
        continue;
      }
      var ha = hh.age < 0.25 ? hh.age / 0.25 : 1 - Math.max(0, hh.age - 1.5) / 1.1;
      heart(
        g,
        hh.x + Math.sin(hh.age * 3 + hh.ph) * 5,
        hh.y - hh.age * 26,
        hh.s * (0.7 + 0.3 * Math.min(1, hh.age * 3)),
        'rgba(232,96,122,' + (0.92 * ha).toFixed(3) + ')',
      );
    }
    clouds.forEach(function (c) {
      drawCloud(g, c, cur.over * 0.8);
    });
    if (cur.over > 0.03) {
      g.save();
      g.globalAlpha = clamp(cur.over * 1.15, 0, 1);
      STORMCLOUDS.forEach(function (c) {
        drawCloud(
          g,
          { x: c.x + Math.sin(T * 0.12 + c.p) * 18, y: c.y + Math.cos(T * 0.1 + c.p) * 5, s: c.s },
          cur.over,
        );
      });
      g.restore();
    }
    if (cur.mist > 0.02) {
      for (i = 0; i < 7; i++) {
        var mp = P(40 + i * 85 + Math.sin(T * 0.2 + i) * 30, 400 + ((i * 67) % 170), 18);
        var gr = g.createRadialGradient(mp[0], mp[1], 4, mp[0], mp[1], 120);
        gr.addColorStop(0, 'rgba(255,255,255,' + (0.34 * cur.mist).toFixed(3) + ')');
        gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.save();
        g.translate(mp[0], mp[1]);
        g.scale(1.5, 0.42);
        g.translate(-mp[0], -mp[1]);
        g.fillStyle = gr;
        g.fillRect(mp[0] - 130, mp[1] - 130, 260, 260);
        g.restore();
      }
    }
    /* time-of-day wash: cooler in the upper left, warmer in the lower right */
    var tc = [cur.tint[0] * cur.wt[0], cur.tint[1] * cur.wt[1], cur.tint[2] * cur.wt[2]],
      a = cur.grad,
      c1 = [
        lerp(tc[0], tc[0] * 0.8, a),
        lerp(tc[1], tc[1] * 0.84, a),
        lerp(tc[2], Math.min(255, tc[2] * 1.14), a),
      ],
      c2 = [lerp(tc[0], Math.min(255, tc[0] * 1.1), a), tc[1], lerp(tc[2], tc[2] * 0.84, a)];
    g.setTransform(1, 0, 0, 1, 0, 0);
    var wash = g.createLinearGradient(0, 0, cw, ch);
    wash.addColorStop(0, rgb(c1));
    wash.addColorStop(1, rgb(c2));
    g.globalCompositeOperation = 'multiply';
    g.fillStyle = wash;
    g.fillRect(0, 0, cw, ch);
    g.globalCompositeOperation = 'source-over';
    var bgc = [(BG[0] * tc[0]) / 255, (BG[1] * tc[1]) / 255, (BG[2] * tc[2]) / 255];
    /* fog veil */
    if (cur.fog > 0.02) {
      var fv = [lerp(bgc[0], 235, 0.5), lerp(bgc[1], 236, 0.5), lerp(bgc[2], 240, 0.5)];
      g.fillStyle =
        'rgba(' +
        Math.round(fv[0]) +
        ',' +
        Math.round(fv[1]) +
        ',' +
        Math.round(fv[2]) +
        ',' +
        (0.24 * cur.fog).toFixed(3) +
        ')';
      g.fillRect(0, 0, cw, ch);
      for (i = 0; i < 7; i++) {
        var fxp = (((i * 0.171 + T * 0.012 * (1 + (i % 3))) % 1.3) - 0.15) * cw,
          fyp = (0.18 + ((i * 0.37) % 0.7)) * ch,
          fr = (0.32 + ((i * 0.13) % 0.2)) * Math.max(cw, ch);
        var fg = g.createRadialGradient(fxp, fyp, fr * 0.05, fxp, fyp, fr);
        fg.addColorStop(
          0,
          'rgba(' +
            Math.round(fv[0]) +
            ',' +
            Math.round(fv[1]) +
            ',' +
            Math.round(fv[2]) +
            ',' +
            (0.22 * cur.fog).toFixed(3) +
            ')',
        );
        fg.addColorStop(
          1,
          'rgba(' + Math.round(fv[0]) + ',' + Math.round(fv[1]) + ',' + Math.round(fv[2]) + ',0)',
        );
        g.save();
        g.translate(fxp, fyp);
        g.scale(1.6, 0.5);
        g.translate(-fxp, -fyp);
        g.fillStyle = fg;
        g.fillRect(fxp - fr, fyp - fr, fr * 2, fr * 2);
        g.restore();
      }
    }
    g.setTransform(sc, 0, 0, sc, tx, ty);
    /* lit windows and the light they spill on the lawn */
    if (cur.win > 0.01) {
      for (i = 0; i < windows.length; i++) {
        var wn = windows[i],
          wa = clamp((cur.win - wn.r) * 4, 0, 1);
        if (wa <= 0) continue;
        poly(g, wn.q, 'rgba(255,208,120,' + (0.92 * wa).toFixed(3) + ')');
      }
      g.globalCompositeOperation = 'lighter';
      for (i = 0; i < windows.length; i++) {
        var ws = windows[i];
        if (!ws.spill) continue;
        var wb = clamp((cur.win - ws.r) * 4, 0, 1) * cur.lamp;
        if (wb <= 0.02) continue;
        var spp = P(ws.spill[0], ws.spill[1], 0);
        g.save();
        g.translate(spp[0], spp[1]);
        g.transform(1, 0.35, 0, 0.55, 0, 0);
        var sg = g.createRadialGradient(0, 0, 1, 0, 0, 34);
        sg.addColorStop(0, 'rgba(255,200,110,' + (0.3 * wb).toFixed(3) + ')');
        sg.addColorStop(1, 'rgba(255,200,110,0)');
        g.fillStyle = sg;
        g.fillRect(-34, -34, 68, 68);
        g.restore();
      }
      g.globalCompositeOperation = 'source-over';
    }
    if (cur.lamp > 0.01) {
      g.globalCompositeOperation = 'lighter';
      var halo = 1 + cur.fog * 0.8;
      for (i = 0; i < lights.length; i++) {
        var lt = lights[i];
        var g1 = g.createRadialGradient(lt.x, lt.y, 1, lt.x, lt.y, 34 * halo);
        g1.addColorStop(0, 'rgba(255,214,140,' + (0.6 * cur.lamp).toFixed(3) + ')');
        g1.addColorStop(1, 'rgba(255,214,140,0)');
        g.fillStyle = g1;
        g.fillRect(lt.x - 34 * halo, lt.y - 34 * halo, 68 * halo, 68 * halo);
        g.save();
        g.translate(lt.gx, lt.gy);
        g.scale(1, 0.5);
        var g2 = g.createRadialGradient(0, 0, 2, 0, 0, 62);
        g2.addColorStop(0, 'rgba(255,206,130,' + (0.34 * cur.lamp).toFixed(3) + ')');
        g2.addColorStop(1, 'rgba(255,206,130,0)');
        g.fillStyle = g2;
        g.fillRect(-62, -62, 124, 124);
        g.restore();
      }
      for (i = 0; i < porch.length; i++) {
        var pp = P(porch[i][0], porch[i][1], porch[i][2]);
        var g3 = g.createRadialGradient(pp[0], pp[1], 0.5, pp[0], pp[1], 11);
        g3.addColorStop(0, 'rgba(255,220,150,' + (0.7 * cur.lamp).toFixed(3) + ')');
        g3.addColorStop(1, 'rgba(255,220,150,0)');
        g.fillStyle = g3;
        g.fillRect(pp[0] - 11, pp[1] - 11, 22, 22);
      }
      if (carGlow) {
        [carGlow[2] + 3, carGlow[2] + 17].forEach(function (hv) {
          var hp = P(carGlow[0], hv, 8),
            hg = g.createRadialGradient(hp[0], hp[1], 0.5, hp[0], hp[1], 16);
          hg.addColorStop(0, 'rgba(255,240,190,' + (0.85 * cur.lamp * carGlow[1]).toFixed(3) + ')');
          hg.addColorStop(1, 'rgba(255,240,190,0)');
          g.fillStyle = hg;
          g.fillRect(hp[0] - 16, hp[1] - 16, 32, 32);
        });
        var bp = P(carGlow[0] - 26, carGlow[2] + 10, 0);
        g.save();
        g.translate(bp[0], bp[1]);
        g.scale(1, 0.5);
        var bg2 = g.createRadialGradient(0, 0, 2, 0, 0, 40);
        bg2.addColorStop(0, 'rgba(255,236,180,' + (0.3 * cur.lamp * carGlow[1]).toFixed(3) + ')');
        bg2.addColorStop(1, 'rgba(255,236,180,0)');
        g.fillStyle = bg2;
        g.fillRect(-40, -40, 80, 80);
        g.restore();
      }
      g.globalCompositeOperation = 'source-over';
      for (i = 0; i < lights.length; i++) {
        circ(g, lights[i].x, lights[i].y, 3, 'rgba(255,244,205,' + cur.lamp.toFixed(3) + ')');
      }
    }
    var flyA = cur.fly * cur.sfly * (1 - cur.over);
    if (flyA > 0.02) {
      g.globalCompositeOperation = 'lighter';
      for (i = 0; i < flies.length; i++) {
        var f = flies[i],
          bl = Math.max(0, Math.sin(T * f[4] + f[3]));
        var fp = P(
          f[0] + Math.sin(T * 0.5 + f[3]) * 10,
          f[1] + Math.cos(T * 0.4 + f[3]) * 8,
          f[2] + Math.sin(T * 0.9 + f[3]) * 4,
        );
        circ(g, fp[0], fp[1], 4.5, 'rgba(220,255,120,' + (0.16 * bl * flyA).toFixed(3) + ')');
        circ(g, fp[0], fp[1], 1.4, 'rgba(240,255,170,' + (0.9 * bl * flyA).toFixed(3) + ')');
      }
      g.globalCompositeOperation = 'source-over';
    }
    var starA = cur.star * (1 - cur.over);
    if (starA > 0.02) {
      for (i = 0; i < stars.length; i++) {
        var s = stars[i];
        circ(
          g,
          s[0],
          s[1],
          s[2],
          'rgba(255,250,225,' + (starA * (0.55 + 0.45 * Math.sin(T * 1.3 + s[3]))).toFixed(3) + ')',
        );
      }
      g.globalCompositeOperation = 'lighter';
      var mg = g.createRadialGradient(150, 95, 10, 150, 95, 70);
      mg.addColorStop(0, 'rgba(255,246,214,' + (0.3 * starA).toFixed(3) + ')');
      mg.addColorStop(1, 'rgba(255,246,214,0)');
      g.fillStyle = mg;
      g.fillRect(80, 25, 140, 140);
      g.globalCompositeOperation = 'source-over';
      g.globalAlpha = clamp(starA, 0, 1);
      circ(g, 150, 95, 22, '#f8f2dc');
      circ(g, 143, 89, 4.5, 'rgba(214,206,180,0.6)');
      circ(g, 157, 101, 6, 'rgba(214,206,180,0.5)');
      circ(g, 152, 84, 2.6, 'rgba(214,206,180,0.5)');
      g.globalAlpha = 1;
    }
    /* falling rain, snow and lightning, in screen space */
    g.setTransform(1, 0, 0, 1, 0, 0);
    if (cur.storm > 0.3 && !reduce) {
      flashT -= dt;
      if (flashT < 0) {
        flashT = 5 + lr() * 7;
        flash = 1;
      }
    }
    if (flash > 0.02) {
      g.globalCompositeOperation = 'lighter';
      g.fillStyle = 'rgba(225,232,255,' + (0.2 * flash).toFixed(3) + ')';
      g.fillRect(0, 0, cw, ch);
      g.globalCompositeOperation = 'source-over';
      flash *= Math.exp(-dt * 3.2);
    }
    if (prev && mix >= 1) {
      prev = null;
    }
    if (running) raf = requestAnimationFrame(frame);
  }

  /* ---------- controls ---------- */
  function bind(id, valId, key, list, after) {
    var b = $(id),
      v = $(valId);
    b.addEventListener('click', function () {
      st[key] = (st[key] + 1) % list.length;
      v.textContent = list[st[key]];
      b.setAttribute('aria-label', b.getAttribute('data-name') + ': ' + list[st[key]] + '. Press to change.');
      if (after) after();
    });
  }
  /* Season skips the timeline ahead to the start of the next season */
  $('btn-season').addEventListener('click', function () {
    var m = Math.floor(Math.min(TL.m, TL.END - 0.01)) + 1,
      n = 0;
    while (tlSeasonIdx(m % TL.END) === st.season && n < 12) {
      m++;
      n++;
    }
    TL.m = m % TL.END;
    TL.hold = 0;
    TL.manual = false;
    this.setAttribute(
      'aria-label',
      'Season: ' + SEASON_ORDER[tlSeasonIdx(TL.m)] + '. Press to skip to the next season.',
    );
    if (!running) drawOnce();
  });
  /* dragging the timeline holds the date; letting go carries on from there */
  $('tl-range').addEventListener('input', function () {
    TL.manual = false;
    TL.hold = 0;
    TL.m = parseFloat(this.value) || 0;
    tlSetPlay(false);
    if (!running) drawOnce();
  });
  $('tl-range').addEventListener('change', function () {
    tlSetPlay(!reduce);
  });
  $('tick-a').style.left = 'calc((100% - 24px) * ' + (TL.EXPECT / TL.END).toFixed(4) + ' + 11px)';
  $('tick-b').style.left = 'calc((100% - 24px) * ' + (TL.BORN / TL.END).toFixed(4) + ' + 11px)';
  bind('btn-time', 'val-time', 'time', TIMES);
  bind('btn-wind', 'val-wind', 'wind', WINDS);
  bind('btn-weather', 'val-weather', 'weather', WEATHERS);

  function tapAt(px, py) {
    var q = toLogical(px, py),
      x = q[0],
      y = q[1],
      best = null,
      bd = 1e9;
    trees.forEach(function (t) {
      var s = t.s * 1.6,
        cx = t.x,
        cy = t.y - 88 * s,
        d = Math.hypot(x - cx, y - cy);
      if (d < 42 * s && d < bd && !t.pine) {
        bd = d;
        best = t;
      }
    });
    if (!best) return;
    best.shake = 1;
    var n = 0,
      col = SEASON.snow ? '#ffffff' : SEASON.tree[best.ci];
    for (var i = leaves.length - 1; i >= 0 && n < 16; i--) {
      var l = leaves[i];
      if (l.burst) continue;
      l.burst = true;
      l.u = best.u + (lr() - 0.5) * 26;
      l.v = best.v + (lr() - 0.5) * 26;
      l.z = (60 + lr() * 50) * best.s * 1.6;
      l.vz = 16 + lr() * 14;
      l.col = col;
      l.rest = 0;
      n++;
    }
  }
  /* In Fullscreen the scene can be pinched, dragged and wheel-zoomed. On the page it stays put, so scrolling past it works. */
  var ptrs = {},
    moved = 0,
    pinch = null;
  function isFs() {
    return stage.classList.contains('fs');
  }
  function clampView() {
    view.cx = clamp(view.cx, W * 0.12, W * 0.88);
    view.cy = clamp(view.cy, H * 0.1, H * 0.9);
  }
  function local(ev) {
    var rc = canvas.getBoundingClientRect();
    return [ev.clientX - rc.left, ev.clientY - rc.top];
  }
  function pts() {
    var a = [];
    for (var k in ptrs) a.push(ptrs[k]);
    return a;
  }
  canvas.addEventListener('pointerdown', function (ev) {
    ptrs[ev.pointerId] = local(ev);
    var a = pts();
    if (a.length === 1) moved = 0;
    if (!isFs()) return;
    try {
      canvas.setPointerCapture(ev.pointerId);
    } catch {
      /* some pointers can't be captured */
    }
    if (a.length === 2) {
      pinch = {
        d: Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) || 1,
        z: view.z,
        anchor: toLogical((a[0][0] + a[1][0]) / 2, (a[0][1] + a[1][1]) / 2),
      };
      moved = 99;
    }
  });
  canvas.addEventListener('pointermove', function (ev) {
    var p = ptrs[ev.pointerId];
    if (!p) return;
    var q = local(ev),
      dx = q[0] - p[0],
      dy = q[1] - p[1];
    ptrs[ev.pointerId] = q;
    moved += Math.abs(dx) + Math.abs(dy);
    if (!isFs()) return;
    var a = pts();
    if (a.length === 1 && moved > 8) {
      view.cx -= dx / view.z;
      view.cy -= dy / view.z;
      view.touched = true;
      clampView();
    } else if (a.length === 2 && pinch) {
      var mx = (a[0][0] + a[1][0]) / 2,
        my = (a[0][1] + a[1][1]) / 2,
        d = Math.hypot(a[0][0] - a[1][0], a[0][1] - a[1][1]) || 1;
      view.z = clamp((pinch.z * d) / pinch.d, view.zMin, view.zMax);
      view.cx = pinch.anchor[0] - (mx - cssW / 2) / view.z;
      view.cy = pinch.anchor[1] - (my - ucy) / view.z;
      view.touched = true;
      clampView();
    }
    if (!running) drawOnce();
  });
  function pointerEnd(ev) {
    delete ptrs[ev.pointerId];
    pinch = null;
  }
  canvas.addEventListener('pointerup', pointerEnd);
  canvas.addEventListener('pointercancel', pointerEnd);
  canvas.addEventListener('click', function (ev) {
    if (moved > 8) return;
    var q = local(ev);
    tapAt(q[0], q[1]);
  });
  canvas.addEventListener(
    'wheel',
    function (ev) {
      if (!isFs()) return;
      ev.preventDefault();
      var q = local(ev),
        an = toLogical(q[0], q[1]);
      view.z = clamp(view.z * Math.exp(-ev.deltaY * 0.0015), view.zMin, view.zMax);
      view.cx = an[0] - (q[0] - cssW / 2) / view.z;
      view.cy = an[1] - (q[1] - ucy) / view.z;
      view.touched = true;
      clampView();
      if (!running) drawOnce();
    },
    { passive: false },
  );
  /* entering Fullscreen turns the gestures on; leaving it puts the whole scene back in view */
  var fsWatch = new MutationObserver(function () {
    var fs = isFs();
    canvas.style.touchAction = fs ? 'none' : '';
    canvas.style.cursor = fs ? 'grab' : '';
    if (!fs && view.touched) {
      view.touched = false;
      resize();
      if (!running) drawOnce();
    }
  });
  fsWatch.observe(stage, { attributes: true, attributeFilter: ['class'] });

  KS = 1.6;
  var running = false,
    raf = 0,
    timers = [];
  resize();
  showSeason(tlSeasonIdx(0), false);
  if (reduce) tlSetPlay(false);
  /* draw the other seasons in the background so the first change to each is instant */
  [2, 3, 0].forEach(function (si, k) {
    timers.push(
      setTimeout(
        function () {
          buildSeason(SEASON_ORDER[si]);
        },
        1200 + k * 900,
      ),
    );
  });
  /* one still frame, for a resize or a restart while paused */
  function drawOnce() {
    var was = running;
    running = false;
    var now = performance.now();
    last = now - 16;
    frame(now);
    running = was;
  }
  function go() {
    if (running) return;
    running = true;
    last = performance.now();
    raf = requestAnimationFrame(frame);
  }
  go();
  return {
    stop: function () {
      running = false;
      cancelAnimationFrame(raf);
      ro.disconnect();
      fsWatch.disconnect();
      timers.forEach(function (t) {
        clearTimeout(t);
      });
      root.remove();
    },
    pause: function () {
      running = false;
      cancelAnimationFrame(raf);
    },
    resume: function () {
      go();
    },
    restart: function () {
      TL.m = 0;
      TL.hold = 0;
      TL.manual = false;
      walkU = UMAX - 30;
      hearts.length = 0;
      tlSetPlay(!reduce);
      if (!running) drawOnce();
    },
  };
}
