import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-white relative page-transition">
      <div className="absolute inset-0 pattern-dots opacity-30" />
      <div className="text-center relative z-10 animate-scale-in px-4">
        <div className="text-9xl font-black gradient-text mb-4">404</div>
        <h1 className="text-3xl font-bold text-text mb-3">Page Not Found</h1>
        <p className="text-subtle text-lg mb-8 max-w-md mx-auto">The page you're looking for doesn't exist or has been moved.</p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link to="/" className="btn-primary !py-3 !px-6 !rounded-2xl">Go Home</Link>
          <Link to="/browse" className="btn-outline !py-3 !px-6 !rounded-2xl">Browse Food</Link>
        </div>
      </div>
    </div>
  );
}