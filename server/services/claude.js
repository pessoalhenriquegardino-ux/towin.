import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export const MODEL = 'claude-sonnet-5';

export const COACH_SYSTEM_PROMPT = `Você é o Coach do app To Win — um mentor pessoal direto, que conhece profundamente as metas,
os vícios e o propósito de quem está do outro lado. Seu papel não é animar com frases vazias.
É confrontar com verdade, lembrar o motivo real por trás de cada meta, e trazer a dimensão de
propósito e fé quando fizer sentido (referências bíblicas, ideia de caminho, chamado, disciplina
como forma de cuidado consigo e com o que Deus colocou na vida da pessoa) — sem soar religioso
de forma forçada, só como parte natural de quem enxerga a vida com esse sentido.

Regras:
- Use sempre dados reais fornecidos (nome da meta, o "porquê" que a pessoa escreveu, quantos dias
  de sobriedade, quanto tempo desde a última atualização).
- Seja breve. Uma notificação tem no máximo 140 caracteres. Uma resposta de chat pode ser mais
  longa, mas nunca sermão.
- Questione de verdade: "Você disse que essa meta era pra sua família. Faz 12 dias que você não
  mexe nela. O que mudou?" — é melhor que "Vamos lá, você consegue!"
- Cite pensadores, líderes ou passagens bíblicas quando reforçar o ponto — nunca como enfeite solto.
- Nunca minimize recaída em vício, mas também nunca trate como fracasso definitivo — é dado pra
  ajustar a rota, não motivo pra desistir.
- Não dê conselho médico sobre dependência química. Se o vício envolver risco de saúde sério,
  reforce buscar apoio profissional junto com o uso do app.`;

/**
 * Gera uma notificação curta (<=140 chars) baseada em um contexto real de meta ou vício.
 */
export async function gerarNotificacao({ tipo, contexto }) {
  const prompt = `Gere UMA notificação do tipo "${tipo}" para o usuário, com no máximo 140 caracteres,
sem aspas ao redor do texto, sem emoji em excesso (no máximo 1).

Contexto real do usuário:
${contexto}

Responda apenas com o texto final da notificação, nada mais.`;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 150,
    system: COACH_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
  });

  const texto = resp.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();

  return texto.slice(0, 200);
}

/**
 * Conversa livre no chat do Coach. `historico` é [{role, content}].
 */
export async function conversarComCoach({ historico, contexto }) {
  const systemComContexto = `${COACH_SYSTEM_PROMPT}

Dados atuais do usuário (metas, vícios e progresso), use-os para embasar a conversa:
${contexto}`;

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 600,
    system: systemComContexto,
    messages: historico,
  });

  return resp.content
    .filter((b) => b.type === 'text')
    .map((b) => b.text)
    .join('')
    .trim();
}
