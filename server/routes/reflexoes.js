import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM reflexoes ORDER BY data DESC').all();
  res.json(rows);
});

router.post('/', (req, res) => {
  const { texto, meta_id, vicio_id, papel } = req.body;
  if (!texto) return res.status(400).json({ erro: 'texto é obrigatório' });

  const info = db
    .prepare('INSERT INTO reflexoes (texto, papel, meta_id, vicio_id) VALUES (?, ?, ?, ?)')
    .run(texto, papel || 'usuario', meta_id || null, vicio_id || null);

  res.status(201).json(db.prepare('SELECT * FROM reflexoes WHERE id = ?').get(info.lastInsertRowid));
});

export default router;
