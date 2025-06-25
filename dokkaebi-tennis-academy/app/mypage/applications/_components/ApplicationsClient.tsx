'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWR from 'swr';
import ApplicationStatusBadge from '@/app/admin/applications/_components/ApplicationStatusBadge';

export interface Application {
  id: string;
  type: '스트링 장착 서비스' | '아카데미 수강 신청';
  applicantName: string;
  phone: string;
  appliedAt: string;
  status: '접수 완료' | '검토 중' | '완료';
  racketType?: string;
  stringType?: string;
  preferredDate?: string;
  preferredTime?: string;
  course?: string;
  schedule?: string;
}

const formatDateTime = (iso: string) => {
  const date = new Date(iso);
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
};

const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: 'include' });
  if (!res.ok) throw new Error('데이터 로딩 실패');
  return res.json();
};

export default function ApplicationsClient() {
  const router = useRouter();
  const { data: applications, error } = useSWR<Application[]>('/api/applications/me', fetcher);

  if (error) return <p className="text-center py-4 text-red-500">에러: {error.message}</p>;
  if (!applications) return <p className="text-center py-4">로딩 중...</p>;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <h2 className="text-xl font-semibold mb-4">신청 내역</h2>

      {applications.length === 0 ? (
        <Card className="p-6 text-center text-gray-700">
          <p>신청 내역이 없습니다.</p>
          <Button asChild className="mt-4">
            <Link href="/services">서비스 신청하러 가기</Link>
          </Button>
        </Card>
      ) : (
        applications.map((app) => {
          console.log('✅ 신청 데이터:', app);

          return (
            <Card key={app.id} className="p-4 mb-4 border rounded-lg shadow-sm hover:shadow-md transition-shadow">
              <div className="flex justify-between items-center mb-3">
                <div className="text-sm text-gray-600 flex items-center">
                  <Calendar className="w-4 h-4 mr-1" />
                  {formatDateTime(app.appliedAt)}
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push(`/mypage?tab=applications&id=${app.id}`)}>
                  상세보기
                </Button>
              </div>

              <CardContent className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm text-gray-800">
                <div>
                  <span className="font-medium">이름: </span>
                  {app.applicantName}
                </div>
                <div>
                  <span className="font-medium">연락처: </span>
                  {app.phone}
                </div>
                <div>
                  <span className="font-medium">희망일시: </span>
                  {app.preferredDate?.replace(/-/g, '.') ?? '-'} {app.preferredTime ?? ''}
                </div>
                {app.type === '스트링 장착 서비스' ? (
                  <>
                    <div>
                      <span className="font-medium">라켓: </span>
                      {app.racketType ?? '-'}
                    </div>
                    <div>
                      <span className="font-medium">스트링: </span>
                      {app.stringType ?? '-'}
                    </div>
                  </>
                ) : (
                  <>
                    <div>
                      <span className="font-medium">코스: </span>
                      {app.course ?? '-'}
                    </div>
                    <div>
                      <span className="font-medium">일정: </span>
                      {app.schedule ?? '-'}
                    </div>
                  </>
                )}
              </CardContent>

              <div className="text-sm text-muted-foreground mt-2">
                상태: <ApplicationStatusBadge status={app.status} />
              </div>
            </Card>
          );
        })
      )}
    </div>
  );
}
