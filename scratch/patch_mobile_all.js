const fs = require('fs');
const path = require('path');

const DASHBOARD_HTML = path.join(__dirname, '..', 'dashboard.html');
const DASHBOARD_JS = path.join(__dirname, '..', 'dashboard.js');
const STYLES_CSS = path.join(__dirname, '..', 'styles.css');
const INDEX_HTML = path.join(__dirname, '..', 'index.html');

console.log('--- 1. Patching index.html ---');
let indexHtml = fs.readFileSync(INDEX_HTML, 'utf8');
if (!indexHtml.includes('viewport-fit=cover')) {
  indexHtml = indexHtml.replace(
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">',
    '<meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, viewport-fit=cover">'
  );
  fs.writeFileSync(INDEX_HTML, indexHtml, 'utf8');
  console.log('Updated index.html viewport meta.');
}

console.log('--- 2. Patching dashboard.html ---');
let dashHtml = fs.readFileSync(DASHBOARD_HTML, 'utf8');

const oldMobileNavRegex = /<nav class="mobile-bottom-nav"[\s\S]*?<\/nav>/;
const newMobileNav = `  <nav class="mobile-bottom-nav" aria-label="Mobile dashboard navigation">
    <button type="button" data-mobile-panel="overview" class="active">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
      <span>Home</span>
    </button>
    <button type="button" data-mobile-panel="ai-chat">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      <span>Chat</span>
    </button>
    <button type="button" data-mobile-panel="website-generator">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M9 21V9"/></svg>
      <span>Studio</span>
    </button>
    <button type="button" data-mobile-panel="ai-tools">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/></svg>
      <span>Tools</span>
    </button>
    <button type="button" id="mobileMenuBtn" data-mobile-action="menu" aria-label="Open sidebar menu">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
      <span>Menu</span>
    </button>
  </nav>`;

if (oldMobileNavRegex.test(dashHtml)) {
  dashHtml = dashHtml.replace(oldMobileNavRegex, newMobileNav);
  fs.writeFileSync(DASHBOARD_HTML, dashHtml, 'utf8');
  console.log('Updated dashboard.html mobile-bottom-nav to 5 core tabs with SVG icons.');
} else {
  console.log('Warning: oldMobileNavRegex did not match in dashboard.html');
}

console.log('--- 3. Patching dashboard.js ---');
let dashJs = fs.readFileSync(DASHBOARD_JS, 'utf8');

// Ensure mobileMenuBtn listener exists
if (!dashJs.includes('mobileMenuBtn?.addEventListener')) {
  const sidebarToggleAnchor = 'sidebarToggle?.addEventListener("click", () => {';
  const newSidebarListeners = `const mobileMenuBtn = document.getElementById("mobileMenuBtn");
mobileMenuBtn?.addEventListener("click", (e) => {
  e.preventDefault();
  setSidebarState(!sidebar?.classList.contains("open"));
});

sidebarToggle?.addEventListener("click", () => {`;
  dashJs = dashJs.replace(sidebarToggleAnchor, newSidebarListeners);
  console.log('Added mobileMenuBtn click listener.');
}

// Enhance setSidebarState to toggle active state on mobileMenuBtn
if (!dashJs.includes('mobileMenuBtn?.classList.toggle("active"')) {
  const setSidebarAnchor = 'sidebarToggle?.setAttribute(\n    "aria-label",\n    isOpen ? "Close dashboard menu" : "Open dashboard menu"\n  );';
  const enhancedSetSidebar = `sidebarToggle?.setAttribute(
    "aria-label",
    isOpen ? "Close dashboard menu" : "Open dashboard menu"
  );
  const mobileMenuBtn = document.getElementById("mobileMenuBtn");
  if (mobileMenuBtn) {
    mobileMenuBtn.classList.toggle("active", isOpen);
  }`;
  if (dashJs.includes(setSidebarAnchor)) {
    dashJs = dashJs.replace(setSidebarAnchor, enhancedSetSidebar);
    console.log('Enhanced setSidebarState with mobileMenuBtn active toggle.');
  } else {
    // Regex fallback
    dashJs = dashJs.replace(
      /(sidebarToggle\?\.setAttribute\(\s*"aria-label"[\s\S]*?\);)/,
      `$1\n  const mobileMenuBtn = document.getElementById("mobileMenuBtn");\n  if (mobileMenuBtn) {\n    mobileMenuBtn.classList.toggle("active", isOpen);\n  }`
    );
    console.log('Enhanced setSidebarState via regex.');
  }
}

fs.writeFileSync(DASHBOARD_JS, dashJs, 'utf8');

console.log('--- 4. Patching styles.css ---');
let stylesCss = fs.readFileSync(STYLES_CSS, 'utf8');

const mobileStylesMarker = '/* === NOVA AI 100% MOBILE & PHONE RESPONSIVE ENGINE === */';

if (!stylesCss.includes(mobileStylesMarker)) {
  const mobileStylesCss = `

${mobileStylesMarker}
@media (max-width: 820px) {
  /* 1. Global Viewport & Reset - Zero Horizontal Scroll */
  html, body {
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
    position: relative !important;
  }

  /* 2. Fix Dashboard Body from Desktop Flex to Full-Width Block */
  .dashboard-body {
    display: block !important;
    width: 100% !important;
    max-width: 100vw !important;
    min-height: 100vh !important;
    min-height: 100dvh !important;
    margin: 0 !important;
    padding: 0 !important;
    padding-bottom: calc(76px + env(safe-area-inset-bottom, 12px)) !important;
    overflow-x: hidden !important;
    position: relative !important;
  }

  /* 3. Mobile Sidebar Drawer: Completely Off-Canvas when Closed (Zero Space Taken) */
  .dashboard-sidebar {
    position: fixed !important;
    top: 0 !important;
    bottom: 0 !important;
    left: 0 !important;
    width: min(300px, 84vw) !important;
    min-width: 0 !important;
    max-width: 85vw !important;
    height: 100vh !important;
    height: 100dvh !important;
    margin: 0 !important;
    padding: 20px 16px !important;
    z-index: 9999 !important;
    display: flex !important;
    flex-direction: column !important;
    background: rgba(15, 23, 42, 0.96) !important;
    backdrop-filter: blur(24px) saturate(190%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(190%) !important;
    border-right: 1px solid rgba(255, 255, 255, 0.12) !important;
    box-shadow: none !important;
    transform: translateX(-100%) !important;
    transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1), box-shadow 0.28s ease !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }

  .light-mode .dashboard-sidebar {
    background: rgba(255, 255, 255, 0.96) !important;
    border-right: 1px solid rgba(0, 0, 0, 0.1) !important;
  }

  .dashboard-sidebar.open {
    transform: translateX(0) !important;
    box-shadow: 20px 0 60px rgba(0, 0, 0, 0.55) !important;
  }

  /* Close Button in Sidebar Header */
  .sidebar-close {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 36px !important;
    height: 36px !important;
    border-radius: 10px !important;
    border: 1px solid rgba(255, 255, 255, 0.18) !important;
    background: rgba(255, 255, 255, 0.08) !important;
    color: var(--text, #ffffff) !important;
    font-size: 1.15rem !important;
    cursor: pointer !important;
  }

  /* Backdrop Overlay when Sidebar Opens */
  .sidebar-overlay {
    position: fixed !important;
    inset: 0 !important;
    background: rgba(2, 6, 23, 0.68) !important;
    backdrop-filter: blur(8px) !important;
    -webkit-backdrop-filter: blur(8px) !important;
    z-index: 9998 !important;
    opacity: 0 !important;
    pointer-events: none !important;
    transition: opacity 0.26s ease !important;
  }

  body.sidebar-open .sidebar-overlay,
  .sidebar-overlay.open {
    display: block !important;
    opacity: 1 !important;
    pointer-events: auto !important;
  }

  /* 4. Full-Width Main Content (No 250px Margin or Push) */
  .dashboard-main {
    display: block !important;
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 14px 14px 88px 14px !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
    flex: none !important;
  }

  /* 5. Sleek Topbar Header with Hamburger Button */
  .dashboard-topbar {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    margin-bottom: 16px !important;
    padding-bottom: 12px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .sidebar-toggle {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    min-height: 40px !important;
    padding: 0 14px !important;
    border-radius: 12px !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    background: rgba(255, 255, 255, 0.08) !important;
    color: var(--text, #ffffff) !important;
    font-size: 0.88rem !important;
    font-weight: 600 !important;
    cursor: pointer !important;
    backdrop-filter: blur(12px) !important;
    -webkit-backdrop-filter: blur(12px) !important;
    transition: all 0.2s ease !important;
  }

  .sidebar-toggle:active {
    transform: scale(0.96) !important;
  }

  .topbar-actions {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
  }

  .topbar-actions .command-pill {
    display: none !important; /* Hide keyboard shortcut on touch screen */
  }

  /* 6. Mobile Fixed 5-Tab Bottom Navigation Bar */
  .mobile-bottom-nav {
    position: fixed !important;
    left: 10px !important;
    right: 10px !important;
    bottom: max(10px, env(safe-area-inset-bottom, 10px)) !important;
    z-index: 9900 !important;
    display: grid !important;
    grid-template-columns: repeat(5, 1fr) !important;
    gap: 4px !important;
    padding: 6px 6px !important;
    border: 1.5px solid rgba(255, 255, 255, 0.18) !important;
    border-radius: 20px !important;
    background: rgba(15, 23, 42, 0.88) !important;
    backdrop-filter: blur(24px) saturate(190%) !important;
    -webkit-backdrop-filter: blur(24px) saturate(190%) !important;
    box-shadow: 0 16px 45px rgba(0, 0, 0, 0.5), 0 0 25px rgba(99, 102, 241, 0.2) !important;
    box-sizing: border-box !important;
  }

  .light-mode .mobile-bottom-nav {
    background: rgba(255, 255, 255, 0.88) !important;
    border: 1.5px solid rgba(0, 0, 0, 0.09) !important;
    box-shadow: 0 14px 40px rgba(0, 0, 0, 0.12) !important;
  }

  .mobile-bottom-nav button {
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 3px !important;
    min-height: 52px !important;
    padding: 4px 2px !important;
    border: none !important;
    border-radius: 14px !important;
    background: transparent !important;
    color: #94a3b8 !important;
    font-size: 0.72rem !important;
    font-weight: 600 !important;
    transition: all 0.2s ease !important;
    cursor: pointer !important;
  }

  .mobile-bottom-nav button svg {
    width: 20px !important;
    height: 20px !important;
    stroke: currentColor !important;
    flex-shrink: 0 !important;
    transition: transform 0.2s ease !important;
  }

  .mobile-bottom-nav button span {
    display: block !important;
    font-size: 0.7rem !important;
    line-height: 1 !important;
  }

  .mobile-bottom-nav button:active {
    transform: scale(0.93) !important;
  }

  .mobile-bottom-nav button.active {
    color: #ffffff !important;
    background: linear-gradient(135deg, rgba(99, 102, 241, 0.35), rgba(168, 85, 247, 0.3)) !important;
    border: 1px solid rgba(168, 85, 247, 0.4) !important;
    box-shadow: 0 4px 14px rgba(99, 102, 241, 0.25) !important;
  }

  .light-mode .mobile-bottom-nav button.active {
    color: #4f46e5 !important;
    background: rgba(99, 102, 241, 0.12) !important;
    border: 1px solid rgba(99, 102, 241, 0.3) !important;
  }

  /* 7. AI Chat Panel & Pill Form on Mobile */
  .chat-panel {
    min-height: auto !important;
    display: flex !important;
    flex-direction: column !important;
    padding: 10px !important;
    box-sizing: border-box !important;
    width: 100% !important;
  }

  .chat-messages {
    max-height: calc(100dvh - 240px) !important;
    min-height: 260px !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
    padding-bottom: 16px !important;
    width: 100% !important;
  }

  .gemini-capsule-form,
  .chat-form {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 8px !important;
    margin-top: 10px !important;
    padding: 6px 10px !important;
    border-radius: 9999px !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .gemini-capsule-form #chatInput {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    height: 38px !important;
    font-size: 14.5px !important;
    padding: 4px 8px !important;
  }

  .capsule-tool-btn,
  .capsule-mic-btn {
    flex: 0 0 34px !important;
    width: 34px !important;
    height: 34px !important;
    min-width: 34px !important;
    min-height: 34px !important;
    border-radius: 50% !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
  }

  /* 8. Code Blocks on Mobile */
  .nova-code-block {
    max-width: 100% !important;
    margin: 12px 0 !important;
    border-radius: 12px !important;
    overflow: hidden !important;
  }

  .nova-code-block pre {
    padding: 14px 12px !important;
    font-size: 12.5px !important;
    line-height: 1.5 !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }

  /* 9. Grid Collapses & Touch Controls */
  .hero-grid,
  .feature-grid,
  .stats-row,
  .dashboard-layout,
  .studio-grid,
  .cloud-grid,
  .website-generator-layout,
  .video-generator-layout,
  .tools-grid,
  .pricing-grid,
  .testimonial-grid {
    grid-template-columns: 1fr !important;
    gap: 14px !important;
    width: 100% !important;
  }

  .tools-grid {
    grid-template-columns: 1fr !important;
  }

  .video-options-grid {
    grid-template-columns: 1fr 1fr !important;
  }

  .stats-row {
    grid-template-columns: 1fr 1fr !important;
  }

  /* 10. Responsive Heading Typography */
  h1, .hero h1 {
    font-size: clamp(1.75rem, 7.5vw, 2.4rem) !important;
    line-height: 1.2 !important;
  }

  h2 {
    font-size: clamp(1.35rem, 5.5vw, 1.8rem) !important;
  }

  p {
    font-size: 0.95rem !important;
  }

  .website-preview-frame {
    min-height: 420px !important;
    width: 100% !important;
  }

  /* 11. Modal Dialogs on Phone */
  .auth-modal,
  .command-palette,
  .image-modal-content {
    width: calc(100vw - 28px) !important;
    max-width: 440px !important;
    padding: 20px 16px !important;
  }
}

@media (max-width: 420px) {
  .dashboard-main {
    padding: 10px 10px 84px 10px !important;
  }

  .mobile-bottom-nav {
    left: 6px !important;
    right: 6px !important;
    padding: 4px !important;
  }

  .mobile-bottom-nav button {
    min-height: 48px !important;
    font-size: 0.68rem !important;
  }

  .stats-row {
    grid-template-columns: 1fr !important;
  }
}
`;
  stylesCss += mobileStylesCss;
  fs.writeFileSync(STYLES_CSS, stylesCss, 'utf8');
  console.log('Appended comprehensive mobile responsive engine to styles.css.');
}

console.log('ALL PATCHES APPLIED SUCCESSFULLY!');
