import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = (path) => location.pathname === path ? 'text-accent bg-accent/5' : 'text-subtle hover:text-accent hover:bg-accent/3';

  return (
    <nav className="sticky top-0 z-50 glass">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-600 to-red-800 flex items-center justify-center text-white font-bold text-sm shadow-red group-hover:scale-110 group-hover:rotate-[-5deg] transition-all duration-300">L2</div>
            <span className="text-xl font-bold tracking-tight text-text">Left<span className="text-accent">2</span>Serve</span>
          </Link>
          <div className="flex items-center gap-1">
            <Link to="/browse" className={`btn-ghost ${isActive('/browse')}`}>Browse</Link>
            {user ? (
              <>
                {user.role === 'admin' ? (
                  <Link to="/admin/dashboard" className={`btn-ghost ${isActive('/admin/dashboard')}`}>Admin Panel</Link>
                ) : (
                  <>
                    <Link to="/dashboard" className={`btn-ghost ${isActive('/dashboard')}`}>Dashboard</Link>
                    {user.role === 'donor' && (
                      <Link to="/list-food" className="btn-primary !py-2 !px-4 !text-sm !rounded-xl ml-1 ripple-effect">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>List Food
                      </Link>
                    )}
                  </>
                )}
                <div className="flex items-center gap-3 ml-4 pl-4 border-l border-border">
                  <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent text-xs font-bold shadow-sm group-hover-scale">{user.name[0]}</div>
                  <div className="hidden sm:block">
                    <div className="text-sm font-semibold text-text leading-tight">{user.name}</div>
                    <div className="text-xs text-accent capitalize">{user.role}</div>
                  </div>
                  <button onClick={() => { logout(); navigate('/'); }} className="text-xs text-subtle hover:text-accent transition-colors font-medium hover:scale-105 transform">Logout</button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2 ml-2">
                <Link to="/login" className="btn-ghost">Login</Link>
                <Link to="/register" className="btn-primary !py-2 !px-4 !text-sm !rounded-xl">Register</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}