(() => {
  "use strict";

  const STORAGE_KEY = "playmori-forest-v1";
  const screens = ["questIntro", "tidyTask", "buildTask", "feelingTask", "rewardTask", "completeScreen"];
  const taskScreens = ["tidyTask", "buildTask", "feelingTask", "rewardTask"];
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];

  const defaultState = { introduced: false, taskIndex: 0, chapterComplete: false, sound: true };
  let state = loadState();
  let selectedTidyItem = null;
  let tidyPlaced = new Set();
  let selectedShape = "";
  let shapesPlaced = new Set();
  let toastTimer = 0;

  const dialog = $("#questDialog");
  const storyStart = $("#storyStart");

  function loadState() {
    try {
      return { ...defaultState, ...JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}") };
    } catch (_) {
      return { ...defaultState };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    renderHome();
    window.dispatchEvent(new CustomEvent("playmori-forest-change"));
  }

  function speak(text) {
    if (!state.sound || !("speechSynthesis" in window)) return;
    speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "zh-CN";
    utterance.rate = 0.82;
    utterance.pitch = 1.12;
    speechSynthesis.speak(utterance);
  }

  function chime(success = true) {
    if (!state.sound) return;
    const notes = success ? [523, 659, 784] : [392, 349];
    notes.forEach((frequency, index) => window.setTimeout(() => {
      try {
        const audio = new (window.AudioContext || window.webkitAudioContext)();
        const oscillator = audio.createOscillator();
        const gain = audio.createGain();
        oscillator.frequency.value = frequency;
        oscillator.type = "sine";
        gain.gain.setValueAtTime(0.08, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + 0.22);
        oscillator.connect(gain).connect(audio.destination);
        oscillator.start();
        oscillator.stop(audio.currentTime + 0.23);
      } catch (_) {}
    }, index * 100));
  }

  function toast(message) {
    const el = $("#toast");
    el.textContent = message;
    el.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => el.classList.remove("show"), 2300);
  }

  function renderHome() {
    document.body.classList.toggle("chapter-complete", state.chapterComplete);
    $("#leafCount").textContent = state.chapterComplete ? "1" : "0";

    if (state.chapterComplete) {
      $("#storyButtonEyebrow").textContent = "第一章已经完成";
      $("#storyButtonText").textContent = "看看小熊的新家";
      $("#heroIntro").textContent = "第一位新朋友已经搬进森林。三个新装饰也放进了背包，可以由你亲手布置这片森林。";
      $("#statusText").innerHTML = "<b>小熊悄悄话：</b>“谢谢你陪我准备新家！快打开装饰背包，把森林变成你喜欢的样子吧。”";
      $("#chapterOneStatus").textContent = "已经完成 · 新居民入住";
      $("#sceneChapter").textContent = "第一章完成";
      $("#forestScene").setAttribute("aria-label", "你的童趣森林，成长树长出了第一片叶子，小熊已经住进新树屋");
    } else if (state.introduced || state.taskIndex > 0) {
      const labels = ["整理小熊的物品", "搭好小熊的树屋", "陪小熊说说话", "领取三个新装饰"];
      $("#storyButtonEyebrow").textContent = `第一章 · ${state.taskIndex + 1} / 4`;
      $("#storyButtonText").textContent = "继续帮助小熊";
      $("#heroIntro").textContent = "小熊的新家正在一点点变好。继续完成这件小事，就会有一片新的成长叶。";
      $("#statusText").innerHTML = `<b>小芽提醒：</b>“下一件事是${labels[state.taskIndex] || labels[0]}，小熊还在等我们呢。”`;
      $("#chapterOneStatus").textContent = `进行中 · ${state.taskIndex + 1} / 4`;
      $("#sceneChapter").textContent = "第一章进行中";
    }
  }

  function setScreen(id, shouldSpeak = true) {
    screens.forEach((name) => $("#" + name).classList.toggle("active", name === id));
    const progressIndex = id === "questIntro" ? -1 : taskScreens.indexOf(id);
    $$("#questProgress i").forEach((dot, index) => {
      dot.classList.toggle("done", state.chapterComplete || index < progressIndex);
      dot.classList.toggle("now", !state.chapterComplete && index === progressIndex);
    });
    dialog.querySelector(".quest-shell").scrollTo({ top: 0, behavior: "smooth" });
    if (!shouldSpeak) return;
    const narration = {
      questIntro: "今天森林来了一位新朋友。小熊的家还没有准备好，我们一起去帮忙吧。",
      tidyTask: "先点一个物品，再点它应该去的小窝。",
      buildTask: "点一个积木，再点相同形状的虚线位置。",
      feelingTask: "小熊第一次离开原来的家，有一点想妈妈。哪句话能让它舒服一点？",
      rewardTask: "小熊的新家准备好啦。三个装饰全部送给你，快把它们装进背包吧。",
      completeScreen: "第一根树枝发芽了。森林里有了第一座新家！"
    };
    speak(narration[id]);
  }

  function openQuest() {
    if (!dialog.open) dialog.showModal();
    if (state.chapterComplete) {
      setScreen("completeScreen");
      return;
    }
    if (!state.introduced) {
      setScreen("questIntro");
      return;
    }
    setScreen(taskScreens[Math.min(state.taskIndex, taskScreens.length - 1)]);
  }

  function closeQuest() {
    if ("speechSynthesis" in window) speechSynthesis.cancel();
    dialog.close();
  }

  function completeTask(index, nextScreen, message) {
    if (state.taskIndex <= index) state.taskIndex = index + 1;
    saveState();
    chime();
    toast(message);
    window.setTimeout(() => setScreen(nextScreen), 650);
  }

  storyStart.addEventListener("click", () => {
    if (window.PlaymoriOpenNextChapter?.()) return;
    openQuest();
  });
  $(".chapter-card.current").addEventListener("click", openQuest);
  $("#closeQuest").addEventListener("click", closeQuest);
  dialog.addEventListener("cancel", (event) => { event.preventDefault(); closeQuest(); });
  $("#beginQuest").addEventListener("click", () => {
    state.introduced = true;
    state.taskIndex = 0;
    saveState();
    setScreen("tidyTask");
  });

  $$("#tidyItems button").forEach((button) => button.addEventListener("click", () => {
    if (button.classList.contains("placed")) return;
    $$("#tidyItems button").forEach((item) => item.classList.remove("selected"));
    selectedTidyItem = button;
    button.classList.add("selected");
    $("#tidyFeedback").textContent = `选好了${button.getAttribute("aria-label")}，它应该住在哪里呢？`;
    $("#tidyFeedback").className = "game-feedback";
  }));

  $$(".tidy-bins button").forEach((bin) => bin.addEventListener("click", () => {
    const feedback = $("#tidyFeedback");
    if (!selectedTidyItem) {
      feedback.textContent = "先点上面的一件物品，再来选择它的小窝。";
      feedback.className = "game-feedback hint";
      speak("先点一件物品");
      return;
    }
    if (selectedTidyItem.dataset.kind !== bin.dataset.accept) {
      feedback.textContent = "这个小窝好像不合适，再看看另外两个吧。";
      feedback.className = "game-feedback hint";
      chime(false);
      speak("这个小窝不太合适，再看看吧");
      return;
    }
    const label = selectedTidyItem.getAttribute("aria-label");
    tidyPlaced.add(label);
    selectedTidyItem.classList.remove("selected");
    selectedTidyItem.classList.add("placed");
    selectedTidyItem = null;
    feedback.textContent = `${label}回到自己的小窝啦！`;
    feedback.className = "game-feedback good";
    chime();
    if (tidyPlaced.size === 6) completeTask(0, "buildTask", "房间变整齐啦");
  }));

  $$("#shapeTray button").forEach((button) => button.addEventListener("click", () => {
    if (button.classList.contains("used")) return;
    $$("#shapeTray button").forEach((item) => item.classList.remove("selected"));
    selectedShape = button.dataset.shape;
    button.classList.add("selected");
    const names = { triangle: "三角形", square: "正方形", circle: "圆形" };
    $("#buildFeedback").textContent = `选中了${names[selectedShape]}，在虚线房子里找相同形状。`;
    $("#buildFeedback").className = "game-feedback";
  }));

  $$("#houseSlots button").forEach((slot) => slot.addEventListener("click", () => {
    const feedback = $("#buildFeedback");
    if (slot.classList.contains("filled")) return;
    if (!selectedShape) {
      feedback.textContent = "先从下面选择一块积木。";
      feedback.className = "game-feedback hint";
      speak("先选一块积木");
      return;
    }
    if (selectedShape !== slot.dataset.shape) {
      feedback.textContent = "两个形状不一样，再找找相同的虚线。";
      feedback.className = "game-feedback hint";
      chime(false);
      speak("形状不一样，再找找");
      return;
    }
    const names = { triangle: "三角形屋顶", square: "正方形墙壁", circle: "圆形窗户" };
    shapesPlaced.add(selectedShape);
    slot.classList.add("filled");
    $(`#shapeTray button[data-shape="${selectedShape}"]`).classList.remove("selected");
    $(`#shapeTray button[data-shape="${selectedShape}"]`).classList.add("used");
    feedback.textContent = `${names[selectedShape]}放好啦！`;
    feedback.className = "game-feedback good";
    selectedShape = "";
    chime();
    if (shapesPlaced.size === 3) completeTask(1, "feelingTask", "小树屋搭好啦");
  }));

  $$("#feelingChoices button").forEach((button) => button.addEventListener("click", () => {
    const feedback = $("#feelingFeedback");
    if (button.dataset.kind === "kind") {
      button.classList.add("kind");
      feedback.textContent = "小熊笑了：“谢谢你愿意陪我，心里暖暖的！”";
      feedback.className = "game-feedback good";
      speak("谢谢你愿意陪我，心里暖暖的");
      completeTask(2, "rewardTask", "你听懂了小熊的心情");
      return;
    }
    feedback.textContent = button.dataset.kind === "dismiss"
      ? "小熊的难过是真的。我们可以先听一听，再陪陪它。"
      : "小熊现在需要一个朋友陪在身边，再想想哪句话更温暖。";
    feedback.className = "game-feedback hint";
    chime(false);
    speak(feedback.textContent);
  }));

  $("#collectChapterOneRewards").addEventListener("click", () => {
    state.chapterComplete = true;
    state.taskIndex = 4;
    saveState();
    chime();
    $("#rewardFeedback").textContent = "三个装饰都装进背包啦！";
    window.setTimeout(() => setScreen("completeScreen"), 650);
  });

  $("#returnForest").addEventListener("click", () => {
    closeQuest();
    renderHome();
    window.dispatchEvent(new CustomEvent("playmori-forest-change"));
    $("#forestScene").scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => toast("小熊搬进森林啦，成长树长出了新叶片！"), 450);
  });

  $("#soundToggle").addEventListener("click", () => {
    state.sound = !state.sound;
    $("#soundToggle").classList.toggle("muted", !state.sound);
    $("#soundToggle").setAttribute("aria-label", state.sound ? "关闭声音" : "打开声音");
    if (!state.sound && "speechSynthesis" in window) speechSynthesis.cancel();
    saveState();
  });

  $("#resetProgress").addEventListener("click", () => {
    if (!window.confirm("要把童趣森林恢复到故事开始前吗？五章进度和装饰背包都会被清空。")) return;
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem("playmori-forest-chapters-v1");
    state = { ...defaultState };
    selectedTidyItem = null;
    tidyPlaced = new Set();
    selectedShape = "";
    shapesPlaced = new Set();
    $$("#tidyItems button").forEach((button) => button.className = "");
    $$("#houseSlots button").forEach((button) => button.classList.remove("filled"));
    $$("#shapeTray button").forEach((button) => button.className = "");
    $$("#feelingChoices button").forEach((button) => button.classList.remove("kind"));
    renderHome();
    window.dispatchEvent(new CustomEvent("playmori-forest-reset"));
    toast("森林已经回到故事开始前");
  });

  $("#soundToggle").classList.toggle("muted", !state.sound);
  window.PlaymoriForest = {
    speak,
    chime,
    toast,
    renderHome,
    getState: () => ({ ...state }),
    isChapterOneComplete: () => state.chapterComplete
  };
  renderHome();
})();
