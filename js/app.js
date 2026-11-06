(() => {
  "use strict";

  /* Motion, sound and screen timings follow the reference cartridge build:
     spring physics for every cartridge, a short push and latch into the slot,
     a recoil on the console, Bayer-dithered screen transitions. */

  const $ = (sel, el = document) => el.querySelector(sel);
  const esc = (s) =>
    String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);

  const PROFILE = window.PROFILE || {};
  const CARTS = window.CARTRIDGES || [];
  const AVATAR = "assets/avatar-pixel.png";
  const motionMq = matchMedia("(prefers-reduced-motion: reduce)");
  const reduced = () => motionMq.matches;
  const coarseMq = matchMedia("(pointer: coarse)");
  const coarse = () => coarseMq.matches;

  const stage = $("#stage");
  const consoleEl = $("#console");
  const view = $("#view");
  const fx = $("#noise");
  const led = $("#led");
  const announce = $("#announce");
  const soundBtn = $("#soundBtn");
  const controls = consoleEl.querySelector(".controls");
  if (!stage.hasAttribute("tabindex")) stage.tabIndex = -1; // keyboard focus waits here after an insert

  /* ---------------------------------------------------------------
     Profile text
  ---------------------------------------------------------------- */
  if (PROFILE.headline) $("#headline").textContent = PROFILE.headline;
  if (PROFILE.intro) $("#intro").textContent = PROFILE.intro;
  if (PROFILE.status) $("#status").textContent = PROFILE.status;
  if (PROFILE.deviceName) $("#deviceName").textContent = PROFILE.deviceName;
  if (PROFILE.links && PROFILE.links.length) {
    $("#links").innerHTML = PROFILE.links
      .map((l) => `<a href="${esc(l.href)}" target="_blank" rel="noopener">${esc(l.label)}</a>`)
      .join("");
  }

  const art = (c) =>
    c.icon === "avatar"
      ? `<img src="${AVATAR}" alt="" draggable="false">`
      : typeof window.pixelSVG === "function"
        ? window.pixelSVG(c.icon)
        : "";

  /* ---------------------------------------------------------------
     Sound: synthesised, nothing loaded. Starts on the first press.
  ---------------------------------------------------------------- */
  let soundOn = true;
  try {
    soundOn = localStorage.getItem("sound") !== "off";
  } catch (_) {}

  const sfx = (() => {
    let ctx = null;
    let noise = null;
    const ac = () => {
      if (!soundOn) return null;
      // browsers refuse audio before the first press, so don't ask (and don't warn)
      const ua = navigator.userActivation;
      if (!ctx && ua && !ua.hasBeenActive) return null;
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        ctx = new AC();
        const len = Math.floor(ctx.sampleRate * 0.08);
        noise = ctx.createBuffer(1, len, ctx.sampleRate);
        const d = noise.getChannelData(0);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      }
      if (ctx.state === "suspended") ctx.resume().catch(() => {});
      return ctx;
    };
    const tone = (freq, dur, gain, type = "square", at = 0, slideTo) => {
      try {
        const c = ac();
        if (!c) return;
        const t = c.currentTime + at;
        const o = c.createOscillator();
        const g = c.createGain();
        o.type = type;
        o.frequency.setValueAtTime(freq, t);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(gain, t + 0.004);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(c.destination);
        o.start(t);
        o.stop(t + dur + 0.02);
      } catch (_) {}
    };
    const burst = (dur, gain, hp, at = 0) => {
      try {
        const c = ac();
        if (!c || !noise) return;
        const t = c.currentTime + at;
        const s = c.createBufferSource();
        s.buffer = noise;
        const f = c.createBiquadFilter();
        f.type = "highpass";
        f.frequency.value = hp;
        const g = c.createGain();
        g.gain.setValueAtTime(gain, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        s.connect(f).connect(g).connect(c.destination);
        s.start(t);
        s.stop(t + dur + 0.01);
      } catch (_) {}
    };
    return {
      // the latch: a bright snap over a low body thump
      click() {
        burst(0.03, 0.22, 2400);
        tone(140, 0.09, 0.22, "sine", 0, 60);
      },
      // spring release when a cartridge pops out
      eject() {
        burst(0.025, 0.14, 1800);
        tone(220, 0.12, 0.08, "triangle", 0.01, 520);
      },
      press() {
        burst(0.012, 0.08, 3200);
      },
      blip() {
        tone(980 + Math.random() * 120, 0.025, 0.018);
      },
      chime() {
        tone(659, 0.09, 0.035, "square", 0);
        tone(988, 0.22, 0.035, "square", 0.085);
      },
      page() {
        tone(740, 0.04, 0.025);
      },
      // Bug Squash (js/game.js)
      game: {
        jump() {
          tone(420, 0.09, 0.028, "square", 0, 840);
        },
        bit() {
          tone(1320, 0.05, 0.026);
          tone(1760, 0.07, 0.026, "square", 0.05);
        },
        stomp() {
          burst(0.03, 0.12, 900);
          tone(190, 0.09, 0.06, "triangle", 0, 80);
        },
        hurt() {
          tone(330, 0.22, 0.045, "sawtooth", 0, 90);
        },
        win() {
          [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.14, 0.03, "square", i * 0.09));
        },
        step() {
          burst(0.006, 0.025, 4200);
        },
      },
    };
  })();

  function setSound(on) {
    soundOn = on;
    soundBtn.setAttribute("aria-pressed", String(on));
    try {
      localStorage.setItem("sound", on ? "on" : "off");
    } catch (_) {}
    if (on) sfx.press();
  }
  soundBtn.setAttribute("aria-pressed", String(soundOn));

  /* ---------------------------------------------------------------
     Shelf: each cartridge stays in its socket in the DOM and moves by
     transform only, driven by the physics loop below.
  ---------------------------------------------------------------- */
  const half = Math.ceil(CARTS.length / 2);
  stage.style.setProperty("--rows", half);
  const unit = $("#unit");
  const bodies = [];
  const byId = {};

  CARTS.forEach((c, i) => {
    const slot = document.createElement("div");
    slot.className = "slot";
    slot.style.setProperty("--col", i < half ? 1 : 3);
    slot.style.setProperty("--row", (i % half) + 2);

    const el = document.createElement("button");
    el.type = "button";
    el.className = "cart";
    el.dataset.id = c.id;
    el.style.setProperty("--label", c.color);
    el.style.setProperty("--ink", c.ink || "#1d1a24");
    el.innerHTML = `<span class="ridges" aria-hidden="true"></span><span class="label"><span class="art" aria-hidden="true">${art(
      c
    )}</span><span class="name">${esc(c.label)}</span></span>`;
    slot.appendChild(el);
    // left column before the console in tab order, right column after it
    if (i < half) stage.insertBefore(slot, unit);
    else stage.appendChild(slot);

    const b = { id: c.id, cart: c, el, slot, x: 0, y: 0, vx: 0, vy: 0, r: 0, vr: 0, s: 1, vs: 0, mode: "home", under: false, t0: 0, y0: 0, hx: 0, hy: 0, css: "", z: "" };
    bodies.push(b);
    byId[c.id] = b;
  });
  const slots = byId; // the screen views look carts up here

  let inserted = null; // the cartridge that is in, or on its way in
  let pending = null; // waiting for the slot to clear before it goes in
  let selected = null; // picked with the d-pad while the console is empty
  let interacted = false;

  // the label stays fixed; aria-pressed alone says whether it is in (no double announcement)
  for (const b of bodies) b.el.setAttribute("aria-label", `${b.cart.label} cartridge`);

  function reflect() {
    for (const b of bodies) {
      b.el.setAttribute("aria-pressed", String(inserted === b.id));
      b.el.classList.toggle("is-selected", selected === b.id && !inserted);
    }
  }

  /* ---------------------------------------------------------------
     Geometry, in stage coordinates (read on resize only)
  ---------------------------------------------------------------- */
  const kick = { y: 0, v: 0 }; // the console recoils when a cartridge latches
  const geo = { cw: 0, ch: 0, slotX: 0, outY: 0, inY: 0, con: { left: 0, right: 0, top: 0, bottom: 0, width: 0 } };

  function measure() {
    if (!bodies.length) return;
    const sr = stage.getBoundingClientRect();
    const r = consoleEl.getBoundingClientRect();
    const con = { left: r.left - sr.left, right: r.right - sr.left, top: r.top - sr.top - kick.y, bottom: r.bottom - sr.top - kick.y, width: r.width };
    geo.con = con;
    geo.cw = bodies[0].slot.offsetWidth;
    geo.ch = bodies[0].slot.offsetHeight;
    geo.slotX = con.left + con.width / 2 - geo.cw / 2;
    geo.outY = con.bottom + 4;
    geo.inY = con.bottom - Math.round(geo.ch * 0.46);
    for (const b of bodies) {
      const s = b.slot.getBoundingClientRect();
      b.hx = s.left - sr.left;
      b.hy = s.top - sr.top;
      if (b.mode === "home") {
        b.x = b.hx;
        b.y = b.hy;
      } else if (b.mode === "in") {
        b.x = geo.slotX;
        b.y = geo.inY;
      }
    }
  }

  /* ---------------------------------------------------------------
     Insert / eject
  ---------------------------------------------------------------- */
  const readCart = () => {
    try {
      const c = new URL(location.href).searchParams.get("c");
      return c && byId[c] ? c : null;
    } catch (_) {
      return null;
    }
  };

  // a new entry only between empty and a cartridge; swapping one for another replaces it.
  // The entry keeps the desk state (scene.js reads history.state.scene on Back and Forward).
  function setURL(id, replace) {
    try {
      const u = new URL(location.href);
      if (id) u.searchParams.set("c", id);
      else u.searchParams.delete("c");
      const state = document.body.classList.contains("scene-hand")
        ? { scene: "hand" }
        : history.state && history.state.scene
          ? { scene: history.state.scene }
          : null;
      if (u.href !== location.href) history[replace ? "replaceState" : "pushState"](state, "", u);
    } catch (_) {}
  }

  function insert(id, opts = {}) {
    if (!byId[id]) return;
    interacted = true;
    if (opts.push !== false) setURL(id, !!inserted && inserted !== id);
    if (inserted === id) {
      // already in or on its way; a cartridge back on the shelf queues again
      if (byId[id].mode === "home") pending = id;
      return;
    }
    selected = null;
    if (inserted) pullOut(byId[inserted]);
    // the physics loop sends it in once the slot is clear
    pending = id;
    // on a phone you may have scrolled past the screen; bring it back
    const top = consoleEl.getBoundingClientRect().top;
    if (top < -40) window.scrollTo({ top: window.scrollY + top - 12, behavior: reduced() ? "auto" : "smooth" });
    inserted = id;
    reflect();
  }

  // pop a cartridge out if it reached the slot; one still on its way just goes back
  function pullOut(b) {
    if (b.mode === "in" || b.mode === "push" || b.mode === "tug") ejectBody(b);
    else if (b.mode === "align" || (b.mode === "drag" && !(grab && grab.b === b))) b.mode = "home";
  }

  function ejectBody(b) {
    sfx.eject();
    screenOff();
    b.mode = "out";
    b.vy = 520;
    b.el.classList.remove("is-lifted", "seated");
  }

  function eject(opts = {}) {
    interacted = true;
    if (!inserted) return;
    const b = byId[inserted];
    inserted = null;
    pending = null;
    if (opts.push !== false) setURL(null);
    pullOut(b);
    reflect();
  }

  function latch(b) {
    b.mode = "in";
    b.y = geo.inY - 5;
    b.vy = 0;
    b.el.classList.add("seated");
    sfx.click();
    if (navigator.vibrate) navigator.vibrate(14);
    kick.v = -150;
    bootScreen(b.id, false);
  }

  /* ---------------------------------------------------------------
     Pointer: drag a cartridge into the slot, tug one out, or tap
  ---------------------------------------------------------------- */
  let grab = null;

  function overConsole(px, py) {
    const c = geo.con;
    const pad = 24;
    const inCon = px > c.left - pad && px < c.right + pad && py > c.top - pad && py < c.bottom + pad;
    // the area under the slot counts too
    const inMouth = px > geo.slotX - 20 && px < geo.slotX + geo.cw + 20 && py > c.bottom && py < c.bottom + geo.ch * 0.6;
    return inCon || inMouth;
  }

  const stageXY = (e) => {
    const r = stage.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  };

  // pointer presses shouldn't move focus; keyboard focus still works. On the console's
  // buttons too: a clicked Eject kept focus, and the next Space or Enter (A) ejected again
  stage.addEventListener("mousedown", (e) => {
    if (e.target.closest(".cart, .controls [data-act]")) e.preventDefault();
  });

  stage.addEventListener("pointerdown", (e) => {
    const el = e.target.closest(".cart");
    if (!el || grab || e.button > 0) return;
    const b = byId[el.dataset.id];
    // moving under its own steam, or queued to go in
    if (b.mode === "push" || b.mode === "align" || b.mode === "out" || pending === b.id) return;
    const [px, py] = stageXY(e);
    const g = { b, pid: e.pointerId, sx: px, sy: py, ox: px - b.x, oy: py - b.y, moved: false, pulled: false, lx: px, lt: performance.now(), vx: 0, px, py, ready: false, held: false, holdTimer: 0 };
    grab = g;
    try {
      el.setPointerCapture(e.pointerId);
    } catch (_) {}
    // touch: a quick vertical swipe scrolls the page (touch-action: pan-y), so a
    // drag starts with a short hold; then the cartridge lifts and the page stays put
    if (e.pointerType === "touch") {
      g.holdTimer = setTimeout(() => {
        if (grab !== g || g.moved) return;
        g.held = true;
        if (b.mode !== "in") b.el.classList.add("is-lifted");
        if (navigator.vibrate) navigator.vibrate(8);
      }, HOLD_MS);
    }
  });

  // once a touch has held a cartridge, the finger drags it instead of scrolling
  stage.addEventListener(
    "touchmove",
    (e) => {
      if (grab && grab.held && e.cancelable) e.preventDefault();
    },
    { passive: false }
  );

  stage.addEventListener("pointermove", (e) => {
    if (!grab || e.pointerId !== grab.pid) return;
    const [px, py] = stageXY(e);
    grab.px = px;
    grab.py = py;
    const now = performance.now();
    const dtm = Math.max(1, now - grab.lt);
    grab.vx = grab.vx * 0.6 + ((px - grab.lx) / dtm) * 1000 * 0.4;
    grab.lx = px;
    grab.lt = now;
    const b = grab.b;
    if (!grab.moved && Math.hypot(px - grab.sx, py - grab.sy) > 6) {
      grab.moved = true;
      interacted = true;
      if (b.mode === "in") b.mode = "tug";
      else {
        b.mode = "drag";
        b.el.classList.add("is-lifted");
      }
    }
    if (b.mode === "tug" && py - grab.sy > 64) {
      // pulled far enough: it pops out and stays in your hand
      eject();
      b.mode = "drag";
      b.el.classList.add("is-lifted");
      grab.pulled = true;
      grab.ox = px - b.x;
      grab.oy = py - b.y;
    }
    if (b.mode === "drag") {
      const ready = overConsole(px, py);
      if (ready !== grab.ready) {
        grab.ready = ready;
        unit.classList.toggle("is-ready", ready);
      }
    }
  });

  function endGrab(cancel) {
    const g = grab;
    grab = null;
    clearTimeout(g.holdTimer);
    unit.classList.remove("is-ready");
    const b = g.b;
    b.el.classList.remove("is-lifted");
    // a pointer press shouldn't leave focus behind, or Enter would eject it
    if (document.activeElement === b.el) b.el.blur();
    if (cancel) {
      if (b.mode === "drag") b.mode = "home";
      if (b.mode === "tug") b.mode = "in";
      return;
    }
    if (!g.moved) {
      if (inserted === b.id) eject();
      else insert(b.id);
      return;
    }
    if (b.mode === "tug") {
      if (g.py - g.sy > 22) eject();
      else b.mode = "in";
      return;
    }
    if (b.mode === "drag") {
      // over the console it goes in (hovering there until the slot clears); one just
      // pulled out still sits in the mouth zone, so it needs the pointer back up on the console
      const back = g.pulled
        ? g.py < geo.con.bottom && overConsole(g.px, g.py)
        : overConsole(g.px, g.py) || overConsole(b.x + geo.cw / 2, b.y + geo.ch / 2);
      if (back) insert(b.id);
      else b.mode = "home";
    }
  }

  function pointerEnd(e) {
    if (!grab || e.pointerId !== grab.pid) return;
    endGrab(e.type !== "pointerup");
  }
  stage.addEventListener("pointerup", pointerEnd);
  stage.addEventListener("pointercancel", pointerEnd);
  stage.addEventListener("lostpointercapture", pointerEnd);

  // keyboard and assistive tech activate with a click that has no pointer
  stage.addEventListener("click", (e) => {
    const el = e.target.closest(".cart");
    if (!el || e.detail !== 0) return;
    const id = el.dataset.id;
    if (inserted === id) return eject();
    insert(id);
    // focus leaves the cartridge for the console, so the next Enter is A, not eject
    if (document.activeElement === el) stage.focus({ preventScroll: true });
  });

  /* ---------------------------------------------------------------
     Screen effects: Bayer dither on a low-res canvas over the screen
  ---------------------------------------------------------------- */
  const LCD_OFF = "#1c1a20";
  const OFF_END = 200;
  const HOLD_MS = 160; // touch: how long a finger rests on a cartridge before it can be dragged
  const BOOT_FLOOD = 380;
  const BOOT_HOLD = 860;
  const BOOT_END = 1100;
  const TYPE_MS = 24;
  const FW = 72;
  const FH = 90;
  const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5].map((v) => v / 16);
  fx.width = FW;
  fx.height = FH;
  const fctx = fx.getContext("2d");
  const fimg = fctx.createImageData(FW, FH);
  let screenToken = 0;

  const rgb = (hex) => {
    const n = parseInt(hex.slice(1), 16);
    return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
  };

  // paint cells where cover(i, j, bayer) is true with hex; the rest with base (or leave clear)
  function fxDraw(hex, cover, base) {
    const [r, g, b] = rgb(hex);
    const bb = base ? rgb(base) : null;
    const d = fimg.data;
    for (let j = 0; j < FH; j++) {
      for (let i = 0; i < FW; i++) {
        const k = (j * FW + i) * 4;
        const on = cover(i, j, BAYER[(j & 3) * 4 + (i & 3)]);
        if (on) {
          d[k] = r;
          d[k + 1] = g;
          d[k + 2] = b;
          d[k + 3] = 255;
        } else if (bb) {
          d[k] = bb[0];
          d[k + 1] = bb[1];
          d[k + 2] = bb[2];
          d[k + 3] = 255;
        } else d[k + 3] = 0;
      }
    }
    fctx.putImageData(fimg, 0, 0);
    fx.hidden = false;
  }
  const fxFill = (hex) => fxDraw(hex, () => true);
  const fxHide = () => (fx.hidden = true);
  const even = (p) => (i, j, b) => p > b;
  const rise = (p) => (i, j, b) => p > ((FH - 1 - j) / FH) * 0.78 + b * 0.22;

  function fxRun(ms, token, frame) {
    return new Promise((resolve) => {
      const t0 = performance.now();
      const step = (t) => {
        if (token !== screenToken) return resolve();
        const p = Math.min(1, Math.max(0, (t - t0) / ms));
        frame(p);
        if (p < 1) requestAnimationFrame(step);
        else resolve();
      };
      requestAnimationFrame(step);
    });
  }
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------------------------------------------------------------
     Screen: views
  ---------------------------------------------------------------- */
  let current = null; // the cartridge the screen is showing
  let ctrl = null; // its controller
  let st = null; // its state
  let booting = false;
  let typeAt = 0; // typing waits for the boot to finish
  let typer = 0;
  let blinkTimer = 0;

  const stopTyping = () => {
    clearInterval(typer);
    typer = 0;
  };

  function paint(html, cart) {
    // whatever was animating on the old view stops with it
    stopTyping();
    clearInterval(blinkTimer);
    view.innerHTML = html;
    view.style.setProperty("--label", cart ? cart.color : LCD_OFF);
    view.style.setProperty("--ink", cart ? cart.ink || "#1d1a24" : "#efe6d8");
  }

  function say(text) {
    announce.textContent = "";
    // let screen readers notice a repeat
    requestAnimationFrame(() => (announce.textContent = text));
  }

  function emptyHTML() {
    if (selected && !onDesk()) {
      const c = byId[selected].cart;
      return `<div class="scr v-empty v-pick">
          <span class="tri l" aria-hidden="true">&#9664;</span>
          <h2 style="color:${esc(c.color)}">${esc(c.label)}</h2>
          <p>Press A to put it in</p>
          <span class="tri r" aria-hidden="true">&#9654;</span>
        </div>`;
    }
    const mascot = typeof window.pixelSVG === "function" ? window.pixelSVG("robot") : "";
    // lying on the desk there is no shelf to pick from yet: the console itself comes first
    const [title, help] = onDesk()
      ? ["Pick me up", coarse() ? "Tap the console." : "Click the console, or press Enter."]
      : ["Insert a cartridge", coarse() ? "Tap one below, or hold one and drag it into the slot." : "Drag one into the slot, or click it."];
    return `<div class="scr v-empty">
        <div class="mascot" aria-hidden="true">${mascot}</div>
        <h2>${title}</h2>
        <p>${help}</p>
        <div class="visits" hidden><canvas class="snake" width="76" height="22" aria-hidden="true"></canvas><p class="visits-label">visitors</p></div>
      </div>`;
  }

  /* ---------------------------------------------------------------
     Visitor count, on the idle screen: the number in a 3x5 pixel font
     with a little snake running laps around it, eating bits and
     growing. The count comes from Abacus (abacus.jasoncameron.dev), a
     free counter: a browser counts once (localStorage), later visits
     only read it. Local copies count separately, so testing doesn't
     touch the real number. If it can't be reached, nothing shows.
  ---------------------------------------------------------------- */
  const GLYPHS = {
    0: "111101101101111", 1: "010110010010111", 2: "111001111100111", 3: "111001111001111", 4: "101101111001001",
    5: "111100111001111", 6: "111100111101111", 7: "111001010010010", 8: "111101111101111", 9: "111101111001111",
  };
  let visitsLoad = null;
  function loadVisits() {
    if (visitsLoad) return visitsLoad;
    const local = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
    const ns = local ? "sharpeye08-dev" : "sharpeye08-github-io";
    let seen = true;
    try {
      seen = localStorage.getItem("counted") === "1";
    } catch (_) {} // no storage: read only, so reloads can't inflate it
    const ctl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), 6000);
    visitsLoad = fetch(`https://abacus.jasoncameron.dev/${seen ? "get" : "hit"}/${ns}/visits`, ctl ? { signal: ctl.signal } : {})
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("visits " + r.status))))
      .then((j) => {
        if (typeof j.value !== "number") throw new Error("visits");
        if (!seen) {
          try {
            localStorage.setItem("counted", "1");
          } catch (_) {}
        }
        return j.value;
      })
      .finally(() => clearTimeout(timer));
    visitsLoad.catch(() => {});
    return visitsLoad;
  }

  function showVisits() {
    const box = $(".v-empty .visits", view);
    if (!box) return;
    loadVisits().then(
      (n) => {
        if (!box.isConnected) return;
        box.hidden = false;
        box.setAttribute("aria-label", `${n.toLocaleString("en")} visitors`);
        box.setAttribute("role", "img");
        snake($(".snake", box), n);
      },
      () => {}
    );
  }

  function snake(canvas, n) {
    const digits = String(n).padStart(5, "0");
    const C = 2; // px per cell
    const W = Math.max(38, Math.ceil((digits.length * 8 + 18) / C)); // cells
    const H = 11;
    canvas.width = W * C;
    canvas.height = H * C;
    const ctx = canvas.getContext("2d");
    const cream = "#efe6d8";
    const amber = "#ffb454";
    // the lap: clockwise round the edge cells
    const path = [];
    for (let x = 0; x < W; x++) path.push([x, 0]);
    for (let y = 1; y < H; y++) path.push([W - 1, y]);
    for (let x = W - 2; x >= 0; x--) path.push([x, H - 1]);
    for (let y = H - 2; y > 0; y--) path.push([0, y]);
    const P = path.length;
    let head = Math.floor(P * 0.3);
    let len = 10;
    let food = (head + 18) % P;
    const cell = (i, color, inset = 0) => {
      const [x, y] = path[((i % P) + P) % P];
      ctx.fillStyle = color;
      ctx.fillRect(x * C + inset, y * C + inset, C - inset * 2, C - inset * 2);
    };
    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // faint dots mark the track
      ctx.globalAlpha = 0.14;
      for (let i = 0; i < P; i += 2) cell(i, cream);
      ctx.globalAlpha = 1;
      // the number, centred
      const dw = digits.length * 8 - 2;
      const ox = Math.round((canvas.width - dw) / 2);
      const oy = Math.round((canvas.height - 10) / 2);
      ctx.fillStyle = cream;
      [...digits].forEach((d, k) => {
        const g = GLYPHS[d];
        for (let i = 0; i < 15; i++) if (g[i] === "1") ctx.fillRect(ox + k * 8 + (i % 3) * 2, oy + Math.floor(i / 3) * 2, 2, 2);
      });
      cell(food, amber);
      for (let s = len - 1; s > 0; s--) cell(head - s, cream);
      cell(head, amber);
    }
    draw();
    if (reduced()) return;
    const id = setInterval(() => {
      if (!canvas.isConnected) return clearInterval(id);
      if (document.hidden) return;
      head = (head + 1) % P;
      if (head === food) {
        len = len >= 26 ? 10 : len + 1;
        food = (head + 12 + Math.floor(Math.random() * (P - 30))) % P;
      }
      draw();
    }, 90);
  }

  const onDesk = () => document.body.classList.contains("scene-table") || document.body.classList.contains("scene-paper");

  // quiet: the desk speaks for itself when it changes (scene.js announces)
  function renderEmpty(quiet) {
    paint(emptyHTML(), null);
    blinkMascot();
    showVisits();
    if (quiet || onDesk()) return;
    if (selected) say(`${byId[selected].cart.label}. Press A to put it in.`);
    else say("No cartridge inserted. " + (coarse() ? "Tap one below." : "Pick one from the shelf."));
  }

  // scene.js tells us whenever the console is picked up or put down
  window.addEventListener("scene", () => {
    if (!current) renderEmpty(true);
  });

  function blinkMascot() {
    clearInterval(blinkTimer);
    if (reduced() || !window.PIXEL_ICONS || !window.PIXEL_ICONS.robot2) return;
    let alt = false;
    blinkTimer = setInterval(() => {
      const m = $(".v-empty .mascot", view);
      if (!m) return clearInterval(blinkTimer);
      alt = !alt;
      m.innerHTML = window.pixelSVG(alt ? "robot2" : "robot");
    }, 900);
  }

  // the picture dithers away into a dark, switched-off screen
  // a running game stops with its screen
  const stopGame = () => {
    if (st && st.ctl && st.ctl.stop) st.ctl.stop();
  };

  function screenOff() {
    stopGame();
    const token = ++screenToken;
    booting = false;
    current = null;
    ctrl = null;
    st = null;
    stopTyping();
    led.classList.remove("on");
    if (reduced()) {
      fxHide();
      renderEmpty();
      return;
    }
    fxRun(OFF_END, token, (p) => fxDraw(LCD_OFF, even(p))).then(() => {
      if (token !== screenToken) return;
      renderEmpty();
      fxHide();
    });
  }

  // boot: colour floods up from the bottom, title card with a loading bar, then the content dithers in
  async function bootScreen(id, instant) {
    stopGame();
    const token = ++screenToken;
    const c = byId[id].cart;
    current = id;
    ctrl = TYPES[c.type];
    st = ctrl.init(c);
    led.classList.add("on");
    if (instant || reduced()) {
      booting = false;
      typeAt = 0;
      fxHide();
      render();
      return;
    }
    booting = true;
    await fxRun(BOOT_FLOOD, token, (p) => fxDraw(c.color, rise(p), LCD_OFF));
    if (token !== screenToken) return;
    paint(
      `<div class="scr v-splash"><h2>${esc(c.title || c.label)}</h2><span class="load" aria-hidden="true"><i></i></span></div>`,
      c
    );
    fxHide();
    sfx.chime();
    say(`${c.title || c.label}, loading.`);
    await wait(BOOT_HOLD - BOOT_FLOOD);
    if (token !== screenToken) return;
    fxFill(c.color);
    typeAt = performance.now() + (BOOT_END - BOOT_HOLD);
    render();
    await fxRun(BOOT_END - BOOT_HOLD, token, (p) => fxDraw(c.color, even(1 - p)));
    if (token !== screenToken) return;
    booting = false;
    fxHide();
  }

  // an impatient A press skips the boot
  function skipBoot() {
    if (!booting) return;
    ++screenToken;
    booting = false;
    typeAt = 0;
    fxHide();
    render();
  }

  function render() {
    if (!ctrl || !current) return;
    const c = slots[current].cart;
    // a re-render replaces the view, so carry keyboard focus over to the matching
    // control, or else to the selected row, so it never drops out of the screen
    const a = document.activeElement;
    const inside = !!a && a !== view && view.contains(a);
    const keep = inside && a.dataset.act ? `[data-act="${a.dataset.act}"]` : "";
    paint(ctrl.render(c, st), c);
    if (ctrl.mount) ctrl.mount(c, st);
    const el = inside && ((keep && $(keep, view)) || $(".sel", view));
    if (el) el.focus({ preventScroll: true });
  }

  function openLink(a) {
    if (a) window.open(a.href, "_blank", "noopener");
  }

  // step through n pages with wrap-around; the page sound plays only on a real change
  function flip(s, key, step, n) {
    const next = (s[key] + step + n) % n;
    if (next === s[key]) return;
    s[key] = next;
    sfx.page();
    render();
  }

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (_) {
      // no async clipboard (older browser, insecure page): a hidden textarea and execCommand
      const prev = document.activeElement;
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.cssText = "position:fixed;top:0;left:0;opacity:0;pointer-events:none";
      document.body.appendChild(ta);
      ta.select();
      let ok = false;
      try {
        ok = document.execCommand("copy");
      } catch (_) {}
      ta.remove();
      if (prev && prev !== document.body && prev.focus) prev.focus({ preventScroll: true });
      return ok;
    }
  }

  const TYPES = {
    /* About: portrait + typewriter dialogue */
    dialog: {
      init: () => ({ i: 0, done: false, finish: null }),
      render: (c, s) => `
        <div class="scr v-dialog">
          <div class="portrait" data-act="a"><img src="${AVATAR}" alt="Pixel-art portrait of ${esc(PROFILE.name || c.speaker)}" draggable="false"></div>
          <div class="plate"><span class="speaker">${esc(c.speaker)}</span><span class="count">${s.i + 1} of ${c.lines.length}</span></div>
          <div class="box" data-act="a"><p class="line"></p><span class="more" aria-hidden="true">&#9660;</span></div>
        </div>`,
      mount(c, s) {
        const line = $(".line", view);
        const box = $(".box", view);
        const text = c.lines[s.i];
        say(text);
        s.done = false;
        s.finish = () => {
          stopTyping();
          line.textContent = text;
          s.done = true;
          box.classList.add("done");
        };
        if (reduced() || !text) return s.finish();
        // typed from the clock, one character per TYPE_MS, a blip every third
        const t0 = Math.max(performance.now(), typeAt);
        let shown = 0;
        let lastBlip = 0;
        typer = setInterval(() => {
          const n = Math.min(text.length, Math.max(0, Math.floor((performance.now() - t0) / TYPE_MS)));
          if (n === shown) return;
          shown = n;
          if (n >= text.length) return s.finish();
          line.textContent = text.slice(0, n);
          const per = Math.floor(n / 3);
          if (per !== lastBlip) {
            lastBlip = per;
            sfx.blip();
          }
        }, TYPE_MS / 2);
      },
      a(c, s) {
        // the first press finishes the line, the next one moves on
        if (!s.done && s.finish) return s.finish();
        flip(s, "i", 1, c.lines.length);
      },
      b(c, s) {
        if (s.i === 0) return false;
        flip(s, "i", -1, c.lines.length);
      },
      dir(c, s, d) {
        flip(s, "i", d === "right" || d === "down" ? 1 : -1, c.lines.length);
      },
    },

    /* Projects: a list in groups. A (or a tap on a row, or Right) opens that
       project's details with its links; B goes back to the list on the same row */
    library: {
      init: () => ({ page: "list", i: 0, sel: 0, fresh: false }),
      render(c, s) {
        if (s.page === "detail") return this.detail(c.items[s.i], s);
        let group = "";
        const rows = c.items
          .map((it, i) => {
            const head = it.group && it.group !== group ? `<li class="group" aria-hidden="true">${esc((group = it.group))}</li>` : "";
            return `${head}<li><button type="button" data-pick="${i}" class="${i === s.i ? "sel" : ""}"><span>${esc(it.title)}</span><span class="handle">${esc(it.tag || "")}</span></button></li>`;
          })
          .join("");
        return `
          <div class="scr v-menu v-library">
            <h2>${esc(c.title)}</h2>
            <ul class="menu scroll">${rows}</ul>
            <p class="hint" aria-hidden="true"><kbd>A</kbd>open</p>
          </div>`;
      },
      // the project's icon, kicker and title over its tag, points, stack and links
      detail(it, s) {
        const body = it.points
          ? `<ul class="points">${it.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`
          : `<p class="details">${esc(it.details)}</p>`;
        return `
          <div class="scr v-detail scroll">
            <div class="head">
              <span class="icon" aria-hidden="true">${art(it)}</span>
              <div class="name">
                ${it.kicker ? `<p class="kicker">${esc(it.kicker)}</p>` : ""}
                <h2>${esc(it.title)}</h2>
              </div>
            </div>
            ${
              it.status || it.when
                ? `<p class="tags">${it.status ? `<span class="chip">${esc(it.status)}</span>` : ""}${it.when ? `<span class="meta">${esc(it.when)}</span>` : ""}</p>`
                : ""
            }
            ${body}
            ${it.stack ? `<p class="stack"><span>Built with</span> ${esc(it.stack)}</p>` : ""}
            <ul class="menu">${(it.links || [])
              .map(
                (l, i) =>
                  `<li><a href="${esc(l.href)}" target="_blank" rel="noopener" class="${i === s.sel ? "sel" : ""}">${esc(l.label)}</a></li>`
              )
              .join("")}</ul>
            <button type="button" class="hint" data-act="b"><kbd>B</kbd>back</button>
          </div>`;
      },
      mount(c, s) {
        const it = c.items[s.i];
        if (s.page === "list") {
          const row = $(".menu .sel", view);
          if (row) row.scrollIntoView({ block: "nearest" });
          say(`${c.title}. ${s.i + 1} of ${c.items.length}: ${it.title}, ${it.tag || ""}. Press A to open.`);
          return;
        }
        const links = it.links || [];
        if (s.fresh) {
          // just opened: from the top, and read in full
          s.fresh = false;
          const more = it.points ? it.points.join(" ") : it.details;
          say(`${it.title}, ${it.kicker}. ${it.status ? it.status + ". " : ""}${more} ${links.length ? "Press A to open " + links[0].label + "." : ""}`);
          return;
        }
        const link = $(".menu .sel", view);
        if (link) link.scrollIntoView({ block: "nearest" });
        if (links[s.sel]) say(`${links[s.sel].label}, ${s.sel + 1} of ${links.length}. Press A to open.`);
      },
      open(s) {
        s.page = "detail";
        s.sel = 0;
        s.fresh = true;
        sfx.page();
        render();
      },
      pick(c, s, i) {
        if (!c.items[i]) return;
        s.i = i;
        this.open(s);
      },
      a(c, s) {
        if (s.page === "list") return this.open(s);
        openLink($(".menu a.sel", view));
      },
      b(c, s) {
        if (s.page === "list") return false;
        s.page = "list";
        sfx.page();
        render();
      },
      dir(c, s, d) {
        if (s.page === "list") {
          if (d === "right") return this.open(s);
          if (d === "left") return;
          const i = Math.max(0, Math.min(c.items.length - 1, s.i + (d === "up" ? -1 : 1)));
          if (i === s.i) return;
          s.i = i;
          sfx.page();
          render();
          return;
        }
        if (d === "left") return this.b(c, s);
        if (d === "right") return;
        // up and down step through the links; past either end they scroll the page
        const n = (c.items[s.i].links || []).length;
        const sel = s.sel + (d === "up" ? -1 : 1);
        if (sel < 0 || sel >= n) {
          const box = $(".v-detail", view);
          if (box) box.scrollTo({ top: d === "up" ? 0 : box.scrollHeight, behavior: reduced() ? "auto" : "smooth" });
          return;
        }
        s.sel = sel;
        sfx.page();
        render();
      },
    },

    /* Bug Squash: a little platformer (js/game.js) on a 128x160 canvas.
       The d-pad and A are passed through while held (hold); B pauses, and
       on the title screen it backs out like everywhere else */
    game: {
      init: () => ({ ctl: null, held: 0 }),
      render: (c) => `
        <div class="scr v-game">
          <canvas class="game" width="128" height="160" role="img" aria-label="${esc(c.title)}"></canvas>
        </div>`,
      mount(c, s) {
        if (s.ctl) s.ctl.stop();
        const canvas = $(".game", view);
        if (!window.CartGame || !canvas) return;
        s.ctl = window.CartGame.start(canvas, {
          paper: c.color,
          ink: c.ink || "#1d1a24",
          cream: "#f6f0e2",
          accent: "#ffb454",
          sfx: sfx.game,
          reduced: reduced(),
        });
        say(`${c.title}. Arrows or the d-pad move, A jumps, B pauses.`);
      },
      hold(c, s, act, down) {
        if (!s.ctl || act === "b") return;
        // Up (or W) jumps too, as players expect
        const key = act === "up" ? "a" : act;
        if (key === "a") s.held = performance.now();
        s.ctl.input(key, down);
      },
      // A as a click with no press before it (keyboard on the on-screen button): a short hop
      a(c, s) {
        if (!s.ctl || performance.now() - s.held < 600) return;
        s.ctl.input("a", true);
        setTimeout(() => s.ctl && s.ctl.input("a", false), 140);
      },
      b(c, s) {
        return s.ctl ? s.ctl.back() !== false : false;
      },
      dir() {},
    },

    /* Blog: one page per post, cycle with left/right */
    gallery: {
      init: () => ({ i: 0 }),
      render(c, s) {
        const it = c.items[s.i];
        const n = c.items.length;
        return `
          <div class="scr v-gallery">
            <a class="hint read" href="${esc(it.href)}" target="_blank" rel="noopener"><kbd>A</kbd>read</a>
            <div class="gal-mat">
              <div class="page">
                ${it.kind ? `<span class="kind">${esc(it.kind)}</span>` : ""}
                <h2>${esc(it.title)}</h2>
                ${it.by || it.year ? `<p class="by">${esc([it.by, it.year].filter(Boolean).join(", "))}</p>` : ""}
                ${
                  it.summary
                    ? `<p class="sum">${esc(it.summary)}</p>`
                    : `<span class="rule" style="width:80%"></span><span class="rule" style="width:92%"></span><span class="rule" style="width:60%"></span>`
                }
                ${it.stack ? `<p class="stk">${esc(it.stack)}</p>` : ""}
              </div>
            </div>
            <div class="bar">
              <button type="button" data-act="left" aria-label="Previous">&#9664;</button>
              <div class="cap"><strong>${esc(it.title)}</strong><span>${esc(it.kind || it.by || "")}</span></div>
              <span class="count">${s.i + 1} of ${n}</span>
              <button type="button" data-act="right" aria-label="Next">&#9654;</button>
            </div>
          </div>`;
      },
      mount(c, s) {
        const it = c.items[s.i];
        say(`${s.i + 1} of ${c.items.length}: ${it.title}. ${it.kind || ""}. ${it.summary || ""} Press A to open.`);
      },
      a() {
        openLink($(".read", view));
      },
      b(c, s) {
        if (s.i === 0) return false;
        flip(s, "i", -1, c.items.length);
      },
      dir(c, s, d) {
        flip(s, "i", d === "left" || d === "up" ? -1 : 1, c.items.length);
      },
    },

    /* Work: one role per page, cycle with left/right */
    timeline: {
      init: () => ({ i: 0 }),
      render(c, s) {
        const it = c.items[s.i];
        const n = c.items.length;
        return `
          <div class="scr v-timeline">
            <div class="body scroll">
              <span class="when">${esc(it.when)}</span>
              <h2>${esc(it.role)}</h2>
              <p class="org">${esc([it.org, it.where].filter(Boolean).join(", "))}</p>
              ${
                it.points && it.points.length
                  ? `<ul class="points">${it.points.map((p) => `<li>${esc(p)}</li>`).join("")}</ul>`
                  : ""
              }
            </div>
            <div class="bar">
              <button type="button" data-act="left" aria-label="Previous">&#9664;</button>
              <div class="cap"><strong>${esc(it.org)}</strong><span>${esc(it.when)}</span></div>
              <span class="count">${s.i + 1} of ${n}</span>
              <button type="button" data-act="right" aria-label="Next">&#9654;</button>
            </div>
          </div>`;
      },
      mount(c, s) {
        const it = c.items[s.i];
        say(`${s.i + 1} of ${c.items.length}: ${it.role} at ${it.org}, ${it.when}. ${(it.points || []).join(" ")}`);
      },
      a(c, s) {
        flip(s, "i", 1, c.items.length);
      },
      b(c, s) {
        if (s.i === 0) return false;
        flip(s, "i", -1, c.items.length);
      },
      dir(c, s, d) {
        flip(s, "i", d === "left" || d === "up" ? -1 : 1, c.items.length);
      },
    },

    /* Contact: write an email (mailto), copy the address, or open a profile.
       Stops for the d-pad: 0 the address, 1 its Copy key, then one per profile */
    contact: {
      init: () => ({ sel: 0, copied: false, timer: 0 }),
      render: (c, s) => `
        <div class="scr v-contact">
          <h2>${esc(c.title)}</h2>
          <div class="mail">
            <a class="write ${s.sel === 0 ? "sel" : ""}" href="mailto:${esc(c.email)}">${esc(c.email)}<span>Write an email</span></a>
            <button type="button" class="copy ${s.sel === 1 ? "sel" : ""}" data-act="copy" aria-label="${s.copied ? "Copied" : "Copy address"}">${s.copied ? "Copied" : "Copy"}</button>
          </div>
          <ul class="menu">${c.items
            .map(
              (it, i) =>
                `<li><a href="${esc(it.href)}" target="_blank" rel="noopener" class="${i + 2 === s.sel ? "sel" : ""}"><span>${esc(
                  it.label
                )}</span><span class="handle">${esc(it.handle)}</span></a></li>`
            )
            .join("")}</ul>
          <p class="hint" aria-hidden="true"><kbd>A</kbd>${s.sel === 0 ? "write" : s.sel === 1 ? "copy" : "open"}</p>
        </div>`,
      mount(c) {
        say(`${c.title}. Email ${c.email}, press A to write. Also ${c.items.map((i) => i.label).join(", ")}.`);
      },
      async copy(c, s) {
        const ok = await copyText(c.email);
        if (st !== s) return; // the cartridge came out while copying
        if (!ok) return say(`Couldn't copy. The address is ${c.email}.`);
        s.copied = true;
        s.sel = 1; // the selection follows a click on Copy
        render();
        say(`Copied ${c.email}.`);
        clearTimeout(s.timer);
        s.timer = setTimeout(() => {
          if (st !== s) return;
          s.copied = false;
          render();
        }, 2600);
      },
      a(c, s) {
        // the address is a real mailto link: following it opens the mail app
        if (s.sel === 0) $(".mail .write", view).click();
        else if (s.sel === 1) this.copy(c, s);
        else openLink($(".menu a.sel", view));
      },
      b: () => false,
      dir(c, s, d) {
        flip(s, "sel", d === "up" || d === "left" ? -1 : 1, c.items.length + 2);
      },
    },

    /* Socials: a menu */
    menu: {
      init: () => ({ sel: 0 }),
      render: (c, s) => `
        <div class="scr v-menu">
          <h2>${esc(c.title)}</h2>
          <ul class="menu">${c.items
            .map(
              (it, i) =>
                `<li><a href="${esc(it.href)}" target="_blank" rel="noopener" class="${i === s.sel ? "sel" : ""}"><span>${esc(
                  it.label
                )}</span><span class="handle">${esc(it.handle)}</span></a></li>`
            )
            .join("")}</ul>
          <p class="hint" aria-hidden="true"><kbd>A</kbd>open</p>
        </div>`,
      mount(c) {
        say(`${c.title}. ${c.items.map((i) => i.label).join(", ")}.`);
      },
      a() {
        openLink($(".menu a.sel", view));
      },
      b: () => false,
      dir(c, s, d) {
        flip(s, "sel", d === "up" || d === "left" ? -1 : 1, c.items.length);
      },
    },

    /* GitHub activity: last 26 weeks as a pixel heatmap */
    activity: {
      init: () => ({}),
      render: (c) => `
        <div class="scr v-activity">
          <h2>${esc(c.title)}</h2>
          <p class="total" id="actTotal">&hellip;</p>
          <p class="sub" id="actSub">Loading contributions</p>
          <canvas id="heat" width="129" height="34" aria-hidden="true"></canvas>
          <div class="legend" aria-hidden="true"><span>26 weeks ago</span><span>this week</span></div>
          <a class="hint" href="${esc(c.href)}" target="_blank" rel="noopener"><kbd>A</kbd>open GitHub</a>
        </div>`,
      async mount(c) {
        const total = $("#actTotal", view);
        const sub = $("#actSub", view);
        const heat = $("#heat", view);
        try {
          const data = await loadActivity(c.user);
          if (!heat.isConnected) return; // the screen moved on while loading
          total.textContent = data.total.toLocaleString();
          sub.textContent = "contributions in the last year";
          drawHeat(heat, data.days);
          say(`${data.total} GitHub contributions in the last year. Press A to open GitHub.`);
        } catch (_) {
          if (!total.isConnected) return;
          total.textContent = "?";
          sub.textContent = "Couldn't reach GitHub. Press A to open the profile.";
          say("Couldn't load GitHub activity. Press A to open the profile.");
        }
      },
      a() {
        openLink($(".hint", view));
      },
      b: () => false,
      dir() {},
    },
  };

  // one request at a time, kept once it works, retried after a failure or an 8s timeout
  let activityLoad = null;
  function loadActivity(user) {
    if (activityLoad) return activityLoad;
    const ctl = window.AbortController ? new AbortController() : null;
    const timer = setTimeout(() => ctl && ctl.abort(), 8000);
    activityLoad = fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`, ctl ? { signal: ctl.signal } : {})
      .then((res) => {
        if (!res.ok) throw new Error("activity " + res.status);
        return res.json();
      })
      .then((json) => ({
        total: json.total && typeof json.total.lastYear === "number" ? json.total.lastYear : 0,
        days: (Array.isArray(json.contributions) ? json.contributions : []).slice().sort((a, b) => (a.date < b.date ? -1 : 1)),
      }))
      .finally(() => clearTimeout(timer));
    activityLoad.catch(() => (activityLoad = null));
    return activityLoad;
  }

  function drawHeat(canvas, days) {
    const weeks = 26;
    const cell = 4;
    const gap = 1;
    const ctx = canvas.getContext("2d");
    const shades = ["rgba(29,26,36,0.12)", "rgba(29,26,36,0.38)", "rgba(29,26,36,0.6)", "rgba(29,26,36,0.8)", "#1d1a24"];
    // align to whole weeks ending with the latest day
    const last = days.length ? new Date(days[days.length - 1].date + "T00:00:00") : new Date();
    const endDow = last.getDay();
    const count = weeks * 7 - (6 - endDow);
    const slice = days.slice(-count);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    slice.forEach((d, i) => {
      const col = Math.floor(i / 7);
      const row = i % 7;
      ctx.fillStyle = shades[Math.max(0, Math.min(4, d.level | 0))];
      ctx.fillRect(col * (cell + gap), row * (cell + gap), cell, cell);
    });
  }

  /* ---------------------------------------------------------------
     Input: console buttons, screen taps, keyboard
  ---------------------------------------------------------------- */
  const DIRS = ["up", "down", "left", "right", "a", "b"];

  function showDown(act, down) {
    const btn = controls.querySelector(`[data-act="${act}"]`);
    if (btn) btn.classList.toggle("pressed", down);
  }

  function press(act) {
    interacted = true;
    if (act === "sound") return setSound(!soundOn);
    sfx.press();
    if (act === "eject") return eject();
    if (navigator.vibrate) navigator.vibrate(6);
    if (act === "copy") {
      if (ctrl && ctrl.copy && current && !booting) ctrl.copy(slots[current].cart, st);
      return;
    }
    if (inserted) {
      // while booting only A does anything: it skips ahead
      if (booting) {
        if (act === "a") skipBoot();
        return;
      }
      if (!ctrl || !current) return;
      const c = slots[current].cart;
      if (act === "a") ctrl.a(c, st);
      // B on the first page backs out: the cartridge pops out
      else if (act === "b") {
        if (ctrl.b(c, st) === false) eject();
      } else ctrl.dir(c, st, act);
      return;
    }
    // empty console: the d-pad picks a cartridge, A puts it in
    if (act === "a") return insert(selected || CARTS[0].id);
    if (act === "b") {
      selected = null;
      reflect();
      if (!current) renderEmpty();
      return;
    }
    const ids = CARTS.map((c) => c.id);
    const i = selected ? ids.indexOf(selected) : -1;
    const step = act === "left" || act === "up" ? -1 : 1;
    selected = i === -1 ? ids[step > 0 ? 0 : ids.length - 1] : ids[(i + step + ids.length) % ids.length];
    reflect();
    if (!current) renderEmpty();
  }

  // a game wants to know what is held down, not just what was pressed
  function hold(act, down) {
    if (inserted && !booting && ctrl && ctrl.hold && current) ctrl.hold(slots[current].cart, st, act, down);
  }

  // d-pad and A/B react on press, like hardware; Eject and Sound on click
  const held = new Map();
  controls.addEventListener("pointerdown", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t || e.button > 0) return;
    const act = t.dataset.act;
    if (DIRS.includes(act)) {
      held.set(e.pointerId, act);
      showDown(act, true);
      hold(act, true);
      press(act);
    } else t.classList.add("pressed");
  });
  const liftButton = (e) => {
    const act = held.get(e.pointerId);
    if (act) {
      held.delete(e.pointerId);
      showDown(act, false);
      hold(act, false);
    }
    controls.querySelectorAll(".pill.pressed").forEach((el) => el.classList.remove("pressed"));
  };
  controls.addEventListener("pointerup", liftButton);
  controls.addEventListener("pointercancel", liftButton);
  controls.addEventListener("pointerleave", liftButton);
  controls.addEventListener("click", (e) => {
    const t = e.target.closest("[data-act]");
    if (!t) return;
    const act = t.dataset.act;
    if (DIRS.includes(act)) {
      if (e.detail !== 0) return; // pointer presses were handled on pointerdown
      showDown(act, true);
      setTimeout(() => showDown(act, false), 120);
    }
    press(act);
  });

  view.addEventListener("click", (e) => {
    // a row in a list (Projects): open that one
    const row = e.target.closest("[data-pick]");
    if (row) {
      if (!inserted || booting || !ctrl || !ctrl.pick || !current) return;
      interacted = true;
      sfx.press();
      ctrl.pick(slots[current].cart, st, +row.dataset.pick);
      return;
    }
    if (e.target.closest("a")) return; // real links open themselves
    const b = e.target.closest("[data-act]");
    if (b) press(b.dataset.act);
  });

  // single characters are matched lower-case, so Shift or Caps Lock can't strand a key
  const KEYS = {
    ArrowUp: "up",
    ArrowDown: "down",
    ArrowLeft: "left",
    ArrowRight: "right",
    Escape: "b",
    // WASD move exactly like the arrows
    w: "up",
    a: "left",
    s: "down",
    d: "right",
    x: "a",
    z: "b",
    e: "eject",
  };
  const keyName = (e) => (typeof e.key !== "string" ? "" : e.key.length === 1 ? e.key.toLowerCase() : e.key);
  const keysDown = new Map();
  // Enter and Space on the cartridge that is in press A (a click or a tap still ejects it)
  const onSeated = (el) => !!el && !!inserted && !!el.classList && el.classList.contains("cart") && el.dataset.id === inserted;

  document.addEventListener("keydown", (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = keyName(e);
    if (/^[1-9]$/.test(k) && CARTS[+k - 1]) {
      e.preventDefault();
      if (!e.repeat) insert(CARTS[+k - 1].id);
      return;
    }
    const a = document.activeElement;
    const onControl = !!a && a !== document.body && !!(a.closest && a.closest("a, button")) && !onSeated(a);
    let act = KEYS[k];
    // E sits right by WASD: while the game is in, it doesn't eject (the Eject button still does)
    if (act === "eject" && current && slots[current].cart.type === "game") return;
    if (!act && (k === "Enter" || k === " ") && !onControl) act = "a";
    if (!act) return;
    e.preventDefault();
    // a held key that started on something else (say, the Enter that inserted a cartridge) presses nothing
    if (keysDown.has(k) || e.repeat) return;
    keysDown.set(k, act);
    showDown(act, true);
    hold(act, true);
    press(act);
  });
  document.addEventListener("keyup", (e) => {
    const k = keyName(e);
    // Space clicks a button on keyup; on the seated cartridge it was A, not eject
    if (k === " " && onSeated(document.activeElement)) e.preventDefault();
    const act = keysDown.get(k);
    if (!act) return;
    keysDown.delete(k);
    showDown(act, false);
    hold(act, false);
  });

  // leaving the page lets go of everything, so no key, button or cartridge stays held
  function letGo() {
    for (const act of new Set([...keysDown.values(), ...held.values()])) hold(act, false);
    keysDown.clear();
    held.clear();
    controls.querySelectorAll(".pressed").forEach((el) => el.classList.remove("pressed"));
    if (grab) endGrab(true);
  }
  window.addEventListener("blur", letGo);
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) letGo();
  });

  /* ---------------------------------------------------------------
     Physics loop
  ---------------------------------------------------------------- */
  const spring = (p, v, to, k, c, dt) => {
    v += (-k * (p - to) - c * v) * dt;
    return [p + v * dt, v];
  };

  let last = performance.now();
  function tick(now) {
    requestAnimationFrame(tick);
    const frameDt = Math.min(0.05, Math.max(0, now - last) / 1000);
    last = now;
    const red = reduced();
    const steps = Math.max(1, Math.ceil(frameDt / (1 / 240)));
    const dt = frameDt / steps;

    // a queued insert waits until the slot is clear, and never leaves a hand holding it
    if (pending && !(grab && grab.b.id === pending) && !bodies.some((b) => b.under || b.mode === "out")) {
      byId[pending].mode = "align";
      pending = null;
    }

    for (const b of bodies) {
      let tx = b.hx;
      let ty = b.hy;
      let tr = 0;
      let ts = 1;
      let k = 260;
      let c = 26;
      switch (b.mode) {
        case "drag":
          // in the hand it is out of the slot, and starts from rest when let go
          b.under = false;
          b.vx = b.vy = 0;
          if (grab && grab.b === b) {
            b.x = grab.px - grab.ox;
            b.y = grab.py - grab.oy;
            tr = Math.max(-14, Math.min(14, grab.vx * 0.018));
            ts = 1.06;
          }
          break;
        case "tug": {
          const dy = grab && grab.b === b ? Math.max(0, grab.py - grab.sy) : 0;
          b.x = geo.slotX;
          b.y = geo.inY + 26 * (1 - Math.exp(-dy / 55));
          break;
        }
        case "align":
          tx = geo.slotX;
          ty = geo.outY;
          k = 640;
          c = 46;
          if (red || (Math.abs(b.x - tx) < 3 && Math.abs(b.y - ty) < 3 && Math.abs(b.vx) + Math.abs(b.vy) < 220)) {
            b.x = tx;
            b.y = ty;
            b.vx = b.vy = 0;
            b.under = true;
            if (red) {
              latch(b);
              tx = geo.slotX;
              ty = geo.inY;
            } else {
              b.mode = "push";
              b.t0 = now;
              b.y0 = b.y;
            }
          }
          break;
        case "push": {
          const e = Math.min(1, (now - b.t0) / 150);
          b.x = geo.slotX;
          b.y = b.y0 + (geo.inY - 5 - b.y0) * e * e * e;
          if (e >= 1) {
            // latched: this frame already springs like "in", not toward the shelf
            latch(b);
            tx = geo.slotX;
            ty = geo.inY;
            k = 900;
            c = 20;
          }
          break;
        }
        case "in":
          tx = geo.slotX;
          ty = geo.inY;
          k = 900;
          c = 20;
          break;
        case "out":
          tx = geo.slotX;
          ty = geo.outY + 14;
          k = 380;
          c = 26;
          if (b.y >= geo.outY - 0.5) {
            b.under = false;
            b.mode = "home";
          }
          break;
        case "home":
          b.under = false;
          break;
      }
      const free = b.mode !== "drag" && b.mode !== "tug" && b.mode !== "push";
      if (free) {
        if (red) {
          if (b.mode === "out") {
            b.under = false;
            b.mode = "home";
            tx = b.hx;
            ty = b.hy;
          }
          b.x = b.mode === "align" ? b.x : tx;
          b.y = b.mode === "align" ? b.y : ty;
          b.vx = b.vy = 0;
        } else {
          for (let i = 0; i < steps; i++) {
            [b.x, b.vx] = spring(b.x, b.vx, tx, k, c, dt);
            [b.y, b.vy] = spring(b.y, b.vy, ty, k, c, dt);
          }
        }
      }
      if (red) {
        b.r = 0;
        b.s = 1;
      } else {
        for (let i = 0; i < steps; i++) {
          [b.r, b.vr] = spring(b.r, b.vr, tr, 300, 22, dt);
          [b.s, b.vs] = spring(b.s, b.vs, ts, 500, 30, dt);
        }
      }

      // under the console it sits behind the shell, so it disappears into the slot
      const z = b.mode === "drag" ? "40" : b.under ? "5" : b.mode === "align" ? "30" : "20";
      if (z !== b.z) {
        b.z = z;
        b.el.style.zIndex = z;
      }
      const css = `translate3d(${(b.x - b.hx).toFixed(2)}px,${(b.y - b.hy).toFixed(2)}px,0) rotate(${b.r.toFixed(2)}deg) scale(${b.s.toFixed(4)})`;
      if (css !== b.css) {
        b.css = css;
        b.el.style.transform = css;
      }
    }

    if (!red) {
      for (let i = 0; i < steps; i++) [kick.y, kick.v] = spring(kick.y, kick.v, 0, 700, 16, dt);
      consoleEl.style.transform = Math.abs(kick.y) > 0.01 ? `translate3d(0,${kick.y.toFixed(2)}px,0)` : "";
    }
  }

  /* ---------------------------------------------------------------
     History, resize, start
  ---------------------------------------------------------------- */
  // back and forward move the cartridge, no reload
  window.addEventListener("popstate", () => {
    const want = readCart();
    if (want === inserted) return;
    if (want) insert(want, { push: false });
    else eject({ push: false });
  });

  if (window.ResizeObserver) new ResizeObserver(() => measure()).observe(stage);
  window.addEventListener("resize", measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);

  measure();
  reflect();
  const fromUrl = readCart();
  if (fromUrl) {
    // a shared link starts with the cartridge seated; the screen still boots, as on the reference
    const b = byId[fromUrl];
    b.mode = "in";
    b.under = true;
    b.x = geo.slotX;
    b.y = geo.inY;
    b.el.classList.add("seated");
    inserted = fromUrl;
    reflect();
    bootScreen(fromUrl, false);
    // without one the console starts on the desk, which scene.js sets up (and announces) next
  } else renderEmpty(true);

  // teach the gesture once: the first cartridge leans toward the slot
  // (not while the opening table scene has the shelf; it is not retried later)
  setTimeout(() => {
    if (interacted || inserted || reduced() || !bodies.length || document.body.classList.contains("scene-table")) return;
    const b = bodies[0];
    b.vy = -340;
    b.vr = -40;
  }, 2600);

  requestAnimationFrame(tick);
})();
