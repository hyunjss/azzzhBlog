import { lazy, Suspense, useEffect, useState } from 'react';
import BlogLayout from './components/BlogLayout';
import './styles/global.css';

const About = lazy(() => import('./pages/About'));

function getRoute() {
  return window.location.hash.slice(1) || '/';
}

export default function App() {
  const [route, setRoute] = useState(getRoute);

  useEffect(() => {
    const handleHashChange = () => setRoute(getRoute());
    window.addEventListener('hashchange', handleHashChange);
    document.getElementById('seo-fallback')?.remove();

    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (route === '/about') {
    return (
      <Suspense fallback={null}>
        <About />
      </Suspense>
    );
  }

  return <BlogLayout />;
}
