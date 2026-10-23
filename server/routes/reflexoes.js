import { Router } from 'express';
import db from '../db.js';
import { ah } from '../middleware/async.js';

const router = Router();

router.get('/', ah(async (req, res) => {
  res.json(await db.all('SELECT * FROM reflexoes ORDER BY data DESC'));
}));

router.post('/', ah(async (req, res) => {
  const { texto, meta_id, vicio_id, papel } = req.body;
  if (!texto) return res.status(400).json({ erro: 'texto é obrigatório' });

  const info = await db.run(
    'INSERT INTO reflexoes (texto, papel, meta_id, vicio_id) VALUES (?, ?, ?, ?)',
    [texto, papel || 'usuario', meta_id || null, vicio_id || null]
  );

  res.status(201).json(await db.get('SELECT * FROM reflexoes WHERE id = ?', [info.lastInsertRowid]));
}));

export default router;
