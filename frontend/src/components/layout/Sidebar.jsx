// src/components/layout/Sidebar.jsx
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, FolderKanban, Bell, LogOut,
  ChevronRight, Users, Settings,
} from 'lucide-react';
import NotificationBell from '../ui/NotificationBell';

export default function Sidebar() {
  const { user, logout, isCollaborator, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  const links = isCollaborator
    ? [
        { to: '/dashboard',  icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/projects',   icon: FolderKanban,   label: 'Projetos'  },
        ...(isAdmin ? [{ to: '/users', icon: Users, label: 'Usuários' }] : []),
      ]
    : [
        { to: '/client', icon: LayoutDashboard, label: 'Meus Projetos' },
      ];

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: 'var(--genius-dark)',
      borderRight: '1px solid var(--genius-border)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      flexShrink: 0,
    }}>
      {/* Logo */}
      <div style={{
        padding: '28px 24px',
        borderBottom: '1px solid var(--genius-border)',
      }}>
        <div style={{
          fontFamily: "'Bebas Neue', sans-serif",
          fontSize: '1.6rem',
          letterSpacing: '2px',
          color: 'var(--genius-gold)',
          lineHeight: 1,
        }}>GENIUS</div>
        <div style={{ color: 'var(--genius-text-muted)', fontSize: '0.72rem', letterSpacing: '1.5px', textTransform: 'uppercase', marginTop: 2 }}>
          Consultoria
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px' }}>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '10px 12px',
              borderRadius: 8,
              marginBottom: 4,
              color: isActive ? 'var(--genius-gold)' : 'var(--genius-text-muted)',
              background: isActive ? 'rgba(245,197,0,0.08)' : 'transparent',
              fontWeight: isActive ? 600 : 400,
              fontSize: '0.9rem',
              transition: 'all 0.15s',
              textDecoration: 'none',
            })}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuário + notificações */}
      <div style={{ padding: '16px', borderTop: '1px solid var(--genius-border)' }}>
        <NotificationBell />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 12 }}>
          <div style={{
            width: 36, height: 36, borderRadius: '50%',
            background: 'var(--genius-gold)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'var(--genius-black)', fontWeight: 700, fontSize: '0.9rem',
            flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '0.72rem', color: 'var(--genius-text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'COLLABORATOR' ? 'Colaborador' : 'Cliente'}
            </div>
          </div>
          <button onClick={handleLogout} title="Sair" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--genius-text-muted)', padding: 4,
            display: 'flex', alignItems: 'center',
          }}>
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </aside>
  );
}
