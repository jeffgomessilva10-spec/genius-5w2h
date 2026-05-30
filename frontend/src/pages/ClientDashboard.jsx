// src/pages/ClientDashboard.jsx
import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI, activitiesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import StatsBar from '../components/ui/StatsBar';
import ActivityCard from '../components/ui/ActivityCard';
import { FolderOpen, Loader2, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientDashboard() {
  const { user } = useAuth();
  const [projects,   setProjects]   = useState([]);
  const [selected,   setSelected]   = useState(null);
  const [activities, setActivities] = useState([]);
  const [stats,      setStats]      = useState({ stats: [], total: 0 });
  const [loading,    setLoading]    = useState(true);

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try {
      const { data } = await projectsAPI.list();
      setProjects(data.projects);
      if (data.projects[0]) await selectProject(data.projects[0]);
    } finally {
      setLoading(false);
    }
  }

  async function selectProject(project) {
    setSelected(project);
    setLoading(true);
    try {
      const [actsRes, statsRes] = await Promise.all([
        activitiesAPI.list({}),
        activitiesAPI.stats(project.id),
      ]);
      setActivities(actsRes.data.activities);
      setStats(statsRes.data);
    } finally {
      setLoading(false);
    }
  }

  const delayed = activities.filter((a) => a.status === 'DELAYED');
  const done    = activities.filter((a) => a.status === 'DONE');

  function fmtDate(d) {
    if (!d) return '—';
    try { return format(new Date(d), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }); } catch { return '—'; }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />

      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto' }}>
        {/* Saudação */}
        <div style={{ marginBottom: 32 }}>
          <p style={{ color: 'var(--genius-text-muted)', fontSize: '0.9rem' }}>Olá,</p>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: 2, lineHeight: 1.1 }}>
            {user?.name?.split(' ')[0].toUpperCase()} 👋
          </h1>
          <p style={{ color: 'var(--genius-text-muted)', marginTop: 4, fontSize: '0.9rem' }}>
            Acompanhe o andamento dos seus projetos em tempo real
          </p>
        </div>

        {/* Seleção de projeto */}
        {projects.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
            {projects.map((p) => (
              <button
                key={p.id}
                onClick={() => selectProject(p)}
                className="btn"
                style={{
                  background: selected?.id === p.id ? 'var(--genius-gold)' : 'var(--genius-surface)',
                  color: selected?.id === p.id ? 'var(--genius-black)' : 'var(--genius-text-muted)',
                  border: `1px solid ${selected?.id === p.id ? 'var(--genius-gold)' : 'var(--genius-border)'}`,
                  fontWeight: selected?.id === p.id ? 700 : 400,
                }}
              >
                <FolderOpen size={14} />
                {p.name}
              </button>
            ))}
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={32} style={{ color: 'var(--genius-gold)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : !selected ? (
          <div className="card" style={{ textAlign: 'center', padding: 60 }}>
            <FolderOpen size={40} style={{ color: 'var(--genius-text-subtle)', marginBottom: 12 }} />
            <p style={{ color: 'var(--genius-text-muted)' }}>Nenhum projeto vinculado à sua conta.</p>
          </div>
        ) : (
          <>
            {/* Info do projeto */}
            <div className="card" style={{ marginBottom: 28, borderLeft: '3px solid var(--genius-gold)', padding: '20px 24px' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: 'var(--genius-gold)', letterSpacing: 1 }}>
                    {selected.name}
                  </h2>
                  {selected.description && (
                    <p style={{ color: 'var(--genius-text-muted)', fontSize: '0.88rem', marginTop: 4 }}>
                      {selected.description}
                    </p>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--genius-text-muted)' }}>
                  {selected.startDate && <div>Início: {fmtDate(selected.startDate)}</div>}
                  {selected.endDate   && <div>Fim: {fmtDate(selected.endDate)}</div>}
                </div>
              </div>
            </div>

            {/* Stats */}
            <StatsBar stats={stats.stats} total={stats.total} />

            {/* Alertas de atividades atrasadas */}
            {delayed.length > 0 && (
              <div style={{
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 10, padding: '14px 18px', marginBottom: 24,
                display: 'flex', alignItems: 'center', gap: 12,
              }}>
                <AlertTriangle size={18} style={{ color: '#EF4444', flexShrink: 0 }} />
                <div>
                  <div style={{ color: '#F87171', fontWeight: 600, fontSize: '0.9rem' }}>
                    {delayed.length} atividade{delayed.length > 1 ? 's' : ''} em atraso
                  </div>
                  <div style={{ color: '#EF4444', fontSize: '0.8rem', marginTop: 2 }}>
                    {delayed.map((d) => d.what).join(' · ')}
                  </div>
                </div>
              </div>
            )}

            {/* Progresso geral */}
            {stats.total > 0 && (
              <div className="card" style={{ marginBottom: 28, padding: '18px 24px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Progresso geral do projeto</span>
                  <span style={{ color: 'var(--genius-gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.4rem' }}>
                    {Math.round(((stats.stats.find(s => s.status === 'DONE')?._count?.status || 0) / stats.total) * 100)}%
                  </span>
                </div>
                <div className="progress-bar" style={{ height: 10 }}>
                  <div
                    className="progress-bar-fill"
                    style={{ width: `${Math.round(((stats.stats.find(s => s.status === 'DONE')?._count?.status || 0) / stats.total) * 100)}%` }}
                  />
                </div>
                <div className="flex items-center gap-2" style={{ marginTop: 8, color: '#10B981', fontSize: '0.82rem' }}>
                  <CheckCircle2 size={13} />
                  {done.length} de {stats.total} atividades concluídas
                </div>
              </div>
            )}

            {/* Atividades */}
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.3rem', letterSpacing: 1, marginBottom: 16 }}>
              ATIVIDADES DO PROJETO
            </h3>

            {activities.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--genius-text-muted)' }}>
                Nenhuma atividade cadastrada ainda.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: 16 }}>
                {activities.map((a) => (
                  <ActivityCard key={a.id} activity={a} />
                ))}
              </div>
            )}
          </>
        )}
      </main>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
