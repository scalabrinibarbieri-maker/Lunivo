-- Uma data civil local por aluno. Nao altera tabelas antigas nem premia XP.
CREATE TABLE IF NOT EXISTS study_days (
  user_id TEXT NOT NULL,
  study_date TEXT NOT NULL CHECK (length(study_date) = 10),
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, study_date),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_study_days_by_user ON study_days(user_id, study_date);
