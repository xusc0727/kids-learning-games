import assert from "node:assert/strict";
import test from "node:test";
import { config } from "../server/config.mjs";
import {
  createAliyunSmsAuthCheckRequest,
  createAliyunSmsAuthSendRequest,
} from "../server/sms.mjs";

test("阿里云短信认证发送和核验请求使用同一手机号、方案与 OutId", () => {
  const previous = {
    aliyunSmsAuthSignName: config.aliyunSmsAuthSignName,
    aliyunSmsAuthTemplateCode: config.aliyunSmsAuthTemplateCode,
    aliyunSmsAuthSchemeName: config.aliyunSmsAuthSchemeName,
    phoneOtpTtlMinutes: config.phoneOtpTtlMinutes,
  };
  Object.assign(config, {
    aliyunSmsAuthSignName: "系统赠送签名",
    aliyunSmsAuthTemplateCode: "100001",
    aliyunSmsAuthSchemeName: "playmori-login",
    phoneOtpTtlMinutes: 5,
  });
  try {
    const requestId = "3f2a1515-e85a-4489-828f-74329a961ccc";
    const send = createAliyunSmsAuthSendRequest("+8613800138000", requestId);
    const check = createAliyunSmsAuthCheckRequest("+8613800138000", requestId, "123456");
    assert.equal(send.phoneNumber, "13800138000");
    assert.equal(send.countryCode, "86");
    assert.equal(send.outId, requestId);
    assert.equal(send.schemeName, "playmori-login");
    assert.equal(send.signName, "系统赠送签名");
    assert.equal(send.templateCode, "100001");
    assert.deepEqual(JSON.parse(send.templateParam), { code: "##code##", min: "5" });
    assert.equal(send.codeLength, 6);
    assert.equal(send.returnVerifyCode, false);
    assert.equal(check.phoneNumber, send.phoneNumber);
    assert.equal(check.outId, send.outId);
    assert.equal(check.schemeName, send.schemeName);
    assert.equal(check.verifyCode, "123456");
  } finally {
    Object.assign(config, previous);
  }
});
