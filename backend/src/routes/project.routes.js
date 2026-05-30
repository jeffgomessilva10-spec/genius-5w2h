// src/routes/project.routes.js
const { Router } = require('express');
const { body } = require('express-validator');
const ctrl = require('../controllers/project.controller');
const { authenticate, authorize, authorizeProjectAccess } = require('../middleware/auth.middleware');

const router = Router();
router.use(authenticate);

router.get('/',    ctrl.listProjects);
router.get('/:id', authorizeProjectAccess, ctrl.getProject);

// Somente ADMIN e COLLABORATOR criam/editam projetos
router.post('/',
  authorize('ADMIN', 'COLLABORATOR'),
  body('name').notEmpty().withMessage('Nome do projeto obrigatório'),
  ctrl.createProject
);

router.put('/:id',
  authorize('ADMIN', 'COLLABORATOR'),
  body('name').optional().notEmpty(),
  ctrl.updateProject
);

router.delete('/:id', authorize('ADMIN'), ctrl.deleteProject);

// Gerenciamento de clientes vinculados ao projeto
router.post('/:id/clients',              authorize('ADMIN', 'COLLABORATOR'), ctrl.addClient);
router.delete('/:id/clients/:userId',    authorize('ADMIN', 'COLLABORATOR'), ctrl.removeClient);

module.exports = router;
