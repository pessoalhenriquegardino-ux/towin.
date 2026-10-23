import { Router } from 'express';
import { ah } from '../middleware/async.js';
import { protegido, estaAutenticado, iguais, iniciarSessao, encerrarSessao } from '../middleware/auth.js';

const router = Router();

router.get('/status', (req, res) => {
  res.json({ protegido: protegido(), autenticado: estaAutenticado(req) });
});

router.post('/login', ah(async (req, res) => {
  if (!protegido()) return res.json({ ok: true });
  const { senha } = req.body || {};
  if (!senha || !iguais(senha, process.env.APP_PASSWORD)) {
    await new Promise((r) => setTimeout(r, 700)); // dificulta tentativas em sequência
    return res.status(401).json({ erro: 'Senha incorreta.' });
  }
  iniciarSessao(req, res);
  res.json({ ok: true });
}));

router.post('/logout', (req, res) => {
  encerrarSessao(req, res);
  res.json({ ok: true });
});

export default router;
