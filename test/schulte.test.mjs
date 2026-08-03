import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import {
  GRID_SIZE,
  MAX_HISTORY,
  addHistoryRecord,
  historySummary,
  improvementLabel,
  normalizeHistory,
  secondsLabel,
  shuffleNumbers,
} from "../products/games/schulte/logic.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const gameCenterHtml = fs.readFileSync(path.join(projectRoot, "products/games/index.html"), "utf8");
const gameHtml = fs.readFileSync(path.join(projectRoot, "products/games/schulte/index.html"), "utf8");
const gameScript = fs.readFileSync(path.join(projectRoot, "products/games/schulte/game.js"), "utf8");

test("游戏中心包含舒尔特方格入口", () => {
  assert.match(gameCenterHtml, /href="schulte\/"/);
  assert.match(gameCenterHtml, /展开 11 个游戏/);
  assert.match(gameCenterHtml, /舒尔特方格/);
});

test("舒尔特方格始终生成不重复的 1 至 36", () => {
  const numbers = shuffleNumbers(() => 0.37);
  assert.equal(numbers.length, GRID_SIZE);
  assert.deepEqual([...numbers].sort((a, b) => a - b), Array.from({ length: 36 }, (_, index) => index + 1));
});

test("页面提供 6 乘 6 棋盘、计时和历史趋势", () => {
  assert.match(gameHtml, /六乘六舒尔特数字方格/);
  assert.match(gameHtml, /id="timerText"/);
  assert.match(gameHtml, /id="historyList"/);
  assert.match(gameHtml, /id="trendChart"/);
  assert.match(gameScript, /playmori-schulte-history-v1/);
  assert.match(gameScript, /visibilitychange/);
});

test("历史记录只保留最近 100 次并忽略损坏数据", () => {
  let history = normalizeHistory([{ completedAt: "bad", durationMs: -1 }, null]);
  assert.deepEqual(history, []);
  for (let index = 0; index < MAX_HISTORY + 5; index += 1) {
    history = addHistoryRecord(history, { completedAt: new Date(index).toISOString(), durationMs: 1000 + index });
  }
  assert.equal(history.length, MAX_HISTORY);
  assert.equal(history[0].durationMs, 1005);
  assert.equal(history.at(-1).durationMs, 1104);
});

test("历史汇总和进步文案按实际用时计算", () => {
  const history = [
    { completedAt: "2026-08-01T10:00:00.000Z", durationMs: 68500 },
    { completedAt: "2026-08-02T10:00:00.000Z", durationMs: 61200 },
    { completedAt: "2026-08-03T10:00:00.000Z", durationMs: 54300 },
  ];
  assert.deepEqual(historySummary(history), { firstMs: 68500, latestMs: 54300, bestMs: 54300, count: 3 });
  assert.equal(secondsLabel(54300), "54.3 秒");
  assert.equal(improvementLabel(54300, 61200), "快了 6.9 秒");
  assert.equal(improvementLabel(54300), "第一次完成");
});
