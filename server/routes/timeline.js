import { Router } from 'express';
import db from '../db.js';

const router = Router();

// Junta metas concluídas, marcos de sobriedade e reflexões em uma linha do tempo única
router.get('/', (req, res) => {
  const eventos = [];

  const metasConcluidas = db.prepare(`SELECT * FROM metas WHERE status = 'concluida'`).all();
  for (const m of metasConcluidas) {
    eventos.push({
      tipo: 'meta_concluida',
      data: m.ultima_atualizacao,
      titulo: `Meta concluída: ${m.titulo}`,
      detalhe: m.porque,
    });
  }

  const marcos = db.prepare('SELECT * FROM marcos_atingidos').all();
  for (const mk of marcos) {
    const vicio = db.prepare('SELECT nome FROM vicios WHERE id = ?').get(mk.vicio_id);
    eventos.push({
      tipo: 'marco_sobriedade',
      data: mk.data,
      titulo: `${mk.dias} dia(s) sem ${vicio ? vicio.nome : 'vício'}`,
      detalhe: mk.mensagem_recebida,
    });
  }

  const reflexoes = db.prepare(`SELECT * FROM reflexoes WHERE papel = 'usuario'`).all();
  for (const r of reflexoes) {
    eventos.push({
      tipo: 'reflexao',
      data: r.data,
      titulo: 'Reflexão registrada',
      detalhe: r.texto,
    });
  }

  eventos.sort((a, b) => new Date(b.data) - new Date(a.data));
  res.json(eventos);
});

export default router;
