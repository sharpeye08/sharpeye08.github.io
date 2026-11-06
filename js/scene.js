(() => {
  "use strict";

  /* The opening scene, a flat-lay seen from straight above: the page is the
     desk, and on it lie the console, a printed sheet, a notepad with the
     headline, a business card with the links, a sticky note, a polaroid,
     and rendered props (a mug, a pen, glasses and the like).
     Click the console and it lifts toward you while everything else slides
     aside, then the cartridges come out; click the paper and the one-page
     version lifts up to be read in place.
     app.js keeps running underneath. This file only transforms .unit, hides
     the cartridges while the console is down, keeps app.js's keys away
     meanwhile, and asks it to re-measure once the console is up. */

  const $ = (sel, el = document) => el.querySelector(sel);
  const body = document.body;
  const room = $(".room");
  const stage = $("#stage");
  const unit = $("#unit");
  const scene = $("#scene");
  const desk = $("#desk");
  const pick = $("#pickup");
  const paper = $("#paper");
  const down = $("#putdown");
  const announce = $("#announce");
  if (!room || !stage || !unit || !scene || !desk || !pick || !paper || !down) return;
  const items = {
    pad: $(".pad", desk),
    card: $(".card", desk),
    sticky: $(".sticky", desk),
    polaroid: $(".polaroid", desk),
  };
  const props = {};
  for (const el of desk.querySelectorAll(".prop[data-prop]")) props[el.dataset.prop] = el;

  /* The rendered props (assets/props/*.webp): each image's size in design
     pixels (its pixels / 2.5), with the object centred in it and room around
     for its shadow. The mug's coffee is a share of its image's width. */
  const PROP_SIZE = {
    mug: [324, 388],
    pen: [180, 300],
    pencil: [264, 68],
    watch: [240, 372],
    glasses: [276, 172],
    earbuds: [184, 200],
    duck: [204, 260],
    "clip-a": [81.6, 63.2],
    "clip-b": [83.2, 48.8],
  };
  const COFFEE = (84.5 * 2) / 324; // the coffee's diameter over the mug image's width
  // the real size once the image is in (so a re-render needs no edit here)
  const propSize = (name) => {
    const img = props[name] && props[name].querySelector("img");
    return img && img.naturalWidth ? [img.naturalWidth / 2.5, img.naturalHeight / 2.5] : PROP_SIZE[name];
  };
  /* The watch, in design pixels of its image: the dial's radius and the
     small seconds dial (offset from the centre, radius). turn is the angle
     the render was baked at, so the hands turn with the printed dial. */
  const WATCH = { turn: -20, dial: 37, sub: { x: 5.8, y: 16, r: 9.6 } };
  const TZ = { name: "IST", place: "Dehradun", offset: 330 }; // minutes east of UTC
  const ORDER = "Black, no sugar.";

  // timings, matching scene.css
  const LIFT = 750; // the console or the paper rising (--lift)
  const CART_IN = 250; // each cartridge coming out
  const CART_GAP = 40; // between cartridges
  const SETTLE_WAIT = 260; // put down: the cartridges go first

  const motionMq = matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => motionMq.matches;

  const CON_TURN = -8;
  const SHEET = {
    size: 0.75, // its height, as a share of the lying console's
    ratio: Math.SQRT2, // A4
    turn: 7,
    drop: 0.12, // its centre sits this much (of the console's height) lower
    tuck: 0.1, // its corner slips this far (of its width) under the console
  };

  /* The flat-lays, in design pixels. The frame is scaled to fit the screen
     (contain), so everything keeps its place and proportion. x, y are
     centres, r is the turn in degrees; the console's width sets its height,
     the paper is placed from the console, and the mug is cropped by an edge
     of the screen (inset from that edge, in design pixels). props are the
     rendered things, at their own size times s (and k); a missing one is left off. */
  const LAYOUTS = {
    wide: {
      w: 1240,
      h: 860,
      s: 1,
      console: { x: 590, y: 468, w: 220 },
      pad: { x: 205, y: 280, w: 272, h: 372, r: -4, title: 33, text: 15.5 },
      card: { x: 226, y: 690, w: 262, h: 150, r: 5 },
      sticky: { x: 424, y: 560, w: 132, h: 132, r: 7 },
      polaroid: { x: 478, y: 142, w: 150, h: 182, r: -7 },
      mug: { edge: "right", inset: 62, y: 140 },
      props: {
        pen: { x: 1012, y: 640 },
        pencil: { x: 212, y: 548 },
        watch: { x: 800, y: 150 },
        glasses: { x: 1125, y: 795 },
        earbuds: { x: 1142, y: 428 },
        duck: { x: 640, y: 780, k: 0.8 },
        "clip-a": { x: 930, y: 318 },
        "clip-b": { x: 404, y: 700 },
      },
    },
    tall: {
      w: 820,
      h: 1100,
      s: 1,
      console: { x: 330, y: 690, w: 220 },
      pad: { x: 240, y: 235, w: 290, h: 380, r: -4, title: 34, text: 16 },
      card: { x: 590, y: 1002, w: 262, h: 150, r: 5 },
      sticky: { x: 146, y: 880, w: 132, h: 132, r: -7 },
      polaroid: { x: 705, y: 470, w: 150, h: 182, r: 6 },
      mug: { edge: "right", inset: 58, y: 150 },
      props: {
        pen: { x: 520, y: 330 },
        pencil: { x: 205, y: 470 },
        watch: { x: 728, y: 770 },
        glasses: { x: 215, y: 1032 },
        duck: { x: 108, y: 640, k: 0.8 },
        "clip-a": { x: 640, y: 560 },
        "clip-b": { x: 418, y: 950 },
      },
    },
    phone: {
      w: 390,
      h: 844,
      s: 0.68,
      console: { x: 134, y: 466, w: 140 },
      pad: { x: 194, y: 150, w: 320, h: 256, r: -3, title: 29, text: 14 },
      card: { x: 180, y: 758, w: 244, h: 140, r: 4 },
      sticky: { x: 62, y: 622, w: 96, h: 96, r: -7 },
      polaroid: null,
      mug: { edge: "bottom-right", inset: 26, insetY: 34 },
      props: {
        pencil: { x: 200, y: 312 },
        "clip-a": { x: 346, y: 640 },
      },
    },
  };
  const ASIDE = 48; // how far things slide away from the console, in design pixels

  let spots = {}; // where each prop lies, in design pixels
  let seen = null; // the part of the frame on screen
  let note = null; // the little card the mug and the watch open
  let noteFor = "";
  let state = "table"; // table | hand | paper | moving
  let animating = false;
  let dirty = false;
  let geo = null;
  let held = ""; // the key that picked something up, until it is released
  let opener = null;
  let reader = null;
  let sheet = null;
  let page = null;
  let frame = null;

  const fix = (n) => n.toFixed(2);
  const rad = (deg) => (deg * Math.PI) / 180;
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const slots = () => [...stage.querySelectorAll(".slot")];

  // layout position in page pixels, ignoring transforms
  const box = (el) => {
    let x = 0;
    let y = 0;
    for (let e = el; e; e = e.offsetParent) {
      x += e.offsetLeft;
      y += e.offsetTop;
    }
    return { x, y, w: el.offsetWidth, h: el.offsetHeight };
  };

  const cartInUrl = () => {
    try {
      const id = new URL(location.href).searchParams.get("c");
      return !!id && !!stage.querySelector(`.cart[data-id="${CSS.escape(id)}"]`);
    } catch (_) {
      return false;
    }
  };

  function say(text) {
    if (!announce) return;
    announce.textContent = "";
    requestAnimationFrame(() => (announce.textContent = text));
  }

  /* ---------------------------------------------------------------
     Layout: pick the flat-lay for this screen, scale it to fit, put the
     real console where the design says, and the paper beside it
  ---------------------------------------------------------------- */
  // where the paper lies, from the console's centre: its lower left corner
  // tucked just under the console's right edge
  function paperSpot(cw, ch) {
    const ph = ch * SHEET.size;
    const pw = ph / SHEET.ratio;
    const pdy = ch * SHEET.drop;
    const ct = rad(CON_TURN);
    const pt = rad(SHEET.turn);
    const cornerY = pdy - (pw / 2) * Math.sin(pt) + (ph / 2) * Math.cos(pt);
    const along = (cornerY + (cw / 2) * Math.sin(-ct)) / Math.cos(ct);
    const edgeX = (cw / 2) * Math.cos(ct) - along * Math.sin(ct);
    const pdx = edgeX + (pw / 2) * Math.cos(pt) + (ph / 2) * Math.sin(pt) - pw * SHEET.tuck;
    return { pw, ph, pdx, pdy };
  }

  // the console's centre in the frame; things slide away from it
  let hub = { x: 0, y: 0 };
  // where the frame sits on the page, for the lamp (css/desk.css): it stands
  // at (-14u, -18u) from the page's corner, its light reaching ~150u x 112u
  let frameAt = { x: 0, y: 0, f: 1, u: 15 };

  // how much lamp light falls here (dark mode dims things by it: --lit)
  function lit(x, y) {
    const { u } = frameAt;
    const px = frameAt.x + x * frameAt.f + 14 * u;
    const py = frameAt.y + y * frameAt.f + 18 * u;
    return (0.92 - 0.3 * Math.min(1, Math.hypot(px / (150 * u), py / (112 * u)))).toFixed(3);
  }

  function place(el, x, y, w, h, r) {
    if (!el) return;
    const st = el.style;
    st.setProperty("--x", `${fix(x - w / 2)}px`);
    st.setProperty("--y", `${fix(y - h / 2)}px`);
    st.setProperty("--w", `${fix(w)}px`);
    st.setProperty("--h", `${fix(h)}px`);
    st.setProperty("--r", `${r || 0}deg`);
    const dx = x - hub.x;
    const dy = y - hub.y;
    const d = Math.hypot(dx, dy) || 1;
    st.setProperty("--ax", `${fix((dx / d) * ASIDE)}px`);
    st.setProperty("--ay", `${fix((dy / d) * ASIDE)}px`);
    st.setProperty("--lit", lit(x, y));
  }

  function layout() {
    if (animating) {
      dirty = true;
      return;
    }
    const r = box(room);
    const u = box(unit);
    const W = r.w;
    const H = Math.min(r.h, window.innerHeight);
    const kind = W < 600 ? "phone" : W / H < 1.1 ? "tall" : "wide";
    const L = LAYOUTS[kind];
    const f = Math.min(W / L.w, H / L.h);
    const ox = (W - L.w * f) / 2;
    const oy = (H - L.h * f) / 2;
    desk.dataset.layout = kind;
    const ds = desk.style;
    ds.setProperty("--desk-x", `${fix(ox)}px`);
    ds.setProperty("--desk-y", `${fix(oy)}px`);
    ds.setProperty("--desk-w", `${L.w}px`);
    ds.setProperty("--desk-h", `${L.h}px`);
    ds.setProperty("--desk-f", f.toFixed(4));

    // the console, at its true proportions; the invisible button lies over it
    const c = L.console;
    const ch = (c.w * u.h) / u.w;
    hub = { x: c.x, y: c.y };
    frameAt = { x: r.x + ox, y: r.y + oy, f, u: Math.min(Math.max(innerWidth, innerHeight) / 100, 15) };
    unit.style.setProperty("--lit", lit(c.x, c.y));
    place(pick, c.x, c.y, c.w, ch, CON_TURN);
    pick.style.setProperty("--round", `${fix(c.w * 0.07)}px`);
    const ux = u.x - r.x + u.w / 2;
    const uy = u.y - r.y + u.h / 2;

    // the paper beside it
    const p = paperSpot(c.w, ch);
    const px = c.x + p.pdx;
    const py = c.y + p.pdy;
    place(paper, px, py, p.pw, p.ph, SHEET.turn);

    const { pad, card, sticky, polaroid } = items;
    place(pad, L.pad.x, L.pad.y, L.pad.w, L.pad.h, L.pad.r);
    if (pad) {
      pad.style.setProperty("--title", `${L.pad.title}px`);
      pad.style.setProperty("--text", `${L.pad.text}px`);
    }
    place(card, L.card.x, L.card.y, L.card.w, L.card.h, L.card.r);
    place(sticky, L.sticky.x, L.sticky.y, L.sticky.w, L.sticky.h, L.sticky.r);
    if (sticky) {
      // its hand-drawn arrow points at the console
      const a = (Math.atan2(c.y - L.sticky.y, c.x - L.sticky.x) * 180) / Math.PI - L.sticky.r;
      sticky.style.setProperty("--arrow", `${fix(a)}deg`);
    }
    if (polaroid) {
      const q = L.polaroid;
      polaroid.hidden = !q;
      if (q) place(polaroid, q.x, q.y, q.w, q.h, q.r);
    }

    // the rendered props, upright (their light is baked in)
    const s = L.s || 1;
    spots = {};
    for (const name in props) {
      if (name === "mug") continue;
      const spot = L.props && L.props[name];
      const el = props[name];
      el.hidden = !spot;
      if (!spot) continue;
      const [pw, ph] = propSize(name);
      const k = (spot.k || 1) * s;
      spots[name] = { x: spot.x, y: spot.y, w: pw * k, h: ph * k };
      place(el, spot.x, spot.y, spots[name].w, spots[name].h, 0);
    }
    const mug = props.mug;
    if (mug) {
      // cropped by the edge of the screen, wherever that falls in the frame
      const m = L.mug;
      const mx = (W - ox) / f - m.inset;
      const my = m.edge === "bottom-right" ? (H - oy) / f - m.insetY : m.y;
      const [gw, gh] = propSize("mug");
      spots.mug = { x: mx, y: my, w: gw * s, h: gh * s };
      place(mug, mx, my, spots.mug.w, spots.mug.h, 0);
      mug.style.setProperty("--coffee", `${(COFFEE * 100).toFixed(2)}%`);
    }
    if (props.watch) {
      // the live hands sit on the dial, at the image centre
      const ws = props.watch.style;
      // the dial as a share of the image; the small dial as a share of the dial
      const pc = (n) => `${(n * 100).toFixed(3)}%`;
      ws.setProperty("--dial", pc((WATCH.dial * 2) / propSize("watch")[0]));
      ws.setProperty("--sub-x", pc(WATCH.sub.x / (WATCH.dial * 2)));
      ws.setProperty("--sub-y", pc(WATCH.sub.y / (WATCH.dial * 2)));
      ws.setProperty("--sub", pc(WATCH.sub.r / WATCH.dial));
    }
    // what part of the frame is on screen (the mug may lie past its edge)
    seen = { x0: -ox / f, x1: (W - ox) / f, y0: -oy / f, y1: (H - oy) / f, phone: kind === "phone" };
    if (note && !note.hidden && noteFor) aim(noteFor);

    geo = {
      lying: `translate(${fix(ox + c.x * f - ux)}px, ${fix(oy + c.y * f - uy)}px) rotate(${CON_TURN}deg) scale(${((c.w * f) / u.w).toFixed(4)})`,
      flat: "translate(0px, 0px) rotate(0deg) scale(1)",
      // the paper on screen, in room pixels
      paperX: ox + px * f,
      paperY: oy + py * f,
      paperW: p.pw * f,
    };
    if (state === "table" || state === "paper") lay();
  }

  function lay() {
    unit.style.transform = geo.lying;
  }

  /* ---------------------------------------------------------------
     The mug and the watch: each opens a little handwritten card. The
     watch also keeps my real time (IST) on its hands.
  ---------------------------------------------------------------- */
  // my time now, as a Date whose UTC fields read as IST
  const myNow = () => new Date(Date.now() + TZ.offset * 60000);
  const clock = (t) => {
    const h = t.getUTCHours();
    return `${((h + 11) % 12) + 1}:${String(t.getUTCMinutes()).padStart(2, "0")} ${h < 12 ? "am" : "pm"}`;
  };
  const span = (min) => {
    const h = Math.floor(min / 60);
    const m = min % 60;
    return [h ? `${h} h` : "", m ? `${m} min` : ""].filter(Boolean).join(" ");
  };
  function doing(h) {
    if (h < 7) return "I'm probably asleep.";
    if (h < 9) return "I'm probably on my first coffee.";
    if (h < 19) return "I'm probably at work.";
    if (h < 23) return "I'm probably on a side project.";
    return "I'm probably still debugging.";
  }

  const NOTES = {
    mug() {
      const h = myNow().getUTCHours();
      const cups = h < 8 ? 0 : Math.min(5, 1 + Math.floor((h - 8) / 3));
      return `<p class="note-head">My order</p>
        <p class="note-big">${ORDER}</p>
        <p class="note-line">Cups so far today: <b>${cups ? `~${cups}` : "none yet"}</b></p>
        <p class="note-small">It's ${clock(myNow())} in ${TZ.place}.</p>`;
    },
    watch() {
      const t = myNow();
      const diff = -new Date().getTimezoneOffset() - TZ.offset; // you, minus me
      const rel = diff === 0 ? "We're in the same time zone." : `You're ${span(Math.abs(diff))} ${diff < 0 ? "behind" : "ahead of"} me.`;
      return `<p class="note-head">My time</p>
        <p class="note-big">${clock(t)} <span>${TZ.name}</span></p>
        <p class="note-line">${rel}</p>
        <p class="note-small">${doing(t.getUTCHours())}</p>`;
    },
  };

  // the card goes beside the thing, on whichever side has room
  function aim(name) {
    const sp = spots[name];
    if (!sp || !seen) return;
    const nw = seen.phone ? 196 : 232;
    const nh = seen.phone ? 132 : 150;
    const gap = 14;
    const right = sp.x < (seen.x0 + seen.x1) / 2;
    let x = right ? sp.x + sp.w * 0.32 + gap + nw / 2 : sp.x - sp.w * 0.32 - gap - nw / 2;
    let y = sp.y;
    x = Math.min(Math.max(x, seen.x0 + nw / 2 + 12), seen.x1 - nw / 2 - 12);
    y = Math.min(Math.max(y, seen.y0 + nh / 2 + 12), seen.y1 - nh / 2 - 12);
    place(note, x, y, nw, nh, right ? 2 : -2);
  }

  function openNote(name) {
    if (state !== "table" || !NOTES[name]) return;
    if (!note) {
      note = document.createElement("div");
      note.className = "note";
      note.id = "deskNote";
      note.setAttribute("role", "status");
      note.hidden = true;
      note.addEventListener("click", closeNote);
      desk.appendChild(note);
    }
    if (noteFor && props[noteFor]) props[noteFor].setAttribute("aria-expanded", "false");
    noteFor = name;
    note.innerHTML = NOTES[name]();
    note.hidden = false;
    aim(name);
    props[name].setAttribute("aria-expanded", "true");
    // replay the pop-in
    note.classList.remove("in");
    void note.offsetWidth;
    note.classList.add("in");
  }

  function closeNote() {
    if (!note || note.hidden) return;
    note.hidden = true;
    if (noteFor && props[noteFor]) props[noteFor].setAttribute("aria-expanded", "false");
    noteFor = "";
  }

  for (const name of ["mug", "watch"]) {
    const el = props[name];
    if (!el) continue;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (noteFor === name) return closeNote();
      openNote(name);
      if (name === "mug" && !reduced()) {
        // a stir: the coffee ripples and the steam puffs up
        el.classList.remove("stir");
        void el.offsetWidth;
        el.classList.add("stir");
      }
    });
  }
  if (props.mug)
    props.mug.addEventListener("animationend", (e) => {
      if (e.animationName === "ripple") props.mug.classList.remove("stir");
    });
  // a click anywhere else puts the card away
  document.addEventListener("pointerdown", (e) => {
    if (!noteFor || !note) return;
    if (note.contains(e.target) || (props[noteFor] && props[noteFor].contains(e.target))) return;
    closeNote();
  });

  // the hands: hour and minute on the dial, seconds on the small dial
  const hands = props.watch && props.watch.querySelector(".hands");
  function tick() {
    if (!hands) return;
    const t = myNow();
    const s = t.getUTCSeconds();
    const m = t.getUTCMinutes() + s / 60;
    const h = (t.getUTCHours() % 12) + m / 60;
    const st = props.watch.style;
    st.setProperty("--hour", `${(h * 30 + WATCH.turn).toFixed(2)}deg`);
    st.setProperty("--min", `${(m * 6 + WATCH.turn).toFixed(2)}deg`);
    st.setProperty("--sec", `${s * 6 + WATCH.turn}deg`);
    if (noteFor === "watch" && note && !note.hidden && s === 0) note.innerHTML = NOTES.watch();
  }
  tick();
  setInterval(() => {
    if (state === "table" && !document.hidden) tick();
  }, 1000);

  /* ---------------------------------------------------------------
     States
  ---------------------------------------------------------------- */
  function show(next) {
    state = next;
    animating = false;
    body.classList.remove("scene-moving", "scene-landing");
    body.classList.toggle("scene-table", next === "table");
    body.classList.toggle("scene-hand", next === "hand");
    body.classList.toggle("scene-paper", next === "paper");
    stage.inert = next !== "hand";
    room.inert = next === "paper";
    if (next === "hand") unit.style.transform = "";
    else lay();
    if (dirty) {
      dirty = false;
      layout();
    }
    tell();
    // Back or Forward arrived mid-move: catch up now
    if (lagging) {
      lagging = false;
      sync();
    }
  }

  // switch the body to the target state with transitions on, apply the end pose, finish later
  function move(to, ms, apply, done) {
    state = "moving";
    animating = true;
    closeNote();
    body.classList.remove("scene-table", "scene-hand", "scene-paper");
    body.classList.add("scene-moving", `scene-${to}`);
    apply();
    tell();
    setTimeout(done, ms + 40);
  }

  // app.js redraws the empty screen to suit the desk state
  const tell = () => window.dispatchEvent(new Event("scene"));

  /* ---------------------------------------------------------------
     History: picking the console up and lifting the paper each add an
     entry, so Back (the browser's, or a phone's) puts things down again.
     app.js owns ?c= (the cartridge); this owns history.state.scene and
     ?read=1. "ours" marks an entry this file pushed on top of the desk,
     which Back can simply undo.
  ---------------------------------------------------------------- */
  let lagging = false;
  const readInUrl = () => {
    try {
      return new URL(location.href).searchParams.get("read") === "1";
    } catch (_) {
      return false;
    }
  };
  const histScene = () => {
    const s = history.state && history.state.scene;
    if (s === "table" || s === "hand" || s === "paper") return s;
    if (readInUrl()) return "paper";
    return cartInUrl() ? "hand" : "table";
  };
  function mark(scene, push, url) {
    try {
      history[push ? "pushState" : "replaceState"]({ scene, ours: !!push }, "", url || location.href);
    } catch (_) {}
  }
  const ours = (scene) => !!history.state && history.state.scene === scene && history.state.ours === true;

  // make the desk match the history entry we are on
  function sync() {
    if (animating || state === "moving") {
      lagging = true;
      return;
    }
    const want = histScene();
    if (want === state) return;
    if (state === "hand") putDown({ history: true });
    else if (state === "paper") closePaper({ history: true });
    else if (want === "hand") pickUp({ history: true });
    else if (want === "paper") liftPaper(paper, false, { history: true });
  }

  /* ---------------------------------------------------------------
     The console: pick it up, put it down
  ---------------------------------------------------------------- */
  function pickUp(opts = {}) {
    if (state !== "table") return;
    if (!opts.history) mark("hand", true);
    const hadFocus = scene.contains(document.activeElement);
    const end = () => {
      show("hand");
      // app.js measures on resize; the console and the shelf are now where they really are
      window.dispatchEvent(new Event("resize"));
      if (hadFocus) stage.focus({ preventScroll: true });
      say("Console picked up. Pick a cartridge.");
    };
    if (reduced()) return end();
    const n = slots().length;
    move("hand", LIFT + Math.max(0, n - 1) * CART_GAP + CART_IN, () => (unit.style.transform = geo.flat), end);
  }

  async function putDown(opts = {}) {
    if (state !== "hand") return;
    // still on the entry the pick-up added: going back is putting it down
    if (!opts.history && ours("hand") && !cartInUrl()) return history.back();
    state = "moving"; // no keys or clicks while the cartridge comes out
    const hadFocus = document.activeElement === down;
    let ejected = false;
    if (!opts.history && stage.querySelector('.cart[aria-pressed="true"]')) {
      const eject = stage.querySelector('[data-act="eject"]');
      if (eject) {
        eject.click(); // app.js adds a history entry without ?c=
        ejected = true;
      }
      await wait(reduced() ? 0 : 520);
    }
    // the desk, as the entry the eject added (or a new one)
    if (!opts.history) mark("table", !ejected);
    if (window.scrollY > 0) window.scrollTo({ top: 0, behavior: reduced() ? "auto" : "smooth" });
    layout();
    stage.inert = true;
    const end = () => {
      show("table");
      if (hadFocus) pick.focus({ preventScroll: true });
    };
    if (reduced()) return end();
    // start from the upright pose written as the same functions, then lay it down
    unit.style.transform = geo.flat;
    void unit.offsetWidth;
    move("table", SETTLE_WAIT + LIFT, () => (unit.style.transform = geo.lying), end);
  }

  /* ---------------------------------------------------------------
     The paper: the one-page version, lifted off the desk
  ---------------------------------------------------------------- */
  function buildReader() {
    if (reader) return;
    reader = document.createElement("div");
    reader.className = "reader";
    reader.hidden = true;
    reader.innerHTML =
      '<div class="reader-sheet" role="dialog" aria-modal="true" aria-label="One-page portfolio">' +
      '<div class="reader-page"><button type="button" class="reader-down">Put it down</button></div></div>';
    body.appendChild(reader);
    sheet = reader.firstElementChild;
    page = sheet.firstElementChild;
    page.firstElementChild.addEventListener("click", closePaper);
    // a click on the dimmed desk around the sheet puts it down too
    reader.addEventListener("click", (e) => {
      if (e.target === reader) closePaper();
    });
  }

  // made on the first sign of interest, so the main page stays light
  function loadFrame() {
    buildReader();
    if (frame) return;
    frame = document.createElement("iframe");
    frame.className = "reader-frame";
    frame.title = "Dev Bansal, one-page portfolio";
    frame.src = "classic.html?embed=1";
    frame.addEventListener("load", () => {
      // Escape inside the sheet reaches this page's listener only through here
      try {
        frame.contentWindow.addEventListener("keydown", (e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            closePaper();
          }
        });
      } catch (_) {}
    });
    page.appendChild(frame);
  }

  // the transform, clip and shadow that put the big sheet exactly over the paper on the desk
  function sheetPose() {
    const w = sheet.offsetWidth;
    const h = sheet.offsetHeight;
    const cx = sheet.offsetLeft + w / 2;
    const cy = sheet.offsetTop + h / 2;
    const rr = room.getBoundingClientRect();
    // the A4 part of the big sheet that the small one stands for; the rest is clipped
    let vw = w;
    let vh = w * SHEET.ratio;
    if (vh > h) {
      vh = h;
      vw = h / SHEET.ratio;
    }
    const k = geo.paperW / vw;
    const ix = (w - vw) / 2;
    const iy = (h - vh) / 2;
    // shadows are drawn before the scale, so lying ones are sized up by 1/k
    const shade = (a, b, c, d, e) =>
      `drop-shadow(0px ${fix(a)}px ${fix(b)}px rgba(15, 7, 3, 0.5)) drop-shadow(${fix(c)}px ${fix(d)}px ${fix(e)}px rgba(15, 7, 3, 0.4))`;
    return {
      lying: `translate(${fix(rr.left + geo.paperX - cx)}px, ${fix(rr.top + geo.paperY - cy)}px) rotate(${SHEET.turn}deg) scale(${k.toFixed(4)})`,
      flat: "translate(0px, 0px) rotate(0deg) scale(1)",
      clipLying: `inset(${fix(iy)}px ${fix(ix)}px round ${fix(1 / k)}px)`,
      clipFlat: "inset(0px 0px round 2px)",
      shadeLying: shade(1 / k, 1.5 / k, 4 / k, 6 / k, 12 / k),
      shadeFlat: shade(3, 8, 18, 28, 50),
    };
  }

  function pose(p, which) {
    sheet.style.transform = p[which];
    sheet.style.filter = p[which === "lying" ? "shadeLying" : "shadeFlat"];
    page.style.clipPath = p[which === "lying" ? "clipLying" : "clipFlat"];
  }

  function focusFrame() {
    try {
      frame.focus({ preventScroll: true });
    } catch (_) {}
  }

  function liftPaper(from, instant, opts = {}) {
    if (state !== "table") return;
    if (!opts.history) {
      try {
        const u = new URL(location.href);
        u.searchParams.set("read", "1");
        mark("paper", true, u);
      } catch (_) {}
    }
    opener = from || paper;
    loadFrame();
    reader.hidden = false;
    body.classList.add("scene-reading");
    room.inert = true;
    const p = sheetPose();
    const end = () => {
      show("paper");
      pose(p, "flat");
      page.style.clipPath = "";
      focusFrame();
    };
    if (instant || reduced()) return end();
    pose(p, "lying");
    void sheet.offsetWidth;
    move("paper", LIFT, () => pose(p, "flat"), end);
  }

  function closePaper(opts = {}) {
    if (state !== "paper") return;
    // still on the entry the lift added: going back is putting it down
    if (!opts.history && ours("paper")) return history.back();
    const p = sheetPose();
    body.classList.remove("scene-reading");
    room.inert = false;
    const end = () => {
      show("table");
      reader.hidden = true;
      sheet.style.transform = "";
      sheet.style.filter = "";
      page.style.clipPath = "";
      // a ?read=1 link has done its job; a reload should start at the desk
      if (!opts.history) {
        try {
          const u = new URL(location.href);
          u.searchParams.delete("read");
          mark("table", false, u);
        } catch (_) {}
      }
      const back = opener && opener.isConnected ? opener : paper;
      back.focus({ preventScroll: true });
    };
    if (reduced()) return end();
    pose(p, "flat");
    void sheet.offsetWidth;
    body.classList.add("scene-landing");
    move("table", LIFT, () => pose(p, "lying"), end);
  }

  /* ---------------------------------------------------------------
     Input
  ---------------------------------------------------------------- */
  // a plain click (or Enter) lifts the paper; modified and middle clicks open classic.html
  const plainClick = (e) => e.button === 0 && !e.metaKey && !e.ctrlKey && !e.shiftKey && !e.altKey;

  pick.addEventListener("click", () => pickUp());
  down.addEventListener("click", () => putDown());
  paper.addEventListener("click", (e) => {
    if (!plainClick(e)) return;
    e.preventDefault();
    liftPaper(paper);
  });
  // the one-page links (business card, footer) lift the paper from the desk;
  // with the console in hand they simply navigate
  const plains = [...document.querySelectorAll(".plain-link, .card-plain")];
  for (const el of plains) {
    el.addEventListener("click", (e) => {
      if (state !== "table" || !plainClick(e)) return;
      e.preventDefault();
      liftPaper(el);
    });
  }
  // the sticky note says "pick me up"; a click on it does
  if (items.sticky) items.sticky.addEventListener("click", () => pickUp());
  for (const el of [paper, ...plains]) {
    el.addEventListener("pointerenter", loadFrame, { once: true });
    el.addEventListener("focus", loadFrame, { once: true });
  }

  // capture phase on window runs before app.js's document listeners
  window.addEventListener(
    "keydown",
    (e) => {
      if (state === "hand") {
        // a held Enter that picked the console up shouldn't also press A
        if (held && e.key === held) {
          e.stopImmediatePropagation();
          e.preventDefault();
        }
        return;
      }
      if (e.key === "Tab") return;
      e.stopImmediatePropagation();
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (state === "table" && e.key === "Escape" && noteFor) {
        e.preventDefault();
        const back = props[noteFor];
        closeNote();
        if (back) back.focus({ preventScroll: true });
        return;
      }
      if (state === "paper") {
        if (e.key === "Escape") {
          e.preventDefault();
          closePaper();
        }
        return;
      }
      if (state !== "table" || (e.key !== "Enter" && e.key !== " ")) return;
      if (!e.repeat) held = e.key;
      // links and buttons (the console, the paper, the card's links) activate themselves
      const a = document.activeElement;
      if (a && a !== body && a.closest && a.closest("a, button, input, select, textarea, iframe")) return;
      e.preventDefault();
      if (!e.repeat) pickUp();
    },
    true
  );
  window.addEventListener(
    "keyup",
    (e) => {
      if (e.key === held) held = "";
    },
    true
  );

  // Back and Forward: app.js's listener (added first) has already moved the
  // cartridge to match ?c=; this one moves the console and the paper
  window.addEventListener("popstate", sync);

  let frameReq = 0;
  const relayout = () => {
    if (!frameReq)
      frameReq = requestAnimationFrame(() => {
        frameReq = 0;
        layout();
      });
  };
  window.addEventListener("resize", relayout);
  if (window.ResizeObserver) {
    const ro = new ResizeObserver(relayout);
    ro.observe(room);
    ro.observe(stage);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(relayout);
  for (const name in props) {
    const img = props[name].querySelector("img");
    if (img && !img.complete) img.addEventListener("load", relayout, { once: true });
  }

  /* ---------------------------------------------------------------
     Start: at the desk, unless a link asks for the console or the paper
  ---------------------------------------------------------------- */
  stage.tabIndex = -1; // focus lands here after a keyboard pick-up
  // cartridges come out one after another
  slots().forEach((el, i) => el.style.setProperty("--i", i));

  // the notepad and the card carry the same words as the page (app.js has filled those in)
  const copy = (from, to) => {
    const a = $(from);
    const b = $(to);
    if (a && b && a.textContent.trim()) b.textContent = a.textContent.trim();
  };
  copy("#headline", "#padTitle");
  copy("#intro", "#padText");
  const P = window.PROFILE || {};
  const role = $("#cardRole");
  if (P.status && role) role.textContent = P.status.replace(/\.$/, "");
  // the email (from the Contact cartridge) leads the links on the card and in the footer
  const contact = (window.CARTRIDGES || []).find((c) => c.type === "contact");
  const mailLink = () => {
    const a = document.createElement("a");
    a.href = `mailto:${contact.email}`;
    a.textContent = "Email";
    return a;
  };
  const cardLinks = $("#cardLinks");
  if (P.links && P.links.length && cardLinks) {
    cardLinks.replaceChildren(
      ...P.links.map((l) => {
        const a = document.createElement("a");
        a.href = l.href;
        a.target = "_blank";
        a.rel = "noopener";
        a.textContent = l.label;
        return a;
      })
    );
  }
  if (contact && contact.email) {
    for (const list of [cardLinks, $("#links")]) {
      if (!list) continue;
      const old = list.querySelector('a[href^="mailto:"]');
      if (old) old.remove();
      list.prepend(mailLink());
    }
  }

  layout();
  // a reload keeps the history entry, so it keeps the state too
  const start = histScene();
  if (start === "paper") {
    show("table");
    liftPaper(paper, true, { history: true });
  } else show(start);
})();
