import { Users, Calendar, Star, ShoppingBag, TrendingUp, Activity, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { getCurrentUser } from '@/lib/hooks/get-current-user';
import AccessDenied from '@/components/system/AccessDenied';

export default async function AdminDashboardPage() {
  const user = await getCurrentUser();

  if (!user || user.role !== 'admin') {
    return <AccessDenied />;
  }

  // 임시 통계 데이터
  const stats = [
    {
      title: '전체 회원 수',
      value: '1',
      change: '+11.1%',
      trend: 'up',
      icon: <Users className="h-5 w-5" />,
      description: '지난 달 대비',
    },
    {
      title: '등록된 클래스 수',
      value: '1',
      change: '+1.1%',
      trend: 'up',
      icon: <Calendar className="h-5 w-5" />,
      description: '지난 달 대비',
    },
    {
      title: '작성된 리뷰 수',
      value: '1',
      change: '+1.1%',
      trend: 'up',
      icon: <Star className="h-5 w-5" />,
      description: '지난 달 대비',
    },
    {
      title: '총 예약 건수',
      value: '1',
      change: '+1.1%',
      trend: 'up',
      icon: <ShoppingBag className="h-5 w-5" />,
      description: '지난 달 대비',
    },
  ];

  // 추가 통계 데이터
  const additionalStats = [
    {
      title: '월 매출',
      value: '₩99,999,999',
      change: '+1.1%',
      trend: 'up',
      icon: <DollarSign className="h-5 w-5" />,
      description: '지난 달 대비',
    },
    {
      title: '방문자 수',
      value: '1',
      change: '+1.1%',
      trend: 'up',
      icon: <Activity className="h-5 w-5" />,
      description: '지난 달 대비',
    },
    {
      title: '평균 체류 시간',
      value: '1분 1초',
      change: '+1.1%',
      trend: 'up',
      icon: <Clock className="h-5 w-5" />,
      description: '지난 달 대비',
    },
    {
      title: '전환율',
      value: '1.1%',
      change: '+1.1%',
      trend: 'up',
      icon: <TrendingUp className="h-5 w-5" />,
      description: '지난 달 대비',
    },
  ];

  return (
    <div className="container py-10">
      <div className="mx-auto max-w-7xl">
        {/* 페이지 제목 */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight md:text-5xl">관리자 대시보드</h1>
          <p className="mt-2 text-muted-foreground">도깨비 테니스 아카데미의 전체 현황을 한눈에 확인하세요.</p>
        </div>

        {/* 주요 통계 카드 */}
        <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <Card key={index} className="overflow-hidden border-border/40 bg-card/60 backdrop-blur">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className={`rounded-full p-2 ${stat.trend === 'up' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{stat.icon}</div>
                  <div className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>{stat.change}</div>
                </div>
                <div className="mt-4">
                  <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                  <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* 추가 통계 카드 */}
        <div className="mb-6">
          <h2 className="mb-6 text-2xl font-bold">추가 통계</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {additionalStats.map((stat, index) => (
              <Card key={index} className="overflow-hidden border-border/40 bg-card/60 backdrop-blur">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className={`rounded-full p-2 ${stat.trend === 'up' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>{stat.icon}</div>
                    <div className={`text-sm font-medium ${stat.trend === 'up' ? 'text-green-500' : 'text-red-500'}`}>{stat.change}</div>
                  </div>
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-muted-foreground">{stat.title}</h3>
                    <p className="mt-2 text-3xl font-bold">{stat.value}</p>
                    <p className="mt-1 text-xs text-muted-foreground">{stat.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
