import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Menu, X, Home, Pill, MessageCircle, Navigation } from 'lucide-react';
import GlobalSearch from './GlobalSearch';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Home', path: '/', icon: Home },
    { label: 'Chatbot', path: '/chat', icon: MessageCircle }
  ];

  return (
    <header className="sticky top-0 z-50 w-full" style={{ background: 'rgba(15, 17, 21, 0.75)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--color-surface-border)' }}>
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        
        {/* Left: Logo */}
        <div className="flex-shrink-0 cursor-pointer flex items-center gap-2" onClick={() => navigate('/')}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-gradient-to-br from-[#7DD8F0] to-[#4ECDC4]">
            <Navigation size={18} color="#000" />
          </div>
          <span className="text-lg font-bold tracking-wide hidden sm:block" style={{ fontFamily: 'var(--font-heading)', color: 'var(--color-primary)' }}>
            MedScan+
          </span>
        </div>

        {/* Center: Global Search Bar */}
        <GlobalSearch />

        {/* Right: Desktop Links */}
        <nav className="hidden md:flex items-center gap-1 flex-shrink-0">
          {navLinks.map(link => {
            const active = location.pathname === link.path;
            const Icon = link.icon;
            return (
              <button key={link.label} onClick={() => navigate(link.path)}
                className="px-4 py-2 rounded-xl text-sm font-medium transition-all hover:bg-white/10 flex items-center gap-2"
                style={{ color: active ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}
              >
                <Icon size={16} />
                {link.label}
              </button>
            );
          })}
        </nav>

        {/* Mobile Hamburger */}
        <button className="md:hidden p-2 rounded-xl text-gray-300 hover:bg-white/10 transition-colors flex-shrink-0" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="md:hidden overflow-hidden border-b border-white/10 bg-[#0f1115]/95 backdrop-blur-xl"
          >
            <div className="px-4 py-3 flex flex-col gap-1">
              {navLinks.map(link => {
                const active = location.pathname === link.path;
                const Icon = link.icon;
                return (
                  <button key={link.label} onClick={() => { setMobileMenuOpen(false); navigate(link.path); }}
                    className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium transition-all flex items-center gap-3"
                    style={{ background: active ? 'rgba(78, 205, 196, 0.1)' : 'transparent', color: active ? 'var(--color-primary)' : 'var(--color-text-primary)' }}
                  >
                    <Icon size={18} />
                    {link.label}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
