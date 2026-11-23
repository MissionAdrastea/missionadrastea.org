/*
 * Adrastea: the sky behind every page.
 *
 * A field of stars drifts slowly across the viewport, and slides a little as the page scrolls,
 * which gives it depth behind the content.
 *
 * Positions come from the clock and a fixed seed, not from when the page loaded, so the sky carries
 * on unbroken from one page to the next.
 */

(() => {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) return;

  canvas.className = "site-sky";
  canvas.setAttribute("aria-hidden", "true");
  document.body.prepend(canvas);

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  const MARGIN = 320; // the sky wraps this far outside the viewport, so nothing pops in or out on screen
  const DRIFT_X = -5.2; // px per second at full depth: the whole sky slides slowly up and to the left
  const DRIFT_Y = -1.4;
  const PARALLAX = 0.06; // px the sky shifts per px scrolled, at full depth
  const TINTS = ["#ffffff", "#f3c4ee", "#d9c8ff"];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const wrap = (value, size) => ((value % size) + size) % size;

  // Seeded generator (mulberry32) so every page builds the same sky.
  const seeded = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let skyWidth = 0;
  let skyHeight = 0;
  let stars = [];

  function build() {
    width = window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    skyWidth = width + MARGIN * 2;
    skyHeight = height + MARGIN * 2;
    const random = seeded(4);
    const count = Math.round(clamp((width * height) / 5200, 110, 420));
    stars = Array.from({ length: count }, () => ({
      x: random() * skyWidth,
      y: random() * skyHeight,
      depth: 0.25 + random() * 0.75,
      size: 0.6 + random() * 1.2,
      alpha: 0.16 + random() * 0.5,
      twinkle: random() < 0.3 ? 0.4 + random() * 1.2 : 0,
      phase: random() * TAU,
      tint: random() < 0.12 ? 1 : random() < 0.5 ? 2 : 0,
    }));

  }

  function draw() {
    // the clock, not time since load, so the sky is in the same place on every page
    const time = reduceMotion ? 0 : Date.now() / 1000;
    const scroll = reduceMotion ? 0 : window.scrollY * PARALLAX;

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);

    stars.forEach((star) => {
      const x = wrap(star.x + DRIFT_X * time * star.depth, skyWidth) - MARGIN;
      const y = wrap(star.y + (DRIFT_Y * time - scroll) * star.depth, skyHeight) - MARGIN;
      if (x < -3 || x > width + 3 || y < -3 || y > height + 3) return;
      const flicker = star.twinkle ? 0.65 + 0.35 * Math.sin(time * star.twinkle + star.phase) : 1;
      context.globalAlpha = star.alpha * flicker;
      context.fillStyle = TINTS[star.tint];
      context.fillRect(x, y, star.size, star.size);
    });

    context.globalAlpha = 1;
  }

  // The sky moves slowly, so about 30 frames a second is plenty.
  let lastFrame = 0;
  function frame(now) {
    window.requestAnimationFrame(frame);
    if (now - lastFrame < 30) return;
    lastFrame = now;
    draw();
  }

  // A phone's address bar sliding away changes the height by a little; only a real resize rebuilds the sky.
  window.addEventListener("resize", () => {
    const newHeight = canvas.clientHeight || window.innerHeight;
    if (window.innerWidth === width && Math.abs(newHeight - height) < 120) return;
    build();
    draw();
  });

  build();
  draw();
  if (reduceMotion) {
    // a still sky, redrawn as the page scrolls
    window.addEventListener("scroll", draw, { passive: true });
  } else {
    window.requestAnimationFrame(frame);
  }
})();
