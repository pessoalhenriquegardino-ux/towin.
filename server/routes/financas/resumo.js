import { Router } from 'express';
import db from '../../db.js';
import { ah } from '../../middleware/async.js';
import { hojeLocal } from '../../services/tempo.js';
import {
  round2, mesValido, addMeses, addDias, diasEntre, perfilFiltro, gerarRecorrentes, economiaDaRecorrencia,
} from '../../services/financas.js';

const router = Router();

const soma = (lista, filtro = () => true) => round2(lista.filter(filtro).reduce((s, x) => s + x.valor, 0));

router.get('/', ah(async (req, res) => {
  const hoje = hojeLocal();
  const mes = mesValido(req.query.mes) || hoje.slice(0, 7);
  const perfil = perfilFiltro(req.query.perfil);
  await gerarRecorrentes(mes);

  const fp = perfil ? ' AND l.perfil = ?' : '';
  const ap = perfil ? [perfil] : [];
  const ini = `${mes}-01`;
  const fim = `${mes}-31`;
  const mesAnterior = addMeses(mes, -1);
  const inicioSerie = addMeses(mes, -5);

  const [lancamentos, anterior, pendentes, serie, categorias, canceladas, manuais] = await Promise.all([
    db.all(
      `SELECT l.*, c.nome AS categoria_nome FROM fin_lancamentos l
       LEFT JOIN fin_categorias c ON c.id = l.categoria_id
       WHERE l.data_vencimento >= ? AND l.data_vencimento <= ?${fp}`,
      [ini, fim, ...ap]
    ),
    db.all(
      `SELECT l.tipo, SUM(l.valor) AS total FROM fin_lancamentos l
       WHERE l.data_vencimento >= ? AND l.data_vencimento <= ?${fp} GROUP BY l.tipo`,
      [`${mesAnterior}-01`, `${mesAnterior}-31`, ...ap]
    ),
    db.all(
      `SELECT l.*, c.nome AS categoria_nome FROM fin_lancamentos l
       LEFT JOIN fin_categorias c ON c.id = l.categoria_id
       WHERE l.data_pagamento IS NULL AND l.data_vencimento <= ?${fp}
       ORDER BY l.data_vencimento ASC, l.id ASC LIMIT 40`,
      [addDias(hoje, 14), ...ap]
    ),
    db.all(
      `SELECT substr(l.data_vencimento, 1, 7) AS mes, l.tipo, SUM(l.valor) AS total FROM fin_lancamentos l
       WHERE l.data_vencimento >= ? AND l.data_vencimento <= ?${fp}
       GROUP BY mes, l.tipo`,
      [`${inicioSerie}-01`, fim, ...ap]
    ),
    db.all('SELECT * FROM fin_categorias'),
    db.all(`SELECT * FROM fin_recorrencias WHERE ativa = 0 AND data_cancelamento IS NOT NULL${perfil ? ' AND perfil = ?' : ''}`, ap),
    db.all(`SELECT * FROM fin_economias${perfil ? ' WHERE perfil = ?' : ''}`, ap),
  ]);

  const receitas = lancamentos.filter((l) => l.tipo === 'receita');
  const despesas = lancamentos.filter((l) => l.tipo === 'despesa');
  const pago = (l) => !!l.data_pagamento;

  const totais = {
    receitas_previstas: soma(receitas),
    receitas_recebidas: soma(receitas, pago),
    despesas_previstas: soma(despesas),
    despesas_pagas: soma(despesas, pago),
  };
  totais.a_receber = round2(totais.receitas_previstas - totais.receitas_recebidas);
  totais.a_pagar = round2(totais.despesas_previstas - totais.despesas_pagas);
  totais.saldo_previsto = round2(totais.receitas_previstas - totais.despesas_previstas);
  totais.saldo_realizado = round2(totais.receitas_recebidas - totais.despesas_pagas);

  const antes = Object.fromEntries(anterior.map((r) => [r.tipo, round2(r.total)]));
  const comparativo = {
    despesas_mes_anterior: antes.despesa || 0,
    receitas_mes_anterior: antes.receita || 0,
  };

  // Gasto por categoria (despesas do mês) com o orçamento, quando houver.
  const nomes = new Map(categorias.map((c) => [c.id, c]));
  const grupos = new Map();
  for (const d of despesas) {
    const chave = d.categoria_id ?? 0;
    const g = grupos.get(chave) || { categoria_id: d.categoria_id, nome: d.categoria_nome || 'Sem categoria', gasto: 0, pago: 0 };
    g.gasto += d.valor;
    if (pago(d)) g.pago += d.valor;
    grupos.set(chave, g);
  }
  for (const c of categorias) {
    if (c.tipo === 'despesa' && c.orcamento_mensal && !grupos.has(c.id)) {
      grupos.set(c.id, { categoria_id: c.id, nome: c.nome, gasto: 0, pago: 0 });
    }
  }
  const porCategoria = [...grupos.values()]
    .map((g) => {
      const orc = g.categoria_id ? nomes.get(g.categoria_id)?.orcamento_mensal || null : null;
      return {
        ...g,
        gasto: round2(g.gasto),
        pago: round2(g.pago),
        orcamento: orc,
        percentual: orc ? Math.round((g.gasto / orc) * 100) : null,
      };
    })
    .sort((a, b) => b.gasto - a.gasto);

  const porPerfil = ['pessoal', 'empresa'].map((p) => ({
    perfil: p,
    receitas: soma(receitas, (l) => l.perfil === p),
    despesas: soma(despesas, (l) => l.perfil === p),
  }));

  const proximos = pendentes.map((l) => ({ ...l, dias: diasEntre(hoje, l.data_vencimento) }));
  const atrasadas = proximos.filter((l) => l.tipo === 'despesa' && l.dias < 0);

  const meses = Array.from({ length: 6 }, (_, i) => addMeses(inicioSerie, i));
  const serieMensal = meses.map((m) => ({
    mes: m,
    receitas: round2(serie.find((s) => s.mes === m && s.tipo === 'receita')?.total),
    despesas: round2(serie.find((s) => s.mes === m && s.tipo === 'despesa')?.total),
  }));

  const itensEconomia = canceladas.map((r) => ({ id: r.id, nome: r.nome, ...economiaDaRecorrencia(r, hoje) }));
  const totalCancelamentos = round2(itensEconomia.reduce((s, i) => s + i.economizado, 0));
  const totalManual = round2(manuais.reduce((s, e) => s + e.valor, 0));

  res.json({
    mes,
    perfil: perfil || 'todos',
    hoje,
    totais,
    comparativo,
    por_categoria: porCategoria,
    por_perfil: porPerfil,
    proximos_vencimentos: proximos,
    atrasadas: { quantidade: atrasadas.length, valor: soma(atrasadas) },
    serie: serieMensal,
    economia: {
      total: round2(totalCancelamentos + totalManual),
      cancelamentos: totalCancelamentos,
      manual: totalManual,
      mensal_recorrente: round2(itensEconomia.reduce((s, i) => s + i.valor_mensal, 0)),
      projecao_anual: round2(itensEconomia.reduce((s, i) => s + i.valor_mensal, 0) * 12),
    },
  });
}));

export default router;
