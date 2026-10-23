import crypto from 'node:crypto';
import { Router } from 'express';
import db from '../../db.js';
import { ah } from '../../middleware/async.js';
import { hojeLocal } from '../../services/tempo.js';
import {
  PERFIS, TIPOS, numero, dataValida, mesValido, addMeses, dataNoMes, perfilFiltro, gerarRecorrentes, round2,
} from '../../services/financas.js';

const router = Router();

const SELECT_BASE = `SELECT l.*, c.nome AS categoria_nome
  FROM fin_lancamentos l LEFT JOIN fin_categorias c ON c.id = l.categoria_id`;

router.get('/', ah(async (req, res) => {
  const mes = mesValido(req.query.mes);
  if (mes) await gerarRecorrentes(mes);

  const where = [];
  const args = [];
  if (mes) {
    where.push('l.data_vencimento >= ? AND l.data_vencimento <= ?');
    args.push(`${mes}-01`, `${mes}-31`);
  }
  const perfil = perfilFiltro(req.query.perfil);
  if (perfil) { where.push('l.perfil = ?'); args.push(perfil); }
  if (TIPOS.includes(req.query.tipo)) { where.push('l.tipo = ?'); args.push(req.query.tipo); }
  if (req.query.status === 'pago') where.push('l.data_pagamento IS NOT NULL');
  if (req.query.status === 'pendente') where.push('l.data_pagamento IS NULL');
  if (req.query.status === 'atrasado') { where.push('l.data_pagamento IS NULL AND l.data_vencimento < ?'); args.push(hojeLocal()); }
  if (req.query.busca) { where.push('l.descricao LIKE ?'); args.push(`%${req.query.busca}%`); }

  const sql = `${SELECT_BASE} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
    ORDER BY l.data_vencimento ASC, l.id ASC LIMIT 1000`;
  res.json(await db.all(sql, args));
}));

function validar(corpo, parcial = false) {
  const erros = [];
  if (!parcial || 'descricao' in corpo) if (!corpo.descricao || !String(corpo.descricao).trim()) erros.push('descrição é obrigatória');
  if (!parcial || 'valor' in corpo) {
    const v = numero(corpo.valor);
    if (!Number.isFinite(v) || v <= 0) erros.push('valor deve ser maior que zero');
  }
  if (!parcial || 'tipo' in corpo) if (!TIPOS.includes(corpo.tipo)) erros.push('tipo inválido');
  if (!parcial || 'perfil' in corpo) if (!PERFIS.includes(corpo.perfil)) erros.push('perfil inválido');
  if (!parcial || 'data_vencimento' in corpo) if (!dataValida(corpo.data_vencimento)) erros.push('data de vencimento inválida');
  if (corpo.data_pagamento && !dataValida(corpo.data_pagamento)) erros.push('data de pagamento inválida');
  return erros;
}

router.post('/', ah(async (req, res) => {
  const b = { perfil: 'pessoal', tipo: 'despesa', ...req.body };
  const erros = validar(b);
  if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

  const valor = round2(numero(b.valor));
  const parcelas = Math.min(60, Math.max(1, parseInt(b.parcelas, 10) || 1));
  const mesInicial = b.data_vencimento.slice(0, 7);
  const dia = Number(b.data_vencimento.slice(8, 10));
  const grupo = parcelas > 1 ? crypto.randomUUID() : null;
  const pagoAgora = b.pago ? b.data_pagamento || hojeLocal() : null;

  const stmts = [];
  for (let i = 0; i < parcelas; i++) {
    stmts.push([
      `INSERT INTO fin_lancamentos
       (perfil, tipo, descricao, valor, categoria_id, data_vencimento, data_pagamento, forma_pagamento, observacao, grupo, parcela_num, parcela_total)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        b.perfil, b.tipo, String(b.descricao).trim(), valor, b.categoria_id || null,
        i === 0 ? b.data_vencimento : dataNoMes(addMeses(mesInicial, i), dia),
        i === 0 ? pagoAgora : null,
        b.forma_pagamento || null, b.observacao || null,
        grupo, parcelas > 1 ? i + 1 : null, parcelas > 1 ? parcelas : null,
      ],
    ]);
  }
  await db.batch(stmts);
  const criados = await db.all(`${SELECT_BASE} ORDER BY l.id DESC LIMIT ?`, [parcelas]);
  res.status(201).json(criados.reverse());
}));

router.put('/:id', ah(async (req, res) => {
  const atual = await db.get('SELECT * FROM fin_lancamentos WHERE id = ?', [req.params.id]);
  if (!atual) return res.status(404).json({ erro: 'Lançamento não encontrado' });

  const erros = validar(req.body, true);
  if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

  const a = { ...atual, ...req.body };
  await db.run(
    `UPDATE fin_lancamentos SET perfil=?, tipo=?, descricao=?, valor=?, categoria_id=?, data_vencimento=?,
     data_pagamento=?, forma_pagamento=?, observacao=? WHERE id=?`,
    [
      a.perfil, a.tipo, String(a.descricao).trim(), round2(numero(a.valor)), a.categoria_id || null,
      a.data_vencimento, a.data_pagamento || null, a.forma_pagamento || null, a.observacao || null,
      req.params.id,
    ]
  );
  res.json(await db.get(`${SELECT_BASE} WHERE l.id = ?`, [req.params.id]));
}));

// escopo=futuras: apaga esta parcela e as seguintes do mesmo parcelamento
router.delete('/:id', ah(async (req, res) => {
  const atual = await db.get('SELECT * FROM fin_lancamentos WHERE id = ?', [req.params.id]);
  if (!atual) return res.status(204).end();
  if (req.query.escopo === 'futuras' && atual.grupo) {
    await db.run('DELETE FROM fin_lancamentos WHERE grupo = ? AND data_vencimento >= ?', [atual.grupo, atual.data_vencimento]);
  } else {
    await db.run('DELETE FROM fin_lancamentos WHERE id = ?', [req.params.id]);
  }
  res.status(204).end();
}));

export default router;
