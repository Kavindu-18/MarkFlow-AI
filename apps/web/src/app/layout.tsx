import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MarkFlow AI — Intelligent Exam Grading',
  description: 'Enterprise-grade AI-powered exam grading platform with edge document scanning and multi-agent intelligence.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
