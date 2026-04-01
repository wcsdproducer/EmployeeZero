import { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { TASKS } from "@/lib/pseoData";
import { Zap, ArrowRight, Check, Clock, ArrowDown } from "lucide-react";

interface Props { params: Promise<{ task: string }> }

export async function generateStaticParams() {
  return TASKS.map((t) => ({ task: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { task: slug } = await params;
  const task = TASKS.find((t) => t.slug === slug);
  if (!task) return { title: "Not Found" };
  return {
    title: `Automate ${task.title} with AI | Employee Zero`,
    description: task.description,
    openGraph: {
      title: `Automate ${task.title} with AI`,
      description: task.description,
      url: `https://employeezero.app/automate/${task.slug}`,
    },
  };
}

export default async function TaskPage({ params }: Props) {
  const { task: slug } = await params;
  const task = TASKS.find((t) => t.slug === slug);
  if (!task) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: `How to Automate ${task.title} with AI`,
    description: task.description,
    step: task.steps.map((s, i) => ({ "@type": "HowToStep", position: i + 1, text: s })),
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
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-sky-500/20 bg-sky-500/10 text-xs text-sky-400 font-medium mb-6">
          <Clock size={10} /> Save {task.timeSaved}
        </div>

        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight leading-[1.1] mb-4">
          Automate<br /><span className="text-sky-400">{task.title}.</span>
        </h1>

        <p className="text-base text-neutral-400 leading-relaxed mb-12 max-w-lg">{task.description}</p>

        {/* Before/After */}
        <section className="mb-12">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-5 rounded-xl bg-red-500/[0.05] border border-red-500/10">
              <div className="text-xs font-semibold text-red-400 mb-3 uppercase tracking-wider">Without AI</div>
              <p className="text-sm text-neutral-300 leading-relaxed">{task.currentWay}</p>
            </div>
            <div className="p-5 rounded-xl bg-emerald-500/[0.05] border border-emerald-500/10">
              <div className="text-xs font-semibold text-emerald-400 mb-3 uppercase tracking-wider">With Employee Zero</div>
              <p className="text-sm text-neutral-300 leading-relaxed">{task.aiWay}</p>
            </div>
          </div>
        </section>

        {/* Steps */}
        <section className="mb-12">
          <h2 className="text-lg font-bold mb-6">How It Works</h2>
          <div className="space-y-3">
            {task.steps.map((step, i) => (
              <div key={i}>
                <div className="flex items-start gap-4 p-4 rounded-xl bg-white/[0.02] border border-white/[0.06]">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 border border-sky-500/30 flex items-center justify-center flex-shrink-0 text-xs font-bold text-sky-400">
                    {i + 1}
                  </div>
                  <span className="text-sm text-neutral-300 pt-1">{step}</span>
                </div>
                {i < task.steps.length - 1 && (
                  <div className="flex justify-center py-1">
                    <ArrowDown size={14} className="text-neutral-700" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Time Saved */}
        <section className="mb-12">
          <div className="bg-gradient-to-r from-sky-500/[0.08] to-transparent border border-sky-500/20 rounded-2xl p-6 text-center">
            <div className="text-4xl font-bold text-sky-400 mb-2">{task.timeSaved}</div>
            <p className="text-sm text-neutral-400">saved every week on {task.title.toLowerCase()}</p>
          </div>
        </section>

        <section className="bg-gradient-to-r from-emerald-500/[0.08] to-transparent border border-emerald-500/20 rounded-2xl p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Stop doing {task.title.toLowerCase()} manually.</h2>
          <p className="text-sm text-neutral-400 mb-5">
            Founding 100 — $29/mo locked in forever. Start automating today.
          </p>
          <Link href="/login" className="inline-flex items-center h-11 px-6 text-sm font-semibold bg-emerald-500 hover:bg-emerald-400 text-black rounded-full transition-all">
            Automate Now for $29/mo <ArrowRight size={14} className="ml-2" />
          </Link>
        </section>
      </main>

      <footer className="border-t border-white/[0.05] px-6 py-6 text-center">
        <p className="text-xs text-neutral-600">&copy; 2026 Employee Zero</p>
      </footer>
    </div>
  );
}
