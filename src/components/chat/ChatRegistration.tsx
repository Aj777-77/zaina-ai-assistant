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
    <div className="relative flex flex-col lg:flex-row h-full w-full bg-transparent font-sans overflow-hidden">
      {/* Ambient background glow */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-0 left-1/4 h-[32rem] w-[32rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-purple-600/20 blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 h-[32rem] w-[32rem] translate-x-1/2 translate-y-1/2 rounded-full bg-indigo-600/20 blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(139,92,246,0.08),transparent_50%)]" />
      </div>

      {/* Hero panel — desktop only */}
      <div className="relative hidden lg:flex flex-1 flex-col justify-center px-10 lg:px-16 py-10">
        <div className="max-w-xl text-left">
          <h1 className="text-5xl lg:text-6xl xl:text-7xl font-bold text-white tracking-tight leading-[1.05] mb-2">
            Meet{' '}
            <span className="bg-linear-to-r from-purple-300 via-fuchsia-400 to-indigo-400 bg-clip-text text-transparent">
              Zaina
            </span>
          </h1>
          <p className="text-xs sm:text-sm font-semibold uppercase tracking-[0.2em] text-zinc-400/80 mb-5">
            Powered by Zain Bahrain
          </p>

          <p className="text-base lg:text-lg text-zinc-400 leading-relaxed mb-8 max-w-lg">
            Your AI shopping concierge for Zain Bahrain. Find the perfect phone, plan, or bundle in seconds — just ask.
          </p>

          <div className="grid grid-cols-3 gap-3 max-w-2xl">
            <Feature icon={<PhoneIcon />} label="Compare phones" hint="Side-by-side specs & prices" />
            <Feature icon={<WifiIcon />} label="Find a plan" hint="Mobile, fiber & 5G home" />
            <Feature icon={<SparkleIcon />} label="Smart picks" hint="Tailored to your budget" />
          </div>
        </div>
      </div>

      {/* Form panel — conversational style */}
      <div className="relative flex-1 flex items-center justify-center px-6 sm:px-10 lg:px-12 py-6 lg:py-10 min-h-0">
        <div className="w-full max-w-md">
          {/* Chat header */}
          <div className="flex items-center gap-3 mb-5 px-1">
            <div className="relative">
              <div className="w-11 h-11 bg-linear-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center p-2.5 shadow-lg shadow-purple-900/40 ring-2 ring-white/10">
                <Image src={ZainLogo} alt="Zaina" className="w-full h-full object-contain" />
              </div>
              <span className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-400 rounded-full ring-2 ring-black animate-pulse" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white tracking-tight">Zaina</h2>
              <p className="text-xs text-emerald-400/90 font-medium flex items-center gap-1.5">
                <span className="w-1 h-1 rounded-full bg-emerald-400" />
                Online · Ready to help
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            {/* Greeting bubble from Zaina */}
            <ZainaBubble delay="0ms">
              <p className="text-[15px] leading-relaxed">
                Hey there <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
              </p>
              <p className="text-[15px] leading-relaxed mt-1">
                I&apos;m Zaina, your Zain Bahrain concierge. Before we start — what should I call you?
              </p>
            </ZainaBubble>

            {/* User reply: name */}
            <UserReply>
              <input
                type="text"
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-transparent text-white placeholder:text-white/50 outline-none text-[15px] font-medium"
                placeholder="Type your name…"
                autoFocus
              />
            </UserReply>

            {/* Follow-up bubble from Zaina */}
            <ZainaBubble delay="150ms">
              <p className="text-[15px] leading-relaxed">
                Perfect. And your phone number, so I can pick up where we left off next time?
              </p>
            </ZainaBubble>

            {/* User reply: phone */}
            <UserReply>
              <div className="flex items-center gap-2 w-full">
                <span className="text-white/70 text-[15px] font-semibold shrink-0">+973</span>
                <span className="h-5 w-px bg-white/20" />
                <input
                  type="tel"
                  id="phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="flex-1 bg-transparent text-white placeholder:text-white/50 outline-none text-[15px] font-medium tracking-wide"
                  placeholder="3X XXX XXX"
                />
              </div>
            </UserReply>

            {error && (
              <div className="flex items-start gap-2.5 bg-red-950/40 text-red-300 px-4 py-3 rounded-2xl text-sm border border-red-900/50 ml-12">
                <AlertIcon />
                <span>{error}</span>
              </div>
            )}

            {/* Send button — purple glow */}
            <button
              type="submit"
              className="group relative w-full flex items-center justify-center gap-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold py-4 px-6 rounded-2xl border border-purple-400/40 shadow-[0_0_30px_rgba(168,85,247,0.45),0_0_60px_rgba(168,85,247,0.25)] hover:shadow-[0_0_40px_rgba(168,85,247,0.65),0_0_90px_rgba(168,85,247,0.4)] transition-all duration-300 active:scale-[0.98] overflow-hidden mt-2"
            >
              <span className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(216,180,254,0.35),transparent_70%)] opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
              <span className="relative">Send & start chatting</span>
              <span className="relative transition-transform duration-300 group-hover:translate-x-1">
                <ArrowIcon />
              </span>
            </button>
          </form>

          <p className="mt-4 text-center text-[11px] text-zinc-500 font-medium tracking-wide">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}

function ZainaBubble({ children, delay = '0ms' }: { children: React.ReactNode; delay?: string }) {
  return (
    <div className="flex items-end gap-2.5 animate-bubble-in" style={{ animationDelay: delay }}>
      <div className="w-8 h-8 shrink-0 bg-linear-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center p-1.5 shadow-md shadow-purple-900/30 ring-1 ring-white/10">
        <Image src={ZainLogo} alt="" className="w-full h-full object-contain" />
      </div>
      <div className="relative bg-white/6 backdrop-blur-md border border-white/10 text-zinc-100 rounded-2xl rounded-bl-md px-4 py-3 max-w-[85%] shadow-lg shadow-black/20">
        {children}
      </div>
    </div>
  );
}

function UserReply({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex justify-end animate-bubble-in pl-10" style={{ animationDelay: '75ms' }}>
      <div className="group relative min-w-[70%] max-w-[85%] bg-purple-500/15 backdrop-blur-md border border-purple-400/30 rounded-2xl rounded-br-md px-4 py-3 shadow-lg shadow-purple-900/20 hover:bg-purple-500/20 hover:border-purple-400/50 focus-within:bg-purple-500/25 focus-within:border-purple-300/70 focus-within:shadow-[0_0_30px_-5px_rgba(168,85,247,0.4)] transition-all duration-200">
        {children}
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
