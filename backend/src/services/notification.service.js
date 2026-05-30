// src/services/notification.service.js
const prisma = require('../prisma/client');

// ── E-mail via Brevo (Sendinblue) SMTP ──────────
const nodemailer = require('nodemailer');
const transporter = nodemailer.createTransport({
  host: 'smtp-relay.brevo.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.BREVO_USER,
    pass: process.env.BREVO_SMTP_KEY,
  },
});

// ── WhatsApp via Twilio ──────────────────────────
async function sendWhatsApp(phone, message) {
  if (!process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN || !phone) return;
  try {
    const twilio = require('twilio');
    const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    const to = phone.startsWith('whatsapp:') ? phone : `whatsapp:${phone}`;
    await client.messages.create({
      from: process.env.TWILIO_WHATSAPP_FROM || 'whatsapp:+14155238886',
      to,
      body: message,
    });
  } catch (err) {
    console.error('[WhatsApp] Erro ao enviar:', err.message);
  }
}

/**
 * Envia e-mail + WhatsApp e salva notificação no banco.
 */
async function sendNotification({ userId, type, title, message, activityId, sentById = null }) {
  const notification = await prisma.notification.create({
    data: { userId, type, title, message, activityId: activityId || null, sentById },
    include: { user: { select: { email: true, name: true, phone: true } } },
  });

  const { email, name, phone } = notification.user;
  const whatsappMsg = `🔔 *Genius Consultoria*\n*${title}*\n\n${message}`;

  // E-mail via Brevo
  try {
    await transporter.sendMail({
      from: 'Genius Consultoria <noreply@geniusconsultoria.com.br>',
      to: email,
      subject: `[Genius Consultoria] ${title}`,
      html: buildEmailHtml(name, title, message),
    });
    await prisma.notification.update({ where: { id: notification.id }, data: { sentAt: new Date() } });
    console.log(`[Email] Enviado para ${email}`);
  } catch (err) {
    console.error('[Email] Erro ao enviar:', err.message);
  }

  // WhatsApp
  await sendWhatsApp(phone, whatsappMsg);

  return notification;
}

async function createStatusChangeNotification(activity, oldStatus, newStatus) {
  const labels = { PLANNED: 'Planejado', IN_PROGRESS: 'Em andamento', DELAYED: 'Atrasado', DONE: 'Finalizado' };
  const message = `A atividade "${activity.what}" (${activity.code}) mudou de "${labels[oldStatus]}" para "${labels[newStatus]}".`;

  const usersToNotify = new Set();
  if (activity.responsibleId) usersToNotify.add(activity.responsibleId);

  const projectUsers = await prisma.projectUser.findMany({
    where: { project: { categories: { some: { id: activity.categoryId } } } },
    select: { userId: true },
  });
  projectUsers.forEach(pu => usersToNotify.add(pu.userId));

  for (const userId of usersToNotify) {
    await sendNotification({ userId, type: 'STATUS_CHANGE', title: `Status atualizado: ${activity.code}`, message, activityId: activity.id });
  }
}

async function checkDeadlines() {
  const today = new Date();
  const daysBefore = parseInt(process.env.NOTIFICATION_DAYS_BEFORE || '3');
  const warningDate = new Date();
  warningDate.setDate(today.getDate() + daysBefore);

  const upcoming = await prisma.activity.findMany({
    where: { status: { in: ['PLANNED', 'IN_PROGRESS'] }, whenEnd: { gte: today, lte: warningDate } },
    include: { responsible: { select: { id: true } }, category: { include: { project: { include: { users: true } } } } },
  });

  for (const act of upcoming) {
    const daysLeft = Math.ceil((new Date(act.whenEnd) - today) / 86400000);
    const message = `A atividade "${act.what}" (${act.code}) tem prazo em ${daysLeft} dia(s).${act.risk ? ` Risco: ${act.risk}` : ''}`;
    const usersToNotify = new Set();
    if (act.responsibleId) usersToNotify.add(act.responsibleId);
    act.category.project.users.forEach(pu => usersToNotify.add(pu.userId));
    for (const userId of usersToNotify) {
      await sendNotification({ userId, type: 'DEADLINE_WARNING', title: `⚠️ Prazo em ${daysLeft} dia(s): ${act.code}`, message, activityId: act.id });
    }
  }

  const overdue = await prisma.activity.findMany({
    where: { status: { in: ['PLANNED', 'IN_PROGRESS'] }, whenEnd: { lt: today } },
    include: { responsible: { select: { id: true } }, category: { include: { project: { include: { users: true } } } } },
  });

  for (const act of overdue) {
    await prisma.activity.update({ where: { id: act.id }, data: { status: 'DELAYED' } });
    const usersToNotify = new Set();
    if (act.responsibleId) usersToNotify.add(act.responsibleId);
    act.category.project.users.forEach(pu => usersToNotify.add(pu.userId));
    for (const userId of usersToNotify) {
      await sendNotification({ userId, type: 'DEADLINE_EXCEEDED', title: `🔴 Prazo vencido: ${act.code}`, message: `A atividade "${act.what}" (${act.code}) está com prazo vencido.${act.risk ? ` Risco: ${act.risk}` : ''}`, activityId: act.id });
    }
  }

  console.log(`[Scheduler] ${upcoming.length} avisos, ${overdue.length} vencidas.`);
}

function buildEmailHtml(name, title, message) {
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><style>
    body{font-family:'Segoe UI',sans-serif;background:#F3F4F6;margin:0;padding:0}
    .wrap{max-width:600px;margin:40px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08)}
    .hdr{background:#F04E00;padding:28px 36px;display:flex;align-items:center;gap:12px}
    .hdr img{height:36px}
    .hdr h1{margin:0;color:#fff;font-size:18px;font-weight:800;letter-spacing:0.5px}
    .body{padding:36px;color:#374151}
    .body h2{color:#F04E00;font-size:17px;margin-top:0;font-weight:700}
    .body p{line-height:1.7;color:#6B7280;margin:0 0 12px}
    .btn{display:inline-block;background:#F04E00;color:#fff;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:700;margin-top:8px}
    .foot{padding:18px 36px;background:#F9FAFB;text-align:center;color:#9CA3AF;font-size:12px;border-top:1px solid #E5E7EB}
  </style></head><body>
    <div class="wrap">
      <div class="hdr"><h1>GENIUS CONSULTORIA</h1></div>
      <div class="body">
        <h2>${title}</h2>
        <p>Olá, <strong>${name}</strong>!</p>
        <p>${message}</p>
        <p>Acesse o painel para ver todos os detalhes do projeto.</p>
      </div>
      <div class="foot">© ${new Date().getFullYear()} Genius Consultoria · Genialidade que demonstra resultados</div>
    </div>
  </body></html>`;
}

/**
 * Envia boas-vindas com credenciais ao novo usuário.
 */
async function sendWelcomeNotification({ userId, name, email, password, phone }) {
  const title   = 'Bem-vindo à Genius Consultoria!';
  const message = `Seu acesso ao sistema foi criado. Use as credenciais abaixo para entrar:\n\nE-mail: ${email}\nSenha: ${password}\n\nAcesse: ${process.env.FRONTEND_URL || 'https://wonderful-pothos-f66e23.netlify.app'}`;

  // Salva no banco e envia e-mail
  await sendNotification({ userId, type: 'STATUS_CHANGE', title, message });

  // WhatsApp
  const whatsappMsg = `🎉 *Genius Consultoria*\n\nOlá, *${name}*! Seu acesso foi criado.\n\n📧 *E-mail:* ${email}\n🔑 *Senha:* ${password}\n\n🔗 Acesse: ${process.env.FRONTEND_URL || 'https://wonderful-pothos-f66e23.netlify.app'}\n\n_Recomendamos alterar sua senha após o primeiro acesso._`;
  await sendWhatsApp(phone, whatsappMsg);
}

module.exports = { sendNotification, createStatusChangeNotification, checkDeadlines, sendWelcomeNotification };
