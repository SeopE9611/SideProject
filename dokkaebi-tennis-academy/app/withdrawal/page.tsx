import Link from 'next/link';
import { CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';

export default function AccountDeletedPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="flex flex-col items-center pt-10 pb-6">
          <CheckCircle className="h-16 w-16 text-green-500 mb-4" />
          <h1 className="text-2xl font-bold text-center text-gray-900">회원 탈퇴가 정상적으로 완료되었습니다</h1>
        </CardHeader>

        <CardContent className="text-center pb-6">
          <p className="text-gray-600">탈퇴 후 7일간 개인정보를 보관 후 폐기됩니다.</p>
          <p className="text-gray-500 mt-2 text-sm">탈퇴를 철회하시려면 아래 버튼을 클릭해주세요.</p>
        </CardContent>

        <CardFooter className="flex flex-col sm:flex-row gap-3 justify-center pb-10">
          <Button className="w-full sm:w-auto">탈퇴 철회하기</Button>
          <Button variant="outline" className="w-full sm:w-auto" asChild>
            <Link href="/">홈으로 이동</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
