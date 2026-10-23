const BASE = '/api';

async function req(path, options = {}) {
  const resp = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!resp.ok) {
    let erro = `Erro ${resp.status}`;
    try {
      const body = await resp.json();
      erro = body.erro || erro;
    } catch {}
    if (resp.status === 401 && erro === 'nao_autenticado') {
      window.dispatchEvent(new Event('towin:nao-autenticado'));
    }
    throw new Error(erro);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

export const api = {
  // Autenticação (senha única)
  statusAuth: () => req('/auth/status'),
  login: (senha) => req('/auth/login', { method: 'POST', body: JSON.stringify({ senha }) }),
  logout: () => req('/auth/logout', { method: 'POST' }),

  // Metas
  listarMetas: (status) => req(`/metas${status ? `?status=${status}` : ''}`),
  obterMeta: (id) => req(`/metas/${id}`),
  criarMeta: (dados) => req('/metas', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarMeta: (id, dados) => req(`/metas/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirMeta: (id) => req(`/metas/${id}`, { method: 'DELETE' }),

  // Vícios
  listarVicios: (status) => req(`/vicios${status ? `?status=${status}` : ''}`),
  obterVicio: (id) => req(`/vicios/${id}`),
  criarVicio: (dados) => req('/vicios', { method: 'POST', body: JSON.stringify(dados) }),
  atualizarVicio: (id, dados) => req(`/vicios/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  registrarRecaida: (id, nota) => req(`/vicios/${id}/recaida`, { method: 'POST', body: JSON.stringify({ nota }) }),
  excluirVicio: (id) => req(`/vicios/${id}`, { method: 'DELETE' }),

  // Timeline
  obterTimeline: () => req('/timeline'),

  // Chat
  enviarMensagemChat: (mensagem, historico) =>
    req('/chat', { method: 'POST', body: JSON.stringify({ mensagem, historico }) }),
  obterHistoricoChat: () => req('/chat'),

  // Notificações / push
  listarNotificacoes: () => req('/notificacoes'),
  testarNotificacao: () => req('/notificacoes/testar', { method: 'POST' }),
  obterChavePublicaVapid: () => req('/notificacoes/vapid-public-key'),
  inscreverPush: (subscription) =>
    req('/notificacoes/inscrever', { method: 'POST', body: JSON.stringify(subscription) }),

  // Configuração
  obterConfiguracao: () => req('/configuracao'),
  atualizarConfiguracao: (dados) => req('/configuracao', { method: 'PUT', body: JSON.stringify(dados) }),

  // Dashboard
  obterFraseDoDia: () => req('/dashboard/frase-do-dia'),

  // Pomodoro
  registrarSessaoPomodoro: (meta_id, duracao_min) =>
    req('/pomodoro', { method: 'POST', body: JSON.stringify({ meta_id, duracao_min }) }),
  obterResumoPomodoro: () => req('/pomodoro/resumo'),

  // Tarefas
  listarTarefas: (data) => req(`/tarefas${data ? `?data=${data}` : ''}`),
  criarTarefa: (texto, data) => req('/tarefas', { method: 'POST', body: JSON.stringify({ texto, data }) }),
  atualizarTarefa: (id, dados) => req(`/tarefas/${id}`, { method: 'PUT', body: JSON.stringify(dados) }),
  excluirTarefa: (id) => req(`/tarefas/${id}`, { method: 'DELETE' }),
  limparConcluidas: (data) => req(`/tarefas${data ? `?data=${data}` : ''}`, { method: 'DELETE' }),
  reordenarTarefas: (ids) => req('/tarefas/reordenar', { method: 'POST', body: JSON.stringify({ ids }) }),

  // Finanças
  fin: {
    categorias: () => req('/financas/categorias'),
    criarCategoria: (d) => req('/financas/categorias', { method: 'POST', body: JSON.stringify(d) }),
    atualizarCategoria: (id, d) => req(`/financas/categorias/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    excluirCategoria: (id) => req(`/financas/categorias/${id}`, { method: 'DELETE' }),

    resumo: (mes, perfil) =>
      req(`/financas/resumo?mes=${mes}${perfil && perfil !== 'todos' ? `&perfil=${perfil}` : ''}`),

    lancamentos: (params) => req(`/financas/lancamentos?${new URLSearchParams(params)}`),
    criarLancamento: (d) => req('/financas/lancamentos', { method: 'POST', body: JSON.stringify(d) }),
    atualizarLancamento: (id, d) => req(`/financas/lancamentos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    excluirLancamento: (id, escopo) =>
      req(`/financas/lancamentos/${id}${escopo ? `?escopo=${escopo}` : ''}`, { method: 'DELETE' }),

    recorrencias: () => req('/financas/recorrencias'),
    criarRecorrencia: (d) => req('/financas/recorrencias', { method: 'POST', body: JSON.stringify(d) }),
    atualizarRecorrencia: (id, d) => req(`/financas/recorrencias/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    cancelarRecorrencia: (id, data) =>
      req(`/financas/recorrencias/${id}/cancelar`, { method: 'POST', body: JSON.stringify({ data_cancelamento: data }) }),
    reativarRecorrencia: (id) => req(`/financas/recorrencias/${id}/reativar`, { method: 'POST' }),
    excluirRecorrencia: (id) => req(`/financas/recorrencias/${id}`, { method: 'DELETE' }),

    economias: () => req('/financas/economias'),
    criarEconomia: (d) => req('/financas/economias', { method: 'POST', body: JSON.stringify(d) }),
    excluirEconomia: (id) => req(`/financas/economias/${id}`, { method: 'DELETE' }),

    urlExportar: (mes, perfil) => {
      const p = new URLSearchParams();
      if (mes) p.set('mes', mes);
      if (perfil && perfil !== 'todos') p.set('perfil', perfil);
      return `/api/financas/exportar?${p}`;
    },
  },
};
