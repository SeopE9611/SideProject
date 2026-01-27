'use client';
import SystemLoginGate from '@/components/system/LoginGate';
export default function LoginGate({ next }: { next: string }) {
  return <SystemLoginGate next={next} variant="packages" />;
}
