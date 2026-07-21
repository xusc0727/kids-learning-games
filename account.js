const STORAGE = {
  device: "playmori.story.device.v1",
  history: "playmori.story.history.v1",
  favorites: "playmori.story.favorites.v1",
  learned: "playmori.literacy.learned.v1",
};

const $ = (selector) => document.querySelector(selector);
const readStorage = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; }
};
const writeStorage = (key, value) => {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* private mode */ }
};

function deviceId() {
  const stored = readStorage(STORAGE.device, "");
  if (/^[A-Za-z0-9-]{20,64}$/.test(stored)) return stored;
  const created = globalThis.crypto?.randomUUID?.() || `device-${Date.now()}-${Math.random().toString(16).slice(2)}`;
  writeStorage(STORAGE.device, created);
  return created;
}

function uniqueKeys(value) {
  return [...new Set((Array.isArray(value) ? value : []).filter((item) => /^[A-Za-z0-9-]{1,64}$/.test(String(item))))];
}

const localData = {
  deviceId: deviceId(),
  stories: (readStorage(STORAGE.history, []) || []).filter((item) => item?.id),
  favorites: uniqueKeys(readStorage(STORAGE.favorites, [])),
  learned: uniqueKeys(readStorage(STORAGE.learned, [])),
};

const elements = {
  loginPanel: $("#loginPanel"), familyPanel: $("#familyPanel"), phoneForm: $("#phoneForm"), codeForm: $("#codeForm"),
  phone: $("#phone"), code: $("#code"), sendCode: $("#sendCode"), verifyCode: $("#verifyCode"), phoneHint: $("#phoneHint"),
  changePhone: $("#changePhone"), countdown: $("#countdown"), debugCode: $("#debugCode"), loginError: $("#loginError"),
  familyTitle: $("#familyTitle"), accountHint: $("#accountHint"), serverStories: $("#serverStories"), serverFavorites: $("#serverFavorites"),
  serverLearned: $("#serverLearned"), syncConfirm: $("#syncConfirm"), syncDevice: $("#syncDevice"), syncMessage: $("#syncMessage"),
  logout: $("#logout"), logoutAll: $("#logoutAll"), localStories: $("#localStories"), localFavorites: $("#localFavorites"), localLearned: $("#localLearned"),
  legalConfirm: $("#legalConfirm"), openClearData: $("#openClearData"), openDeleteAccount: $("#openDeleteAccount"),
  clearDataDialog: $("#clearDataDialog"), clearDataForm: $("#clearDataForm"), clearConfirmation: $("#clearConfirmation"), clearDataError: $("#clearDataError"),
  deleteAccountDialog: $("#deleteAccountDialog"), deleteAccountForm: $("#deleteAccountForm"), deleteConfirmation: $("#deleteConfirmation"), deleteAccountError: $("#deleteAccountError"),
};

let requestId = "";
let countdownTimer;

function showLocalCounts() {
  elements.localStories.textContent = localData.stories.length;
  elements.localFavorites.textContent = localData.favorites.length;
  elements.localLearned.textContent = localData.learned.length;
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { ...(options.body ? { "Content-Type": "application/json" } : {}), ...options.headers },
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.error || "请求没有完成，请稍后再试");
  return result;
}

function setBusy(button, busy, busyText, normalText) {
  button.disabled = busy;
  button.textContent = busy ? busyText : normalText;
}

function startCountdown(seconds) {
  clearInterval(countdownTimer);
  let remaining = seconds;
  const render = () => { elements.countdown.textContent = remaining > 0 ? `${remaining} 秒后可重新获取` : "验证码已过期，请重新获取"; };
  render();
  countdownTimer = setInterval(() => { remaining -= 1; render(); if (remaining <= 0) clearInterval(countdownTimer); }, 1000);
}

async function requestCode(event) {
  event.preventDefault();
  elements.loginError.textContent = "";
  setBusy(elements.sendCode, true, "正在发送…", "获取验证码");
  try {
    const result = await api("/api/auth/phone/request-code", { method: "POST", body: JSON.stringify({ phone: elements.phone.value, legalAccepted: elements.legalConfirm.checked }) });
    requestId = result.requestId;
    elements.phoneHint.textContent = result.phoneHint;
    elements.phoneForm.hidden = true;
    elements.codeForm.hidden = false;
    if (result.debugCode) {
      elements.debugCode.hidden = false;
      elements.debugCode.textContent = `本地开发验证码：${result.debugCode}`;
    }
    startCountdown(result.expiresInSeconds || 300);
    elements.code.focus();
  } catch (error) {
    elements.loginError.textContent = error.message;
  } finally {
    setBusy(elements.sendCode, false, "正在发送…", "获取验证码");
  }
}

async function verifyCode(event) {
  event.preventDefault();
  elements.loginError.textContent = "";
  setBusy(elements.verifyCode, true, "正在验证…", "进入家庭空间");
  try {
    await api("/api/auth/phone/verify-code", {
      method: "POST",
      body: JSON.stringify({ requestId, phone: elements.phone.value, code: elements.code.value, legalAccepted: elements.legalConfirm.checked }),
    });
    await loadAccount();
  } catch (error) {
    elements.loginError.textContent = error.message;
  } finally {
    setBusy(elements.verifyCode, false, "正在验证…", "进入家庭空间");
  }
}

function renderAccount(account) {
  elements.loginPanel.hidden = true;
  elements.familyPanel.hidden = false;
  elements.familyTitle.textContent = account.family.displayName || "我的家庭";
  elements.accountHint.textContent = account.user.phoneHint ? `${account.user.phoneHint} · 已安全登录` : "已安全登录";
  elements.serverStories.textContent = account.counts.stories;
  elements.serverFavorites.textContent = account.counts.favorites;
  elements.serverLearned.textContent = account.counts.learned;
}

async function loadAccount() {
  try {
    const account = await api("/api/me");
    if (account.authenticated) renderAccount(account);
    else {
      elements.loginPanel.hidden = false;
      elements.familyPanel.hidden = true;
    }
  } catch (error) {
    elements.loginError.textContent = error.message;
  }
}

async function syncDevice() {
  elements.syncMessage.classList.remove("error");
  elements.syncMessage.textContent = "";
  setBusy(elements.syncDevice, true, "正在把记录收进家庭…", "确认并同步 →");
  try {
    const result = await api("/api/family/claim-device", {
      method: "POST",
      body: JSON.stringify({
        deviceId: localData.deviceId,
        favoriteStoryKeys: localData.favorites,
        learnedCharacterKeys: localData.learned,
        guardianConsent: elements.syncConfirm.checked,
      }),
    });
    elements.syncMessage.textContent = `同步完成：收进 ${result.storiesClaimed} 篇故事、新增 ${result.favoritesImported} 个收藏和 ${result.literacyImported} 个识字记录。`;
    elements.syncConfirm.checked = false;
    await loadAccount();
  } catch (error) {
    elements.syncMessage.classList.add("error");
    elements.syncMessage.textContent = error.message;
  } finally {
    elements.syncDevice.textContent = "确认并同步 →";
    elements.syncDevice.disabled = !elements.syncConfirm.checked;
  }
}

async function logout(allDevices) {
  try {
    await api(allDevices ? "/api/auth/logout-all" : "/api/auth/logout", { method: "POST" });
    location.reload();
  } catch (error) {
    elements.syncMessage.classList.add("error");
    elements.syncMessage.textContent = error.message;
  }
}

async function clearFamilyData(event) {
  event.preventDefault();
  elements.clearDataError.textContent = "";
  const button = event.submitter;
  setBusy(button, true, "正在清空…", "永久清空");
  try {
    await api("/api/family/child-data", { method: "DELETE", body: JSON.stringify({ confirmation: elements.clearConfirmation.value.trim() }) });
    elements.clearDataDialog.close();
    elements.clearConfirmation.value = "";
    elements.syncMessage.textContent = "家庭成长数据已经清空，同步同意也已撤回。你仍可继续免登录使用基础功能。";
    await loadAccount();
  } catch (error) {
    elements.clearDataError.textContent = error.message;
  } finally {
    setBusy(button, false, "正在清空…", "永久清空");
  }
}

async function deleteCurrentAccount(event) {
  event.preventDefault();
  elements.deleteAccountError.textContent = "";
  const button = event.submitter;
  setBusy(button, true, "正在注销…", "永久注销");
  try {
    await api("/api/account", { method: "DELETE", body: JSON.stringify({ confirmation: elements.deleteConfirmation.value.trim() }) });
    location.href = "/?account=deleted";
  } catch (error) {
    elements.deleteAccountError.textContent = error.message;
    setBusy(button, false, "正在注销…", "永久注销");
  }
}

elements.phoneForm.addEventListener("submit", requestCode);
elements.codeForm.addEventListener("submit", verifyCode);
elements.changePhone.addEventListener("click", () => {
  requestId = "";
  elements.code.value = "";
  elements.codeForm.hidden = true;
  elements.phoneForm.hidden = false;
  elements.debugCode.hidden = true;
  clearInterval(countdownTimer);
  elements.phone.focus();
});
elements.syncConfirm.addEventListener("change", () => { elements.syncDevice.disabled = !elements.syncConfirm.checked; });
elements.syncDevice.addEventListener("click", syncDevice);
elements.logout.addEventListener("click", () => logout(false));
elements.logoutAll.addEventListener("click", () => logout(true));
elements.openClearData.addEventListener("click", () => elements.clearDataDialog.showModal());
elements.openDeleteAccount.addEventListener("click", () => elements.deleteAccountDialog.showModal());
elements.clearDataForm.addEventListener("submit", clearFamilyData);
elements.deleteAccountForm.addEventListener("submit", deleteCurrentAccount);
document.querySelectorAll("[data-close-dialog]").forEach((button) => button.addEventListener("click", () => document.querySelector(`#${button.dataset.closeDialog}`)?.close()));

showLocalCounts();
loadAccount();
