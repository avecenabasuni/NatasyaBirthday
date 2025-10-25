// boot.js  (module)
const prefersReduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
const root = document.getElementById("scene-root");

// Sembunyikan HUD/footer saat boot (fokus ke boot)
document.body.classList.add("booting");

// Markup boot minimal (tanpa dependensi game)
const wrap = document.createElement("div");
wrap.className = "boot-wrap";
wrap.innerHTML = `
  <div class="boot-screen pixel-border" role="img" aria-label="Boot screen">
    <i class="boot-scan" aria-hidden="true"></i>
    <div class="boot-led" aria-hidden="true"></div>

    <!-- Logo drop ala boot -->
    <div class="boot-logo">
      <span class="boot-drop">HAPPY BIRTHDAY</span>
    </div>

    <!-- Brand & Deskripsi -->
    <h2 class="boot-brand">NATASYA GAME</h2>
    <p class="boot-desc">Game 8-bit hand-made buat ulang tahun Natasya</p>

    <!-- Credit -->
    <p class="boot-credit">Made with 💖 by Ave</p>
  </div>
`;
root.replaceChildren(wrap);

// SFX ding kecil (tanpa Howler)
function ding() {
  try {
    const Ctx = window.AudioContext || window.webkitAudioContext;
    const ctx = new Ctx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    if (osc.frequency.exponentialRampToValueAtTime) {
      osc.frequency.exponentialRampToValueAtTime(1174, ctx.currentTime + 0.1);
    }
    gain.gain.setValueAtTime(0.065, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.18);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.2);
    osc.onended = () => ctx.close();
  } catch {}
}

// helpers
function waitForEnd(el, timeout = 2000) {
  return new Promise((resolve) => {
    let done = false;
    const off = () => {
      if (done) return;
      done = true;
      el.removeEventListener("animationend", onEnd);
      el.removeEventListener("transitionend", onEnd);
      clearTimeout(t);
      resolve();
    };
    const onEnd = () => off();
    const t = setTimeout(off, timeout);
    el.addEventListener("animationend", onEnd, { once: true });
    el.addEventListener("transitionend", onEnd, { once: true });
  });
}
const raf2 = (cb) => requestAnimationFrame(() => requestAnimationFrame(cb));

// Trigger animasi berurutan
const dropEl = wrap.querySelector(".boot-drop");
const brandEl = wrap.querySelector(".boot-brand");
const descEl = wrap.querySelector(".boot-desc");
const creditEl = wrap.querySelector(".boot-credit");

raf2(() => {
  // 1) Logo turun
  dropEl?.classList.add("show");
  if (!prefersReduced) setTimeout(ding, 280);
  else ding();

  // 2) Brand muncul
  setTimeout(() => brandEl?.classList.add("show"), prefersReduced ? 100 : 500);

  // 3) Deskripsi muncul
  setTimeout(() => descEl?.classList.add("show"), prefersReduced ? 180 : 900);

  // 4) Credit muncul
  setTimeout(
    () => creditEl?.classList.add("show"),
    prefersReduced ? 260 : 10000
  );
});

// Selesai boot → load game.js → startGame()
(async () => {
  const GLOBAL_FALLBACK = prefersReduced ? 1200 : 3200;

  await Promise.race([
    (async () => {
      await waitForEnd(dropEl || wrap, 1800);
      await waitForEnd(brandEl || wrap, 1200);
      await waitForEnd(descEl || wrap, 1000);
      await waitForEnd(creditEl || wrap, 900);
    })(),
    new Promise((r) => setTimeout(r, GLOBAL_FALLBACK)),
  ]);

  // Bersihkan boot & restore HUD/footer
  root.replaceChildren();
  document.body.classList.remove("booting");

  // beri 1–2 frame agar layout stabil
  await new Promise((r) =>
    requestAnimationFrame(() => requestAnimationFrame(r))
  );

  try {
    const mod = await import("./game.js"); // game manager
    const start = mod?.startGame || mod?.default?.startGame;
    if (typeof start === "function") {
      await start(); // nanti game.js → setScene("Intro", "iris"/"tiles")
    } else {
      throw new Error("startGame() not exported");
    }
  } catch (err) {
    console.error("[boot] failed to load game.js", err);
    const errBox = document.createElement("div");
    errBox.className = "ui-box";
    errBox.innerHTML = `<h2>Oops</h2><p>Couldn't load the game. Please refresh.</p>`;
    root.appendChild(errBox);
  }
})();
