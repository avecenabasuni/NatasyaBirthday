// app.js
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
  const confettiCanvas = document.getElementById("confetti-canvas");
  let confettiApi = null;

  /* ---------- iOS 100vh fix (debounced) ---------- */
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
  const DUR = prefersReduced ? 140 : 520;

  /* ---------- CONFETTI (square) ---------- */
  function initConfetti() {
    try {
      if (window.confetti?.create && confettiCanvas) {
        confettiApi = window.confetti.create(confettiCanvas, {
          resize: true,
          useWorker: true,
        });
      }
    } catch (e) {
      /* no-op */
    }
  }
  initConfetti();
  if (!confettiApi) {
    const s = document.createElement("script");
    s.src =
      "https://cdn.jsdelivr.net/npm/canvas-confetti@1.6.0/dist/confetti.browser.min.js";
    s.async = true;
    s.onload = initConfetti;
    document.head.appendChild(s);
  }
  const confetti = window.confetti?.create
    ? window.confetti.create(confettiCanvas, { resize: true, useWorker: true })
    : null;
  const PALETTE = [
    "#fff5e4",
    "#ffe3e1",
    "#ffd1d1",
    "#ff8ba7",
    "#9ad1ff",
    "#b9ffb3",
  ];
  function confettiBurst(kind = "mini") {
    if (!confettiApi) return; // fail gracefully tanpa error
    const base = { shapes: ["square"], colors: PALETTE };
    if (kind === "mini") {
      confettiApi({
        ...base,
        particleCount: 40,
        spread: 60,
        scalar: 0.9,
        origin: { y: 0.2 },
      });
    } else if (kind === "base") {
      confettiApi({
        ...base,
        particleCount: 100,
        spread: 70,
        startVelocity: 40,
        gravity: 0.9,
      });
    } else if (kind === "finale") {
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

  // ---------- Floating Balloons (global background) ----------
  const layers = { balloons: null, stage: null };

  function rand(min, max) {
    return Math.random() * (max - min) + min;
  }

  function generateBalloons(container, count = 18) {
    container.innerHTML = "";
    for (let i = 0; i < count; i++) {
      const b = document.createElement("i");
      b.className = "ib" + (i % 2 ? " alt" : "");
      const x = Math.random() * 100;
      const y = Math.random() * 100;
      const sizeVmin = Math.round(rand(7, 11));
      const sizePx = Math.round(rand(48, 110));
      const dur = rand(5.5, 8).toFixed(2) + "s";
      const delay = rand(-2, 1.5).toFixed(2) + "s";
      const ampY = Math.round(rand(10, 20)) + "px";
      const ampX = Math.round(rand(-14, 14)) + "px";
      const op = rand(0.18, 0.38).toFixed(2);

      b.style.setProperty("--x", x + "%");
      b.style.setProperty("--y", y + "%");
      b.style.setProperty(
        "--size",
        `clamp(40px, ${sizeVmin}vmin, ${sizePx}px)`
      );
      b.style.setProperty("--dur", dur);
      b.style.setProperty("--delay", delay);
      b.style.setProperty("--ampY", ampY);
      b.style.setProperty("--ampX", ampX);
      b.style.setProperty("--o", op);

      container.appendChild(b);
    }
  }

  function ensureBalloonsLayer() {
    // pastikan #scene-root jadi konteks posisi
    root.style.position = root.style.position || "relative";

    if (!layers.balloons) {
      const deco = document.createElement("div");
      deco.className = "float-balloons"; // style di CSS (absolute, inset:0)
      generateBalloons(deco, 18); // bikin sekali
      layers.balloons = deco;
      root.appendChild(deco);
    }
    if (!layers.stage) {
      const stage = document.createElement("div");
      stage.className = "stage-layer"; // tempat semua konten scene
      root.appendChild(stage);
      layers.stage = stage;
    }
  }

  /* ---------- AUDIO (Howler) — file-based ---------- */
  const AUDIO_BASE = "./assets/audio/";
  const readMuted = () => sessionStorage.getItem("muted") === "1";
  const writeMuted = (flag) =>
    sessionStorage.setItem("muted", flag ? "1" : "0");
  const readBGM = () => sessionStorage.getItem("bgm") === "1";
  const writeBGM = (flag) => sessionStorage.setItem("bgm", flag ? "1" : "0");

  // Sync buttons on load
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
        console.warn(`[audio] loaderror: ${name}`, err)
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
        const codecs = {
          ogg: !!Howler.codecs?.("ogg"),
          mp3: !!Howler.codecs?.("mp3"),
        };
        const src = (name) => {
          const list = [];
          if (codecs.ogg) list.push(`${AUDIO_BASE}${name}.ogg`);
          if (codecs.mp3) list.push(`${AUDIO_BASE}${name}.mp3`);
          if (!list.length) list.push(`${AUDIO_BASE}${name}.mp3`);
          return list;
        };

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
          }),
          "bgm"
        );

        try {
          Howler.mute(this.muted);
        } catch {}
        btnMute.textContent = this.muted ? "🔇" : "🔊";

        // Autoplay BGM according to saved pref (after gesture unlock)
        if (readBGM() && !this.muted) this.bgmHowl?.play();

        this.ready = true;
      } catch {}
    },
    play(name) {
      if (this.ready && !this.muted) this.sfx[name]?.play();
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
    window.addEventListener(
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
    } else {
      audio.bgmOff();
    }
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

  /* ---------- Haptics ---------- */
  const vibe = (ms) => navigator.vibrate && navigator.vibrate(ms);

  // Atur durasi di sini (1–2 detik sesuai keinginan)
  const IRIS_MS = matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 220
    : 2500;
  const TILES_MS = matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 220
    : 1500;

  // === STRICT TRANSITIONS ===
  // 1) Tiles: overlay ON (instan) → animasi tiles selama durasi penuh → swap scene → overlay OFF
  // === STRICT Tiles Transition (tunggu sampai SEMUA tile selesai) ===
  function tilesTransition(cb) {
    if (!fxTiles) {
      cb?.();
      return;
    }

    const dur = TILES_MS;
    fxTiles.style.setProperty("--tiles-dur", `${dur}ms`);
    fxTiles.style.setProperty("--dur", `${dur}ms`);

    // Build tiles + hitung delay maksimum
    fxTiles.innerHTML = "";
    const cols = 14,
      rows = 10,
      total = cols * rows;
    let maxDelay = 0;

    for (let i = 0; i < total; i++) {
      const t = document.createElement("i");
      const delay = ((i % cols) + Math.floor(i / cols)) * (dur / total);
      if (delay > maxDelay) maxDelay = delay;

      // pastikan semua selesai di (delay + dur)
      t.style.animationDelay = `${delay}ms`;
      t.style.animationDuration = `${dur}ms`;
      fxTiles.appendChild(t);
    }

    // Overlay ON instan (tanpa jeda blank)
    const prev = fxTiles.style.transition;
    fxTiles.style.transition = "none";
    fxTiles.classList.remove("active");
    void fxTiles.offsetWidth; // reflow
    fxTiles.classList.add("active"); // tampilkan overlay langsung
    void fxTiles.offsetWidth;
    fxTiles.style.transition = prev;

    // Tunggu sampai SEMUA tile selesai (delay max + dur)
    const totalClose = Math.ceil(maxDelay + dur);

    setTimeout(() => {
      try {
        cb?.();
      } catch {}

      // Lepas overlay pada frame berikutnya (reveal scene baru)
      requestAnimationFrame(() => {
        fxTiles.classList.remove("active");
      });
    }, totalClose);
  }
  // 2) Iris: overlay ON (instan) → animasi iris selama durasi penuh → swap scene → overlay OFF
  function irisTransition(cb) {
    if (!fxIris) {
      cb?.();
      return;
    }

    const dur = IRIS_MS;
    fxIris.style.setProperty("--iris-dur", `${dur}ms`);
    fxIris.style.setProperty("--dur", `${dur}ms`);

    // Overlay ON secara instan (tanpa jeda)
    const prev = fxIris.style.transition;
    fxIris.style.transition = "none";
    fxIris.classList.remove("active");
    void fxIris.offsetWidth;
    fxIris.classList.add("active");
    void fxIris.offsetWidth;
    fxIris.style.transition = prev;

    // Tunggu durasi penuh, baru swap & reveal
    setTimeout(() => {
      try {
        cb?.();
      } catch {}

      requestAnimationFrame(() => {
        fxIris.classList.remove("active");
      });
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

    // internal flags
    _started: false,
    _isTransitioning: false,

    setScene(name, effect = "auto") {
      // cegah re-entrant / spam klik
      if (this._isTransitioning) return;
      // kalau sama, nggak usah transisi
      if (name === this.currentName) return;

      // pilih efek secara otomatis
      const pick = (() => {
        if (prefersReduced) return "none"; // hormati preferensi aksesibilitas
        if (!this._started) return "iris"; // pertama kali: iris
        // override manual kalau kamu pakai "iris"/"tiles"/"none"
        if (effect === "iris" || effect === "tiles" || effect === "none")
          return effect;
        return "tiles"; // sisanya default: tiles
      })();

      const go = () => {
        // masuk scene baru
        try {
          if (this.current?.exit) this.current.exit();
        } catch {}
        layers.stage.replaceChildren(); // <-- kita pakai stage-layer; balon tetap ada
        this.current = this.scenes[name];
        this.currentName = name;
        const el = this.current.enter();
        layers.stage.appendChild(el);

        // fokus elemen penting
        setTimeout(() => {
          const h = layers.stage.querySelector("h1,h2,button,[tabindex]");
          h?.focus?.({ preventScroll: true });
        }, 0);

        starCountEl.textContent = Math.min(8, this.progress.size).toString();

        // selesaikan transisi
        this._isTransitioning = false;
        this._started = true;
      };

      // jalankan transisinya
      this._isTransitioning = true;
      if (pick === "tiles") tilesTransition(go);
      else if (pick === "iris") irisTransition(go);
      else go(); // "none"
    },

    completeCurrent() {
      if (this.currentName) this.progress.add(this.currentName);
      starCountEl.textContent = Math.min(8, this.progress.size).toString();
    },

    next() {
      const i = this.order.indexOf(this.currentName);
      const next = this.order[i + 1] || "Outro";
      // default effect = auto (→ tiles)
      this.setScene(next);
    },

    prev() {
      const i = this.order.indexOf(this.currentName);
      const prev = this.order[i - 1] || "Intro";
      this.setScene(prev);
    },
  };

  /* ---------- Unified typewriter ---------- */
  /* ---------- Unified typewriter (with cursor class) ---------- */
  function typeText(el, text, base = 46, done) {
    let i = 0,
      skipping = false,
      timer = 0;
    el.textContent = "";
    el.__typingActive = true;
    el.classList.add("typing"); // <-- cursor ON

    const skip = () => {
      if (!el.__typingActive) return;
      skipping = true;
      clearTimeout(timer);
      el.textContent = text;
      el.__typingActive = false;
      el.classList.remove("typing"); // <-- cursor OFF
      el.removeEventListener("click", skip);
      el.removeEventListener("touchstart", skip);
      if (typeof done === "function") done();
    };
    el.addEventListener("click", skip, { passive: true });
    el.addEventListener("touchstart", skip, { passive: true });

    const tick = () => {
      if (skipping) return;
      const ch = text[i++];
      el.textContent += ch;
      if (i === 1) audio.play("type");
      if (i < text.length) {
        let delay = base;
        const next3 = text.slice(i - 1, i + 2);
        if (ch === "." || ch === "!" || ch === "?") delay += 260;
        else if (ch === ",") delay += 140;
        else if (ch === "—") delay += 180;
        else if (ch === "…" || next3 === "...") delay += 300;
        timer = setTimeout(tick, delay);
      } else {
        el.__typingActive = false;
        el.classList.remove("typing"); // <-- cursor OFF
        el.removeEventListener("click", skip);
        el.removeEventListener("touchstart", skip);
        if (typeof done === "function") done();
      }
    };
    tick();
  }

  const INTRO_PAUSE = matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 120
    : 650;
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

  function typeQuizOptions(
    listEl,
    {
      badgeSpeed = 40, // kecepatan huruf A/B/C/D
      textSpeed = 46, // kecepatan teks jawaban
      gapBetween = 160, // jeda antar opsi
      afterBadgeGap = 120, // jeda kecil antara badge -> teks
    } = {}
  ) {
    const rows = [...listEl.querySelectorAll("li")];

    let i = 0;
    const playRow = () => {
      if (i >= rows.length) return;
      const btn = rows[i].querySelector(".opt");
      const badge = btn.querySelector(".badge");
      const label = btn.querySelector("span:last-child");

      // simpan isi asli, lalu kosongkan untuk animasi
      const badgeTxt = badge.textContent;
      const labelTxt = label.textContent;
      badge.textContent = "";
      label.textContent = "";

      // ketik badge (A/B/C/D) dulu, lalu teksnya
      typeText(badge, badgeTxt, badgeSpeed, () => {
        setTimeout(() => {
          typeText(label, labelTxt, textSpeed, () => {
            i++;
            setTimeout(playRow, gapBetween);
          });
        }, afterBadgeGap);
      });
    };

    playRow();
  }

  // === Drop-in helpers (letakkan bersama helper lain) ===
  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  function typeInto(el, text, speed = 42) {
    return new Promise((resolve) => {
      el.textContent = "";
      let i = 0;
      const tick = () => {
        if (i === 0) audio.play("type");
        el.textContent += text[i++];
        if (i < text.length) setTimeout(tick, speed);
        else resolve();
      };
      tick();
    });
  }

  /**
   * Animasi opsi quiz satu per satu:
   * - Sembunyikan semua <li> dulu
   * - Untuk tiap <li>: ketik badge (A/B/C/D), jeda, ketik label teks
   * - Setelah selesai, baru lanjut ke item berikutnya
   */
  async function typeQuizOptions(
    list,
    {
      badgeSpeed = 40,
      textSpeed = 46,
      gapBetween = 160, // jeda antar opsi
      afterBadgeGap = 120, // jeda antara badge dan label
    } = {}
  ) {
    const items = [...list.querySelectorAll("li")];

    // Lock & hide semuanya dulu
    items.forEach((li) => {
      li.style.opacity = "0";
      li.style.pointerEvents = "none";
      li.inert = true; // guard a11y/klik
    });

    // Jalankan sequential
    for (const li of items) {
      const btn = li.querySelector(".opt");
      const badge = btn.querySelector(".badge");
      const label = btn.querySelector("span:last-child"); // label teks

      // Simpan konten lalu kosongkan untuk ditulis ulang
      const badgeText = badge.textContent;
      const labelText = label.textContent;
      badge.textContent = "";
      label.textContent = "";

      // Tampilkan item yang lagi dianimasikan
      li.style.opacity = "1";

      await typeInto(badge, badgeText, badgeSpeed);
      await sleep(afterBadgeGap);
      await typeInto(label, labelText, textSpeed);

      // Unlock item ini setelah selesai animasi
      li.style.pointerEvents = "";
      li.inert = false;

      // Jeda sebelum lanjut ke item berikutnya
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

  /* ---------- SCENE: Intro ---------- */
  game.scenes.Intro = {
    enter() {
      const box = ui.box("Happy Birthday, Natasya!");
      box.classList.add("layer-top");
      const sub = ui.p("Tap A to begin your pastel 8-bit quest 💗");
      box.appendChild(sub);

      // typewriter kamu yang sekarang — tetap
      const h = box.querySelector("h1");
      const titleText = h.textContent;
      const subText = sub.textContent;
      h.textContent = "";
      sub.textContent = "";
      h.classList.add("typing");
      const INTRO_PAUSE = 650;
      typeText(h, titleText, 58, () => {
        h.classList.remove("typing");
        setTimeout(() => {
          sub.classList.add("typing");
          typeText(sub, subText, 46, () => sub.classList.remove("typing"));
        }, INTRO_PAUSE);
      });

      // Kembalikan hanya box (konten), karena balon sudah global
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

  /* ---------- SCENE: Quiz ---------- */
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

      // Elemen pertanyaan
      const q = ui.p(QUIZ[this.idx].q);
      wrap.appendChild(q);

      // Siapkan UL dan LI, tapi JANGAN append ke DOM dulu
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

      // Render box & pertanyaan dulu
      box.appendChild(wrap);

      // Ketik judul + pertanyaan… opsi BELUM ada di DOM, jadi tidak mungkin tampil
      // Ketik judul + pertanyaan… opsi BELUM ada di DOM
      typeTitle(box, { subEl: q, titleSpeed: 54, subSpeed: 46 }).then(() => {
        // Setelah selesai: baru masukkan UL
        wrap.appendChild(list);

        // Pastikan belum kelihatan sebelum animasi mulai
        list.style.visibility = "hidden";
        requestAnimationFrame(() => {
          list.style.visibility = "";
          // ⬇️ animasi A → B → C → D, sequential
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
        if (!btn || this.locked) return; // ⬅️ guard dobel klik
        const k = Number(btn.dataset.index);

        if (k === 0) {
          this.locked = true; // ⬅️ lock sampai transisi selesai
          const praise =
            QUIZ[this.idx]?.praise || // ⬅️ snapshot biar gak jadi undefined
            "Nice!"; //    fallback aman

          audio.play("confirm");
          vibe(10);

          // mark & matikan semua opsi biar ga retrigger
          const opts = $$(".opt", root);
          opts.forEach((o) => {
            o.disabled = true;
            o.inert = true;
            o.classList.toggle("correct", o === btn);
            o.classList.remove("wrong");
          });

          // ganti isi kartu jadi dialog pujian
          const card = $(".ui-box", root);
          const title = $(".ui-box h1", root);
          const d = document.createElement("div");
          d.className = "dialog praise";
          const p = document.createElement("div");
          d.appendChild(p);
          card.replaceChildren(title, d);

          // ketik pujian -> lanjut next/finish
          typeText(p, praise, 46, () => {
            setTimeout(() => {
              this.idx++;
              this.locked = false;

              if (this.idx < QUIZ.length) {
                // render pertanyaan berikutnya (opsi juga akan dianimasikan sequential)
                card.replaceWith(this.build());
              } else {
                // layar "Nice!" final tanpa undefined
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

  /* ---------- SCENE: Balloons ---------- */
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
  function balloonSVG(color) {
    return `
      <svg class="balloon-svg" viewBox="0 0 80 110" aria-hidden="true">
        <ellipse cx="40" cy="40" rx="26" ry="32" fill="${color}" stroke="#ff9bb0" stroke-width="3"/>
        <path d="M40 68 L36 74 L44 74 Z" fill="${color}"/>
        <path d="M40 74 C 40 90, 46 96, 40 110" stroke="#caa" stroke-width="2" fill="none"/>
      </svg>`;
  }
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
        const gap = 10;
        const rows = Math.ceil(BALLOON_MSGS.length / cols);
        const availW = grid.clientWidth - gap * (cols - 1);
        const tileByW = Math.floor(availW / cols);
        const availH = grid.clientHeight - gap * (rows - 1);
        const tileByH = Math.floor(availH / rows);
        const tile = Math.max(56, Math.min(tileByW, tileByH));
        grid.style.setProperty("--tile", tile + "px");
      };
      this.ro = new ResizeObserver(layout);
      this.ro.observe(root);
      this.onResize = () => layout();
      addEventListener("resize", this.onResize, { passive: true });
      setTimeout(layout, 0);

      // unified typing
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

  /* ---------- SCENE: Candle ---------- */
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
      box.appendChild(sub);

      const cake = document.createElement("div");
      cake.className = "cake";
      cake.innerHTML = `
        <div class="cake-visual">
          <div class="flame" id="flame"></div>
          <div class="wick"></div>
          <div class="candle"></div>
          <div class="cake-body"></div>
          <div class="cake-plate"></div>
        </div>
        <button class="hold" id="hold">Press & Hold</button>
        <div class="progress"><i id="bar"></i></div>
      `;
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

      // unified typing
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

  /* ---------- SCENE: Memories — 8-bit Slideshow ---------- */
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

      // Stage + nav + dots (8-bit style)
      const wrap = document.createElement("div");
      wrap.className = "ss-wrap";
      wrap.innerHTML = `
      <div class="ss-stage pixel-border">
        <img alt="Memory"/>
        <button class="ss-nav prev" aria-label="Previous">◀</button>
        <button class="ss-nav next" aria-label="Next">▶</button>
      </div>
      <div class="ss-dots" role="tablist" aria-label="Slides"></div>
    `;

      const stage = wrap.querySelector(".ss-stage");
      const img = wrap.querySelector("img");
      const prevBtn = wrap.querySelector(".prev");
      const nextBtn = wrap.querySelector(".next");
      const dots = wrap.querySelector(".ss-dots");

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

      // Swipe/drag
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
        if (Math.abs(dx) > stage.clientWidth * 0.18) {
          this.go(this.idx + (dx > 0 ? -1 : 1));
        }
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

      // typewriter judul → sub
      typeTitle(box, { subEl: sub, titleSpeed: 54, subSpeed: 46 });

      // inisialisasi
      this.idx = 0;
      makeDots();
      this.update();

      // hint A untuk lanjut
      const aHint = ui.hint("Tap A to continue");
      box.appendChild(aHint);

      return box;
    },

    exit() {
      // semua listener terikat ke elemen lokal; akan GC saat scene diganti
    },

    onA() {
      game.completeCurrent();
      confettiBurst("mini");
      game.setScene("Message", "tiles");
    },
    onB() {
      game.setScene("Candle", "tiles");
    },
  };

  /* ---------- SCENE: Message ---------- */
  const MSG = [
    "Another year, another chance to tell you how wildly treasured you are.",
    "You chase your dreams with a brave heart and still make space for softness.",
    "Here’s to more laughter, more adventures, and more love around our days.",
  ];
  /* ---------- SCENE: Message (reveal note after all typed) ---------- */
  game.scenes.Message = {
    box: null,
    content: null,
    index: 0,

    enter() {
      this.index = 0;

      // header
      const head = document.createElement("div");
      head.className = "ui-box";
      const h = document.createElement("h2");
      h.textContent = "Message";
      const sub = ui.p("A letter for you…");
      sub.style.textAlign = "center";
      sub.style.opacity = ".75";
      head.append(h, sub);

      // container
      const wrap = document.createElement("div");
      wrap.className = "msg-wrap";
      this.box = document.createElement("div");
      this.box.className = "msg-box ui-box";
      this.content = document.createElement("div");
      this.content.className = "msg-content";
      this.box.appendChild(this.content);
      wrap.append(head, this.box);

      // NOTE: disembunyikan dulu
      const note = ui.p("Tap A to continue");
      note.style.textAlign = "center";
      note.style.opacity = "0"; // <-- hidden
      note.style.transition = "opacity .25s linear";
      wrap.appendChild(note);

      // helper: ketik semua paragraf berurutan → Promise
      const typeAll = () =>
        new Promise((resolve) => {
          const step = () => {
            if (this.index >= MSG.length) return resolve();
            const p = document.createElement("p");
            this.content.appendChild(p);
            typeText(p, MSG[this.index++], 46, () => setTimeout(step, 180));
          };
          step();
        });

      // jalankan: title → sub → semua paragraf → reveal note
      typeTitle(head, { subEl: sub, titleSpeed: 54, subSpeed: 46 }).then(
        async () => {
          await typeAll();
          requestAnimationFrame(() => (note.style.opacity = "1")); // <-- reveal
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

  /* ---------- SCENE: Gift ---------- */
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
      frame.style.width = "min(420px, 90%)";
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
        const a = document.createElement("a");
        a.href = img.src;
        a.download = "for-natasya.png";
        document.body.appendChild(a);
        a.click();
        a.remove();
      });
      btnGo.addEventListener("click", () => {
        confettiBurst("finale");
        audio.play("confirm");
        game.completeCurrent();
        setTimeout(() => game.setScene("Outro"), 700);
      });

      row.append(btnSave, btnGo);
      box.append(frame, row);

      // unified typing
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

  /* ---------- SCENE: Outro ---------- */
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
      btn.addEventListener("click", () => {
        game.progress.clear();
        starCountEl.textContent = "0";
        confettiBurst("mini");
        game.setScene("Intro");
      });
      box.append(h, p, btn);

      // unified typing
      typeTitle(box, { subEl: p, titleSpeed: 54, subSpeed: 46 });

      return box;
    },
    exit() {},
    onA() {
      game.setScene("Intro", "iris");
    },
    onB() {
      game.setScene("Gift");
    },
  };

  /* ---------- Controls (A/B) ---------- */
  btnA.addEventListener("click", () => {
    audio.play("confirm");
    game.current?.onA?.();
  });
  btnB.addEventListener("click", () => {
    audio.play("cancel");
    game.current?.onB?.();
  });

  /* ---------- Init ---------- */
  ensureBalloonsLayer(); // kalau layer balonmu dipasang manual
  game.setScene("Intro", "iris");
})();
