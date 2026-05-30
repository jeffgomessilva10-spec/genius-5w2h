import { useState, useEffect } from 'react';
import { documentAPI, projectsAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { FileText, Plus, Trash2, ExternalLink, Loader2, Search, FolderOpen } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function DocumentsPage() {
  const { isAdmin, isCollaborator } = useAuth();
  const [docs,     setDocs]     = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [search,   setSearch]   = useState('');
  const [projFilter, setProjFilter] = useState('');
  const [form, setForm] = useState({ projectId: '', name: '', url: '', version: '1.0', description: '' });

  useEffect(() => { loadAll(); }, []);

  async function loadAll() {
    try {
      const [docsRes, projRes] = await Promise.all([
        documentAPI.list({}),
        projectsAPI.list(),
      ]);
      setDocs(docsRes.data.documents);
      setProjects(projRes.data.projects);
      if (projRes.data.projects[0] && !form.projectId)
        setForm(f => ({ ...f, projectId: projRes.data.projects[0].id }));
    } finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await documentAPI.create(form);
      setShowForm(false);
      setForm({ projectId: projects[0]?.id || '', name: '', url: '', version: '1.0', description: '' });
      loadAll();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar documento.');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Remover este documento?')) return;
    await documentAPI.delete(id);
    setDocs(prev => prev.filter(d => d.id !== id));
  }

  const filtered = docs.filter(d => {
    const ms = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.description?.toLowerCase().includes(search.toLowerCase());
    const mp = !projFilter || d.projectId === projFilter;
    return ms && mp;
  });

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <div style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Repositório de Documentos</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Centralize atas, contratos e relatórios</p>
          </div>
          {isCollaborator && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ fontSize: '0.85rem' }}>
              <Plus size={15} /> Novo Documento
            </button>
          )}
        </div>

        <div style={{ padding: '28px 32px' }}>
          {/* Formulário */}
          {showForm && (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16, color: '#111827' }}>Novo Documento</h3>
              <form onSubmit={handleCreate} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Projeto *</label>
                  <select className="input" required value={form.projectId} onChange={e => setForm({ ...form, projectId: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }}>
                    {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Versão</label>
                  <input className="input" placeholder="1.0" value={form.version} onChange={e => setForm({ ...form, version: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Nome do documento *</label>
                  <input className="input" placeholder="Ex: Ata de reunião — Mai/2025" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>URL / Link *</label>
                  <input className="input" type="url" placeholder="https://drive.google.com/..." required value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Descrição</label>
                  <textarea className="input" rows={2} placeholder="Breve descrição do documento..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ border: '1.5px solid #E5E7EB', resize: 'vertical' }} />
                </div>
                <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost">Cancelar</button>
                  <button type="submit" disabled={saving} className="btn btn-primary">
                    {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Salvar'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filtros */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, flexWrap: 'wrap', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 160 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input className="input" placeholder="Buscar documento..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: 32, height: 36, fontSize: '0.83rem', border: '1px solid #E5E7EB', background: '#F9FAFB' }} />
            </div>
            <select className="input" value={projFilter} onChange={e => setProjFilter(e.target.value)} style={{ width: 200, height: 36, fontSize: '0.83rem', border: '1px solid #E5E7EB', background: '#F9FAFB' }}>
              <option value="">Todos os projetos</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>

          {/* Lista */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={28} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 60, textAlign: 'center' }}>
              <FolderOpen size={36} style={{ color: '#D1D5DB', marginBottom: 12 }} />
              <p style={{ color: '#9CA3AF' }}>Nenhum documento encontrado.</p>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {filtered.map(doc => (
                <div key={doc.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{ width: 40, height: 40, borderRadius: 8, background: '#EFF6FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <FileText size={20} style={{ color: '#2563EB' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: '#111827', marginBottom: 2 }}>{doc.name}</div>
                      {doc.description && <div style={{ fontSize: '0.78rem', color: '#6B7280', marginBottom: 4 }}>{doc.description}</div>}
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.7rem', background: '#F3F4F6', color: '#6B7280', padding: '2px 8px', borderRadius: 99, border: '1px solid #E5E7EB' }}>v{doc.version}</span>
                        <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{doc.uploadedBy?.name}</span>
                        <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>{format(new Date(doc.createdAt), "dd/MM/yyyy", { locale: ptBR })}</span>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 4 }}>
                      <a href={doc.url} target="_blank" rel="noreferrer" style={{ color: '#9CA3AF', padding: 4, display: 'flex' }}
                        onMouseEnter={e => e.currentTarget.style.color = '#F04E00'}
                        onMouseLeave={e => e.currentTarget.style.color = '#9CA3AF'}>
                        <ExternalLink size={15} />
                      </a>
                      {isAdmin && (
                        <button onClick={() => handleDelete(doc.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 4, display: 'flex' }}
                          onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                          onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}>
                          <Trash2 size={15} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
