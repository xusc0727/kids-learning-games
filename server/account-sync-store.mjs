import { createPublicId, hashProviderSubject } from "./account-security.mjs";
import { config } from "./config.mjs";
import { getPool } from "./database.mjs";
import { mapStoryRow, validateDeviceId } from "./story-store.mjs";
import { recordChildPrivacyDecision } from "./legal.mjs";

function inputError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function positiveId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw inputError("账号状态异常", 500);
  return id;
}

function stableKeys(value, maxItems, label) {
  if (!Array.isArray(value)) return [];
  if (value.length > maxItems) throw inputError(`${label}数量过多`);
  return [...new Set(value.map((item) => String(item || "").trim()).filter(Boolean))].map((key) => {
    if (!/^[A-Za-z0-9-]{1,64}$/.test(key)) throw inputError(`${label}标识不正确`);
    return key;
  });
}

export async function getPrimaryAccountContext(userId, connection) {
  const db = connection || await getPool();
  const safeUserId = positiveId(userId);
  const [rows] = await db.execute(
    `SELECT
       u.public_id AS user_public_id, u.display_name,
       (SELECT ai.provider_subject_hint FROM auth_identities ai
        WHERE ai.user_id = u.id AND ai.provider = 'phone' ORDER BY ai.id LIMIT 1) AS phone_hint,
       f.id AS family_id, f.public_id AS family_public_id, f.display_name AS family_name,
       fm.role,
       cp.id AS child_id, cp.public_id AS child_public_id, cp.nickname, cp.age_band, cp.avatar_key
     FROM users u
     INNER JOIN family_members fm ON fm.user_id = u.id AND fm.status = 'active'
     INNER JOIN families f ON f.id = fm.family_id AND f.status = 'active'
     INNER JOIN child_profiles cp ON cp.family_id = f.id AND cp.profile_key = 'default' AND cp.status = 'active'
     WHERE u.id = ? AND u.status = 'active'
     ORDER BY (fm.role = 'owner') DESC, fm.joined_at ASC
     LIMIT 1`,
    [safeUserId],
  );
  if (!rows.length) throw inputError("账号缺少有效家庭空间", 409);
  const row = rows[0];
  return {
    user: { id: safeUserId, publicId: row.user_public_id, displayName: row.display_name, phoneHint: row.phone_hint },
    family: { id: Number(row.family_id), publicId: row.family_public_id, displayName: row.family_name, role: row.role },
    defaultChild: {
      id: Number(row.child_id),
      publicId: row.child_public_id,
      nickname: row.nickname,
      ageBand: row.age_band,
      avatarKey: row.avatar_key,
    },
  };
}

export async function getAccountOverview(userId, connection) {
  const db = connection || await getPool();
  const context = await getPrimaryAccountContext(userId, db);
  const [counts] = await db.execute(
    `SELECT
       (SELECT COUNT(*) FROM stories WHERE family_id = ? AND source = 'ai' AND status = 'active') AS stories,
       (SELECT COUNT(*) FROM story_favorites WHERE child_profile_id = ?) AS favorites,
       (SELECT COUNT(*) FROM literacy_progress WHERE child_profile_id = ? AND status = 'learned') AS learned`,
    [context.family.id, context.defaultChild.id, context.defaultChild.id],
  );
  return {
    user: { publicId: context.user.publicId, displayName: context.user.displayName, phoneHint: context.user.phoneHint },
    family: {
      publicId: context.family.publicId,
      displayName: context.family.displayName,
      role: context.family.role,
      defaultChild: {
        publicId: context.defaultChild.publicId,
        nickname: context.defaultChild.nickname,
        ageBand: context.defaultChild.ageBand,
        avatarKey: context.defaultChild.avatarKey,
      },
    },
    counts: {
      stories: Number(counts[0]?.stories || 0),
      favorites: Number(counts[0]?.favorites || 0),
      learned: Number(counts[0]?.learned || 0),
    },
  };
}

function deviceHash(deviceId) {
  return hashProviderSubject("device_claim", "playmori-web", deviceId, config.accountIdentityHashSecret);
}

async function importFavorites(connection, context, storyKeys, now) {
  if (!storyKeys.length) return 0;
  const placeholders = storyKeys.map(() => "?").join(", ");
  const [result] = await connection.execute(
    `INSERT IGNORE INTO story_favorites
      (family_id, child_profile_id, story_id, created_by_user_id, created_at)
     SELECT ?, ?, s.id, ?, ?
     FROM stories s
     WHERE s.story_key IN (${placeholders}) AND s.status = 'active'
       AND (s.source = 'fixed' OR s.family_id = ?)`,
    [context.family.id, context.defaultChild.id, context.user.id, now, ...storyKeys, context.family.id],
  );
  return result.affectedRows || 0;
}

async function importLiteracy(connection, context, characterKeys, now) {
  if (!characterKeys.length) return 0;
  const placeholders = characterKeys.map(() => "?").join(", ");
  const [result] = await connection.execute(
    `INSERT IGNORE INTO literacy_progress
      (family_id, child_profile_id, character_id, status, learned_at, updated_by_user_id, created_at, updated_at)
     SELECT ?, ?, lc.id, 'learned', ?, ?, ?, ?
     FROM literacy_characters lc
     WHERE lc.character_key IN (${placeholders}) AND lc.status = 'active'`,
    [context.family.id, context.defaultChild.id, now, context.user.id, now, now, ...characterKeys],
  );
  return result.affectedRows || 0;
}

export async function claimDeviceData(userId, input = {}, poolOverride) {
  if (input.guardianConsent !== true) throw inputError("请先阅读并同意儿童个人信息处理规则");
  const deviceId = validateDeviceId(input.deviceId);
  const favoriteKeys = stableKeys(input.favoriteStoryKeys, 200, "收藏故事");
  const learnedKeys = stableKeys(input.learnedCharacterKeys, 100, "识字进度");
  const pool = poolOverride || await getPool();
  const connection = await pool.getConnection();
  const now = input.now instanceof Date ? input.now : new Date();
  try {
    await connection.beginTransaction();
    const context = await getPrimaryAccountContext(userId, connection);
    await recordChildPrivacyDecision(connection, {
      userId: context.user.id,
      familyId: context.family.id,
      childProfileId: context.defaultChild.id,
    }, "granted", now);
    const safeDeviceHash = deviceHash(deviceId);
    const [claimRows] = await connection.execute(
      "SELECT id, family_id FROM device_claims WHERE device_id_hash = ? LIMIT 1 FOR UPDATE",
      [safeDeviceHash],
    );
    const existing = claimRows[0];
    if (existing && Number(existing.family_id) !== context.family.id) {
      throw inputError("这台设备的匿名内容已经同步到另一个家庭", 409);
    }

    const [storyResult] = await connection.execute(
      `UPDATE stories
       SET family_id = ?, child_profile_id = ?, created_by_user_id = ?, claimed_at = ?
       WHERE source = 'ai' AND status = 'active' AND device_id = ? AND family_id IS NULL`,
      [context.family.id, context.defaultChild.id, context.user.id, now, deviceId],
    );
    const storiesClaimed = storyResult.affectedRows || 0;
    const favoritesImported = await importFavorites(connection, context, favoriteKeys, now);
    const literacyImported = await importLiteracy(connection, context, learnedKeys, now);

    if (existing) {
      await connection.execute(
        `UPDATE device_claims
         SET stories_claimed = stories_claimed + ?, favorites_imported = favorites_imported + ?,
             literacy_imported = literacy_imported + ?
         WHERE id = ?`,
        [storiesClaimed, favoritesImported, literacyImported, existing.id],
      );
    } else {
      await connection.execute(
        `INSERT INTO device_claims
          (public_id, device_id_hash, family_id, child_profile_id, claimed_by_user_id,
           stories_claimed, favorites_imported, literacy_imported, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          createPublicId(), safeDeviceHash, context.family.id, context.defaultChild.id, context.user.id,
          storiesClaimed, favoritesImported, literacyImported, now,
        ],
      );
    }
    await connection.commit();
    return { alreadyClaimed: Boolean(existing), storiesClaimed, favoritesImported, literacyImported };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function clearFamilyChildData(userId, input = {}, poolOverride) {
  if (input.confirmation !== "CLEAR") throw inputError("请输入 CLEAR 确认清空家庭成长数据");
  const pool = poolOverride || await getPool();
  const connection = await pool.getConnection();
  const now = new Date();
  try {
    await connection.beginTransaction();
    const context = await getPrimaryAccountContext(userId, connection);
    await recordChildPrivacyDecision(connection, {
      userId: context.user.id,
      familyId: context.family.id,
      childProfileId: context.defaultChild.id,
    }, "withdrawn", now);
    const [favoriteResult] = await connection.execute(
      "DELETE FROM story_favorites WHERE child_profile_id = ?",
      [context.defaultChild.id],
    );
    const [literacyResult] = await connection.execute(
      "DELETE FROM literacy_progress WHERE child_profile_id = ?",
      [context.defaultChild.id],
    );
    const [storyResult] = await connection.execute(
      "DELETE FROM stories WHERE family_id = ? AND source = 'ai'",
      [context.family.id],
    );
    await connection.execute("DELETE FROM device_claims WHERE family_id = ?", [context.family.id]);
    await connection.commit();
    return {
      cleared: true,
      storiesDeleted: Number(storyResult.affectedRows || 0),
      favoritesDeleted: Number(favoriteResult.affectedRows || 0),
      literacyDeleted: Number(literacyResult.affectedRows || 0),
    };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function listAccountStories(userId, limit = 20, connection) {
  const db = connection || await getPool();
  const context = await getPrimaryAccountContext(userId, db);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 20));
  const [rows] = await db.execute(
    `SELECT story_key, source, domain, age_label, duration_label, title, summary,
            learning_goal, story_content, questions, action_text, parent_tip, created_at
     FROM stories
     WHERE family_id = ? AND source = 'ai' AND status = 'active'
     ORDER BY created_at DESC
     LIMIT ${safeLimit}`,
    [context.family.id],
  );
  return rows.map(mapStoryRow);
}

export async function deleteAccountStories(userId, connection) {
  const db = connection || await getPool();
  const context = await getPrimaryAccountContext(userId, db);
  const [result] = await db.execute(
    "DELETE FROM stories WHERE family_id = ? AND source = 'ai'",
    [context.family.id],
  );
  return result.affectedRows || 0;
}

export async function listAccountFavoriteKeys(userId, connection) {
  const db = connection || await getPool();
  const context = await getPrimaryAccountContext(userId, db);
  const [rows] = await db.execute(
    `SELECT s.story_key
     FROM story_favorites sf
     INNER JOIN stories s ON s.id = sf.story_id AND s.status = 'active'
     WHERE sf.child_profile_id = ?
     ORDER BY sf.created_at ASC`,
    [context.defaultChild.id],
  );
  return rows.map((row) => row.story_key);
}

export async function setAccountFavorite(userId, storyKey, saved, connection) {
  const db = connection || await getPool();
  const [key] = stableKeys([storyKey], 1, "故事");
  const context = await getPrimaryAccountContext(userId, db);
  if (!saved) {
    await db.execute(
      `DELETE sf FROM story_favorites sf
       INNER JOIN stories s ON s.id = sf.story_id
       WHERE sf.child_profile_id = ? AND s.story_key = ?`,
      [context.defaultChild.id, key],
    );
    return { storyKey: key, saved: false };
  }
  const [result] = await db.execute(
    `INSERT IGNORE INTO story_favorites
      (family_id, child_profile_id, story_id, created_by_user_id, created_at)
     SELECT ?, ?, s.id, ?, UTC_TIMESTAMP(3)
     FROM stories s
     WHERE s.story_key = ? AND s.status = 'active'
       AND (s.source = 'fixed' OR s.family_id = ?)`,
    [context.family.id, context.defaultChild.id, context.user.id, key, context.family.id],
  );
  if (!result.affectedRows) {
    const [rows] = await db.execute(
      `SELECT 1 FROM story_favorites sf INNER JOIN stories s ON s.id = sf.story_id
       WHERE sf.child_profile_id = ? AND s.story_key = ? LIMIT 1`,
      [context.defaultChild.id, key],
    );
    if (!rows.length) throw inputError("故事不存在", 404);
  }
  return { storyKey: key, saved: true };
}

export async function listAccountLearnedKeys(userId, connection) {
  const db = connection || await getPool();
  const context = await getPrimaryAccountContext(userId, db);
  const [rows] = await db.execute(
    `SELECT lc.character_key
     FROM literacy_progress lp
     INNER JOIN literacy_characters lc ON lc.id = lp.character_id AND lc.status = 'active'
     WHERE lp.child_profile_id = ? AND lp.status = 'learned'
     ORDER BY lp.learned_at ASC`,
    [context.defaultChild.id],
  );
  return rows.map((row) => row.character_key);
}

export async function setAccountLiteracyProgress(userId, characterKey, learned, connection) {
  const db = connection || await getPool();
  const [key] = stableKeys([characterKey], 1, "汉字");
  const context = await getPrimaryAccountContext(userId, db);
  if (!learned) {
    await db.execute(
      `DELETE lp FROM literacy_progress lp
       INNER JOIN literacy_characters lc ON lc.id = lp.character_id
       WHERE lp.child_profile_id = ? AND lc.character_key = ?`,
      [context.defaultChild.id, key],
    );
    return { characterKey: key, learned: false };
  }
  const now = new Date();
  const [result] = await db.execute(
    `INSERT INTO literacy_progress
      (family_id, child_profile_id, character_id, status, learned_at, updated_by_user_id, created_at, updated_at)
     SELECT ?, ?, lc.id, 'learned', ?, ?, ?, ?
     FROM literacy_characters lc
     WHERE lc.character_key = ? AND lc.status = 'active'
     ON DUPLICATE KEY UPDATE status = 'learned', learned_at = VALUES(learned_at),
       updated_by_user_id = VALUES(updated_by_user_id), updated_at = VALUES(updated_at)`,
    [context.family.id, context.defaultChild.id, now, context.user.id, now, now, key],
  );
  if (!result.affectedRows) throw inputError("汉字不存在", 404);
  return { characterKey: key, learned: true };
}
