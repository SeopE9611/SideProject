import { Users, Calendar, Star, ShoppingBag, TrendingUp, Activity, DollarSign, Clock, Package, Zap, BarChart3, Settings } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
      value: '1,247',
      change: '+11.1%',
      trend: 'up',
      icon: <Users className="h-6 w-6" />,
      description: '지난 달 대비',
      color: 'from-emerald-500 to-teal-500',
      bgColor: 'bg-emerald-50',
      iconColor: 'text-emerald-600',
    },
    {
      title: '등록된 클래스 수',
      value: '24',
      change: '+8.3%',
      trend: 'up',
      icon: <Calendar className="h-6 w-6" />,
      description: '지난 달 대비',
      color: 'from-blue-500 to-cyan-500',
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
    },
    {
      title: '작성된 리뷰 수',
      value: '892',
      change: '+15.2%',
      trend: 'up',
      icon: <Star className="h-6 w-6" />,
      description: '지난 달 대비',
      color: 'from-yellow-500 to-orange-500',
      bgColor: 'bg-yellow-50',
      iconColor: 'text-yellow-600',
    },
    {
      title: '총 주문 건수',
      value: '3,456',
      change: '+23.1%',
      trend: 'up',
      icon: <ShoppingBag className="h-6 w-6" />,
      description: '지난 달 대비',
      color: 'from-purple-500 to-pink-500',
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
    },
  ];

  // 추가 통계 데이터
  const additionalStats = [
    {
      title: '월 매출',
      value: '₩45,230,000',
      change: '+18.7%',
      trend: 'up',
      icon: <DollarSign className="h-6 w-6" />,
      description: '지난 달 대비',
      color: 'from-green-500 to-emerald-500',
      bgColor: 'bg-green-50',
      iconColor: 'text-green-600',
    },
    {
      title: '방문자 수',
      value: '12,847',
      change: '+9.4%',
      trend: 'up',
      icon: <Activity className="h-6 w-6" />,
      description: '지난 달 대비',
      color: 'from-indigo-500 to-blue-500',
      bgColor: 'bg-indigo-50',
      iconColor: 'text-indigo-600',
    },
    {
      title: '평균 체류 시간',
      value: '4분 32초',
      change: '+12.3%',
      trend: 'up',
      icon: <Clock className="h-6 w-6" />,
      description: '지난 달 대비',
      color: 'from-teal-500 to-cyan-500',
      bgColor: 'bg-teal-50',
      iconColor: 'text-teal-600',
    },
    {
      title: '전환율',
      value: '3.8%',
      change: '+0.7%',
      trend: 'up',
      icon: <TrendingUp className="h-6 w-6" />,
      description: '지난 달 대비',
      color: 'from-rose-500 to-pink-500',
      bgColor: 'bg-rose-50',
      iconColor: 'text-rose-600',
    },
  ];

  // 최근 활동 데이터
  const recentActivities = [
    {
      title: '새로운 주문',
      description: '김재민님이 테니스 라켓을 주문했습니다',
      time: '5분 전',
      icon: <ShoppingBag className="h-4 w-4" />,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
    },
    {
      title: '스트링 서비스 신청',
      description: '쑹빵이님이 스트링 교체를 신청했습니다',
      time: '12분 전',
      icon: <Zap className="h-4 w-4" />,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: '새로운 리뷰',
      description: '죡팡님이 5점 리뷰를 작성했습니다',
      time: '25분 전',
      icon: <Star className="h-4 w-4" />,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
    },
    {
      title: '새 회원 가입',
      description: '넌적혈구님이 회원가입을 완료했습니다',
      time: '1시간 전',
      icon: <Users className="h-4 w-4" />,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: '상품 재고 알림',
      description: '윌슨 프로스태프 재고가 부족합니다',
      time: '2시간 전',
      icon: <Package className="h-4 w-4" />,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
    },
  ];

  return (
    <div className="p-6 space-y-8">
      {/* 페이지 제목 */}
      <div className="mb-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 shadow-lg">
            <BarChart3 className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-4xl font-bold tracking-tight text-gray-900 md:text-5xl">관리자 대시보드</h1>
            <p className="mt-2 text-lg text-gray-600">도깨비 테니스 아카데미의 전체 현황을 한눈에 확인하세요</p>
          </div>
        </div>
      </div>

      {/* 주요 통계 카드 */}
      <div className="mb-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat, index) => (
          <Card key={index} className="overflow-hidden border-0 bg-white/80 shadow-xl backdrop-blur-sm transition-all duration-200 hover:shadow-2xl hover:scale-105">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className={`rounded-xl p-3 ${stat.bgColor}`}>
                  <div className={stat.iconColor}>{stat.icon}</div>
                </div>
                <div className={`text-sm font-semibold ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'} bg-gradient-to-r ${stat.trend === 'up' ? 'from-emerald-50 to-teal-50' : 'from-red-50 to-pink-50'} px-2 py-1 rounded-full`}>
                  {stat.change}
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
                <p className="text-3xl font-bold text-gray-900 mb-1">{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.description}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 추가 통계 및 최근 활동 */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* 추가 통계 카드 */}
        <div className="lg:col-span-2">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">상세 통계</h2>
            <p className="text-gray-600">비즈니스 성과를 자세히 분석해보세요</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {additionalStats.map((stat, index) => (
              <Card key={index} className="overflow-hidden border-0 bg-white/80 shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`rounded-xl p-3 ${stat.bgColor}`}>
                      <div className={stat.iconColor}>{stat.icon}</div>
                    </div>
                    <div className={`text-sm font-semibold ${stat.trend === 'up' ? 'text-emerald-600' : 'text-red-600'} bg-gradient-to-r ${stat.trend === 'up' ? 'from-emerald-50 to-teal-50' : 'from-red-50 to-pink-50'} px-2 py-1 rounded-full`}>
                      {stat.change}
                    </div>
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-gray-600 mb-1">{stat.title}</h3>
                    <p className="text-2xl font-bold text-gray-900 mb-1">{stat.value}</p>
                    <p className="text-xs text-gray-500">{stat.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* 최근 활동 */}
        <div>
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">최근 활동</h2>
            <p className="text-gray-600">실시간 시스템 활동을 확인하세요</p>
          </div>
          <Card className="border-0 bg-white/80 shadow-lg backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">활동 로그</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="space-y-1">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-4 hover:bg-gray-50/80 transition-colors">
                    <div className={`rounded-lg p-2 ${activity.bgColor} mt-0.5`}>
                      <div className={activity.color}>{activity.icon}</div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="text-sm font-medium text-gray-900">{activity.title}</h4>
                      <p className="text-sm text-gray-600 mt-0.5">{activity.description}</p>
                      <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 빠른 액션 버튼 */}
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">빠른 액션</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="border-0 bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <Users className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">회원 관리</h3>
              <p className="text-sm opacity-90">새 회원 등록 및 관리</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <Package className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">상품 관리</h3>
              <p className="text-sm opacity-90">새 상품 등록 및 재고 관리</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <ShoppingBag className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">주문 관리</h3>
              <p className="text-sm opacity-90">주문 처리 및 배송 관리</p>
            </CardContent>
          </Card>
          <Card className="border-0 bg-gradient-to-r from-yellow-500 to-orange-500 text-white shadow-lg backdrop-blur-sm transition-all duration-200 hover:shadow-xl hover:scale-105 cursor-pointer">
            <CardContent className="p-6 text-center">
              <Settings className="h-8 w-8 mx-auto mb-3" />
              <h3 className="font-semibold mb-1">시스템 설정</h3>
              <p className="text-sm opacity-90">사이트 설정 및 환경 구성</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
