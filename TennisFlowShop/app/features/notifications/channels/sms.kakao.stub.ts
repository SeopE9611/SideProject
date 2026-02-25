export async function sendSmsStub({ to, text }: { to: string; text: string }) {
  // 실제 사업자 연동 전까지는 콘솔 로깅으로 대체
  const norm = (n?: string) => (n || '').replace(/[^\d]/g, '');
  const maskPhone = (n: string) => {
    const d = norm(n);
    if (!d) return '';
    if (d.length <= 4) return '*'.repeat(d.length);
    return `${d.slice(0, 3)}****${d.slice(-4)}`;
  };
  // 운영에서 PII/본문 노출 방지
  if (process.env.NODE_ENV === 'development') {
    console.log('[SMS STUB]', { to: maskPhone(to), textLen: text?.length ?? 0 });
  }
}
