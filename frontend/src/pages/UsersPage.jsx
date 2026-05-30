import { useState, useEffect } from 'react';
import { usersAPI, authAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { Plus, Loader2, User, Mail, Shield, X } from 'lucide-react';

const ROLE_LABEL = { ADMIN: 'Admin', COLLABORATOR: 'Colaborador', CLIENT: 'Cliente' };
const ROLE_COLOR = { ADMIN: '#F5C500', COLLABORATOR: '#10B981', CLIENT: '#60A5FA' };

export default function UsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'COLLABORATOR' });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const { data } = await usersAPI.list();
      setUsers(data.users);
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
      await authAPI.register(form);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'COLLABORATOR' });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar usuário.');
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
              GESTÃO DE <span style={{ color: 'var(--genius-gold)' }}>USUÁRIOS</span>
            </h1>
            <p style={{ color: 'var(--genius-text-muted)', marginTop: 4, fontSize: '0.9rem' }}>
              Crie e gerencie colaboradores e clientes
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)}>
            <Plus size={16} /> Novo Usuário
          </button>
        </div>

        {showForm && (
          <div className="card" style={{ marginBottom: 28, padding: 24 }}>
            <h3 style={{ marginBottom: 16, fontWeight: 600 }}>Novo Usuário</h3>
            <form onSubmit={handleCreate} style={{ display: 'grid', gap: 12 }}>
              <input className="input" placeholder="Nome completo *" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              <input className="input" type="email" placeholder="E-mail *" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
              <input className="input" type="password" placeholder="Senha *" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} />
              <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}>
                <option value="COLLABORATOR">Colaborador</option>
                <option value="CLIENT">Cliente</option>
                <option value="ADMIN">Admin</option>
              </select>
              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Salvando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
            <Loader2 size={32} style={{ color: 'var(--genius-gold)', animation: 'spin 1s linear infinite' }} />
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 16 }}>
            {users.map(u => (
              <div key={u.id} className="card" style={{ padding: '18px 20px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: '50%',
                    background: ROLE_COLOR[u.role] || '#888',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#000', fontWeight: 700, fontSize: '1rem', flexShrink: 0,
                  }}>
                    {u.name[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.name}</div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--genius-text-muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</div>
                  </div>
                  <span style={{
                    fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                    background: `${ROLE_COLOR[u.role]}22`, color: ROLE_COLOR[u.role],
                    border: `1px solid ${ROLE_COLOR[u.role]}44`, whiteSpace: 'nowrap',
                  }}>
                    {ROLE_LABEL[u.role]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
