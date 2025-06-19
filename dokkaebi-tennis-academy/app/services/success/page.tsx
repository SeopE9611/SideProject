'use client';

import { useRouter } from 'next/navigation';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CheckCircle } from 'lucide-react';

export default function StringServiceSuccessPage() {
  const router = useRouter();

  const handleGoHome = () => {
    router.push('/');
  };

  const handleViewApplications = () => {
    router.push('/mypage/applications');
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-background flex items-center justify-center py-8 px-4">
      <div className="max-w-md w-full">
        <Card>
          <CardContent className="pt-8 pb-8 text-center">
            {/* 성공 아이콘 */}
            <div className="flex justify-center mb-6">
              <CheckCircle className="h-16 w-16 text-green-500" />
            </div>

            {/* 제목 */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">신청이 완료되었습니다.</h1>

            {/* 부제목 */}
            <p className="text-gray-600 dark:text-gray-300 mb-8 leading-relaxed">
              도깨비 테니스 아카데미에서 빠르게 확인 후 연락드리겠습니다.
              <br />
              신청해주셔서 감사합니다.
            </p>

            {/* 버튼들 */}
            <div className="space-y-3">
              <Button onClick={handleGoHome} className="w-full h-12 text-lg font-medium">
                홈으로 돌아가기
              </Button>

              <Button onClick={handleViewApplications} variant="outline" className="w-full h-12 text-lg font-medium">
                신청 내역 보기
              </Button>
            </div>

            {/* 추가 안내 */}
            <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                문의사항이 있으시면 언제든지 연락주세요.
                <br />
                📞 02-1234-5678
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
