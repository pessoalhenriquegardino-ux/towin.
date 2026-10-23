import { Router } from 'express';
import db from '../db.js';
import { ah } from '../middleware/async.js';

const router = Router();

// Limite de segurança: a Vercel recusa corpos acima de ~4,5MB e o cliente já reduz a foto.
const FOTO_MAX_CHARS = 3_000_000;

router.get('/', ah(async (req, res) => {
  const { status } = req.query;
  const rows = status
    ? await db.all('SELECT * FROM metas WHERE status = ? ORDER BY data_criacao DESC, id DESC', [status])
    : await db.all('SELECT * FROM metas ORDER BY data_criacao DESC, id DESC');
  res.json(rows);
}));

router.get('/:id', ah(async (req, res) => {
  const row = await db.get('SELECT * FROM metas WHERE id = ?', [req.params.id]);
  if (!row) return res.status(404).json({ erro: 'Meta não encontrada' });
  res.json(row);
}));

router.post('/', ah(async (req, res) => {
  const {
    titulo, descricao, foto_url, prazo, porque, categoria, valor_alvo, valor_atual,
    foto_pos_x, foto_pos_y, foto_zoom,
  } = req.body;
  if (!titulo || !porque) {
    return res.status(400).json({ erro: 'titulo e porque são obrigatórios' });
  }
  if (foto_url && foto_url.length > FOTO_MAX_CHARS) {
    return res.status(413).json({ erro: 'Foto grande demais. Escolha uma imagem menor.' });
  }
  const info = await db.run(
    `INSERT INTO metas (titulo, descricao, foto_url, prazo, porque, categoria, valor_alvo, valor_atual, foto_pos_x, foto_pos_y, foto_zoom)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      titulo,
      descricao || null,
      foto_url || null,
      prazo || null,
      porque,
      categoria || null,
      valor_alvo || null,
      valor_atual || null,
      foto_pos_x ?? 50,
      foto_pos_y ?? 50,
      foto_zoom ?? 100,
    ]
  );
  res.status(201).json(await db.get('SELECT * FROM metas WHERE id = ?', [info.lastInsertRowid]));
}));

router.put('/:id', ah(async (req, res) => {
  const existente = await db.get('SELECT * FROM metas WHERE id = ?', [req.params.id]);
  if (!existente) return res.status(404).json({ erro: 'Meta não encontrada' });

  const a = { ...existente, ...req.body };
  if (a.foto_url && a.foto_url.length > FOTO_MAX_CHARS) {
    return res.status(413).json({ erro: 'Foto grande demais. Escolha uma imagem menor.' });
  }

  await db.run(
    `UPDATE metas SET titulo=?, descricao=?, foto_url=?, prazo=?, porque=?, categoria=?, status=?, progresso=?,
     valor_alvo=?, valor_atual=?, foto_pos_x=?, foto_pos_y=?, foto_zoom=?, ultima_atualizacao=datetime('now')
     WHERE id=?`,
    [
      a.titulo, a.descricao, a.foto_url, a.prazo, a.porque, a.categoria, a.status, a.progresso,
      a.valor_alvo, a.valor_atual, a.foto_pos_x ?? 50, a.foto_pos_y ?? 50, a.foto_zoom ?? 100,
      req.params.id,
    ]
  );

  res.json(await db.get('SELECT * FROM metas WHERE id = ?', [req.params.id]));
}));

router.delete('/:id', ah(async (req, res) => {
  const id = req.params.id;
  await db.batch([
    ['UPDATE notificacoes SET meta_id = NULL WHERE meta_id = ?', [id]],
    ['UPDATE reflexoes SET meta_id = NULL WHERE meta_id = ?', [id]],
    ['UPDATE pomodoro_sessoes SET meta_id = NULL WHERE meta_id = ?', [id]],
    ['DELETE FROM metas WHERE id = ?', [id]],
  ]);
  res.status(204).end();
}));

export default router;
