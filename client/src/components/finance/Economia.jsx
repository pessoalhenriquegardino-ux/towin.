import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { moeda, hojeISO, lerValor } from './format.js';

const titulo = { fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '26px 0 12px', fontFamily: 'var(--font-mono)' };

export default function Economia({ perfil, versao, onMudou }) {
  const [recs, setRecs] = useState(null);
  const [manuais, setManuais] = useState([]);
  const [descricao, setDescricao] = useState('');
  const [valor, setValor] = useState('');
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    Promise.all([api.fin.recorrencias(), api.fin.economias()]).then(([r, e]) => {
      if (!ativo) return;
      setRecs(r);
      setManuais(e);
    });
    return () => { ativo = false; };
  }, [versao]);

  if (!recs) return <div className="empty-state">Carregando...</div>;

  const filtra = (x) => perfil === 'todos' || x.perfil === perfil;
  const canceladas = recs.filter((r) => !r.ativa && r.economia && filtra(r));
  const manuaisVisiveis = manuais.filter(filtra);
  const totalCancel = canceladas.reduce((s, r) => s + r.economia.economizado, 0);
  const totalManual = manuaisVisiveis.reduce((s, e) => s + e.valor, 0);
  const mensal = canceladas.reduce((s, r) => s + r.economia.valor_mensal, 0);

  async function adicionar(e) {
    e.preventDefault();
    setErro('');
    const v = lerValor(valor);
    if (!descricao.trim()) return setErro('Descreva o que você deixou de gastar.');
    if (!Number.isFinite(v) || v <= 0) return setErro('Informe um valor maior que zero.');
    try {
      await api.fin.criarEconomia({ descricao: descricao.trim(), valor: v, data: hojeISO(), perfil: perfil === 'todos' ? 'pessoal' : perfil });
      setDescricao('');
      setValor('');
      onMudou();
    } catch (err) {
      setErro(err.message);
    }
  }

  async function excluir(id) {
    await api.fin.excluirEconomia(id);
    onMudou();
  }

  return (
    <div>
      <div className="panel" style={{ borderRadius: 'var(--radius-lg)', padding: 20 }}>
        <div className="eyebrow">Total economizado</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 'clamp(30px, 9vw, 42px)', color: 'var(--success)', marginTop: 6 }}>{moeda(totalCancel + totalManual)}</div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 8, lineHeight: 1.5 }}>
          {mensal > 0
            ? <>Só com o que você cancelou, são <strong>{moeda(mensal)}</strong> a menos por mês: <strong>{moeda(mensal * 12)}</strong> em 12 meses.</>
            : 'Cancele uma assinatura na aba "Fixas" e a economia passa a ser contada aqui automaticamente.'}
        </div>
      </div>

      <div className="stat-grid" style={{ marginTop: 12 }}>
        <div className="panel" style={{ borderRadius: 'var(--radius-md)', padding: 14 }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>Assinaturas canceladas</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, marginTop: 6 }}>{moeda(totalCancel)}</div>
        </div>
        <div className="panel" style={{ borderRadius: 'var(--radius-md)', padding: 14 }}>
          <div className="eyebrow" style={{ fontSize: 10 }}>Gastos evitados</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 17, marginTop: 6 }}>{moeda(totalManual)}</div>
        </div>
      </div>

      {canceladas.length > 0 && (
        <>
          <h3 style={titulo}>Por assinatura cancelada</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {canceladas.map((r) => (
              <div key={r.id} className="panel" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
                <div>
                  <div style={{ fontSize: 14.5 }}>{r.nome}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                    {moeda(r.economia.valor_mensal)}/mês · há {r.economia.meses.toLocaleString('pt-BR')} mês(es)
                  </div>
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>+{moeda(r.economia.economizado)}</div>
              </div>
            ))}
          </div>
        </>
      )}

      <h3 style={titulo}>Gastos evitados</h3>
      <p style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.5, marginTop: 0 }}>
        Deixou de comprar algo por impulso? Recusou um gasto desnecessário? Registre aqui pra ver quanto você realmente guardou.
      </p>

      <form onSubmit={adicionar} style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
        <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Não comprei o tênis" style={{ flex: '2 1 180px', padding: 12, borderRadius: 'var(--radius-md)' }} />
        <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="R$ 0,00" style={{ flex: '1 1 100px', padding: 12, borderRadius: 'var(--radius-md)' }} />
        <button className="btn btn-solid" type="submit">+ Registrar</button>
      </form>
      {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 10 }}>{erro}</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {manuaisVisiveis.map((e) => (
          <div key={e.id} className="panel" style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 'var(--radius-md)' }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14.5 }}>{e.descricao}</div>
              <div style={{ fontSize: 11.5, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)' }}>
                {e.data.slice(8, 10)}/{e.data.slice(5, 7)}/{e.data.slice(0, 4)} · {e.perfil}
              </div>
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)' }}>+{moeda(e.valor)}</div>
            <button onClick={() => excluir(e.id)} aria-label="Excluir" style={{ background: 'none', border: 'none', color: 'var(--text-faint)', fontSize: 16, padding: 4 }}>×</button>
          </div>
        ))}
        {manuaisVisiveis.length === 0 && <div className="empty-state" style={{ padding: '24px 20px' }}>Nenhum gasto evitado registrado ainda.</div>}
      </div>
    </div>
  );
}
