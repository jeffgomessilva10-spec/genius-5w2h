import { useState, useEffect } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeColors = {
  DEADLINE_WARNING:  '#F59E0B',
  DEADLINE_EXCEEDED: '#EF4444',
  STATUS_CHANGE:     '#2563EB',
  RISK_ALERT:        '#8B5CF6',
};

const typeLabel = {
  DEADLINE_WARNING:  'Prazo próximo',
  DEADLINE_EXCEEDED: 'Prazo vencido',
  STATUS_CHANGE:     'Status alterado',
  RISK_ALERT:        'Alerta de risco',
};

export default function NotificationBell({ mobileTopbar = false }) {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const isMobile = window.innerWidth < 768;

  async function load() {
    try {
      const { data } = await notificationsAPI.list();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {}
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000);
    return () => clearInterval(interval);
  }, []);

  async function markAllRead() {
    await notificationsAPI.markAllRead();
    load();
  }

  async function markRead(id) {
    await notificationsAPI.markRead(id);
    load();
  }

  /* Botão do sino */
  const BellButton = (
    <button
      onClick={() => setOpen(!open)}
      style={{
        position: 'relative',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: mobileTopbar ? 'rgba(255,255,255,0.1)' : 'transparent',
        border: mobileTopbar ? 'none' : '1px solid rgba(255,255,255,0.15)',
        borderRadius: 8,
        padding: mobileTopbar ? '6px' : '8px 12px',
        cursor: 'pointer',
        color: '#fff',
        gap: 6,
        transition: 'all 0.2s',
      }}
    >
      <Bell size={mobileTopbar ? 20 : 16} />
      {!mobileTopbar && <span style={{ fontSize: '0.82rem', color: 'rgba(255,255,255,0.7)' }}>Notificações</span>}
      {unreadCount > 0 && (
        <span style={{
          position: mobileTopbar ? 'absolute' : 'static',
          top: mobileTopbar ? 2 : 'auto',
          right: mobileTopbar ? 2 : 'auto',
          background: '#F04E00', color: '#fff',
          borderRadius: '999px', fontSize: '0.65rem', fontWeight: 700,
          padding: mobileTopbar ? '1px 4px' : '1px 7px',
          minWidth: 16, textAlign: 'center',
          marginLeft: mobileTopbar ? 0 : 'auto',
        }}>{unreadCount}</span>
      )}
    </button>
  );

  /* Painel de notificações — fullscreen no mobile, dropdown no desktop */
  const Panel = open && (
    <>
      {/* Overlay */}
      <div
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0,
          background: isMobile ? 'rgba(0,0,0,0.6)' : 'transparent',
          zIndex: 998,
        }}
      />

      <div style={{
        position: 'fixed',
        ...(isMobile ? {
          bottom: 0, left: 0, right: 0,
          borderRadius: '16px 16px 0 0',
          maxHeight: '80vh',
        } : {
          top: 64, right: 16,
          width: 360,
          borderRadius: 12,
          maxHeight: 480,
        }),
        background: '#fff',
        boxShadow: '0 -4px 32px rgba(0,0,0,0.15)',
        zIndex: 999,
        display: 'flex', flexDirection: 'column',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '16px 20px', borderBottom: '1px solid #E5E7EB',
          background: '#fff',
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Notificações</div>
            {unreadCount > 0 && (
              <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>{unreadCount} não lida{unreadCount > 1 ? 's' : ''}</div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {unreadCount > 0 && (
              <button onClick={markAllRead} style={{ background: '#FFF3EE', border: '1px solid #FECACA', borderRadius: 7, cursor: 'pointer', color: '#F04E00', padding: '6px 10px', display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600 }}>
                <CheckCheck size={14} /> Marcar todas
              </button>
            )}
            <button onClick={() => setOpen(false)} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', color: '#6B7280', padding: '6px', borderRadius: 7, display: 'flex' }}>
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Lista */}
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {notifications.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF' }}>
              <Bell size={32} style={{ marginBottom: 8, opacity: 0.3 }} />
              <p style={{ fontSize: '0.85rem' }}>Nenhuma notificação</p>
            </div>
          ) : (
            notifications.map(n => (
              <div
                key={n.id}
                onClick={() => !n.isRead && markRead(n.id)}
                style={{
                  padding: '14px 20px',
                  borderBottom: '1px solid #F3F4F6',
                  background: n.isRead ? '#fff' : '#FAFFFE',
                  cursor: n.isRead ? 'default' : 'pointer',
                }}
              >
                <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: typeColors[n.type] || '#9CA3AF', flexShrink: 0, marginTop: 4 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, color: typeColors[n.type], textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {typeLabel[n.type] || n.type}
                      </span>
                      {!n.isRead && <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#F04E00', display: 'inline-block' }} />}
                    </div>
                    <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827', marginBottom: 4 }}>{n.title}</div>
                    <div style={{ fontSize: '0.8rem', color: '#6B7280', lineHeight: 1.5 }}>{n.message}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 6 }}>
                      {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Espaço para iOS safe area */}
        {isMobile && <div style={{ height: 20 }} />}
      </div>
    </>
  );

  /* Se for o botão da topbar mobile, renderiza inline */
  if (mobileTopbar) {
    return (
      <>
        {BellButton}
        {Panel}
      </>
    );
  }

  /* Desktop: wrapper com position relative */
  return (
    <div style={{ position: 'relative' }}>
      {BellButton}
      {Panel}
    </div>
  );
}
