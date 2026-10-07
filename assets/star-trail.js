const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
const hasFinePointer = window.matchMedia("(pointer: fine)");

if (!prefersReducedMotion.matches && hasFinePointer.matches && "CanvasRenderingContext2D" in window) {
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");
  const particles = [];
  const lifetime = 680;
  let animationFrame = 0;
  let lastSpawn = 0;
  let pixelRatio = 1;

  canvas.className = "site-star-trail";
  canvas.setAttribute("aria-hidden", "true");
  document.body.append(canvas);

  function resizeCanvas() {
    pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);
    canvas.width = Math.round(window.innerWidth * pixelRatio);
    canvas.height = Math.round(window.innerHeight * pixelRatio);
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
  }

  function drawParticle(particle, now) {
    const progress = (now - particle.born) / lifetime;
    if (progress >= 1) return false;

    particle.x += particle.vx;
    particle.y += particle.vy;
    const alpha = (1 - progress) * particle.opacity;

    context.save();
    context.globalAlpha = alpha;
    context.fillStyle = particle.color;
    context.shadowBlur = particle.size * 4;
    context.shadowColor = particle.color;
    context.translate(particle.x, particle.y);
    context.rotate(particle.rotation + progress * 0.7);
    context.beginPath();
    context.moveTo(0, -particle.size);
    context.lineTo(particle.size * 0.38, 0);
    context.lineTo(0, particle.size);
    context.lineTo(-particle.size * 0.38, 0);
    context.closePath();
    context.fill();
    context.restore();
    return true;
  }

  function animate(now) {
    context.clearRect(0, 0, window.innerWidth, window.innerHeight);

    for (let index = particles.length - 1; index >= 0; index -= 1) {
      if (!drawParticle(particles[index], now)) {
        particles.splice(index, 1);
      }
    }

    if (particles.length > 0) {
      animationFrame = window.requestAnimationFrame(animate);
    } else {
      animationFrame = 0;
    }
  }

  function addParticles(event) {
    if (event.pointerType === "touch") return;

    const now = performance.now();
    if (now - lastSpawn < 24) return;
    lastSpawn = now;

    particles.push({
      x: event.clientX + (Math.random() - 0.5) * 5,
      y: event.clientY + (Math.random() - 0.5) * 5,
      vx: (Math.random() - 0.5) * 0.45,
      vy: -0.25 - Math.random() * 0.4,
      born: now,
      size: 1.2 + Math.random() * 1.5,
      opacity: 0.45 + Math.random() * 0.3,
      color: Math.random() > 0.5 ? "#d8c8f7" : "#b6f5d0",
      rotation: Math.random() * Math.PI,
    });

    if (!animationFrame) {
      animationFrame = window.requestAnimationFrame(animate);
    }
  }

  resizeCanvas();
  window.addEventListener("resize", resizeCanvas, { passive: true });
  window.addEventListener("pointermove", addParticles, { passive: true });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      particles.length = 0;
      window.cancelAnimationFrame(animationFrame);
      animationFrame = 0;
      context.clearRect(0, 0, window.innerWidth, window.innerHeight);
    }
  });
}
