import { Router } from 'express';
import db from '../db.js';

const router = Router();

function hoje() {
  return new Date().toISOString().slice(0, 10);
}

router.get('/', (req, res) => {
  const data = req.query.data || hoje();
  const rows = db
    .prepare('SELECT * FROM tarefas WHERE data = ? ORDER BY concluida ASC, ordem ASC, id ASC')
    .all(data);
  res.json(rows);
});

router.post('/', (req, res) => {
  const { texto, data } = req.body;
  if (!texto || !texto.trim()) {
    return res.status(400).json({ erro: 'texto é obrigatório' });
  }
  const dia = data || hoje();
  const maxOrdem = db.prepare('SELECT MAX(ordem) as m FROM tarefas WHERE data = ?').get(dia);
  const info = db
    .prepare('INSERT INTO tarefas (texto, data, ordem) VALUES (?, ?, ?)')
    .run(texto.trim(), dia, (maxOrdem.m ?? -1) + 1);
  res.status(201).json(db.prepare('SELECT * FROM tarefas WHERE id = ?').get(info.lastInsertRowid));
});

// Reordena tarefas: recebe a lista de ids na nova ordem e regrava o campo `ordem`.
router.post('/reordenar', (req, res) => {
  const { ids } = req.body;
  if (!Array.isArray(ids)) {
    return res.status(400).json({ erro: 'ids deve ser um array' });
  }
  const stmt = db.prepare('UPDATE tarefas SET ordem = ? WHERE id = ?');
  ids.forEach((id, index) => stmt.run(index, id));
  res.json({ ok: true });
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM tarefas WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Tarefa não encontrada' });

  const atualizacoes = { ...existente, ...req.body };
  const concluidaAgora = atualizacoes.concluida ? 1 : 0;
  const concluidaMudou = concluidaAgora !== existente.concluida;

  db.prepare(
    `UPDATE tarefas SET texto=?, concluida=?, concluida_em=?
     WHERE id=?`
  ).run(
    atualizacoes.texto,
    concluidaAgora,
    concluidaAgora ? (concluidaMudou ? new Date().toISOString() : existente.concluida_em) : null,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM tarefas WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM tarefas WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

// Remove as tarefas já concluídas do dia (limpar checklist)
router.delete('/', (req, res) => {
  const data = req.query.data || hoje();
  db.prepare('DELETE FROM tarefas WHERE data = ? AND concluida = 1').run(data);
  res.status(204).end();
});

export default router;
