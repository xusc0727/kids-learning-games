import { DOMAINS } from "./data/domains.js";

const STORAGE = {
  history: "playmori.story.history.v1",
  favorites: "playmori.story.favorites.v1",
  device: "playmori.story.device.v1",
};

const readStorage = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const writeStorage = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode may disable storage */ }
};

function createDeviceId() {
  return globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const storedDeviceId = readStorage(STORAGE.device, "");
const deviceId = /^[A-Za-z0-9-]{20,64}$/.test(storedDeviceId) ? storedDeviceId : createDeviceId();
writeStorage(STORAGE.device, deviceId);

const state = {
  domain: "all",
  fixedStories: null,
  fixedError: "",
  history: readStorage(STORAGE.history, []),
  accountHistory: [],
  favorites: new Set(readStorage(STORAGE.favorites, [])),
  currentStory: null,
  deviceId,
  authenticated: false,
};

const domainMap = new Map(DOMAINS.map((domain) => [domain.id, domain]));
const $ = (selector) => document.querySelector(selector);
const elements = {
  filters: $("#domainFilters"),
  grid: $("#storyGrid"),
  count: $("#storyCount"),
  form: $("#storyForm"),
  event: $("#event"),
  eventCount: $("#eventCount"),
  formError: $("#formError"),
  generateButton: $("#generateButton"),
  apiStatus: $("#apiStatus"),
  historyList: $("#historyList"),
  clearHistory: $("#clearHistory"),
  historyScope: $("#historyScope"),
  dialog: $("#readerDialog"),
  readerDomain: $("#readerDomain"),
  readerTitle: $("#readerTitle"),
  readerGoal: $("#readerGoal"),
  readerStory: $("#readerStory"),
  readerQuestions: $("#readerQuestions"),
  readerAction: $("#readerAction"),
  readerTip: $("#readerTip"),
  favoriteButton: $("#favoriteButton"),
};

function domainForStory(story) {
  if (domainMap.has(story.domain)) return domainMap.get(story.domain);
  return DOMAINS.find((item) => story.domain?.includes(item.short)) || DOMAINS[3];
}

function createFilter(domain) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = `domain-filter${state.domain === domain.id ? " active" : ""}`;
  button.innerHTML = `<i style="background:${domain.color}">${domain.mark}</i><span>${domain.label}</span>`;
  button.addEventListener("click", () => {
    state.domain = domain.id;
    renderFilters();
    renderStories();
  });
  return button;
}

function renderFilters() {
  elements.filters.replaceChildren(...DOMAINS.map(createFilter));
}

function createStoryCard(story, index = 0) {
  const domain = domainForStory(story);
  const card = document.createElement("button");
  card.type = "button";
  card.className = "story-card";
  card.style.setProperty("--domain", domain.color);
  card.style.animationDelay = `${Math.min(index, 8) * 55}ms`;

  const meta = document.createElement("div");
  meta.className = "story-card-meta";
  meta.innerHTML = `<span class="story-card-domain">${domain.label}</span><span>${story.age || "个性故事"} · ${story.duration || "约5分钟"}</span>`;
  const title = document.createElement("h3");
  title.textContent = story.title;
  const summary = document.createElement("p");
  summary.textContent = story.summary;
  const footer = document.createElement("footer");
  footer.innerHTML = `<span>${state.favorites.has(story.id) ? "♥ 已收藏" : "打开故事"}</span><span>↗</span>`;
  card.append(meta, title, summary, footer);
  card.addEventListener("click", () => openStory(story));
  return card;
}

function storyMessage(text) {
  const message = document.createElement("div");
  message.className = "empty-history";
  message.textContent = text;
  return message;
}

function renderStories() {
  if (state.fixedStories === null) {
    elements.count.textContent = "加载中";
    elements.grid.replaceChildren(storyMessage("正在从故事库取书……"));
    return;
  }
  if (state.fixedError) {
    elements.count.textContent = "暂不可用";
    elements.grid.replaceChildren(storyMessage(state.fixedError));
    return;
  }
  const stories = state.domain === "all"
    ? state.fixedStories
    : state.fixedStories.filter((story) => story.domain === state.domain);
  elements.count.textContent = `${stories.length} 篇`;
  elements.grid.replaceChildren(...stories.map(createStoryCard));
}

function mergeHistory(primary, secondary) {
  const merged = new Map();
  for (const story of [...primary, ...secondary]) {
    if (story?.id && !merged.has(story.id)) merged.set(story.id, story);
  }
  return [...merged.values()]
    .sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0))
    .slice(0, 12);
}

function renderHistory() {
  const visibleHistory = mergeHistory(state.accountHistory, state.history);
  if (!visibleHistory.length) {
    elements.historyList.replaceChildren(storyMessage("还没有个性故事。把今天发生的一件小事写下来吧。"));
    elements.clearHistory.hidden = true;
    return;
  }
  elements.clearHistory.hidden = false;
  elements.historyList.replaceChildren(...visibleHistory.map((story) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "history-item";
    const copy = document.createElement("div");
    const domain = domainForStory(story);
    copy.innerHTML = `<p>${domain.label} · ${new Date(story.createdAt).toLocaleDateString("zh-CN")}</p>`;
    const title = document.createElement("h3");
    title.textContent = story.title;
    copy.append(title);
    const arrow = document.createElement("span");
    arrow.textContent = "↗";
    item.append(copy, arrow);
    item.addEventListener("click", () => openStory(story));
    return item;
  }));
}

function openStory(story) {
  state.currentStory = story;
  const domain = domainForStory(story);
  elements.dialog.style.setProperty("--domain", domain.color);
  elements.readerDomain.textContent = `${domain.label} · ${story.source === "ai" ? "为孩子写下" : story.age}`;
  elements.readerTitle.textContent = story.title;
  elements.readerGoal.textContent = `给大人看的成长目标：${story.learningGoal}`;
  elements.readerStory.replaceChildren(...story.story.map((text) => {
    const paragraph = document.createElement("p");
    paragraph.textContent = text;
    return paragraph;
  }));
  elements.readerQuestions.replaceChildren(...story.questions.map((text) => {
    const item = document.createElement("li");
    item.textContent = text;
    return item;
  }));
  elements.readerAction.textContent = story.action;
  elements.readerTip.textContent = `给大人的提示：${story.parentTip}`;
  updateFavoriteButton();
  elements.dialog.showModal();
  elements.dialog.querySelector(".reader-paper").scrollTop = 0;
}

function updateFavoriteButton() {
  const saved = state.currentStory && state.favorites.has(state.currentStory.id);
  elements.favoriteButton.classList.toggle("saved", saved);
  elements.favoriteButton.textContent = saved ? "♥ 已收藏这个故事" : "♡ 收藏这个故事";
}

async function toggleFavorite() {
  if (!state.currentStory) return;
  const saved = !state.favorites.has(state.currentStory.id);
  if (saved) state.favorites.add(state.currentStory.id);
  else state.favorites.delete(state.currentStory.id);
  writeStorage(STORAGE.favorites, [...state.favorites]);
  updateFavoriteButton();
  renderStories();
  if (state.authenticated) {
    try {
      const response = await fetch(`/api/me/favorites/${encodeURIComponent(state.currentStory.id)}`, { method: saved ? "PUT" : "DELETE" });
      if (!response.ok) throw new Error();
    } catch {
      // 本地收藏仍保留，下次在家庭空间同步时会再次合并。
    }
  }
}

async function loadFixedStories() {
  try {
    const response = await fetch("/api/stories/fixed");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "故事书架加载失败");
    state.fixedStories = result.stories;
    state.fixedError = "";
  } catch {
    state.fixedStories = [];
    state.fixedError = "故事书架暂时取不到书，请稍后刷新页面。";
  }
  renderStories();
}

async function loadHistory() {
  try {
    const response = await fetch("/api/stories/history", { headers: { "X-Device-ID": state.deviceId } });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "最近故事加载失败");
    state.history = mergeHistory(result.stories, state.history);
    writeStorage(STORAGE.history, state.history);
    renderHistory();
  } catch {
    // Database history is additive; local history remains available if the request fails.
  }
}

async function loadAccountData() {
  try {
    const meResponse = await fetch("/api/me");
    const me = await meResponse.json();
    if (!meResponse.ok || !me.authenticated) return;
    state.authenticated = true;
    elements.historyScope.textContent = "03 / 家庭与当前设备";
    const [favoritesResponse, storiesResponse] = await Promise.all([
      fetch("/api/me/favorites"),
      fetch("/api/me/stories"),
    ]);
    const favorites = await favoritesResponse.json();
    const stories = await storiesResponse.json();
    if (favoritesResponse.ok) {
      for (const key of favorites.storyKeys || []) state.favorites.add(key);
    }
    if (storiesResponse.ok) state.accountHistory = stories.stories || [];
    renderStories();
    renderHistory();
  } catch {
    // 账号服务异常不影响匿名故事体验。
  }
}

async function checkApi() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) throw new Error();
    const data = await response.json();
    const ready = data.deepseekConfigured && data.database?.connected;
    elements.apiStatus.className = `api-status ${ready ? "ready" : "missing"}`;
    elements.apiStatus.querySelector("span").textContent = ready
      ? `故事写作与保存服务已就绪 · ${data.model}`
      : "故事服务或数据库尚未就绪，请稍后再试";
  } catch {
    elements.apiStatus.className = "api-status missing";
    elements.apiStatus.querySelector("span").textContent = "请使用 npm start 启动，AI 生成功能才能使用";
  }
}

function setGenerating(active) {
  elements.generateButton.disabled = active;
  elements.generateButton.querySelector(".button-label").textContent = active ? "正在写故事…" : "写下这个故事";
  elements.generateButton.querySelector(".button-mark").textContent = active ? "···" : "✦";
}

async function submitStory(event) {
  event.preventDefault();
  elements.formError.textContent = "";
  const data = Object.fromEntries(new FormData(elements.form));
  if ((data.event || "").trim().length < 8) {
    elements.formError.textContent = "请用至少 8 个字描述最近发生的事情。";
    elements.event.focus();
    return;
  }
  data.deviceId = state.deviceId;

  setGenerating(true);
  try {
    const response = await fetch("/api/stories/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "故事生成失败，请稍后再试");
    state.history = mergeHistory([result.story], state.history);
    writeStorage(STORAGE.history, state.history);
    renderHistory();
    openStory(result.story);
  } catch (error) {
    elements.formError.textContent = error.message;
  } finally {
    setGenerating(false);
  }
}

async function clearHistory() {
  const message = state.authenticated
    ? "清空这个家庭保存的全部个性故事吗？此操作也会移除这些故事的收藏。"
    : "清空当前设备上生成的故事记录吗？数据库中的对应匿名故事也会删除。";
  if (!confirm(message)) return;
  try {
    const response = await fetch(state.authenticated ? "/api/me/stories" : "/api/stories/history", {
      method: "DELETE",
      headers: state.authenticated ? {} : { "X-Device-ID": state.deviceId },
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "清空失败，请稍后再试");
    state.history = [];
    state.accountHistory = [];
    writeStorage(STORAGE.history, state.history);
    renderHistory();
  } catch (error) {
    alert(error.message);
  }
}

document.querySelectorAll("[data-scroll]").forEach((button) => button.addEventListener("click", () => {
  document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" });
}));
$("#closeReader").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});
elements.favoriteButton.addEventListener("click", toggleFavorite);
elements.form.addEventListener("submit", submitStory);
elements.event.addEventListener("input", () => {
  elements.eventCount.textContent = `${elements.event.value.length} / 500`;
});
elements.clearHistory.addEventListener("click", clearHistory);

renderFilters();
renderStories();
renderHistory();
checkApi();
loadFixedStories();
loadHistory();
loadAccountData();
