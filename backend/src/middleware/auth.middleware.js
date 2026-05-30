// src/middleware/auth.middleware.js – JWT + controle de papéis
const jwt = require('jsonwebtoken');
const prisma = require('../prisma/client');

/**
 * Verifica o token JWT no header Authorization.
 * Injeta req.user com { id, email, role }.
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Verifica se o usuário ainda existe e está ativo
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({ error: 'Usuário inativo ou não encontrado.' });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Faça login novamente.' });
    }
    return res.status(401).json({ error: 'Token inválido.' });
  }
}

/**
 * Fábrica de middleware para restrição por papel.
 * Uso: authorize('ADMIN', 'COLLABORATOR')
 */
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        error: `Acesso negado. Requer papel: ${roles.join(' ou ')}.`,
      });
    }
    next();
  };
}

/**
 * Middleware: clientes só acessam projetos vinculados ao seu usuário.
 * Colaboradores e ADMINs têm acesso irrestrito.
 */
async function authorizeProjectAccess(req, res, next) {
  try {
    const { role, id: userId } = req.user;
    const projectId = req.params.projectId || req.params.id;

    if (role === 'ADMIN' || role === 'COLLABORATOR' || role === 'EXECUTIVE') return next();

    // CLIENT: verifica vínculo
    const link = await prisma.projectUser.findUnique({
      where: { projectId_userId: { projectId, userId } },
    });

    if (!link) {
      return res.status(403).json({ error: 'Sem acesso a este projeto.' });
    }
    next();
  } catch (err) {
    next(err);
  }
}

module.exports = { authenticate, authorize, authorizeProjectAccess };
