'use client';

import useSWR from 'swr';
import Link from 'next/link';
import { useState, useMemo } from 'react';
import { Package, Search, Filter, MoreVertical, Edit, Eye, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const fetcher = (url: string) => fetch(url, { credentials: 'include' }).then((r) => r.json());

function StockChip({ id, total }: { id: string; total: number }) {
  const { data } = useSWR<{ ok: boolean; available: number }>(`/api/rentals/active-count/${id}`, (u) => fetch(u, { credentials: 'include' }).then((r) => r.json()), { dedupingInterval: 5000 });
  const qty = Math.max(1, total ?? 1);
  const avail = Math.max(0, Number(data?.available ?? 0));
  const soldOut = avail <= 0;
  return (
    <Badge variant={soldOut ? 'destructive' : 'default'} className="font-normal">
      {qty > 1 ? (soldOut ? `0/${qty}` : `${avail}/${qty}`) : soldOut ? '대여 중' : '대여 가능'}
    </Badge>
  );
}

type Item = {
  id: string;
  brand: string;
  model: string;
  price: number;
  condition: 'A' | 'B' | 'C';
  status: 'available' | 'rented' | 'sold' | 'inactive';
  rental?: { enabled: boolean; deposit: number; fee: { d7: number; d15: number; d30: number } };
  images?: string[];
  quantity?: number;
};

function StatusBadge({ status }: { status: string }) {
  const variants: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    available: { label: '판매가능', variant: 'default' },
    rented: { label: '대여중', variant: 'secondary' },
    sold: { label: '판매완료', variant: 'destructive' },
    inactive: { label: '비노출', variant: 'outline' },
  };
  const config = variants[status] || { label: status, variant: 'outline' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

function ConditionBadge({ condition }: { condition: string }) {
  const labels: Record<string, string> = {
    A: 'A급 (최상)',
    B: 'B급 (양호)',
    C: 'C급 (보통)',
  };
  return <Badge variant="outline">{labels[condition] || condition}</Badge>;
}

export default function AdminRacketsClient() {
  const { data, isLoading, error } = useSWR<{ items: Item[]; total: number; page: number; pageSize: number }>('/api/admin/rackets?page=1&pageSize=50', fetcher);

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [conditionFilter, setConditionFilter] = useState<string>('all');

  const filteredItems = useMemo(() => {
    if (!data?.items) return [];

    return data.items.filter((item) => {
      const matchesSearch = item.brand.toLowerCase().includes(searchQuery.toLowerCase()) || item.model.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
      const matchesCondition = conditionFilter === 'all' || item.condition === conditionFilter;

      return matchesSearch && matchesStatus && matchesCondition;
    });
  }, [data?.items, searchQuery, statusFilter, conditionFilter]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-teal-600 to-cyan-600 dark:from-emerald-900 dark:via-teal-900 dark:to-cyan-900">
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Package className="h-8 w-8 text-white" />
                <h1 className="text-3xl font-bold text-white">라켓 관리</h1>
              </div>
              <p className="text-emerald-100">중고 라켓 재고 및 대여 관리</p>
            </div>
            <Link href="/admin/rackets/new">
              <Button size="lg" className="bg-white text-emerald-600 hover:bg-emerald-50 shadow-lg">
                <Plus className="h-5 w-5 mr-2" />새 라켓 등록
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Filter className="h-5 w-5 text-slate-600 dark:text-slate-400" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">필터 및 검색</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input placeholder="브랜드, 모델 검색..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="pl-10" />
              </div>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="상태 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 상태</SelectItem>
                <SelectItem value="available">판매가능</SelectItem>
                <SelectItem value="rented">대여중</SelectItem>
                <SelectItem value="sold">판매완료</SelectItem>
                <SelectItem value="inactive">비노출</SelectItem>
              </SelectContent>
            </Select>

            <Select value={conditionFilter} onValueChange={setConditionFilter}>
              <SelectTrigger>
                <SelectValue placeholder="등급 필터" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">전체 등급</SelectItem>
                <SelectItem value="A">A급 (최상)</SelectItem>
                <SelectItem value="B">B급 (양호)</SelectItem>
                <SelectItem value="C">C급 (보통)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>총 {filteredItems.length}개의 라켓</span>
            {(searchQuery || statusFilter !== 'all' || conditionFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setConditionFilter('all');
                }}
              >
                필터 초기화
              </Button>
            )}
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-8">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="h-16 bg-slate-100 dark:bg-slate-700 rounded animate-pulse" />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-red-200 dark:border-red-900 p-8 text-center">
            <p className="text-red-600 dark:text-red-400">목록을 불러오지 못했습니다.</p>
          </div>
        ) : !filteredItems.length ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-12 text-center">
            <Package className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <p className="text-slate-600 dark:text-slate-400">{searchQuery || statusFilter !== 'all' || conditionFilter !== 'all' ? '검색 결과가 없습니다.' : '등록된 라켓이 없습니다.'}</p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">라켓 정보</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">가격</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">등급</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">상태</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">대여</th>
                    <th className="px-6 py-4 text-center text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">재고</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold text-slate-600 dark:text-slate-400 uppercase tracking-wider">작업</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
                  {filteredItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {item.images?.[0] && <img src={item.images[0] || '/placeholder.svg'} alt={item.model} className="h-12 w-12 rounded-lg object-cover" />}
                          <div>
                            <div className="font-semibold text-slate-900 dark:text-white">{item.brand}</div>
                            <div className="text-sm text-slate-600 dark:text-slate-400">{item.model}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <span className="font-semibold text-slate-900 dark:text-white">{item.price?.toLocaleString()}원</span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <ConditionBadge condition={item.condition} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Badge variant={item.rental?.enabled ? 'default' : 'outline'}>{item.rental?.enabled ? '가능' : '불가'}</Badge>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <StockChip id={item.id} total={item.quantity ?? 1} />
                      </td>
                      <td className="px-6 py-4 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem asChild>
                              <Link href={`/rackets/${item.id}`} className="flex items-center">
                                <Eye className="h-4 w-4 mr-2" />
                                상세 보기
                              </Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem asChild>
                              <Link href={`/admin/rackets/${item.id}/edit`} className="flex items-center">
                                <Edit className="h-4 w-4 mr-2" />
                                수정
                              </Link>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
