import { useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import BlogLayout from './components/BlogLayout';
import About from './pages/About';
import './styles/global.css';

export default function App() {
  useEffect(() => {
    document.getElementById('seo-fallback')?.remove();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<BlogLayout />} />
        <Route path="/post/:slug" element={<BlogLayout />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </HashRouter>
  );
}
