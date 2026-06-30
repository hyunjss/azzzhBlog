import { useState, useMemo } from 'react';
import PostCard from '../components/PostCard';
import { getAllPosts, getAllCategories } from '../utils/posts';
import './Home.css';

export default function Home() {
  const posts = getAllPosts();
  const categories = ['전체', ...getAllCategories()];
  const [activeCategory, setActiveCategory] = useState('전체');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    return posts.filter(p => {
      const matchCategory = activeCategory === '전체' || p.category === activeCategory;
      const matchSearch =
        p.title.toLowerCase().includes(search.toLowerCase()) ||
        p.description.toLowerCase().includes(search.toLowerCase()) ||
        p.tags.some(t => t.toLowerCase().includes(search.toLowerCase()));
      return matchCategory && matchSearch;
    });
  }, [posts, activeCategory, search]);

  return (
    <main className="home container">
      <section className="home__hero">
        <h1>azzzhBlog</h1>
        <p>프론트엔드 개발과 CS 공부를 기록합니다 ✍️</p>
      </section>

      <div className="home__controls">
        <input
          className="home__search"
          type="text"
          placeholder="포스트 검색..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <div className="home__categories">
          {categories.map(cat => (
            <button
              key={cat}
              className={`category-btn${activeCategory === cat ? ' active' : ''}`}
              onClick={() => setActiveCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      <div className="home__posts">
        {filtered.length > 0 ? (
          filtered.map(post => <PostCard key={post.slug} post={post} />)
        ) : (
          <p className="home__empty">포스트가 없습니다.</p>
        )}
      </div>
    </main>
  );
}
