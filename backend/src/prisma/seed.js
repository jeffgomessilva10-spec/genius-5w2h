// src/prisma/seed.js – Dados iniciais para desenvolvimento
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Iniciando seed...');

  // ── Usuários ─────────────────────────────────
  const adminHash = await bcrypt.hash('Admin@123', 12);
  const collabHash = await bcrypt.hash('Collab@123', 12);
  const clientHash = await bcrypt.hash('Client@123', 12);

  const admin = await prisma.user.upsert({
    where: { email: 'admin@geniusconsultoria.com.br' },
    update: {},
    create: {
      name: 'Admin Genius',
      email: 'admin@geniusconsultoria.com.br',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });

  const collaborator = await prisma.user.upsert({
    where: { email: 'colaborador@geniusconsultoria.com.br' },
    update: {},
    create: {
      name: 'Jefferson Silva',
      email: 'colaborador@geniusconsultoria.com.br',
      passwordHash: collabHash,
      role: 'COLLABORATOR',
    },
  });

  const client = await prisma.user.upsert({
    where: { email: 'cliente@empresa.com.br' },
    update: {},
    create: {
      name: 'Cliente Exemplo',
      email: 'cliente@empresa.com.br',
      passwordHash: clientHash,
      role: 'CLIENT',
    },
  });

  // ── Projeto ──────────────────────────────────
  const project = await prisma.project.upsert({
    where: { id: 'seed-project-1' },
    update: {},
    create: {
      id: 'seed-project-1',
      name: 'Planejamento Estratégico 2025',
      description: 'Projeto demonstrativo com o método 5W2H',
      startDate: new Date('2025-01-01'),
      endDate: new Date('2025-12-31'),
    },
  });

  // Vincula cliente ao projeto
  await prisma.projectUser.upsert({
    where: { projectId_userId: { projectId: project.id, userId: client.id } },
    update: {},
    create: { projectId: project.id, userId: client.id },
  });

  // ── Categorias ────────────────────────────────
  const categories = [
    { name: 'Site', color: '#F5C500', description: 'Desenvolvimento e manutenção do site' },
    { name: 'Rede Social', color: '#1DA1F2', description: 'Gestão das redes sociais' },
    { name: 'Planejamento Estratégico', color: '#10B981', description: 'Definição de metas e estratégias' },
    { name: 'Nova Apresentação', color: '#8B5CF6', description: 'Material de apresentação da empresa' },
    { name: 'Vendas', color: '#EF4444', description: 'Processos e metas de vendas' },
    { name: 'Tráfego Pago', color: '#F97316', description: 'Campanhas de mídia paga' },
    { name: 'E-mail Marketing', color: '#06B6D4', description: 'Campanhas e automações de e-mail' },
    { name: 'Estrutura Interna', color: '#6B7280', description: 'Processos e organização interna' },
  ];

  const createdCats = [];
  for (const cat of categories) {
    const c = await prisma.category.create({
      data: { ...cat, projectId: project.id },
    });
    createdCats.push(c);
  }

  // ── Atividades de exemplo ────────────────────
  await prisma.activity.createMany({
    data: [
      {
        code: '1.1',
        what: 'Reformular identidade visual do site',
        why: 'O site atual não reflete o posicionamento premium da Genius',
        who: 'Equipe de Design',
        where: 'Agência parceira / remoto',
        how: 'Redesign completo com novo layout responsivo e brand guidelines',
        howMuch: 8500.00,
        whenStart: new Date('2025-02-01'),
        whenEnd: new Date('2025-03-31'),
        status: 'IN_PROGRESS',
        risk: 'Atraso impacta lançamento das campanhas de tráfego pago',
        categoryId: createdCats[0].id,
        responsibleId: collaborator.id,
      },
      {
        code: '1.2',
        what: 'Implementar SEO on-page em todas as páginas',
        why: 'Aumentar tráfego orgânico e reduzir dependência de mídia paga',
        who: 'Especialista SEO',
        where: 'CMS do site (WordPress)',
        how: 'Pesquisa de palavras-chave, otimização de meta tags e conteúdo',
        howMuch: 3000.00,
        whenStart: new Date('2025-04-01'),
        whenEnd: new Date('2025-05-31'),
        status: 'PLANNED',
        risk: 'Sem SEO, o site terá baixa visibilidade orgânica',
        categoryId: createdCats[0].id,
        responsibleId: collaborator.id,
      },
      {
        code: '2.1',
        what: 'Criar calendário editorial mensal para Instagram e LinkedIn',
        why: 'Manter consistência e aumentar engajamento nas redes sociais',
        who: 'Social Media',
        where: 'Instagram, LinkedIn',
        how: 'Planejamento com 30 posts mensais, templates padronizados',
        howMuch: 1500.00,
        whenStart: new Date('2025-01-15'),
        whenEnd: new Date('2025-12-31'),
        status: 'IN_PROGRESS',
        risk: 'Irregularidade de posts diminui alcance orgânico',
        categoryId: createdCats[1].id,
        responsibleId: collaborator.id,
      },
      {
        code: '5.1',
        what: 'Estruturar funil de vendas com CRM',
        why: 'Aumentar taxa de conversão e rastrear oportunidades',
        who: 'Gestor Comercial',
        where: 'CRM (HubSpot ou Pipedrive)',
        how: 'Mapeamento do funil, treinamento da equipe, automações',
        howMuch: 5000.00,
        whenStart: new Date('2025-03-01'),
        whenEnd: new Date('2025-04-30'),
        status: 'DELAYED',
        risk: 'Sem funil estruturado, leads são perdidos no processo',
        categoryId: createdCats[4].id,
        responsibleId: collaborator.id,
      },
    ],
  });

  console.log('✅ Seed concluído!');
  console.log('   Admin:        admin@geniusconsultoria.com.br / Admin@123');
  console.log('   Colaborador:  colaborador@geniusconsultoria.com.br / Collab@123');
  console.log('   Cliente:      cliente@empresa.com.br / Client@123');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
