import { checkDatabase, closeDatabase, getPool } from "../database.mjs";

const status = await checkDatabase();
if (!status.connected) {
  console.error(`MySQL 连接失败：${status.error || "尚未配置"}`);
  process.exitCode = 1;
} else {
  try {
    const pool = await getPool();
    const [rows] = await pool.query("SELECT COUNT(*) AS count FROM visit_events");
    console.log(`MySQL 连接正常，visit_events 当前 ${rows[0].count} 条记录`);
  } catch (error) {
    console.error(`MySQL 已连接，但表结构未就绪：${error.message}`);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}
