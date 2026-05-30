// Matriz de riscos 5×5 (probabilidade × impacto)
const COLORS = {
  1: { bg: '#F0FDF4', border: '#BBF7D0', text: '#16A34A', label: 'Baixo' },
  2: { bg: '#FEFCE8', border: '#FDE68A', text: '#D97706', label: 'Médio' },
  3: { bg: '#FFF7ED', border: '#FED7AA', text: '#EA580C', label: 'Alto' },
  4: { bg: '#FEF2F2', border: '#FECACA', text: '#DC2626', label: 'Crítico' },
};

function riskColor(prob, impact) {
  const score = (prob || 0) * (impact || 0);
  if (score >= 20) return COLORS[4];
  if (score >= 12) return COLORS[3];
  if (score >= 6)  return COLORS[2];
  if (score >= 1)  return COLORS[1];
  return { bg: '#F9FAFB', border: '#E5E7EB', text: '#9CA3AF', label: '—' };
}

export function RiskBadge({ probability, impact, level }) {
  const c = riskColor(probability, impact);
  if (!probability && !impact && !level) return null;
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '3px 10px', borderRadius: 99, fontSize: '0.72rem', fontWeight: 700, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: c.text, flexShrink: 0 }} />
      Risco {level || c.label}
    </span>
  );
}

export function RiskFields({ form, onChange }) {
  const prob   = parseInt(form.riskProbability) || 0;
  const impact = parseInt(form.riskImpact)      || 0;
  const c = riskColor(prob, impact);

  return (
    <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: 16 }}>
      <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#374151', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        ⚠️ Matriz de Risco
        {prob > 0 && impact > 0 && (
          <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
            {c.label} ({prob}×{impact}={prob*impact})
          </span>
        )}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
            Probabilidade (1-5)
          </label>
          <select className="input" value={form.riskProbability || ''} onChange={e => onChange('riskProbability', e.target.value)} style={{ border: '1.5px solid #E5E7EB' }}>
            <option value="">Selecione</option>
            <option value="1">1 — Muito baixa</option>
            <option value="2">2 — Baixa</option>
            <option value="3">3 — Média</option>
            <option value="4">4 — Alta</option>
            <option value="5">5 — Muito alta</option>
          </select>
        </div>
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
            Impacto (1-5)
          </label>
          <select className="input" value={form.riskImpact || ''} onChange={e => onChange('riskImpact', e.target.value)} style={{ border: '1.5px solid #E5E7EB' }}>
            <option value="">Selecione</option>
            <option value="1">1 — Desprezível</option>
            <option value="2">2 — Menor</option>
            <option value="3">3 — Moderado</option>
            <option value="4">4 — Significativo</option>
            <option value="5">5 — Catastrófico</option>
          </select>
        </div>
      </div>

      <div>
        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>
          Ação de mitigação
        </label>
        <textarea className="input" rows={2} placeholder="Descreva o plano de mitigação..." value={form.riskMitigation || ''} onChange={e => onChange('riskMitigation', e.target.value)} style={{ resize: 'vertical', border: '1.5px solid #E5E7EB', fontSize: '0.85rem' }} />
      </div>
    </div>
  );
}

// Mini visualização da matriz 5×5
export function RiskMatrixView({ activities = [] }) {
  const cells = Array.from({ length: 5 }, (_, i) =>
    Array.from({ length: 5 }, (_, j) => {
      const prob = 5 - i; const imp = j + 1;
      const acts = activities.filter(a => a.riskProbability === prob && a.riskImpact === imp);
      return { prob, imp, acts };
    })
  );

  return (
    <div style={{ overflowX: 'auto' }}>
      <div style={{ fontSize: '0.75rem', color: '#6B7280', marginBottom: 8, textAlign: 'center' }}>
        Probabilidade ↑ · Impacto →
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 300 }}>
        <thead>
          <tr>
            <th style={{ width: 60, fontSize: '0.7rem', color: '#9CA3AF', padding: '4px 6px' }}></th>
            {[1,2,3,4,5].map(i => (
              <th key={i} style={{ fontSize: '0.7rem', color: '#6B7280', padding: '4px 6px', textAlign: 'center', fontWeight: 600 }}>I{i}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cells.map((row, ri) => (
            <tr key={ri}>
              <td style={{ fontSize: '0.7rem', color: '#6B7280', padding: '4px 6px', fontWeight: 600, textAlign: 'right' }}>P{5-ri}</td>
              {row.map((cell, ci) => {
                const c = riskColor(cell.prob, cell.imp);
                return (
                  <td key={ci} style={{ background: c.bg, border: '1px solid #E5E7EB', padding: '8px 6px', textAlign: 'center', minWidth: 52 }}>
                    {cell.acts.length > 0 ? (
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: c.text }}>{cell.acts.length}</span>
                    ) : (
                      <span style={{ color: '#D1D5DB', fontSize: '0.65rem' }}>·</span>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ display: 'flex', gap: 12, marginTop: 10, flexWrap: 'wrap' }}>
        {Object.values(COLORS).map(c => (
          <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.72rem', color: '#6B7280' }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: c.bg, border: `1px solid ${c.border}` }} />
            {c.label}
          </div>
        ))}
      </div>
    </div>
  );
}
