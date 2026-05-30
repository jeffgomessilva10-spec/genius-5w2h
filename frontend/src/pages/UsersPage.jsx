import { useState, useEffect } from 'react';
import { usersAPI, authAPI } from '../services/api';
import Sidebar from '../components/layout/Sidebar';
import { Plus, Loader2, Trash2, Phone, Mail, Search, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useIsMobile } from '../hooks/useIsMobile';

const ROLE_LABEL = { ADMIN: 'Admin', COLLABORATOR: 'Colaborador', CLIENT: 'Cliente' };
const ROLE_COLOR = { ADMIN: '#F04E00', COLLABORATOR: '#2563EB', CLIENT: '#16A34A' };
const ROLE_BG    = { ADMIN: '#FFF3EE', COLLABORATOR: '#EFF6FF', CLIENT: '#F0FDF4' };

export default function UsersPage() {
  const { user: me } = useAuth();
  const isMobile = useIsMobile();
  const [users,    setUsers]    = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [showPwd,  setShowPwd]  = useState(false);
  const [search,   setSearch]   = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'COLLABORATOR', phone: '' });

  useEffect(() => { loadUsers(); }, []);

  async function loadUsers() {
    try {
      const { data } = await usersAPI.list();
      setUsers(data.users);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }

  async function handleCreate(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await authAPI.register(form);
      setShowForm(false);
      setForm({ name: '', email: '', password: '', role: 'COLLABORATOR', phone: '' });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao criar usuário.');
    } finally { setSaving(false); }
  }

  async function handleDelete(u) {
    if (!confirm(`Desativar o usuário "${u.name}"?\n\nEle perderá o acesso ao sistema.`)) return;
    try {
      await api.delete(`/users/${u.id}`);
      setUsers(prev => prev.filter(x => x.id !== u.id));
    } catch (err) {
      alert('Erro ao desativar usuário.');
    }
  }

  const filtered = users.filter(u => {
    const matchSearch = !search || u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase());
    const matchRole   = !roleFilter || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const counts = {
    total:        users.length,
    ADMIN:        users.filter(u => u.role === 'ADMIN').length,
    COLLABORATOR: users.filter(u => u.role === 'COLLABORATOR').length,
    CLIENT:       users.filter(u => u.role === 'CLIENT').length,
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>

        {/* Topbar */}
        <div style={{
          background: '#fff', borderBottom: '1px solid #E5E7EB',
          padding: '0 32px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', height: 64, position: 'sticky', top: 0, zIndex: 10,
        }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Gestão de Usuários</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>{users.length} usuário{users.length !== 1 ? 's' : ''} cadastrado{users.length !== 1 ? 's' : ''}</p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowForm(!showForm)} style={{ fontSize: '0.85rem' }}>
            <Plus size={15} /> Novo Usuário
          </button>
        </div>

        <div style={{ padding: '28px 32px' }}>

          {/* Cards resumo */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 24 }}>
            {[
              { label: 'Total', value: counts.total,        color: '#F04E00', bg: '#FFF3EE' },
              { label: 'Admins', value: counts.ADMIN,       color: '#F04E00', bg: '#FFF3EE' },
              { label: 'Colaboradores', value: counts.COLLABORATOR, color: '#2563EB', bg: '#EFF6FF' },
              { label: 'Clientes', value: counts.CLIENT,    color: '#16A34A', bg: '#F0FDF4' },
            ].map(c => (
              <div key={c.label} style={{
                background: '#fff', borderRadius: 12, padding: '16px 20px',
                border: '1px solid #E5E7EB', borderTop: `3px solid ${c.color}`,
                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
              }}>
                <div style={{ fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>{c.label}</div>
                <div style={{ fontSize: '1.8rem', fontWeight: 800, color: c.color }}>{c.value}</div>
              </div>
            ))}
          </div>

          {/* Formulário novo usuário */}
          {showForm && (
            <div style={{
              background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
              padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 700, marginBottom: 16, color: '#111827' }}>Novo Usuário</h3>
              <form onSubmit={handleCreate}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Nome completo *</label>
                    <input className="input" placeholder="João Silva" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>E-mail *</label>
                    <input className="input" type="email" placeholder="joao@email.com" required value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Senha *</label>
                    <div style={{ position: 'relative' }}>
                <input className="input" type={showPwd ? 'text' : 'password'} placeholder="Mínimo 6 caracteres" required value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} style={{ border: '1.5px solid #E5E7EB', paddingRight: 40 }} />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>WhatsApp</label>
                    <input className="input" type="tel" placeholder="+5511999999999" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Papel *</label>
                    <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }}>
                      <option value="COLLABORATOR">Colaborador — acessa projetos vinculados</option>
                      <option value="CLIENT">Cliente — vê apenas indicadores do projeto</option>
                      <option value="ADMIN">Admin — acesso total</option>
                    </select>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={saving} style={{ minWidth: 120 }}>
                    {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : 'Criar Usuário'}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Filtros */}
          <div style={{
            background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12,
            padding: '12px 16px', marginBottom: 16,
            display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 180 }}>
              <Search size={14} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
              <input className="input" placeholder="Buscar por nome ou e-mail..."
                value={search} onChange={e => setSearch(e.target.value)}
                style={{ paddingLeft: 32, height: 36, fontSize: '0.83rem', border: '1px solid #E5E7EB', background: '#F9FAFB' }} />
            </div>
            {['', 'ADMIN', 'COLLABORATOR', 'CLIENT'].map(r => (
              <button key={r} onClick={() => setRoleFilter(r)} style={{
                padding: '6px 14px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 600,
                cursor: 'pointer', border: '1.5px solid',
                background: roleFilter === r ? '#F04E00' : '#fff',
                borderColor: roleFilter === r ? '#F04E00' : '#E5E7EB',
                color: roleFilter === r ? '#fff' : '#6B7280',
                transition: 'all 0.15s',
              }}>
                {r === '' ? 'Todos' : ROLE_LABEL[r]}
              </button>
            ))}
          </div>

          {/* Lista de usuários */}
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={28} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: 48, textAlign: 'center' }}>
              <p style={{ color: '#9CA3AF' }}>Nenhum usuário encontrado.</p>
            </div>
          ) : isMobile ? (
            /* Cards para mobile */
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(u => (
                <div key={u.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: ROLE_COLOR[u.role], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '1rem', flexShrink: 0 }}>
                      {u.name[0].toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>{u.name}</div>
                      <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: ROLE_BG[u.role], color: ROLE_COLOR[u.role] }}>
                        {ROLE_LABEL[u.role]}
                      </span>
                    </div>
                    {u.id !== me?.id && (
                      <button onClick={() => handleDelete(u)} style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 8, cursor: 'pointer', color: '#DC2626', padding: '8px', display: 'flex' }}>
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#6B7280', display: 'flex', flexDirection: 'column', gap: 4 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Mail size={12} /> {u.email}</div>
                    {u.phone && <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}><Phone size={12} /> {u.phone}</div>}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            /* Tabela para desktop */
            <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 1fr 80px', padding: '10px 20px', background: '#F9FAFB', borderBottom: '1px solid #E5E7EB', fontSize: '0.72rem', fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', letterSpacing: '0.6px' }}>
                <span>Nome</span><span>E-mail</span><span>WhatsApp</span><span>Papel</span><span style={{ textAlign: 'center' }}>Ações</span>
              </div>
              {filtered.map((u, i) => (
                <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1.2fr 1fr 80px', padding: '14px 20px', alignItems: 'center', borderBottom: i < filtered.length - 1 ? '1px solid #F3F4F6' : 'none', transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FAFAFA'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 36, height: 36, borderRadius: '50%', flexShrink: 0, background: ROLE_COLOR[u.role], color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: '0.85rem' }}>{u.name[0].toUpperCase()}</div>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{u.name}</div>
                      {u.id === me?.id && <div style={{ fontSize: '0.68rem', color: '#F04E00', fontWeight: 600 }}>Você</div>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', color: '#6B7280' }}><Mail size={13} style={{ flexShrink: 0 }} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{u.email}</span></div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.83rem', color: '#6B7280' }}><Phone size={13} style={{ flexShrink: 0 }} /><span>{u.phone || '—'}</span></div>
                  <div><span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: ROLE_BG[u.role], color: ROLE_COLOR[u.role], border: `1px solid ${ROLE_COLOR[u.role]}33` }}>{ROLE_LABEL[u.role]}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'center' }}>
                    {u.id !== me?.id ? (
                      <button onClick={() => handleDelete(u)} title="Desativar usuário" style={{ background: 'none', border: '1px solid #E5E7EB', borderRadius: 7, cursor: 'pointer', color: '#9CA3AF', padding: '6px 8px', display: 'flex', transition: 'all 0.15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background = '#FEF2F2'; e.currentTarget.style.borderColor = '#FECACA'; e.currentTarget.style.color = '#DC2626'; }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.borderColor = '#E5E7EB'; e.currentTarget.style.color = '#9CA3AF'; }}>
                        <Trash2 size={14} />
                      </button>
                    ) : <span style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>—</span>}
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
