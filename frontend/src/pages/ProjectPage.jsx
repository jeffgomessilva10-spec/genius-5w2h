// src/pages/ProjectPage.jsx – Página de projeto com linha do tempo
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { projectsAPI, activitiesAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import StatsBar from '../components/ui/StatsBar';
import ActivityCard from '../components/ui/ActivityCard';
import { ArrowLeft, Plus, Filter, LayoutList, BarChart3, Loader2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '../context/AuthContext';

const STATUS_OPTIONS = [
  { value: '',            label: 'Todos'        },
  { value: 'PLANNED',     label: 'Planejado'    },
  { value: 'IN_PROGRESS', label: 'Em andamento' },
  { value: 'DELAYED',     label: 'Atrasado'     },
  { value: 'DONE',        label: 'Finalizado'   },
];

const STATUS_COLORS = {
  PLANNED:     '#6B7280',
  IN_PROGRESS: '#3B82F6',
  DELAYED:     '#EF4444',
  DONE:        '#10B981',
};

export default function ProjectPage() {
  const { id }             = useParams();
  const { isCollaborator } = useAuth();
  const [project,    setProject]    = useState(null);
  const [stats,      setStats]      = useState({ stats: [], total: 0 });
  const [activities, setActivities] = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [view,       setView]       = useState('cards');   // 'cards' | 'timeline'
  const [catFilter,  setCatFilter]  = useState('');
  const [statFilter, setStatFilter] = useState('');

  useEffect(() => { loadProject(); }, [id]);

  async function loadProject() {
    try {
      const [projRes, statsRes, actsRes] = await Promise.all([
        projectsAPI.get(id),
        activitiesAPI.stats(id),
        activitiesAPI.list({}),
      ]);
      setProject(projRes.data.project);
      setStats(statsRes.data);
      setActivities(actsRes.data.activities);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(actId) {
    if (!confirm('Excluir esta atividade?')) return;
    await activitiesAPI.delete(actId);
    setActivities((prev) => prev.filter((a) => a.id !== actId));
  }

  const categories = project?.categories || [];

  const filtered = activities.filter((a) => {
    if (catFilter  && a.categoryId !== catFilter)  return false;
    if (statFilter && a.status     !== statFilter)  return false;
    return true;
  });

  // Linha do tempo: determina janela de datas do projeto
  const allDates = activities.flatMap((a) => [a.whenStart, a.whenEnd].filter(Boolean)).map((d) => new Date(d));
  const timelineStart = allDates.length ? new Date(Math.min(...allDates)) : new Date();
  const timelineEnd   = allDates.length ? new Date(Math.max(...allDates)) : new Date();
  const totalDays     = Math.max(differenceInDays(timelineEnd, timelineStart), 1);

  function barLeft(date)  { return date ? `${Math.max(0, differenceInDays(new Date(date), timelineStart) / totalDays * 100)}%` : '0%'; }
  function barWidth(s, e) {
    if (!s || !e) return '4%';
    const days = Math.max(differenceInDays(new Date(e), new Date(s)), 1);
    return `${Math.max(2, days / totalDays * 100)}%`;
  }

  if (loading) return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Loader2 size={36} style={{ color: 'var(--genius-gold)', animation: 'spin 1s linear infinite' }} />
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto' }}>
        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <Link to="/dashboard" className="btn btn-ghost btn-sm" style={{ marginBottom: 16, display: 'inline-flex' }}>
            <ArrowLeft size={14} /> Voltar
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', letterSpacing: 2, lineHeight: 1 }}>
                {project?.name}
              </h1>
              {project?.description && (
                <p style={{ color: 'var(--genius-text-muted)', marginTop: 4, fontSize: '0.88rem' }}>
                  {project.description}
                </p>
              )}
            </div>
            {isCollaborator && (
              <Link
                to={`/activities/new?projectId=${id}&categoryId=${categories[0]?.id || ''}`}
                className="btn btn-primary"
              >
                <Plus size={15} /> Nova Atividade
              </Link>
            )}
          </div>
        </div>

        {/* Stats */}
        <StatsBar stats={stats.stats} total={stats.total} />

        {/* Controles de visão + filtros */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Toggle de visão */}
          <div style={{ display: 'flex', background: 'var(--genius-surface)', borderRadius: 8, padding: 3, border: '1px solid var(--genius-border)' }}>
            <button onClick={() => setView('cards')} className="btn btn-sm" style={{
              background: view === 'cards' ? 'var(--genius-gold)' : 'transparent',
              color:      view === 'cards' ? 'var(--genius-black)' : 'var(--genius-text-muted)',
              border: 'none',
            }}>
              <LayoutList size={14} /> Cards
            </button>
            <button onClick={() => setView('timeline')} className="btn btn-sm" style={{
              background: view === 'timeline' ? 'var(--genius-gold)' : 'transparent',
              color:      view === 'timeline' ? 'var(--genius-black)' : 'var(--genius-text-muted)',
              border: 'none',
            }}>
              <BarChart3 size={14} /> Linha do Tempo
            </button>
          </div>

          {/* Filtro de categoria */}
          <select className="input" value={catFilter} onChange={(e) => setCatFilter(e.target.value)} style={{ width: 180 }}>
            <option value="">Todas as categorias</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Filtro de status */}
          <select className="input" value={statFilter} onChange={(e) => setStatFilter(e.target.value)} style={{ width: 160 }}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <span style={{ color: 'var(--genius-text-muted)', fontSize: '0.83rem', marginLeft: 'auto' }}>
            {filtered.length} atividade{filtered.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* ── VISÃO: CARDS ─────────────────────────────────── */}
        {view === 'cards' && (
          <>
            {categories.map((cat) => {
              const catActivities = filtered.filter((a) => a.categoryId === cat.id);
              if (catActivities.length === 0 && catFilter) return null;
              return (
                <div key={cat.id} style={{ marginBottom: 32 }}>
                  <div className="flex items-center gap-3" style={{ marginBottom: 14 }}>
                    <div style={{ width: 12, height: 12, borderRadius: '50%', background: cat.color || 'var(--genius-gold)', flexShrink: 0 }} />
                    <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: 1 }}>{cat.name}</h3>
                    <span style={{ color: 'var(--genius-text-muted)', fontSize: '0.8rem' }}>({catActivities.length})</span>
                  </div>

                  {catActivities.length === 0 ? (
                    <p style={{ color: 'var(--genius-text-subtle)', fontSize: '0.85rem', paddingLeft: 24 }}>
                      Nenhuma atividade nesta categoria.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                      {catActivities.map((a) => (
                        <ActivityCard key={a.id} activity={a} onDelete={isCollaborator ? handleDelete : undefined} />
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* ── VISÃO: LINHA DO TEMPO (Gantt simplificado) ──── */}
        {view === 'timeline' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            {/* Cabeçalho de datas */}
            <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--genius-border)', display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--genius-text-muted)' }}>
              <span>{format(timelineStart, 'dd/MM/yyyy')}</span>
              <span style={{ color: 'var(--genius-gold)', fontWeight: 600 }}>LINHA DO TEMPO</span>
              <span>{format(timelineEnd,   'dd/MM/yyyy')}</span>
            </div>

            {filtered.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--genius-text-muted)' }}>
                Nenhuma atividade com datas para exibir na linha do tempo.
              </div>
            ) : (
              filtered.map((act, i) => (
                <div key={act.id} style={{
                  display: 'grid',
                  gridTemplateColumns: '220px 1fr',
                  borderBottom: '1px solid var(--genius-border)',
                  background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.01)',
                }}>
                  {/* Label */}
                  <div style={{
                    padding: '10px 16px',
                    borderRight: '1px solid var(--genius-border)',
                    display: 'flex', flexDirection: 'column', justifyContent: 'center',
                  }}>
                    <div style={{ fontSize: '0.75rem', color: 'var(--genius-text-muted)', fontFamily: "'Bebas Neue', sans-serif", letterSpacing: 0.5 }}>
                      {act.code}
                    </div>
                    <div style={{ fontSize: '0.82rem', color: 'var(--genius-text)', lineHeight: 1.3, marginTop: 2 }}>
                      {act.what.length > 40 ? act.what.slice(0, 40) + '…' : act.what}
                    </div>
                  </div>

                  {/* Barra de tempo */}
                  <div style={{ position: 'relative', height: 56, padding: '0 8px', display: 'flex', alignItems: 'center' }}>
                    <div style={{
                      position: 'absolute',
                      left:  barLeft(act.whenStart),
                      width: barWidth(act.whenStart, act.whenEnd),
                      height: 22,
                      background: STATUS_COLORS[act.status] || 'var(--genius-gold)',
                      borderRadius: 4,
                      opacity: 0.85,
                      transition: 'width 0.3s',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: 8,
                      overflow: 'hidden',
                    }}>
                      <span style={{ fontSize: '0.7rem', color: 'white', fontWeight: 600, whiteSpace: 'nowrap' }}>
                        {act.who}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}

            {/* Legenda */}
            <div style={{ padding: '12px 16px', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {Object.entries(STATUS_COLORS).map(([status, color]) => (
                <div key={status} className="flex items-center gap-2" style={{ fontSize: '0.75rem', color: 'var(--genius-text-muted)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: 2, background: color }} />
                  {status === 'PLANNED' ? 'Planejado' : status === 'IN_PROGRESS' ? 'Em andamento' : status === 'DELAYED' ? 'Atrasado' : 'Finalizado'}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
