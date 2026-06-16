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
      if (!mobile) {
        setSidebarOpen(true);
      } else {
        setSidebarOpen(false);
      }
    };
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);

  return (
    <>
      <Navbar onToggleSidebar={() => setSidebarOpen(p => !p)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main style={{
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
