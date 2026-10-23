import db from '../db.js';
import { hojeLocal } from './tempo.js';
import { enviarPushParaTodos } from './webpush.js';

export const PERFIS = ['pessoal', 'empresa'];
export const TIPOS = ['receita', 'despesa'];
export const PERIODICIDADES = ['mensal', 'trimestral', 'semestral', 'anual'];
export const PASSO_MESES = { mensal: 1, trimestral: 3, semestral: 6, anual: 12 };

export const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;

export function numero(v) {
  if (v === null || v === undefined || v === '') return NaN;
  return Number(String(v).replace(',', '.'));
}

export const dataValida = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
export const mesValido = (s) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(s || '') ? s : null);

export function addMeses(mes, delta) {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

export function diasNoMes(mes) {
  const [a, m] = mes.split('-').map(Number);
  return new Date(Date.UTC(a, m, 0)).getUTCDate();
}

/** Data (YYYY-MM-DD) no mês, ajustando o dia pro último dia se o mês for mais curto. */
export function dataNoMes(mes, dia) {
  const d = Math.min(Math.max(1, dia), diasNoMes(mes));
  return `${mes}-${String(d).padStart(2, '0')}`;
}

export function mesesEntre(de, ate) {
  const [a1, m1] = de.split('-').map(Number);
  const [a2, m2] = ate.split('-').map(Number);
  return (a2 - a1) * 12 + (m2 - m1);
}

const utc = (texto) => {
  const [a, m, d] = texto.split('-').map(Number);
  return Date.UTC(a, m - 1, d);
};

export const diasEntre = (de, ate) => (utc(ate) - utc(de)) / 86400000;

export function addDias(data, dias) {
  const [a, m, d] = data.split('-').map(Number);
  return new Date(Date.UTC(a, m - 1, d + dias)).toISOString().slice(0, 10);
}

export const equivalenteMensal = (valor, periodicidade) => valor / (PASSO_MESES[periodicidade] || 1);

export function perfilFiltro(valor) {
  return PERFIS.includes(valor) ? valor : null;
}

/** Economia acumulada de uma recorrência cancelada: o que deixou de pagar desde o cancelamento. */
export function economiaDaRecorrencia(rec, hoje = hojeLocal()) {
  const mensal = equivalenteMensal(rec.valor, rec.periodicidade);
  const meses = Math.max(0, diasEntre(rec.data_cancelamento, hoje) / 30.4375);
  return { valor_mensal: round2(mensal), meses: round2(meses), economizado: round2(mensal * meses) };
}

/**
 * Cria (uma única vez por mês) os lançamentos pendentes das assinaturas/contas fixas.
 * Idempotente: o índice único (recorrencia_id, competencia) impede duplicar.
 */
export async function gerarRecorrentes(mes) {
  const hoje = hojeLocal().slice(0, 7);
  if (Math.abs(mesesEntre(hoje, mes)) > 24) return 0;

  const recs = await db.all('SELECT * FROM fin_recorrencias');
  const stmts = [];
  for (const r of recs) {
    const passo = PASSO_MESES[r.periodicidade] || 1;
    const diff = mesesEntre(r.data_inicio.slice(0, 7), mes);
    if (diff < 0 || diff % passo !== 0) continue;
    const vencimento = dataNoMes(mes, r.dia_cobranca);
    if (vencimento < r.data_inicio) continue;
    if (r.data_cancelamento && vencimento > r.data_cancelamento) continue;
    stmts.push([
      `INSERT OR IGNORE INTO fin_lancamentos
       (perfil, tipo, descricao, valor, categoria_id, data_vencimento, recorrencia_id, competencia)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [r.perfil, r.tipo, r.nome, r.valor, r.categoria_id, vencimento, r.id, mes],
    ]);
  }
  if (stmts.length) await db.batch(stmts);
  return stmts.length;
}

const moeda = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

/** Aviso diário por push: contas atrasadas, vencendo hoje e amanhã. */
export async function avisarVencimentos() {
  const hoje = hojeLocal();
  await gerarRecorrentes(hoje.slice(0, 7));
  const amanha = addDias(hoje, 1);
  const rows = await db.all(
    `SELECT descricao, valor, data_vencimento FROM fin_lancamentos
     WHERE tipo = 'despesa' AND data_pagamento IS NULL AND data_vencimento <= ?
     ORDER BY data_vencimento ASC`,
    [amanha]
  );
  if (!rows.length) return { pulado: 'nenhuma conta vencendo' };

  const atrasadas = rows.filter((r) => r.data_vencimento < hoje);
  const hojeL = rows.filter((r) => r.data_vencimento === hoje);
  const amanhaL = rows.filter((r) => r.data_vencimento === amanha);
  const soma = (l) => round2(l.reduce((s, r) => s + r.valor, 0));

  const partes = [];
  if (atrasadas.length) partes.push(`${atrasadas.length} atrasada(s) (${moeda(soma(atrasadas))})`);
  if (hojeL.length) partes.push(`${hojeL.length} vence(m) hoje (${moeda(soma(hojeL))})`);
  if (amanhaL.length) partes.push(`${amanhaL.length} vence(m) amanhã (${moeda(soma(amanhaL))})`);

  const body = `Contas: ${partes.join(' · ')}`;
  const envio = await enviarPushParaTodos({ title: 'To Win · Finanças', body, tag: 'financas' });
  return { enviada: true, body, ...envio };
}
