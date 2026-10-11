/*
 * Adrastea: the sky behind every page.
 *
 * A field of stars drifts slowly across the viewport and a handful of constellations travel with
 * it. Each constellation traces its lines, holds, fades and rests, on its own schedule. The sky
 * also slides a little as the page scrolls, which gives it depth behind the content.
 *
 * Positions come from the clock and a fixed seed, not from when the page loaded, so the sky carries
 * on unbroken from one page to the next. Sections marked data-sky="quiet" (the scroll stages,
 * which draw figures of their own) hush the constellations and leave only the stars.
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
  const CYCLE = 32; // seconds for a constellation to trace its lines, hold, fade and rest
  const TINTS = ["#ffffff", "#f3c4ee", "#d9c8ff"];

  // Star positions on a 0-100 grid, and the pairs of stars joined by a line.
  const FIGURES = [
    // Cassiopeia
    { stars: [[0, 20], [25, 55], [48, 30], [72, 62], [100, 35]], lines: [[0, 1], [1, 2], [2, 3], [3, 4]] },
    // Andromeda
    {
      stars: [[0, 62], [28, 52], [55, 40], [100, 18], [50, 22], [46, 6]],
      lines: [[0, 1], [1, 2], [2, 3], [2, 4], [4, 5]],
    },
    // the Big Dipper
    {
      stars: [[100, 22], [97, 50], [70, 54], [66, 30], [45, 24], [25, 16], [0, 30]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 0], [3, 4], [4, 5], [5, 6]],
    },
    // Orion
    {
      stars: [[25, 12], [72, 16], [40, 49], [50, 46], [60, 43], [32, 88], [78, 84], [48, 0]],
      lines: [[7, 0], [7, 1], [0, 2], [1, 4], [2, 3], [3, 4], [2, 5], [4, 6]],
    },
    // Cygnus
    { stars: [[50, 0], [50, 35], [50, 68], [50, 100], [88, 30], [12, 45]], lines: [[0, 1], [1, 2], [2, 3], [1, 4], [1, 5]] },
    // Lyra
    { stars: [[30, 0], [38, 24], [62, 30], [70, 72], [48, 68]], lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 1]] },
    // Corona Borealis
    {
      stars: [[0, 20], [12, 48], [32, 68], [55, 72], [78, 60], [93, 38], [100, 12]],
      lines: [[0, 1], [1, 2], [2, 3], [3, 4], [4, 5], [5, 6]],
    },
  ];

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

  const quietZones = [...document.querySelectorAll('[data-sky="quiet"]')];
  let width = 0;
  let height = 0;
  let pixelRatio = 1;
  let skyWidth = 0;
  let skyHeight = 0;
  let stars = [];
  let figures = [];
  let quiet = 0;

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

    // One constellation per cell of a loose grid over the wrapped sky, so they never bunch up.
    const columns = width < 720 ? 2 : width < 1500 ? 3 : 4;
    const rows = 2;
    const span = clamp(width * 0.2, 150, 300);
    figures = FIGURES.slice(0, columns * rows).map((figure, index) => {
      const size = span * (0.8 + random() * 0.4);
      const turn = (random() - 0.5) * 1.1;
      const cos = Math.cos(turn);
      const sin = Math.sin(turn);
      const points = figure.stars.map(([x, y]) => {
        const dx = ((x - 50) / 100) * size;
        const dy = ((y - 50) / 100) * size;
        return [dx * cos - dy * sin, dx * sin + dy * cos, 1.2 + random() * 1.1];
      });
      return {
        points,
        lines: figure.lines,
        x: ((index % columns) + 0.25 + random() * 0.5) * (skyWidth / columns),
        y: (Math.floor(index / columns) + 0.25 + random() * 0.5) * (skyHeight / rows),
        depth: 0.75 + random() * 0.25,
        reach: size,
        phase: index / (columns * rows),
      };
    });
  }

  function draw() {
    // the clock, not time since load, so the sky is in the same place on every page
    const time = reduceMotion ? 0 : Date.now() / 1000;
    const scroll = reduceMotion ? 0 : window.scrollY * PARALLAX;

    const middle = window.innerHeight / 2;
    const hushed = quietZones.some((zone) => {
      const rect = zone.getBoundingClientRect();
      return rect.top < middle && rect.bottom > middle;
    });
    quiet += ((hushed ? 1 : 0) - quiet) * (reduceMotion ? 1 : 0.08);

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

    figures.forEach((figure) => {
      const centerX = wrap(figure.x + DRIFT_X * time * figure.depth, skyWidth) - MARGIN;
      const centerY = wrap(figure.y + (DRIFT_Y * time - scroll) * figure.depth, skyHeight) - MARGIN;
      if (
        centerX < -figure.reach ||
        centerX > width + figure.reach ||
        centerY < -figure.reach ||
        centerY > height + figure.reach
      ) {
        return;
      }

      // one cycle: lines trace in over the first fifth, hold, then fade; the stars rest alone after that
      const life = reduceMotion ? 0.4 : (time / CYCLE + figure.phase) % 1;
      const traced = smooth(0, 0.2, life);
      const held = 1 - smooth(0.62, 0.78, life);
      const lineAlpha = 0.3 * held * (1 - quiet);

      if (lineAlpha > 0.01) {
        context.globalAlpha = lineAlpha;
        context.strokeStyle = TINTS[2];
        context.lineWidth = 1;
        context.beginPath();
        figure.lines.forEach(([from, to], index) => {
          const drawn = clamp(traced * figure.lines.length - index, 0, 1);
          if (!drawn) return;
          const [fromX, fromY] = figure.points[from];
          const [toX, toY] = figure.points[to];
          context.moveTo(centerX + fromX, centerY + fromY);
          context.lineTo(centerX + fromX + (toX - fromX) * drawn, centerY + fromY + (toY - fromY) * drawn);
        });
        context.stroke();
      }

      const glow = (0.5 + 0.4 * Math.min(traced, held)) * (1 - 0.6 * quiet);
      context.fillStyle = TINTS[0];
      figure.points.forEach(([x, y, radius]) => {
        context.globalAlpha = glow * 0.16;
        context.beginPath();
        context.arc(centerX + x, centerY + y, radius * 3.2, 0, TAU);
        context.fill();
        context.globalAlpha = glow;
        context.beginPath();
        context.arc(centerX + x, centerY + y, radius, 0, TAU);
        context.fill();
      });
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
    // a still sky, redrawn only so the constellations can hush behind the scroll stages
    window.addEventListener("scroll", draw, { passive: true });
  } else {
    window.requestAnimationFrame(frame);
  }
})();
