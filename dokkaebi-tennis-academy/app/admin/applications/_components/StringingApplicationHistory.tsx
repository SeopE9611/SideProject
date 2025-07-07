'use client';

import { Card, CardHeader, CardContent, CardTitle } from '@/components/ui/card';
import { Clock, CheckCircle, XCircle, Search, ClipboardCheck } from 'lucide-react';

// 상태별 아이콘 및 스타일 반환 함수
function getIconProps(status: string) {
  switch (status) {
    case '접수완료':
      return {
        Icon: ClipboardCheck,
        wrapperClasses: 'border-yellow-300 bg-yellow-100',
        iconClasses: 'text-yellow-600',
      };
    case '검토중':
      return {
        Icon: Search,
        wrapperClasses: 'border-blue-300 bg-blue-100',
        iconClasses: 'text-blue-600',
      };
    case '완료':
      return {
        Icon: CheckCircle,
        wrapperClasses: 'border-green-300 bg-green-100',
        iconClasses: 'text-green-600',
      };
    case '취소':
      return {
        Icon: XCircle,
        wrapperClasses: 'border-red-300 bg-red-100',
        iconClasses: 'text-red-600',
      };
    default:
      return {
        Icon: Clock,
        wrapperClasses: 'border-gray-300 bg-gray-100',
        iconClasses: 'text-gray-600',
      };
  }
}

interface HistoryItem {
  status: string;
  date: string | Date;
  description: string;
}

interface Props {
  history: HistoryItem[];
}

export default function StringingApplicationHistory({ history }: Props) {
  const isEmpty = !history || history.length === 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>신청 처리 이력</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEmpty ? (
          <p className="text-muted-foreground text-sm">아직 처리 이력이 없습니다.</p>
        ) : (
          history.map((log, index) => {
            const { Icon, wrapperClasses, iconClasses } = getIconProps(log.status);
            return (
              <div key={index} className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${wrapperClasses}`}>
                  <Icon className={`w-5 h-5 ${iconClasses}`} />
                </div>
                <div className="text-sm">
                  <p className="font-medium">{log.description}</p>
                  <p className="text-muted-foreground text-xs">{new Date(log.date).toLocaleString()}</p>
                </div>
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
