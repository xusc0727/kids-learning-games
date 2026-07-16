import fs from "node:fs";
import { config } from "./config.mjs";

let poolPromise;

export function databaseConnectionOptions(overrides = {}) {
  const ssl = config.databaseSsl
    ? {
        rejectUnauthorized: config.databaseSslRejectUnauthorized,
        ...(config.databaseSslCaPath ? { ca: fs.readFileSync(config.databaseSslCaPath, "utf8") } : {}),
      }
    : undefined;

  return {
    host: config.databaseHost,
    port: config.databasePort,
    user: config.databaseUser,
    password: config.databasePassword,
    database: config.databaseName,
    charset: "utf8mb4",
    timezone: "Z",
    waitForConnections: true,
    connectionLimit: config.databaseConnectionLimit,
    connectTimeout: config.databaseConnectTimeout,
    enableKeepAlive: true,
    keepAliveInitialDelay: 0,
    ...(ssl ? { ssl } : {}),
    ...overrides,
  };
}

export async function getPool() {
  if (!config.databaseConfigured) throw new Error("MySQL 尚未配置");
  if (!poolPromise) {
    poolPromise = import("mysql2/promise").then(({ createPool }) => createPool(databaseConnectionOptions()));
  }
  return poolPromise;
}

export async function checkDatabase() {
  if (!config.databaseConfigured) return { configured: false, connected: false };
  try {
    const pool = await getPool();
    await pool.query("SELECT 1");
    return { configured: true, connected: true };
  } catch (error) {
    return { configured: true, connected: false, error: error.code || error.message };
  }
}

export async function insertVisitEvent(event) {
  const pool = await getPool();
  await pool.execute(
    `INSERT INTO visit_events
      (occurred_at, visit_day, visitor_hash, session_id, path, referrer, device, browser, os, language, screen)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [new Date(event.time), event.day, event.visitor, event.session, event.path, event.referrer, event.device, event.browser, event.os, event.language, event.screen],
  );
}

export async function readVisitEvents(days) {
  const pool = await getPool();
  const safeDays = Math.min(365, Math.max(1, Number(days) || 7));
  const cutoff = new Date(Date.now() - safeDays * 86_400_000);
  const [rows] = await pool.execute(
    `SELECT
       DATE_FORMAT(occurred_at, '%Y-%m-%dT%H:%i:%s.%fZ') AS time,
       DATE_FORMAT(visit_day, '%Y-%m-%d') AS day,
       visitor_hash AS visitor,
       session_id AS session,
       path, referrer, device, browser, os, language, screen
     FROM visit_events
     WHERE occurred_at >= ?
     ORDER BY occurred_at ASC`,
    [cutoff],
  );
  return rows;
}

export async function deleteExpiredVisits(retentionDays) {
  const pool = await getPool();
  const safeDays = Math.min(3650, Math.max(1, Number(retentionDays) || 30));
  const cutoff = new Date(Date.now() - safeDays * 86_400_000);
  const [result] = await pool.execute("DELETE FROM visit_events WHERE occurred_at < ?", [cutoff]);
  return result.affectedRows || 0;
}

export async function closeDatabase() {
  if (!poolPromise) return;
  const pool = await poolPromise;
  await pool.end();
  poolPromise = undefined;
}
