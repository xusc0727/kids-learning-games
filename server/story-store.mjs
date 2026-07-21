import { getPool } from "./database.mjs";

function parseList(value) {
  if (Array.isArray(value)) return value;
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function mapStoryRow(row) {
  return {
    id: row.story_key,
    source: row.source,
    domain: row.domain,
    age: row.age_label,
    duration: row.duration_label,
    title: row.title,
    summary: row.summary,
    learningGoal: row.learning_goal,
    story: parseList(row.story_content),
    questions: parseList(row.questions),
    action: row.action_text,
    parentTip: row.parent_tip,
    createdAt: row.created_at instanceof Date ? row.created_at.toISOString() : row.created_at,
  };
}

const STORY_SELECT = `SELECT
  story_key, source, domain, age_label, duration_label, title, summary,
  learning_goal, story_content, questions, action_text, parent_tip, created_at
FROM stories`;

export function validateDeviceId(value) {
  const deviceId = String(value || "").trim();
  if (!/^[A-Za-z0-9-]{20,64}$/.test(deviceId)) {
    throw Object.assign(new Error("当前设备标识无效，请刷新页面后重试"), { statusCode: 400 });
  }
  return deviceId;
}

export async function upsertFixedStories(stories, connection) {
  const pool = connection || await getPool();
  let count = 0;
  for (const story of stories) {
    await pool.execute(
      `INSERT INTO stories
        (story_key, source, domain, age_label, duration_label, title, summary, learning_goal,
         story_content, questions, action_text, parent_tip, device_id, model_name, status)
       VALUES (?, 'fixed', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, NULL, 'active')
       ON DUPLICATE KEY UPDATE
         source = VALUES(source), domain = VALUES(domain), age_label = VALUES(age_label),
         duration_label = VALUES(duration_label), title = VALUES(title), summary = VALUES(summary),
         learning_goal = VALUES(learning_goal), story_content = VALUES(story_content),
         questions = VALUES(questions), action_text = VALUES(action_text),
         parent_tip = VALUES(parent_tip), device_id = NULL, model_name = NULL, status = 'active'`,
      [
        story.id,
        story.domain,
        story.age,
        story.duration,
        story.title,
        story.summary,
        story.learningGoal,
        JSON.stringify(story.story),
        JSON.stringify(story.questions),
        story.action,
        story.parentTip,
      ],
    );
    count += 1;
  }
  return count;
}

export async function listFixedStories() {
  const pool = await getPool();
  const [rows] = await pool.query(
    `${STORY_SELECT}
     WHERE source = 'fixed' AND status = 'active'
     ORDER BY FIELD(domain, 'health', 'language', 'social', 'science', 'art'), id`,
  );
  return rows.map(mapStoryRow);
}

export async function insertGeneratedStory(story, deviceId, modelName, ownership = {}) {
  const pool = await getPool();
  const safeDeviceId = validateDeviceId(deviceId);
  await pool.execute(
    `INSERT INTO stories
      (story_key, source, domain, age_label, duration_label, title, summary, learning_goal,
       story_content, questions, action_text, parent_tip, device_id, model_name,
       family_id, child_profile_id, created_by_user_id, status, created_at)
     VALUES (?, 'ai', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)`,
    [
      story.id,
      story.domain,
      story.age,
      story.duration,
      story.title,
      story.summary,
      story.learningGoal,
      JSON.stringify(story.story),
      JSON.stringify(story.questions),
      story.action,
      story.parentTip,
      safeDeviceId,
      modelName,
      ownership.familyId || null,
      ownership.childProfileId || null,
      ownership.userId || null,
      new Date(story.createdAt),
    ],
  );
}

export async function listGeneratedStories(deviceId, limit = 12) {
  const pool = await getPool();
  const safeDeviceId = validateDeviceId(deviceId);
  const safeLimit = Math.min(50, Math.max(1, Number(limit) || 12));
  const [rows] = await pool.execute(
    `${STORY_SELECT}
     WHERE source = 'ai' AND status = 'active' AND device_id = ?
     ORDER BY created_at DESC
     LIMIT ${safeLimit}`,
    [safeDeviceId],
  );
  return rows.map(mapStoryRow);
}

export async function deleteGeneratedStories(deviceId) {
  const pool = await getPool();
  const safeDeviceId = validateDeviceId(deviceId);
  const [result] = await pool.execute(
    "DELETE FROM stories WHERE source = 'ai' AND device_id = ? AND family_id IS NULL",
    [safeDeviceId],
  );
  return result.affectedRows || 0;
}
