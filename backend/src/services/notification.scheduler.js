// src/services/notification.scheduler.js
// Executa verificações automáticas de prazos via cron
const cron = require('node-cron');
const { checkDeadlines } = require('./notification.service');

function startNotificationScheduler() {
  // Todos os dias às 08:00 (horário do servidor)
  // Formato cron: segundo minuto hora dia mês diaDaSemana
  cron.schedule('0 8 * * *', async () => {
    console.log('[Scheduler] Verificando prazos e riscos...');
    try {
      await checkDeadlines();
    } catch (err) {
      console.error('[Scheduler] Erro na verificação:', err.message);
    }
  });

  console.log('⏰ Agendador de notificações iniciado (diariamente às 08:00)');
}

module.exports = { startNotificationScheduler };
