import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.mjs";
import { closeDatabase, readVisitEvents } from "./database.mjs";

const daysArgument = process.argv.find((arg) => arg.startsWith("--days="));
const days = Math.min(365, Math.max(1, Number.parseInt(daysArgument?.split("=")[1] || "7", 10) || 7));
const cutoff = Date.now() - (days - 1) * 86_400_000;

function increment(map, key) { map.set(key || "unknown", (map.get(key || "unknown") || 0) + 1); }
function table(map, limit = 10) { return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, limit).map(([name, count]) => ({ 名称: name, 次数: count })); }

const events = [];
if (config.databaseConfigured) {
  try {
    events.push(...await readVisitEvents(days));
  } catch (error) {
    console.warn(`MySQL 统计读取失败，仅展示降级日志：${error.code || error.message}`);
  } finally {
    await closeDatabase();
  }
}

const files = await fs.readdir(config.analyticsDir).catch(() => []);
const selected = files.filter((name) => {
  const match = name.match(/^visits-(\d{4}-\d{2}-\d{2})\.jsonl$/);
  return match && new Date(`${match[1]}T23:59:59Z`).getTime() >= cutoff;
});
for (const file of selected) {
  const content = await fs.readFile(path.join(config.analyticsDir, file), "utf8").catch(() => "");
  for (const line of content.split("\n")) {
    if (!line) continue;
    try { events.push(JSON.parse(line)); } catch { /* skip damaged line */ }
  }
}

const visitors = new Set(), sessions = new Set(), paths = new Map(), devices = new Map(), browsers = new Map(), systems = new Map(), referrers = new Map(), dates = new Map();
for (const event of events) {
  visitors.add(`${event.time?.slice(0, 10)}:${event.visitor}`); sessions.add(event.session); increment(paths, event.path); increment(devices, event.device); increment(browsers, event.browser); increment(systems, event.os); increment(referrers, event.referrer); increment(dates, event.time?.slice(0, 10));
}

console.log(`\n童趣成长乐园 · 最近 ${days} 天访客统计`);
console.table([{ 页面浏览量: events.length, 当日访客合计: visitors.size, 会话数: sessions.size }]);
console.log("每日访问"); console.table(table(dates, days));
console.log("热门页面"); console.table(table(paths));
console.log("设备"); console.table(table(devices));
console.log("浏览器"); console.table(table(browsers));
console.log("操作系统"); console.table(table(systems));
console.log("来源域名"); console.table(table(referrers));
