// src/components/ui/ActivityCard.jsx
import { Link } from 'react-router-dom';
import { Calendar, User, DollarSign, AlertTriangle, Pencil, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../../context/AuthContext';

const STATUS_MAP = {
  PLANNED:     { label: 'Planejado',    cls: 'badge-planned'  },
  IN_PROGRESS: { label: 'Em andamento', cls: 'badge-progress' },
  DELAYED:     { label: 'Atrasado',     cls: 'badge-delayed'  },
  DONE:        { label: 'Finalizado',   cls: 'badge-done'     },
};

export default function ActivityCard({ activity, onDelete }) {
  const { isCollaborator } = useAuth();
  const s = STATUS_MAP[activity.status] || STATUS_MAP.PLANNED;

  function fmt(date) {
    if (!date) return '—';
    try { return format(new Date(date), 'dd/MM/yyyy', { locale: ptBR }); } catch { return '—'; }
  }

  return (
    <div className="card animate-fade" style={{ borderLeft: `3px solid ${activity.category?.color || '#F5C500'}`, padding: 20 }}>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
        <div className="flex items-center gap-2">
          <span style={{ color: 'var(--genius-text-muted)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1rem', letterSpacing: 1 }}>
            {activity.code}
          </span>
          <span className={`badge ${s.cls}`}>{s.label}</span>
        </div>
        {isCollaborator && (
          <div className="flex gap-2">
            <Link to={`/activities/${activity.id}/edit`} className="btn btn-ghost btn-sm" style={{ padding: '5px 10px' }}>
              <Pencil size={13} />
            </Link>
            {onDelete && (
              <button onClick={() => onDelete(activity.id)} className="btn btn-danger btn-sm" style={{ padding: '5px 10px' }}>
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )}
      </div>

      {/* Título */}
      <h3 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1rem', marginBottom: 6, color: 'var(--genius-text)' }}>
        {activity.what}
      </h3>

      {/* Motivo */}
      <p style={{ fontSize: '0.83rem', color: 'var(--genius-text-muted)', marginBottom: 12, lineHeight: 1.5 }}>
        <strong style={{ color: 'var(--genius-text-subtle)' }}>Por quê:</strong> {activity.why}
      </p>

      {/* Metadados */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, fontSize: '0.8rem' }}>
        <div className="flex items-center gap-2" style={{ color: 'var(--genius-text-muted)' }}>
          <User size={13} />
          <span>{activity.responsible?.name || activity.who || '—'}</span>
        </div>
        <div className="flex items-center gap-2" style={{ color: 'var(--genius-text-muted)' }}>
          <Calendar size={13} />
          <span>{fmt(activity.whenStart)} → {fmt(activity.whenEnd)}</span>
        </div>
        {activity.howMuch != null && (
          <div className="flex items-center gap-2" style={{ color: 'var(--genius-text-muted)' }}>
            <DollarSign size={13} />
            <span>R$ {Number(activity.howMuch).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
          </div>
        )}
        {activity.risk && (
          <div className="flex items-center gap-2" style={{ color: '#F59E0B', gridColumn: '1 / -1' }}>
            <AlertTriangle size={13} />
            <span style={{ fontSize: '0.78rem' }}>{activity.risk}</span>
          </div>
        )}
      </div>
    </div>
  );
}
