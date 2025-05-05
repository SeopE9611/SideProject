import { ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import Link from "next/link"

export default function OrderDetailLoading() {
  return (
    <div className="container py-10">
      <div className="mx-auto max-w-4xl">
        {/* 페이지 헤더 스켈레톤 */}
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Button variant="outline" size="sm" className="mb-3" asChild>
              <Link href="/admin/orders">
                <ArrowLeft className="mr-2 h-4 w-4" />
                주문 목록으로 돌아가기
              </Link>
            </Button>
            <Skeleton className="h-10 w-64" />
            <Skeleton className="mt-1 h-5 w-48" />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Skeleton className="h-10 w-40" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* 주문 상태 및 요약 스켈레톤 */}
          <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-6 w-24 rounded-full" />
              </div>
              <Skeleton className="mt-1 h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Skeleton className="h-6 w-32 rounded-full" />
                <Skeleton className="h-6 w-24 rounded-full" />
                <Skeleton className="ml-auto h-8 w-32" />
              </div>
            </CardContent>
          </Card>

          {/* 고객 정보 스켈레톤 */}
          <Card className="border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <div key={index}>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-1 h-5 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 배송 정보 스켈레톤 */}
          <Card className="border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index}>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-1 h-5 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 결제 정보 스켈레톤 */}
          <Card className="border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index}>
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="mt-1 h-5 w-full" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* 주문 항목 스켈레톤 */}
          <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <div className="border-b bg-muted/50 p-3">
                  <div className="flex justify-between">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                    <Skeleton className="h-5 w-16" />
                  </div>
                </div>
                <div className="p-3">
                  {Array.from({ length: 2 }).map((_, index) => (
                    <div key={index} className="mb-4 flex justify-between">
                      <div className="w-1/2">
                        <Skeleton className="h-5 w-full" />
                        <Skeleton className="mt-1 h-4 w-3/4" />
                      </div>
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-5 w-16" />
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 주문 메모 스켈레톤 */}
          <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-[100px] w-full" />
              <Skeleton className="mt-3 h-10 w-24" />
            </CardContent>
          </Card>

          {/* 주문 이력 스켈레톤 */}
          <Card className="md:col-span-3 border-border/40 bg-card/60 backdrop-blur">
            <CardHeader className="pb-3">
              <Skeleton className="h-6 w-32" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex">
                    <div className="mr-4 flex flex-col items-center">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      {index < 2 && <div className="h-full w-px bg-border" />}
                    </div>
                    <div className="flex-1 pb-8">
                      <div className="flex items-baseline justify-between">
                        <Skeleton className="h-6 w-32" />
                        <Skeleton className="h-4 w-24" />
                      </div>
                      <Skeleton className="mt-1 h-4 w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
