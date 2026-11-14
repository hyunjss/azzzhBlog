import { useState, useEffect } from 'react';
import { getAllPosts, getAllCategories } from '../utils/posts';
import type { PostMeta } from '../types';
import './BlogLayout.css';

export default function BlogLayout() {
  const allPosts = getAllPosts();
  const categories = ['전체', ...getAllCategories()];

  const [activeCategory, setActiveCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    const siteName = 'azzzhBlog';
    const siteDesc = '프론트엔드 개발 경험과 AI Skill, AI 활용 프로젝트를 기록하는 기술 블로그';
    const siteUrl = 'https://hyunjss.github.io/azzzhBlog';

    document.title = siteName;
    const setMeta = (selector: string, value: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      if (el) el.content = value;
    };

    setMeta('meta[name="description"]', siteDesc);
    setMeta('meta[property="og:title"]', siteName);
    setMeta('meta[property="og:description"]', siteDesc);
    setMeta('meta[property="og:url"]', siteUrl + '/');
    setMeta('meta[property="og:type"]', 'website');
    setMeta('meta[name="twitter:title"]', siteName);
    setMeta('meta[name="twitter:description"]', siteDesc);

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = siteUrl + '/';
  }, []);

  const normalizedQuery = searchQuery.trim().toLocaleLowerCase('ko-KR');
  const filteredPosts: PostMeta[] = allPosts.filter(post => {
    const matchesCategory = activeCategory === '전체' || post.category === activeCategory;
    if (!matchesCategory) return false;
    if (!normalizedQuery) return true;

    const searchableText = [post.title, post.description, post.category, ...post.tags]
      .join(' ')
      .toLocaleLowerCase('ko-KR');
    return normalizedQuery.split(/\\s+/).every(term => searchableText.includes(term));
  });

  function handleSelectCategory(cat: string) {
    setActiveCategory(cat);
    setSidebarOpen(false);
  }

  return (
    <div className="blog-layout">
      <div className="titlebar">
        <div className="traffic-lights" aria-hidden="true">
          <span className="traffic-light traffic-light--close" />
          <span className="traffic-light traffic-light--min" />
          <span className="traffic-light traffic-light--max" />
        </div>
        <button className="titlebar__hamburger" onClick={() => setSidebarOpen(o => !o)} aria-label="메뉴">☰</button>
        <span className="titlebar__title">azzzhBlog</span>
        <div className="titlebar__actions">
          <button className="titlebar__btn" onClick={() => { window.location.hash = '/about'; }} title="소개">About</button>
          <button className="titlebar__btn" onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')} title="테마 전환">
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </div>

      <div className="blog-body">
        {sidebarOpen && <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />}

        <aside className={'blog-sidebar' + (sidebarOpen ? ' blog-sidebar--open' : '')}>
          <div className="blog-sidebar__section-label">카테고리</div>
          <nav className="blog-sidebar__nav">
            {categories.map(cat => (
              <button
                key={cat}
                className={'sidebar-item' + (activeCategory === cat ? ' active' : '')}
                onClick={() => handleSelectCategory(cat)}
              >
                <span className="sidebar-item__label">{cat}</span>
                <span className="sidebar-item__count">
                  {cat === '전체' ? allPosts.length : allPosts.filter(p => p.category === cat).length}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="blog-main">
          <section className="blog-list">
            <div className="blog-list__header">
              <h2>{activeCategory}</h2>
              <div className="blog-list__count" aria-live="polite">{filteredPosts.length}개의 노트</div>
              <label className="blog-search">
                <input
                  type="search"
                  value={searchQuery}
                  onChange={event => setSearchQuery(event.target.value)}
                  placeholder="제목, 설명, 태그 검색"
                  aria-label="포스트 검색"
                />
              </label>
            </div>
            <div className="blog-list__items">
              {filteredPosts.length > 0 ? filteredPosts.map(post => (
                <a
                  key={post.slug}
                  href={import.meta.env.BASE_URL + 'post/' + encodeURIComponent(post.slug) + '/'}
                  className="post-item"
                >
                  <div className="post-item__title">{post.title}</div>
                  <div className="post-item__date">{post.date} · {post.readingTime}분</div>
                  <div className="post-item__desc">{post.description}</div>
                  <div className="post-item__tags">
                    {post.tags.slice(0, 3).map(tag => <span key={tag} className="post-tag">#{tag}</span>)}
                  </div>
                </a>
              )) : <p className="blog-list__empty">{normalizedQuery ? '검색 결과가 없습니다.' : '포스트가 없습니다.'}</p>}
            </div>
          </section>

          <section className="blog-content">
            <div className="blog-content__inner">
              <div className="blog-content__empty"><p>노트를 선택해주세요</p></div>
            </div>
          </section>
        </main>
      </div>
    </div>
  );
}
