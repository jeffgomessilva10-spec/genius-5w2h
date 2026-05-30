import { useState } from 'react';
import Sidebar from '../components/layout/Sidebar';
import { useAuth } from '../context/AuthContext';
import { useIsMobile } from '../hooks/useIsMobile';
import { Eye, EyeOff, Save, Loader2, CheckCircle2, User, Mail, Phone, Shield } from 'lucide-react';
import api from '../services/api';

const ROLE_LABEL = { ADMIN: 'Administrador', COLLABORATOR: 'Colaborador', CLIENT: 'Cliente', EXECUTIVE: 'Executivo' };
const ROLE_COLOR = { ADMIN: '#F04E00', COLLABORATOR: '#2563EB', CLIENT: '#16A34A', EXECUTIVE: '#7C3AED' };

export default function ProfilePage() {
  const { user, login } = useAuth();
  const isMobile = useIsMobile();
  const [saving,   setSaving]   = useState(false);
  const [success,  setSuccess]  = useState('');
  const [error,    setError]    = useState('');
  const [showOld,  setShowOld]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [showConf, setShowConf] = useState(false);

  const [nameForm, setNameForm] = useState({ name: user?.name || '' });
  const [pwdForm,  setPwdForm]  = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });

  async function handleUpdateName(e) {
    e.preventDefault();
    if (!nameForm.name.trim()) return;
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.put('/users/me', { name: nameForm.name.trim() });
      setSuccess('Nome atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao atualizar nome.');
    } finally { setSaving(false); }
  }

  async function handleChangePassword(e) {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      setError('As senhas não coincidem.'); return;
    }
    if (pwdForm.newPassword.length < 6) {
      setError('A nova senha deve ter pelo menos 6 caracteres.'); return;
    }
    setSaving(true); setError(''); setSuccess('');
    try {
      await api.put('/users/me', { password: pwdForm.newPassword });
      setSuccess('Senha alterada com sucesso!');
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setTimeout(() => setSuccess(''), 4000);
    } catch (err) {
      setError(err.response?.data?.error || 'Erro ao alterar senha.');
    } finally { setSaving(false); }
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#F3F4F6' }}>
      <Sidebar />
      <main id="main-content" style={{ flex: 1, overflowY: 'auto' }}>
        {/* Topbar */}
        <header style={{ background: '#fff', borderBottom: '1px solid #E5E7EB', padding: '0 32px', display: 'flex', alignItems: 'center', height: 64, position: 'sticky', top: 0, zIndex: 10 }}>
          <div>
            <h1 style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Meu Perfil</h1>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF' }}>Gerencie suas informações e senha</p>
          </div>
        </header>

        <div style={{ padding: isMobile ? 16 : '28px 32px', maxWidth: 680 }}>

          {/* Avatar + info */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px 28px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)', display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: ROLE_COLOR[user?.role] || '#F04E00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '1.6rem', flexShrink: 0 }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: '#111827' }}>{user?.name}</div>
              <div style={{ fontSize: '0.85rem', color: '#6B7280', marginTop: 3 }}>{user?.email}</div>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 99, background: `${ROLE_COLOR[user?.role]}15`, color: ROLE_COLOR[user?.role], border: `1px solid ${ROLE_COLOR[user?.role]}33`, display: 'inline-block', marginTop: 6 }}>
                <Shield size={11} style={{ display: 'inline', marginRight: 4 }} />
                {ROLE_LABEL[user?.role] || user?.role}
              </span>
            </div>
          </div>

          {/* Feedback */}
          {success && (
            <div style={{ background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8, color: '#16A34A', fontWeight: 600, fontSize: '0.85rem' }}>
              <CheckCircle2 size={16} /> {success}
            </div>
          )}
          {error && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, padding: '12px 16px', marginBottom: 16, color: '#DC2626', fontWeight: 600, fontSize: '0.85rem' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Atualizar nome */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px 28px', marginBottom: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
              <User size={16} style={{ color: '#F04E00' }} /> Informações pessoais
            </h2>
            <form onSubmit={handleUpdateName}>
              <div style={{ marginBottom: 14 }}>
                <label htmlFor="name" style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>Nome completo</label>
                <input id="name" className="input" value={nameForm.name} onChange={e => setNameForm({ name: e.target.value })} style={{ border: '1.5px solid #E5E7EB' }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>E-mail</label>
                <input className="input" value={user?.email || ''} disabled style={{ border: '1.5px solid #E5E7EB', background: '#F9FAFB', color: '#9CA3AF' }} />
                <p style={{ fontSize: '0.72rem', color: '#9CA3AF', marginTop: 4 }}>O e-mail não pode ser alterado.</p>
              </div>
              <button type="submit" disabled={saving} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Save size={14} /> Salvar nome</>}
              </button>
            </form>
          </div>

          {/* Alterar senha */}
          <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 14, padding: '24px 28px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
            <h2 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#111827', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8 }}>
              <Shield size={16} style={{ color: '#F04E00' }} /> Alterar senha
            </h2>
            <p style={{ fontSize: '0.78rem', color: '#9CA3AF', marginBottom: 16 }}>A nova senha deve ter pelo menos 6 caracteres.</p>
            <form onSubmit={handleChangePassword}>
              {[
                { id: 'newPassword',     label: 'Nova senha *',       show: showNew,  setShow: setShowNew,  val: pwdForm.newPassword,      key: 'newPassword' },
                { id: 'confirmPassword', label: 'Confirmar senha *',  show: showConf, setShow: setShowConf, val: pwdForm.confirmPassword,  key: 'confirmPassword' },
              ].map(f => (
                <div key={f.id} style={{ marginBottom: 14 }}>
                  <label htmlFor={f.id} style={{ fontSize: '0.78rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: 5 }}>{f.label}</label>
                  <div style={{ position: 'relative' }}>
                    <input id={f.id} className="input" type={f.show ? 'text' : 'password'} required value={f.val}
                      onChange={e => setPwdForm({ ...pwdForm, [f.key]: e.target.value })}
                      style={{ border: '1.5px solid #E5E7EB', paddingRight: 42 }} />
                    <button type="button" onClick={() => f.setShow(!f.show)} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}>
                      {f.show ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              ))}

              {/* Indicador de força da senha */}
              {pwdForm.newPassword && (
                <div style={{ marginBottom: 14 }}>
                  {[
                    { ok: pwdForm.newPassword.length >= 8,     label: 'Mínimo 8 caracteres' },
                    { ok: /[A-Z]/.test(pwdForm.newPassword),   label: 'Letra maiúscula' },
                    { ok: /[0-9]/.test(pwdForm.newPassword),   label: 'Número' },
                    { ok: /[!@#$%^&*]/.test(pwdForm.newPassword), label: 'Caractere especial' },
                  ].map(r => (
                    <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.75rem', color: r.ok ? '#16A34A' : '#9CA3AF', marginBottom: 3 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: r.ok ? '#16A34A' : '#D1D5DB', flexShrink: 0 }} />
                      {r.label}
                    </div>
                  ))}
                </div>
              )}

              <button type="submit" disabled={saving || !pwdForm.newPassword || !pwdForm.confirmPassword} className="btn btn-primary" style={{ fontSize: '0.85rem' }}>
                {saving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <><Shield size={14} /> Alterar senha</>}
              </button>
            </form>
          </div>

        </div>
      </main>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
