export async function sendSmsStub({ to, text }: { to: string; text: string }) {
  // 실제 사업자 연동 전까지는 콘솔 로깅으로 대체
  console.log('[SMS STUB]', { to, text });
}
