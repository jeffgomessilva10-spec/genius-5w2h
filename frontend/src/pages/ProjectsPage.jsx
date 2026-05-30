import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { projectsAPI, usersAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { Plus, FolderOpen, Loader2, Calendar, Users, X, UserPlus, ChevronDown, ChevronUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', startDate: '', endDate: '' });
  const [saving, setSaving] = useState(false);
  const [expandedProject, setExpandedProject] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [addingUser, setAddingUser] = useState({});
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadProjects();
    if (isAdmin) loadUsers();
  }, []);

  async function loadProjects() {
    try {
      const { data } = await projectsAPI.list();
      // Busca detalhes com membros para cada projeto
      const detailed = await Promise.all(
        data.projects.map(p => projectsAPI.get(p.id).then(r => r.data.project))
      );
      setProjects(detailed);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadUsers() {
    try {
      const { data } = await usersAPI.list();
      setAllUsers(data.users);
    } catch (err) {
      console.error(err);
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

  async function handleAddUser(projectId, userId) {
    setAddingUser(prev => ({ ...prev, [projectId]: true }));
    try {
      await projectsAPI.addClient(projectId, userId);
      loadProjects();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao adicionar usuário.');
    } finally {
      setAddingUser(prev => ({ ...prev, [projectId]: false }));
    }
  }

  async function handleRemoveUser(projectId, userId) {
    if (!confirm('Remover este usuário do projeto?')) return;
    try {
      await projectsAPI.removeClient(projectId, userId);
      loadProjects();
    } catch (err) {
      alert('Erro ao remover usuário.');
    }
  }

  function getMembersNotInProject(project) {
    const memberIds = new Set(project.users?.map(u => u.user.id) || []);
    return allUsers.filter(u => !memberIds.has(u.id));
  }

  const roleLabel = { ADMIN: 'Admin', COLLABORATOR: 'Colaborador', CLIENT: 'Cliente' };
  const roleColor = { ADMIN: '#F5C500', COLLABORATOR: '#10B981', CLIENT: '#60A5FA' };

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
              Gerencie projetos e controle o acesso de cada membro
            </p>
          </div>
          {isAdmin && (
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
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {projects.map((p) => {
              const isExpanded = expandedProject === p.id;
              const members = p.users || [];
              const available = getMembersNotInProject(p);

              return (
                <div key={p.id} className="card" style={{ padding: 0, overflow: 'hidden' }}>
                  {/* Header do projeto */}
                  <div style={{ padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                    <FolderOpen size={22} style={{ color: 'var(--genius-gold)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <Link to={`/projects/${p.id}`} style={{ textDecoration: 'none' }}>
                        <h3 style={{ fontWeight: 700, fontSize: '1rem', marginBottom: 4, color: 'var(--genius-text)' }}>{p.name}</h3>
                      </Link>
                      {p.description && (
                        <p style={{ color: 'var(--genius-text-muted)', fontSize: '0.85rem' }}>{p.description}</p>
                      )}
                      {(p.startDate || p.endDate) && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--genius-text-muted)', fontSize: '0.8rem', marginTop: 4 }}>
                          <Calendar size={13} />
                          {p.startDate && new Date(p.startDate).toLocaleDateString('pt-BR')}
                          {p.startDate && p.endDate && ' → '}
                          {p.endDate && new Date(p.endDate).toLocaleDateString('pt-BR')}
                        </div>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: 'var(--genius-text-muted)', fontSize: '0.85rem' }}>
                        <Users size={15} />
                        {members.length} membro{members.length !== 1 ? 's' : ''}
                      </div>
                      {isAdmin && (
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: '0.8rem', padding: '6px 10px' }}
                          onClick={() => setExpandedProject(isExpanded ? null : p.id)}
                        >
                          {isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          {isExpanded ? 'Fechar' : 'Gerenciar membros'}
                        </button>
                      )}
                      <Link to={`/projects/${p.id}`} className="btn btn-ghost" style={{ fontSize: '0.8rem', padding: '6px 10px' }}>
                        Ver projeto →
                      </Link>
                    </div>
                  </div>

                  {/* Painel de membros (expansível) */}
                  {isExpanded && isAdmin && (
                    <div style={{ borderTop: '1px solid var(--genius-border)', padding: '20px 24px', background: 'rgba(0,0,0,0.2)' }}>
                      <h4 style={{ fontWeight: 600, marginBottom: 14, fontSize: '0.9rem' }}>Membros com acesso</h4>

                      {members.length === 0 ? (
                        <p style={{ color: 'var(--genius-text-muted)', fontSize: '0.85rem', marginBottom: 16 }}>Nenhum membro vinculado.</p>
                      ) : (
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 16 }}>
                          {members.map(({ user }) => (
                            <div key={user.id} style={{
                              display: 'flex', alignItems: 'center', gap: 8,
                              background: 'var(--genius-surface)', border: '1px solid var(--genius-border)',
                              borderRadius: 8, padding: '6px 10px', fontSize: '0.85rem',
                            }}>
                              <div style={{
                                width: 26, height: 26, borderRadius: '50%',
                                background: roleColor[user.role] || '#888',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#000', fontWeight: 700, fontSize: '0.75rem', flexShrink: 0,
                              }}>
                                {user.name[0].toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600 }}>{user.name}</div>
                                <div style={{ fontSize: '0.72rem', color: roleColor[user.role] }}>
                                  {roleLabel[user.role]}
                                </div>
                              </div>
                              <button
                                onClick={() => handleRemoveUser(p.id, user.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#EF4444', padding: 2, display: 'flex', marginLeft: 4 }}
                                title="Remover"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {available.length > 0 && (
                        <div>
                          <h4 style={{ fontWeight: 600, marginBottom: 10, fontSize: '0.9rem' }}>Adicionar membro</h4>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                            {available.map(u => (
                              <button
                                key={u.id}
                                className="btn btn-ghost"
                                style={{ fontSize: '0.82rem', padding: '6px 12px' }}
                                onClick={() => handleAddUser(p.id, u.id)}
                                disabled={addingUser[p.id]}
                              >
                                <UserPlus size={13} />
                                {u.name}
                                <span style={{ fontSize: '0.72rem', color: roleColor[u.role], marginLeft: 4 }}>
                                  ({roleLabel[u.role]})
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
