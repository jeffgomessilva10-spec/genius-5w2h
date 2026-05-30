import { useState, useEffect } from 'react';
import { pdcaAPI, projectsAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { Plus, Loader2, Trash2, BookOpen, Lightbulb, RefreshCw } from 'lucide-react';

const PDCA_CONFIG = {
  PLAN:  { label: 'Planejar', color: '#2563EB', bg: '#EFF6FF', icon: '📋', desc: 'Definir objetivos e processos' },
  DO:    { label: 'Executar', color: '#16A34A', bg: '#F0FDF4', icon: '⚡', desc: 'Implementar o plano' },
  CHECK: { label: 'Verificar', color: '#D97706', bg: '#FFFBEB', icon: '🔍', desc: 'Monitorar e medir resultados' },
  ACT:   { label: 'Agir',     color: '#F04E00', bg: '#FFF3EE', icon: '🚀', desc: 'Padronizar ou corrigir' },
};

const LESSON_CATEGORIES = ['Geral', 'Técnico', 'Processo', 'Equipe', 'Cliente', 'Financeiro', 'Prazo'];

export default function PdcaPage() {
  const { isCollaborator, isAdmin, user } = useAuth();
  const [reviews,    setReviews]    = useState([]);
  const [lessons,    setLessons]    = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [projFilter, setProjFilter] = useState('');
  const [activeTab,  setActiveTab]  = useState('pdca');
  const [showForm,   setShowForm]   = useState(false);
  const [showLesson, setShowLesson] = useState(false);
  const [saving,     setSaving]     = useState(false);

  const [reviewForm, setReviewForm] = useState({ projectId: '', phase: 'PLAN', title: '', description: '', actionItems: '' });
  const [lessonForm, setLessonForm] = useState({ projectId: '', title: '', description: '', category: 'Geral', impact: '', recommendation: '' });

  useEffect(() => { loadAll(); }, [projFilter]);

  async function loadAll() {
    try {
      const [pdcaRes, projRes] = await Promise.all([
        pdcaAPI.list(projFilter ? { projectId: projFilter } : {}),
        projectsAPI.list(),
      ]);
      setReviews(pdcaRes.data.reviews);
      setLessons(pdcaRes.data.lessons);
      setProjects(projRes.data.projects);
      const firstId = projRes.data.projects[0]?.id || '';
      if (!reviewForm.projectId) setReviewForm(f => ({ ...f, projectId: firstId }));
      if (!lessonForm.projectId) setLessonForm(f => ({ ...f, projectId: firstId }));
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

  const groupedReviews = Object.keys(PDCA_CONFIG).reduce((acc, phase) => {
    acc[phase] = reviews.filter(r => r.phase === phase);
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>PDCA e Lições Aprendidas</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Melhoria contínua e registro do aprendizado</p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
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
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Tabs + Filtro */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
            {[{ id: 'pdca', label: 'Ciclo PDCA', icon: <RefreshCw size={14} /> }, { id: 'lessons', label: 'Lições Aprendidas', icon: <Lightbulb size={14} /> }].map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
                display: 'flex', alignItems: 'center', gap: 7, padding: '8px 18px',
                borderRadius: 8, cursor: 'pointer', border: '1.5px solid',
                background: activeTab === tab.id ? '#F04E00' : '#fff',
                borderColor: activeTab === tab.id ? '#F04E00' : '#E5E7EB',
                color: activeTab === tab.id ? '#fff' : '#374151',
                fontWeight: activeTab === tab.id ? 700 : 500, fontSize: '0.85rem',
              }}>
                {tab.icon} {tab.label}
              </button>
            ))}
            <select className="input" value={projFilter} onChange={e => setProjFilter(e.target.value)} style={{ width: 200, border: '1px solid #E5E7EB', background: '#fff', fontSize: '0.83rem', marginLeft: 'auto' }}>
              <option value="">Todos os projetos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* PDCA Tab */}
          {activeTab === 'pdca' && (
            <>
              {showForm && (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                  <form onSubmit={handleCreateReview} style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Projeto *</label>
                        <select className="input" required value={reviewForm.projectId} onChange={e => setReviewForm({ ...reviewForm, projectId: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }}>
                          {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Fase *</label>
                        <select className="input" value={reviewForm.phase} onChange={e => setReviewForm({ ...reviewForm, phase: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }}>
                          {Object.entries(PDCA_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.icon} {v.label}</option>)}
                        </select>
                      </div>
                    </div>
                    <input className="input" placeholder="Título *" required value={reviewForm.title} onChange={e => setReviewForm({ ...reviewForm, title: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                    <textarea className="input" rows={3} placeholder="Descrição detalhada *" required value={reviewForm.description} onChange={e => setReviewForm({ ...reviewForm, description: e.target.value })} style={{ border: '1.5px solid #E5E7EB', resize: 'vertical' }} />
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

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
                {Object.entries(PDCA_CONFIG).map(([phase, cfg]) => (
                  <div key={phase} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                    <div style={{ background: cfg.bg, padding: '14px 18px', borderBottom: `2px solid ${cfg.color}` }}>
                      <div style={{ fontWeight: 800, fontSize: '1rem', color: cfg.color }}>{cfg.icon} {cfg.label}</div>
                      <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 2 }}>{cfg.desc}</div>
                    </div>
                    <div style={{ padding: '14px 18px', maxHeight: 320, overflowY: 'auto' }}>
                      {groupedReviews[phase].length === 0
                        ? <p style={{ fontSize: '0.8rem', color: '#D1D5DB', textAlign: 'center', padding: '20px 0' }}>Nenhum registro</p>
                        : groupedReviews[phase].map(r => (
                          <div key={r.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid #F3F4F6' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div style={{ fontWeight: 700, fontSize: '0.85rem', color: '#111827', flex: 1 }}>{r.title}</div>
                              {(r.createdBy.id === user?.id || isAdmin) && (
                                <button onClick={async () => { await pdcaAPI.deleteReview(r.id); loadAll(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 2 }} onMouseEnter={e => e.currentTarget.style.color = '#DC2626'} onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}><Trash2 size={13} /></button>
                              )}
                            </div>
                            <p style={{ fontSize: '0.78rem', color: '#6B7280', marginTop: 4, lineHeight: 1.5 }}>{r.description}</p>
                            {r.actionItems && <div style={{ fontSize: '0.75rem', color: cfg.color, marginTop: 6, fontWeight: 600 }}>→ {r.actionItems}</div>}
                            <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 4 }}>{r.createdBy.name}</div>
                          </div>
                        ))
                      }
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Lições Aprendidas Tab */}
          {activeTab === 'lessons' && (
            <>
              {showLesson && (
                <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                  <form onSubmit={handleCreateLesson} style={{ display: 'grid', gap: 12 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Projeto *</label>
                        <select className="input" required value={lessonForm.projectId} onChange={e => setLessonForm({ ...lessonForm, projectId: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }}>
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
                  <p style={{ color: '#9CA3AF' }}>Nenhuma lição aprendida registrada ainda.</p>
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
                  {lessons.map(l => (
                    <div key={l.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)', borderLeft: '4px solid #F04E00' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: '#FFF3EE', color: '#F04E00', border: '1px solid #FECACA' }}>{l.category}</span>
                        </div>
                        {(l.createdBy.id === user?.id || isAdmin) && (
                          <button onClick={async () => { await pdcaAPI.deleteLesson(l.id); loadAll(); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 2 }} onMouseEnter={e => e.currentTarget.style.color = '#DC2626'} onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}><Trash2 size={13} /></button>
                        )}
                      </div>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827', marginBottom: 6 }}>{l.title}</div>
                      <p style={{ fontSize: '0.82rem', color: '#6B7280', lineHeight: 1.6, marginBottom: 8 }}>{l.description}</p>
                      {l.impact && <div style={{ fontSize: '0.78rem', color: '#DC2626', marginBottom: 4 }}>⚠️ Impacto: {l.impact}</div>}
                      {l.recommendation && <div style={{ fontSize: '0.78rem', color: '#16A34A' }}>✅ Recomendação: {l.recommendation}</div>}
                      <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 8 }}>{l.createdBy.name}</div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
