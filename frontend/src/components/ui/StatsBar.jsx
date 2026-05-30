// src/components/ui/StatsBar.jsx
import { CheckCircle2, Clock, AlertCircle, PlayCircle } from 'lucide-react';

const STATS_CONFIG = [
  { key: 'PLANNED',     label: 'Planejadas',    color: '#6B7280', icon: Clock        },
  { key: 'IN_PROGRESS', label: 'Em andamento',  color: '#3B82F6', icon: PlayCircle   },
  { key: 'DELAYED',     label: 'Atrasadas',     color: '#EF4444', icon: AlertCircle  },
  { key: 'DONE',        label: 'Finalizadas',   color: '#10B981', icon: CheckCircle2 },
];

export default function StatsBar({ stats = [], total = 0 }) {
  const map = Object.fromEntries(stats.map((s) => [s.status, s._count.status]));

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
      {STATS_CONFIG.map(({ key, label, color, icon: Icon }) => {
        const count = map[key] || 0;
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;

        return (
          <div key={key} className="card" style={{ padding: '16px 20px', borderTop: `3px solid ${color}` }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
              <span style={{ fontSize: '0.78rem', color: 'var(--genius-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                {label}
              </span>
              <Icon size={16} style={{ color }} />
            </div>
            <div style={{ fontSize: '2rem', fontFamily: "'Bebas Neue', sans-serif", color, lineHeight: 1 }}>
              {count}
            </div>
            <div style={{ marginTop: 8 }}>
              <div className="progress-bar">
                <div className="progress-bar-fill" style={{ width: `${pct}%`, background: color }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: 'var(--genius-text-muted)', marginTop: 4, display: 'block' }}>
                {pct}% do total
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
