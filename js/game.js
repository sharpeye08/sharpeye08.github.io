/*
 * Bug Squash: a tiny original platformer cartridge for the handheld console.
 *
 *   window.CartGame.start(canvas, opts) -> { input(act, down), back(), stop(), label() }
 *   opts: { paper, ink, cream, accent, sfx, reduced }
 *
 * Draws at 128x160 with 8px tiles and lets CSS scale the canvas. Fixed 60 Hz
 * update on requestAnimationFrame. All input arrives through input()/back();
 * the only listener is visibilitychange, which stop() removes.
 */
(function () {
  "use strict";

  var W = 128, H = 160, TS = 8, ROWS = 20, STEP = 1000 / 60, FADE = 24;

  /* ---------------------------------------------------------------- level --
   * One hand-made level built from chunks of tile strings, about a screen
   * each. Rows are bottom-aligned and padded with sky up to ROWS; every row in
   * a chunk must be the same length. Ground top is row 18; the hero can jump
   * about 3 tiles up and 5 across.
   *   #  ground        -  one-way platform    o  bit
   *   P  start         C  checkpoint          D  deploy rack (bottom-left cell)
   *   b  beetle        h  hopper              f  flyer
   */
  var CHUNKS = [
    [ // boot: hop a step, jump a wall
      "............o...",
      ".......o........",
      "...........###..",
      "..P....##..###..",
      "################",
      "################"
    ],
    [ // gaps, with bits tracing the arc
      "......oo....ooo.",
      ".....o..o..o...o",
      "................",
      "................",
      "######..####...#",
      "######..####...#"
    ],
    [ // first bugs: one in the open, one in a trench
      "......o.....o...",
      "..........#...#.",
      "......b...#.b.#.",
      "################",
      "################"
    ],
    [ // platforms at heights over a pit
      "............ooo.....",
      "....................",
      "...........-----....",
      ".......o............",
      "......----..........",
      "..o.................",
      ".----...............",
      "....................",
      "######..........####",
      "######..........####"
    ],
    [ // a flyer, then a stepping block over a pit
      "....f....o.o....",
      ".........###....",
      "................",
      "########....####",
      "########....####"
    ],
    [ // breather and the save point
      "..o.o.o.........",
      "................",
      ".........C......",
      "################",
      "################"
    ],
    [ // hoppers on plateaus
      "............ooo.",
      "............h...",
      "..........######",
      "....####..######",
      "..h.####..######",
      "################",
      "################"
    ],
    [ // pillars
      ".....o.....o....",
      "................",
      "##..##.....##...",
      "##..##..o..##...",
      "##..##.##..##...",
      "##..##.##..##..#",
      "##..##.##..##..#"
    ],
    [ // high road or low road
      ".....oooo.......",
      "........b.......",
      "...--------.....",
      "................",
      "................",
      "----............",
      "................",
      "................",
      ".....b......b...",
      "################",
      "################"
    ],
    [ // flyers over gaps: jump while they bob up
      "....f......f......",
      "..................",
      "..................",
      "........oo........",
      "..................",
      "..................",
      "####...####...####",
      "####...####...####"
    ],
    [ // stairs up, bugs above and below
      ".............ooo",
      "............b...",
      "...........#####",
      "................",
      ".......####.....",
      "................",
      "...####....b....",
      "################",
      "################"
    ],
    [ // ship it
      "...............#",
      "...............#",
      "...............#",
      "##.............#",
      "...............#",
      "...o.o.........#",
      "...............#",
      "......h...D....#",
      "################",
      "################"
    ]
  ];

  // Feel. Units are pixels and frames at 60 Hz.
  var PHYS = {
    accel: 0.09, accelAir: 0.07, turn: 0.2, friction: 0.12, frictionAir: 0.025,
    maxRun: 1.3, jump: 3.25, gravityHold: 0.18, gravity: 0.32, apexHang: 0.6,
    jumpCut: 0.6, maxFall: 3.8, coyote: 5, buffer: 6, stomp: 2.3, stompHold: 3.3
  };

  /* ----------------------------------------------------------------- font --
   * 3x5 glyphs: five octal digits, one per row, 4 = left column. */
  var FONT = {
    "0": "75557", "1": "26227", "2": "71747", "3": "71317", "4": "55711",
    "5": "74717", "6": "74757", "7": "71122", "8": "75757", "9": "75717",
    A: "25755", B: "65656", C: "34443", D: "65556", E: "74647", F: "74644",
    G: "34553", H: "55755", I: "72227", J: "11152", K: "55655", L: "44447",
    M: "57755", N: "65555", O: "75557", P: "75744", Q: "75563", R: "65655",
    S: "34716", T: "72222", U: "55557", V: "55552", W: "55775", X: "55255",
    Y: "55222", Z: "71247", "!": "22202", ":": "02020", "/": "11244",
    ".": "00002", "-": "00700", "+": "02720", "?": "71302", "'": "22000",
    ">": "42124", "<": "12421", ",": "00024"
  };

  /* -------------------------------------------------------------- sprites --
   * k ink, c cream, a accent (eyes and glints only), w cream when lit. */
  var HEAD = [
    "....kcck....",
    ".....kk.....",
    ".kkkkkkkkkk.",
    "kcccccccccck",
    null, null, // eyes
    "kckkkkkkkkck",
    "kcccccccccck",
    ".kkkkkkkkkk.",
    "..kcccccck..",
    "..kkkkkkkk.."
  ];
  var EYES = {
    open: ["kckkaakkaack", "kckkaakkaack"],
    blink: ["kckkkkkkkkck", "kckkaakkaack"],
    hurt: ["kckkkkkkkkck", "kckcckkcckck"]
  };
  var LEGS = {
    stand: ["..kk....kk.."],
    run0: ["..kk.....kk."],
    run1: ["...k....k...", "...kk...kk.."],
    run2: [".kk.....kk.."],
    jump: ["..k......k..", ".kk......kk."],
    fall: ["...kk..kk..."],
    land: [],
    hurt: [".kk......kk."]
  };
  // name: [eyes, head offset (-1 stretch, +1 squash), legs]
  var HERO = {
    idle: ["open", 0, "stand"], blink: ["blink", 0, "stand"],
    run0: ["open", 0, "run0"], run1: ["open", -1, "run1"], run2: ["open", 0, "run2"],
    jump: ["open", -1, "jump"], fall: ["open", 0, "fall"], land: ["open", 1, "land"],
    hurt: ["hurt", 0, "hurt"]
  };
  var BEETLE = [
    ".........k",
    "...kkkk.k.",
    "..kcckkkk.",
    ".kckkkkkck",
    ".kkkkkkkkk",
    "..kkkkkkk."
  ];
  var ART = {
    bug0: BEETLE.concat(["..k.k.k.k."]),
    bug1: BEETLE.concat([".k.k.k.k.."]),
    flat: ["..........", "..........", "..........", "..........",
      "...kkkk...", "..kcckkkk.", "kkkkkkkkkk"],
    hopStand: ["........", ".k....k.", "..kkkk..", ".kcckkk.",
      "kckkkkck", "kkkkkkkk", ".kkkkkk.", ".k....k."],
    hopCrouch: ["........", "........", ".k....k.", "..kkkk..",
      ".kcckkk.", "kckkkkck", "kkkkkkkk", "kk.kk.kk"],
    hopAir: [".k....k.", "..k..k..", "..kkkk..", ".kcckkk.",
      "kckkkkck", "kkkkkkkk", ".k.kk.k.", "k......k"],
    flyUp: ["..kk..kk..", ".kcckkcck.", ".kcckkcck.", "..kkkkkk..",
      ".kkckkckk.", ".kkkkkkkk.", "..kkkkkk..", "...k..k..."],
    flyDown: ["..........", "..........", "kkk....kkk", "kcckkkkcck",
      "kkkckkckkk", ".kkkkkkkk.", "..kkkkkk..", "...k..k..."],
    bit: ["..k..", ".kak.", "kccck", ".kck.", "..k.."],
    bitDim: ["..k..", ".kck.", "kccck", ".kck.", "..k.."],
    heart: [".cc.cc.", "ccccccc", "ccccccc", ".ccccc.", "..ccc..", "...c..."],
    heartEmpty: [".cc.cc.", "c..c..c", "c.....c", ".c...c.", "..c.c..", "...c..."],
    floppy: ["kkkkkkk.", "kkwwwkkk", "kkwkwkkk", "kkkkkkkk",
      "kwwwwwwk", "kwkkkkwk", "kwwwwwwk", "kkkkkkkk"],
    pedestal: ["...kk...", "...kk...", "..kkkk..", ".kkkkkk."]
  };

  var level = null;

  function parseLevel() {
    var rows = [], r, c;
    for (r = 0; r < ROWS; r++) rows.push("");
    CHUNKS.forEach(function (chunk) {
      var w = chunk[0].length, pad = ROWS - chunk.length;
      for (r = 0; r < ROWS; r++) {
        var s = r < pad ? new Array(w + 1).join(".") : chunk[r - pad];
        if (s.length !== w) throw new Error("Bug Squash: ragged level row \"" + s + "\"");
        rows[r] += s;
      }
    });
    var cols = rows[0].length, tiles = new Uint8Array(cols * ROWS), spawns = [];
    for (r = 0; r < ROWS; r++) {
      for (c = 0; c < cols; c++) {
        var ch = rows[r][c];
        if (ch === "#") tiles[r * cols + c] = 1;
        else if (ch === "-") tiles[r * cols + c] = 2;
        else if (ch !== ".") spawns.push({ k: ch, c: c, r: r });
      }
    }
    return { cols: cols, tiles: tiles, spawns: spawns };
  }

  function rng(seed) {
    return function () {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function fmtTime(frames, tenths) {
    var s = frames / 60, m = Math.floor(s / 60), ss = Math.floor(s % 60);
    var out = m + ":" + (ss < 10 ? "0" : "") + ss;
    return tenths ? out + "." + Math.floor((s * 10) % 10) : out;
  }

  window.CartGame = {
    start: function (canvas, opts) {
      opts = opts || {};
      var C = {
        paper: opts.paper || "#ee6c5f", ink: opts.ink || "#1d1a24",
        cream: opts.cream || "#f6f0e2", accent: opts.accent || "#ffb454"
      };
      var reduced = !!opts.reduced;
      var LV = level || (level = parseLevel());

      canvas.width = W;
      canvas.height = H;
      var ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;

      /* ------------------------------------------------------- art setup -- */
      function makeCanvas(w, h) {
        var c = document.createElement("canvas");
        c.width = w;
        c.height = h;
        return c;
      }
      function sprite(rows, map) {
        var w = rows[0].length, h = rows.length, r = makeCanvas(w, h), l = makeCanvas(w, h);
        var g = r.getContext("2d");
        for (var y = 0; y < h; y++) {
          for (var x = 0; x < w; x++) {
            var col = map[rows[y][x]];
            if (col) { g.fillStyle = col; g.fillRect(x, y, 1, 1); }
          }
        }
        g = l.getContext("2d");
        g.translate(w, 0);
        g.scale(-1, 1);
        g.drawImage(r, 0, 0);
        return { r: r, l: l };
      }
      var MAP = { k: C.ink, c: C.cream, a: C.accent };
      var SP = {};
      Object.keys(ART).forEach(function (k) { SP[k] = sprite(ART[k], MAP); });
      SP.floppyOn = sprite(ART.floppy, { k: C.ink, w: C.cream });
      SP.floppyOff = sprite(ART.floppy, { k: C.ink });
      var HF = {};
      Object.keys(HERO).forEach(function (name) {
        var f = HERO[name], rows = [], i;
        for (i = 0; i < 13; i++) rows.push("............");
        var head = HEAD.slice();
        head[4] = EYES[f[0]][0];
        head[5] = EYES[f[0]][1];
        for (i = 0; i < head.length; i++) {
          var y = 1 + f[1] + i;
          if (y >= 0 && y < 13) rows[y] = head[i];
        }
        var legs = LEGS[f[2]];
        for (i = 0; i < legs.length; i++) rows[13 - legs.length + i] = legs[i];
        HF[name] = sprite(rows, MAP);
      });

      // One ink tile with a cream top edge and faint circuit-board marks.
      function solidTile(g, x, y, top, tx, ty) {
        g.fillStyle = C.ink;
        g.fillRect(x, y, TS, TS);
        if (top) { g.fillStyle = C.cream; g.fillRect(x, y, TS, 1); }
        var hsh = ((tx * 7919) ^ (ty * 104729)) % 19;
        g.globalAlpha = 0.25;
        g.fillStyle = C.paper;
        if (hsh < 4) g.fillRect(x + 2 + hsh, y + 3 + (hsh & 1) * 2, 1, 1);
        else if (hsh < 7) g.fillRect(x + 1, y + 3 + (hsh - 4) * 2, 4, 1);
        g.globalAlpha = 1;
      }

      function tileAtLV(tx, ty) {
        if (tx < 0 || tx >= LV.cols || ty < 0 || ty >= ROWS) return 0;
        return LV.tiles[ty * LV.cols + tx];
      }

      var levelCanvas = (function () {
        var cv = makeCanvas(LV.cols * TS, H), g = cv.getContext("2d");
        for (var ty = 0; ty < ROWS; ty++) {
          for (var tx = 0; tx < LV.cols; tx++) {
            var t = tileAtLV(tx, ty), x = tx * TS, y = ty * TS;
            if (t === 1) {
              solidTile(g, x, y, tileAtLV(tx, ty - 1) !== 1, tx, ty);
              g.globalAlpha = 0.3;
              g.fillStyle = C.cream;
              if (tileAtLV(tx - 1, ty) !== 1 && tx > 0) g.fillRect(x, y + 1, 1, TS - 1);
              if (tileAtLV(tx + 1, ty) !== 1 && tx < LV.cols - 1) g.fillRect(x + TS - 1, y + 1, 1, TS - 1);
              g.globalAlpha = 1;
            } else if (t === 2) {
              var L = tileAtLV(tx - 1, ty) === 2, R = tileAtLV(tx + 1, ty) === 2;
              g.fillStyle = C.ink;
              g.fillRect(x + (L ? 0 : 1), y, TS - (L ? 0 : 1) - (R ? 0 : 1), 4);
              g.fillRect(x + 3, y + 4, 2, 1);
              g.fillStyle = C.cream;
              g.fillRect(x + (L ? 0 : 1), y, TS - (L ? 0 : 1) - (R ? 0 : 1), 1);
              g.globalAlpha = 0.25;
              g.fillStyle = C.paper;
              g.fillRect(x + 2, y + 2, 1, 1);
              g.fillRect(x + 5, y + 2, 1, 1);
              g.globalAlpha = 1;
            }
          }
          // Faint static at the bottom of pits.
        }
        g.globalAlpha = 0.3;
        g.fillStyle = C.ink;
        for (var px = 0; px < LV.cols * TS; px++) {
          if (tileAtLV(px >> 3, ROWS - 1) === 0) {
            var hgt = 1 + ((px * 5) % 7 < 3 ? 2 : (px % 3));
            g.fillRect(px, H - hgt, 1, hgt);
          }
        }
        g.globalAlpha = 1;
        return cv;
      })();

      var strip = (function () { // ground for the title and end cards
        var cv = makeCanvas(W, 40), g = cv.getContext("2d");
        for (var ty = 0; ty < 5; ty++) for (var tx = 0; tx < 16; tx++) solidTile(g, tx * TS, ty * TS, ty === 0, tx + 3, ty + 9);
        return cv;
      })();

      var BG = (function () {
        var R = rng(1977), x, y, g;
        var dots = makeCanvas(W, H);
        g = dots.getContext("2d");
        g.fillStyle = C.ink;
        for (y = 14; y < 144; y += 10) for (x = ((y / 10) & 1) * 5; x < W; x += 10) g.fillRect(x, y, 1, 1);

        var racks = makeCanvas(256, H);
        g = racks.getContext("2d");
        g.fillStyle = C.ink;
        x = 3;
        while (x < 240) {
          var w = 12 + (R() * 10 | 0), h = 34 + (R() * 52 | 0), top = 150 - h;
          if (x + w > 252) w = 252 - x;
          g.fillRect(x, top, w, h + 10);
          for (var sy = top + 4; sy < 146; sy += 5) {
            g.clearRect(x + 2, sy, w - 4, 1);
            if (R() < 0.4) g.clearRect(x + w - 4, sy + 2, 1, 1);
          }
          x += w + 4 + (R() * 12 | 0);
        }

        var traces = makeCanvas(256, H);
        g = traces.getContext("2d");
        g.fillStyle = C.ink;
        var pt = function (px, py) { g.fillRect(((px % 256) + 256) % 256, py, 1, 1); };
        var via = function (px, py) {
          for (var i = -1; i <= 1; i++) for (var j = -1; j <= 1; j++) if (i || j) pt(px + i, py + j);
        };
        for (var n = 0; n < 9; n++) {
          var px = R() * 256 | 0, py = 18 + (R() * 104 | 0), len = 50 + (R() * 90 | 0), k;
          via(px, py);
          px += 2;
          while (len > 0) {
            var run = 6 + (R() * 24 | 0);
            for (k = 0; k < run; k++) pt(px++, py);
            len -= run;
            if (len <= 0) break;
            var d = R() < 0.5 ? -1 : 1, dl = 3 + (R() * 6 | 0);
            if (py + d * dl < 14 || py + d * dl > 128) d = -d;
            for (k = 0; k < dl; k++) pt(px++, py += d);
            len -= dl;
          }
          via(px + 1, py);
        }
        return { dots: dots, racks: racks, traces: traces };
      })();

      /* ----------------------------------------------------------- state -- */
      var held = { left: false, right: false, up: false, down: false, a: false, b: false };
      var pressed = {};
      var S = {
        mode: "title", t: 0, fade: 0, fadeFn: null, endT: 0,
        hearts: 3, bits: 0, fixed: 0, time: 0, finalTime: 0, best: loadBest(), newBest: false,
        cam: 0, look: 14, shake: 0, hitstop: 0, parts: [], hero: null, world: null, respawn: null,
        ti: null
      };

      function loadBest() {
        try { return +window.localStorage.getItem("bugSquash.best") || 0; } catch (e) { return 0; }
      }
      function saveBest(v) {
        try { window.localStorage.setItem("bugSquash.best", String(v)); } catch (e) { /* private mode */ }
      }
      function sfx(name) {
        var s = opts.sfx, f = s && s[name];
        if (typeof f === "function") { try { f.call(s); } catch (e) { /* sound is optional */ } }
      }

      function buildWorld() {
        var w = { cols: LV.cols, w: LV.cols * TS, bits: [], enemies: [], cp: null, rack: null, start: null };
        LV.spawns.forEach(function (s, i) {
          var x = s.c * TS, bottom = (s.r + 1) * TS;
          if (s.k === "o") w.bits.push({ x: x + 4, y: s.r * TS + 4, got: false });
          else if (s.k === "P") w.start = { x: x - 1, y: bottom - 11 };
          else if (s.k === "C") w.cp = { x: x, ground: bottom, on: false, t: 0 };
          else if (s.k === "D") w.rack = { x: x, y: bottom - 24 };
          else if (s.k === "b") w.enemies.push({ type: "b", x: x, y: bottom - 6, w: 8, h: 6, dir: -1, vx: 0, vy: 0, ground: false, anim: i * 3, dead: 0 });
          else if (s.k === "h") w.enemies.push({ type: "h", x: x + 1, y: bottom - 6, w: 6, h: 6, dir: -1, vx: 0, vy: 0, ground: false, wait: 20 + (i * 13) % 40, seed: i * 7, anim: 0, dead: 0 });
          else if (s.k === "f") w.enemies.push({ type: "f", x: x, y: s.r * TS + 1, x0: x, y0: s.r * TS + 1, w: 8, h: 5, dir: -1, vx: 0, vy: 0, anim: i * 11, dead: 0 });
        });
        w.enemyCount = w.enemies.length;
        return w;
      }

      function resetTitle() {
        S.mode = "title";
        S.parts = [];
        S.ti = { x: 40, y: 113, vy: 0, ground: true, land: 0, bugX: 150, bugFlat: 0, wait: 0 };
      }

      function newGame() {
        S.world = buildWorld();
        var st = S.world.start;
        S.hero = {
          x: st.x, y: st.y, w: 10, h: 11, vx: 0, vy: 0, face: 1, ground: true,
          coyote: 0, buf: 0, jumping: false, inv: 0, hurtT: 0, land: 0, drop: 0, anim: 0, prevBottom: 0
        };
        S.respawn = { x: st.x, y: st.y };
        S.hearts = 3;
        S.bits = 0;
        S.fixed = 0;
        S.time = 0;
        S.parts = [];
        S.shake = 0;
        S.look = 14;
        S.newBest = false;
        camera(true);
        S.mode = "play";
      }

      function toShipped() { S.mode = "shipped"; S.endT = 0; S.parts = []; }
      function toCrash() { S.mode = "crash"; S.endT = 70; S.parts = []; }

      function fadeTo(fn) {
        S.fade = FADE;
        S.fadeFn = fn;
      }

      /* ------------------------------------------------------- collision -- */
      function tile(tx, ty) {
        if (tx < 0 || tx >= LV.cols) return 1; // walls at both ends
        if (ty < 0 || ty >= ROWS) return 0;
        return LV.tiles[ty * LV.cols + tx];
      }
      function free(x, y, w, h) {
        for (var ty = Math.floor(y / TS); ty <= Math.floor((y + h - 0.01) / TS); ty++) {
          for (var tx = Math.floor(x / TS); tx <= Math.floor((x + w - 0.01) / TS); tx++) {
            if (tile(tx, ty) === 1) return false;
          }
        }
        return true;
      }
      function moveX(e, dx) {
        if (!dx) return false;
        e.x += dx;
        var y0 = Math.floor(e.y / TS), y1 = Math.floor((e.y + e.h - 0.01) / TS), tx, ty;
        if (dx > 0) {
          tx = Math.floor((e.x + e.w - 0.01) / TS);
          for (ty = y0; ty <= y1; ty++) if (tile(tx, ty) === 1) { e.x = tx * TS - e.w; return true; }
        } else {
          tx = Math.floor(e.x / TS);
          for (ty = y0; ty <= y1; ty++) if (tile(tx, ty) === 1) { e.x = (tx + 1) * TS; return true; }
        }
        return false;
      }
      // Returns 1 on landing, -1 on a ceiling hit, 0 otherwise.
      function moveY(e, dy, noOneWay, nudge) {
        if (!dy) return 0;
        var prevBottom = e.y + e.h;
        e.y += dy;
        var x0 = Math.floor(e.x / TS), x1 = Math.floor((e.x + e.w - 0.01) / TS), tx, ty, t;
        if (dy > 0) {
          ty = Math.floor((e.y + e.h - 0.01) / TS);
          for (tx = x0; tx <= x1; tx++) {
            t = tile(tx, ty);
            if (t === 1 || (t === 2 && !noOneWay && prevBottom <= ty * TS + 0.01)) {
              e.y = ty * TS - e.h;
              return 1;
            }
          }
        } else {
          ty = Math.floor(e.y / TS);
          for (tx = x0; tx <= x1; tx++) {
            if (tile(tx, ty) !== 1) continue;
            if (nudge) { // slip past ceiling corners by up to 3px
              for (var i = 1; i <= 3; i++) {
                if (free(e.x - i, e.y, e.w, e.h)) { e.x -= i; return 0; }
                if (free(e.x + i, e.y, e.w, e.h)) { e.x += i; return 0; }
              }
            }
            e.y = (ty + 1) * TS;
            return -1;
          }
        }
        return 0;
      }
      function overlap(a, b) {
        return a.x + 1 < b.x + b.w && a.x + a.w - 1 > b.x && a.y + 1 < b.y + b.h && a.y + a.h > b.y;
      }
      function onOneWay(h) {
        var ty = Math.floor((h.y + h.h + 1) / TS), any = false;
        for (var tx = Math.floor(h.x / TS); tx <= Math.floor((h.x + h.w - 0.01) / TS); tx++) {
          var t = tile(tx, ty);
          if (t === 1) return false;
          if (t === 2) any = true;
        }
        return any;
      }

      /* ------------------------------------------------------- particles -- */
      function puff(x, y, n) {
        if (reduced) return;
        for (var i = 0; i < n; i++) {
          S.parts.push({ k: 0, x: x + (Math.random() - 0.5) * 6, y: y - 1, vx: (Math.random() - 0.5) * 1.2, vy: -Math.random() * 0.45, life: 12 + (Math.random() * 8 | 0) });
        }
      }
      function sparkle(x, y) {
        if (reduced) return;
        for (var i = 0; i < 4; i++) {
          var a = i * Math.PI / 2 + Math.PI / 4;
          S.parts.push({ k: 2, x: x, y: y, vx: Math.cos(a) * 0.9, vy: Math.sin(a) * 0.9, life: 12 });
        }
      }
      function floatText(s, x, y) {
        S.parts.push({ k: 1, s: s, x: x, y: y, vx: 0, vy: -0.35, life: 45 });
      }
      function updateParts() {
        for (var i = S.parts.length - 1; i >= 0; i--) {
          var p = S.parts[i];
          p.x += p.vx;
          p.y += p.vy;
          if (p.k === 0) p.vx *= 0.9;
          if (--p.life <= 0) S.parts.splice(i, 1);
        }
      }

      /* ------------------------------------------------------------ hero -- */
      function heroPhysics(h, control) {
        var dir = control && h.hurtT < 12 ? (held.right ? 1 : 0) - (held.left ? 1 : 0) : 0;
        h.prevBottom = h.y + h.h;
        if (h.inv) h.inv--;
        if (h.hurtT) h.hurtT--;
        if (h.land) h.land--;
        if (h.drop) h.drop--;

        if (dir) {
          var turning = h.vx * dir < 0;
          var a = h.ground ? (turning ? PHYS.turn : PHYS.accel) : PHYS.accelAir;
          var v = h.vx * dir;
          v = v < PHYS.maxRun ? Math.min(PHYS.maxRun, v + a) : Math.max(PHYS.maxRun, v - PHYS.frictionAir);
          h.vx = v * dir;
          if (turning && h.ground && Math.abs(h.vx) > 0.5 && S.t % 4 === 0) puff(h.x + h.w / 2, h.y + h.h, 1);
          if (h.hurtT <= 0) h.face = dir;
        } else {
          var f = h.ground ? PHYS.friction : PHYS.frictionAir;
          h.vx = Math.abs(h.vx) <= f ? 0 : h.vx - (h.vx > 0 ? f : -f);
        }

        if (h.ground) h.coyote = PHYS.coyote;
        else if (h.coyote) h.coyote--;
        if (h.buf && h.coyote && control) {
          h.buf = 0;
          h.coyote = 0;
          if (held.down && onOneWay(h)) {
            h.drop = 10;
          } else {
            h.vy = -PHYS.jump;
            h.jumping = true;
            sfx("jump");
            puff(h.x + h.w / 2, h.y + h.h, 3);
          }
          h.ground = false;
        } else if (h.buf) h.buf--;

        if (h.jumping && h.vy < 0 && !held.a) { h.vy *= PHYS.jumpCut; h.jumping = false; }
        if (h.vy >= 0) h.jumping = false;
        var g = h.jumping && held.a ? PHYS.gravityHold : PHYS.gravity;
        if (control && held.a && !h.ground && Math.abs(h.vy) < 0.6) g *= PHYS.apexHang;
        h.vy = Math.min(PHYS.maxFall, h.vy + g);

        if (moveX(h, h.vx)) h.vx = 0;
        var wasGround = h.ground, fallV = h.vy;
        var r = moveY(h, h.vy, h.drop > 0, true);
        h.ground = r === 1;
        if (r === 1) {
          if (!wasGround) {
            h.land = fallV > 2 ? 6 : 3;
            if (fallV > 2) puff(h.x + h.w / 2, h.y + h.h, 4);
            sfx("step");
          }
          h.vy = 0;
        } else if (r === -1) {
          h.vy = 0.4;
          h.jumping = false;
        }

        if (h.ground && Math.abs(h.vx) > 0.15) {
          var before = Math.floor(h.anim);
          h.anim += Math.abs(h.vx) * 0.11;
          var now = Math.floor(h.anim);
          if (now !== before && !(now & 1) && control) sfx("step");
        } else if (h.ground) h.anim = 0;

        if (control && h.y > H + 12) pitFall();
      }

      function heroFrame(h) {
        if (h.hurtT > 12 || S.mode === "crash") return "hurt";
        if (h.land && h.ground) return "land";
        if (!h.ground) return h.vy < 0 ? "jump" : "fall";
        if (Math.abs(h.vx) > 0.15) return ["run0", "run1", "run2", "run1"][Math.floor(h.anim) & 3];
        return S.t % 200 < 8 ? "blink" : "idle";
      }

      function hurt(h, fromX) {
        if (h.inv || S.fade) return;
        S.hearts--;
        sfx("hurt");
        S.shake = reduced ? 0 : 12;
        h.inv = 90;
        h.hurtT = 24;
        h.vx = (h.x + h.w / 2 < fromX ? -1 : 1) * 1.6;
        h.vy = -2.2;
        h.ground = false;
        h.jumping = false;
        h.coyote = 0;
        if (S.hearts <= 0) {
          S.mode = "crash";
          S.endT = 0;
          h.vy = -3;
          h.vx = 0;
        }
      }

      function pitFall() {
        if (S.fade) return;
        S.hearts--;
        sfx("hurt");
        if (S.hearts <= 0) { fadeTo(toCrash); return; }
        fadeTo(function () {
          var h = S.hero;
          h.x = S.respawn.x;
          h.y = S.respawn.y;
          h.vx = h.vy = 0;
          h.inv = 90;
          h.face = 1;
          h.buf = 0;
          h.jumping = false;
          h.ground = true;
          S.look = 14;
          camera(true);
        });
      }

      function camera(snap) {
        var h = S.hero;
        if (Math.abs(h.vx) > 0.3) S.look += (h.face * 14 - S.look) * 0.05;
        var f = h.x + h.w / 2 + S.look;
        if (snap) S.cam = f - 64;
        else if (f - S.cam > 70) S.cam = f - 70;
        else if (f - S.cam < 58) S.cam = f - 58;
        S.cam = Math.max(0, Math.min(S.world.w - W, S.cam));
      }

      /* --------------------------------------------------------- enemies -- */
      function beetle(e) {
        e.vy = Math.min(e.vy + 0.3, 4);
        if (e.ground) {
          var ax = e.dir > 0 ? e.x + e.w + 1 : e.x - 1;
          if (!tile(Math.floor(ax / TS), Math.floor((e.y + e.h + 1) / TS))) e.dir = -e.dir;
        }
        if (moveX(e, e.dir * 0.35)) e.dir = -e.dir;
        e.ground = moveY(e, e.vy) === 1;
        if (e.ground) e.vy = 0;
        e.anim++;
      }
      function hopper(e) {
        e.vy = Math.min(e.vy + 0.25, 4);
        if (e.ground) {
          e.vx = 0;
          if (--e.wait <= 0) {
            var lx = Math.floor((e.x + e.w / 2 + e.dir * 16) / TS), fy = Math.floor((e.y + e.h + 1) / TS);
            if (!tile(lx, fy) || tile(lx, fy - 1) === 1) e.dir = -e.dir;
            e.vy = -2.6;
            e.vx = e.dir * 0.75;
            e.ground = false;
            e.wait = 40 + e.seed % 30;
            e.seed += 17;
          }
        }
        if (moveX(e, e.vx)) { e.dir = -e.dir; e.vx = -e.vx; }
        var r = moveY(e, e.vy);
        e.ground = r === 1;
        if (r) e.vy = 0;
      }
      function flyer(e) {
        e.anim++;
        var nx = e.x + e.dir * 0.4;
        if (nx < e.x0 - 24 || nx > e.x0 + 24) e.dir = -e.dir;
        else e.x = nx;
        e.y = e.y0 + Math.sin(e.anim * 0.05) * 10;
      }

      function updateEnemies() {
        var h = S.hero, list = S.world.enemies, lo = S.cam - 24, hi = S.cam + W + 24;
        var falling = !h.ground && h.vy > -0.5; // decided once, so two bugs underfoot both squash
        for (var i = list.length - 1; i >= 0; i--) {
          var e = list[i];
          if (e.dead) {
            if (e.type === "f") { e.vy = Math.min(e.vy + 0.25, 3); moveY(e, e.vy); }
            if (--e.dead <= 0) list.splice(i, 1);
            continue;
          }
          if (e.x + e.w < lo || e.x > hi) continue;
          var py = e.y;
          if (e.type === "b") beetle(e);
          else if (e.type === "h") hopper(e);
          else flyer(e);
          if (e.y > H + 16) { list.splice(i, 1); continue; }
          if (S.mode === "play" && overlap(h, e)) {
            if (falling && h.prevBottom <= Math.min(py, e.y) + 4) {
              e.dead = 30;
              S.hitstop = 3;
              e.vy = 0;
              S.fixed++;
              h.vy = held.a ? -PHYS.stompHold : -PHYS.stomp;
              h.jumping = held.a;
              h.coyote = 0;
              sfx("stomp");
              floatText("FIXED", e.x + e.w / 2, e.y - 6);
              puff(e.x + e.w / 2, e.y + e.h, 3);
            } else {
              hurt(h, e.x + e.w / 2);
            }
          }
        }
      }

      /* ---------------------------------------------------------- update -- */
      function updatePlay() {
        var h = S.hero, w = S.world;
        S.time++;
        if (pressed.a) h.buf = PHYS.buffer;
        if (S.hitstop) { S.hitstop--; return; } // a beat of weight on each stomp
        heroPhysics(h, true);
        updateEnemies();
        if (S.mode !== "play") return;

        var cx = h.x + h.w / 2, cy = h.y + h.h / 2;
        for (var i = 0; i < w.bits.length; i++) {
          var b = w.bits[i];
          if (!b.got && Math.abs(b.x - cx) < 8 && Math.abs(b.y - cy) < 9.5) {
            b.got = true;
            S.bits++;
            sfx("bit");
            sparkle(b.x, b.y);
            floatText("1", b.x, b.y - 4);
          }
        }
        if (w.cp && !w.cp.on && cx >= w.cp.x + 4) {
          w.cp.on = true;
          S.respawn = { x: w.cp.x - 1, y: w.cp.ground - 11 };
          sfx("bit");
          floatText("SAVED", w.cp.x + 4, w.cp.ground - 22);
        }
        if (w.rack && h.x + h.w >= w.rack.x + 3) {
          S.mode = "deploy";
          S.endT = 0;
          S.finalTime = S.time;
          if (!S.best || S.time < S.best) { S.best = S.time; S.newBest = true; saveBest(S.time); }
          sfx("win");
        }
        camera(false);
        if (S.shake) S.shake--;
      }

      function updateTitle() {
        var r = S.ti;
        if (pressed.a) { sfx("jump"); fadeTo(newGame); return; }
        // Attract loop: a bug wanders in, the robot hops on it.
        if (r.bugFlat) {
          if (--r.bugFlat === 0) { r.bugX = 150; r.wait = 50; }
        } else if (r.wait) r.wait--;
        else r.bugX -= 0.35;
        if (r.ground && !r.bugFlat && !r.wait && r.bugX - r.x > 8 && r.bugX - r.x < 12) {
          r.vy = -3.1;
          r.ground = false;
        }
        if (!r.ground) {
          r.vy += 0.2;
          r.y += r.vy;
          if (r.vy > 0 && !r.bugFlat && r.y + 11 >= 118 && Math.abs(r.bugX + 4 - (r.x + 5)) < 9) {
            r.bugFlat = 40;
            r.vy = -2;
            floatText("FIXED", r.bugX + 4, 96);
          }
          if (r.y >= 113) {
            r.y = 113;
            r.vy = 0;
            r.ground = true;
            r.land = 6;
            puff(r.x + 5, 124, 3);
          }
        }
        if (r.land) r.land--;
        if (r.bugX < -20 && !r.bugFlat) { r.bugX = 150; r.wait = 40; }
      }

      function updateDeploy() {
        var h = S.hero;
        S.endT++;
        if (S.endT === 56 && h.ground) { h.vy = -2.6; h.ground = false; }
        heroPhysics(h, false);
        if (S.endT === 100) fadeTo(toShipped);
      }

      function updateShipped() {
        S.endT++;
        if (pressed.a) { sfx("jump"); fadeTo(newGame); return; }
        if (!reduced && S.endT % 9 === 0) {
          S.parts.push({ k: 3, x: 4 + Math.random() * 120, y: -6, vx: 0, vy: 0.5 + Math.random() * 0.4, life: 260, ph: Math.random() * 6 });
        }
        for (var i = S.parts.length - 1; i >= 0; i--) {
          var p = S.parts[i];
          if (p.k === 3) { p.x += Math.sin((S.endT + p.ph * 10) * 0.05) * 0.2; if (p.y > 117) S.parts.splice(i, 1); }
        }
      }

      function updateCrash() {
        var h = S.hero;
        S.endT++;
        if (S.endT < 70) {
          h.vy = Math.min(h.vy + 0.18, 4);
          h.y += h.vy;
          if (S.shake) S.shake--;
        } else if ((pressed.a && S.endT > 90) || S.endT > 330) {
          fadeTo(resetTitle);
        }
      }

      function update() {
        S.t++;
        if (S.fade) {
          S.fade--;
          if (S.fade === FADE / 2 && S.fadeFn) {
            var fn = S.fadeFn;
            S.fadeFn = null;
            fn();
          }
          pressed = {};
          return;
        }
        if (S.mode === "title") updateTitle();
        else if (S.mode === "play") updatePlay();
        else if (S.mode === "pause") { if (pressed.a) { S.mode = "play"; sfx("step"); } }
        else if (S.mode === "deploy") updateDeploy();
        else if (S.mode === "shipped") updateShipped();
        else if (S.mode === "crash") updateCrash();
        updateParts();
        pressed = {};
      }

      /* ---------------------------------------------------------- render -- */
      function text(str, x, y, col, s, align) {
        s = s || 1;
        str = String(str).toUpperCase();
        var wpx = str.length * 4 * s - s;
        if (align === "center") x = Math.round(x - wpx / 2);
        else if (align === "right") x -= wpx;
        ctx.fillStyle = col;
        for (var i = 0; i < str.length; i++, x += 4 * s) {
          var g = FONT[str[i]];
          if (!g) continue;
          for (var r = 0; r < 5; r++) {
            var bits = g.charCodeAt(r) - 48, c = 0;
            while (c < 3) {
              if (bits & (4 >> c)) {
                var c0 = c;
                while (c < 3 && bits & (4 >> c)) c++;
                ctx.fillRect(x + c0 * s, y + r * s, (c - c0) * s, s);
              } else c++;
            }
          }
        }
      }
      function label2(str, x, y, s) { // ink text with a cream drop shadow
        text(str, x + 1, y + 1, C.cream, s, "center");
        text(str, x, y, C.ink, s, "center");
      }

      function layer(cv, off, alpha) {
        var w = cv.width;
        off = ((Math.round(off) % w) + w) % w;
        ctx.globalAlpha = alpha;
        ctx.drawImage(cv, -off, 0);
        if (w - off < W) ctx.drawImage(cv, w - off, 0);
      }
      function background(cx) {
        ctx.fillStyle = C.paper;
        ctx.fillRect(0, 0, W, H);
        layer(BG.dots, cx * 0.1, 0.22);
        layer(BG.racks, cx * 0.25, 0.1);
        layer(BG.traces, cx * 0.5, 0.2);
        ctx.globalAlpha = 1;
      }

      function drawHero(h, x, y, frame) {
        var f = HF[frame || heroFrame(h)];
        ctx.drawImage(h.face < 0 ? f.l : f.r, Math.round(x) - 1, Math.round(y) - 2);
      }

      function drawRack(x, y, t, live) {
        ctx.fillStyle = C.ink;
        ctx.fillRect(x, y, 16, 24);
        ctx.fillRect(x + 12, y - 4, 1, 4);
        ctx.fillStyle = C.cream;
        ctx.fillRect(x, y, 16, 1);
        ctx.fillRect(x + 2, y + 3, 12, 6);
        if (live || (t >> 4) & 1) ctx.fillRect(x + 11, y - 6, 3, 2);
        ctx.fillStyle = C.ink;
        ctx.fillRect(x + 3, y + 4, 1, 1);
        ctx.fillRect(x + 4, y + 5, 1, 1);
        ctx.fillRect(x + 3, y + 6, 1, 1);
        if (live || (t >> 4) & 1) ctx.fillRect(x + 6, y + 7, 3, 1);
        for (var i = 0; i < 3; i++) {
          var by = y + 12 + i * 4;
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = C.paper;
          ctx.fillRect(x + 2, by, 8, 1);
          ctx.globalAlpha = 1;
          var on = live ? ((t >> 2) + i) & 1 : ((t >> 5) + i * 3) % 4 === 0;
          if (on) { ctx.fillStyle = C.cream; ctx.fillRect(x + 12, by, 2, 1); }
        }
      }

      function drawParts(cx) {
        for (var i = 0; i < S.parts.length; i++) {
          var p = S.parts[i], x = Math.round(p.x - cx), y = Math.round(p.y);
          if (p.k === 0) {
            ctx.fillStyle = C.cream;
            var s = p.life > 10 ? 2 : 1;
            ctx.fillRect(x, y, s, s);
          } else if (p.k === 1) {
            if (p.life > 10 || p.life & 2) text(p.s, x, y, C.ink, 1, "center");
          } else if (p.k === 2) {
            ctx.fillStyle = C.cream;
            ctx.fillRect(x, y, 1, 1);
          } else if (p.k === 3) {
            ctx.drawImage(((S.endT >> 3) + i) & 1 ? SP.bit.r : SP.bitDim.r, x, y);
          }
        }
      }

      function renderWorld() {
        var w = S.world, h = S.hero, cx = Math.round(S.cam), t = S.t, i;
        var sx = 0, sy = 0;
        if (S.shake && !reduced) {
          var m = S.shake > 6 ? 2 : 1;
          sx = Math.round((Math.random() * 2 - 1) * m);
          sy = Math.round((Math.random() * 2 - 1) * m);
        }
        background(cx);
        ctx.save();
        ctx.translate(sx, sy);
        ctx.drawImage(levelCanvas, cx, 0, W, H, 0, 0, W, H);

        if (w.rack && w.rack.x - cx < W + 8 && w.rack.x - cx > -24) {
          var rx = w.rack.x - cx, ry = w.rack.y;
          drawRack(rx, ry, t, S.mode === "deploy");
          if (S.mode === "deploy") {
            var pct = Math.min(1, S.endT / 70);
            ctx.fillStyle = C.ink;
            ctx.fillRect(rx - 4, ry - 17, 24, 6);
            ctx.fillStyle = C.cream;
            ctx.fillRect(rx - 3, ry - 16, Math.round(22 * pct), 4);
            if (pct >= 1) text("OK!", rx + 8, ry - 25, C.ink, 1, "center");
          } else {
            text("DEPLOY", rx + 8, ry - 15, C.ink, 1, "center");
          }
        }
        if (w.cp) {
          var gx = w.cp.x - cx;
          if (gx > -10 && gx < W + 2) {
            ctx.drawImage(SP.pedestal.r, gx, w.cp.ground - 4);
            var bob = w.cp.on && !reduced ? Math.round(Math.sin(t * 0.08)) : 0;
            ctx.drawImage(w.cp.on ? SP.floppyOn.r : SP.floppyOff.r, gx, w.cp.ground - 14 + bob);
          }
        }
        for (i = 0; i < w.bits.length; i++) {
          var b = w.bits[i];
          if (b.got || b.x - cx < -6 || b.x - cx > W + 6) continue;
          var by = Math.round(Math.sin(t * 0.07 + b.x * 0.05) * 1.4);
          ctx.drawImage((t + b.x * 3) % 100 < 80 ? SP.bit.r : SP.bitDim.r, b.x - 2 - cx, b.y - 2 + by);
        }
        for (i = 0; i < w.enemies.length; i++) {
          var e = w.enemies[i], ex = Math.round(e.x) - cx, ey = Math.round(e.y);
          if (ex < -12 || ex > W + 4) continue;
          if (e.dead) {
            ctx.drawImage(SP.flat.r, ex + (e.w >> 1) - 5, ey + e.h - 7);
          } else if (e.type === "b") {
            var bs = (e.anim >> 3) & 1 ? SP.bug1 : SP.bug0;
            ctx.drawImage(e.dir > 0 ? bs.r : bs.l, ex - 1, ey + e.h - 7);
          } else if (e.type === "h") {
            var hs = !e.ground ? SP.hopAir : e.wait < 10 ? SP.hopCrouch : SP.hopStand;
            ctx.drawImage(hs.r, ex - 1, ey + e.h - 8);
          } else {
            ctx.drawImage(((e.anim >> 2) & 1 ? SP.flyUp : SP.flyDown).r, ex - 1, ey - 2);
          }
        }
        var blink = h.inv && h.hurtT <= 12 && S.mode === "play" && (h.inv & 4);
        if (!blink) drawHero(h, h.x - cx, h.y);
        drawParts(cx);
        ctx.restore();

        // HUD
        ctx.fillStyle = C.ink;
        ctx.fillRect(0, 0, W, 9);
        for (i = 0; i < 3; i++) {
          if (i < S.hearts) ctx.drawImage(SP.heart.r, 2 + i * 9, 2);
          else { ctx.globalAlpha = 0.45; ctx.drawImage(SP.heartEmpty.r, 2 + i * 9, 2); ctx.globalAlpha = 1; }
        }
        ctx.drawImage(SP.bit.r, 46, 2);
        text(S.bits + "/" + w.bits.length, 53, 2, C.cream);
        text(fmtTime(S.mode === "play" ? S.time : S.finalTime || S.time), W - 2, 2, C.cream, 1, "right");
      }

      function panel(x, y, w, h) {
        ctx.fillStyle = C.ink;
        ctx.fillRect(x + 1, y + 1, w, h);
        ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
        ctx.fillStyle = C.cream;
        ctx.fillRect(x, y, w, h);
      }

      function renderPause() {
        ctx.globalAlpha = 0.55;
        ctx.fillStyle = C.ink;
        ctx.fillRect(0, 9, W, H - 9);
        ctx.globalAlpha = 1;
        panel(24, 56, 80, 46);
        text("PAUSED", 64, 62, C.ink, 2, "center");
        text("A RESUME", 64, 80, C.ink, 1, "center");
        text("B QUIT", 64, 90, C.ink, 1, "center");
      }

      function renderTitle() {
        var r = S.ti, t = S.t;
        background(reduced ? 0 : t * 0.3);
        ctx.drawImage(strip, 0, 124);
        label2("BUG", 64, 16, 4);
        label2("SQUASH", 64, 42, 2);
        text("STOMP BUGS. SHIP CODE.", 64, 60, C.ink, 1, "center");
        // floating bits
        for (var i = 0; i < 3; i++) {
          var bx = 78 + i * 12, by = 84 - (i === 1 ? 6 : 0) + Math.round(Math.sin(t * 0.07 + i) * 1.4);
          ctx.drawImage((t + i * 30) % 100 < 80 ? SP.bit.r : SP.bitDim.r, bx, by);
        }
        // bug and robot
        var bx2 = Math.round(r.bugX);
        if (r.bugFlat) ctx.drawImage(SP.flat.r, bx2 - 1, 117);
        else if (!r.wait) ctx.drawImage(((t >> 3) & 1 ? SP.bug1 : SP.bug0).l, bx2 - 1, 117);
        var frame = !r.ground ? (r.vy < 0 ? "jump" : "fall") : r.land ? "land" : (t % 200 < 8 ? "blink" : "idle");
        drawHero({ face: 1 }, r.x, r.y, frame);
        drawParts(0);
        if (reduced || (t >> 5) & 1 || t < 32) text("A START", 64, 133, C.cream, 1, "center");
        text("B LEAVE", 64, 142, C.cream, 1, "center");
        if (S.best) {
          ctx.globalAlpha = 0.6;
          text("BEST " + fmtTime(S.best, true), 64, 152, C.cream, 1, "center");
          ctx.globalAlpha = 1;
        }
      }

      function renderShipped() {
        var t = S.endT, w = S.world;
        background(0);
        ctx.drawImage(strip, 0, 124);
        drawParts(0);
        label2("SHIPPED!", 64, 8, 2);
        panel(18, 26, 92, 44);
        var rows = [
          ["BITS", S.bits + "/" + w.bits.length],
          ["BUGS", S.fixed + "/" + w.enemyCount],
          ["TIME", fmtTime(S.finalTime, true)],
          ["BEST", S.newBest ? ((t >> 4) & 1 || reduced ? "NEW!" : "") : fmtTime(S.best, true)]
        ];
        for (var i = 0; i < rows.length; i++) {
          text(rows[i][0], 24, 31 + i * 9, C.ink);
          text(rows[i][1], 104, 31 + i * 9, C.ink, 1, "right");
        }
        drawRack(84, 100, t, true);
        var hop = reduced ? 0 : Math.abs(Math.sin(t * 0.08)) * 10;
        var frame = hop > 1 ? (Math.cos(t * 0.08) * Math.sin(t * 0.08) > 0 ? "jump" : "fall") : "idle";
        drawHero({ face: 1 }, 58, 113 - Math.round(hop), frame);
        text("A AGAIN", 64, 134, C.cream, 1, "center");
        text("B TITLE", 64, 143, C.cream, 1, "center");
      }

      function renderCrash() {
        background(0);
        ctx.drawImage(strip, 0, 124);
        label2("CRASHED", 64, 30, 2);
        text("OUT OF HEARTS", 64, 50, C.ink, 1, "center");
        drawHero({ face: 1 }, 59, 113, "hurt");
        if (!reduced && (S.t >> 3) % 6 < 3) { // a wisp of smoke
          ctx.globalAlpha = 0.35;
          ctx.fillStyle = C.ink;
          var sm = (S.t >> 3) % 6;
          ctx.fillRect(66 + sm, 104 - sm * 3, 2, 2);
          ctx.globalAlpha = 1;
        }
        text("A TITLE", 64, 134, C.cream, 1, "center");
      }

      function render() {
        if (S.mode === "title") renderTitle();
        else if (S.mode === "shipped") renderShipped();
        else if (S.mode === "crash" && S.endT >= 70) renderCrash();
        else {
          renderWorld();
          if (S.mode === "pause") renderPause();
        }
        if (S.fade) {
          ctx.globalAlpha = 1 - Math.abs(S.fade - FADE / 2) / (FADE / 2);
          ctx.fillStyle = C.ink;
          ctx.fillRect(0, 0, W, H);
          ctx.globalAlpha = 1;
        }
      }

      /* ------------------------------------------------------------ back -- */
      // B may arrive through input("b") and back() for the same press; act once.
      var lastB = -1e9, bHoldActed = false;
      function doBack() {
        if (S.fade) return true;
        if (S.mode === "title") return false;
        if (S.mode === "play") { S.mode = "pause"; sfx("step"); return true; }
        if (S.mode === "deploy") return true;
        fadeTo(resetTitle); // pause, shipped, crash
        return true;
      }
      function pressB() {
        var now = performance.now();
        if (now - lastB < 250) return true;
        var used = doBack();
        if (used) lastB = now;
        return used;
      }

      /* ------------------------------------------------------------ loop -- */
      var stopped = false, raf = 0, last = performance.now(), acc = 0;
      function frame(now) {
        if (stopped) return;
        if (!canvas.isConnected) { stop(); return; }
        raf = requestAnimationFrame(frame);
        var dt = now - last;
        last = now;
        if (document.hidden) { acc = 0; return; }
        if (dt > 1000 && S.mode === "play") S.mode = "pause";
        acc += Math.max(0, Math.min(dt, 100));
        var n = 0;
        while (acc >= STEP - 1 && n < 6) { update(); acc -= STEP; n++; }
        if (n === 6) acc = 0;
        render();
      }
      function onVis() {
        if (document.hidden) { if (S.mode === "play") S.mode = "pause"; }
        else { last = performance.now(); acc = 0; }
      }
      function stop() {
        if (stopped) return;
        stopped = true;
        cancelAnimationFrame(raf);
        document.removeEventListener("visibilitychange", onVis);
      }

      resetTitle();
      document.addEventListener("visibilitychange", onVis);
      render();
      raf = requestAnimationFrame(frame);

      // Dev hook for tests: never passed by the console.
      if (opts.debug && typeof opts.debug === "object") {
        opts.debug.S = S;
        opts.debug.LV = LV;
        opts.debug.PHYS = PHYS;
        opts.debug.step = update;
        opts.debug.render = render;
        opts.debug.go = { newGame: newGame, shipped: toShipped, crash: toCrash, title: resetTitle, camera: camera };
      }

      return {
        input: function (act, down) {
          if (stopped || !(act in held)) return;
          down = !!down;
          if (down && !held[act]) {
            held[act] = true;
            if (act === "b") bHoldActed = pressB();
            else pressed[act] = true;
          } else if (!down && held[act]) {
            held[act] = false;
            if (act === "b") bHoldActed = false;
          }
        },
        back: function () {
          if (stopped) return false;
          if (held.b && bHoldActed) return true;
          return pressB();
        },
        stop: stop,
        label: function () {
          var total = S.world ? S.world.bits.length : LV.spawns.filter(function (s) { return s.k === "o"; }).length;
          switch (S.mode) {
            case "title": return "Bug Squash, title screen. A to start, B to leave.";
            case "play": return "Bug Squash, playing. " + S.hearts + " of 3 hearts, " + S.bits + " of " + total + " bits, time " + fmtTime(S.time) + ".";
            case "pause": return "Bug Squash, paused. A to resume, B to quit.";
            case "deploy": return "Bug Squash, deploying.";
            case "shipped": return "Bug Squash, shipped! " + S.bits + " of " + total + " bits in " + fmtTime(S.finalTime, true) + ". A to play again, B for title.";
            case "crash": return "Bug Squash, crashed. Out of hearts.";
          }
          return "Bug Squash";
        }
      };
    }
  };
})();
