import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ROLES } from "@/lib/pseoData";
import { Zap, ArrowRight, Check, Clock, Target, Shield } from "lucide-react";

interface Props { params: Promise<{ role: string }> }

export async function generateStaticParams() {
  return ROLES.map((r) => ({ role: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { role: slug } = await params;
  const role = ROLES.find((r) => r.slug === slug);
  if (!role) return { title: "Not Found" };
  return {
    title: `AI Employee for ${role.title} | Employee Zero`,
    description: role.description,
    openGraph: {
      title: `AI Employee for ${role.title}`,
      description: role.description,
      url: `https://employeezero.app/use-cases/${role.slug}`,
    },
  };
}

export default async function RolePage({ params }: Props) {
  const { role: slug } = await params;
  const role = ROLES.find((r) => r.slug === slug);
  if (!role) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: `Employee Zero for ${role.title}`,
    description: role.description,
    url: `https://employeezero.app/use-cases/${role.slug}`,
    offers: { "@type": "Offer", price: "29", priceCurrency: "USD", availability: "https://schema.org/InStock" },
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0e1a] text-white font-sans">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <nav className="p-6 md:px-12 flex justify-between items-center border-b border-white/[0.05]">
        <Link href="/" className="text-sm font-bold tracking-tight flex items-center gap-2">
          <Zap size={16} className="text-emerald-400" />Employee Zero
        </Link>
        <Link href="/login" className="h-8 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full inline-flex items-center">
          Get Started
        </Link>
      </nav>

      <main className="flex-1 px-6 md:px-12 py-16 max-w-3xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-xs text-emerald-400 font-medium mb-6">
          <Target size={10} /> Built for {role.title}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
          AI Employee for<br /><span className="text-emerald-400">{role.title}.</span>
        </h1>

        <p className="text-base text-neutral-400 leading-relaxed mb-12 max-w-lg">{role.description}</p>

        <section className="mb-12">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Clock size={16} className="text-amber-400" /> Tasks Employee Zero Handles
          </h2>
          <div className="space-y-2">
            {role.tasks.map((task, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                <span className="text-sm text-neutral-300">{task}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-bold mb-4">Pain Points We Solve</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {role.painPoints.map((p, i) => (
              <div key={i} className="p-4 rounded-xl bg-red-500/[0.05] border border-red-500/10">
                <span className="text-sm text-neutral-300">&ldquo;{p}&rdquo;</span>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-12">
          <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
            <Shield size={16} className="text-emerald-400" /> Results
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {role.benefits.map((b, i) => (
              <div key={i} className="p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/10">
                <span className="text-sm text-emerald-300 font-medium">{b}</span>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-gradient-to-r from-emerald-500/[0.08] to-transparent border border-emerald-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to hire your AI employee?</h2>
          <p className="text-sm text-neutral-400 mb-5">
            Join the Founding 100 — $29/mo locked in forever. Your AI starts working today.
          </p>
          <Link href="/login" className="inline-flex items-center h-11 px-6 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full transition-all">
            Get Started for $29/mo <ArrowRight size={14} className="ml-2" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/[0.05] px-6 py-6 text-center">
        <p className="text-xs text-neutral-600">&copy; 2026 Employee Zero</p>
      </footer>
    </div>
  );
}
