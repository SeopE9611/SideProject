'use client';
import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Phone, User, FileText, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';
// 샘플 데이터
const applications = [
  {
    id: '1',
    type: '스트링 장착 서비스',
    applicantName: '김테니스',
    phone: '010-1234-5678',
    appliedAt: '2024-01-15',
    status: '접수 완료',
    racketType: '윌슨 프로 스태프 97',
    stringType: '바볼랏 RPM 블라스트',
  },
  {
    id: '2',
    type: '스트링 장착 서비스',
    applicantName: '이라켓',
    phone: '010-9876-5432',
    appliedAt: '2024-01-10',
    status: '검토 중',
    racketType: '헤드 스피드 MP',
    stringType: '룩솔론 알루파워',
  },
  {
    id: '3',
    type: '아카데미 수강 신청',
    applicantName: '박아카데미',
    phone: '010-5555-1234',
    appliedAt: '2024-01-05',
    status: '완료',
    course: '초급반',
    schedule: '주 2회 (화, 목)',
  },
];

const getStatusBadgeVariant = (status: string) => {
  switch (status) {
    case '접수 완료':
      return 'secondary';
    case '검토 중':
      return 'default'; // yellow-like
    case '완료':
      return 'default'; // green-like - we'll use custom classes
    default:
      return 'secondary';
  }
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

export default function ApplicationsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      {applications.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">신청 내역이 없습니다</h3>
            <p className="text-muted-foreground mb-4">아직 신청한 서비스가 없습니다. 새로운 서비스를 신청해보세요.</p>
            <Button asChild>
              <Link href="/services">서비스 신청하기</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {applications.map((application) => (
            <Card key={application.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-lg">{application.type}</h3>
                      <Badge className={getStatusColor(application.status)}>{application.status}</Badge>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>신청일: {application.appliedAt}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        <span>신청자: {application.applicantName}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="h-4 w-4" />
                        <span>연락처: {application.phone}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <Button variant="outline" size="sm" onClick={() => router.push(`/mypage?tab=applications&id=${application.id}`)}>
                      신청 상세 보기
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
