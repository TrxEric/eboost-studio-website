window.dataLayer = window.dataLayer || [];

function loadCloudflareWebAnalytics() {
  const token = window.EBOOST_ANALYTICS_CONFIG?.cloudflareWebAnalyticsToken;
  if (!token || document.querySelector("script[data-cf-beacon]")) return;

  const script = document.createElement("script");
  script.defer = true;
  script.src = "https://static.cloudflareinsights.com/beacon.min.js";
  script.dataset.cfBeacon = JSON.stringify({ token });
  document.head.append(script);
}

function trackEBoostEvent(eventName, detail = {}) {
  const payload = {
    event: eventName,
    event_category: "EBoost Tesla Conversion",
    ...detail,
  };

  window.dataLayer.push(payload);

  if (typeof window.gtag === "function") {
    window.gtag("event", eventName, detail);
  }

  if (typeof window.fbq === "function") {
    window.fbq("trackCustom", eventName, detail);
  }
}

document.addEventListener("click", (event) => {
  const target = event.target.closest("[data-track]");
  if (!target) return;

  trackEBoostEvent(target.dataset.track, {
    label: target.dataset.trackLabel || target.textContent.trim(),
    href: target.getAttribute("href") || "",
  });
});

document.addEventListener("focusin", (event) => {
  if (!event.target.closest("[data-track-form-start]")) return;
  const form = event.target.closest("form");
  if (form?.dataset.started) return;

  form.dataset.started = "true";
  trackEBoostEvent("start_tesla_quote_form", {
    form_id: form.id || "teslaQuoteForm",
  });
});

loadCloudflareWebAnalytics();
