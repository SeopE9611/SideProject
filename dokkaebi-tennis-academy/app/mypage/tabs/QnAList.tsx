'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircleQuestion, Calendar, ArrowRight, CheckCircle, Clock } from 'lucide-react';

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
      <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
        <CardContent className="p-12 text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900">
            <MessageCircleQuestion className="h-10 w-10 text-indigo-600 dark:text-indigo-400" />
          </div>
          <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">문의 내역이 없습니다</h3>
          <p className="mb-6 text-slate-600 dark:text-slate-400">궁금한 점이 있으시면 언제든지 문의해주세요!</p>
          <Button asChild className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
            <Link href="/board/qna/write" className="inline-flex items-center gap-2">
              문의하기
              <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {qnas.map((qna) => (
        <Card key={qna.id} className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
          {/* Gradient border effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
            <div className="h-full w-full bg-white dark:bg-slate-900 rounded-lg" />
          </div>

          <CardContent className="relative p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900 dark:to-purple-900">
                  <MessageCircleQuestion className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                </div>
                <div>
                  <Badge variant="outline" className="mb-2 border-indigo-200 text-indigo-700 dark:border-indigo-800 dark:text-indigo-300">
                    {qna.category}
                  </Badge>
                  <h3 className="font-semibold text-slate-900 dark:text-slate-100 line-clamp-2">{qna.title}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {qna.status === '답변 완료' ? <CheckCircle className="h-5 w-5 text-green-500" /> : <Clock className="h-5 w-5 text-yellow-500" />}
                <Badge variant={qna.status === '답변 완료' ? 'default' : 'secondary'} className={qna.status === '답변 완료' ? 'bg-gradient-to-r from-green-500 to-emerald-500 text-white' : 'bg-gradient-to-r from-yellow-500 to-orange-500 text-white'}>
                  {qna.status}
                </Badge>
              </div>
            </div>

            {/* Content */}
            <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                <Calendar className="h-4 w-4" />
                <span>{qna.date}</span>
              </div>

              <Button size="sm" variant="outline" asChild className="border-slate-200 hover:border-indigo-300 hover:bg-indigo-50 dark:border-slate-700 dark:hover:border-indigo-600 dark:hover:bg-indigo-950 transition-colors bg-transparent">
                <Link href={`/board/qna/${qna.id}`} className="inline-flex items-center gap-1">
                  상세보기
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
