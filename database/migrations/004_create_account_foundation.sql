CREATE TABLE IF NOT EXISTS users (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  display_name VARCHAR(40) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  last_login_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_users_public_id (public_id),
  INDEX idx_users_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS auth_identities (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  user_id BIGINT UNSIGNED NOT NULL,
  provider VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  provider_app_id VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  provider_subject_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  provider_subject_ciphertext VARBINARY(512) NOT NULL,
  provider_subject_hint VARCHAR(64) NULL,
  union_id_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  union_id_ciphertext VARBINARY(512) NULL,
  verified_at DATETIME(3) NOT NULL,
  last_used_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_auth_identities_provider_subject (provider, provider_app_id, provider_subject_hash),
  INDEX idx_auth_identities_user (user_id),
  INDEX idx_auth_identities_union (provider, union_id_hash),
  CONSTRAINT fk_auth_identities_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS sessions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  token_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  expires_at DATETIME(3) NOT NULL,
  last_seen_at DATETIME(3) NOT NULL,
  revoked_at DATETIME(3) NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_sessions_public_id (public_id),
  UNIQUE INDEX uk_sessions_token_hash (token_hash),
  INDEX idx_sessions_user_expiry (user_id, expires_at, revoked_at),
  CONSTRAINT fk_sessions_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS families (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  display_name VARCHAR(60) NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_families_public_id (public_id),
  INDEX idx_families_status_created (status, created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS family_members (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  family_id BIGINT UNSIGNED NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  role VARCHAR(24) NOT NULL DEFAULT 'guardian',
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  joined_at DATETIME(3) NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_family_members_family_user (family_id, user_id),
  INDEX idx_family_members_user_status (user_id, status),
  INDEX idx_family_members_family_status (family_id, status),
  CONSTRAINT fk_family_members_family
    FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
  CONSTRAINT fk_family_members_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS child_profiles (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  family_id BIGINT UNSIGNED NOT NULL,
  profile_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  nickname VARCHAR(32) NULL,
  age_band VARCHAR(8) CHARACTER SET ascii COLLATE ascii_bin NULL,
  avatar_key VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL,
  status VARCHAR(24) NOT NULL DEFAULT 'active',
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_child_profiles_public_id (public_id),
  UNIQUE INDEX uk_child_profiles_family_key (family_id, profile_key),
  INDEX idx_child_profiles_family_status (family_id, status, created_at),
  CONSTRAINT fk_child_profiles_family
    FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS guardian_consents (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  user_id BIGINT UNSIGNED NOT NULL,
  family_id BIGINT UNSIGNED NOT NULL,
  child_profile_id BIGINT UNSIGNED NULL,
  consent_type VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  consent_version VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  decision VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  document_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  source VARCHAR(24) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_guardian_consents_public_id (public_id),
  INDEX idx_guardian_consents_user_type_time (user_id, consent_type, created_at),
  INDEX idx_guardian_consents_family_time (family_id, created_at),
  INDEX idx_guardian_consents_child_time (child_profile_id, created_at),
  CONSTRAINT fk_guardian_consents_user
    FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_guardian_consents_family
    FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
  CONSTRAINT fk_guardian_consents_child
    FOREIGN KEY (child_profile_id) REFERENCES child_profiles (id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
