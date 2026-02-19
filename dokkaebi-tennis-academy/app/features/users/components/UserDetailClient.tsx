// app/features/users/components/UserDetailClient.tsx
'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, MapPin, User, Calendar, Shield } from 'lucide-react';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

type Props = { id: string; baseUrl: string };

export default function UserDetailClient({ id, baseUrl }: Props) {
  const router = useRouter();
  const { data, error, isLoading, mutate } = useSWR(`${baseUrl}/api/admin/users/${id}`, fetcher);

  if (isLoading) return <div className="p-6">불러오는 중...</div>;
  if (error || !data) return <div className="p-6 text-destructive">불러오기 실패</div>;

  const u = data as {
    id: string;
    name: string;
    email: string;
    phone: string;
    role: 'user' | 'admin';
    isDeleted: boolean;
    address?: string;
    addressDetail?: string;
    postalCode?: string;
    createdAt?: string;
    updatedAt?: string;
    lastLoginAt?: string;
  };

  return (
    <div className="p-6 space-y-6">
      {/* 상단 액션바 */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center shadow">
            <User className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">{u.name || '(이름없음)'}</h1>
            <p className="text-sm text-muted-foreground">{u.email}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* 2차 작업 예정: 역할 변경, 비활성/복구 등 */}
          <Button variant="outline" onClick={() => router.push('/admin/users')}>
            목록으로
          </Button>
        </div>
      </div>

      {/* 프로필 카드 */}
      <Card className="border-0 bg-card">
        <CardHeader>
          <CardTitle>프로필</CardTitle>
          <CardDescription>기본 정보와 권한</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">권한:</span>
            <Badge variant="outline" className="shrink-0">
              {u.role === 'admin' ? '관리자' : '일반'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">가입일:</span>
            <span className="text-sm text-foreground">{u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">마지막 로그인:</span>
            <span className="text-sm text-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm">상태:</span>
            {u.isDeleted ? (
              <Badge variant="destructive" className="border-transparent">
                삭제됨
              </Badge>
            ) : (
              <Badge variant="success" className="border-transparent">
                활성
              </Badge>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 연락/주소 카드 */}
      <Card className="border-0 bg-card">
        <CardHeader>
          <CardTitle>연락 & 주소</CardTitle>
          <CardDescription>배송지 및 연락처</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{u.email || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">{u.phone || '-'}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm">
              {u.postalCode ? `[${u.postalCode}] ` : ''}
              {(u.address || '') + (u.addressDetail ? ` ${u.addressDetail}` : '') || '-'}
            </span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
