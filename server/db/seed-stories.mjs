import { FIXED_STORIES } from "../../database/fixed-stories.mjs";
import { closeDatabase, getPool } from "../database.mjs";
import { upsertFixedStories } from "../story-store.mjs";

const pool = await getPool();
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  const count = await upsertFixedStories(FIXED_STORIES, connection);
  await connection.commit();
  console.log(`预设故事同步完成，共 ${count} 篇`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await closeDatabase();
}
