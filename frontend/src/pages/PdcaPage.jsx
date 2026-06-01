import { useState, useEffect, useRef } from 'react';
import { pdcaAPI, projectsAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { Plus, Loader2, Trash2, BookOpen, Lightbulb, RefreshCw, CheckCircle2, GripVertical } from 'lucide-react';

const PDCA_CONFIG = {
  PLAN:  { label: '📋 Planejar', desc: 'Definir objetivos e processos',  color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  DO:    { label: '⚡ Executar', desc: 'Implementar o plano',            color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  CHECK: { label: '🔍 Verificar', desc: 'Monitorar e medir resultados',  color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  ACT:   { label: '🚀 Agir',     desc: 'Padronizar ou corrigir',         color: '#F04E00', bg: '#FFF3EE', border: '#FECACA' },
  DONE:  { label: '✅ Concluído', desc: 'Ação concluída com ganho',       color: '#16A34A', bg: '#F0FDF4', border: '#BBF7D0' },
};

const LESSON_CATEGORIES = ['Geral', 'Técnico', 'Processo', 'Equipe', 'Cliente', 'Financeiro', 'Prazo'];

export default function PdcaPage() {
  const { isCollaborator, isAdmin, user } = useAuth();
  const isMobile = useIsMobile();
  const [reviews,    setReviews]    = useState([]);
  const [lessons,    setLessons]    = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [projFilter, setProjFilter] = useState('');
  const [activeTab,  setActiveTab]  = useState('pdca');
  const [showForm,   setShowForm]   = useState(false);
  const [showLesson, setShowLesson] = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [dragOver,   setDragOver]   = useState(null); // phase being dragged over
  const [completing, setCompleting] = useState(null); // reviewId being completed

  const [reviewForm, setReviewForm] = useState({ projectId: '', phase: 'PLAN', title: '', description: '', actionItems: '' });
  const [lessonForm, setLessonForm] = useState({ projectId: '', title: '', description: '', category: 'Geral', impact: '', recommendation: '' });
  const [gainForm,   setGainForm]   = useState({ operationalGain: '' });

  useEffect(() => { loadAll(); }, [projFilter]);

  async function loadAll() {
    setLoading(true);
    try {
      const [pdcaRes, projRes] = await Promise.all([
        pdcaAPI.list(projFilter ? { projectId: projFilter } : {}),
        projectsAPI.list(),
      ]);
      setReviews(pdcaRes.data.reviews);
      setLessons(pdcaRes.data.lessons);
      setProjects(projRes.data.projects);
      const firstId = projRes.data.projects[0]?.id || '';
      if (!reviewForm.projectId && firstId) setReviewForm(f => ({ ...f, projectId: firstId }));
      if (!lessonForm.projectId && firstId) setLessonForm(f => ({ ...f, projectId: firstId }));
    } finally { setLoading(false); }
  }

  async function handleCreateReview(e) {
    e.preventDefault(); setSaving(true);
    try {
      await pdcaAPI.createReview(reviewForm);
      setShowForm(false);
      setReviewForm(f => ({ ...f, title: '', description: '', actionItems: '' }));
      loadAll();
    } finally { setSaving(false); }
  }

  async function handleCreateLesson(e) {
    e.preventDefault(); setSaving(true);
    try {
      await pdcaAPI.createLesson(lessonForm);
      setShowLesson(false);
      setLessonForm(f => ({ ...f, title: '', description: '', impact: '', recommendation: '' }));
      loadAll();
    } finally { setSaving(false); }
  }

  // ── Drag & Drop ──────────────────────────────────────
  function onDragStart(e, reviewId) {
    e.dataTransfer.setData('reviewId', reviewId);
    e.dataTransfer.effectAllowed = 'move';
  }

  function onDragOver(e, phase) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOver(phase);
  }

  async function onDrop(e, targetPhase) {
    e.preventDefault();
    setDragOver(null);
    const reviewId = e.dataTransfer.getData('reviewId');
    if (!reviewId) return;

    const review = reviews.find(r => r.id === reviewId);
    if (!review || review.phase === targetPhase) return;

    // Se for mover para DONE, pede o ganho operacional
    if (targetPhase === 'DONE') {
      setCompleting(reviewId);
      return;
    }

    // Atualiza otimisticamente
    setReviews(prev => prev.map(r => r.id === reviewId ? { ...r, phase: targetPhase } : r));
    try {
      await pdcaAPI.moveReview(reviewId, { phase: targetPhase });
    } catch { loadAll(); }
  }

  async function confirmComplete() {
    if (!completing) return;
    setReviews(prev => prev.map(r => r.id === completing ? { ...r, phase: 'DONE', completedAt: new Date().toISOString(), operationalGain: gainForm.operationalGain } : r));
    try {
      await pdcaAPI.moveReview(completing, { phase: 'DONE', operationalGain: gainForm.operationalGain });
    } catch { loadAll(); }
    setCompleting(null);
    setGainForm({ operationalGain: '' });
  }

  async function handleDeleteReview(id) {
    if (!confirm('Excluir este registro?')) return;
    await pdcaAPI.deleteReview(id);
    setReviews(prev => prev.filter(r => r.id !== id));
  }

  const grouped = Object.keys(PDCA_CONFIG).reduce((acc, phase) => {
    acc[phase] = reviews.filter(r => r.phase === phase);
    return acc;
  }, {});

  const TABS = [
    { id: 'pdca', label: 'Ciclo PDCA', icon: <RefreshCw size={14} /> },
    { id: 'lessons', label: 'Lições Aprendidas', icon: <Lightbulb size={14} /> },
  ];

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: isMobile ? '12px 16px' : '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, flexWrap: 'wrap', gap: 8, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>PDCA e Lições Aprendidas</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Arraste os cards entre as colunas para mover etapas</p>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <select value={projFilter} onChange={e => setProjFilter(e.target.value)} style={{ height: 36, padding: '0 12px', border: '1px solid #E5E7EB', borderRadius: 8, fontSize: '0.83rem', background: '#fff' }}>
              <option value="">Todos os projetos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            {isCollaborator && activeTab === 'pdca' && (
              <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ fontSize: '0.85rem' }}>
                <Plus size={15} /> Novo Registro
              </button>
            )}
            {isCollaborator && activeTab === 'lessons' && (
              <button className="btn btn-primary" onClick={() => setShowLesson(!showLesson)} style={{ fontSize: '0.85rem' }}>
                <Plus size={15} /> Nova Lição
              </button>
            )}
          </div>
        </header>

        <div style={{ padding: isMobile ? 12 : '24px 32px' }}>
          {/* Tabs */}
          <nav style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid #E5E7EB' }}>
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.85rem',
                fontWeight: activeTab === tab.id ? 700 : 500,
                color: activeTab === tab.id ? '#F04E00' : '#6B7280',
                borderBottom: activeTab === tab.id ? '2px solid #F04E00' : '2px solid transparent',
                marginBottom: '-2px', transition: 'all 0.15s',
              }}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </nav>

          {/* ── PDCA Kanban ── */}
          {activeTab === 'pdca' && (
            <>
              {/* Formulário novo registro */}
              {showForm && (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  <form onSubmit={handleCreateReview} style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Projeto *</label>
                        <select className="input" required value={reviewForm.projectId} onChange={e => setReviewForm({ ...reviewForm, projectId: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }}>
                          <option value="">Selecione o projeto</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Fase inicial *</label>
                        <select className="input" value={reviewForm.phase} onChange={e => setReviewForm({ ...reviewForm, phase: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }}>
                          {Object.entries(PDCA_CONFIG).filter(([k]) => k !== 'DONE').map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <input className="input" placeholder="Título *" required value={reviewForm.title} onChange={e => setReviewForm({ ...reviewForm, title: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                    <textarea className="input" rows={2} placeholder="Descrição detalhada *" required value={reviewForm.description} onChange={e => setReviewForm({ ...reviewForm, description: e.target.value })} style={{ border: '1.5px solid #E5E7EB', resize: 'vertical' }} />
                    <textarea className="input" rows={2} placeholder="Itens de ação (opcional)" value={reviewForm.actionItems} onChange={e => setReviewForm({ ...reviewForm, actionItems: e.target.value })} style={{ border: '1.5px solid #E5E7EB', resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
                      <button type="submit" disabled={saving} className="btn btn-primary">
                        {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Salvar'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Kanban Board */}
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : `repeat(${Object.keys(PDCA_CONFIG).length}, 1fr)`, gap: 12, minWidth: 0 }}>
                {Object.entries(PDCA_CONFIG).map(([phase, cfg]) => (
                  <div
                    key={phase}
                    onDragOver={e => onDragOver(e, phase)}
                    onDragLeave={() => setDragOver(null)}
                    onDrop={e => onDrop(e, phase)}
                    style={{
                      background: dragOver === phase ? cfg.bg : '#fff',
                      border: `1.5px solid ${dragOver === phase ? cfg.color : '#E5E7EB'}`,
                      borderRadius: 14, overflow: 'hidden', minHeight: 200,
                      transition: 'border-color 0.15s, background 0.15s',
                    }}
                  >
                    {/* Header da coluna */}
                    <div style={{ padding: '12px 14px', background: cfg.bg, borderBottom: `2px solid ${cfg.color}` }}>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: cfg.color }}>{cfg.label}</div>
                      <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 2 }}>{cfg.desc}</div>
                      <div style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, marginTop: 4 }}>
                        {grouped[phase].length} item{grouped[phase].length !== 1 ? 's' : ''}
                      </div>
                    </div>

                    {/* Cards */}
                    <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
                      {grouped[phase].length === 0 ? (
                        <div style={{ color: '#D1D5DB', fontSize: '0.78rem', textAlign: 'center', padding: '20px 8px', border: '2px dashed #E5E7EB', borderRadius: 8 }}>
                          Arraste um card aqui
                        </div>
                      ) : (
                        grouped[phase].map(r => (
                          <div
                            key={r.id}
                            draggable={isCollaborator && phase !== 'DONE'}
                            onDragStart={e => onDragStart(e, r.id)}
                            style={{
                              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '10px 12px',
                              cursor: isCollaborator && phase !== 'DONE' ? 'grab' : 'default',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
                              borderLeft: `3px solid ${cfg.color}`,
                              userSelect: 'none',
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                              {isCollaborator && phase !== 'DONE' && (
                                <GripVertical size={14} style={{ color: '#D1D5DB', flexShrink: 0, marginTop: 2 }} />
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ fontWeight: 700, fontSize: '0.83rem', color: '#111827', marginBottom: 4 }}>{r.title}</div>
                                <p style={{ fontSize: '0.75rem', color: '#6B7280', lineHeight: 1.5, marginBottom: 4 }}>{r.description}</p>
                                {r.actionItems && <div style={{ fontSize: '0.72rem', color: cfg.color, fontWeight: 600 }}>→ {r.actionItems}</div>}
                                {phase === 'DONE' && r.completedAt && (
                                  <div style={{ marginTop: 6, padding: '6px 8px', background: '#F0FDF4', borderRadius: 6, border: '1px solid #BBF7D0' }}>
                                    <div style={{ fontSize: '0.68rem', color: '#16A34A', fontWeight: 700 }}>
                                      ✅ Concluído em {new Date(r.completedAt).toLocaleDateString('pt-BR')}
                                    </div>
                                    {r.operationalGain && <div style={{ fontSize: '0.72rem', color: '#374151', marginTop: 3 }}>💡 {r.operationalGain}</div>}
                                  </div>
                                )}
                                <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 6 }}>{r.createdBy?.name}</div>
                              </div>
                              {(r.createdBy?.id === user?.id || isAdmin) && (
                                <button onClick={() => handleDeleteReview(r.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 2, flexShrink: 0 }}
                                  onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                                  onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}>
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Lições Aprendidas ── */}
          {activeTab === 'lessons' && (
            <>
              {showLesson && (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                  <form onSubmit={handleCreateLesson} style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Projeto *</label>
                        <select className="input" required value={lessonForm.projectId} onChange={e => setLessonForm({ ...lessonForm, projectId: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }}>
                          <option value="">Selecione o projeto</option>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Categoria</label>
                        <select className="input" value={lessonForm.category} onChange={e => setLessonForm({ ...lessonForm, category: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }}>
                          {LESSON_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                      </div>
                    </div>
                    <input className="input" placeholder="Título da lição *" required value={lessonForm.title} onChange={e => setLessonForm({ ...lessonForm, title: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                    <textarea className="input" rows={2} placeholder="O que aconteceu? *" required value={lessonForm.description} onChange={e => setLessonForm({ ...lessonForm, description: e.target.value })} style={{ border: '1.5px solid #E5E7EB', resize: 'vertical' }} />
                    <textarea className="input" rows={2} placeholder="Impacto causado" value={lessonForm.impact} onChange={e => setLessonForm({ ...lessonForm, impact: e.target.value })} style={{ border: '1.5px solid #E5E7EB', resize: 'vertical' }} />
                    <textarea className="input" rows={2} placeholder="Recomendação para o futuro" value={lessonForm.recommendation} onChange={e => setLessonForm({ ...lessonForm, recommendation: e.target.value })} style={{ border: '1.5px solid #E5E7EB', resize: 'vertical' }} />
                    <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                      <button type="button" onClick={() => setShowLesson(false)} className="btn btn-ghost">Cancelar</button>
                      <button type="submit" disabled={saving} className="btn btn-primary">
                        {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Salvar'}
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {loading ? (
                <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}><Loader2 size={28} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} /></div>
              ) : lessons.length === 0 ? (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 60, textAlign: 'center' }}>
                  <BookOpen size={36} style={{ color: '#D1D5DB', marginBottom: 12 }} />
                  <p style={{ color: '#9CA3AF' }}>Nenhuma lição registrada ainda.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px,1fr))', gap: 14 }}>
                  {lessons.map(l => (
                    <div key={l.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: '4px solid #F04E00' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#FFF3EE', color: '#F04E00', border: '1px solid #FECACA' }}>{l.category}</span>
                        {(l.createdBy?.id === user?.id || isAdmin) && (
                          <button onClick={async () => { await pdcaAPI.deleteLesson(l.id); loadAll(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 2 }} onMouseEnter={e => e.currentTarget.style.color = '#DC2626'} onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}><Trash2 size={13} /></button>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: 6 }}>{l.title}</div>
                      <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.6, marginBottom: 8 }}>{l.description}</p>
                      {l.impact && <div style={{ fontSize: '0.78rem', color: '#DC2626', marginBottom: 4 }}>⚠️ {l.impact}</div>}
                      {l.recommendation && <div style={{ fontSize: '0.78rem', color: '#16A34A' }}>✅ {l.recommendation}</div>}
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 8 }}>{l.createdBy?.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Modal de conclusão (DONE) */}
      {completing && (
        <>
          <div onClick={() => setCompleting(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 998 }} />
          <div style={{ position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', background: '#fff', borderRadius: 16, padding: 28, zIndex: 999, width: Math.min(480, window.innerWidth - 32), boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CheckCircle2 size={22} style={{ color: '#16A34A' }} />
              </div>
              <div>
                <h2 style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>Concluir esta ação</h2>
                <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Descreva o ganho operacional obtido</p>
              </div>
            </div>
            <textarea className="input" rows={3} placeholder="Ex: Redução de 30% no tempo de atendimento ao cliente com a padronização do processo..." value={gainForm.operationalGain} onChange={e => setGainForm({ operationalGain: e.target.value })} style={{ border: '1.5px solid #E5E7EB', resize: 'vertical', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setCompleting(null)} className="btn btn-ghost">Cancelar</button>
              <button onClick={confirmComplete} className="btn btn-primary">
                <CheckCircle2 size={14} /> Concluir ação
              </button>
            </div>
          </div>
        </>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
