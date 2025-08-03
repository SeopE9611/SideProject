'use client';

import type React from 'react';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import Link from 'next/link';
import { ArrowLeft, Search, Mail, User, Phone, Package, Shield, Clock } from 'lucide-react';

export default function OrderLookupPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
  });
  const [errors, setErrors] = useState({
    name: '',
    email: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));

    // Clear error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {
      name: '',
      email: '',
    };
    let isValid = true;

    if (!formData.name.trim()) {
      newErrors.name = '이름을 입력해주세요';
      isValid = false;
    }

    if (!formData.email.trim()) {
      newErrors.email = '이메일을 입력해주세요';
      isValid = false;
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = '유효한 이메일 주소를 입력해주세요';
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsSubmitting(true);

    try {
      // console.log('주문 조회 요청:', formData);

      // 성공 시 주문 결과 페이지로 이동 (예시)
      // router.push(`/order-results?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}`)

      // 임시로 3초 후 완료되는 것으로 시뮬레이션
      const res = await fetch('/api/guest-orders/lookup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include',
      });

      const data = await res.json();

      if (data.success && data.orders.length > 0) {
        alert(`총 ${data.orders.length}개의 주문을 찾았습니다.`);
        router.push(`/order-lookup/results?name=${encodeURIComponent(formData.name)}&email=${encodeURIComponent(formData.email)}&phone=${encodeURIComponent(formData.phone)}`);
      } else {
        alert('조회된 주문이 없습니다.');
      }
    } catch (error) {
      console.error('주문 조회 중 오류 발생:', error);
      alert('주문 조회 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600">
        <div className="absolute inset-0 bg-black/10"></div>
        <div className="relative container mx-auto px-4 py-16">
          <div className="text-center text-white">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-white/20 backdrop-blur-sm rounded-full mb-6">
              <Search className="w-8 h-8" />
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-4">비회원 주문 조회</h1>
            <p className="text-xl text-emerald-100 max-w-2xl mx-auto">주문 시 입력하신 정보로 간편하게 주문 내역을 확인하세요</p>
          </div>
        </div>
      </div>

      <div className="container mx-auto py-12 px-4 md:px-6">
        <div className="max-w-2xl mx-auto">
          {/* Back Button */}
          <div className="mb-8">
            <Link href="/login" className="inline-flex items-center text-sm text-muted-foreground hover:text-emerald-600 transition-colors group">
              <ArrowLeft className="mr-2 h-4 w-4 group-hover:-translate-x-1 transition-transform" />
              이전 페이지로 돌아가기
            </Link>
          </div>

          {/* Main Card */}
          <Card className="shadow-2xl border-0 bg-white/80 backdrop-blur-sm">
            <CardHeader className="text-center pb-8">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full mb-4 mx-auto">
                <Package className="w-6 h-6 text-white" />
              </div>
              <CardTitle className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">주문 정보 입력</CardTitle>
              <CardDescription className="text-base text-muted-foreground">주문 시 입력하신 정보를 통해 주문 내역을 확인하실 수 있습니다</CardDescription>
            </CardHeader>

            <Separator className="mx-6" />

            <form onSubmit={handleSubmit}>
              <CardContent className="space-y-6 pt-8">
                {/* Name Field */}
                <div className="space-y-2">
                  <Label htmlFor="name" className="text-sm font-medium flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    이름 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="name"
                      name="name"
                      placeholder="홍길동"
                      value={formData.name}
                      onChange={handleChange}
                      required
                      className={`pl-10 h-12 border-2 transition-all duration-200 ${errors.name ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500 hover:border-emerald-300'}`}
                    />
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.name && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.name}
                    </p>
                  )}
                </div>

                {/* Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-medium flex items-center gap-2">
                    <Mail className="w-4 h-4 text-emerald-600" />
                    이메일 <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="example@dokkaebi.com"
                      value={formData.email}
                      onChange={handleChange}
                      required
                      className={`pl-10 h-12 border-2 transition-all duration-200 ${errors.email ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-emerald-500 hover:border-emerald-300'}`}
                    />
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  {errors.email && (
                    <p className="text-sm text-red-500 flex items-center gap-1">
                      <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                      {errors.email}
                    </p>
                  )}
                </div>

                {/* Phone Field */}
                <div className="space-y-2">
                  <Label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                    <Phone className="w-4 h-4 text-emerald-600" />
                    전화번호 (선택)
                  </Label>
                  <div className="relative">
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="01012345678 (- 제외)"
                      value={formData.phone}
                      onChange={handleChange}
                      className="pl-10 h-12 border-2 border-gray-200 focus:border-emerald-500 hover:border-emerald-300 transition-all duration-200"
                    />
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    주문 시 입력하신 전화번호를 입력해주세요.
                  </p>
                </div>

                {/* Info Box */}
                <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      <Clock className="w-5 h-5 text-emerald-600 mt-0.5" />
                    </div>
                    <div className="text-sm">
                      <p className="font-medium text-emerald-800 mb-1">조회 가능한 주문</p>
                      <p className="text-emerald-700">최근 6개월 이내의 주문 내역을 조회하실 수 있습니다.</p>
                    </div>
                  </div>
                </div>
              </CardContent>

              <CardFooter className="flex flex-col gap-4 pt-2 pb-8">
                <Button
                  type="submit"
                  size="lg"
                  className="w-full h-12 font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-lg hover:shadow-xl transition-all duration-200 transform hover:-translate-y-0.5"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                      조회 중...
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Search className="w-4 h-4" />
                      주문 조회하기
                    </div>
                  )}
                </Button>

                <p className="text-xs text-center text-muted-foreground">
                  회원이신가요?{' '}
                  <Link href="/login" className="text-emerald-600 hover:text-emerald-700 font-medium">
                    로그인하기
                  </Link>
                </p>
              </CardFooter>
            </form>
          </Card>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
            <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-emerald-100 rounded-full mb-4">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">안전한 조회</h3>
              <p className="text-sm text-gray-600">개인정보 보호를 위한 안전한 주문 조회 시스템</p>
            </div>

            <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-teal-100 rounded-full mb-4">
                <Clock className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">실시간 조회</h3>
              <p className="text-sm text-gray-600">최신 주문 상태를 실시간으로 확인 가능</p>
            </div>

            <div className="text-center p-6 bg-white/60 backdrop-blur-sm rounded-xl border border-gray-100">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-cyan-100 rounded-full mb-4">
                <Package className="w-6 h-6 text-cyan-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">상세 정보</h3>
              <p className="text-sm text-gray-600">배송 추적부터 결제 정보까지 한눈에</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
