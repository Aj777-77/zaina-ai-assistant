import { useState } from 'react';
import Image from 'next/image';
import ZainLogo from '@/lib/Assets/Zain-Logo-White.svg';

interface ChatRegistrationProps {
  onRegister: (data: { name: string; phone: string }) => void;
}

export default function ChatRegistration({ onRegister }: ChatRegistrationProps) {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      setError('Please provide both your name and phone number.');
      return;
    }
    
    // Basic phone validation (can be more advanced based on standard)
    if (phone.replace(/\\D/g, '').length < 8) {
      setError('Please enter a valid phone number.');
      return;
    }

    onRegister({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <div className="flex flex-col items-center justify-center h-full w-full bg-zinc-950 px-4 font-sans">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="bg-linear-to-b from-zinc-900 to-[#0f0f13] border-b border-white/5 p-8 text-center relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full bg-purple-500/10 blur-3xl rounded-full pointer-events-none"></div>
          
          <div className="relative w-16 h-16 bg-linear-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center p-3 mx-auto mb-4 shadow-lg shadow-purple-900/20 border border-purple-400/20">
             <Image src={ZainLogo} alt="Zain Logo" className="w-full h-full object-contain" />
          </div>
          <h2 className="relative text-2xl font-bold text-white mb-2">Welcome to Zaina AI</h2>
          <p className="relative text-zinc-400">Your Zain Bahrain Shopping Assistant</p>
        </div>
        
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-950/50 text-red-400 p-3 rounded-xl text-sm mb-4 border border-red-900/50">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-zinc-300 mb-1">
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-3 rounded-xl bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none shadow-inner"
              placeholder="e.g. Ahmed Ali"
            />
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-zinc-300 mb-1">
              Phone Number
            </label>
            <div className="flex rounded-xl overflow-hidden">
              <span className="inline-flex items-center px-4 border border-r-0 border-zinc-700 bg-zinc-800 text-zinc-400 sm:text-sm">
                +973
              </span>
              <input
                type="tel"
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full px-4 py-3 bg-zinc-950 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all outline-none flex-1"
                placeholder="3X XXXXXX"
              />
            </div>
          </div>
          
          <button
            type="submit"
            className="w-full bg-linear-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 px-6 rounded-xl shadow-lg shadow-purple-900/20 hover:shadow-purple-900/40 transition-all duration-200 active:scale-[0.98] border border-white/10"
          >
            Start Chatting
          </button>
        </form>
      </div>
      
      <div className="mt-6 text-center text-zinc-600 text-xs max-w-xs uppercase tracking-wide">
        By continuing, you agree to our Terms of Service and Privacy Policy.
      </div>
    </div>
  );
}
