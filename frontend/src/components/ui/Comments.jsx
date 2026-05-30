import { useState, useEffect, useRef } from 'react';
import { commentsAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { Send, Trash2, Loader2, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ROLE_COLOR = { ADMIN: '#F04E00', COLLABORATOR: '#2563EB', CLIENT: '#16A34A' };

function renderContent(text) {
  // Realça @menções
  return text.replace(/@([a-zA-ZÀ-ú\s]+?)(?=\s|$|[^a-zA-ZÀ-ú\s])/g,
    (_, name) => `<span style="color:#F04E00;font-weight:600">@${name}</span>`
  );
}

export default function Comments({ activityId }) {
  const { user, isCollaborator } = useAuth();
  const [comments, setComments] = useState([]);
  const [content, setContent]   = useState('');
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { load(); }, [activityId]);

  async function load() {
    try {
      const { data } = await commentsAPI.list(activityId);
      setComments(data.comments);
    } finally { setLoading(false); }
  }

  async function handleSend(e) {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const { data } = await commentsAPI.create(activityId, content);
      setComments(prev => [...prev, data.comment]);
      setContent('');
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } finally { setSending(false); }
  }

  async function handleDelete(id) {
    if (!confirm('Excluir comentário?')) return;
    await commentsAPI.delete(activityId, id);
    setComments(prev => prev.filter(c => c.id !== id));
  }

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <MessageSquare size={16} style={{ color: '#F04E00' }} />
        <span style={{ fontWeight: 700, fontSize: '0.9rem', color: '#111827' }}>
          Comentários {comments.length > 0 && <span style={{ color: '#9CA3AF', fontWeight: 400 }}>({comments.length})</span>}
        </span>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
          <Loader2 size={20} style={{ color: '#F04E00', animation: 'spin 1s linear infinite' }} />
        </div>
      ) : (
        <div style={{ maxHeight: 320, overflowY: 'auto', marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {comments.length === 0 ? (
            <p style={{ color: '#9CA3AF', fontSize: '0.82rem', textAlign: 'center', padding: '16px 0' }}>
              Nenhum comentário ainda. Seja o primeiro!
            </p>
          ) : (
            comments.map(c => (
              <div key={c.id} style={{
                display: 'flex', gap: 10, alignItems: 'flex-start',
                background: c.author.id === user?.id ? '#FFF3EE' : '#F9FAFB',
                borderRadius: 10, padding: '10px 12px',
                border: `1px solid ${c.author.id === user?.id ? '#FECACA' : '#E5E7EB'}`,
              }}>
                <div style={{
                  width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                  background: ROLE_COLOR[c.author.role] || '#9CA3AF',
                  color: '#fff', fontWeight: 700, fontSize: '0.8rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  {c.author.name[0].toUpperCase()}
                </div>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: '#111827' }}>{c.author.name}</span>
                    <span style={{ fontSize: '0.7rem', color: '#9CA3AF' }}>
                      {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                  <p
                    style={{ fontSize: '0.85rem', color: '#374151', lineHeight: 1.6, margin: 0 }}
                    dangerouslySetInnerHTML={{ __html: renderContent(c.content) }}
                  />
                </div>
                {(c.author.id === user?.id || user?.role === 'ADMIN') && (
                  <button onClick={() => handleDelete(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#D1D5DB', padding: 2, flexShrink: 0 }}
                    onMouseEnter={e => e.currentTarget.style.color = '#DC2626'}
                    onMouseLeave={e => e.currentTarget.style.color = '#D1D5DB'}>
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      )}

      {isCollaborator && (
        <form onSubmit={handleSend} style={{ display: 'flex', gap: 8 }}>
          <input
            className="input"
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder="Escreva um comentário... use @nome para mencionar"
            style={{ flex: 1, fontSize: '0.85rem', border: '1.5px solid #E5E7EB' }}
          />
          <button type="submit" disabled={sending || !content.trim()} className="btn btn-primary" style={{ padding: '0 16px', flexShrink: 0 }}>
            {sending ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={15} />}
          </button>
        </form>
      )}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
