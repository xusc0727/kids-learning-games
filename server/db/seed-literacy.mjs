import { LITERACY_CHARACTERS } from "../../database/literacy-characters.mjs";
import { closeDatabase, getPool } from "../database.mjs";
import { upsertLiteracyCharacters } from "../literacy-store.mjs";

const pool = await getPool();
const connection = await pool.getConnection();
try {
  await connection.beginTransaction();
  const count = await upsertLiteracyCharacters(LITERACY_CHARACTERS, connection);
  await connection.commit();
  console.log(`识字内容同步完成，共 ${count} 个汉字`);
} catch (error) {
  await connection.rollback();
  throw error;
} finally {
  connection.release();
  await closeDatabase();
}
