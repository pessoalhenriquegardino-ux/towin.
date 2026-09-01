import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare('SELECT * FROM metas WHERE status = ? ORDER BY data_criacao DESC').all(status)
    : db.prepare('SELECT * FROM metas ORDER BY data_criacao DESC').all();
  res.json(rows);
});

router.get('/:id', (req, res) => {
  const row = db.prepare('SELECT * FROM metas WHERE id = ?').get(req.params.id);
  if (!row) return res.status(404).json({ erro: 'Meta não encontrada' });
  res.json(row);
});

router.post('/', (req, res) => {
  const {
    titulo, descricao, foto_url, prazo, porque, categoria, valor_alvo, valor_atual,
    foto_pos_x, foto_pos_y, foto_zoom,
  } = req.body;
  if (!titulo || !porque) {
    return res.status(400).json({ erro: 'titulo e porque são obrigatórios' });
  }
  const info = db
    .prepare(
      `INSERT INTO metas (titulo, descricao, foto_url, prazo, porque, categoria, valor_alvo, valor_atual, foto_pos_x, foto_pos_y, foto_zoom)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    )
    .run(
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
      foto_zoom ?? 100
    );
  const meta = db.prepare('SELECT * FROM metas WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(meta);
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM metas WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Meta não encontrada' });

  const atualizacoes = { ...existente, ...req.body };

  db.prepare(
    `UPDATE metas SET titulo=?, descricao=?, foto_url=?, prazo=?, porque=?, categoria=?, status=?, progresso=?,
     valor_alvo=?, valor_atual=?, foto_pos_x=?, foto_pos_y=?, foto_zoom=?, ultima_atualizacao=datetime('now')
     WHERE id=?`
  ).run(
    atualizacoes.titulo,
    atualizacoes.descricao,
    atualizacoes.foto_url,
    atualizacoes.prazo,
    atualizacoes.porque,
    atualizacoes.categoria,
    atualizacoes.status,
    atualizacoes.progresso,
    atualizacoes.valor_alvo,
    atualizacoes.valor_atual,
    atualizacoes.foto_pos_x ?? 50,
    atualizacoes.foto_pos_y ?? 50,
    atualizacoes.foto_zoom ?? 100,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM metas WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM metas WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
