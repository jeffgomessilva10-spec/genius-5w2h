import { useState, useEffect } from 'react';
import { timeEntryAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Clock, Plus, Trash2, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function TimeTracker({ activityId, plannedHours }) {
  const { user } = useAuth();
  const [entries,    setEntries]    = useState([]);
  const [totalHours, setTotalHours] = useState(0);
  const [loading,    setLoading]    = useState(true);
  const [showForm,   setShowForm]   = useState(false);
  const [saving,     setSaving]     = useState(false);
  const [form, setForm] = useState({ hours: '', date: new Date().toISOString().slice(0, 10), description: '' });

  useEffect(() => { load(); }, [activityId]);

  async function load() {
    try {
      const { data } = await timeEntryAPI.list(activityId);
      setEntries(data.entries);
      setTotalHours(data.totalHours);
    } finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await timeEntryAPI.create(activityId, form);
      setShowForm(false);
      setForm({ hours: '', date: new Date().toISOString().slice(0, 10), description: '' });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar horas.');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    await timeEntryAPI.delete(activityId, id);
    load();
  }

  const pct = plannedHours ? Math.min(Math.round((totalHours / Number(plannedHours)) * 100), 100) : null;
  const over = plannedHours && totalHours > Number(plannedHours);

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Clock size={16} style={{ color: '#F04E00' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>Apontamento de Horas</span>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
          <Plus size={13} /> Registrar
        </button>
      </div>

      {/* Barra de progresso de horas */}
      {plannedHours && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: '#6B7280', marginBottom: 5 }}>
            <span>{totalHours}h realizadas</span>
            <span style={{ color: over ? '#DC2626' : '#374151', fontWeight: over ? 700 : 400 }}>
              {Number(plannedHours)}h planejadas {over && '⚠️ excedido'}
            </span>
          </div>
          <div style={{ height: 8, background: '#E5E7EB', borderRadius: 99, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pct}%`, background: over ? '#DC2626' : '#F04E00', borderRadius: 99, transition: 'width 0.4s' }} />
          </div>
          <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 3 }}>{pct}% do planejado</div>
        </div>
      )}

      {showForm && (
        <form onSubmit={handleAdd} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 14, background: '#F9FAFB', borderRadius: 10, padding: 14, border: '1px solid #E5E7EB' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Horas *</label>
            <input className="input" type="number" min="0.25" step="0.25" placeholder="Ex: 2.5" required value={form.hours} onChange={e => setForm({ ...form, hours: e.target.value })} style={{ border: '1.5px solid #E5E7EB', fontSize: '0.85rem' }} />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Data *</label>
            <input className="input" type="date" required value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} style={{ border: '1.5px solid #E5E7EB', fontSize: '0.85rem' }} />
          </div>
          <div style={{ gridColumn: '1 / -1' }}>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Descrição</label>
            <input className="input" placeholder="O que foi feito?" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ border: '1.5px solid #E5E7EB', fontSize: '0.85rem' }} />
          </div>
          <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>Cancelar</button>
            <button type="submit" disabled={saving} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
              {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Salvar'}
            </button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Loader2 size={18} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} /></div>
      ) : entries.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Nenhuma hora registrada.</p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {entries.map(e => (
            <div key={e.id} style={{ display: 'flex', alignItems: 'center', gap: 10, background: '#F9FAFB', borderRadius: 8, padding: '8px 12px', border: '1px solid #E5E7EB' }}>
              <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#F04E00', color: '#fff', fontWeight: 700, fontSize: '0.7rem', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                {e.user.name[0].toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#111827' }}>{e.user.name} · <span style={{ color: '#F04E00' }}>{Number(e.hours)}h</span></div>
                <div style={{ fontSize: '0.72rem', color: '#9CA3AF' }}>
                  {format(new Date(e.date), "dd 'de' MMM", { locale: ptBR })}
                  {e.description && ` · ${e.description}`}
                </div>
              </div>
              {(e.user.id === user?.id || user?.role === 'ADMIN') && (
                <button onClick={() => handleDelete(e.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 4 }}
                  onMouseEnter={ev => ev.currentTarget.style.color = '#DC2626'}
                  onMouseLeave={ev => ev.currentTarget.style.color = '#D1D5DB'}>
                  <Trash2 size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
