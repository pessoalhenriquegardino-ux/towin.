import { Router } from 'express';
import db from '../db.js';
import { dispararNotificacaoAutomatica } from '../services/scheduler.js';
import { salvarInscricao, removerInscricao } from '../services/webpush.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM notificacoes ORDER BY enviada_em DESC LIMIT 100').all();
  res.json(rows);
});

// Dispara manualmente uma notificação de teste (usa a mesma lógica do agendador)
router.post('/testar', async (req, res) => {
  try {
    await dispararNotificacaoAutomatica();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ erro: err.message });
  }
});

router.post('/inscrever', (req, res) => {
  const subscription = req.body;
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ erro: 'subscription inválida' });
  }
  salvarInscricao(subscription);
  res.status(201).json({ ok: true });
});

router.post('/desinscrever', (req, res) => {
  const { endpoint } = req.body;
  if (endpoint) removerInscricao(endpoint);
  res.json({ ok: true });
});

router.get('/vapid-public-key', (req, res) => {
  res.json({ publicKey: process.env.VAPID_PUBLIC_KEY || null });
});

export default router;
