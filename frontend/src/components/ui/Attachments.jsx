import { useState, useEffect } from 'react';
import { attachmentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Paperclip, Plus, Trash2, Loader2, ExternalLink, Image, FileText, Link, Video } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TYPE_CONFIG = {
  IMAGE:    { icon: Image,    color: '#7C3AED', label: 'Imagem'    },
  DOCUMENT: { icon: FileText, color: '#2563EB', label: 'Documento' },
  LINK:     { icon: Link,     color: '#16A34A', label: 'Link'      },
  VIDEO:    { icon: Video,    color: '#DC2626', label: 'Vídeo'     },
};

export default function Attachments({ activityId }) {
  const { user, isCollaborator } = useAuth();
  const [attachments, setAttachments] = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving,   setSaving]   = useState(false);
  const [form, setForm] = useState({ name: '', url: '', type: 'DOCUMENT', description: '' });

  useEffect(() => { load(); }, [activityId]);

  async function load() {
    try {
      const { data } = await attachmentAPI.list(activityId);
      setAttachments(data.attachments);
    } finally { setLoading(false); }
  }

  async function handleAdd(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await attachmentAPI.create(activityId, form);
      setShowForm(false);
      setForm({ name: '', url: '', type: 'DOCUMENT', description: '' });
      load();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao adicionar anexo.');
    } finally { setSaving(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Remover este anexo?')) return;
    await attachmentAPI.delete(activityId, id);
    setAttachments(prev => prev.filter(a => a.id !== id));
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Paperclip size={16} style={{ color: '#F04E00' }} />
          <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
            Anexos e Evidências {attachments.length > 0 && <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({attachments.length})</span>}
          </span>
        </div>
        {isCollaborator && (
          <button onClick={() => setShowForm(!showForm)} className="btn btn-ghost" style={{ fontSize: '0.78rem', padding: '5px 12px' }}>
            <Plus size={13} /> Adicionar
          </button>
        )}
      </div>

      {showForm && (
        <div style={{ background: '#F9FAFB', border: '1px solid #E5E7EB', borderRadius: 10, padding: 14, marginBottom: 14 }}>
          <form onSubmit={handleAdd} style={{ display: 'grid', gap: 10 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Nome *</label>
                <input className="input" placeholder="Ex: Foto da entrega" required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} style={{ border: '1.5px solid #E5E7EB', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Tipo</label>
                <select className="input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} style={{ border: '1.5px solid #E5E7EB', fontSize: '0.85rem' }}>
                  <option value="DOCUMENT">Documento</option>
                  <option value="IMAGE">Imagem</option>
                  <option value="LINK">Link</option>
                  <option value="VIDEO">Vídeo</option>
                </select>
              </div>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>URL / Link *</label>
              <input className="input" type="url" placeholder="https://drive.google.com/..." required value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} style={{ border: '1.5px solid #E5E7EB', fontSize: '0.85rem' }} />
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 }}>Descrição</label>
              <input className="input" placeholder="Descrição do arquivo..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} style={{ border: '1.5px solid #E5E7EB', fontSize: '0.85rem' }} />
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowForm(false)} className="btn btn-ghost" style={{ fontSize: '0.82rem' }}>Cancelar</button>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ fontSize: '0.82rem' }}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 16 }}><Loader2 size={18} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} /></div>
      ) : attachments.length === 0 ? (
        <p style={{ fontSize: '0.82rem', color: '#9CA3AF', textAlign: 'center', padding: '12px 0' }}>Nenhum anexo. Adicione fotos, documentos ou links de evidência.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 10 }}>
          {attachments.map(att => {
            const cfg = TYPE_CONFIG[att.type] || TYPE_CONFIG.DOCUMENT;
            const Icon = cfg.icon;
            return (
              <div key={att.id} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '12px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <div style={{ width: 36, height: 36, borderRadius: 8, background: `${cfg.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Icon size={18} style={{ color: cfg.color }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{att.name}</div>
                  {att.description && <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: 2 }}>{att.description}</div>}
                  <div style={{ fontSize: '0.7rem', color: '#9CA3AF', marginTop: 3 }}>
                    {att.uploadedBy.name} · {format(new Date(att.createdAt), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0 }}>
                  <a href={att.url} target="_blank" rel="noreferrer" style={{ color: '#6B7280', display: 'flex', padding: 4 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F04E00'}
                    onMouseLeave={e => e.currentTarget.style.color = '#6B7280'}>
                    <ExternalLink size={14} />
                  </a>
                  {(att.uploadedBy.id === user?.id || user?.role === 'ADMIN') && (
                    <button onClick={() => handleDelete(att.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 4, display: 'flex' }}
                      onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                      onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}>
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
