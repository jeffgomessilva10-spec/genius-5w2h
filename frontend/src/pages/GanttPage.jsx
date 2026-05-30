/**
 * GanttPage.jsx — Cronograma Gantt com filtros de período e status.
 * Timezone: America/Sao_Paulo (UTC-3).
 * Filtros: Hoje · Semana · Mês · Todos + status múltiplos.
 */
import { useState, useEffect, useRef } from 'react';
import { projectsAPI } from '../services/api';
import api from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import PeriodFilter from '../components/ui/PeriodFilter';
import StatusFilter from '../components/ui/StatusFilter';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { Loader2, FolderOpen, TrendingUp, Info } from 'lucide-react';

// Paleta de cores por status (consistente em toda a app)
const STATUS_COLOR = {
  PLANNED:     '#6B7280',
  IN_PROGRESS: '#2563EB',
  DELAYED:     '#DC2626',
  DONE:        '#16A34A',
};
const STATUS_LABEL = {
  PLANNED:     'Planejado',
  IN_PROGRESS: 'Em andamento',
  DELAYED:     'Atrasado',
  DONE:        'Finalizado',
};

const DAY_W  = 32;  // largura de cada dia em px
const ROW_H  = 40;  // altura de cada linha
const LABEL_W = 220; // largura do painel de labels

function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : ''; }
function fmtMonth(d) { return new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', ''); }

// Retorna a data atual no fuso de São Paulo
function todaySP() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

export default function GanttPage() {
  const { isAdmin } = useAuth();
  const isMobile    = useIsMobile();

  const [projects,   setProjects]   = useState([]);
  const [activities, setActivities] = useState([]);
  const [counters,   setCounters]   = useState({ PLANNED: 0, IN_PROGRESS: 0, DELAYED: 0, DONE: 0, total: 0 });
  const [loading,    setLoading]    = useState(true);
  const [period,     setPeriod]     = useState('semana');
  const [statusSel,  setStatusSel]  = useState([]);      // [] = todos
  const [projectSel, setProjectSel] = useState('');
  const [tooltip,    setTooltip]    = useState(null);

  useEffect(() => { loadProjects(); }, []);
  useEffect(() => { loadGantt(); }, [period, statusSel, projectSel]);

  async function loadProjects() {
    try {
      const { data } = await projectsAPI.list();
      setProjects(data.projects);
    } catch {}
  }

  async function loadGantt() {
    setLoading(true);
    try {
      const params = new URLSearchParams({ period });
      if (statusSel.length > 0) params.append('status', statusSel.join(','));
      if (projectSel)           params.append('projectId', projectSel);

      const { data } = await api.get(`/gantt?${params.toString()}`);
      setActivities(data.activities || []);
      setCounters(data.counters || { PLANNED: 0, IN_PROGRESS: 0, DELAYED: 0, DONE: 0, total: 0 });
    } catch (err) {
      console.error('Gantt error:', err);
      setActivities([]);
    } finally { setLoading(false); }
  }

  // ── Cálculo do intervalo do gráfico ────────────────
  const validActs = activities.filter(a => a.whenStart && a.whenEnd);
  const today     = todaySP();

  const minDate = validActs.length
    ? new Date(Math.min(...validActs.map(a => new Date(a.whenStart))))
    : addDays(today, -7);
  const maxDate = validActs.length
    ? new Date(Math.max(...validActs.map(a => new Date(a.whenEnd))))
    : addDays(today, 30);

  const startDate  = addDays(minDate, -7);
  const endDate    = addDays(maxDate, 7);
  const totalDays  = Math.max(daysBetween(startDate, endDate), 1);
  const todayOffset = daysBetween(startDate, today);

  // Cabeçalho de meses
  function buildMonths() {
    const months = [];
    let cur = new Date(startDate); let monthStart = 0; let currentMonth = cur.getMonth();
    for (let i = 0; i <= totalDays; i++) {
      const d = addDays(startDate, i);
      if (d.getMonth() !== currentMonth || i === totalDays) {
        months.push({ label: fmtMonth(addDays(startDate, monthStart)), startDay: monthStart, days: i - monthStart });
        monthStart = i; currentMonth = d.getMonth();
      }
    }
    return months;
  }
  const months = buildMonths();

  // Agrupa por projeto
  const grouped = projects.reduce((acc, p) => {
    const catIds = new Set((p.categories || []).map(c => c.id));
    const projActs = validActs.filter(a => catIds.has(a.category?.id));
    if (projActs.length > 0) acc[p.name] = projActs;
    return acc;
  }, {});

  // Se não há projeto mapeado, mostra tudo agrupado
  const hasGrouped = Object.values(grouped).some(v => v.length > 0);
  const displayGroups = hasGrouped ? grouped : { 'Atividades': validActs };

  const periodLabel = { todas: 'Todos os períodos', hoje: 'Hoje', semana: 'Esta semana', mes: 'Este mês' };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main id="main-content" style={{ flex: 1, overflowY: 'auto' }} role="main">

        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: isMobile ? '12px 16px' : '0 32px', display: 'flex', alignItems: isMobile ? 'flex-start' : 'center', justifyContent: 'space-between', minHeight: 64, flexDirection: isMobile ? 'column' : 'row', gap: isMobile ? 10 : 0, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Cronograma Gantt</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{periodLabel[period]} · {counters.total} atividade{counters.total !== 1 ? 's' : ''}</p>
          </div>
          {projects.length > 1 && (
            <select
              value={projectSel}
              onChange={e => setProjectSel(e.target.value)}
              aria-label="Filtrar por projeto"
              style={{ height: 36, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.83rem', background: '#fff', minWidth: 180 }}
            >
              <option value="">Todos os projetos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </header>

        <div style={{ padding: isMobile ? 12 : '20px 32px' }}>

          {/* ── Painel de filtros ── */}
          <section aria-label="Filtros do Gantt" style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '16px 20px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', flexShrink: 0 }}>Período</span>
                <PeriodFilter value={period} onChange={setPeriod} />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', flexShrink: 0 }}>Status</span>
                <StatusFilter value={statusSel} onChange={setStatusSel} counts={counters} />
              </div>
            </div>
          </section>

          {/* ── KPIs de contagem ── */}
          <section aria-label="Contadores por status" style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
            {[
              { key: 'PLANNED',     icon: '📋' },
              { key: 'IN_PROGRESS', icon: '⚡' },
              { key: 'DELAYED',     icon: '⚠️' },
              { key: 'DONE',        icon: '✅' },
            ].map(s => {
              const isFiltered = statusSel.length > 0 && !statusSel.includes(s.key);
              return (
                <button
                  key={s.key}
                  onClick={() => {
                    if (statusSel.includes(s.key)) setStatusSel(statusSel.filter(x => x !== s.key));
                    else setStatusSel([...statusSel, s.key]);
                  }}
                  title={`${statusSel.includes(s.key) ? 'Remover' : 'Adicionar'} filtro: ${STATUS_LABEL[s.key]}`}
                  style={{
                    background: isFiltered ? '#F9FAFB' : '#fff',
                    border: `1.5px solid ${statusSel.includes(s.key) ? STATUS_COLOR[s.key] : '#E5E7EB'}`,
                    borderTop: `3px solid ${STATUS_COLOR[s.key]}`,
                    borderRadius: 12, padding: '14px 16px', cursor: 'pointer',
                    opacity: isFiltered ? 0.5 : 1,
                    transition: 'all 0.15s', textAlign: 'left',
                  }}
                >
                  <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 6 }}>
                    {s.icon} {STATUS_LABEL[s.key]}
                  </div>
                  <div style={{ fontSize: '2rem', fontWeight: 800, color: STATUS_COLOR[s.key], lineHeight: 1 }}>
                    {counters[s.key] ?? 0}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4 }}>
                    {counters.total > 0 ? Math.round((counters[s.key] / counters.total) * 100) : 0}% do total
                  </div>
                </button>
              );
            })}
          </section>

          {/* ── Gantt ── */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={28} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : validActs.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: 60, textAlign: 'center', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <FolderOpen size={36} style={{ color: '#D1D5DB', marginBottom: 12 }} />
              <p style={{ color: '#9CA3AF', fontWeight: 500, marginBottom: 6 }}>Nenhuma atividade encontrada</p>
              <p style={{ color: '#D1D5DB', fontSize: '0.82rem' }}>
                Tente mudar o período ou remover os filtros de status.
              </p>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              {/* Legenda */}
              <div style={{ padding: '12px 20px', borderBottom: '1px solid #E5E7EB', display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                {Object.entries(STATUS_LABEL).map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#6B7280' }}>
                    <div style={{ width: 10, height: 10, borderRadius: 2, background: STATUS_COLOR[k] }} /> {v}
                  </div>
                ))}
                <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', color: '#6B7280' }}>
                  <div style={{ width: 2, height: 12, background: '#F04E00', borderRadius: 1 }} /> Hoje
                </div>
              </div>

              <div style={{ display: 'flex', overflowX: 'auto' }}>
                {/* Labels */}
                <div style={{ flexShrink: 0, width: isMobile ? 140 : LABEL_W, borderRight: '1px solid #E5E7EB', background: '#fff', zIndex: 2 }}>
                  <div style={{ height: 56, borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }} />
                  {Object.entries(displayGroups).map(([projName, acts]) => (
                    <div key={projName}>
                      <div style={{ padding: '6px 12px', background: '#FAFAFA', borderBottom: '1px solid #E5E7EB', fontSize: '0.68rem', fontWeight: 700, color: '#F04E00', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                        {projName}
                      </div>
                      {acts.map(a => (
                        <div key={a.id} style={{ height: ROW_H, padding: '0 10px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 8, height: 8, borderRadius: 2, background: STATUS_COLOR[a.status], flexShrink: 0 }} />
                          <span style={{ fontSize: '0.75rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                            {a.code} · {a.what}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Área do gráfico */}
                <div style={{ flexGrow: 1, overflowX: 'auto', position: 'relative' }}>
                  <div style={{ width: Math.max(totalDays * DAY_W, 400), minWidth: '100%', position: 'relative' }}>

                    {/* Cabeçalho de meses */}
                    <div style={{ height: 28, display: 'flex', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', position: 'sticky', top: 0, zIndex: 3 }}>
                      {months.map((m, i) => (
                        <div key={i} style={{ width: m.days * DAY_W, flexShrink: 0, borderRight: '1px solid #E5E7EB', fontSize: '0.68rem', fontWeight: 700, color: '#6B7280', display: 'flex', alignItems: 'center', paddingLeft: 8, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                          {m.label}
                        </div>
                      ))}
                    </div>

                    {/* Cabeçalho de semanas */}
                    <div style={{ height: 28, display: 'flex', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', position: 'sticky', top: 28, zIndex: 3 }}>
                      {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, wi) => (
                        <div key={wi} style={{ width: 7 * DAY_W, flexShrink: 0, borderRight: '1px solid #E5E7EB', fontSize: '0.63rem', color: '#9CA3AF', display: 'flex', alignItems: 'center', paddingLeft: 6 }}>
                          {fmtDate(addDays(startDate, wi * 7))}
                        </div>
                      ))}
                    </div>

                    {/* Barras */}
                    <div style={{ position: 'relative' }}>
                      {/* Grid vertical semanal */}
                      {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, wi) => (
                        <div key={wi} style={{ position: 'absolute', top: 0, bottom: 0, left: wi * 7 * DAY_W, width: 1, background: '#F3F4F6' }} />
                      ))}

                      {/* Linha de hoje */}
                      {todayOffset >= 0 && todayOffset <= totalDays && (
                        <div style={{ position: 'absolute', top: 0, bottom: 0, left: todayOffset * DAY_W, width: 2, background: '#F04E00', opacity: 0.8, zIndex: 2 }} />
                      )}

                      {Object.entries(displayGroups).map(([projName, acts]) => (
                        <div key={projName}>
                          <div style={{ height: 28, background: '#FAFAFA', borderBottom: '1px solid #E5E7EB' }} />
                          {acts.map(a => {
                            const startOff = Math.max(0, daysBetween(startDate, a.whenStart));
                            const dur      = Math.max(1, daysBetween(a.whenStart, a.whenEnd));
                            const color    = STATUS_COLOR[a.status];
                            return (
                              <div key={a.id} style={{ height: ROW_H, position: 'relative', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center' }}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`${a.code} — ${a.what} (${STATUS_LABEL[a.status]})`}
                                  style={{
                                    position: 'absolute',
                                    left: startOff * DAY_W + 2,
                                    width: Math.max(dur * DAY_W - 4, 20),
                                    height: 26, borderRadius: 6, background: color,
                                    opacity: 0.85, cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                                    overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                    transition: 'opacity 0.15s',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.opacity = '1'; setTooltip({ a, x: e.clientX, y: e.clientY }); }}
                                  onMouseLeave={e => { e.currentTarget.style.opacity = '0.85'; setTooltip(null); }}
                                  onMouseMove={e  => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
                                  onKeyDown={e    => e.key === 'Enter' && setTooltip(t => t ? null : { a, x: 0, y: 0 })}
                                >
                                  <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                    {a.code} {a.what}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Tooltip */}
      {tooltip && (
        <div role="tooltip" style={{ position: 'fixed', left: Math.min(tooltip.x + 12, window.innerWidth - 280), top: tooltip.y - 10, background: '#111827', color: '#fff', borderRadius: 10, padding: '12px 16px', fontSize: '0.78rem', maxWidth: 260, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,0.25)', pointerEvents: 'none' }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{tooltip.a.code} — {tooltip.a.what}</div>
          <div style={{ color: '#9CA3AF', marginBottom: 4 }}>
            {fmtDate(tooltip.a.whenStart)} → {fmtDate(tooltip.a.whenEnd)}
          </div>
          <div style={{ display: 'inline-block', background: `${STATUS_COLOR[tooltip.a.status]}33`, color: STATUS_COLOR[tooltip.a.status], padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700 }}>
            {STATUS_LABEL[tooltip.a.status]}
          </div>
          {tooltip.a.responsible && <div style={{ color: '#9CA3AF', marginTop: 4 }}>👤 {tooltip.a.responsible.name}</div>}
          {tooltip.a.risk && <div style={{ color: '#FCA5A5', marginTop: 4, fontSize: '0.72rem' }}>⚠️ {tooltip.a.risk}</div>}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
