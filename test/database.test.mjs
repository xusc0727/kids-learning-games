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

test("账号底座迁移创建用户、家庭、默认档案约束和加密身份字段", () => {
  const sql = fs.readFileSync(path.join(projectRoot, "database/migrations/004_create_account_foundation.sql"), "utf8");
  for (const table of ["users", "auth_identities", "sessions", "families", "family_members", "child_profiles", "guardian_consents"]) {
    assert.match(sql, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`, "i"));
  }
  assert.match(sql, /provider_subject_hash CHAR\(64\)/i);
  assert.match(sql, /provider_subject_ciphertext VARBINARY\(512\)/i);
  assert.doesNotMatch(sql, /phone_number|raw_phone|password_hash/i);
  assert.match(sql, /uk_family_members_family_user/i);
  assert.match(sql, /uk_child_profiles_family_key/i);
  assert.match(sql, /FOREIGN KEY \(user_id\) REFERENCES users/i);
  assert.match(sql, /FOREIGN KEY \(family_id\) REFERENCES families/i);
  assert.match(sql, /ON DELETE SET NULL/i);
});

test("账号同步迁移为故事增加家庭归属并创建幂等同步表", () => {
  const sql = fs.readFileSync(path.join(projectRoot, "database/migrations/005_create_account_sync.sql"), "utf8");
  assert.match(sql, /ALTER TABLE stories/i);
  assert.match(sql, /ADD COLUMN family_id BIGINT UNSIGNED NULL/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS device_claims/i);
  assert.match(sql, /UNIQUE INDEX uk_device_claims_device \(device_id_hash\)/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS story_favorites/i);
  assert.match(sql, /UNIQUE INDEX uk_story_favorites_child_story/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS literacy_progress/i);
  assert.match(sql, /UNIQUE INDEX uk_literacy_progress_child_character/i);
});

test("手机号登录挑战只保存手机号和验证码摘要", () => {
  const sql = fs.readFileSync(path.join(projectRoot, "database/migrations/006_create_phone_login_challenges.sql"), "utf8");
  assert.match(sql, /CREATE TABLE IF NOT EXISTS phone_login_challenges/i);
  assert.match(sql, /phone_hash CHAR\(64\)/i);
  assert.match(sql, /code_hash CHAR\(64\)/i);
  assert.match(sql, /request_ip_hash CHAR\(64\)/i);
  assert.match(sql, /idx_phone_login_challenges_status_expiry/i);
  assert.doesNotMatch(sql, /phone_number|plain_code|raw_ip/i);
});

test("生产准备迁移记录协议版本和去标识化注销审计", () => {
  const sql = fs.readFileSync(path.join(projectRoot, "database/migrations/007_add_production_readiness.sql"), "utf8");
  assert.match(sql, /ALTER TABLE phone_login_challenges/i);
  assert.match(sql, /legal_version VARCHAR\(32\)/i);
  assert.match(sql, /legal_document_hash CHAR\(64\)/i);
  assert.match(sql, /CREATE TABLE IF NOT EXISTS account_deletion_events/i);
  assert.match(sql, /user_reference_hash CHAR\(64\)/i);
  assert.doesNotMatch(sql, /phone_number|user_public_id\s/i);
});

test("短信认证迁移记录核验方式并允许不保存本地验证码摘要", () => {
  const sql = fs.readFileSync(path.join(projectRoot, "database/migrations/008_add_sms_auth_verification_mode.sql"), "utf8");
  assert.match(sql, /ADD COLUMN verification_mode VARCHAR\(16\)/i);
  assert.match(sql, /MODIFY COLUMN code_hash CHAR\(64\).*NULL/i);
  assert.doesNotMatch(sql, /verify_code|phone_number|raw_phone/i);
});
