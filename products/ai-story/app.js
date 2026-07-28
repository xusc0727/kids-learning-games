import { DOMAINS } from "./data/domains.js";

const FAVORITES_STORAGE_KEY = "playmori.story.favorites.v1";

function readFavorites() {
  try {
    return new Set(JSON.parse(localStorage.getItem(FAVORITES_STORAGE_KEY)) || []);
  } catch {
    return new Set();
  }
}

function writeFavorites(favorites) {
  try {
    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([...favorites]));
  } catch {
    // Private browsing may disable local storage; reading stories should still work.
  }
}

const state = {
  domain: "all",
  fixedStories: null,
  fixedError: "",
  favorites: readFavorites(),
  currentStory: null,
  authenticated: false,
};

const domainMap = new Map(DOMAINS.map((domain) => [domain.id, domain]));
const $ = (selector) => document.querySelector(selector);
const elements = {
  filters: $("#domainFilters"),
  grid: $("#storyGrid"),
  count: $("#storyCount"),
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
  meta.innerHTML = `<span class="story-card-domain">${domain.label}</span><span>${story.age} · ${story.duration || "约5分钟"}</span>`;
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

function openStory(story) {
  state.currentStory = story;
  const domain = domainForStory(story);
  elements.dialog.style.setProperty("--domain", domain.color);
  elements.readerDomain.textContent = `${domain.label} · ${story.age}`;
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
  writeFavorites(state.favorites);
  updateFavoriteButton();
  renderStories();

  if (state.authenticated) {
    try {
      const response = await fetch(`/api/me/favorites/${encodeURIComponent(state.currentStory.id)}`, {
        method: saved ? "PUT" : "DELETE",
      });
      if (!response.ok) throw new Error();
    } catch {
      // Keep the local choice; it can be merged into the family later.
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

async function loadAccountFavorites() {
  try {
    const meResponse = await fetch("/api/me");
    const me = await meResponse.json();
    if (!meResponse.ok || !me.authenticated) return;
    state.authenticated = true;
    const response = await fetch("/api/me/favorites");
    const result = await response.json();
    if (!response.ok) return;
    for (const key of result.storyKeys || []) state.favorites.add(key);
    writeFavorites(state.favorites);
    renderStories();
  } catch {
    // Account services should not block the fixed story library.
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

renderFilters();
renderStories();
loadFixedStories();
loadAccountFavorites();
