import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const voiceScriptPath = path.join(projectRoot, "products/shared/child-voice.js");
const voiceScript = fs.readFileSync(voiceScriptPath, "utf8");
const voiceTag = "/products/shared/child-voice.js?v=20260728-1";
const voicePages = [
  "products/games/index.html",
  "products/games/builder/index.html",
  "products/games/difference/index.html",
  "products/games/lineup/index.html",
  "products/games/maze/index.html",
  "products/games/restaurant/index.html",
  "products/games/shop/index.html",
  "products/games/story-order/index.html",
  "products/games/sudoku/index.html",
  "products/games/tidy/index.html",
  "products/games/train/index.html",
  "products/literacy/index.html",
];

test("所有带朗读的儿童页面先加载统一音色模块", () => {
  for (const relativePath of voicePages) {
    const html = fs.readFileSync(path.join(projectRoot, relativePath), "utf8");
    assert.ok(html.includes(voiceTag), `${relativePath} 应加载统一音色模块`);
    const voicePosition = html.indexOf(voiceTag);
    const appPosition = Math.min(
      ...["world.js", "learning-core.js", "game.js", "app.js"]
        .map((filename) => html.indexOf(filename))
        .filter((position) => position >= 0)
    );
    assert.ok(voicePosition < appPosition, `${relativePath} 应先加载统一音色模块`);
  }
});

test("业务脚本不再各自创建浏览器朗读实例", () => {
  const productRoot = path.join(projectRoot, "products");
  const queue = [productRoot];
  const offenders = [];
  while (queue.length) {
    const current = queue.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) queue.push(target);
      else if (target.endsWith(".js") && target !== voiceScriptPath) {
        const source = fs.readFileSync(target, "utf8");
        if (/new SpeechSynthesisUtterance|speechSynthesis\.speak/.test(source)) offenders.push(path.relative(projectRoot, target));
      }
    }
  }
  assert.deepEqual(offenders, []);
});

test("统一音色优先自然普通话女声并保持儿童友好节奏", async () => {
  let spoken = null;
  class MockUtterance {
    constructor(text) { this.text = text; }
  }
  const voices = [
    { name: "Microsoft Yunxi Online", lang: "zh-CN", localService: true },
    { name: "Microsoft Xiaoxiao Online (Natural)", lang: "zh-CN", localService: false },
    { name: "Flo (中文（中国大陆）)", lang: "zh-CN", localService: true },
    { name: "English Voice", lang: "en-US", localService: true },
  ];
  const synthesis = {
    addEventListener() {},
    removeEventListener() {},
    cancel() {},
    getVoices: () => voices,
    speak: (utterance) => { spoken = utterance; },
  };
  const window = { speechSynthesis: synthesis, setTimeout };
  vm.runInNewContext(voiceScript, { window, SpeechSynthesisUtterance: MockUtterance });

  await window.PlaymoriVoice.speak("一起去森林看看吧");

  assert.equal(spoken.voice.name, "Microsoft Xiaoxiao Online (Natural)");
  assert.equal(spoken.lang, "zh-CN");
  assert.equal(spoken.rate, 0.82);
  assert.equal(spoken.pitch, 1.06);
  assert.match(voiceScript, /"flo", "sandy", "shelley"/);
});
