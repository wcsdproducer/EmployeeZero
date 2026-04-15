import { getPublishedPosts } from "@/lib/blog";
import Link from "next/link";
import Image from "next/image";
import { ArrowUpRight, ArrowRight, Calendar, User, Search } from "lucide-react";
import { Navbar } from "@/components/navbar";

export const revalidate = 3600; // Revalidate every hour

export default async function BlogIndex() {
  const allPosts = await getPublishedPosts();
  
  // Split posts for the Venice layout
  const featuredPost = allPosts[0];
  const spotlightPosts = allPosts.slice(1, 4);
  const remainingPosts = allPosts.slice(4);

  return (
    <div className="min-h-screen bg-[#050B15] text-white selection:bg-emerald-500/30 font-sans">
      <Navbar />
      
      <main className="max-w-[1400px] mx-auto px-6 pt-12">
        {/* Editorial Header */}
        <div className="flex flex-col md:flex-row justify-between items-end border-b border-white/10 pb-8 mb-12 gap-8">
          <div className="space-y-2">
            <span className="text-emerald-500 font-bold tracking-[0.2em] uppercase text-[10px]">The Scaling Hub</span>
            <h1 className="text-5xl md:text-8xl font-serif tracking-tight leading-[0.9]">
              Growth <br />
              <span className="text-neutral-500 italic">Journal</span>
            </h1>
          </div>
          <div className="max-w-xs text-sm text-neutral-400 leading-relaxed font-medium">
            Insights on hiring AI employees, automating enterprise ops, and reclaimed growth for 10x founders.
          </div>
        </div>

        {/* Hero Section (Venice Split Screen) */}
        {featuredPost && (
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-0 border-b border-white/10 mb-20">
            {/* Featured Post (Left 65%) */}
            <div className="lg:col-span-8 border-r border-white/10 pb-12 lg:pr-12">
              <Link href={`/blog/${featuredPost.slug}`} className="group block space-y-8">
                <div className="relative aspect-[16/9] overflow-hidden grayscale hover:grayscale-0 transition-all duration-700 rounded-sm">
                  <Image
                    src={featuredPost.coverImage}
                    alt={featuredPost.title}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute top-6 left-6 px-3 py-1 bg-emerald-500 text-black text-[10px] font-bold uppercase tracking-widest rounded-full">
                    Featured
                  </div>
                </div>
                <div className="space-y-4 pr-4">
                  <h2 className="text-4xl md:text-6xl font-serif leading-tight group-hover:text-emerald-400 transition-colors">
                    {featuredPost.title}
                  </h2>
                  <p className="text-neutral-400 text-lg leading-relaxed max-w-2xl line-clamp-3">
                    {featuredPost.excerpt}
                  </p>
                  <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest text-neutral-500 group-hover:text-white transition-colors">
                    Read Article <ArrowRight size={16} className="text-emerald-500" />
                  </div>
                </div>
              </Link>
            </div>

            {/* Spotlight Sidebar (Right 35%) */}
            <div className="lg:col-span-4 lg:pl-12 pt-12 lg:pt-0 pb-12">
              <div className="space-y-8">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-widest text-neutral-500">Spotlight</h3>
                  <Link href="/blog/rss.xml" className="text-xs text-emerald-500 hover:underline">RSS Feed</Link>
                </div>
                
                <div className="space-y-0 divide-y divide-white/10 border-t border-white/10">
                  {spotlightPosts.map((post) => (
                    <Link 
                      key={post.id} 
                      href={`/blog/${post.slug}`} 
                      className="group block py-8 space-y-3"
                    >
                      <div className="flex justify-between items-start gap-4">
                        <h4 className="text-xl font-serif leading-snug group-hover:text-emerald-400 transition-colors">
                          {post.title}
                        </h4>
                        <ArrowUpRight size={20} className="text-neutral-600 group-hover:text-emerald-400 transition-all group-hover:-translate-y-1 group-hover:translate-x-1" />
                      </div>
                      <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-neutral-600">
                        {new Date(post.publishedAt?.toDate ? post.publishedAt.toDate() : post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </div>
                    </Link>
                  ))}
                  
                  {spotlightPosts.length === 0 && (
                    <div className="py-8 text-neutral-600 text-sm italic">
                      More insights arriving soon.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Categories / Filter Bar */}
        <div className="flex items-center justify-between mb-12 border-b border-white/10 pb-6">
          <div className="flex gap-8 overflow-x-auto no-scrollbar pb-2">
            {["All Insights", "AI Strategy", "Scaling", "Founders", "Automation"].map((cat) => (
              <button key={cat} className="whitespace-nowrap text-[10px] uppercase tracking-widest font-bold text-neutral-500 hover:text-emerald-500 transition-colors">
                {cat}
              </button>
            ))}
          </div>
          <div className="hidden md:flex items-center text-neutral-500 hover:text-white cursor-pointer transition-colors gap-2 text-[10px] font-bold uppercase tracking-widest">
            Search <Search size={14} />
          </div>
        </div>

        {/* Main Feed (2-Column Grid) */}
        <section className="pb-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-16 gap-y-24">
            {remainingPosts.map((post) => (
              <Link 
                key={post.id} 
                href={`/blog/${post.slug}`}
                className="group block space-y-6"
              >
                <div className="relative aspect-[16/10] overflow-hidden rounded-sm grayscale group-hover:grayscale-0 transition-all duration-700">
                  <Image
                    src={post.coverImage}
                    alt={post.title}
                    fill
                    className="object-cover transition-transform duration-1000 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 border border-white/5 opacity-50 pointer-events-none" />
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] font-bold text-emerald-500">
                    <span>{post.keywords?.[0] || 'Uncategorized'}</span>
                    <span className="w-1 h-1 rounded-full bg-white/10" />
                    <span className="text-neutral-600">{new Date(post.publishedAt?.toDate ? post.publishedAt.toDate() : post.publishedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                  </div>
                  <h3 className="text-3xl font-serif leading-tight group-hover:text-emerald-400 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-neutral-400 leading-relaxed line-clamp-2 text-sm">
                    {post.excerpt}
                  </p>
                </div>
              </Link>
            ))}
          </div>

          {remainingPosts.length === 0 && posts.length <= 4 && (
            <div className="text-center py-40 border border-dashed border-white/10 rounded-sm">
              <p className="text-neutral-500 font-serif italic text-2xl">The archive is currently empty.</p>
            </div>
          )}
        </section>
      </main>

      {/* Modern Newsletter Footer */}
      <footer className="border-t border-white/10 bg-[#080E1A] py-32 px-6">
        <div className="max-w-5xl mx-auto flex flex-col items-center text-center space-y-12">
          <div className="w-16 h-[1px] bg-emerald-500/50" />
          <div className="space-y-4">
            <h3 className="text-4xl md:text-6xl font-serif tracking-tight">Daily Scaling Insights.</h3>
            <p className="text-neutral-400 max-w-md mx-auto leading-relaxed">
              Join 1,000+ founders receiving automated operations strategies every morning.
            </p>
          </div>
          <form className="w-full max-w-md flex border-b border-white/20 focus-within:border-emerald-500 transition-all pb-2">
            <input 
              type="email" 
              placeholder="Enter your email" 
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
