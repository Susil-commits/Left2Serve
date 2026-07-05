import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';
import { useFavorites } from './Favorites';
import { useConfirm } from './ConfirmDialog';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const { count: favCount } = useFavorites();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isActive = (path) => location.pathname === path ? 'text-accent bg-accent/5' : 'text-subtle hover:text-accent hover:bg-accent/3';
  const isSavedActive = () => location.pathname === '/saved' ? 'text-accent bg-accent/5' : 'text-subtle hover:text-accent hover:bg-accent/3';

  const closeMobile = () => setMobileOpen(false);

  const handleLogout = async () => {
    const ok = await confirm({ title: 'Log out?', message: 'You will be signed out of your account.', confirmLabel: 'Log Out', variant: 'danger' });
    if (!ok) return;
    logout();
    navigate('/');
    closeMobile();
  };

  const navLinks = user ? (
    <>
      <Link to="/dashboard" onClick={closeMobile} className={`btn-ghost ${isActive('/dashboard')}`}>Dashboard</Link>
      {user.role === 'donor' && (
        <Link to="/list-food" onClick={closeMobile} className="btn-primary !py-2 !px-4 !text-sm !rounded-xl ml-1 ripple-effect">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>List Food
        </Link>
      )}
    </>
  ) : null;

  return (
    <>
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-accent focus:text-white focus:px-4 focus:py-2 focus:rounded-xl">Skip to content</a>
      <nav className="sticky top-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link to="/" aria-label="Left2Serve home" className="flex items-center gap-2.5 group flex-shrink-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold text-sm shadow-red group-hover:scale-110 group-hover:rotate-[-5deg] transition-all duration-300">L2</div>
              <span className="text-xl font-bold tracking-tight text-text hidden sm:block">Left<span className="text-accent">2</span>Serve</span>
            </Link>

            <div className="hidden md:flex items-center gap-1">
              <Link to="/browse" aria-label="Browse food listings" className={`btn-ghost ${isActive('/browse')}`}>Browse</Link>
              <Link to="/saved" aria-label={`Saved listings${favCount ? ` (${favCount})` : ''}`} className={`btn-ghost relative ${isSavedActive()}`}>
                Saved
                {favCount > 0 && <span className="ml-1 min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center">{favCount > 9 ? '9+' : favCount}</span>}
              </Link>
              {user?.role === 'admin' && <Link to="/admin/dashboard" onClick={closeMobile} className={`btn-ghost ${isActive('/admin/dashboard')}`}>Admin Panel</Link>}
              {navLinks}
              {user && <NotificationBell />}
              {user ? (
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border">
                  <Link to="/profile" aria-label="View profile" className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shadow-sm group-hover-scale hover:ring-2 hover:ring-accent/20 transition-all">{user.name[0]}</Link>
                  <div className="hidden lg:block">
                    <div className="text-sm font-semibold text-text leading-tight">{user.name}</div>
                    <div className="text-xs text-accent capitalize">{user.role}</div>
                  </div>
                  <button onClick={handleLogout} aria-label="Log out" className="text-xs text-subtle hover:text-accent transition-colors font-medium hover:scale-105 transform">Logout</button>
                </div>
              ) : (
                <div className="flex items-center gap-2 ml-2">
                  <Link to="/login" className="btn-ghost">Login</Link>
                  <Link to="/register" className="btn-primary !py-2 !px-4 !text-sm !rounded-xl">Register</Link>
                </div>
              )}
            </div>

            {user && <div className="md:hidden"><NotificationBell /></div>}
            <button onClick={() => setMobileOpen(!mobileOpen)} aria-label={mobileOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileOpen} className="md:hidden p-2 rounded-xl hover:bg-accent/5 transition-colors">
              {mobileOpen ? (
                <svg className="w-6 h-6 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              ) : (
                <svg className="w-6 h-6 text-text" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
              )}
            </button>
          </div>
        </div>

        {mobileOpen && (
          <div className="md:hidden glass border-t border-border animate-slide-down">
            <div className="px-4 py-4 space-y-2">
              <Link to="/browse" onClick={closeMobile} className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/browse')}`}>Browse</Link>
              <Link to="/saved" onClick={closeMobile} className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isSavedActive()}`}>
                <span>Saved</span>
                {favCount > 0 && <span className="min-w-4 h-4 px-1 rounded-full bg-accent text-white text-[9px] font-bold flex items-center justify-center">{favCount > 9 ? '9+' : favCount}</span>}
              </Link>
              {user ? (
                <>
                  {user.role === 'admin' ? (
                    <Link to="/admin/dashboard" onClick={closeMobile} className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/admin/dashboard')}`}>Admin Panel</Link>
                  ) : (
                    <>
                      <Link to="/dashboard" onClick={closeMobile} className={`block px-4 py-3 rounded-xl text-sm font-semibold transition-all ${isActive('/dashboard')}`}>Dashboard</Link>
                      {user.role === 'donor' && (
                        <Link to="/list-food" onClick={closeMobile} className="block px-4 py-3 rounded-xl text-sm font-semibold text-white bg-accent text-center">List Food</Link>
                      )}
                    </>
                  )}
                  <Link to="/profile" onClick={closeMobile} className="block px-4 py-3 rounded-xl text-sm font-semibold transition-all text-subtle hover:text-accent hover:bg-accent/3">Profile</Link>
                  <button onClick={handleLogout} className="block w-full text-left px-4 py-3 rounded-xl text-sm font-semibold text-red-600 hover:bg-red-50 transition-all">Logout</button>
                </>
              ) : (
                <>
                  <Link to="/login" onClick={closeMobile} className="block px-4 py-3 rounded-xl text-sm font-semibold transition-all text-subtle hover:text-accent hover:bg-accent/3">Login</Link>
                  <Link to="/register" onClick={closeMobile} className="block px-4 py-3 rounded-xl text-sm font-semibold text-white bg-accent text-center">Register</Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </>
  );
}
