import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../lib/api.js';
import PhotoPositioner from './PhotoPositioner.jsx';

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
  const [fotoPosX, setFotoPosX] = useState(50);
  const [fotoPosY, setFotoPosY] = useState(50);
  const [fotoZoom, setFotoZoom] = useState(100);
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
        setFotoPosX(m.foto_pos_x ?? 50);
        setFotoPosY(m.foto_pos_y ?? 50);
        setFotoZoom(m.foto_zoom ?? 100);
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
    setFotoPosX(50);
    setFotoPosY(50);
    setFotoZoom(100);
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
        foto_pos_x: fotoPosX,
        foto_pos_y: fotoPosY,
        foto_zoom: fotoZoom,
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

      <div style={{ marginBottom: 22 }}>
        <PhotoPositioner
          fotoUrl={fotoUrl}
          posX={fotoPosX}
          posY={fotoPosY}
          zoom={fotoZoom}
          onChangePos={(x, y) => { setFotoPosX(x); setFotoPosY(y); }}
          onChangeZoom={setFotoZoom}
          onTrocarFoto={() => fileRef.current?.click()}
        />
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFoto} style={{ display: 'none' }} />
        {(titulo || valorAlvo) && (
          <div style={{ marginTop: 10, fontSize: 13, color: 'var(--text-dim)' }}>
            <strong style={{ color: 'var(--text)' }}>{titulo || 'Título da meta'}</strong>
            {valorAlvo && (
              <span style={{ fontFamily: 'var(--font-mono)', marginLeft: 8 }}>
                · alvo: {parseFloat(valorAlvo).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })}
              </span>
            )}
          </div>
        )}
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
