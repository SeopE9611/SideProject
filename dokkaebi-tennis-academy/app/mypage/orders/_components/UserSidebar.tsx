import { Avatar, AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { getServerSession } from 'next-auth';
import { authConfig } from '@/lib/auth.config';
import { redirect } from 'next/navigation';

export default async function UserSidebar() {
  const session = await getServerSession(authConfig);

  if (!session) {
    redirect('/login');
  }
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            <AvatarImage src="/placeholder.svg?height=64&width=64" alt="프로필 이미지" />
            <AvatarFallback>사용자</AvatarFallback>
          </Avatar>
          <div>
            <CardTitle>{session?.user?.name}님</CardTitle>
            <CardDescription>일반 회원</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <nav className="space-y-2">
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/mypage">주문 내역</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/mypage/wishlist">위시리스트</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/mypage/reviews">리뷰 관리</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/mypage/qna">Q&A 내역</Link>
          </Button>
          <Button variant="ghost" className="w-full justify-start" asChild>
            <Link href="/mypage/profile">회원 정보 수정</Link>
          </Button>
        </nav>
      </CardContent>
    </Card>
  );
}
