async function loadLegalIdentity() {
  try {
    const response = await fetch("/api/legal", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error();
    const info = await response.json();
    document.querySelectorAll("[data-legal-operator]").forEach((node) => {
      node.textContent = info.operatorName || "运营主体尚未配置";
      node.classList.toggle("operator-loading", !info.operatorName);
    });
    document.querySelectorAll("[data-legal-contact]").forEach((node) => {
      node.textContent = info.contactChannel || "请通过微信公众号“童趣成长乐园”留言";
    });
    document.querySelectorAll("[data-legal-email]").forEach((node) => {
      node.textContent = info.privacyEmail || "隐私联系邮箱尚未配置";
      if (info.privacyEmail && node.tagName === "A") node.href = `mailto:${info.privacyEmail}`;
    });
  } catch {
    document.querySelectorAll("[data-legal-operator]").forEach((node) => { node.textContent = "运营主体信息加载失败"; });
  }
}

loadLegalIdentity();
