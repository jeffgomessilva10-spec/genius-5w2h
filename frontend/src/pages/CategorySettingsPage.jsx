import { useState, useEffect } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { classificationAPI } from '../services/api';
import { useIsMobile } from '../hooks/useIsMobile';
import { Plus, Trash2, Loader2, Settings, CheckCircle2, Tag } from 'lucide-react';

const TYPE_CONFIG = {
  STRATEGIC:      { label: 'Categoria Estratégica', color: '#F04E00', bg: '#FFF3EE', hint: 'Ex: Estratégico, Projeto, Processo, Operacional' },
  LEAN_OBJECTIVE: { label: 'Objetivo Lean',         color: '#7C3AED', bg: '#F5F3FF', hint: 'Ex: Valor, Automação, Redução de Custo...' },
  AREA:           { label: 'Área',                  color: '#2563EB', bg: '#EFF6FF', hint: 'Ex: Comercial, Marketing, Financeiro...' },
};

export default function CategorySettingsPage() {
  const isMobile = useIsMobile();
  const [data,    setData]    = useState({ STRATEGIC: [], LEAN_OBJECTIVE: [], AREA: [] });
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [saving,  setSaving]  = useState('');
  const [forms,   setForms]   = useState({ STRATEGIC: '', LEAN_OBJECTIVE: '', AREA: '' });
  const [success, setSuccess] = useState('');

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const { data: res } = await classificationAPI.list();
      const g = { STRATEGIC: [], LEAN_OBJECTIVE: [], AREA: [] };
      (res.classifications || []).forEach(c => { if (g[c.type]) g[c.type].push(c); });
      setData(g);
    } finally { setLoading(false); }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      await classificationAPI.seed();
      await load();
      flash('Classificações padrão adicionadas com sucesso!');
    } finally { setSeeding(false); }
  }

  async function handleAdd(type) {
    const name = forms[type].trim();
    if (!name) return;
    setSaving(type);
    try {
      await classificationAPI.create({ type, name });
      setForms(f => ({ ...f, [type]: '' }));
      await load();
    } finally { setSaving(''); }
  }

  async function handleDelete(id) {
    if (!confirm('Desativar esta classificação?')) return;
    await classificationAPI.delete(id);
    await load();
  }

  function flash(msg) { setSuccess(msg); setTimeout(() => setSuccess(''), 3000); }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main style={{ flex: 1, overflowY: 'auto' }}>
        <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: isMobile ? '12px 16px' : '0 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', minHeight: 64, flexWrap: 'wrap', gap: 8, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827', display: 'flex', alignItems: 'center', gap: 8 }}>
              <Settings size={18} style={{ color: '#F04E00' }} /> Configurações de Categorias
            </h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Gerencie as classificações hierárquicas das atividades</p>
          </div>
          <button onClick={handleSeed} disabled={seeding} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>
            {seeding ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : '✨ Carregar padrões'}
          </button>
        </header>

        <div style={{ padding: isMobile ? 16 : '28px 32px', maxWidth: 900 }}>

          {success && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8, color: '#16A34A', fontWeight: 600, fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} /> {success}
            </div>
          )}

          <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 12, padding: '14px 18px', marginBottom: 24, fontSize: '0.82rem', color: '#1D4ED8' }}>
            <strong>Como funciona:</strong> Cada atividade pode ser classificada em 3 dimensões:
            <strong> Categoria Estratégica</strong> (o tipo da iniciativa),
            <strong> Objetivo Lean</strong> (o objetivo de melhoria) e
            <strong> Área</strong> (o setor responsável).
          </div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
              <Loader2 size={28} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3,1fr)', gap: 20 }}>
              {Object.entries(TYPE_CONFIG).map(([type, cfg]) => (
                <div key={type} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                  {/* Header */}
                  <div style={{ background: cfg.bg, padding: '14px 18px', borderBottom: `2px solid ${cfg.color}` }}>
                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: cfg.color, display: 'flex', alignItems: 'center', gap: 6 }}>
                      <Tag size={14} /> {cfg.label}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>{cfg.hint}</div>
                    <div style={{ fontSize: '0.7rem', fontWeight: 700, color: cfg.color, marginTop: 4 }}>{data[type].length} item(s)</div>
                  </div>

                  {/* Lista */}
                  <div style={{ padding: '12px 14px', maxHeight: 280, overflowY: 'auto' }}>
                    {data[type].length === 0 ? (
                      <p style={{ color: '#D1D5DB', fontSize: '0.8rem', textAlign: 'center', padding: '16px 0' }}>
                        Nenhuma classificação. <br />Clique em "Carregar padrões" ou adicione manualmente.
                      </p>
                    ) : (
                      data[type].map((item, i) => (
                        <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderBottom: i < data[type].length - 1 ? '1px solid #F3F4F6' : 'none' }}>
                          <div style={{ width: 22, height: 22, borderRadius: '50%', background: cfg.bg, border: `1px solid ${cfg.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, color: cfg.color, flexShrink: 0 }}>
                            {item.order}
                          </div>
                          <span style={{ flex: 1, fontSize: '0.85rem', color: '#374151', fontWeight: 500 }}>{item.name}</span>
                          <button onClick={() => handleDelete(item.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 2, display: 'flex', flexShrink: 0 }}
                            onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                            onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Formulário adicionar */}
                  <div style={{ padding: '10px 14px', borderTop: '1px solid #F3F4F6', display: 'flex', gap: 6 }}>
                    <input
                      className="input"
                      placeholder="Nova classificação..."
                      value={forms[type]}
                      onChange={e => setForms(f => ({ ...f, [type]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && handleAdd(type)}
                      style={{ flex: 1, fontSize: '0.82rem', border: '1.5px solid #E5E7EB', height: 34 }}
                    />
                    <button onClick={() => handleAdd(type)} disabled={saving === type || !forms[type].trim()} style={{ background: cfg.color, border: 'none', borderRadius: 7, cursor: 'pointer', color: '#fff', padding: '0 10px', display: 'flex', alignItems: 'center', height: 34 }}>
                      {saving === type ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />}
                    </button>
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
