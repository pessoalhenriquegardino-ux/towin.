import { useEffect, useState } from 'react';
import { api } from '../lib/api.js';
import { ativarNotificacoesPush, statusPermissaoNotificacao } from '../lib/push.js';

export default function Settings() {
  const [config, setConfig] = useState(null);
  const [statusPush, setStatusPush] = useState('default');
  const [mensagem, setMensagem] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    api.obterConfiguracao().then(setConfig);
    statusPermissaoNotificacao().then(setStatusPush);
  }, []);

  if (!config) return <div className="page">Carregando...</div>;

  function atualizarCampo(campo, valor) {
    setConfig((prev) => ({ ...prev, [campo]: valor }));
  }

  function atualizarHorario(i, valor) {
    const novos = [...config.horarios];
    novos[i] = valor;
    atualizarCampo('horarios', novos);
  }

  function adicionarHorario() {
    atualizarCampo('horarios', [...config.horarios, '12:00']);
  }

  function removerHorario(i) {
    atualizarCampo('horarios', config.horarios.filter((_, idx) => idx !== i));
  }

  async function salvar() {
    setSalvando(true);
    setMensagem('');
    try {
      const atualizado = await api.atualizarConfiguracao(config);
      setConfig(atualizado);
      setMensagem('Configurações salvas.');
    } catch (err) {
      setMensagem(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function ativarPush() {
    try {
      await ativarNotificacoesPush();
      setStatusPush('granted');
      setMensagem('Notificações ativadas. Você vai receber o Coach mesmo com o app fechado.');
    } catch (err) {
      setMensagem(err.message);
    }
  }

  async function testarNotificacao() {
    setMensagem('Gerando notificação de teste...');
    try {
      await api.testarNotificacao();
      setMensagem('Notificação de teste disparada. Confira seu navegador.');
    } catch (err) {
      setMensagem(err.message);
    }
  }

  return (
    <div className="page">
      <h1 className="page-title">Ajustes</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <h2 style={{ fontSize: 14, marginTop: 0 }}>Notificações push</h2>
        <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>
          Status atual: <strong>{statusPush}</strong>
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="btn btn-solid" onClick={ativarPush} disabled={statusPush === 'granted'}>
            {statusPush === 'granted' ? 'Ativadas' : 'Ativar notificações'}
          </button>
          <button className="btn btn-ghost" onClick={testarNotificacao}>Enviar notificação de teste</button>
        </div>
      </div>

      <div className="field">
        <label>Horários de notificação</label>
        {config.horarios.map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
            <input type="time" value={h} onChange={(e) => atualizarHorario(i, e.target.value)} />
            <button className="btn btn-ghost" type="button" onClick={() => removerHorario(i)}>remover</button>
          </div>
        ))}
        <button className="btn btn-ghost" type="button" onClick={adicionarHorario} style={{ alignSelf: 'flex-start' }}>
          + horário
        </button>
      </div>

      <div className="field">
        <label>Tom preferido</label>
        <select value={config.tom_preferido} onChange={(e) => atualizarCampo('tom_preferido', e.target.value)}>
          <option value="direto">Direto / provocador</option>
          <option value="acolhedor">Acolhedor</option>
        </select>
      </div>

      <div className="field" style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
        <input
          type="checkbox"
          checked={!!config.incluir_referencias_biblicas}
          onChange={(e) => atualizarCampo('incluir_referencias_biblicas', e.target.checked)}
          style={{ width: 18, height: 18 }}
        />
        <label style={{ margin: 0 }}>Incluir referências bíblicas e de propósito</label>
      </div>

      <div className="field">
        <label>Janela de silêncio</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <input type="time" value={config.janela_silencio_inicio} onChange={(e) => atualizarCampo('janela_silencio_inicio', e.target.value)} />
          <span style={{ color: 'var(--text-faint)' }}>até</span>
          <input type="time" value={config.janela_silencio_fim} onChange={(e) => atualizarCampo('janela_silencio_fim', e.target.value)} />
        </div>
      </div>

      {mensagem && <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 16 }}>{mensagem}</div>}

      <button className="btn btn-solid" onClick={salvar} disabled={salvando}>
        {salvando ? 'Salvando...' : 'Salvar configurações'}
      </button>
    </div>
  );
}
