'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription } from '@/components/ui/card';
import { Avatar } from '@/components/ui/avatar';

export default function OrderDetailSkeleton() {
  return (
    <div className="container py-8">
      {/* ======================= */}
      {/* 2. 오른쪽 콘텐츠 영역 */}
      {/* ======================= */}
      <div className="md:col-span-3 space-y-6">
        {/* 2-1. 페이지 헤더 (뒤로가기 버튼 + 제목 + 주문 ID) */}
        <div className="space-y-3">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            {/* 뒤로가기 버튼 스켈레톤 */}
            <Skeleton className="h-8 w-28 rounded-md" />
            {/* 제목 스켈레톤 */}
            <Skeleton className="h-10 w-48 rounded-md" />
          </div>
          {/* 주문 ID 텍스트 스켈레톤 */}
          <Skeleton className="h-4 w-1/4" />
        </div>

        {/* 2-2. 주문 상태 / 고객 정보 / 배송 정보 / 결제 정보 등 그리드 */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* ----------------------- */}
          {/* 2-2-1. 주문 상태 카드 (col-span-3) */}
          {/* ----------------------- */}
          <Card className="md:col-span-3 rounded-xl border-border bg-card shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                {/* “주문 상태” 텍스트 스켈레톤 */}
                <Skeleton className="h-6 w-32" />
                {/* 상태 배지 자리에 스켈레톤 (가로 직사각형) */}
                <Skeleton className="h-6 w-20 rounded-full" />
              </div>
              {/* 날짜 설명 스켈레톤 */}
              <Skeleton className="mt-2 h-4 w-1/3" />
            </CardHeader>
            <CardFooter className="pt-4">
              {/* 아래 여분 공간 확보용 (실제 버튼/배지가 로드되기 전 레이아웃 유지) */}
              <div className="flex w-full flex-col gap-2 sm:flex-row sm:justify-between">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-4 w-24" />
              </div>
            </CardFooter>
          </Card>

          {/* ----------------------- */}
          {/* 2-2-2. 고객 정보 카드 */}
          {/* ----------------------- */}
          <Card className="rounded-xl border-border bg-card shadow-md px-2 py-3">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {/* 사용자 아이콘 스켈레톤 (원형) */}
                <Skeleton className="h-5 w-5 rounded-full" />
                {/* “내 정보” 텍스트 스켈레톤 */}
                <Skeleton className="h-6 w-20" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 필드 4개 (이름, 이메일, 전화번호, 주소) */}
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="space-y-1">
                    {/* 라벨 스켈레톤 */}
                    <Skeleton className="h-4 w-1/3" />
                    {/* 값 스켈레톤 */}
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ----------------------- */}
          {/* 2-2-3. 배송 정보 카드 */}
          {/* ----------------------- */}
          <Card className="rounded-xl border-border bg-card shadow-md px-2 py-3">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {/* 트럭 아이콘 스켈레톤 (원형) */}
                <Skeleton className="h-5 w-5 rounded-full" />
                {/* “배송 정보” 텍스트 스켈레톤 */}
                <Skeleton className="h-6 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 필드 3개 (배송 방법, 예상 수령일, 택배사/운송장) */}
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div key={idx} className="space-y-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ----------------------- */}
          {/* 2-2-4. 결제 정보 카드 */}
          {/* ----------------------- */}
          <Card className="rounded-xl border-border bg-card shadow-md px-2 py-3">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {/* 신용카드 아이콘 스켈레톤 (원형) */}
                <Skeleton className="h-5 w-5 rounded-full" />
                {/* “결제 정보” 텍스트 스켈레톤 */}
                <Skeleton className="h-6 w-24" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {/* 필드 4개 (결제 상태 배지, 결제 방법, 결제 금액, 기타) */}
                {Array.from({ length: 4 }).map((_, idx) => (
                  <div key={idx} className="space-y-1">
                    <Skeleton className="h-4 w-1/3" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ----------------------- */}
          {/* 2-2-5. 주문 항목 테이블 카드 (col-span-3) */}
          {/* ----------------------- */}
          <Card className="md:col-span-3 rounded-xl border-border bg-card shadow-md">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                {/* 장바구니 아이콘 스켈레톤 (원형) */}
                <Skeleton className="h-5 w-5 rounded-full" />
                {/* “주문 항목” 텍스트 스켈레톤 */}
                <Skeleton className="h-6 w-32" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-xl border border-border shadow-sm overflow-hidden">
                {/* 테이블 헤더 스켈레톤 */}
                <div className="flex w-full bg-muted px-4 py-2">
                  <Skeleton className="h-4 w-1/4" /> {/* 상품/서비스 */}
                  <Skeleton className="h-4 w-1/4 ml-auto" /> {/* 수량 */}
                  <Skeleton className="h-4 w-1/4 ml-auto" /> {/* 가격 */}
                  <Skeleton className="h-4 w-1/4 ml-auto" /> {/* 합계 */}
                </div>
                {/* 테이블 바디 3개 행 분량 */}
                {Array.from({ length: 3 }).map((_, rowIdx) => (
                  <div key={rowIdx} className="flex items-center px-4 py-2 border-t border-border">
                    <Skeleton className="h-4 w-1/4" />
                    <Skeleton className="h-4 w-1/4 ml-auto" />
                    <Skeleton className="h-4 w-1/4 ml-auto" />
                    <Skeleton className="h-4 w-1/4 ml-auto" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* ======================= */}
        {/* 3. 요청사항 카드 */}
        {/* ======================= */}
        <Card className="rounded-xl border-border bg-card shadow-md">
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="mt-1 h-4 w-2/3" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-4 w-full" />
          </CardContent>
        </Card>

        {/* ======================= */}
        {/* 4. 처리 이력 스켈레톤 */}
        {/* ======================= */}
        <Card className="rounded-xl border-border bg-card shadow-md">
          <CardHeader>
            <Skeleton className="h-6 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 이력 아이템 3개 분량: 아이콘 + 텍스트 */}
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="flex items-center space-x-4">
                {/* 아이콘 원형 스켈레톤 */}
                <Skeleton className="h-8 w-8 rounded-full" />
                <div className="flex-1 space-y-1">
                  {/* 상태 텍스트 스켈레톤 */}
                  <Skeleton className="h-4 w-1/2" />
                  {/* 날짜/설명 스켈레톤 */}
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
