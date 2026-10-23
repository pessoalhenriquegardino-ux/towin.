import { Router } from 'express';
import db from '../db.js';
import { ah } from '../middleware/async.js';
import { hojeLocal } from '../services/tempo.js';

const router = Router();

router.get('/', ah(async (req, res) => {
  const data = req.query.data || hojeLocal();
  res.json(
    await db.all('SELECT * FROM tarefas WHERE data = ? ORDER BY concluida ASC, ordem ASC, id ASC', [data])
  );
}));

router.post('/', ah(async (req, res) => {
  const { texto, data } = req.body;
  if (!texto || !texto.trim()) {
    return res.status(400).json({ erro: 'texto é obrigatório' });
  }
  const dia = data || hojeLocal();
  const maxOrdem = await db.get('SELECT MAX(ordem) as m FROM tarefas WHERE data = ?', [dia]);
  const info = await db.run('INSERT INTO tarefas (texto, data, ordem) VALUES (?, ?, ?)', [
    texto.trim(),
    dia,
    (maxOrdem?.m ?? -1) + 1,
  ]);
  res.status(201).json(await db.get('SELECT * FROM tarefas WHERE id = ?', [info.lastInsertRowid]));
}));

// Reordena tarefas: recebe a lista de ids na nova ordem e regrava o campo `ordem`.
router.post('/reordenar', ah(async (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ erro: 'ids deve ser um array' });
  }
  if (ids.length) {
    await db.batch(ids.map((id, index) => ['UPDATE tarefas SET ordem = ? WHERE id = ?', [index, id]]));
  }
  res.json({ ok: true });
}));

router.put('/:id', ah(async (req, res) => {
  const existente = await db.get('SELECT * FROM tarefas WHERE id = ?', [req.params.id]);
  if (!existente) return res.status(404).json({ erro: 'Tarefa não encontrada' });

  const a = { ...existente, ...req.body };
  const concluidaAgora = a.concluida ? 1 : 0;
  const concluidaMudou = concluidaAgora !== existente.concluida;

  await db.run('UPDATE tarefas SET texto=?, concluida=?, concluida_em=? WHERE id=?', [
    a.texto,
    concluidaAgora,
    concluidaAgora ? (concluidaMudou ? new Date().toISOString() : existente.concluida_em) : null,
    req.params.id,
  ]);

  res.json(await db.get('SELECT * FROM tarefas WHERE id = ?', [req.params.id]));
}));

router.delete('/:id', ah(async (req, res) => {
  await db.run('DELETE FROM tarefas WHERE id = ?', [req.params.id]);
  res.status(204).end();
}));

// Remove as tarefas já concluídas do dia (limpar checklist)
router.delete('/', ah(async (req, res) => {
  const data = req.query.data || hojeLocal();
  await db.run('DELETE FROM tarefas WHERE data = ? AND concluida = 1', [data]);
  res.status(204).end();
}));

export default router;
