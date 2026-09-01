import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';
import { useLandscapeFocus } from '../hooks/useLandscapeFocus.js';

const CICLOS = {
  foco: { label: 'Foco', minutos: 25 },
  pausaCurta: { label: 'Pausa curta', minutos: 5 },
  pausaLonga: { label: 'Pausa longa', minutos: 15 },
};

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function Pomodoro() {
  const [metas, setMetas] = useState([]);
  const [metaId, setMetaId] = useState('');
  const [modo, setModo] = useState('foco');
  const [segundosRestantes, setSegundosRestantes] = useState(CICLOS.foco.minutos * 60);
  const [rodando, setRodando] = useState(false);
  const [ciclosCompletos, setCiclosCompletos] = useState(0);
  const [mensagem, setMensagem] = useState('');
  const intervalRef = useRef(null);
  const { deitado, alternarForcado } = useLandscapeFocus();

  useEffect(() => {
    api.listarMetas('ativa').then(setMetas).catch(() => {});
  }, []);

  useEffect(() => {
    if (!rodando) return;
    intervalRef.current = setInterval(() => {
      setSegundosRestantes((s) => {
        if (s <= 1) {
          finalizarCiclo();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(intervalRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rodando]);

  async function finalizarCiclo() {
    setRodando(false);
    clearInterval(intervalRef.current);

    if (modo === 'foco') {
      const novosCiclos = ciclosCompletos + 1;
      setCiclosCompletos(novosCiclos);
      setMensagem('Foco concluído. Registrando...');
      try {
        await api.registrarSessaoPomodoro(metaId || null, CICLOS.foco.minutos);
        setMensagem('Sessão registrada. Hora da pausa.');
      } catch {
        setMensagem('Sessão concluída (não foi possível salvar no servidor).');
      }
      const proximo = novosCiclos % 4 === 0 ? 'pausaLonga' : 'pausaCurta';
      trocarModo(proximo);
    } else {
      setMensagem('Pausa acabou. Bora focar de novo.');
      trocarModo('foco');
    }

    if (Notification?.permission === 'granted') {
      new Notification('To Win — Pomodoro', {
        body: modo === 'foco' ? 'Ciclo de foco concluído. Faça sua pausa.' : 'Pausa concluída. Volte ao foco.',
      });
    }
  }

  function trocarModo(novoModo) {
    setModo(novoModo);
    setSegundosRestantes(CICLOS[novoModo].minutos * 60);
  }

  function alternar() {
    setRodando((r) => !r);
    setMensagem('');
  }

  function reiniciar() {
    setRodando(false);
    clearInterval(intervalRef.current);
    setSegundosRestantes(CICLOS[modo].minutos * 60);
    setMensagem('');
  }

  const minutos = Math.floor(segundosRestantes / 60);
  const segundos = segundosRestantes % 60;
  const totalSegundos = CICLOS[modo].minutos * 60;
  const progresso = ((totalSegundos - segundosRestantes) / totalSegundos) * 100;

  const metaSelecionada = metas.find((m) => String(m.id) === String(metaId));

  if (deitado) {
    return (
      <TimerDeitado
        minutos={minutos}
        segundos={segundos}
        progresso={progresso}
        modo={modo}
        rodando={rodando}
        metaSelecionada={metaSelecionada}
        onAlternar={alternar}
        onReiniciar={reiniciar}
        onSair={alternarForcado}
      />
    );
  }

  return (
    <div className="page">
      <div className="eyebrow">Foco cronometrado</div>
      <h1 className="page-title">Pomodoro</h1>

      <div style={{ display: 'flex', gap: 8, marginBottom: 22, flexWrap: 'wrap' }}>
        {Object.entries(CICLOS).map(([key, c]) => (
          <button
            key={key}
            className={modo === key ? 'pill pill-accent' : 'pill'}
            style={{ cursor: 'pointer', border: undefined }}
            onClick={() => {
              if (!rodando) trocarModo(key);
            }}
          >
            {c.label}
          </button>
        ))}
      </div>

      <div className="panel" style={{ borderRadius: 'var(--radius-lg)', padding: '36px 24px', textAlign: 'center' }}>
        {/* Anel de progresso circular com disco de vidro no centro — o "relógio" do foco */}
        <div
          style={{
            width: 'min(64vw, 240px)',
            height: 'min(64vw, 240px)',
            margin: '0 auto',
            borderRadius: '50%',
            background: `conic-gradient(var(--text) ${progresso * 3.6}deg, rgba(255,255,255,0.1) 0deg)`,
            padding: 8,
            transition: 'background 1s linear',
          }}
        >
          <div
            className="glass-circle"
            style={{
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--font-mono)',
                fontSize: 'clamp(36px, 11vw, 48px)',
                fontWeight: 500,
                letterSpacing: '-0.02em',
                color: 'var(--text)',
                lineHeight: 1,
              }}
            >
              {pad(minutos)}:{pad(segundos)}
            </div>
            <div style={{ marginTop: 8, color: 'var(--text-faint)', fontSize: 11.5, textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0 16px' }}>
              {CICLOS[modo].label}
            </div>
          </div>
        </div>

        {metaSelecionada && (
          <div style={{ marginTop: 16, fontSize: 13, color: 'var(--text-dim)' }}>vinculado a: {metaSelecionada.titulo}</div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 28, flexWrap: 'wrap' }}>
          <button className="btn btn-solid" onClick={alternar} style={{ minWidth: 120 }}>
            {rodando ? 'Pausar' : 'Iniciar'}
          </button>
          <button className="btn btn-ghost" onClick={reiniciar}>Reiniciar</button>
          <button className="btn btn-ghost" onClick={alternarForcado}>⤢ Deitar</button>
        </div>
      </div>

      {modo === 'foco' && (
        <div className="field" style={{ marginTop: 22 }}>
          <label>Vincular a uma meta (opcional)</label>
          <select value={metaId} onChange={(e) => setMetaId(e.target.value)} disabled={rodando}>
            <option value="">Nenhuma meta específica</option>
            {metas.map((m) => (
              <option key={m.id} value={m.id}>{m.titulo}</option>
            ))}
          </select>
        </div>
      )}

      {mensagem && (
        <div className="pill pill-accent" style={{ marginTop: 14 }}>{mensagem}</div>
      )}

      <div style={{ marginTop: 24, fontSize: 13, color: 'var(--text-faint)', textAlign: 'center' }}>
        {ciclosCompletos} ciclo(s) de foco completos nesta sessão.
      </div>
    </div>
  );
}

/**
 * Modo "deitado" — tela cheia, números enormes, pensado pra quando o celular
 * é deitado na horizontal e fica de lado sendo só acompanhado de longe.
 */
function TimerDeitado({ minutos, segundos, progresso, modo, rodando, metaSelecionada, onAlternar, onReiniciar, onSair }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '2vh',
      }}
      onDoubleClick={onAlternar}
    >
      <button
        onClick={onSair}
        className="glass-circle"
        style={{
          position: 'absolute',
          top: 16,
          right: 16,
          width: 40,
          height: 40,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--text)',
          fontSize: 18,
          border: 'none',
        }}
        aria-label="Sair do modo deitado"
      >
        ⤡
      </button>

      <div
        className="eyebrow"
        style={{ fontSize: '2.2vh', letterSpacing: '0.3em' }}
      >
        {modo === 'foco' ? 'Foco' : modo === 'pausaCurta' ? 'Pausa curta' : 'Pausa longa'}
        {metaSelecionada && ` · ${metaSelecionada.titulo}`}
      </div>

      <div
        style={{
          fontFamily: 'var(--font-mono)',
          fontWeight: 600,
          fontSize: 'min(26vw, 34vh)',
          lineHeight: 1,
          letterSpacing: '-0.02em',
          color: 'var(--text)',
        }}
      >
        {pad(minutos)}:{pad(segundos)}
      </div>

      <div style={{ width: '60vw', maxWidth: 480 }} className="progress-bar">
        <div className="progress-bar-fill" style={{ width: `${progresso}%` }} />
      </div>

      <div style={{ display: 'flex', gap: 14, marginTop: '2vh' }}>
        <button className="btn btn-solid" onClick={onAlternar} style={{ minWidth: 130 }}>
          {rodando ? 'Pausar' : 'Iniciar'}
        </button>
        <button className="btn btn-ghost" onClick={onReiniciar}>Reiniciar</button>
      </div>

      <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: '1vh' }}>
        toque duplo pausa/inicia · botão no canto sai do modo deitado
      </div>
    </div>
  );
}
