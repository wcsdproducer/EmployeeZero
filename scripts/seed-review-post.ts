import { createBlogPost } from "../src/lib/blog";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from the project root
dotenv.config({ path: path.join(__dirname, "../.env") });

async function seed() {
  const reviewPost = {
    title: "Review Post: Employee Zero Features and Performance",
    slug: "review-post-employee-zero",
    excerpt: "Review this post detailing the core features, performance metrics, and use cases of Employee Zero. Let us know your thoughts on the content format and style.",
    content: `# Review Post: Employee Zero

Please review this content block to ensure the formatting and style match our new blog layout.

## Core Features
1. **Always On:** 24/7 autonomous operations.
2. **Seamless Integrations:** Works directly with Slack, Email, and Google Workspace.
3. **Cost Effective:** Radically lower costs compared to traditional hiring.

## Testimonials
> "Employee Zero has completely changed how our operations team functions." - Beta User

Please let me know if any adjustments are needed for the structure, typography, or image placements.
`,
    coverImage: "/blog/ai-employee-hire.png", // Using an existing image
    author: "Content Team",
    status: "published" as const, // Published so it appears on the live site
    keywords: ["Review", "Content", "Draft"],
    publishedAt: new Date(),
  };

  console.log("Seeding review blog post...");
  const id = await createBlogPost(reviewPost);
  console.log("Success! Blog post ID:", id);
  process.exit(0);
}

seed().catch(err => {
  console.error("Seed failed:", err);
  process.exit(1);
});
