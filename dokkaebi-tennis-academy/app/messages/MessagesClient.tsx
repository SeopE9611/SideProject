'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

type SafeUser = {
  id: string;
  name: string | null;
  email: string | null;
  role: 'user' | 'admin' | string;
};

export default function MessagesClient({ user }: { user: SafeUser }) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">쪽지함</CardTitle>
        </CardHeader>

        <CardContent>
          <Tabs defaultValue="inbox" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inbox">받은쪽지</TabsTrigger>
              <TabsTrigger value="sent">보낸쪽지</TabsTrigger>
              <TabsTrigger value="admin">관리자쪽지</TabsTrigger>
            </TabsList>

            <TabsContent value="inbox" className="mt-4">
              <div className="text-sm text-muted-foreground">받은쪽지함(준비중). 목록/상세/읽음 처리를 연결합니다.</div>
            </TabsContent>

            <TabsContent value="sent" className="mt-4">
              <div className="text-sm text-muted-foreground">보낸쪽지함(준비중). 목록/상세/삭제(소프트 삭제)를 연결합니다.</div>
            </TabsContent>

            <TabsContent value="admin" className="mt-4">
              <div className="text-sm text-muted-foreground">관리자쪽지함(준비중). {user.role === 'admin' ? '관리자 전체발송 UI도 이 탭에 붙일 수 있어요.' : '관리자 발송 공지 쪽지만 이 탭에 노출됩니다.'}</div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
