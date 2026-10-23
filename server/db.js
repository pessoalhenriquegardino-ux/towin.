import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SCHEMA = `
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
  ultima_atualizacao TEXT NOT NULL DEFAULT (datetime('now')),
  valor_alvo REAL,
  valor_atual REAL,
  foto_pos_x REAL DEFAULT 50,
  foto_pos_y REAL DEFAULT 50,
  foto_zoom REAL DEFAULT 100
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

CREATE TABLE IF NOT EXISTS tarefas (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  texto TEXT NOT NULL,
  concluida INTEGER NOT NULL DEFAULT 0,
  data TEXT NOT NULL,
  ordem INTEGER NOT NULL DEFAULT 0,
  data_criacao TEXT NOT NULL DEFAULT (datetime('now')),
  concluida_em TEXT
);

CREATE TABLE IF NOT EXISTS disparos (
  slot TEXT PRIMARY KEY,
  disparado_em TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO configuracao (id) VALUES (1);
`;

// Colunas adicionadas depois da v1 — só necessárias em bancos locais antigos.
const COLUNAS_LEGADAS = [
  ['metas', 'valor_alvo', 'REAL'],
  ['metas', 'valor_atual', 'REAL'],
  ['metas', 'foto_pos_x', 'REAL DEFAULT 50'],
  ['metas', 'foto_pos_y', 'REAL DEFAULT 50'],
  ['metas', 'foto_zoom', 'REAL DEFAULT 100'],
];

let client;
let pronto;

async function criarCliente() {
  const url = process.env.TURSO_DATABASE_URL;
  if (url) {
    // Produção (Vercel): Turso via HTTP, cliente puro JS (sem binário nativo).
    const { createClient } = await import('@libsql/client/web');
    return { c: createClient({ url, authToken: process.env.TURSO_AUTH_TOKEN }), local: false };
  }
  // Desenvolvimento local: arquivo SQLite em server/data.
  const { createClient } = await import('@libsql/client');
  const dataDir = path.join(__dirname, 'data');
  mkdirSync(dataDir, { recursive: true });
  const relativo = path.relative(process.cwd(), path.join(dataDir, 'towin.sqlite')).replace(/\\/g, '/');
  return { c: createClient({ url: `file:${relativo}` }), local: true };
}

async function iniciar() {
  const { c, local } = await criarCliente();
  client = c;
  if (local) await client.execute('PRAGMA foreign_keys = ON');
  await client.executeMultiple(SCHEMA);
  if (local) {
    for (const [tabela, coluna, definicao] of COLUNAS_LEGADAS) {
      const cols = await client.execute(`PRAGMA table_info(${tabela})`);
      if (!cols.rows.some((r) => r.name === coluna)) {
        await client.execute(`ALTER TABLE ${tabela} ADD COLUMN ${coluna} ${definicao}`);
      }
    }
  }
}

function garantirPronto() {
  if (!pronto) {
    pronto = iniciar().catch((err) => {
      pronto = undefined; // permite tentar de novo na próxima requisição
      throw err;
    });
  }
  return pronto;
}

function limpar(args) {
  return args.map((a) => (a === undefined ? null : a));
}

function linhas(resultado) {
  return resultado.rows.map((row) =>
    Object.fromEntries(resultado.columns.map((coluna, i) => [coluna, row[i]]))
  );
}

export const db = {
  async all(sql, args = []) {
    await garantirPronto();
    return linhas(await client.execute({ sql, args: limpar(args) }));
  },
  async get(sql, args = []) {
    const rows = await db.all(sql, args);
    return rows[0];
  },
  async run(sql, args = []) {
    await garantirPronto();
    const r = await client.execute({ sql, args: limpar(args) });
    return { lastInsertRowid: Number(r.lastInsertRowid ?? 0), changes: r.rowsAffected };
  },
  // Várias escritas numa única ida ao banco (importante com Turso remoto).
  async batch(statements) {
    await garantirPronto();
    return client.batch(
      statements.map(([sql, args = []]) => ({ sql, args: limpar(args) })),
      'write'
    );
  },
};

export default db;
