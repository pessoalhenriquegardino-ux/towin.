import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { moeda, nomeMes, hojeISO, rotuloVencimento } from './format.js';

const titulo = { fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '0 0 12px', fontFamily: 'var(--font-mono)' };

function Barra({ valor, total, cor }) {
  const pct = total > 0 ? Math.min(100, (valor / total) * 100) : 0;
  return (
    <div className="progress-bar" style={{ height: 5 }}>
      <div className="progress-bar-fill" style={{ width: `${pct}%`, background: cor }} />
    </div>
  );
}

export default function Resumo({ mes, perfil, versao, onMudou, onAbrirLancamento, onIrPara }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setErro('');
    api.fin.resumo(mes, perfil).then((r) => ativo && setDados(r)).catch((e) => ativo && setErro(e.message));
    return () => { ativo = false; };
  }, [mes, perfil, versao]);

  if (erro) return <div style={{ color: 'var(--danger)' }}>{erro}</div>;
  if (!dados) return <div className="empty-state">Carregando...</div>;

  const t = dados.totais;
  const delta = dados.comparativo.despesas_mes_anterior
    ? Math.round(((t.despesas_previstas - dados.comparativo.despesas_mes_anterior) / dados.comparativo.despesas_mes_anterior) * 100)
    : null;
  const maxSerie = Math.max(1, ...dados.serie.flatMap((s) => [s.receitas, s.despesas]));
  const vazio = !t.receitas_previstas && !t.despesas_previstas;

  async function quitar(l) {
    await api.fin.atualizarLancamento(l.id, { data_pagamento: hojeISO() });
    onMudou();
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
      <div className="panel" style={{ borderRadius: 'var(--radius-lg)', padding: 20 }}>
        <div className="eyebrow">Saldo previsto em {nomeMes(mes)}</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(30px, 9vw, 42px)', fontWeight: 500, marginTop: 6, color: t.saldo_previsto < 0 ? 'var(--danger)' : 'var(--text)' }}>
          {moeda(t.saldo_previsto)}
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--text-faint)', marginTop: 6, fontFamily: 'var(--font-mono)' }}>
          realizado até agora: {moeda(t.saldo_realizado)}
        </div>
      </div>

      <div className="stat-grid quatro">
        <div className="panel" style={{ borderRadius: 'var(--radius-md)', padding: 14 }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>Receitas</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, margin: '4px 0 8px', color: 'var(--success)' }}>{moeda(t.receitas_previstas)}</div>
          <Barra valor={t.receitas_recebidas} total={t.receitas_previstas} cor="var(--success)" />
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>recebido {moeda(t.receitas_recebidas)}</div>
        </div>
        <div className="panel" style={{ borderRadius: 'var(--radius-md)', padding: 14 }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>Despesas</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, margin: '4px 0 8px' }}>{moeda(t.despesas_previstas)}</div>
          <Barra valor={t.despesas_pagas} total={t.despesas_previstas} cor="var(--text)" />
          <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>pago {moeda(t.despesas_pagas)}</div>
        </div>
        <div className="panel" style={{ borderRadius: 'var(--radius-md)', padding: 14 }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>A pagar</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, margin: '4px 0' }}>{moeda(t.a_pagar)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>ainda neste mês</div>
        </div>
        <div className="panel" style={{ borderRadius: 'var(--radius-md)', padding: 14 }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>A receber</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, margin: '4px 0' }}>{moeda(t.a_receber)}</div>
          <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>ainda neste mês</div>
        </div>
      </div>

      {delta !== null && (
        <div style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Despesas {delta > 0 ? 'subiram' : delta < 0 ? 'caíram' : 'ficaram iguais'}{delta !== 0 && <strong style={{ color: delta > 0 ? 'var(--danger)' : 'var(--success)' }}> {Math.abs(delta)}%</strong>} em relação ao mês anterior ({moeda(dados.comparativo.despesas_mes_anterior)}).
        </div>
      )}

      {vazio && (
        <div className="empty-state" style={{ padding: '30px 20px' }}>
          Nada lançado neste mês. Toque em <strong>+ Lançamento</strong> ou cadastre suas assinaturas e contas fixas na aba "Fixas".
        </div>
      )}

      {dados.atrasadas.quantidade > 0 && (
        <div style={{ background: 'var(--danger-bg)', border: '1px solid rgba(224,87,74,0.4)', borderRadius: 'var(--radius-md)', padding: '12px 14px', fontSize: 14, color: 'var(--danger)' }}>
          {dados.atrasadas.quantidade} conta(s) atrasada(s), somando {moeda(dados.atrasadas.valor)}.
        </div>
      )}

      {dados.proximos_vencimentos.length > 0 && (
        <section>
          <h3 style={titulo}>Próximos vencimentos</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {dados.proximos_vencimentos.slice(0, 8).map((l) => {
              const rot = rotuloVencimento(l.data_vencimento, null, dados.hoje);
              return (
                <div key={l.id} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '11px 14px', borderRadius: 'var(--radius-md)' }}>
                  <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onAbrirLancamento(l)}>
                    <div style={{ fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{l.descricao}</div>
                    <div style={{ fontSize: 11.5, color: rot.atrasado ? 'var(--danger)' : rot.alerta ? 'var(--text)' : 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                      {rot.texto} · {l.perfil}
                    </div>
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14, color: l.tipo === 'receita' ? 'var(--success)' : 'var(--text)' }}>
                    {l.tipo === 'receita' ? '+' : ''}{moeda(l.valor)}
                  </div>
                  <button className="btn btn-ghost" style={{ padding: '6px 12px', fontSize: 12 }} onClick={() => quitar(l)}>
                    {l.tipo === 'receita' ? 'Recebi' : 'Paguei'}
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {dados.por_categoria.length > 0 && (
        <section>
          <h3 style={titulo}>Gastos por categoria</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {dados.por_categoria.map((c) => {
              const estourou = c.percentual !== null && c.percentual > 100;
              return (
                <div key={c.nome}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5, marginBottom: 5 }}>
                    <span>{c.nome}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', color: estourou ? 'var(--danger)' : 'var(--text-dim)' }}>
                      {moeda(c.gasto)}{c.orcamento ? ` / ${moeda(c.orcamento)}` : ''}
                    </span>
                  </div>
                  <Barra valor={c.gasto} total={c.orcamento || dados.por_categoria[0].gasto} cor={estourou ? 'var(--danger)' : undefined} />
                  {c.percentual !== null && (
                    <div style={{ fontSize: 11, color: estourou ? 'var(--danger)' : 'var(--text-faint)', marginTop: 4 }}>
                      {estourou ? `estourou o orçamento em ${c.percentual - 100}%` : `${c.percentual}% do orçamento`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {perfil === 'todos' && (
        <section>
          <h3 style={titulo}>Pessoal x Empresa</h3>
          <div className="stat-grid">
            {dados.por_perfil.map((p) => (
              <div key={p.perfil} className="panel" style={{ borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div className="eyebrow" style={{ fontSize: 10, textTransform: 'capitalize' }}>{p.perfil}</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 8 }}>receitas</div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>{moeda(p.receitas)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 6 }}>despesas</div>
                <div style={{ fontFamily: 'var(--font-mono)' }}>{moeda(p.despesas)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h3 style={titulo}>Últimos 6 meses</h3>
        <div className="panel" style={{ borderRadius: 'var(--radius-md)', padding: '16px 14px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 120 }}>
            {dados.serie.map((s) => (
              <div key={s.mes} style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 3, height: '100%' }}>
                <div title={`Receitas ${moeda(s.receitas)}`} style={{ width: '38%', height: `${(s.receitas / maxSerie) * 100}%`, minHeight: s.receitas ? 3 : 0, background: 'var(--success)', borderRadius: '3px 3px 0 0' }} />
                <div title={`Despesas ${moeda(s.despesas)}`} style={{ width: '38%', height: `${(s.despesas / maxSerie) * 100}%`, minHeight: s.despesas ? 3 : 0, background: 'var(--text)', borderRadius: '3px 3px 0 0' }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {dados.serie.map((s) => (
              <div key={s.mes} style={{ flex: 1, textAlign: 'center', fontSize: 10.5, color: s.mes === mes ? 'var(--text)' : 'var(--text-faint)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                {nomeMes(s.mes, true)}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', fontSize: 11, color: 'var(--text-faint)', marginTop: 10 }}>
            <span><span style={{ color: 'var(--success)' }}>■</span> receitas</span>
            <span><span style={{ color: 'var(--text)' }}>■</span> despesas</span>
          </div>
        </div>
      </section>

      <section>
        <h3 style={titulo}>Economia</h3>
        <div className="panel" style={{ borderRadius: 'var(--radius-md)', padding: 16, cursor: 'pointer' }} onClick={() => onIrPara('economia')}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 24, color: 'var(--success)' }}>{moeda(dados.economia.total)}</div>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
            economizados com assinaturas canceladas e gastos evitados
            {dados.economia.mensal_recorrente > 0 && <> · hoje você já deixa de gastar {moeda(dados.economia.mensal_recorrente)}/mês</>}
          </div>
        </div>
      </section>
    </div>
  );
}
