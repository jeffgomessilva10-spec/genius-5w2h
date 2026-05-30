import { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import api from '../services/api';
import {
  BookOpen, Shield, Download, BarChart3,
  Plus, Loader2, Trash2, CheckCircle2, AlertTriangle, ExternalLink,
} from 'lucide-react';

const TABS = [
  { id: 'glossary',  label: 'Glossário',     icon: BookOpen   },
  { id: 'policies',  label: 'Políticas',     icon: Shield     },
  { id: 'quality',   label: 'Qualidade',     icon: BarChart3  },
  { id: 'privacy',   label: 'Privacidade',   icon: Download   },
];

const POLICY_CATEGORIES = ['Classificação', 'Acesso', 'Retenção', 'Privacidade'];

export default function GovernancePage() {
  const { isAdmin, isExecutive } = useAuth();
  const isMobile = useIsMobile();
  const [tab,       setTab]       = useState('glossary');
  const [loading,   setLoading]   = useState(true);
  const [data,      setData]      = useState(null);
  const [showForm,  setShowForm]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [glossForm, setGlossForm] = useState({ term: '', definition: '', category: 'Geral', examples: '' });
  const [polForm,   setPolForm]   = useState({ title: '', category: 'Acesso', content: '', version: '1.0' });

  useEffect(() => { loadTab(); }, [tab]);

  async function loadTab() {
    setLoading(true);
    try {
      if (tab === 'glossary') {
        const r = await api.get('/governance/glossary');
        setData(r.data);
      } else if (tab === 'policies') {
        const r = await api.get('/governance/policies');
        setData(r.data);
      } else if (tab === 'quality') {
        const r = await api.get('/governance/data-quality');
        setData(r.data);
      } else if (tab === 'privacy') {
        const r = await api.get('/governance/consent');
        setData(r.data);
      }
    } finally { setLoading(false); }
  }

  async function handleSaveGloss(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/governance/glossary', glossForm);
      setShowForm(false);
      setGlossForm({ term: '', definition: '', category: 'Geral', examples: '' });
      loadTab();
    } finally { setSaving(false); }
  }

  async function handleSavePol(e) {
    e.preventDefault(); setSaving(true);
    try {
      await api.post('/governance/policies', polForm);
      setShowForm(false);
      setPolForm({ title: '', category: 'Acesso', content: '', version: '1.0' });
      loadTab();
    } finally { setSaving(false); }
  }

  async function handleDeleteGloss(id) {
    if (!confirm('Remover este termo?')) return;
    await api.delete(`/governance/glossary/${id}`);
    loadTab();
  }

  async function handleExportData() {
    const r = await api.get('/governance/my-data/export');
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'meus-dados.json'; a.click();
    URL.revokeObjectURL(url);
  }

  async function handleExportAudit() {
    const r = await api.get('/governance/audit/export');
    const blob = new Blob([JSON.stringify(r.data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href = url; a.download = 'auditoria.json'; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main id="main-content" style={{ flex: 1, overflowY: 'auto' }} role="main">
        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', display: 'flex', alignItems: 'center', height: 64, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Governança de Dados</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Glossário, políticas, qualidade e privacidade</p>
          </div>
        </header>

        <div style={{ padding: isMobile ? 16 : '24px 32px' }}>
          {/* Tabs */}
          <nav aria-label="Seções de governança" style={{ display: 'flex', gap: 8, marginBottom: 24, flexWrap: 'wrap' }}>
            {TABS.map(t => {
              const Icon = t.icon;
              return (
                <button
                  key={t.id}
                  onClick={() => { setTab(t.id); setShowForm(false); }}
                  aria-current={tab === t.id ? 'page' : undefined}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7, padding: '8px 16px',
                    borderRadius: 8, cursor: 'pointer', border: '1.5px solid',
                    background: tab === t.id ? '#F04E00' : '#fff',
                    borderColor: tab === t.id ? '#F04E00' : '#E5E7EB',
                    color: tab === t.id ? '#fff' : '#374151',
                    fontWeight: tab === t.id ? 700 : 500, fontSize: '0.85rem',
                  }}
                >
                  <Icon size={14} /> {t.label}
                </button>
              );
            })}
          </nav>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={28} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <>
              {/* ── GLOSSÁRIO ── */}
              {tab === 'glossary' && (
                <section aria-label="Glossário de negócios">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>Glossário de Negócios</h2>
                    {isAdmin && <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ fontSize: '0.82rem' }}><Plus size={14} /> Novo Termo</button>}
                  </div>

                  {showForm && isAdmin && (
                    <form onSubmit={handleSaveGloss} aria-label="Formulário novo termo" style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label htmlFor="term" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Termo *</label>
                          <input id="term" className="input" required value={glossForm.term} onChange={e => setGlossForm({ ...glossForm, term: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                        </div>
                        <div>
                          <label htmlFor="gl-category" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Categoria</label>
                          <input id="gl-category" className="input" value={glossForm.category} onChange={e => setGlossForm({ ...glossForm, category: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label htmlFor="definition" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Definição *</label>
                        <textarea id="definition" className="input" rows={2} required value={glossForm.definition} onChange={e => setGlossForm({ ...glossForm, definition: e.target.value })} style={{ border: '1.5px solid #E5E7EB', resize: 'vertical' }} />
                      </div>
                      <div style={{ marginBottom: 14 }}>
                        <label htmlFor="examples" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Exemplos de uso</label>
                        <input id="examples" className="input" value={glossForm.examples} onChange={e => setGlossForm({ ...glossForm, examples: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
                        <button type="submit" disabled={saving} className="btn btn-primary">
                          {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Salvar'}
                        </button>
                      </div>
                    </form>
                  )}

                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(320px, 1fr))', gap: 12 }}>
                    {data?.terms?.map(t => (
                      <article key={t.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '14px 18px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div>
                            <span style={{ fontWeight: 800, fontSize: '0.95rem', color: '#F04E00' }}>{t.term}</span>
                            <span style={{ fontSize: '0.68rem', marginLeft: 8, background: '#F3F4F6', color: '#6B7280', padding: '2px 7px', borderRadius: 99 }}>{t.category}</span>
                          </div>
                          {isAdmin && <button onClick={() => handleDeleteGloss(t.id)} aria-label={`Remover ${t.term}`} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 4 }} onMouseEnter={e => e.currentTarget.style.color = '#DC2626'} onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}><Trash2 size={13} /></button>}
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#374151', marginTop: 8, lineHeight: 1.6 }}>{t.definition}</p>
                        {t.examples && <div style={{ fontSize: '0.75rem', color: '#9CA3AF', marginTop: 6, fontStyle: 'italic' }}>Ex: {t.examples}</div>}
                        <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginTop: 8 }}>Criado por {t.createdBy?.name}</div>
                      </article>
                    ))}
                    {!data?.terms?.length && <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Nenhum termo no glossário.</p>}
                  </div>
                </section>
              )}

              {/* ── POLÍTICAS ── */}
              {tab === 'policies' && (
                <section aria-label="Políticas de dados">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                    <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151' }}>Políticas de Dados</h2>
                    {isAdmin && <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ fontSize: '0.82rem' }}><Plus size={14} /> Nova Política</button>}
                  </div>
                  {showForm && isAdmin && (
                    <form onSubmit={handleSavePol} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 20, marginBottom: 20 }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                        <div>
                          <label htmlFor="pol-title" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Título *</label>
                          <input id="pol-title" className="input" required value={polForm.title} onChange={e => setPolForm({ ...polForm, title: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                        </div>
                        <div>
                          <label htmlFor="pol-category" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Categoria *</label>
                          <select id="pol-category" className="input" value={polForm.category} onChange={e => setPolForm({ ...polForm, category: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }}>
                            {POLICY_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div style={{ marginBottom: 12 }}>
                        <label htmlFor="pol-content" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Conteúdo *</label>
                        <textarea id="pol-content" className="input" rows={5} required value={polForm.content} onChange={e => setPolForm({ ...polForm, content: e.target.value })} style={{ border: '1.5px solid #E5E7EB', resize: 'vertical' }} />
                      </div>
                      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                        <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
                        <button type="submit" disabled={saving} className="btn btn-primary">{saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Publicar'}</button>
                      </div>
                    </form>
                  )}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {data?.policies?.map(p => (
                      <article key={p.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{p.title}</span>
                            <span style={{ fontSize: '0.68rem', background: '#EFF6FF', color: '#2563EB', padding: '2px 7px', borderRadius: 99, border: '1px solid #BFDBFE' }}>v{p.version}</span>
                            <span style={{ fontSize: '0.68rem', background: '#F3F4F6', color: '#6B7280', padding: '2px 7px', borderRadius: 99 }}>{p.category}</span>
                          </div>
                        </div>
                        <p style={{ fontSize: '0.82rem', color: '#374151', lineHeight: 1.7 }}>{p.content}</p>
                        <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 8 }}>Por {p.createdBy?.name} · Vigente desde {new Date(p.effectiveAt).toLocaleDateString('pt-BR')}</div>
                      </article>
                    ))}
                    {!data?.policies?.length && <p style={{ color: '#9CA3AF', fontSize: '0.85rem' }}>Nenhuma política cadastrada.</p>}
                  </div>
                </section>
              )}

              {/* ── QUALIDADE ── */}
              {tab === 'quality' && data && (
                <section aria-label="Qualidade de dados">
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>Qualidade de Dados</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr', gap: 14, marginBottom: 24 }}>
                    {[
                      { label: 'Completeness', value: data.summary?.completeness, icon: CheckCircle2, color: '#16A34A' },
                      { label: 'Total atividades', value: data.summary?.totalActivities, icon: BarChart3, color: '#2563EB' },
                      { label: 'Problemas detectados', value: data.summary?.issues, icon: AlertTriangle, color: '#DC2626' },
                    ].map(item => {
                      const Icon = item.icon;
                      return (
                        <div key={item.label} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', borderTop: `3px solid ${item.color}`, boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                            <Icon size={15} style={{ color: item.color }} />
                            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{item.label}</span>
                          </div>
                          <div style={{ fontSize: '1.6rem', fontWeight: 800, color: item.color }}>{item.value}</div>
                        </div>
                      );
                    })}
                  </div>
                  {data.recommendations?.length > 0 && (
                    <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '16px 20px' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '0.85rem', color: '#D97706', marginBottom: 10 }}>⚡ Recomendações</h3>
                      {data.recommendations.map((r, i) => <p key={i} style={{ fontSize: '0.82rem', color: '#374151', marginBottom: 4 }}>• {r}</p>)}
                    </div>
                  )}
                </section>
              )}

              {/* ── PRIVACIDADE ── */}
              {tab === 'privacy' && (
                <section aria-label="Privacidade e LGPD">
                  <h2 style={{ fontSize: '0.9rem', fontWeight: 700, color: '#374151', marginBottom: 16 }}>Privacidade e LGPD</h2>
                  <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', marginBottom: 12 }}>Meus Consentimentos</h3>
                      {data?.consents?.length === 0 && <p style={{ color: '#9CA3AF', fontSize: '0.82rem' }}>Nenhum consentimento registrado.</p>}
                      {data?.consents?.map(c => (
                        <div key={c.id} style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, padding: '8px 0', borderBottom: '1px solid #F3F4F6' }}>
                          <div style={{ width: 8, height: 8, borderRadius: '50%', background: c.accepted ? '#16A34A' : '#DC2626', flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <span style={{ fontWeight: 600, fontSize: '0.82rem', color: '#374151', textTransform: 'capitalize' }}>{c.type}</span>
                            <span style={{ fontSize: '0.72rem', color: '#9CA3AF', marginLeft: 8 }}>{c.accepted ? 'Aceito' : 'Recusado'}</span>
                          </div>
                          <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{new Date(c.createdAt).toLocaleDateString('pt-BR')}</span>
                        </div>
                      ))}
                    </div>
                    <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '20px' }}>
                      <h3 style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', marginBottom: 12 }}>Portabilidade de Dados</h3>
                      <p style={{ fontSize: '0.82rem', color: '#6B7280', marginBottom: 16, lineHeight: 1.6 }}>
                        Conforme LGPD Art. 18, você pode exportar todos os seus dados pessoais armazenados no sistema.
                      </p>
                      <button onClick={handleExportData} className="btn btn-primary" style={{ fontSize: '0.82rem', width: '100%', justifyContent: 'center', marginBottom: 10 }}>
                        <Download size={14} /> Exportar meus dados (JSON)
                      </button>
                      {isAdmin && (
                        <button onClick={handleExportAudit} className="btn btn-ghost" style={{ fontSize: '0.82rem', width: '100%', justifyContent: 'center' }}>
                          <Download size={14} /> Exportar log de auditoria
                        </button>
                      )}
                    </div>
                  </div>
                </section>
              )}
            </>
          )}
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
