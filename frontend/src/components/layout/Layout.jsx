import { useState, useEffect } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';

export default function Layout({ children }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 769);
  const [sidebarOpen, setSidebarOpen] = useState(window.innerWidth >= 769);

  useEffect(() => {
    const handler = () => {
      const mobile = window.innerWidth < 769;
      setIsMobile(mobile);
      setSidebarOpen(!mobile);
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <>
      <Navbar onToggleSidebar={() => setSidebarOpen(p => !p)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      {/* Overlay for mobile screens when sidebar is open */}
      {sidebarOpen && isMobile && (
        <div
          onClick={() => setSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0,
            backgroundColor: 'transparent',
            zIndex: 97,
          }}
        />
      )}
      <main
        onClick={!isMobile && sidebarOpen ? () => setSidebarOpen(false) : undefined}
        style={{
          marginLeft: !isMobile && sidebarOpen ? 'var(--sidebar-width)' : '0',
          marginTop: 'var(--navbar-height)',
          padding: '28px',
          minHeight: 'calc(100vh - var(--navbar-height))',
          transition: 'margin-left 0.25s ease',
          backgroundColor: 'var(--bg-primary)'
        }}>
        {children}
      </main>
    </>
  );
}
