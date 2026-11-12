import { BrowserRouter, Routes, Route } from 'react-router-dom';
import BlogLayout from './components/BlogLayout';
import About from './pages/About';
import './styles/global.css';

export default function App() {
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <Routes>
        <Route path="/" element={<BlogLayout />} />
        <Route path="/post/:slug" element={<BlogLayout />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </BrowserRouter>
  );
}
