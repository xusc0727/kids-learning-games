const foods = [
  { id: "strawberry", name: "草莓", emoji: "🍓", color: "红色", shape: "圆圆的", category: "水果" },
  { id: "apple", name: "苹果", emoji: "🍎", color: "红色", shape: "圆圆的", category: "水果" },
  { id: "watermelon", name: "西瓜", emoji: "🍉", icon: "../assets/watermelon.svg", color: "绿色", shape: "椭圆形的", category: "水果" },
  { id: "banana", name: "香蕉", emoji: "🍌", color: "黄色", shape: "弯弯的", category: "水果" },
  { id: "lemon", name: "柠檬", emoji: "🍋", color: "黄色", shape: "圆圆的", category: "水果" },
  { id: "carrot", name: "胡萝卜", emoji: "🥕", color: "橙色", shape: "长长的", category: "蔬菜" },
  { id: "corn", name: "玉米", emoji: "🌽", color: "黄色", shape: "长长的", category: "蔬菜" },
  { id: "grapes", name: "葡萄", emoji: "🍇", color: "紫色", shape: "圆圆的", category: "水果" },
  { id: "blueberry", name: "蓝莓", emoji: "🫐", color: "蓝色", shape: "圆圆的", category: "水果" },
  { id: "pear", name: "梨", emoji: "🍐", color: "绿色", shape: "胖胖的", category: "水果" },
  { id: "broccoli", name: "西兰花", emoji: "🥦", color: "绿色", shape: "胖胖的", category: "蔬菜" },
  { id: "eggplant", name: "茄子", emoji: "🍆", color: "紫色", shape: "长长的", category: "蔬菜" },
  { id: "cookie", name: "饼干", emoji: "🍪", color: "棕色", shape: "圆圆的", category: "点心" },
  { id: "sandwich", name: "三明治", emoji: "🥪", icon: "../assets/sandwich.svg", color: "黄色", shape: "三角形的", category: "点心" },
];

const customers = [
  { name: "小兔子", emoji: "🐰", line: "好期待呀！" },
  { name: "小熊", emoji: "🐻", line: "肚子咕咕叫啦！" },
  { name: "小狐狸", emoji: "🦊", line: "闻起来真香！" },
  { name: "小熊猫", emoji: "🐼", line: "我会仔细等哦！" },
  { name: "小狮子", emoji: "🦁", line: "今天吃什么呢？" },
];

const stickers = [
  { emoji: "🦊", name: "活力小狐狸" },
  { emoji: "🐰", name: "跳跳小兔子" },
  { emoji: "🐼", name: "美食小熊猫" },
  { emoji: "🦁", name: "勇敢小狮子" },
];

const screens = {
  welcome: document.querySelector("#welcomeScreen"),
  game: document.querySelector("#gameScreen"),
  finish: document.querySelector("#finishScreen"),
};

const el = {
  start: document.querySelector("#startButton"),
  home: document.querySelector("#homeButton"),
  playAgain: document.querySelector("#playAgainButton"),
  backHome: document.querySelector("#backHomeButton"),
  soundWelcome: document.querySelector("#soundButtonWelcome"),
  soundGame: document.querySelector("#soundButtonGame"),
  repeat: document.querySelector("#repeatButton"),
  progress: document.querySelector("#progressDots"),
  starCount: document.querySelector("#starCount"),
  customerName: document.querySelector("#customerName"),
  customerEmoji: document.querySelector("#customerEmoji"),
  customerBubble: document.querySelector("#customerBubble"),
  customer: document.querySelector("#customer"),
  task: document.querySelector("#taskText"),
  levelBadge: document.querySelector("#levelBadge"),
  pattern: document.querySelector("#patternDisplay"),
  tray: document.querySelector("#foodTray"),
  plate: document.querySelector("#plate"),
  plateHint: document.querySelector("#plateHint"),
  feedback: document.querySelector("#feedback"),
  finishSummary: document.querySelector("#finishSummary"),
  stickerEmoji: document.querySelector("#stickerEmoji"),
  stickerName: document.querySelector("#stickerName"),
};

const state = {
  round: 0,
  stars: 0,
  totalRounds: 8,
  sound: true,
  locked: false,
  mission: null,
  recentAnswers: [],
  mistakes: 0,
};

function showScreen(name) {
  Object.values(screens).forEach((screen) => screen.classList.remove("is-active"));
  screens[name].classList.add("is-active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function shuffle(items) {
  return [...items].sort(() => Math.random() - 0.5);
}

function sample(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function foodVisualMarkup(food, quantity = 1) {
  const visual = food.icon
    ? `<img class="food-art" src="${food.icon}" alt="" draggable="false" />`
    : food.emoji;
  return new Array(quantity).fill(visual).join("");
}

function buildMissions() {
  const customer = customers[state.round % customers.length];
  const mode = ["color", "count", "shape", "size", "combo", "category", "count", "pattern"][state.round];

  if (mode === "color") {
    const possibleColors = ["红色", "黄色", "绿色", "紫色", "蓝色"];
    const answerColor = sample(possibleColors.filter((c) => !state.recentAnswers.includes(c)));
    const matching = shuffle(foods.filter((f) => f.color === answerColor));
    const answer = matching[0];
    const distractors = shuffle(foods.filter((f) => f.color !== answerColor)).slice(0, 2);
    state.recentAnswers = [answerColor];
    return {
      customer,
      prompt: `请把${answerColor}的食物送给${customer.name}`,
      answerId: answer.id,
      options: shuffle([answer, ...distractors]).map((f) => ({ ...f, quantity: 1 })),
      fact: `${answer.name}是${answerColor}的，真棒！`,
      hint: `看颜色，要找${answerColor}的${answer.name}`,
    };
  }

  if (mode === "shape") {
    const shapes = ["圆圆的", "长长的", "三角形的", "椭圆形的"];
    const answerShape = sample(shapes);
    const matching = shuffle(foods.filter((f) => f.shape === answerShape));
    const answer = matching[0];
    const distractors = shuffle(foods.filter((f) => f.shape !== answerShape)).slice(0, 2);
    return {
      customer,
      prompt: `请把${answerShape}食物送给${customer.name}`,
      answerId: answer.id,
      options: shuffle([answer, ...distractors]).map((f) => ({ ...f, quantity: 1 })),
      fact: `${answer.name}是${answerShape}，找对啦！`,
      hint: `看形状，要找${answerShape}${answer.name}`,
    };
  }

  if (mode === "size") {
    const answerFood = sample(foods.slice(0, 10));
    const target = Math.random() > 0.5 ? "最大" : "最小";
    const sizes = [
      { key: "small", scale: 0.66, sizeName: "最小" },
      { key: "medium", scale: 0.9, sizeName: "中等" },
      { key: "large", scale: 1.18, sizeName: "最大" },
    ];
    const answerSize = sizes.find((size) => size.sizeName === target);
    return {
      customer,
      prompt: `请把${target}的${answerFood.name}送给${customer.name}`,
      answerId: `${answerFood.id}-${answerSize.key}`,
      options: shuffle(sizes).map((size) => ({ ...answerFood, ...size, id: `${answerFood.id}-${size.key}`, quantity: 1 })),
      fact: `这一个${answerFood.name}${target}，比较正确！`,
      hint: target === "最大" ? "找一找，占地方最多的那一个" : "找一找，占地方最少的那一个",
    };
  }

  if (mode === "combo") {
    const answer = sample(foods.slice(0, 12));
    const distractors = shuffle(foods.filter((food) => food.id !== answer.id && (food.color !== answer.color || food.shape !== answer.shape))).slice(0, 3);
    return {
      customer,
      prompt: `找出${answer.color}又${answer.shape}食物`,
      answerId: answer.id,
      options: shuffle([answer, ...distractors]).map((food) => ({ ...food, quantity: 1 })),
      fact: `${answer.name}既是${answer.color}，又是${answer.shape}！`,
      hint: `先找${answer.color}，再看看哪个是${answer.shape}`,
    };
  }

  if (mode === "category") {
    const category = Math.random() > 0.5 ? "水果" : "蔬菜";
    const answer = sample(foods.filter((food) => food.category === category));
    const distractors = shuffle(foods.filter((food) => food.category !== category)).slice(0, 3);
    return {
      customer,
      prompt: `请找出一种${category}送给${customer.name}`,
      answerId: answer.id,
      options: shuffle([answer, ...distractors]).map((food) => ({ ...food, quantity: 1 })),
      fact: `${answer.name}属于${category}，分类正确！`,
      hint: `想一想，${answer.name}是一种${category}`,
    };
  }

  if (mode === "pattern") {
    const [first, second] = shuffle(foods.slice(0, 10)).slice(0, 2);
    const distractors = shuffle(foods.filter((food) => food.id !== first.id && food.id !== second.id)).slice(0, 2);
    return {
      customer,
      prompt: "看一看规律，下一个食物是什么？",
      patternFoods: [first, second, first, second],
      answerId: first.id,
      options: shuffle([first, second, ...distractors]).map((food) => ({ ...food, quantity: 1 })),
      fact: `${first.name}和${second.name}轮流出现，所以下一个是${first.name}！`,
      hint: `它们一个隔一个出现，下一个和第一个一样`,
    };
  }

  const answerFood = sample(foods.slice(0, 8));
  const answerCount = Math.floor(Math.random() * 5) + 1;
  const optionCount = state.round >= 6 ? 4 : 3;
  const otherCounts = shuffle([1, 2, 3, 4, 5].filter((n) => n !== answerCount)).slice(0, optionCount - 1);
  return {
    customer,
    prompt: `请送给${customer.name}${answerCount}个${answerFood.name}`,
    answerId: `${answerFood.id}-${answerCount}`,
    options: shuffle([answerCount, ...otherCounts]).map((quantity) => ({
      ...answerFood,
      id: `${answerFood.id}-${quantity}`,
      quantity,
    })),
    fact: `${answerCount}个${answerFood.name}，数得真准确！`,
    hint: `用手指慢慢数，要找到${answerCount}个`,
  };
}

function renderProgress() {
  el.progress.innerHTML = "";
  for (let i = 0; i < state.totalRounds; i += 1) {
    const dot = document.createElement("i");
    if (i < state.round) dot.className = "done";
    if (i === state.round) dot.className = "current";
    el.progress.append(dot);
  }
}

function renderMission() {
  state.locked = false;
  state.mistakes = 0;
  state.mission = buildMissions();
  const { customer, prompt, options } = state.mission;
  el.customerName.textContent = `${customer.name}的点单`;
  el.customerEmoji.textContent = customer.emoji;
  el.customerBubble.textContent = customer.line;
  el.task.textContent = prompt;
  const isChallenge = state.round >= 6;
  const isAdvanced = state.round >= 3 && !isChallenge;
  el.levelBadge.textContent = isChallenge ? "挑战关" : isAdvanced ? "进阶关" : "热身关";
  el.levelBadge.className = `level-badge${isChallenge ? " challenge" : isAdvanced ? " advanced" : ""}`;
  el.pattern.innerHTML = state.mission.patternFoods
    ? `${state.mission.patternFoods.map((food) => foodVisualMarkup(food)).join('<span class="pattern-gap"></span>')}<b>❓</b>`
    : "";
  el.pattern.classList.toggle("show", Boolean(state.mission.patternFoods));
  el.plateHint.textContent = "放这里";
  el.tray.innerHTML = "";
  el.tray.classList.toggle("four-options", options.length === 4);
  el.customer.classList.remove("happy");
  el.plate.classList.remove("correct", "is-over");

  options.forEach((food) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = "food-card";
    card.dataset.id = food.id;
    card.dataset.emoji = food.emoji;
    card.dataset.icon = food.icon || "";
    const accessibleName = food.sizeName
      ? `${food.sizeName}的${food.name}`
      : food.quantity > 1
        ? `${food.quantity}个${food.name}`
        : food.name;
    card.setAttribute("aria-label", accessibleName);
    const repeatedFood = foodVisualMarkup(food, food.quantity);
    const emojiStyles = [];
    if (food.quantity > 2) emojiStyles.push("font-size:clamp(24px,7vw,37px)");
    if (food.scale) emojiStyles.push(`transform:scale(${food.scale})`);
    const styleAttribute = emojiStyles.length ? ` style="${emojiStyles.join(";")}"` : "";
    card.innerHTML = `<span class="food-emoji"${styleAttribute}>${repeatedFood}</span>${food.quantity > 1 ? `<span class="quantity">${food.quantity}</span>` : ""}`;
    card.addEventListener("click", () => chooseFood(card));
    addDrag(card);
    el.tray.append(card);
  });

  renderProgress();
  window.setTimeout(speakTask, 450);
}

function showFeedback(message, type) {
  el.feedback.textContent = message;
  el.feedback.className = `feedback show ${type}`;
  window.setTimeout(() => el.feedback.classList.remove("show"), 1100);
}

function chooseFood(card) {
  if (state.locked) return;
  if (card.dataset.id !== state.mission.answerId) {
    state.mistakes += 1;
    card.classList.remove("wrong");
    void card.offsetWidth;
    card.classList.add("wrong");
    const needsHint = state.mistakes >= 2;
    el.customerBubble.textContent = needsHint ? "给你一个小提示！" : "再仔细看看哦～";
    showFeedback(needsHint ? "提示来啦 💡" : "没关系，再试试！", "try");
    if (needsHint) {
      const answerCard = el.tray.querySelector(`[data-id="${state.mission.answerId}"]`);
      answerCard?.classList.add("hinted");
    }
    speak(needsHint ? state.mission.hint : "再仔细看看，试试别的食物吧");
    return;
  }

  state.locked = true;
  card.classList.add("chosen");
  state.stars += 1;
  el.starCount.textContent = state.stars;
  el.plateHint.innerHTML = card.dataset.icon
    ? `<img class="food-art plate-food-art" src="${card.dataset.icon}" alt="" />`
    : card.dataset.emoji;
  el.plate.classList.add("correct");
  el.customer.classList.add("happy");
  el.customerBubble.textContent = "谢谢你，真好吃！";
  showFeedback("★ 找对啦！", "good");
  playSuccessTone();
  window.setTimeout(() => speak(state.mission.fact), 250);

  window.setTimeout(() => {
    state.round += 1;
    if (state.round >= state.totalRounds) finishGame();
    else renderMission();
  }, 1800);
}

function addDrag(card) {
  let clone = null;
  let dragged = false;

  card.addEventListener("pointerdown", (event) => {
    if (state.locked) return;
    dragged = false;
    card.setPointerCapture(event.pointerId);
    const startX = event.clientX;
    const startY = event.clientY;

    const move = (moveEvent) => {
      if (!clone && Math.hypot(moveEvent.clientX - startX, moveEvent.clientY - startY) < 8) return;
      dragged = true;
      if (!clone) {
        clone = document.createElement("div");
        clone.className = "drag-clone";
        clone.innerHTML = card.dataset.icon
          ? `<img class="food-art drag-food-art" src="${card.dataset.icon}" alt="" />`
          : card.dataset.emoji;
        document.body.append(clone);
      }
      clone.style.left = `${moveEvent.clientX}px`;
      clone.style.top = `${moveEvent.clientY}px`;
      const plateRect = el.plate.getBoundingClientRect();
      const over = moveEvent.clientX >= plateRect.left && moveEvent.clientX <= plateRect.right && moveEvent.clientY >= plateRect.top && moveEvent.clientY <= plateRect.bottom;
      el.plate.classList.toggle("is-over", over);
    };

    const up = (upEvent) => {
      card.removeEventListener("pointermove", move);
      card.removeEventListener("pointerup", up);
      card.removeEventListener("pointercancel", up);
      if (clone) clone.remove();
      const plateRect = el.plate.getBoundingClientRect();
      const over = upEvent.clientX >= plateRect.left - 18 && upEvent.clientX <= plateRect.right + 18 && upEvent.clientY >= plateRect.top - 18 && upEvent.clientY <= plateRect.bottom + 18;
      el.plate.classList.remove("is-over");
      if (dragged && over) chooseFood(card);
    };

    card.addEventListener("pointermove", move);
    card.addEventListener("pointerup", up);
    card.addEventListener("pointercancel", up);
  });
}

function speak(text) {
  if (!state.sound) return;
  window.PlaymoriVoice.speak(text, {
    rate: 0.83,
    pitch: 1.07,
    onstart: () => el.repeat.classList.add("is-speaking"),
    onend: () => el.repeat.classList.remove("is-speaking"),
    onerror: () => el.repeat.classList.remove("is-speaking")
  });
}

function speakTask() {
  if (state.mission) speak(state.mission.prompt);
}

function playSuccessTone() {
  if (!state.sound) return;
  try {
    const audio = new (window.AudioContext || window.webkitAudioContext)();
    [523.25, 659.25, 783.99].forEach((frequency, index) => {
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      gain.gain.setValueAtTime(0, audio.currentTime + index * .1);
      gain.gain.linearRampToValueAtTime(.12, audio.currentTime + index * .1 + .02);
      gain.gain.exponentialRampToValueAtTime(.001, audio.currentTime + index * .1 + .28);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start(audio.currentTime + index * .1);
      oscillator.stop(audio.currentTime + index * .1 + .3);
    });
  } catch (_) {
    // Audio is an enhancement; the game remains playable if a browser blocks it.
  }
}

function toggleSound() {
  state.sound = !state.sound;
  if (!state.sound) window.PlaymoriVoice.cancel();
  el.soundWelcome.textContent = state.sound ? "🔊 声音开着" : "🔇 声音关了";
  el.soundWelcome.setAttribute("aria-label", state.sound ? "关闭声音" : "打开声音");
  el.soundGame.textContent = state.sound ? "🔊" : "🔇";
  el.soundGame.setAttribute("aria-label", state.sound ? "关闭声音" : "打开声音");
}

function startGame() {
  state.round = 0;
  state.stars = 0;
  state.recentAnswers = [];
  el.starCount.textContent = "0";
  showScreen("game");
  renderMission();
}

function finishGame() {
  window.PlaymoriVoice.cancel();
  const sticker = sample(stickers);
  el.finishSummary.textContent = `你帮助了${state.totalRounds}位小动物，获得${state.stars}颗彩虹星星！`;
  el.stickerEmoji.textContent = sticker.emoji;
  el.stickerName.textContent = sticker.name;
  showScreen("finish");
  window.setTimeout(() => speak("太棒啦！今天的彩虹餐厅营业完成！"), 350);
}

el.start.addEventListener("click", startGame);
el.playAgain.addEventListener("click", startGame);
el.home.addEventListener("click", () => showScreen("welcome"));
el.backHome.addEventListener("click", () => showScreen("welcome"));
el.repeat.addEventListener("click", speakTask);
el.soundWelcome.addEventListener("click", toggleSound);
el.soundGame.addEventListener("click", toggleSound);
