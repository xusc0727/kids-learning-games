CREATE TABLE IF NOT EXISTS visit_events (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  occurred_at DATETIME(3) NOT NULL,
  visit_day DATE NOT NULL,
  visitor_hash VARCHAR(20) NOT NULL,
  session_id VARCHAR(64) NOT NULL,
  path VARCHAR(240) NOT NULL,
  referrer VARCHAR(120) NOT NULL,
  device VARCHAR(16) NOT NULL,
  browser VARCHAR(20) NOT NULL,
  os VARCHAR(20) NOT NULL,
  language VARCHAR(20) NOT NULL,
  screen VARCHAR(12) NOT NULL,
  PRIMARY KEY (id),
  INDEX idx_visit_events_occurred_at (occurred_at),
  INDEX idx_visit_events_path_time (path, occurred_at),
  INDEX idx_visit_events_visitor_day (visitor_hash, visit_day)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
