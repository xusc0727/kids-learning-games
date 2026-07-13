const DOMAIN_GUIDANCE = {
  health: "健康：情绪识别与调节、生活习惯、安全意识或身体照顾",
  language: "语言：倾听、描述、表达需要、提问或按顺序讲述",
  social: "社会：分享、轮流、合作、同理心、规则或身体界限",
  science: "科学：观察、分类、数量、比较、因果、动植物或自然现象",
  art: "艺术：颜色、声音、节奏、想象、感受美或创造性表达",
};

const AGE_GUIDANCE = {
  "3-4": "3～4岁：约450～650字，单线情节，2～3个角色，句子短，重要表达重复两次，结局直接温暖",
  "4-5": "4～5岁：约650～850字，一个清晰冲突，简单因果，可让孩子预测下一步",
  "5-6": "5～6岁：约800～1100字，允许两次情节推进和不同角色观点，但仍要具体、易懂",
};

export function buildStoryMessages(input) {
  const domain = DOMAIN_GUIDANCE[input.domain] || DOMAIN_GUIDANCE.social;
  const age = AGE_GUIDANCE[input.age] || AGE_GUIDANCE["4-5"];
  const childName = input.childName ? `可以自然使用孩子的小名“${input.childName}”，最多出现3次。` : "不要给孩子本人贴标签。";
  const preferences = input.preferences ? `孩子喜欢：${input.preferences}。` : "角色优先使用温和、容易辨认的小动物。";

  return [
    {
      role: "system",
      content: `你是一名熟悉中国3～6岁幼儿发展特点的儿童故事编辑。请创作适合成人朗读给儿童听的原创寓言故事。

必须遵守：
1. 一篇故事只承载一个核心成长目标，用行动和自然结果表现，不长篇说教。
2. 不使用“坏孩子”“胆小鬼”“没人喜欢你”等羞辱标签；不以抛弃、威胁、疼痛或恐怖后果迫使儿童服从。
3. 不写血腥、死亡、危险模仿、陌生人诱骗细节，不强化性别、外貌或家庭结构刻板印象。
4. 错误行为必须可修复，角色可以尝试、犯错、获得提示并再次行动。
5. 道理必须转化成儿童第二天可以模仿的一句话或一个小动作。
6. 只输出合法 JSON，不要 Markdown，不要代码围栏。

JSON 结构必须是：
{
  "title": "故事标题",
  "domain": "健康/语言/社会/科学/艺术之一",
  "learningGoal": "一句给成人看的成长目标",
  "summary": "40字以内简介",
  "story": ["自然分段1", "自然分段2", "自然分段3", "自然分段4"],
  "questions": ["问题1", "问题2"],
  "action": "一个当天或第二天可以实践的小行动",
  "parentTip": "一句不超过60字的成人引导建议"
}`,
    },
    {
      role: "user",
      content: `请根据以下信息创作故事：
- 年龄与篇幅：${age}
- 成长领域：${domain}
- 家长描述的事情：${input.event}
- ${preferences}
- ${childName}
- 故事氛围：${input.tone || "温暖、轻松、有一点幽默"}

问题应帮助儿童回忆角色感受和想出可执行办法，不要考察记忆细节。`,
    },
  ];
}

