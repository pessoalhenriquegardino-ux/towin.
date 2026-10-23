import { Router } from 'express';
import db from '../db.js';
import { ah } from '../middleware/async.js';
import { conversarComCoach } from '../services/claude.js';
import { montarContextoGeralParaChat } from '../services/contexto.js';

const router = Router();

router.get('/', ah(async (req, res) => {
  res.json(await db.all('SELECT * FROM reflexoes ORDER BY data ASC, id ASC'));
}));

router.post('/', ah(async (req, res) => {
  const { mensagem, historico } = req.body;
  if (!mensagem) return res.status(400).json({ erro: 'mensagem é obrigatória' });

  await db.run(`INSERT INTO reflexoes (texto, papel) VALUES (?, 'usuario')`, [mensagem]);

  try {
    const contexto = await montarContextoGeralParaChat();
    const historicoFormatado = [
      ...(historico || []).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: mensagem },
    ];

    const resposta = await conversarComCoach({ historico: historicoFormatado, contexto });

    await db.run(`INSERT INTO reflexoes (texto, papel) VALUES (?, 'coach')`, [resposta]);

    res.json({ resposta });
  } catch (err) {
    console.error('[chat] erro:', err.message);
    res.status(500).json({ erro: 'Falha ao conversar com o Coach. Verifique a ANTHROPIC_API_KEY e os créditos.' });
  }
}));

export default router;
