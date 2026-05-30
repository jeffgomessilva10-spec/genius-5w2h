// src/pages/ManagerDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI, activitiesAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import StatsBar from '../components/ui/StatsBar';
import ActivityCard from '../components/ui/ActivityCard';
import { Plus, FolderOpen, Search, Filter, Loader2 } from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '',            label: 'Todos os status' },
  { value: 'PLANNED',     label: 'Planejado'       },
  { value: 'IN_PROGRESS', label: 'Em andamento'    },
  { value: 'DELAYED',     label: 'Atrasado'        },
  { value: 'DONE',        label: 'Finalizado'      },
];

export default function ManagerDashboard() {
  const [projects,    setProjects]    = useState([]);
  const [activities,  setActivities]  = useState([]);
  const [stats,       setStats]       = useState({ stats: [], total: 0 });
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [statusFilter,setStatusFilter]= useState('');
  const [activeProject, setActiveProject] = useState(null);

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try {
      const { data } = await projectsAPI.list();
      setProjects(data.projects);
      if (data.projects.length > 0) selectProject(data.projects[0].id);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
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
    } finally {
      setLoading(false);
    }
  }

  async function applyFilters() {
    if (!activeProject) return;
    setLoading(true);
    try {
      const { data } = await activitiesAPI.list({ search, status: statusFilter });
      setActivities(data.activities);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir esta atividade?')) return;
    await activitiesAPI.delete(id);
    setActivities((prev) => prev.filter((a) => a.id !== id));
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto' }}>
        {/* Header */}
        <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: 2, lineHeight: 1 }}>
              PAINEL DO <span style={{ color: 'var(--genius-gold)' }}>GESTOR</span>
            </h1>
            <p style={{ color: 'var(--genius-text-muted)', marginTop: 4, fontSize: '0.9rem' }}>
              Gerencie projetos e atividades do plano 5W2H
            </p>
          </div>
          <Link to="/activities/new" className="btn btn-primary">
            <Plus size={16} /> Nova Atividade
          </Link>
        </div>

        {/* Projetos – abas */}
        {projects.length > 0 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProject(p.id)}
                className="btn"
                style={{
                  background: activeProject === p.id ? 'var(--genius-gold)' : 'var(--genius-surface)',
                  color: activeProject === p.id ? 'var(--genius-black)' : 'var(--genius-text-muted)',
                  border: `1px solid ${activeProject === p.id ? 'var(--genius-gold)' : 'var(--genius-border)'}`,
                  fontWeight: activeProject === p.id ? 700 : 400,
                }}
              >
                <FolderOpen size={14} />
                {p.name}
              </button>
            ))}
            <Link to={`/projects/${activeProject}`} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>
              Ver projeto completo →
            </Link>
          </div>
        )}

        {/* Stats */}
        <StatsBar stats={stats.stats} total={stats.total} />

        {/* Filtros */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
            <Search size={15} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--genius-text-muted)' }} />
            <input
              className="input"
              placeholder="Buscar por descrição, motivo ou responsável..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && applyFilters()}
              style={{ paddingLeft: 36 }}
            />
          </div>
          <select
            className="input"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: 180 }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button className="btn btn-ghost" onClick={applyFilters}>
            <Filter size={14} /> Filtrar
          </button>
        </div>

        {/* Lista de atividades */}
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={32} style={{ color: 'var(--genius-gold)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : activities.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FolderOpen size={40} style={{ color: 'var(--genius-text-subtle)', marginBottom: 12 }} />
            <p style={{ color: 'var(--genius-text-muted)' }}>Nenhuma atividade encontrada.</p>
            <Link to="/activities/new" className="btn btn-primary" style={{ marginTop: 16, display: 'inline-flex' }}>
              <Plus size={16} /> Criar primeira atividade
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
            {activities.map((a) => (
              <ActivityCard key={a.id} activity={a} onDelete={handleDelete} />
            ))}
          </div>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
