'use client';

import type React from 'react';
import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Loader2, Truck, Package, MapPin } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

interface ShippingFormProps {
  applicationId: string;
  initialShippingMethod?: string;
  initialEstimatedDelivery?: string;
  initialCourier?: string;
  initialTrackingNumber?: string;
  onSuccess?: () => void;
}

export default function ShippingForm({ applicationId, initialShippingMethod, initialEstimatedDelivery, initialCourier, initialTrackingNumber, onSuccess }: ShippingFormProps) {
  const [shippingMethod, setShippingMethod] = useState<string>(initialShippingMethod || '');

  useEffect(() => {
    setShippingMethod(initialShippingMethod || '');
  }, [initialShippingMethod]);

  const [estimatedDelivery, setEstimatedDelivery] = useState<string>(initialEstimatedDelivery ? new Date(initialEstimatedDelivery).toISOString().split('T')[0] : '');
  const [courier, setCourier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  useEffect(() => {
    setCourier(initialCourier || '');
  }, [initialCourier]);

  useEffect(() => {
    setTrackingNumber(initialTrackingNumber || '');
  }, [initialTrackingNumber]);

  useEffect(() => {
    if (shippingMethod !== 'delivery') {
      setCourier('');
      setTrackingNumber('');
    }
  }, [shippingMethod]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!shippingMethod) {
      showErrorToast('배송 방법을 선택해주세요');
      return;
    }

    if (!estimatedDelivery) {
      showErrorToast('예상 수령일을 입력해주세요');
      return;
    }

    if (shippingMethod === 'delivery') {
      if (!courier) {
        showErrorToast('택배사를 선택해주세요');
        return;
      }
      if (!trackingNumber) {
        showErrorToast('운송장 번호를 입력해주세요');
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/applications/stringing/${applicationId}/shipping`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          shippingInfo: {
            shippingMethod: shippingMethod,
            estimatedDate: estimatedDelivery,
            invoice: {
              courier: shippingMethod === 'delivery' ? courier : '',
              trackingNumber: shippingMethod === 'delivery' ? trackingNumber : '',
            },
          },
        }),
      });

      showSuccessToast('배송 정보가 업데이트되었습니다');

      router.refresh();

      if (onSuccess) {
        onSuccess();
      }
      router.push(`/admin/applications/stringing/${applicationId}`);
    } catch (error) {
      showErrorToast('배송 정보 업데이트 중 문제가 발생했습니다. 다시 시도해주세요');
      console.error('배송 정보 업데이트 오류:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-teal-50 to-green-50 dark:from-blue-950/20 dark:via-teal-950/20 dark:to-green-950/20 py-8 px-4">
      <div className="container mx-auto max-w-2xl">
        {/* 헤더 */}
        <div className="text-center mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-full p-4 w-16 h-16 mx-auto mb-4 shadow-lg">
            <Truck className="h-8 w-8 text-blue-600 mx-auto" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">배송 정보 등록</h1>
          <p className="text-gray-600 dark:text-gray-400">고객에게 배송할 장착완료된 라켓 배송 정보를 업데이트합니다</p>
        </div>

        <Card className="border-0 shadow-2xl bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm">
          <CardHeader className="bg-gradient-to-r from-blue-500 to-blue-500 text-white rounded-t-lg">
            <CardTitle className="flex items-center space-x-2 text-xl">
              <Package className="h-6 w-6" />
              <span>배송 정보 입력</span>
            </CardTitle>
          </CardHeader>

          <form onSubmit={handleSubmit}>
            <CardContent className="space-y-6 p-8">
              <div className="space-y-3">
                <Label htmlFor="shipping-method" className="text-base font-semibold text-gray-700 dark:text-gray-300 flex items-center space-x-2">
                  <Truck className="h-4 w-4" />
                  <span>배송 방법</span>
                </Label>
                <Select value={shippingMethod} onValueChange={setShippingMethod}>
                  <SelectTrigger id="shipping-method" className="h-12 border-blue-200 dark:border-blue-700 focus:border-blue-500 focus:ring-blue-500">
                    <SelectValue placeholder="배송 방법을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="delivery" className="hover:bg-blue-50 dark:hover:bg-blue-950/20">
                      <div className="flex items-center space-x-2">
                        <Package className="h-4 w-4" />
                        <span>택배 배송</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="quick" className="hover:bg-blue-50 dark:hover:bg-blue-950/20">
                      <div className="flex items-center space-x-2">
                        <Truck className="h-4 w-4" />
                        <span>퀵 배송 (당일)</span>
                      </div>
                    </SelectItem>
                    <SelectItem value="visit" className="hover:bg-blue-50 dark:hover:bg-blue-950/20">
                      <div className="flex items-center space-x-2">
                        <MapPin className="h-4 w-4" />
                        <span>방문 수령</span>
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <Label htmlFor="estimated-delivery" className="text-base font-semibold text-gray-700 dark:text-gray-300">
                  예상 수령일
                </Label>
                <Input
                  id="estimated-delivery"
                  type="date"
                  value={estimatedDelivery}
                  onChange={(e) => setEstimatedDelivery(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="h-12 border-blue-200 dark:border-blue-700 focus:border-blue-500 focus:ring-blue-500"
                />
              </div>

              {shippingMethod === 'delivery' && (
                <div className="space-y-6 p-6 bg-gradient-to-r from-blue-50 to-teal-50 dark:from-blue-950/20 dark:to-teal-950/20 rounded-xl border border-blue-200 dark:border-blue-700">
                  <h3 className="text-lg font-semibold text-blue-800 dark:text-blue-200 mb-4">택배 정보</h3>

                  <div className="space-y-3">
                    <Label htmlFor="courier" className="text-base font-semibold text-gray-700 dark:text-gray-300">
                      택배사
                    </Label>
                    <Select value={courier} onValueChange={setCourier}>
                      <SelectTrigger id="courier" className="h-12 border-blue-200 dark:border-blue-700 focus:border-blue-500 focus:ring-blue-500">
                        <SelectValue placeholder="택배사를 선택하세요" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cj">CJ 대한통운</SelectItem>
                        <SelectItem value="hanjin">한진택배</SelectItem>
                        <SelectItem value="logen">로젠택배</SelectItem>
                        <SelectItem value="post">우체국택배</SelectItem>
                        <SelectItem value="etc">기타</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="tracking-number" className="text-base font-semibold text-gray-700 dark:text-gray-300">
                      운송장 번호
                    </Label>
                    <Input id="tracking-number" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="예: 1234567890" className="h-12 border-blue-200 dark:border-blue-700 focus:border-blue-500 focus:ring-blue-500" />
                  </div>
                </div>
              )}
            </CardContent>

            <CardFooter className="p-8 pt-0">
              <Button
                type="submit"
                className="w-full h-14 text-lg font-semibold bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white shadow-lg hover:shadow-xl transition-all duration-200"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    저장 중...
                  </>
                ) : (
                  <>
                    <Package className="mr-2 h-5 w-5" />
                    배송 정보 저장
                  </>
                )}
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
