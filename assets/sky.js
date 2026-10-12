/*
 * Adrastea: the sky behind every page.
 *
 * A field of stars drifts slowly across the viewport, and slides a little as the page scrolls,
 * which gives it depth behind the content.
 *
 * Positions come from the clock and a fixed seed, not from when the page loaded, so the sky carries
 * on unbroken from one page to the next.
 *
 * In front of the drifting sky sits one large constellation, fixed to the screen. Its bright line
 * runs from star to star as the page is scrolled, so reading down a page is travelling along it.
 *
 * data-sky="alone" on a section (the timeline, a constellation in its own right) hides it there.
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
  const smooth = (from, to, value) => {
    const t = clamp((value - from) / (to - from), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const wrap = (value, size) => ((value % size) + size) % size;

  // Seeded generator (mulberry32) so every page builds the same sky.
  const seeded = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // The large constellation zigzags down the empty band to the right of the content, so it never
  // crosses copy: how far across that band each star sits (0 to 1), top to bottom.
  const GUIDE = [0.1, 0.85, 0.35, 1, 0.2, 0.75, 0];
  const SPARKLE = [0, -1, 0.16, -0.16, 1, 0, 0.16, 0.16, 0, 1, -0.16, 0.16, -1, 0, -0.16, -0.16];

  const aloneZones = [...document.querySelectorAll('[data-sky="alone"]')];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let skyWidth = 0;
  let skyHeight = 0;
  let stars = [];
  let alone = 0;
  let guide = [];
  let guideSize = 8;

  function build() {
    width = window.innerWidth;
    height = canvas.clientHeight || window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    skyWidth = width + MARGIN * 2;
    skyHeight = height + MARGIN * 2;
    // Content is at most 1280px wide inside the page gutter; whatever lies to its right is free.
    // On narrower screens that is only the gutter, and the constellation slims down to fit it.
    const gutter = clamp(width * 0.06, 20, 96);
    const contentEdge = Math.min(width - gutter, gutter + 1280);
    const bandRight = width - Math.max(8, gutter * 0.2);
    const bandLeft = Math.min(bandRight - 6, contentEdge + (width - contentEdge >= 220 ? 48 : gutter * 0.2));
    guide = GUIDE.map((across, index) => [
      bandLeft + across * (bandRight - bandLeft),
      height * (0.1 + (0.8 * index) / (GUIDE.length - 1)),
    ]);
    guideSize = clamp((bandRight - bandLeft) * 0.09, 4.5, 13);

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

    const middle = window.innerHeight / 2;
    const solo = aloneZones.some((zone) => {
      const rect = zone.getBoundingClientRect();
      return rect.top < middle && rect.bottom > middle;
    });
    alone += ((solo ? 1 : 0) - alone) * (reduceMotion ? 1 : 0.08);

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

    drawGuide();
    context.globalAlpha = 1;
  }

  // A faint outline of the whole figure is always there; the bright line and the lit stars advance
  // with the page's scroll position.
  function drawGuide() {
    const strength = 1 - alone;
    // on a phone the free band is only the page gutter, where the line would sit on card edges
    if (strength < 0.02 || width < 720) return;

    const range = document.documentElement.scrollHeight - window.innerHeight;
    const travelled = (range > 0 ? clamp(window.scrollY / range, 0, 1) : 0) * (guide.length - 1);

    context.lineCap = "round";
    context.strokeStyle = TINTS[2];
    context.lineWidth = 1;
    context.globalAlpha = 0.17 * strength;
    context.beginPath();
    guide.forEach(([x, y], index) => (index ? context.lineTo(x, y) : context.moveTo(x, y)));
    context.stroke();

    context.strokeStyle = TINTS[0];
    context.lineWidth = 1.5;
    context.globalAlpha = 0.7 * strength;
    context.beginPath();
    for (let index = 0; index < guide.length - 1; index += 1) {
      const drawn = clamp(travelled - index, 0, 1);
      if (!drawn) break;
      const [fromX, fromY] = guide[index];
      const [toX, toY] = guide[index + 1];
      context.moveTo(fromX, fromY);
      context.lineTo(fromX + (toX - fromX) * drawn, fromY + (toY - fromY) * drawn);
    }
    context.stroke();

    guide.forEach(([x, y], index) => {
      const lit = index ? smooth(index - 0.12, index, travelled) : 1;
      const size = guideSize * (0.45 + 0.55 * lit);
      context.fillStyle = TINTS[0];
      context.globalAlpha = (0.35 + 0.65 * lit) * strength;
      context.beginPath();
      for (let k = 0; k < SPARKLE.length; k += 2) {
        context.lineTo(x + SPARKLE[k] * size, y + SPARKLE[k + 1] * size);
      }
      context.closePath();
      context.fill();
    });
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
    // a still sky, redrawn only so the constellations can hush behind the scroll stages
    window.addEventListener("scroll", draw, { passive: true });
  } else {
    window.requestAnimationFrame(frame);
  }
})();
