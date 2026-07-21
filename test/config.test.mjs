import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const configUrl = pathToFileURL(path.join(projectRoot, "server/config.mjs")).href;

test("命令行工具可以通过 PLAYMORI_ENV_FILE 读取受限环境文件", () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "playmori-config-"));
  const envPath = path.join(tempDir, "playmori.env");
  fs.writeFileSync(envPath, "PORT=4317\nPUBLIC_OPERATOR_NAME=测试工作室\n", { mode: 0o600 });
  const childEnv = { ...process.env, PLAYMORI_ENV_FILE: envPath };
  delete childEnv.PORT;
  delete childEnv.PUBLIC_OPERATOR_NAME;
  try {
    const script = `import { config } from ${JSON.stringify(configUrl)}; process.stdout.write(JSON.stringify({ port: config.port, operator: config.publicOperatorName }));`;
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
      cwd: projectRoot,
      env: childEnv,
      encoding: "utf8",
    });
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), { port: 4317, operator: "测试工作室" });
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
