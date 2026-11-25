/**
 * NOVA AI — Privacy-First Workspace Analytics & Performance Monitor
 * Tracks user journeys, feature adoption, and page latency with full GDPR/CCPA respect.
 */
(function initAnalytics() {
  const isAnalyticsAllowed = () => {
    const consent = localStorage.getItem("novaCookieConsent");
    return consent !== "essential" && consent !== "declined";
  };

  const getSessionId = () => {
    let sid = sessionStorage.getItem("novaSessionId");
    if (!sid) {
      sid = "ses_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);
      sessionStorage.setItem("novaSessionId", sid);
    }
    return sid;
  };

  function trackEvent(eventName, params = {}) {
    if (!isAnalyticsAllowed()) return;

    const eventPayload = {
      event: eventName,
      timestamp: new Date().toISOString(),
      sessionId: getSessionId(),
      url: window.location.pathname,
      ...params
    };

    // Forward to Google Tag / GA4 if configured
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params);
    }

    // Store recent user interaction events locally for user session telemetry
    try {
      const history = JSON.parse(sessionStorage.getItem("novaEventHistory") || "[]");
      history.push(eventPayload);
      if (history.length > 50) history.shift();
      sessionStorage.setItem("novaEventHistory", JSON.stringify(history));
    } catch {
      // Ignore quota errors
    }
  }

  function trackPageView() {
    trackEvent("page_view", {
      title: document.title,
      referrer: document.referrer || "direct"
    });
  }

  function trackPerformance() {
    window.addEventListener("load", () => {
      setTimeout(() => {
        const navEntries = performance.getEntriesByType("navigation");
        if (navEntries && navEntries[0]) {
          const nav = navEntries[0];
          trackEvent("performance_metrics", {
            loadTimeMs: Math.round(nav.loadEventEnd - nav.startTime),
            domReadyMs: Math.round(nav.domContentLoadedEventEnd - nav.startTime),
            dnsMs: Math.round(nav.domainLookupEnd - nav.domainLookupStart)
          });
        }
      }, 500);
    });
  }

  // Expose global interface
  window.novaAnalytics = {
    trackEvent,
    trackPageView
  };

  // Initial page view & performance tracking
  if (document.readyState === "complete") {
    trackPageView();
    trackPerformance();
  } else {
    window.addEventListener("DOMContentLoaded", trackPageView);
    trackPerformance();
  }
})();
