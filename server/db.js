import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'data');
mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, 'towin.sqlite');

export const db = new DatabaseSync(dbPath);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

db.exec(`
CREATE TABLE IF NOT EXISTS metas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  titulo TEXT NOT NULL,
  descricao TEXT,
  foto_url TEXT,
  data_criacao TEXT NOT NULL DEFAULT (datetime('now')),
  prazo TEXT,
  porque TEXT NOT NULL,
  categoria TEXT,
  status TEXT NOT NULL DEFAULT 'ativa',
  progresso INTEGER NOT NULL DEFAULT 0,
  ultima_atualizacao TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS vicios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  descricao TEXT,
  data_inicio_sobriedade TEXT NOT NULL,
  motivo_principal TEXT NOT NULL,
  marcos_alvo TEXT NOT NULL DEFAULT '[1,7,30,90,180,365]',
  status TEXT NOT NULL DEFAULT 'ativo',
  data_criacao TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS recaidas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vicio_id INTEGER NOT NULL REFERENCES vicios(id) ON DELETE CASCADE,
  data TEXT NOT NULL DEFAULT (datetime('now')),
  nota TEXT
);

CREATE TABLE IF NOT EXISTS marcos_atingidos (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  vicio_id INTEGER NOT NULL REFERENCES vicios(id) ON DELETE CASCADE,
  dias INTEGER NOT NULL,
  data TEXT NOT NULL DEFAULT (datetime('now')),
  mensagem_recebida TEXT
);

CREATE TABLE IF NOT EXISTS notificacoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tipo TEXT NOT NULL,
  conteudo_gerado TEXT NOT NULL,
  meta_id INTEGER REFERENCES metas(id) ON DELETE SET NULL,
  vicio_id INTEGER REFERENCES vicios(id) ON DELETE SET NULL,
  enviada_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS reflexoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  data TEXT NOT NULL DEFAULT (datetime('now')),
  texto TEXT NOT NULL,
  papel TEXT NOT NULL DEFAULT 'usuario',
  meta_id INTEGER REFERENCES metas(id) ON DELETE SET NULL,
  vicio_id INTEGER REFERENCES vicios(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS inscricoes_push (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  endpoint TEXT NOT NULL UNIQUE,
  subscription_json TEXT NOT NULL,
  criada_em TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS configuracao (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  frequencia_notificacoes INTEGER NOT NULL DEFAULT 3,
  horarios TEXT NOT NULL DEFAULT '["08:00","13:00","20:00"]',
  tom_preferido TEXT NOT NULL DEFAULT 'direto',
  incluir_referencias_biblicas INTEGER NOT NULL DEFAULT 1,
  janela_silencio_inicio TEXT NOT NULL DEFAULT '22:00',
  janela_silencio_fim TEXT NOT NULL DEFAULT '07:00'
);

CREATE TABLE IF NOT EXISTS pomodoro_sessoes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  meta_id INTEGER REFERENCES metas(id) ON DELETE SET NULL,
  duracao_min INTEGER NOT NULL,
  concluida_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO configuracao (id) VALUES (1);
`);

// Migração leve: adiciona colunas novas em bancos já existentes, sem apagar dados.
function garantirColuna(tabela, coluna, definicao) {
  const colunas = db.prepare(`PRAGMA table_info(${tabela})`).all();
  const existe = colunas.some((c) => c.name === coluna);
  if (!existe) {
    db.exec(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
  }
}

garantirColuna('metas', 'valor_alvo', 'REAL');
garantirColuna('metas', 'valor_atual', 'REAL');
garantirColuna('metas', 'foto_pos_x', 'REAL DEFAULT 50');
garantirColuna('metas', 'foto_pos_y', 'REAL DEFAULT 50');
garantirColuna('metas', 'foto_zoom', 'REAL DEFAULT 100');

export default db;
