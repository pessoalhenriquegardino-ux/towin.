import { Router } from 'express';
import db from '../db.js';
import { conversarComCoach } from '../services/claude.js';
import { montarContextoGeralParaChat } from '../services/contexto.js';

const router = Router();

router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM reflexoes ORDER BY data ASC').all();
  res.json(rows);
});

router.post('/', async (req, res) => {
  const { mensagem, historico } = req.body;
  if (!mensagem) return res.status(400).json({ erro: 'mensagem é obrigatória' });

  db.prepare(`INSERT INTO reflexoes (texto, papel) VALUES (?, 'usuario')`).run(mensagem);

  try {
    const contexto = montarContextoGeralParaChat();
    const historicoFormatado = [
      ...(historico || []).map((h) => ({ role: h.role, content: h.content })),
      { role: 'user', content: mensagem },
    ];

    const resposta = await conversarComCoach({ historico: historicoFormatado, contexto });

    db.prepare(`INSERT INTO reflexoes (texto, papel) VALUES (?, 'coach')`).run(resposta);

    res.json({ resposta });
  } catch (err) {
    console.error('[chat] erro:', err.message);
    res.status(500).json({ erro: 'Falha ao conversar com o Coach. Verifique a ANTHROPIC_API_KEY.' });
  }
});

export default router;
