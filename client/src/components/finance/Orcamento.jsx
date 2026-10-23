import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { moeda, lerValor, nomeMes } from './format.js';

export default function Orcamento({ mes, perfil, categorias, versao, onMudou }) {
  const [gastos, setGastos] = useState({});
  const [novaNome, setNovaNome] = useState('');
  const [novoTipo, setNovoTipo] = useState('despesa');
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    api.fin.resumo(mes, perfil).then((r) => {
      if (!ativo) return;
      setGastos(Object.fromEntries(r.por_categoria.filter((c) => c.categoria_id).map((c) => [c.categoria_id, c.gasto])));
    });
    return () => { ativo = false; };
  }, [mes, perfil, versao]);

  const despesas = categorias.filter((c) => c.tipo === 'despesa');
  const receitas = categorias.filter((c) => c.tipo === 'receita');

  async function definirOrcamento(c, texto) {
    const v = lerValor(texto);
    const novo = Number.isFinite(v) && v > 0 ? v : null;
    if (novo === (c.orcamento_mensal || null)) return;
    await api.fin.atualizarCategoria(c.id, { orcamento_mensal: novo });
    onMudou();
  }

  async function adicionar(e) {
    e.preventDefault();
    if (!novaNome.trim()) return;
    setErro('');
    try {
      await api.fin.criarCategoria({ nome: novaNome.trim(), tipo: novoTipo });
      setNovaNome('');
      onMudou();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function excluir(c) {
    if (!confirm(`Excluir a categoria "${c.nome}"? Os lançamentos dela ficam sem categoria.`)) return;
    await api.fin.excluirCategoria(c.id);
    onMudou();
  }

  return (
    <div>
      <p style={{ fontSize: 13.5, color: 'var(--text-dim)', lineHeight: 1.55, marginTop: 0 }}>
        Defina um limite mensal por categoria. No Resumo, a barra fica vermelha quando você estoura. Gastos de {nomeMes(mes)}.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {despesas.map((c) => {
          const gasto = gastos[c.id] || 0;
          const pct = c.orcamento_mensal ? Math.round((gasto / c.orcamento_mensal) * 100) : null;
          return (
            <div key={c.id} className="panel" style={{ borderRadius: 'var(--radius-md)', padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14.5 }}>{c.nome}</div>
                  <div style={{ fontSize: 11.5, fontFamily: 'var(--font-mono)', color: pct !== null && pct > 100 ? 'var(--danger)' : 'var(--text-faint)' }}>
                    gasto {moeda(gasto)}{pct !== null ? ` · ${pct}%` : ''}
                  </div>
                </div>
                <input
                  key={`${c.id}-${c.orcamento_mensal}`}
                  inputMode="decimal"
                  defaultValue={c.orcamento_mensal ? String(c.orcamento_mensal).replace('.', ',') : ''}
                  placeholder="limite R$"
                  onBlur={(e) => definirOrcamento(c, e.target.value)}
                  style={{ width: 110, padding: '8px 10px', borderRadius: 'var(--radius-sm)', fontSize: 14, textAlign: 'right' }}
                />
                <button onClick={() => excluir(c)} aria-label="Excluir categoria" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 16, padding: 4 }}>×</button>
              </div>
              {pct !== null && (
                <div className="progress-bar" style={{ height: 4, marginTop: 8 }}>
                  <div className="progress-bar-fill" style={{ width: `${Math.min(100, pct)}%`, background: pct > 100 ? 'var(--danger)' : undefined }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <h3 style={{ fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '26px 0 12px', fontFamily: 'var(--font-mono)' }}>Categorias de receita</h3>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {receitas.map((c) => (
          <span key={c.id} className="pill" style={{ textTransform: 'none' }}>
            {c.nome}
            <button onClick={() => excluir(c)} aria-label="Excluir" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', padding: 0, marginLeft: 4 }}>×</button>
          </span>
        ))}
      </div>

      <form onSubmit={adicionar} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 26 }}>
        <input value={novaNome} onChange={(e) => setNovaNome(e.target.value)} placeholder="Nova categoria" style={{ flex: '1 1 160px', padding: 12, borderRadius: 'var(--radius-md)' }} />
        <select value={novoTipo} onChange={(e) => setNovoTipo(e.target.value)} style={{ padding: 12, borderRadius: 'var(--radius-md)' }}>
          <option value="despesa">Despesa</option>
          <option value="receita">Receita</option>
        </select>
        <button className="btn btn-solid" type="submit">+ Adicionar</button>
      </form>
      {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginTop: 8 }}>{erro}</div>}
    </div>
  );
}
