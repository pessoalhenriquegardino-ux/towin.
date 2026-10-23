# To Win

App pessoal (uso individual) de metas, sobriedade, tarefas e foco, com um "Coach" movido a IA (Claude)
que confronta em vez de animar. PWA em preto e branco, pensado primeiro pro celular.

## Estrutura

```
ToWin/
  client/   → PWA React + Vite
  server/   → API Express + banco (SQLite local / Turso em produção) + Web Push + Claude
  .github/workflows/notificacoes.yml → "acorda" o app a cada 30min pra disparar as notificações
```

## Rodar localmente

```bash
cd server && npm install && cp .env.example .env   # preencha o que quiser
npm run dev                                         # http://localhost:8787
```

```bash
cd client && npm install && npm run dev             # http://localhost:5173 (proxy de /api)
```

Sem `TURSO_DATABASE_URL` o app usa o arquivo `server/data/towin.sqlite`.
Sem `APP_PASSWORD` não há login (ok só no seu computador).

## Publicar de graça: Vercel + Turso + GitHub Actions

Custo: R$ 0. (O Coach de IA usa a API da Anthropic, que é cobrada à parte por uso.)

### 1. Turso (banco de dados)
1. Crie conta em turso.tech (entre com o GitHub) e crie um banco (região `aws-us-east-1`).
2. Copie a **URL** (`libsql://...`) e gere um **token** de acesso.

### 2. Vercel (site + API)
1. Importe o repositório do GitHub em vercel.com/new.
2. Em **Environment Variables**, adicione:

| Variável | Valor |
|---|---|
| `TURSO_DATABASE_URL` | URL do banco (passo 1) |
| `TURSO_AUTH_TOKEN` | token do banco (passo 1) |
| `APP_PASSWORD` | a senha que você vai digitar pra entrar no app |
| `SESSION_SECRET` | um texto aleatório longo |
| `CRON_SECRET` | outro texto aleatório longo |
| `VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY` | `npm run generate-vapid` (dentro de `server/`) |
| `VAPID_SUBJECT` | `mailto:seu-email` |
| `ANTHROPIC_API_KEY` | chave da Anthropic (precisa de crédito pro Coach funcionar) |

3. Faça o deploy.

### 3. GitHub Actions (notificações nos horários)
No repositório: **Settings → Secrets and variables → Actions → New repository secret**:
- `APP_URL` → endereço do app na Vercel, sem barra no final (ex: `https://towin.vercel.app`)
- `CRON_SECRET` → o mesmo valor configurado na Vercel

O workflow roda a cada 30 minutos; o app só envia no horário que você configurou em **Ajustes**,
no máximo uma vez por horário por dia. Observação: o GitHub pausa workflows agendados de repositórios
públicos sem nenhum commit por 60 dias — se as notificações pararem, abra a aba Actions e reative.

### 4. Instalar no celular
Abra o endereço no navegador do celular → "Adicionar à tela inicial". As notificações push precisam ser
ativadas em **Ajustes → Ativar notificações** (uma vez por aparelho).

## Segurança
- O app é protegido por uma senha única (`APP_PASSWORD`). Sem ela, qualquer pessoa com o endereço veria seus dados
  e poderia gastar seus créditos da Anthropic.
- Nunca commite o arquivo `.env`.
