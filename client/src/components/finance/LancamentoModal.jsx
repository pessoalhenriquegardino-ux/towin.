import { useState } from 'react';
import { api } from '../../lib/api.js';
import Modal, { Alternador } from './Modal.jsx';
import { hojeISO, lerValor } from './format.js';

const FORMAS = ['', 'Pix', 'Cartão de crédito', 'Cartão de débito', 'Boleto', 'Dinheiro', 'Transferência', 'Débito automático'];

export default function LancamentoModal({ lancamento, categorias, perfilPadrao, mesPadrao, onSalvo, onFechar }) {
  const editando = Boolean(lancamento);
  const [tipo, setTipo] = useState(lancamento?.tipo || 'despesa');
  const [perfil, setPerfil] = useState(lancamento?.perfil || (perfilPadrao !== 'todos' ? perfilPadrao : 'pessoal'));
  const [descricao, setDescricao] = useState(lancamento?.descricao || '');
  const [valor, setValor] = useState(lancamento ? String(lancamento.valor).replace('.', ',') : '');
  const [vencimento, setVencimento] = useState(
    lancamento?.data_vencimento || (mesPadrao && mesPadrao !== hojeISO().slice(0, 7) ? `${mesPadrao}-01` : hojeISO())
  );
  const [categoriaId, setCategoriaId] = useState(lancamento?.categoria_id ? String(lancamento.categoria_id) : '');
  const [forma, setForma] = useState(lancamento?.forma_pagamento || '');
  const [observacao, setObservacao] = useState(lancamento?.observacao || '');
  const [pago, setPago] = useState(editando ? Boolean(lancamento.data_pagamento) : false);
  const [parcelas, setParcelas] = useState('1');
  const [erro, setErro] = useState('');
  const [salvando, setSalvando] = useState(false);

  const categoriasDoTipo = categorias.filter((c) => c.tipo === tipo);

  async function salvar(e) {
    e.preventDefault();
    setErro('');
    const v = lerValor(valor);
    if (!descricao.trim()) return setErro('Informe a descrição.');
    if (!Number.isFinite(v) || v <= 0) return setErro('Informe um valor maior que zero.');

    const dados = {
      tipo,
      perfil,
      descricao: descricao.trim(),
      valor: v,
      data_vencimento: vencimento,
      categoria_id: categoriaId ? Number(categoriaId) : null,
      forma_pagamento: forma || null,
      observacao: observacao.trim() || null,
    };

    setSalvando(true);
    try {
      if (editando) {
        dados.data_pagamento = pago ? lancamento.data_pagamento || hojeISO() : null;
        await api.fin.atualizarLancamento(lancamento.id, dados);
      } else {
        dados.pago = pago;
        dados.parcelas = tipo === 'despesa' ? Number(parcelas) || 1 : 1;
        await api.fin.criarLancamento(dados);
      }
      onSalvo();
    } catch (err) {
      setErro(err.message);
    } finally {
      setSalvando(false);
    }
  }

  async function excluir() {
    if (!confirm('Excluir este lançamento?')) return;
    let escopo;
    if (lancamento.grupo && confirm('Excluir também as parcelas seguintes deste parcelamento?')) escopo = 'futuras';
    await api.fin.excluirLancamento(lancamento.id, escopo);
    onSalvo();
  }

  return (
    <Modal titulo={editando ? 'Editar lançamento' : 'Novo lançamento'} onFechar={onFechar}>
      <form onSubmit={salvar}>
        <div className="field">
          <label>Tipo</label>
          <Alternador valor={tipo} onChange={(t) => { setTipo(t); setCategoriaId(''); }} opcoes={[['despesa', 'Despesa'], ['receita', 'Receita']]} />
        </div>

        <div className="field">
          <label>Conta</label>
          <Alternador valor={perfil} onChange={setPerfil} opcoes={[['pessoal', 'Pessoal'], ['empresa', 'Empresa']]} />
        </div>

        <div className="field">
          <label>Descrição</label>
          <input value={descricao} onChange={(e) => setDescricao(e.target.value)} placeholder="Ex: Mercado, Aluguel, Cliente X" autoFocus={!editando} />
        </div>

        <div style={{ display: 'flex', gap: 12 }}>
          <div className="field" style={{ flex: 1 }}>
            <label>{!editando && tipo === 'despesa' && Number(parcelas) > 1 ? 'Valor da parcela' : 'Valor (R$)'}</label>
            <input inputMode="decimal" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="0,00" />
          </div>
          <div className="field" style={{ flex: 1 }}>
            <label>Vencimento</label>
            <input type="date" value={vencimento} onChange={(e) => setVencimento(e.target.value)} />
          </div>
        </div>

        <div className="field">
          <label>Categoria</label>
          <select value={categoriaId} onChange={(e) => setCategoriaId(e.target.value)}>
            <option value="">Sem categoria</option>
            {categoriasDoTipo.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
        </div>

        <div className="field">
          <label>Forma de pagamento</label>
          <select value={forma} onChange={(e) => setForma(e.target.value)}>
            {FORMAS.map((f) => (
              <option key={f} value={f}>{f || 'Não informada'}</option>
            ))}
          </select>
        </div>

        {!editando && tipo === 'despesa' && (
          <div className="field">
            <label>Parcelas</label>
            <input type="number" min="1" max="60" value={parcelas} onChange={(e) => setParcelas(e.target.value)} />
            {Number(parcelas) > 1 && (
              <span className="hint">Cria {parcelas} lançamentos, um por mês, a partir do vencimento acima.</span>
            )}
          </div>
        )}

        <div className="field">
          <label>Observação</label>
          <input value={observacao} onChange={(e) => setObservacao(e.target.value)} placeholder="Opcional" />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, marginBottom: 20, cursor: 'pointer' }}>
          <input type="checkbox" checked={pago} onChange={(e) => setPago(e.target.checked)} style={{ width: 18, height: 18 }} />
          {tipo === 'receita' ? 'Já recebido' : 'Já pago'}
        </label>

        {erro && <div style={{ color: 'var(--danger)', fontSize: 13.5, marginBottom: 14 }}>{erro}</div>}

        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button className="btn btn-solid" type="submit" disabled={salvando}>{salvando ? 'Salvando...' : 'Salvar'}</button>
          <button className="btn btn-ghost" type="button" onClick={onFechar}>Cancelar</button>
          {editando && (
            <button className="btn btn-danger" type="button" onClick={excluir} style={{ marginLeft: 'auto' }}>Excluir</button>
          )}
        </div>
      </form>
    </Modal>
  );
}
