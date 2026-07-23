(() => {
  "use strict";

  const STORAGE_KEY = "playmori-forest-chapters-v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const forest = window.PlaymoriForest;
  const dialog = $("#adventureDialog");
  const content = $("#adventureContent");
  const art = (name, label = "") => `<span class="forest-art art-${name}"${label ? ` role="img" aria-label="${label}"` : " aria-hidden=\"true\""}></span>`;
  const artGroup = (name, count, label = "") => Array.from({ length: count }, () => art(name, label)).join("");

  const chapters = {
    2: {
      numeral: "第二章", icon: "market", title: "彩虹集市", leaf: "丰收分享叶",
      introKicker: "成长节需要好多好吃的", introTitle: "彩虹集市要开门啦", introText: "小兔和朋友们正在准备食物。可是货架还没整理，购物清单也没有配齐。我们一起让集市热闹起来吧！",
      cast: ["rabbit", "fox", "market"], color: "#d7dfaa",
      rewardTitle: "收下彩虹集市的三件装饰", completeTitle: "彩虹集市开门啦！", completeText: "你会给食物分类、按照清单数数量，也能比较哪一篮更多。三件集市装饰已经放进背包，大家也带着食物出发去车站啦！",
      rewards: [
        ["flags", "bunting", "彩虹小旗", "风一吹就跳舞"], ["fruit", "hamper", "丰收果篮", "香香甜甜的欢迎礼"], ["bell", "bell", "清风铃铛", "客人来时叮铃响"]
      ]
    },
    3: {
      numeral: "第三章", icon: "station", title: "叮当车站", leaf: "认真倾听叶",
      introKicker: "邀请函要送到每位朋友手里", introTitle: "森林火车准备出发", introText: "列车长小狐狸要安排乘客、排好队伍，还要记住好几步指令。认真听一听，我们来做它的小助手！",
      cast: ["fox", "rabbit", "locomotive"], color: "#b9d9d2",
      rewardTitle: "收下叮当车站的三件装饰", completeTitle: "森林火车通车啦！", completeText: "你听清了颜色和顺序，安排好了乘客，也记住了连续指令。三件车站装饰已经放进背包，成长节的邀请函正在送往山谷！",
      rewards: [
        ["redtrain", "locomotive", "莓果红车头", "像太阳一样有精神"], ["bluetrain", "teal-carriage", "湖水蓝车厢", "跑起来像一阵清风"], ["goldtrain", "yellow-carriage", "麦穗金车厢", "装满暖暖的阳光"]
      ]
    },
    4: {
      numeral: "第四章", icon: "valley", title: "探索山谷", leaf: "勇敢探索叶",
      introKicker: "舞台还缺少山谷里的花朵", introTitle: "探索队背上小书包", introText: "山谷里藏着羽毛、钥匙和特别的种子。我们要仔细观察、找对路线，还要弄清植物长大的顺序。",
      cast: ["panda", "compass", "valley"], color: "#bfd59f",
      rewardTitle: "收下探索山谷的三件装饰", completeTitle: "探索山谷被点亮啦！", completeText: "你找到了藏起来的宝物、规划路线走出山谷，还知道一颗种子怎样慢慢开花。三件花朵装饰已经放进背包，友谊舞台只差最后的节目啦！",
      rewards: [
        ["sunflower", "sunflower", "太阳花", "总是朝着亮亮的地方"], ["tulip", "flower", "郁金香", "像小杯子一样盛住春天"], ["daisy", "wreath", "小雏菊", "一朵一朵开满草地"]
      ]
    },
    5: {
      numeral: "第五章", icon: "stage", title: "友谊舞台", leaf: "友谊创造叶",
      introKicker: "成长节马上就要开始", introTitle: "最后一起准备节目", introText: "有的朋友需要一句温暖的话，故事卡片还没有排好，乐队也在等一位小指挥。让我们一起完成最后的舞台！",
      cast: ["bear", "rabbit", "fox", "stage"], color: "#efd29f",
      rewardTitle: "收下友谊舞台的三件装饰", completeTitle: "森林成长节开始啦！", completeText: "你理解朋友的感受、排出了完整故事，还带领乐队敲出了节奏。三件舞台装饰已经放进背包，成长树终于开花啦！",
      rewards: [
        ["starstage", "medal", "星星舞台", "每位朋友都闪闪发光"], ["flowerstage", "stage", "花朵舞台", "让歌声开成一朵花"], ["rainbowstage", "arch", "彩虹舞台", "把每种颜色放在一起"]
      ]
    }
  };

  const defaultState = { started: [], progress: { 2: 0, 3: 0, 4: 0, 5: 0 }, completed: [], rewards: {} };
  let state = loadState();
  let activeChapter = 2;

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      return {
        started: Array.isArray(saved.started) ? saved.started : [],
        progress: { ...defaultState.progress, ...(saved.progress || {}) },
        completed: Array.isArray(saved.completed) ? saved.completed : [],
        rewards: saved.rewards || {}
      };
    } catch (_) {
      return structuredClone(defaultState);
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderHome();
    window.dispatchEvent(new CustomEvent("playmori-forest-rewards-change"));
  }

  function oneComplete() { return Boolean(forest?.isChapterOneComplete()); }
  function isComplete(chapter) { return chapter === 1 ? oneComplete() : state.completed.includes(chapter); }
  function isAvailable(chapter) { return chapter === 2 ? oneComplete() : isComplete(chapter - 1); }
  function completedCount() { return [1, 2, 3, 4, 5].filter(isComplete).length; }
  function nextChapter() { return [2, 3, 4, 5].find((chapter) => isAvailable(chapter) && !isComplete(chapter)); }

  function setHeroForSeason() {
    if (!oneComplete()) return;
    const next = nextChapter();
    if (next) {
      const chapter = chapters[next];
      $("#storyButtonEyebrow").textContent = `${chapter.numeral}已经开启`;
      $("#storyButtonText").textContent = `前往${chapter.title}`;
      $("#heroIntro").textContent = `小熊已经住进森林，新的请求又来了。接下来前往${chapter.title}，让成长树继续长大吧。`;
      $("#statusText").innerHTML = `<b>小芽提醒：</b>“${chapter.introText}”`;
    } else if (completedCount() === 5) {
      $("#storyButtonEyebrow").textContent = "第一季全部完成";
      $("#storyButtonText").textContent = "重温森林成长节";
      $("#heroIntro").textContent = "成长树已经开花，五个森林地点全部热闹起来。你帮助过的朋友都在成长节等你！";
      $("#statusText").innerHTML = "<b>小芽悄悄话：</b>“这座森林的每一点变化，都有你的一份帮助。”";
    }
  }

  function renderHome() {
    const count = completedCount();
    $("#leafCount").textContent = String(count);
    [2, 3, 4, 5].forEach((chapter) => {
      document.body.classList.toggle(`chapter-${chapter}-complete`, isComplete(chapter));
      const card = $(`.chapter-card[data-chapter="${chapter}"]`);
      const status = $(`#chapter${["", "", "Two", "Three", "Four", "Five"][chapter]}Status`);
      const available = isAvailable(chapter);
      card.classList.toggle("locked", !available);
      card.classList.toggle("unlocked", available && !isComplete(chapter));
      card.classList.toggle("finished", isComplete(chapter));
      card.classList.toggle("next-chapter", chapter === nextChapter());
      card.disabled = !available;
      if (isComplete(chapter)) status.textContent = "已经完成 · 新地点出现";
      else if (state.started.includes(chapter)) status.textContent = `进行中 · ${Math.min(state.progress[chapter] + 1, 4)} / 4`;
      else if (available) status.textContent = "可以开始啦";
      else status.textContent = `完成第${chapter - 1}章后开启`;
    });
    $("#sceneChapter").textContent = count === 5 ? "成长节开幕" : count ? `第一季 · ${count} / 5` : "序章";
    $("#forestScene").setAttribute("aria-label", `你的童趣森林，五章故事已经完成${count}章`);
    setHeroForSeason();
  }

  function updateHeader(chapter) {
    const data = chapters[chapter];
    $("#adventureIcon").className = `forest-art art-${data.icon}`;
    $("#adventureChapter").textContent = data.numeral;
    $("#adventureTitle").textContent = data.title;
    $$("#adventureProgress i").forEach((dot, index) => {
      dot.classList.toggle("done", isComplete(chapter) || index < state.progress[chapter]);
      dot.classList.toggle("now", !isComplete(chapter) && index === state.progress[chapter]);
    });
  }

  function showDialog(chapter) {
    if (!isAvailable(chapter)) {
      forest.toast(`先完成第${chapter - 1}章，就能继续出发啦`);
      return;
    }
    activeChapter = chapter;
    updateHeader(chapter);
    if (!dialog.open) dialog.showModal();
    if (isComplete(chapter)) renderChapterComplete(chapter);
    else if (!state.started.includes(chapter)) renderIntro(chapter);
    else renderTask(chapter, state.progress[chapter]);
  }

  function panel(html, className = "") {
    content.innerHTML = `<div class="adventure-panel ${className}">${html}</div>`;
    dialog.querySelector(".quest-shell").scrollTo({ top: 0, behavior: "smooth" });
  }

  function renderIntro(chapter) {
    const data = chapters[chapter];
    panel(`
      <div class="adventure-hero" style="--adventure-bg:${data.color}" aria-hidden="true">${data.cast.map((item, index) => `${art(item)}${index < data.cast.length - 1 ? "<i>✦</i>" : ""}`).join("")}</div>
      <p class="mini-kicker">${data.introKicker}</p><h2>${data.introTitle}</h2><p>${data.introText}</p>
      <button class="primary-action" data-action="begin" type="button"><span>一起出发</span><i>➜</i></button>
    `);
    forest.speak(`${data.introTitle}。${data.introText}`);
    $("[data-action=begin]", content).addEventListener("click", () => {
      state.started.push(chapter);
      state.progress[chapter] = 0;
      saveState();
      renderTask(chapter, 0);
    });
  }

  function renderTask(chapter, stage) {
    updateHeader(chapter);
    if (stage >= 3) return renderReward(chapter);
    const renderer = taskRenderers[`${chapter}-${stage}`];
    renderer();
  }

  function finishTask(message) {
    state.progress[activeChapter] = Math.min(3, state.progress[activeChapter] + 1);
    saveState();
    forest.chime();
    forest.toast(message);
    window.setTimeout(() => renderTask(activeChapter, state.progress[activeChapter]), 550);
  }

  function feedback(text, type = "") {
    const el = $(".adventure-feedback", content);
    if (!el) return;
    el.textContent = text;
    el.className = `adventure-feedback${type ? ` ${type}` : ""}`;
  }

  function playRhythmNote(note) {
    if (!forest.getState().sound) return;
    const frequency = { drum: 220, bell: 740, wood: 440 }[note] || 440;
    try {
      const audio = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audio.createOscillator();
      const gain = audio.createGain();
      oscillator.frequency.value = frequency;
      oscillator.type = note === "drum" ? "triangle" : "sine";
      gain.gain.setValueAtTime(0.11, audio.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.2);
      oscillator.connect(gain).connect(audio.destination);
      oscillator.start();
      oscillator.stop(audio.currentTime + 0.21);
    } catch (_) {}
  }

  function taskHeading(kicker, title, prompt) {
    return `<p class="mini-kicker">${kicker}</p><h2>${title}</h2><p class="task-prompt">${prompt}</p>`;
  }

  function renderReward(chapter) {
    const data = chapters[chapter];
    panel(`${taskHeading("三项任务都完成啦", data.rewardTitle, "这三件装饰全部属于你，可以在森林里自由摆放。")}
      <div class="option-grid reward-grid reward-showcase">${data.rewards.map(([, image, name, hint]) => `<div>${art(image, name)}<b>${name}</b><small>${hint}</small></div>`).join("")}</div>
      <button class="primary-action collect-all-button" data-action="collect-all" type="button"><span>全部装进背包</span><i>➜</i></button>
      <p class="adventure-feedback">一件也不用舍弃，三个都带走吧！</p>`, "reward-panel");
    forest.speak(`${data.rewardTitle}。三个装饰全部送给你。`);
    $("[data-action=collect-all]", content).addEventListener("click", () => {
      state.rewards[chapter] = data.rewards.map(([value]) => value);
      if (!state.completed.includes(chapter)) state.completed.push(chapter);
      state.progress[chapter] = 4;
      saveState();
      forest.chime();
      window.setTimeout(() => renderChapterComplete(chapter), 450);
    });
  }

  function renderChapterComplete(chapter) {
    const data = chapters[chapter];
    updateHeader(chapter);
    if (chapter === 5) return renderFinale();
    panel(`<div class="celebration" aria-hidden="true"><i>✦</i><i>●</i>${art(data.cast[0])}<i>●</i><i>✦</i></div>
      <p class="mini-kicker">第${chapter}根树枝发芽了</p><h2>${data.completeTitle}</h2><p>${data.completeText}</p>
      <div class="earned-leaf">${art("plant")}<p><small>获得成长叶片</small><b>${data.leaf}</b></p></div>
      <button class="primary-action" data-action="next" type="button"><span>前往下一章</span><i>➜</i></button>`);
    forest.speak(`${data.completeTitle}。${data.completeText}`);
    $("[data-action=next]", content).addEventListener("click", () => showDialog(chapter + 1));
  }

  function renderFinale() {
    panel(`<div class="festival-finale"><div class="festival-cast" aria-hidden="true">${["bear","rabbit","fox","panda","sprout"].map((name)=>art(name)).join("")}</div>
      <p class="mini-kicker">第一季 · 五章全部完成</p><h2>森林成长节开始啦！</h2>
      <p>树屋亮着灯，集市飘来香味，火车送来了朋友，山谷的花也开满舞台。因为你的帮助，成长树终于开花了！</p>
      <div class="season-badge">${art("medal")}<b>童趣森林第一季纪念章</b></div>
      <button class="primary-action" data-action="forest" type="button"><span>回到我的森林</span><i>➜</i></button></div>`, "festival-panel");
    forest.speak("森林成长节开始啦！五根树枝都发芽，成长树终于开花了。谢谢你的每一次帮助！");
    $("[data-action=forest]", content).addEventListener("click", closeDialog);
  }

  function closeDialog() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    dialog.close();
    renderHome();
    $("#forestScene").scrollIntoView({ behavior: "smooth", block: "center" });
  }

  const taskRenderers = {
    "2-0": () => {
      const items = [["apple", "fruit", "苹果"], ["carrot", "veg", "胡萝卜"], ["baguette", "bread", "面包"], ["banana", "fruit", "香蕉"], ["broccoli", "veg", "西兰花"], ["croissant", "bread", "牛角包"]];
      let selected = null, placed = 0;
      panel(`${taskHeading("任务一 · 分分类", "把食物送到正确货架", "先点一种食物，再点水果、蔬菜或面包货架。")}
        <div class="option-grid food-items">${items.map(([image, kind, name]) => `<button type="button" data-kind="${kind}" aria-label="${name}">${art(image)}<b>${name}</b></button>`).join("")}</div>
        <div class="category-bins"><button data-bin="fruit">${art("strawberry")}<b>水果货架</b></button><button data-bin="veg">${art("broccoli")}<b>蔬菜货架</b></button><button data-bin="bread">${art("baguette")}<b>面包货架</b></button></div><p class="adventure-feedback">小兔说：“这么多食物，先整理哪一个呢？”</p>`);
      forest.speak("先点一种食物，再点水果、蔬菜或面包货架。");
      $$(".food-items button", content).forEach((button) => button.addEventListener("click", () => { $$(".food-items button", content).forEach((x) => x.classList.remove("selected")); selected = button; button.classList.add("selected"); feedback(`选好了${button.getAttribute("aria-label")}，它应该去哪个货架呢？`); }));
      $$("[data-bin]", content).forEach((bin) => bin.addEventListener("click", () => {
        if (!selected) return feedback("先从上面选择一种食物。", "hint");
        if (selected.dataset.kind !== bin.dataset.bin) { forest.chime(false); return feedback("这个货架不太合适，再看看食物是哪一类。", "hint"); }
        const name = selected.getAttribute("aria-label"); selected.classList.add("done"); selected = null; placed += 1; forest.chime(); feedback(`${name}放对货架啦！`, "good");
        if (placed === items.length) finishTask("所有食物都分类好啦");
      }));
    },
    "2-1": () => {
      const rounds = [["rabbit", "苹果", "apple", 2], ["bear", "胡萝卜", "carrot", 3], ["fox", "面包", "baguette", 1]]; let round = 0;
      panel(`${taskHeading("任务二 · 数一数", "按照购物清单装篮子", "看清楚需要几件，选择数量刚刚好的篮子。")}<div class="round-meter"></div><div class="shopping-card"></div><div class="option-grid basket-choice"></div><p class="adventure-feedback">第一位客人来啦！</p>`);
      const draw = () => { const [animal, name, image, count] = rounds[round]; $(".round-meter", content).textContent = `购物清单 ${round + 1} / ${rounds.length}`; $(".shopping-card", content).innerHTML = `${art(animal)}<b>请给我 ${count} 个${name}</b>`; $(".basket-choice", content).innerHTML = [1,2,3].map((n) => `<button data-count="${n}"><span class="art-count-group">${artGroup(image, n)}</span><b>${n} 个</b></button>`).join(""); forest.speak(`请给我${count}个${name}`); $$("[data-count]", content).forEach((button) => button.addEventListener("click", () => { if (+button.dataset.count !== count) { forest.chime(false); return feedback("数量还不一样，再数一数清单上要几个。", "hint"); } forest.chime(); feedback("数量刚刚好！", "good"); round += 1; if (round === rounds.length) finishTask("三张购物清单都配齐啦"); else window.setTimeout(draw, 450); })); };
      draw();
    },
    "2-2": () => {
      const rounds = [["哪一篮苹果更多？", ["apple",2], ["apple",3], "b"], ["哪一篮胡萝卜更少？", ["carrot",1], ["carrot",3], "a"], ["哪两篮数量一样？", ["strawberry",2], ["strawberry",2], "same"]]; let round = 0;
      panel(`${taskHeading("任务三 · 比一比", "帮客人比较两只篮子", "仔细看数量，找到更多、更少或一样多。")}<div class="round-meter"></div><div class="shopping-card"><b id="comparePrompt"></b></div><div class="option-grid basket-choice"><button data-answer="a"><span id="basketA"></span><b>左边篮子</b></button><button data-answer="same"><span>＝</span><b>一样多</b></button><button data-answer="b"><span id="basketB"></span><b>右边篮子</b></button></div><p class="adventure-feedback">把每一个都数一数，会更容易发现答案。</p>`);
      const draw = () => { const [prompt, a, b, answer] = rounds[round]; $(".round-meter", content).textContent = `比较任务 ${round + 1} / 3`; $("#comparePrompt", content).textContent = prompt; $("#basketA", content).innerHTML = artGroup(a[0], a[1]); $("#basketB", content).innerHTML = artGroup(b[0], b[1]); forest.speak(prompt); $$("[data-answer]", content).forEach((button) => button.onclick = () => { if (button.dataset.answer !== answer) { forest.chime(false); return feedback("再数一数左右两篮的数量。", "hint"); } forest.chime(); feedback("比较对啦！", "good"); round += 1; if (round === rounds.length) finishTask("集市的数量任务完成啦"); else window.setTimeout(draw, 420); }); };
      draw();
    },
    "3-0": () => {
      const rounds = [["rabbit", "小兔", "red", "红色"], ["bear", "小熊", "blue", "蓝色"], ["panda", "熊猫", "yellow", "黄色"]]; let round = 0;
      panel(`${taskHeading("任务一 · 听颜色", "把乘客送进正确车厢", "听清动物和颜色，再选择对应的车厢。")}<div class="round-meter"></div><div class="command-card"></div><div class="train-track-game"><button class="train-car red" data-color="red">${art("red-carriage")}<b>红色车厢</b></button><button class="train-car blue" data-color="blue">${art("teal-carriage")}<b>蓝色车厢</b></button><button class="train-car yellow" data-color="yellow">${art("yellow-carriage")}<b>黄色车厢</b></button></div><p class="adventure-feedback">列车长正在播报第一位乘客。</p>`);
      const draw = () => { const [image, animal, color, colorName] = rounds[round]; $(".round-meter", content).textContent = `乘客 ${round + 1} / 3`; $(".command-card", content).innerHTML = `${art(image)} 请让${animal}坐进<strong>${colorName}车厢</strong>`; forest.speak(`请让${animal}坐进${colorName}车厢`); $$("[data-color]", content).forEach((button) => button.onclick = () => { if (button.dataset.color !== color) { forest.chime(false); return feedback("颜色不一样，再听一遍列车长的话。", "hint"); } forest.chime(); feedback(`${animal}坐对位置啦！`, "good"); round += 1; if (round === rounds.length) finishTask("三位乘客都坐好啦"); else window.setTimeout(draw, 430); }); };
      draw();
    },
    "3-1": () => {
      const expected = ["rabbit", "bear", "fox"]; let placed = [];
      panel(`${taskHeading("任务二 · 排顺序", "按照线索排好上车队伍", "小兔第一，小熊跟在小兔后面，小狐狸最后。")}<div class="line-slots"><i>1</i><i>2</i><i>3</i></div><div class="animal-tray"><button data-animal="fox">${art("fox")}</button><button data-animal="rabbit">${art("rabbit")}</button><button data-animal="bear">${art("bear")}</button></div><p class="adventure-feedback">先找出排在第一位的朋友。</p>`);
      forest.speak("小兔第一，小熊跟在小兔后面，小狐狸最后。");
      $$("[data-animal]", content).forEach((button) => button.addEventListener("click", () => { const animal = button.dataset.animal; if (animal !== expected[placed.length]) { forest.chime(false); return feedback("这个位置和线索不一样，再从第一句想一想。", "hint"); } placed.push(animal); button.classList.add("used"); const slots = $$(".line-slots i", content); slots[placed.length - 1].innerHTML = art(animal); forest.chime(); feedback("位置排对啦！", "good"); if (placed.length === 3) finishTask("上车队伍排整齐啦"); }));
    },
    "3-2": () => {
      const rounds = [["先摇铃，再拿车票", ["bell","ticket"]], ["先拿车票，再举绿旗，最后摇铃", ["ticket","flag","bell"]]], actions = [["bell","bell","摇铃"],["ticket","ticket","拿车票"],["flag","flag","举绿旗"]]; let round = 0, index = 0;
      panel(`${taskHeading("任务三 · 记指令", "按顺序完成列车长任务", "每一步都要按照列车长说的先后顺序。")}<div class="round-meter"></div><div class="command-card"></div><div class="command-actions">${actions.map(([value,image,label]) => `<button data-command="${value}" aria-label="${label}">${art(image)}<b>${label}</b></button>`).join("")}</div><p class="adventure-feedback">准备好后，按顺序点击物品。</p>`);
      const draw = () => { index = 0; $(".round-meter", content).textContent = `连续指令 ${round + 1} / 2`; $(".command-card", content).textContent = rounds[round][0]; forest.speak(rounds[round][0]); };
      $$("[data-command]", content).forEach((button) => button.addEventListener("click", () => { const expected = rounds[round][1]; if (button.dataset.command !== expected[index]) { index = 0; forest.chime(false); return feedback("顺序不一样，从第一步重新来一次。", "hint"); } index += 1; forest.chime(); feedback(`第${index}步完成！`, "good"); if (index === expected.length) { round += 1; if (round === rounds.length) finishTask("连续指令全部完成啦"); else { feedback("记得真清楚，下一条指令来啦！", "good"); window.setTimeout(draw, 500); } } }));
      draw();
    },
    "4-0": () => {
      let found = 0;
      panel(`${taskHeading("任务一 · 仔细找", "找到山谷里的四件宝物", "羽毛、钥匙、蘑菇和花朵都藏在风景里。")}<div class="find-scene"><button aria-label="羽毛">${art("feather")}</button><button aria-label="钥匙">${art("key")}</button><button aria-label="蘑菇">${art("mushroom")}</button><button aria-label="花朵">${art("flower")}</button></div><p class="adventure-feedback">已经找到 0 / 4 件宝物。</p>`);
      forest.speak("请找到山谷里的羽毛、钥匙、蘑菇和花朵。");
      $$(".find-scene button", content).forEach((button) => button.addEventListener("click", () => { if (button.classList.contains("found")) return; button.classList.add("found"); found += 1; forest.chime(); feedback(`找到了${button.getAttribute("aria-label")}！已经找到 ${found} / 4。`, "good"); if (found === 4) finishTask("山谷宝物全部找到啦"); }));
    },
    "4-1": () => {
      let position = [2,0]; const walls = new Set(["1,1","2,1"]), goal = "0,2";
      panel(`${taskHeading("任务二 · 走路线", "带熊猫走到山顶花园", "避开深绿色石墙，用方向按钮一步一步走。")}<div class="maze-mini"></div><div class="arrow-pad"><button data-move="up">↑</button><button data-move="left">←</button><button data-move="down">↓</button><button data-move="right">→</button></div><p class="adventure-feedback">熊猫从左下角出发，花园在右上角。</p>`);
      forest.speak("熊猫从左下角出发，花园在右上角。避开深绿色石墙。");
      const draw = () => { $(".maze-mini", content).innerHTML = Array.from({length:9},(_,i)=>{const r=Math.floor(i/3),c=i%3,key=`${r},${c}`;return `<div class="maze-cell${walls.has(key)?" wall":""}${key===position.join(",")?" player":""}${key===goal?" goal":""}">${key===position.join(",")?art("panda"):key===goal?art("flower"):walls.has(key)?"▲":""}</div>`}).join(""); };
      $$("[data-move]", content).forEach((button) => button.addEventListener("click", () => { const delta={up:[-1,0],down:[1,0],left:[0,-1],right:[0,1]}[button.dataset.move], next=[position[0]+delta[0],position[1]+delta[1]], key=next.join(","); if(next.some((n)=>n<0||n>2)||walls.has(key)){forest.chime(false);return feedback("这边走不通，换一个方向试试。","hint");} position=next;draw();forest.chime();feedback("向前走了一步！","good");if(key===goal)finishTask("熊猫到达山顶花园啦"); }));
      draw();
    },
    "4-2": () => {
      const expected=["seed","seedling","plant","sunflower"];let placed=[];
      panel(`${taskHeading("任务三 · 看变化", "排出向日葵长大的顺序", "想一想：先有种子，然后会发生什么？")}<div class="sequence-strip"><i>1</i><i>2</i><i>3</i><i>4</i></div><div class="sequence-tray"><button data-step="sunflower">${art("sunflower")}</button><button data-step="seed">${art("seed")}</button><button data-step="plant">${art("plant")}</button><button data-step="seedling">${art("seedling")}</button></div><p class="adventure-feedback">先找到故事开始时的小种子。</p>`);
      forest.speak("排出向日葵长大的顺序。先找到故事开始时的小种子。");
      $$("[data-step]", content).forEach((button)=>button.addEventListener("click",()=>{if(button.dataset.step!==expected[placed.length]){forest.chime(false);return feedback("这个变化还没有发生，再想想前一步是什么。","hint");}placed.push(button.dataset.step);button.classList.add("used");$$(".sequence-strip i",content)[placed.length-1].innerHTML=art(button.dataset.step);forest.chime();feedback("顺序放对啦！","good");if(placed.length===4)finishTask("植物成长顺序排好啦");}));
    },
    "5-0": () => {
      const rounds=[{image:"rabbit",text:"小兔想加入大家的节目，可是它有点害羞，不敢开口。",options:[["invite","我们一起表演吧！"],["ignore","你站远一点看吧"],["push","你必须马上上台"]],answer:"invite"},{image:"fox",text:"小狐狸不小心碰掉了舞台花环，它看起来很着急。",options:[["help","没关系，我们一起修好它"],["blame","都是你弄坏的"],["leave","假装没有看见"]],answer:"help"}];let round=0;
      panel(`${taskHeading("任务一 · 懂心情", "给朋友一句温暖的回应", "先看看朋友发生了什么，再选择能理解和帮助它的话。")}<div class="round-meter"></div><div class="social-scene"></div><div class="option-grid social-options"></div><p class="adventure-feedback">朋友需要被听见，也需要一个可以做到的办法。</p>`);
      const draw=()=>{const item=rounds[round];$(".round-meter",content).textContent=`友谊任务 ${round+1} / 2`;$(".social-scene",content).innerHTML=`${art(item.image)}<p>${item.text}</p>`;$(".social-options",content).innerHTML=item.options.map(([value,label])=>`<button data-social="${value}"><b>${label}</b></button>`).join("");forest.speak(item.text);$$('[data-social]',content).forEach((button)=>button.addEventListener('click',()=>{if(button.dataset.social!==item.answer){forest.chime(false);return feedback("这句话可能让朋友更难受。试试先理解，再一起想办法。","hint");}button.classList.add('correct');forest.chime();feedback("这句话让朋友感到被理解啦！","good");round+=1;if(round===rounds.length)finishTask("你帮助两位朋友说出了心情");else window.setTimeout(draw,500);}));};draw();
    },
    "5-1": () => {
      const expected=["invite","decorate","practice","show"],icons={invite:["envelope","邀请"],decorate:["stage","布置"],practice:["drum","排练"],show:["arch","表演"]};let placed=[];
      panel(`${taskHeading("任务二 · 讲故事", "排出成长节准备顺序", "先邀请朋友，再布置舞台，然后排练，最后正式表演。")}<div class="sequence-strip story-strip"><i>1</i><i>2</i><i>3</i><i>4</i></div><div class="sequence-tray story-sequence"><button data-story="show">${art("arch")}<b>正式表演</b></button><button data-story="practice">${art("drum")}<b>排练节目</b></button><button data-story="invite">${art("envelope")}<b>邀请朋友</b></button><button data-story="decorate">${art("stage")}<b>布置舞台</b></button></div><p class="adventure-feedback">故事从送出邀请函开始。</p>`);
      forest.speak("先邀请朋友，再布置舞台，然后排练，最后正式表演。");
      $$('[data-story]',content).forEach((button)=>button.addEventListener('click',()=>{if(button.dataset.story!==expected[placed.length]){forest.chime(false);return feedback("这件事还不能这么早发生，看看前面还要准备什么。","hint");}placed.push(button.dataset.story);button.classList.add('used');const [image,label]=icons[button.dataset.story];$$('.sequence-strip i',content)[placed.length-1].innerHTML=`${art(image)}<small>${label}</small>`;forest.chime();feedback("故事接得很顺！","good");if(placed.length===4)finishTask("成长节故事排完整啦");}));
    },
    "5-2": () => {
      const rounds=[["鼓、铃、鼓",["drum","bell","drum"]],["铃、木鱼、铃",["bell","wood","bell"]],["鼓、鼓、木鱼",["drum","drum","wood"]]],labels={drum:art("drum"),bell:art("bell"),wood:art("woodfish")};let round=0,index=0;
      panel(`${taskHeading("任务三 · 跟节奏", "带领森林乐队一起演奏", "看着节奏卡，按照从左到右的顺序点击乐器。")}<div class="round-meter"></div><div class="rhythm-card"></div><div class="instrument-pad"><button data-note="drum" aria-label="鼓">${art("drum")}<b>鼓</b></button><button data-note="bell" aria-label="铃铛">${art("bell")}<b>铃铛</b></button><button data-note="wood" aria-label="木鱼">${art("woodfish")}<b>木鱼</b></button></div><p class="adventure-feedback">小指挥，准备好就开始吧！</p>`);
      const draw=()=>{index=0;$(".round-meter",content).textContent=`节奏 ${round+1} / 3`;$(".rhythm-card",content).innerHTML=rounds[round][1].map((note)=>labels[note]).join(" ");forest.speak(rounds[round][0]);};
      $$('[data-note]',content).forEach((button)=>button.addEventListener('click',()=>{const expected=rounds[round][1];playRhythmNote(button.dataset.note);if(button.dataset.note!==expected[index]){index=0;return feedback("节奏不一样，从第一个声音重新来。","hint");}index+=1;feedback(`敲对了第 ${index} 拍！`,`good`);if(index===expected.length){round+=1;if(round===rounds.length)finishTask("森林乐队合奏成功啦");else window.setTimeout(draw,500);}}));draw();
    }
  };

  $$(".chapter-card[data-chapter]").filter((card) => Number(card.dataset.chapter) > 1).forEach((card) => card.addEventListener("click", () => showDialog(Number(card.dataset.chapter))));
  $("#closeAdventure").addEventListener("click", closeDialog);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeDialog(); });
  window.addEventListener("playmori-forest-change", renderHome);
  window.addEventListener("playmori-forest-reset", () => { state = loadState(); renderHome(); });
  window.PlaymoriOpenNextChapter = () => {
    if (!oneComplete()) return false;
    const next = nextChapter();
    showDialog(next || 5);
    return true;
  };
  renderHome();
})();
