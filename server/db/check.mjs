import { checkDatabase, closeDatabase, getPool } from "../database.mjs";

const status = await checkDatabase();
if (!status.connected) {
  console.error(`MySQL 连接失败：${status.error || "尚未配置"}`);
  process.exitCode = 1;
} else {
  try {
    const pool = await getPool();
    const [visitRows] = await pool.query("SELECT COUNT(*) AS count FROM visit_events");
    const [storyRows] = await pool.query("SELECT source, COUNT(*) AS count FROM stories GROUP BY source");
    const [literacyRows] = await pool.query("SELECT COUNT(*) AS count FROM literacy_characters WHERE status = 'active'");
    const counts = Object.fromEntries(storyRows.map((row) => [row.source, Number(row.count)]));
    console.log(`MySQL 连接正常：visit_events ${visitRows[0].count} 条，预设故事 ${counts.fixed || 0} 篇，AI 故事 ${counts.ai || 0} 篇，识字内容 ${literacyRows[0].count} 个`);
  } catch (error) {
    console.error(`MySQL 已连接，但表结构未就绪：${error.message}`);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}
