'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import ApplicationStatusBadge from '@/app/features/stringing-applications/components/ApplicationStatusBadge';
import { ApplicationStatusSelect } from '@/app/features/stringing-applications/components/ApplicationStatusSelect';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

type Application = {
  _id: string;
  name: string;
  phone: string;
  stringDetails: {
    racketType: string;
    stringType: string;
    customStringName?: string;
    preferredDate: string;
    preferredTime: string;
    requirements?: string;
  };
  status: string;
  createdAt: string;
  cancelRequest?: {
    status?: string; // '요청' | 'requested' 등
  };
  orderId?: string; // 이 신청이 연결된 주문 ID (없을 수도 있음)
};

export default function StringingApplicationsClient() {
  const [applications, setApplications] = useState<Application[]>([]);

  useEffect(() => {
    fetch('/api/applications/stringing/list', { credentials: 'include' })
      .then((res) => res.json())
      .then(setApplications)
      .catch((err) => console.error('신청 목록 불러오기 실패', err));
  }, []);
  // http://localhost:3000/admin/applications/stringing
  return (
    <div className="space-y-6 px-6 py-10">
      <Card>
        <CardHeader>
          <CardTitle>스트링 장착 서비스 신청 관리</CardTitle>
        </CardHeader>
        <CardContent>
          {applications.map((app: Application) => {
            // 안전하게 orderId 문자열 뽑기
            const rawOrderId = (app as any).orderId;
            const orderId = rawOrderId ? String(rawOrderId) : null;
            // 취소 요청 상태 문자열 꺼내기
            const cancelStatus = (app as any).cancelRequest?.status;

            // 과거 한글('요청') + 현재 영문('requested') 둘 다 지원
            const hasCancelRequest = cancelStatus === '요청' || cancelStatus === 'requested';
            return (
              <Card key={app._id}>
                <CardHeader>
                  <CardTitle className="text-base font-semibold">{app.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <div className="text-muted-foreground flex items-center gap-1">
                    {/* 취소요청 상태일 때만 경고 아이콘 표시 */}
                    {hasCancelRequest && <AlertTriangle className="h-3 w-3 text-amber-500" aria-hidden="true" />}
                    <span>{app._id}</span>
                  </div>

                  {/* 이 신청이 어느 주문에서 생성되었는지 표시 */}
                  {orderId && (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <Link href={`/admin/orders/${orderId}`}>
                        <Badge variant="outline" className="text-[11px]">
                          연결된 주문 상세 보기
                        </Badge>
                      </Link>
                      <span>주문 ID 끝자리 {orderId.slice(-6)}</span>
                    </div>
                  )}

                  <div>{app.phone}</div>
                  {app.stringDetails?.preferredDate && app.stringDetails?.preferredTime ? (
                    <div>
                      희망일시: {app.stringDetails.preferredDate} {app.stringDetails.preferredTime}
                    </div>
                  ) : (
                    <div>예약: 예약 없음</div>
                  )}
                  <div>스트링 종류: {app.stringDetails.stringType === 'custom' ? app.stringDetails.customStringName : app.stringDetails.stringType}</div>
                  <div className="flex justify-end gap-2 pt-2">
                    <ApplicationStatusBadge status={app.status} />
                    <ApplicationStatusSelect currentStatus={app.status} applicationId={String(app._id)} />
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
