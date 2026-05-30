/**
 * import.controller.js
 * Importação de projetos via arquivo Excel/CSV.
 * POST /api/import/project
 */
const prisma = require('../prisma/client');
const { parseExcel } = require('../services/excel.service');
const { audit } = require('../services/audit.service');

/**
 * POST /api/import/project
 * Body (multipart): file (Excel), projectName (string, opcional)
 */
async function importProject(req, res, next) {
  try {
    if (!req.file) {
      return res.status(422).json({ error: 'Arquivo não enviado. Use o campo "file".' });
    }

    const buffer       = req.file.buffer;
    const projectName  = req.body.projectName?.trim() || req.file.originalname.replace(/\.[^.]+$/, '');
    const userId       = req.user.id;

    // 1. Faz o parsing do Excel
    const { projectName: derivedName, categories, activities } = parseExcel(buffer, projectName);
    const finalName = req.body.projectName?.trim() || derivedName;

    if (categories.length === 0 && activities.length === 0) {
      return res.status(422).json({
        error: 'Nenhum dado encontrado na planilha. Verifique o formato do arquivo.',
        tip: 'A planilha deve ter cabeçalho com campos WHAT, WHY, WHO, WHERE, HOW e coluna # com códigos numéricos.',
      });
    }

    // 2. Cria o projeto
    const project = await prisma.project.create({
      data: {
        name:        finalName,
        description: `Importado em ${new Date().toLocaleDateString('pt-BR')}`,
        startDate:   activities.find(a => a.whenStart)?.whenStart || null,
        endDate:     activities.filter(a => a.whenEnd).sort((a,b) => new Date(b.whenEnd) - new Date(a.whenEnd))[0]?.whenEnd || null,
        // Vincula o usuário importador como membro
        users: { create: [{ userId }] },
      },
    });

    // 3. Cria as categorias e mapeia código → id
    const categoryMap = {}; // parentCode → category.id

    for (const cat of categories) {
      const created = await prisma.category.create({
        data: {
          name:        cat.name,
          description: cat.description,
          color:       cat.color,
          projectId:   project.id,
        },
      });
      categoryMap[cat.code] = created.id;
    }

    // Se não há categorias explícitas, cria uma padrão
    if (Object.keys(categoryMap).length === 0) {
      const defaultCat = await prisma.category.create({
        data: { name: 'Geral', color: '#F04E00', projectId: project.id },
      });
      categoryMap['default'] = defaultCat.id;
    }

    // 4. Cria as atividades
    const createdActivities = [];
    for (const act of activities) {
      const catId = categoryMap[act.parentCode] || categoryMap['default'] || Object.values(categoryMap)[0];
      if (!catId) continue;

      // Tenta vincular responsável pelo nome
      let responsibleId = null;
      if (act.who) {
        const user = await prisma.user.findFirst({
          where: { name: { contains: act.who.split(' ')[0], mode: 'insensitive' }, isActive: true },
        });
        responsibleId = user?.id || null;
      }

      const created = await prisma.activity.create({
        data: {
          code:         act.code,
          what:         act.what,
          why:          act.why   || 'A definir',
          who:          act.who   || 'A definir',
          where:        act.where || 'A definir',
          how:          act.how   || 'A definir',
          howMuch:      act.howMuch,
          whenStart:    act.whenStart,
          whenEnd:      act.whenEnd,
          status:       act.status,
          risk:         act.risk,
          categoryId:   catId,
          responsibleId,
        },
      });
      createdActivities.push(created);
    }

    // 5. Auditoria
    await audit({
      action:    'CREATE',
      entity:    'Project',
      entityId:  project.id,
      userId,
      after:     { source: 'excel_import', file: req.file.originalname, categories: categories.length, activities: activities.length },
    });

    res.status(201).json({
      success:    true,
      project:    { id: project.id, name: project.name },
      stats: {
        categories: Object.keys(categoryMap).length,
        activities: createdActivities.length,
        skipped:    activities.length - createdActivities.length,
      },
      message: `Projeto "${project.name}" importado com sucesso! ${createdActivities.length} atividades criadas em ${Object.keys(categoryMap).length} categoria(s).`,
    });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/import/template
 * Retorna instruções sobre o formato esperado da planilha.
 */
function getTemplate(req, res) {
  res.json({
    format: 'Excel (.xlsx, .xlsm, .xls) ou CSV',
    columns: [
      { col: 'A',  field: '#',         description: 'Código: "1" = categoria, "1.1" = atividade', required: true },
      { col: 'B',  field: 'WHAT',      description: 'O Quê — descrição da tarefa', required: true },
      { col: 'C',  field: 'WHY',       description: 'Por Quê — motivo/benefício', required: false },
      { col: 'D',  field: 'WHO',       description: 'Quem — responsável', required: false },
      { col: 'E',  field: 'WHERE',     description: 'Onde — local/ambiente', required: false },
      { col: 'F',  field: 'HOW',       description: 'Como — metodologia', required: false },
      { col: 'G',  field: 'HOW MUCH',  description: 'Quanto — custo estimado (R$)', required: false },
      { col: 'H',  field: 'WHEN',      description: 'Data início (dd/mm/aaaa ou semana)', required: false },
      { col: 'I',  field: 'WHEN END',  description: 'Data término (dd/mm/aaaa)', required: false },
      { col: 'J',  field: 'STATUS',    description: 'Status: planejado, em andamento, atrasado, finalizado', required: false },
      { col: 'K',  field: 'RISK',      description: 'Descrição do risco', required: false },
    ],
    example: [
      { '#': '1',   WHAT: 'Vendas',                   WHY: '',                               WHO: '' },
      { '#': '1.1', WHAT: 'Estruturar funil de vendas', WHY: 'Aumentar conversão', WHO: 'Gestor Comercial', WHEN: '01/03/2026', 'WHEN END': '30/04/2026' },
      { '#': '2',   WHAT: 'Marketing Digital',          WHY: '',                               WHO: '' },
      { '#': '2.1', WHAT: 'Criar calendário editorial',  WHY: 'Manter consistência',  WHO: 'Social Media' },
    ],
    tips: [
      'A primeira linha com WHAT, WHY, WHO etc. é detectada automaticamente como cabeçalho',
      'Linhas com código sem ponto (ex: "1") criam categorias',
      'Linhas com código com ponto (ex: "1.1") criam atividades',
      'Datas podem ser dd/mm/aaaa, yyyy-mm-dd ou número serial do Excel',
      'O nome do projeto pode vir do nome da aba ou do campo "projectName" no upload',
    ],
  });
}

module.exports = { importProject, getTemplate };
