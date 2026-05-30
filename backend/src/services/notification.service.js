// src/services/notification.service.js
const nodemailer = require('nodemailer');
const prisma = require('../prisma/client');

// ── Transporter de e-mail ────────────────────────
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

/**
 * Envia e-mail e salva notificação no banco.
 */
async function sendNotification({ userId, type, title, message, activityId, sentById = null }) {
  // 1. Salva no banco
  const notification = await prisma.notification.create({
    data: {
      userId, type, title, message,
      activityId: activityId || null,
      sentById,
    },
    include: { user: { select: { email: true, name: true } } },
  });

  // 2. Envia e-mail
  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || 'noreply@geniusconsultoria.com.br',
      to: notification.user.email,
      subject: `[Genius Consultoria] ${title}`,
      html: buildEmailHtml(notification.user.name, title, message),
    });

    // Marca como enviado
    await prisma.notification.update({
      where: { id: notification.id },
      data: { sentAt: new Date() },
    });
  } catch (emailErr) {
    console.error('Erro ao enviar e-mail:', emailErr.message);
    // Não interrompe o fluxo; a notificação já foi salva no banco
  }

  return notification;
}

/**
 * Cria notificações de mudança de status para responsável e clientes do projeto.
 */
async function createStatusChangeNotification(activity, oldStatus, newStatus) {
  const labels = {
    PLANNED: 'Planejado', IN_PROGRESS: 'Em andamento',
    DELAYED: 'Atrasado', DONE: 'Finalizado',
  };

  const message = `A atividade "${activity.what}" (${activity.code}) mudou de "${labels[oldStatus]}" para "${labels[newStatus]}".`;

  const usersToNotify = new Set();

  // Responsável
  if (activity.responsibleId) usersToNotify.add(activity.responsibleId);

  // Clientes vinculados ao projeto
  const projectUsers = await prisma.projectUser.findMany({
    where: { project: { categories: { some: { id: activity.categoryId } } } },
    select: { userId: true },
  });
  projectUsers.forEach((pu) => usersToNotify.add(pu.userId));

  for (const userId of usersToNotify) {
    await sendNotification({
      userId,
      type: 'STATUS_CHANGE',
      title: `Status atualizado: ${activity.code}`,
      message,
      activityId: activity.id,
    });
  }
}

/**
 * Verifica atividades com prazo próximo ou vencido.
 * Chamado pelo agendador diário.
 */
async function checkDeadlines() {
  const today = new Date();
  const daysBefore = parseInt(process.env.NOTIFICATION_DAYS_BEFORE || '3');
  const warningDate = new Date();
  warningDate.setDate(today.getDate() + daysBefore);

  // Atividades com prazo nos próximos N dias (não finalizadas)
  const upcoming = await prisma.activity.findMany({
    where: {
      status: { in: ['PLANNED', 'IN_PROGRESS'] },
      whenEnd: { gte: today, lte: warningDate },
    },
    include: {
      responsible: { select: { id: true, name: true } },
      category: { include: { project: { include: { users: true } } } },
    },
  });

  for (const act of upcoming) {
    const daysLeft = Math.ceil((new Date(act.whenEnd) - today) / (1000 * 60 * 60 * 24));
    const message = `A atividade "${act.what}" (${act.code}) tem prazo em ${daysLeft} dia(s). ${act.risk ? `Risco: ${act.risk}` : ''}`;

    const usersToNotify = new Set();
    if (act.responsibleId) usersToNotify.add(act.responsibleId);
    act.category.project.users.forEach((pu) => usersToNotify.add(pu.userId));

    for (const userId of usersToNotify) {
      await sendNotification({
        userId,
        type: 'DEADLINE_WARNING',
        title: `⚠️ Prazo em ${daysLeft} dia(s): ${act.code}`,
        message,
        activityId: act.id,
      });
    }
  }

  // Atividades com prazo vencido
  const overdue = await prisma.activity.findMany({
    where: {
      status: { in: ['PLANNED', 'IN_PROGRESS'] },
      whenEnd: { lt: today },
    },
    include: {
      responsible: { select: { id: true } },
      category: { include: { project: { include: { users: true } } } },
    },
  });

  for (const act of overdue) {
    // Atualiza status para DELAYED automaticamente
    await prisma.activity.update({
      where: { id: act.id },
      data: { status: 'DELAYED' },
    });

    const usersToNotify = new Set();
    if (act.responsibleId) usersToNotify.add(act.responsibleId);
    act.category.project.users.forEach((pu) => usersToNotify.add(pu.userId));

    for (const userId of usersToNotify) {
      await sendNotification({
        userId,
        type: 'DEADLINE_EXCEEDED',
        title: `🔴 Prazo vencido: ${act.code}`,
        message: `A atividade "${act.what}" (${act.code}) está com prazo vencido. ${act.risk ? `Risco: ${act.risk}` : ''}`,
        activityId: act.id,
      });
    }
  }

  console.log(`[Scheduler] Verificação concluída: ${upcoming.length} avisos, ${overdue.length} vencidas.`);
}

/** Template HTML do e-mail */
function buildEmailHtml(name, title, message) {
  return `
  <!DOCTYPE html>
  <html lang="pt-BR">
  <head><meta charset="UTF-8"><style>
    body { font-family: 'Segoe UI', sans-serif; background: #111; margin: 0; padding: 0; }
    .wrapper { max-width: 600px; margin: 40px auto; background: #1a1a1a; border-radius: 8px; overflow: hidden; }
    .header { background: #F5C500; padding: 24px 32px; }
    .header h1 { margin: 0; color: #111; font-size: 20px; font-weight: 900; letter-spacing: 1px; }
    .body { padding: 32px; color: #e5e5e5; }
    .body h2 { color: #F5C500; font-size: 18px; margin-top: 0; }
    .body p { line-height: 1.6; color: #ccc; }
    .footer { padding: 16px 32px; background: #0d0d0d; text-align: center; color: #555; font-size: 12px; }
  </style></head>
  <body>
    <div class="wrapper">
      <div class="header"><h1>GENIUS CONSULTORIA</h1></div>
      <div class="body">
        <h2>${title}</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>${message}</p>
        <p>Acesse o painel para ver mais detalhes.</p>
      </div>
      <div class="footer">© ${new Date().getFullYear()} Genius Consultoria · Genialidade que demonstra resultados</div>
    </div>
  </body>
  </html>`;
}

module.exports = { sendNotification, createStatusChangeNotification, checkDeadlines };
