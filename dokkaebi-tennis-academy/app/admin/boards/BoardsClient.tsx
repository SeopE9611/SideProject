'use client';

import { useMemo, useState } from 'react';
import useSWR from 'swr';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, RefreshCcw, ShieldAlert, CheckCircle2, XCircle, ExternalLink } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { showErrorToast, showSuccessToast } from '@/lib/toast';

type PostItem = {
  id: string;
  type: string;
  postNo: number | null;
  title: string;
  nickname: string;
  status: 'public' | 'hidden';
  createdAt: string;
  viewCount: number;
  likeCount: number;
  commentsCount: number;
};

type ReportItem = {
  id: string;
  targetType: 'post' | 'comment';
  boardType: string;
  reason: string;
  status: 'pending' | 'resolved' | 'rejected';
  reporterNickname: string;
  createdAt: string;
  resolvedAt: string | null;
  post: { id: string | null; title: string; postNo: number | null; status: string } | null;
  comment: { id: string | null; content: string; nickname: string; status: string } | null;
};

const fetcher = async (url: string) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(await res.text().catch(() => 'Request failed'));
  return res.json();
};

const boardLabel: Record<string, string> = {
  notice: '공지',
  qna: 'Q&A',
  free: '자유',
  gear: '장비',
  market: '중고',
  hot: '인기',
  brands: '브랜드',
};

function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString('ko-KR');
  } catch {
    return dt;
  }
}

export default function BoardsClient() {
  const router = useRouter();
  const sp = useSearchParams();

  const tab = sp.get('tab') === 'reports' ? 'reports' : 'posts';

  // 게시글 필터
  const [postType, setPostType] = useState<string>('all');
  const [postStatus, setPostStatus] = useState<string>('all');
  const [postQ, setPostQ] = useState<string>('');
  const [postPage, setPostPage] = useState<number>(1);

  // 신고 필터
  const [reportType, setReportType] = useState<string>('all');
  const [reportStatus, setReportStatus] = useState<string>('pending');
  const [reportQ, setReportQ] = useState<string>('');
  const [reportPage, setReportPage] = useState<number>(1);

  const postsUrl = useMemo(() => {
    const qs = new URLSearchParams({
      page: String(postPage),
      limit: '20',
      type: postType,
      status: postStatus,
      q: postQ,
      sort: 'createdAt',
      dir: 'desc',
    });
    return `/api/admin/community/posts?${qs.toString()}`;
  }, [postPage, postType, postStatus, postQ]);

  const reportsUrl = useMemo(() => {
    const qs = new URLSearchParams({
      page: String(reportPage),
      limit: '20',
      boardType: reportType,
      status: reportStatus,
      q: reportQ,
    });
    return `/api/admin/community/reports?${qs.toString()}`;
  }, [reportPage, reportType, reportStatus, reportQ]);

  const { data: postsData, error: postsErr, isLoading: postsLoading, mutate: mutatePosts } = useSWR(tab === 'posts' ? postsUrl : null, fetcher);

  const { data: reportsData, error: reportsErr, isLoading: reportsLoading, mutate: mutateReports } = useSWR(tab === 'reports' ? reportsUrl : null, fetcher);

  const posts: PostItem[] = postsData?.items ?? [];
  const postsTotal: number = postsData?.total ?? 0;

  const reports: ReportItem[] = reportsData?.items ?? [];
  const reportsTotal: number = reportsData?.total ?? 0;

  const switchTab = (next: 'posts' | 'reports') => {
    const qs = new URLSearchParams(sp.toString());
    if (next === 'reports') qs.set('tab', 'reports');
    else qs.delete('tab');
    router.replace(`/admin/boards?${qs.toString()}`);
  };

  const togglePostVisibility = async (p: PostItem) => {
    try {
      const next = p.status === 'public' ? 'hidden' : 'public';
      const res = await fetch(`/api/admin/community/posts/${p.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: next }),
      });
      if (!res.ok) throw new Error(await res.text());
      showSuccessToast(next === 'hidden' ? '게시글을 숨김 처리했습니다.' : '게시글을 공개 처리했습니다.');
      mutatePosts();
    } catch (e: any) {
      showErrorToast(e?.message ?? '상태 변경 실패');
    }
  };

  const processReport = async (r: ReportItem, action: 'resolve' | 'reject' | 'resolve_hide_target') => {
    try {
      const res = await fetch(`/api/admin/community/reports/${r.id}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!res.ok) throw new Error(await res.text());
      showSuccessToast('신고 처리가 완료되었습니다.');
      mutateReports();
      // 대상 숨김까지 했다면 게시글 목록도 최신화하는 게 안전
      mutatePosts();
    } catch (e: any) {
      showErrorToast(e?.message ?? '신고 처리 실패');
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>게시판 관리</CardTitle>

          <Tabs value={tab} onValueChange={(v) => switchTab(v as any)}>
            <TabsList>
              <TabsTrigger value="posts">게시글</TabsTrigger>
              <TabsTrigger value="reports">신고</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>

        <CardContent>
          {tab === 'posts' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={postType} onValueChange={(v) => (setPostPage(1), setPostType(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="게시판" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {Object.keys(boardLabel).map((k) => (
                      <SelectItem key={k} value={k}>
                        {boardLabel[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={postStatus} onValueChange={(v) => (setPostPage(1), setPostStatus(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    <SelectItem value="public">공개</SelectItem>
                    <SelectItem value="hidden">숨김</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Input value={postQ} onChange={(e) => setPostQ(e.target.value)} placeholder="제목/작성자/내용 검색" className="w-[260px]" />
                  <Button variant="outline" onClick={() => (setPostPage(1), mutatePosts())}>
                    <RefreshCcw className="h-4 w-4 mr-1" />
                    새로고침
                  </Button>
                </div>

                <div className="ml-auto text-sm text-muted-foreground">총 {postsTotal.toLocaleString()}건</div>
              </div>

              {postsLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}

              {postsErr && <div className="text-sm text-red-600">게시글 목록 로드 실패: {(postsErr as any)?.message ?? 'error'}</div>}

              {!postsLoading && !postsErr && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[70px]">게시판</TableHead>
                      <TableHead className="w-[90px]">번호</TableHead>
                      <TableHead>제목</TableHead>
                      <TableHead className="w-[140px]">작성자</TableHead>
                      <TableHead className="w-[90px]">상태</TableHead>
                      <TableHead className="w-[170px]">작성일</TableHead>
                      <TableHead className="w-[70px]">조회</TableHead>
                      <TableHead className="w-[70px]">추천</TableHead>
                      <TableHead className="w-[70px]">댓글</TableHead>
                      <TableHead className="w-[120px]">액션</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {posts.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell>{boardLabel[p.type] ?? p.type}</TableCell>
                        <TableCell>{p.postNo ?? '-'}</TableCell>
                        <TableCell className="max-w-[520px] truncate">
                          <Link href={`/board/${p.type}/${p.postNo ?? ''}`} className="hover:underline inline-flex items-center gap-1" target="_blank">
                            {p.title}
                            <ExternalLink className="h-3 w-3" />
                          </Link>
                        </TableCell>
                        <TableCell>{p.nickname || '-'}</TableCell>
                        <TableCell>{p.status === 'public' ? <Badge className="bg-blue-600 text-white">공개</Badge> : <Badge variant="secondary">숨김</Badge>}</TableCell>
                        <TableCell>{fmt(p.createdAt)}</TableCell>
                        <TableCell>{p.viewCount}</TableCell>
                        <TableCell>{p.likeCount}</TableCell>
                        <TableCell>{p.commentsCount}</TableCell>
                        <TableCell>
                          <Button variant="outline" size="sm" onClick={() => togglePostVisibility(p)}>
                            {p.status === 'public' ? (
                              <>
                                <EyeOff className="h-4 w-4 mr-1" /> 숨김
                              </>
                            ) : (
                              <>
                                <Eye className="h-4 w-4 mr-1" /> 공개
                              </>
                            )}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}

                    {posts.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-sm text-muted-foreground py-10">
                          표시할 게시글이 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          )}

          {tab === 'reports' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <Select value={reportType} onValueChange={(v) => (setReportPage(1), setReportType(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="게시판" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">전체</SelectItem>
                    {Object.keys(boardLabel).map((k) => (
                      <SelectItem key={k} value={k}>
                        {boardLabel[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={reportStatus} onValueChange={(v) => (setReportPage(1), setReportStatus(v))}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="상태" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">대기</SelectItem>
                    <SelectItem value="resolved">완료</SelectItem>
                    <SelectItem value="rejected">반려</SelectItem>
                    <SelectItem value="all">전체</SelectItem>
                  </SelectContent>
                </Select>

                <div className="flex items-center gap-2">
                  <Input value={reportQ} onChange={(e) => setReportQ(e.target.value)} placeholder="사유/신고자 검색" className="w-[260px]" />
                  <Button variant="outline" onClick={() => (setReportPage(1), mutateReports())}>
                    <RefreshCcw className="h-4 w-4 mr-1" />
                    새로고침
                  </Button>
                </div>

                <div className="ml-auto text-sm text-muted-foreground">총 {reportsTotal.toLocaleString()}건</div>
              </div>

              {reportsLoading && (
                <div className="space-y-2">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              )}

              {reportsErr && <div className="text-sm text-red-600">신고 목록 로드 실패: {(reportsErr as any)?.message ?? 'error'}</div>}

              {!reportsLoading && !reportsErr && (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[90px]">종류</TableHead>
                      <TableHead className="w-[90px]">게시판</TableHead>
                      <TableHead>사유</TableHead>
                      <TableHead className="w-[140px]">신고자</TableHead>
                      <TableHead>대상</TableHead>
                      <TableHead className="w-[90px]">상태</TableHead>
                      <TableHead className="w-[170px]">신고일</TableHead>
                      <TableHead className="w-[260px]">처리</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {reports.map((r) => {
                      const isPending = r.status === 'pending';
                      const postHref = r.post?.postNo != null ? `/board/${r.boardType}/${r.post.postNo}` : undefined;

                      return (
                        <TableRow key={r.id}>
                          <TableCell>{r.targetType === 'post' ? <Badge className="bg-indigo-600 text-white">게시글</Badge> : <Badge className="bg-amber-600 text-white">댓글</Badge>}</TableCell>
                          <TableCell>{boardLabel[r.boardType] ?? r.boardType}</TableCell>
                          <TableCell className="max-w-[360px] truncate">{r.reason}</TableCell>
                          <TableCell>{r.reporterNickname || '-'}</TableCell>
                          <TableCell className="max-w-[420px] truncate">
                            {postHref ? (
                              <Link href={postHref} target="_blank" className="hover:underline inline-flex items-center gap-1">
                                {r.post?.title ?? '(제목 없음)'}
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            ) : (
                              <span className="text-muted-foreground">(대상 글 정보 없음)</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {r.status === 'pending' && <Badge variant="secondary">대기</Badge>}
                            {r.status === 'resolved' && <Badge className="bg-emerald-600 text-white">완료</Badge>}
                            {r.status === 'rejected' && <Badge className="bg-gray-600 text-white">반려</Badge>}
                          </TableCell>
                          <TableCell>{fmt(r.createdAt)}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-2">
                              <Button size="sm" variant="outline" disabled={!isPending} onClick={() => processReport(r, 'resolve')}>
                                <CheckCircle2 className="h-4 w-4 mr-1" />
                                완료
                              </Button>

                              <Button size="sm" variant="outline" disabled={!isPending} onClick={() => processReport(r, 'reject')}>
                                <XCircle className="h-4 w-4 mr-1" />
                                반려
                              </Button>

                              <Button size="sm" disabled={!isPending} onClick={() => processReport(r, 'resolve_hide_target')}>
                                <ShieldAlert className="h-4 w-4 mr-1" />
                                대상 숨김+완료
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}

                    {reports.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-sm text-muted-foreground py-10">
                          표시할 신고가 없습니다.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
