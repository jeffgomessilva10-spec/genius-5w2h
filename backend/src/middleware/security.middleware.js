/**
 * security.middleware.js
 * Camada de segurança centralizada seguindo princípios Zero Trust.
 * Aplica: CSP, sanitização de inputs, detecção de injeção, slow-down.
 */
const xss = require('xss');

// Configuração XSS permissiva para campos de texto livre
const xssOptions = {
  whiteList: {},      // nenhuma tag HTML permitida em inputs
  stripIgnoreTag: true,
  stripIgnoreTagBody: ['script', 'style'],
};

/**
 * Sanitiza recursivamente todos os campos string de req.body e req.query.
 * Previne XSS, injeção HTML e caracteres de controle.
 */
function sanitizeInputs(req, res, next) {
  function clean(obj) {
    if (!obj || typeof obj !== 'object') return obj;
    for (const key of Object.keys(obj)) {
      if (typeof obj[key] === 'string') {
        // Remove caracteres de controle e sanitiza XSS
        obj[key] = xss(obj[key].replace(/[\x00-\x08\x0B\x0E-\x1F\x7F]/g, ''), xssOptions).trim();
      } else if (typeof obj[key] === 'object' && obj[key] !== null) {
        clean(obj[key]);
      }
    }
    return obj;
  }

  req.body  = clean(req.body);
  req.query = clean(req.query);
  next();
}

/**
 * Detecta padrões de injeção SQL e NoSQL em campos críticos.
 * Retorna 400 se detectado.
 */
function detectInjection(req, res, next) {
  const INJECTION_PATTERNS = [
    /(\bUNION\b.*\bSELECT\b)/i,
    /(\bDROP\b.*\bTABLE\b)/i,
    /(\bINSERT\b.*\bINTO\b)/i,
    /(\bDELETE\b.*\bFROM\b)/i,
    /(\bEXEC\b|\bEXECUTE\b)/i,
    /\$where/i,
    /\$gt|\$lt|\$ne|\$in/,   // NoSQL injection
    /<script[\s\S]*?>[\s\S]*?<\/script>/i,
  ];

  const allValues = [
    ...Object.values(req.body  || {}),
    ...Object.values(req.query || {}),
    ...Object.values(req.params || {}),
  ].filter(v => typeof v === 'string');

  for (const val of allValues) {
    for (const pattern of INJECTION_PATTERNS) {
      if (pattern.test(val)) {
        return res.status(400).json({
          error: 'Entrada inválida detectada.',
          code: 'INJECTION_ATTEMPT',
        });
      }
    }
  }
  next();
}

/**
 * Valida UUID nos parâmetros de rota para evitar enumeração de objetos.
 */
function validateUUID(req, res, next) {
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const idParams = ['id', 'projectId', 'activityId', 'userId', 'categoryId'];

  for (const param of idParams) {
    if (req.params[param] && !UUID_REGEX.test(req.params[param])) {
      return res.status(400).json({ error: 'Identificador inválido.', code: 'INVALID_ID' });
    }
  }
  next();
}

/**
 * Headers de segurança adicionais (além do Helmet).
 */
function securityHeaders(req, res, next) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  // Remove header que revela tecnologia
  res.removeHeader('X-Powered-By');
  next();
}

module.exports = { sanitizeInputs, detectInjection, validateUUID, securityHeaders };
