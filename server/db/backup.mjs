import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createWriteStream } from "node:fs";
import { spawn } from "node:child_process";
import { pipeline } from "node:stream/promises";
import { createGzip } from "node:zlib";
import { config } from "../config.mjs";

if (!config.databaseConfigured || !config.databasePassword) throw new Error("数据库配置不完整，无法备份");
const backupDir = path.resolve(config.backupDir);
if ([path.parse(backupDir).root, os.homedir(), path.resolve(process.cwd())].includes(backupDir)) {
  throw new Error("BACKUP_DIR 不能指向根目录、用户目录或项目目录");
}
await fs.mkdir(backupDir, { recursive: true, mode: 0o700 });
const stamp = new Date().toISOString().replace(/[:.]/g, "-");
const outputPath = path.join(backupDir, `playmori-${stamp}.sql.gz`);
const args = [
  `--host=${config.databaseHost}`,
  `--port=${config.databasePort}`,
  `--user=${config.databaseUser}`,
  "--single-transaction",
  "--quick",
  "--no-tablespaces",
  "--set-gtid-purged=OFF",
  "--default-character-set=utf8mb4",
  config.databaseName,
];
const child = spawn("mysqldump", args, {
  stdio: ["ignore", "pipe", "pipe"],
  env: { ...process.env, MYSQL_PWD: config.databasePassword },
});
let stderr = "";
child.stderr.on("data", (chunk) => { stderr = `${stderr}${chunk}`.slice(-4000); });
const exitCode = new Promise((resolve, reject) => {
  child.once("error", reject);
  child.once("close", resolve);
});
try {
  const output = createWriteStream(outputPath, { mode: 0o600 });
  const [code] = await Promise.all([exitCode, pipeline(child.stdout, createGzip({ level: 9 }), output)]);
  if (code !== 0) throw new Error(`mysqldump 失败（${code}）：${stderr.trim()}`);
} catch (error) {
  await fs.unlink(outputPath).catch(() => {});
  throw error;
}

const cutoff = Date.now() - config.backupRetentionDays * 86_400_000;
const files = await fs.readdir(backupDir, { withFileTypes: true });
for (const file of files) {
  if (!file.isFile() || !/^playmori-\d{4}-.*\.sql\.gz$/.test(file.name)) continue;
  const target = path.join(backupDir, file.name);
  const stat = await fs.stat(target);
  if (stat.mtimeMs < cutoff) await fs.unlink(target);
}
console.log(`数据库备份完成：${outputPath}`);
