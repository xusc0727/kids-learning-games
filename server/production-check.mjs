import { config } from "./config.mjs";
import { checkDatabase, closeDatabase } from "./database.mjs";
import { productionReadiness } from "./production-readiness.mjs";

const result = productionReadiness(config);
if (!result.ready) {
  console.error(`生产配置未通过：\n- ${result.issues.join("\n- ")}`);
  process.exitCode = 1;
} else {
  const database = await checkDatabase();
  if (!database.connected) {
    console.error(`生产数据库连接失败：${database.error || "unknown"}`);
    process.exitCode = 1;
  } else {
    console.log("生产配置校验通过：密钥、短信、运营者信息、Cookie、监听地址与数据库均已就绪");
  }
}
await closeDatabase();
