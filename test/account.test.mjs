import assert from "node:assert/strict";
import test from "node:test";
import {
  clearSessionCookie,
  createSessionCookie,
  createSessionToken,
  decryptProviderSubject,
  encryptProviderSubject,
  hashProviderSubject,
  hashSessionToken,
  readCookie,
  validateChildProfile,
  validateConsent,
} from "../server/account-security.mjs";
import {
  createAccountFoundation,
  createSession,
  deleteAccount,
  getFamilyForUser,
  revokeAllSessions,
  revokeSession,
} from "../server/account-store.mjs";
import { requireRecentAuthentication } from "../server/account-auth.mjs";
import { config } from "../server/config.mjs";

const DOCUMENT_HASH = "a".repeat(64);

function accountPool(options = {}) {
  const statements = [];
  const lifecycle = [];
  const connection = {
    async beginTransaction() {
      lifecycle.push("begin");
    },
    async execute(sql, params) {
      statements.push({ sql, params });
      if (options.failOn && sql.includes(options.failOn)) throw new Error("simulated database failure");
      if (sql.includes("INSERT INTO users")) return [{ insertId: 101 }];
      if (sql.includes("INSERT INTO families")) return [{ insertId: 202 }];
      if (sql.includes("INSERT INTO child_profiles")) return [{ insertId: 303 }];
      return [{ insertId: 404, affectedRows: 1 }];
    },
    async commit() {
      lifecycle.push("commit");
    },
    async rollback() {
      lifecycle.push("rollback");
    },
    release() {
      lifecycle.push("release");
    },
  };
  return {
    statements,
    lifecycle,
    pool: { async getConnection() { return connection; } },
  };
}

test("账号创建在一个事务中建立家庭、所有者和默认儿童使用位", async () => {
  const fake = accountPool();
  const result = await createAccountFoundation({
    displayName: "  果果妈妈  ",
    familyName: "果果的家",
    now: new Date("2026-07-20T08:00:00.000Z"),
    consents: [{
      type: "child_privacy",
      version: "2026-07-20",
      decision: "granted",
      documentHash: DOCUMENT_HASH,
      source: "web",
      scope: "default_child",
    }],
  }, fake.pool);

  assert.deepEqual(fake.lifecycle, ["begin", "commit", "release"]);
  assert.equal(result.user.id, 101);
  assert.equal(result.family.id, 202);
  assert.equal(result.defaultChild.id, 303);
  assert.equal(result.defaultChild.profileKey, "default");
  assert.equal(result.defaultChild.nickname, null);
  assert.match(result.user.publicId, /^[a-f0-9-]{36}$/);

  const defaultInsert = fake.statements.find(({ sql }) => sql.includes("INSERT INTO child_profiles"));
  assert.ok(defaultInsert);
  assert.match(defaultInsert.sql, /'default', NULL, NULL, NULL, 'active'/);
  const memberInsert = fake.statements.find(({ sql }) => sql.includes("INSERT INTO family_members"));
  assert.match(memberInsert.sql, /'owner', 'active'/);
  const consentInsert = fake.statements.find(({ sql }) => sql.includes("INSERT INTO guardian_consents"));
  assert.equal(consentInsert.params[3], 303);
});

test("账号创建失败会回滚且释放连接", async () => {
  const fake = accountPool({ failOn: "INSERT INTO families" });
  await assert.rejects(() => createAccountFoundation({}, fake.pool), /simulated database failure/);
  assert.deepEqual(fake.lifecycle, ["begin", "rollback", "release"]);
});

test("儿童档案只接受可选小名、三个年龄段和系统头像", () => {
  assert.deepEqual(validateChildProfile({}), { nickname: null, ageBand: null, avatarKey: null });
  assert.deepEqual(validateChildProfile({ nickname: " <b>果果</b> ", ageBand: "4-5", avatarKey: "Fox_Green" }), {
    nickname: "果果",
    ageBand: "4-5",
    avatarKey: "fox_green",
  });
  assert.throws(() => validateChildProfile({ ageBand: "6-7" }), { statusCode: 400 });
  assert.throws(() => validateChildProfile({ avatarKey: "../photo" }), { statusCode: 400 });
});

test("监护人同意记录要求版本、决定和文档哈希", () => {
  assert.deepEqual(validateConsent({
    type: "child_privacy",
    version: "v1.0",
    decision: "granted",
    documentHash: DOCUMENT_HASH,
    source: "web",
    scope: "default_child",
  }), {
    type: "child_privacy",
    version: "v1.0",
    decision: "granted",
    documentHash: DOCUMENT_HASH,
    source: "web",
    scope: "default_child",
  });
  assert.throws(() => validateConsent({ type: "child_privacy", version: "v1", decision: "yes", documentHash: DOCUMENT_HASH, source: "web" }), { statusCode: 400 });
});

test("Session 只保存哈希并使用安全 Cookie", () => {
  const token = createSessionToken();
  const hash = hashSessionToken(token);
  assert.equal(token.length, 43);
  assert.match(hash, /^[a-f0-9]{64}$/);
  assert.equal(hash.includes(token), false);

  const cookie = createSessionCookie(token, { name: "test_session", ttlDays: 14 });
  assert.match(cookie, /^test_session=/);
  assert.match(cookie, /HttpOnly/);
  assert.match(cookie, /Secure/);
  assert.match(cookie, /SameSite=Lax/);
  assert.equal(readCookie(cookie, "test_session"), token);
  assert.match(clearSessionCookie({ name: "test_session" }), /Max-Age=0/);
});

test("外部身份按渠道哈希并使用带上下文的 AES-GCM 密文", () => {
  const secret = "identity-hash-secret-for-tests-123456789";
  const key = "11".repeat(32);
  const first = hashProviderSubject("phone", "playmori-web", "+8613800000000", secret);
  const same = hashProviderSubject("phone", "playmori-web", "+8613800000000", secret);
  const anotherApp = hashProviderSubject("phone", "another-app", "+8613800000000", secret);
  assert.equal(first, same);
  assert.notEqual(first, anotherApp);
  assert.equal(first.includes("13800000000"), false);

  const encrypted = encryptProviderSubject("+8613800000000", key, "phone:playmori-web");
  assert.notEqual(encrypted.toString("utf8"), "+8613800000000");
  assert.equal(decryptProviderSubject(encrypted, key, "phone:playmori-web"), "+8613800000000");
  assert.throws(() => decryptProviderSubject(encrypted, key, "phone:another-app"));
});

test("服务端 Session 只落库令牌摘要，并支持单端和全端撤销", async () => {
  const calls = [];
  const database = {
    async execute(sql, params) {
      calls.push({ sql, params });
      return [{ insertId: 1, affectedRows: 1 }];
    },
  };
  const now = new Date("2026-07-20T09:00:00.000Z");
  const session = await createSession(12, { now, ttlDays: 30 }, database);
  assert.equal(session.expiresAt.toISOString(), "2026-08-19T09:00:00.000Z");
  assert.equal(calls[0].params.includes(session.token), false);
  assert.equal(calls[0].params[2], hashSessionToken(session.token));

  await revokeSession(session.token, now, database);
  assert.match(calls[1].sql, /token_hash = \?/);
  assert.equal(calls[1].params.includes(session.token), false);

  await revokeAllSessions(12, { now, exceptSessionPublicId: session.publicId }, database);
  assert.match(calls[2].sql, /user_id = \?.*public_id <> \?/);
  assert.deepEqual(calls[2].params, [now, 12, session.publicId]);
});

test("家庭权限查询必须经过有效成员关系，并隐藏无权访问的家庭", async () => {
  let query;
  const deniedDatabase = {
    async execute(sql, params) {
      query = { sql, params };
      return [[]];
    },
  };
  await assert.rejects(
    () => getFamilyForUser(45, "family-public-id", deniedDatabase),
    (error) => error.statusCode === 404 && error.message === "家庭不存在",
  );
  assert.match(query.sql, /INNER JOIN family_members/);
  assert.match(query.sql, /fm\.user_id = \?.*fm\.status = 'active'/s);
  assert.deepEqual(query.params, ["family-public-id", 45]);
});

test("账号注销只允许单成员家庭并在一个事务中删除家庭和用户", async () => {
  const previousSecret = config.accountIdentityHashSecret;
  config.accountIdentityHashSecret = "account-deletion-secret-for-tests-123456";
  const calls = [];
  const lifecycle = [];
  const connection = {
    async beginTransaction() { lifecycle.push("begin"); },
    async commit() { lifecycle.push("commit"); },
    async rollback() { lifecycle.push("rollback"); },
    release() { lifecycle.push("release"); },
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("FROM users u") && sql.includes("FOR UPDATE")) return [[{
        user_public_id: "f4fb93b2-1039-4b1e-9ef7-1b27d0fd16eb",
        family_id: 202,
        family_public_id: "5bfba249-eeb1-456e-9b09-b03105659af1",
      }]];
      if (sql.includes("COUNT(*) AS total")) return [[{ total: 1 }]];
      if (sql.includes("SELECT provider_subject_hash")) return [[{ provider_subject_hash: "a".repeat(64) }]];
      return [{ affectedRows: 1, insertId: 1 }];
    },
  };
  try {
    const result = await deleteAccount(101, { confirmation: "DELETE" }, { async getConnection() { return connection; } });
    assert.deepEqual(result, { deleted: true });
    assert.deepEqual(lifecycle, ["begin", "commit", "release"]);
    assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO account_deletion_events")));
    assert.ok(calls.some(({ sql }) => sql.includes("DELETE FROM families")));
    assert.ok(calls.some(({ sql }) => sql.includes("DELETE FROM users")));
  } finally {
    config.accountIdentityHashSecret = previousSecret;
  }
});

test("注销账号要求最近完成登录", () => {
  assert.equal(requireRecentAuthentication({ createdAt: new Date() }).createdAt instanceof Date, true);
  assert.throws(() => requireRecentAuthentication({ createdAt: new Date(Date.now() - 16 * 60_000) }), { statusCode: 401 });
});
