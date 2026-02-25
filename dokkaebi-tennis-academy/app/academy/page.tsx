import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function AcademyPage() {
  return (
    <main className="min-h-screen bg-background px-6 py-16">
      <Card className="mx-auto max-w-2xl border-border bg-card">
        <CardHeader className="space-y-3 text-center">
          <CardTitle className="text-2xl font-semibold text-foreground">아카데미 페이지 운영 중단 안내</CardTitle>
          <p className="text-sm text-muted-foreground">
            현재 <code>/academy</code> 라우트는 운영 정책에 따라 비활성화 상태입니다. 재오픈 전까지 이 페이지는 차단 상태로 유지됩니다.
          </p>
        </CardHeader>
        <CardContent className="flex justify-center">
          <Button asChild>
            <Link href="/">메인 페이지로 이동</Link>
          </Button>
        </CardContent>
      </Card>
    </main>
  );
}
