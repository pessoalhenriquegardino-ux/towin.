import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';

const CATEGORIAS = ['carreira', 'saúde', 'fé', 'família', 'financeiro', 'pessoal', 'outro'];

function arquivoParaBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function GoalForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const editando = Boolean(id);
  const fileRef = useRef(null);

  const [titulo, setTitulo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [prazo, setPrazo] = useState('');
  const [porque, setPorque] = useState('');
  const [categoria, setCategoria] = useState('pessoal');
  const [fotoUrl, setFotoUrl] = useState('');
  const [valorAlvo, setValorAlvo] = useState('');
  const [valorAtual, setValorAtual] = useState('');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (editando) {
      api.obterMeta(id).then((m) => {
        setTitulo(m.titulo);
        setDescricao(m.descricao || '');
        setPrazo(m.prazo ? m.prazo.slice(0, 10) : '');
        setPorque(m.porque);
        setCategoria(m.categoria || 'pessoal');
        setFotoUrl(m.foto_url || '');
        setValorAlvo(m.valor_alvo || '');
        setValorAtual(m.valor_atual || '');
      });
    }
  }, [id, editando]);

  async function handleFoto(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await arquivoParaBase64(file);
    setFotoUrl(base64);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setErro('');
    if (!titulo.trim() || !porque.trim()) {
      setErro('Título e o "porquê" são obrigatórios. Sem motivo, a meta não sustenta.');
      return;
    }
    setSalvando(true);
    try {
      const dados = {
        titulo,
        descricao,
        prazo: prazo || null,
        porque,
        categoria,
        foto_url: fotoUrl || null,
        valor_alvo: valorAlvo ? parseFloat(valorAlvo) : null,
        valor_atual: valorAtual ? parseFloat(valorAtual) : null,
      };
      if (editando) {
        await api.atualizarMeta(id, dados);
      } else {
        await api.criarMeta(dados);
      }
      navigate('/');
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function handleExcluir() {
    if (!confirm('Excluir esta meta permanentemente?')) return;
    await api.excluirMeta(id);
    navigate('/');
  }

  return (
    <div className="page">
      <h1 className="page-title">{editando ? 'Editar meta' : 'Nova meta'}</h1>

      {/* Preview em hero — igual como a meta vai aparecer no painel */}
      <div
        onClick={() => fileRef.current?.click()}
        className="panel"
        style={{
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          overflow: 'hidden',
          height: 190,
          marginBottom: 22,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'flex-end',
        }}
      >
        {fotoUrl ? (
          <>
            <img src={fotoUrl} alt="" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.75))' }} />
          </>
        ) : (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-faint)', fontSize: 13, textAlign: 'center', padding: 20 }}>
            Toque para adicionar a foto da sua meta<br />(ex: a Porsche que você quer)
          </div>
        )}
        <div style={{ position: 'relative', padding: 18, width: '100%' }}>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, textShadow: fotoUrl ? '0 2px 10px rgba(0,0,0,0.6)' : 'none' }}>
            {titulo || 'Título da meta'}
          </div>
          {valorAlvo && (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)', marginTop: 4 }}>
              alvo: {parseFloat(valorAlvo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
            </div>
          )}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
      </div>

      <form onSubmit={handleSubmit}>
        <div className="field">
          <label>Título</label>
          <input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Meu Porsche 911" />
        </div>

        <div className="field">
          <label>Categoria</label>
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Valor alvo (R$, opcional)</label>
            <input
              type="number"
              inputMode="decimal"
              value={valorAlvo}
              onChange={(e) => setValorAlvo(e.target.value)}
              placeholder="650000"
            />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Já tem guardado (R$)</label>
            <input
              type="number"
              inputMode="decimal"
              value={valorAtual}
              onChange={(e) => setValorAtual(e.target.value)}
              placeholder="0"
            />
          </div>
        </div>
        <span className="hint" style={{ display: 'block', marginTop: -10, marginBottom: 18 }}>
          Preencha só se for uma meta financeira — o card mostra quanto ainda falta juntar.
        </span>

        <div className="field">
          <label>Descrição</label>
          <textarea rows={3} value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="O que exatamente você quer alcançar?" />
        </div>

        <div className="field">
          <label>Prazo</label>
          <input type="date" value={prazo} onChange={(e) => setPrazo(e.target.value)} />
        </div>

        <div className="field">
          <label>O porquê (obrigatório)</label>
          <textarea
            rows={3}
            value={porque}
            onChange={(e) => setPorque(e.target.value)}
            placeholder="Por que essa meta importa de verdade? Isso é o combustível das suas provocações."
          />
          <span className="hint">Sem esse motivo, a meta não é criada. É proposital — te obriga a pensar antes de agir.</span>
        </div>

        {erro && <div style={{ color: 'var(--danger)', marginBottom: 16, fontSize: 14 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-solid" type="submit" disabled={salvando}>
            {salvando ? 'Salvando...' : editando ? 'Salvar alterações' : 'Criar meta'}
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
