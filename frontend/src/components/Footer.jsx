import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="bg-text text-white py-12 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-xl">🍽️</span>
              <span className="text-lg font-bold">Left2Serve</span>
            </div>
            <p className="text-white/50 text-sm leading-relaxed">Connecting surplus food with communities in need.</p>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Platform</h4>
            <div className="space-y-2 text-white/50 text-sm">
              <div><Link to="/browse" className="hover:text-white transition-colors">Browse Food</Link></div>
              <div><Link to="/register" className="hover:text-white transition-colors">Join Us</Link></div>
              <div><Link to="/login" className="hover:text-white transition-colors">Sign In</Link></div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Company</h4>
            <div className="space-y-2 text-white/50 text-sm">
              <div><Link to="/" className="hover:text-white transition-colors">Home</Link></div>
              <div><Link to="/browse" className="hover:text-white transition-colors">Browse</Link></div>
              <div><Link to="/register" className="hover:text-white transition-colors">Join</Link></div>
            </div>
          </div>
          <div>
            <h4 className="font-semibold text-white mb-3 text-sm">Contact</h4>
            <div className="space-y-2 text-white/50 text-sm">
              <div>hello@left2serve.org</div>
            </div>
          </div>
        </div>
        <div className="mt-8 pt-6 border-t border-white/10 text-center text-white/30 text-xs">
          &copy; {new Date().getFullYear()} Left2Serve. All rights reserved.
          <Link to="/login" className="text-white/15 hover:text-white/30 transition-colors ml-2">Admin</Link>
        </div>
      </div>
    </footer>
  );
}