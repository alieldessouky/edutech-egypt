'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  const isHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        padding: scrolled ? '12px 0' : '20px 0',
        backgroundColor: scrolled
          ? 'rgba(255, 255, 255, 0.95)'
          : isHome
            ? 'transparent'
            : 'rgba(255, 255, 255, 0.95)',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #e8ecf0' : '1px solid transparent',
        transition: 'all 0.3s ease',
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: '0 auto',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Logo */}
        <Link
          href="/"
          style={{
            textDecoration: 'none',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg, #1a56db, #2d7cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              fontWeight: 800,
              fontSize: 16,
              letterSpacing: -0.5,
              flexShrink: 0,
            }}
          >
            E
          </div>
          <span
            style={{
              fontWeight: 700,
              fontSize: 18,
              color: scrolled || !isHome ? '#111827' : '#111827',
              letterSpacing: -0.3,
            }}
          >
            EduTech <span style={{ color: '#1a56db' }}>Egypt</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
          className="nav-desktop"
        >
          <NavLink href="/#features" label="Features" scrolled={scrolled} isHome={isHome} />
          <NavLink href="/#how-it-works" label="How It Works" scrolled={scrolled} isHome={isHome} />
          <NavLink href="/#accessibility" label="Accessibility" scrolled={scrolled} isHome={isHome} />

          <div style={{ width: 1, height: 24, backgroundColor: '#e5e7eb', margin: '0 8px' }} />

          <Link
            href="/teacher"
            style={{
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 500,
              color: '#374151',
              padding: '8px 16px',
              borderRadius: 8,
              transition: 'all 0.2s ease',
            }}
          >
            Teacher Portal
          </Link>
          <Link
            href="/student"
            style={{
              textDecoration: 'none',
              fontSize: 14,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#1a56db',
              padding: '8px 20px',
              borderRadius: 8,
              transition: 'all 0.2s ease',
            }}
          >
            Join as Student
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="nav-mobile-btn"
          aria-label="Toggle navigation menu"
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 8,
            borderRadius: 8,
          }}
        >
          <div style={{ width: 20, height: 14, position: 'relative' }}>
            <span
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: '#374151',
                borderRadius: 1,
                top: mobileOpen ? 6 : 0,
                transform: mobileOpen ? 'rotate(45deg)' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: '#374151',
                borderRadius: 1,
                top: 6,
                opacity: mobileOpen ? 0 : 1,
                transition: 'all 0.2s ease',
              }}
            />
            <span
              style={{
                position: 'absolute',
                left: 0,
                right: 0,
                height: 2,
                backgroundColor: '#374151',
                borderRadius: 1,
                top: mobileOpen ? 6 : 12,
                transform: mobileOpen ? 'rotate(-45deg)' : 'none',
                transition: 'all 0.3s ease',
              }}
            />
          </div>
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileOpen && (
        <div
          className="nav-mobile-menu"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            backgroundColor: '#fff',
            borderBottom: '1px solid #e8ecf0',
            padding: '16px 24px 24px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <MobileNavLink href="/#features" label="Features" />
            <MobileNavLink href="/#how-it-works" label="How It Works" />
            <MobileNavLink href="/#accessibility" label="Accessibility" />
            <div style={{ height: 1, backgroundColor: '#f3f4f6', margin: '8px 0' }} />
            <MobileNavLink href="/teacher" label="Teacher Portal" />
          </div>
          <Link
            href="/student"
            style={{
              display: 'block',
              textAlign: 'center',
              textDecoration: 'none',
              fontSize: 15,
              fontWeight: 600,
              color: '#fff',
              backgroundColor: '#1a56db',
              padding: '12px 20px',
              borderRadius: 10,
              marginTop: 16,
            }}
          >
            Join as Student
          </Link>
        </div>
      )}

      <style>{`
        @media (max-width: 768px) {
          .nav-desktop { display: none !important; }
          .nav-mobile-btn { display: flex !important; }
        }
      `}</style>
    </nav>
  );
}

function NavLink({
  href,
  label,
  scrolled,
  isHome,
}: {
  href: string;
  label: string;
  scrolled: boolean;
  isHome: boolean;
}) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        fontSize: 14,
        fontWeight: 500,
        color: '#4b5563',
        padding: '8px 14px',
        borderRadius: 8,
        transition: 'all 0.2s ease',
      }}
    >
      {label}
    </Link>
  );
}

function MobileNavLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      style={{
        textDecoration: 'none',
        fontSize: 15,
        fontWeight: 500,
        color: '#374151',
        padding: '10px 12px',
        borderRadius: 8,
        display: 'block',
      }}
    >
      {label}
    </Link>
  );
}
