import { Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import './Header.css';

export default function Header() {
  const { pathname } = useLocation();
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  return (
    <header className="header">
      <div className="container header__inner">
        <Link to="/" className="header__logo">azzzhBlog</Link>
        <nav className="header__nav">
          <Link to="/" className={pathname === '/' ? 'active' : ''}>홈</Link>
          <Link to="/about" className={pathname === '/about' ? 'active' : ''}>소개</Link>
        </nav>
        <button
          className="header__theme-btn"
          onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
          aria-label="테마 전환"
        >
          {theme === 'light' ? '🌙' : '☀️'}
        </button>
      </div>
    </header>
  );
}
