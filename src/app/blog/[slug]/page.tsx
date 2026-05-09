import { getPostBySlug } from "@/lib/blog";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import ReactMarkdown from "react-markdown";
import { ArrowLeft, Calendar, User, Share2, Clock, ArrowRight, Search } from "lucide-react";
import { Navbar } from "@/components/navbar";

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props) {
  const resolvedParams = await params;
  const post = await getPostBySlug(resolvedParams.slug);
  if (!post) return {};

  return {
    title: `${post.title} | Employee Zero`,
    description: post.excerpt,
    openGraph: {
      title: post.title,
      description: post.excerpt,
      images: [post.coverImage],
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const resolvedParams = await params;
  const post = await getPostBySlug(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  const publishDate = new Date(post.publishedAt?.toDate ? post.publishedAt.toDate() : post.publishedAt);
  
  return (
    <div className="min-h-screen bg-[#050B15] text-white selection:bg-emerald-500/30 font-sans">
      <Navbar />

      <main className="max-w-[1400px] mx-auto px-6 pt-12">
        {/* Back Navigation */}
        <div className="border-b border-white/10 pb-6 mb-12">
          <Link href="/blog" className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-neutral-500 hover:text-emerald-500 transition-colors group">
            <ArrowLeft size={14} className="group-hover:-translate-x-1 transition-transform" />
            Back to Scaling Hub
          </Link>
        </div>

        {/* Venice Split Header */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-white/10 mb-16">
          {/* Post Info (Left 40%) */}
          <div className="lg:col-span-5 border-r border-white/10 pb-12 lg:pr-12 flex flex-col justify-center">
            <div className="space-y-6 pt-8">
              <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-500">
                <span>{post.keywords?.[0] || 'Uncategorized'}</span>
                <span className="w-1 h-1 rounded-full bg-white/10" />
                <span>5 min read</span>
              </div>
              <h1 className="text-4xl md:text-6xl font-serif leading-[1.1] tracking-tight">
                {post.title}
              </h1>
              <p className="text-neutral-400 text-lg leading-relaxed italic border-l-2 border-emerald-500/30 pl-6 py-2">
                {post.excerpt}
              </p>
              
              <div className="flex items-center gap-4 pt-8 border-t border-white/5 mt-12 w-fit">
                <div className="w-12 h-12 rounded-full bg-neutral-800 p-[1px]">
                  <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden grayscale">
                    <User size={24} className="text-neutral-600" />
                  </div>
                </div>
                <div>
                  <div className="text-sm font-bold">{post.author}</div>
                  <div className="text-[10px] uppercase tracking-widest text-neutral-600 font-bold">
                    {publishDate.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Featured Image (Right 60%) */}
          <div className="lg:col-span-7 pb-12 lg:pl-12 pt-12 lg:pt-0">
            <div className="relative aspect-[16/10] overflow-hidden rounded-sm grayscale">
              <Image
                src={post.coverImage}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 border border-white/5 pointer-events-none" />
            </div>
          </div>
        </section>

        {/* Article Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 pb-32">
          {/* Sidebar Tools */}
          <aside className="hidden lg:block lg:col-span-1">
             <div className="sticky top-32 flex flex-col items-center gap-8 text-neutral-600">
               <span className="rotate-90 whitespace-nowrap text-[10px] font-bold uppercase tracking-widest mb-4">Share Insights</span>
               <button className="hover:text-emerald-500 transition-colors"><Share2 size={20} /></button>
               <button className="hover:text-emerald-500 transition-colors"><Clock size={20} /></button>
               <div className="w-[1px] h-12 bg-white/10" />
             </div>
          </aside>

          {/* Content Body */}
          <div className="lg:col-span-8 lg:col-start-2">
            <div className="prose prose-invert lg:prose-xl font-sans leading-relaxed selection:bg-emerald-500/30
              prose-headings:font-serif prose-headings:font-normal prose-headings:tracking-tight
              prose-p:text-neutral-400 prose-p:leading-[1.8]
              prose-strong:text-white prose-strong:font-bold
              prose-a:text-emerald-400 prose-a:no-underline hover:prose-a:underline
              prose-img:rounded-sm">
              <ReactMarkdown>{post.content}</ReactMarkdown>
            </div>

            {/* In-Article CTA */}
            <section className="mt-24 pt-16 border-t border-white/10 flex flex-col items-center text-center space-y-8">
               <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
                 <Search className="text-emerald-400" size={20} />
               </div>
               <div className="space-y-2">
                 <h2 className="text-3xl md:text-5xl font-serif">Ready to transition?</h2>
                 <p className="text-neutral-400 max-w-md mx-auto">
                   Explore curated AI professionals in the Hiring Hall for your next growth phase.
                 </p>
               </div>
               <Link 
                href="/hiring-hall" 
                className="group flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-bold hover:bg-emerald-400 transition-all"
               >
                 Go to Hiring Hall
                 <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
               </Link>
            </section>
          </div>
        </div>
      </main>

      {/* Modern Newsletter Footer */}
      <footer className="border-t border-white/10 bg-[#080E1A] py-32 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center space-y-12">
          <div className="w-16 h-[1px] bg-emerald-500/50" />
          <div className="space-y-4">
            <h3 className="text-4xl md:text-6xl font-serif tracking-tight">Stay Automated.</h3>
            <p className="text-neutral-400 max-w-md mx-auto leading-relaxed">
              Get our best Scaling Strategies delivered to your digital office.
            </p>
          </div>
          <form className="w-full max-w-md flex border-b border-white/20 focus-within:border-emerald-500 transition-all pb-2">
            <input 
              type="email" 
              placeholder="Your email address" 
              className="bg-transparent flex-1 outline-none text-white text-sm font-medium placeholder:text-neutral-600"
            />
            <button type="submit" className="text-[10px] uppercase font-bold tracking-widest text-emerald-500 hover:text-white transition-colors">
              Subscribe
            </button>
          </form>
        </div>
      </footer>
    </div>
  );
}
