/**
 * StatusFilter.jsx — Seletor de status para o Gantt.
 * Múltiplos status podem ser selecionados simultaneamente.
 * Nenhum selecionado = exibe todos.
 */

const STATUSES = [
  { key: 'PLANNED',     label: 'Planejadas',    color: '#6B7280', bg: '#F3F4F6', border: '#E5E7EB'  },
  { key: 'IN_PROGRESS', label: 'Em andamento',  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE'  },
  { key: 'DELAYED',     label: 'Atrasadas',     color: '#DC2626', bg: '#FEF2F2', border: '#FECACA'  },
  { key: 'DONE',        label: 'Concluídas',    color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0'  },
];

export default function StatusFilter({ value = [], onChange, counts = {} }) {
  function toggle(key) {
    if (value.includes(key)) {
      onChange(value.filter(s => s !== key));
    } else {
      onChange([...value, key]);
    }
  }

  return (
    <div role="group" aria-label="Filtrar por status" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {STATUSES.map(s => {
        const isActive = value.includes(s.key);
        const count    = counts[s.key] ?? null;
        return (
          <button
            key={s.key}
            aria-pressed={isActive}
            onClick={() => toggle(s.key)}
            title={`${isActive ? 'Remover filtro' : 'Filtrar'}: ${s.label}`}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 13px',
              borderRadius: 8,
              border: `1.5px solid ${isActive ? s.color : s.border}`,
              cursor: 'pointer',
              fontSize: '0.82rem',
              fontWeight: isActive ? 700 : 500,
              background: isActive ? s.bg : '#fff',
              color: isActive ? s.color : '#6B7280',
              transition: 'all 0.15s',
            }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: s.color, flexShrink: 0 }} />
            {s.label}
            {count !== null && (
              <span style={{
                background: isActive ? s.color : '#E5E7EB',
                color: isActive ? '#fff' : '#6B7280',
                borderRadius: 99, fontSize: '0.7rem', fontWeight: 700,
                padding: '1px 7px', minWidth: 20, textAlign: 'center',
              }}>
                {count}
              </span>
            )}
          </button>
        );
      })}
      {value.length > 0 && (
        <button
          onClick={() => onChange([])}
          style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #E5E7EB', background: '#fff', cursor: 'pointer', fontSize: '0.78rem', color: '#9CA3AF' }}
        >
          ✕ Limpar
        </button>
      )}
    </div>
  );
}
