/*
 * Adrastea About page: the roadmap constellation. Needs GSAP + ScrollTrigger.
 *
 * Every caption in .roadmap that carries data-star="x,y" becomes a star. Scrolling flies a camera
 * from star to star, drawing the line between them and lighting each one on arrival; the last
 * stretch pulls back to show the whole constellation with every star named.
 *
 * To add a milestone, add a caption with a data-star position in sky units (roughly 0-1000 across
 * and 0-600 down). data-link="n" also joins that star to the nth star, to close a shape, and
 * data-label="left | right | above | below" moves its name clear of the lines in the final view.
 */

(() => {
  const section = document.querySelector(".roadmap");
  const svg = section?.querySelector(".sky");
  if (!section || !svg || !window.gsap || !window.ScrollTrigger) return;

  gsap.registerPlugin(ScrollTrigger);
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const NS = "http://www.w3.org/2000/svg";
  const make = (name, attributes, parent) => {
    const element = document.createElementNS(NS, name);
    Object.entries(attributes || {}).forEach(([key, value]) => element.setAttribute(key, value));
    parent?.append(element);
    return element;
  };

  // Seeded generator (mulberry32) so the sky looks the same on every visit.
  const seeded = (seed) => () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const steps = [...section.querySelectorAll(".step")];
  const milestones = steps
    .filter((step) => step.dataset.star)
    .map((step) => {
      const [x, y] = step.dataset.star.split(",").map(Number);
      return {
        x,
        y,
        name: step.querySelector("h2").textContent,
        link: Number(step.dataset.link),
        side: step.dataset.label || (x > 650 ? "left" : "right"),
      };
    });
  if (!milestones.length) return;

  // the rail gets one dot per caption
  const rail = section.querySelector(".rail");
  steps.forEach((_, index) => rail?.append(document.createElement("i")));
  const dots = rail ? [...rail.children] : [];
  dots[0]?.classList.add("on");

  /* ---------- build the sky ---------- */

  const defs = make("defs", null, svg);
  const glow = make("radialGradient", { id: "sky-glow" }, defs);
  make("stop", { offset: "0", "stop-color": "#e6d3ff", "stop-opacity": "0.9" }, glow);
  make("stop", { offset: "1", "stop-color": "#9a6bff", "stop-opacity": "0" }, glow);

  const world = make("g", null, svg); // everything the camera flies through
  const dust = make("g", { class: "sky-dust" }, world);
  const lineGroup = make("g", { class: "sky-lines" }, world);
  const starGroup = make("g", null, world);
  const labelGroup = make("g", { class: "sky-labels", opacity: 0 }, world);

  const random = seeded(12);
  // near stars are scattered well beyond the constellation, so the camera never flies into a void
  for (let i = 0; i < 240; i += 1) {
    const star = make(
      "circle",
      {
        cx: (-500 + random() * 2000).toFixed(1),
        cy: (-400 + random() * 1400).toFixed(1),
        r: (0.5 + random() * 1.3).toFixed(2),
        opacity: (0.2 + random() * 0.6).toFixed(2),
      },
      dust,
    );
    if (i % 6 === 0) {
      star.classList.add("twinkle");
      star.style.animationDelay = `${(random() * 4).toFixed(2)}s`;
    }
  }

  const SPARKLE = "M0-16C2-5 5-2 16 0 5 2 2 5 0 16-2 5-5 2-16 0-5-2-2-5 0-16Z";
  const last = milestones.length - 1;

  // one line per leg of the journey; each starts with zero length and is drawn as the camera travels
  const legs = milestones.slice(1).map((to, index) => {
    const from = milestones[index];
    return { to, line: make("line", { x1: from.x, y1: from.y, x2: from.x, y2: from.y }, lineGroup) };
  });
  const links = milestones
    .filter((star) => milestones[star.link - 1])
    .map((from) => {
      const to = milestones[from.link - 1];
      return { to, line: make("line", { x1: from.x, y1: from.y, x2: from.x, y2: from.y }, lineGroup) };
    });

  milestones.forEach((star, index) => {
    const holder = make("g", { transform: `translate(${star.x} ${star.y})` }, starGroup);
    star.node = make("g", { class: index === last ? "sky-star sky-star--goal" : "sky-star" }, holder);
    make("circle", { r: 46, fill: "url(#sky-glow)" }, star.node);
    make("path", { d: SPARKLE }, star.node);

    const place = {
      left: { x: star.x - 26, y: star.y, "text-anchor": "end" },
      right: { x: star.x + 26, y: star.y, "text-anchor": "start" },
      above: { x: star.x, y: star.y - 34, "text-anchor": "middle" },
      below: { x: star.x, y: star.y + 34, "text-anchor": "middle" },
    };
    const label = make("text", place[star.side] || place.right, labelGroup);
    label.textContent = star.name;
  });

  /* ---------- camera ---------- */

  const xs = milestones.map((star) => star.x);
  const ys = milestones.map((star) => star.y);
  const bounds = {
    x: Math.min(...xs) - 70,
    y: Math.min(...ys) - 70,
    width: Math.max(...xs) - Math.min(...xs) + 140,
    height: Math.max(...ys) - Math.min(...ys) + 140,
  };
  const wide = { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2, zoom: 1 };

  // cam holds the sky position under the anchor point and a zoom multiplier; the anchor is where
  // the star in focus sits on screen, clear of the caption.
  const cam = { ...wide };
  let base = 1; // px per sky unit at zoom 1, sized so the whole constellation fits its area
  let anchorX = 0;
  let anchorY = 0;
  let small = false;

  function layout() {
    const width = svg.parentElement.clientWidth;
    const height = svg.parentElement.clientHeight;
    small = width < 720;
    anchorX = width * (small ? 0.5 : 0.68);
    anchorY = height * (small ? 0.3 : 0.5);
    base = small
      ? Math.min((width * 0.9) / bounds.width, (height * 0.38) / bounds.height)
      : Math.min((width * 0.56) / bounds.width, (height * 0.72) / bounds.height);
    labelGroup.setAttribute("font-size", 13 / base);
    labelGroup.style.display = small ? "none" : ""; // too crowded to name every star on a phone
    render();
  }

  function render() {
    const scale = cam.zoom * base;
    world.setAttribute(
      "transform",
      `translate(${anchorX - scale * cam.x} ${anchorY - scale * cam.y}) scale(${scale})`,
    );
    lineGroup.setAttribute("stroke-width", 1.4 / scale); // a hairline at any zoom
  }

  /* ---------- captions ---------- */

  let shown = 0;
  function showStep(index) {
    if (index === shown) return;
    shown = index;
    steps.forEach((step, i) => step.classList.toggle("on", i === index));
    dots.forEach((dot, i) => dot.classList.toggle("on", i === index));
  }

  // Timeline time runs one unit per star, plus a final stretch for the pull-back.
  // Each caption changes midway through the flight to its star.
  const TOTAL = milestones.length + 1.7;
  const captionAt = (time) => (time < 0.65 ? 0 : Math.min(milestones.length, 1 + Math.floor(time - 0.65)));
  const offset = steps.length - milestones.length - 1; // captions before the intro, normally none

  /* ---------- the journey ---------- */

  const lit = (star) => (star === milestones[last] ? 1.7 : 1);

  window.addEventListener("resize", layout);
  layout();

  if (reduceMotion) {
    // no flight: the whole constellation is lit from the start and only the captions follow the scroll
    legs.concat(links).forEach(({ to, line }) => gsap.set(line, { attr: { x2: to.x, y2: to.y } }));
    milestones.forEach((star) => gsap.set(star.node, { scale: lit(star), opacity: 1, transformOrigin: "50% 50%" }));
    labelGroup.setAttribute("opacity", 1);
    ScrollTrigger.create({
      trigger: section,
      start: "top top",
      end: "bottom bottom",
      onUpdate: (self) => showStep(offset + captionAt(self.progress * TOTAL)),
    });
  } else {
    gsap.set(
      milestones.map((star) => star.node),
      { scale: 0.5, opacity: 0.3, transformOrigin: "50% 50%" },
    );

    const journey = gsap.timeline({
      defaults: { ease: "power2.inOut" },
      onUpdate() {
        render();
        showStep(offset + captionAt(this.time()));
      },
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.5,
        invalidateOnRefresh: true,
      },
    });

    milestones.forEach((star, index) => {
      // fly in during the first 0.7 of each unit, then hold on the star so its caption can be read
      journey.to(
        cam,
        { x: star.x, y: star.y, zoom: () => (small ? 2.8 : 2.4), duration: 0.7 },
        index + 0.3,
      );
      if (index > 0) {
        journey.to(
          legs[index - 1].line,
          { attr: { x2: star.x, y2: star.y }, duration: 0.6, ease: "power1.inOut" },
          index + 0.32,
        );
      }
      journey.to(
        star.node,
        { scale: lit(star), opacity: 1, duration: 0.28, ease: "back.out(2.4)" },
        index + 0.82,
      );
    });

    // pull back: the whole constellation, any closing links, and every star's name
    const end = milestones.length + 0.3;
    journey.to(cam, { ...wide, duration: 1 }, end);
    links.forEach(({ to, line }) => {
      journey.to(line, { attr: { x2: to.x, y2: to.y }, duration: 0.5 }, end + 0.4);
    });
    journey.to(labelGroup, { attr: { opacity: 1 }, duration: 0.4, ease: "none" }, end + 0.7);
    journey.to({}, { duration: 0.3 }); // a beat on the finished picture before the page moves on
  }
})();
