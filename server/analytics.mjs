import crypto from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";
import { config } from "./config.mjs";
import { deleteExpiredVisits, insertVisitEvent } from "./database.mjs";

const analyticsRequests = new Map();
let initialized = false;

export function summarizeUserAgent(userAgent = "") {
  const ua = String(userAgent);
  const browser = /Edg\//.test(ua) ? "Edge" : /Firefox\//.test(ua) ? "Firefox" : /CriOS\//.test(ua) ? "Chrome" : /Chrome\//.test(ua) ? "Chrome" : /Safari\//.test(ua) ? "Safari" : "Other";
  const os = /Android/.test(ua) ? "Android" : /iPhone|iPad|iPod/.test(ua) ? "iOS" : /Windows/.test(ua) ? "Windows" : /Mac OS X|Macintosh/.test(ua) ? "macOS" : /Linux/.test(ua) ? "Linux" : "Other";
  const device = /iPad|Tablet/.test(ua) ? "tablet" : /Mobi|Android|iPhone|iPod/.test(ua) ? "mobile" : "desktop";
  return { browser, os, device };
}

export function dailyVisitorHash(ip, day, salt) {
  return crypto.createHmac("sha256", salt).update(`${day}|${ip}`).digest("hex").slice(0, 20);
}

function safeText(value, maxLength) {
  return String(value || "").replace(/[\r\n<>]/g, "").trim().slice(0, maxLength);
}

function safePath(value) {
  const clean = safeText(value, 240);
  return clean.startsWith("/") ? clean.split("?", 1)[0] : "/";
}

function referrerHost(value) {
  try { return new URL(String(value)).hostname.slice(0, 120); } catch { return "direct"; }
}

export function requestIp(req) {
  const remote = req.socket.remoteAddress || "unknown";
  const isLocalProxy = remote === "127.0.0.1" || remote === "::1" || remote === "::ffff:127.0.0.1";
  if (!isLocalProxy) return remote;
  const forwarded = safeText(req.headers["x-real-ip"] || String(req.headers["x-forwarded-for"] || "").split(",")[0], 64);
  return forwarded || remote;
}

function sameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return true;
  try { return new URL(origin).host === req.headers.host; } catch { return false; }
}

function withinRateLimit(ip) {
  const now = Date.now();
  const recent = (analyticsRequests.get(ip) || []).filter((time) => now - time < 60_000);
  if (recent.length >= 30) return false;
  recent.push(now); analyticsRequests.set(ip, recent); return true;
}

async function initialize() {
  if (initialized || !config.analyticsConfigured) return;
  initialized = true;
  await fs.mkdir(config.analyticsDir, { recursive: true });
  const cutoff = Date.now() - config.analyticsRetentionDays * 86_400_000;
  const files = await fs.readdir(config.analyticsDir).catch(() => []);
  await Promise.all(files.filter((name) => /^visits-\d{4}-\d{2}-\d{2}\.jsonl$/.test(name)).map(async (name) => {
    const match = name.match(/(\d{4}-\d{2}-\d{2})/);
    if (match && new Date(`${match[1]}T00:00:00Z`).getTime() < cutoff) await fs.unlink(path.join(config.analyticsDir, name)).catch(() => {});
  }));
  if (config.databaseConfigured) {
    deleteExpiredVisits(config.analyticsRetentionDays).catch((error) => console.warn(`MySQL 过期访客数据清理失败，将在下次启动重试：${error.code || error.message}`));
  }
}

export async function recordVisit(req, body) {
  if (!config.analyticsConfigured) return { recorded: false, reason: "not-configured" };
  if (!sameOrigin(req)) throw Object.assign(new Error("来源不被允许"), { statusCode: 403 });
  const ip = requestIp(req);
  if (!withinRateLimit(ip)) throw Object.assign(new Error("统计请求过于频繁"), { statusCode: 429 });
  await initialize();

  const now = new Date();
  const day = now.toISOString().slice(0, 10);
  const agent = summarizeUserAgent(req.headers["user-agent"] || "");
  const event = {
    time: now.toISOString(),
    day,
    visitor: dailyVisitorHash(ip, day, config.analyticsSalt),
    session: safeText(body?.sessionId, 64),
    path: safePath(body?.path),
    referrer: referrerHost(body?.referrer),
    device: agent.device,
    browser: agent.browser,
    os: agent.os,
    language: safeText(body?.language, 20),
    screen: ["small", "medium", "large"].includes(body?.screen) ? body.screen : "unknown",
  };

  if (config.databaseConfigured) {
    try {
      await insertVisitEvent(event);
      return { recorded: true, storage: "mysql" };
    } catch (error) {
      console.warn(`MySQL 访客写入失败，已降级到本地日志：${error.code || error.message}`);
    }
  }
  await fs.appendFile(path.join(config.analyticsDir, `visits-${day}.jsonl`), `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o600 });
  return { recorded: true, storage: "file" };
}
