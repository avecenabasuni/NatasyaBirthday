(() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];

  // Roots & UI
  const root = $("#scene-root");
  const btnA = $("#btnA");
  const btnB = $("#btnB");
  const btnMute = $("#btnMute");
  const btnBGM = $("#btnBGM");
  const starCountEl = $("#starCount");
  const fxIris = $("#fx-iris");
  const fxTiles = $("#fx-tiles");
  const confettiCanvas = $("#confetti-canvas");
  let confettiApi = null;

  /* ---------- iOS 100vh fix ---------- */
  const debounce = (fn, ms = 150) => {
    let t;
    return (...a) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...a), ms);
    };
  };
  const setVH = () =>
    document.documentElement.style.setProperty(
      "--vh",
      String(window.innerHeight)
    );
  setVH();
  addEventListener("resize", debounce(setVH, 150), { passive: true });
  addEventListener("orientationchange", setVH, { passive: true });

  const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Confetti ---------- */
  function initConfetti() {
    try {
      if (!confettiApi && window.confetti?.create && confettiCanvas) {
        confettiApi = window.confetti.create(confettiCanvas, {
          resize: true,
          useWorker: true,
        });
      }
    } catch {}
  }
  initConfetti();
  if (!confettiApi) addEventListener("load", initConfetti, { once: true });

  const PALETTE = [
    "#fff5e4",
    "#ffe3e1",
    "#ffd1d1",
    "#ff8ba7",
    "#9ad1ff",
    "#b9ffb3",
  ];
  function confettiBurst(kind = "mini") {
    if (!confettiApi) return;
    const base = { shapes: ["square"], colors: PALETTE };
    if (kind === "mini")
      confettiApi({
        ...base,
        particleCount: 40,
        spread: 60,
        scalar: 0.9,
        origin: { y: 0.2 },
      });
    else if (kind === "base")
      confettiApi({
        ...base,
        particleCount: 100,
        spread: 70,
        startVelocity: 40,
        gravity: 0.9,
      });
    else if (kind === "finale") {
      confettiApi({
        ...base,
        particleCount: 120,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.5 },
      });
      confettiApi({
        ...base,
        particleCount: 120,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.5 },
      });
    }
  }

  /* ---------- Floating Balloons (global) ---------- */
  const layers = { balloons: null, stage: null };
  const rand = (a, b) => Math.random() * (b - a) + a;

  function generateBalloons(container, count = 18) {
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const b = document.createElement("i");
      b.className = "ib" + (i % 2 ? " alt" : "");
      const x = Math.random() * 100,
        y = Math.random() * 100;
      const sizeVmin = Math.round(rand(7, 11)),
        sizePx = Math.round(rand(48, 110));
      b.style.setProperty("--x", x + "%");
      b.style.setProperty("--y", y + "%");
      b.style.setProperty(
        "--size",
        `clamp(40px, ${sizeVmin}vmin, ${sizePx}px)`
      );
      b.style.setProperty("--dur", rand(5.5, 8).toFixed(2) + "s");
      b.style.setProperty("--delay", rand(-2, 1.5).toFixed(2) + "s");
      b.style.setProperty("--ampY", Math.round(rand(10, 20)) + "px");
      b.style.setProperty("--ampX", Math.round(rand(-14, 14)) + "px");
      b.style.setProperty("--o", rand(0.18, 0.38).toFixed(2));
      container.appendChild(b);
    }
  }
  function ensureBalloonsLayer() {
    root.style.position = root.style.position || "relative";
    if (!layers.balloons) {
      const deco = document.createElement("div");
      deco.className = "float-balloons";
      generateBalloons(deco, 18);
      layers.balloons = deco;
      root.appendChild(deco);
    }
    if (!layers.stage) {
      const stage = document.createElement("div");
      stage.className = "stage-layer";
      layers.stage = stage;
      root.appendChild(stage);
    }
  }

  /* ---------- Audio (Howler) ---------- */
  const AUDIO_BASE = "./assets/audio/";
  const readMuted = () => sessionStorage.getItem("muted") === "1";
  const writeMuted = (f) => sessionStorage.setItem("muted", f ? "1" : "0");
  const readBGM = () => sessionStorage.getItem("bgm") === "1";
  const writeBGM = (f) => sessionStorage.setItem("bgm", f ? "1" : "0");

  (() => {
    const m = readMuted();
    try {
      Howler?.mute?.(m);
    } catch {}
    btnMute.textContent = m ? "🔇" : "🔊";
    const on = readBGM();
    btnBGM.setAttribute("aria-pressed", on ? "true" : "false");
  })();

  function withLoadError(howl, name) {
    try {
      howl.on("loaderror", (id, err) =>
        console.warn("[audio] loaderror:", name, err)
      );
    } catch {}
    return howl;
  }
  const audio = {
    ready: false,
    muted: readMuted(),
    sfx: {},
    bgmHowl: null,
    unlock() {
      if (this.ready) return;
      try {
        if (
          typeof Howler !== "undefined" &&
          Howler.ctx &&
          Howler.ctx.state !== "running"
        ) {
          Howler.autoUnlock = true;
          try {
            Howler.ctx.resume();
          } catch {}
        }
        const src = (name) => [
          `${AUDIO_BASE}${name}.mp3`,
          `${AUDIO_BASE}${name}.ogg`,
        ];
        this.sfx.confirm = withLoadError(
          new Howl({ src: src("confirm"), volume: 0.9, preload: true }),
          "confirm"
        );
        this.sfx.cancel = withLoadError(
          new Howl({ src: src("cancel"), volume: 0.9, preload: true }),
          "cancel"
        );
        this.sfx.pop = withLoadError(
          new Howl({ src: src("pop"), volume: 0.9, preload: true }),
          "pop"
        );
        this.sfx.flame = withLoadError(
          new Howl({ src: src("flame"), volume: 0.9, preload: true }),
          "flame"
        );
        this.sfx.type = withLoadError(
          new Howl({ src: src("type"), volume: 0.5, preload: true }),
          "type"
        );
        this.bgmHowl = withLoadError(
          new Howl({
            src: src("bgm"),
            loop: true,
            volume: 0.25,
            preload: true,
            html5: true,
          }),
          "bgm"
        );
        try {
          Howler.mute(this.muted);
        } catch {}
        btnMute.textContent = this.muted ? "🔇" : "🔊";
        if (readBGM() && !this.muted) this.bgmHowl?.play();
        this.ready = true;
      } catch {}
    },
    play(n) {
      if (this.ready && !this.muted) this.sfx[n]?.play();
    },
    toggleMute(force) {
      this.muted = typeof force === "boolean" ? force : !this.muted;
      try {
        Howler.mute(this.muted);
      } catch {}
      writeMuted(this.muted);
      btnMute.textContent = this.muted ? "🔇" : "🔊";
      if (this.muted) this.bgmOff();
      else if (readBGM()) this.bgmOn();
    },
    bgmOn() {
      if (this.ready && !this.muted) this.bgmHowl?.play();
    },
    bgmOff() {
      this.bgmHowl?.stop();
    },
  };

  ["pointerdown", "touchstart", "keydown", "click"].forEach((ev) => {
    addEventListener(
      ev,
      (e) => {
        if (ev === "keydown" && !(e.key === " " || e.key === "Enter")) return;
        audio.unlock();
      },
      { once: true, passive: true }
    );
  });
  btnMute.addEventListener("click", () => audio.toggleMute());
  btnBGM.addEventListener("click", () => {
    audio.unlock();
    const next = btnBGM.getAttribute("aria-pressed") !== "true";
    btnBGM.setAttribute("aria-pressed", next ? "true" : "false");
    writeBGM(next);
    if (next) {
      if (!audio.muted) audio.bgmOn();
    } else audio.bgmOff();
  });
  document.addEventListener("visibilitychange", () => {
    try {
      if (Howler?.ctx?.state === "suspended")
        Howler.ctx.resume().catch(() => {});
    } catch {}
    if (document.visibilityState === "visible") {
      if (readBGM() && !audio.muted && !audio.bgmHowl?.playing()) audio.bgmOn();
    }
  });

  const vibe = (ms) => navigator.vibrate && navigator.vibrate(ms);

  /* ---------- Transitions (strict) ---------- */
  const IRIS_MS = prefersReduced ? 220 : 1600;
  const TILES_MS = prefersReduced ? 220 : 1400;

  function tilesTransition(cb) {
    if (!fxTiles) {
      cb?.();
      return;
    }
    const dur = TILES_MS;
    fxTiles.style.setProperty("--dur", `${dur}ms`);
    fxTiles.innerHTML = "";

    // Responsif: jumlah tile berdasarkan ukuran root
    const W = root.clientWidth || innerWidth;
    const H = root.clientHeight || innerHeight;
    const cols = Math.max(10, Math.round(W / 80));
    const rows = Math.max(8, Math.round(H / 80));
    fxTiles.style.gridTemplateColumns = `repeat(${cols},1fr)`;
    const total = cols * rows;

    let maxDelay = 0;
    for (let i = 0; i < total; i++) {
      const t = document.createElement("i");
      const delay = ((i % cols) + Math.floor(i / cols)) * (dur / total); // wave diagonal
      if (delay > maxDelay) maxDelay = delay;
      t.style.animationDelay = `${delay}ms`;
      t.style.animationDuration = `${dur}ms`;
      fxTiles.appendChild(t);
    }

    const prev = fxTiles.style.transition;
    fxTiles.style.transition = "none";
    fxTiles.classList.remove("active");
    void fxTiles.offsetWidth;
    fxTiles.classList.add("active");
    void fxTiles.offsetWidth;
    fxTiles.style.transition = prev;

    setTimeout(() => {
      try {
        cb?.();
      } catch {}
      requestAnimationFrame(() => fxTiles.classList.remove("active"));
    }, Math.ceil(maxDelay + dur));
  }

  function irisTransition(cb) {
    if (!fxIris) {
      cb?.();
      return;
    }
    const dur = IRIS_MS;
    fxIris.style.setProperty("--iris-dur", `${dur}ms`);
    const prev = fxIris.style.transition;
    fxIris.style.transition = "none";
    fxIris.classList.remove("active");
    void fxIris.offsetWidth;
    fxIris.classList.add("active");
    void fxIris.offsetWidth;
    fxIris.style.transition = prev;
    setTimeout(() => {
      try {
        cb?.();
      } catch {}
      requestAnimationFrame(() => fxIris.classList.remove("active"));
    }, dur);
  }

  /* ---------- Scene Manager ---------- */
  const game = {
    scenes: {},
    current: null,
    currentName: "",
    progress: new Set(),
    order: [
      "Intro",
      "Quiz",
      "Balloons",
      "Candle",
      "Memories",
      "Message",
      "Gift",
      "Outro",
    ],
    _started: false,
    _isTransitioning: false,

    setScene(name, effect = "auto") {
      if (this._isTransitioning) return;
      if (name === this.currentName) return;

      const pick = (() => {
        if (prefersReduced) return "none";
        if (!this._started) return "iris";
        if (effect === "iris" || effect === "tiles" || effect === "none")
          return effect;
        return "tiles";
      })();

      const go = () => {
        try {
          this.current?.exit?.();
        } catch {}
        layers.stage.replaceChildren();
        this.current = this.scenes[name];
        this.currentName = name;
        const el = this.current.enter();
        layers.stage.appendChild(el);
        setTimeout(() => {
          layers.stage
            .querySelector("h1,h2,button,[tabindex]")
            ?.focus?.({ preventScroll: true });
        }, 0);
        starCountEl.textContent = Math.min(8, this.progress.size).toString();
        this._isTransitioning = false;
        this._started = true;
      };

      this._isTransitioning = true;
      if (pick === "tiles") tilesTransition(go);
      else if (pick === "iris") irisTransition(go);
      else go();
    },
    completeCurrent() {
      if (this.currentName) this.progress.add(this.currentName);
      starCountEl.textContent = Math.min(8, this.progress.size).toString();
    },
    next() {
      const i = this.order.indexOf(this.currentName);
      this.setScene(this.order[i + 1] || "Outro");
    },
    prev() {
      const i = this.order.indexOf(this.currentName);
      this.setScene(this.order[i - 1] || "Intro");
    },
  };

  /* ---------- Typewriter ---------- */
  function typeText(el, text, base = 46, done) {
    let i = 0,
      skipping = false,
      timer = 0;
    el.textContent = "";
    el.__typingActive = true;
    el.classList.add("typing");
    const skip = () => {
      if (!el.__typingActive) return;
      skipping = true;
      clearTimeout(timer);
      el.textContent = text;
      el.__typingActive = false;
      el.classList.remove("typing");
      el.removeEventListener("click", skip);
      el.removeEventListener("touchstart", skip);
      done?.();
    };
    el.addEventListener("click", skip, { passive: true });
    el.addEventListener("touchstart", skip, { passive: true });
    const tick = () => {
      if (skipping) return;
      const ch = text[i++];
      el.textContent += ch;
      if (i === 1) audio.play("type");
      if (i < text.length) {
        let d = base;
        const next3 = text.slice(i - 1, i + 2);
        if (ch === "." || ch === "!" || ch === "?") d += 260;
        else if (ch === ",") d += 140;
        else if (ch === "—") d += 180;
        else if (ch === "…" || next3 === "...") d += 300;
        timer = setTimeout(tick, d);
      } else {
        el.__typingActive = false;
        el.classList.remove("typing");
        el.removeEventListener("click", skip);
        el.removeEventListener("touchstart", skip);
        done?.();
      }
    };
    tick();
  }
  const INTRO_PAUSE = prefersReduced ? 120 : 650;
  function typeTitle(
    box,
    { subEl = null, titleSpeed = 58, subSpeed = 46, pause = INTRO_PAUSE } = {}
  ) {
    return new Promise((resolve) => {
      const h = box.querySelector("h1,h2");
      if (!h) {
        resolve();
        return;
      }
      const titleText = h.textContent;
      h.textContent = "";
      h.classList.add("typing");
      if (!subEl) {
        typeText(h, titleText, titleSpeed, () => {
          h.classList.remove("typing");
          resolve();
        });
        return;
      }
      const subText = subEl.textContent;
      subEl.textContent = "";
      typeText(h, titleText, titleSpeed, () => {
        h.classList.remove("typing");
        setTimeout(() => {
          subEl.classList.add("typing");
          typeText(subEl, subText, subSpeed, () => {
            subEl.classList.remove("typing");
            resolve();
          });
        }, pause);
      });
    });
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const typeInto = (el, text, speed = 42) =>
    new Promise((res) => {
      el.textContent = "";
      let i = 0;
      const tick = () => {
        if (i === 0) audio.play("type");
        el.textContent += text[i++];
        if (i < text.length) setTimeout(tick, speed);
        else res();
      };
      tick();
    });

  async function typeQuizOptions(
    list,
    {
      badgeSpeed = 40,
      textSpeed = 46,
      gapBetween = 160,
      afterBadgeGap = 120,
    } = {}
  ) {
    const items = [...list.querySelectorAll("li")];
    items.forEach((li) => {
      li.style.opacity = "0";
      li.style.pointerEvents = "none";
      li.inert = true;
    });
    for (const li of items) {
      const btn = li.querySelector(".opt"),
        badge = btn.querySelector(".badge"),
        label = btn.querySelector("span:last-child");
      const b = badge.textContent,
        t = label.textContent;
      badge.textContent = "";
      label.textContent = "";
      li.style.opacity = "1";
      await typeInto(badge, b, badgeSpeed);
      await sleep(afterBadgeGap);
      await typeInto(label, t, textSpeed);
      li.style.pointerEvents = "";
      li.inert = false;
      await sleep(gapBetween);
    }
  }

  /* ---------- UI helpers ---------- */
  const ui = {
    box(title) {
      const wrap = document.createElement("div");
      wrap.className = "ui-box";
      const h = document.createElement("h1");
      h.textContent = title;
      wrap.appendChild(h);
      return wrap;
    },
    p(txt) {
      const p = document.createElement("p");
      p.textContent = txt;
      return p;
    },
    btn(txt, cls = "chip") {
      const b = document.createElement("button");
      b.className = cls;
      b.textContent = txt;
      return b;
    },
    hint(txt = "Tap A to continue") {
      const p = document.createElement("p");
      p.className = "hint-inline";
      p.style.textAlign = "center";
      p.style.opacity = ".75";
      p.style.marginTop = "8px";
      p.textContent = txt;
      return p;
    },
  };

  /* ---------- Scenes ---------- */
  game.scenes.Intro = {
    enter() {
      const box = ui.box("Happy Birthday, Natasya!");
      box.classList.add("layer-top");
      const sub = ui.p("Tap A to begin your pastel 8-bit quest 💗");
      box.appendChild(sub);

      const h = box.querySelector("h1");
      const titleText = h.textContent,
        subText = sub.textContent;
      h.textContent = "";
      sub.textContent = "";
      h.classList.add("typing");
      typeText(h, titleText, 58, () => {
        h.classList.remove("typing");
        setTimeout(() => {
          sub.classList.add("typing");
          typeText(sub, subText, 46, () => sub.classList.remove("typing"));
        }, INTRO_PAUSE);
      });

      const wrap = document.createElement("div");
      wrap.append(box);
      return wrap;
    },
    exit() {},
    onA() {
      audio.play("confirm");
      confettiBurst("mini");
      game.completeCurrent();
      game.setScene("Quiz");
    },
    onB() {},
  };

  const QUIZ = [
    {
      q: "“When we celebrate a win, what do we reach for first?”",
      a: [
        "Cake and our favourite playlist",
        "A polite congratulatory handshake",
        "A stack of emails to answer",
        "A round of chores to stay humble",
      ],
      praise: "Correct! 🎉 Celebrate like we mean it.",
    },
    {
      q: "“Which word describes how you shine today?”",
      a: [
        "Radiant — glowing from the inside out",
        "Sleepless — probably need a nap",
        "Ordinary — nothing special happening",
        "Invisible — hiding from the world",
      ],
      praise: "Radiant it is! ✨ Keep glowing.",
    },
    {
      q: "“Where should our next adventure take us?”",
      a: [
        "Sunset picnic by a secret seaside",
        "Back to spreadsheets and inboxes",
        "A room with zero windows",
        "No adventure — let’s stay put",
      ],
      praise: "Seaside sunsets, coming right up 🌅",
    },
  ];

  game.scenes.Quiz = {
    idx: 0,
    _onClick: null,
    build() {
      const box = ui.box("Quiz Time!");
      const wrap = document.createElement("div");
      wrap.className = "quiz";
      const q = ui.p(QUIZ[this.idx].q);
      wrap.appendChild(q);

      const list = document.createElement("ul");
      list.setAttribute("role", "list");
      const letters = ["A", "B", "C", "D"];
      const frag = document.createDocumentFragment();
      QUIZ[this.idx].a.forEach((txt, k) => {
        const li = document.createElement("li");
        const btn = document.createElement("button");
        btn.className = "opt";
        btn.type = "button";
        btn.dataset.index = String(k);
        btn.innerHTML = `<span class="badge">${letters[k]}</span> <span>${txt}</span>`;
        li.appendChild(btn);
        frag.appendChild(li);
      });
      list.appendChild(frag);
      box.appendChild(wrap);

      typeTitle(box, { subEl: q, titleSpeed: 54, subSpeed: 46 }).then(() => {
        wrap.appendChild(list);
        list.style.visibility = "hidden";
        requestAnimationFrame(() => {
          list.style.visibility = "";
          typeQuizOptions(list, {
            badgeSpeed: 40,
            textSpeed: 46,
            gapBetween: 160,
            afterBadgeGap: 120,
          });
        });
      });
      return box;
    },
    enter() {
      this.idx = 0;
      const el = this.build();
      this._onClick = (e) => {
        const btn = e.target.closest?.(".opt");
        if (!btn || this.locked) return;
        const k = Number(btn.dataset.index);
        if (k === 0) {
          this.locked = true;
          const praise = QUIZ[this.idx]?.praise || "Nice!";
          audio.play("confirm");
          vibe(10);
          $$(".opt", root).forEach((o) => {
            o.disabled = true;
            o.inert = true;
            o.classList.toggle("correct", o === btn);
            o.classList.remove("wrong");
          });
          const card = $(".ui-box", root),
            title = $(".ui-box h1", root);
          const d = document.createElement("div");
          d.className = "dialog praise";
          const p = document.createElement("div");
          d.appendChild(p);
          card.replaceChildren(title, d);
          typeText(p, praise, 46, () => {
            setTimeout(() => {
              this.idx++;
              this.locked = false;
              if (this.idx < QUIZ.length) {
                card.replaceWith(this.build());
              } else {
                const finCard = ui.box("Nice!");
                const fin = document.createElement("div");
                fin.className = "dialog praise";
                const sub = document.createElement("div");
                fin.appendChild(sub);
                finCard.appendChild(fin);
                layers.stage.replaceChildren(finCard);
                typeText(
                  sub,
                  "You did it! Let’s pop some balloons…",
                  46,
                  () => {
                    setTimeout(() => {
                      confettiBurst("mini");
                      game.completeCurrent();
                      game.setScene("Balloons");
                    }, 620);
                  }
                );
              }
            }, 620);
          });
        } else {
          audio.play("cancel");
          vibe(35);
          root.classList.add("shake");
          setTimeout(() => root.classList.remove("shake"), 160);
          btn.classList.add("wrong");
          setTimeout(() => btn.classList.remove("wrong"), 360);
        }
      };
      root.addEventListener("click", this._onClick);
      return el;
    },
    exit() {
      root.removeEventListener("click", this._onClick);
      this._onClick = null;
    },
    onA() {},
    onB() {
      if (this.idx === 0) game.setScene("Intro");
      else {
        this.idx--;
        layers.stage.replaceChildren(this.build());
      }
    },
  };

  /* BALLOONS */
  const BALLOON_MSGS = [
    "Aku suka caramu menenangkan aku.",
    "Terima kasih sudah sabar sama kekuranganku.",
    "Kamu bikin hari biasa jadi spesial.",
    "Tetap jadi kamu yang hangat ya.",
    "Aku bangga sama growth kamu.",
    "Semoga mimpi-mimpimu makin dekat.",
    "You deserve all the gentle things.",
    "Aku selalu dukung kamu.",
  ];
  const balloonSVG = (c) =>
    `<svg class="balloon-svg" viewBox="0 0 80 110" aria-hidden="true"><ellipse cx="40" cy="40" rx="26" ry="32" fill="${c}" stroke="#ff9bb0" stroke-width="3"/><path d="M40 68 L36 74 L44 74 Z" fill="${c}"/><path d="M40 74 C 40 90, 46 96, 40 110" stroke="#caa" stroke-width="2" fill="none"/></svg>`;

  game.scenes.Balloons = {
    popped: 0,
    listeners: [],
    ro: null,
    onResize: null,
    enter() {
      this.popped = 0;
      const box = ui.box("Pop the Balloons!");
      const hint = ui.p("Tap balloons to reveal messages 💬");
      box.appendChild(hint);
      box.style.height = "100%";
      box.style.display = "flex";
      box.style.flexDirection = "column";
      const grid = document.createElement("div");
      grid.className = "grid";
      grid.style.flex = "1";

      BALLOON_MSGS.forEach((msg, i) => {
        const tile = document.createElement("button");
        tile.className = "tile";
        tile.type = "button";
        tile.innerHTML =
          balloonSVG(i % 2 ? "var(--color-3)" : "var(--color-2)") +
          `<span class="dialog">${msg}</span>`;
        const onClick = () => {
          const sv = $("svg", tile);
          sv.classList.add("pop");
          audio.play("pop");
          vibe(12);
          setTimeout(() => {
            sv.remove();
            tile.classList.add("show-msg");
          }, 220);
          tile.disabled = true;
          if (++this.popped === BALLOON_MSGS.length) {
            setTimeout(() => {
              confettiBurst("mini");
              game.completeCurrent();
              game.setScene("Candle");
            }, 520);
          }
        };
        tile.addEventListener("click", onClick);
        this.listeners.push({ el: tile, fn: onClick });
        grid.appendChild(tile);
      });

      box.appendChild(grid);

      const layout = () => {
        const cols = root.clientWidth >= 520 ? 4 : 2;
        grid.style.setProperty("--cols", cols);
        const gap = parseFloat(getComputedStyle(grid).gap) || 10;
        const rows = Math.ceil(BALLOON_MSGS.length / cols);
        const availW = grid.clientWidth - gap * (cols - 1);
        const availH = grid.clientHeight - gap * (rows - 1);
        const tile = Math.max(
          56,
          Math.min(Math.floor(availW / cols), Math.floor(availH / rows))
        );
        grid.style.setProperty("--tile", tile + "px");
      };
      this.ro = new ResizeObserver(layout);
      this.ro.observe(root);
      this.onResize = () => layout();
      addEventListener("resize", this.onResize, { passive: true });
      setTimeout(layout, 0);

      typeTitle(box, { subEl: hint, titleSpeed: 54, subSpeed: 46 });
      return box;
    },
    exit() {
      this.listeners.forEach(({ el, fn }) =>
        el.removeEventListener("click", fn)
      );
      this.listeners.length = 0;
      this.ro?.disconnect();
      this.ro = null;
      if (this.onResize) {
        removeEventListener("resize", this.onResize);
        this.onResize = null;
      }
    },
    onA() {},
    onB() {
      game.setScene("Quiz");
    },
  };

  /* CANDLE */
  game.scenes.Candle = {
    holding: false,
    raf: 0,
    holdMs: 1200,
    holdEl: null,
    barEl: null,
    flameEl: null,
    enter() {
      const box = ui.box("Make a Wish ✨");
      const sub = ui.p("Hold the button to blow the candle.");
      sub.style.textAlign = "center";
      sub.style.opacity = ".75";
      sub.style.marginBottom = "clamp(10px, 2.5vmin, 18px)"; // <— jarak ke cake
      box.appendChild(sub);
      const cake = document.createElement("div");
      cake.className = "cake";
      cake.innerHTML = `<div class="cake-visual">
          <div class="flame" id="flame"></div><div class="wick"></div><div class="candle"></div><div class="cake-body"></div><div class="cake-plate"></div>
        </div>
        <button class="hold" id="hold">Press & Hold</button>
        <div class="progress"><i id="bar"></i></div>`;
      box.appendChild(cake);
      this.holdEl = $("#hold", cake);
      this.barEl = $("#bar", cake);
      this.flameEl = $("#flame", cake);

      const start = () => {
        if (this.holding) return;
        this.holding = true;
        audio.play("flame");
        const t0 = performance.now();
        const step = (now) => {
          if (!this.holding) return;
          const pct = Math.min(1, (now - t0) / this.holdMs);
          this.barEl.style.width = `${pct * 100}%`;
          if (pct >= 1) {
            this.holding = false;
            this.barEl.style.width = "100%";
            this.flameEl.style.display = "none";
            this.holdEl.textContent = "Wish granted!";
            confettiBurst("base");
            audio.play("confirm");
            vibe(25);
            setTimeout(() => {
              game.completeCurrent();
              game.setScene("Memories");
            }, 680);
          } else {
            this.raf = requestAnimationFrame(step);
          }
        };
        this.raf = requestAnimationFrame(step);
      };
      const stop = () => {
        this.holding = false;
        cancelAnimationFrame(this.raf);
        this.barEl.style.width = "0%";
      };
      this.holdEl.addEventListener("pointerdown", start);
      this.holdEl.addEventListener("pointerup", stop);
      this.holdEl.addEventListener("pointerleave", stop);

      typeTitle(box, { subEl: sub, titleSpeed: 54, subSpeed: 46 });
      return box;
    },
    exit() {
      cancelAnimationFrame(this.raf);
      if (this.holdEl) this.holdEl.replaceWith(this.holdEl.cloneNode(true));
    },
    onA() {},
    onB() {
      game.setScene("Balloons");
    },
  };

  /* MEMORIES — 8-bit slideshow */
  game.scenes.Memories = {
    idx: 0,
    imgs: [
      "https://picsum.photos/seed/pastel1/800/600",
      "https://picsum.photos/seed/pastel2/800/600",
      "https://picsum.photos/seed/pastel3/800/600",
      "https://picsum.photos/seed/pastel4/800/600",
      "https://picsum.photos/seed/pastel5/800/600",
      "https://picsum.photos/seed/pastel6/800/600",
      "https://picsum.photos/seed/pastel7/800/600",
      "https://picsum.photos/seed/pastel8/800/600",
    ],
    enter() {
      const box = ui.box("Memories");
      const sub = ui.p("Swipe ◀ ▶ or tap the arrows");
      sub.style.textAlign = "center";
      sub.style.opacity = ".75";
      box.appendChild(sub);

      const wrap = document.createElement("div");
      wrap.className = "ss-wrap";
      wrap.innerHTML = `<div class="ss-stage pixel-border"><img alt="Memory"/><button class="ss-nav prev" aria-label="Previous">◀</button><button class="ss-nav next" aria-label="Next">▶</button></div><div class="ss-dots" role="tablist" aria-label="Slides"></div>`;
      const stage = $(".ss-stage", wrap),
        img = $("img", wrap),
        prevBtn = $(".prev", wrap),
        nextBtn = $(".next", wrap),
        dots = $(".ss-dots", wrap);

      const makeDots = () => {
        dots.innerHTML = "";
        for (let i = 0; i < this.imgs.length; i++) {
          const b = document.createElement("button");
          b.className = "dot";
          b.type = "button";
          b.setAttribute("aria-selected", String(i === this.idx));
          b.addEventListener("click", () => this.go(i));
          dots.appendChild(b);
        }
      };
      this.update = () => {
        img.src = this.imgs[this.idx];
        img.onerror = () => (img.src = "https://picsum.photos/800/600?blur=1");
        [...dots.children].forEach((d, i) =>
          d.setAttribute("aria-selected", String(i === this.idx))
        );
      };
      this.go = (i) => {
        const n = this.imgs.length;
        this.idx = ((i % n) + n) % n;
        this.update();
      };
      prevBtn.addEventListener("click", () => this.go(this.idx - 1));
      nextBtn.addEventListener("click", () => this.go(this.idx + 1));

      // swipe
      let x0 = 0,
        dx = 0,
        sw = false;
      const start = (e) => {
        sw = true;
        x0 = e.touches ? e.touches[0].clientX : e.clientX;
      };
      const move = (e) => {
        if (!sw) return;
        const x = e.touches ? e.touches[0].clientX : e.clientX;
        dx = x - x0;
      };
      const end = () => {
        if (!sw) return;
        sw = false;
        if (Math.abs(dx) > stage.clientWidth * 0.18)
          this.go(this.idx + (dx > 0 ? -1 : 1));
        dx = 0;
      };
      stage.addEventListener("pointerdown", start);
      stage.addEventListener("pointermove", move);
      stage.addEventListener("pointerup", end);
      stage.addEventListener("pointerleave", end);
      stage.addEventListener("touchstart", start, { passive: true });
      stage.addEventListener("touchmove", move, { passive: true });
      stage.addEventListener("touchend", end);

      box.appendChild(wrap);
      typeTitle(box, { subEl: sub, titleSpeed: 54, subSpeed: 46 });

      this.idx = 0;
      makeDots();
      this.update();

      const aHint = ui.hint("Tap A to continue");
      box.appendChild(aHint);
      return box;
    },
    exit() {},
    onA() {
      game.completeCurrent();
      confettiBurst("mini");
      game.setScene("Message", "tiles");
    },
    onB() {
      game.setScene("Candle", "tiles");
    },
  };

  /* MESSAGE — reveal hint after finished typing */
  const MSG = [
    "Another year, another chance to tell you how wildly treasured you are.",
    "You chase your dreams with a brave heart and still make space for softness.",
    "Here’s to more laughter, more adventures, and more love around our days.",
  ];
  game.scenes.Message = {
    box: null,
    content: null,
    index: 0,
    enter() {
      this.index = 0;
      const head = document.createElement("div");
      head.className = "ui-box";
      const h = document.createElement("h2");
      h.textContent = "Message";
      const sub = ui.p("A letter for you…");
      sub.style.textAlign = "center";
      sub.style.opacity = ".75";
      head.append(h, sub);

      const wrap = document.createElement("div");
      wrap.className = "msg-wrap";
      this.box = document.createElement("div");
      this.box.className = "msg-box ui-box";
      this.content = document.createElement("div");
      this.content.className = "msg-content";
      this.box.appendChild(this.content);
      wrap.append(head, this.box);

      const note = ui.p("Tap A to continue");
      note.style.textAlign = "center";
      note.style.opacity = "0";
      note.style.transition = "opacity .25s linear";
      wrap.appendChild(note);

      const typeAll = () =>
        new Promise((res) => {
          const step = () => {
            if (this.index >= MSG.length) return res();
            const p = document.createElement("p");
            this.content.appendChild(p);
            typeText(p, MSG[this.index++], 46, () => setTimeout(step, 180));
          };
          step();
        });

      typeTitle(head, { subEl: sub, titleSpeed: 54, subSpeed: 46 }).then(
        async () => {
          await typeAll();
          requestAnimationFrame(() => (note.style.opacity = "1"));
        }
      );
      return wrap;
    },
    exit() {},
    onA() {
      confettiBurst("mini");
      game.completeCurrent();
      game.setScene("Gift", "tiles");
    },
    onB() {
      game.setScene("Memories", "tiles");
    },
  };

  /* GIFT */
  game.scenes.Gift = {
    enter() {
      const box = ui.box("A little gift");
      const sub = ui.p("Save the card or continue to the finale.");
      sub.style.textAlign = "center";
      sub.style.opacity = ".75";
      box.appendChild(sub);
      const frame = document.createElement("div");
      frame.className = "ui-box";
      frame.style.display = "grid";
      frame.style.placeItems = "center";
      frame.style.width = "min(420px,90%)";
      frame.style.aspectRatio = "3/2";
      frame.style.background = "var(--color-2)";
      const img = new Image();
      img.alt = "Love card";
      img.src = "https://picsum.photos/seed/lovecard/960/640";
      img.onerror = () => {
        img.src = "https://picsum.photos/960/640?blur=1";
      };
      img.style.maxWidth = "100%";
      img.style.maxHeight = "100%";
      frame.appendChild(img);
      const row = document.createElement("div");
      row.style.display = "flex";
      row.style.justifyContent = "center";
      row.style.gap = "10px";
      row.style.marginTop = "10px";
      const btnSave = ui.btn("Download PNG");
      const btnGo = ui.btn("Grand Finale →");
      btnSave.addEventListener("click", () => {
        // Buka gambar di tab baru; user bisa Save As dari browser
        const w = window.open(img.src, "_blank", "noopener,noreferrer");
        if (!w) {
          // Fallback kalau popup diblokir
          const a = document.createElement("a");
          a.href = img.src;
          a.target = "_blank";
          a.rel = "noopener";
          a.click();
        }
      });
      btnGo.addEventListener("click", () => {
        confettiBurst("finale");
        audio.play("confirm");
        game.completeCurrent();
        setTimeout(() => game.setScene("Outro"), 700);
      });
      row.append(btnSave, btnGo);
      box.append(frame, row);
      typeTitle(box, { subEl: sub, titleSpeed: 54, subSpeed: 46 });
      return box;
    },
    exit() {},
    onA() {
      confettiBurst("finale");
      setTimeout(() => game.setScene("Outro"), 600);
    },
    onB() {
      game.setScene("Message");
    },
  };

  /* OUTRO */
  game.scenes.Outro = {
    enter() {
      const box = document.createElement("div");
      box.className = "ui-box center";

      const h = document.createElement("h2");
      h.textContent = "Happy Birthday, Natasya! 💖";

      const p = ui.p(
        "May your days be soft, brave, and full of tiny victories."
      );

      const btn = ui.btn("Restart");
      btn.classList.add("outro-btn"); // <- hidden + gap
      btn.addEventListener("click", () => {
        game.progress.clear();
        starCountEl.textContent = "0";
        confettiBurst("mini");
        game.setScene("Intro"); // opening pakai iris auto
      });

      box.append(h, p, btn);

      // Ketik judul -> paragraf, lalu REVEAL tombol
      typeTitle(box, { subEl: p, titleSpeed: 54, subSpeed: 46 }).then(() => {
        requestAnimationFrame(() => btn.classList.add("show")); // muncul setelah selesai
      });

      return box;
    },
    exit() {},
    onA() {
      game.setScene("Intro", "iris");
    },
    onB() {
      game.setScene("Gift", "tiles");
    },
  };

  /* Controls */
  btnA.addEventListener("click", () => {
    audio.play("confirm");
    game.current?.onA?.();
  });
  btnB.addEventListener("click", () => {
    audio.play("cancel");
    game.current?.onB?.();
  });

  /* Init */
  ensureBalloonsLayer();
  game.setScene("Intro", "iris");
})();
