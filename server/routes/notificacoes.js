import { Router } from 'express';
import db from '../db.js';
import { ah } from '../middleware/async.js';
import { dispararNotificacaoAutomatica } from '../services/scheduler.js';
import { salvarInscricao, removerInscricao } from '../services/webpush.js';

const router = Router();

router.get('/', ah(async (req, res) => {
  res.json(await db.all('SELECT * FROM notificacoes ORDER BY enviada_em DESC LIMIT 100'));
}));

// Dispara manualmente uma notificação de teste (ignora a janela de silêncio)
router.post('/testar', ah(async (req, res) => {
  const resultado = await dispararNotificacaoAutomatica({ ignorarSilencio: true });
  res.json({ ok: !resultado.erro, ...resultado });
}));

router.post('/inscrever', ah(async (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ erro: 'subscription inválida' });
  }
  await salvarInscricao(subscription);
  res.status(201).json({ ok: true });
}));

router.post('/desinscrever', ah(async (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) await removerInscricao(endpoint);
  res.json({ ok: true });
}));

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

export default router;
