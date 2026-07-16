import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "../config.mjs";
import { databaseConnectionOptions } from "../database.mjs";

if (!config.databaseConfigured) {
  console.error("MySQL 未配置，请先在 .env 中填写 DB_HOST、DB_NAME、DB_USER 和 DB_PASSWORD");
  process.exitCode = 1;
} else {
  const { createConnection } = await import("mysql2/promise");
  const connection = await createConnection(databaseConnectionOptions({ multipleStatements: true }));
  try {
    await connection.query(`CREATE TABLE IF NOT EXISTS schema_migrations (
      name VARCHAR(191) NOT NULL PRIMARY KEY,
      applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`);

    const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../database/migrations");
    const files = (await fs.readdir(migrationsDir)).filter((name) => /^\d+.*\.sql$/.test(name)).sort();
    const [appliedRows] = await connection.query("SELECT name FROM schema_migrations");
    const applied = new Set(appliedRows.map((row) => row.name));

    for (const file of files) {
      if (applied.has(file)) continue;
      const sql = await fs.readFile(path.join(migrationsDir, file), "utf8");
      await connection.query(sql);
      await connection.execute("INSERT INTO schema_migrations (name) VALUES (?)", [file]);
      console.log(`已应用迁移：${file}`);
    }
    console.log(`数据库迁移完成，共检查 ${files.length} 个文件`);
  } finally {
    await connection.end();
  }
}
