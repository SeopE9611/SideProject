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
import type { UserSettings, TabErrorState } from '@/types/admin/settings';

export function UserSettingsTab({ form, isBootstrapping, onSubmit, error }: { form: UseFormReturn<UserSettings>; isBootstrapping: boolean; onSubmit: (data: UserSettings) => void; error: TabErrorState }) {
  return <TabsContent value="user"><Card><CardHeader><CardTitle>사용자 설정</CardTitle><CardDescription>회원 가입/인증 정책을 관리합니다.</CardDescription></CardHeader>{error.message && <div className="mx-6 rounded border px-3 py-2 text-sm">{error.message}</div>}<form onSubmit={form.handleSubmit(onSubmit)}><CardContent className="space-y-4"><div className="flex items-center justify-between"><Label>회원가입 허용</Label><Switch checked={form.watch('allowRegistration')} onCheckedChange={(v) => form.setValue('allowRegistration', v, { shouldDirty: true })} /></div><div className="flex items-center justify-between"><Label>이메일 인증 필수</Label><Switch checked={form.watch('requireEmailVerification')} onCheckedChange={(v) => form.setValue('requireEmailVerification', v, { shouldDirty: true })} /></div><div><Label>기본 역할</Label><Select value={form.watch('defaultUserRole')} onValueChange={(v) => form.setValue('defaultUserRole', v as UserSettings['defaultUserRole'], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="member">member</SelectItem><SelectItem value="coach">coach</SelectItem><SelectItem value="manager">manager</SelectItem></SelectContent></Select></div><div><Label htmlFor="minimumPasswordLength">최소 비밀번호 길이</Label><Input id="minimumPasswordLength" type="number" {...form.register('minimumPasswordLength', { valueAsNumber: true })} /></div></CardContent><CardFooter><Button disabled={isBootstrapping || form.formState.isSubmitting} type="submit" className="ml-auto"><Save className="mr-2 h-4 w-4" />설정 저장</Button></CardFooter></form></Card></TabsContent>;
}
