import { useState, useEffect } from 'react';
import { okrAPI, projectsAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { Plus, Target, Loader2, Trash2, TrendingUp, ChevronDown, ChevronUp } from 'lucide-react';

export default function OKRPage() {
  const { isCollaborator, isAdmin } = useAuth();
  const [objectives, setObjectives] = useState([]);
  const [projects,   setProjects]   = useState([]);
  const [loading,    setLoading]    = useState(true);
  const [projFilter, setProjFilter] = useState('');
  const [showForm,   setShowForm]   = useState(false);
  const [expanded,   setExpanded]   = useState({});
  const [saving,     setSaving]     = useState(false);
  const [form, setForm] = useState({ projectId: '', title: '', description: '', targetDate: '' });
  const [krForms, setKrForms] = useState({});

  useEffect(() => { loadAll(); }, [projFilter]);

  async function loadAll() {
    try {
      const [objRes, projRes] = await Promise.all([
        okrAPI.list(projFilter ? { projectId: projFilter } : {}),
        projectsAPI.list(),
      ]);
      setObjectives(objRes.data.objectives);
      setProjects(projRes.data.projects);
      if (projRes.data.projects[0] && !form.projectId)
        setForm(f => ({ ...f, projectId: projRes.data.projects[0].id }));
    } finally { setLoading(false); }
  }

  async function handleCreateObj(e) {
    e.preventDefault(); setSaving(true);
    try {
      await okrAPI.create(form);
      setShowForm(false);
      setForm(f => ({ ...f, title: '', description: '', targetDate: '' }));
      loadAll();
    } finally { setSaving(false); }
  }

  async function handleCreateKR(objectiveId) {
    const krf = krForms[objectiveId];
    if (!krf?.title || !krf?.targetValue) return;
    await okrAPI.createKR(objectiveId, krf);
    setKrForms(prev => ({ ...prev, [objectiveId]: null }));
    loadAll();
  }

  async function handleUpdateKR(krId, currentValue) {
    await okrAPI.updateKR(krId, { currentValue });
    loadAll();
  }

  async function handleDeleteObj(id) {
    if (!confirm('Arquivar este objetivo?')) return;
    await okrAPI.delete(id);
    loadAll();
  }

  function calcKRProgress(kr) {
    const t = Number(kr.targetValue);
    const c = Number(kr.currentValue);
    return t > 0 ? Math.min(Math.round((c / t) * 100), 100) : 0;
  }

  const progressColor = (pct) => pct >= 70 ? '#16A34A' : pct >= 40 ? '#D97706' : '#DC2626';

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>OKRs — Objetivos e Resultados-Chave</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Vincule atividades aos objetivos estratégicos</p>
          </div>
          {isCollaborator && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ fontSize: '0.85rem' }}>
              <Plus size={15} /> Novo Objetivo
            </button>
          )}
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Filtro */}
          <div style={{ marginBottom: 20 }}>
            <select className="input" value={projFilter} onChange={e => setProjFilter(e.target.value)} style={{ width: 240, border: '1px solid #E5E7EB', background: '#fff', fontSize: '0.85rem' }}>
              <option value="">Todos os projetos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Form novo objetivo */}
          {showForm && (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <form onSubmit={handleCreateObj} style={{ display: 'grid', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Projeto *</label>
                    <select className="input" required value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }}>
                      {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Prazo</label>
                    <input className="input" type="date" value={form.targetDate} onChange={e => setForm({ ...form, targetDate: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Objetivo *</label>
                  <input className="input" placeholder="Ex: Aumentar a presença digital da empresa" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Descrição</label>
                  <textarea className="input" rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ border: '1.5px solid #E5E7EB', resize: 'vertical' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn btn-primary">
                    {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Criar Objetivo'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={28} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : objectives.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 60, textAlign: 'center' }}>
              <Target size={36} style={{ color: '#D1D5DB', marginBottom: 12 }} />
              <p style={{ color: '#9CA3AF' }}>Nenhum objetivo cadastrado.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {objectives.map(obj => {
                const prog = Number(obj.progress);
                const isExp = expanded[obj.id];
                return (
                  <div key={obj.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                    {/* Header */}
                    <div style={{ padding: '18px 24px', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                      <div style={{ width: 48, height: 48, borderRadius: 12, background: '#FFF3EE', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Target size={22} style={{ color: '#F04E00' }} />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827', marginBottom: 4 }}>{obj.title}</div>
                        {obj.description && <div style={{ fontSize: '0.83rem', color: '#6B7280', marginBottom: 10 }}>{obj.description}</div>}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ flex: 1, height: 8, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden', maxWidth: 300 }}>
                            <div style={{ height: '100%', width: `${prog}%`, background: progressColor(prog), borderRadius: 99, transition: 'width 0.5s' }} />
                          </div>
                          <span style={{ fontWeight: 700, fontSize: '0.85rem', color: progressColor(prog) }}>{prog}%</span>
                          <span style={{ fontSize: '0.75rem', color: '#9CA3AF' }}>{obj.keyResults.length} KR{obj.keyResults.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => setExpanded(p => ({ ...p, [obj.id]: !p[obj.id] }))} className="btn btn-ghost" style={{ padding: '6px 10px', fontSize: '0.78rem' }}>
                          {isExp ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          KRs
                        </button>
                        {isAdmin && <button onClick={() => handleDeleteObj(obj.id)} style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 7, cursor: 'pointer', color: '#D1D5DB', padding: '6px 8px', display: 'flex' }} onMouseEnter={e => e.currentTarget.style.color = '#DC2626'} onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}><Trash2 size={14} /></button>}
                      </div>
                    </div>

                    {/* Key Results */}
                    {isExp && (
                      <div style={{ borderTop: '1px solid #E5E7EB', padding: '16px 24px', background: '#F9FAFB' }}>
                        {obj.keyResults.map(kr => {
                          const krProg = calcKRProgress(kr);
                          return (
                            <div key={kr.id} style={{ marginBottom: 14, background: '#fff', borderRadius: 10, padding: '12px 16px', border: '1px solid #E5E7EB' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                                <TrendingUp size={14} style={{ color: progressColor(krProg), flexShrink: 0 }} />
                                <div style={{ flex: 1, fontWeight: 600, fontSize: '0.85rem', color: '#374151' }}>{kr.title}</div>
                                <span style={{ fontWeight: 700, fontSize: '0.85rem', color: progressColor(krProg) }}>{krProg}%</span>
                              </div>
                              <div style={{ height: 6, background: '#E5E7EB', borderRadius: 99, marginBottom: 8 }}>
                                <div style={{ height: '100%', width: `${krProg}%`, background: progressColor(krProg), borderRadius: 99, transition: 'width 0.4s' }} />
                              </div>
                              <div style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: '0.8rem', color: '#6B7280' }}>
                                <span>Atual: <strong>{Number(kr.currentValue)} {kr.unit}</strong></span>
                                <span>/ Meta: <strong>{Number(kr.targetValue)} {kr.unit}</strong></span>
                                {isCollaborator && (
                                  <input
                                    type="number" min="0" step="0.1"
                                    defaultValue={Number(kr.currentValue)}
                                    onBlur={e => handleUpdateKR(kr.id, e.target.value)}
                                    style={{ width: 80, padding: '3px 8px', border: '1px solid #E5E7EB', borderRadius: 6, fontSize: '0.8rem', marginLeft: 'auto' }}
                                  />
                                )}
                              </div>
                            </div>
                          );
                        })}

                        {/* Adicionar KR */}
                        {isCollaborator && (
                          krForms[obj.id]
                            ? (
                              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                                <input className="input" placeholder="Título do resultado-chave *" value={krForms[obj.id]?.title || ''} onChange={e => setKrForms(p => ({ ...p, [obj.id]: { ...p[obj.id], title: e.target.value } }))} style={{ flex: 2, minWidth: 160, border: '1.5px solid #E5E7EB', fontSize: '0.82rem' }} />
                                <input className="input" type="number" placeholder="Meta" value={krForms[obj.id]?.targetValue || ''} onChange={e => setKrForms(p => ({ ...p, [obj.id]: { ...p[obj.id], targetValue: e.target.value } }))} style={{ width: 100, border: '1.5px solid #E5E7EB', fontSize: '0.82rem' }} />
                                <input className="input" placeholder="Unidade (%, R$...)" value={krForms[obj.id]?.unit || '%'} onChange={e => setKrForms(p => ({ ...p, [obj.id]: { ...p[obj.id], unit: e.target.value } }))} style={{ width: 100, border: '1.5px solid #E5E7EB', fontSize: '0.82rem' }} />
                                <button onClick={() => handleCreateKR(obj.id)} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>Salvar</button>
                                <button onClick={() => setKrForms(p => ({ ...p, [obj.id]: null }))} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>Cancelar</button>
                              </div>
                            ) : (
                              <button onClick={() => setKrForms(p => ({ ...p, [obj.id]: { title: '', targetValue: '', unit: '%' } }))} className="btn btn-ghost" style={{ marginTop: 8, fontSize: '0.78rem', padding: '6px 12px' }}>
                                <Plus size={13} /> Adicionar Resultado-Chave
                              </button>
                            )
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
