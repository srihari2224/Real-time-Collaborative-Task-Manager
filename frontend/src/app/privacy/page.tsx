import Link from 'next/link';
import { CheckSquare } from 'lucide-react';

export const metadata = {
  title: 'Privacy Policy — TaskFlow',
  description: 'Privacy Policy for TaskFlow, a real-time collaborative task manager.',
};

export default function PrivacyPage() {
  const updated = 'March 21, 2025';
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-base)', color: 'var(--text-primary)', fontFamily: 'var(--font-display, sans-serif)' }}>
      {/* Top bar */}
      <header style={{ borderBottom: '1px solid var(--border-subtle)', padding: '16px 32px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <Link href="/auth" style={{ display: 'flex', alignItems: 'center', gap: 8, textDecoration: 'none', color: 'var(--text-primary)', fontWeight: 800, fontSize: 16, letterSpacing: '-0.03em' }}>
          <CheckSquare size={22} style={{ color: 'var(--accent)' }} />
          TaskFlow
        </Link>
        <span style={{ marginLeft: 'auto', fontSize: 12, color: 'var(--text-muted)' }}>Last updated: {updated}</span>
      </header>

      <main style={{ maxWidth: 760, margin: '0 auto', padding: '48px 32px 80px' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Privacy Policy</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 40 }}>
          This Privacy Policy describes how TaskFlow (&quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) collects, uses, and shares information about you when you use our services.
        </p>

        <Section title="1. Information We Collect">
          <p>We collect information you provide directly to us, including:</p>
          <ul>
            <li><strong>Account information</strong> — your name and email address, collected when you sign in via Google OAuth or email/password through Supabase Auth.</li>
            <li><strong>Workspace &amp; project data</strong> — workspace names, project names, tasks, subtasks, comments, and attachments you create within the app.</li>
            <li><strong>Usage data</strong> — log data such as IP address, browser type, pages visited, and timestamps.</li>
          </ul>
        </Section>

        <Section title="2. How We Use Your Information">
          <ul>
            <li>To provide, maintain, and improve the TaskFlow service.</li>
            <li>To authenticate you and keep your account secure.</li>
            <li>To send notifications related to tasks you are assigned to.</li>
            <li>To respond to your comments, questions, and requests.</li>
            <li>To monitor and analyze trends and usage within the service.</li>
          </ul>
        </Section>

        <Section title="3. Google OAuth &amp; Third-Party Sign-In">
          <p>
            TaskFlow uses <strong>Google OAuth 2.0</strong> (via Supabase Auth) to allow you to sign in with your Google account. When you sign in with Google, we receive your name and email address. We do not receive your Google password or access to your Gmail, Drive, or other Google services.
          </p>
          <p>
            The information received from Google is used solely to create and manage your TaskFlow account. We do not sell or share this information with third parties for marketing purposes.
          </p>
        </Section>

        <Section title="4. Data Sharing">
          <p>We do not sell, trade, or rent your personal information. We may share information in the following limited circumstances:</p>
          <ul>
            <li><strong>With your workspace members</strong> — your name and avatar are visible to other members of workspaces you join.</li>
            <li><strong>Service providers</strong> — we use Supabase (database &amp; auth) and Render (backend hosting). These providers process data on our behalf under strict data protection agreements.</li>
            <li><strong>Legal requirements</strong> — if required by law or to protect rights and safety.</li>
          </ul>
        </Section>

        <Section title="5. Data Retention">
          <p>
            We retain your account information for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us. Workspace data may be retained for up to 30 days after deletion for backup purposes.
          </p>
        </Section>

        <Section title="6. Security">
          <p>
            We take reasonable measures to protect your information from unauthorized access, loss, or misuse. All data is encrypted in transit using HTTPS. Authentication is handled by Supabase, which is SOC 2 compliant.
          </p>
        </Section>

        <Section title="7. Children's Privacy">
          <p>
            TaskFlow is not intended for use by children under the age of 13. We do not knowingly collect personal information from children under 13.
          </p>
        </Section>

        <Section title="8. Changes to This Policy">
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any significant changes by posting the new policy on this page with an updated date.
          </p>
        </Section>

        <Section title="9. Contact Us">
          <p>
            If you have any questions about this Privacy Policy, please contact us at:{' '}
            <a href="mailto:privacy@taskflow.app" style={{ color: 'var(--accent)' }}>privacy@taskflow.app</a>
          </p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-muted)' }}>
          <Link href="/terms" style={{ color: 'var(--accent)' }}>Terms of Service</Link>
          <Link href="/auth" style={{ color: 'var(--text-muted)' }}>← Back to Sign In</Link>
        </div>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: 36 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: 'var(--text-primary)' }}>{title}</h2>
      <div style={{ fontSize: 14, lineHeight: 1.8, color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {children}
      </div>
    </section>
  );
}
