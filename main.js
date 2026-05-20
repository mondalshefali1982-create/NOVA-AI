// ─── NAVBAR SCROLL ───
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 20);
});

// ─── MOBILE MENU ───
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');

hamburger.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

// ─── SCROLL REVEAL ───
const reveals = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('visible'), i * 80);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

reveals.forEach(el => revealObserver.observe(el));

// ─── ANIMATED COUNTERS ───
function animateCounter(el) {
  const target = parseInt(el.dataset.target.replace(/,/g, ''));
  const suffix = el.dataset.suffix || '';
  const duration = 2000;
  const steps = 60;
  const increment = target / steps;
  let current = 0;
  let step = 0;

  const timer = setInterval(() => {
    step++;
    current = Math.min(Math.round(increment * step), target);

    if (target >= 1000000) {
      el.textContent = (current / 1000000).toFixed(1) + 'M' + suffix.replace('M+', '+');
    } else if (target >= 1000) {
      el.textContent = current.toLocaleString() + suffix;
    } else {
      el.textContent = current + suffix;
    }

    if (step >= steps) clearInterval(timer);
  }, duration / steps);
}

const counterObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const counters = entry.target.querySelectorAll('[data-target]');
      counters.forEach(c => animateCounter(c));
      counterObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.stats-grid, .preview-stat-row').forEach(el => {
  counterObserver.observe(el);
});

// ─── SMOOTH SCROLL ───
document.querySelectorAll('a[href^="#"]').forEach(a => {
  a.addEventListener('click', e => {
    const target = document.querySelector(a.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});

// ─── PARALLAX ORBS ───
window.addEventListener('mousemove', (e) => {
  const x = (e.clientX / window.innerWidth - 0.5) * 20;
  const y = (e.clientY / window.innerHeight - 0.5) * 20;
  document.querySelectorAll('.orb').forEach((orb, i) => {
    const factor = (i + 1) * 0.3;
    orb.style.transform = `translate(${x * factor}px, ${y * factor}px)`;
  });
});
