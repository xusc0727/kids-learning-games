import http from "node:http";
import fs from "node:fs/promises";
import path from "node:path";
import { config, projectRoot } from "./config.mjs";
import { generateStory } from "./deepseek.mjs";
import { recordVisit, requestIp } from "./analytics.mjs";
import { checkDatabase, closeDatabase } from "./database.mjs";
import { deleteGeneratedStories, insertGeneratedStory, listFixedStories, listGeneratedStories, validateDeviceId } from "./story-store.mjs";
import { listLiteracyCharacters } from "./literacy-store.mjs";
import {
  claimDeviceData,
  clearFamilyChildData,
  deleteAccountStories,
  getAccountOverview,
  getPrimaryAccountContext,
  listAccountFavoriteKeys,
  listAccountLearnedKeys,
  listAccountStories,
  setAccountFavorite,
  setAccountLiteracyProgress,
} from "./account-sync-store.mjs";
import {
  expiredSessionCookie,
  requireRecentAuthentication,
  requireAuthenticatedRequest,
  authenticateRequest,
  sessionCookieFor,
  sessionTokenFromRequest,
} from "./account-auth.mjs";
import { deleteAccount, revokeAllSessions, revokeSession } from "./account-store.mjs";
import { requestPhoneLoginCode, verifyPhoneLoginCode } from "./phone-auth.mjs";
import { smsReadiness } from "./sms.mjs";
import { publicErrorMessage, resolvePublicFile, securityHeaders } from "./http-security.mjs";
import { productionReadiness } from "./production-readiness.mjs";
import { publicLegalInfo } from "./legal.mjs";

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

function json(res, statusCode, data, extraHeaders = {}) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...securityHeaders(),
    ...extraHeaders,
  });
  res.end(JSON.stringify(data));
}

function requireSameOrigin(req) {
  const origin = req.headers.origin;
  if (!origin) return;
  try {
    if (new URL(origin).host !== req.headers.host) throw new Error();
  } catch {
    throw Object.assign(new Error("请求来源不被允许"), { statusCode: 403 });
  }
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
  const filePath = resolvePublicFile(projectRoot, urlPath);
  if (!filePath) {
    json(res, 404, { error: "页面不存在" });
    return;
  }

  try {
    const stat = await fs.stat(filePath);
    if (!stat.isFile()) {
      json(res, 404, { error: "页面不存在" });
      return;
    }
    const data = await fs.readFile(filePath);
    res.writeHead(200, {
      "Content-Type": MIME_TYPES[path.extname(filePath).toLowerCase()] || "application/octet-stream",
      ...securityHeaders(),
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
        accountIdentityConfigured: config.accountIdentityConfigured,
        phoneLoginConfigured: config.phoneLoginConfigured,
        sms: smsReadiness(),
        database,
        model: config.deepseekModel,
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/legal") {
      json(res, 200, publicLegalInfo());
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/phone/request-code") {
      requireSameOrigin(req);
      const result = await requestPhoneLoginCode(await readJsonBody(req), requestIp(req));
      json(res, 200, result);
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/phone/verify-code") {
      requireSameOrigin(req);
      const result = await verifyPhoneLoginCode(await readJsonBody(req));
      const { session, ...body } = result;
      json(res, 200, body, { "Set-Cookie": sessionCookieFor(session.token) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/me") {
      const session = await authenticateRequest(req);
      if (!session) {
        json(res, 200, { authenticated: false });
        return;
      }
      json(res, 200, { authenticated: true, ...(await getAccountOverview(session.userId)) });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/logout") {
      requireSameOrigin(req);
      const token = sessionTokenFromRequest(req);
      if (token) {
        try {
          await revokeSession(token);
        } catch (error) {
          // 无效或过期 Cookie 也应被清除；其他数据库异常仍按服务错误处理。
          if (error?.statusCode !== 401) throw error;
        }
      }
      json(res, 200, { loggedOut: true }, { "Set-Cookie": expiredSessionCookie() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/auth/logout-all") {
      requireSameOrigin(req);
      const session = await requireAuthenticatedRequest(req);
      await revokeAllSessions(session.userId);
      json(res, 200, { loggedOut: true }, { "Set-Cookie": expiredSessionCookie() });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/family/claim-device") {
      requireSameOrigin(req);
      const session = await requireAuthenticatedRequest(req);
      json(res, 200, await claimDeviceData(session.userId, await readJsonBody(req)));
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/api/family/child-data") {
      requireSameOrigin(req);
      const session = await requireAuthenticatedRequest(req);
      json(res, 200, await clearFamilyChildData(session.userId, await readJsonBody(req)));
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/api/account") {
      requireSameOrigin(req);
      const session = requireRecentAuthentication(await requireAuthenticatedRequest(req));
      const result = await deleteAccount(session.userId, await readJsonBody(req));
      json(res, 200, result, { "Set-Cookie": expiredSessionCookie() });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/me/stories") {
      const session = await requireAuthenticatedRequest(req);
      json(res, 200, { stories: await listAccountStories(session.userId) });
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/api/me/stories") {
      requireSameOrigin(req);
      const session = await requireAuthenticatedRequest(req);
      json(res, 200, { deleted: await deleteAccountStories(session.userId) });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/me/favorites") {
      const session = await requireAuthenticatedRequest(req);
      json(res, 200, { storyKeys: await listAccountFavoriteKeys(session.userId) });
      return;
    }

    const favoriteMatch = url.pathname.match(/^\/api\/me\/favorites\/([A-Za-z0-9-]{1,64})$/);
    if (favoriteMatch && (req.method === "PUT" || req.method === "DELETE")) {
      requireSameOrigin(req);
      const session = await requireAuthenticatedRequest(req);
      json(res, 200, await setAccountFavorite(session.userId, favoriteMatch[1], req.method === "PUT"));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/me/literacy-progress") {
      const session = await requireAuthenticatedRequest(req);
      json(res, 200, { characterKeys: await listAccountLearnedKeys(session.userId) });
      return;
    }

    const literacyMatch = url.pathname.match(/^\/api\/me\/literacy-progress\/([A-Za-z0-9-]{1,64})$/);
    if (literacyMatch && (req.method === "PUT" || req.method === "DELETE")) {
      requireSameOrigin(req);
      const session = await requireAuthenticatedRequest(req);
      json(res, 200, await setAccountLiteracyProgress(session.userId, literacyMatch[1], req.method === "PUT"));
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
      input.deviceId = validateDeviceId(input.deviceId);
      const story = await generateStory(input);
      const session = await authenticateRequest(req);
      const ownership = session ? await getPrimaryAccountContext(session.userId) : null;
      await insertGeneratedStory(story, input.deviceId, config.deepseekModel, ownership ? {
        userId: ownership.user.id,
        familyId: ownership.family.id,
        childProfileId: ownership.defaultChild.id,
      } : {});
      json(res, 200, { story, storage: "mysql" });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/stories/fixed") {
      const stories = await listFixedStories();
      json(res, 200, { stories });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/stories/history") {
      const stories = await listGeneratedStories(req.headers["x-device-id"]);
      json(res, 200, { stories });
      return;
    }

    if (req.method === "DELETE" && url.pathname === "/api/stories/history") {
      const deleted = await deleteGeneratedStories(req.headers["x-device-id"]);
      json(res, 200, { deleted });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/literacy/characters") {
      const characters = await listLiteracyCharacters();
      json(res, 200, { characters });
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
    json(res, statusCode, { error: publicErrorMessage(error, statusCode) });
  }
});

const readiness = productionReadiness(config);
if (config.nodeEnv === "production" && !readiness.ready) {
  console.error(`生产配置校验失败：\n- ${readiness.issues.join("\n- ")}`);
  process.exitCode = 1;
} else server.listen(config.port, config.host, () => {
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
