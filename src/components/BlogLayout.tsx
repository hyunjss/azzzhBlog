import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAllPosts, getAllCategories, getPostBySlug } from '../utils/posts';
import type { PostMeta, Post } from '../types';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import 'highlight.js/styles/github-dark.css';
import './BlogLayout.css';


export default function BlogLayout() {
  const { slug } = useParams<{ slug?: string }>();
  const navigate = useNavigate();

  const allPosts = getAllPosts();
  const categories = ['전체', ...getAllCategories()];

  const [activeCategory, setActiveCategory] = useState('전체');
  const [activePost, setActivePost] = useState<Post | null>(null);
  const [postLoading, setPostLoading] = useState(false);
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
    const siteUrl = 'https://hhyun.github.io';

    const title = activePost ? `${activePost.title} | ${siteName}` : siteName;
    const desc = activePost?.description ?? siteDesc;
    const url = activePost ? `${siteUrl}/post/${activePost.slug}` : siteUrl;

    document.title = title;

    const setMetaContent = (selector: string, value: string) => {
      const el = document.querySelector<HTMLMetaElement>(selector);
      if (el) el.content = value;
    };

    setMetaContent('meta[name="description"]', desc);
    setMetaContent('meta[property="og:title"]', title);
    setMetaContent('meta[property="og:description"]', desc);
    setMetaContent('meta[property="og:url"]', url);
    setMetaContent('meta[property="og:type"]', activePost ? 'article' : 'website');
    setMetaContent('meta[name="twitter:title"]', title);
    setMetaContent('meta[name="twitter:description"]', desc);
  }, [activePost]);

  const filteredPosts: PostMeta[] = activeCategory === '전체'
    ? allPosts
    : allPosts.filter(p => p.category === activeCategory);

  function handleSelectPost(post: PostMeta) {
    navigate(`/post/${post.slug}`);
    setPostLoading(true);
    getPostBySlug(post.slug).then(full => {
      if (full) setActivePost(full);
      setPostLoading(false);
    });
  }

  function handleSelectCategory(cat: string) {
    setActiveCategory(cat);
    navigate('/');
  }

  return (
    <div className="blog-layout">

      {/* ── macOS 타이틀바 ── */}
      <div className="titlebar">
        <div className="traffic-lights">
          <button className="traffic-light traffic-light--close" aria-label="닫기" />
          <button className="traffic-light traffic-light--min"   aria-label="최소화" />
          <button className="traffic-light traffic-light--max"   aria-label="최대화" />
        </div>
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

        {/* 왼쪽: 카테고리 사이드바 */}
        <aside className="blog-sidebar">
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

        {/* 가운데: 포스트 목록 */}
        <section className="blog-list">
          <div className="blog-list__header">
            <h2>{activeCategory}</h2>
            <div className="blog-list__count">{filteredPosts.length}개의 노트</div>
          </div>
          <div className="blog-list__items">
            {filteredPosts.length > 0 ? filteredPosts.map(post => (
              <button
                key={post.slug}
                className={`post-item${activePost?.slug === post.slug ? ' active' : ''}`}
                onClick={() => handleSelectPost(post)}
              >
                <div className="post-item__title">{post.title}</div>
                <div className="post-item__date">{post.date} · {post.readingTime}분</div>
                <div className="post-item__desc">{post.description}</div>
                <div className="post-item__tags">
                  {post.tags.slice(0, 3).map(tag => (
                    <span key={tag} className="post-tag">#{tag}</span>
                  ))}
                </div>
              </button>
            )) : (
              <p className="blog-list__empty">포스트가 없습니다.</p>
            )}
          </div>
        </section>

        {/* 오른쪽: 포스트 내용 */}
        <main className="blog-content">
          {postLoading ? (
            <div className="blog-content__empty">
              <p>불러오는 중...</p>
            </div>
          ) : activePost ? (
            <div className="blog-content__inner">
              <header className="blog-content__header">
                <div className="blog-content__category">{activePost.category}</div>
                <h1 className="blog-content__title">{activePost.title}</h1>
                <div className="blog-content__meta">
                  <span>{activePost.date}</span>
                  <span>·</span>
                  <span>{activePost.readingTime}분 읽기</span>
                </div>
                <div className="blog-content__tags">
                  {activePost.tags.map(tag => (
                    <span key={tag} className="post-tag post-tag--lg">#{tag}</span>
                  ))}
                </div>
              </header>
              <article className="markdown-body">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeHighlight, rehypeSlug]}
                >
                  {activePost.content}
                </ReactMarkdown>
              </article>
            </div>
          ) : (
            <div className="blog-content__empty">
              <p>노트를 선택해주세요</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
