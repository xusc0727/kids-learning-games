(() => {
  "use strict";

  const synthesis = window.speechSynthesis;
  const DEFAULT_OPTIONS = { lang: "zh-CN", rate: 0.82, pitch: 1.06, volume: 1 };
  const PREFERRED_VOICES = [
    "flo", "sandy", "shelley", "xiaoxiao", "晓晓",
    "ting-ting", "tingting", "婷婷", "yaoyao", "瑶瑶",
    "xiaoyi", "晓伊", "yunxia", "云霞", "huihui", "慧慧",
    "google 普通话", "google mandarin"
  ];
  const MALE_VOICES = ["yunxi", "云希", "yunyang", "云扬", "kangkang", "康康", "li-mu", "li mu"];

  let requestId = 0;
  let selectedVoice = null;
  let voicesReady = null;

  function voiceScore(voice) {
    const language = String(voice.lang || "").toLowerCase().replace("_", "-");
    const name = String(voice.name || "").toLowerCase();
    let score = language === "zh-cn" ? 300 : language.startsWith("zh-cn") ? 280 : language.startsWith("zh") ? 180 : 0;
    const preferredIndex = PREFERRED_VOICES.findIndex((hint) => name.includes(hint));
    if (preferredIndex >= 0) score += 150 - preferredIndex * 4;
    if (/(natural|premium|enhanced)/i.test(name)) score += 28;
    if (MALE_VOICES.some((hint) => name.includes(hint))) score -= 120;
    if (voice.localService) score += 8;
    return score;
  }

  function chooseVoice(voices) {
    const chineseVoices = voices.filter((voice) => String(voice.lang || "").toLowerCase().startsWith("zh"));
    if (!chineseVoices.length) return null;
    return chineseVoices.slice().sort((a, b) => voiceScore(b) - voiceScore(a))[0];
  }

  function waitForVoices() {
    const available = synthesis?.getVoices?.() || [];
    if (available.length) return Promise.resolve(available);
    if (voicesReady) return voicesReady;
    voicesReady = new Promise((resolve) => {
      let settled = false;
      const finish = () => {
        if (settled) return;
        settled = true;
        synthesis?.removeEventListener?.("voiceschanged", finish);
        resolve(synthesis?.getVoices?.() || []);
      };
      synthesis?.addEventListener?.("voiceschanged", finish, { once: true });
      window.setTimeout(finish, 650);
    });
    return voicesReady;
  }

  function cancel() {
    requestId += 1;
    synthesis?.cancel?.();
  }

  async function speak(text, options = {}) {
    if (!synthesis || !text) return null;
    cancel();
    const ownRequest = requestId;
    const voices = await waitForVoices();
    if (ownRequest !== requestId) return null;

    selectedVoice = chooseVoice(voices);
    const settings = { ...DEFAULT_OPTIONS, ...options };
    const utterance = new SpeechSynthesisUtterance(String(text));
    utterance.lang = selectedVoice?.lang || settings.lang;
    utterance.rate = settings.rate;
    utterance.pitch = settings.pitch;
    utterance.volume = settings.volume;
    if (selectedVoice) utterance.voice = selectedVoice;
    if (typeof settings.onstart === "function") utterance.onstart = settings.onstart;
    if (typeof settings.onend === "function") utterance.onend = settings.onend;
    if (typeof settings.onerror === "function") utterance.onerror = settings.onerror;
    synthesis.speak(utterance);
    return utterance;
  }

  window.PlaymoriVoice = {
    cancel,
    speak,
    selectedVoiceName: () => selectedVoice?.name || ""
  };
})();
