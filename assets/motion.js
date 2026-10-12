/*
 * Adrastea motion layer. Needs GSAP + ScrollTrigger (assets/vendor).
 *
 * The orbit is a logo-derived element that follows the visitor down every page and changes state
 * only in heroes: data-orbit="hero" shows it, any other value (the pages use "dock") hides it.
 *
 * Scroll effects are opt-in through data attributes:
 *   data-intro     children rise in on page load
 *   data-reveal    rises in when it enters the viewport
 *   data-zoom      grows in while entering, dims while leaving (scrubbed)
 *   data-parallax  image drifts inside its frame (scrubbed)
 *   data-scrub     paragraph lights up word by word (scrubbed)
 *   data-stack     cards that stack; earlier cards recede as the next one covers them
 *   data-marquee   "One|Two@logo.png|Three" becomes an endless row of words, with optional logos
 *
 * With reduced motion, or if GSAP fails to load, content simply stays in place and fully visible.
 */

(() => {
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const TAU = Math.PI * 2;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  // Each track slides by its own width, so two tracks that each hold the list twice loop seamlessly.
  document.querySelectorAll("[data-marquee]").forEach((row) => {
    const words = row.dataset.marquee
      .split("|")
      // "Name@file.png" puts that logo, from images/logo, on a light chip before the name
      .map((word) => {
        const [name, logo] = word.split("@");
        const chip = logo ? `<img class="mq-logo" src="../images/logo/${logo}" alt="" />` : "";
        return `<span>${chip}${name}</span><i></i>`;
      })
      .join("");
    row.innerHTML = `<div class="mq-track">${words}${words}</div>`.repeat(2);
  });

  // Galleries scroll sideways on their own (swipe, trackpad, arrow keys); the arrow buttons move one
  // card at a time and switch off at either end.
  document.querySelectorAll("[data-gallery]").forEach((gallery) => {
    const buttons = [...gallery.parentElement.querySelectorAll("[data-gallery-step]")];
    const update = () => {
      const end = gallery.scrollWidth - gallery.clientWidth - 2;
      buttons.forEach((button) => {
        button.disabled = Number(button.dataset.galleryStep) < 0 ? gallery.scrollLeft <= 2 : gallery.scrollLeft >= end;
      });
    };
    buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const card = gallery.firstElementChild;
        const step = card.getBoundingClientRect().width + parseFloat(getComputedStyle(gallery).columnGap || 0);
        gallery.scrollBy({
          left: step * Number(button.dataset.galleryStep),
          behavior: reduceMotion ? "auto" : "smooth",
        });
      });
    });
    gallery.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    update();
  });

  if (!window.gsap || !window.ScrollTrigger) return;
  gsap.registerPlugin(ScrollTrigger);
  ScrollTrigger.config({ ignoreMobileResize: true });

  /* ---------- the orbit ---------- */

  const orbit = document.createElement("div");
  orbit.className = "orbit";
  orbit.setAttribute("aria-hidden", "true");
  orbit.innerHTML = `
    <svg viewBox="0 0 1000 1000">
      <defs>
        <radialGradient id="orbit-moon"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#c9a7ff"/></radialGradient>
        <radialGradient id="orbit-glow"><stop offset="0" stop-color="#e6d3ff" stop-opacity=".85"/><stop offset="1" stop-color="#9a6bff" stop-opacity="0"/></radialGradient>
      </defs>
      <circle class="orbit-ring" cx="500" cy="500" r="488" stroke="rgba(201,167,255,.16)" stroke-width="1.5"/>
      <circle class="orbit-ring orbit-progress" cx="500" cy="500" r="488" stroke="#fff" stroke-width="2" stroke-linecap="round" transform="rotate(-90 500 500)"/>
      <path class="orbit-path--back" stroke="rgba(201,167,255,.45)" stroke-width="2"/>
      <g class="orbit-moon--back"><circle fill="url(#orbit-glow)"/><circle fill="url(#orbit-moon)"/></g>
    </svg>
    <div class="orbit-core"></div>
    <svg viewBox="0 0 1000 1000">
      <path class="orbit-path--front" stroke="rgba(226,205,255,.95)" stroke-width="2.5"/>
      <g class="orbit-moon--front"><circle fill="url(#orbit-glow)"/><circle fill="url(#orbit-moon)"/></g>
    </svg>`;
  document.body.append(orbit);

  const progressRing = orbit.querySelector(".orbit-progress");
  const moonBack = orbit.querySelector(".orbit-moon--back");
  const moonFront = orbit.querySelector(".orbit-moon--front");

  // The moon's path is a tilted ellipse in the 1000 x 1000 box. Its far half is drawn behind the
  // core and its near half in front, so the moon passes around the emblem.
  const RADIUS_X = 455;
  const RADIUS_Y = 165;
  const PATH_TILT = (-20 * Math.PI) / 180;
  const pointAt = (angle) => {
    const x = RADIUS_X * Math.cos(angle);
    const y = RADIUS_Y * Math.sin(angle);
    return [
      500 + x * Math.cos(PATH_TILT) - y * Math.sin(PATH_TILT),
      500 + x * Math.sin(PATH_TILT) + y * Math.cos(PATH_TILT),
    ];
  };
  const arcPath = (from, to) => {
    let path = "";
    for (let i = 0; i <= 72; i += 1) {
      const [x, y] = pointAt(from + ((to - from) * i) / 72);
      path += `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`;
    }
    return path;
  };
  orbit.querySelector(".orbit-path--front").setAttribute("d", arcPath(0, Math.PI));
  orbit.querySelector(".orbit-path--back").setAttribute("d", arcPath(Math.PI, TAU));

  const CIRCUMFERENCE = TAU * 488;
  progressRing.style.strokeDasharray = CIRCUMFERENCE;

  // Where the orbit sits in a hero; size is its on-screen diameter in px.
  function orbitStates() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    return {
      hero:
        w < 720
          ? { x: w * 0.5, y: h * 0.27, size: w * 0.92, r: -14 }
          : { x: w * 0.72, y: h * 0.44, size: Math.min(h * 0.95, w * 0.7), r: -14 },
    };
  }

  // The state belongs to the last marked section whose top has passed the middle of the viewport.
  // It is derived from position on every check, never from the order scroll events arrived in.
  const marks = [...document.querySelectorAll("[data-orbit]")];
  function stateAtScroll() {
    const line = window.innerHeight * 0.55;
    let state = marks.length ? marks[0].dataset.orbit : "dock";
    marks.forEach((mark) => {
      if (mark.getBoundingClientRect().top <= line) state = mark.dataset.orbit;
    });
    return state;
  }

  let current = null;
  let travel = null;

  function moveOrbit(name, instant) {
    const state = orbitStates()[name];
    current = name;
    if (travel) travel.kill();

    // Only a hero shows the orbit. Everywhere else it fades out where it stands: an emblem gliding
    // across the page behind other content was distracting.
    if (!state) {
      travel = gsap.to(orbit, { opacity: 0, duration: instant || reduceMotion ? 0 : 0.4, ease: "power2.out" });
      return;
    }
    gsap.set(orbit, { x: state.x, y: state.y, scale: state.size / 1000, rotation: state.r });
    travel = gsap.to(orbit, { opacity: 1, duration: instant || reduceMotion ? 0 : 0.5, ease: "power2.out" });
  }

  gsap.set(orbit, { xPercent: -50, yPercent: -50 });
  moveOrbit(stateAtScroll(), true);

  // A fast scroll crosses several sections inside a few frames; checking at most every 100ms
  // coalesces them into one flight toward the state the visitor ends up in.
  let checkTimer = 0;
  function checkOrbit() {
    checkTimer = 0;
    const state = stateAtScroll();
    if (state !== current) moveOrbit(state);
  }
  window.addEventListener(
    "scroll",
    () => {
      if (!checkTimer) checkTimer = window.setTimeout(checkOrbit, 100);
    },
    { passive: true },
  );
  window.addEventListener("resize", () => moveOrbit(stateAtScroll(), true));
  function placeMoon(moon, x, y, radius) {
    const [glow, body] = moon.children;
    glow.setAttribute("cx", x);
    glow.setAttribute("cy", y);
    glow.setAttribute("r", radius * 3.4);
    body.setAttribute("cx", x);
    body.setAttribute("cy", y);
    body.setAttribute("r", radius);
  }

  // The moon circles on its own and is pushed along by scrolling; the outer ring fills with page progress.
  function tick(now) {
    window.requestAnimationFrame(tick);
    const scale = gsap.getProperty(orbit, "scale") || 1;
    const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
    const progress = maxScroll > 0 ? clamp(window.scrollY / maxScroll, 0, 1) : 0;
    const angle = ((reduceMotion ? 0 : now * 0.00035) + window.scrollY * 0.0016) % TAU;
    const [x, y] = pointAt(angle);
    const radius = Math.max(26, 7 / scale); // keep the moon legible when the orbit is docked small
    const inFront = Math.sin(angle) > 0;
    placeMoon(moonFront, x, y, inFront ? radius : 0);
    placeMoon(moonBack, x, y, inFront ? 0 : radius);
    progressRing.style.strokeDashoffset = CIRCUMFERENCE * (1 - progress);
  }
  window.requestAnimationFrame(tick);

  /* ---------- scroll effects ---------- */

  // Returns only the matches it has not handed out before, so effects can be re-wired after
  // content is injected (header, footer, the About page roster) without doubling up.
  const unseen = () => {
    const seen = new WeakSet();
    return (selector) =>
      [...document.querySelectorAll(selector)].filter((el) => !seen.has(el) && seen.add(el));
  };
  const newReveals = unseen();
  const newZooms = unseen();
  const newParallax = unseen();

  // Anything already above the viewport (a page opened at an anchor) is revealed at once.
  const revealObserver = new IntersectionObserver(
    (entries) => {
      const arrived = entries
        .filter((entry) => entry.isIntersecting || entry.boundingClientRect.top < 0)
        .map((entry) => entry.target);
      arrived.forEach((el) => revealObserver.unobserve(el));
      if (arrived.length) {
        gsap.to(arrived, {
          opacity: 1,
          y: 0,
          duration: 1,
          ease: "power3.out",
          stagger: 0.08,
          clearProps: "transform,opacity",
        });
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );

  // Enters while the card rises through the lower half, stays fully readable through the middle,
  // dims only as it leaves.
  function wireZoom(card) {
    gsap.fromTo(
      card,
      { scale: 0.84, opacity: 0.2 },
      {
        scale: 1,
        opacity: 1,
        ease: "power2.out",
        scrollTrigger: { trigger: card, start: "top 94%", end: "top 60%", scrub: true },
      },
    );
    gsap.to(card, {
      opacity: 0.3,
      ease: "power1.in",
      immediateRender: false,
      scrollTrigger: { trigger: card, start: "bottom 26%", end: "bottom 0%", scrub: true },
    });
  }

  function wireParallax(image) {
    gsap.fromTo(
      image,
      { yPercent: -6 },
      {
        yPercent: 6,
        ease: "none",
        scrollTrigger: {
          trigger: image.parentElement,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
        },
      },
    );
  }

  function wireScrub(paragraph) {
    const words = paragraph.textContent
      .trim()
      .split(/\s+/)
      .map((word) => Object.assign(document.createElement("span"), { textContent: word }));
    paragraph.replaceChildren(...words.flatMap((word, index) => (index ? [" ", word] : [word])));
    gsap.fromTo(
      words,
      { opacity: 0.12 },
      {
        opacity: 1,
        stagger: 0.1,
        ease: "none",
        scrollTrigger: { trigger: paragraph, start: "top 78%", end: "bottom 52%", scrub: true },
      },
    );
  }

  // Sticky offsets; keep in sync with .stack.is-stacked .division in style/div.css.
  const STACK_TOP = 88;
  const STACK_STEP = 12;

  function wireStack(stack) {
    const cards = [...stack.querySelectorAll(".division")];
    const anchors = [...stack.querySelectorAll(".stack-anchor")];

    // Stacking only works if every card fits below its sticky offset; otherwise they scroll past as usual.
    const fit = () => {
      const fits = cards.every(
        (card, index) => card.offsetHeight + STACK_TOP + index * STACK_STEP + 16 <= window.innerHeight,
      );
      stack.classList.toggle("is-stacked", window.innerWidth >= 900 && fits);
    };
    fit();
    window.addEventListener("resize", fit);
    if (reduceMotion) return;

    // --cover runs 0 to 1 while the next card slides over this one; the CSS turns it into scale and shade.
    // The in-flow anchors are the triggers because a stuck card no longer reports its natural position.
    cards.slice(0, -1).forEach((card, index) => {
      const stuckAt = STACK_TOP + index * STACK_STEP;
      gsap.to(card, {
        "--cover": 1,
        ease: "none",
        scrollTrigger: {
          trigger: anchors[index + 1],
          start: () => `top ${stuckAt + card.offsetHeight}px`,
          end: `top ${stuckAt}px`,
          scrub: true,
          invalidateOnRefresh: true,
        },
      });
    });
  }

  function refreshScrollEffects() {
    if (!reduceMotion) {
      newReveals("[data-reveal]").forEach((el) => {
        gsap.set(el, { opacity: 0, y: 40 });
        revealObserver.observe(el);
      });
      newZooms("[data-zoom]").forEach(wireZoom);
      newParallax("[data-parallax]").forEach(wireParallax);
    }
    ScrollTrigger.refresh();
  }

  document.querySelectorAll("[data-stack]").forEach(wireStack);
  if (!reduceMotion) {
    document.querySelectorAll("[data-scrub]").forEach(wireScrub);
    // while the loading screen is up, the entrance waits behind it
    const loading = document.documentElement.classList.contains("is-loading");
    document.querySelectorAll("[data-intro]").forEach((group) => {
      const intro = gsap.from(group.children, {
        y: 46,
        opacity: 0,
        duration: 1.1,
        stagger: 0.12,
        ease: "power3.out",
        delay: 0.2,
        clearProps: "transform,opacity",
        paused: loading,
      });
      if (loading) window.addEventListener("adrastea:revealed", () => intro.play(), { once: true });
    });
    // the hero copy lifts and fades as it scrolls away, handing the page to the next chapter
    document.querySelectorAll(".hero").forEach((hero) => {
      gsap.to(hero.querySelector(".layer"), {
        yPercent: -16,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: hero, start: "12% top", end: "78% top", scrub: true },
      });
    });
  }
  refreshScrollEffects();

  // Pages call this after injecting content so new elements animate and trigger positions stay right.
  window.adrasteaRefreshScrollEffects = refreshScrollEffects;
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
})();
