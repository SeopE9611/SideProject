'use client';

import type React from 'react';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Package, Star, CheckCircle, Clock, Shield, Award, Zap, Target, Users, ArrowRight, Gift, Percent, Calendar, Phone } from 'lucide-react';
import { useState } from 'react';

interface PackageOption {
  id: string;
  title: string;
  sessions: number;
  price: number;
  originalPrice?: number;
  discount?: number;
  popular?: boolean;
  features: string[];
  benefits: string[];
  color: string;
  icon: React.ReactNode;
  description: string;
  validityPeriod: string;
}

const Trophy = ({ className }: { className: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={2}
      d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138z"
    />
  </svg>
);

export default function StringPackagesPage() {
  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);

  const packages: PackageOption[] = [
    {
      id: '10-sessions',
      title: '스타터 패키지',
      sessions: 10,
      price: 100000,
      originalPrice: 120000,
      discount: 17,
      features: ['10회 스트링 교체', '무료 장력 상담', '기본 스트링 포함'],
      benefits: ['회당 10,000원', '2만원 절약', '3개월 유효'],
      color: 'blue',
      icon: <Target className="h-8 w-8" />,
      description: '테니스를 시작하는 분들에게 적합한 기본 패키지',
      validityPeriod: '3개월',
    },
    {
      id: '30-sessions',
      title: '레귤러 패키지',
      sessions: 30,
      price: 300000,
      originalPrice: 360000,
      discount: 17,
      popular: true,
      features: ['30회 스트링 교체', '무료 장력 상담', '프리미엄 스트링 선택', '우선 예약'],
      benefits: ['회당 10,000원', '6만원 절약', '6개월 유효', '우선 예약 혜택'],
      color: 'indigo',
      icon: <Star className="h-8 w-8" />,
      description: '정기적으로 테니스를 즐기는 분들을 위한 인기 패키지',
      validityPeriod: '6개월',
    },
    {
      id: '50-sessions',
      title: '프로 패키지',
      sessions: 50,
      price: 500000,
      originalPrice: 600000,
      discount: 17,
      features: ['50회 스트링 교체', '무료 장력 상담', '프리미엄 스트링 선택', '우선 예약', '무료 그립 교체 5회'],
      benefits: ['회당 10,000원', '10만원 절약', '9개월 유효', '그립 교체 혜택'],
      color: 'purple',
      icon: <Award className="h-8 w-8" />,
      description: '진지한 테니스 플레이어를 위한 프리미엄 패키지',
      validityPeriod: '9개월',
    },
    {
      id: '100-sessions',
      title: '챔피언 패키지',
      sessions: 100,
      price: 1000000,
      originalPrice: 1200000,
      discount: 17,
      features: ['100회 스트링 교체', '무료 장력 상담', '프리미엄 스트링 선택', '우선 예약', '무료 그립 교체 10회', '전용 상담사 배정'],
      benefits: ['회당 10,000원', '20만원 절약', '12개월 유효', '전용 서비스'],
      color: 'emerald',
      icon: <Trophy className="h-8 w-8" />,
      description: '프로 선수와 열정적인 플레이어를 위한 최고급 패키지',
      validityPeriod: '12개월',
    },
  ];

  const additionalBenefits = [
    {
      icon: <Shield className="h-6 w-6" />,
      title: '품질 보장',
      description: '모든 스트링 교체에 대해 완벽한 품질을 보장합니다.',
      color: 'blue',
    },
    {
      icon: <Clock className="h-6 w-6" />,
      title: '빠른 서비스',
      description: '평균 30분 내 스트링 교체 완료',
      color: 'indigo',
    },
    {
      icon: <Users className="h-6 w-6" />,
      title: '전문가 상담',
      description: '15년 경력의 전문가가 직접 상담해드립니다.',
      color: 'purple',
    },
    {
      icon: <Gift className="h-6 w-6" />,
      title: '추가 혜택',
      description: '패키지 구매 시 다양한 부가 서비스 제공',
      color: 'emerald',
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      {/* Hero Section */}
      <section className="relative min-h-[70vh] flex items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600">
          <div className="absolute inset-0 opacity-20">
            <svg className="w-full h-full" viewBox="0 0 400 300" fill="none">
              <defs>
                <pattern id="stringPattern" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                  <rect width="40" height="40" fill="none" stroke="white" strokeWidth="1" opacity="0.3" />
                  <line x1="0" y1="20" x2="40" y2="20" stroke="white" strokeWidth="1" opacity="0.5" />
                  <line x1="20" y1="0" x2="20" y2="40" stroke="white" strokeWidth="1" opacity="0.5" />
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#stringPattern)" />
            </svg>
          </div>
          <div className="absolute inset-0 bg-black/20"></div>
        </div>

        <div className="container relative z-10 text-center text-white">
          <div className="max-w-4xl mx-auto">
            <Badge className="mb-6 bg-white/20 text-white border-white/30 backdrop-blur-sm">
              <Package className="w-4 h-4 mr-2" />
              프리미엄 스트링 패키지
            </Badge>

            <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-blue-100 to-white bg-clip-text text-transparent">스트링 교체 패키지</h1>

            <p className="text-xl md:text-2xl mb-8 text-blue-100 leading-relaxed">
              정기적인 스트링 교체로 최상의 경기력을 유지하세요
              <br />
              <span className="text-indigo-300 font-semibold">패키지 구매 시 최대 20만원 절약</span>
            </p>

            <div className="flex flex-wrap justify-center gap-6 mb-10">
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Percent className="w-5 h-5 text-green-400" />
                <span className="text-sm font-medium">최대 17% 할인</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Calendar className="w-5 h-5 text-blue-400" />
                <span className="text-sm font-medium">최대 12개월 유효</span>
              </div>
              <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="text-sm font-medium">품질 보장</span>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button size="lg" className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white border-0 shadow-xl hover:shadow-2xl transform hover:scale-105 transition-all duration-300">
                <ArrowRight className="w-5 h-5 mr-2" />
                패키지 선택하기
              </Button>
              <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 backdrop-blur-sm bg-transparent" asChild>
                <Link href="/services">
                  <Phone className="w-5 h-5 mr-2" />
                  상담 받기
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Package Cards Section */}
      <section className="py-20 bg-gradient-to-b from-white to-gray-50 dark:from-gray-800 dark:to-gray-900">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <Star className="w-4 h-4 mr-2" />
              맞춤형 패키지 선택
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">스트링 교체 패키지</h2>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto leading-relaxed">
              플레이 빈도와 필요에 맞는 패키지를 선택하세요.
              <br />
              모든 패키지는 전문가 상담과 품질 보장이 포함됩니다.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {packages.map((pkg) => (
              <Card
                key={pkg.id}
                className={`group relative overflow-hidden border-0 shadow-xl hover:shadow-2xl transition-all duration-500 transform hover:-translate-y-2 cursor-pointer ${pkg.popular ? 'scale-105 ring-4 ring-indigo-200 dark:ring-indigo-800' : ''} ${
                  selectedPackage === pkg.id ? 'ring-4 ring-blue-400' : ''
                }`}
                onClick={() => setSelectedPackage(pkg.id)}
              >
                {pkg.popular && <div className="absolute top-0 right-0 bg-gradient-to-r from-indigo-500 to-purple-600 text-white px-4 py-2 text-sm font-bold rounded-bl-lg">인기</div>}

                {pkg.discount && <div className="absolute top-0 left-0 bg-gradient-to-r from-red-500 to-pink-600 text-white px-3 py-1 text-xs font-bold rounded-br-lg">{pkg.discount}% 할인</div>}

                <div
                  className={`h-2 bg-gradient-to-r ${
                    pkg.color === 'blue' ? 'from-blue-500 to-cyan-500' : pkg.color === 'indigo' ? 'from-indigo-500 to-purple-500' : pkg.color === 'purple' ? 'from-purple-500 to-pink-500' : 'from-emerald-500 to-teal-500'
                  }`}
                ></div>

                <CardHeader className="text-center pb-4">
                  <div
                    className={`mx-auto mb-4 w-20 h-20 rounded-full bg-gradient-to-br ${
                      pkg.color === 'blue' ? 'from-blue-500 to-cyan-500' : pkg.color === 'indigo' ? 'from-indigo-500 to-purple-500' : pkg.color === 'purple' ? 'from-purple-500 to-pink-500' : 'from-emerald-500 to-teal-500'
                    } flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}
                  >
                    {pkg.icon}
                  </div>
                  <CardTitle className="text-2xl font-bold mb-2">{pkg.title}</CardTitle>
                  <CardDescription className="text-base mb-4">{pkg.description}</CardDescription>

                  <div className="space-y-2">
                    <div className="text-4xl font-bold text-blue-600">{pkg.price.toLocaleString()}원</div>
                    {pkg.originalPrice && <div className="text-lg text-gray-400 line-through">{pkg.originalPrice.toLocaleString()}원</div>}
                    <div className="text-sm text-gray-600 dark:text-gray-400">회당 {(pkg.price / pkg.sessions).toLocaleString()}원</div>
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <div className="text-center">
                    <div className="text-3xl font-bold text-indigo-600 mb-1">{pkg.sessions}회</div>
                    <div className="text-sm text-gray-500">유효기간: {pkg.validityPeriod}</div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-semibold mb-3 flex items-center">
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      포함 서비스
                    </h4>
                    <ul className="space-y-2">
                      {pkg.features.map((feature, idx) => (
                        <li key={idx} className="flex items-start text-sm">
                          <div
                            className={`w-2 h-2 rounded-full mt-2 mr-3 flex-shrink-0 bg-gradient-to-r ${
                              pkg.color === 'blue' ? 'from-blue-500 to-cyan-500' : pkg.color === 'indigo' ? 'from-indigo-500 to-purple-500' : pkg.color === 'purple' ? 'from-purple-500 to-pink-500' : 'from-emerald-500 to-teal-500'
                            }`}
                          ></div>
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className={`bg-gradient-to-r ${
                      pkg.color === 'blue'
                        ? 'from-blue-50 to-cyan-50 dark:from-blue-900/20 dark:to-cyan-900/20'
                        : pkg.color === 'indigo'
                        ? 'from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20'
                        : pkg.color === 'purple'
                        ? 'from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20'
                        : 'from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20'
                    } rounded-xl p-4`}
                  >
                    <h4 className="font-semibold mb-3 flex items-center">
                      <Gift className="w-4 h-4 mr-2 text-orange-500" />
                      혜택
                    </h4>
                    <div className="space-y-1">
                      {pkg.benefits.map((benefit, idx) => (
                        <div key={idx} className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          • {benefit}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button
                    className={`w-full bg-gradient-to-r ${
                      pkg.color === 'blue'
                        ? 'from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700'
                        : pkg.color === 'indigo'
                        ? 'from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700'
                        : pkg.color === 'purple'
                        ? 'from-purple-500 to-pink-600 hover:from-purple-600 hover:to-pink-700'
                        : 'from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700'
                    } text-white border-0 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300`}
                    asChild
                  >
                    <Link href={`/services/packages/checkout?package=${pkg.id}`}>
                      <Package className="w-4 h-4 mr-2" />
                      패키지 선택
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Additional Benefits Section */}
      <section className="py-20 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-500 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,rgba(255,255,255,0.1)_10px,rgba(255,255,255,0.1)_20px)]"></div>
        </div>

        <div className="container relative z-10">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-white/20 text-white border-white/30">
              <Award className="w-4 h-4 mr-2" />
              추가 혜택
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 text-white">패키지만의 특별한 혜택</h2>
            <p className="text-xl text-blue-100 max-w-3xl mx-auto leading-relaxed">단순한 할인을 넘어서는 프리미엄 서비스를 경험하세요.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {additionalBenefits.map((benefit, index) => (
              <div key={index} className="group bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 hover:border-white/40 transition-all duration-300 hover:shadow-2xl hover:-translate-y-2">
                <div
                  className={`w-16 h-16 bg-gradient-to-br ${
                    benefit.color === 'blue' ? 'from-blue-400 to-cyan-400' : benefit.color === 'indigo' ? 'from-indigo-400 to-purple-400' : benefit.color === 'purple' ? 'from-purple-400 to-pink-400' : 'from-emerald-400 to-teal-400'
                  } rounded-full flex items-center justify-center text-white mx-auto mb-6 group-hover:scale-110 transition-transform duration-300`}
                >
                  {benefit.icon}
                </div>
                <h3 className="text-xl font-bold text-white mb-4 text-center">{benefit.title}</h3>
                <p className="text-blue-100 text-center leading-relaxed">{benefit.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-20 bg-gradient-to-b from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
        <div className="container">
          <div className="text-center mb-16">
            <Badge className="mb-4 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              <Zap className="w-4 h-4 mr-2" />
              자주 묻는 질문
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">패키지 이용 안내</h2>
          </div>

          <div className="max-w-4xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {[
                {
                  question: '패키지 유효기간이 지나면 어떻게 되나요?',
                  answer: '유효기간 만료 전 미사용 횟수는 30일 연장 가능하며, 추가 비용 없이 1회 연장해드립니다.',
                },
                {
                  question: '다른 사람과 패키지를 공유할 수 있나요?',
                  answer: '패키지는 구매자 본인만 사용 가능하며, 가족 구성원에 한해 사용 가능합니다.',
                },
                {
                  question: '패키지 환불이 가능한가요?',
                  answer: '미사용 횟수에 대해서는 구매일로부터 7일 이내 100% 환불 가능합니다.',
                },
                {
                  question: '예약은 어떻게 하나요?',
                  answer: '패키지 구매 후 전화 또는 온라인으로 예약 가능하며, 패키지 회원은 우선 예약 혜택이 있습니다.',
                },
              ].map((faq, index) => (
                <Card key={index} className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-300">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-3 text-blue-600">Q. {faq.question}</h3>
                    <p className="text-gray-600 dark:text-gray-300 leading-relaxed">A. {faq.answer}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="text-center mt-12">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-lg hover:shadow-xl transform hover:scale-105 transition-all duration-300" asChild>
              <Link href="/contact">
                <Phone className="w-5 h-5 mr-2" />더 궁금한 점이 있으신가요?
              </Link>
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
}
