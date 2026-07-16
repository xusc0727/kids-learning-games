import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const serverDir = path.dirname(fileURLToPath(import.meta.url));
export const projectRoot = path.resolve(serverDir, "..");

function loadEnvFile() {
  const envPath = path.join(projectRoot, ".env");
  if (!fs.existsSync(envPath)) return;

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

export const config = {
  port: Number.parseInt(process.env.PORT || "4173", 10),
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
  maxRequestBytes: 24 * 1024,
};

config.analyticsConfigured = config.analyticsEnabled && config.analyticsSalt.length >= 16;
config.databaseConfigured = config.databaseEnabled && Boolean(config.databaseHost && config.databaseName && config.databaseUser);
