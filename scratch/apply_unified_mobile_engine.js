const fs = require('fs');
const path = require('path');

const STYLES_CSS = path.join(__dirname, '..', 'styles.css');
let css = fs.readFileSync(STYLES_CSS, 'utf8');

const marker = '/* === NOVA AI 100% MOBILE & PHONE RESPONSIVE ENGINE === */';
const markerIndex = css.indexOf(marker);

if (markerIndex === -1) {
  console.error('Marker not found in styles.css');
  process.exit(1);
}

// Slice off everything from the marker onward
const baseCss = css.slice(0, markerIndex).trimEnd();

const unifiedMobileCss = `

${marker}
@media (max-width: 820px) {
  /* 1. Global Viewport & Reset - Zero Horizontal Scroll */
  html, body {
    width: 100% !important;
    max-width: 100vw !important;
    overflow-x: hidden !important;
    position: relative !important;
  }

  /* 2. Dashboard Body: Full-Width Block on Mobile */
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

  /* 3. Off-Canvas Sidebar Drawer (Zero Document-Flow Footprint) */
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

  /* 4. Main Workspace Layout */
  .dashboard-main {
    display: block !important;
    width: 100% !important;
    max-width: 100vw !important;
    min-width: 0 !important;
    margin: 0 !important;
    padding: 12px 12px 76px 12px !important;
    box-sizing: border-box !important;
    overflow-x: hidden !important;
    flex: none !important;
  }

  /* 5. Mobile Topbar Header */
  .dashboard-topbar {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 10px !important;
    margin-bottom: 12px !important;
    padding-bottom: 10px !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .sidebar-toggle {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    min-height: 38px !important;
    padding: 0 12px !important;
    border-radius: 12px !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    background: rgba(255, 255, 255, 0.08) !important;
    color: var(--text, #ffffff) !important;
    font-size: 0.85rem !important;
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
    display: none !important;
  }

  /* 6. Mobile 5-Tab Fixed Bottom Bar */
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

  /* 7. GEMINI & CHATGPT MOBILE TYPOGRAPHY & CHAT APP ARCHITECTURE (MOBILE ONLY) */
  .chat-panel.full-chat {
    height: calc(100dvh - 84px) !important;
    min-height: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    padding: 8px 10px 0 10px !important;
    margin: 0 !important;
    box-sizing: border-box !important;
    position: relative !important;
  }

  .chat-panel .panel-heading {
    flex: 0 0 auto !important;
    margin-bottom: 4px !important;
    padding-bottom: 2px !important;
  }

  .chat-panel .panel-heading .eyebrow {
    font-size: 9.5px !important;
    margin-bottom: 2px !important;
    padding: 2px 8px !important;
  }

  .chat-panel .panel-heading h2 {
    font-size: 1.25rem !important;
    margin: 2px 0 6px 0 !important;
  }

  .chat-panel .model-selector-wrapper {
    margin: 4px 0 !important;
  }

  .chat-quick-actions button,
  .chat-actions .btn {
    padding: 6px 12px !important;
    font-size: 0.78rem !important;
    min-height: 32px !important;
  }

  /* Internal Smooth Scrolling Messages Stream */
  .chat-messages {
    flex: 1 1 auto !important;
    min-height: 0 !important;
    max-height: none !important;
    overflow-y: auto !important;
    -webkit-overflow-scrolling: touch !important;
    padding: 4px 0 12px 0 !important;
    gap: 8px !important;
    box-sizing: border-box !important;
  }

  /* Chat Capsule Input: Anchored cleanly ABOVE bottom nav bar */
  .gemini-capsule-form,
  .chat-form {
    flex: 0 0 auto !important;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 8px !important;
    margin-top: 4px !important;
    margin-bottom: calc(72px + env(safe-area-inset-bottom, 12px)) !important;
    padding: 6px 12px !important;
    border-radius: 9999px !important;
    width: 100% !important;
    box-sizing: border-box !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25) !important;
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

  /* Message Bubbles: Proportional, Compact & Readable (ChatGPT / Gemini Mobile Standard) */
  .message,
  .chat-message,
  .chat-bubble {
    font-size: 14.5px !important;
    line-height: 1.48 !important;
    padding: 9px 13px !important;
    border-radius: 15px !important;
    box-sizing: border-box !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }

  .message.ai,
  .chat-message.assistant {
    margin-left: 28px !important;
    width: calc(100% - 30px) !important;
    max-width: calc(100% - 30px) !important;
  }

  .message.ai::before {
    left: -28px !important;
    width: 22px !important;
    height: 22px !important;
    font-size: 10px !important;
    top: 2px !important;
    border-radius: 6px !important;
  }

  .message.user,
  .chat-message.user {
    max-width: 86% !important;
    margin-left: auto !important;
  }

  /* Compact Paragraphs inside Messages */
  .message p,
  .message-content p,
  .nova-formatted p {
    font-size: 14.5px !important;
    line-height: 1.48 !important;
    margin: 0 0 6px 0 !important;
    color: #1e293b !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }

  .message p:last-child,
  .message-content p:last-child,
  .nova-formatted p:last-child {
    margin-bottom: 0 !important;
  }

  /* Proportionate Headings inside Chat Messages (Prevents Gigantic 38px blow-up) */
  .message h1,
  .message-content h1,
  .nova-formatted h1 {
    font-size: 1.12rem !important; /* ~16.5px */
    font-weight: 700 !important;
    line-height: 1.3 !important;
    margin: 8px 0 4px 0 !important;
    color: #0f172a !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }

  .message h2,
  .message-content h2,
  .nova-formatted h2 {
    font-size: 1.04rem !important; /* ~15.5px */
    font-weight: 650 !important;
    line-height: 1.3 !important;
    margin: 6px 0 3px 0 !important;
    color: #0f172a !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }

  .message h3,
  .message-content h3,
  .nova-formatted h3 {
    font-size: 0.96rem !important; /* ~14.5px */
    font-weight: 600 !important;
    line-height: 1.3 !important;
    margin: 5px 0 2px 0 !important;
    color: #0f172a !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }

  /* Crisp Bold & Italic (No size inflation) */
  .message strong,
  .message b,
  .message-content strong,
  .message-content b,
  .nova-formatted strong,
  .nova-formatted b {
    font-size: inherit !important;
    font-weight: 700 !important;
    color: #090d16 !important;
  }

  /* Clean Lists inside Messages */
  .message ul,
  .message ol,
  .message-content ul,
  .message-content ol,
  .nova-formatted ul,
  .nova-formatted ol {
    margin: 3px 0 6px 16px !important;
    padding: 0 !important;
    font-size: 14.5px !important;
    line-height: 1.48 !important;
    color: #1e293b !important;
  }

  .message li,
  .message-content li,
  .nova-formatted li {
    margin-bottom: 2px !important;
  }

  /* Code Blocks inside Chat on Mobile */
  .nova-code-block {
    max-width: 100% !important;
    margin: 10px 0 !important;
    border-radius: 12px !important;
    overflow: hidden !important;
  }

  .nova-code-block pre {
    padding: 12px 10px !important;
    font-size: 12px !important;
    line-height: 1.45 !important;
    overflow-x: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }

  /* 8. Non-Chat Grid Collapses */
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
    gap: 12px !important;
    width: 100% !important;
  }

  .video-options-grid {
    grid-template-columns: 1fr 1fr !important;
  }

  .stats-row {
    grid-template-columns: 1fr 1fr !important;
  }

  /* Headings outside of chat messages */
  h1:not(.message h1):not(.message-content h1):not(.nova-formatted h1),
  .hero h1 {
    font-size: clamp(1.75rem, 7.5vw, 2.2rem) !important;
    line-height: 1.2 !important;
  }

  h2:not(.message h2):not(.message-content h2):not(.nova-formatted h2):not(.chat-panel h2) {
    font-size: clamp(1.35rem, 5.5vw, 1.7rem) !important;
  }

  .website-preview-frame {
    min-height: 400px !important;
    width: 100% !important;
  }

  .auth-modal,
  .command-palette,
  .image-modal-content {
    width: calc(100vw - 24px) !important;
    max-width: 440px !important;
    padding: 18px 14px !important;
  }
}

@media (max-width: 420px) {
  .dashboard-main {
    padding: 8px 8px 74px 8px !important;
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

fs.writeFileSync(STYLES_CSS, baseCss + unifiedMobileCss, 'utf8');
console.log('Successfully written clean unified mobile stylesheet into styles.css.');
