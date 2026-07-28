import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { publicErrorMessage, resolvePublicFile, securityHeaders } from "../server/http-security.mjs";
import { productionReadiness } from "../server/production-readiness.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("静态服务只允许显式公开的页面和产品资源", () => {
  assert.equal(resolvePublicFile(projectRoot, "/"), path.join(projectRoot, "index.html"));
  assert.equal(resolvePublicFile(projectRoot, "/products/ai-story/"), path.join(projectRoot, "products/ai-story/index.html"));
  assert.equal(resolvePublicFile(projectRoot, "/assets/logo.png"), path.join(projectRoot, "assets/logo.png"));
  for (const target of ["/.env", "/.git/config", "/server/config.mjs", "/database/migrations/001.sql", "/README.md", "/products/README.md", "/../.env"]) {
    assert.equal(resolvePublicFile(projectRoot, target), null, target);
  }
});

test("服务端错误不会返回内部异常信息并带有安全响应头", () => {
  assert.equal(publicErrorMessage(new Error("DB_PASSWORD=secret"), 500).includes("secret"), false);
  assert.equal(publicErrorMessage(new Error("手机号格式不正确"), 400), "手机号格式不正确");
  const headers = securityHeaders();
  assert.match(headers["Content-Security-Policy"], /frame-ancestors 'none'/);
  assert.equal(headers["X-Frame-Options"], "DENY");
  assert.match(headers["Permissions-Policy"], /camera=\(\)/);
});

test("生产配置缺失会失败，完整且独立的配置才能通过", () => {
  const complete = {
    nodeEnv: "production", databaseConfigured: true, databasePassword: "db-password",
    aiStoryGenerationEnabled: false, deepseekApiKey: "",
    sessionCookieSecure: true, accountIdentityConfigured: true, phoneLoginConfigured: true,
    smsProvider: "aliyun-auth", smsConfigured: true, publicOperatorName: "杭州某某工作室",
    publicContactChannel: "微信公众号：童趣成长乐园", publicPrivacyEmail: "privacy@playmori.online",
    analyticsDir: "/var/lib/playmori/analytics", host: "127.0.0.1",
    accountIdentityHashSecret: "hash-secret", accountIdentityEncryptionKey: "encryption-key", phoneOtpSecret: "otp-secret",
  };
  assert.deepEqual(productionReadiness(complete), { ready: true, issues: [] });
  const aiWithoutKey = productionReadiness({ ...complete, aiStoryGenerationEnabled: true });
  assert.equal(aiWithoutKey.ready, false);
  assert.ok(aiWithoutKey.issues.some((issue) => issue.includes("DEEPSEEK_API_KEY")));
  assert.deepEqual(
    productionReadiness({ ...complete, aiStoryGenerationEnabled: true, deepseekApiKey: "deepseek-key" }),
    { ready: true, issues: [] },
  );
  const unsafe = productionReadiness({ ...complete, host: "0.0.0.0", sessionCookieSecure: false, smsProvider: "console" });
  assert.equal(unsafe.ready, false);
  assert.ok(unsafe.issues.length >= 3);
});
