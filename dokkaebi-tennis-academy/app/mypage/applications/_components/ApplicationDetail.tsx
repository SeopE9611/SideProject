'use client';

import { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Calendar, User, MessageSquare } from 'lucide-react';
import { RatIcon as Racquet } from 'lucide-react';
import { useRouter } from 'next/navigation';
import ApplicationStatusBadge from '@/app/admin/applications/_components/ApplicationStatusBadge';

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

export default function ApplicationDetail({ id }: { id: string }) {
  const router = useRouter();
  // 상태 선언: 신청서 데이터와 로딩 여부
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);

  // 상태에 따라 배지 색상을 결정하는 유틸 함수
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

  // useEffect(() => {
  //   // 실제 API 호출 전까지는 더미 데이터 사용
  //   const dummy = dummyData[id];
  //   if (dummy) setApplication(dummy);
  //   setLoading(false);
  // }, [id]);

  //  컴포넌트 마운트 시 API 호출
  useEffect(() => {
    const fetchApplication = async () => {
      try {
        // `/api/applications/[id]` API 호출
        const response = await fetch(`/api/applications/${id}`, { credentials: 'include' });

        if (!response.ok) {
          throw new Error('신청서 데이터를 불러오는 데 실패했습니다.');
        }

        // JSON 형식으로 응답 파싱
        const data = await response.json();

        // 상태에 저장
        setApplication(data);
      } catch (error) {
        console.error(error);
        setApplication(null); // 오류 발생 시 null로 설정
      } finally {
        setLoading(false); // 로딩 종료
      }
    };

    fetchApplication();
  }, [id]);

  // 로딩처리
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
              <div className="text-sm text-muted-foreground">
                상태: <ApplicationStatusBadge status={application.status} />
              </div>
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
