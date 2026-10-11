/*
 * Adrastea home: the divisions stage.
 *
 * A scattered ring of particles gathers into one orbit as the visitor scrolls, one arc per research
 * division, while a shepherd moon sweeps it into place (Adrastea is the moon that tends Jupiter's
 * main ring). Scroll position drives everything: the ring, the caption on show and the rail dots.
 */

(() => {
  const stage = document.querySelector(".stage");
  const canvas = document.querySelector("#ring");
  if (!stage || !canvas) return;

  const context = canvas.getContext("2d");
  const steps = [...stage.querySelectorAll(".step")];
  const dots = [...stage.querySelectorAll(".rail i")];
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const TAU = Math.PI * 2;
  const TILT = 0.26; // how far the ring is tipped toward the viewer
  const BOUNDS = [0.2, 0.45, 0.7, 0.9]; // scroll progress at which steps 1..4 begin
  const BASE = [190, 172, 235];
  const LILAC = [201, 167, 255];
  // one arc per research division, matching the caption dots: violet, pink, white
  const ARC_COLORS = [
    [154, 107, 255],
    [240, 138, 223],
    [255, 255, 255],
  ];

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smooth = (from, to, value) => {
    const t = clamp((value - from) / (to - from), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const mix = (a, b, t) => a.map((channel, i) => Math.round(channel + (b[i] - channel) * t));
  const rgba = (color, alpha) => `rgba(${color[0]},${color[1]},${color[2]},${alpha})`;

  // Seeded generator (mulberry32) so the ring looks the same on every visit.
  const seeded = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  // Each division's arc lights up during its own step; all three stay warm at the end.
  const highlights = (progress) => {
    const finale = smooth(0.88, 0.95, progress) * 0.7;
    return [0, 1, 2].map((arc) => {
      const start = BOUNDS[arc];
      const end = BOUNDS[arc + 1];
      const own =
        smooth(start - 0.04, start + 0.04, progress) * (1 - smooth(end - 0.04, end + 0.04, progress));
      return Math.max(own, finale);
    });
  };

  let width, height, pixelRatio, radius, centerX, centerY, count;
  // per particle: home angle, home radius, scatter offsets, flicker phase, size, arc, then this frame's position
  let homeAngle, homeRadius, scatter, lift, phase, size, arcOf, posX, posY, nearSide;

  function setup() {
    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;

    const mobile = width < 720;
    count = mobile ? 7000 : 15000;
    radius = mobile ? Math.min(width * 0.4, height * 0.28) : Math.min(width * 0.26, height * 0.42);
    centerX = mobile ? width / 2 : width * 0.71;
    centerY = mobile ? height * 0.34 : height * 0.5;

    const random = seeded(7);
    homeAngle = new Float32Array(count);
    homeRadius = new Float32Array(count);
    scatter = new Float32Array(count);
    lift = new Float32Array(count);
    phase = new Float32Array(count);
    size = new Float32Array(count);
    arcOf = new Uint8Array(count);
    posX = new Float32Array(count);
    posY = new Float32Array(count);
    nearSide = new Uint8Array(count);
    for (let i = 0; i < count; i += 1) {
      homeAngle[i] = random() * TAU;
      homeRadius[i] = 0.84 + Math.pow(random(), 0.8) * 0.16;
      scatter[i] = (random() - 0.5) * 2;
      lift[i] = (random() - 0.5) * 2;
      phase[i] = random() * TAU;
      size[i] = 0.7 + random() * 0.9;
      arcOf[i] = Math.min(2, Math.floor((homeAngle[i] / TAU) * 3));
    }
  }

  function drawPlanet() {
    const planet = radius * 0.52;
    const glow = context.createRadialGradient(centerX, centerY, planet * 0.6, centerX, centerY, radius * 1.9);
    glow.addColorStop(0, "rgba(116,21,201,.32)");
    glow.addColorStop(1, "rgba(116,21,201,0)");
    context.fillStyle = glow;
    context.fillRect(0, 0, width, height);

    context.save();
    context.beginPath();
    context.arc(centerX, centerY, planet, 0, TAU);
    context.clip();
    const body = context.createRadialGradient(
      centerX - planet * 0.4,
      centerY - planet * 0.45,
      planet * 0.1,
      centerX,
      centerY,
      planet * 1.05,
    );
    body.addColorStop(0, "#8a4fe0");
    body.addColorStop(0.5, "#3a1275");
    body.addColorStop(1, "#0a0418");
    context.fillStyle = body;
    context.fillRect(centerX - planet, centerY - planet, planet * 2, planet * 2);
    // cloud bands
    for (let band = 0; band < 9; band += 1) {
      const bandY = centerY + (-0.8 + band * 0.2) * planet;
      context.beginPath();
      context.moveTo(centerX - planet, bandY);
      for (let x = -planet; x <= planet; x += 8) {
        context.lineTo(centerX + x, bandY + Math.sin(x * 0.03 + band * 1.7) * planet * 0.035);
      }
      context.strokeStyle = `rgba(230,210,255,${0.05 + (band % 3) * 0.03})`;
      context.lineWidth = planet * (0.05 + (band % 2) * 0.04);
      context.stroke();
    }
    // night side
    const shadow = context.createLinearGradient(centerX - planet, 0, centerX + planet, 0);
    shadow.addColorStop(0, "rgba(7,4,15,0)");
    shadow.addColorStop(1, "rgba(7,4,15,.78)");
    context.fillStyle = shadow;
    context.fillRect(centerX - planet, centerY - planet, planet * 2, planet * 2);
    context.restore();

    context.strokeStyle = "rgba(201,167,255,.4)";
    context.lineWidth = 1;
    context.beginPath();
    context.arc(centerX, centerY, planet, Math.PI * 0.95, Math.PI * 1.55);
    context.stroke();
  }

  // The shepherd moon and its trail; drawn in two passes so it goes behind the planet on the far side.
  function drawMoon(side, moonAngle) {
    const moonOrbit = radius * 1.08;
    for (let k = 46; k >= 0; k -= 1) {
      const angle = moonAngle - k * 0.032;
      const sine = Math.sin(angle);
      if ((sine > 0 ? 1 : 0) !== side) continue;
      const fade = 1 - k / 46;
      context.fillStyle = rgba(LILAC, 0.55 * fade * fade);
      context.beginPath();
      context.arc(
        centerX + moonOrbit * Math.cos(angle),
        centerY + moonOrbit * sine * TILT,
        radius * 0.02 * (1 + 0.3 * sine) * (0.25 + fade * 0.75),
        0,
        TAU,
      );
      context.fill();
    }

    const sine = Math.sin(moonAngle);
    if ((sine > 0 ? 1 : 0) !== side) return;
    const x = centerX + moonOrbit * Math.cos(moonAngle);
    const y = centerY + moonOrbit * sine * TILT;
    const moon = radius * 0.034 * (1 + 0.3 * sine);
    const glow = context.createRadialGradient(x, y, 0, x, y, moon * 5);
    glow.addColorStop(0, "rgba(226,205,255,.75)");
    glow.addColorStop(1, "rgba(154,107,255,0)");
    context.fillStyle = glow;
    context.fillRect(x - moon * 5, y - moon * 5, moon * 10, moon * 10);
    const body = context.createRadialGradient(x - moon * 0.3, y - moon * 0.3, moon * 0.1, x, y, moon);
    body.addColorStop(0, "#ffffff");
    body.addColorStop(1, "#c9a7ff");
    context.fillStyle = body;
    context.beginPath();
    context.arc(x, y, moon, 0, TAU);
    context.fill();
  }

  function draw(progress, time) {
    const sweep = progress * 3 * TAU; // the moon laps the ring three times over the stage
    const spin = time * 0.00003;
    const glowOf = highlights(progress);

    for (let i = 0; i < count; i += 1) {
      // 1 while the particle is still scattered, easing to 0 once the moon has swept past its place
      const settled = clamp((sweep - homeAngle[i]) / (TAU * 1.6), 0, 1);
      const loose = 1 - settled * settled * (3 - 2 * settled);
      const angle =
        homeAngle[i] + spin + loose * (0.55 * Math.sin(2 * homeAngle[i] + 1.3) + 0.25 * scatter[i]);
      const distance =
        homeRadius[i] + loose * (scatter[i] * 0.7 + 0.03 * Math.sin(time * 0.0008 + phase[i]));
      const sine = Math.sin(angle);
      posX[i] = centerX + distance * radius * Math.cos(angle);
      posY[i] = centerY + distance * radius * sine * TILT + loose * lift[i] * radius * 0.42;
      nearSide[i] = sine > 0 ? 1 : 0;
    }

    const pass = (side) => {
      for (let arc = 0; arc < 3; arc += 1) {
        context.fillStyle = rgba(mix(BASE, ARC_COLORS[arc], glowOf[arc]), 0.5 + 0.45 * glowOf[arc]);
        const grow = 0.45 * glowOf[arc];
        for (let i = 0; i < count; i += 1) {
          if (arcOf[i] !== arc || nearSide[i] !== side) continue;
          const dot = size[i] + grow;
          context.fillRect(posX[i], posY[i], dot, dot);
        }
      }
      drawMoon(side, sweep + spin);
    };
    pass(0); // far half of the ring, behind the planet
    drawPlanet();
    pass(1); // near half, in front
  }

  let shown = 0; // eased scroll progress through the stage
  let stepIndex = 0;
  let lastFrame = 0;

  function showStep(progress) {
    let index = 0;
    while (index < BOUNDS.length && progress >= BOUNDS[index]) index += 1;
    if (index === stepIndex) return;
    stepIndex = index;
    steps.forEach((step, i) => step.classList.toggle("on", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("on", i === index));
  }

  function frame(now) {
    window.requestAnimationFrame(frame);
    const rect = stage.getBoundingClientRect();
    if (rect.top > height || rect.bottom < 0) return;

    const target = clamp(-rect.top / (rect.height - height), 0, 1);
    const elapsed = Math.min(now - (lastFrame || now), 2000);
    lastFrame = now;
    // time-based easing, so it feels the same at any frame rate
    shown += (target - shown) * (reduceMotion ? 1 : 1 - Math.exp(-elapsed / 140));
    showStep(shown);

    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    context.clearRect(0, 0, width, height);
    draw(shown, reduceMotion ? 0 : now);
  }

  // Captions that are not on show are invisible, so tabbing to a link inside one scrolls the stage to it.
  steps.forEach((step, index) => {
    step.addEventListener("focusin", () => {
      if (index === stepIndex) return;
      const progress = index ? BOUNDS[index - 1] + 0.02 : 0;
      const top = stage.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: top + progress * (stage.offsetHeight - height), behavior: "instant" });
    });
  });

  window.addEventListener("resize", setup);
  setup();
  window.requestAnimationFrame(frame);
})();
