import { Router } from 'express';
import db from '../../db.js';
import { ah } from '../../middleware/async.js';
import { TIPOS, numero } from '../../services/financas.js';

const router = Router();

const PADRAO = {
  despesa: [
    'Moradia', 'Alimentação', 'Transporte', 'Saúde', 'Lazer', 'Educação', 'Assinaturas',
    'Compras', 'Impostos e taxas', 'Fornecedores', 'Marketing', 'Ferramentas e software',
    'Funcionários', 'Outros',
  ],
  receita: ['Salário', 'Pró-labore', 'Vendas', 'Freelance', 'Investimentos', 'Outros'],
};

async function garantirPadrao() {
  const { n } = await db.get('SELECT COUNT(*) AS n FROM fin_categorias');
  if (n > 0) return;
  const stmts = Object.entries(PADRAO).flatMap(([tipo, nomes]) =>
    nomes.map((nome) => ['INSERT OR IGNORE INTO fin_categorias (nome, tipo) VALUES (?, ?)', [nome, tipo]])
  );
  await db.batch(stmts);
}

router.get('/', ah(async (req, res) => {
  await garantirPadrao();
  res.json(await db.all('SELECT * FROM fin_categorias ORDER BY tipo ASC, nome ASC'));
}));

router.post('/', ah(async (req, res) => {
  const { nome, tipo = 'despesa' } = req.body;
  if (!nome || !nome.trim()) return res.status(400).json({ erro: 'nome é obrigatório' });
  if (!TIPOS.includes(tipo)) return res.status(400).json({ erro: 'tipo inválido' });
  const orc = numero(req.body.orcamento_mensal);
  try {
    const info = await db.run('INSERT INTO fin_categorias (nome, tipo, orcamento_mensal) VALUES (?, ?, ?)', [
      nome.trim(),
      tipo,
      Number.isFinite(orc) && orc > 0 ? orc : null,
    ]);
    res.status(201).json(await db.get('SELECT * FROM fin_categorias WHERE id = ?', [info.lastInsertRowid]));
  } catch {
    res.status(409).json({ erro: 'Já existe uma categoria com esse nome.' });
  }
}));

router.put('/:id', ah(async (req, res) => {
  const atual = await db.get('SELECT * FROM fin_categorias WHERE id = ?', [req.params.id]);
  if (!atual) return res.status(404).json({ erro: 'Categoria não encontrada' });
  const nome = (req.body.nome ?? atual.nome).trim();
  if (!nome) return res.status(400).json({ erro: 'nome é obrigatório' });
  let orcamento = atual.orcamento_mensal;
  if ('orcamento_mensal' in req.body) {
    const orc = numero(req.body.orcamento_mensal);
    orcamento = Number.isFinite(orc) && orc > 0 ? orc : null;
  }
  try {
    await db.run('UPDATE fin_categorias SET nome = ?, orcamento_mensal = ? WHERE id = ?', [nome, orcamento, req.params.id]);
  } catch {
    return res.status(409).json({ erro: 'Já existe uma categoria com esse nome.' });
  }
  res.json(await db.get('SELECT * FROM fin_categorias WHERE id = ?', [req.params.id]));
}));

router.delete('/:id', ah(async (req, res) => {
  const id = req.params.id;
  await db.batch([
    ['UPDATE fin_lancamentos SET categoria_id = NULL WHERE categoria_id = ?', [id]],
    ['UPDATE fin_recorrencias SET categoria_id = NULL WHERE categoria_id = ?', [id]],
    ['DELETE FROM fin_categorias WHERE id = ?', [id]],
  ]);
  res.status(204).end();
}));

export default router;
