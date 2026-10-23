import crypto from 'node:crypto';

// Proteção por senha única (app pessoal). Se APP_PASSWORD não estiver definida,
// o login fica desligado — conveniente no desenvolvimento local.
const COOKIE = 'towin_sessao';
const UM_ANO_SEG = 365 * 24 * 60 * 60;

export const protegido = () => Boolean(process.env.APP_PASSWORD);

const segredo = () => process.env.SESSION_SECRET || process.env.APP_PASSWORD || '';

function assinar(valor) {
  return crypto.createHmac('sha256', segredo()).update(valor).digest('base64url');
}

export function iguais(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function criarToken() {
  const expira = String(Date.now() + UM_ANO_SEG * 1000);
  return `${expira}.${assinar(expira)}`;
}

function tokenValido(token) {
  if (!token) return false;
  const [expira, assinatura] = token.split('.');
  if (!expira || !assinatura || !iguais(assinatura, assinar(expira))) return false;
  return Number(expira) > Date.now();
}

function lerCookie(req, nome) {
  const bruto = req.headers.cookie || '';
  for (const parte of bruto.split(';')) {
    const [k, ...v] = parte.trim().split('=');
    if (k === nome) return decodeURIComponent(v.join('='));
  }
  return null;
}

export const estaAutenticado = (req) => !protegido() || tokenValido(lerCookie(req, COOKIE));

function ehHttps(req) {
  return req.secure || req.headers['x-forwarded-proto'] === 'https';
}

export function iniciarSessao(req, res) {
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=${UM_ANO_SEG}${ehHttps(req) ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', `${COOKIE}=${criarToken()}; ${flags}`);
}

export function encerrarSessao(req, res) {
  const flags = `Path=/; HttpOnly; SameSite=Lax; Max-Age=0${ehHttps(req) ? '; Secure' : ''}`;
  res.setHeader('Set-Cookie', `${COOKIE}=; ${flags}`);
}

// Montado em /api: caminhos abaixo são relativos a esse prefixo.
const ABERTOS = ['/health', '/auth', '/cron'];

export function exigirLogin(req, res, next) {
  if (ABERTOS.some((p) => req.path === p || req.path.startsWith(`${p}/`))) return next();
  if (estaAutenticado(req)) return next();
  res.status(401).json({ erro: 'nao_autenticado' });
}
