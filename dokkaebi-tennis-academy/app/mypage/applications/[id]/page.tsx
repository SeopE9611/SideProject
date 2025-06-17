'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Calendar, User, RatIcon as Racquet, MessageSquare } from 'lucide-react';

// 샘플 데이터
const applicationData = {
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

export default function ApplicationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const application = applicationData[id as keyof typeof applicationData];

  if (!application) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Card className="text-center py-12">
          <CardContent>
            <h3 className="text-lg font-semibold mb-2">신청 내역을 찾을 수 없습니다</h3>
            <p className="text-muted-foreground mb-4">요청하신 신청 내역이 존재하지 않습니다.</p>
            <Button asChild>
              <Link href="/mypage/applications">
                <ArrowLeft className="mr-2 h-4 w-4" />
                목록으로 돌아가기
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-6">
        <Button variant="ghost" asChild className="mb-4">
          <Link href="/mypage/applications">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로 돌아가기
          </Link>
        </Button>

        <h1 className="text-3xl font-bold mb-2">신청 상세 내역</h1>
        <p className="text-muted-foreground">신청하신 서비스의 상세 정보를 확인할 수 있습니다.</p>
      </div>

      {/* 요약 카드 */}
      <Card className="mb-6">
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
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            신청자 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">신청자명</Label>
              <p className="mt-1 font-medium">{application.applicantName}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">연락처</Label>
              <p className="mt-1 font-medium">{application.phone}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 서비스 정보 */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Racquet className="h-5 w-5" />
            서비스 정보
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="text-sm font-medium text-muted-foreground">라켓 종류</Label>
              <p className="mt-1 font-medium">{application.racketType}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">스트링 종류</Label>
              <p className="mt-1 font-medium">{application.stringType}</p>
            </div>
            <div>
              <Label className="text-sm font-medium text-muted-foreground">장착 희망일</Label>
              <p className="mt-1 font-medium">{application.preferredDate}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 요청사항 */}
      {application.requests && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              요청사항
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{application.requests}</p>
          </CardContent>
        </Card>
      )}

      {/* 하단 버튼 */}
      <div className="flex justify-center">
        <Button asChild size="lg">
          <Link href="/mypage/applications">
            <ArrowLeft className="mr-2 h-4 w-4" />
            목록으로 돌아가기
          </Link>
        </Button>
      </div>
    </div>
  );
}
