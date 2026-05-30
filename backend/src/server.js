// src/server.js – Inicia servidor + agendador de notificações
const app = require('./app');
const { startNotificationScheduler } = require('./services/notification.scheduler');

const PORT = process.env.PORT || 3001;

const server = app.listen(PORT, () => {
  console.log(`🚀 Genius 5W2H API rodando na porta ${PORT}`);
  console.log(`🌐 Ambiente: ${process.env.NODE_ENV || 'development'}`);

  // Inicia verificação diária de prazos e riscos
  startNotificationScheduler();
});

// Graceful shutdown
process.on('SIGTERM', () => {
  server.close(() => {
    console.log('Servidor encerrado.');
    process.exit(0);
  });
});

module.exports = server;
