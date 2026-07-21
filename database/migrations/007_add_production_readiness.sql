ALTER TABLE phone_login_challenges
  ADD COLUMN legal_version VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER request_ip_hash,
  ADD COLUMN legal_document_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL AFTER legal_version;

CREATE TABLE IF NOT EXISTS account_deletion_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_reference_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  family_reference_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  deletion_reason VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'user_request',
  source VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'web',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_account_deletion_events_public_id (public_id),
  INDEX idx_account_deletion_events_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
