// src/controllers/project.controller.js
const { validationResult } = require('express-validator');
const prisma = require('../prisma/client');

// GET /api/projects
async function listProjects(req, res, next) {
  try {
    const { role, id: userId } = req.user;

    // Clientes só veem projetos vinculados
    const where = role === 'CLIENT'
      ? { users: { some: { userId } }, isActive: true }
      : { isActive: true };

    const projects = await prisma.project.findMany({
      where,
      include: {
        categories: {
          include: {
            _count: { select: { activities: true } },
          },
        },
        _count: { select: { categories: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return res.json({ projects });
  } catch (err) {
    next(err);
  }
}

// GET /api/projects/:id
async function getProject(req, res, next) {
  try {
    const { id } = req.params;

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        categories: {
          include: {
            activities: {
              include: { responsible: { select: { id: true, name: true, email: true } } },
              orderBy: { code: 'asc' },
            },
          },
          orderBy: { name: 'asc' },
        },
        users: {
          include: { user: { select: { id: true, name: true, email: true, role: true } } },
        },
      },
    });

    if (!project) return res.status(404).json({ error: 'Projeto não encontrado.' });

    return res.json({ project });
  } catch (err) {
    next(err);
  }
}

// POST /api/projects
async function createProject(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { name, description, startDate, endDate, clientIds } = req.body;

    const project = await prisma.project.create({
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        // Vincula clientes opcionalmente
        users: clientIds?.length
          ? { create: clientIds.map((userId) => ({ userId })) }
          : undefined,
      },
    });

    return res.status(201).json({ project });
  } catch (err) {
    next(err);
  }
}

// PUT /api/projects/:id
async function updateProject(req, res, next) {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(422).json({ errors: errors.array() });

    const { id } = req.params;
    const { name, description, startDate, endDate, isActive } = req.body;

    const project = await prisma.project.update({
      where: { id },
      data: {
        name,
        description,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        isActive,
      },
    });

    return res.json({ project });
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Projeto não encontrado.' });
    next(err);
  }
}

// DELETE /api/projects/:id  (soft delete)
async function deleteProject(req, res, next) {
  try {
    await prisma.project.update({
      where: { id: req.params.id },
      data: { isActive: false },
    });
    return res.status(204).send();
  } catch (err) {
    if (err.code === 'P2025') return res.status(404).json({ error: 'Projeto não encontrado.' });
    next(err);
  }
}

// POST /api/projects/:id/clients  – vincula cliente
async function addClient(req, res, next) {
  try {
    const { id: projectId } = req.params;
    const { userId } = req.body;

    const link = await prisma.projectUser.create({
      data: { projectId, userId },
    });

    return res.status(201).json({ link });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ error: 'Cliente já vinculado.' });
    next(err);
  }
}

// DELETE /api/projects/:id/clients/:userId
async function removeClient(req, res, next) {
  try {
    const { id: projectId, userId } = req.params;
    await prisma.projectUser.delete({
      where: { projectId_userId: { projectId, userId } },
    });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

module.exports = { listProjects, getProject, createProject, updateProject, deleteProject, addClient, removeClient };
