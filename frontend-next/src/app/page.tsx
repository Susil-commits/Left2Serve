import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      <main className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-6xl font-black tracking-tight text-red-600 mb-6 drop-shadow-sm">
          Left2Serve <span className="text-slate-800">Next.js</span>
        </h1>
        <p className="text-xl text-slate-600 mb-10 max-w-2xl leading-relaxed font-medium">
          Welcome to the modernized frontend architecture. We are running Next.js for blazing fast SEO, server-side rendering, and React Server Components.
        </p>
        
        <div className="flex gap-4">
          <Link 
            href="/browse"
            className="px-8 py-4 bg-red-500 hover:bg-red-600 text-white rounded-2xl font-bold transition-all shadow-md hover:shadow-lg transform hover:-translate-y-1"
          >
            Browse Food
          </Link>
          <a 
            href="http://localhost:3000"
            className="px-8 py-4 bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 rounded-2xl font-bold transition-all"
          >
            Legacy SPA
          </a>
        </div>
      </main>
    </div>
  );
}
