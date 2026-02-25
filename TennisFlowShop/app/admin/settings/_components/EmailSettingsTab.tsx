'use client';
import { Save, Send } from 'lucide-react';
import type { UseFormReturn } from 'react-hook-form';
import { TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { EmailSettings, TabErrorState } from '@/types/admin/settings';

export function EmailSettingsTab({ form, isBootstrapping, onSubmit, error, hasSmtpPassword, onSendTest }: { form: UseFormReturn<EmailSettings>; isBootstrapping: boolean; onSubmit: (data: EmailSettings) => void; error: TabErrorState; hasSmtpPassword: boolean; onSendTest: () => void }) {
  return <TabsContent value="email"><Card><CardHeader><CardTitle>이메일 설정</CardTitle><CardDescription>SMTP 설정을 관리합니다.</CardDescription></CardHeader>{error.message && <div className="mx-6 rounded border px-3 py-2 text-sm">{error.message}</div>}<form onSubmit={form.handleSubmit(onSubmit)}><CardContent className="space-y-3"><div><Label htmlFor="smtpHost">SMTP Host</Label><Input id="smtpHost" {...form.register('smtpHost')} /></div><div><Label htmlFor="smtpPort">SMTP Port</Label><Input id="smtpPort" type="number" {...form.register('smtpPort', { valueAsNumber: true })} /></div><div><Label htmlFor="smtpPassword">SMTP Password</Label><Input id="smtpPassword" type="password" placeholder={hasSmtpPassword ? '기존 비밀번호 유지 중' : ''} {...form.register('smtpPassword')} /></div><div><Label>암호화</Label><Select value={form.watch('smtpEncryption')} onValueChange={(v) => form.setValue('smtpEncryption', v as EmailSettings['smtpEncryption'], { shouldDirty: true })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="none">none</SelectItem><SelectItem value="ssl">ssl</SelectItem><SelectItem value="tls">tls</SelectItem></SelectContent></Select></div></CardContent><CardFooter className="justify-between"><Button type="button" variant="outline" onClick={onSendTest}><Send className="mr-2 h-4 w-4" />테스트 이메일</Button><Button disabled={isBootstrapping || form.formState.isSubmitting} type="submit"><Save className="mr-2 h-4 w-4" />설정 저장</Button></CardFooter></form></Card></TabsContent>;
}
