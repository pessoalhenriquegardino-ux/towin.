import { Router } from 'express';
import db from '../db.js';
import { ah } from '../middleware/async.js';

const router = Router();

function interpretar(vicio, recaidas, marcos) {
  return {
    ...vicio,
    marcos_alvo: JSON.parse(vicio.marcos_alvo || '[]'),
    recaidas: recaidas.filter((r) => r.vicio_id === vicio.id),
    marcos_atingidos: marcos.filter((m) => m.vicio_id === vicio.id),
  };
}

router.get('/', ah(async (req, res) => {
  const { status } = req.query;
  const [vicios, recaidas, marcos] = await Promise.all([
    status
      ? db.all('SELECT * FROM vicios WHERE status = ? ORDER BY data_criacao DESC, id DESC', [status])
      : db.all('SELECT * FROM vicios ORDER BY data_criacao DESC, id DESC'),
    db.all('SELECT * FROM recaidas ORDER BY data DESC'),
    db.all('SELECT * FROM marcos_atingidos ORDER BY data DESC'),
  ]);
  res.json(vicios.map((v) => interpretar(v, recaidas, marcos)));
}));

router.get('/:id', ah(async (req, res) => {
  const v = await db.get('SELECT * FROM vicios WHERE id = ?', [req.params.id]);
  if (!v) return res.status(404).json({ erro: 'Vício não encontrado' });
  const [recaidas, marcos] = await Promise.all([
    db.all('SELECT * FROM recaidas WHERE vicio_id = ? ORDER BY data DESC', [v.id]),
    db.all('SELECT * FROM marcos_atingidos WHERE vicio_id = ? ORDER BY data DESC', [v.id]),
  ]);
  res.json(interpretar(v, recaidas, marcos));
}));

router.post('/', ah(async (req, res) => {
  const { nome, descricao, data_inicio_sobriedade, motivo_principal, marcos_alvo } = req.body;
  if (!nome || !data_inicio_sobriedade || !motivo_principal) {
    return res.status(400).json({ erro: 'nome, data_inicio_sobriedade e motivo_principal são obrigatórios' });
  }
  const info = await db.run(
    `INSERT INTO vicios (nome, descricao, data_inicio_sobriedade, motivo_principal, marcos_alvo)
     VALUES (?, ?, ?, ?, ?)`,
    [
      nome,
      descricao || null,
      data_inicio_sobriedade,
      motivo_principal,
      JSON.stringify(marcos_alvo && marcos_alvo.length ? marcos_alvo : [1, 7, 30, 90, 180, 365]),
    ]
  );
  res.status(201).json(await db.get('SELECT * FROM vicios WHERE id = ?', [info.lastInsertRowid]));
}));

router.put('/:id', ah(async (req, res) => {
  const existente = await db.get('SELECT * FROM vicios WHERE id = ?', [req.params.id]);
  if (!existente) return res.status(404).json({ erro: 'Vício não encontrado' });

  const d = { ...existente, ...req.body };
  await db.run(
    `UPDATE vicios SET nome=?, descricao=?, data_inicio_sobriedade=?, motivo_principal=?, marcos_alvo=?, status=?
     WHERE id=?`,
    [
      d.nome,
      d.descricao,
      d.data_inicio_sobriedade,
      d.motivo_principal,
      typeof d.marcos_alvo === 'string' ? d.marcos_alvo : JSON.stringify(d.marcos_alvo),
      d.status,
      req.params.id,
    ]
  );

  res.json(await db.get('SELECT * FROM vicios WHERE id = ?', [req.params.id]));
}));

// Registrar recaída: reseta o contador (nova data de início = agora) mas guarda o histórico.
router.post('/:id/recaida', ah(async (req, res) => {
  const vicio = await db.get('SELECT * FROM vicios WHERE id = ?', [req.params.id]);
  if (!vicio) return res.status(404).json({ erro: 'Vício não encontrado' });

  const agora = new Date().toISOString();
  await db.batch([
    ['INSERT INTO recaidas (vicio_id, nota, data) VALUES (?, ?, ?)', [req.params.id, req.body.nota || null, agora]],
    ['UPDATE vicios SET data_inicio_sobriedade = ? WHERE id = ?', [agora, req.params.id]],
  ]);

  res.json(await db.get('SELECT * FROM vicios WHERE id = ?', [req.params.id]));
}));

router.delete('/:id', ah(async (req, res) => {
  const id = req.params.id;
  await db.batch([
    ['DELETE FROM recaidas WHERE vicio_id = ?', [id]],
    ['DELETE FROM marcos_atingidos WHERE vicio_id = ?', [id]],
    ['UPDATE notificacoes SET vicio_id = NULL WHERE vicio_id = ?', [id]],
    ['UPDATE reflexoes SET vicio_id = NULL WHERE vicio_id = ?', [id]],
    ['DELETE FROM vicios WHERE id = ?', [id]],
  ]);
  res.status(204).end();
}));

export default router;
