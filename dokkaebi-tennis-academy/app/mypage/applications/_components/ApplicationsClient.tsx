'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, Phone, User, RatIcon as Racquet, Zap, GraduationCap, ArrowRight, FileText } from 'lucide-react';
import { useRouter } from 'next/navigation';
import useSWRInfinite from 'swr/infinite';
import ApplicationStatusBadge from '@/app/features/stringing-applications/components/ApplicationStatusBadge';
import { useMemo } from 'react';

export interface Application {
  id: string;
  type: '스트링 장착 서비스' | '아카데미 수강 신청';
  applicantName: string;
  phone: string;
  appliedAt: string;
  status: '접수완료' | '검토 중' | '완료';
  racketType?: string;
  stringType?: string;
  preferredDate?: string;
  preferredTime?: string;
  course?: string;
  schedule?: string;
}

type AppResponse = { items: Application[]; total: number };

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

const LIMIT = 5;

export default function ApplicationsClient() {
  const router = useRouter();

  // SWR Infinite 키 생성
  const getKey = (pageIndex: number, previousPageData: AppResponse | null) => {
    // 직전 페이지가 LIMIT 미만이면 다음 페이지 없음
    if (previousPageData && previousPageData.items && previousPageData.items.length < LIMIT) return null;

    const page = pageIndex + 1;
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(LIMIT));

    // 필터/검색 대비용
    // if (statusFilter) params.set('status', statusFilter);
    // if (keyword) params.set('q', keyword);
    // if (dateFrom) params.set('dateFrom', dateFrom);

    return `/api/applications/me?${params.toString()}`;
  };

  const { data, size, setSize, isValidating, error } = useSWRInfinite<AppResponse>(getKey, fetcher, {
    revalidateFirstPage: true,
  });

  // 누적 리스트
  const applications = useMemo(() => (data ? data.flatMap((d) => d.items) : []), [data]);

  // 더 보기 여부
  const hasMore = useMemo(() => {
    if (!data || data.length === 0) return false;
    const last = data[data.length - 1];
    return (last?.items?.length ?? 0) === LIMIT;
  }, [data]);

  // 에러
  if (error) {
    return <p className="text-center py-4 text-red-500">에러: {error.message}</p>;
  }

  // 첫 로딩
  if (!data && isValidating) {
    return <div className="text-center py-8 text-muted-foreground">신청 내역을 불러오는 중입니다...</div>;
  }

  return (
    <div className="space-y-6">
      {applications.length === 0 ? (
        <Card className="relative overflow-hidden border-0 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
          <CardContent className="p-12 text-center">
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 dark:from-blue-900 dark:to-indigo-900">
              <FileText className="h-10 w-10 text-blue-600 dark:text-blue-400" />
            </div>
            <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-slate-100">신청 내역이 없습니다</h3>
            <p className="mb-6 text-slate-600 dark:text-slate-400">아직 신청하신 서비스가 없습니다. 지금 바로 신청해보세요!</p>
            <Button asChild className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg hover:shadow-xl transition-all duration-200">
              <Link href="/services" className="inline-flex items-center gap-2">
                서비스 신청하러 가기
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        applications.map((app) => {
          const isStringService = app.type === '스트링 장착 서비스';

          return (
            <Card key={app.id} className="group relative overflow-hidden border-0 bg-white dark:bg-slate-900 shadow-md hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" style={{ padding: '1px' }}>
                <div className="h-full w-full bg-white dark:bg-slate-900 rounded-lg" />
              </div>

              <CardContent className="relative p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div
                      className={`flex h-12 w-12 items-center justify-center rounded-xl ${
                        isStringService ? 'bg-gradient-to-br from-orange-100 to-red-100 dark:from-orange-900 dark:to-red-900' : 'bg-gradient-to-br from-green-100 to-emerald-100 dark:from-green-900 dark:to-emerald-900'
                      }`}
                    >
                      {isStringService ? <Racquet className={`h-6 w-6 ${isStringService ? 'text-orange-600 dark:text-orange-400' : 'text-green-600 dark:text-green-400'}`} /> : <GraduationCap className="h-6 w-6 text-green-600 dark:text-green-400" />}
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-900 dark:text-slate-100">{app.type}</h3>
                      <div className="flex items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                        <Calendar className="h-3 w-3" />
                        {formatDateTime(app.appliedAt)}
                      </div>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/mypage?tab=applications&id=${app.id}`)}
                    className="border-slate-200 hover:border-blue-300 hover:bg-blue-50 dark:border-slate-700 dark:hover:border-blue-600 dark:hover:bg-blue-950 transition-colors"
                  >
                    상세보기
                    <ArrowRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <User className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">이름</div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{app.applicantName}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <Phone className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">연락처</div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">{app.phone}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                    <Clock className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                    <div>
                      <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">희망일시</div>
                      <div className="font-medium text-slate-900 dark:text-slate-100">
                        {app.preferredDate?.replace(/-/g, '.') ?? '-'} {app.preferredTime ?? ''}
                      </div>
                    </div>
                  </div>

                  {isStringService ? (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <Zap className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">라켓 & 스트링</div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {app.racketType ?? '-'} / {app.stringType ?? '-'}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 dark:bg-slate-800">
                      <GraduationCap className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                      <div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 uppercase tracking-wide">코스 & 일정</div>
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {app.course ?? '-'} / {app.schedule ?? '-'}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500 dark:text-slate-400">상태:</span>
                    <ApplicationStatusBadge status={app.status} />
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}

      {/* '더 보기' 버튼 */}
      <div className="mt-6 flex justify-center items-center">
        {hasMore ? (
          <Button variant="outline" onClick={() => setSize(size + 1)} disabled={isValidating}>
            {isValidating ? '불러오는 중…' : '더 보기'}
          </Button>
        ) : applications.length ? (
          <span className="text-sm text-slate-500">마지막 페이지입니다</span>
        ) : null}
      </div>
    </div>
  );
}
