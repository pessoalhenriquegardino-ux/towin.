import { useState } from 'react';
import { api } from '../../lib/api.js';
import Modal, { Alternador } from './Modal.jsx';
import { hojeISO, lerValor, PERIODICIDADES } from './format.js';

export default function RecorrenciaModal({ recorrencia, categorias, perfilPadrao, onSalvo, onFechar }) {
  const editando = Boolean(recorrencia);
  const [nome, setNome] = useState(recorrencia?.nome || '');
  const [tipo, setTipo] = useState(recorrencia?.tipo || 'despesa');
  const [perfil, setPerfil] = useState(recorrencia?.perfil || (perfilPadrao !== 'todos' ? perfilPadrao : 'pessoal'));
  const [valor, setValor] = useState(recorrencia ? String(recorrencia.valor).replace('.', ',') : '');
  const [periodicidade, setPeriodicidade] = useState(recorrencia?.periodicidade || 'mensal');
  const [dataInicio, setDataInicio] = useState(recorrencia?.data_inicio || hojeISO());
  const [dia, setDia] = useState(String(recorrencia?.dia_cobranca || Number(hojeISO().slice(8, 10))));
  const [categoriaId, setCategoriaId] = useState(recorrencia?.categoria_id ? String(recorrencia.categoria_id) : '');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    const v = lerValor(valor);
    if (!nome.trim()) return setErro('Informe o nome.');
    if (!Number.isFinite(v) || v <= 0) return setErro('Informe um valor maior que zero.');

    const dados = {
      nome: nome.trim(),
      tipo,
      perfil,
      valor: v,
      periodicidade,
      data_inicio: dataInicio,
      dia_cobranca: Number(dia),
      categoria_id: categoriaId ? Number(categoriaId) : null,
    };

    setSalvando(true);
    try {
      if (editando) await api.fin.atualizarRecorrencia(recorrencia.id, dados);
      else await api.fin.criarRecorrencia(dados);
      onSalvo();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Modal titulo={editando ? 'Editar assinatura / conta fixa' : 'Nova assinatura / conta fixa'} onFechar={onFechar}>
      <form onSubmit={salvar}>
        <div className="field">
          <label>Tipo</label>
          <Alternador valor={tipo} onChange={(t) => { setTipo(t); setCategoriaId(''); }} opcoes={[['despesa', 'Despesa'], ['receita', 'Receita fixa']]} />
        </div>

        <div className="field">
          <label>Conta</label>
          <Alternador valor={perfil} onChange={setPerfil} opcoes={[['pessoal', 'Pessoal'], ['empresa', 'Empresa']]} />
        </div>

        <div className="field">
          <label>Nome</label>
          <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Netflix, Aluguel, Internet, Salário" autoFocus={!editando} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Valor (R$)</label>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Cobrança</label>
            <select value={periodicidade} onChange={(e) => setPeriodicidade(e.target.value)}>
              {PERIODICIDADES.map(([v, r]) => (
                <option key={v} value={v}>{r}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>Começou em</label>
            <input type="date" value={dataInicio} onChange={(e) => setDataInicio(e.target.value)} />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Dia do mês</label>
            <input type="number" min="1" max="31" value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Categoria</label>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categorias.filter((c) => c.tipo === tipo).map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <span className="hint" style={{ display: 'block', marginBottom: 18 }}>
          O app cria sozinho o lançamento de cada mês. Pra assinaturas anuais, use o mês em que ela é cobrada em "Começou em".
        </span>

        {erro && <div style={{ color: 'var(--danger)', fontSize: 13.5, marginBottom: 14 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-solid" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          <button className="btn btn-ghost" type="button" onClick={onFechar}>Cancelar</button>
        </div>
      </form>
    </Modal>
  );
}
