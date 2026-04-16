import { useState, useEffect } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  LayoutDashboard,
  Key,
  GitBranch,
  Users as UsersIcon,
  ScrollText,
  Settings,
  LogOut,
  Moon,
  Sun,
  ChevronDown,
  X,
} from 'lucide-react';
import useAuthStore from '../store/auth';
import useThemeStore from '../store/theme';
import { branches as branchesApi } from '../lib/api';
import { cn } from '../lib/utils';

const navItems = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/credentials', label: 'Credentials', icon: Key, hasSub: true },
  { path: '/branches', label: 'Subeler', icon: GitBranch },
  { path: '/users', label: 'Users', icon: UsersIcon, adminOnly: true },
  { path: '/audit', label: 'Audit Log', icon: ScrollText, adminOnly: true },
  { path: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ isOpen, onClose }) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const theme = useThemeStore((s) => s.theme);
  const toggleTheme = useThemeStore((s) => s.toggleTheme);
  const navigate = useNavigate();
  const [branchList, setBranchList] = useState([]);
  const [showBranches, setShowBranches] = useState(false);

  useEffect(() => {
    branchesApi.list().then(setBranchList).catch(() => {});
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleBranchClick = (branchId) => {
    navigate(`/credentials?branch_id=${branchId}`);
    onClose?.();
  };

  const userRole = user?.role || 'viewer';
  const filteredNavItems = navItems.filter(
    (item) => !item.adminOnly || userRole === 'admin'
  );

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed top-0 left-0 h-full z-50 w-64 bg-vault-sidebar border-r border-vault-border',
          'flex flex-col transition-transform duration-300 ease-in-out',
          'lg:translate-x-0 lg:static lg:z-auto',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-5 border-b border-vault-border">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-vault-accent/10 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-vault-accent" />
            </div>
            <div>
              <h1 className="text-base font-bold text-vault-text leading-tight">Awtoyoly</h1>
              <p className="text-[11px] text-vault-text-secondary font-medium tracking-wide uppercase">Vault</p>
            </div>
          </div>
          <button onClick={onClose} className="lg:hidden text-vault-text-secondary hover:text-vault-text">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {filteredNavItems.map((item) => (
            <div key={item.path}>
              <div className="flex items-center">
                <NavLink
                  to={item.path}
                  end={item.path === '/'}
                  onClick={() => onClose?.()}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full',
                      isActive
                        ? 'bg-vault-accent/10 text-vault-accent'
                        : 'text-vault-text-secondary hover:text-vault-text hover:bg-vault-hover'
                    )
                  }
                >
                  <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                  {item.label}
                </NavLink>
                {item.hasSub && (
                  <button
                    onClick={() => setShowBranches(!showBranches)}
                    className="p-1 mr-1 text-vault-text-secondary hover:text-vault-text transition-colors"
                  >
                    <ChevronDown
                      className={cn(
                        'w-4 h-4 transition-transform',
                        showBranches && 'rotate-180'
                      )}
                    />
                  </button>
                )}
              </div>

              {/* Branch sub-items */}
              {item.hasSub && showBranches && (
                <div className="ml-8 mt-1 space-y-0.5 animate-fade-in">
                  {branchList.map((branch) => (
                    <button
                      key={branch.id}
                      onClick={() => handleBranchClick(branch.id)}
                      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-vault-text-secondary hover:text-vault-text hover:bg-vault-hover transition-all"
                    >
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: branch.color || '#6b7280' }}
                      />
                      <span className="truncate">{branch.name}</span>
                      <span className="ml-auto text-xs opacity-60">{branch.credential_count}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </nav>

        {/* Theme toggle */}
        <div className="px-3 py-2 border-t border-vault-border">
          <button
            onClick={toggleTheme}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-vault-text-secondary hover:text-vault-text hover:bg-vault-hover transition-all"
          >
            {theme === 'dark' ? (
              <Sun className="w-[18px] h-[18px]" />
            ) : (
              <Moon className="w-[18px] h-[18px]" />
            )}
            {theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
          </button>
        </div>

        {/* User info */}
        <div className="px-3 py-3 border-t border-vault-border">
          <div className="flex items-center gap-3 px-3">
            <div className="w-9 h-9 rounded-full bg-vault-accent/20 flex items-center justify-center">
              <span className="text-sm font-bold text-vault-accent">
                {user?.display_name?.[0] || user?.username?.[0] || '?'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-vault-text truncate">
                {user?.display_name || user?.username}
              </p>
              <p className="text-xs text-vault-text-secondary capitalize">{user?.role}</p>
            </div>
            <button
              onClick={handleLogout}
              className="p-2 text-vault-text-secondary hover:text-red-400 transition-colors rounded-lg hover:bg-vault-hover"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
