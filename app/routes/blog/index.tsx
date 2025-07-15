import { Link, useLoaderData } from "react-router";
import { getPosts } from "~/lib/posts";
import type { PostMeta } from "~/lib/posts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { PublicLayout } from "~/components/layout/PublicLayout";

export async function loader() {
  const posts = await getPosts();
  return { posts };
}

export default function BlogIndex() {
  const { posts } = useLoaderData<typeof loader>();

  return (
    <PublicLayout>
      <div className="container mx-auto max-w-5xl py-10">
        <h1 className="mb-10 text-4xl font-bold tracking-tight">Blog</h1>
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <PostCard key={post.slug} post={post} />
          ))}
        </div>
      </div>
    </PublicLayout>
  );
}

export function PostCard({ post }: { post: PostMeta }) {
  return (
    <Card className="h-full flex flex-col justify-between transition-shadow hover:shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-semibold mb-1">{post.title}</CardTitle>
        <CardDescription>
          {new Date(post.publishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 pb-0">
        <p className="text-base text-muted-foreground line-clamp-3">{post.summary}</p>
      </CardContent>
      <CardFooter className="pt-4">
        <Button asChild variant="link" className="p-0 h-auto text-primary">
          <Link to={`/blog/${post.slug}`}>Read more &rarr;</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}



