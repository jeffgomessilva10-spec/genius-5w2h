import { useState, useEffect, useRef } from 'react';
import { projectsAPI, activitiesAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { Loader2, FolderOpen, ChevronLeft, ChevronRight } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const STATUS_COLOR  = { PLANNED: '#6B7280', IN_PROGRESS: '#2563EB', DELAYED: '#DC2626', DONE: '#16A34A' };
const STATUS_LABEL  = { PLANNED: 'Planejado', IN_PROGRESS: 'Em andamento', DELAYED: 'Atrasado', DONE: 'Finalizado' };
const STATUS_BG     = { PLANNED: '#F3F4F6', IN_PROGRESS: '#EFF6FF', DELAYED: '#FEF2F2', DONE: '#F0FDF4' };

const DAY_W = 32; // largura de cada dia em px

function addDays(date, days) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function daysBetween(a, b) {
  return Math.round((new Date(b) - new Date(a)) / 86400000);
}

function fmt(d) {
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function fmtMonth(d) {
  return new Date(d).toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' }).replace('.', '');
}

export default function GanttPage() {
  const { isAdmin } = useAuth();
  const [projects, setProjects]     = useState([]);
  const [selected, setSelected]     = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [viewAll, setViewAll]       = useState(false);
  const [tooltip, setTooltip]       = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try {
      const { data } = await projectsAPI.list();
      setProjects(data.projects);
      if (data.projects[0]) await selectProject(data.projects[0].id);
    } finally {
      setLoading(false);
    }
  }

  async function selectProject(projectId) {
    setSelected(projectId);
    setViewAll(false);
    setLoading(true);
    try {
      const { data } = await activitiesAPI.list({});
      // filtra pelo projeto via category.projectId
      const proj = await projectsAPI.get(projectId);
      const catIds = new Set(proj.data.project.categories.map(c => c.id));
      setActivities(data.activities.filter(a => catIds.has(a.category?.id)));
    } finally {
      setLoading(false);
    }
  }

  async function loadAll() {
    setViewAll(true);
    setSelected(null);
    setLoading(true);
    try {
      const { data } = await activitiesAPI.list({});
      setActivities(data.activities);
    } finally {
      setLoading(false);
    }
  }

  // Calcular intervalo de datas para o gráfico
  const validActs = activities.filter(a => a.whenStart && a.whenEnd);
  const minDate = validActs.length
    ? new Date(Math.min(...validActs.map(a => new Date(a.whenStart))))
    : new Date();
  const maxDate = validActs.length
    ? new Date(Math.max(...validActs.map(a => new Date(a.whenEnd))))
    : addDays(new Date(), 30);

  // Adiciona margem de 7 dias dos dois lados
  const startDate = addDays(minDate, -7);
  const endDate   = addDays(maxDate, 7);
  const totalDays = daysBetween(startDate, endDate);

  // Gerar cabeçalho de meses e dias
  function buildHeader() {
    const months = [];
    let cur = new Date(startDate);
    let monthStart = 0;
    let currentMonth = cur.getMonth();

    for (let i = 0; i <= totalDays; i++) {
      const d = addDays(startDate, i);
      if (d.getMonth() !== currentMonth || i === totalDays) {
        months.push({ label: fmtMonth(addDays(startDate, monthStart)), startDay: monthStart, days: i - monthStart });
        monthStart = i;
        currentMonth = d.getMonth();
      }
    }
    return months;
  }

  const months = buildHeader();

  // Hoje
  const todayOffset = daysBetween(startDate, new Date());

  // Agrupar atividades por projeto (para visão geral)
  const grouped = viewAll
    ? projects.reduce((acc, p) => {
        const catIds = new Set((p.categories || []).map(c => c.id));
        acc[p.name] = activities.filter(a => catIds.has(a.category?.id));
        return acc;
      }, {})
    : { [projects.find(p => p.id === selected)?.name || '']: activities };

  const ROW_H = 40;
  const LABEL_W = 220;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #E5E7EB',
          padding: '0 32px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Gráfico de Gantt</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Linha do tempo das atividades</p>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {isAdmin && (
              <button onClick={loadAll} className="btn btn-ghost" style={{
                fontSize: '0.82rem', padding: '7px 14px',
                background: viewAll ? '#F04E00' : undefined,
                color: viewAll ? '#fff' : undefined,
                borderColor: viewAll ? '#F04E00' : undefined,
              }}>
                Todos os projetos
              </button>
            )}
            {projects.map(p => (
              <button key={p.id} onClick={() => selectProject(p.id)} className="btn btn-ghost" style={{
                fontSize: '0.82rem', padding: '7px 14px',
                background: selected === p.id && !viewAll ? '#F04E00' : undefined,
                color: selected === p.id && !viewAll ? '#fff' : undefined,
                borderColor: selected === p.id && !viewAll ? '#F04E00' : undefined,
              }}>
                <FolderOpen size={13} /> {p.name}
              </button>
            ))}
          </div>
        </div>

        <div style={{ padding: '24px 32px' }}>
          {/* Legenda */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 20, flexWrap: 'wrap' }}>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6B7280' }}>
                <div style={{ width: 12, height: 12, borderRadius: 3, background: STATUS_COLOR[k] }} />
                {v}
              </div>
            ))}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.78rem', color: '#6B7280' }}>
              <div style={{ width: 2, height: 14, background: '#F04E00', borderRadius: 1 }} />
              Hoje
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 80 }}>
              <Loader2 size={28} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : validActs.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 60, textAlign: 'center' }}>
              <p style={{ color: '#9CA3AF' }}>Nenhuma atividade com datas definidas encontrada.</p>
            </div>
          ) : (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', overflowX: 'auto' }} ref={scrollRef}>
                {/* Painel de rótulos */}
                <div style={{ flexShrink: 0, width: LABEL_W, borderRight: '1px solid #E5E7EB', zIndex: 2, background: '#fff' }}>
                  {/* Header vazio */}
                  <div style={{ height: 56, borderBottom: '1px solid #E5E7EB', background: '#F9FAFB' }} />

                  {Object.entries(grouped).map(([projName, acts]) => (
                    <div key={projName}>
                      {viewAll && (
                        <div style={{
                          padding: '8px 16px', background: '#F9FAFB',
                          borderBottom: '1px solid #E5E7EB',
                          fontSize: '0.75rem', fontWeight: 700, color: '#F04E00',
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          {projName}
                        </div>
                      )}
                      {acts.filter(a => a.whenStart && a.whenEnd).map(a => (
                        <div key={a.id} style={{
                          height: ROW_H, padding: '0 12px',
                          borderBottom: '1px solid #F3F4F6',
                          display: 'flex', alignItems: 'center', gap: 8,
                        }}>
                          <div style={{
                            width: 8, height: 8, borderRadius: 2, flexShrink: 0,
                            background: STATUS_COLOR[a.status],
                          }} />
                          <div style={{ fontSize: '0.78rem', color: '#374151', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                            {a.code} · {a.what}
                          </div>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Área do Gantt */}
                <div style={{ flexGrow: 1, overflowX: 'auto', position: 'relative' }}>
                  <div style={{ width: totalDays * DAY_W, minWidth: '100%', position: 'relative' }}>

                    {/* Cabeçalho de meses */}
                    <div style={{ height: 28, display: 'flex', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', position: 'sticky', top: 0, zIndex: 3 }}>
                      {months.map((m, i) => (
                        <div key={i} style={{
                          width: m.days * DAY_W, flexShrink: 0,
                          borderRight: '1px solid #E5E7EB',
                          fontSize: '0.7rem', fontWeight: 700, color: '#6B7280',
                          display: 'flex', alignItems: 'center', paddingLeft: 8,
                          textTransform: 'uppercase', letterSpacing: '0.5px',
                        }}>
                          {m.label}
                        </div>
                      ))}
                    </div>

                    {/* Cabeçalho de semanas */}
                    <div style={{ height: 28, display: 'flex', borderBottom: '1px solid #E5E7EB', background: '#F9FAFB', position: 'sticky', top: 28, zIndex: 3 }}>
                      {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, wi) => {
                        const d = addDays(startDate, wi * 7);
                        return (
                          <div key={wi} style={{
                            width: 7 * DAY_W, flexShrink: 0, borderRight: '1px solid #E5E7EB',
                            fontSize: '0.65rem', color: '#9CA3AF',
                            display: 'flex', alignItems: 'center', paddingLeft: 6,
                          }}>
                            {fmt(d)}
                          </div>
                        );
                      })}
                    </div>

                    {/* Grid de fundo + barras */}
                    <div style={{ position: 'relative' }}>
                      {/* Linhas de grade verticais (semanal) */}
                      {Array.from({ length: Math.ceil(totalDays / 7) }).map((_, wi) => (
                        <div key={wi} style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: wi * 7 * DAY_W, width: 1,
                          background: '#F3F4F6',
                        }} />
                      ))}

                      {/* Linha de hoje */}
                      {todayOffset >= 0 && todayOffset <= totalDays && (
                        <div style={{
                          position: 'absolute', top: 0, bottom: 0,
                          left: todayOffset * DAY_W, width: 2,
                          background: '#F04E00', opacity: 0.8, zIndex: 2,
                        }} />
                      )}

                      {/* Linhas de atividades */}
                      {Object.entries(grouped).map(([projName, acts]) => (
                        <div key={projName}>
                          {viewAll && (
                            <div style={{ height: 32, background: '#FAFAFA', borderBottom: '1px solid #E5E7EB' }} />
                          )}
                          {acts.filter(a => a.whenStart && a.whenEnd).map(a => {
                            const startOff = Math.max(0, daysBetween(startDate, a.whenStart));
                            const dur      = Math.max(1, daysBetween(a.whenStart, a.whenEnd));
                            return (
                              <div key={a.id} style={{
                                height: ROW_H, position: 'relative',
                                borderBottom: '1px solid #F3F4F6',
                                display: 'flex', alignItems: 'center',
                              }}>
                                {/* Barra */}
                                <div
                                  style={{
                                    position: 'absolute',
                                    left: startOff * DAY_W + 2,
                                    width: Math.max(dur * DAY_W - 4, 20),
                                    height: 24, borderRadius: 6,
                                    background: STATUS_COLOR[a.status],
                                    opacity: 0.85,
                                    cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', paddingLeft: 8,
                                    overflow: 'hidden',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                                    transition: 'opacity 0.15s',
                                  }}
                                  onMouseEnter={e => {
                                    e.currentTarget.style.opacity = '1';
                                    setTooltip({ a, x: e.clientX, y: e.clientY });
                                  }}
                                  onMouseLeave={e => {
                                    e.currentTarget.style.opacity = '0.85';
                                    setTooltip(null);
                                  }}
                                  onMouseMove={e => setTooltip(t => t ? { ...t, x: e.clientX, y: e.clientY } : null)}
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
        <div style={{
          position: 'fixed', left: tooltip.x + 14, top: tooltip.y - 10,
          background: '#111827', color: '#fff', borderRadius: 8, padding: '10px 14px',
          fontSize: '0.78rem', maxWidth: 260, zIndex: 9999, boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{tooltip.a.code} — {tooltip.a.what}</div>
          <div style={{ color: '#9CA3AF', marginBottom: 3 }}>
            {new Date(tooltip.a.whenStart).toLocaleDateString('pt-BR')} → {new Date(tooltip.a.whenEnd).toLocaleDateString('pt-BR')}
          </div>
          <div style={{ display: 'inline-block', background: STATUS_COLOR[tooltip.a.status] + '33', color: STATUS_COLOR[tooltip.a.status], padding: '2px 8px', borderRadius: 99, fontSize: '0.7rem', fontWeight: 700 }}>
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
