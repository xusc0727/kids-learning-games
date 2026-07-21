import assert from "node:assert/strict";
import test from "node:test";
import { config } from "../server/config.mjs";
import { claimDeviceData, clearFamilyChildData } from "../server/account-sync-store.mjs";

test("设备认领在一个事务中合并故事、收藏和识字记录", async () => {
  const previousSecret = config.accountIdentityHashSecret;
  config.accountIdentityHashSecret = "device-claim-hash-secret-for-tests-123456";
  const calls = [];
  const lifecycle = [];
  const connection = {
    async beginTransaction() { lifecycle.push("begin"); },
    async commit() { lifecycle.push("commit"); },
    async rollback() { lifecycle.push("rollback"); },
    release() { lifecycle.push("release"); },
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("FROM users u")) return [[{
        user_public_id: "user-public", display_name: null, phone_hint: "138****8000",
        family_id: 20, family_public_id: "family-public", family_name: null, role: "owner",
        child_id: 30, child_public_id: "child-public", nickname: null, age_band: null, avatar_key: null,
      }]];
      if (sql.includes("FROM device_claims")) return [[]];
      if (sql.includes("UPDATE stories")) return [{ affectedRows: 2 }];
      if (sql.includes("INSERT IGNORE INTO story_favorites")) return [{ affectedRows: 1 }];
      if (sql.includes("INSERT IGNORE INTO literacy_progress")) return [{ affectedRows: 2 }];
      return [{ affectedRows: 1, insertId: 1 }];
    },
  };
  try {
    const result = await claimDeviceData(10, {
      deviceId: "4c706c51-c8f0-4473-a2e5-e6a578666fe4",
      favoriteStoryKeys: ["health-little-bear", "health-little-bear"],
      learnedCharacterKeys: ["nature-sun", "nature-moon"],
      guardianConsent: true,
      now: new Date("2026-07-20T11:00:00.000Z"),
    }, { async getConnection() { return connection; } });
    assert.deepEqual(lifecycle, ["begin", "commit", "release"]);
    assert.deepEqual(result, { alreadyClaimed: false, storiesClaimed: 2, favoritesImported: 1, literacyImported: 2 });
    const claimInsert = calls.find(({ sql }) => sql.includes("INSERT INTO device_claims"));
    assert.ok(claimInsert);
    assert.equal(claimInsert.params.includes("4c706c51-c8f0-4473-a2e5-e6a578666fe4"), false);
    assert.ok(calls.some(({ sql }) => sql.includes("INSERT INTO guardian_consents")));
  } finally {
    config.accountIdentityHashSecret = previousSecret;
  }
});

test("撤回监护人同意会在事务中清空家庭成长数据", async () => {
  const lifecycle = [];
  const calls = [];
  const connection = {
    async beginTransaction() { lifecycle.push("begin"); },
    async commit() { lifecycle.push("commit"); },
    async rollback() { lifecycle.push("rollback"); },
    release() { lifecycle.push("release"); },
    async execute(sql, params) {
      calls.push({ sql, params });
      if (sql.includes("FROM users u")) return [[{
        user_public_id: "user-public", display_name: null, phone_hint: "138****8000",
        family_id: 20, family_public_id: "family-public", family_name: null, role: "owner",
        child_id: 30, child_public_id: "child-public", nickname: null, age_band: null, avatar_key: null,
      }]];
      if (sql.includes("DELETE FROM story_favorites")) return [{ affectedRows: 3 }];
      if (sql.includes("DELETE FROM literacy_progress")) return [{ affectedRows: 4 }];
      if (sql.includes("DELETE FROM stories")) return [{ affectedRows: 2 }];
      return [{ affectedRows: 1, insertId: 1 }];
    },
  };
  const result = await clearFamilyChildData(10, { confirmation: "CLEAR" }, { async getConnection() { return connection; } });
  assert.deepEqual(lifecycle, ["begin", "commit", "release"]);
  assert.deepEqual(result, { cleared: true, storiesDeleted: 2, favoritesDeleted: 3, literacyDeleted: 4 });
  const consentInsert = calls.find(({ sql }) => sql.includes("INSERT INTO guardian_consents"));
  assert.equal(consentInsert.params.includes("withdrawn"), true);
});
