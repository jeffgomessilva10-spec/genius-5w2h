/**
 * AnalyticsPage.jsx — Dashboard de Analytics
 * Gráficos implementados com SVG puro (sem biblioteca externa)
 * para manter o bundle leve e compatível com qualquer ambiente.
 */
import { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { analyticsAPI } from '../services/api';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  Users, Clock, TrendingUp, TrendingDown,
  BarChart3, Loader2, RefreshCw, AlertTriangle, Activity,
} from 'lucide-react';

const PERIOD_OPTIONS = [
  { value: 7,  label: '7 dias'      },
  { value: 14, label: '14 dias'     },
  { value: 30, label: '30 dias'     },
  { value: 90, label: '3 meses'    },
];

const MODULE_COLORS = [
  '#F04E00','#2563EB','#16A34A','#D97706',
  '#7C3AED','#DC2626','#0891B2','#65A30D',
];

// ── Gráfico de linha SVG puro ──────────────────────────
function LineChart({ data, color = '#F04E00', height = 180 }) {
  if (!data || data.length < 2) {
    return (
      <div style={{ height, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '0.82rem' }}>
        Dados insuficientes para o gráfico
      </div>
    );
  }

  const values   = data.map(d => d.users || 0);
  const maxVal   = Math.max(...values, 1);
  const w        = 600;
  const h        = height;
  const padX     = 40;
  const padY     = 20;
  const chartW   = w - padX * 2;
  const chartH   = h - padY * 2;
  const step     = chartW / (data.length - 1);

  const points = data.map((d, i) => {
    const x = padX + i * step;
    const y = padY + chartH - (d.users / maxVal) * chartH;
    return `${x},${y}`;
  }).join(' ');

  const area = [
    `${padX},${padY + chartH}`,
    ...data.map((d, i) => `${padX + i * step},${padY + chartH - (d.users / maxVal) * chartH}`),
    `${padX + (data.length - 1) * step},${padY + chartH}`,
  ].join(' ');

  return (
    <div style={{ overflowX: 'auto' }}>
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height }} preserveAspectRatio="none">
        {/* Grade horizontal */}
        {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
          <g key={i}>
            <line x1={padX} y1={padY + chartH * (1 - pct)} x2={w - padX} y2={padY + chartH * (1 - pct)} stroke="#F3F4F6" strokeWidth="1" />
            <text x={padX - 5} y={padY + chartH * (1 - pct) + 4} textAnchor="end" fontSize="10" fill="#9CA3AF">
              {Math.round(maxVal * pct)}
            </text>
          </g>
        ))}
        {/* Área preenchida */}
        <polygon points={area} fill={`${color}18`} />
        {/* Linha */}
        <polyline points={points} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {/* Pontos */}
        {data.map((d, i) => {
          const x = padX + i * step;
          const y = padY + chartH - (d.users / maxVal) * chartH;
          return (
            <g key={i}>
              <circle cx={x} cy={y} r="4" fill={color} />
              {i % Math.ceil(data.length / 6) === 0 && (
                <text x={x} y={h - 4} textAnchor="middle" fontSize="9" fill="#9CA3AF">
                  {d.date?.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

// ── Barra horizontal de progresso ─────────────────────
function HBar({ label, value, max, color, count }) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: '0.82rem', fontWeight: 600, color: '#374151' }}>{label}</span>
        <span style={{ fontSize: '0.82rem', fontWeight: 700, color }}>
          {value.toFixed(1)}% · {count} usuários
        </span>
      </div>
      <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.6s ease', minWidth: pct > 0 ? 4 : 0 }} />
      </div>
    </div>
  );
}

// ── Donut simples SVG ─────────────────────────────────
function DonutChart({ pct, color, size = 80 }) {
  const r    = 30;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} viewBox="0 0 80 80">
      <circle cx="40" cy="40" r={r} fill="none" stroke="#E5E7EB" strokeWidth="8" />
      <circle cx="40" cy="40" r={r} fill="none" stroke={color} strokeWidth="8"
        strokeDasharray={`${dash} ${circ - dash}`} strokeLinecap="round"
        transform="rotate(-90 40 40)" />
      <text x="40" y="45" textAnchor="middle" fontSize="14" fontWeight="800" fill={color}>{pct}%</text>
    </svg>
  );
}

// ── KPI Tile ──────────────────────────────────────────
function KpiTile({ label, value, sub, color = '#F04E00', icon: Icon }) {
  return (
    <div style={{
      background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14,
      padding: '16px 20px', borderTop: `3px solid ${color}`,
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: `${color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={15} style={{ color }} />
        </div>
        <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.8rem', fontWeight: 800, color: '#111827', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 5 }}>{sub}</div>}
    </div>
  );
}

// ── Gráfico de barras verticais SVG ───────────────────
function BarChartSVG({ data, color = '#F04E00', height = 160 }) {
  if (!data || !data.length) return null;
  const max  = Math.max(...data.map(d => d.users || 0), 1);
  const w    = 300;
  const barW = w / data.length - 10;

  return (
    <svg viewBox={`0 0 ${w} ${height}`} style={{ width: '100%', height }}>
      {data.map((d, i) => {
        const barH = ((d.users || 0) / max) * (height - 40);
        const x    = (w / data.length) * i + 5;
        const y    = height - 30 - barH;
        const col  = MODULE_COLORS[i % MODULE_COLORS.length];
        return (
          <g key={d.period || i}>
            <rect x={x} y={y} width={barW} height={barH} rx="4" fill={col} />
            <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="11" fontWeight="700" fill={col}>
              {d.users}
            </text>
            <text x={x + barW / 2} y={height - 10} textAnchor="middle" fontSize="10" fill="#9CA3AF">
              {d.period}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

// ── Componente principal ──────────────────────────────
export default function AnalyticsPage() {
  const isMobile = useIsMobile();
  const [summary,   setSummary]   = useState(null);
  const [dau,       setDau]       = useState([]);
  const [retention, setRetention] = useState(null);
  const [features,  setFeatures]  = useState(null);
  const [loading,   setLoading]   = useState(true);
  const [days,      setDays]      = useState(30);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => { loadAll(); }, [days]);

  async function loadAll() {
    setLoading(true);
    try {
      const end   = new Date().toISOString().split('T')[0];
      const start = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

      const [sumRes, dauRes, retRes, featRes] = await Promise.allSettled([
        analyticsAPI.summary(),
        analyticsAPI.dau({ start, end }),
        analyticsAPI.retention({ cohort: start }),
        analyticsAPI.features({ days }),
      ]);

      if (sumRes.status  === 'fulfilled') setSummary(sumRes.value.data);
      if (dauRes.status  === 'fulfilled') setDau(dauRes.value.data.series || []);
      if (retRes.status  === 'fulfilled') setRetention(retRes.value.data);
      if (featRes.status === 'fulfilled') setFeatures(featRes.value.data);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }

  const s = summary;
  const fmtMin = (ms) => ms ? `${(ms / 60000).toFixed(1)}min` : '—';

  const TABS = [
    { id: 'overview',  label: 'Visão Geral'      },
    { id: 'users',     label: 'Usuários'          },
    { id: 'features',  label: 'Funcionalidades'   },
    { id: 'retention', label: 'Retenção'          },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main id="main-content" style={{ flex: 1, overflowY: 'auto' }} role="main">

        <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Analytics de Uso</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Engajamento e adoção da plataforma</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={days} onChange={e => setDays(Number(e.target.value))} aria-label="Período"
              style={{ height: 36, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.83rem', background: '#fff' }}>
              {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={loadAll} aria-label="Atualizar" className="btn btn-ghost" style={{ height: 36, padding: '0 12px' }}>
              <RefreshCw size={14} />
            </button>
          </div>
        </header>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300 }}>
            <Loader2 size={32} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ padding: isMobile ? 16 : '28px 32px' }}>

            {/* KPIs */}
            <section aria-label="Indicadores" style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12 }}>
                Indicadores de Engajamento
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 14 }}>
                <KpiTile icon={Users}    label="DAU"          value={s?.activeUsers?.dau?.uniqueUsers  ?? 0} sub="usuários/dia"    color="#F04E00" />
                <KpiTile icon={Users}    label="WAU"          value={s?.activeUsers?.wau?.uniqueUsers  ?? 0} sub="usuários/semana" color="#2563EB" />
                <KpiTile icon={Users}    label="MAU"          value={s?.activeUsers?.mau?.uniqueUsers  ?? 0} sub="usuários/mês"    color="#7C3AED" />
                <KpiTile icon={Clock}    label="Sessão média" value={fmtMin(s?.sessionDuration?.avgMs)}      sub={`${s?.sessionDuration?.sessions ?? 0} sessões`} color="#16A34A" />
              </div>
            </section>

            {/* Tabs */}
            <nav aria-label="Seções" style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #E5E7EB', paddingBottom: 0 }}>
              {TABS.map(tab => (
                <button key={tab.id} onClick={() => setActiveTab(tab.id)} aria-current={activeTab === tab.id ? 'page' : undefined}
                  style={{ padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                    fontWeight: activeTab === tab.id ? 700 : 500,
                    color: activeTab === tab.id ? '#F04E00' : '#6B7280',
                    borderBottom: activeTab === tab.id ? '2px solid #F04E00' : '2px solid transparent',
                    marginBottom: '-2px', transition: 'all 0.15s' }}>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Visão Geral */}
            {activeTab === 'overview' && (
              <section>
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>Usuários Ativos por Dia (DAU)</h2>
                  <LineChart data={dau} color="#F04E00" height={180} />
                </div>

                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>Módulos Mais Acessados</h2>
                  {s?.topModules?.length > 0 ? (
                    s.topModules.map((m, i) => (
                      <div key={m.module} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                        <div style={{ width: 100, fontSize: '0.78rem', color: '#374151', fontWeight: 500, textAlign: 'right', flexShrink: 0 }}>
                          {m.module?.replace(/_/g, ' ')}
                        </div>
                        <div style={{ flex: 1, height: 22, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ height: '100%', borderRadius: 99, width: `${m.pct}%`, background: MODULE_COLORS[i % MODULE_COLORS.length], minWidth: m.events > 0 ? 4 : 0, display: 'flex', alignItems: 'center', paddingLeft: 8 }}>
                            {m.pct > 12 && <span style={{ fontSize: '0.65rem', color: '#fff', fontWeight: 700 }}>{m.pct}%</span>}
                          </div>
                        </div>
                        <div style={{ width: 60, fontSize: '0.75rem', color: '#6B7280', flexShrink: 0 }}>{m.events} eventos</div>
                      </div>
                    ))
                  ) : (
                    <p style={{ color: '#9CA3AF', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>
                      Nenhum evento registrado ainda. Os dados aparecerão conforme os usuários utilizem o sistema.
                    </p>
                  )}
                </div>
              </section>
            )}

            {/* Usuários */}
            {activeTab === 'users' && s && (
              <section>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>DAU / WAU / MAU</h2>
                    <BarChartSVG data={[
                      { period: 'DAU', users: s.activeUsers?.dau?.uniqueUsers ?? 0 },
                      { period: 'WAU', users: s.activeUsers?.wau?.uniqueUsers ?? 0 },
                      { period: 'MAU', users: s.activeUsers?.mau?.uniqueUsers ?? 0 },
                    ]} height={150} />
                  </div>
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>Duração das Sessões</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Média',          value: fmtMin(s.sessionDuration?.avgMs), color: '#F04E00' },
                        { label: 'Sessões totais', value: s.sessionDuration?.sessions ?? 0,  color: '#2563EB' },
                        { label: 'Máxima',         value: fmtMin(s.sessionDuration?.maxMs), color: '#16A34A' },
                        { label: 'Mínima',         value: fmtMin(s.sessionDuration?.minMs), color: '#D97706' },
                      ].map(item => (
                        <div key={item.label} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6 }}>{item.label}</div>
                          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {s.churn && (
                  <div style={{ background: s.churn.churnRate > 30 ? '#FEF2F2' : '#fff', border: `1px solid ${s.churn.churnRate > 30 ? '#FECACA' : '#E5E7EB'}`, borderRadius: 14, padding: '20px 24px', marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.churn.churnRate > 30 && <AlertTriangle size={16} style={{ color: '#DC2626' }} />}
                      Retenção e Churn
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
                      {[
                        { label: 'Total', value: s.churn.totalUsers,  color: '#374151' },
                        { label: 'Ativos', value: s.churn.activeUsers, color: '#16A34A' },
                        { label: 'Churn', value: `${s.churn.churnRate}%`, color: s.churn.churnRate > 30 ? '#DC2626' : '#374151' },
                      ].map(i => (
                        <div key={i.label} style={{ textAlign: 'center' }}>
                          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6 }}>{i.label}</div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: i.color }}>{i.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* Funcionalidades */}
            {activeTab === 'features' && features && (
              <section>
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                    Adoção de Funcionalidades — {features.days} dias
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 20 }}>
                    Base: {features.totalActiveUsers} usuários ativos
                  </p>
                  {features.features?.map((f, i) => (
                    <HBar key={f.module} label={f.label} value={f.pct} max={100} color={MODULE_COLORS[i % MODULE_COLORS.length]} count={f.users} />
                  ))}
                </div>
              </section>
            )}

            {/* Retenção */}
            {activeTab === 'retention' && retention && (
              <section>
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'Retenção D7',  data: retention.d7,  color: '#2563EB' },
                    { label: 'Retenção D30', data: retention.d30, color: '#7C3AED' },
                  ].map(item => item.data && (
                    <div key={item.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>{item.label}</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <DonutChart pct={item.data.rate} color={item.color} size={90} />
                        <div>
                          <div style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 4 }}>Cohort: {item.data.cohortDate}</div>
                          <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                            <strong>{item.data.retained}</strong> de <strong>{item.data.cohortSize}</strong> voltaram após {item.data.retainAfterDays} dias
                          </div>
                        </div>
                      </div>
                      {item.data.cohortSize === 0 && (
                        <p style={{ color: '#9CA3AF', fontSize: '0.78rem', marginTop: 10 }}>Sem dados suficientes.</p>
                      )}
                    </div>
                  ))}
                </div>
                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 18px', marginTop: 16, fontSize: '0.8rem', color: '#1D4ED8' }}>
                  <strong>Guia:</strong> Taxa D7 acima de 30% e D30 acima de 15% indica boa adoção para ferramentas corporativas.
                </div>
              </section>
            )}

          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
