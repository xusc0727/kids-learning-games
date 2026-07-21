import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";
import { config } from "../server/config.mjs";
import { hashProviderSubject } from "../server/account-security.mjs";
import {
  hashPhoneLoginCode,
  maskPhone,
  normalizeMainlandPhone,
  requestPhoneLoginCode,
  verifyPhoneLoginCode,
} from "../server/phone-auth.mjs";
import { LOGIN_LEGAL } from "../server/legal.mjs";

const TEST_HASH_SECRET = "phone-auth-hash-secret-for-tests-123456789";
const TEST_OTP_SECRET = "phone-otp-secret-for-tests-1234567890";
const TEST_ENCRYPTION_KEY = "22".repeat(32);

function withPhoneConfig(run) {
  const previous = {
    accountIdentityHashSecret: config.accountIdentityHashSecret,
    accountIdentityEncryptionKey: config.accountIdentityEncryptionKey,
    accountIdentityConfigured: config.accountIdentityConfigured,
    phoneOtpSecret: config.phoneOtpSecret,
    phoneLoginConfigured: config.phoneLoginConfigured,
    smsConfigured: config.smsConfigured,
  };
  Object.assign(config, {
    accountIdentityHashSecret: TEST_HASH_SECRET,
    accountIdentityEncryptionKey: TEST_ENCRYPTION_KEY,
    accountIdentityConfigured: true,
    phoneOtpSecret: TEST_OTP_SECRET,
    phoneLoginConfigured: true,
    smsConfigured: true,
  });
  return Promise.resolve().then(run).finally(() => Object.assign(config, previous));
}

test("中国大陆手机号统一为 +86 格式并只展示掩码", () => {
  assert.equal(normalizeMainlandPhone("138 0013 8000"), "+8613800138000");
  assert.equal(normalizeMainlandPhone("0086-13800138000"), "+8613800138000");
  assert.equal(maskPhone("+8613800138000"), "138****8000");
  assert.throws(() => normalizeMainlandPhone("12345"), { statusCode: 400 });
});

test("验证码摘要绑定请求编号，数据库不需要保存明文验证码", () => {
  const requestId = "3f2a1515-e85a-4489-828f-74329a961ccc";
  const first = hashPhoneLoginCode(requestId, "123456", TEST_OTP_SECRET);
  const same = hashPhoneLoginCode(requestId, "123456", TEST_OTP_SECRET);
  const otherRequest = hashPhoneLoginCode("0d197ac5-8f6f-4aa2-aecc-cb1fb79755ff", "123456", TEST_OTP_SECRET);
  assert.equal(first, same);
  assert.notEqual(first, otherRequest);
  assert.equal(first.includes("123456"), false);
});

test("本地调试验证码只落库手机号、IP 和验证码摘要", async () => withPhoneConfig(async () => {
  const calls = [];
  let delivered;
  const database = {
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("SUM(phone_hash")) return [[{ phone_minute: 0, phone_hour: 0, phone_day: 0, ip_hour: 0, ip_day: 0 }]];
      return [{ affectedRows: 1, insertId: 1 }];
    },
  };
  const result = await requestPhoneLoginCode(
    { phone: "13800138000", legalAccepted: true },
    "127.0.0.1",
    {
      connection: database,
      now: new Date("2026-07-20T10:00:00.000Z"),
      async sendCode(phone, code) { delivered = { phone, code }; return { provider: "test", debugCode: code }; },
    },
  );
  assert.equal(delivered.phone, "+8613800138000");
  assert.match(delivered.code, /^\d{6}$/);
  assert.equal(result.debugCode, delivered.code);
  const insert = calls.find(({ sql }) => sql.includes("INSERT INTO phone_login_challenges"));
  assert.ok(insert);
  assert.equal(insert.params.includes("+8613800138000"), false);
  assert.equal(insert.params.includes(delivered.code), false);
  assert.equal(insert.params[2], "138****8000");
  assert.equal(insert.params.includes(LOGIN_LEGAL.version), true);
  assert.equal(insert.params.includes(LOGIN_LEGAL.documentHash), true);
}));

test("阿里云短信认证模式不生成或保存本地验证码", async () => withPhoneConfig(async () => {
  const calls = [];
  let delivered;
  const database = {
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("SUM(phone_hash")) return [[{ phone_minute: 0, phone_hour: 0, phone_day: 0, ip_hour: 0, ip_day: 0 }]];
      return [{ affectedRows: 1, insertId: 1 }];
    },
  };
  await requestPhoneLoginCode(
    { phone: "13800138000", legalAccepted: true },
    "127.0.0.1",
    {
      connection: database,
      verificationMode: "aliyun-auth",
      async sendCode(phone, code, requestId) {
        delivered = { phone, code, requestId };
        return { provider: "aliyun-auth", verificationMode: "aliyun-auth" };
      },
    },
  );
  assert.equal(delivered.phone, "+8613800138000");
  assert.equal(delivered.code, null);
  assert.match(delivered.requestId, /^[a-f0-9-]{36}$/i);
  const insert = calls.find(({ sql }) => sql.includes("INSERT INTO phone_login_challenges"));
  assert.equal(insert.params[3], "aliyun-auth");
  assert.equal(insert.params[4], null);
}));

test("阿里云核验通过后在同一事务中创建账号、家庭、身份和 Session", async () => withPhoneConfig(async () => {
  const requestId = "3f2a1515-e85a-4489-828f-74329a961ccc";
  const phone = "+8613800138000";
  const code = "123456";
  const calls = [];
  const lifecycle = [];
  let providerVerification;
  const connection = {
    async beginTransaction() { lifecycle.push("begin"); },
    async commit() { lifecycle.push("commit"); },
    async rollback() { lifecycle.push("rollback"); },
    release() { lifecycle.push("release"); },
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("FROM phone_login_challenges")) {
        return [[{
          id: 1,
          phone_hash: hashProviderSubject("phone", "playmori-web", phone, TEST_HASH_SECRET),
          verification_mode: "aliyun-auth",
          code_hash: null,
          legal_version: LOGIN_LEGAL.version,
          legal_document_hash: LOGIN_LEGAL.documentHash,
          status: "sent",
          attempts: 0,
          expires_at: new Date("2026-07-20T10:05:00.000Z"),
        }]];
      }
      if (sql.includes("FROM auth_identities")) return [[]];
      if (sql.includes("INSERT INTO users")) return [{ insertId: 101 }];
      if (sql.includes("INSERT INTO families")) return [{ insertId: 202 }];
      if (sql.includes("INSERT INTO child_profiles")) return [{ insertId: 303 }];
      if (sql.includes("INSERT INTO auth_identities")) return [{ insertId: 404 }];
      return [{ insertId: 505, affectedRows: 1 }];
    },
  };
  const result = await verifyPhoneLoginCode(
    { requestId, phone, code, legalAccepted: true },
    {
      pool: { async getConnection() { return connection; } },
      now: new Date("2026-07-20T10:01:00.000Z"),
      async verifyProviderCode(...args) { providerVerification = args; return true; },
    },
  );
  assert.deepEqual(lifecycle, ["begin", "commit", "release"]);
  assert.equal(result.isNewUser, true);
  assert.equal(result.family.defaultChild.nickname, null);
  assert.match(result.session.token, /^[A-Za-z0-9_-]{43}$/);
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO auth_identities")));
  assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO sessions")));
  assert.equal(calls.filter(({ sql }) => sql.includes("INSERT INTO guardian_consents")).length, 2);
  assert.deepEqual(providerVerification, [phone, requestId, code]);
}));

test("未同意用户协议时不能请求或验证验证码", async () => withPhoneConfig(async () => {
  await assert.rejects(() => requestPhoneLoginCode({ phone: "13800138000" }, "127.0.0.1", { connection: {} }), /请先阅读并同意/);
  await assert.rejects(() => verifyPhoneLoginCode({ phone: "13800138000", requestId: crypto.randomUUID(), code: "123456" }), /请先阅读并同意/);
}));
