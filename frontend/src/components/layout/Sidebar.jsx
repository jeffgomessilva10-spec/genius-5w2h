import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, FolderKanban, Users, LogOut } from 'lucide-react';
import NotificationBell from '../ui/NotificationBell';

export default function Sidebar() {
  const { user, logout, isCollaborator, isAdmin } = useAuth();
  const navigate = useNavigate();

  function handleLogout() { logout(); navigate('/login'); }

  const links = isCollaborator
    ? [
        { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { to: '/projects',  icon: FolderKanban,   label: 'Projetos'  },
        ...(isAdmin ? [{ to: '/users', icon: Users, label: 'Usuários' }] : []),
      ]
    : [{ to: '/client', icon: LayoutDashboard, label: 'Meus Projetos' }];

  return (
    <aside style={{
      width: 240,
      minHeight: '100vh',
      background: '#111827',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
      position: 'sticky',
      top: 0,
      height: '100vh',
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <img src="/logo-branca.png" alt="Genius Consultoria" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>
          Menu
        </div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 12px',
            borderRadius: 8,
            marginBottom: 2,
            color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
            background: isActive ? '#F04E00' : 'transparent',
            fontWeight: isActive ? 600 : 400,
            fontSize: '0.875rem',
            transition: 'all 0.15s',
            textDecoration: 'none',
          })}
          onMouseEnter={e => { if (!e.currentTarget.style.background.includes('F04E00')) e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { if (!e.currentTarget.style.background.includes('F04E00')) e.currentTarget.style.background = 'transparent'; }}
          >
            <Icon size={17} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Rodapé: usuário + notificações */}
      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ marginBottom: 12 }}>
          <NotificationBell />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%',
            background: '#F04E00',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0,
          }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user?.name}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'COLLABORATOR' ? 'Colaborador' : 'Cliente'}
            </div>
          </div>
          <button onClick={handleLogout} title="Sair" style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'rgba(255,255,255,0.35)', padding: 4,
            display: 'flex', alignItems: 'center', borderRadius: 6,
            transition: 'color 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.color = '#F04E00'}
          onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}
          >
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
