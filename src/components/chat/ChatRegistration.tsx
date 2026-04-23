import { useState } from 'react';
import Image from 'next/image';
import ZainLogo from '@/lib/Assets/Zain-Logo-White.svg';

interface ChatRegistrationProps {
  onRegister: (data: { name: string; phone: string }) => void;
}

const PhoneIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="14" height="20" x="5" y="2" rx="2" ry="2" />
    <path d="M12 18h.01" />
  </svg>
);

const WifiIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12.55a11 11 0 0 1 14.08 0" />
    <path d="M1.42 9a16 16 0 0 1 21.16 0" />
    <path d="M8.53 16.11a6 6 0 0 1 6.95 0" />
    <line x1="12" x2="12.01" y1="20" y2="20" />
  </svg>
);

const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.287 1.288L3 12l5.8 1.9a2 2 0 0 1 1.288 1.287L12 21l1.9-5.8a2 2 0 0 1 1.287-1.288L21 12l-5.8-1.9a2 2 0 0 1-1.288-1.287Z" />
  </svg>
);

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

const AlertIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 shrink-0">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" x2="12" y1="8" y2="12" />
    <line x1="12" x2="12.01" y1="16" y2="16" />
  </svg>
);

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
    if (phone.replace(/\D/g, '').length < 8) {
      setError('Please enter a valid phone number.');
      return;
    }
    onRegister({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <div className="relative flex flex-col lg:flex-row h-full w-full bg-transparent font-sans overflow-y-auto">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[32rem] w-[32rem] translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08),transparent_50%)]" />
      </div>

      {/* Hero panel */}
      <div className="relative flex-1 flex flex-col justify-center px-6 sm:px-10 lg:px-16 py-10 lg:py-20">
        <div className="max-w-xl mx-auto lg:mx-0 text-center lg:text-left">
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-bold text-white tracking-tight leading-[1.05] mb-2 mt-10 lg:mt-0">
            Meet{' '}
            <span className="bg-linear-to-r from-purple-300 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
              Zaina
            </span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400/80 mb-6">
            Powered by Zain Bahrain
          </p>

          <p className="text-base sm:text-lg lg:text-xl text-zinc-400 leading-relaxed mb-8 lg:mb-10 max-w-lg mx-auto lg:mx-0">
            Your AI shopping concierge for Zain Bahrain. Find the perfect phone, plan, or bundle in seconds — just ask.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl mx-auto lg:mx-0">
            <Feature icon={<PhoneIcon />} label="Compare phones" hint="Side-by-side specs & prices" />
            <Feature icon={<WifiIcon />} label="Find a plan" hint="Mobile, fiber & 5G home" />
            <Feature icon={<SparkleIcon />} label="Smart picks" hint="Tailored to your budget" />
          </div>
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-12 py-10 lg:py-20">
        <div className="w-full max-w-md">
          <div className="relative bg-black/20 backdrop-blur-3xl border border-white/10 rounded-3xl p-7 sm:p-8 shadow-[0_0_60px_-15px_rgba(0,0,0,0.5)]">
            <div className="absolute -top-px left-10 right-10 h-px bg-linear-to-r from-transparent via-purple-500/50 to-transparent" />

            <div className="mb-7 flex flex-col items-center text-center sm:items-start sm:text-left">
              <div className="w-16 h-16 bg-linear-to-br from-purple-500/80 to-indigo-600/80 backdrop-blur-md rounded-2xl flex items-center justify-center p-3 mb-5 shadow-xl shadow-purple-900/30 border border-white/20">
                <Image src={ZainLogo} alt="Zain Logo" className="w-full h-full object-contain drop-shadow-md" />
              </div>
              <h2 className="text-3xl font-bold text-white mb-2 tracking-tight">Get started</h2>
              <p className="text-base text-zinc-300">No signup. Just tell us who you are and start chatting.</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {error && (
                <div className="flex items-start gap-2.5 bg-red-950/40 text-red-300 px-4 py-3 rounded-xl text-sm border border-red-900/50">
                  <AlertIcon />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label htmlFor="name" className="block text-xs font-semibold uppercase tracking-widest text-zinc-300 mb-2.5 ml-1">
                  Full Name
                </label>
                <input
                  type="text"
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-4 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-zinc-500 focus:bg-white/10 focus:ring-2 focus:ring-purple-400/50 focus:border-purple-400/50 transition-all duration-300 outline-none backdrop-blur-md"
                  placeholder="Ali Juma"
                />
              </div>

              <div>
                <label htmlFor="phone" className="block text-xs font-semibold uppercase tracking-widest text-zinc-300 mb-2.5 ml-1">
                  Phone Number
                </label>
                <div className="flex rounded-xl overflow-hidden bg-white/5 border border-white/10 focus-within:bg-white/10 focus-within:ring-2 focus-within:ring-purple-400/50 focus-within:border-purple-400/50 transition-all duration-300 backdrop-blur-md">
                  <span className="inline-flex items-center px-4 bg-black/20 text-zinc-400 text-sm font-semibold border-r border-white/5">
                    +973
                  </span>
                  <input
                    type="tel"
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="flex-1 px-4 py-4 bg-transparent text-white placeholder:text-zinc-500 outline-none"
                    placeholder="3X XXX XXX"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="group w-full flex items-center justify-center gap-2.5 bg-linear-to-r from-purple-500 to-indigo-500 hover:from-purple-400 hover:to-indigo-400 text-white font-bold py-4 px-6 rounded-xl shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)] hover:shadow-[0_0_40px_-5px_rgba(168,85,247,0.6)] transition-all duration-300 active:scale-[0.98] border border-white/20 mt-4"
              >
                Start chatting
                <span className="transition-transform duration-300 group-hover:translate-x-1">
                  <ArrowIcon />
                </span>
              </button>
            </form>
          </div>

          <p className="mt-8 text-center text-xs text-zinc-500 font-medium tracking-wide">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function Feature({ icon, label, hint }: { icon: React.ReactNode; label: string; hint: string }) {
  return (
    <div className="group relative flex flex-col gap-3 p-5 rounded-3xl bg-transparent border-none hover:bg-white/[0.03] transition-all duration-300 text-left overflow-hidden hover:-translate-y-1 hover:shadow-xl">
      {/* Light glow on hover */}
      <div className="absolute inset-0 bg-linear-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 blur-xl" />
      
      <div className="relative z-10 w-11 h-11 rounded-2xl bg-transparent border border-white/10 flex items-center justify-center text-zinc-300 group-hover:text-purple-300 group-hover:scale-110 group-hover:border-purple-400/30 transition-all duration-300">
        {icon}
      </div>
      <div className="relative z-10 flex flex-col mt-1">
        <span className="text-sm font-bold text-zinc-100 mb-1 group-hover:text-white transition-colors">{label}</span>
        <span className="text-[13px] text-zinc-500 leading-relaxed group-hover:text-zinc-400 transition-colors">{hint}</span>
      </div>
    </div>
  );
}
