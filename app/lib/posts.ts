import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

const postsDirectory = path.join(process.cwd(), "posts");

export interface Post {
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
  content: string;
}

export interface PostMeta {
  slug: string;
  title: string;
  publishedAt: string;
  summary: string;
}

function toKebabCase(str: string) {
  return str
    .replace(/\.md$/, "")
    .replace(/([a-z0-9]|(?=[A-Z]))([A-Z])/g, "$1-$2")
    .toLowerCase();
}

export async function getPosts(): Promise<PostMeta[]> {
  const filenames = await fs.readdir(postsDirectory);
  const posts = await Promise.all(
    filenames
      .filter((filename) => filename.endsWith(".md"))
      .map(async (filename) => {
        const fullPath = path.join(postsDirectory, filename);
        const fileContents = await fs.readFile(fullPath, "utf8");
        const { data } = matter(fileContents);

        return {
          slug: toKebabCase(filename),
          title: data.title,
          publishedAt: data.publishedAt,
          summary: data.summary,
        };
      })
  );

  return posts.sort((a, b) => (a.publishedAt < b.publishedAt ? 1 : -1));
}

export async function getPost(slug: string): Promise<Post | null> {
  const filenames = await fs.readdir(postsDirectory);
  const filename = filenames.find((fname) => toKebabCase(fname) === slug);

  if (!filename) {
    return null;
  }

  const fullPath = path.join(postsDirectory, filename);
  const fileContents = await fs.readFile(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    slug,
    title: data.title,
    publishedAt: data.publishedAt,
    summary: data.summary,
    content,
  };
}
