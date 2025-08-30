import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Gauge, Target, Zap, Shield, Users, TrendingUp } from 'lucide-react';

export default function TensionGuidePage() {
  const playerTypes = [
    {
      type: '초보자',
      icon: Users,
      tension: '22-26kg',
      description: '편안한 플레이와 부상 방지를 위한 낮은 텐션',
      characteristics: ['파워 증가', '편안한 느낌', '부상 위험 감소'],
      color: 'bg-green-50 dark:bg-green-950 border-green-200 dark:border-green-800',
    },
    {
      type: '중급자',
      icon: Target,
      tension: '24-28kg',
      description: '컨트롤과 파워의 균형을 맞춘 중간 텐션',
      characteristics: ['균형잡힌 플레이', '적당한 컨트롤', '다양한 샷 구사'],
      color: 'bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800',
    },
    {
      type: '상급자',
      icon: Zap,
      tension: '26-30kg',
      description: '정밀한 컨트롤과 스핀을 위한 높은 텐션',
      characteristics: ['정밀한 컨트롤', '강한 스핀', '빠른 스윙 스피드'],
      color: 'bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800',
    },
    {
      type: '프로/투어',
      icon: TrendingUp,
      tension: '28-32kg',
      description: '최고 수준의 컨트롤과 정확성을 위한 고텐션',
      characteristics: ['최고 컨트롤', '정확한 플레이스먼트', '프로 수준 스핀'],
      color: 'bg-orange-50 dark:bg-orange-950 border-orange-200 dark:border-orange-800',
    },
  ];

  const stringTypes = [
    {
      name: '폴리에스터',
      recommendedTension: '24-28kg',
      characteristics: '내구성이 뛰어나고 스핀 생성에 유리',
      adjustment: '일반 텐션보다 2-3kg 낮게',
    },
    {
      name: '멀티필라멘트',
      recommendedTension: '22-26kg',
      characteristics: '편안한 느낌과 파워 증가',
      adjustment: '표준 텐션 적용',
    },
    {
      name: '하이브리드',
      recommendedTension: '메인: 26kg, 크로스: 24kg',
      characteristics: '컨트롤과 편안함의 조화',
      adjustment: '메인을 크로스보다 2kg 높게',
    },
    {
      name: '내추럴 거트',
      recommendedTension: '23-27kg',
      characteristics: '최고의 느낌과 파워',
      adjustment: '표준 텐션보다 1-2kg 낮게',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
      {/* Tennis court line pattern background */}
      <div
        className="absolute inset-0 opacity-[0.02] dark:opacity-[0.05]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='100' height='100' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 50h100M50 0v100M20 20h60M20 80h60M20 20v60M80 20v60' stroke='%23334155' strokeWidth='1' fill='none'/%3E%3C/svg%3E")`,
          backgroundSize: '100px 100px',
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 px-4 py-2 rounded-full mb-6">
            <Gauge className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">전문가 텐션 가이드</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white mb-4">스트링 텐션 가이드</h1>
          <p className="text-lg text-slate-600 dark:text-slate-300 max-w-2xl mx-auto">플레이어 수준과 스트링 타입에 맞는 최적의 텐션을 찾아보세요</p>
        </div>

        {/* Player Type Guide */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">플레이어 수준별 권장 텐션</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {playerTypes.map((player, index) => {
              const IconComponent = player.icon;
              return (
                <Card key={index} className={`${player.color} hover:shadow-lg transition-all duration-300`}>
                  <CardHeader className="text-center pb-4">
                    <div className="mx-auto w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center mb-3">
                      <IconComponent className="h-6 w-6 text-slate-700 dark:text-slate-300" />
                    </div>
                    <CardTitle className="text-lg">{player.type}</CardTitle>
                    <Badge variant="secondary" className="mx-auto">
                      {player.tension}
                    </Badge>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-4">{player.description}</p>
                    <ul className="space-y-1">
                      {player.characteristics.map((char, i) => (
                        <li key={i} className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-2">
                          <div className="w-1 h-1 bg-slate-400 rounded-full" />
                          {char}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* String Type Guide */}
        <div className="mb-16">
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-8 text-center">스트링 타입별 텐션 조정</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {stringTypes.map((string, index) => (
              <Card key={index} className="hover:shadow-lg transition-all duration-300">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                    {string.name}
                  </CardTitle>
                  <Badge variant="outline">{string.recommendedTension}</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 dark:text-slate-400 mb-3">{string.characteristics}</p>
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
                    <p className="text-sm font-medium text-blue-700 dark:text-blue-300">조정 팁: {string.adjustment}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Tips Section */}
        <Card className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/50 dark:to-purple-950/50 border-blue-200 dark:border-blue-800">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Target className="h-6 w-6" />
              전문가 팁
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">텐션 조정 시 고려사항</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>• 날씨: 습한 날씨에는 1-2kg 높게</li>
                  <li>• 코트 표면: 클레이 코트에서는 1kg 낮게</li>
                  <li>• 플레이 스타일: 베이스라인 플레이어는 높게</li>
                  <li>• 부상 이력: 팔꿈치 문제 시 낮게</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold text-slate-900 dark:text-white mb-2">텐션 유지 관리</h4>
                <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  <li>• 정기적인 텐션 체크 (월 1회)</li>
                  <li>• 스트링 교체 주기 준수</li>
                  <li>• 라켓 보관 환경 관리</li>
                  <li>• 전문가 상담 정기적 이용</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
