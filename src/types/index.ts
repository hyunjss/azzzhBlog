export interface PostMeta {
  slug: string;
  path: string;
  title: string;
  date: string;
  category: string;
  tags: string[];
  description: string;
  readingTime: number;
}

export interface Post extends PostMeta {
  content: string;
}
