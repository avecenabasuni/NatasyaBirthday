// game.js (module)
// Dipanggil dari boot.js setelah animasi boot selesai
export async function startGame() {
  // Guard: jangan sampai double init kalau dipanggil dua kali
  if (window.__GAME_STARTED__) return;
  window.__GAME_STARTED__ = true;

  // ==== BEGIN: paste seluruh isi app.js kamu di sini ====
  // Catatan: ga perlu diubah—biarin tetap dalam bentuk IIFE (()=>{ ... })();
  // supaya semua variabel dan scope-nya tetap rapih.

  (() => {
    "use strict";

    /* ==========================================================================
           Natasya — 8-bit Birthday Quest
           app.js — CLEANED, CONSOLIDATED & FULLY-COMMENTED
           --------------------------------------------------------------------------
           Highlights:
           - Utilities ($,$$, debounce, safeClosest), viewport fix, confetti helpers
           - Solid Howler bootstrap: unlock on first gesture, persisted mute/BGM
           - Robust typewriter with global abort token to prevent SFX carry-over
           - Scene Manager with effects (tiles/iris) + reduced motion awareness
           - All scenes consolidated, listeners cleaned on exit
           - “Coach” first-run overlay dims SCENE only (HUD/FOOTER stay clickable)
           - Fixed: target.closest null (TextNode/Shadow DOM) via safeClosest()
           ========================================================================== */

    // ---------------------------------------------------------------------------
    // 1) DOM utilities
    // ---------------------------------------------------------------------------
    const $ = (sel, rootEl = document) => rootEl.querySelector(sel);
    const $$ = (sel, rootEl = document) => [...rootEl.querySelectorAll(sel)];

    /** safeClosest: works on TextNodes & Shadow DOM hosts */
    function safeClosest(target, selector) {
      let el = target;
      if (!(el instanceof Element))
        el = el && (el.parentElement || el.parentNode);
      if (!el && target && typeof target.composedPath === "function") {
        const path = target.composedPath();
        el = path && path.find((n) => n instanceof Element);
      }
      return el && el.closest ? el.closest(selector) : null;
    }

    const prefersReduced = matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    const rand = (a, b) => Math.random() * (b - a) + a;
    const debounce = (fn, wait = 150) => {
      let t = 0;
      return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
      };
    };

    // ---------------------------------------------------------------------------
    // 2) Root elements & constants
    // ---------------------------------------------------------------------------
    const root = document.getElementById("scene-root");
    const btnA = document.getElementById("btnA");
    const btnB = document.getElementById("btnB");
    const btnMute = document.getElementById("btnMute");
    const btnBGM = document.getElementById("btnBGM");
    const starCountEl = document.getElementById("starCount");
    let fxIris = document.getElementById("fx-iris");
    let fxTiles = document.getElementById("fx-tiles");
    const confettiCanvas = document.getElementById("confetti-canvas");

    const COLOR_PALETTE = [
      "#fff5e4",
      "#ffe3e1",
      "#ffd1d1",
      "#ff8ba7",
      "#9ad1ff",
      "#b9ffb3",
    ];

    // ===== i18n / theming (drop-in) =====
    const TEXT = {
      vars: {
        name: "Natasya", // ganti nama di sini sekali saja
        starsTotal: 7,
      },
      global: {
        brand: "🍰 {{name}}'s Day",
        footer: {
          confirm: "Next",
          back: "Back",
          swipe: "Swipe",
          where: "gently Bub!",
        },
      },
      audioSetup: {
        title: "Sound Check",
        sub: "Please enable sound & music to get the full vibe ✨",
        steps: "1) Tap <b>🔊</b> to unmute<br/>2) Tap <b>♫</b> to start music",
        ready: "Ready ✓ Sound ON + Music ON",
        notReady: "Not ready • turn ON both",
        hint: "Tap A to start once both are ON",
      },
      intro: {
        title: "Ready, Meine Liebe?",
        sub: "Your mission is to have the cutest birthday ever! Tap A to begin the mission bub 💞",
      },
      quiz: {
        title: "Quiz Time!",
        items: [
          {
            q: "It's your birthday today, far from home without me huhu, apa reaksi pertamamu ketika aku berikan web game ini sayangku?",
            a: [
              "Lucu amay lucu amay hehehe",
              "Tidak peduli sama sekali, buka TikTok sampe lupa waktu",
              "Tidur 24x7x365",
              "Jadi semangat belajar ngoding Python (si paling data science bro)",
            ],
            praise:
              "hehehe makasih ya sayang udah apresiasi hehe 💖 Even from miles away, I still wanna make you smile.",
          },
          {
            q: "Alright Miss Beauty Traveler, misalna aku tiba-tiba muncul di sana sekarang, apa hal pertama yang bakal kamu lakuin?",
            a: [
              "Nyenyenye terus peluk akuuw 🥺",
              "Liatin aje dari jauh, terus pura-pura ga liat (deja vu pas mini soccer)",
              "Naik gunung tertinggi di Australia",
              "Bodo amat, main HP terus lanjut scroll TikTok aje",
            ],
            praise:
              "WKWKWKWK the classic you that I love, sending virtual hug(s) for you my love 💛",
          },
          {
            q: "Plis pas main ini kamu senyum-senyum dong, kalo gak yaudah lah aku sedih HUH. Tapi, kalau kamu cuma bisa ngomong satu hal ke aku sekarang, apa yang mau kamu omongin ke aku?",
            a: [
              "I miss you so much (aww me too bub), tapi yaudah pura-pura gak kangen aja deh",
              "Nyenyenye",
              "Do you really love me? (you know I do, and YOU NEVER ASKED ME THIS TOO BEFORE HUH, BECAUSE I'M THE ANXIOUS ONE AND I'M PROUD)",
              "Ribut yuk?",
            ],
            praise:
              "Kurang natasya ape lagi, half denial, half feelings, and somehow still the warmest thing ever for me 🩶",
          },
        ],
        finishTitle: "You nailed it!",
        finishText: "Oke deh, kita lanjut pecahin balon satu-satu yuk sayang!",
      },
      balloons: {
        title: "Pop Some Balloons!",
        hint: "Each balloon hides a little message that I want to say to you bub 🎈",
        messages: [
          "Semoga semua harapan kamu terkabul ya sayang",
          "Makasih udah sabar sama aku yang ngeselin ini hehe",
          "Aku sayang sama kamu banget banget banget",
          "Semoga kamu selalu sehat dan bahagia ya bub",
          "Makasih udah jadi diri kamu yang sangat thoughtful dan penyayang",
          "You're my favorite person in the whole wide world",
          "You deserve all the gentle things.",
          "Aku selalu dukung kamu.",
        ],
      },
      candle: {
        title: "Make a Wish, Bub! ✨",
        sub: "Take a deep breath, and make a wish just for yourself bub. Tahan tombol di bawah yaa buat tiup lilinnya 🕯️",
        hold: "Press & Hold",
        granted: "Wish granted! Master's degree here we go!",
      },
      memories: {
        title: "Memory Lane",
        sub: "Swipe ◀ ▶ or tap the arrows",
        hintA: "Tap A to continue",
        ariaPrev: "Previous",
        ariaNext: "Next",
      },
      message: {
        title: "Message",
        sub: "A letter for you…",
        paras: [
          "happy birthday my love. tidak terasa kita sudah 3 bulan pacaran bub dan tidak terasa kamu pun udah ulang tahun, aku ingin berterima kasih sudah hadir di hidup ku, hari-hari ku jadi penuh dengan tawa dan canda pas ada kamu hihi.",
          "pertama kali call kamu, aku suka banget denger kamu ngomong pake suara bayi :3 terus juga kamu sangat rajin weh, kamu sangat pengen terus belajar dan punya goals yang pengen kamu gapai. hal-hal kecil kaya kirimin pap cantik kamu tiap harina membuat hari-hariku berwarna hehehe.",
          "setiap momen sama kamu sangat berkesan buat aku, semoga kedepannya kita bisa buat memori bahagia lainnya ya sayang. doaku: semoga kamu bisa mendapatkan s2 di kampus terbaik untuk dirimu!",
        ],
        hintA: "Tap A to continue",
      },
      gift: {
        title: "A little gift card",
        sub: "Save the card or continue to the finale.",
        download: "Download PNG",
        finale: "Grand Finale >",
      },
      outro: {
        title: "Happy Birthday, Nata 💖",
        text: "Thank you for playing this little game from me. May Allah bless you with endless happiness and success in life. Can't wait to see you again soon! 🌸",
        restart: "Restart",
      },
      coach: {
        ring: {
          title: "Turn on your Ring 🔔",
          body: "Pastiin ga di Silent ya dan volume suara digedein.",
          test: "Test beep",
          next: "Continue",
          skip: "Skip",
        },
        unmute: {
          title: "Enable Sound",
          body: "Tap <b>🔊</b> to unmute effects.",
          skip: "Skip",
        },
        music: {
          title: "Start Music",
          body: "Tap <b>♫</b> to play the some music.",
          skip: "Skip",
        },
        ready: {
          title: "All set!",
          body: "Sound & music are on. Enjoy 🎂",
          begin: "Begin",
        },
      },
    };

    /* === 3D Tilt Helper === */
    function enableTilt(card, { max = 12, scale = 1.03, glare = true } = {}) {
      // wrap untuk perspektif
      const wrap = document.createElement("div");
      wrap.className = "tilt-wrap";
      card.parentNode.insertBefore(wrap, card);
      wrap.appendChild(card);

      card.classList.add("tilt-card");

      let glareEl = null;
      if (glare) {
        glareEl = document.createElement("i");
        glareEl.className = "tilt-glare";
        card.appendChild(glareEl);
      }

      const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (rm) return () => {}; // no-op bila reduce motion

      let rect = null,
        raf = 0,
        active = false;

      const getPoint = (e) => {
        const t = e.touches ? e.touches[0] : e;
        return { x: t.clientX, y: t.clientY };
      };

      const onEnter = (e) => {
        rect = card.getBoundingClientRect();
        active = true;
        card.classList.add("is-active");
      };

      const onMove = (e) => {
        if (!active || !rect) return;
        const { x, y } = getPoint(e);
        const px = (x - rect.left) / rect.width - 0.5; // -0.5 .. 0.5
        const py = (y - rect.top) / rect.height - 0.5; // -0.5 .. 0.5
        const rx = -py * 2 * max;
        const ry = px * 2 * max;

        cancelAnimationFrame(raf);
        raf = requestAnimationFrame(() => {
          card.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) scale(${scale})`;
          if (glareEl) {
            const d = Math.hypot(px, py);
            glareEl.style.opacity = Math.min(0.45, 0.12 + d * 0.5);
            // geser highlight dikit mengikuti pointer
            const gx = 50 + px * 40; // %
            const gy = 50 + py * 40; // %
            glareEl.style.background = `radial-gradient(140px 100px at ${gx}% ${gy}%, rgba(255,255,255,.45), rgba(255,255,255,0) 60%)`;
          }
        });
      };

      const onLeave = () => {
        active = false;
        cancelAnimationFrame(raf);
        card.style.transform = "";
        if (glareEl) glareEl.style.opacity = "0";
        card.classList.remove("is-active");
      };

      // pointer & touch
      card.addEventListener("pointerenter", onEnter);
      card.addEventListener("pointermove", onMove);
      card.addEventListener("pointerleave", onLeave);
      card.addEventListener("touchstart", onEnter, { passive: true });
      card.addEventListener("touchmove", onMove, { passive: true });
      card.addEventListener("touchend", onLeave);
      card.addEventListener("touchcancel", onLeave);

      // cleanup
      return () => {
        card.removeEventListener("pointerenter", onEnter);
        card.removeEventListener("pointermove", onMove);
        card.removeEventListener("pointerleave", onLeave);
        card.removeEventListener("touchstart", onEnter);
        card.removeEventListener("touchmove", onMove);
        card.removeEventListener("touchend", onLeave);
        card.removeEventListener("touchcancel", onLeave);
        if (glareEl) glareEl.remove();
        card.classList.remove("tilt-card");
        card.style.transform = "";
        wrap.before(card);
        wrap.remove();
      };
    }

    // Tiny helper: deep get + template {{var}}
    function t(path, params = {}) {
      const val = path
        .split(".")
        .reduce((o, k) => (o ? o[k] : undefined), TEXT);
      const all = { ...TEXT.vars, ...params };
      if (typeof val === "string") {
        return val.replace(/\{\{(\w+)\}\}/g, (_, k) =>
          k in all ? String(all[k]) : ""
        );
      }
      return val;
    }

    function ensureFxLayers() {
      // Pastikan root ada
      const rootEl = document.getElementById("scene-root");
      if (!rootEl) return;

      // IRIS
      if (!fxIris || !fxIris.parentNode) {
        fxIris = document.createElement("div");
        fxIris.id = "fx-iris";
        fxIris.className = "fx-iris";
        rootEl.appendChild(fxIris);
      }
      // TILES
      if (!fxTiles || !fxTiles.parentNode) {
        fxTiles = document.createElement("div");
        fxTiles.id = "fx-tiles";
        fxTiles.className = "fx-tiles";
        rootEl.appendChild(fxTiles);
      }

      // Kadang visibility sempat di-hidden saat boot — pastikan terlihat
      fxIris.style.display = "";
      fxTiles.style.display = "";
      fxIris.style.opacity = "";
      fxTiles.style.opacity = "";
    }

    // ---------------------------------------------------------------------------
    // 3) Mobile viewport correction (iOS 100vh fix)
    // ---------------------------------------------------------------------------
    const setVH = () =>
      document.documentElement.style.setProperty("--vh", String(innerHeight));
    setVH();
    addEventListener("resize", debounce(setVH, 150), { passive: true });
    addEventListener("orientationchange", setVH, { passive: true });

    // ---------------------------------------------------------------------------
    // 4) Confetti helpers (canvas-confetti if available)
    // ---------------------------------------------------------------------------
    let confettiApi = null;
    function initConfetti() {
      try {
        if (!confettiApi && window.confetti?.create && confettiCanvas) {
          confettiApi = window.confetti.create(confettiCanvas, {
            resize: true,
            useWorker: true,
          });
        }
      } catch {
        /* canvas-confetti not present — silently ignore */
      }
    }
    initConfetti();
    if (!confettiApi) addEventListener("load", initConfetti, { once: true });

    function confettiBurst(kind = "mini") {
      if (!confettiApi) return;
      const base = { shapes: ["square"], colors: COLOR_PALETTE };

      if (kind === "mini") {
        confettiApi({
          ...base,
          particleCount: 40,
          spread: 60,
          scalar: 0.9,
          origin: { y: 0.2 },
        });
        return;
      }
      if (kind === "base") {
        confettiApi({
          ...base,
          particleCount: 100,
          spread: 70,
          startVelocity: 40,
          gravity: 0.9,
        });
        return;
      }
      // finale
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

    // ---------------------------------------------------------------------------
    // 5) Scene layers: background balloons + scene container
    // ---------------------------------------------------------------------------
    const layers = { balloons: null, stage: null };

    function generateBalloons(container, count = 18) {
      container.innerHTML = "";
      for (let i = 0; i < count; i++) {
        const b = document.createElement("i");
        b.className = "ib" + (i % 2 ? " alt" : "");
        const x = Math.random() * 100,
          y = Math.random() * 100;
        const sizeVmin = Math.round(rand(7, 11));
        const sizePx = Math.round(rand(48, 110));
        b.style.setProperty("--x", `${x}%`);
        b.style.setProperty("--y", `${y}%`);
        b.style.setProperty(
          "--size",
          `clamp(40px, ${sizeVmin}vmin, ${sizePx}px)`
        );
        b.style.setProperty("--dur", `${rand(5.5, 8).toFixed(2)}s`);
        b.style.setProperty("--delay", `${rand(-2, 1.5).toFixed(2)}s`);
        b.style.setProperty("--ampY", `${Math.round(rand(10, 20))}px`);
        b.style.setProperty("--ampX", `${Math.round(rand(-14, 14))}px`);
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

    // ---------------------------------------------------------------------------
    // 6) Audio (Howler) — robust first-gesture unlock + persisted settings
    // ---------------------------------------------------------------------------
    const AUDIO_BASE = "./assets/audio/";
    const readMuted = () => sessionStorage.getItem("muted") === "1";
    const writeMuted = (f) => sessionStorage.setItem("muted", f ? "1" : "0");
    const readBGM = () => sessionStorage.getItem("bgm") === "1";
    const writeBGM = (f) => sessionStorage.setItem("bgm", f ? "1" : "0");

    // Reflect persisted state on buttons immediately (even before unlock)
    (() => {
      const m = readMuted();
      try {
        Howler?.mute?.(m);
      } catch {}
      if (btnMute) btnMute.textContent = m ? "🔇" : "🔊";
      const on = readBGM();
      if (btnBGM) btnBGM.setAttribute("aria-pressed", on ? "true" : "false");
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
          Howler.autoSuspend = false;
        } catch {}

        // Ensure WebAudio context is running in the gesture
        try {
          if (
            typeof Howler !== "undefined" &&
            Howler.ctx &&
            Howler.ctx.state !== "running"
          ) {
            Howler.autoUnlock = true;
            const p = Howler.ctx.resume?.();
            if (p?.catch) p.catch(() => {});
          }
        } catch {}

        // Build sounds once
        const src = (name) => [
          `${AUDIO_BASE}${name}.mp3`,
          `${AUDIO_BASE}${name}.ogg`,
        ];
        try {
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
        } catch {}

        // Apply mute & maybe play BGM
        try {
          Howler.mute(this.muted);
        } catch {}
        if (btnMute) btnMute.textContent = this.muted ? "🔇" : "🔊";
        if (readBGM() && !this.muted) this.bgmHowl?.play();

        this.ready = true;
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
        if (btnMute) btnMute.textContent = this.muted ? "🔇" : "🔊";
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

    // First trusted gesture → unlock audio exactly once
    let _audioBootstrapped = false;
    function bootstrapAudioFromEvent() {
      if (_audioBootstrapped) return;
      _audioBootstrapped = true;

      try {
        if (typeof Howler !== "undefined" && Howler.ctx) {
          Howler.autoUnlock = true;
          const maybeResume = Howler.ctx.resume?.();
          if (maybeResume?.catch) maybeResume.catch(() => {});
        }
      } catch {}

      try {
        audio.unlock();
      } catch {}

      window.removeEventListener("pointerdown", bootstrapAudioFromEvent, true);
      window.removeEventListener("touchstart", bootstrapAudioFromEvent, true);
    }
    window.addEventListener("pointerdown", bootstrapAudioFromEvent, true);
    window.addEventListener("touchstart", bootstrapAudioFromEvent, true);

    // HUD audio controls
    btnMute?.addEventListener("click", () => {
      audio.toggleMute();
      maybeAdvanceFromAudioSetup();
    });
    btnBGM?.addEventListener("click", () => {
      audio.unlock();
      const next = btnBGM.getAttribute("aria-pressed") !== "true";
      btnBGM.setAttribute("aria-pressed", next ? "true" : "false");
      writeBGM(next);
      if (next) {
        if (!audio.muted) audio.bgmOn();
      } else {
        audio.bgmOff();
      }
      maybeAdvanceFromAudioSetup();
    });

    // Keep BGM alive on tab visibility toggles
    document.addEventListener("visibilitychange", () => {
      try {
        if (Howler?.ctx?.state === "suspended")
          Howler.ctx.resume().catch(() => {});
      } catch {}
      if (document.visibilityState === "visible") {
        if (readBGM() && !audio.muted && !audio.bgmHowl?.playing())
          audio.bgmOn();
      }
    });

    function isAudioReady() {
      return !audio.muted && readBGM();
    }
    function maybeAdvanceFromAudioSetup() {
      if (game.currentName === "AudioSetup" && isAudioReady()) {
        confettiBurst("mini");
        audio.play("confirm");
        game.completeCurrent?.();
        game.setScene("Intro", "tiles");
      }
    }

    // Avoid accidental text selections on the hold button (extra safety)
    document.addEventListener(
      "selectstart",
      (e) => {
        if (safeClosest(e.target, ".hold")) e.preventDefault();
      },
      { passive: false }
    );

    const vibe = (ms) => navigator.vibrate && navigator.vibrate(ms);

    // ---------------------------------------------------------------------------
    // 7) Transitions (iris/tiles) with reduced-motion fallback
    // ---------------------------------------------------------------------------
    const IRIS_MS = prefersReduced ? 220 : 1600;
    const TILES_MS = prefersReduced ? 220 : 1400;

    function tilesTransition(cb) {
      ensureFxLayers();
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
        const delay = ((i % cols) + Math.floor(i / cols)) * (dur / total);
        if (delay > maxDelay) maxDelay = delay;
        t.style.animationDelay = `${delay}ms`;
        t.style.animationDuration = `${dur}ms`;
        fxTiles.appendChild(t);
      }

      // Pastikan elemen kelihatan & siap dianimasikan
      fxTiles.style.visibility = "visible";
      fxTiles.style.display = "grid";

      // Double rAF supaya perubahan layout tersinkron sebelum toggle .active
      requestAnimationFrame(() => {
        fxTiles.classList.remove("active");
        void fxTiles.offsetWidth; // reflow
        requestAnimationFrame(() => {
          fxTiles.classList.add("active");
          const totalMs = Math.ceil(maxDelay + dur);
          setTimeout(() => {
            try {
              cb?.();
            } catch {}
            requestAnimationFrame(() => fxTiles.classList.remove("active"));
          }, totalMs);
        });
      });
    }

    function irisTransition(cb) {
      ensureFxLayers();
      if (!fxIris) {
        cb?.();
        return;
      }

      const dur = IRIS_MS;
      fxIris.style.setProperty("--iris-dur", `${dur}ms`);
      fxIris.style.visibility = "visible";
      fxIris.style.display = "block";

      requestAnimationFrame(() => {
        fxIris.classList.remove("active");
        void fxIris.offsetWidth; // reflow
        requestAnimationFrame(() => {
          fxIris.classList.add("active");
          setTimeout(() => {
            try {
              cb?.();
            } catch {}
            requestAnimationFrame(() => fxIris.classList.remove("active"));
          }, dur);
        });
      });
    }

    // --- Star scoring setup ---
    const STAR_SCENES = new Set([
      "Intro",
      "Quiz",
      "Balloons",
      "Candle",
      "Memories",
      "Message",
      "Gift",
    ]);
    const TOTAL_STARS = STAR_SCENES.size; // 7

    function calcStars(progressSet) {
      let n = 0;
      for (const s of progressSet) if (STAR_SCENES.has(s)) n++;
      return n;
    }

    function rankFor(stars) {
      const p = stars / TOTAL_STARS;
      if (p >= 1) return { grade: "S", note: "Perfect run!" };
      if (p >= 0.86) return { grade: "A", note: "So close ✨" };
      if (p >= 0.57) return { grade: "B", note: "Nice!" };
      if (p >= 0.29) return { grade: "C", note: "Warm-up clear" };
      return { grade: "D", note: "Practice mode" };
    }

    // ---------------------------------------------------------------------------
    // 8) Scene Manager
    // ---------------------------------------------------------------------------
    const game = {
      scenes: {},
      current: null,
      currentName: "",
      progress: new Set(),
      order: [
        "Boot",
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
        abortTyping(); // kill any typing & type SFX in-flight
        if (this._isTransitioning || name === this.currentName) return;

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

          // Focus something meaningful quickly (no scroll)
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
        if (STAR_SCENES.has(this.currentName)) {
          this.progress.add(this.currentName);
        }
        const stars = calcStars(this.progress);
        starCountEl.textContent = Math.min(TOTAL_STARS, stars).toString();
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

    // ---------------------------------------------------------------------------
    // 9) Typewriter system (with global abort)
    // ---------------------------------------------------------------------------
    let TYPE_ABORT = 0; // increment to cancel all pending ticks

    function abortTyping() {
      TYPE_ABORT++;
      try {
        audio.sfx.type?.stop();
      } catch {}
    }

    // fine-grain tick typing (smart pauses)
    function typeText(el, text, base = 46, done) {
      const token = TYPE_ABORT;
      let i = 0;
      let skipping = false;
      let timer = 0;

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
        if (TYPE_ABORT !== token || skipping) return;
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

    const sleep = (ms) =>
      new Promise((r) => {
        const token = TYPE_ABORT;
        setTimeout(() => {
          if (TYPE_ABORT === token) r();
        }, ms);
      });

    // helper for titling + optional subtitle with pause
    const INTRO_PAUSE = prefersReduced ? 120 : 650;
    function typeTitle(
      box,
      { subEl = null, titleSpeed = 58, subSpeed = 46, pause = INTRO_PAUSE } = {}
    ) {
      return new Promise((resolve) => {
        const h = box.querySelector("h1,h2");
        if (!h) return resolve();

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

    // tiny helper: type a whole string at fixed speed
    const typeInto = (el, text, speed = 42) =>
      new Promise((res) => {
        const token = TYPE_ABORT;
        el.textContent = "";
        let i = 0;
        const tick = () => {
          if (TYPE_ABORT !== token) return;
          if (i === 0) audio.play("type");
          el.textContent += text[i++];
          if (i < text.length) setTimeout(tick, speed);
          else res();
        };
        tick();
      });

    // progressively reveal quiz options (badge → label)
    async function typeQuizOptions(
      list,
      {
        badgeSpeed = 40,
        textSpeed = 46,
        gapBetween = 160,
        afterBadgeGap = 120,
      } = {}
    ) {
      const token = TYPE_ABORT;
      const items = [...list.querySelectorAll("li")];
      items.forEach((li) => {
        li.style.opacity = "0";
        li.style.pointerEvents = "none";
        li.inert = true;
      });

      for (const li of items) {
        if (TYPE_ABORT !== token) return;
        const btn = li.querySelector(".opt");
        const badge = btn.querySelector(".badge");
        const label = btn.querySelector("span:last-child");
        const b = badge.textContent;
        const t = label.textContent;

        badge.textContent = "";
        label.textContent = "";
        li.style.opacity = "1";

        await typeInto(badge, b, badgeSpeed);
        await sleep(afterBadgeGap);
        if (TYPE_ABORT !== token) return;
        await typeInto(label, t, textSpeed);

        li.style.pointerEvents = "";
        li.inert = false;
        await sleep(gapBetween);
      }
    }

    // ---------------------------------------------------------------------------
    // 10) UI helpers
    // ---------------------------------------------------------------------------
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

    // ---------------------------------------------------------------------------
    // 11) Scenes
    // ---------------------------------------------------------------------------

    // --- AUDIO SETUP (gate before Intro) ----------------------------------------
    game.scenes.AudioSetup = {
      _timer: 0,
      enter() {
        btnMute?.classList.add("highlight");
        btnBGM?.classList.add("highlight");

        const box = ui.box(t("audioSetup.title"));
        box.classList.add("audio-setup");

        const sub = ui.p(t("audioSetup.sub"));
        sub.style.opacity = ".8";
        sub.style.textAlign = "center";
        box.appendChild(sub);

        const steps = document.createElement("div");
        steps.className = "steps";
        steps.innerHTML = t("audioSetup.steps");
        box.appendChild(steps);

        const status = document.createElement("p");
        status.className = "status";
        box.appendChild(status);

        const hint = ui.hint(t("audioSetup.hint"));
        box.appendChild(hint);

        const update = () => {
          const ok = isAudioReady();
          status.innerHTML = ok
            ? `<span class="ok">${t("audioSetup.ready")}</span>`
            : `<span class="warn">${t("audioSetup.notReady")}</span>`;
          if (ok) {
            clearInterval(this._timer);
            this._timer = 0;
            setTimeout(() => maybeAdvanceFromAudioSetup(), 350);
          }
        };
        update();
        this._timer = setInterval(update, 300);
        return box;
      },
      exit() {
        clearInterval(this._timer);
        this._timer = 0;
        btnMute?.classList.remove("highlight");
        btnBGM?.classList.remove("highlight");
      },
      onA() {
        if (isAudioReady()) {
          confettiBurst("mini");
          audio.play("confirm");
          game.setScene("Intro", "tiles");
        } else {
          vibe(30);
          btnMute?.classList.add("highlight");
          btnBGM?.classList.add("highlight");
        }
      },
      onB() {
        vibe(15);
      },
    };

    // --- BOOT (auto power-on; no input needed) ------------------------------------
    game.scenes.Boot = {
      _timer: 0,

      enter() {
        // Sembunyikan HUD/footer saat boot
        document.body.classList.add("booting");

        const wrap = document.createElement("div");
        wrap.className = "boot-wrap";
        wrap.setAttribute("aria-label", "Game Boy boot");

        wrap.innerHTML = `
            <div class="boot-screen pixel-border">
              <i class="boot-scan"></i>
              <div class="boot-led" aria-hidden="true"></div>
              <div class="boot-logo">
                <span class="boot-drop">NINTENDO</span>
              </div>
              <p class="boot-credit">Made with 💖 by Avenya</p>
            </div>
          `;

        // minimal "ding" pakai WebAudio (tanpa Howler)
        const ding = () => {
          try {
            const Ctx = window.AudioContext || window.webkitAudioContext;
            const ctx = new Ctx();
            const o = ctx.createOscillator();
            const g = ctx.createGain();
            o.type = "square";
            o.frequency.setValueAtTime(880, ctx.currentTime);
            o.frequency.exponentialRampToValueAtTime(
              1174,
              ctx.currentTime + 0.1
            );
            g.gain.setValueAtTime(0.07, ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
            o.connect(g);
            g.connect(ctx.destination);
            o.start();
            o.stop(ctx.currentTime + 0.2);
            o.onended = () => ctx.close();
          } catch {}
        };

        const rm = matchMedia("(prefers-reduced-motion: reduce)").matches;
        const logo = wrap.querySelector(".boot-drop");
        const credit = wrap.querySelector(".boot-credit");

        requestAnimationFrame(() => {
          logo.classList.add("show");
          if (!rm) setTimeout(ding, 320);
          else ding();
          setTimeout(() => credit.classList.add("show"), rm ? 120 : 700);
        });

        // Auto selesai setelah animasi
        const ms = rm ? 900 : 1800;
        this._timer = setTimeout(() => this.finish(), ms);

        return wrap;
      },

      finish() {
        clearTimeout(this._timer);
        this._timer = 0;

        // Tampilkan HUD/footer lagi
        document.body.classList.remove("booting");

        // Baru load layer/coach setelah boot
        ensureBalloonsLayer();
        coach.startIfNeeded();
      },

      exit() {
        clearTimeout(this._timer);
        this._timer = 0;
      },

      onA() {}, // tidak dipakai
      onB() {}, // tidak dipakai
    };

    // --- INTRO -------------------------------------------------------------------
    game.scenes.Intro = {
      enter() {
        const box = ui.box(t("intro.title"));
        box.classList.add("layer-top");
        const sub = ui.p(t("intro.sub"));
        box.appendChild(sub);

        const h = box.querySelector("h1");
        const titleText = h.textContent;
        const subText = sub.textContent;
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

    // --- QUIZ --------------------------------------------------------------------
    // const QUIZ = [
    //   {
    //     q: "“When we celebrate a win, what do we reach for first?”",
    //     a: [
    //       "Cake and our favourite playlist",
    //       "A polite congratulatory handshake",
    //       "A stack of emails to answer",
    //       "A round of chores to stay humble",
    //     ],
    //     praise: "Correct! 🎉 Celebrate like we mean it.",
    //   },
    //   {
    //     q: "“Which word describes how you shine today?”",
    //     a: [
    //       "Radiant — glowing from the inside out",
    //       "Sleepless — probably need a nap",
    //       "Ordinary — nothing special happening",
    //       "Invisible — hiding from the world",
    //     ],
    //     praise: "Radiant it is! ✨ Keep glowing.",
    //   },
    //   {
    //     q: "“Where should our next adventure take us?”",
    //     a: [
    //       "Sunset picnic by a secret seaside",
    //       "Back to spreadsheets and inboxes",
    //       "A room with zero windows",
    //       "No adventure — let’s stay put",
    //     ],
    //     praise: "Seaside sunsets, coming right up 🌅",
    //   },
    // ];
    const QUIZ = t("quiz.items");

    game.scenes.Quiz = {
      idx: 0,
      _onClick: null,
      locked: false,

      build() {
        const box = ui.box(t("quiz.title"));
        const wrap = document.createElement("div");
        wrap.className = "quiz";
        const q = ui.p(t("quiz.items")[this.idx].q);
        wrap.appendChild(q);

        const list = document.createElement("ul");
        list.setAttribute("role", "list");
        const letters = ["A", "B", "C", "D"];
        const frag = document.createDocumentFragment();

        t("quiz.items")[this.idx].a.forEach((txt, k) => {
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
        this.locked = false;
        const el = this.build();

        this._onClick = (e) => {
          const btn = safeClosest(e.target, ".opt");
          if (!btn || this.locked) return;

          // Prevent SFX carry-over to next question
          abortTyping();

          const k = Number(btn.dataset.index);
          if (k === 0) {
            this.locked = true;
            const praise =
              t("quiz.items")[this.idx]?.praise || t("quiz.finishTitle");
            audio.play("confirm");
            vibe(10);

            $$(".opt", root).forEach((o) => {
              o.disabled = true;
              o.inert = true;
              o.classList.toggle("correct", o === btn);
              o.classList.remove("wrong");
            });

            const card = $(".ui-box", root);
            const title = $(".ui-box h1", root);
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
                  abortTyping();
                  card.replaceWith(this.build());
                } else {
                  const finCard = ui.box(t("quiz.finishTitle"));
                  const fin = document.createElement("div");
                  fin.className = "dialog praise";
                  const sub = document.createElement("div");
                  fin.appendChild(sub);
                  finCard.appendChild(fin);
                  layers.stage.replaceChildren(finCard);
                  typeText(sub, t("quiz.finishText"), 46, () => {
                    setTimeout(() => {
                      confettiBurst("mini");
                      game.completeCurrent();
                      game.setScene("Balloons");
                    }, 620);
                  });
                }
              }, 620);
            });
          } else {
            abortTyping();
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

    // --- BALLOONS ----------------------------------------------------------------
    // const BALLOON_MSGS = [
    //   "Aku suka caramu menenangkan aku.",
    //   "Terima kasih sudah sabar sama kekuranganku.",
    //   "Kamu bikin hari biasa jadi spesial.",
    //   "Tetap jadi kamu yang hangat ya.",
    //   "Aku bangga sama growth kamu.",
    //   "Semoga mimpi-mimpimu makin dekat.",
    //   "You deserve all the gentle things.",
    //   "Aku selalu dukung kamu.",
    // ];

    const BALLOON_MSGS = t("balloons.messages");
    const balloonSVG = (c) =>
      `<svg class="balloon-svg" viewBox="0 0 80 110" aria-hidden="true">
            <ellipse cx="40" cy="40" rx="26" ry="32" fill="${c}" stroke="#ff9bb0" stroke-width="3"/>
            <path d="M40 68 L36 74 L44 74 Z" fill="${c}"/>
            <path d="M40 74 C 40 90, 46 96, 40 110" stroke="#caa" stroke-width="2" fill="none"/>
          </svg>`;

    // --- BALLOONS (2 kolom × 3 baris tetap) ---------------------------------------
    game.scenes.Balloons = {
      popped: 0,
      listeners: [],
      ro: null,
      onResize: null,

      enter() {
        this.popped = 0;

        const box = ui.box(t("balloons.title"));
        const hint = ui.p(t("balloons.hint"));
        box.appendChild(hint);
        box.style.height = "100%";
        box.style.display = "flex";
        box.style.flexDirection = "column";

        const grid = document.createElement("div");
        grid.className = "grid";
        grid.style.flex = "1";

        // ✅ Ambil persis 6 pesan (2×3). Kalau mau acak tiap buka, pakai shuffle & slice.
        const MSGS = BALLOON_MSGS.slice(0, 6);

        MSGS.forEach((msg, i) => {
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

            if (++this.popped === MSGS.length) {
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
        // tiles sedikit lebih besar: scale 0.90 + clamp [72, 144] + gap 10px
        // tiles lebih besar: scale 0.98, clamp [80, 168], gap 8px
        const layout = () => {
          const cols = 2;
          const rows = 3;
          grid.style.setProperty("--cols", cols);
          grid.style.gap = "8px"; // kasih ruang supaya tile bisa membesar
          const gap = parseFloat(getComputedStyle(grid).gap) || 8;

          // hitung tinggi area isi card (tanpa judul + hint + padding)
          const cs = getComputedStyle(box);
          const padY =
            parseFloat(cs.paddingTop || "0") +
            parseFloat(cs.paddingBottom || "0");
          const headH =
            (box.querySelector("h1")?.offsetHeight || 0) +
            (hint?.offsetHeight || 0) +
            8;

          // sedikit safety agar tak nabrak footer (termasuk safe-area iOS)
          const safeBottom =
            (parseFloat(
              getComputedStyle(document.documentElement).getPropertyValue(
                "--space"
              )
            ) || 0) + (window.visualViewport ? 2 : 0);

          const gridH = Math.max(
            120,
            Math.floor(box.clientHeight - padY - headH - safeBottom)
          );

          const availW = grid.clientWidth - gap * (cols - 1);
          const availH = gridH - gap * (rows - 1);

          // perbesar dari sebelumnya
          const SCALE = 0.975;
          let tile = Math.floor(Math.min(availW / cols, availH / rows) * SCALE);

          // clamp lebih longgar supaya terasa besar, tapi tetap aman
          tile = Math.max(80, Math.min(tile, 168));

          grid.style.setProperty("--tile", tile + "px");
        };

        // gunakan ResizeObserver + raf tujuannya stabil di Safari
        this.ro = new ResizeObserver(() => {
          requestAnimationFrame(() => requestAnimationFrame(layout));
        });
        this.ro.observe(layers.stage || root);

        this.onResize = () => layout();
        addEventListener("resize", this.onResize, { passive: true });

        // panggil beberapa kali untuk memastikan ukuran sudah final di Safari
        requestAnimationFrame(() => {
          layout();
          setTimeout(layout, 0);
          setTimeout(layout, 120);
        });

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

    // --- CANDLE -------------------------------------------------------------------
    game.scenes.Candle = {
      holding: false,
      raf: 0,
      holdMs: 1200,
      holdEl: null,
      barEl: null,
      flameEl: null,

      enter() {
        const box = ui.box(t("candle.title"));
        const sub = ui.p(t("candle.sub"));
        sub.style.textAlign = "center";
        sub.style.opacity = ".75";
        sub.style.marginBottom = "clamp(10px, 2.5vmin, 18px)"; // spacing to cake
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
              <button class="hold" id="hold">${t("candle.hold")}</button>
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
              this.holdEl.textContent = t("candle.granted");
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

    // --- MEMORIES (8-bit slideshow) ----------------------------------------------
    function attachPhotoOverlays(stageEl, getIndex, getTotal, getCaption) {
      stageEl.classList.add("hud-mini", "crt", "vignette");

      // toast
      const toast = document.createElement("div");
      toast.className = "ss-toast";
      stageEl.appendChild(toast);

      const updateHUD = () => {
        const idx = getIndex() + 1;
        stageEl.setAttribute("data-stage", String(idx).padStart(2, "0"));
        const cap = getCaption(getIndex());
        if (cap) {
          toast.textContent = cap;
          toast.classList.add("show");
        } else {
          toast.classList.remove("show");
        }
      };

      // expose updater
      return { updateHUD };
    }

    // simple SVGs (inline) biar tanpa asset eksternal
    const SVG = {
      heart: `<svg viewBox="0 0 64 64" fill="#ff3d7f" xmlns="http://www.w3.org/2000/svg">
    <path stroke="#000" stroke-width="3" d="M32 56C10 40 6 32 6 22a12 12 0 0 1 22-7
      a1 1 0 0 0 8 0a12 12 0 0 1 22 7c0 10-4 18-26 34Z"/></svg>`,
      coin: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <ellipse cx="32" cy="20" rx="22" ry="12" fill="#ffde59" stroke="#000" stroke-width="3"/>
    <ellipse cx="32" cy="32" rx="22" ry="12" fill="#ffde59" stroke="#000" stroke-width="3"/>
    <ellipse cx="32" cy="44" rx="22" ry="12" fill="#ffde59" stroke="#000" stroke-width="3"/></svg>`,
      stick: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <rect x="8" y="30" width="48" height="22" rx="4" fill="#222"
      stroke="#000" stroke-width="3"/><circle cx="20" cy="24" r="8" fill="#ff3d7f"
      stroke="#000" stroke-width="3"/><rect x="14" y="24" width="12" height="12" fill="#333"
      stroke="#000" stroke-width="3"/></svg>`,
      pad: `<svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg">
    <rect x="6" y="26" width="52" height="20" rx="10" fill="#d9d9d9" stroke="#000" stroke-width="3"/>
    <rect x="16" y="32" width="10" height="8" fill="#333" stroke="#000" stroke-width="3"/>
    <circle cx="44" cy="36" r="4" fill="#ff3d7f" stroke="#000" stroke-width="3"/>
    <circle cx="52" cy="36" r="4" fill="#00b6ff" stroke="#000" stroke-width="3"/></svg>`,
    };

    /** Tambah skin + ornament ke ss-stage */
    function skinPhotoStage(
      stageEl,
      { tagText = "LEVEL UP!", caption = "" } = {}
    ) {
      stageEl.classList.add("pixel-frame");
      // inner white frame (di atas foto)
      // const inner = document.createElement("div");
      // inner.className = "inner-frame";
      // stageEl.appendChild(inner);

      // sprinkles
      const pix = document.createElement("div");
      pix.className = "pixies";
      pix.innerHTML = "<i></i><i></i><i></i>";
      stageEl.appendChild(pix);

      // stickers
      const mk = (cls, svg, rot) => {
        const s = document.createElement("div");
        s.className = `stk ${cls} bop`;
        s.style.setProperty("--r", rot || "0deg");
        s.innerHTML = `<i>${svg}</i>`;
        stageEl.appendChild(s);
      };
      mk("tl", "<i>" + SVG.heart + "</i>", "-4deg");
      mk("tr", "<i>" + SVG.coin + "</i>", "4deg");
      mk("bl", SVG.stick, "3deg");
      mk("br", SVG.pad, "-3deg");

      // bottom ribbon
      const ribbon = document.createElement("div");
      ribbon.className = "ss-ribbon";
      ribbon.innerHTML = `<span class="ss-tag">${tagText}</span><span class="ss-cap"></span>`;
      stageEl.appendChild(ribbon);
      const capEl = ribbon.querySelector(".ss-cap");

      return {
        setCaption(txt) {
          capEl.textContent = txt || "";
        },
      };
    }

    function enhancePhotoStage(
      stage,
      {
        sprinkleCount = 18,
        sparkles = true,
        glint = true,
        screws = true,
        colors = ["#ffde59", "#00b6ff", "#ff3d7f", "#baffb3", "#ffffff"],
      } = {}
    ) {
      // pastikan layer ornament ada
      let pix = stage.querySelector(".pixies");
      if (!pix) {
        pix = document.createElement("div");
        pix.className = "pixies";
        stage.appendChild(pix);
      }

      // SPRINKLES (acak posisi & bentuk)
      pix.innerHTML = "";
      const W = stage.clientWidth || 300;
      const H = stage.clientHeight || 200;
      for (let i = 0; i < sprinkleCount; i++) {
        const el = document.createElement("i");
        const kind = Math.random() < 0.6 ? "pix-dot" : "pix-plus";
        el.className = kind;
        el.style.left = Math.round(Math.random() * (W - 12)) + "px";
        el.style.top = Math.round(Math.random() * (H - 12)) + "px";
        el.style.background =
          kind === "pix-dot" ? colors[i % colors.length] : "transparent";
        el.style.color = colors[(i + 2) % colors.length];
        el.style.opacity = (0.35 + Math.random() * 0.4).toFixed(2);
        pix.appendChild(el);
      }

      // SPARKLES yang muncul-hilang
      if (sparkles) {
        const spawn = () => {
          const s = document.createElement("i");
          s.className = "pix-spark";
          s.style.left = Math.round(Math.random() * (W - 10)) + "px";
          s.style.top = Math.round(Math.random() * (H - 10)) + "px";
          s.style.opacity = "0";
          pix.appendChild(s);
          // fade in/out lalu remove
          s.animate(
            [{ opacity: 0 }, { opacity: 1, offset: 0.3 }, { opacity: 0 }],
            { duration: 1800, easing: "ease-in-out" }
          ).onfinish = () => s.remove();
        };
        // sedikit random agar natural
        stage._sparkTimer && clearInterval(stage._sparkTimer);
        stage._sparkTimer = setInterval(spawn, 800 + Math.random() * 600);
      }

      // GLINT sweep layer
      if (glint && !stage.querySelector(".glint")) {
        const g = document.createElement("i");
        g.className = "glint";
        stage.appendChild(g);
      }

      // CORNER SCREWS
      if (screws) {
        ["tl", "tr", "bl", "br"].forEach((pos) => {
          if (!stage.querySelector(`.screw.${pos}`)) {
            const sc = document.createElement("i");
            sc.className = `screw ${pos}`;
            stage.appendChild(sc);
          }
        });
      }
    }

    game.scenes.Memories = {
      idx: 0,
      imgs: [
        "/assets/img/memory/foto1.webp",
        "/assets/img/memory/foto2.webp",
        "/assets/img/memory/foto3.webp",
        "/assets/img/memory/foto4.webp",
        "/assets/img/memory/foto5.webp",
        "/assets/img/memory/foto6.webp",
        "/assets/img/memory/foto7.webp",
        "/assets/img/memory/foto8.webp",
        "/assets/img/memory/foto9.webp",
        "/assets/img/memory/foto10.webp",
        "/assets/img/memory/foto11.webp",
        "/assets/img/memory/foto12.webp",
        "/assets/img/memory/foto13.webp",
        "/assets/img/memory/foto14.webp",
      ],
      captions: [
        "First date trip! :3",
        "Penembakan duniawi",
        "After office xixi",
        "Jamet di Kotu",
        "Obihiro enak :-)",
        "Pulang date seruw",
        "1 month anniv hehe",
        "WFC date (boong)",
        "Movie date yay",
        "Foto eskalator gas",
        "Movie date (lagi)",
        "Nunggu Saltbread",
        "Chill di mobil",
        "Shopping time :o",
      ],
      stamps: [
        "Bogor, July '25",
        "BSD, July '25",
        "Senayan, July '25",
        "Kota Tua, August '25",
        "Serpong, August '25",
        "Cikupa, August '25",
        "Kuningan, August '25",
        "Saber, September '25",
        "Gatsu, September '25",
        "TA, September '25",
        "Karci, October '25",
        "Serpong, October '25",
        "Cideng, October '25",
        "Senayan, October '25",
      ],

      enter() {
        const box = ui.box(t("memories.title"));
        const sub = ui.p(t("memories.sub"));
        sub.style.textAlign = "center";
        sub.style.opacity = ".75";
        box.appendChild(sub);
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

        const stage = $(".ss-stage", wrap);
        enhancePhotoStage(stage, {
          sprinkleCount: 48, // tambah keramaian
          sparkles: true,
          glint: true,
          screws: true,
        });
        const stamp = document.createElement("div");
        stamp.className = "ss-stamp";
        stage.appendChild(stamp);
        this._stampEl = stamp;
        const img = $("img", wrap);
        const prevBtn = $(".prev", wrap);
        const nextBtn = $(".next", wrap);
        const dots = $(".ss-dots", wrap);
        const skin = skinPhotoStage(stage, { tagText: "LEVEL UP!" });

        const overlays = attachPhotoOverlays(
          stage,
          () => this.idx,
          () => this.imgs.length,
          (i) => this.captions?.[i] || ""
        );

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
          img.onerror = () =>
            (img.src = "https://picsum.photos/800/600?blur=1");
          [...dots.children].forEach((d, i) =>
            d.setAttribute("aria-selected", String(i === this.idx))
          );
          // set caption per slide (opsional)
          const cap =
            this.captions?.[this.idx] || `${this.idx + 1}/${this.imgs.length}`;
          skin.setCaption(cap);

          // update stamp
          const txt = (this.stamps && this.stamps[this.idx]) || "";
          if (txt) {
            this._stampEl.textContent = txt;
            this._stampEl.style.display = "inline-block";
          } else {
            this._stampEl.style.display = "none";
          }
        };

        this.go = (i, play = true) => {
          const n = this.imgs.length;
          const next = ((i % n) + n) % n;
          if (next !== this.idx && play) {
            audio.play("confirm");
            vibe(8);
          }
          this.idx = next;
          this.update();
        };

        prevBtn.addEventListener("click", () => this.go(this.idx - 1));
        nextBtn.addEventListener("click", () => this.go(this.idx + 1));

        // basic swipe
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

        box.appendChild(ui.hint("Tap A to continue"));
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

    // --- MESSAGE -----------------------------------------------------------------
    const MSG = t("message.paras");

    game.scenes.Message = {
      box: null,
      content: null,
      index: 0,

      enter() {
        this.index = 0;

        const head = document.createElement("div");
        head.className = "ui-box";
        const h = document.createElement("h2");
        h.textContent = t("message.title");
        const sub = ui.p(t("message.sub"));
        sub.style.textAlign = "center";
        sub.style.opacity = ".75";
        head.append(h, sub);

        const wrap = document.createElement("div");
        wrap.className = "msg-wrap";

        this.box = document.createElement("div");
        this.box.className = "msg-box ui-box";

        this.content = document.createElement("div");
        this.content.className = "msg-content paper-8";
        this.box.appendChild(this.content);

        wrap.append(head, this.box);

        const note = ui.p(t("message.hintA"));
        note.style.textAlign = "center";
        note.style.opacity = "0";
        note.style.transition = "opacity .25s linear";
        wrap.appendChild(note);

        const REVEAL_DELAY = prefersReduced ? 200 : 900; // gap after “A letter for you…”
        const MSG_TYPE_SPEED = 58; // slower than default 46
        const PARA_GAP = prefersReduced ? 160 : 280;

        const typeAll = () =>
          new Promise((res) => {
            const step = () => {
              if (this.index >= MSG.length) return res();
              const p = document.createElement("p");
              this.content.appendChild(p);
              typeText(p, MSG[this.index++], MSG_TYPE_SPEED, () =>
                setTimeout(step, PARA_GAP)
              );
            };
            step();
          });

        typeTitle(head, { subEl: sub, titleSpeed: 54, subSpeed: 46 }).then(
          async () => {
            await sleep(REVEAL_DELAY);
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

    game.scenes.Gift = {
      _disposeTilt: null,
      enter() {
        const box = ui.box("A little gift");
        const sub = ui.p("Save the card or continue to the finale.");
        sub.style.textAlign = "center";
        sub.style.opacity = ".75";
        box.appendChild(sub);

        // === frame kartu (seperti sebelumnya) ===
        const frame = document.createElement("div");
        frame.className = "ui-box";
        frame.style.display = "grid";
        frame.style.placeItems = "center";
        frame.style.width = "min(420px,90%)";
        frame.style.aspectRatio = "3/2";
        frame.style.background = "var(--color-2)";
        frame.style.cursor = "pointer"; // feel interaktif

        const img = new Image();
        img.alt = "Love card";
        img.src = "/assets/img/card/birthdaycard.png";
        img.onerror = () => (img.src = "/assets/img/card/birthdaycard.webp");
        img.style.maxWidth = "100%";
        img.style.maxHeight = "100%";
        frame.appendChild(img);

        // === bungkus dengan tilt-wrap & aktifkan tilt ===
        const tiltWrap = document.createElement("div");
        tiltWrap.className = "tilt-wrap";
        tiltWrap.appendChild(frame);
        box.appendChild(tiltWrap);

        // aktifkan tilt (simpan disposer untuk exit)
        this._disposeTilt = enableTilt(frame, {
          max: 14,
          scale: 1.035,
          glare: true,
        });

        // tombol bawah tetap sama
        const row = document.createElement("div");
        row.style.display = "flex";
        row.style.justifyContent = "center";
        row.style.gap = "10px";
        row.style.marginTop = "10px";

        const btnSave = ui.btn("Download");
        const btnGo = ui.btn("Grand Finale >");

        btnSave.addEventListener("click", () => {
          const w = window.open(img.src, "_blank", "noopener,noreferrer");
          if (!w) {
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
        box.append(row);

        typeTitle(box, { subEl: sub, titleSpeed: 54, subSpeed: 46 });
        return box;
      },
      exit() {
        // bersihkan tilt listeners bila ada
        if (typeof this._disposeTilt === "function") {
          this._disposeTilt();
          this._disposeTilt = null;
        }
      },
      onA() {
        confettiBurst("finale");
        setTimeout(() => game.setScene("Outro"), 600);
      },
      onB() {
        game.setScene("Message");
      },
    };

    // --- OUTRO -------------------------------------------------------------------
    game.scenes.Outro = {
      enter() {
        const box = document.createElement("div");
        box.className = "ui-box center";

        const stars = calcStars(game.progress);
        const { grade, note } = rankFor(stars);

        const h = document.createElement("h2");
        h.textContent = "Happy Birthday, Natasya! 💖";

        // scoreboard mini
        const score = document.createElement("div");
        score.className = "scoreboard pixel-border";
        score.innerHTML = `
          <div class="row">
            <span>Stars</span>
            <b>${stars}/${TOTAL_STARS}</b>
          </div>
          <div class="row">
            <span>Rank</span>
            <b class="rank">${grade}</b>
          </div>
          <div class="row note">
            <span>Note</span>
            <i>${note}</i>
          </div>
        `;

        const p = ui.p(
          stars === TOTAL_STARS
            ? "Makasih banyak udah nyelesaiin semua level di game ini ya bub, semoga kamu suka, kasih feedback via WhatsApp ya! 🥹"
            : "Makasih banyak udah nyelesaiin semua level di game ini ya bub, semoga kamu suka, kasih feedback via WhatsApp ya! 🥹"
        );

        const btn = ui.btn(
          stars === TOTAL_STARS ? "Play again?" : "Try for S-Rank"
        );
        btn.classList.add("outro-btn");
        btn.addEventListener("click", () => {
          game.progress.clear();
          starCountEl.textContent = "0";
          confettiBurst("mini");
          game.setScene("Intro");
        });

        box.append(h, score, p, btn);

        // Ketik judul → paragraf; lalu reveal tombol
        typeTitle(box, { subEl: p, titleSpeed: 54, subSpeed: 46 }).then(() => {
          requestAnimationFrame(() => btn.classList.add("show"));
        });

        // bonus confetti kalau perfect
        if (stars === TOTAL_STARS) confettiBurst("finale");

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

    // ---------------------------------------------------------------------------
    // 12) HUD Controls
    // ---------------------------------------------------------------------------
    btnA?.addEventListener("click", () => {
      audio.play("confirm");
      game.current?.onA?.();
    });
    btnB?.addEventListener("click", () => {
      audio.play("cancel");
      game.current?.onB?.();
    });

    // ---------------------------------------------------------------------------
    // 13) First-run Coach Overlay (dims SCENE only, HUD/FOOTER stay usable)
    // ---------------------------------------------------------------------------
    const coach = (() => {
      let overlay,
        tip,
        _rafFocus = 0;
      const LS_KEY = "coach_done_v1";

      function playBeep(ms = 500) {
        try {
          audio.unlock?.();
          if (audio.ready && audio.sfx.confirm) {
            audio.sfx.confirm.play();
            return;
          }
        } catch {}
        try {
          const Ctx = window.AudioContext || window.webkitAudioContext;
          const ctx = new Ctx();
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = "square";
          osc.frequency.value = 880;
          gain.gain.value = 0.08;
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.start();
          setTimeout(() => {
            osc.stop();
            ctx.close();
          }, ms);
        } catch {}
      }

      function coachSetTip({ title = "", body = "", actions = [] }) {
        const tipEl = document.getElementById("coachTip");
        if (!tipEl) return;
        tipEl.innerHTML = `
            <h3>${title}</h3>
            <p>${body}</p>
            <div class="coach-actions">
              ${actions
                .map(
                  (a) =>
                    `<button class="coach-btn" data-act="${a.act}">${a.label}</button>`
                )
                .join("")}
            </div>
          `;
      }

      function coachBindActions(map = {}) {
        document.querySelectorAll(".coach-btn").forEach((b) => {
          b.onclick = (e) => {
            const act = e.currentTarget.getAttribute("data-act");
            map[act]?.();
          };
        });
      }

      function ensureOverlay() {
        if (overlay) return;

        // 1) Scene-only overlay
        overlay = document.createElement("div");
        overlay.className = "coach-overlay coach-hidden";
        overlay.setAttribute("role", "dialog");
        overlay.setAttribute("aria-modal", "true");

        const wrap = document.createElement("div");
        wrap.className = "coach-wrap";

        tip = document.createElement("div");
        tip.className = "coach-tip pixel-border";
        tip.id = "coachTip";

        wrap.append(tip);
        overlay.append(wrap);
        root.appendChild(overlay);

        // 2) Global focus ring outside the scene
        if (!document.querySelector(".coach-focus-ring")) {
          const focusRing = document.createElement("div");
          focusRing.className = "coach-focus-ring";
          focusRing.id = "coachRing";
          focusRing.style.display = "none";
          document.body.appendChild(focusRing);
        }

        // ESC to skip
        window.addEventListener("keydown", (e) => {
          if (overlay.classList.contains("coach-hidden")) return;
          if (e.key === "Escape") finish(true);
        });
      }

      function placeFocus(box) {
        const ring = document.getElementById("coachRing");
        if (!ring) return;
        if (!box) {
          ring.style.display = "none";
          return;
        }
        const r = box.getBoundingClientRect();
        ring.style.display = "block";
        ring.style.left = `${Math.round(r.left - 6)}px`;
        ring.style.top = `${Math.round(r.top - 6)}px`;
        ring.style.width = `${Math.round(r.width + 12)}px`;
        ring.style.height = `${Math.round(r.height + 12)}px`;
      }

      function trackFocus(el) {
        cancelAnimationFrame(_rafFocus);
        const tick = () => {
          if (el && document.body.contains(el)) placeFocus(el);
          _rafFocus = requestAnimationFrame(tick);
        };
        _rafFocus = requestAnimationFrame(tick);

        const upd = () => placeFocus(el);
        addEventListener("resize", upd, { passive: true });
        addEventListener("scroll", upd, { passive: true });
        addEventListener("orientationchange", upd, { passive: true });
        if (window.visualViewport) {
          visualViewport.addEventListener("resize", upd, { passive: true });
          visualViewport.addEventListener("scroll", upd, { passive: true });
        }
      }

      // === Steps (now using t('coach.*')) =======================================
      function stepRinger(next) {
        tip.innerHTML = `
            <h3>${t("coach.ring.title")}</h3>
            <p>${t("coach.ring.body")}</p>
            <div class="coach-actions">
              <button class="coach-btn" id="coachBeep">${t(
                "coach.ring.test"
              )}</button>
              <button class="coach-btn" id="coachNext">${t(
                "coach.ring.next"
              )}</button>
              <button class="coach-btn" id="coachSkip">${t(
                "coach.ring.skip"
              )}</button>
            </div>
          `;
        $("#coachBeep", tip).addEventListener("click", () => playBeep(500));
        $("#coachNext", tip).addEventListener("click", () => next());
        $("#coachSkip", tip).addEventListener("click", () => finish(true));
        trackFocus(null);
      }

      function stepUnmute(next) {
        tip.innerHTML = `
            <h3>${t("coach.unmute.title")}</h3>
            <p>${t("coach.unmute.body")}</p>
            <div class="coach-actions">
              <button class="coach-btn" id="coachSkip">${t(
                "coach.unmute.skip"
              )}</button>
            </div>
          `;
        $("#coachSkip", tip).addEventListener("click", () => next());
        trackFocus(btnMute);

        const advanceIfReady = () => {
          if (!audio.muted) {
            window.removeEventListener("click", check, true);
            next();
          }
        };
        const check = () => setTimeout(advanceIfReady, 0);
        window.addEventListener("click", check, true);
      }

      function stepMusic(next) {
        tip.innerHTML = `
            <h3>${t("coach.music.title")}</h3>
            <p>${t("coach.music.body")}</p>
            <div class="coach-actions">
              <button class="coach-btn" id="coachSkip">${t(
                "coach.music.skip"
              )}</button>
            </div>
          `;
        $("#coachSkip", tip).addEventListener("click", () => next());
        trackFocus(btnBGM);

        const obs = new MutationObserver(() => {
          if (btnBGM.getAttribute("aria-pressed") === "true") {
            obs.disconnect();
            next();
          }
        });
        obs.observe(btnBGM, {
          attributes: true,
          attributeFilter: ["aria-pressed"],
        });
      }

      function stepReady(next) {
        tip.innerHTML = `
            <h3>${t("coach.ready.title")}</h3>
            <p>${t("coach.ready.body")}</p>
            <div class="coach-actions">
              <button class="coach-btn" id="coachStart">${t(
                "coach.ready.begin"
              )}</button>
            </div>
          `;
        $("#coachStart", tip).addEventListener("click", () => next());
        trackFocus(null);
      }
      // ==========================================================================

      function showOverlay() {
        ensureOverlay();
        overlay.classList.remove("coach-hidden");
      }
      function hideOverlay() {
        overlay?.classList.add("coach-hidden");
      }

      function finish(skipped = false) {
        cancelAnimationFrame(_rafFocus);
        _rafFocus = 0;
        hideOverlay();
        placeFocus(null);
        try {
          localStorage.setItem(LS_KEY, skipped ? "skipped" : "done");
        } catch {}
        if (!game._started && game.currentName !== "Intro") {
          game.setScene("Intro", "iris");
        }
      }

      const steps = [stepRinger, stepUnmute, stepMusic, stepReady];

      function start() {
        showOverlay();
        let i = 0;
        const next = () => {
          i++;
          if (i >= steps.length) finish(false);
          else steps[i](next);
        };
        steps[0](next);
      }

      function startIfNeeded() {
        let seen = "";
        try {
          seen = localStorage.getItem(LS_KEY) || "";
        } catch {}
        if (!seen) start();
        else if (!game._started && game.currentName !== "Intro") {
          game.setScene("Intro", "iris");
        }
      }

      return { start, startIfNeeded, finish };
    })();

    // ---------------------------------------------------------------------------
    // 14) Bootstrap
    // ---------------------------------------------------------------------------
    ensureBalloonsLayer();
    // coach.startIfNeeded();
    game.setScene("Memories");
  })();

  // ==== END: paste ====

  // Tidak perlu apa-apa di bawah ini.
  // Scene pertama akan di-handle oleh kode kamu sendiri (coach.startIfNeeded()).
  // Kalau kamu MAU langsung ke Intro tanpa coach, uncomment baris berikut:
  // window.game?.setScene?.("Intro", "iris");
}
