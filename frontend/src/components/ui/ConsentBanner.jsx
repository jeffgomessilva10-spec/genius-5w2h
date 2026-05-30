/**
 * ConsentBanner.jsx — Banner de consentimento LGPD/GDPR.
 * WCAG 2.1: role="dialog", aria-label, foco gerenciado.
 * Aparece apenas no primeiro acesso (sem decisão prévia).
 */
import { useState, useEffect, useRef } from 'react';
import analytics from '../../services/analytics';
import api from '../../services/api';
import { BarChart3, X, Check, ChevronDown, ChevronUp } from 'lucide-react';

export default function ConsentBanner() {
  const [visible,  setVisible]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const acceptRef = useRef(null);

  useEffect(() => {
    const { hasDecided } = analytics.getConsent();
    if (!hasDecided) {
      // Pequeno delay para não bloquear o carregamento inicial
      setTimeout(() => { setVisible(true); acceptRef.current?.focus(); }, 1500);
    }
  }, []);

  async function handleAccept() {
    analytics.setConsent(true);
    setVisible(false);
    // Registra consentimento no backend (LGPD: rastreabilidade)
    try {
      await api.post('/governance/consent', { type: 'analytics', accepted: true });
    } catch {}
  }

  async function handleReject() {
    analytics.setConsent(false);
    setVisible(false);
    try {
      await api.post('/governance/consent', { type: 'analytics', accepted: false });
    } catch {}
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Consentimento de coleta de dados analíticos"
      style={{
        position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
        background: '#1C1C1E', color: '#F5F5F5',
        borderRadius: 14, padding: '20px 24px',
        boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
        zIndex: 9999, width: 'min(560px, calc(100vw - 32px))',
        border: '1px solid rgba(255,255,255,0.1)',
      }}
    >
      <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', marginBottom: 14 }}>
        <div style={{ width: 36, height: 36, borderRadius: 8, background: '#F04E00', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <BarChart3 size={18} color="#fff" />
        </div>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 6, color: '#fff' }}>
            Análise de uso da plataforma
          </h2>
          <p style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)', lineHeight: 1.6 }}>
            Gostaríamos de coletar dados anônimos sobre como você usa o sistema para melhorar a experiência.
            <strong style={{ color: '#fff' }}> Nenhuma informação pessoal é armazenada.</strong>
          </p>
        </div>
      </div>

      {/* Detalhes expandíveis */}
      <button
        onClick={() => setExpanded(!expanded)}
        aria-expanded={expanded}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#F04E00', fontSize: '0.78rem', fontWeight: 600,
          display: 'flex', alignItems: 'center', gap: 4, marginBottom: expanded ? 12 : 0,
          padding: 0,
        }}
      >
        {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
        {expanded ? 'Ocultar detalhes' : 'Ver o que é coletado'}
      </button>

      {expanded && (
        <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '12px 14px', marginBottom: 14, fontSize: '0.78rem', color: 'rgba(255,255,255,0.65)', lineHeight: 1.7 }}>
          <strong style={{ color: '#fff', display: 'block', marginBottom: 6 }}>Coletamos (de forma anônima):</strong>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            <li>Páginas visitadas e tempo de sessão</li>
            <li>Funcionalidades utilizadas (Gantt, RACI, OKRs, etc.)</li>
            <li>Frequência de acesso por perfil de usuário (sem nome)</li>
            <li>Ações como criar/editar atividades (sem dados do conteúdo)</li>
          </ul>
          <strong style={{ color: '#fff', display: 'block', marginTop: 8, marginBottom: 4 }}>Não coletamos:</strong>
          <ul style={{ paddingLeft: 16, margin: 0 }}>
            <li>Nome, e-mail, telefone ou qualquer informação pessoal</li>
            <li>Conteúdo de atividades ou projetos</li>
            <li>Senhas ou dados financeiros</li>
          </ul>
          <p style={{ marginTop: 8, marginBottom: 0 }}>Conforme LGPD Art. 7º — dados tratados com consentimento explícito. Você pode revogar a qualquer momento em Configurações → Privacidade.</p>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
        <button
          onClick={handleReject}
          style={{
            background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.2)',
            borderRadius: 8, padding: '8px 16px', cursor: 'pointer',
            color: 'rgba(255,255,255,0.7)', fontSize: '0.82rem', fontWeight: 600,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.12)'}
          onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.08)'}
        >
          <X size={13} style={{ display: 'inline', marginRight: 5 }} />
          Recusar
        </button>
        <button
          ref={acceptRef}
          onClick={handleAccept}
          style={{
            background: '#F04E00', border: 'none', borderRadius: 8,
            padding: '8px 20px', cursor: 'pointer',
            color: '#fff', fontSize: '0.82rem', fontWeight: 700,
            boxShadow: '0 2px 8px rgba(240,78,0,0.4)',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#D94400'}
          onMouseLeave={e => e.currentTarget.style.background = '#F04E00'}
        >
          <Check size={13} style={{ display: 'inline', marginRight: 5 }} />
          Aceitar coleta anônima
        </button>
      </div>
    </div>
  );
}
