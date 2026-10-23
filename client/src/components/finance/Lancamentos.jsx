import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { moeda, hojeISO, rotuloVencimento, dataCurta } from './format.js';

export default function Lancamentos({ mes, perfil, versao, onMudou, onAbrirLancamento }) {
  const [lista, setLista] = useState(null);
  const [tipo, setTipo] = useState('');
  const [status, setStatus] = useState('');
  const [busca, setBusca] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    setErro('');
    const params = { mes };
    if (perfil !== 'todos') params.perfil = perfil;
    if (tipo) params.tipo = tipo;
    if (status) params.status = status;
    if (busca.trim()) params.busca = busca.trim();
    const t = setTimeout(() => {
      api.fin.lancamentos(params).then((r) => ativo && setLista(r)).catch((e) => ativo && setErro(e.message));
    }, busca ? 250 : 0);
    return () => { ativo = false; clearTimeout(t); };
  }, [mes, perfil, tipo, status, busca, versao]);

  async function alternarPago(l) {
    await api.fin.atualizarLancamento(l.id, { data_pagamento: l.data_pagamento ? null : hojeISO() });
    onMudou();
  }

  const hoje = hojeISO();
  const totalFiltrado = lista ? lista.reduce((s, l) => s + (l.tipo === 'receita' ? l.valor : -l.valor), 0) : 0;

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        {[['', 'Todos'], ['despesa', 'Despesas'], ['receita', 'Receitas']].map(([v, r]) => (
          <button key={v} className={tipo === v ? 'pill pill-accent' : 'pill'} style={{ cursor: 'pointer' }} onClick={() => setTipo(v)}>{r}</button>
        ))}
        <span style={{ width: 1, background: 'var(--border)', margin: '0 2px' }} />
        {[['', 'Qualquer status'], ['pendente', 'Pendentes'], ['atrasado', 'Atrasados'], ['pago', 'Pagos']].map(([v, r]) => (
          <button key={v} className={status === v ? 'pill pill-accent' : 'pill'} style={{ cursor: 'pointer' }} onClick={() => setStatus(v)}>{r}</button>
        ))}
      </div>

      <input
        value={busca}
        onChange={(e) => setBusca(e.target.value)}
        placeholder="Buscar por descrição..."
        style={{ width: '100%', padding: '11px 14px', borderRadius: 'var(--radius-md)', marginBottom: 14 }}
      />

      {erro && <div style={{ color: 'var(--danger)', marginBottom: 12 }}>{erro}</div>}
      {lista && lista.length === 0 && <div className="empty-state">Nenhum lançamento encontrado neste mês.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {(lista || []).map((l) => {
          const rot = rotuloVencimento(l.data_vencimento, l.data_pagamento, hoje);
          return (
            <div key={l.id} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 'var(--radius-md)', opacity: l.data_pagamento ? 0.62 : 1 }}>
              <button
                onClick={() => alternarPago(l)}
                aria-label={l.data_pagamento ? 'Marcar como pendente' : 'Marcar como pago'}
                style={{
                  width: 24, height: 24, flexShrink: 0, borderRadius: '50%', padding: 0,
                  border: `1.5px solid ${l.data_pagamento ? 'var(--accent)' : 'var(--border-strong)'}`,
                  background: l.data_pagamento ? 'var(--accent)' : 'transparent',
                  color: '#050505', fontSize: 13, fontWeight: 700,
                }}
              >
                {l.data_pagamento ? '✓' : ''}
              </button>

              <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => onAbrirLancamento(l)}>
                <div style={{ fontSize: 14.5, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {l.descricao}
                  {l.parcela_total ? <span style={{ color: 'var(--text-faint)' }}> {l.parcela_num}/{l.parcela_total}</span> : null}
                  {l.recorrencia_id ? <span style={{ color: 'var(--text-faint)' }}> ↻</span> : null}
                </div>
                <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: rot.atrasado ? 'var(--danger)' : rot.alerta ? 'var(--text)' : 'var(--text-faint)' }}>
                  {rot.texto}{l.data_pagamento ? '' : ''} · {l.categoria_nome || 'sem categoria'} · {l.perfil}
                </div>
              </div>

              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 14.5, color: l.tipo === 'receita' ? 'var(--success)' : 'var(--text)' }}>
                  {l.tipo === 'receita' ? '+' : '−'}{moeda(l.valor)}
                </div>
                {!l.data_pagamento && <div style={{ fontSize: 10.5, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>{dataCurta(l.data_vencimento)}</div>}
              </div>
            </div>
          );
        })}
      </div>

      {lista && lista.length > 0 && (
        <div style={{ marginTop: 14, fontSize: 13, color: 'var(--text-dim)', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>
          {lista.length} lançamento(s) · saldo da lista: <strong style={{ color: totalFiltrado < 0 ? 'var(--danger)' : 'var(--success)' }}>{moeda(totalFiltrado)}</strong>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginTop: 24, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
        <a className="btn btn-ghost" href={api.fin.urlExportar(mes, perfil)} download style={{ fontSize: 12.5 }}>⬇ Exportar este mês (CSV)</a>
        <a className="btn btn-ghost" href={api.fin.urlExportar(null, perfil)} download style={{ fontSize: 12.5 }}>⬇ Exportar tudo (CSV)</a>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-faint)', lineHeight: 1.5 }}>
        O arquivo CSV abre direto no Excel e no Google Planilhas, com datas e valores no padrão brasileiro.
      </p>
    </div>
  );
}
