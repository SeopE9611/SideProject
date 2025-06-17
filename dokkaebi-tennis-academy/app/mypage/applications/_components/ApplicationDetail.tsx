'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, MessageSquare } from 'lucide-react';
import { RatIcon as Racquet } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Application {
  id: string;
  type: string;
  applicantName: string;
  phone: string;
  appliedAt: string;
  status: string;
  racketType: string;
  stringType: string;
  preferredDate: string;
  requests?: string;
}

const dummyData: Record<string, any> = {
  '1': {
    id: '1',
    type: '스트링 장착 서비스',
    applicantName: '김테니스',
    phone: '010-1234-5678',
    appliedAt: '2024-01-15',
    status: '접수 완료',
    racketType: '윌슨 프로 스태프 97',
    stringType: '바볼랏 RPM 블라스트',
    preferredDate: '2024-01-20',
    requests: '텐션은 50파운드로 부탁드립니다.',
  },
  '2': {
    id: '2',
    type: '스트링 장착 서비스',
    applicantName: '이라켓',
    phone: '010-9876-5432',
    appliedAt: '2024-01-10',
    status: '검토 중',
    racketType: '헤드 스피드 MP',
    stringType: '룩솔론 알루파워',
    preferredDate: '2024-01-18',
    requests: '가능하면 빠른 처리 부탁드립니다.',
  },
};

const getStatusColor = (status: string) => {
  switch (status) {
    case '접수 완료':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    case '검토 중':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    case '완료':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
  }
};

export default function ApplicationDetail({ id }: { id: string }) {
  const router = useRouter();
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  // useEffect(() => {
  //   fetch(`/api/applications/${id}`)
  //     .then((res) => res.json())
  //     .then((data) => setApplication(data))
  //     .finally(() => setLoading(false));
  // }, [id]);

  useEffect(() => {
    // 실제 API 호출 전까지는 더미 데이터 사용
    const dummy = dummyData[id];
    if (dummy) setApplication(dummy);
    setLoading(false);
  }, [id]);

  if (loading) return <div className="py-12 text-center text-muted-foreground">신청 내역을 불러오는 중입니다...</div>;
  if (!application) return <div className="py-12 text-center text-red-500">신청 내역을 찾을 수 없습니다.</div>;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push('/mypage?tab=applications')}>
        <ArrowLeft className="mr-2 h-4 w-4" /> 목록으로 돌아가기
      </Button>

      {/* 요약 */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <CardTitle className="text-xl">{application.type}</CardTitle>
              <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>신청일: {application.appliedAt}</span>
              </div>
            </div>
            <Badge className={getStatusColor(application.status)}>{application.status}</Badge>
          </div>
        </CardHeader>
      </Card>

      {/* 신청자 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" /> 신청자 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">신청자명</Label>
            <p className="mt-1 font-medium">{application.applicantName}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">연락처</Label>
            <p className="mt-1 font-medium">{application.phone}</p>
          </div>
        </CardContent>
      </Card>

      {/* 서비스 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Racquet className="h-5 w-5" /> 서비스 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm text-muted-foreground">라켓 종류</Label>
            <p className="mt-1 font-medium">{application.racketType}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">스트링 종류</Label>
            <p className="mt-1 font-medium">{application.stringType}</p>
          </div>
          <div>
            <Label className="text-sm text-muted-foreground">장착 희망일</Label>
            <p className="mt-1 font-medium">{application.preferredDate}</p>
          </div>
        </CardContent>
      </Card>

      {/* 요청사항 */}
      {application.requests && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" /> 요청사항
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed whitespace-pre-line">{application.requests}</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
