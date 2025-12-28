import { Suspense } from 'react';
import LoginPageClient from '@/app/login/_components/LoginPageClient';

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
