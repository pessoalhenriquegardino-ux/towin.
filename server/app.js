import express from 'express';
import cors from 'cors';

import { exigirLogin } from './middleware/auth.js';

import authRouter from './routes/auth.js';
import cronRouter from './routes/cron.js';
import metasRouter from './routes/metas.js';
import viciosRouter from './routes/vicios.js';
import reflexoesRouter from './routes/reflexoes.js';
import timelineRouter from './routes/timeline.js';
import chatRouter from './routes/chat.js';
import notificacoesRouter from './routes/notificacoes.js';
import configuracaoRouter from './routes/configuracao.js';
import dashboardRouter from './routes/dashboard.js';
import pomodoroRouter from './routes/pomodoro.js';
import tarefasRouter from './routes/tarefas.js';

const app = express();
app.disable('x-powered-by');
app.use(cors());
app.use(express.json({ limit: '8mb' })); // fotos em base64 podem ser um pouco maiores

const api = express.Router();
api.use(exigirLogin);

api.get('/health', (req, res) => res.json({ ok: true }));
api.use('/auth', authRouter);
api.use('/cron', cronRouter);
api.use('/metas', metasRouter);
api.use('/vicios', viciosRouter);
api.use('/reflexoes', reflexoesRouter);
api.use('/timeline', timelineRouter);
api.use('/chat', chatRouter);
api.use('/notificacoes', notificacoesRouter);
api.use('/configuracao', configuracaoRouter);
api.use('/dashboard', dashboardRouter);
api.use('/pomodoro', pomodoroRouter);
api.use('/tarefas', tarefasRouter);

app.use('/api', api);
// Na Vercel (serviço separado) o caminho pode chegar com ou sem o prefixo /api:
// aceitamos os dois. Fora da Vercel isso fica desligado pra não colidir com as rotas do site.
if (process.env.VERCEL) app.use('/', api);

app.use('/api', (req, res) => res.status(404).json({ erro: 'Rota não encontrada' }));

// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[erro]', req.method, req.originalUrl, err);
  if (res.headersSent) return;
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ erro: status === 500 ? 'Erro interno do servidor.' : err.message });
});

export default app;
