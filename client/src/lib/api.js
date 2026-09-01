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
    throw new Error(erro);
  }
  if (resp.status === 204) return null;
  return resp.json();
}

export const api = {
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
};
