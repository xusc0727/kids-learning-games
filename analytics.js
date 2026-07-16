(() => {
  const CONSENT_KEY = "playmori.analytics.consent.v1";
  const SESSION_KEY = "playmori.analytics.session.v1";

  function storageGet(storage, key) {
    try { return storage.getItem(key); } catch { return null; }
  }

  function storageSet(storage, key, value) {
    try { storage.setItem(key, value); } catch { /* private mode may disable storage */ }
  }

  function storageRemove(storage, key) {
    try { storage.removeItem(key); } catch { /* no-op */ }
  }

  function privacySignalEnabled() {
    return navigator.doNotTrack === "1" || navigator.globalPrivacyControl === true;
  }

  function sessionId() {
    let value = storageGet(sessionStorage, SESSION_KEY);
    if (!value) {
      value = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      storageSet(sessionStorage, SESSION_KEY, value);
    }
    return value;
  }

  function screenBucket() {
    const width = Math.min(globalThis.screen?.width || innerWidth, innerWidth || 9999);
    if (width < 600) return "small";
    if (width < 1024) return "medium";
    return "large";
  }

  function sendVisit() {
    if (privacySignalEnabled()) return;
    const payload = JSON.stringify({
      path: location.pathname,
      referrer: document.referrer,
      language: navigator.language || "",
      screen: screenBucket(),
      sessionId: sessionId(),
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon("/api/analytics/visit", new Blob([payload], { type: "application/json" }));
      return;
    }
    fetch("/api/analytics/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: payload,
      keepalive: true,
    }).catch(() => {});
  }

  function setConsent(value) {
    const consent = value === "granted" ? "granted" : "denied";
    storageSet(localStorage, CONSENT_KEY, consent);
    document.querySelector("#playmori-analytics-consent")?.remove();
    if (consent === "granted") sendVisit();
    else storageRemove(sessionStorage, SESSION_KEY);
    document.dispatchEvent(new CustomEvent("playmori:analytics-consent", { detail: consent }));
  }

  function addConsentBanner() {
    if (document.querySelector("#playmori-analytics-consent")) return;
    const style = document.createElement("style");
    style.textContent = `
      #playmori-analytics-consent{position:fixed;z-index:9999;left:18px;right:18px;bottom:18px;max-width:760px;margin:auto;padding:18px 20px;background:#302a24;color:#fff8e9;border:1px solid rgba(255,255,255,.16);border-radius:8px 20px 8px 20px;box-shadow:0 18px 60px rgba(0,0,0,.28);font:13px/1.75 "Songti SC",serif}
      #playmori-analytics-consent p{margin:0}.pm-analytics-actions{display:flex;align-items:center;gap:12px;margin-top:12px;flex-wrap:wrap}.pm-analytics-actions button{border:0;border-radius:4px 12px 4px 12px;padding:9px 14px;cursor:pointer;font:inherit}.pm-analytics-allow{background:#dda84f;color:#2e261d;font-weight:700}.pm-analytics-deny{background:transparent;color:#e5d9c8;border:1px solid rgba(255,255,255,.3)!important}.pm-analytics-actions a{color:#f0c56f;margin-left:auto}@media(max-width:560px){#playmori-analytics-consent{left:10px;right:10px;bottom:10px}.pm-analytics-actions a{width:100%;margin:2px 0 0}}
    `;
    document.head.append(style);

    const banner = document.createElement("aside");
    banner.id = "playmori-analytics-consent";
    banner.setAttribute("aria-label", "访客统计选择");
    const text = document.createElement("p");
    text.textContent = "为了了解哪些内容更受欢迎，我们希望记录去标识化的访问数据。不会保存原始 IP，也不会用于广告或儿童画像。";
    const actions = document.createElement("div");
    actions.className = "pm-analytics-actions";
    const allow = document.createElement("button");
    allow.type = "button"; allow.className = "pm-analytics-allow"; allow.textContent = "同意匿名统计";
    const deny = document.createElement("button");
    deny.type = "button"; deny.className = "pm-analytics-deny"; deny.textContent = "暂不";
    const detail = document.createElement("a");
    detail.href = "/privacy.html"; detail.textContent = "查看统计说明";
    allow.addEventListener("click", () => setConsent("granted"));
    deny.addEventListener("click", () => setConsent("denied"));
    actions.append(allow, deny, detail); banner.append(text, actions); document.body.append(banner);
  }

  globalThis.PlaymoriAnalytics = {
    consent: () => storageGet(localStorage, CONSENT_KEY),
    setConsent,
  };

  function start() {
    if (privacySignalEnabled()) return;
    const consent = storageGet(localStorage, CONSENT_KEY);
    if (consent === "granted") sendVisit();
    else if (consent !== "denied") addConsentBanner();
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();
})();
