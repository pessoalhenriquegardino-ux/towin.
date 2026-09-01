import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM pomodoro_sessoes ORDER BY concluida_em DESC LIMIT 200').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { meta_id, duracao_min } = req.body;
  if (!duracao_min) return res.status(400).json({ erro: 'duracao_min é obrigatório' });

  const info = db
    .prepare('INSERT INTO pomodoro_sessoes (meta_id, duracao_min) VALUES (?, ?)')
    .run(meta_id || null, duracao_min);

  if (meta_id) {
    db.prepare(`UPDATE metas SET ultima_atualizacao = datetime('now') WHERE id = ?`).run(meta_id);
  }

  res.status(201).json(db.prepare('SELECT * FROM pomodoro_sessoes WHERE id = ?').get(info.lastInsertRowid));
});

// Resumo: total de sessões e minutos focados por meta
router.get('/resumo', (req, res) => {
  const rows = db
    .prepare(
      `SELECT meta_id, COUNT(*) as sessoes, SUM(duracao_min) as minutos
       FROM pomodoro_sessoes GROUP BY meta_id`
    )
    .all();
  res.json(rows);
});

export default router;
