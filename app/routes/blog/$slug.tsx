import { useLoaderData, Link } from "react-router";
import ReactMarkdown from "react-markdown";
import { getPost } from "~/lib/posts";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "~/components/ui/card";
import { Button } from "~/components/ui/button";
import { PublicLayout } from "~/components/layout/PublicLayout";

export async function loader({ params }: { params: { slug?: string } }) {
  if (!params.slug) {
    throw new Response("Not Found", { status: 404 });
  }
  const post = await getPost(params.slug);
  if (!post) {
    throw new Response("Not Found", { status: 404 });
  }
  return { post };
}

export default function BlogPost() {
  const { post } = useLoaderData<typeof loader>();

  return (
    <PublicLayout>
      <div className="container mx-auto max-w-3xl py-12">
        <Button asChild variant="link" className="mb-6 p-0 h-auto text-primary">
          <Link to="/blog">&larr; Back to blog</Link>
        </Button>
        <Card className="prose prose-lg max-w-none w-full">
          <CardHeader>
            <CardTitle className="text-4xl font-bold leading-tight mb-2">{post.title}</CardTitle>
            <CardDescription className="text-base">
              {new Date(post.publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ReactMarkdown>{post.content}</ReactMarkdown>
          </CardContent>
        </Card>
      </div>
    </PublicLayout>
  );
}


