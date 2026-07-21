ALTER TABLE phone_login_challenges
  ADD COLUMN verification_mode VARCHAR(16) CHARACTER SET ascii COLLATE ascii_bin NOT NULL DEFAULT 'local' AFTER phone_hint,
  MODIFY COLUMN code_hash CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NULL;
