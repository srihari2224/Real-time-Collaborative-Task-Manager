import type { Metadata } from 'next';
import './globals.css';
import { Providers } from '@/components/Providers';

export const metadata: Metadata = {
  title: 'TaskFlow — Real-time Collaborative Task Manager',
  description: 'A premium collaborative task management platform with real-time chat, Kanban boards, and team collaboration tools.',
  verification: {
    google: '-DsIIiNB0oIFFyT1oBOrvfYDBrZlibTPCT5eP5lBtIE',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <div className="noise-overlay" aria-hidden="true" />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
