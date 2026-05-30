/**
 * PeriodFilter.jsx — Seletor de período para o Gantt.
 * Períodos: Hoje · Semana · Mês · Todos
 * Acessibilidade: role="tablist", aria-selected
 */

const PERIODS = [
  { key: 'todas',  label: 'Todos'  },
  { key: 'hoje',   label: 'Hoje'   },
  { key: 'semana', label: 'Semana' },
  { key: 'mes',    label: 'Mês'    },
];

export default function PeriodFilter({ value, onChange }) {
  return (
    <div role="tablist" aria-label="Filtrar por período" style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
      {PERIODS.map(p => {
        const isActive = value === p.key;
        return (
          <button
            key={p.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(p.key)}
            style={{
              padding: '7px 18px',
              borderRadius: 8,
              border: '1.5px solid',
              cursor: 'pointer',
              fontSize: '0.85rem',
              fontWeight: isActive ? 700 : 500,
              background: isActive ? '#F04E00' : '#fff',
              borderColor: isActive ? '#F04E00' : '#E5E7EB',
              color: isActive ? '#fff' : '#374151',
              transition: 'all 0.15s',
            }}
          >
            {p.label}
          </button>
        );
      })}
    </div>
  );
}
