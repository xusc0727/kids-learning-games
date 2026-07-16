import assert from "node:assert/strict";
import test from "node:test";
import { dailyVisitorHash, summarizeUserAgent } from "../server/analytics.mjs";

test("原始IP只生成不可逆的每日访客标识", () => {
  const today = dailyVisitorHash("203.0.113.5", "2026-07-15", "a-long-test-salt");
  const sameDay = dailyVisitorHash("203.0.113.5", "2026-07-15", "a-long-test-salt");
  const nextDay = dailyVisitorHash("203.0.113.5", "2026-07-16", "a-long-test-salt");
  assert.equal(today, sameDay);
  assert.notEqual(today, nextDay);
  assert.equal(today.includes("203.0.113.5"), false);
});

test("只保存粗粒度设备与浏览器类型", () => {
  const iphone = summarizeUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1");
  assert.deepEqual(iphone, { browser: "Safari", os: "iOS", device: "mobile" });
  const desktop = summarizeUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36");
  assert.deepEqual(desktop, { browser: "Chrome", os: "Windows", device: "desktop" });
});
