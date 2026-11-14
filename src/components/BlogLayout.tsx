import { lazy, Suspense, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAllPosts, getAllCategories, getPostBySlug } from '../utils/posts';
import type { PostMeta, Post } from '../types';
import './BlogLayout.css';

const PostContent = lazy(() => import('./PostContent'));


export default function BlogLayout() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const allPosts = getAllPosts();
  const categories = ['전체', ...getAllCategories()];

  const [activeCategory, setActiveCategory] = useState('전체');
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [postLoading, setPostLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() =>
    (localStorage.getItem('theme') as 'light' | 'dark') ?? 'light'
  );

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    if (slug) {
      setPostLoading(true);
      getPostBySlug(slug).then(post => {
        if (post) setActivePost(post);
        setPostLoading(false);
      });
    }
  }, [slug]);

  useEffect(() => {
    const siteName = 'azzzhBlog';
    const siteDesc = '개발하면서 공부한 것들을 기록하는 공간';
    const siteUrl = 'https://hyunjss.github.io/azzzhBlog';

    const title = activePost ? `${activePost.title} | ${siteName}` : siteName;
    const desc = activePost?.description ?? siteDesc;
    const url = activePost ? `${siteUrl}/post/${activePost.slug}` : siteUrl;

    document.title = title;

    const setMeta = (selector: string, value: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      if (el) el.content = value;
    };

    setMeta('meta[name="description"]', desc);
    setMeta('meta[property="og:title"]', title);
    setMeta('meta[property="og:description"]', desc);
    setMeta('meta[property="og:url"]', url);
    setMeta('meta[property="og:type"]', activePost ? 'article' : 'website');
    setMeta('meta[name="twitter:title"]', title);
    setMeta('meta[name="twitter:description"]', desc);

    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [activePost]);

  const filteredPosts: PostMeta[] = activeCategory === '전체'
    ? allPosts
    : allPosts.filter(p => p.category === activeCategory);

  function handleSelectCategory(cat: string) {
    setActiveCategory(cat);
    setSidebarOpen(false);
    navigate('/');
  }

  return (
    <div className={`blog-layout${(activePost || postLoading) ? ' blog-layout--post-active' : ''}`}>

      {/* ── macOS 타이틀바 ── */}
      <div className="titlebar">
        <div className="traffic-lights" aria-hidden="true">
          <span className="traffic-light traffic-light--close" />
          <span className="traffic-light traffic-light--min" />
          <span className="traffic-light traffic-light--max" />
        </div>
        <button
          className="titlebar__hamburger"
          onClick={() => setSidebarOpen(o => !o)}
          aria-label="메뉴"
        >☰</button>
        <span className="titlebar__title">
          {activePost ? activePost.title : 'azzzhBlog'}
        </span>
        <div className="titlebar__actions">
          <button
            className="titlebar__btn"
            onClick={() => navigate('/about')}
            title="소개"
          >About</button>
          <button
            className="titlebar__btn"
            onClick={() => setTheme(t => t === 'light' ? 'dark' : 'light')}
            title="테마 전환"
          >
            {theme === 'light' ? 'Dark' : 'Light'}
          </button>
        </div>
      </div>

      {/* ── 3패널 바디 ── */}
      <div className="blog-body">

        {/* 모바일 사이드바 backdrop */}
        {sidebarOpen && (
          <div className="sidebar-backdrop" onClick={() => setSidebarOpen(false)} />
        )}

        {/* 왼쪽: 카테고리 사이드바 */}
        <aside className={`blog-sidebar${sidebarOpen ? ' blog-sidebar--open' : ''}`}>
          <div className="blog-sidebar__section-label">카테고리</div>
          <nav className="blog-sidebar__nav">
            {categories.map(cat => (
              <button
                key={cat}
                className={`sidebar-item${activeCategory === cat && !activePost ? ' active' : ''}`}
                onClick={() => handleSelectCategory(cat)}
              >
                <span className="sidebar-item__label">{cat}</span>
                <span className="sidebar-item__count">
                  {cat === '전체'
                    ? allPosts.length
                    : allPosts.filter(p => p.category === cat).length}
                </span>
              </button>
            ))}
          </nav>
        </aside>

        <main className="blog-main">
        {/* 가운데: 포스트 목록 */}
        <section className="blog-list">
          <div className="blog-list__header">
            <h2>{activeCategory}</h2>
            <div className="blog-list__count">{filteredPosts.length}개의 노트</div>
          </div>
          <div className="blog-list__items">
            {filteredPosts.length > 0 ? filteredPosts.map(post => (
              <a
                key={post.slug}
                href={`${import.meta.env.BASE_URL}post/${encodeURIComponent(post.slug)}/`}
                className={`post-item${activePost?.slug === post.slug ? ' active' : ''}`}
              >
                <div className="post-item__title">{post.title}</div>
                <div className="post-item__date">{post.date} · {post.readingTime}분</div>
                <div className="post-item__desc">{post.description}</div>
                <div className="post-item__tags">
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="post-tag">#{tag}</span>
                  ))}
                </div>
              </a>
            )) : (
              <p className="blog-list__empty">포스트가 없습니다.</p>
            )}
          </div>
        </section>

        {/* 오른쪽: 포스트 내용 */}
        <section className="blog-content">
          <div className="blog-content__inner">
            {postLoading ? null : activePost ? (
              <>
                <button
                  className="blog-content__back-mobile"
                  onClick={() => { setActivePost(null); navigate('/'); }}
                >← 목록으로</button>
                <Suspense fallback={<p className="post-loading" role="status">게시글을 불러오는 중...</p>}>
                  <PostContent post={activePost} theme={theme} />
                </Suspense>
              </>
            ) : (
              <div className="blog-content__empty">
                <p>노트를 선택해주세요</p>
              </div>
            )}
          </div>
        </section>
        </main>
      </div>
    </div>
  );
}
