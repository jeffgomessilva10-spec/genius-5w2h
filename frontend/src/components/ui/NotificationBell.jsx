// src/components/ui/NotificationBell.jsx
import { useState, useEffect } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { notificationsAPI } from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const typeColors = {
  DEADLINE_WARNING:  '#F59E0B',
  DEADLINE_EXCEEDED: '#EF4444',
  STATUS_CHANGE:     '#3B82F6',
  RISK_ALERT:        '#8B5CF6',
};

export default function NotificationBell() {
  const [open, setOpen]               = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);

  async function load() {
    try {
      const { data } = await notificationsAPI.list();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {}
  }

  useEffect(() => {
    load();
    const interval = setInterval(load, 60_000); // recarrega a cada minuto
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

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: 'none', border: '1px solid var(--genius-border)',
          borderRadius: 8, padding: '8px 12px', cursor: 'pointer',
          color: 'var(--genius-text-muted)', width: '100%',
          transition: 'all 0.2s',
        }}
      >
        <Bell size={16} />
        <span style={{ fontSize: '0.85rem' }}>Notificações</span>
        {unreadCount > 0 && (
          <span style={{
            marginLeft: 'auto',
            background: 'var(--genius-gold)', color: 'var(--genius-black)',
            borderRadius: '999px', fontSize: '0.7rem', fontWeight: 700,
            padding: '1px 7px', minWidth: 20, textAlign: 'center',
          }}>{unreadCount}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', bottom: '110%', left: 0,
          width: 320, maxHeight: 420,
          background: 'var(--genius-surface)',
          border: '1px solid var(--genius-border)',
          borderRadius: 12, overflow: 'hidden',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          zIndex: 100,
        }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px', borderBottom: '1px solid var(--genius-border)',
          }}>
            <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Notificações</span>
            <div style={{ display: 'flex', gap: 8 }}>
              {unreadCount > 0 && (
                <button onClick={markAllRead} title="Marcar todas como lidas" style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: 'var(--genius-gold)', display: 'flex',
                }}>
                  <CheckCheck size={16} />
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--genius-text-muted)',
              }}>
                <X size={16} />
              </button>
            </div>
          </div>

          <div style={{ overflowY: 'auto', maxHeight: 340 }}>
            {notifications.length === 0 ? (
              <div style={{ padding: 24, textAlign: 'center', color: 'var(--genius-text-muted)', fontSize: '0.85rem' }}>
                Nenhuma notificação
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => !n.isRead && markRead(n.id)}
                  style={{
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--genius-border)',
                    background: n.isRead ? 'transparent' : 'rgba(245,197,0,0.04)',
                    cursor: n.isRead ? 'default' : 'pointer',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: typeColors[n.type] || '#888',
                      flexShrink: 0, marginTop: 5,
                    }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--genius-text)' }}>
                        {n.title}
                      </div>
                      <div style={{ fontSize: '0.78rem', color: 'var(--genius-text-muted)', marginTop: 2 }}>
                        {n.message}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--genius-text-subtle)', marginTop: 4 }}>
                        {formatDistanceToNow(new Date(n.createdAt), { addSuffix: true, locale: ptBR })}
                      </div>
                    </div>
                    {!n.isRead && (
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--genius-gold)', flexShrink: 0, marginTop: 6 }} />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
