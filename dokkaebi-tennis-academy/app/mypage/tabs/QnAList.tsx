'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface QnAListProps {
  qnas: {
    id: number;
    title: string;
    date: string;
    status: string;
    category: string;
  }[];
}

export default function QnAList({ qnas }: QnAListProps) {
  if (!qnas.length) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">문의 내역이 없습니다.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {qnas.map((qna) => (
        <Card key={qna.id}>
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Badge variant="outline" className="mb-2">
                  {qna.category}
                </Badge>
                <div className="font-medium">{qna.title}</div>
              </div>
              <Badge variant={qna.status === '답변 완료' ? 'default' : 'secondary'}>{qna.status}</Badge>
            </div>
            <div className="mt-2 text-sm text-muted-foreground">{qna.date}</div>
            <div className="mt-4 flex justify-end">
              <Button size="sm" variant="outline" asChild>
                <Link href={`/mypage/qna/${qna.id}`}>상세보기</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
