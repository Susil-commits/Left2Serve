import { Component } from 'react';
import { Link } from 'react-router-dom';

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-white px-4">
          <div className="text-center animate-scale-in max-w-md">
            <div className="w-20 h-20 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-6">
              <svg className="w-10 h-10 text-accent" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" /></svg>
            </div>
            <h1 className="text-2xl font-bold text-text mb-2">Something went wrong</h1>
            <p className="text-subtle mb-6">An unexpected error occurred. Please try refreshing the page.</p>
            <div className="flex flex-wrap justify-center gap-3">
              <button onClick={() => window.location.reload()} className="btn-primary !py-2 !px-4 !text-sm !rounded-xl">Refresh Page</button>
              <Link to="/" className="btn-outline !py-2 !px-4 !text-sm !rounded-xl">Go Home</Link>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}