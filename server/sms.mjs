import AlibabaPhoneVerification, {
  CheckSmsVerifyCodeRequest,
  SendSmsVerifyCodeRequest,
} from "@alicloud/dypnsapi20170525";
import { config } from "./config.mjs";

let aliyunClient;

function serviceError(message, statusCode = 503) {
  return Object.assign(new Error(message), { statusCode, isSmsServiceError: true });
}

function mainlandNumber(phone) {
  const value = String(phone || "");
  if (!/^\+86\d{11}$/.test(value)) throw serviceError("手机号格式不正确", 400);
  return value.slice(3);
}

function getAliyunClient() {
  if (aliyunClient) return aliyunClient;
  const Client = AlibabaPhoneVerification.default;
  aliyunClient = new Client({
    accessKeyId: config.aliyunAccessKeyId,
    accessKeySecret: config.aliyunAccessKeySecret,
    endpoint: "dypnsapi.aliyuncs.com",
  });
  return aliyunClient;
}

function requestBase(phone, requestId) {
  const request = {
    countryCode: "86",
    phoneNumber: mainlandNumber(phone),
    outId: String(requestId || ""),
  };
  if (config.aliyunSmsAuthSchemeName) request.schemeName = config.aliyunSmsAuthSchemeName;
  return request;
}

function responseBody(response) {
  return response?.body || response;
}

function logAliyunFailure(action, body) {
  console.error(
    `阿里云短信认证${action}失败：${body?.code || "UNKNOWN"}，RequestId=${body?.requestId || "unknown"}`,
  );
}

function sendFailure(body) {
  logAliyunFailure("发送", body);
  if (["BUSINESS_LIMIT_CONTROL", "FREQUENCY_FAIL"].includes(body?.code)) {
    return serviceError("验证码发送过于频繁，请稍后再试", 429);
  }
  return serviceError("验证码发送失败，请稍后再试", 502);
}

export function phoneVerificationMode() {
  return config.smsProvider === "aliyun-auth" ? "aliyun-auth" : "local";
}

export function smsReadiness() {
  return {
    configured: config.smsConfigured,
    provider: config.smsProvider,
    verificationMode: phoneVerificationMode(),
    developmentPreview: config.smsProvider === "console" && config.nodeEnv !== "production",
  };
}

export function createAliyunSmsAuthSendRequest(phone, requestId) {
  return new SendSmsVerifyCodeRequest({
    ...requestBase(phone, requestId),
    signName: config.aliyunSmsAuthSignName,
    templateCode: config.aliyunSmsAuthTemplateCode,
    templateParam: JSON.stringify({ code: "##code##", min: String(config.phoneOtpTtlMinutes) }),
    codeLength: 6,
    codeType: 1,
    duplicatePolicy: 1,
    interval: 60,
    validTime: config.phoneOtpTtlMinutes * 60,
    returnVerifyCode: false,
  });
}

export function createAliyunSmsAuthCheckRequest(phone, requestId, code) {
  return new CheckSmsVerifyCodeRequest({
    ...requestBase(phone, requestId),
    verifyCode: String(code),
    caseAuthPolicy: 2,
  });
}

export async function sendPhoneLoginCode(phone, localCode, requestId) {
  if (!config.smsConfigured) throw serviceError("短信登录尚未配置，请稍后再试");

  if (config.smsProvider === "console") {
    if (config.nodeEnv === "production") throw serviceError("生产环境不能使用本地验证码通道");
    return { provider: "console", verificationMode: "local", debugCode: String(localCode) };
  }

  if (config.smsProvider !== "aliyun-auth") throw serviceError("短信通道配置不正确");
  const request = createAliyunSmsAuthSendRequest(phone, requestId);

  try {
    const body = responseBody(await getAliyunClient().sendSmsVerifyCode(request));
    if (body?.code !== "OK" || body?.success === false) throw sendFailure(body);
    return {
      provider: "aliyun-auth",
      verificationMode: "aliyun-auth",
      requestId: body?.model?.requestId || body?.requestId || null,
      bizId: body?.model?.bizId || null,
    };
  } catch (error) {
    if (error.isSmsServiceError) throw error;
    console.error(`阿里云短信认证发送异常：${error.code || error.name || "UNKNOWN"}`);
    throw serviceError("验证码发送失败，请稍后再试", 502);
  }
}

export async function verifyPhoneLoginCodeWithProvider(phone, requestId, code) {
  if (config.smsProvider !== "aliyun-auth" || !config.smsConfigured) {
    throw serviceError("短信认证尚未配置，请稍后再试");
  }
  const request = createAliyunSmsAuthCheckRequest(phone, requestId, code);

  try {
    const body = responseBody(await getAliyunClient().checkSmsVerifyCode(request));
    if (body?.code !== "OK" || body?.success === false) {
      logAliyunFailure("核验", body);
      throw serviceError("验证码核验服务暂时不可用，请稍后再试", 502);
    }
    const outIdMatches = !body?.model?.outId || body.model.outId === String(requestId);
    return body?.model?.verifyResult === "PASS" && outIdMatches;
  } catch (error) {
    if (error.isSmsServiceError) throw error;
    console.error(`阿里云短信认证核验异常：${error.code || error.name || "UNKNOWN"}`);
    throw serviceError("验证码核验服务暂时不可用，请稍后再试", 502);
  }
}
