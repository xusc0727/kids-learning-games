CREATE TABLE IF NOT EXISTS phone_login_challenges (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  phone_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  phone_hint VARCHAR(20) NOT NULL,
  code_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  request_ip_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'pending',
  attempts TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at DATETIME(3) NOT NULL,
  sent_at DATETIME(3) NULL,
  consumed_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_phone_login_challenges_public_id (public_id),
  INDEX idx_phone_login_challenges_phone_time (phone_hash, created_at),
  INDEX idx_phone_login_challenges_ip_time (request_ip_hash, created_at),
  INDEX idx_phone_login_challenges_status_expiry (status, expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
