import { Router } from 'express';
import db from '../db.js';
import { ah } from '../middleware/async.js';

const router = Router();

router.get('/', ah(async (req, res) => {
  res.json(await db.all('SELECT * FROM pomodoro_sessoes ORDER BY concluida_em DESC LIMIT 200'));
}));

// Resumo: total de sessões e minutos focados por meta
router.get('/resumo', ah(async (req, res) => {
  res.json(
    await db.all(
      `SELECT meta_id, COUNT(*) as sessoes, SUM(duracao_min) as minutos
       FROM pomodoro_sessoes GROUP BY meta_id`
    )
  );
}));

router.post('/', ah(async (req, res) => {
  const { meta_id, duracao_min } = req.body;
  if (!duracao_min) return res.status(400).json({ erro: 'duracao_min é obrigatório' });

  const info = await db.run('INSERT INTO pomodoro_sessoes (meta_id, duracao_min) VALUES (?, ?)', [
    meta_id || null,
    duracao_min,
  ]);

  if (meta_id) {
    await db.run(`UPDATE metas SET ultima_atualizacao = datetime('now') WHERE id = ?`, [meta_id]);
  }

  res.status(201).json(await db.get('SELECT * FROM pomodoro_sessoes WHERE id = ?', [info.lastInsertRowid]));
}));

export default router;
