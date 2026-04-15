import { adminDb } from "./admin";

export interface BlogPost {
  title: string;
  slug: string;
  content: string; // Markdown
  excerpt: string;
  coverImage: string;
  author: string;
  status: "draft" | "published";
  publishedAt: any; // Firestore Timestamp
  keywords: string[];
  ctaText?: string;
  ctaLink?: string;
}

const COLLECTION_NAME = "blog_posts";

export async function getPublishedPosts() {
  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .where("status", "==", "published")
    .orderBy("publishedAt", "desc")
    .get();

  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  })) as (BlogPost & { id: string })[];
}

export async function getPostBySlug(slug: string) {
  const snapshot = await adminDb
    .collection(COLLECTION_NAME)
    .where("slug", "==", slug)
    .limit(1)
    .get();

  if (snapshot.empty) return null;
  
  const doc = snapshot.docs[0];
  return {
    id: doc.id,
    ...doc.data()
  } as BlogPost & { id: string };
}

export async function createBlogPost(post: Partial<BlogPost>) {
  const docRef = await adminDb.collection(COLLECTION_NAME).add({
    ...post,
    createdAt: new Date(),
    status: post.status || "draft",
    publishedAt: post.publishedAt || new Date(),
  });
  return docRef.id;
}
