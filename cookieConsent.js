/**
 * NOVA AI — Cookie & Privacy Consent Manager
 * Lightweight, GDPR/CCPA compliant, zero external dependencies.
 */
(function initCookieConsent() {
  const CONSENT_KEY = "novaCookieConsent";
  const existingConsent = localStorage.getItem(CONSENT_KEY);

  // If user already made a choice, do not render banner
  if (existingConsent) return;

  function createBanner() {
    if (document.getElementById("cookieConsentBanner")) return;

    const banner = document.createElement("aside");
    banner.id = "cookieConsentBanner";
    banner.className = "cookie-consent-banner";
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-live", "polite");
    banner.setAttribute("aria-label", "Cookie and privacy choices");

    banner.innerHTML = `
      <div class="cookie-consent-inner">
        <div class="cookie-consent-icon" aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M12 2a10 10 0 0 0 0 20 10 10 0 0 0 0-20z"></path>
            <circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"></circle>
            <circle cx="15.5" cy="8.5" r="1.5" fill="currentColor"></circle>
            <circle cx="9.5" cy="15.5" r="1.5" fill="currentColor"></circle>
            <circle cx="14.5" cy="14.5" r="1.5" fill="currentColor"></circle>
          </svg>
        </div>
        <div class="cookie-consent-text">
          <p>
            <strong>Your Privacy Matters:</strong> We use local storage and essential cookies to authenticate your session, sync your AI workspace with Supabase, and remember your preferences. Review our <a href="privacy.html">Privacy Policy</a>.
          </p>
        </div>
        <div class="cookie-consent-actions">
          <button type="button" class="btn cookie-btn-essential" id="cookieEssentialBtn">Essential Only</button>
          <button type="button" class="btn cookie-btn-accept primary" id="cookieAcceptBtn">Accept All</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);

    // Fade in smoothly after a short delay
    setTimeout(() => {
      banner.classList.add("visible");
    }, 400);

    const acceptBtn = document.getElementById("cookieAcceptBtn");
    const essentialBtn = document.getElementById("cookieEssentialBtn");

    function dismiss(consentType) {
      localStorage.setItem(CONSENT_KEY, consentType);
      localStorage.setItem("novaAnalyticsAllowed", consentType === "accepted" ? "true" : "false");
      banner.classList.remove("visible");
      banner.classList.add("fade-out");
      setTimeout(() => {
        banner.remove();
      }, 350);
    }

    acceptBtn?.addEventListener("click", () => dismiss("accepted"));
    essentialBtn?.addEventListener("click", () => dismiss("essential"));
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => setTimeout(createBanner, 1000));
  } else {
    setTimeout(createBanner, 1000);
  }
})();
