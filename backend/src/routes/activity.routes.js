// src/routes/activity.routes.js
const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/activity.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

router.get('/', ctrl.listActivities);
router.get('/stats/:projectId', ctrl.getProjectStats);
router.get('/:id', ctrl.getActivity);

// Somente COLLABORATOR e ADMIN alteram atividades
router.post('/',
  authorize('ADMIN', 'COLLABORATOR'),
  body('code').notEmpty(),
  body('what').notEmpty().withMessage('"O que" é obrigatório'),
  body('why').notEmpty().withMessage('"Por que" é obrigatório'),
  body('who').notEmpty().withMessage('"Quem" é obrigatório'),
  body('where').notEmpty().withMessage('"Onde" é obrigatório'),
  body('how').notEmpty().withMessage('"Como" é obrigatório'),
  body('categoryId').isUUID().withMessage('categoryId inválido'),
  ctrl.createActivity
);

router.put('/:id', authorize('ADMIN', 'COLLABORATOR'), ctrl.updateActivity);
router.delete('/:id', authorize('ADMIN', 'COLLABORATOR'), ctrl.deleteActivity);

module.exports = router;
