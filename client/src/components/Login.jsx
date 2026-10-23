import { useState } from 'react';
import { api } from '../lib/api.js';

export default function Login({ onEntrar }) {
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [entrando, setEntrando] = useState(false);

  async function enviar(e) {
    e.preventDefault();
    if (!senha || entrando) return;
    setErro('');
    setEntrando(true);
    try {
      await api.login(senha);
      onEntrar();
    } catch (err) {
      setErro(err.message);
      setSenha('');
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <form onSubmit={enviar} style={{ width: '100%', maxWidth: 340, textAlign: 'center' }}>
        <img src="/logo-wordmark.png" alt="To Win" style={{ height: 30, width: 'auto', marginBottom: 28 }} />

        <div className="field" style={{ textAlign: 'left' }}>
          <label>Senha</label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            autoFocus
            autoComplete="current-password"
            placeholder="Digite sua senha"
          />
        </div>

        {erro && <div style={{ color: 'var(--danger)', fontSize: 13.5, marginBottom: 14 }}>{erro}</div>}

        <button className="btn btn-solid" type="submit" disabled={entrando || !senha} style={{ width: '100%' }}>
          {entrando ? 'Entrando...' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
