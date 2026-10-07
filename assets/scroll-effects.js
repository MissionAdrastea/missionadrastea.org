const revealGroups = [
  [".landing .hero-text", "bottom"],
  [".landing .fun-fact-image", "alternate"],
  [".landing .research-divisions-section", "left"],
  [".landing .division-tile", "bottom"],
  [".landing .approach-section", "bottom"],
  [".about-us .intro-paragraph", "left"],
  [".about-us .goals-box", "bottom"],
  [".about-us .founder", "right"],
  [".about-us .people-team", "bottom"],
  [".about-us .logos", "left"],
  [".divisions .div-2", "alternate"],
  [".contact .contact-page-heading", "bottom"],
  [".contact .contact-form-card", "right"],
  [".contact .contact-topic", "bottom"],
];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const revealElements = [];

function refreshScrollEffects() {
  revealGroups.forEach(([selector, direction]) => {
    document.querySelectorAll(selector).forEach((element, index) => {
      if (element.classList.contains("scroll-reveal")) return;

      const entryDirection =
        direction === "alternate" ? (index % 2 === 0 ? "left" : "right") : direction;

      element.classList.add("scroll-reveal", "is-visible");
      if (entryDirection !== "bottom") {
        element.classList.add(`scroll-reveal--${entryDirection}`);
      }
      revealElements.push(element);
    });
  });

  updateRevealVisibility();
}

function updateRevealVisibility() {
  if (reducedMotion.matches) {
    revealElements.forEach((element) => element.classList.add("is-visible"));
    return;
  }

  const viewportHeight = window.innerHeight;
  revealElements.forEach((element) => {
    const { bottom, top } = element.getBoundingClientRect();
    const isVisible = bottom > 48 && top < viewportHeight - 48;
    element.classList.toggle("is-visible", isVisible);
  });
}

window.adrasteaRefreshScrollEffects = refreshScrollEffects;
window.addEventListener("scroll", updateRevealVisibility, { passive: true });
window.addEventListener("resize", updateRevealVisibility);
refreshScrollEffects();
