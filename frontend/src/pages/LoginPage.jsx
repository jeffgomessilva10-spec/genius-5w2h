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

  if (user) { navigate('/'); return null; }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const u = await login(email, password);
      navigate(u.role === 'CLIENT' ? '/client' : '/dashboard', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Credenciais inválidas. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: 'Inter, sans-serif', flexDirection: window.innerWidth < 768 ? 'column' : 'row' }}>

      {/* ── Painel esquerdo ── */}
      <div style={{
        flex: window.innerWidth < 768 ? 'none' : 1,
        display: window.innerWidth < 768 ? 'none' : 'flex',
        background: '#111827',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '48px 56px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decoração geométrica */}
        <div style={{
          position: 'absolute', top: -120, right: -120,
          width: 480, height: 480, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(240,78,0,0.18) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, left: -60,
          width: 360, height: 360, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(240,78,0,0.08) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        {/* Linha decorativa laranja */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          height: 3, background: 'linear-gradient(90deg, #F04E00, transparent)',
        }} />

        {/* Logo */}
        <div style={{ position: 'relative', zIndex: 1 }}>
          <img src="/logo-branca.png" alt="Genius Consultoria" style={{ height: 38, width: 'auto', objectFit: 'contain' }} />
        </div>

        {/* Conteúdo central */}
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 420 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: 'rgba(240,78,0,0.12)', border: '1px solid rgba(240,78,0,0.25)',
            borderRadius: 999, padding: '5px 14px', marginBottom: 28,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F04E00' }} />
            <span style={{ fontSize: '0.75rem', color: '#F04E00', fontWeight: 600, letterSpacing: '0.5px' }}>
              METODOLOGIA 5W2H
            </span>
          </div>

          <h1 style={{
            fontSize: '2.6rem', fontWeight: 800, lineHeight: 1.15,
            color: '#fff', marginBottom: 20, letterSpacing: '-0.02em',
          }}>
            Gestão de Projetos{' '}
            <span style={{ color: '#F04E00' }}>inteligente</span>
          </h1>

          <p style={{
            color: 'rgba(255,255,255,0.55)', fontSize: '1rem', lineHeight: 1.75, marginBottom: 40,
          }}>
            Acompanhe o progresso dos seus projetos com metodologia estruturada, alertas automáticos e visão executiva em tempo real.
          </p>

          {/* Pilares 5W2H */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {[
              { label: 'O quê', desc: 'What' },
              { label: 'Por quê', desc: 'Why' },
              { label: 'Quem', desc: 'Who' },
              { label: 'Onde', desc: 'Where' },
              { label: 'Como', desc: 'How' },
              { label: 'Quanto', desc: 'How much' },
              { label: 'Quando', desc: 'When' },
            ].map(t => (
              <span key={t.label} style={{
                padding: '5px 13px', borderRadius: 999,
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.6)',
                fontSize: '0.78rem', fontWeight: 500,
              }}>{t.label}</span>
            ))}
          </div>
        </div>

        {/* Rodapé */}
        <div style={{ position: 'relative', zIndex: 1, color: 'rgba(255,255,255,0.25)', fontSize: '0.75rem' }}>
          © {new Date().getFullYear()} Genius Consultoria · Genialidade que demonstra resultados
        </div>
      </div>

      {/* ── Painel direito – formulário ── */}
      <div style={{
        width: window.innerWidth < 768 ? '100%' : 460,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: window.innerWidth < 768 ? '32px 24px' : '48px 48px',
        background: window.innerWidth < 768 ? '#111827' : '#F9FAFB',
        minHeight: window.innerWidth < 768 ? '100vh' : 'auto',
      }}>
        <div style={{ width: '100%', maxWidth: 360 }}>
          {/* Cabeçalho */}
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: '1.6rem', fontWeight: 700, color: '#111827', marginBottom: 6, letterSpacing: '-0.02em' }}>
              Bem-vindo de volta
            </h2>
            <p style={{ color: '#6B7280', fontSize: '0.875rem' }}>
              Faça login para acessar seu painel
            </p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 18 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                E-mail
              </label>
              <input
                className="input"
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoFocus
                style={{ background: '#fff', border: '1.5px solid #E5E7EB', color: '#111827' }}
              />
            </div>

            <div style={{ marginBottom: 28 }}>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 600, color: '#374151', marginBottom: 6 }}>
                Senha
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  className="input"
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  style={{ paddingRight: 44, background: '#fff', border: '1.5px solid #E5E7EB', color: '#111827' }}
                />
                <button type="button" onClick={() => setShowPwd(!showPwd)} style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF',
                }}>
                  {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div style={{
                background: '#FEF2F2', border: '1px solid #FECACA',
                borderRadius: 8, padding: '10px 14px', marginBottom: 20,
                color: '#DC2626', fontSize: '0.85rem', fontWeight: 500,
              }}>
                {error}
              </div>
            )}

            <button type="submit" disabled={loading} className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '13px', fontSize: '0.9rem', borderRadius: 10 }}>
              {loading
                ? <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                : 'Entrar'}
            </button>
          </form>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
