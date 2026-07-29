import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { config, projectRoot } from "./config.mjs";
import { createPublicId } from "./account-security.mjs";

const VERSION = "2026-07-29";

function fileHash(name) {
  return crypto.createHash("sha256").update(fs.readFileSync(path.join(projectRoot, name))).digest("hex");
}

function combinedHash(names) {
  const hash = crypto.createHash("sha256");
  for (const name of names) hash.update(fs.readFileSync(path.join(projectRoot, name)));
  return hash.digest("hex");
}

export const LOGIN_LEGAL = Object.freeze({
  version: VERSION,
  documentHash: combinedHash(["terms.html", "privacy.html"]),
});

export const CHILD_PRIVACY = Object.freeze({
  type: "child_privacy",
  version: VERSION,
  documentHash: fileHash("children-privacy.html"),
  source: "web",
  scope: "default_child",
});

export function publicLegalInfo() {
  return {
    operatorName: config.publicOperatorName,
    contactChannel: config.publicContactChannel,
    privacyEmail: config.publicPrivacyEmail,
    versions: { terms: VERSION, privacy: VERSION, childPrivacy: VERSION },
  };
}

async function insertConsent(connection, { userId, familyId, childProfileId = null, type, version, documentHash, decision, source = "web" }, now) {
  const [rows] = await connection.execute(
    `SELECT id, decision FROM guardian_consents
     WHERE user_id = ? AND family_id = ? AND consent_type = ? AND consent_version = ?
       AND document_hash = ?
       AND (child_profile_id <=> ?)
     ORDER BY created_at DESC LIMIT 1`,
    [userId, familyId, type, version, documentHash, childProfileId],
  );
  if (rows[0]?.decision === decision) return false;
  await connection.execute(
    `INSERT INTO guardian_consents
      (public_id, user_id, family_id, child_profile_id, consent_type, consent_version,
       decision, document_hash, source, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [createPublicId(), userId, familyId, childProfileId, type, version, decision, documentHash, source, now],
  );
  return true;
}

export async function ensureLoginLegalConsents(connection, context, now = new Date()) {
  const common = {
    userId: context.userId,
    familyId: context.familyId,
    version: LOGIN_LEGAL.version,
    documentHash: LOGIN_LEGAL.documentHash,
    decision: "granted",
  };
  await insertConsent(connection, { ...common, type: "user_terms" }, now);
  await insertConsent(connection, { ...common, type: "privacy_notice" }, now);
}

export async function recordChildPrivacyDecision(connection, context, decision, now = new Date()) {
  return insertConsent(connection, {
    userId: context.userId,
    familyId: context.familyId,
    childProfileId: context.childProfileId,
    type: CHILD_PRIVACY.type,
    version: CHILD_PRIVACY.version,
    documentHash: CHILD_PRIVACY.documentHash,
    decision,
  }, now);
}
