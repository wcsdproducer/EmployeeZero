import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { COMPARISONS } from "@/lib/pseoData";
import { Zap, ArrowRight, Check, X, Scale } from "lucide-react";

interface Props { params: Promise<{ competitor: string }> }

export async function generateStaticParams() {
  return COMPARISONS.map((c) => ({ competitor: c.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { competitor: slug } = await params;
  const comp = COMPARISONS.find((c) => c.slug === slug);
  if (!comp) return { title: "Not Found" };
  return {
    title: `Employee Zero vs ${comp.name} — Comparison | Employee Zero`,
    description: comp.description,
    openGraph: {
      title: `Employee Zero vs ${comp.name}`,
      description: comp.description,
      url: `https://employeezero.app/vs/${comp.slug}`,
    },
  };
}

export default async function ComparisonPage({ params }: Props) {
  const { competitor: slug } = await params;
  const comp = COMPARISONS.find((c) => c.slug === slug);
  if (!comp) notFound();

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0e1a] text-white font-sans">
      <nav className="p-6 md:px-12 flex justify-between items-center border-b border-white/[0.05]">
        <Link href="/" className="text-sm font-bold tracking-tight flex items-center gap-2">
          <Zap size={16} className="text-emerald-400" />Employee Zero
        </Link>
        <Link href="/login" className="h-8 px-4 text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full inline-flex items-center">
          Get Started
        </Link>
      </nav>

      <main className="flex-1 px-6 md:px-12 py-16 max-w-3xl mx-auto w-full">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-violet-500/20 bg-violet-500/10 text-xs text-violet-400 font-medium mb-6">
          <Scale size={10} /> Honest Comparison
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
          Employee Zero vs<br /><span className="text-violet-400">{comp.name}.</span>
        </h1>

        <p className="text-base text-neutral-400 leading-relaxed mb-6 max-w-lg">{comp.description}</p>

        {/* Pricing comparison */}
        <div className="flex gap-4 mb-12">
          <div className="flex-1 p-4 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/10 text-center">
            <div className="text-xs text-neutral-500 mb-1">Employee Zero</div>
            <div className="text-xl font-bold text-emerald-400">$29/mo</div>
          </div>
          <div className="flex-1 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06] text-center">
            <div className="text-xs text-neutral-500 mb-1">{comp.name}</div>
            <div className="text-xl font-bold text-neutral-300">{comp.pricing}</div>
          </div>
        </div>

        {/* Advantages comparison */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 mb-3">Where Employee Zero Wins</h3>
              <div className="space-y-2">
                {comp.ezAdvantages.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-emerald-500/[0.05] border border-emerald-500/10">
                    <Check size={14} className="text-emerald-400 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-neutral-300">{a}</span>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-400 mb-3">Where {comp.name} Wins</h3>
              <div className="space-y-2">
                {comp.theirAdvantages.map((a, i) => (
                  <div key={i} className="flex items-start gap-2 p-3 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                    <Check size={14} className="text-neutral-500 mt-0.5 flex-shrink-0" />
                    <span className="text-xs text-neutral-400">{a}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Verdict */}
        <section className="mb-12">
          <div className="p-6 rounded-2xl bg-violet-500/[0.05] border border-violet-500/15">
            <h3 className="text-sm font-bold text-violet-400 mb-2">The Verdict</h3>
            <p className="text-sm text-neutral-300 leading-relaxed">{comp.verdict}</p>
          </div>
        </section>

        <section className="bg-gradient-to-r from-emerald-500/[0.08] to-transparent border border-emerald-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Ready to try Employee Zero?</h2>
          <p className="text-sm text-neutral-400 mb-5">
            Founding 100 — $29/mo locked in forever. See the difference for yourself.
          </p>
          <Link href="/login" className="inline-flex items-center h-11 px-6 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full transition-all">
            Start Free Trial <ArrowRight size={14} className="ml-2" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/[0.05] px-6 py-6 text-center">
        <p className="text-xs text-neutral-600">&copy; 2026 Employee Zero</p>
      </footer>
    </div>
  );
}
