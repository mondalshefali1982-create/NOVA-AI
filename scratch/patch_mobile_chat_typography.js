const fs = require('fs');
const path = require('path');

const DASHBOARD_JS = path.join(__dirname, '..', 'dashboard.js');
const STYLES_CSS = path.join(__dirname, '..', 'styles.css');

console.log('--- 1. Patching dashboard.js to ensure message-content class ---');
let dashJs = fs.readFileSync(DASHBOARD_JS, 'utf8');

// Patch 1: line 2702
dashJs = dashJs.replace(
  `  if (type === "ai" && text) {
    const textNode = document.createElement("div");
    textNode.innerHTML = parseMarkdown(text);`,
  `  if (type === "ai" && text) {
    const textNode = document.createElement("div");
    textNode.className = "message-content";
    textNode.innerHTML = parseMarkdown(text);`
);

// Patch 2: line 2926
dashJs = dashJs.replace(
  `    if (msg.type === "ai" && msg.text) {
      const textNode = document.createElement("div");
      textNode.innerHTML = parseMarkdown(msg.text);`,
  `    if (msg.type === "ai" && msg.text) {
      const textNode = document.createElement("div");
      textNode.className = "message-content";
      textNode.innerHTML = parseMarkdown(msg.text);`
);

// Patch 3: streamMessage final pass
dashJs = dashJs.replace(
  `      // Final comprehensive syntax verification structure pass
      element.innerHTML = parseMarkdown(text);
      element.classList.remove("streaming");`,
  `      // Final comprehensive syntax verification structure pass
      element.innerHTML = parseMarkdown(text);
      element.classList.add("message-content");
      element.classList.remove("streaming");`
);

fs.writeFileSync(DASHBOARD_JS, dashJs, 'utf8');
console.log('dashboard.js patched successfully.');

console.log('--- 2. Patching styles.css with Mobile-Only Gemini & ChatGPT Typography ---');
let stylesCss = fs.readFileSync(STYLES_CSS, 'utf8');

const mobileTypographySection = `
  /* ====================================================================
     GEMINI & CHATGPT MOBILE TYPOGRAPHY & DENSITY ENGINE (MOBILE-ONLY)
     Compact, comfortable font sizes matching Gemini & ChatGPT Mobile Apps.
     Desktop/Laptop styles remain 100% untouched.
     ==================================================================== */

  /* Chat Messages Container Padding & Scroll Height */
  .chat-messages {
    gap: 10px !important;
    padding: 10px 0 !important;
    max-height: calc(100dvh - 310px) !important;
    min-height: 240px !important;
  }

  /* Lift Chat Input Form Above Bottom Navigation Bar */
  .gemini-capsule-form,
  .chat-form {
    margin-top: 8px !important;
    margin-bottom: calc(72px + env(safe-area-inset-bottom, 12px)) !important;
    padding: 6px 12px !important;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.25) !important;
  }

  /* Message Bubble Width & Padding (Compact Density) */
  .message,
  .chat-message,
  .chat-bubble {
    font-size: 14.5px !important;
    line-height: 1.48 !important;
    padding: 10px 14px !important;
    border-radius: 16px !important;
    box-sizing: border-box !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }

  .message.ai,
  .chat-message.assistant {
    margin-left: 30px !important;
    width: calc(100% - 32px) !important;
    max-width: calc(100% - 32px) !important;
  }

  .message.ai::before {
    left: -32px !important;
    width: 24px !important;
    height: 24px !important;
    font-size: 10.5px !important;
    top: 2px !important;
    border-radius: 7px !important;
  }

  .message.user,
  .chat-message.user {
    max-width: 88% !important;
    margin-left: auto !important;
  }

  /* Compact Paragraphs (Like ChatGPT Mobile) */
  .message p,
  .message-content p,
  .nova-formatted p {
    font-size: 14.5px !important;
    line-height: 1.48 !important;
    margin: 0 0 6px 0 !important;
    color: #1e293b !important;
  }

  .message p:last-child,
  .message-content p:last-child,
  .nova-formatted p:last-child {
    margin-bottom: 0 !important;
  }

  /* Proportionate Mobile Headings inside Chat (NOT Gigantic 38px Hero Font) */
  .message h1,
  .message-content h1,
  .nova-formatted h1 {
    font-size: 1.12rem !important; /* ~16.5px */
    font-weight: 700 !important;
    line-height: 1.3 !important;
    margin: 10px 0 4px 0 !important;
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
    margin: 8px 0 4px 0 !important;
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
    margin: 6px 0 3px 0 !important;
    color: #0f172a !important;
    word-break: break-word !important;
    overflow-wrap: break-word !important;
  }

  /* Crisp Bold & Italic without blowing up size */
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

  /* Clean Lists (Like Gemini Mobile) */
  .message ul,
  .message ol,
  .message-content ul,
  .message-content ol,
  .nova-formatted ul,
  .nova-formatted ol {
    margin: 4px 0 8px 18px !important;
    padding: 0 !important;
    font-size: 14.5px !important;
    line-height: 1.48 !important;
    color: #1e293b !important;
  }

  .message li,
  .message-content li,
  .nova-formatted li {
    margin-bottom: 3px !important;
  }

  /* Compact Chat Header Controls on Mobile */
  .chat-panel .panel-heading {
    margin-bottom: 6px !important;
    padding-bottom: 4px !important;
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
`;

// Insert the mobile typography rules inside the @media (max-width: 820px) block in styles.css
const marker = '/* === NOVA AI 100% MOBILE & PHONE RESPONSIVE ENGINE === */\n@media (max-width: 820px) {';

if (stylesCss.includes(marker)) {
  stylesCss = stylesCss.replace(marker, marker + '\n' + mobileTypographySection);
  fs.writeFileSync(STYLES_CSS, stylesCss, 'utf8');
  console.log('Appended Gemini/ChatGPT Mobile Typography rules inside mobile media query.');
} else {
  console.log('Marker not found, appending to end of styles.css wrapped in media query.');
  stylesCss += `\n@media (max-width: 820px) {\n${mobileTypographySection}\n}\n`;
  fs.writeFileSync(STYLES_CSS, stylesCss, 'utf8');
}

console.log('ALL TYPOGRAPHY PATCHES APPLIED SUCCESSFULLY!');
