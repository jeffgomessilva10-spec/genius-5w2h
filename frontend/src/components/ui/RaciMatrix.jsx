import { useState, useEffect } from 'react';
import { raciAPI, usersAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Loader2, Plus, X } from 'lucide-react';

const RACI_CONFIG = {
  RESPONSIBLE: { label: 'R — Responsável', desc: 'Executa a atividade', color: '#2563EB', bg: '#EFF6FF' },
  ACCOUNTABLE: { label: 'A — Aprovador',   desc: 'Responsável final', color: '#F04E00', bg: '#FFF3EE' },
  CONSULTED:   { label: 'C — Consultado',  desc: 'Fornece informação', color: '#7C3AED', bg: '#F5F3FF' },
  INFORMED:    { label: 'I — Informado',   desc: 'Recebe atualizações', color: '#16A34A', bg: '#F0FDF4' },
};

export default function RaciMatrix({ activityId }) {
  const { isCollaborator } = useAuth();
  const [raci,    setRaci]    = useState([]);
  const [users,   setUsers]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding,  setAdding]  = useState(false);
  const [form,    setForm]    = useState({ userId: '', role: 'RESPONSIBLE' });

  useEffect(() => { load(); }, [activityId]);

  async function load() {
    try {
      const [raciRes, usersRes] = await Promise.all([
        raciAPI.list(activityId),
        usersAPI.list(),
      ]);
      setRaci(raciRes.data.raci);
      setUsers(usersRes.data.users);
    } finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!form.userId) return;
    try {
      await raciAPI.upsert(activityId, form);
      setAdding(false);
      setForm({ userId: '', role: 'RESPONSIBLE' });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao adicionar.');
    }
  }

  async function handleRemove(userId) {
    await raciAPI.remove(activityId, userId);
    setRaci(prev => prev.filter(r => r.userId !== userId));
  }

  const grouped = Object.keys(RACI_CONFIG).reduce((acc, role) => {
    acc[role] = raci.filter(r => r.role === role);
    return acc;
  }, {});

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}><Loader2 size={18} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} /></div>;

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
          Matriz RACI
        </div>
        {isCollaborator && (
          <button onClick={() => setAdding(!adding)} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
            <Plus size={13} /> Adicionar
          </button>
        )}
      </div>

      {adding && (
        <form onSubmit={handleAdd} style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
          <select className="input" value={form.userId} onChange={e => setForm({ ...form, userId: e.target.value })} style={{ flex: 1, minWidth: 160, fontSize: '0.85rem', border: '1.5px solid #E5E7EB' }} required>
            <option value="">Selecione o usuário</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="input" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ width: 160, fontSize: '0.85rem', border: '1.5px solid #E5E7EB' }}>
            {Object.entries(RACI_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <button type="submit" className="btn btn-primary" style={{ padding: '0 14px', fontSize: '0.82rem' }}>Salvar</button>
          <button type="button" onClick={() => setAdding(false)} className="btn btn-ghost" style={{ padding: '0 10px' }}><X size={14} /></button>
        </form>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {Object.entries(RACI_CONFIG).map(([role, cfg]) => (
          <div key={role} style={{ background: cfg.bg, border: `1px solid ${cfg.color}33`, borderRadius: 10, padding: '12px 14px' }}>
            <div style={{ fontWeight: 700, fontSize: '0.78rem', color: cfg.color, marginBottom: 2 }}>{cfg.label}</div>
            <div style={{ fontSize: '0.68rem', color: '#9CA3AF', marginBottom: 10 }}>{cfg.desc}</div>
            {grouped[role].length === 0 ? (
              <p style={{ fontSize: '0.75rem', color: '#D1D5DB', fontStyle: 'italic' }}>Nenhum</p>
            ) : (
              grouped[role].map(entry => (
                <div key={entry.id} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                  <div style={{ width: 24, height: 24, borderRadius: '50%', background: cfg.color, color: '#fff', fontSize: '0.7rem', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {entry.user.name[0].toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#374151', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{entry.user.name}</span>
                  {isCollaborator && (
                    <button onClick={() => handleRemove(entry.userId)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 2, flexShrink: 0 }}
                      onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                      onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        ))}
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
