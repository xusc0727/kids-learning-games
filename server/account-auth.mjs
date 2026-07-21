import { config } from "./config.mjs";
import { clearSessionCookie, createSessionCookie, readCookie } from "./account-security.mjs";
import { findActiveSession, touchSession } from "./account-store.mjs";

export function sessionCookieFor(token, options = {}) {
  return createSessionCookie(token, {
    name: config.sessionCookieName,
    ttlDays: config.sessionTtlDays,
    secure: options.secure ?? config.sessionCookieSecure,
  });
}

export function expiredSessionCookie(options = {}) {
  return clearSessionCookie({
    name: config.sessionCookieName,
    secure: options.secure ?? config.sessionCookieSecure,
  });
}

export function sessionTokenFromRequest(req) {
  return readCookie(req?.headers?.cookie, config.sessionCookieName);
}

export async function authenticateRequest(req, options = {}) {
  const token = sessionTokenFromRequest(req);
  if (!token) return null;
  let session;
  try {
    session = await findActiveSession(token, options.connection);
  } catch (error) {
    if (error.statusCode === 401) return null;
    throw error;
  }
  if (!session) return null;
  const lastSeen = session.lastSeenAt instanceof Date ? session.lastSeenAt.getTime() : new Date(session.lastSeenAt).getTime();
  if (!Number.isFinite(lastSeen) || Date.now() - lastSeen >= 15 * 60 * 1000) {
    await touchSession(session.sessionPublicId, new Date(), options.connection);
  }
  return session;
}

export async function requireAuthenticatedRequest(req, options = {}) {
  const session = await authenticateRequest(req, options);
  if (!session) throw Object.assign(new Error("请先登录"), { statusCode: 401 });
  return session;
}

export function requireRecentAuthentication(session, maxAgeMinutes = 15) {
  const createdAt = session?.createdAt instanceof Date ? session.createdAt : new Date(session?.createdAt);
  const age = Date.now() - createdAt.getTime();
  if (!Number.isFinite(age) || age < 0 || age > maxAgeMinutes * 60_000) {
    throw Object.assign(new Error("为保护账号安全，请退出后重新登录，再进行注销"), { statusCode: 401 });
  }
  return session;
}
