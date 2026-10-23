import { Router } from 'express';
import categorias from './categorias.js';
import lancamentos from './lancamentos.js';
import recorrencias from './recorrencias.js';
import economias from './economias.js';
import resumo from './resumo.js';
import exportar from './exportar.js';

const router = Router();
router.use('/categorias', categorias);
router.use('/lancamentos', lancamentos);
router.use('/recorrencias', recorrencias);
router.use('/economias', economias);
router.use('/resumo', resumo);
router.use('/exportar', exportar);

export default router;
