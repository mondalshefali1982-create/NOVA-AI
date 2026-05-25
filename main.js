const navToggle = document.querySelector(".nav-toggle");
const siteNav = document.querySelector(".site-nav");
const startupLoader = document.getElementById("startupLoader");

if (navToggle && siteNav) {
  navToggle.addEventListener("click", () => {
    const isOpen = siteNav.classList.toggle("open");
    navToggle.setAttribute("aria-expanded", String(isOpen));
  });
}

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("visible");
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.14 });

document.querySelectorAll(".reveal").forEach((element) => {
  revealObserver.observe(element);
});

document.querySelectorAll(".feature-grid .reveal, .tool-grid .reveal, .stats-grid .reveal, .testimonial-grid .reveal, .pricing-grid .reveal").forEach((element, index) => {
  element.style.transitionDelay = `${Math.min(index * 70, 420)}ms`;
});

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    animateCounter(entry.target);
    counterObserver.unobserve(entry.target);
  });
}, { threshold: 0.5 });

document.querySelectorAll("[data-count]").forEach((counter) => {
  counterObserver.observe(counter);
});

function animateCounter(element) {
  const target = Number(element.dataset.count);
  const duration = 1400;
  const start = performance.now();

  function tick(now) {
    const progress = Math.min((now - start) / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    const value = Math.floor(target * eased);
    element.textContent = formatStat(value, target);

    if (progress < 1) {
      requestAnimationFrame(tick);
    }
  }

  requestAnimationFrame(tick);
}

function formatStat(value, target) {
  if (target === 72) return `${value}%`;
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(value >= 100000 ? 0 : 1)}K`;
  return String(value);
}

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => {
    const tool = button.dataset.tool;
    localStorage.setItem("novaPreferredTool", tool);
    window.location.href = "dashboard.html#ai-tools";
  });
});

createParticles();
addCursorGlow();
addTiltCards();
addParallax();
dismissLoader();

function addCursorGlow() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const glow = document.createElement("div");
  glow.className = "cursor-glow";
  document.body.appendChild(glow);

  window.addEventListener("pointermove", (event) => {
    glow.style.opacity = "1";
    glow.style.transform = `translate3d(${event.clientX - 110}px, ${event.clientY - 110}px, 0)`;
  });

  window.addEventListener("pointerleave", () => {
    glow.style.opacity = "0";
  });
}

function addTiltCards() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  document.querySelectorAll(".tilt-card").forEach((card) => {
    card.addEventListener("pointermove", (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(900px) rotateX(${-y * 7}deg) rotateY(${x * 9}deg) translateY(-4px)`;
    });

    card.addEventListener("pointerleave", () => {
      card.style.transform = "";
    });
  });
}

function createParticles() {
  const scene = document.querySelector(".ambient-scene");
  if (!scene) return;

  for (let index = 0; index < 34; index += 1) {
    const particle = document.createElement("span");
    particle.className = "particle";
    particle.style.setProperty("--x", `${Math.random() * 100}%`);
    particle.style.setProperty("--y", `${Math.random() * 100}%`);
    particle.style.setProperty("--size", `${Math.random() * 2.5 + 1}px`);
    particle.style.setProperty("--duration", `${Math.random() * 8 + 8}s`);
    particle.style.setProperty("--delay", `${Math.random() * -10}s`);
    scene.appendChild(particle);
  }
}

function addParallax() {
  if (window.matchMedia("(pointer: coarse)").matches) return;
  const layers = [
    { element: document.querySelector(".hero-content"), depth: 12 },
    { element: document.querySelector(".hero-showcase"), depth: -18 },
    { element: document.querySelector(".aurora-one"), depth: 26 },
    { element: document.querySelector(".aurora-two"), depth: -22 }
  ].filter((layer) => layer.element);

  window.addEventListener("pointermove", (event) => {
    const x = event.clientX / window.innerWidth - 0.5;
    const y = event.clientY / window.innerHeight - 0.5;
    layers.forEach(({ element, depth }) => {
      element.style.translate = `${x * depth}px ${y * depth}px`;
    });
  });
}

function dismissLoader() {
  if (!startupLoader) return;
  window.setTimeout(() => {
    startupLoader.classList.add("hidden");
  }, 760);
}
