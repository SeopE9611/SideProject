'use client';

import { Session } from 'next-auth';
import { useEffect, useState } from 'react';

interface Props {
  session: Session;
}

export default function UserSection({ session }: Props) {
  const [quote, setQuote] = useState<string | null>(null);

  useEffect(() => {
    // 예시용 API 호출
    fetch('https://api.quotable.io/random')
      .then((res) => res.json())
      .then((data) => setQuote(data.content));
  }, []);

  return (
    <div className="border p-4 rounded-lg shadow-sm bg-white">
      <p className="text-lg font-bold">{session.user?.name ?? '이름 없음'}님, 반갑습니다!</p>
      <p className="text-sm text-gray-500 mt-2">이메일: {session.user?.email ?? '이메일 없음'}</p>
      <p className="mt-4 italic text-gray-700">{quote ? `오늘의 문구: "${quote}"` : '문구를 불러오는 중...'}</p>
    </div>
  );
}
