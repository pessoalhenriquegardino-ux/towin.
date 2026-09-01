import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const { status } = req.query;
  const rows = status
    ? db.prepare('SELECT * FROM vicios WHERE status = ? ORDER BY data_criacao DESC').all(status)
    : db.prepare('SELECT * FROM vicios ORDER BY data_criacao DESC').all();

  const comExtras = rows.map((v) => ({
    ...v,
    marcos_alvo: JSON.parse(v.marcos_alvo || '[]'),
    recaidas: db.prepare('SELECT * FROM recaidas WHERE vicio_id = ? ORDER BY data DESC').all(v.id),
    marcos_atingidos: db.prepare('SELECT * FROM marcos_atingidos WHERE vicio_id = ? ORDER BY data DESC').all(v.id),
  }));

  res.json(comExtras);
});

router.get('/:id', (req, res) => {
  const v = db.prepare('SELECT * FROM vicios WHERE id = ?').get(req.params.id);
  if (!v) return res.status(404).json({ erro: 'Vício não encontrado' });
  res.json({
    ...v,
    marcos_alvo: JSON.parse(v.marcos_alvo || '[]'),
    recaidas: db.prepare('SELECT * FROM recaidas WHERE vicio_id = ? ORDER BY data DESC').all(v.id),
    marcos_atingidos: db.prepare('SELECT * FROM marcos_atingidos WHERE vicio_id = ? ORDER BY data DESC').all(v.id),
  });
});

router.post('/', (req, res) => {
  const { nome, descricao, data_inicio_sobriedade, motivo_principal, marcos_alvo } = req.body;
  if (!nome || !data_inicio_sobriedade || !motivo_principal) {
    return res.status(400).json({ erro: 'nome, data_inicio_sobriedade e motivo_principal são obrigatórios' });
  }
  const info = db
    .prepare(
      `INSERT INTO vicios (nome, descricao, data_inicio_sobriedade, motivo_principal, marcos_alvo)
       VALUES (?, ?, ?, ?, ?)`
    )
    .run(
      nome,
      descricao || null,
      data_inicio_sobriedade,
      motivo_principal,
      JSON.stringify(marcos_alvo && marcos_alvo.length ? marcos_alvo : [1, 7, 30, 90, 180, 365])
    );
  const vicio = db.prepare('SELECT * FROM vicios WHERE id = ?').get(info.lastInsertRowid);
  res.status(201).json(vicio);
});

router.put('/:id', (req, res) => {
  const existente = db.prepare('SELECT * FROM vicios WHERE id = ?').get(req.params.id);
  if (!existente) return res.status(404).json({ erro: 'Vício não encontrado' });

  const dados = { ...existente, ...req.body };
  db.prepare(
    `UPDATE vicios SET nome=?, descricao=?, data_inicio_sobriedade=?, motivo_principal=?, marcos_alvo=?, status=?
     WHERE id=?`
  ).run(
    dados.nome,
    dados.descricao,
    dados.data_inicio_sobriedade,
    dados.motivo_principal,
    typeof dados.marcos_alvo === 'string' ? dados.marcos_alvo : JSON.stringify(dados.marcos_alvo),
    dados.status,
    req.params.id
  );

  res.json(db.prepare('SELECT * FROM vicios WHERE id = ?').get(req.params.id));
});

// Registrar recaída: reseta o contador (nova data_inicio_sobriedade = agora) mas guarda histórico
router.post('/:id/recaida', (req, res) => {
  const vicio = db.prepare('SELECT * FROM vicios WHERE id = ?').get(req.params.id);
  if (!vicio) return res.status(404).json({ erro: 'Vício não encontrado' });

  const { nota } = req.body;
  db.prepare('INSERT INTO recaidas (vicio_id, nota) VALUES (?, ?)').run(req.params.id, nota || null);
  db.prepare(`UPDATE vicios SET data_inicio_sobriedade = datetime('now') WHERE id = ?`).run(req.params.id);

  res.json(db.prepare('SELECT * FROM vicios WHERE id = ?').get(req.params.id));
});

router.delete('/:id', (req, res) => {
  db.prepare('DELETE FROM vicios WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

export default router;
