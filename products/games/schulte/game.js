import {
  GRID_SIZE,
  addHistoryRecord,
  historySummary,
  improvementLabel,
  normalizeHistory,
  secondsLabel,
  shuffleNumbers,
} from "./logic.mjs?v=20260803-1";

const STORAGE_KEY = "playmori-schulte-history-v1";
const $ = (selector) => document.querySelector(selector);

const elements = {
  welcome: $("#welcomeScreen"),
  game: $("#gameScreen"),
  start: $("#startButton"),
  home: $("#gameHomeButton"),
  grid: $("#numberGrid"),
  target: $("#targetNumber"),
  progress: $("#progressText"),
  timer: $("#timerText"),
  feedback: $("#gameFeedback"),
  overlay: $("#completeOverlay"),
  finishTime: $("#finishTime"),
  finishMessage: $("#finishMessage"),
  playAgain: $("#playAgainButton"),
  viewHistory: $("#viewHistoryButton"),
  clearHistory: $("#clearHistoryButton"),
  historyEmpty: $("#historyEmpty"),
  historyContent: $("#historyContent"),
  firstTime: $("#firstTime"),
  latestTime: $("#latestTime"),
  bestTime: $("#bestTime"),
  trendChart: $("#trendChart"),
  historyList: $("#historyList"),
};

let history = loadHistory();
let nextNumber = 1;
let running = false;
let startedAt = 0;
let elapsedBeforePause = 0;
let timerFrame = 0;

function loadHistory() {
  try {
    return normalizeHistory(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"));
  } catch {
    return [];
  }
}

function saveHistory() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // The game still works when private browsing disables storage.
  }
}

function showScreen(name) {
  elements.welcome.classList.toggle("is-active", name === "welcome");
  elements.game.classList.toggle("is-active", name === "game");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function elapsedMs() {
  return elapsedBeforePause + (running ? performance.now() - startedAt : 0);
}

function updateTimer() {
  elements.timer.textContent = (elapsedMs() / 1000).toFixed(1);
  if (running) timerFrame = requestAnimationFrame(updateTimer);
}

function pauseTimer() {
  if (!running) return;
  elapsedBeforePause += performance.now() - startedAt;
  running = false;
  cancelAnimationFrame(timerFrame);
  updateTimer();
}

function resumeTimer() {
  if (running || nextNumber > GRID_SIZE) return;
  startedAt = performance.now();
  running = true;
  timerFrame = requestAnimationFrame(updateTimer);
}

function startGame() {
  nextNumber = 1;
  elapsedBeforePause = 0;
  elements.timer.textContent = "0.0";
  elements.target.textContent = "1";
  elements.progress.textContent = `0 / ${GRID_SIZE}`;
  elements.feedback.textContent = "从 1 开始，按顺序点击数字。";
  elements.overlay.hidden = true;
  renderGrid();
  showScreen("game");
  startedAt = performance.now();
  running = true;
  cancelAnimationFrame(timerFrame);
  timerFrame = requestAnimationFrame(updateTimer);
}

function stopUnfinishedGame() {
  pauseTimer();
  nextNumber = 1;
  showScreen("welcome");
  renderHistory();
}

function renderGrid() {
  elements.grid.innerHTML = "";
  shuffleNumbers().forEach((number) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "number-cell";
    button.dataset.number = String(number);
    button.setAttribute("role", "gridcell");
    button.setAttribute("aria-label", `数字 ${number}`);
    button.textContent = String(number);
    button.addEventListener("click", () => chooseNumber(button, number));
    elements.grid.append(button);
  });
}

function chooseNumber(button, number) {
  if (!running) return;
  if (number !== nextNumber) {
    button.classList.remove("wrong");
    void button.offsetWidth;
    button.classList.add("wrong");
    elements.feedback.textContent = `现在要找的是 ${nextNumber}，再看看。`;
    return;
  }

  button.disabled = true;
  button.classList.add("found", "correct-now");
  nextNumber += 1;
  elements.progress.textContent = `${nextNumber - 1} / ${GRID_SIZE}`;

  if (nextNumber <= GRID_SIZE) {
    elements.target.textContent = String(nextNumber);
    elements.feedback.textContent = `找到了，接着找 ${nextNumber}。`;
    return;
  }

  completeGame();
}

function completeGame() {
  pauseTimer();
  const durationMs = Math.max(100, Math.round(elapsedBeforePause));
  const previous = history.at(-1);
  const previousBest = history.length ? Math.min(...history.map((record) => record.durationMs)) : Infinity;
  const record = { completedAt: new Date().toISOString(), durationMs };
  history = addHistoryRecord(history, record);
  saveHistory();

  elements.target.textContent = "✓";
  elements.feedback.textContent = "1 到 36 全部找完啦！";
  elements.finishTime.textContent = (durationMs / 1000).toFixed(1);
  if (durationMs < previousBest) {
    elements.finishMessage.textContent = history.length === 1
      ? "第一次完成，已经为你记下这个起点。"
      : "新的最快纪录！这次比以前都快。";
  } else {
    elements.finishMessage.textContent = `${improvementLabel(durationMs, previous?.durationMs)}，这次的成绩也记下来了。`;
  }
  renderHistory();
  window.setTimeout(() => { elements.overlay.hidden = false; }, 350);
}

function formatCompletedAt(isoDate) {
  const date = new Date(isoDate);
  if (Number.isNaN(date.getTime())) return "时间未知";
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

function renderHistory() {
  const summary = historySummary(history);
  elements.historyEmpty.hidden = Boolean(summary);
  elements.historyContent.hidden = !summary;
  elements.clearHistory.hidden = !summary;
  if (!summary) return;

  elements.firstTime.textContent = secondsLabel(summary.firstMs);
  elements.latestTime.textContent = secondsLabel(summary.latestMs);
  elements.bestTime.textContent = secondsLabel(summary.bestMs);
  renderTrend(history.slice(-10));
  renderHistoryList();
}

function renderTrend(records) {
  const width = 640;
  const height = 190;
  const padding = { top: 35, right: 30, bottom: 30, left: 30 };
  const values = records.map((record) => record.durationMs);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1000);
  const spanX = width - padding.left - padding.right;
  const spanY = height - padding.top - padding.bottom;
  const pointFor = (value, index) => ({
    x: records.length === 1 ? width / 2 : padding.left + (index / (records.length - 1)) * spanX,
    y: records.length === 1 ? height / 2 : padding.top + ((max - value) / range) * spanY,
  });
  const points = values.map(pointFor);
  const linePoints = points.map((point) => `${point.x},${point.y}`).join(" ");
  const areaPoints = `${points[0].x},${height - padding.bottom} ${linePoints} ${points.at(-1).x},${height - padding.bottom}`;
  const gridLines = [0, 1, 2].map((index) => {
    const y = padding.top + (index / 2) * spanY;
    return `<line class="chart-grid" x1="${padding.left}" y1="${y}" x2="${width - padding.right}" y2="${y}" />`;
  }).join("");
  const dots = points.map((point, index) => `
    <circle class="chart-dot" cx="${point.x}" cy="${point.y}" r="6" />
    <text class="chart-label" x="${point.x}" y="${Math.max(18, point.y - 13)}">${(values[index] / 1000).toFixed(1)}</text>
  `).join("");

  elements.trendChart.innerHTML = `
    <defs><linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#e97857" stop-opacity=".24"/><stop offset="1" stop-color="#e97857" stop-opacity=".02"/></linearGradient></defs>
    ${gridLines}
    <polygon class="chart-area" points="${areaPoints}" />
    <polyline class="chart-line" points="${linePoints}" />
    ${dots}
  `;
  elements.trendChart.setAttribute("aria-label", `最近 ${records.length} 次完成时间趋势，最近一次 ${secondsLabel(values.at(-1))}`);
}

function renderHistoryList() {
  elements.historyList.innerHTML = "";
  const best = Math.min(...history.map((record) => record.durationMs));
  [...history].reverse().forEach((record, reverseIndex) => {
    const index = history.length - 1 - reverseIndex;
    const row = document.createElement("tr");
    const resultClass = record.durationMs === best ? "record-best" : "";
    row.innerHTML = `
      <td>${formatCompletedAt(record.completedAt)}</td>
      <td class="${resultClass}">${secondsLabel(record.durationMs)}</td>
      <td>${improvementLabel(record.durationMs, history[index - 1]?.durationMs)}</td>
    `;
    elements.historyList.append(row);
  });
}

function clearHistory() {
  if (!window.confirm("要清空全部舒尔特方格历史记录吗？清空后不能恢复。")) return;
  history = [];
  try { localStorage.removeItem(STORAGE_KEY); } catch { /* no-op */ }
  renderHistory();
}

elements.start.addEventListener("click", startGame);
elements.playAgain.addEventListener("click", startGame);
elements.home.addEventListener("click", stopUnfinishedGame);
elements.viewHistory.addEventListener("click", () => {
  elements.overlay.hidden = true;
  showScreen("welcome");
  renderHistory();
  $("#historyTitle").scrollIntoView({ behavior: "smooth", block: "start" });
});
elements.clearHistory.addEventListener("click", clearHistory);

document.addEventListener("visibilitychange", () => {
  if (!elements.game.classList.contains("is-active") || nextNumber > GRID_SIZE) return;
  if (document.hidden) pauseTimer();
  else resumeTimer();
});

renderHistory();
