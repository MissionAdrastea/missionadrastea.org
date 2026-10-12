/*
 * Adrastea home: the loading screen in front of the hero.
 *
 * An inline script in the page head adds "is-loading" to <html> on the first visit of a session
 * (never for reduced motion), which shows the .loader markup. Here the progress line fills while
 * the fonts and page finish loading, then the screen lifts and "adrastea:revealed" tells motion.js
 * to play the hero's entrance.
 */

(() => {
  const root = document.documentElement;
  const loader = document.querySelector(".loader");
  if (!loader || !root.classList.contains("is-loading")) return;

  const bar = loader.querySelector(".loader-bar i");
  const count = loader.querySelector(".loader-count");
  const status = loader.querySelector(".loader-status");
  const STEPS = ["Preparing for launch", "Aligning the orbit", "Mapping the constellations", "Ad astra"];
  const MIN_TIME = 1900; // long enough to read, short enough not to be in the way
  const MAX_WAIT = 4500; // never hold the page hostage to a slow font or image

  let ready = false;
  const fonts = document.fonts ? document.fonts.ready : Promise.resolve();
  const loaded = new Promise((resolve) => {
    if (document.readyState === "complete") resolve();
    else window.addEventListener("load", resolve, { once: true });
  });
  Promise.all([fonts, loaded]).then(() => (ready = true));

  const start = performance.now();

  function finish() {
    try {
      window.sessionStorage.setItem("adrastea:seen", "1");
    } catch {
      // storage is off: the loader simply shows again on the next visit
    }
    loader.classList.add("is-leaving");
    window.dispatchEvent(new Event("adrastea:revealed"));
    window.setTimeout(() => root.classList.remove("is-loading"), 950);
  }

  function tick(now) {
    const elapsed = now - start;
    // the line runs to 90% on the clock, and only completes once the page really is ready
    const done = ready || elapsed > MAX_WAIT;
    const progress = Math.min(elapsed / MIN_TIME, done ? 1 : 0.9);

    bar.style.transform = `scaleX(${progress})`;
    count.textContent = `${Math.round(progress * 100)}%`;
    status.textContent = STEPS[Math.min(STEPS.length - 1, Math.floor(progress * STEPS.length))];

    if (progress < 1) window.requestAnimationFrame(tick);
    else window.setTimeout(finish, 380);
  }
  window.requestAnimationFrame(tick);
})();
