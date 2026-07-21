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
    const [userRows] = await pool.query("SELECT COUNT(*) AS count FROM users WHERE status = 'active'");
    const [familyRows] = await pool.query("SELECT COUNT(*) AS count FROM families WHERE status = 'active'");
    const [defaultChildRows] = await pool.query("SELECT COUNT(*) AS count FROM child_profiles WHERE status = 'active' AND profile_key = 'default'");
    const [favoriteRows] = await pool.query("SELECT COUNT(*) AS count FROM story_favorites");
    const [progressRows] = await pool.query("SELECT COUNT(*) AS count FROM literacy_progress WHERE status = 'learned'");
    const [challengeRows] = await pool.query("SELECT COUNT(*) AS count FROM phone_login_challenges WHERE status = 'sent' AND expires_at > UTC_TIMESTAMP(3)");
    const [deletionRows] = await pool.query("SELECT COUNT(*) AS count FROM account_deletion_events");
    const counts = Object.fromEntries(storyRows.map((row) => [row.source, Number(row.count)]));
    console.log(`MySQL 连接正常：visit_events ${visitRows[0].count} 条，预设故事 ${counts.fixed || 0} 篇，AI 故事 ${counts.ai || 0} 篇，识字内容 ${literacyRows[0].count} 个，用户 ${userRows[0].count} 个，家庭 ${familyRows[0].count} 个，默认儿童使用位 ${defaultChildRows[0].count} 个，收藏 ${favoriteRows[0].count} 条，识字进度 ${progressRows[0].count} 条，有效登录验证码 ${challengeRows[0].count} 个，注销审计 ${deletionRows[0].count} 条`);
  } catch (error) {
    console.error(`MySQL 已连接，但表结构未就绪：${error.message}`);
    process.exitCode = 1;
  } finally {
    await closeDatabase();
  }
}
