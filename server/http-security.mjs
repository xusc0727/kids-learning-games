import path from "node:path";

const ROOT_PUBLIC_FILES = new Set([
  "index.html",
  "site.css",
  "analytics.js",
  "privacy.html",
  "terms.html",
  "children-privacy.html",
  "legal.css",
  "legal.js",
  "account.html",
  "account.css",
  "account.js",
]);

const PRODUCT_EXTENSIONS = new Set([".html", ".css", ".js", ".mjs", ".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico"]);
const IMAGE_EXTENSIONS = new Set([".svg", ".png", ".jpg", ".jpeg", ".webp", ".ico"]);

export function securityHeaders() {
  return {
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data:; connect-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
  };
}

export function resolvePublicFile(projectRoot, urlPath) {
  let decoded;
  try {
    decoded = decodeURIComponent(String(urlPath || "/"));
  } catch {
    return null;
  }
  let relativePath = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  if (relativePath.endsWith("/")) relativePath += "index.html";
  const segments = relativePath.split("/");
  if (!relativePath || segments.some((segment) => !segment || segment === "." || segment === ".." || segment.startsWith("."))) return null;

  const extension = path.extname(relativePath).toLowerCase();
  const allowed = ROOT_PUBLIC_FILES.has(relativePath)
    || (relativePath.startsWith("products/") && PRODUCT_EXTENSIONS.has(extension))
    || (relativePath.startsWith("assets/") && IMAGE_EXTENSIONS.has(extension));
  if (!allowed) return null;

  const filePath = path.resolve(projectRoot, relativePath);
  if (!filePath.startsWith(`${projectRoot}${path.sep}`)) return null;
  return filePath;
}

export function publicErrorMessage(error, statusCode) {
  if (statusCode >= 500) return "服务器暂时开小差了，请稍后再试";
  return error?.message || "请求没有完成";
}
