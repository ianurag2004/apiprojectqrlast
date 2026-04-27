import { NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';
import NotificationCenter from './NotificationCenter';
import {
  LayoutDashboard, Calendar, FileText, DollarSign, Users,
  QrCode, Settings, LogOut, Wifi, WifiOff, Zap,
  ClipboardList, UserCog,
} from 'lucide-react';

const navItems = [
  { to: '/dashboard',    icon: LayoutDashboard, label: 'Dashboard',    roles: null },
  { to: '/events',       icon: Calendar,        label: 'Events',       roles: null },
  { to: '/events/new',   icon: FileText,        label: 'New Proposal', roles: ['organizer','hod','super_admin'] },
  { to: '/registrations',icon: ClipboardList,   label: 'Registrations',roles: null },
  { to: '/volunteers',   icon: UserCog,         label: 'Volunteers',   roles: ['organizer','hod','super_admin'] },
  { to: '/scan',         icon: QrCode,          label: 'QR Scanner',   roles: ['organizer','hod','super_admin'] },
  { to: '/admin',        icon: Settings,        label: 'Admin Panel',  roles: ['super_admin','hod','dean'] },
];

export default function Sidebar() {
  const { user, logout, hasRole } = useAuthStore();
  const { connected } = useSocketStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const visibleItems = navItems.filter(item =>
    !item.roles || (user && item.roles.includes(user.role))
  );

  const avatarUrl = `https://api.dicebear.com/8.x/initials/svg?seed=${encodeURIComponent(user?.name || 'U')}&backgroundColor=7c3aed&textColor=ffffff`;

  return (
    <aside className="fixed left-0 top-0 h-screen w-60 bg-surface-50 border-r border-white/10 flex flex-col z-50">
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-primary-500 to-primary-700 rounded-xl flex items-center justify-center shadow-glow">
            <Zap size={18} className="text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-white text-base leading-tight">FestOS</div>
            <div className="text-[10px] text-white/40 leading-tight">Manav Rachna Univ.</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto scrollbar-thin">
        {visibleItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={16} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>

      {/* User + status */}
      <div className="px-3 py-4 border-t border-white/10 space-y-3">
        {/* Socket status + Notifications */}
        <div className="flex items-center gap-2">
          <div className={`flex-1 flex items-center gap-2 px-3 py-2 rounded-lg text-xs ${
            connected ? 'text-emerald-400 bg-emerald-500/10' : 'text-white/40 bg-white/5'
          }`}>
            {connected ? <Wifi size={12} /> : <WifiOff size={12} />}
            {connected ? 'Live' : 'Offline'}
          </div>
          <NotificationCenter />
        </div>

        {/* User card */}
        <div className="flex items-center gap-3 px-2">
          <img src={avatarUrl} alt={user?.name} className="w-8 h-8 rounded-lg ring-2 ring-primary-500/40" />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-white truncate">{user?.name}</div>
            <div className="text-xs text-white/40 truncate capitalize">{user?.role}</div>
          </div>
          <button onClick={handleLogout} className="btn-icon" title="Logout">
            <LogOut size={15} />
          </button>
        </div>
      </div>
    </aside>
  );
}
