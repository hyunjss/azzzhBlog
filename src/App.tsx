import { lazy, Suspense, useEffect } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import BlogLayout from './components/BlogLayout';
import './styles/global.css';

const About = lazy(() => import('./pages/About'));

export default function App() {
  useEffect(() => {
    document.getElementById('seo-fallback')?.remove();
  }, []);

  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<BlogLayout />} />
        <Route
          path="/about"
          element={
            <Suspense fallback={null}>
              <About />
            </Suspense>
          }
        />
      </Routes>
    </HashRouter>
  );
}
