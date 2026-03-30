import Link from 'next/link';
import Image from 'next/image';
import ZainLogo from '@/lib/Assets/Zain-Logo-White.svg';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen bg-zinc-950 font-sans text-zinc-100">
      {/* Sidebar */}
      <aside className="w-64 bg-[#0f0f13] border-r border-white/5 flex flex-col">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-3 mb-2">
            <Image src={ZainLogo} alt="Zain Logo" className="h-10 w-auto object-contain" priority />
            <div>
              <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-indigo-300">Admin</h1>
              <p className="text-sm text-zinc-500">Zaina AI</p>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <Link href="/admin" className="block px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 font-medium transition-colors">
             View Chats
          </Link>
          <Link href="/admin/rules" className="block px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 font-medium transition-colors">
             Bot Rules
          </Link>
          <Link href="/admin/documents" className="block px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 font-medium transition-colors">
            Learning Hub
          </Link>
          <Link href="/admin/scrape" className="block px-4 py-3 rounded-xl text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100 font-medium transition-colors">
             Data Sync
          </Link>
        </nav>
        
        <div className="p-4 border-t border-white/5">
          {/* In a real app, this would delete the cookie using a server action or route */}
          <Link href="/" className="block text-center px-4 py-2.5 text-sm font-medium text-red-400 hover:bg-red-950/30 rounded-xl transition-colors border border-transparent hover:border-red-900/50">
            ← Back to Shop
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-zinc-950 shadow-inner">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
