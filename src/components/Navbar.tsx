/**
 * MedScan+ : Navbar  (matches mockup header exactly)
 * bg: bg-background | border-b border-surface-variant | h-16
 * Logo: primary-container, uppercase, tracking-tighter, font-black
 * Right: Chat/Think mode pill + notifications + avatar
 */
import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import GlobalSearch from './GlobalSearch';

const NAV_LINKS = [
  { label: 'Home',      path: '/',         icon: 'home'           },
  { label: 'AI Chat',   path: '/chat',      icon: 'chat'           },
  { label: 'Medicines', path: '/knowledge', icon: 'medication'     },
  { label: 'History',   path: '/history',   icon: 'history'        },
];

export default function Navbar() {
  const navigate  = useNavigate();
  const location  = useLocation();
  const [mobileOpen,    setMobileOpen]    = useState(false);
  const [searchFocused, setSearchFocused] = useState(false);

  /* Close mobile on route change */
  useEffect(() => { setMobileOpen(false); }, [location.pathname]);

  /* Cmd/Ctrl + K → focus search */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mac = navigator.platform.toLowerCase().includes('mac');
      if ((mac ? e.metaKey : e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const el = document.getElementById('global-search-input') as HTMLInputElement | null;
        el?.focus(); el?.select?.();
      }
      if (e.key === 'Escape') {
        const el = document.getElementById('global-search-input') as HTMLInputElement | null;
        if (document.activeElement === el) el?.blur();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const isActive = useCallback((p: string) =>
    p === '/' ? location.pathname === '/' : location.pathname.startsWith(p),
  [location.pathname]);

  return (
    <header
      id="top-navbar"
      className="sticky top-0 z-50 w-full flex-shrink-0 bg-background border-b border-surface-variant"
      style={{ height: 64 }}
    >
      <div className="w-full h-full flex items-center justify-between px-md lg:px-lg gap-md">

        {/* ── Left: hamburger + logo + desktop nav ─────────────── */}
        <div className="flex items-center gap-md flex-shrink-0">
          {/* Hamburger (mobile) */}
          <button
            id="hamburger-btn"
            className="text-on-surface-variant hover:text-on-surface transition-colors
                       flex items-center justify-center w-8 h-8 rounded-full hover:bg-surface-container lg:hidden"
            onClick={() => setMobileOpen(v => !v)}
            aria-label="Toggle menu"
            aria-expanded={mobileOpen}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 22 }}>
              {mobileOpen ? 'close' : 'menu'}
            </span>
          </button>

          {/* Logo */}
          <button
            id="logo-btn"
            onClick={() => navigate('/')}
            className="font-heading text-heading font-black text-primary-container
                       tracking-tighter uppercase select-none hover:opacity-80 transition-opacity"
            aria-label="MedScan+ Home"
          >
            MedScan+
          </button>

          {/* Desktop nav links */}
          <nav className="hidden lg:flex items-center gap-xs ml-lg" aria-label="Main navigation">
            {NAV_LINKS.map(({ label, path, icon }) => {
              const active = isActive(path);
              return (
                <button
                  key={path}
                  id={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
                  onClick={() => navigate(path)}
                  className={`flex items-center gap-xs px-sm py-xs rounded-lg text-body transition-colors duration-150 ${
                    active
                      ? 'text-primary-container bg-surface-container'
                      : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 16,
                      fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                    }}
                  >
                    {icon}
                  </span>
                  {label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* ── Center: search ───────────────────────────────────── */}
        <div
          className={`flex-1 max-w-[500px] transition-all duration-200 ${
            searchFocused ? 'max-w-[600px]' : 'max-w-[460px]'
          }`}
        >
          <GlobalSearch onFocusChange={setSearchFocused} />
        </div>

        {/* ── Right: offline badge only ────────────────────── */}
        <div className="flex items-center gap-sm flex-shrink-0">
          <div
            className="hidden sm:flex items-center gap-xs px-sm py-xs rounded-full
                       border border-surface-variant bg-surface-container"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-primary-container" />
            <span className="text-metadata font-medium text-primary-container">Offline</span>
          </div>
        </div>
      </div>

      {/* ── Mobile menu dropdown ─────────────────────────────── */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.nav
            key="mobile-nav"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden overflow-hidden border-t border-surface-variant bg-background"
            aria-label="Mobile navigation"
          >
            <div className="px-md py-sm flex flex-col gap-xs">
              {NAV_LINKS.map(({ label, path, icon }, i) => {
                const active = isActive(path);
                return (
                  <motion.button
                    key={path}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.04 }}
                    onClick={() => navigate(path)}
                    className={`flex items-center gap-md px-md py-sm rounded-lg text-body text-left transition-colors ${
                      active
                        ? 'bg-surface-container text-primary-container border-l-2 border-primary-container'
                        : 'text-on-surface-variant hover:bg-surface-container hover:text-on-surface border-l-2 border-transparent'
                    }`}
                  >
                    <span
                      className="material-symbols-outlined"
                      style={{
                        fontSize: 20,
                        fontVariationSettings: active ? "'FILL' 1" : "'FILL' 0",
                      }}
                    >
                      {icon}
                    </span>
                    {label}
                  </motion.button>
                );
              })}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
