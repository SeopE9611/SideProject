'use client';

import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { toast } from 'sonner';
import { useRouter, useSearchParams } from 'next/navigation';
import { showErrorToast, showSuccessToast } from '@/lib/toast';
import { useAuthStore } from '@/lib/stores/auth-store';

export default function AccountDeletedPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token'); // URL에서 복구 토큰을 꺼냅니다

  const handleRestore = async () => {
    if (!token) {
      showErrorToast('복구 토큰이 없습니다.');
      return;
    }

    // 복구 요청 전송 (POST 요청으로 변경)
    const res = await fetch('/api/users/me/restore', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    });

    if (res.ok) {
      showSuccessToast('계정이 복구되었습니다. 다시 로그인해주세요.');
      router.push('/login');
    } else {
      showErrorToast('복구 중 오류가 발생했습니다.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-col items-center pt-10 pb-6">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-center text-gray-900">회원 탈퇴가 정상적으로 완료되었습니다</h1>
        </CardHeader>

        <CardContent className="text-center pb-6">
          <p className="text-gray-600">탈퇴 후 7일간 개인정보를 보관 후 폐기됩니다.</p>
          {/* <p className="text-gray-500 mt-2 text-sm">탈퇴를 철회하시려면 아래 버튼을 클릭해주세요.</p> */}
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pb-10">
          {/* <Button onClick={handleRestore}>탈퇴 철회하기</Button> */}
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/">홈으로 이동</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
