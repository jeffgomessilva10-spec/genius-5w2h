import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI, activitiesAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import ActivityCard from '../components/ui/ActivityCard';
import { Plus, FolderOpen, Search, SlidersHorizontal, Loader2, ChevronRight, TrendingUp, AlertTriangle, CheckCircle2, DollarSign } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '',            label: 'Todos os status' },
  { value: 'PLANNED',     label: 'Planejado'       },
  { value: 'IN_PROGRESS', label: 'Em andamento'    },
  { value: 'DELAYED',     label: 'Atrasado'        },
  { value: 'DONE',        label: 'Finalizado'      },
];

const STATUS_COLOR = { PLANNED: '#6B7280', IN_PROGRESS: '#2563EB', DELAYED: '#DC2626', DONE: '#16A34A' };
const STATUS_BG    = { PLANNED: '#F3F4F6', IN_PROGRESS: '#EFF6FF', DELAYED: '#FEF2F2', DONE: '#F0FDF4' };
const STATUS_LABEL = { PLANNED: 'Planejadas', IN_PROGRESS: 'Em andamento', DELAYED: 'Atrasadas', DONE: 'Finalizadas' };

export default function ManagerDashboard() {
  const [projects,     setProjects]     = useState([]);
  const [activities,   setActivities]   = useState([]);
  const [stats,        setStats]        = useState({ stats: [], total: 0 });
  const [loading,      setLoading]      = useState(true);
  const [search,       setSearch]       = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [activeProject, setActiveProject] = useState(null);

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try {
      const { data } = await projectsAPI.list();
      setProjects(data.projects);
      if (data.projects.length > 0) selectProject(data.projects[0].id);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function selectProject(projectId) {
    setActiveProject(projectId);
    setLoading(true);
    try {
      const [actsRes, statsRes] = await Promise.all([
        activitiesAPI.list({ search, status: statusFilter }),
        activitiesAPI.stats(projectId),
      ]);
      setActivities(actsRes.data.activities);
      setStats(statsRes.data);
    } finally { setLoading(false); }
  }

  async function applyFilters(overrideStatus) {
    if (!activeProject) return;
    setLoading(true);
    const st = overrideStatus !== undefined ? overrideStatus : statusFilter;
    try {
      const { data } = await activitiesAPI.list({ search, status: st });
      setActivities(data.activities);
    } finally { setLoading(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta atividade?')) return;
    await activitiesAPI.delete(id);
    setActivities(prev => prev.filter(a => a.id !== id));
  }

  const activeProj = projects.find(p => p.id === activeProject);

  // Cálculos financeiros baseados nas atividades carregadas
  const fmt$ = v => v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const allActs = activities; // usa as atividades já carregadas
  const totalInvestido  = allActs.reduce((s, a) => s + (Number(a.howMuch) || 0), 0);
  const totalAtrasado   = allActs.filter(a => a.status === 'DELAYED').reduce((s, a) => s + (Number(a.howMuch) || 0), 0);
  const totalAndamento  = allActs.filter(a => a.status === 'IN_PROGRESS').reduce((s, a) => s + (Number(a.howMuch) || 0), 0);
  const totalConcluido  = allActs.filter(a => a.status === 'DONE').reduce((s, a) => s + (Number(a.howMuch) || 0), 0);
  const temFinanceiro   = totalInvestido > 0;

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />

      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #E5E7EB',
          padding: '0 36px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <span style={{ fontSize: '0.8rem', color: '#9CA3AF', fontWeight: 500 }}>Dashboard</span>
            {activeProj && (
              <>
                <span style={{ color: '#D1D5DB', margin: '0 6px' }}>›</span>
                <span style={{ fontSize: '0.8rem', color: '#374151', fontWeight: 600 }}>{activeProj.name}</span>
              </>
            )}
          </div>
          <Link to="/activities/new" className="btn btn-primary" style={{ fontSize: '0.82rem', padding: '8px 16px' }}>
            <Plus size={15} /> Nova Atividade
          </Link>
        </div>

        <div style={{ padding: '32px 36px' }}>
          {/* Seletor de projeto */}
          {projects.length > 0 && (
            <div style={{ marginBottom: 28 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
                Projeto ativo
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {projects.map(p => (
                  <button key={p.id} onClick={() => selectProject(p.id)} style={{
                    padding: '7px 16px', borderRadius: 8, fontSize: '0.85rem', fontWeight: 600,
                    cursor: 'pointer', border: '1.5px solid',
                    background: activeProject === p.id ? '#F04E00' : '#fff',
                    borderColor: activeProject === p.id ? '#F04E00' : '#E5E7EB',
                    color: activeProject === p.id ? '#fff' : '#374151',
                    transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 7,
                  }}>
                    <FolderOpen size={14} /> {p.name}
                  </button>
                ))}
                {activeProject && (
                  <Link to={`/projects/${activeProject}`} style={{
                    fontSize: '0.82rem', color: '#F04E00', fontWeight: 600,
                    display: 'flex', alignItems: 'center', gap: 4,
                    textDecoration: 'none', marginLeft: 4,
                  }}>
                    Ver projeto completo <ChevronRight size={14} />
                  </Link>
                )}
              </div>
            </div>
          )}

          {/* Cards de estatísticas */}
          {stats.total > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
              {stats.stats.map(s => {
                const isActive = statusFilter === s.status;
                const valorStatus = activities.filter(a => a.status === s.status).reduce((acc, a) => acc + (Number(a.howMuch) || 0), 0);
                return (
                  <div key={s.status}
                    onClick={() => { const ns = isActive ? '' : s.status; setStatusFilter(ns); applyFilters(ns); }}
                    style={{
                      background: isActive ? STATUS_BG[s.status] : '#fff',
                      borderRadius: 12, padding: '18px 20px', cursor: 'pointer',
                      border: `1.5px solid ${isActive ? STATUS_COLOR[s.status] : '#E5E7EB'}`,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                      borderTop: `3px solid ${STATUS_COLOR[s.status] || '#9CA3AF'}`,
                      transition: 'all 0.15s',
                    }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                      {STATUS_LABEL[s.status] || s.status}
                    </div>
                    <div style={{ fontSize: '2rem', fontWeight: 800, color: STATUS_COLOR[s.status] || '#374151', lineHeight: 1 }}>
                      {s._count?.status || 0}
                    </div>
                    {valorStatus > 0 && (
                      <div style={{ fontSize: '0.78rem', fontWeight: 700, color: STATUS_COLOR[s.status], marginTop: 4 }}>
                        R$ {fmt$(valorStatus)}
                      </div>
                    )}
                    <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 2 }}>
                      {Math.round(((s._count?.status || 0) / stats.total) * 100)}% · {isActive ? 'limpar' : 'filtrar'}
                    </div>
                  </div>
                );
              })}
              <div
                onClick={() => { setStatusFilter(''); applyFilters(''); }}
                style={{
                  background: statusFilter === '' ? '#FFF3EE' : '#fff',
                  borderRadius: 12, padding: '18px 20px', cursor: 'pointer',
                  border: `1.5px solid ${statusFilter === '' ? '#F04E00' : '#E5E7EB'}`,
                  boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                  borderTop: '3px solid #F04E00', transition: 'all 0.15s',
                }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                  Total
                </div>
                <div style={{ fontSize: '2rem', fontWeight: 800, color: '#F04E00', lineHeight: 1 }}>
                  {stats.total}
                </div>
                {totalInvestido > 0 && (
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#F04E00', marginTop: 4 }}>
                    R$ {fmt$(totalInvestido)}
                  </div>
                )}
                <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 2 }}>ver todas</div>
              </div>
            </div>
          )}

          {/* Painel Financeiro */}
          {temFinanceiro && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: '0.75rem', fontWeight: 700, color: '#9CA3AF', letterSpacing: '0.8px', textTransform: 'uppercase', marginBottom: 10 }}>
                Indicadores Financeiros
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {/* Total investido */}
                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #E5E7EB', borderTop: '3px solid #F04E00', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                    <DollarSign size={14} style={{ color: '#F04E00' }} />
                    <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Envolvido no Projeto</span>
                  </div>
                  <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#F04E00' }}>R$ {fmt$(totalInvestido)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 3 }}>total envolvido nas atividades</div>
                </div>

                {/* Em andamento */}
                {totalAndamento > 0 && (
                  <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #E5E7EB', borderTop: '3px solid #2563EB', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <TrendingUp size={14} style={{ color: '#2563EB' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Em Andamento</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#2563EB' }}>R$ {fmt$(totalAndamento)}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 3 }}>{Math.round((totalAndamento / totalInvestido) * 100)}% do orçamento</div>
                  </div>
                )}

                {/* Atrasado (em risco) */}
                {totalAtrasado > 0 && (
                  <div style={{ background: '#FEF2F2', borderRadius: 12, padding: '18px 20px', border: '1.5px solid #FECACA', borderTop: '3px solid #DC2626', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <AlertTriangle size={14} style={{ color: '#DC2626' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Em Risco</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#DC2626' }}>R$ {fmt$(totalAtrasado)}</div>
                    <div style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: 3 }}>{Math.round((totalAtrasado / totalInvestido) * 100)}% do orçamento atrasado</div>
                  </div>
                )}

                {/* Concluído */}
                {totalConcluido > 0 && (
                  <div style={{ background: '#F0FDF4', borderRadius: 12, padding: '18px 20px', border: '1.5px solid #BBF7D0', borderTop: '3px solid #16A34A', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                      <CheckCircle2 size={14} style={{ color: '#16A34A' }} />
                      <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#16A34A', textTransform: 'uppercase', letterSpacing: '0.8px' }}>Concluído</span>
                    </div>
                    <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#16A34A' }}>R$ {fmt$(totalConcluido)}</div>
                    <div style={{ fontSize: '0.72rem', color: '#16A34A', marginTop: 3 }}>{Math.round((totalConcluido / totalInvestido) * 100)}% entregue</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Barra de busca e filtros */}
          <div style={{
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
            padding: '14px 18px', marginBottom: 20,
            display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input
                className="input"
                placeholder="Buscar atividades..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && applyFilters()}
                style={{ paddingLeft: 36, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#111827', height: 38, fontSize: '0.85rem' }}
              />
            </div>
            <select className="input" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ width: 180, border: '1px solid #E5E7EB', background: '#F9FAFB', color: '#374151', height: 38, fontSize: '0.85rem' }}>
              {STATUS_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button className="btn btn-ghost" onClick={applyFilters} style={{ height: 38, fontSize: '0.82rem' }}>
              <SlidersHorizontal size={14} /> Filtrar
            </button>
          </div>

          {/* Lista de atividades */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={28} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : activities.length === 0 ? (
            <div style={{
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14,
              textAlign: 'center', padding: '60px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
            }}>
              <FolderOpen size={36} style={{ color: '#D1D5DB', marginBottom: 12 }} />
              <p style={{ color: '#9CA3AF', fontWeight: 500, marginBottom: 16 }}>Nenhuma atividade encontrada.</p>
              <Link to="/activities/new" className="btn btn-primary" style={{ display: 'inline-flex', fontSize: '0.85rem' }}>
                <Plus size={15} /> Criar primeira atividade
              </Link>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 14 }}>
              {activities.map(a => <ActivityCard key={a.id} activity={a} onDelete={handleDelete} />)}
            </div>
          )}
        </div>
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
