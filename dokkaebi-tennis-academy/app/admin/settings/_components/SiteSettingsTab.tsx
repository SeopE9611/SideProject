'use client';
import { Save } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { SiteSettings, TabErrorState } from '@/types/admin/settings';

export function SiteSettingsTab({ form, isBootstrapping, onSubmit, error }: { form: UseFormReturn<SiteSettings>; isBootstrapping: boolean; onSubmit: (data: SiteSettings) => void; error: TabErrorState }) {
  return <TabsContent value="site"><Card><CardHeader><CardTitle>사이트 설정</CardTitle><CardDescription>사이트 기본 정보를 관리합니다.</CardDescription></CardHeader>{error.message && <div className="mx-6 rounded border px-3 py-2 text-sm">{error.message}</div>}<form onSubmit={form.handleSubmit(onSubmit)}><CardContent className="space-y-3"><div><Label htmlFor="siteName">사이트명</Label><Input id="siteName" {...form.register('siteName')} /></div><div><Label htmlFor="siteDescription">설명</Label><Textarea id="siteDescription" rows={3} {...form.register('siteDescription')} /></div><div><Label htmlFor="contactEmail">문의 이메일</Label><Input id="contactEmail" type="email" {...form.register('contactEmail')} /></div><div><Label htmlFor="contactPhone">문의 전화</Label><Input id="contactPhone" {...form.register('contactPhone')} /></div><div><Label htmlFor="address">주소</Label><Input id="address" {...form.register('address')} /></div></CardContent><CardFooter><Button disabled={isBootstrapping || form.formState.isSubmitting} type="submit" className="ml-auto"><Save className="mr-2 h-4 w-4" />설정 저장</Button></CardFooter></form></Card></TabsContent>;
}
