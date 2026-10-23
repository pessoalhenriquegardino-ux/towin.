import { Router } from 'express';
import db from '../../db.js';
import { ah } from '../../middleware/async.js';
import { hojeLocal } from '../../services/tempo.js';
import { PERFIS, numero, dataValida, round2 } from '../../services/financas.js';

const router = Router();

// "Gastos evitados": coisas que você deixou de comprar/pagar e quer contabilizar como economia.
router.get('/', ah(async (req, res) => {
  res.json(await db.all('SELECT * FROM fin_economias ORDER BY data DESC, id DESC'));
}));

router.post('/', ah(async (req, res) => {
  const { descricao, perfil = 'pessoal', data = hojeLocal() } = req.body;
  const valor = numero(req.body.valor);
  if (!descricao || !String(descricao).trim()) return res.status(400).json({ erro: 'descrição é obrigatória' });
  if (!Number.isFinite(valor) || valor <= 0) return res.status(400).json({ erro: 'valor deve ser maior que zero' });
  if (!PERFIS.includes(perfil)) return res.status(400).json({ erro: 'perfil inválido' });
  if (!dataValida(data)) return res.status(400).json({ erro: 'data inválida' });

  const info = await db.run('INSERT INTO fin_economias (descricao, valor, data, perfil) VALUES (?, ?, ?, ?)', [
    String(descricao).trim(), round2(valor), data, perfil,
  ]);
  res.status(201).json(await db.get('SELECT * FROM fin_economias WHERE id = ?', [info.lastInsertRowid]));
}));

router.delete('/:id', ah(async (req, res) => {
  await db.run('DELETE FROM fin_economias WHERE id = ?', [req.params.id]);
  res.status(204).end();
}));

export default router;
