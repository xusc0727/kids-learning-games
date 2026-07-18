const STORAGE_KEY = "playmori.literacy.learned.v1";
const THEMES = [
  { id: "all", label: "全部汉字", mark: "林", tone: "#c99b52" },
  { id: "nature", label: "自然朋友", mark: "日", tone: "#d69a3d" },
  { id: "animals", label: "动物伙伴", mark: "鸟", tone: "#bf6654" },
  { id: "body", label: "我的身体", mark: "手", tone: "#6587a2" },
  { id: "family", label: "我的家人", mark: "家", tone: "#9d6c82" },
  { id: "space", label: "大小方向", mark: "上", tone: "#4e8b73" },
];

const readLearned = () => {
  try { return new Set(JSON.parse(localStorage.getItem(STORAGE_KEY)) || []); } catch { return new Set(); }
};
const saveLearned = (learned) => {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...learned])); } catch { /* private mode */ }
};

const state = { characters: null, theme: "all", learned: readLearned(), current: null, round: 0, target: null, exercisePool: [] };
const $ = (selector) => document.querySelector(selector);
const elements = {
  learnedCount: $("#learnedCount"), visibleCount: $("#visibleCount"), filters: $("#themeFilters"), grid: $("#characterGrid"),
  dialog: $("#characterDialog"), dialogIcon: $("#dialogIcon"), dialogCharacter: $("#dialogCharacter"), dialogTheme: $("#dialogTheme"),
  dialogPinyin: $("#dialogPinyin"), dialogWord: $("#dialogWord"), dialogSentence: $("#dialogSentence"), dialogHint: $("#dialogHint"),
  speakCharacter: $("#speakCharacter"), markLearned: $("#markLearned"), practiceBoard: $("#practiceBoard"), startPractice: $("#startPractice"),
};

function speak(item, includeWord = true) {
  if (!item || !("speechSynthesis" in globalThis)) return;
  speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(includeWord ? `${item.character}，${item.word}` : item.character);
  utterance.lang = "zh-CN";
  utterance.rate = 0.72;
  utterance.pitch = 1.05;
  speechSynthesis.speak(utterance);
}

function themeFor(id) { return THEMES.find((theme) => theme.id === id) || THEMES[0]; }

function renderProgress() { elements.learnedCount.textContent = state.learned.size; }

function renderFilters() {
  elements.filters.replaceChildren(...THEMES.map((theme) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `theme-filter${state.theme === theme.id ? " active" : ""}`;
    button.textContent = `${theme.mark} · ${theme.label}`;
    button.addEventListener("click", () => { state.theme = theme.id; renderFilters(); renderGrid(); });
    return button;
  }));
}

function message(text) {
  const node = document.createElement("div"); node.className = "character-message"; node.textContent = text; return node;
}

function renderGrid() {
  if (state.characters === null) { elements.visibleCount.textContent = "加载中"; elements.grid.replaceChildren(message("正在等汉字朋友从数据库里走出来……")); return; }
  const visible = state.theme === "all" ? state.characters : state.characters.filter((item) => item.theme === state.theme);
  elements.visibleCount.textContent = `${visible.length} 个字`;
  if (!visible.length) { elements.grid.replaceChildren(message("识字内容暂时没有准备好，请稍后刷新页面。")); return; }
  elements.grid.replaceChildren(...visible.map((item, index) => {
    const theme = themeFor(item.theme);
    const button = document.createElement("button");
    button.type = "button";
    button.className = `character-card${state.learned.has(item.id) ? " learned" : ""}`;
    button.style.setProperty("--card-tone", theme.tone);
    button.style.animationDelay = `${Math.min(index, 10) * 40}ms`;
    button.innerHTML = `<span class="icon">${item.icon}</span><b class="hanzi">${item.character}</b><span class="pinyin">${item.pinyin}</span><span class="card-footer"><span>${item.word}</span><span class="learned-mark">${state.learned.has(item.id) ? "认识了 ✓" : "听一听"}</span></span>`;
    button.addEventListener("click", () => openCharacter(item));
    return button;
  }));
}

function openCharacter(item) {
  state.current = item;
  elements.dialogIcon.textContent = item.icon;
  elements.dialogCharacter.textContent = item.character;
  elements.dialogTheme.textContent = item.themeLabel;
  elements.dialogPinyin.textContent = item.pinyin;
  elements.dialogWord.textContent = item.word;
  elements.dialogSentence.textContent = item.sentence;
  elements.dialogHint.textContent = item.hint;
  updateLearnedButton();
  elements.dialog.showModal();
  speak(item);
}

function updateLearnedButton() {
  const learned = state.current && state.learned.has(state.current.id);
  elements.markLearned.classList.toggle("is-learned", learned);
  elements.markLearned.textContent = learned ? "✓ 已经收进“我认识了”" : "把它收进“我认识了”";
}

function toggleLearned() {
  if (!state.current) return;
  if (state.learned.has(state.current.id)) state.learned.delete(state.current.id); else state.learned.add(state.current.id);
  saveLearned(state.learned); renderProgress(); renderGrid(); updateLearnedButton();
}

function shuffle(items) {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) { const j = Math.floor(Math.random() * (i + 1)); [copy[i], copy[j]] = [copy[j], copy[i]]; }
  return copy;
}

function startPractice() {
  if (!state.characters?.length) return;
  const themed = state.theme === "all" ? state.characters : state.characters.filter((item) => item.theme === state.theme);
  state.exercisePool = themed.length >= 3 ? themed : state.characters;
  state.round = 0;
  nextRound();
}

function nextRound() {
  if (state.round >= 5) { renderFinish(); return; }
  state.target = state.exercisePool[Math.floor(Math.random() * state.exercisePool.length)];
  const distractors = shuffle(state.exercisePool.filter((item) => item.id !== state.target.id)).slice(0, 2);
  const choices = shuffle([state.target, ...distractors]);
  const mode = ["picture", "sound", "word"][Math.floor(Math.random() * 3)];

  const wrapper = document.createElement("div");
  const top = document.createElement("div"); top.className = "practice-top";
  const dots = document.createElement("div"); dots.className = "round-dots";
  for (let i = 0; i < 5; i += 1) { const dot = document.createElement("i"); if (i < state.round) dot.className = "done"; dots.append(dot); }
  top.innerHTML = `<span>第 ${state.round + 1} 次寻找</span>`; top.append(dots);

  const prompt = document.createElement("div"); prompt.className = "practice-prompt";
  if (mode === "picture") prompt.innerHTML = `<small>看图找一找</small><strong>${state.target.icon} 和哪个字是朋友？</strong>`;
  if (mode === "word") prompt.innerHTML = `<small>词语找一找</small><strong>我们用哪个字认识“${state.target.word}”？</strong>`;
  if (mode === "sound") {
    prompt.innerHTML = "<small>听音找一找</small>";
    const sound = document.createElement("button"); sound.type = "button"; sound.className = "audio-clue"; sound.textContent = "♪"; sound.setAttribute("aria-label", "再听一次"); sound.addEventListener("click", () => speak(state.target)); prompt.append(sound);
    setTimeout(() => speak(state.target), 180);
  }

  const answers = document.createElement("div"); answers.className = "answer-grid";
  const feedback = document.createElement("p"); feedback.className = "practice-feedback"; feedback.textContent = "选一个你觉得最像的字。";
  let completed = false;
  for (const item of choices) {
    const button = document.createElement("button"); button.type = "button"; button.className = "answer-button"; button.textContent = item.character;
    button.addEventListener("click", () => {
      if (completed) return;
      if (item.id !== state.target.id) { button.classList.remove("try-again"); requestAnimationFrame(() => button.classList.add("try-again")); feedback.textContent = "没关系，再看一眼，或者再听一次。"; return; }
      completed = true;
      button.classList.add("correct"); feedback.textContent = `找到了！这是“${state.target.character}”，${state.target.word}。`;
      answers.querySelectorAll("button").forEach((answer) => { answer.disabled = true; });
      speak(state.target); state.round += 1; setTimeout(nextRound, 1050);
    });
    answers.append(button);
  }
  wrapper.append(top, prompt, answers, feedback);
  elements.practiceBoard.replaceChildren(wrapper);
}

function renderFinish() {
  const finish = document.createElement("div"); finish.className = "practice-finish";
  finish.innerHTML = `<div><div class="finish-seal">会</div><h3>找到五位汉字朋友</h3><p>没有分数，愿意再看、再听一次，就是很棒的学习。</p><button type="button">再玩一次</button></div>`;
  finish.querySelector("button").addEventListener("click", startPractice);
  elements.practiceBoard.replaceChildren(finish);
}

async function loadCharacters() {
  try {
    const response = await fetch("/api/literacy/characters");
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || "识字内容加载失败");
    state.characters = result.characters;
  } catch {
    state.characters = [];
  }
  renderGrid();
}

document.querySelectorAll("[data-scroll]").forEach((button) => button.addEventListener("click", () => document.getElementById(button.dataset.scroll)?.scrollIntoView({ behavior: "smooth" })));
$("#closeDialog").addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => { if (event.target === elements.dialog) elements.dialog.close(); });
elements.speakCharacter.addEventListener("click", () => speak(state.current));
elements.markLearned.addEventListener("click", toggleLearned);
elements.startPractice.addEventListener("click", startPractice);

renderProgress(); renderFilters(); renderGrid(); loadCharacters();
