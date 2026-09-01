import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

function agoraParaInputDatetime() {
  const d = new Date();
  d.setSeconds(0, 0);
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 16);
}

export default function AddictionForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(id);

  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [dataInicio, setDataInicio] = useState(agoraParaInputDatetime());
  const [motivo, setMotivo] = useState('');
  const [marcos, setMarcos] = useState('1,7,30,90,180,365');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (editando) {
      api.obterVicio(id).then((v) => {
        setNome(v.nome);
        setDescricao(v.descricao || '');
        setDataInicio(new Date(v.data_inicio_sobriedade).toISOString().slice(0, 16));
        setMotivo(v.motivo_principal);
        setMarcos((v.marcos_alvo || []).join(','));
      });
    }
  }, [id, editando]);

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (!nome.trim() || !motivo.trim() || !dataInicio) {
      setErro('Nome, motivo e a data de início são obrigatórios.');
      return;
    }
    setSalvando(true);
    try {
      const marcosAlvo = marcos
        .split(',')
        .map((m) => parseInt(m.trim(), 10))
        .filter((n) => Number.isFinite(n) && n > 0)
        .sort((a, b) => a - b);

      const dados = {
        nome,
        descricao,
        data_inicio_sobriedade: new Date(dataInicio).toISOString(),
        motivo_principal: motivo,
        marcos_alvo: marcosAlvo,
      };

      if (editando) {
        await api.atualizarVicio(id, dados);
      } else {
        await api.criarVicio(dados);
      }
      navigate('/');
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    if (!confirm('Excluir este acompanhamento permanentemente?')) return;
    await api.excluirVicio(id);
    navigate('/');
  }

  return (
    <div className="page">
      <h1 className="page-title">{editando ? 'Editar vício' : 'Novo vício / hábito'}</h1>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: álcool, pornografia, procrastinação" />
        </div>

        <div className="field">
          <label>Descrição</label>
          <textarea rows={2} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que é isso, por que quer largar" />
        </div>

        <div className="field">
          <label>Início da sobriedade (data e hora exatas)</label>
          <input type="datetime-local" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
        </div>

        <div className="field">
          <label>Motivo principal (obrigatório)</label>
          <textarea rows={3} value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Por que isso precisa acabar?" />
        </div>

        <div className="field">
          <label>Marcos a comemorar (dias, separados por vírgula)</label>
          <input value={marcos} onChange={(e) => setMarcos(e.target.value)} placeholder="1,7,30,90,180,365" />
        </div>

        {erro && <div style={{ color: 'var(--danger)', marginBottom: 16, fontSize: 14 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-solid" type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Começar a contar'}
          </button>
          <button className="btn btn-ghost" type="button" onClick={() => navigate('/')}>Cancelar</button>
          {editando && (
            <button className="btn btn-danger" type="button" onClick={handleExcluir} style={{ marginLeft: 'auto' }}>
              Excluir
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
