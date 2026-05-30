/**
 * import.routes.js
 * POST /api/import/project — upload Excel e cria projeto
 * GET  /api/import/template — formato esperado
 */
const { Router } = require('express');
const multer = require('multer');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { importProject, getTemplate } = require('../controllers/import.controller');

const router = Router();

// Multer: armazena em memória (sem disco)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel.sheet.macroEnabled.12',
      'text/csv',
      'application/octet-stream', // alguns clientes enviam assim
    ];
    const ext = file.originalname.split('.').pop().toLowerCase();
    const allowedExt = ['xlsx', 'xlsm', 'xls', 'csv'];

    if (allowed.includes(file.mimetype) || allowedExt.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Formato inválido. Use .xlsx, .xlsm, .xls ou .csv'));
    }
  },
});

router.use(authenticate);

router.get('/template',                      getTemplate);
router.post('/project', authorize('ADMIN', 'COLLABORATOR'), upload.single('file'), importProject);

module.exports = router;
