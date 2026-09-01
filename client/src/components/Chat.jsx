import { useEffect, useRef, useState } from 'react';
import { api } from '../lib/api.js';

export default function Chat() {
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState('');
  const fimRef = useRef(null);

  useEffect(() => {
    api.obterHistoricoChat().then((rows) => {
      setMensagens(
        rows.map((r) => ({ role: r.papel === 'coach' ? 'assistant' : 'user', content: r.texto }))
      );
    });
  }, []);

  useEffect(() => {
    fimRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [mensagens]);

  async function enviar(e) {
    e.preventDefault();
    if (!texto.trim() || enviando) return;
    setErro('');
    const minhaMensagem = texto.trim();
    setTexto('');
    setMensagens((prev) => [...prev, { role: 'user', content: minhaMensagem }]);
    setEnviando(true);

    try {
      const historico = mensagens.slice(-12);
      const { resposta } = await api.enviarMensagemChat(minhaMensagem, historico);
      setMensagens((prev) => [...prev, { role: 'assistant', content: resposta }]);
    } catch (err) {
      setErro(err.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="page" style={{ display: 'flex', flexDirection: 'column', height: 'calc(100dvh - 62px)', paddingBottom: 12 }}>
      <h1 className="page-title" style={{ marginBottom: 12 }}>Coach</h1>

      <div style={{ flex: 1, overflowY: 'auto', marginBottom: 12 }}>
        {mensagens.length === 0 && (
          <div className="empty-state">
            Fale com o Coach. Ele conhece suas metas e vícios cadastrados — nada de conversa vazia.
          </div>
        )}
        {mensagens.map((m, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start',
              marginBottom: 10,
            }}
          >
            <div
              className={m.role === 'user' ? '' : 'panel'}
              style={{
                maxWidth: '80%',
                padding: '11px 15px',
                borderRadius: 'var(--radius-md)',
                fontSize: 14,
                lineHeight: 1.5,
                background: m.role === 'user' ? 'var(--accent)' : undefined,
                color: m.role === 'user' ? '#050505' : 'var(--text)',
                fontWeight: m.role === 'user' ? 600 : 400,
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {enviando && (
          <div style={{ fontSize: 13, color: 'var(--text-faint)' }}>o coach está pensando...</div>
        )}
        <div ref={fimRef} />
      </div>

      {erro && <div style={{ color: 'var(--danger)', fontSize: 13, marginBottom: 8 }}>{erro}</div>}

      <form onSubmit={enviar} style={{ display: 'flex', gap: 8 }}>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="Escreva o que está pensando..."
          style={{ flex: 1, padding: 13, borderRadius: 'var(--radius-md)' }}
        />
        <button className="btn btn-solid" type="submit" disabled={enviando}>Enviar</button>
      </form>
    </div>
  );
}
