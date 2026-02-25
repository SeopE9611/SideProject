'use client';
import { Save } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import type { PaymentSettings, TabErrorState } from '@/types/admin/settings';

export function PaymentSettingsTab({ form, isBootstrapping, onSubmit, error, paymentMeta }: { form: UseFormReturn<PaymentSettings>; isBootstrapping: boolean; onSubmit: (data: PaymentSettings) => void; error: TabErrorState; paymentMeta: { hasPaypalSecret: boolean; hasStripeSecretKey: boolean } }) {
  return <TabsContent value="payment"><Card><CardHeader><CardTitle>결제 설정</CardTitle><CardDescription>결제 수단 및 키를 관리합니다.</CardDescription></CardHeader>{error.message && <div className="mx-6 rounded border px-3 py-2 text-sm">{error.message}</div>}<form onSubmit={form.handleSubmit(onSubmit)}><CardContent className="space-y-4"><div><Label>통화</Label><Select value={form.watch('currency')} onValueChange={(v) => form.setValue('currency', v as PaymentSettings['currency'], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="KRW">KRW</SelectItem><SelectItem value="USD">USD</SelectItem><SelectItem value="EUR">EUR</SelectItem><SelectItem value="JPY">JPY</SelectItem></SelectContent></Select></div><div><Label htmlFor="taxRate">세율</Label><Input id="taxRate" type="number" {...form.register('taxRate', { valueAsNumber: true })} /></div><div className="flex items-center justify-between"><Label>페이팔</Label><Switch checked={form.watch('enablePaypal')} onCheckedChange={(v) => form.setValue('enablePaypal', v, { shouldDirty: true })} /></div><div><Label htmlFor="paypalSecret">PayPal Secret</Label><Input id="paypalSecret" placeholder={paymentMeta.hasPaypalSecret ? '기존 시크릿 유지 중' : ''} {...form.register('paypalSecret')} /></div></CardContent><CardFooter><Button disabled={isBootstrapping || form.formState.isSubmitting} type="submit" className="ml-auto"><Save className="mr-2 h-4 w-4" />설정 저장</Button></CardFooter></form></Card></TabsContent>;
}
