// src/pages/LoginPage.jsx
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  // Redireciona se já logado
  if (user) { navigate('/'); return null; }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const u = await login(email, password);
      navigate(u.role === 'CLIENT' ? '/client' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao fazer login.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--genius-black)',
      display: 'flex',
    }}>
      {/* Painel esquerdo – identidade visual */}
      <div style={{
        flex: 1,
        background: 'linear-gradient(135deg, #0D0D0D 0%, #1a1200 50%, #0D0D0D 100%)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'flex-start',
        padding: '60px 64px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decoração */}
        <div style={{
          position: 'absolute', top: -100, right: -100,
          width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,197,0,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -80, left: -80,
          width: 300, height: 300, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(245,197,0,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative', zIndex: 1 }}>
          {/* Logo */}
          <div style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '3.5rem',
            letterSpacing: '4px',
            color: 'var(--genius-gold)',
            lineHeight: 1,
          }}>GENIUS</div>
          <div style={{
            fontSize: '0.85rem',
            letterSpacing: '3px',
            textTransform: 'uppercase',
            color: 'var(--genius-text-muted)',
            marginBottom: 40,
          }}>CONSULTORIA</div>

          <h1 style={{
            fontFamily: "'Bebas Neue', sans-serif",
            fontSize: '2.8rem',
            lineHeight: 1.1,
            color: 'var(--genius-text)',
            maxWidth: 380,
            marginBottom: 20,
          }}>
            GESTÃO DE PROJETOS{' '}
            <span style={{ color: 'var(--genius-gold)' }}>5W2H</span>
          </h1>

          <p style={{
            color: 'var(--genius-text-muted)',
            fontSize: '1rem',
            maxWidth: 340,
            lineHeight: 1.7,
          }}>
            Acompanhe o progresso dos seus projetos com metodologia estruturada, alertas automáticos e visão em tempo real.
          </p>

          {/* Tags de metodologia */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 32 }}>
            {['O quê', 'Por quê', 'Quem', 'Onde', 'Como', 'Quanto', 'Quando'].map((tag) => (
              <span key={tag} style={{
                padding: '4px 12px', borderRadius: '999px',
                background: 'rgba(245,197,0,0.08)',
                border: '1px solid rgba(245,197,0,0.2)',
                color: 'var(--genius-gold)',
                fontSize: '0.78rem', fontWeight: 600,
              }}>{tag}</span>
            ))}
          </div>
        </div>
      </div>

      {/* Painel direito – formulário */}
      <div style={{
        width: 440,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '40px',
        background: 'var(--genius-dark)',
        borderLeft: '1px solid var(--genius-border)',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          <h2 style={{ fontFamily: "'Outfit', sans-serif", fontWeight: 700, fontSize: '1.5rem', marginBottom: 6 }}>
            Bem-vindo de volta
          </h2>
          <p style={{ color: 'var(--genius-text-muted)', fontSize: '0.88rem', marginBottom: 32 }}>
            Faça login para acessar seu painel
          </p>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', fontSize: '0.83rem', color: 'var(--genius-text-muted)', marginBottom: 6 }}>
                E-mail
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoFocus
              />
            </div>

            <div style={{ marginBottom: 24 }}>
              <label style={{ display: 'block', fontSize: '0.83rem', color: 'var(--genius-text-muted)', marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: 44 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  style={{
                    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                    background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--genius-text-muted)',
                  }}
                >
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
                borderRadius: 8, padding: '10px 14px', marginBottom: 16,
                color: '#F87171', fontSize: '0.85rem',
              }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.95rem' }}
            >
              {loading ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> : 'Entrar'}
            </button>
          </form>

          <p style={{ marginTop: 32, textAlign: 'center', fontSize: '0.78rem', color: 'var(--genius-text-subtle)' }}>
            © {new Date().getFullYear()} Genius Consultoria · Genialidade que demonstra resultados
          </p>
        </div>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
