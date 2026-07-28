import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(projectRoot, "products/games/index.html"), "utf8");
const worldScript = fs.readFileSync(path.join(projectRoot, "products/games/world.js"), "utf8");
const chapterScript = fs.readFileSync(path.join(projectRoot, "products/games/chapters.js"), "utf8");
const decorationScript = fs.readFileSync(path.join(projectRoot, "products/games/decorations.js"), "utf8");

test("童趣森林提供五个可解锁故事章节", () => {
  for (const chapter of [1, 2, 3, 4, 5]) {
    assert.match(html, new RegExp(`data-chapter="${chapter}"`));
  }
  assert.doesNotMatch(html, /故事即将继续/);
});

test("地图不重复叠加背景中已有的地点卡片", () => {
  for (const place of ["market", "train", "valley", "stage"]) {
    assert.doesNotMatch(html, new RegExp(`world-place ${place}-place`));
  }
});

test("第二至第五章各包含三项任务和奖励阶段", () => {
  for (const chapter of [2, 3, 4, 5]) {
    for (const task of [0, 1, 2]) {
      assert.match(chapterScript, new RegExp(`"${chapter}-${task}"\\s*:`));
    }
  }
  assert.match(chapterScript, /function renderReward\(chapter\)/);
  assert.match(chapterScript, /function renderFinale\(\)/);
});

test("五章存档与脚本加载顺序保持兼容", () => {
  assert.match(worldScript, /playmori-forest-v1/);
  assert.match(chapterScript, /playmori-forest-chapters-v1/);
  assert.ok(html.indexOf('src="world.js') < html.indexOf('src="chapters.js'));
  assert.match(worldScript, /playmori-forest-reset/);
});

test("指令、故事和节奏图形与文字含义一致", () => {
  assert.doesNotMatch(chapterScript, /🏳️|🪵/);
  assert.match(chapterScript, /\["flag","flag","举绿旗"\]/);
  assert.match(chapterScript, /art\("woodfish"\)/);
  for (const label of ["邀请朋友", "布置舞台", "排练节目", "正式表演"]) {
    assert.match(chapterScript, new RegExp(label));
  }
});

test("森林主线使用项目内的原创图集素材", () => {
  const assetRoot = path.join(projectRoot, "products/games/assets/forest");
  for (const filename of ["characters.webp", "daily-items.webp", "market-rail.webp", "explore-music.webp", "places-rewards.webp", "world-background.webp", "cottage-decorations-v2.webp"]) {
    assert.ok(fs.existsSync(path.join(assetRoot, filename)), `${filename} should exist`);
  }
  assert.match(html, /forest-art art-sprout/);
  assert.doesNotMatch(html, /🐻|🐰|🦊|🐼|🚂|🧺|🧭|🎪/);
});

test("会动的小芽可以继续当前故事，同时不干扰装饰摆放", () => {
  assert.match(html, /<button id="sproutGuide"[^>]*aria-label="听听小芽的提醒，继续当前故事"/);
  assert.match(worldScript, /sproutGuide\.addEventListener\("click"/);
  assert.match(worldScript, /classList\.contains\("placing-decoration"\)/);
  assert.match(worldScript, /openCurrentStory\(\)/);
});

test("每章通关后一次获得该章全部装饰", () => {
  assert.match(html, /id="collectChapterOneRewards"/);
  assert.match(worldScript, /三个装饰都装进背包啦/);
  assert.match(chapterScript, /state\.rewards\[chapter\]\s*=\s*data\.rewards\.map/);
  assert.match(chapterScript, /data-action="collect-all"/);
  assert.doesNotMatch(html, /id="chapter(?:One|2|3|4|5)Gift"/);
});

test("装饰背包支持自由摆放、拖动、收回和本地存档", () => {
  for (const id of ["decorationBagButton", "decorationBagDialog", "decorationInventory", "decorationLayer", "placementHint"]) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /src="decorations\.js/);
  assert.match(decorationScript, /playmori-forest-decorations-v1/);
  assert.equal((decorationScript.match(/\{ id: "/g) || []).length, 15);
  assert.match(decorationScript, /scene\.addEventListener\("click"/);
  assert.match(decorationScript, /button\.addEventListener\("pointermove"/);
  assert.match(decorationScript, /removePlacement/);
});
