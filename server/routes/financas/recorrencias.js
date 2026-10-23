import { Router } from 'express';
import db from '../../db.js';
import { ah } from '../../middleware/async.js';
import { hojeLocal } from '../../services/tempo.js';
import {
  PERFIS, TIPOS, PERIODICIDADES, numero, dataValida, round2, equivalenteMensal, economiaDaRecorrencia, gerarRecorrentes,
} from '../../services/financas.js';

const router = Router();

function enriquecer(r, hoje) {
  const mensal = round2(equivalenteMensal(r.valor, r.periodicidade));
  return {
    ...r,
    valor_mensal: mensal,
    valor_anual: round2(mensal * 12),
    economia: !r.ativa && r.data_cancelamento ? economiaDaRecorrencia(r, hoje) : null,
  };
}

router.get('/', ah(async (req, res) => {
  const hoje = hojeLocal();
  const rows = await db.all(
    `SELECT r.*, c.nome AS categoria_nome
     FROM fin_recorrencias r LEFT JOIN fin_categorias c ON c.id = r.categoria_id
     ORDER BY r.ativa DESC, r.nome ASC`
  );
  res.json(rows.map((r) => enriquecer(r, hoje)));
}));

function validar(b) {
  const erros = [];
  if (!b.nome || !String(b.nome).trim()) erros.push('nome é obrigatório');
  const v = numero(b.valor);
  if (!Number.isFinite(v) || v <= 0) erros.push('valor deve ser maior que zero');
  if (!TIPOS.includes(b.tipo)) erros.push('tipo inválido');
  if (!PERFIS.includes(b.perfil)) erros.push('perfil inválido');
  if (!PERIODICIDADES.includes(b.periodicidade)) erros.push('periodicidade inválida');
  const dia = Number(b.dia_cobranca);
  if (!Number.isInteger(dia) || dia < 1 || dia > 31) erros.push('dia de cobrança deve ser de 1 a 31');
  if (!dataValida(b.data_inicio)) erros.push('data de início inválida');
  return erros;
}

router.post('/', ah(async (req, res) => {
  const b = { tipo: 'despesa', perfil: 'pessoal', periodicidade: 'mensal', data_inicio: hojeLocal(), ...req.body };
  if (!b.dia_cobranca && dataValida(b.data_inicio)) b.dia_cobranca = Number(b.data_inicio.slice(8, 10));
  const erros = validar(b);
  if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

  const info = await db.run(
    `INSERT INTO fin_recorrencias (nome, tipo, perfil, valor, periodicidade, dia_cobranca, categoria_id, data_inicio, observacao)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      String(b.nome).trim(), b.tipo, b.perfil, round2(numero(b.valor)), b.periodicidade,
      Number(b.dia_cobranca), b.categoria_id || null, b.data_inicio, b.observacao || null,
    ]
  );
  await gerarRecorrentes(hojeLocal().slice(0, 7));
  const r = await db.get('SELECT * FROM fin_recorrencias WHERE id = ?', [info.lastInsertRowid]);
  res.status(201).json(enriquecer(r, hojeLocal()));
}));

router.put('/:id', ah(async (req, res) => {
  const atual = await db.get('SELECT * FROM fin_recorrencias WHERE id = ?', [req.params.id]);
  if (!atual) return res.status(404).json({ erro: 'Não encontrado' });
  const a = { ...atual, ...req.body };
  const erros = validar(a);
  if (erros.length) return res.status(400).json({ erro: erros.join('; ') });

  await db.batch([
    [
      `UPDATE fin_recorrencias SET nome=?, tipo=?, perfil=?, valor=?, periodicidade=?, dia_cobranca=?,
       categoria_id=?, data_inicio=?, observacao=? WHERE id=?`,
      [
        String(a.nome).trim(), a.tipo, a.perfil, round2(numero(a.valor)), a.periodicidade,
        Number(a.dia_cobranca), a.categoria_id || null, a.data_inicio, a.observacao || null, req.params.id,
      ],
    ],
    // Reflete o novo valor/nome nos lançamentos futuros ainda não pagos.
    [
      `UPDATE fin_lancamentos SET descricao=?, valor=?, perfil=?, categoria_id=?
       WHERE recorrencia_id = ? AND data_pagamento IS NULL AND data_vencimento >= ?`,
      [String(a.nome).trim(), round2(numero(a.valor)), a.perfil, a.categoria_id || null, req.params.id, hojeLocal()],
    ],
  ]);
  const r = await db.get('SELECT * FROM fin_recorrencias WHERE id = ?', [req.params.id]);
  res.json(enriquecer(r, hojeLocal()));
}));

// Cancelar: para de gerar cobranças, remove as futuras pendentes e começa a contar a economia.
router.post('/:id/cancelar', ah(async (req, res) => {
  const atual = await db.get('SELECT * FROM fin_recorrencias WHERE id = ?', [req.params.id]);
  if (!atual) return res.status(404).json({ erro: 'Não encontrado' });
  const data = dataValida(req.body?.data_cancelamento) ? req.body.data_cancelamento : hojeLocal();

  await db.batch([
    ['UPDATE fin_recorrencias SET ativa = 0, data_cancelamento = ? WHERE id = ?', [data, req.params.id]],
    [
      'DELETE FROM fin_lancamentos WHERE recorrencia_id = ? AND data_pagamento IS NULL AND data_vencimento > ?',
      [req.params.id, data],
    ],
  ]);
  const r = await db.get('SELECT * FROM fin_recorrencias WHERE id = ?', [req.params.id]);
  res.json(enriquecer(r, hojeLocal()));
}));

router.post('/:id/reativar', ah(async (req, res) => {
  const atual = await db.get('SELECT * FROM fin_recorrencias WHERE id = ?', [req.params.id]);
  if (!atual) return res.status(404).json({ erro: 'Não encontrado' });
  await db.run('UPDATE fin_recorrencias SET ativa = 1, data_cancelamento = NULL WHERE id = ?', [req.params.id]);
  await gerarRecorrentes(hojeLocal().slice(0, 7));
  const r = await db.get('SELECT * FROM fin_recorrencias WHERE id = ?', [req.params.id]);
  res.json(enriquecer(r, hojeLocal()));
}));

// Excluir apaga a recorrência e os lançamentos pendentes dela (os já pagos ficam no histórico).
router.delete('/:id', ah(async (req, res) => {
  await db.batch([
    ['DELETE FROM fin_lancamentos WHERE recorrencia_id = ? AND data_pagamento IS NULL', [req.params.id]],
    ['UPDATE fin_lancamentos SET recorrencia_id = NULL WHERE recorrencia_id = ?', [req.params.id]],
    ['DELETE FROM fin_recorrencias WHERE id = ?', [req.params.id]],
  ]);
  res.status(204).end();
}));

export default router;
