// src/routes/auth.routes.js
const { Router } = require('express');
const { body } = require('express-validator');
const { login, register, me } = require('../controllers/auth.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();

router.post('/login',
  body('email').isEmail().withMessage('E-mail inválido'),
  body('password').notEmpty().withMessage('Senha obrigatória'),
  login
);

router.post('/register',
  authenticate,
  authorize('ADMIN'),
  body('name').notEmpty().withMessage('Nome obrigatório'),
  body('email').isEmail().withMessage('E-mail inválido'),
  body('password').isLength({ min: 8 }).withMessage('Senha mínima 8 caracteres'),
  body('role').optional().isIn(['ADMIN', 'COLLABORATOR', 'CLIENT']),
  register
);

router.get('/me', authenticate, me);

module.exports = router;
