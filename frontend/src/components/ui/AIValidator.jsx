import { useState } from 'react';
import { aiAPI } from '../../services/api';
import { Sparkles, AlertTriangle, CheckCircle2, XCircle, Loader2, ChevronDown, ChevronUp } from 'lucide-react';

const GRADE_CONFIG = {
  A: { color: '#16A34A', bg: '#F0FDF4', label: 'Excelente' },
  B: { color: '#2563EB', bg: '#EFF6FF', label: 'Bom'       },
  C: { color: '#D97706', bg: '#FFFBEB', label: 'Regular'   },
  D: { color: '#DC2626', bg: '#FEF2F2', label: 'Insuficiente' },
};

const FIELD_LABEL = { what: 'O Quê', why: 'Por Quê', who: 'Quem', where: 'Onde', how: 'Como' };

export default function AIValidator({ activity, onClose }) {
  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [open,    setOpen]    = useState(false);

  async function validate() {
    setLoading(true);
    try {
      const { data } = await aiAPI.validate(activity);
      setResult(data);
      setOpen(true);
    } finally { setLoading(false); }
  }

  const grade = result ? GRADE_CONFIG[result.grade] : null;

  return (
    <div style={{ marginTop: 16 }}>
      <button
        type="button"
        onClick={result ? () => setOpen(!open) : validate}
        disabled={loading}
        style={{
          display: 'flex', alignItems: 'center', gap: 8,
          background: result ? `${grade?.bg}` : '#FFF3EE',
          border: `1.5px solid ${result ? grade?.color + '44' : '#F04E00'}`,
          borderRadius: 10, padding: '10px 16px',
          cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600,
          color: result ? grade?.color : '#F04E00', width: '100%',
          transition: 'all 0.15s',
        }}
      >
        {loading
          ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Analisando campos 5W2H...</>
          : result
          ? <><Sparkles size={15} /> IA: Nota {result.grade} — {grade?.label} ({result.score}%) {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}</>
          : <><Sparkles size={15} /> Validar campos com IA</>
        }
      </button>

      {result && open && (
        <div style={{ marginTop: 10, background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: 16 }}>
          {/* Score geral */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 14 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: grade?.bg, border: `3px solid ${grade?.color}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <span style={{ fontSize: '1.4rem', fontWeight: 800, color: grade?.color }}>{result.grade}</span>
            </div>
            <div>
              <div style={{ fontWeight: 700, color: '#111827', fontSize: '0.9rem' }}>
                Qualidade do preenchimento: {result.score}%
              </div>
              <div style={{ height: 6, background: '#E5E7EB', borderRadius: 99, marginTop: 5, width: 200 }}>
                <div style={{ height: '100%', width: `${result.score}%`, background: grade?.color, borderRadius: 99 }} />
              </div>
            </div>
          </div>

          {/* Score por campo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 8, marginBottom: 14 }}>
            {Object.entries(result.fields).map(([key, f]) => (
              <div key={key} style={{
                background: '#fff', border: `1px solid ${f.score >= 70 ? '#BBF7D0' : f.score >= 40 ? '#FDE68A' : '#FECACA'}`,
                borderRadius: 8, padding: '8px 10px',
              }}>
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{FIELD_LABEL[key]}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
                  {f.score >= 70
                    ? <CheckCircle2 size={14} style={{ color: '#16A34A', flexShrink: 0 }} />
                    : f.score >= 40
                    ? <AlertTriangle size={14} style={{ color: '#D97706', flexShrink: 0 }} />
                    : <XCircle size={14} style={{ color: '#DC2626', flexShrink: 0 }} />
                  }
                  <span style={{ fontSize: '0.78rem', color: '#374151' }}>{f.score}%</span>
                </div>
                {f.issue && <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 3 }}>{f.issue}</div>}
              </div>
            ))}
          </div>

          {/* Problemas */}
          {result.issues.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#DC2626', marginBottom: 6 }}>⚠️ Pontos a corrigir:</div>
              {result.issues.map((issue, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 3, paddingLeft: 12, borderLeft: '2px solid #FECACA' }}>
                  {issue}
                </div>
              ))}
            </div>
          )}

          {/* Sugestões */}
          {result.suggestions.length > 0 && (
            <div>
              <div style={{ fontWeight: 700, fontSize: '0.8rem', color: '#2563EB', marginBottom: 6 }}>💡 Sugestões:</div>
              {result.suggestions.map((s, i) => (
                <div key={i} style={{ fontSize: '0.8rem', color: '#374151', marginBottom: 3, paddingLeft: 12, borderLeft: '2px solid #BFDBFE' }}>
                  {s}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
