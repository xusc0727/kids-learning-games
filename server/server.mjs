import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { config, projectRoot } from "./config.mjs";
import { generateStory } from "./deepseek.mjs";
import { recordVisit, requestIp } from "./analytics.mjs";
import { checkDatabase, closeDatabase } from "./database.mjs";

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".ico": "image/x-icon",
};

const requests = new Map();

function json(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    "X-Content-Type-Options": "nosniff",
  });
  res.end(JSON.stringify(data));
}

function checkRateLimit(ip) {
  const now = Date.now();
  const recent = (requests.get(ip) || []).filter((time) => now - time < 10 * 60 * 1000);
  if (recent.length >= 8) return false;
  recent.push(now);
  requests.set(ip, recent);
  return true;
}

async function readJsonBody(req) {
  const chunks = [];
  let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > config.maxRequestBytes) throw Object.assign(new Error("请求内容过长"), { statusCode: 413 });
    chunks.push(chunk);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}");
  } catch {
    throw Object.assign(new Error("请求格式不正确"), { statusCode: 400 });
  }
}

async function serveStatic(urlPath, res) {
  const decoded = decodeURIComponent(urlPath);
  const relativePath = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  let filePath = path.resolve(projectRoot, relativePath);
  if (!filePath.startsWith(`${projectRoot}${path.sep}`) && filePath !== path.join(projectRoot, "index.html")) {
    json(res, 403, { error: "禁止访问" });
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (stat.isDirectory()) filePath = path.join(filePath, "index.html");
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Cache-Control": filePath.endsWith(".html") ? "no-cache" : "public, max-age=3600",
    });
    res.end(data);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "EISDIR") {
      json(res, 404, { error: "页面不存在" });
      return;
    }
    throw error;
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || "localhost"}`);
  try {
    if (req.method === "GET" && url.pathname === "/api/health") {
      const database = await checkDatabase();
      json(res, 200, {
        ok: true,
        deepseekConfigured: Boolean(config.deepseekApiKey),
        analyticsConfigured: config.analyticsConfigured,
        database,
        model: config.deepseekModel,
      });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/analytics/visit") {
      const input = await readJsonBody(req);
      const result = await recordVisit(req, input);
      json(res, 202, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/stories/generate") {
      const ip = requestIp(req);
      if (!checkRateLimit(ip)) {
        json(res, 429, { error: "生成得有点快，请稍后再试" });
        return;
      }
      const input = await readJsonBody(req);
      const story = await generateStory(input);
      json(res, 200, { story });
      return;
    }

    if (req.method !== "GET" && req.method !== "HEAD") {
      json(res, 405, { error: "不支持的请求方式" });
      return;
    }

    await serveStatic(url.pathname, res);
  } catch (error) {
    const statusCode = error.statusCode || 500;
    if (statusCode >= 500) console.error(error);
    json(res, statusCode, { error: error.message || "服务器暂时开小差了" });
  }
});

server.listen(config.port, "0.0.0.0", () => {
  console.log(`童趣成长乐园已启动：http://localhost:${config.port}`);
  console.log(`DeepSeek：${config.deepseekApiKey ? `${config.deepseekModel} 已配置` : "尚未配置 API Key"}`);
  console.log(`访客统计：${config.analyticsConfigured ? `已启用，保留 ${config.analyticsRetentionDays} 天` : "尚未配置 ANALYTICS_SALT"}`);
  console.log(`MySQL：${config.databaseConfigured ? `${config.databaseHost}:${config.databasePort}/${config.databaseName}` : "尚未启用"}`);
});

async function shutdown() {
  await closeDatabase().catch(() => {});
  server.close(() => process.exit(0));
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
