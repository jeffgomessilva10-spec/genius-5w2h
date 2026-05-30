import { useState, useEffect } from 'react';
import { projectsAPI, activitiesAPI } from '../services/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/layout/Sidebar';
import { FolderOpen, Loader2, AlertTriangle, CheckCircle2, Clock, TrendingUp, Zap, ShieldAlert } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const STATUS_LABEL = { PLANNED: 'Planejado', IN_PROGRESS: 'Em andamento', DELAYED: 'Atrasado', DONE: 'Finalizado' };
const STATUS_COLOR = { PLANNED: '#60A5FA', IN_PROGRESS: '#F5C500', DELAYED: '#EF4444', DONE: '#10B981' };

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

  const today = new Date();
  const fmt$ = v => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const totalInvestido = activities.reduce((s, a) => s + (Number(a.howMuch) || 0), 0);
  const totalAtrasado  = activities.filter(a => a.status === 'DELAYED').reduce((s, a) => s + (Number(a.howMuch) || 0), 0);
  const delayed = activities.filter(a => a.status === 'DELAYED');
  const done    = activities.filter(a => a.status === 'DONE');
  const inProgress = activities.filter(a => a.status === 'IN_PROGRESS');

  // Atividades próximas do prazo (até 7 dias) e não finalizadas
  const nearDeadline = activities.filter(a => {
    if (a.status === 'DONE' || !a.whenEnd) return false;
    const daysLeft = differenceInDays(new Date(a.whenEnd), today);
    return daysLeft >= 0 && daysLeft <= 7;
  });

  const doneCount = done.length;
  const total = stats.total || 0;
  const progress = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  function fmtDate(d) {
    if (!d) return '—';
    try { return format(new Date(d), "dd/MM/yyyy", { locale: ptBR }); } catch { return '—'; }
  }

  function daysLeft(d) {
    if (!d) return null;
    const diff = differenceInDays(new Date(d), today);
    return diff;
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto' }}>

        <div style={{ marginBottom: 32 }}>
          <p style={{ color: 'var(--genius-text-muted)', fontSize: '0.9rem' }}>Olá,</p>
          <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: 2, lineHeight: 1.1 }}>
            {user?.name?.split(' ')[0].toUpperCase()} 👋
          </h1>
          <p style={{ color: 'var(--genius-text-muted)', marginTop: 4, fontSize: '0.9rem' }}>
            Acompanhe o andamento do seu projeto em tempo real
          </p>
        </div>

        {projects.length > 1 && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
            {projects.map((p) => (
              <button key={p.id} onClick={() => selectProject(p)} className="btn" style={{
                background: selected?.id === p.id ? 'var(--genius-gold)' : 'var(--genius-surface)',
                color: selected?.id === p.id ? 'var(--genius-black)' : 'var(--genius-text-muted)',
                border: `1px solid ${selected?.id === p.id ? 'var(--genius-gold)' : 'var(--genius-border)'}`,
                fontWeight: selected?.id === p.id ? 700 : 400,
              }}>
                <FolderOpen size={14} /> {p.name}
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
            <div className="card" style={{ marginBottom: 24, borderLeft: '3px solid var(--genius-gold)', padding: '20px 24px' }}>
              <div className="flex items-center justify-between">
                <div>
                  <h2 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.5rem', color: 'var(--genius-gold)', letterSpacing: 1 }}>
                    {selected.name}
                  </h2>
                  {selected.description && (
                    <p style={{ color: 'var(--genius-text-muted)', fontSize: '0.88rem', marginTop: 4 }}>{selected.description}</p>
                  )}
                </div>
                <div style={{ textAlign: 'right', fontSize: '0.82rem', color: 'var(--genius-text-muted)' }}>
                  {selected.startDate && <div>Início: {fmtDate(selected.startDate)}</div>}
                  {selected.endDate && <div>Término: {fmtDate(selected.endDate)}</div>}
                  {selected.endDate && (
                    <div style={{ marginTop: 4, color: daysLeft(selected.endDate) < 14 ? '#EF4444' : 'var(--genius-text-muted)' }}>
                      {daysLeft(selected.endDate) >= 0
                        ? `${daysLeft(selected.endDate)} dias restantes`
                        : `${Math.abs(daysLeft(selected.endDate))} dias em atraso`}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cards de indicadores */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 16, marginBottom: 24 }}>
              <div className="card" style={{ padding: '18px 20px', borderTop: '3px solid #10B981' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <CheckCircle2 size={16} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--genius-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Concluídas</span>
                </div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#10B981' }}>{doneCount}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--genius-text-muted)' }}>{progress}% do total</div>
              </div>

              <div className="card" style={{ padding: '18px 20px', borderTop: '3px solid #F5C500' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <TrendingUp size={16} style={{ color: '#F5C500' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--genius-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Em andamento</span>
                </div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#F5C500' }}>{inProgress.length}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--genius-text-muted)' }}>atividades ativas</div>
              </div>

              <div className="card" style={{ padding: '18px 20px', borderTop: '3px solid #EF4444' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <AlertTriangle size={16} style={{ color: '#EF4444' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--genius-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Atrasadas</span>
                </div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#EF4444' }}>{delayed.length}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--genius-text-muted)' }}>atividades</div>
              </div>

              <div className="card" style={{ padding: '18px 20px', borderTop: '3px solid #F97316' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                  <Clock size={16} style={{ color: '#F97316' }} />
                  <span style={{ fontSize: '0.8rem', color: 'var(--genius-text-muted)', textTransform: 'uppercase', letterSpacing: 1 }}>Prazo próximo</span>
                </div>
                <div style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2rem', color: '#F97316' }}>{nearDeadline.length}</div>
                <div style={{ fontSize: '0.78rem', color: 'var(--genius-text-muted)' }}>vencem em 7 dias</div>
              </div>
            </div>

            {/* Indicadores Financeiros */}
            {totalInvestido > 0 && (
              <div style={{ display: 'grid', gridTemplateColumns: totalAtrasado > 0 ? '1fr 1fr' : '1fr', gap: 14, marginBottom: 24 }}>
                <div style={{ background: '#fff', borderRadius: 12, padding: '18px 20px', border: '1px solid #E5E7EB', borderTop: '3px solid #F04E00', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                    💰 Envolvido no Projeto
                  </div>
                  <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#F04E00' }}>R$ {fmt$(totalInvestido)}</div>
                  <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 3 }}>total envolvido nas atividades</div>
                </div>
                {totalAtrasado > 0 && (
                  <div style={{ background: '#FEF2F2', borderRadius: 12, padding: '18px 20px', border: '1.5px solid #FECACA', borderTop: '3px solid #DC2626', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#DC2626', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>
                      ⚠️ Valor em Risco
                    </div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#DC2626' }}>R$ {fmt$(totalAtrasado)}</div>
                    <div style={{ fontSize: '0.72rem', color: '#DC2626', marginTop: 3 }}>{Math.round((totalAtrasado / totalInvestido) * 100)}% do orçamento está atrasado</div>
                  </div>
                )}
              </div>
            )}

            {/* Barra de progresso */}
            {total > 0 && (
              <div className="card" style={{ marginBottom: 24, padding: '18px 24px' }}>
                <div className="flex items-center justify-between" style={{ marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>Progresso geral do projeto</span>
                  <span style={{ color: 'var(--genius-gold)', fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.6rem' }}>{progress}%</span>
                </div>
                <div className="progress-bar" style={{ height: 12, borderRadius: 6 }}>
                  <div className="progress-bar-fill" style={{ width: `${progress}%`, borderRadius: 6 }} />
                </div>
                <div style={{ marginTop: 8, fontSize: '0.82rem', color: 'var(--genius-text-muted)' }}>
                  {doneCount} de {total} atividades concluídas
                </div>
              </div>
            )}

            {/* Alertas de risco */}
            {(delayed.length > 0 || nearDeadline.length > 0) && (
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: 1, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <ShieldAlert size={18} style={{ color: '#EF4444' }} /> RISCOS E IMPACTOS
                </h3>

                {delayed.map(a => (
                  <div key={a.id} style={{
                    background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.25)',
                    borderLeft: '4px solid #EF4444', borderRadius: 10, padding: '14px 18px', marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <AlertTriangle size={16} style={{ color: '#EF4444', flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#F87171' }}>
                          Atrasada: {a.what}
                        </div>
                        {a.risk && (
                          <div style={{ color: '#FCA5A5', fontSize: '0.82rem', marginTop: 4 }}>
                            <strong>Risco/Impacto:</strong> {a.risk}
                          </div>
                        )}
                        <div style={{ color: 'var(--genius-text-muted)', fontSize: '0.78rem', marginTop: 4 }}>
                          Prazo era: {fmtDate(a.whenEnd)} · Responsável: {a.responsible?.name || a.who}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                {nearDeadline.map(a => (
                  <div key={a.id} style={{
                    background: 'rgba(249,115,22,0.06)', border: '1px solid rgba(249,115,22,0.25)',
                    borderLeft: '4px solid #F97316', borderRadius: 10, padding: '14px 18px', marginBottom: 10,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                      <Zap size={16} style={{ color: '#F97316', flexShrink: 0, marginTop: 2 }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#FB923C' }}>
                          Prazo próximo: {a.what}
                        </div>
                        <div style={{ color: '#FED7AA', fontSize: '0.82rem', marginTop: 4 }}>
                          Vence em <strong>{daysLeft(a.whenEnd)} dia{daysLeft(a.whenEnd) !== 1 ? 's' : ''}</strong> ({fmtDate(a.whenEnd)})
                        </div>
                        {a.risk && (
                          <div style={{ color: '#FED7AA', fontSize: '0.82rem', marginTop: 2 }}>
                            <strong>Risco/Impacto:</strong> {a.risk}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Resumo por status */}
            <h3 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '1.2rem', letterSpacing: 1, marginBottom: 12 }}>
              ATIVIDADES DO PROJETO
            </h3>

            {activities.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: 40, color: 'var(--genius-text-muted)' }}>
                Nenhuma atividade cadastrada ainda.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {activities.map(a => (
                  <div key={a.id} className="card" style={{ padding: '14px 18px', borderLeft: `3px solid ${STATUS_COLOR[a.status] || '#888'}` }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: '0.9rem' }}>{a.what}</div>
                        <div style={{ color: 'var(--genius-text-muted)', fontSize: '0.8rem', marginTop: 2 }}>
                          {a.why && <span>Por quê: {a.why} · </span>}
                          Prazo: {fmtDate(a.whenEnd)}
                        </div>
                      </div>
                      <span style={{
                        fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                        background: `${STATUS_COLOR[a.status]}22`, color: STATUS_COLOR[a.status],
                        border: `1px solid ${STATUS_COLOR[a.status]}44`, whiteSpace: 'nowrap',
                      }}>
                        {STATUS_LABEL[a.status]}
                      </span>
                    </div>
                  </div>
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
