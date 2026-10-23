import { Router } from 'express';
import db from '../db.js';
import { ah } from '../middleware/async.js';

const router = Router();

// Junta metas concluídas, marcos de sobriedade e reflexões em uma linha do tempo única
router.get('/', ah(async (req, res) => {
  const [metas, marcos, reflexoes] = await Promise.all([
    db.all(`SELECT titulo, porque, ultima_atualizacao FROM metas WHERE status = 'concluida'`),
    db.all(
      `SELECT m.dias, m.data, m.mensagem_recebida, v.nome
       FROM marcos_atingidos m LEFT JOIN vicios v ON v.id = m.vicio_id`
    ),
    db.all(`SELECT data, texto FROM reflexoes WHERE papel = 'usuario'`),
  ]);

  const eventos = [
    ...metas.map((m) => ({
      tipo: 'meta_concluida',
      data: m.ultima_atualizacao,
      titulo: `Meta concluída: ${m.titulo}`,
      detalhe: m.porque,
    })),
    ...marcos.map((mk) => ({
      tipo: 'marco_sobriedade',
      data: mk.data,
      titulo: `${mk.dias} dia(s) sem ${mk.nome || 'vício'}`,
      detalhe: mk.mensagem_recebida,
    })),
    ...reflexoes.map((r) => ({
      tipo: 'reflexao',
      data: r.data,
      titulo: 'Reflexão registrada',
      detalhe: r.texto,
    })),
  ];

  const ts = (d) => new Date(/^\d{4}-\d{2}-\d{2} /.test(d) ? d.replace(' ', 'T') + 'Z' : d).getTime();
  eventos.sort((a, b) => ts(b.data) - ts(a.data));
  res.json(eventos);
}));

export default router;
