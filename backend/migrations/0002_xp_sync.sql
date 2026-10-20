-- XP por licao e resgate inicial dos pontos salvos nos aparelhos antigos.
-- A UNIQUE (user_id, lesson_id) evita premiar a mesma licao duas vezes.
CREATE TABLE IF NOT EXISTS lesson_xp_awards (
  user_id TEXT NOT NULL,
  lesson_id TEXT NOT NULL,
  xp INTEGER NOT NULL CHECK (xp >= 0 AND xp <= 300 AND xp % 10 = 0),
  awarded_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, lesson_id),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

-- Importacao idempotente do XP acumulado antes de esta versao existir.
-- Esta tabela guarda um unico valor historico por conta.
CREATE TABLE IF NOT EXISTS legacy_xp_imports (
  user_id TEXT PRIMARY KEY NOT NULL,
  xp INTEGER NOT NULL CHECK (xp > 0 AND xp <= 600000 AND xp % 10 = 0),
  imported_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);
