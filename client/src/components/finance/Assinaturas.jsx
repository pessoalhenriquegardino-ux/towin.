import { useEffect, useState } from 'react';
import { api } from '../../lib/api.js';
import { moeda, hojeISO, proximaCobranca, dataCurta, PERIODICIDADES } from './format.js';

const rotuloPeriodo = Object.fromEntries(PERIODICIDADES);

export default function Assinaturas({ perfil, versao, onMudou, onAbrirRecorrencia }) {
  const [lista, setLista] = useState(null);
  const [erro, setErro] = useState('');

  useEffect(() => {
    let ativo = true;
    api.fin.recorrencias().then((r) => ativo && setLista(r)).catch((e) => ativo && setErro(e.message));
    return () => { ativo = false; };
  }, [versao]);

  if (erro) return <div style={{ color: 'var(--danger)' }}>{erro}</div>;
  if (!lista) return <div className="empty-state">Carregando...</div>;

  const visiveis = lista.filter((r) => perfil === 'todos' || r.perfil === perfil);
  const ativas = visiveis.filter((r) => r.ativa);
  const canceladas = visiveis.filter((r) => !r.ativa);
  const despesasAtivas = ativas.filter((r) => r.tipo === 'despesa');
  const custoMensal = despesasAtivas.reduce((s, r) => s + r.valor_mensal, 0);

  async function cancelar(r) {
    const ok = confirm(
      `Cancelar "${r.nome}"?\n\nA partir de hoje você deixa de pagar ${moeda(r.valor_mensal)} por mês (${moeda(r.valor_anual)} por ano). ` +
        'As cobranças futuras pendentes serão removidas e a economia começa a ser contada.'
    );
    if (!ok) return;
    await api.fin.cancelarRecorrencia(r.id, hojeISO());
    onMudou();
  }

  async function reativar(r) {
    await api.fin.reativarRecorrencia(r.id);
    onMudou();
  }

  async function excluir(r) {
    if (!confirm(`Excluir "${r.nome}" definitivamente? Os lançamentos já pagos continuam no histórico.`)) return;
    await api.fin.excluirRecorrencia(r.id);
    onMudou();
  }

  return (
    <div>
      <div className="panel" style={{ borderRadius: 'var(--radius-lg)', padding: 18, marginBottom: 18 }}>
        <div className="eyebrow">Você paga em assinaturas e contas fixas</div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 28, marginTop: 6 }}>{moeda(custoMensal)}<span style={{ fontSize: 14, color: 'var(--text-faint)' }}> /mês</span></div>
        <div style={{ fontSize: 13, color: 'var(--text-dim)', marginTop: 4 }}>
          {moeda(custoMensal * 12)} por ano em {despesasAtivas.length} item(ns). Revise o que você realmente usa.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', margin: 0, fontFamily: 'var(--font-mono)' }}>Ativas</h3>
        <button className="btn btn-ghost" style={{ padding: '8px 16px' }} onClick={() => onAbrirRecorrencia(null)}>+ Nova</button>
      </div>

      {ativas.length === 0 && <div className="empty-state" style={{ padding: '30px 20px' }}>Nenhuma assinatura ou conta fixa cadastrada. Cadastre Netflix, aluguel, internet, salário... e o app lança todo mês sozinho.</div>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {ativas.map((r) => {
          const prox = proximaCobranca(r);
          return (
            <div key={r.id} className="panel" style={{ borderRadius: 'var(--radius-md)', padding: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 15.5, fontWeight: 600 }}>{r.nome}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                    {rotuloPeriodo[r.periodicidade]} · {r.perfil} · {r.categoria_nome || 'sem categoria'}
                    {prox && <> · próxima {dataCurta(prox)}</>}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 16, color: r.tipo === 'receita' ? 'var(--success)' : 'var(--text)' }}>{moeda(r.valor)}</div>
                  {r.periodicidade !== 'mensal' && <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{moeda(r.valor_mensal)}/mês</div>}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                <button className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => onAbrirRecorrencia(r)}>Editar</button>
                <button className="btn btn-danger" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => cancelar(r)}>
                  {r.tipo === 'receita' ? 'Encerrar' : 'Cancelar e economizar'}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {canceladas.length > 0 && (
        <>
          <h3 style={{ fontSize: 12.5, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-dim)', margin: '28px 0 12px', fontFamily: 'var(--font-mono)' }}>Canceladas</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {canceladas.map((r) => (
              <div key={r.id} className="panel" style={{ borderRadius: 'var(--radius-md)', padding: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                  <div>
                    <div style={{ fontSize: 15, color: 'var(--text-dim)' }}>{r.nome}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-faint)', fontFamily: 'var(--font-mono)', marginTop: 3 }}>
                      cancelada em {r.data_cancelamento.slice(8, 10)}/{r.data_cancelamento.slice(5, 7)}/{r.data_cancelamento.slice(0, 4)}
                    </div>
                  </div>
                  {r.economia && (
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: 15, color: 'var(--success)' }}>+{moeda(r.economia.economizado)}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>{moeda(r.economia.valor_mensal)}/mês economizado</div>
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
                  <button className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => reativar(r)}>Reativar</button>
                  <button className="btn btn-ghost" style={{ padding: '7px 14px', fontSize: 12 }} onClick={() => excluir(r)}>Excluir</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
