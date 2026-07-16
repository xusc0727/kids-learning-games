import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { databaseConnectionOptions } from "../server/database.mjs";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("MySQL 连接默认使用 UTC、utf8mb4 与受限连接池", () => {
  const options = databaseConnectionOptions();
  assert.equal(options.charset, "utf8mb4");
  assert.equal(options.timezone, "Z");
  assert.ok(options.connectionLimit >= 1 && options.connectionLimit <= 20);
  assert.equal(options.multipleStatements, undefined);
});

test("首次迁移创建访客表及必要索引", () => {
  const sql = fs.readFileSync(path.join(projectRoot, "database/migrations/001_create_visit_events.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS visit_events/i);
  assert.match(sql, /ENGINE=InnoDB/i);
  assert.match(sql, /CHARSET=utf8mb4/i);
  assert.match(sql, /idx_visit_events_occurred_at/i);
  assert.match(sql, /idx_visit_events_visitor_day/i);
  assert.doesNotMatch(sql, /raw_ip|ip_address/i);
});
