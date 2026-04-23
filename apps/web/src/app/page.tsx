import { GlassCard, GlassButton } from '@markflow/ui';
import Link from 'next/link';
import { ArchitectureFlow } from '@/components/architecture';

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* ── Hero ─────────────────────────────────────── */}
      <section className="relative flex flex-1 flex-col items-center justify-center px-6 py-24 overflow-hidden">
        {/* Floating orbs */}
        <div className="pointer-events-none absolute inset-0" aria-hidden>
          <div className="absolute -top-32 left-1/4 h-96 w-96 rounded-full bg-violet-600/20 blur-[120px] float" />
          <div className="absolute top-1/3 -right-20 h-72 w-72 rounded-full bg-indigo-500/15 blur-[100px] float [animation-delay:2s]" />
          <div className="absolute -bottom-20 left-10 h-80 w-80 rounded-full bg-pink-500/10 blur-[100px] float [animation-delay:4s]" />
        </div>

        <div className="relative z-10 text-center max-w-3xl mx-auto">
          {/* Badge */}
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/[0.06] px-4 py-1.5 text-xs font-semibold uppercase tracking-wider text-violet-300 animate-fade-in">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-violet-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-violet-400" />
            </span>
            AI-Powered Grading Platform
          </div>

          {/* Title */}
          <h1 className="text-6xl sm:text-7xl font-bold tracking-tight leading-[1.08] animate-slide-up">
            <span className="text-gradient">MarkFlow</span>
            <span className="text-white"> AI</span>
          </h1>

          {/* Subtitle */}
          <p className="mt-5 text-lg text-white/40 leading-relaxed max-w-xl mx-auto animate-slide-up [animation-delay:100ms]">
            Scan physical exams with your phone. Grade with multi-agent AI in seconds.
            Push results to any LMS — automatically.
          </p>

          {/* CTA */}
          <div className="mt-8 flex items-center justify-center gap-4 animate-slide-up [animation-delay:200ms]">
            <Link href="/exams/create">
              <GlassButton size="lg">
                Get Started
              </GlassButton>
            </Link>
            <Link href="/grading">
              <GlassButton variant="secondary" size="lg">
                View Demo
              </GlassButton>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Stats bar ────────────────────────────────── */}
      <section className="border-y border-white/[0.04] bg-white/[0.01]">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-around gap-6 py-8 px-6">
          <Stat value="< 5s" label="Avg. grading time" />
          <div className="h-8 w-px bg-white/[0.06] hidden sm:block" />
          <Stat value="97.2%" label="AI accuracy" />
          <div className="h-8 w-px bg-white/[0.06] hidden sm:block" />
          <Stat value="4" label="Question types" />
          <div className="h-8 w-px bg-white/[0.06] hidden sm:block" />
          <Stat value="LTI 1.3" label="LMS integration" />
        </div>
      </section>

      {/* ── Architecture Flow ────────────────────── */}
      <section className="mx-auto w-full max-w-6xl px-6 py-20">
        <div className="text-center mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/[0.06] bg-white/[0.03] px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-white/30">
            Critical Path
          </div>
          <h2 className="text-3xl font-bold tracking-tight">Ingestion Architecture</h2>
          <p className="mt-3 text-sm text-white/35 max-w-lg mx-auto">
            Three entry points converge at the API Gateway, flowing through Event Hubs into the AI grading pipeline.
          </p>
        </div>
        <GlassCard className="p-4 sm:p-8" blur="lg">
          <ArchitectureFlow />
        </GlassCard>
      </section>

      {/* ── Features ─────────────────────────────────── */}
      <section className="mx-auto w-full max-w-5xl px-6 py-20">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold tracking-tight">How it works</h2>
          <p className="mt-3 text-sm text-white/35">Three steps from paper to grade book.</p>
        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          <FeatureCard
            step="01"
            title="Design Exams"
            description="Build exams with smart QR codes and fiducial markers. Generate per-student PDFs in one click."
            href="/exams/create"
            icon={<PenSquareIcon />}
            color="violet"
          />
          <FeatureCard
            step="02"
            title="Scan & Process"
            description="Point your phone camera at completed papers. Edge AI detects corners and corrects perspective instantly."
            href="/scanner"
            icon={<ScanIcon />}
            color="indigo"
          />
          <FeatureCard
            step="03"
            title="AI Grades"
            description="Multi-agent AI routes each question to the best model — OCR, math, diagram, or deterministic."
            href="/grading"
            icon={<SparklesIcon />}
            color="pink"
          />
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────── */}
      <footer className="border-t border-white/[0.04] py-8 px-6">
        <div className="mx-auto max-w-5xl flex items-center justify-between">
          <p className="text-xs text-white/20">MarkFlow AI</p>
          <p className="text-xs text-white/20">Built for educators.</p>
        </div>
      </footer>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────── */

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="text-center min-w-[100px]">
      <p className="text-2xl font-bold tracking-tight text-white">{value}</p>
      <p className="mt-0.5 text-xs text-white/30">{label}</p>
    </div>
  );
}

const colorMap: Record<string, { border: string; text: string; bg: string; glow: string }> = {
  violet: { border: 'group-hover:border-violet-500/25', text: 'text-violet-400', bg: 'bg-violet-500/10', glow: 'group-hover:shadow-[0_0_40px_rgba(139,92,246,0.08)]' },
  indigo: { border: 'group-hover:border-indigo-500/25', text: 'text-indigo-400', bg: 'bg-indigo-500/10', glow: 'group-hover:shadow-[0_0_40px_rgba(99,102,241,0.08)]' },
  pink:   { border: 'group-hover:border-pink-500/25',   text: 'text-pink-400',   bg: 'bg-pink-500/10',   glow: 'group-hover:shadow-[0_0_40px_rgba(236,72,153,0.08)]' },
};

function FeatureCard({ step, title, description, href, icon, color }: {
  step: string; title: string; description: string; href: string; icon: React.ReactNode; color: string;
}) {
  const c = colorMap[color] || colorMap.violet;
  return (
    <Link href={href} className="group">
      <GlassCard hover className={['p-6 h-full', c.glow].join(' ')}>
        {/* Step + Icon */}
        <div className="flex items-center justify-between mb-5">
          <span className="text-[11px] font-bold uppercase tracking-widest text-white/20">{step}</span>
          <div className={['flex h-10 w-10 items-center justify-center rounded-xl', c.bg].join(' ')}>
            <span className={c.text}>{icon}</span>
          </div>
        </div>
        {/* Content */}
        <h3 className="text-base font-semibold tracking-tight text-white/90">{title}</h3>
        <p className="mt-2 text-sm leading-relaxed text-white/35">{description}</p>
        {/* Arrow */}
        <div className={['mt-5 flex items-center gap-1.5 text-xs font-medium transition-all', c.text, 'opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5'].join(' ')}>
          Explore
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>
        </div>
      </GlassCard>
    </Link>
  );
}

/* ── Icons ───────────────────────────────────────────── */

function PenSquareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" /><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}

function ScanIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function SparklesIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
      <path d="M5 3v4" /><path d="M19 17v4" /><path d="M3 5h4" /><path d="M17 19h4" />
    </svg>
  );
}
