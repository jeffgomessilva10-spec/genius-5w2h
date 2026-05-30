/**
 * logger.service.js
 * Logger estruturado usando Winston.
 * Formato JSON para produção (facilita ingestão em Datadog, Logtail, etc.)
 * Formato colorido para desenvolvimento.
 */
const winston = require('winston');

const isProduction = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || (isProduction ? 'info' : 'debug'),
  defaultMeta: {
    service: 'genius-5w2h-api',
    version: '2.0.0',
  },
  format: isProduction
    ? winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      )
    : winston.format.combine(
        winston.format.colorize(),
        winston.format.timestamp({ format: 'HH:mm:ss' }),
        winston.format.printf(({ timestamp, level, message, ...meta }) => {
          const metaStr = Object.keys(meta).length && meta.service === undefined
            ? ' ' + JSON.stringify(meta)
            : '';
          return `${timestamp} [${level}] ${message}${metaStr}`;
        })
      ),
  transports: [
    new winston.transports.Console(),
  ],
});

/**
 * Middleware de log de requisições HTTP.
 */
function httpLogger(req, res, next) {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    const level = res.statusCode >= 500 ? 'error'
      : res.statusCode >= 400 ? 'warn'
      : 'info';

    logger[level]('HTTP Request', {
      method:     req.method,
      path:       req.path,
      status:     res.statusCode,
      durationMs: duration,
      ip:         req.ip,
      userId:     req.user?.id || null,
      userAgent:  req.headers['user-agent']?.substring(0, 80),
    });
  });
  next();
}

module.exports = { logger, httpLogger };
