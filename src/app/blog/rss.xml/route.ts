import { Feed } from "feed";
import { getPublishedPosts } from "@/lib/blog";
import { NextResponse } from "next/server";

export async function GET() {
  const posts = await getPublishedPosts();
  const siteUrl = "https://employeezero.app";

  const feed = new Feed({
    title: "Employee Zero Blog",
    description: "The official blog of Employee Zero — The AI Employee Platform.",
    id: siteUrl,
    link: siteUrl,
    language: "en",
    image: `${siteUrl}/logo.png`,
    favicon: `${siteUrl}/favicon.ico`,
    copyright: `All rights reserved ${new Date().getFullYear()}, Employee Zero`,
    author: {
      name: "Jack Freeman",
      email: "jack@employeezero.app",
      link: siteUrl,
    },
  });

  posts.forEach((post) => {
    feed.addItem({
      title: post.title,
      id: `${siteUrl}/blog/${post.slug}`,
      link: `${siteUrl}/blog/${post.slug}`,
      description: post.excerpt,
      content: post.content,
      author: [
        {
          name: post.author,
          link: siteUrl,
        },
      ],
      date: post.publishedAt?.toDate ? post.publishedAt.toDate() : new Date(post.publishedAt),
      image: post.coverImage,
    });
  });

  return new NextResponse(feed.rss2(), {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
