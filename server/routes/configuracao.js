import { Router } from 'express';
import db from '../db.js';

const router = Router();

router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM configuracao WHERE id = 1').get();
  res.json({ ...row, horarios: JSON.parse(row.horarios || '[]') });
});

router.put('/', (req, res) => {
  const atual = db.prepare('SELECT * FROM configuracao WHERE id = 1').get();
  const novo = { ...atual, ...req.body };

  db.prepare(
    `UPDATE configuracao SET frequencia_notificacoes=?, horarios=?, tom_preferido=?,
     incluir_referencias_biblicas=?, janela_silencio_inicio=?, janela_silencio_fim=?
     WHERE id = 1`
  ).run(
    novo.frequencia_notificacoes,
    typeof novo.horarios === 'string' ? novo.horarios : JSON.stringify(novo.horarios),
    novo.tom_preferido,
    novo.incluir_referencias_biblicas ? 1 : 0,
    novo.janela_silencio_inicio,
    novo.janela_silencio_fim
  );

  const row = db.prepare('SELECT * FROM configuracao WHERE id = 1').get();
  res.json({ ...row, horarios: JSON.parse(row.horarios || '[]') });
});

export default router;
