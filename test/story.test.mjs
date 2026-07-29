import assert from "node:assert/strict";
import fs from "node:fs";
import test from "node:test";
import { FIXED_STORIES } from "../database/fixed-stories.mjs";
import { validateStoryInput } from "../server/deepseek.mjs";
import { validateDeviceId } from "../server/story-store.mjs";

test("固定故事按五大领域各提供五篇", () => {
  assert.equal(FIXED_STORIES.length, 25);
  for (const domain of ["health", "language", "social", "science", "art"]) {
    assert.equal(FIXED_STORIES.filter((story) => story.domain === domain).length, 5);
  }
});

test("每篇固定故事都有完整故事包", () => {
  for (const story of FIXED_STORIES) {
    assert.ok(story.id && story.title && story.learningGoal);
    assert.ok(story.story.length >= 3);
    assert.equal(story.questions.length, 2);
    assert.ok(story.action && story.parentTip);
  }
});

test("生成输入会被清理并限制长度", () => {
  const result = validateStoryInput({
    age: "4-5",
    domain: "social",
    event: "<b>孩子在搭积木时和朋友争抢起来</b>",
    childName: "果果",
    preferences: "恐龙",
  });
  assert.equal(result.event.includes("<"), false);
  assert.equal(result.childName, "果果");
});

test("无效年龄和过短事件返回400类型错误", () => {
  assert.throws(() => validateStoryInput({ age: "2-3", domain: "social", event: "事情描述足够长了" }), { statusCode: 400 });
  assert.throws(() => validateStoryInput({ age: "4-5", domain: "social", event: "太短" }), { statusCode: 400 });
});

test("设备故事历史只接受足够长的随机标识", () => {
  assert.equal(validateDeviceId("4c706c51-c8f0-4473-a2e5-e6a578666fe4"), "4c706c51-c8f0-4473-a2e5-e6a578666fe4");
  assert.throws(() => validateDeviceId("short"), { statusCode: 400 });
  assert.throws(() => validateDeviceId("../../another-device"), { statusCode: 400 });
});

test("故事页面恢复生成表单并仅在服务就绪时允许提交", () => {
  const page = fs.readFileSync(new URL("../products/ai-story/index.html", import.meta.url), "utf8");
  const app = fs.readFileSync(new URL("../products/ai-story/app.js", import.meta.url), "utf8");
  const server = fs.readFileSync(new URL("../server/server.mjs", import.meta.url), "utf8");
  const envExample = fs.readFileSync(new URL("../.env.example", import.meta.url), "utf8");

  assert.match(page, /id="storyForm"/);
  assert.match(page, /id="generateButton"[^>]*disabled/);
  assert.match(page, /浙ICP备2026058005号-1/);
  assert.match(app, /data\.aiStoryGenerationEnabled && data\.deepseekConfigured && data\.database\?\.connected/);
  assert.match(app, /fetch\("\/api\/stories\/generate"/);
  assert.match(server, /requireSameOrigin\(req\);[\s\S]*checkRateLimit\(ip\)/);
  assert.match(envExample, /^AI_STORY_GENERATION_ENABLED=true$/m);
});

test("恢复故事生成时同步更新法律文本与协议版本", () => {
  const version = "2026-07-29";
  const privacy = fs.readFileSync(new URL("../privacy.html", import.meta.url), "utf8");
  const childPrivacy = fs.readFileSync(new URL("../children-privacy.html", import.meta.url), "utf8");
  const terms = fs.readFileSync(new URL("../terms.html", import.meta.url), "utf8");
  const legal = fs.readFileSync(new URL("../server/legal.mjs", import.meta.url), "utf8");

  for (const document of [privacy, childPrivacy, terms]) assert.match(document, new RegExp(`版本：${version}`));
  assert.match(legal, new RegExp(`const VERSION = "${version}"`));
  assert.match(privacy, /DeepSeek API/);
  assert.match(childPrivacy, /AI 故事素材/);
  assert.match(terms, /AI 生成内容/);
});
