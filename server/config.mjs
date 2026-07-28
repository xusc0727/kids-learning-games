import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(serverDir, "..");

function loadEnvFile() {
  const configuredPath = String(process.env.PLAYMORI_ENV_FILE || "").trim();
  const envPath = configuredPath ? path.resolve(configuredPath) : path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) {
    if (configuredPath) throw new Error(`环境变量文件不存在：${envPath}`);
    return;
  }

  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separator = trimmed.indexOf("=");
    if (separator < 1) continue;
    const key = trimmed.slice(0, separator).trim();
    let value = trimmed.slice(separator + 1).trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnvFile();

function hasValidIdentityEncryptionKey(value) {
  const input = String(value || "").trim();
  if (/^[a-fA-F0-9]{64}$/.test(input)) return true;
  if (input.length < 43) return false;
  try {
    return Buffer.from(input, "base64").length === 32;
  } catch {
    return false;
  }
}

export const config = {
  nodeEnv: process.env.NODE_ENV || "development",
  host: process.env.HOST || (process.env.NODE_ENV === "production" ? "127.0.0.1" : "0.0.0.0"),
  port: Number.parseInt(process.env.PORT || "4173", 10),
  aiStoryGenerationEnabled: process.env.AI_STORY_GENERATION_ENABLED === "true",
  deepseekApiKey: process.env.DEEPSEEK_API_KEY || "",
  deepseekModel: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
  deepseekBaseUrl: (process.env.DEEPSEEK_BASE_URL || "https://api.deepseek.com").replace(/\/$/, ""),
  databaseEnabled: process.env.DB_ENABLED === "true",
  databaseHost: process.env.DB_HOST || "127.0.0.1",
  databasePort: Number.parseInt(process.env.DB_PORT || "3306", 10),
  databaseName: process.env.DB_NAME || "",
  databaseUser: process.env.DB_USER || "",
  databasePassword: process.env.DB_PASSWORD || "",
  databaseConnectionLimit: Math.min(20, Math.max(1, Number.parseInt(process.env.DB_CONNECTION_LIMIT || "5", 10))),
  databaseConnectTimeout: Math.min(30_000, Math.max(1_000, Number.parseInt(process.env.DB_CONNECT_TIMEOUT || "10000", 10))),
  databaseSsl: process.env.DB_SSL === "true",
  databaseSslRejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",
  databaseSslCaPath: process.env.DB_SSL_CA_PATH || "",
  analyticsEnabled: process.env.ANALYTICS_ENABLED !== "false",
  analyticsSalt: process.env.ANALYTICS_SALT || "",
  analyticsDir: process.env.ANALYTICS_DIR || "/var/lib/playmori/analytics",
  analyticsRetentionDays: Math.min(365, Math.max(1, Number.parseInt(process.env.ANALYTICS_RETENTION_DAYS || "30", 10))),
  sessionCookieName: process.env.SESSION_COOKIE_NAME || "playmori_session",
  sessionCookieSecure: process.env.SESSION_COOKIE_SECURE !== "false",
  sessionTtlDays: Math.min(90, Math.max(1, Number.parseInt(process.env.SESSION_TTL_DAYS || "30", 10))),
  accountIdentityHashSecret: process.env.ACCOUNT_IDENTITY_HASH_SECRET || "",
  accountIdentityEncryptionKey: process.env.ACCOUNT_IDENTITY_ENCRYPTION_KEY || "",
  phoneOtpSecret: process.env.PHONE_OTP_SECRET || "",
  phoneOtpTtlMinutes: Math.min(10, Math.max(3, Number.parseInt(process.env.PHONE_OTP_TTL_MINUTES || "5", 10))),
  phoneChallengeRetentionDays: Math.min(90, Math.max(7, Number.parseInt(process.env.PHONE_CHALLENGE_RETENTION_DAYS || "30", 10))),
  smsProvider: (process.env.SMS_PROVIDER || "disabled").trim().toLowerCase(),
  aliyunAccessKeyId: process.env.ALIBABA_CLOUD_ACCESS_KEY_ID || "",
  aliyunAccessKeySecret: process.env.ALIBABA_CLOUD_ACCESS_KEY_SECRET || "",
  aliyunSmsAuthSignName: process.env.ALIYUN_SMS_AUTH_SIGN_NAME || "",
  aliyunSmsAuthTemplateCode: process.env.ALIYUN_SMS_AUTH_TEMPLATE_CODE || "",
  aliyunSmsAuthSchemeName: String(process.env.ALIYUN_SMS_AUTH_SCHEME_NAME || "").trim(),
  publicOperatorName: String(process.env.PUBLIC_OPERATOR_NAME || "").trim(),
  publicContactChannel: String(process.env.PUBLIC_CONTACT_CHANNEL || "").trim(),
  publicPrivacyEmail: String(process.env.PUBLIC_PRIVACY_EMAIL || "").trim(),
  backupDir: process.env.BACKUP_DIR || "/var/backups/playmori",
  backupRetentionDays: Math.min(365, Math.max(7, Number.parseInt(process.env.BACKUP_RETENTION_DAYS || "30", 10))),
  maxRequestBytes: 24 * 1024,
};

config.analyticsConfigured = config.analyticsEnabled && config.analyticsSalt.length >= 16;
config.databaseConfigured = config.databaseEnabled && Boolean(config.databaseHost && config.databaseName && config.databaseUser);
config.accountIdentityConfigured = config.accountIdentityHashSecret.length >= 32
  && hasValidIdentityEncryptionKey(config.accountIdentityEncryptionKey);
config.phoneLoginConfigured = config.accountIdentityConfigured && config.phoneOtpSecret.length >= 32;
config.smsConfigured = config.phoneLoginConfigured && (
  (config.smsProvider === "console" && config.nodeEnv !== "production")
  || (config.smsProvider === "aliyun-auth"
    && Boolean(config.aliyunAccessKeyId && config.aliyunAccessKeySecret
      && config.aliyunSmsAuthSignName && config.aliyunSmsAuthTemplateCode)
    && config.aliyunSmsAuthSchemeName.length <= 20)
);
