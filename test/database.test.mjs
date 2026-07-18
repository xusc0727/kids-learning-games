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

test("故事迁移创建统一故事表和设备历史索引", () => {
  const sql = fs.readFileSync(path.join(projectRoot, "database/migrations/002_create_stories.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS stories/i);
  assert.match(sql, /story_content JSON NOT NULL/i);
  assert.match(sql, /questions JSON NOT NULL/i);
  assert.match(sql, /uk_stories_story_key/i);
  assert.match(sql, /idx_stories_source_domain_status/i);
  assert.match(sql, /idx_stories_device_created/i);
  assert.doesNotMatch(sql, /input_event|child_name|preferences/i);
});

test("识字迁移创建内容表和主题排序索引", () => {
  const sql = fs.readFileSync(path.join(projectRoot, "database/migrations/003_create_literacy_characters.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS literacy_characters/i);
  assert.match(sql, /character_value VARCHAR\(8\) NOT NULL/i);
  assert.match(sql, /uk_literacy_characters_value/i);
  assert.match(sql, /idx_literacy_characters_theme_status_sort/i);
});
