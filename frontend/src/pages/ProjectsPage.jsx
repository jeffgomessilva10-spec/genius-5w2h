import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { Plus, FolderOpen, Loader2, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const { isAdmin, isCollaborator } = useAuth();

  useEffect(() => { loadProjects(); }, []);

  async function loadProjects() {
    try {
      const { data } = await projectsAPI.list();
      setProjects(data.projects);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await projectsAPI.create(form);
      setShowForm(false);
      setForm({ name: '', description: '', startDate: '', endDate: '' });
      loadProjects();
    } catch (err) {
      alert('Erro ao criar projeto.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <main style={{ flex: 1, padding: '36px 40px', overflowY: 'auto' }}>
        <div className="flex items-center justify-between" style={{ marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: "'Bebas Neue', sans-serif", fontSize: '2.2rem', letterSpacing: 2, lineHeight: 1 }}>
              MEUS <span style={{ color: 'var(--genius-gold)' }}>PROJETOS</span>
            </h1>
            <p style={{ color: 'var(--genius-text-muted)', marginTop: 4, fontSize: '0.9rem' }}>
              Gerencie todos os projetos da Genius Consultoria
            </p>
          </div>
          {(isAdmin || isCollaborator) && (
            <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
              <Plus size={16} /> Novo Projeto
            </button>
          )}
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 28, padding: 24 }}>
            <h3 style={{ marginBottom: 16, fontWeight: 600 }}>Novo Projeto</h3>
            <form onSubmit={handleCreate} style={{ display: 'grid', gap: 12 }}>
              <input className="input" placeholder="Nome do projeto *" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <textarea className="input" placeholder="Descrição" rows={3} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ resize: 'vertical' }} />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--genius-text-muted)', marginBottom: 4, display: 'block' }}>Data de início</label>
                  <input className="input" type="date" value={form.startDate} onChange={e => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <label style={{ fontSize: '0.8rem', color: 'var(--genius-text-muted)', marginBottom: 4, display: 'block' }}>Data de término</label>
                  <input className="input" type="date" value={form.endDate} onChange={e => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Criar Projeto'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={32} style={{ color: 'var(--genius-gold)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : projects.length === 0 ? (
          <div className="card" style={{ textAlign: 'center', padding: '60px 20px' }}>
            <FolderOpen size={40} style={{ color: 'var(--genius-text-subtle)', marginBottom: 12 }} />
            <p style={{ color: 'var(--genius-text-muted)' }}>Nenhum projeto encontrado.</p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 16 }}>
            {projects.map((p) => (
              <Link key={p.id} to={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                <div className="card" style={{ padding: 24, cursor: 'pointer', transition: 'border-color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--genius-gold)'}
                  onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--genius-border)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                    <FolderOpen size={22} style={{ color: 'var(--genius-gold)', flexShrink: 0, marginTop: 2 }} />
                    <div style={{ flex: 1 }}>
                      <h3 style={{ fontWeight: 700, marginBottom: 6, fontSize: '1rem' }}>{p.name}</h3>
                      {p.description && (
                        <p style={{ color: 'var(--genius-text-muted)', fontSize: '0.85rem', marginBottom: 12 }}>{p.description}</p>
                      )}
                      {(p.startDate || p.endDate) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--genius-text-muted)', fontSize: '0.8rem' }}>
                          <Calendar size={13} />
                          {p.startDate && new Date(p.startDate).toLocaleDateString('pt-BR')}
                          {p.startDate && p.endDate && ' → '}
                          {p.endDate && new Date(p.endDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
