import Link from 'next/link';
import { CheckSquare } from 'lucide-react';

export const metadata = {
  title: 'Terms of Service — TaskFlow',
  description: 'Terms of Service for TaskFlow, a real-time collaborative task manager.',
};

export default function TermsPage() {
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
        <h1 style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.03em', marginBottom: 8 }}>Terms of Service</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 40 }}>
          By accessing or using TaskFlow, you agree to be bound by these Terms of Service. Please read them carefully.
        </p>

        <Section title="1. Acceptance of Terms">
          <p>
            By creating an account or using TaskFlow in any way, you agree to these Terms of Service and our Privacy Policy. If you do not agree, you may not use TaskFlow.
          </p>
        </Section>

        <Section title="2. Use of the Service">
          <p>TaskFlow is a real-time collaborative task management platform. You may use it to:</p>
          <ul>
            <li>Create and manage workspaces, projects, and tasks.</li>
            <li>Collaborate with other users through task assignments, comments, and file attachments.</li>
            <li>Receive notifications about tasks you are assigned to.</li>
          </ul>
          <p>You agree not to use TaskFlow to:</p>
          <ul>
            <li>Violate any applicable laws or regulations.</li>
            <li>Upload or share malicious content, spam, or illegal material.</li>
            <li>Attempt to gain unauthorized access to the system or other users&apos; data.</li>
            <li>Interfere with or disrupt the service or its infrastructure.</li>
          </ul>
        </Section>

        <Section title="3. Accounts &amp; Authentication">
          <p>
            You may sign in to TaskFlow using your Google account (via Google OAuth 2.0) or with an email and password. You are responsible for maintaining the security of your account. You agree to notify us immediately of any unauthorized use of your account.
          </p>
          <p>
            TaskFlow uses Supabase for authentication. Your sign-in credentials are managed securely by Supabase and Google — we never store your Google password.
          </p>
        </Section>

        <Section title="4. Workspaces &amp; Collaboration">
          <p>
            Each user may create or be invited to one or more workspaces. Within a workspace, any member may create projects, tasks, and subtasks, and assign them to other workspace members. All members of a workspace can see projects they participate in.
          </p>
          <p>
            Task assignees can view, update task status/priority, add subtasks, and chat within their assigned tasks. Non-assigned members will not see tasks they are not part of.
          </p>
        </Section>

        <Section title="5. Intellectual Property">
          <p>
            You retain ownership of any content you submit to TaskFlow (task titles, descriptions, comments, attachments). By using the service, you grant TaskFlow a limited license to store and display your content solely for the purpose of providing the service to you.
          </p>
        </Section>

        <Section title="6. Data &amp; Privacy">
          <p>
            Our collection and use of personal information is described in our{' '}
            <Link href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>.
            By using TaskFlow, you consent to the collection and use of your information as described therein.
          </p>
        </Section>

        <Section title="7. Termination">
          <p>
            We reserve the right to suspend or terminate your access to TaskFlow at any time, for any reason, with or without notice, particularly if you violate these Terms. You may also delete your account at any time from the settings page.
          </p>
        </Section>

        <Section title="8. Disclaimer of Warranties">
          <p>
            TaskFlow is provided &quot;as is&quot; without warranties of any kind. We do not guarantee that the service will be uninterrupted, error-free, or completely secure. Use the service at your own risk.
          </p>
        </Section>

        <Section title="9. Limitation of Liability">
          <p>
            To the maximum extent permitted by law, TaskFlow and its creators shall not be liable for any indirect, incidental, special, or consequential damages arising out of or relating to your use of the service.
          </p>
        </Section>

        <Section title="10. Changes to These Terms">
          <p>
            We may modify these Terms at any time. Continued use of TaskFlow after changes constitutes acceptance of the updated Terms. We will indicate the &quot;last updated&quot; date at the top of this page.
          </p>
        </Section>

        <Section title="11. Contact">
          <p>
            For questions about these Terms, please contact:{' '}
            <a href="mailto:legal@taskflow.app" style={{ color: 'var(--accent)' }}>legal@taskflow.app</a>
          </p>
        </Section>

        <div style={{ marginTop: 48, paddingTop: 24, borderTop: '1px solid var(--border-subtle)', display: 'flex', gap: 24, fontSize: 13, color: 'var(--text-muted)' }}>
          <Link href="/privacy" style={{ color: 'var(--accent)' }}>Privacy Policy</Link>
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
