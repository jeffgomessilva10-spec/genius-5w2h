/**
 * analytics.js — Serviço de rastreamento de eventos no frontend.
 * Conformidade LGPD: só envia dados se o usuário consentiu.
 * Pseudonimização: não envia PII (nome, e-mail, telefone).
 */
import api from './api';

// Gera um sessionId único para esta sessão do navegador
const SESSION_ID = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
let sessionStartTime = null;

// ── Verificação de consentimento ──────────────────────
function hasConsent() {
  return localStorage.getItem('analytics_consent') === 'accepted';
}

function setConsent(accepted) {
  localStorage.setItem('analytics_consent', accepted ? 'accepted' : 'rejected');
  localStorage.setItem('analytics_consent_at', new Date().toISOString());
}

function getConsent() {
  return {
    status:    localStorage.getItem('analytics_consent'),
    acceptedAt: localStorage.getItem('analytics_consent_at'),
    hasDecided: localStorage.getItem('analytics_consent') !== null,
  };
}

// ── Envio de evento ao backend ─────────────────────────
async function track(eventType, { module, action, context, durationMs } = {}) {
  if (!hasConsent()) return; // Respeita LGPD: não rastreia sem consentimento

  try {
    await api.post('/analytics/events', {
      sessionId: SESSION_ID,
      eventType,
      module:    module    || null,
      action:    action    || null,
      context:   context   || null,
      durationMs: durationMs || null,
    });
  } catch {
    // Falha silenciosa — analytics não deve impactar UX
  }
}

// ── Eventos de sessão ─────────────────────────────────
function trackSessionStart() {
  sessionStartTime = Date.now();
  track('SESSION_START', { module: 'auth', action: 'login' });
}

function trackSessionEnd() {
  const duration = sessionStartTime ? Date.now() - sessionStartTime : null;
  track('SESSION_END', { module: 'auth', action: 'logout', durationMs: duration });
  sessionStartTime = null;
}

// ── Visualização de página ────────────────────────────
function trackPageView(module, context = {}) {
  track('PAGE_VIEW', { module, context });
}

// ── Ações do usuário ──────────────────────────────────
function trackAction(module, action, context = {}) {
  track('ACTION', { module, action, context });
}

// ── Uso de funcionalidade ─────────────────────────────
function trackFeature(module, action = 'use') {
  track('FEATURE_USE', { module, action });
}

// ── Hook React para rastrear mudança de rota ──────────
function usePageTracking(location) {
  if (!hasConsent()) return;

  const MODULE_MAP = {
    '/dashboard':   'dashboard_operational',
    '/executive':   'dashboard_executive',
    '/projects':    'projects',
    '/gantt':       'gantt',
    '/documents':   'documents',
    '/okr':         'okr',
    '/pdca':        'pdca',
    '/governance':  'governance',
    '/analytics':   'analytics',
    '/users':       'users',
    '/client':      'client_dashboard',
  };

  const module = MODULE_MAP[location.pathname] || location.pathname.replace('/', '');
  trackPageView(module);
}

export default {
  hasConsent, setConsent, getConsent,
  track, trackSessionStart, trackSessionEnd,
  trackPageView, trackAction, trackFeature, usePageTracking,
  SESSION_ID,
};
