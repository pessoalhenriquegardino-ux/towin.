import { useCallback, useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { mesAtual, addMes, nomeMes, cap } from './finance/format.js';
import Resumo from './finance/Resumo.jsx';
import Lancamentos from './finance/Lancamentos.jsx';
import Assinaturas from './finance/Assinaturas.jsx';
import Orcamento from './finance/Orcamento.jsx';
import Economia from './finance/Economia.jsx';
import LancamentoModal from './finance/LancamentoModal.jsx';
import RecorrenciaModal from './finance/RecorrenciaModal.jsx';

const ABAS = [
  ['resumo', 'Resumo'],
  ['lancamentos', 'Lançamentos'],
  ['fixas', 'Fixas'],
  ['orcamento', 'Orçamento'],
  ['economia', 'Economia'],
];
const USA_MES = ['resumo', 'lancamentos', 'orcamento'];

export default function Finance() {
  const [aba, setAba] = useState('resumo');
  const [mes, setMes] = useState(mesAtual());
  const [perfil, setPerfil] = useState('todos');
  const [categorias, setCategorias] = useState([]);
  const [versao, setVersao] = useState(0);
  const [modalLanc, setModalLanc] = useState(null); // null | { lancamento: obj|null }
  const [modalRec, setModalRec] = useState(null);

  const onMudou = useCallback(() => setVersao((v) => v + 1), []);

  useEffect(() => {
    api.fin.categorias().then(setCategorias).catch(() => {});
  }, [versao]);

  function aoSalvarLancamento() {
    setModalLanc(null);
    onMudou();
  }

  function aoSalvarRecorrencia() {
    setModalRec(null);
    onMudou();
  }

  return (
    <div className="page page-wide">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
        <div>
          <div className="eyebrow">Controle financeiro</div>
          <h1 className="page-title" style={{ marginBottom: 14 }}>Finanças</h1>
        </div>
        <button className="btn btn-solid" onClick={() => setModalLanc({ lancamento: null })} style={{ marginTop: 6 }}>
          + Lançamento
        </button>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[['todos', 'Tudo'], ['pessoal', 'Pessoal'], ['empresa', 'Empresa']].map(([v, r]) => (
          <button key={v} className={perfil === v ? 'pill pill-accent' : 'pill'} style={{ cursor: 'pointer' }} onClick={() => setPerfil(v)}>
            {r}
          </button>
        ))}
      </div>

      <div className="tabs">
        {ABAS.map(([v, r]) => (
          <button key={v} className={aba === v ? 'pill pill-accent' : 'pill'} onClick={() => setAba(v)}>{r}</button>
        ))}
      </div>

      {USA_MES.includes(aba) && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => setMes(addMes(mes, -1))} aria-label="Mês anterior">←</button>
          <div className="pill pill-accent" style={{ textTransform: 'none', flex: 1, justifyContent: 'center' }}>{cap(nomeMes(mes))}</div>
          <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => setMes(addMes(mes, 1))} aria-label="Próximo mês">→</button>
          {mes !== mesAtual() && (
            <button className="btn btn-ghost" style={{ padding: '8px 14px' }} onClick={() => setMes(mesAtual())}>Hoje</button>
          )}
        </div>
      )}

      {aba === 'resumo' && (
        <Resumo
          mes={mes}
          perfil={perfil}
          versao={versao}
          onMudou={onMudou}
          onAbrirLancamento={(l) => setModalLanc({ lancamento: l })}
          onIrPara={setAba}
        />
      )}
      {aba === 'lancamentos' && (
        <Lancamentos mes={mes} perfil={perfil} versao={versao} onMudou={onMudou} onAbrirLancamento={(l) => setModalLanc({ lancamento: l })} />
      )}
      {aba === 'fixas' && (
        <Assinaturas perfil={perfil} versao={versao} onMudou={onMudou} onAbrirRecorrencia={(r) => setModalRec({ recorrencia: r })} />
      )}
      {aba === 'orcamento' && (
        <Orcamento mes={mes} perfil={perfil} categorias={categorias} versao={versao} onMudou={onMudou} />
      )}
      {aba === 'economia' && <Economia perfil={perfil} versao={versao} onMudou={onMudou} />}

      {modalLanc && (
        <LancamentoModal
          lancamento={modalLanc.lancamento}
          categorias={categorias}
          perfilPadrao={perfil}
          mesPadrao={mes}
          onSalvo={aoSalvarLancamento}
          onFechar={() => setModalLanc(null)}
        />
      )}
      {modalRec && (
        <RecorrenciaModal
          recorrencia={modalRec.recorrencia}
          categorias={categorias}
          perfilPadrao={perfil}
          onSalvo={aoSalvarRecorrencia}
          onFechar={() => setModalRec(null)}
        />
      )}
    </div>
  );
}
