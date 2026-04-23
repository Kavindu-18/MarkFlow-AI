import { GlassCard, GlassButton } from '@markflow/ui';
import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-8 p-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold tracking-tight">
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-blue-400 bg-clip-text text-transparent">
            MarkFlow AI
          </span>
        </h1>
        <p className="mt-4 text-lg text-white/60 max-w-xl">
          Enterprise-grade AI grading platform. Scan physical exams, grade with multi-agent AI,
          and sync results to your LMS — automatically.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3 max-w-4xl w-full">
        <GlassCard className="p-6" glow>
          <h2 className="text-lg font-semibold mb-2">📝 Create Exam</h2>
          <p className="text-sm text-white/60 mb-4">
            Design exams with smart QR codes and fiducial markers for automated processing.
          </p>
          <Link href="/exams/create">
            <GlassButton variant="primary" size="sm">
              Get Started
            </GlassButton>
          </Link>
        </GlassCard>

        <GlassCard className="p-6" glow>
          <h2 className="text-lg font-semibold mb-2">📷 Scan Papers</h2>
          <p className="text-sm text-white/60 mb-4">
            Use your mobile camera to scan completed exams with edge AI processing.
          </p>
          <Link href="/scanner">
            <GlassButton variant="primary" size="sm">
              Open Scanner
            </GlassButton>
          </Link>
        </GlassCard>

        <GlassCard className="p-6" glow>
          <h2 className="text-lg font-semibold mb-2">🎯 Review Grades</h2>
          <p className="text-sm text-white/60 mb-4">
            Review AI-graded submissions and override low-confidence scores.
          </p>
          <Link href="/grading">
            <GlassButton variant="primary" size="sm">
              View Dashboard
            </GlassButton>
          </Link>
        </GlassCard>
      </div>
    </main>
  );
}
