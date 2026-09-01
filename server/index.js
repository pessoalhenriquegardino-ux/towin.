import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

import './db.js';
import { configurarWebPush } from './services/webpush.js';
import { iniciarAgendador } from './services/scheduler.js';

import metasRouter from './routes/metas.js';
import viciosRouter from './routes/vicios.js';
import reflexoesRouter from './routes/reflexoes.js';
import timelineRouter from './routes/timeline.js';
import chatRouter from './routes/chat.js';
import notificacoesRouter from './routes/notificacoes.js';
import configuracaoRouter from './routes/configuracao.js';
import dashboardRouter from './routes/dashboard.js';
import pomodoroRouter from './routes/pomodoro.js';

const app = express();
app.use(cors());
app.use(express.json({ limit: '8mb' })); // fotos em base64 podem ser um pouco maiores

app.use('/api/metas', metasRouter);
app.use('/api/vicios', viciosRouter);
app.use('/api/reflexoes', reflexoesRouter);
app.use('/api/timeline', timelineRouter);
app.use('/api/chat', chatRouter);
app.use('/api/notificacoes', notificacoesRouter);
app.use('/api/configuracao', configuracaoRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/pomodoro', pomodoroRouter);

app.get('/api/health', (req, res) => res.json({ ok: true }));

// Em produção, o próprio servidor entrega o PWA (build do client) — um único
// serviço, uma única URL. Em desenvolvimento local isso é ignorado (o client
// roda no Vite, em outra porta, com proxy de /api).
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientDist = path.join(__dirname, '..', 'client', 'dist');
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api')) return next();
    res.sendFile(path.join(clientDist, 'index.html'));
  });
}

configurarWebPush();
iniciarAgendador();

const PORT = process.env.PORT || 8787;
app.listen(PORT, () => {
  console.log(`\n  To Win — servidor rodando em http://localhost:${PORT}\n`);
});
