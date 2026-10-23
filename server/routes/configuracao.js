import { Router } from 'express';
import db from '../db.js';
import { ah } from '../middleware/async.js';

const router = Router();

async function ler() {
  const row = await db.get('SELECT * FROM configuracao WHERE id = 1');
  return { ...row, horarios: JSON.parse(row.horarios || '[]') };
}

router.get('/', ah(async (req, res) => {
  res.json(await ler());
}));

router.put('/', ah(async (req, res) => {
  const atual = await db.get('SELECT * FROM configuracao WHERE id = 1');
  const n = { ...atual, ...req.body };

  await db.run(
    `UPDATE configuracao SET frequencia_notificacoes=?, horarios=?, tom_preferido=?,
     incluir_referencias_biblicas=?, janela_silencio_inicio=?, janela_silencio_fim=?
     WHERE id = 1`,
    [
      n.frequencia_notificacoes,
      typeof n.horarios === 'string' ? n.horarios : JSON.stringify(n.horarios),
      n.tom_preferido,
      n.incluir_referencias_biblicas ? 1 : 0,
      n.janela_silencio_inicio,
      n.janela_silencio_fim,
    ]
  );

  res.json(await ler());
}));

export default router;
