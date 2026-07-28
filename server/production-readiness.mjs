import path from "node:path";

export function productionReadiness(config) {
  const issues = [];
  if (config.nodeEnv !== "production") issues.push("NODE_ENV 必须为 production");
  if (!config.databaseConfigured || !config.databasePassword) issues.push("MySQL 生产连接未完整配置");
  if (config.aiStoryGenerationEnabled && !config.deepseekApiKey) {
    issues.push("AI 故事生成已启用，但 DEEPSEEK_API_KEY 未配置");
  }
  if (!config.sessionCookieSecure) issues.push("SESSION_COOKIE_SECURE 必须为 true");
  if (!config.accountIdentityConfigured) issues.push("账号身份散列或加密密钥未正确配置");
  if (!config.phoneLoginConfigured) issues.push("PHONE_OTP_SECRET 未正确配置");
  if (config.smsProvider !== "aliyun-auth" || !config.smsConfigured) issues.push("阿里云短信认证渠道未完整配置");
  if (!config.publicOperatorName || config.publicOperatorName.length < 2) issues.push("PUBLIC_OPERATOR_NAME 未填写");
  if (!config.publicContactChannel || config.publicContactChannel.length < 5) issues.push("PUBLIC_CONTACT_CHANNEL 未填写");
  if (!config.publicPrivacyEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.publicPrivacyEmail)) issues.push("PUBLIC_PRIVACY_EMAIL 未填写有效邮箱");
  if (!path.isAbsolute(config.analyticsDir)) issues.push("ANALYTICS_DIR 必须使用绝对路径");
  if (new Set([config.accountIdentityHashSecret, config.accountIdentityEncryptionKey, config.phoneOtpSecret]).size !== 3) {
    issues.push("账号散列、加密和验证码密钥必须彼此独立");
  }
  if (!/^(127\.0\.0\.1|::1)$/.test(config.host)) issues.push("生产 Node 服务必须只监听本机回环地址");
  return { ready: issues.length === 0, issues };
}
