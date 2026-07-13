import assert from "node:assert/strict";
import test from "node:test";
import { FIXED_STORIES } from "../products/ai-story/data/stories.js";
import { validateStoryInput } from "../server/deepseek.mjs";

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
