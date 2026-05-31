/**
 * GanttPage.jsx — Cronograma Gantt com filtros de período e status.
 * Usa /api/activities diretamente com filtragem client-side para máxima
 * compatibilidade, independente da rota /api/gantt estar disponível.
 * Timezone: America/Sao_Paulo (UTC-3).
 */
import { useState, useEffect, useRef } from 'react';
import { projectsAPI, activitiesAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import PeriodFilter from '../components/ui/PeriodFilter';
import StatusFilter from '../components/ui/StatusFilter';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { Loader2, FolderOpen } from 'lucide-react';

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

const DAY_W   = 28;
const ROW_H   = 38;
const LABEL_W = 200;

function addDays(date, n) { const d = new Date(date); d.setDate(d.getDate() + n); return d; }
function daysBetween(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit' }) : ''; }
function fmtMonth(d) { return new Date(d).toLocaleDateString('pt-BR', { month:'short', year:'2-digit' }).replace('.',''); }

/** Data atual no fuso de São Paulo */
function todaySP() {
  return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Sao_Paulo' }));
}

/** Calcula intervalo de datas para o período selecionado */
function getPeriodRange(period) {
  const now = todaySP();
  if (period === 'hoje') {
    const s = new Date(now); s.setHours(0,0,0,0);
    const e = new Date(now); e.setHours(23,59,59,999);
    return { start: s, end: e };
  }
  if (period === 'semana') {
    const day = now.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0,0,0,0);
    const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
    return { start: mon, end: sun };
  }
  if (period === 'mes') {
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    return { start: s, end: e };
  }
  return null; // todas
}

/** Verifica se uma atividade está dentro do intervalo de datas */
function activityInRange(act, range) {
  if (!range || !act.whenStart || !act.whenEnd) return true;
  const s = new Date(act.whenStart);
  const e = new Date(act.whenEnd);
  return (s <= range.end && e >= range.start);
}

export default function GanttPage() {
  const { isAdmin }  = useAuth();
  const isMobile     = useIsMobile();

  const [projects,   setProjects]   = useState([]);
  const [allActs,    setAllActs]    = useState([]);   // todas as atividades carregadas
  const [activities, setActivities] = useState([]);   // atividades filtradas para exibir
  const [counters,   setCounters]   = useState({ PLANNED:0, IN_PROGRESS:0, DELAYED:0, DONE:0, total:0 });
  const [loading,    setLoading]    = useState(true);
  const [period,     setPeriod]     = useState('semana');
  const [statusSel,  setStatusSel]  = useState([]);
  const [projectSel, setProjectSel] = useState('');
  const [tooltip,    setTooltip]    = useState(null);

  // Carrega projetos uma vez
  useEffect(() => { loadProjects(); }, []);

  // Recarrega atividades quando muda o projeto selecionado
  useEffect(() => { loadActivities(); }, [projectSel]);

  // Aplica filtros client-side quando muda período ou status
  useEffect(() => { applyFilters(); }, [period, statusSel, allActs]);

  async function loadProjects() {
    try {
      const { data } = await projectsAPI.list();
      setProjects(data.projects);
      // Seleciona automaticamente o projeto com mais atividades
      if (data.projects.length > 0 && !projectSel) {
        setProjectSel(data.projects[0].id);
      }
    } catch (e) { console.error(e); }
  }

  async function loadActivities() {
    setLoading(true);
    try {
      // Busca todas as atividades com datas pelo projeto selecionado
      const params = {};
      if (projectSel) {
        // Busca categorias do projeto para filtrar por categoryId
        const { data: projData } = await projectsAPI.get(projectSel);
        const catIds = (projData.project.categories || []).map(c => c.id);
        // Busca atividades categoria por categoria (sem filtro de data ainda)
        const results = await Promise.all(
          catIds.map(cid => activitiesAPI.list({ categoryId: cid }).then(r => r.data.activities).catch(() => []))
        );
        const merged = results.flat();
        setAllActs(merged);
      } else {
        const { data } = await activitiesAPI.list({});
        setAllActs(data.activities || []);
      }
    } catch (e) {
      console.error('Gantt load error:', e);
      setAllActs([]);
    } finally {
      setLoading(false);
    }
  }

  function applyFilters() {
    const range = getPeriodRange(period);

    // Filtra por datas e status
    let filtered = allActs.filter(a => a.whenStart && a.whenEnd); // só com datas
    if (range) {
      filtered = filtered.filter(a => activityInRange(a, range));
    }
    if (statusSel.length > 0) {
      filtered = filtered.filter(a => statusSel.includes(a.status));
    }

    setActivities(filtered);

    // Recalcula contadores (do conjunto com datas, independente do filtro de status)
    const withDates = allActs.filter(a => a.whenStart && a.whenEnd);
    const inRange   = range ? withDates.filter(a => activityInRange(a, range)) : withDates;
    setCounters({
      PLANNED:     inRange.filter(a => a.status === 'PLANNED').length,
      IN_PROGRESS: inRange.filter(a => a.status === 'IN_PROGRESS').length,
      DELAYED:     inRange.filter(a => a.status === 'DELAYED').length,
      DONE:        inRange.filter(a => a.status === 'DONE').length,
      total:       inRange.length,
    });
  }

  // ── Cálculo do gráfico ────────────────────────────
  const today      = todaySP();
  const validActs  = activities;

  // Define janela do gráfico: min data de início ao max data de fim
  const minDate = validActs.length
    ? new Date(Math.min(...validActs.map(a => new Date(a.whenStart))))
    : addDays(today, -7);
  const maxDate = validActs.length
    ? new Date(Math.max(...validActs.map(a => new Date(a.whenEnd))))
    : addDays(today, 30);

  const startDate  = addDays(minDate, -3);
  const endDate    = addDays(maxDate, 3);
  const totalDays  = Math.max(daysBetween(startDate, endDate), 14);
  const todayOff   = daysBetween(startDate, today);

  // Cabeçalho de meses
  function buildMonths() {
    const months = []; let ms = 0; let cm = new Date(startDate).getMonth();
    for (let i = 0; i <= totalDays; i++) {
      const d = addDays(startDate, i);
      if (d.getMonth() !== cm || i === totalDays) {
        months.push({ label: fmtMonth(addDays(startDate, ms)), startDay: ms, days: i - ms });
        ms = i; cm = d.getMonth();
      }
    }
    return months;
  }
  const months = buildMonths();

  // Agrupa atividades por categoria
  const grouped = {};
  validActs.forEach(a => {
    const key = a.category?.name || 'Sem categoria';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(a);
  });

  const periodLabel = { todas:'Todos os períodos', hoje:'Hoje', semana:'Esta semana', mes:'Este mês' };
  const effectiveLabelW = isMobile ? 120 : LABEL_W;

  return (
    <div style={{ display:'flex', minHeight:'100vh', background:'#F3F4F6' }}>
      <Sidebar />
      <main id="main-content" style={{ flex:1, overflowY:'auto' }}>

        {/* Topbar */}
        <header style={{
          background:'#fff', borderBottom:'1px solid #E5E7EB',
          padding: isMobile ? '12px 16px' : '0 32px',
          display:'flex', alignItems:'center', justifyContent:'space-between',
          minHeight:64, flexWrap:'wrap', gap:8,
          position:'sticky', top:0, zIndex:10,
        }}>
          <div>
            <h1 style={{ fontSize:'1rem', fontWeight:700, color:'#111827' }}>Cronograma Gantt</h1>
            <p style={{ fontSize:'0.78rem', color:'#9CA3AF' }}>
              {periodLabel[period]} · {counters.total} atividade{counters.total !== 1 ? 's' : ''}
            </p>
          </div>
          {projects.length > 0 && (
            <select
              value={projectSel}
              onChange={e => setProjectSel(e.target.value)}
              aria-label="Filtrar por projeto"
              style={{ height:36, padding:'0 12px', border:'1px solid #E5E7EB', borderRadius:8, fontSize:'0.83rem', background:'#fff', maxWidth: isMobile ? '100%' : 280 }}
            >
              <option value="">Todos os projetos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          )}
        </header>

        <div style={{ padding: isMobile ? 12 : '20px 32px' }}>

          {/* Painel de filtros */}
          <section aria-label="Filtros" style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:'14px 20px', marginBottom:16, boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.6px', flexShrink:0 }}>Período</span>
                <PeriodFilter value={period} onChange={v => { setPeriod(v); }} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
                <span style={{ fontSize:'0.72rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.6px', flexShrink:0 }}>Status</span>
                <StatusFilter value={statusSel} onChange={setStatusSel} counts={counters} />
              </div>
            </div>
          </section>

          {/* KPIs clicáveis */}
          <section aria-label="Contadores" style={{ display:'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap:10, marginBottom:16 }}>
            {[
              { key:'PLANNED',     icon:'📋' },
              { key:'IN_PROGRESS', icon:'⚡' },
              { key:'DELAYED',     icon:'⚠️' },
              { key:'DONE',        icon:'✅' },
            ].map(s => {
              const isActive = statusSel.includes(s.key);
              return (
                <button key={s.key}
                  onClick={() => setStatusSel(isActive ? statusSel.filter(x=>x!==s.key) : [...statusSel, s.key])}
                  style={{
                    background: isActive ? `${STATUS_COLOR[s.key]}10` : '#fff',
                    border: `1.5px solid ${isActive ? STATUS_COLOR[s.key] : '#E5E7EB'}`,
                    borderTop: `3px solid ${STATUS_COLOR[s.key]}`,
                    borderRadius:12, padding:'12px 14px', cursor:'pointer',
                    textAlign:'left', transition:'all 0.15s',
                  }}>
                  <div style={{ fontSize:'0.68rem', fontWeight:700, color:'#9CA3AF', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:6 }}>
                    {s.icon} {STATUS_LABEL[s.key]}
                  </div>
                  <div style={{ fontSize:'1.8rem', fontWeight:800, color:STATUS_COLOR[s.key], lineHeight:1 }}>{counters[s.key]??0}</div>
                  <div style={{ fontSize:'0.7rem', color:'#9CA3AF', marginTop:4 }}>
                    {counters.total > 0 ? Math.round((counters[s.key]/counters.total)*100) : 0}%
                  </div>
                </button>
              );
            })}
          </section>

          {/* Gráfico Gantt */}
          {loading ? (
            <div style={{ display:'flex', justifyContent:'center', padding:60 }}>
              <Loader2 size={28} style={{ color:'#F04E00', animation:'spin 1s linear infinite' }} />
            </div>
          ) : validActs.length === 0 ? (
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, padding:60, textAlign:'center', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>
              <FolderOpen size={36} style={{ color:'#D1D5DB', marginBottom:12 }} />
              <p style={{ color:'#9CA3AF', fontWeight:500, marginBottom:6 }}>Nenhuma atividade encontrada</p>
              <p style={{ color:'#D1D5DB', fontSize:'0.82rem' }}>
                {period !== 'todas'
                  ? 'Clique em "Todos" para ver todas as atividades do projeto.'
                  : 'As atividades precisam ter datas de início e término para aparecer no Gantt.'}
              </p>
              {period !== 'todas' && (
                <button onClick={() => setPeriod('todas')} className="btn btn-primary" style={{ marginTop:14, fontSize:'0.85rem' }}>
                  Ver todas as atividades
                </button>
              )}
            </div>
          ) : (
            <div style={{ background:'#fff', border:'1px solid #E5E7EB', borderRadius:14, overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.04)' }}>

              {/* Legenda */}
              <div style={{ padding:'10px 20px', borderBottom:'1px solid #E5E7EB', display:'flex', gap:14, flexWrap:'wrap', alignItems:'center', background:'#FAFAFA' }}>
                {Object.entries(STATUS_LABEL).map(([k,v]) => (
                  <div key={k} style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.73rem', color:'#6B7280' }}>
                    <div style={{ width:10, height:10, borderRadius:2, background:STATUS_COLOR[k] }} />{v}
                  </div>
                ))}
                <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:'0.73rem', color:'#6B7280' }}>
                  <div style={{ width:2, height:14, background:'#F04E00', borderRadius:1 }} />Hoje
                </div>
              </div>

              <div style={{ display:'flex', overflowX:'auto', WebkitOverflowScrolling:'touch' }}>

                {/* Coluna de labels */}
                <div style={{ flexShrink:0, width:effectiveLabelW, borderRight:'1px solid #E5E7EB', background:'#fff', zIndex:2 }}>
                  <div style={{ height:56, borderBottom:'1px solid #E5E7EB', background:'#F9FAFB' }} />
                  {Object.entries(grouped).map(([catName, acts]) => (
                    <div key={catName}>
                      <div style={{ padding:'6px 10px', background:'#F9FAFB', borderBottom:'1px solid #E5E7EB', fontSize:'0.65rem', fontWeight:700, color:'#F04E00', textTransform:'uppercase', letterSpacing:'0.4px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                        {catName}
                      </div>
                      {acts.map(a => (
                        <div key={a.id} style={{ height:ROW_H, padding:'0 8px', borderBottom:'1px solid #F3F4F6', display:'flex', alignItems:'center', gap:5 }}>
                          <div style={{ width:7, height:7, borderRadius:2, background:STATUS_COLOR[a.status], flexShrink:0 }} />
                          <span style={{ fontSize:'0.72rem', color:'#374151', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', fontWeight:500 }}>
                            {a.code} · {a.what}
                          </span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>

                {/* Área do gráfico */}
                <div style={{ flexGrow:1, overflowX:'auto', position:'relative' }}>
                  <div style={{ width: Math.max(totalDays * DAY_W, 400), minWidth:'100%', position:'relative' }}>

                    {/* Cabeçalho meses */}
                    <div style={{ height:28, display:'flex', borderBottom:'1px solid #E5E7EB', background:'#F9FAFB', position:'sticky', top:0, zIndex:3 }}>
                      {months.map((m,i) => (
                        <div key={i} style={{ width:m.days*DAY_W, flexShrink:0, borderRight:'1px solid #E5E7EB', fontSize:'0.65rem', fontWeight:700, color:'#6B7280', display:'flex', alignItems:'center', paddingLeft:6, textTransform:'uppercase', letterSpacing:'0.4px' }}>
                          {m.label}
                        </div>
                      ))}
                    </div>

                    {/* Cabeçalho semanas */}
                    <div style={{ height:28, display:'flex', borderBottom:'1px solid #E5E7EB', background:'#F9FAFB', position:'sticky', top:28, zIndex:3 }}>
                      {Array.from({ length: Math.ceil(totalDays/7) }).map((_,wi) => (
                        <div key={wi} style={{ width:7*DAY_W, flexShrink:0, borderRight:'1px solid #E5E7EB', fontSize:'0.6rem', color:'#9CA3AF', display:'flex', alignItems:'center', paddingLeft:5 }}>
                          {fmtDate(addDays(startDate, wi*7))}
                        </div>
                      ))}
                    </div>

                    {/* Barras */}
                    <div style={{ position:'relative' }}>
                      {/* Grade vertical semanal */}
                      {Array.from({ length: Math.ceil(totalDays/7) }).map((_,wi) => (
                        <div key={wi} style={{ position:'absolute', top:0, bottom:0, left:wi*7*DAY_W, width:1, background:'#F3F4F6' }} />
                      ))}

                      {/* Linha de hoje */}
                      {todayOff >= 0 && todayOff <= totalDays && (
                        <div style={{ position:'absolute', top:0, bottom:0, left:todayOff*DAY_W, width:2, background:'#F04E00', opacity:0.8, zIndex:2 }} />
                      )}

                      {Object.entries(grouped).map(([catName, acts]) => (
                        <div key={catName}>
                          <div style={{ height:28, background:'#FAFAFA', borderBottom:'1px solid #E5E7EB' }} />
                          {acts.map(a => {
                            const startOff = Math.max(0, daysBetween(startDate, a.whenStart));
                            const dur      = Math.max(1, daysBetween(a.whenStart, a.whenEnd));
                            const color    = STATUS_COLOR[a.status];
                            const barW     = Math.max(dur*DAY_W - 4, 18);
                            return (
                              <div key={a.id} style={{ height:ROW_H, position:'relative', borderBottom:'1px solid #F3F4F6' }}>
                                <div
                                  role="button"
                                  tabIndex={0}
                                  aria-label={`${a.code} — ${a.what} (${STATUS_LABEL[a.status]})`}
                                  style={{
                                    position:'absolute', left:startOff*DAY_W+2, top:'50%', transform:'translateY(-50%)',
                                    width:barW, height:24, borderRadius:6, background:color,
                                    opacity:0.85, cursor:'pointer', display:'flex', alignItems:'center', paddingLeft:7,
                                    overflow:'hidden', boxShadow:'0 1px 3px rgba(0,0,0,0.12)', transition:'opacity 0.15s',
                                  }}
                                  onMouseEnter={e => { e.currentTarget.style.opacity='1'; setTooltip({ a, x:e.clientX, y:e.clientY }); }}
                                  onMouseLeave={e => { e.currentTarget.style.opacity='0.85'; setTooltip(null); }}
                                  onMouseMove={e  => setTooltip(t => t ? {...t, x:e.clientX, y:e.clientY} : null)}
                                  onKeyDown={e    => e.key==='Enter' && setTooltip(t => t ? null : { a, x:0, y:0 })}
                                >
                                  <span style={{ fontSize:'0.65rem', fontWeight:600, color:'#fff', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
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
        <div role="tooltip" style={{
          position:'fixed', left:Math.min(tooltip.x+12, window.innerWidth-270), top:tooltip.y-10,
          background:'#111827', color:'#fff', borderRadius:10, padding:'12px 16px',
          fontSize:'0.78rem', maxWidth:260, zIndex:9999, boxShadow:'0 4px 20px rgba(0,0,0,0.25)', pointerEvents:'none',
        }}>
          <div style={{ fontWeight:700, marginBottom:4 }}>{tooltip.a.code} — {tooltip.a.what}</div>
          <div style={{ color:'#9CA3AF', marginBottom:4 }}>
            {fmtDate(tooltip.a.whenStart)} → {fmtDate(tooltip.a.whenEnd)}
            {tooltip.a.whenStart && tooltip.a.whenEnd && ` (${daysBetween(tooltip.a.whenStart, tooltip.a.whenEnd)} dias)`}
          </div>
          <div style={{ display:'inline-block', background:`${STATUS_COLOR[tooltip.a.status]}33`, color:STATUS_COLOR[tooltip.a.status], padding:'2px 8px', borderRadius:99, fontSize:'0.7rem', fontWeight:700 }}>
            {STATUS_LABEL[tooltip.a.status]}
          </div>
          {tooltip.a.responsible && <div style={{ color:'#9CA3AF', marginTop:4 }}>👤 {tooltip.a.responsible.name}</div>}
          {tooltip.a.risk && <div style={{ color:'#FCA5A5', marginTop:4, fontSize:'0.72rem' }}>⚠️ {tooltip.a.risk}</div>}
          {tooltip.a.howMuch > 0 && <div style={{ color:'#86EFAC', marginTop:4, fontSize:'0.72rem' }}>💰 R$ {Number(tooltip.a.howMuch).toLocaleString('pt-BR')}</div>}
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
