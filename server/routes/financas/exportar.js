import { Router } from 'express';
import db from '../../db.js';
import { ah } from '../../middleware/async.js';
import { hojeLocal } from '../../services/tempo.js';
import { mesValido, perfilFiltro, gerarRecorrentes } from '../../services/financas.js';

const router = Router();

// CSV no formato do Excel/Sheets em português: separador ";", vírgula decimal, datas DD/MM/AAAA, com BOM.
const dataBR = (d) => (d ? `${d.slice(8, 10)}/${d.slice(5, 7)}/${d.slice(0, 4)}` : '');
const numeroBR = (n) => Number(n).toFixed(2).replace('.', ',');
const campo = (v) => {
  const t = String(v ?? '');
  return /[;"\n\r]/.test(t) ? `"${t.replace(/"/g, '""')}"` : t;
};

router.get('/', ah(async (req, res) => {
  const mes = mesValido(req.query.mes);
  if (mes) await gerarRecorrentes(mes);
  const perfil = perfilFiltro(req.query.perfil);
  const hoje = hojeLocal();

  const where = [];
  const args = [];
  if (mes) { where.push('l.data_vencimento >= ? AND l.data_vencimento <= ?'); args.push(`${mes}-01`, `${mes}-31`); }
  if (perfil) { where.push('l.perfil = ?'); args.push(perfil); }

  const rows = await db.all(
    `SELECT l.*, c.nome AS categoria_nome FROM fin_lancamentos l
     LEFT JOIN fin_categorias c ON c.id = l.categoria_id
     ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY l.data_vencimento ASC, l.id ASC`,
    args
  );

  const cabecalho = [
    'Vencimento', 'Pagamento', 'Tipo', 'Perfil', 'Descrição', 'Categoria', 'Valor', 'Valor com sinal',
    'Status', 'Forma de pagamento', 'Parcela', 'Observação',
  ];
  const linhas = rows.map((l) => {
    const status = l.data_pagamento ? 'Pago' : l.data_vencimento < hoje ? 'Atrasado' : 'Pendente';
    return [
      dataBR(l.data_vencimento),
      dataBR(l.data_pagamento),
      l.tipo === 'receita' ? 'Receita' : 'Despesa',
      l.perfil === 'empresa' ? 'Empresa' : 'Pessoal',
      l.descricao,
      l.categoria_nome || '',
      numeroBR(l.valor),
      numeroBR(l.tipo === 'receita' ? l.valor : -l.valor),
      status,
      l.forma_pagamento || '',
      l.parcela_total ? `${l.parcela_num}/${l.parcela_total}` : '',
      l.observacao || '',
    ];
  });

  const csv = '﻿' + [cabecalho, ...linhas].map((l) => l.map(campo).join(';')).join('\r\n');
  const nome = `towin-financas-${mes || 'completo'}${perfil ? `-${perfil}` : ''}.csv`;
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${nome}"`);
  res.send(csv);
}));

export default router;
