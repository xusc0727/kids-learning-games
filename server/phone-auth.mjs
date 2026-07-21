import crypto from "node:crypto";
import { config } from "./config.mjs";
import { getPool } from "./database.mjs";
import {
  attachAuthIdentity,
  createAccountFoundationWithConnection,
  createSession,
  findUserByAuthIdentity,
} from "./account-store.mjs";
import { createPublicId, hashProviderSubject } from "./account-security.mjs";
import {
  phoneVerificationMode,
  sendPhoneLoginCode,
  verifyPhoneLoginCodeWithProvider,
} from "./sms.mjs";
import { ensureLoginLegalConsents, LOGIN_LEGAL } from "./legal.mjs";

const PHONE_PROVIDER = "phone";
const PHONE_APP_ID = "playmori-web";
const MAX_ATTEMPTS = 5;

function inputError(message, statusCode = 400) {
  return Object.assign(new Error(message), { statusCode });
}

function hmac(value, purpose) {
  if (config.phoneOtpSecret.length < 32) throw new Error("PHONE_OTP_SECRET 至少需要 32 位");
  return crypto.createHmac("sha256", config.phoneOtpSecret).update(`${purpose}\0${value}`).digest("hex");
}

export function normalizeMainlandPhone(value) {
  let phone = String(value || "").replace(/[\s()-]/g, "");
  if (phone.startsWith("0086")) phone = `+86${phone.slice(4)}`;
  else if (phone.startsWith("86") && phone.length === 13) phone = `+${phone}`;
  else if (/^1\d{10}$/.test(phone)) phone = `+86${phone}`;
  if (!/^\+861[3-9]\d{9}$/.test(phone)) throw inputError("请输入有效的中国大陆手机号");
  return phone;
}

export function maskPhone(phone) {
  const digits = normalizeMainlandPhone(phone).slice(3);
  return `${digits.slice(0, 3)}****${digits.slice(-4)}`;
}

export function hashPhoneLoginCode(requestId, code, secret = config.phoneOtpSecret) {
  const safeRequestId = String(requestId || "").trim();
  const safeCode = String(code || "").trim();
  if (!/^[a-f0-9-]{36}$/i.test(safeRequestId) || !/^\d{6}$/.test(safeCode)) throw inputError("验证码格式不正确");
  if (String(secret).length < 32) throw new Error("PHONE_OTP_SECRET 至少需要 32 位");
  return crypto.createHmac("sha256", secret).update(`phone-login\0${safeRequestId}\0${safeCode}`).digest("hex");
}

export function createPhoneLoginCode() {
  return String(crypto.randomInt(100000, 1000000));
}

function phoneHash(phone) {
  return hashProviderSubject(PHONE_PROVIDER, PHONE_APP_ID, phone, config.accountIdentityHashSecret);
}

async function rateLimitPhoneLogin(db, safePhoneHash, ipHash) {
  const [rows] = await db.execute(
    `SELECT
       SUM(phone_hash = ? AND created_at >= UTC_TIMESTAMP(3) - INTERVAL 1 MINUTE) AS phone_minute,
       SUM(phone_hash = ? AND created_at >= UTC_TIMESTAMP(3) - INTERVAL 1 HOUR) AS phone_hour,
       SUM(phone_hash = ? AND created_at >= UTC_TIMESTAMP(3) - INTERVAL 1 DAY) AS phone_day,
       SUM(request_ip_hash = ? AND created_at >= UTC_TIMESTAMP(3) - INTERVAL 1 HOUR) AS ip_hour,
       SUM(request_ip_hash = ? AND created_at >= UTC_TIMESTAMP(3) - INTERVAL 1 DAY) AS ip_day
     FROM phone_login_challenges
     WHERE created_at >= UTC_TIMESTAMP(3) - INTERVAL 1 DAY`,
    [safePhoneHash, safePhoneHash, safePhoneHash, ipHash, ipHash],
  );
  const counts = rows[0] || {};
  if (Number(counts.phone_minute) >= 1) throw inputError("验证码发送得太快，请一分钟后再试", 429);
  if (Number(counts.phone_hour) >= 5 || Number(counts.phone_day) >= 10) throw inputError("该手机号今天请求次数过多，请稍后再试", 429);
  if (Number(counts.ip_hour) >= 20 || Number(counts.ip_day) >= 50) throw inputError("当前网络请求次数过多，请稍后再试", 429);
}

export async function requestPhoneLoginCode(input = {}, requestIp = "unknown", options = {}) {
  if (!config.phoneLoginConfigured || !config.smsConfigured) throw inputError("短信登录尚未配置，请稍后再试", 503);
  if (input.legalAccepted !== true) throw inputError("请先阅读并同意用户协议和隐私政策");
  const phone = normalizeMainlandPhone(input.phone);
  const safePhoneHash = phoneHash(phone);
  const ipHash = hmac(String(requestIp || "unknown"), "request-ip");
  const db = options.connection || await getPool();
  await db.execute(
    `DELETE FROM phone_login_challenges
     WHERE created_at < UTC_TIMESTAMP(3) - INTERVAL ${config.phoneChallengeRetentionDays} DAY`,
  );
  await rateLimitPhoneLogin(db, safePhoneHash, ipHash);

  const requestId = createPublicId();
  const verificationMode = options.verificationMode || phoneVerificationMode();
  if (!["local", "aliyun-auth"].includes(verificationMode)) throw new Error("不支持的验证码核验方式");
  const code = verificationMode === "local" ? createPhoneLoginCode() : null;
  const now = options.now instanceof Date ? options.now : new Date();
  const expiresAt = new Date(now.getTime() + config.phoneOtpTtlMinutes * 60_000);
  const codeHash = code ? hashPhoneLoginCode(requestId, code) : null;

  await db.execute(
    `UPDATE phone_login_challenges
     SET status = 'expired'
     WHERE phone_hash = ? AND status IN ('pending', 'sent')`,
    [safePhoneHash],
  );
  await db.execute(
    `INSERT INTO phone_login_challenges
      (public_id, phone_hash, phone_hint, verification_mode, code_hash, request_ip_hash, legal_version,
       legal_document_hash, status, attempts, expires_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?, ?)`,
    [requestId, safePhoneHash, maskPhone(phone), verificationMode, codeHash, ipHash,
      LOGIN_LEGAL.version, LOGIN_LEGAL.documentHash, expiresAt, now],
  );

  try {
    const delivery = await (options.sendCode || sendPhoneLoginCode)(phone, code, requestId);
    await db.execute(
      "UPDATE phone_login_challenges SET status = 'sent', sent_at = ? WHERE public_id = ? AND status = 'pending'",
      [new Date(), requestId],
    );
    return {
      requestId,
      phoneHint: maskPhone(phone),
      expiresInSeconds: config.phoneOtpTtlMinutes * 60,
      ...(delivery.debugCode ? { debugCode: delivery.debugCode } : {}),
    };
  } catch (error) {
    await db.execute("UPDATE phone_login_challenges SET status = 'failed' WHERE public_id = ?", [requestId]);
    throw error;
  }
}

async function primaryFamily(userId, connection) {
  const [rows] = await connection.execute(
    `SELECT
       f.id, f.public_id, f.display_name, fm.role,
       cp.id AS child_id, cp.public_id AS child_public_id, cp.nickname, cp.age_band, cp.avatar_key
     FROM family_members fm
     INNER JOIN families f ON f.id = fm.family_id AND f.status = 'active'
     INNER JOIN child_profiles cp ON cp.family_id = f.id AND cp.profile_key = 'default' AND cp.status = 'active'
     WHERE fm.user_id = ? AND fm.status = 'active'
     ORDER BY (fm.role = 'owner') DESC, fm.joined_at ASC
     LIMIT 1`,
    [userId],
  );
  if (!rows.length) throw new Error("账号缺少有效家庭空间");
  const row = rows[0];
  return {
    id: Number(row.id),
    publicId: row.public_id,
    displayName: row.display_name,
    role: row.role,
    defaultChild: {
      id: Number(row.child_id),
      publicId: row.child_public_id,
      nickname: row.nickname,
      ageBand: row.age_band,
      avatarKey: row.avatar_key,
    },
  };
}

export async function verifyPhoneLoginCode(input = {}, options = {}) {
  if (!config.phoneLoginConfigured) throw inputError("手机号登录尚未配置，请稍后再试", 503);
  if (input.legalAccepted !== true) throw inputError("请先阅读并同意用户协议和隐私政策");
  const requestId = String(input.requestId || "").trim().toLowerCase();
  const phone = normalizeMainlandPhone(input.phone);
  const code = String(input.code || "").trim();
  if (!/^\d{6}$/.test(code)) throw inputError("验证码格式不正确");
  const submittedPhoneHash = phoneHash(phone);
  const pool = options.pool || await getPool();
  const connection = await pool.getConnection();
  let deferredError;

  try {
    await connection.beginTransaction();
    const [challengeRows] = await connection.execute(
      `SELECT id, phone_hash, verification_mode, code_hash, legal_version, legal_document_hash, status, attempts, expires_at
       FROM phone_login_challenges
       WHERE public_id = ?
       LIMIT 1 FOR UPDATE`,
      [requestId],
    );
    const challenge = challengeRows[0];
    const now = options.now instanceof Date ? options.now : new Date();
    const expired = !challenge || new Date(challenge.expires_at).getTime() <= now.getTime();
    const legalCurrent = challenge?.legal_version === LOGIN_LEGAL.version
      && challenge?.legal_document_hash === LOGIN_LEGAL.documentHash;
    if (!challenge || challenge.status !== "sent" || expired || !legalCurrent || Number(challenge.attempts) >= MAX_ATTEMPTS) {
      if (challenge && expired && challenge.status === "sent") {
        await connection.execute("UPDATE phone_login_challenges SET status = 'expired' WHERE id = ?", [challenge.id]);
      }
      deferredError = inputError("验证码已失效，请重新获取");
      await connection.commit();
      throw deferredError;
    }

    const phoneMatches = crypto.timingSafeEqual(Buffer.from(challenge.phone_hash), Buffer.from(submittedPhoneHash));
    let codeMatches = false;
    if (phoneMatches && challenge.verification_mode === "aliyun-auth") {
      codeMatches = await (options.verifyProviderCode || verifyPhoneLoginCodeWithProvider)(phone, requestId, code);
    } else if (phoneMatches && (!challenge.verification_mode || challenge.verification_mode === "local") && challenge.code_hash) {
      const submittedCodeHash = hashPhoneLoginCode(requestId, code);
      codeMatches = crypto.timingSafeEqual(Buffer.from(challenge.code_hash), Buffer.from(submittedCodeHash));
    }
    if (!phoneMatches || !codeMatches) {
      const attempts = Number(challenge.attempts) + 1;
      await connection.execute(
        "UPDATE phone_login_challenges SET attempts = ?, status = ? WHERE id = ?",
        [attempts, attempts >= MAX_ATTEMPTS ? "locked" : "sent", challenge.id],
      );
      deferredError = inputError(attempts >= MAX_ATTEMPTS ? "验证码已失效，请重新获取" : "验证码不正确");
      await connection.commit();
      throw deferredError;
    }

    await connection.execute(
      "UPDATE phone_login_challenges SET status = 'consumed', consumed_at = ? WHERE id = ?",
      [now, challenge.id],
    );

    let user = await findUserByAuthIdentity({ provider: PHONE_PROVIDER, providerAppId: PHONE_APP_ID, subject: phone }, connection);
    let family;
    let isNewUser = false;
    if (!user) {
      const foundation = await createAccountFoundationWithConnection({ now }, connection);
      await attachAuthIdentity(foundation.user.id, {
        provider: PHONE_PROVIDER,
        providerAppId: PHONE_APP_ID,
        subject: phone,
        hint: maskPhone(phone),
        verifiedAt: now,
      }, connection);
      user = foundation.user;
      family = { ...foundation.family, defaultChild: foundation.defaultChild };
      isNewUser = true;
    } else {
      family = await primaryFamily(user.id, connection);
      await connection.execute(
        "UPDATE auth_identities SET last_used_at = ? WHERE id = ?",
        [now, user.identityId],
      );
    }
    await ensureLoginLegalConsents(connection, { userId: user.id, familyId: family.id }, now);
    await connection.execute("UPDATE users SET last_login_at = ? WHERE id = ?", [now, user.id]);
    const session = await createSession(user.id, { now, ttlDays: config.sessionTtlDays }, connection);
    await connection.commit();
    return {
      user: { publicId: user.publicId, displayName: user.displayName, phoneHint: maskPhone(phone) },
      family: {
        publicId: family.publicId,
        displayName: family.displayName,
        role: family.role,
        defaultChild: {
          publicId: family.defaultChild.publicId,
          nickname: family.defaultChild.nickname,
          ageBand: family.defaultChild.ageBand,
          avatarKey: family.defaultChild.avatarKey,
        },
      },
      session,
      isNewUser,
    };
  } catch (error) {
    if (error !== deferredError) await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
}
