import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from './AuthContext';

export default function ProtectedRoute({ children, roles }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <div className="flex justify-center items-center min-h-[80vh]"><div className="flex flex-col items-center gap-4"><div className="w-10 h-10 border-2 border-red-100 border-t-red-500 rounded-full animate-spin" /><span className="text-gray-400 text-sm font-medium">Loading...</span></div></div>;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" />;
  return children;
}