(() => {
  "use strict";

  const STORAGE_KEY = "playmori-forest-decorations-v1";
  const CHAPTER_STORAGE_KEY = "playmori-forest-chapters-v1";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const forest = window.PlaymoriForest;
  const scene = $("#forestScene");
  const layer = $("#decorationLayer");
  const bagButton = $("#decorationBagButton");
  const bagDialog = $("#decorationBagDialog");
  const inventory = $("#decorationInventory");
  const emptyMessage = $("#decorationEmpty");
  const placementHint = $("#placementHint");

  const chapterNames = {
    1: "森林新家",
    2: "彩虹集市",
    3: "叮当车站",
    4: "探索山谷",
    5: "友谊舞台"
  };

  const catalog = [
    { id: "home-planter", chapter: 1, art: "cottage-planter", name: "花朵窗台盒", size: "large" },
    { id: "home-lantern", chapter: 1, art: "cottage-lantern", name: "屋檐暖灯", size: "medium" },
    { id: "home-wreath", chapter: 1, art: "door-wreath", name: "森林门环", size: "small" },
    { id: "market-flags", chapter: 2, art: "bunting", name: "彩虹小旗", size: "large" },
    { id: "market-hamper", chapter: 2, art: "hamper", name: "丰收果篮", size: "medium" },
    { id: "market-bell", chapter: 2, art: "bell", name: "清风铃铛", size: "small" },
    { id: "train-locomotive", chapter: 3, art: "locomotive", name: "莓果红车头", size: "large" },
    { id: "train-teal", chapter: 3, art: "teal-carriage", name: "湖水蓝车厢", size: "large" },
    { id: "train-yellow", chapter: 3, art: "yellow-carriage", name: "麦穗金车厢", size: "large" },
    { id: "valley-sunflower", chapter: 4, art: "sunflower", name: "太阳花", size: "medium" },
    { id: "valley-tulip", chapter: 4, art: "flower", name: "郁金香", size: "medium" },
    { id: "valley-daisy", chapter: 4, art: "wreath", name: "小雏菊花环", size: "medium" },
    { id: "stage-star", chapter: 5, art: "medal", name: "星星挂饰", size: "medium" },
    { id: "stage-flower", chapter: 5, art: "stage", name: "花朵小舞台", size: "large" },
    { id: "stage-rainbow", chapter: 5, art: "arch", name: "彩虹拱门", size: "large" }
  ];
  const catalogById = new Map(catalog.map((item) => [item.id, item]));

  let state = loadState();
  let selectedId = "";
  let dragState = null;

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
      const placements = Array.isArray(saved.placements) ? saved.placements : [];
      return {
        placements: placements
          .filter((item) => catalogById.has(item.id) && Number.isFinite(item.x) && Number.isFinite(item.y))
          .map((item) => ({ id: item.id, x: clamp(item.x, 4, 96), y: clamp(item.y, 8, 92) }))
      };
    } catch (_) {
      return { placements: [] };
    }
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function completedChapters() {
    const completed = new Set();
    if (forest?.isChapterOneComplete()) completed.add(1);
    try {
      const chapterState = JSON.parse(localStorage.getItem(CHAPTER_STORAGE_KEY) || "{}");
      (Array.isArray(chapterState.completed) ? chapterState.completed : []).forEach((chapter) => completed.add(Number(chapter)));
    } catch (_) {}
    return completed;
  }

  function unlockedItems() {
    const completed = completedChapters();
    return catalog.filter((item) => completed.has(item.chapter));
  }

  function placementFor(id) {
    return state.placements.find((item) => item.id === id);
  }

  function setPlacement(id, x, y) {
    const placement = placementFor(id);
    if (placement) {
      placement.x = x;
      placement.y = y;
    } else {
      state.placements.push({ id, x, y });
    }
    saveState();
  }

  function removePlacement(id) {
    state.placements = state.placements.filter((item) => item.id !== id);
    saveState();
    renderScene();
    renderInventory();
    forest?.toast(`${catalogById.get(id)?.name || "装饰"}已经收回背包`);
  }

  function pointInScene(clientX, clientY) {
    const rect = scene.getBoundingClientRect();
    return {
      x: clamp(((clientX - rect.left) / rect.width) * 100, 4, 96),
      y: clamp(((clientY - rect.top) / rect.height) * 100, 8, 92)
    };
  }

  function makePlacedDecoration(item, placement) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `placed-decoration decoration-${item.size}`;
    button.dataset.decorationId = item.id;
    button.style.left = `${placement.x}%`;
    button.style.top = `${placement.y}%`;
    button.setAttribute("aria-label", `${item.name}，按住可以移动`);
    button.innerHTML = `<span class="forest-art art-${item.art}" aria-hidden="true"></span>`;

    button.addEventListener("click", (event) => {
      event.stopPropagation();
    });
    button.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
      button.setPointerCapture(event.pointerId);
      dragState = { id: item.id, pointerId: event.pointerId, startX: event.clientX, startY: event.clientY, moved: false };
      button.classList.add("dragging");
    });
    button.addEventListener("pointermove", (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId || dragState.id !== item.id) return;
      if (Math.hypot(event.clientX - dragState.startX, event.clientY - dragState.startY) > 4) dragState.moved = true;
      if (!dragState.moved) return;
      const point = pointInScene(event.clientX, event.clientY);
      button.style.left = `${point.x}%`;
      button.style.top = `${point.y}%`;
    });
    const finishDrag = (event) => {
      if (!dragState || dragState.pointerId !== event.pointerId || dragState.id !== item.id) return;
      button.classList.remove("dragging");
      if (dragState.moved) {
        const point = pointInScene(event.clientX, event.clientY);
        setPlacement(item.id, point.x, point.y);
        forest?.chime();
        forest?.toast(`${item.name}搬到新位置啦`);
      } else {
        forest?.toast(`按住${item.name}，就可以拖到新位置`);
      }
      dragState = null;
    };
    button.addEventListener("pointerup", finishDrag);
    button.addEventListener("pointercancel", finishDrag);
    return button;
  }

  function renderScene() {
    const unlockedIds = new Set(unlockedItems().map((item) => item.id));
    layer.replaceChildren();
    state.placements
      .filter((placement) => unlockedIds.has(placement.id))
      .forEach((placement) => {
        const item = catalogById.get(placement.id);
        layer.appendChild(makePlacedDecoration(item, placement));
      });
    const unlocked = unlockedItems();
    $("#decorationBagCount").textContent = String(unlocked.length);
    bagButton.classList.toggle("has-decorations", unlocked.length > 0);
    bagButton.setAttribute("aria-label", `打开装饰背包，已有${unlocked.length}件装饰`);
  }

  function inventoryCard(item) {
    const placed = Boolean(placementFor(item.id));
    return `<article class="decoration-card${placed ? " is-placed" : ""}">
      <button type="button" data-pick-decoration="${item.id}">
        <span class="forest-art art-${item.art}" aria-hidden="true"></span>
        <b>${item.name}</b>
        <small>${placed ? "换个位置" : "放进森林"}</small>
      </button>
      ${placed ? `<button class="return-decoration" type="button" data-return-decoration="${item.id}">收回</button>` : ""}
    </article>`;
  }

  function renderInventory() {
    const items = unlockedItems();
    inventory.replaceChildren();
    emptyMessage.hidden = items.length > 0;
    [1, 2, 3, 4, 5].forEach((chapter) => {
      const chapterItems = items.filter((item) => item.chapter === chapter);
      if (!chapterItems.length) return;
      const section = document.createElement("section");
      section.className = "decoration-chapter";
      section.innerHTML = `<h3><span>第${chapter}章</span>${chapterNames[chapter]}</h3><div class="decoration-card-grid">${chapterItems.map(inventoryCard).join("")}</div>`;
      inventory.appendChild(section);
    });
    $$("[data-pick-decoration]", inventory).forEach((button) => button.addEventListener("click", () => {
      beginPlacement(button.dataset.pickDecoration);
    }));
    $$("[data-return-decoration]", inventory).forEach((button) => button.addEventListener("click", () => {
      removePlacement(button.dataset.returnDecoration);
    }));
  }

  function openBag() {
    cancelPlacement(false);
    renderInventory();
    if (!bagDialog.open) bagDialog.showModal();
  }

  function closeBag() {
    bagDialog.close();
  }

  function beginPlacement(id) {
    const item = catalogById.get(id);
    if (!item || !unlockedItems().some((unlocked) => unlocked.id === id)) return;
    selectedId = id;
    closeBag();
    scene.classList.add("placing-decoration");
    placementHint.hidden = false;
    placementHint.querySelector("span").textContent = placementFor(id)
      ? `点一下森林，给${item.name}换个位置`
      : `点一下森林，放下${item.name}`;
    forest?.speak(`请在森林里点一下，把${item.name}放在那里。`);
    forest?.toast(`现在去森林里点一个位置`);
  }

  function cancelPlacement(announce = true) {
    selectedId = "";
    scene.classList.remove("placing-decoration");
    placementHint.hidden = true;
    if (announce) forest?.toast("已经取消摆放");
  }

  scene.addEventListener("click", (event) => {
    if (!selectedId) return;
    if (event.target.closest(".placed-decoration, .decoration-bag-button, .placement-hint")) return;
    const item = catalogById.get(selectedId);
    const point = pointInScene(event.clientX, event.clientY);
    setPlacement(selectedId, point.x, point.y);
    forest?.chime();
    forest?.toast(`${item.name}摆好啦！`);
    cancelPlacement(false);
    renderScene();
  });

  bagButton.addEventListener("click", (event) => {
    event.stopPropagation();
    openBag();
  });
  $("#closeDecorationBag").addEventListener("click", closeBag);
  $("#cancelPlacement").addEventListener("click", (event) => {
    event.stopPropagation();
    cancelPlacement();
  });
  bagDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeBag();
  });
  bagDialog.addEventListener("click", (event) => {
    if (event.target === bagDialog) closeBag();
  });

  window.addEventListener("playmori-forest-change", renderScene);
  window.addEventListener("playmori-forest-rewards-change", renderScene);
  window.addEventListener("playmori-forest-reset", () => {
    localStorage.removeItem(STORAGE_KEY);
    state = { placements: [] };
    cancelPlacement(false);
    renderScene();
    renderInventory();
  });

  window.PlaymoriDecorations = {
    refresh: () => {
      state = loadState();
      renderScene();
      renderInventory();
    },
    getState: () => structuredClone(state)
  };

  renderScene();
})();
