/**
 * AnalyticsPage.jsx — Dashboard de Analytics
 * Acesso: ADMIN e EXECUTIVE apenas.
 * Gráficos: Recharts (lazy-loaded para performance).
 */
import { useState, useEffect, lazy, Suspense } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { analyticsAPI } from '../services/api';
import { useIsMobile } from '../hooks/useIsMobile';
import {
  Users, Clock, TrendingUp, TrendingDown,
  Activity, BarChart3, Loader2, RefreshCw, AlertTriangle,
} from 'lucide-react';

// Lazy load Recharts para não impactar bundle inicial
const {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} = await import('recharts').catch(() => ({}));

const PERIOD_OPTIONS = [
  { value: 7,  label: '7 dias'     },
  { value: 14, label: '14 dias'    },
  { value: 30, label: '30 dias'    },
  { value: 90, label: '3 meses'   },
];

const MODULE_COLORS = [
  '#F04E00', '#2563EB', '#16A34A', '#D97706',
  '#7C3AED', '#DC2626', '#0891B2', '#65A30D',
];

function KpiTile({ label, value, sub, color = '#F04E00', icon: Icon, trend }) {
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
      {trend !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 6, fontSize: '0.75rem', color: trend >= 0 ? '#16A34A' : '#DC2626', fontWeight: 600 }}>
          {trend >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}% vs período anterior
        </div>
      )}
    </div>
  );
}

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
      const endDate   = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

      const [sumRes, dauRes, retRes, featRes] = await Promise.all([
        analyticsAPI.summary(),
        analyticsAPI.dau({ start: startDate, end: endDate }),
        analyticsAPI.retention({ cohort: startDate }),
        analyticsAPI.features({ days }),
      ]);

      setSummary(sumRes.data);
      setDau(dauRes.data.series || []);
      setRetention(retRes.data);
      setFeatures(featRes.data);
    } catch (err) {
      console.error('Analytics error:', err);
    } finally {
      setLoading(false);
    }
  }

  const s = summary;
  const formatMin = (ms) => ms ? `${(ms / 60000).toFixed(1)}min` : '—';

  const TABS = [
    { id: 'overview',  label: 'Visão Geral'  },
    { id: 'users',     label: 'Usuários'     },
    { id: 'features',  label: 'Funcionalidades' },
    { id: 'retention', label: 'Retenção'     },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main id="main-content" style={{ flex: 1, overflowY: 'auto' }} role="main">

        {/* Topbar */}
        <header style={{
          background: '#fff', borderBottom: '1px solid #E5E7EB',
          padding: '0 32px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Analytics de Uso</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Engajamento e adoção da plataforma</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              value={days}
              onChange={e => setDays(Number(e.target.value))}
              aria-label="Período de análise"
              style={{ height: 36, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.83rem', background: '#fff' }}
            >
              {PERIOD_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button onClick={loadAll} aria-label="Atualizar dados" className="btn btn-ghost" style={{ height: 36, padding: '0 12px' }}>
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

            {/* ── KPIs principais ── */}
            <section aria-label="Indicadores principais" style={{ marginBottom: 28 }}>
              <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 12 }}>
                Indicadores de Engajamento
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 14 }}>
                <KpiTile icon={Users}    label="DAU"           value={s?.activeUsers?.dau?.uniqueUsers ?? 0}  sub="usuários/dia"   color="#F04E00" />
                <KpiTile icon={Users}    label="WAU"           value={s?.activeUsers?.wau?.uniqueUsers ?? 0}  sub="usuários/semana" color="#2563EB" />
                <KpiTile icon={Users}    label="MAU"           value={s?.activeUsers?.mau?.uniqueUsers ?? 0}  sub="usuários/mês"   color="#7C3AED" />
                <KpiTile icon={Clock}    label="Sessão média"  value={formatMin(s?.sessionDuration?.avgMs)}   sub={`${s?.sessionDuration?.sessions ?? 0} sessões`} color="#16A34A" />
              </div>
            </section>

            {/* ── Tabs ── */}
            <nav aria-label="Seções de analytics" style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '2px solid #E5E7EB', paddingBottom: 0 }}>
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  aria-current={activeTab === tab.id ? 'page' : undefined}
                  style={{
                    padding: '8px 18px', background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.85rem', fontWeight: activeTab === tab.id ? 700 : 500,
                    color: activeTab === tab.id ? '#F04E00' : '#6B7280',
                    borderBottom: activeTab === tab.id ? '2px solid #F04E00' : '2px solid transparent',
                    marginBottom: '-2px', transition: 'all 0.15s',
                  }}
                >
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* ── Visão Geral ── */}
            {activeTab === 'overview' && (
              <section aria-label="Visão geral de uso">
                {/* Gráfico DAU */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>
                    Usuários Ativos por Dia (DAU)
                  </h2>
                  {dau.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <LineChart data={dau} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} tickFormatter={d => d.slice(5)} />
                        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
                        <Tooltip
                          contentStyle={{ background: '#111827', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }}
                          formatter={(v) => [v, 'Usuários']}
                          labelFormatter={l => `Data: ${l}`}
                        />
                        <Line type="monotone" dataKey="users" stroke="#F04E00" strokeWidth={2.5} dot={false} activeDot={{ r: 5, fill: '#F04E00' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  ) : (
                    <div style={{ height: 220, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9CA3AF', fontSize: '0.85rem' }}>
                      Nenhum dado no período. Os gráficos aparecerão conforme os usuários interajam com o sistema.
                    </div>
                  )}
                </div>

                {/* Mapa de calor por módulo */}
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>
                    Módulos Mais Acessados
                  </h2>
                  {s?.topModules?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {s.topModules.map((m, i) => (
                        <div key={m.module} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 120, fontSize: '0.8rem', color: '#374151', fontWeight: 500, textAlign: 'right', flexShrink: 0 }}>
                            {m.module?.replace(/_/g, ' ')}
                          </div>
                          <div style={{ flex: 1, height: 24, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 99,
                              width: `${m.pct}%`, minWidth: m.events > 0 ? 24 : 0,
                              background: MODULE_COLORS[i % MODULE_COLORS.length],
                              transition: 'width 0.5s ease',
                              display: 'flex', alignItems: 'center', paddingLeft: 8,
                            }}>
                              {m.pct > 10 && <span style={{ fontSize: '0.68rem', color: '#fff', fontWeight: 700 }}>{m.pct}%</span>}
                            </div>
                          </div>
                          <div style={{ width: 60, fontSize: '0.78rem', color: '#6B7280', flexShrink: 0 }}>
                            {m.events} eventos
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ color: '#9CA3AF', fontSize: '0.85rem', textAlign: 'center', padding: 20 }}>Nenhum evento registrado ainda.</p>
                  )}
                </div>
              </section>
            )}

            {/* ── Usuários ── */}
            {activeTab === 'users' && s && (
              <section aria-label="Métricas de usuários">
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  {/* DAU/WAU/MAU comparativo */}
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>DAU / WAU / MAU</h2>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={[
                        { period: 'DAU', users: s.activeUsers?.dau?.uniqueUsers ?? 0 },
                        { period: 'WAU', users: s.activeUsers?.wau?.uniqueUsers ?? 0 },
                        { period: 'MAU', users: s.activeUsers?.mau?.uniqueUsers ?? 0 },
                      ]} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                        <XAxis dataKey="period" tick={{ fontSize: 12, fill: '#6B7280' }} />
                        <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
                        <Tooltip contentStyle={{ background: '#111827', border: 'none', borderRadius: 8, color: '#fff', fontSize: 12 }} />
                        <Bar dataKey="users" radius={[6, 6, 0, 0]}>
                          <Cell fill="#F04E00" />
                          <Cell fill="#2563EB" />
                          <Cell fill="#7C3AED" />
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  {/* Sessões */}
                  <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>Duração das Sessões</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      {[
                        { label: 'Média', value: formatMin(s.sessionDuration?.avgMs), color: '#F04E00' },
                        { label: 'Sessões totais', value: s.sessionDuration?.sessions ?? 0, color: '#2563EB' },
                        { label: 'Máxima', value: formatMin(s.sessionDuration?.maxMs), color: '#16A34A' },
                        { label: 'Mínima', value: formatMin(s.sessionDuration?.minMs), color: '#D97706' },
                      ].map(item => (
                        <div key={item.label} style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', textAlign: 'center' }}>
                          <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6 }}>{item.label}</div>
                          <div style={{ fontSize: '1.4rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Churn */}
                {s.churn && (
                  <div style={{ background: s.churn.churnRate > 30 ? '#FEF2F2' : '#fff', border: `1px solid ${s.churn.churnRate > 30 ? '#FECACA' : '#E5E7EB'}`, borderRadius: 14, padding: '20px 24px', marginTop: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                      {s.churn.churnRate > 30 && <AlertTriangle size={16} style={{ color: '#DC2626' }} />}
                      Retenção e Churn (últimos {s.churn.inactiveDays} dias)
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6 }}>Total usuários</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#374151' }}>{s.churn.totalUsers}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6 }}>Ativos</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#16A34A' }}>{s.churn.activeUsers}</div>
                      </div>
                      <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 6 }}>Taxa de churn</div>
                        <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.churn.churnRate > 30 ? '#DC2626' : '#374151' }}>{s.churn.churnRate}%</div>
                      </div>
                    </div>
                  </div>
                )}
              </section>
            )}

            {/* ── Funcionalidades ── */}
            {activeTab === 'features' && features && (
              <section aria-label="Adoção de funcionalidades">
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 6 }}>
                    Adoção de Funcionalidades — últimos {features.days} dias
                  </h2>
                  <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 20 }}>
                    Base: {features.totalActiveUsers} usuários ativos no período
                  </p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {features.features?.map((f, i) => (
                      <div key={f.module}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#374151' }}>{f.label}</span>
                          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: MODULE_COLORS[i % MODULE_COLORS.length] }}>
                            {f.pct}% · {f.users} usuários
                          </span>
                        </div>
                        <div style={{ height: 10, background: '#F3F4F6', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{
                            height: '100%', borderRadius: 99,
                            width: `${f.pct}%`, minWidth: f.pct > 0 ? 4 : 0,
                            background: MODULE_COLORS[i % MODULE_COLORS.length],
                            transition: 'width 0.6s ease',
                          }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            )}

            {/* ── Retenção ── */}
            {activeTab === 'retention' && retention && (
              <section aria-label="Taxa de retenção">
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
                  {[
                    { label: 'Retenção D7', data: retention.d7,  color: '#2563EB' },
                    { label: 'Retenção D30', data: retention.d30, color: '#7C3AED' },
                  ].map(item => item.data && (
                    <div key={item.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '20px 24px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                      <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>{item.label}</h2>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                        <div style={{ position: 'relative', width: 80, height: 80 }}>
                          <svg viewBox="0 0 36 36" style={{ width: 80, height: 80, transform: 'rotate(-90deg)' }}>
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
                            <circle cx="18" cy="18" r="15.9" fill="none" stroke={item.color} strokeWidth="3"
                              strokeDasharray={`${item.data.rate} ${100 - item.data.rate}`}
                              strokeLinecap="round" />
                          </svg>
                          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: '1rem', color: item.color }}>
                            {item.data.rate}%
                          </div>
                        </div>
                        <div>
                          <div style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 4 }}>
                            Cohort: {item.data.cohortDate}
                          </div>
                          <div style={{ fontSize: '0.82rem', color: '#374151' }}>
                            <strong>{item.data.retained}</strong> de <strong>{item.data.cohortSize}</strong> retornaram após {item.data.retainAfterDays} dias
                          </div>
                        </div>
                      </div>
                      {item.data.cohortSize === 0 && (
                        <p style={{ color: '#9CA3AF', fontSize: '0.78rem', marginTop: 10 }}>
                          Sem dados suficientes para este cohort.
                        </p>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 18px', marginTop: 16, fontSize: '0.8rem', color: '#1D4ED8' }}>
                  <strong>Sobre a retenção:</strong> Mede a proporção de usuários que voltaram a usar a plataforma após um período.
                  Uma taxa D7 acima de 30% e D30 acima de 15% indica boa adoção para ferramentas corporativas.
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
