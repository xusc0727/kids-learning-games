const levels = [
  {
    name: "第1关 · 方向热身",
    task: "收集胡萝卜，再走到宝箱",
    map: ["#######", "#P....#", "#.###.#", "#...F.#", "#.###.#", "#....E#", "#######"],
    food: "🥕",
    needsKey: false,
  },
  {
    name: "第2关 · 两份点心",
    task: "找到2个苹果，再走到宝箱",
    map: ["#######", "#P..#E#", "#.#.#.#", "#.#...#", "#.###.#", "#F...F#", "#######"],
    food: "🍎",
    needsKey: false,
  },
  {
    name: "第3关 · 金钥匙",
    task: "先拿钥匙和草莓，再打开宝箱",
    map: ["#######", "#P..#E#", "###.#.#", "#K..#.#", "#.###.#", "#F....#", "#######"],
    food: "🍓",
    needsKey: true,
  },
  {
    name: "第4关 · 绕过水坑",
    task: "绕开水坑，收集2根香蕉和钥匙",
    map: ["#######", "#P~...#", "#.~.#F#", "#...#.#", "###.#.#", "#F.K.E#", "#######"],
    food: "🍌",
    needsKey: true,
  },
  {
    name: "第5关 · 森林小挑战",
    task: "规划路线，找齐葡萄和钥匙",
    map: ["#######", "#P#F..#", "#.#.#.#", "#...#.#", "#.###.#", "#F.K.E#", "#######"],
    food: "🍇",
    needsKey: true,
  },
  {
    name: "第6关 · 9×9岔路",
    task: "在更多岔路中找到2根胡萝卜",
    map: ["#########", "#P..#...#", "#.#.#.#F#", "#.#...#.#", "#.#####.#", "#F....#.#", "###.#.#.#", "#...#..E#", "#########"],
    food: "🥕",
    needsKey: false,
  },
  {
    name: "第7关 · 三个目标",
    task: "探索不同岔路，找齐3个苹果",
    map: ["#########", "#P#.....#", "#.#.###F#", "#...#...#", "#...#.#.#", "#F..#.#F#", "#.###.#.#", "#......E#", "#########"],
    food: "🍎",
    needsKey: false,
  },
  {
    name: "第8关 · 双路寻宝",
    task: "探索两条路线，找到草莓和钥匙",
    map: ["#########", "#P..#..E#", "###.#.#.#", "#K..#.#.#", "#.###.#.#", "#F....#F#", "#.#####.#", "#.......#", "#########"],
    food: "🍓",
    needsKey: true,
  },
  {
    name: "第9关 · 水坑迷阵",
    task: "绕开水坑，找齐3根香蕉和钥匙",
    map: ["#########", "#P~...#E#", "#.~.#.#.#", "#...#...#", "###.###.#", "#F..K...#", "#.~~~.#F#", "#F....#.#", "#########"],
    food: "🍌",
    needsKey: true,
  },
  {
    name: "第10关 · 神奇机关",
    task: "踩亮机关、收集葡萄和钥匙，再穿过木门",
    map: ["#########", "#P..#..E#", "#.#.#.#G#", "#.#...#.#", "#.#####.#", "#S..K...#", "###.###.#", "#F....F.#", "#########"],
    food: "🍇",
    needsKey: true,
    needsSwitch: true,
  },
  {
    name: "第11关 · 12×12探险",
    task: "深入大森林，找齐3根胡萝卜",
    map: ["############", "#P#...#...##", "#.#.#.###.##", "#...#.....##", "#########.##", "#...FF#...##", "#.#.###.####", "#.#.#...#F##", "#.#.#.###.##", "#E#.......##", "############", "############"],
    food: "🥕",
    needsKey: false,
  },
  {
    name: "第12关 · 四处搜寻",
    task: "在大迷宫中找齐4个苹果和钥匙",
    map: ["############", "#P#K#.....##", "#.#F#.###.##", "#.#...FF#.##", "#.#.#####.##", "#.#E#...#.##", "#.###.#.#.##", "#...#.#...##", "###.#.###.##", "#.....#F..##", "############", "############"],
    food: "🍎",
    needsKey: true,
  },
  {
    name: "第13关 · 深林回廊",
    task: "走遍回廊，找到草莓和钥匙",
    map: ["############", "#P#.....#.##", "#.#.###.#.##", "#...#F#...##", "#####F###.##", "#K#.....#.##", "#F#.###.#.##", "#...#E#.#.##", "#.###.#.#.##", "#.....#...##", "############", "############"],
    food: "🍓",
    needsKey: true,
  },
  {
    name: "第14关 · 四步顺序",
    task: "按照图示顺序找到4种食物",
    map: ["############", "#P#...#...##", "#.#.#1#.#.##", "#...#...#2##", "#########.##", "#.#..4#...##", "#.#.#.#.####", "#...#.#...##", "#.###.###3##", "#..E#.....##", "############", "############"],
    foodSequence: ["🍎", "🍌", "🍇", "🍓"],
    needsKey: false,
  },
  {
    name: "第15关 · 终极寻宝",
    task: "按顺序收集、启动机关、拿钥匙并打开宝箱",
    map: ["############", "#P#.#...3.##", "#.#.#.###.##", "#.#...#K..##", "#.#.###.####", "#.#.GE#..2##", "#.#######.##", "#1....S...##", "#########.##", "#.........##", "############", "############"],
    foodSequence: ["🍋", "🫐", "🍓"],
    needsKey: true,
    needsSwitch: true,
  },
];

const mazeScreens = {
  welcome: document.querySelector("#mazeWelcome"),
  game: document.querySelector("#mazeGame"),
  finish: document.querySelector("#mazeFinish"),
};

const mazeEl = {
  start: document.querySelector("#mazeStart"),
  home: document.querySelector("#mazeHome"),
  again: document.querySelector("#mazeAgain"),
  soundWelcome: document.querySelector("#mazeSoundWelcome"),
  soundGame: document.querySelector("#mazeSoundGame"),
  repeat: document.querySelector("#repeatMazeTask"),
  progress: document.querySelector("#mazeProgress"),
  stepCount: document.querySelector("#stepCount"),
  levelName: document.querySelector("#levelName"),
  task: document.querySelector("#mazeTask"),
  foodGoal: document.querySelector("#foodGoal"),
  keyGoal: document.querySelector("#keyGoal"),
  switchGoal: document.querySelector("#switchGoal"),
  board: document.querySelector("#mazeBoard"),
  feedback: document.querySelector("#mazeFeedback"),
  hint: document.querySelector("#hintButton"),
  overlay: document.querySelector("#levelOverlay"),
  resultText: document.querySelector("#levelResultText"),
  next: document.querySelector("#nextLevel"),
  summary: document.querySelector("#mazeSummary"),
};

const mazeState = {
  level: 0,
  map: [],
  player: { row: 0, col: 0 },
  collected: 0,
  totalFood: 0,
  hasKey: false,
  hasSwitch: false,
  steps: 0,
  sound: true,
  locked: false,
  touchStart: null,
  totalSteps: 0,
  startLevel: 0,
};

const directions = {
  up: { row: -1, col: 0, word: "上" },
  down: { row: 1, col: 0, word: "下" },
  left: { row: 0, col: -1, word: "左" },
  right: { row: 0, col: 1, word: "右" },
};

function showMazeScreen(name) {
  Object.values(mazeScreens).forEach((screen) => screen.classList.remove("is-active"));
  mazeScreens[name].classList.add("is-active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function copyMap(map) {
  return map.map((row) => row.split(""));
}

function startMaze(startLevel = 0) {
  mazeState.level = startLevel;
  mazeState.startLevel = startLevel;
  mazeState.totalSteps = 0;
  showMazeScreen("game");
  loadLevel();
}

function loadLevel() {
  const level = levels[mazeState.level];
  mazeState.map = copyMap(level.map);
  mazeState.collected = 0;
  mazeState.totalFood = 0;
  mazeState.hasKey = false;
  mazeState.hasSwitch = false;
  mazeState.steps = 0;
  mazeState.locked = false;
  mazeEl.overlay.classList.remove("show");

  mazeState.map.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
    if (cell === "P") {
      mazeState.player = { row: rowIndex, col: colIndex };
      mazeState.map[rowIndex][colIndex] = ".";
    }
    if (cell === "F" || /[1-9]/.test(cell)) mazeState.totalFood += 1;
  }));

  mazeEl.levelName.textContent = level.name;
  mazeEl.task.textContent = level.task;
  mazeEl.stepCount.textContent = "0";
  mazeEl.feedback.textContent = "看好路线，开始探险吧！";
  mazeEl.feedback.className = "maze-feedback";
  renderProgress();
  renderGoals();
  renderBoard();
  window.setTimeout(speakMazeTask, 400);
}

function renderProgress() {
  mazeEl.progress.innerHTML = "";
  levels.forEach((_, index) => {
    const dot = document.createElement("i");
    if (index < mazeState.level) dot.className = "done";
    if (index === mazeState.level) dot.className = "current";
    mazeEl.progress.append(dot);
  });
}

function renderGoals() {
  const level = levels[mazeState.level];
  if (level.foodSequence) {
    mazeEl.foodGoal.innerHTML = level.foodSequence.map((food, index) => `<span class="sequence-item${index < mazeState.collected ? " done" : ""}">${food}</span>${index < level.foodSequence.length - 1 ? '<i class="sequence-arrow">➜</i>' : ""}`).join("");
  } else {
    mazeEl.foodGoal.innerHTML = `<span>${level.food}</span><b>${mazeState.collected} / ${mazeState.totalFood}</b>`;
  }
  mazeEl.foodGoal.classList.toggle("done", mazeState.collected === mazeState.totalFood);
  mazeEl.keyGoal.classList.toggle("is-hidden", !level.needsKey);
  mazeEl.keyGoal.classList.toggle("done", mazeState.hasKey);
  mazeEl.keyGoal.innerHTML = `<span>🔑</span><b>${mazeState.hasKey ? "找到了" : "还没找到"}</b>`;
  mazeEl.switchGoal.classList.toggle("is-hidden", !level.needsSwitch);
  mazeEl.switchGoal.classList.toggle("done", mazeState.hasSwitch);
  mazeEl.switchGoal.innerHTML = `<span>🪄</span><b>${mazeState.hasSwitch ? "已启动" : "找机关"}</b>`;
}

function tileLabel(cell, row, col) {
  if (row === mazeState.player.row && col === mazeState.player.col) return "小兔子所在位置";
  if (cell === "#") return "大树，不能通过";
  if (cell === "~") return "水坑，不能通过";
  if (cell === "F") return "可以收集的食物";
  if (cell === "K") return "金钥匙";
  if (cell === "S") return "打开木门的机关";
  if (cell === "G") return mazeState.hasSwitch ? "已经打开的木门" : "关闭的木门";
  if (/[1-9]/.test(cell)) return `第${cell}个要收集的食物`;
  if (cell === "E") return "宝箱出口";
  return "可以行走的小路";
}

function renderBoard() {
  const level = levels[mazeState.level];
  const ready = goalsComplete();
  mazeEl.board.innerHTML = "";
  mazeEl.board.style.setProperty("--grid-size", mazeState.map.length);
  mazeEl.board.dataset.size = mazeState.map.length;

  mazeState.map.forEach((row, rowIndex) => row.forEach((cell, colIndex) => {
    const tile = document.createElement("div");
    tile.className = `tile ${cell === "#" ? "wall" : cell === "~" ? "water" : cell === "E" ? "exit" : cell === "G" ? `gate${mazeState.hasSwitch ? " open" : ""}` : cell === "S" ? "switch" : "path"}`;
    if (cell === "E" && ready) tile.classList.add("ready");
    tile.dataset.row = rowIndex;
    tile.dataset.col = colIndex;
    tile.setAttribute("role", "gridcell");
    tile.setAttribute("aria-label", tileLabel(cell, rowIndex, colIndex));

    if (cell === "F") tile.innerHTML = `<span class="item">${level.food}</span>`;
    if (/[1-9]/.test(cell)) tile.innerHTML = `<span class="item">${level.foodSequence[Number(cell) - 1]}</span>`;
    if (cell === "K") tile.innerHTML = '<span class="item">🔑</span>';
    if (cell === "S") tile.innerHTML = '<span class="item">🪄</span>';
    if (cell === "G") tile.innerHTML = `<span class="item">${mazeState.hasSwitch ? "✨" : "🚪"}</span>`;
    if (cell === "E") tile.innerHTML = '<img class="item maze-art" src="../assets/treasure-chest.svg" alt="" />';
    if (rowIndex === mazeState.player.row && colIndex === mazeState.player.col) {
      tile.insertAdjacentHTML("beforeend", '<span class="player">🐰</span>');
    }
    mazeEl.board.append(tile);
  }));
}

function goalsComplete() {
  const level = levels[mazeState.level];
  return mazeState.collected === mazeState.totalFood && (!level.needsKey || mazeState.hasKey) && (!level.needsSwitch || mazeState.hasSwitch);
}

function blockedReason(cell) {
  if (cell === "#" || cell === undefined) return "大树挡住了，换个方向试试！";
  if (cell === "~") return "水坑挡住了，换个方向试试！";
  if (cell === "G" && !mazeState.hasSwitch) return "木门关着，先去寻找发光机关！";
  if (/[1-9]/.test(cell) && Number(cell) !== mazeState.collected + 1) return `顺序不对，先找第${mazeState.collected + 1}个食物！`;
  return "";
}

function setFeedback(message, type = "") {
  mazeEl.feedback.textContent = message;
  mazeEl.feedback.className = `maze-feedback${type ? ` ${type}` : ""}`;
}

function movePlayer(directionName) {
  if (mazeState.locked) return;
  const direction = directions[directionName];
  const next = {
    row: mazeState.player.row + direction.row,
    col: mazeState.player.col + direction.col,
  };
  const target = mazeState.map[next.row]?.[next.col];
  const blocked = blockedReason(target);

  if (blocked) {
    const tile = mazeEl.board.querySelector(`[data-row="${next.row}"][data-col="${next.col}"]`);
    tile?.classList.add("bump");
    window.setTimeout(() => tile?.classList.remove("bump"), 350);
    setFeedback(blocked, "notice");
    speakMaze(blocked);
    return;
  }

  if (target === "E" && !goalsComplete()) {
    const level = levels[mazeState.level];
    const missing = mazeState.collected < mazeState.totalFood ? "还要找齐食物" : level.needsKey && !mazeState.hasKey ? "还要先找到钥匙" : "任务还没完成";
    setFeedback(`${missing}，宝箱才会打开哦！`, "notice");
    speakMaze(missing);
    return;
  }

  mazeState.player = next;
  mazeState.steps += 1;
  mazeState.totalSteps += 1;
  mazeEl.stepCount.textContent = mazeState.steps;

  if (target === "F" || /[1-9]/.test(target)) {
    mazeState.collected += 1;
    mazeState.map[next.row][next.col] = ".";
    const foundFood = levels[mazeState.level].foodSequence?.[Number(target) - 1] || levels[mazeState.level].food;
    setFeedback(`按顺序找到${foundFood}啦！`, "good");
    playMazeTone(620);
  } else if (target === "K") {
    mazeState.hasKey = true;
    mazeState.map[next.row][next.col] = ".";
    setFeedback("找到金钥匙啦！", "good");
    speakMaze("找到金钥匙啦");
    playMazeTone(720);
  } else if (target === "S") {
    mazeState.hasSwitch = true;
    mazeState.map[next.row][next.col] = ".";
    setFeedback("机关启动，木门打开啦！", "good");
    speakMaze("机关启动，木门打开啦");
    playMazeTone(760);
  } else {
    setFeedback(`向${direction.word}走了一步`);
  }

  renderGoals();
  renderBoard();
  if (target === "E") completeLevel();
}

function completeLevel() {
  mazeState.locked = true;
  playMazeSuccess();
  mazeEl.resultText.textContent = `你用了${mazeState.steps}步，完成了${levels[mazeState.level].name.split(" · ")[0]}。`;
  mazeEl.next.querySelector("span").textContent = mazeState.level === levels.length - 1 ? "领取奖章" : "下一关";
  window.setTimeout(() => {
    mazeEl.overlay.classList.add("show");
    speakMaze("找到宝箱啦，方向认得真准");
  }, 450);
}

function nextLevel() {
  if (mazeState.level === levels.length - 1) {
    mazeEl.overlay.classList.remove("show");
    mazeEl.summary.textContent = `你完成了${levels.length - mazeState.startLevel}座迷宫，一共走了${mazeState.totalSteps}步，还找到了所有宝箱！`;
    showMazeScreen("finish");
    speakMaze("恭喜你成为森林路线达人");
    return;
  }
  mazeState.level += 1;
  loadLevel();
}

function showHint() {
  if (mazeState.locked) return;
  const choices = [];
  Object.values(directions).forEach((direction) => {
    const row = mazeState.player.row + direction.row;
    const col = mazeState.player.col + direction.col;
    const cell = mazeState.map[row]?.[col];
    if (cell && !blockedReason(cell)) choices.push({ row, col });
  });
  choices.forEach(({ row, col }) => mazeEl.board.querySelector(`[data-row="${row}"][data-col="${col}"]`)?.classList.add("hint-path"));
  setFeedback("发光的格子都可以走，想一想选哪条路！", "notice");
  speakMaze("发光的格子都可以走，想一想选哪条路");
  window.setTimeout(() => mazeEl.board.querySelectorAll(".hint-path").forEach((tile) => tile.classList.remove("hint-path")), 2200);
}

function speakMaze(text) {
  if (!mazeState.sound) return;
  window.PlaymoriVoice.speak(text, { rate: .84, pitch: 1.06 });
}

function speakMazeTask() {
  speakMaze(levels[mazeState.level].task);
}

function toggleMazeSound() {
  mazeState.sound = !mazeState.sound;
  if (!mazeState.sound) window.PlaymoriVoice.cancel();
  mazeEl.soundWelcome.textContent = mazeState.sound ? "🔊 声音开着" : "🔇 声音关了";
  mazeEl.soundWelcome.setAttribute("aria-label", mazeState.sound ? "关闭声音" : "打开声音");
  mazeEl.soundGame.textContent = mazeState.sound ? "🔊" : "🔇";
  mazeEl.soundGame.setAttribute("aria-label", mazeState.sound ? "关闭声音" : "打开声音");
}

function playMazeTone(frequency) {
  if (!mazeState.sound) return;
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(.12, audio.currentTime);
    gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + .25);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start();
    oscillator.stop(audio.currentTime + .26);
  } catch (_) {
    // Sound is optional; movement remains fully usable without it.
  }
}

function playMazeSuccess() {
  [523, 659, 784].forEach((frequency, index) => window.setTimeout(() => playMazeTone(frequency), index * 110));
}

document.querySelectorAll(".move-button").forEach((button) => button.addEventListener("click", () => movePlayer(button.dataset.direction)));
document.addEventListener("keydown", (event) => {
  const keyMap = { ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right" };
  if (keyMap[event.key] && mazeScreens.game.classList.contains("is-active")) {
    event.preventDefault();
    movePlayer(keyMap[event.key]);
  }
});

mazeEl.board.addEventListener("pointerdown", (event) => {
  mazeState.touchStart = { x: event.clientX, y: event.clientY };
});
mazeEl.board.addEventListener("pointerup", (event) => {
  if (!mazeState.touchStart) return;
  const dx = event.clientX - mazeState.touchStart.x;
  const dy = event.clientY - mazeState.touchStart.y;
  mazeState.touchStart = null;
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return;
  if (Math.abs(dx) > Math.abs(dy)) movePlayer(dx > 0 ? "right" : "left");
  else movePlayer(dy > 0 ? "down" : "up");
});

mazeEl.start.addEventListener("click", () => startMaze(0));
document.querySelectorAll("[data-start-level]").forEach((button) => button.addEventListener("click", () => startMaze(Number(button.dataset.startLevel))));
mazeEl.home.addEventListener("click", () => showMazeScreen("welcome"));
mazeEl.again.addEventListener("click", () => startMaze(mazeState.startLevel));
mazeEl.next.addEventListener("click", nextLevel);
mazeEl.hint.addEventListener("click", showHint);
mazeEl.repeat.addEventListener("click", speakMazeTask);
mazeEl.soundWelcome.addEventListener("click", toggleMazeSound);
mazeEl.soundGame.addEventListener("click", toggleMazeSound);
