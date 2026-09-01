import { Router } from 'express';
import { escolherAlvoUrgente, montarContextoTexto } from '../services/contexto.js';
import { gerarNotificacao } from '../services/claude.js';

const router = Router();

router.get('/frase-do-dia', async (req, res) => {
  const alvo = escolherAlvoUrgente();
  if (!alvo) {
    return res.json({ frase: 'Cadastre sua primeira meta ou vício para começar sua caminhada.' });
  }
  try {
    const contexto = montarContextoTexto(alvo);
    const tipo = alvo.tipo === 'vicio' && alvo.bateuMarcoHoje ? 'marco' : 'pergunta';
    const frase = await gerarNotificacao({ tipo, contexto });
    res.json({ frase, alvo: { tipo: alvo.tipo, id: alvo.item.id } });
  } catch (err) {
    console.error('[dashboard] erro ao gerar frase do dia:', err.message);
    res.json({ frase: 'O caminho continua. Um passo de cada vez.' });
  }
});

export default router;
