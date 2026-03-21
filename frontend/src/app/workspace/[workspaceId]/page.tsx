'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function WorkspaceHomeRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace('/my-tasks');
  }, [router]);
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-muted)', fontSize: 14 }}>
      Redirecting…
    </div>
  );
}
