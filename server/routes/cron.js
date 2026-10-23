import { Router } from 'express';
import { ah } from '../middleware/async.js';
import { iguais } from '../middleware/auth.js';
import { processarCicloAgendado } from '../services/scheduler.js';

const router = Router();

// Chamado de fora (GitHub Actions / Vercel Cron) com `Authorization: Bearer <CRON_SECRET>`.
router.all('/notificar', ah(async (req, res) => {
  const segredo = process.env.CRON_SECRET;
  const enviado = (req.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (!segredo || !iguais(enviado, segredo)) {
    return res.status(401).json({ erro: 'não autorizado' });
  }
  res.json(await processarCicloAgendado());
}));

export default router;
