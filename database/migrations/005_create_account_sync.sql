ALTER TABLE stories
  ADD COLUMN family_id BIGINT UNSIGNED NULL AFTER model_name,
  ADD COLUMN child_profile_id BIGINT UNSIGNED NULL AFTER family_id,
  ADD COLUMN created_by_user_id BIGINT UNSIGNED NULL AFTER child_profile_id,
  ADD COLUMN claimed_at DATETIME(3) NULL AFTER created_by_user_id,
  ADD INDEX idx_stories_family_created (family_id, created_at),
  ADD INDEX idx_stories_child_created (child_profile_id, created_at),
  ADD CONSTRAINT fk_stories_family
    FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
  ADD CONSTRAINT fk_stories_child
    FOREIGN KEY (child_profile_id) REFERENCES child_profiles (id) ON DELETE SET NULL,
  ADD CONSTRAINT fk_stories_created_by_user
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS device_claims (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  public_id CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  device_id_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
  family_id BIGINT UNSIGNED NOT NULL,
  child_profile_id BIGINT UNSIGNED NOT NULL,
  claimed_by_user_id BIGINT UNSIGNED NOT NULL,
  stories_claimed INT UNSIGNED NOT NULL DEFAULT 0,
  favorites_imported INT UNSIGNED NOT NULL DEFAULT 0,
  literacy_imported INT UNSIGNED NOT NULL DEFAULT 0,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_device_claims_public_id (public_id),
  UNIQUE INDEX uk_device_claims_device (device_id_hash),
  INDEX idx_device_claims_family_time (family_id, created_at),
  CONSTRAINT fk_device_claims_family
    FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
  CONSTRAINT fk_device_claims_child
    FOREIGN KEY (child_profile_id) REFERENCES child_profiles (id) ON DELETE CASCADE,
  CONSTRAINT fk_device_claims_user
    FOREIGN KEY (claimed_by_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS story_favorites (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  family_id BIGINT UNSIGNED NOT NULL,
  child_profile_id BIGINT UNSIGNED NOT NULL,
  story_id BIGINT UNSIGNED NOT NULL,
  created_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_story_favorites_child_story (child_profile_id, story_id),
  INDEX idx_story_favorites_family_created (family_id, created_at),
  CONSTRAINT fk_story_favorites_family
    FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
  CONSTRAINT fk_story_favorites_child
    FOREIGN KEY (child_profile_id) REFERENCES child_profiles (id) ON DELETE CASCADE,
  CONSTRAINT fk_story_favorites_story
    FOREIGN KEY (story_id) REFERENCES stories (id) ON DELETE CASCADE,
  CONSTRAINT fk_story_favorites_user
    FOREIGN KEY (created_by_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS literacy_progress (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  family_id BIGINT UNSIGNED NOT NULL,
  child_profile_id BIGINT UNSIGNED NOT NULL,
  character_id BIGINT UNSIGNED NOT NULL,
  status VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'learned',
  learned_at DATETIME(3) NOT NULL,
  updated_by_user_id BIGINT UNSIGNED NOT NULL,
  created_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  updated_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) ON UPDATE CURRENT_TIMESTAMP(3),
  PRIMARY KEY (id),
  UNIQUE INDEX uk_literacy_progress_child_character (child_profile_id, character_id),
  INDEX idx_literacy_progress_family_status (family_id, status, updated_at),
  CONSTRAINT fk_literacy_progress_family
    FOREIGN KEY (family_id) REFERENCES families (id) ON DELETE CASCADE,
  CONSTRAINT fk_literacy_progress_child
    FOREIGN KEY (child_profile_id) REFERENCES child_profiles (id) ON DELETE CASCADE,
  CONSTRAINT fk_literacy_progress_character
    FOREIGN KEY (character_id) REFERENCES literacy_characters (id) ON DELETE CASCADE,
  CONSTRAINT fk_literacy_progress_user
    FOREIGN KEY (updated_by_user_id) REFERENCES users (id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
