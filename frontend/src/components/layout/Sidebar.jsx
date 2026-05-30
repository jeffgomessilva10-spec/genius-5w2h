import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { LayoutDashboard, FolderKanban, Users, LogOut, GanttChartSquare, Menu, X, FileText, Target, RefreshCw, TrendingUp, ShieldCheck } from 'lucide-react';
import NotificationBell from '../ui/NotificationBell';
import { useState, useEffect } from 'react';

export default function Sidebar() {
  const { user, logout, isCollaborator, isAdmin, isExecutive } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  function handleLogout() { logout(); navigate('/login'); }

  const links = isCollaborator
    ? [
        { to: '/dashboard',  icon: LayoutDashboard,  label: 'Operacional' },
        ...(isExecutive ? [{ to: '/executive', icon: TrendingUp, label: 'Executivo' }] : []),
        { to: '/projects',   icon: FolderKanban,     label: 'Projetos'    },
        { to: '/gantt',      icon: GanttChartSquare, label: 'Gantt'       },
        { to: '/documents',  icon: FileText,         label: 'Documentos'  },
        { to: '/okr',        icon: Target,           label: 'OKRs'        },
        { to: '/pdca',       icon: RefreshCw,        label: 'PDCA'        },
        { to: '/governance', icon: ShieldCheck,      label: 'Governança'  },
        ...(isAdmin ? [{ to: '/users', icon: Users, label: 'Usuários' }] : []),
      ]
    : [{ to: '/client', icon: LayoutDashboard, label: 'Meus Projetos' }];

  /* ── MOBILE: barra inferior + drawer ── */
  if (isMobile) {
    return (
      <>
        {/* Drawer overlay */}
        {mobileOpen && (
          <div
            onClick={() => setMobileOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 40,
            }}
          />
        )}

        {/* Drawer lateral */}
        <div style={{
          position: 'fixed', top: 0, left: 0, bottom: 0,
          width: 260, background: '#111827', zIndex: 50,
          transform: mobileOpen ? 'translateX(0)' : 'translateX(-100%)',
          transition: 'transform 0.25s ease',
          display: 'flex', flexDirection: 'column',
        }}>
          {/* Header drawer */}
          <div style={{ padding: '20px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <img src="/logo-branca.png" alt="Genius" style={{ height: 28, objectFit: 'contain' }} />
            <button onClick={() => setMobileOpen(false)} style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.5)', cursor: 'pointer' }}>
              <X size={20} />
            </button>
          </div>

          {/* Links */}
          <nav style={{ flex: 1, padding: '16px 12px' }}>
            <div style={{ fontSize: '0.65rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>Menu</div>
            {links.map(({ to, icon: Icon, label }) => (
              <NavLink key={to} to={to} onClick={() => setMobileOpen(false)}
                style={({ isActive }) => ({
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '11px 12px', borderRadius: 8, marginBottom: 4,
                  color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                  background: isActive ? '#F04E00' : 'transparent',
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.9rem', textDecoration: 'none',
                })}>
                <Icon size={18} /> {label}
              </NavLink>
            ))}
          </nav>

          {/* Usuário */}
          <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F04E00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
                {user?.name?.[0]?.toUpperCase()}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
                <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase' }}>
                  {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'COLLABORATOR' ? 'Colaborador' : 'Cliente'}
                </div>
              </div>
            </div>
            <button onClick={handleLogout} style={{ width: '100%', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '9px', color: 'rgba(255,255,255,0.6)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, fontSize: '0.85rem' }}>
              <LogOut size={15} /> Sair
            </button>
          </div>
        </div>

        {/* Topbar mobile */}
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, height: 56,
          background: '#111827', zIndex: 30,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '0 16px', borderBottom: '1px solid rgba(255,255,255,0.07)',
        }}>
          <button onClick={() => setMobileOpen(true)} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 4 }}>
            <Menu size={22} />
          </button>
          <img src="/logo-branca.png" alt="Genius" style={{ height: 24, objectFit: 'contain' }} />
          <NotificationBell mobileTopbar={true} />
        </div>

        {/* Espaçador para o topbar fixo */}
        <div style={{ height: 56 }} />
      </>
    );
  }

  /* ── DESKTOP: sidebar lateral ── */
  return (
    <aside style={{
      width: 240, minHeight: '100vh', background: '#111827',
      display: 'flex', flexDirection: 'column', flexShrink: 0,
      position: 'sticky', top: 0, height: '100vh',
    }}>
      <div style={{ padding: '24px 20px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <img src="/logo-branca.png" alt="Genius Consultoria" style={{ height: 32, width: 'auto', objectFit: 'contain' }} />
      </div>

      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: '1.2px', textTransform: 'uppercase', padding: '0 8px', marginBottom: 8 }}>Menu</div>
        {links.map(({ to, icon: Icon, label }) => (
          <NavLink key={to} to={to} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '9px 12px', borderRadius: 8, marginBottom: 2,
            color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
            background: isActive ? '#F04E00' : 'transparent',
            fontWeight: isActive ? 600 : 400,
            fontSize: '0.875rem', textDecoration: 'none', transition: 'all 0.15s',
          })}>
            <Icon size={17} /> {label}
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '16px 12px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ marginBottom: 12 }}><NotificationBell /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#F04E00', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '0.85rem', flexShrink: 0 }}>
            {user?.name?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              {user?.role === 'ADMIN' ? 'Admin' : user?.role === 'COLLABORATOR' ? 'Colaborador' : 'Cliente'}
            </div>
          </div>
          <button onClick={handleLogout} title="Sair" style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'rgba(255,255,255,0.35)', padding: 4, display: 'flex', borderRadius: 6 }}
            onMouseEnter={e => e.currentTarget.style.color = '#F04E00'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(255,255,255,0.35)'}>
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
