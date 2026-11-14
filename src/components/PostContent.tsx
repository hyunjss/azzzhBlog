import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import rehypeSlug from 'rehype-slug';
import remarkGfm from 'remark-gfm';
import Giscus from '@giscus/react';
import type { Post } from '../types';
import 'highlight.js/styles/github-dark.css';

type PostContentProps = {
  post: Post;
  theme: 'light' | 'dark';
};

export default function PostContent({ post, theme }: PostContentProps) {
  return (
    <>
      <header className="blog-content__header">
        <div className="blog-content__category">{post.category}</div>
        <h1 className="blog-content__title">{post.title}</h1>
        <div className="blog-content__meta">
          <span>{post.date}</span>
          <span>·</span>
          <span>{post.readingTime}분 읽기</span>
        </div>
        <div className="blog-content__tags">
          {post.tags.map(tag => (
            <span key={tag} className="post-tag post-tag--lg">#{tag}</span>
          ))}
        </div>
      </header>
      <article className="markdown-body">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, rehypeSlug]}
        >
          {post.content}
        </ReactMarkdown>
      </article>
      <div className="giscus-wrap">
        <Giscus
          repo="hyunjss/azzzhBlog"
          repoId="R_kgDOSOcAvg"
          category="Comment"
          categoryId="DIC_kwDOSOcAvs4DALvz"
          mapping="pathname"
          strict="0"
          reactionsEnabled="1"
          emitMetadata="0"
          inputPosition="bottom"
          theme={theme === 'dark' ? 'dark' : 'light'}
          lang="ko"
        />
      </div>
    </>
  );
}
