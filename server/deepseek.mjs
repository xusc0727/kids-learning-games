import { config } from "./config.mjs";
import { buildStoryMessages } from "./story-prompt.mjs";
import crypto from "node:crypto";

const VALID_DOMAINS = new Set(["health", "language", "social", "science", "art"]);
const VALID_AGES = new Set(["3-4", "4-5", "5-6"]);

function cleanText(value, maxLength) {
  return String(value || "").replace(/[<>]/g, "").trim().slice(0, maxLength);
}

function badRequest(message) {
  return Object.assign(new Error(message), { statusCode: 400 });
}

export function validateStoryInput(raw) {
  const input = {
    age: cleanText(raw?.age, 8),
    domain: cleanText(raw?.domain, 16),
    event: cleanText(raw?.event, 500),
    childName: cleanText(raw?.childName, 16),
    preferences: cleanText(raw?.preferences, 100),
    tone: cleanText(raw?.tone, 30),
  };

  if (!VALID_AGES.has(input.age)) throw badRequest("请选择孩子的年龄段");
  if (!VALID_DOMAINS.has(input.domain)) throw badRequest("请选择成长领域");
  if (input.event.length < 8) throw badRequest("请用至少8个字描述最近发生的事情");
  return input;
}

const AGE_LABELS = { "3-4": "3～4岁", "4-5": "4～5岁", "5-6": "5～6岁" };

function normalizeStory(data, input) {
  const story = Array.isArray(data?.story) ? data.story : [data?.story];
  const questions = Array.isArray(data?.questions) ? data.questions : [];
  if (!data?.title || story.filter(Boolean).length < 3 || questions.length < 2) {
    throw new Error("模型返回的故事结构不完整，请重新生成");
  }

  return {
    id: `ai-${crypto.randomUUID()}`,
    source: "ai",
    title: cleanText(data.title, 40),
    domain: input.domain,
    age: AGE_LABELS[input.age],
    duration: "约5分钟",
    learningGoal: cleanText(data.learningGoal, 100),
    summary: cleanText(data.summary, 100),
    story: story.filter(Boolean).slice(0, 12).map((item) => cleanText(item, 1200)),
    questions: questions.filter(Boolean).slice(0, 2).map((item) => cleanText(item, 120)),
    action: cleanText(data.action, 180),
    parentTip: cleanText(data.parentTip, 180),
    createdAt: new Date().toISOString(),
  };
}

export async function generateStory(rawInput) {
  if (!config.deepseekApiKey) {
    const error = new Error("DeepSeek API Key 尚未配置，请先填写项目根目录的 .env 文件");
    error.statusCode = 503;
    throw error;
  }

  const input = validateStoryInput(rawInput);
  const response = await fetch(`${config.deepseekBaseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.deepseekApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.deepseekModel,
      messages: buildStoryMessages(input),
      thinking: { type: "disabled" },
      response_format: { type: "json_object" },
      temperature: 0.8,
      max_tokens: 2200,
    }),
    signal: AbortSignal.timeout(90_000),
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload?.error?.message || `DeepSeek 请求失败（${response.status}）`);
    error.statusCode = response.status === 429 ? 429 : 502;
    throw error;
  }

  const content = payload?.choices?.[0]?.message?.content;
  if (!content) throw new Error("DeepSeek 没有返回故事内容");

  try {
    return normalizeStory(JSON.parse(content), input);
  } catch (error) {
    if (error.message.includes("结构不完整")) throw error;
    throw new Error("模型返回内容无法解析，请重新生成");
  }
}
