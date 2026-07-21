import { getPool } from "./database.mjs";
import {
  createPublicId,
  createSessionToken,
  encryptProviderSubject,
  hashProviderSubject,
  hashSessionToken,
  normalizeSessionTtlDays,
  validateChildProfile,
  validateConsent,
  validateDisplayName,
  validateFamilyName,
} from "./account-security.mjs";
import { config } from "./config.mjs";

function notFound(message = "家庭或档案不存在") {
  return Object.assign(new Error(message), { statusCode: 404 });
}

function forbidden(message = "没有权限执行此操作") {
  return Object.assign(new Error(message), { statusCode: 403 });
}

function positiveId(value, label = "记录") {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) throw Object.assign(new Error(`${label}标识无效`), { statusCode: 400 });
  return id;
}

async function executor(connection) {
  return connection || await getPool();
}

export async function createAccountFoundationWithConnection(input = {}, connection) {
  if (!connection?.execute) throw new Error("创建账号需要数据库连接");
  const displayName = validateDisplayName(input.displayName);
  const familyName = validateFamilyName(input.familyName);
  const consents = Array.isArray(input.consents) ? input.consents.map(validateConsent) : [];
  const now = input.now instanceof Date ? input.now : new Date();
  const userPublicId = createPublicId();
  const familyPublicId = createPublicId();
  const childPublicId = createPublicId();

  const [userResult] = await connection.execute(
    `INSERT INTO users (public_id, display_name, status, created_at, updated_at)
     VALUES (?, ?, 'active', ?, ?)`,
    [userPublicId, displayName, now, now],
  );
  const userId = positiveId(userResult.insertId, "用户");

  const [familyResult] = await connection.execute(
    `INSERT INTO families (public_id, display_name, status, created_at, updated_at)
     VALUES (?, ?, 'active', ?, ?)`,
    [familyPublicId, familyName, now, now],
  );
  const familyId = positiveId(familyResult.insertId, "家庭");

  await connection.execute(
    `INSERT INTO family_members (family_id, user_id, role, status, joined_at, created_at, updated_at)
     VALUES (?, ?, 'owner', 'active', ?, ?, ?)`,
    [familyId, userId, now, now, now],
  );

  const [childResult] = await connection.execute(
    `INSERT INTO child_profiles
      (public_id, family_id, profile_key, nickname, age_band, avatar_key, status, created_at, updated_at)
     VALUES (?, ?, 'default', NULL, NULL, NULL, 'active', ?, ?)`,
    [childPublicId, familyId, now, now],
  );
  const childProfileId = positiveId(childResult.insertId, "儿童档案");

  for (const consent of consents) {
    await connection.execute(
      `INSERT INTO guardian_consents
        (public_id, user_id, family_id, child_profile_id, consent_type, consent_version,
         decision, document_hash, source, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        createPublicId(),
        userId,
        familyId,
        consent.scope === "default_child" ? childProfileId : null,
        consent.type,
        consent.version,
        consent.decision,
        consent.documentHash,
        consent.source,
        now,
      ],
    );
  }

  return {
    user: { id: userId, publicId: userPublicId, displayName },
    family: { id: familyId, publicId: familyPublicId, displayName: familyName, role: "owner" },
    defaultChild: { id: childProfileId, publicId: childPublicId, profileKey: "default", nickname: null, ageBand: null, avatarKey: null },
  };
}

export async function createAccountFoundation(input = {}, poolOverride) {
  const pool = poolOverride || await getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const result = await createAccountFoundationWithConnection(input, connection);
    await connection.commit();
    return result;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function createSession(userId, options = {}, connection) {
  const db = await executor(connection);
  const safeUserId = positiveId(userId, "用户");
  const ttlDays = normalizeSessionTtlDays(options.ttlDays);
  const now = options.now instanceof Date ? options.now : new Date();
  const expiresAt = new Date(now.getTime() + ttlDays * 86_400_000);
  const token = createSessionToken();
  const tokenHash = hashSessionToken(token);
  const publicId = createPublicId();
  await db.execute(
    `INSERT INTO sessions (public_id, user_id, token_hash, expires_at, last_seen_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [publicId, safeUserId, tokenHash, expiresAt, now, now],
  );
  return { publicId, token, expiresAt };
}

function identityLookupMaterial(input = {}) {
  if (config.accountIdentityHashSecret.length < 32) throw new Error("账号身份散列尚未配置");
  const provider = String(input.provider || "").trim().toLowerCase();
  const providerAppId = String(input.providerAppId || "").trim();
  const subject = String(input.subject || "").trim();
  const subjectHash = hashProviderSubject(provider, providerAppId, subject, config.accountIdentityHashSecret);
  return { provider, providerAppId, subject, subjectHash };
}

function identityMaterial(input = {}) {
  if (!config.accountIdentityConfigured) throw new Error("账号身份加密尚未配置");
  const lookup = identityLookupMaterial(input);
  const context = `${lookup.provider}:${lookup.providerAppId}`;
  const subjectCiphertext = encryptProviderSubject(lookup.subject, config.accountIdentityEncryptionKey, context);
  const hint = String(input.hint || "").trim();
  if ([...hint].length > 64) throw Object.assign(new Error("登录身份提示过长"), { statusCode: 400 });
  if (/\d{7,}/.test(hint)) throw Object.assign(new Error("登录身份提示必须脱敏"), { statusCode: 400 });
  let unionIdHash = null;
  let unionIdCiphertext = null;
  if (input.unionId) {
    unionIdHash = hashProviderSubject("wechat_union", lookup.providerAppId, input.unionId, config.accountIdentityHashSecret);
    unionIdCiphertext = encryptProviderSubject(input.unionId, config.accountIdentityEncryptionKey, `${context}:union`);
  }
  return { ...lookup, subjectCiphertext, hint: hint || null, unionIdHash, unionIdCiphertext };
}

export async function attachAuthIdentity(userId, input = {}, connection) {
  const db = await executor(connection);
  const safeUserId = positiveId(userId, "用户");
  const identity = identityMaterial(input);
  const verifiedAt = input.verifiedAt instanceof Date ? input.verifiedAt : new Date();
  const [result] = await db.execute(
    `INSERT INTO auth_identities
      (user_id, provider, provider_app_id, provider_subject_hash, provider_subject_ciphertext,
       provider_subject_hint, union_id_hash, union_id_ciphertext, verified_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      safeUserId,
      identity.provider,
      identity.providerAppId,
      identity.subjectHash,
      identity.subjectCiphertext,
      identity.hint,
      identity.unionIdHash,
      identity.unionIdCiphertext,
      verifiedAt,
      verifiedAt,
    ],
  );
  return { id: Number(result.insertId), provider: identity.provider, providerAppId: identity.providerAppId, hint: identity.hint, verifiedAt };
}

export async function findUserByAuthIdentity(input = {}, connection) {
  const db = await executor(connection);
  const identity = identityLookupMaterial(input);
  const [rows] = await db.execute(
    `SELECT
       u.id, u.public_id, u.display_name, u.status,
       ai.id AS identity_id, ai.provider_subject_hint, ai.verified_at
     FROM auth_identities ai
     INNER JOIN users u ON u.id = ai.user_id
     WHERE ai.provider = ? AND ai.provider_app_id = ? AND ai.provider_subject_hash = ?
       AND u.status = 'active'
     LIMIT 1`,
    [identity.provider, identity.providerAppId, identity.subjectHash],
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    id: Number(row.id),
    publicId: row.public_id,
    displayName: row.display_name,
    identityId: Number(row.identity_id),
    identityHint: row.provider_subject_hint,
    verifiedAt: row.verified_at,
  };
}

export async function findActiveSession(token, connection) {
  const db = await executor(connection);
  const tokenHash = hashSessionToken(token);
  const [rows] = await db.execute(
    `SELECT
       s.public_id AS session_public_id, s.user_id, s.expires_at, s.last_seen_at, s.created_at,
       u.public_id AS user_public_id, u.display_name, u.status AS user_status
     FROM sessions s
     INNER JOIN users u ON u.id = s.user_id
     WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > UTC_TIMESTAMP(3)
       AND u.status = 'active'
     LIMIT 1`,
    [tokenHash],
  );
  if (!rows.length) return null;
  const row = rows[0];
  return {
    sessionPublicId: row.session_public_id,
    userId: Number(row.user_id),
    userPublicId: row.user_public_id,
    displayName: row.display_name,
    expiresAt: row.expires_at,
    lastSeenAt: row.last_seen_at,
    createdAt: row.created_at,
  };
}

export async function touchSession(sessionPublicId, now = new Date(), connection) {
  const db = await executor(connection);
  const [result] = await db.execute(
    `UPDATE sessions SET last_seen_at = ?
     WHERE public_id = ? AND revoked_at IS NULL AND expires_at > ?`,
    [now, String(sessionPublicId || ""), now],
  );
  return result.affectedRows || 0;
}

export async function revokeSession(token, now = new Date(), connection) {
  const db = await executor(connection);
  const [result] = await db.execute(
    "UPDATE sessions SET revoked_at = ? WHERE token_hash = ? AND revoked_at IS NULL",
    [now, hashSessionToken(token)],
  );
  return result.affectedRows || 0;
}

export async function revokeAllSessions(userId, options = {}, connection) {
  const db = await executor(connection);
  const safeUserId = positiveId(userId, "用户");
  const now = options.now instanceof Date ? options.now : new Date();
  const except = String(options.exceptSessionPublicId || "").trim();
  const sql = except
    ? "UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL AND public_id <> ?"
    : "UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL";
  const params = except ? [now, safeUserId, except] : [now, safeUserId];
  const [result] = await db.execute(sql, params);
  return result.affectedRows || 0;
}

export async function deleteAccount(userId, input = {}, poolOverride) {
  if (input.confirmation !== "DELETE") {
    throw Object.assign(new Error("请输入 DELETE 确认注销账号"), { statusCode: 400 });
  }
  const safeUserId = positiveId(userId, "用户");
  const pool = poolOverride || await getPool();
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.execute(
      `SELECT u.public_id AS user_public_id, f.id AS family_id, f.public_id AS family_public_id
       FROM users u
       INNER JOIN family_members fm ON fm.user_id = u.id AND fm.status = 'active'
       INNER JOIN families f ON f.id = fm.family_id AND f.status = 'active'
       WHERE u.id = ? AND u.status = 'active'
       ORDER BY (fm.role = 'owner') DESC, fm.joined_at ASC
       LIMIT 2 FOR UPDATE`,
      [safeUserId],
    );
    if (rows.length !== 1) throw Object.assign(new Error("账号家庭状态不支持自助注销，请联系人工处理"), { statusCode: 409 });
    const account = rows[0];
    const [memberRows] = await connection.execute(
      "SELECT COUNT(*) AS total FROM family_members WHERE family_id = ? AND status = 'active'",
      [account.family_id],
    );
    if (Number(memberRows[0]?.total || 0) !== 1) {
      throw Object.assign(new Error("家庭还有其他成员，请先联系人工完成管理权移交"), { statusCode: 409 });
    }
    const [identityRows] = await connection.execute(
      "SELECT provider_subject_hash FROM auth_identities WHERE user_id = ? AND provider = 'phone'",
      [safeUserId],
    );
    const phoneHashes = identityRows.map((row) => row.provider_subject_hash).filter(Boolean);
    if (phoneHashes.length) {
      const placeholders = phoneHashes.map(() => "?").join(", ");
      await connection.execute(`DELETE FROM phone_login_challenges WHERE phone_hash IN (${placeholders})`, phoneHashes);
    }
    const userReferenceHash = hashProviderSubject("account_deletion", "playmori-web", account.user_public_id, config.accountIdentityHashSecret);
    const familyReferenceHash = hashProviderSubject("account_deletion", "playmori-web", account.family_public_id, config.accountIdentityHashSecret);
    await connection.execute(
      `INSERT INTO account_deletion_events
        (public_id, user_reference_hash, family_reference_hash, deletion_reason, source, created_at)
       VALUES (?, ?, ?, 'user_request', 'web', ?)`,
      [createPublicId(), userReferenceHash, familyReferenceHash, new Date()],
    );
    await connection.execute("DELETE FROM families WHERE id = ?", [account.family_id]);
    await connection.execute("DELETE FROM users WHERE id = ?", [safeUserId]);
    await connection.commit();
    return { deleted: true };
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}

export async function getFamilyForUser(userId, familyPublicId, connection) {
  const db = await executor(connection);
  const safeUserId = positiveId(userId, "用户");
  const [rows] = await db.execute(
    `SELECT f.id, f.public_id, f.display_name, f.status, fm.role
     FROM families f
     INNER JOIN family_members fm ON fm.family_id = f.id
     WHERE f.public_id = ? AND f.status = 'active'
       AND fm.user_id = ? AND fm.status = 'active'
     LIMIT 1`,
    [String(familyPublicId || ""), safeUserId],
  );
  if (!rows.length) throw notFound("家庭不存在");
  const row = rows[0];
  return { id: Number(row.id), publicId: row.public_id, displayName: row.display_name, role: row.role };
}

export async function listChildProfiles(userId, familyPublicId, connection) {
  const db = await executor(connection);
  const family = await getFamilyForUser(userId, familyPublicId, db);
  const [rows] = await db.execute(
    `SELECT public_id, profile_key, nickname, age_band, avatar_key, created_at, updated_at
     FROM child_profiles
     WHERE family_id = ? AND status = 'active'
     ORDER BY (profile_key = 'default') DESC, created_at ASC`,
    [family.id],
  );
  return rows.map((row) => ({
    publicId: row.public_id,
    profileKey: row.profile_key,
    nickname: row.nickname,
    ageBand: row.age_band,
    avatarKey: row.avatar_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));
}

export async function createChildProfile(userId, familyPublicId, input = {}, connection) {
  const db = await executor(connection);
  const family = await getFamilyForUser(userId, familyPublicId, db);
  const child = validateChildProfile(input);
  const publicId = createPublicId();
  const profileKey = `child-${createPublicId()}`;
  await db.execute(
    `INSERT INTO child_profiles
      (public_id, family_id, profile_key, nickname, age_band, avatar_key, status)
     VALUES (?, ?, ?, ?, ?, ?, 'active')`,
    [publicId, family.id, profileKey, child.nickname, child.ageBand, child.avatarKey],
  );
  return { publicId, profileKey, ...child };
}

async function getChildForUser(userId, familyPublicId, childPublicId, connection) {
  const db = await executor(connection);
  const family = await getFamilyForUser(userId, familyPublicId, db);
  const [rows] = await db.execute(
    `SELECT id, public_id, profile_key, nickname, age_band, avatar_key
     FROM child_profiles
     WHERE public_id = ? AND family_id = ? AND status = 'active'
     LIMIT 1`,
    [String(childPublicId || ""), family.id],
  );
  if (!rows.length) throw notFound("儿童档案不存在");
  return { ...rows[0], family, id: Number(rows[0].id) };
}

export async function updateChildProfile(userId, familyPublicId, childPublicId, input = {}, connection) {
  const db = await executor(connection);
  const existing = await getChildForUser(userId, familyPublicId, childPublicId, db);
  const child = validateChildProfile(input);
  await db.execute(
    `UPDATE child_profiles
     SET nickname = ?, age_band = ?, avatar_key = ?
     WHERE id = ?`,
    [child.nickname, child.ageBand, child.avatarKey, existing.id],
  );
  return { publicId: existing.public_id, profileKey: existing.profile_key, ...child };
}

export async function deleteChildProfile(userId, familyPublicId, childPublicId, connection) {
  const db = await executor(connection);
  const existing = await getChildForUser(userId, familyPublicId, childPublicId, db);
  if (existing.profile_key === "default") throw forbidden("默认儿童使用位不能删除，可以清空其中的可选资料");
  const [result] = await db.execute(
    "UPDATE child_profiles SET status = 'deleted' WHERE id = ? AND status = 'active'",
    [existing.id],
  );
  return result.affectedRows || 0;
}

export async function recordGuardianConsent(userId, familyPublicId, input = {}, connection) {
  const db = await executor(connection);
  const safeUserId = positiveId(userId, "用户");
  const family = await getFamilyForUser(safeUserId, familyPublicId, db);
  const consent = validateConsent(input);
  let childProfileId = null;
  if (consent.scope === "default_child") {
    const [rows] = await db.execute(
      "SELECT id FROM child_profiles WHERE family_id = ? AND profile_key = 'default' AND status = 'active' LIMIT 1",
      [family.id],
    );
    if (!rows.length) throw notFound("默认儿童使用位不存在");
    childProfileId = Number(rows[0].id);
  }
  const publicId = createPublicId();
  await db.execute(
    `INSERT INTO guardian_consents
      (public_id, user_id, family_id, child_profile_id, consent_type, consent_version,
       decision, document_hash, source)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [publicId, safeUserId, family.id, childProfileId, consent.type, consent.version, consent.decision, consent.documentHash, consent.source],
  );
  return { publicId, ...consent };
}
