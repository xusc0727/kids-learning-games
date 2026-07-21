import crypto from "node:crypto";

const AGE_BANDS = new Set(["3-4", "4-5", "5-6"]);
const SESSION_TOKEN_PATTERN = /^[A-Za-z0-9_-]{40,128}$/;
const IDENTIFIER_PATTERN = /^[a-z][a-z0-9_-]{0,79}$/;
const HASH_PATTERN = /^[a-f0-9]{64}$/;

function inputError(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

function cleanOptionalText(value, maxLength, label) {
  const text = String(value ?? "")
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!text) return null;
  if ([...text].length > maxLength) throw inputError(`${label}不能超过 ${maxLength} 个字符`);
  return text;
}

function requiredIdentifier(value, label, maxLength = 80) {
  const text = String(value ?? "").trim().toLowerCase();
  if (!text || text.length > maxLength || !IDENTIFIER_PATTERN.test(text)) {
    throw inputError(`${label}格式不正确`);
  }
  return text;
}

export function validateDisplayName(value) {
  return cleanOptionalText(value, 40, "显示名称");
}

export function validateFamilyName(value) {
  return cleanOptionalText(value, 60, "家庭名称");
}

export function validateChildProfile(input = {}) {
  const ageBand = String(input.ageBand ?? "").trim();
  if (ageBand && !AGE_BANDS.has(ageBand)) throw inputError("年龄段不正确");
  const avatarKey = String(input.avatarKey ?? "").trim().toLowerCase();
  if (avatarKey && !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(avatarKey)) throw inputError("系统头像标识不正确");
  return {
    nickname: cleanOptionalText(input.nickname, 32, "小名"),
    ageBand: ageBand || null,
    avatarKey: avatarKey || null,
  };
}

export function validateConsent(input = {}) {
  const consentType = requiredIdentifier(input.type, "同意类型", 48);
  const version = String(input.version ?? "").trim();
  const decision = String(input.decision ?? "").trim().toLowerCase();
  const documentHash = String(input.documentHash ?? "").trim().toLowerCase();
  const source = requiredIdentifier(input.source, "同意来源", 24);
  const scope = input.scope === "default_child" ? "default_child" : "family";
  if (!version || version.length > 32 || !/^[A-Za-z0-9._-]+$/.test(version)) throw inputError("同意版本格式不正确");
  if (!new Set(["granted", "withdrawn"]).has(decision)) throw inputError("同意决定不正确");
  if (!HASH_PATTERN.test(documentHash)) throw inputError("同意文档哈希格式不正确");
  return { type: consentType, version, decision, documentHash, source, scope };
}

export function createPublicId() {
  return crypto.randomUUID();
}

export function createSessionToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function hashSessionToken(value) {
  const token = String(value ?? "").trim();
  if (!SESSION_TOKEN_PATTERN.test(token)) throw Object.assign(new Error("登录会话无效"), { statusCode: 401 });
  return crypto.createHash("sha256").update(token).digest("hex");
}

export function normalizeSessionTtlDays(value, fallback = 30) {
  return Math.min(90, Math.max(1, Number.parseInt(value || fallback, 10) || fallback));
}

export function createSessionCookie(token, options = {}) {
  hashSessionToken(token);
  const name = options.name || "playmori_session";
  const ttlDays = normalizeSessionTtlDays(options.ttlDays);
  const secure = options.secure !== false;
  const parts = [
    `${name}=${token}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${ttlDays * 86_400}`,
  ];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function clearSessionCookie(options = {}) {
  const name = options.name || "playmori_session";
  const secure = options.secure !== false;
  const parts = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"];
  if (secure) parts.push("Secure");
  return parts.join("; ");
}

export function readCookie(cookieHeader, name = "playmori_session") {
  const pairs = String(cookieHeader || "").split(";");
  for (const pair of pairs) {
    const separator = pair.indexOf("=");
    if (separator < 0) continue;
    const key = pair.slice(0, separator).trim();
    if (key !== name) continue;
    try {
      return decodeURIComponent(pair.slice(separator + 1).trim());
    } catch {
      return "";
    }
  }
  return "";
}

export function hashProviderSubject(provider, providerAppId, subject, secret) {
  const safeProvider = requiredIdentifier(provider, "登录渠道", 32);
  const safeAppId = String(providerAppId ?? "").trim();
  const safeSubject = String(subject ?? "").trim();
  const safeSecret = String(secret ?? "");
  if (!safeAppId || safeAppId.length > 80) throw inputError("渠道应用标识格式不正确");
  if (!safeSubject || safeSubject.length > 256) throw inputError("登录身份标识格式不正确");
  if (safeSecret.length < 32) throw new Error("ACCOUNT_IDENTITY_HASH_SECRET 至少需要 32 位");
  return crypto.createHmac("sha256", safeSecret).update(`${safeProvider}\0${safeAppId}\0${safeSubject}`).digest("hex");
}

function parseEncryptionKey(value) {
  const input = String(value || "").trim();
  let key;
  if (/^[a-fA-F0-9]{64}$/.test(input)) key = Buffer.from(input, "hex");
  else {
    try {
      key = Buffer.from(input, "base64");
    } catch {
      key = Buffer.alloc(0);
    }
  }
  if (key.length !== 32) throw new Error("ACCOUNT_IDENTITY_ENCRYPTION_KEY 必须是 32 字节的十六进制或 Base64 密钥");
  return key;
}

export function encryptProviderSubject(subject, encryptionKey, context = "playmori-identity-v1") {
  const plaintext = String(subject ?? "").trim();
  if (!plaintext || plaintext.length > 256) throw inputError("登录身份标识格式不正确");
  const key = parseEncryptionKey(encryptionKey);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([Buffer.from([1]), iv, tag, ciphertext]);
}

export function decryptProviderSubject(payload, encryptionKey, context = "playmori-identity-v1") {
  const data = Buffer.from(payload || []);
  if (data.length < 30 || data[0] !== 1) throw new Error("登录身份密文格式不正确");
  const key = parseEncryptionKey(encryptionKey);
  const iv = data.subarray(1, 13);
  const tag = data.subarray(13, 29);
  const ciphertext = data.subarray(29);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}
