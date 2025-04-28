import Link from "next/link"
import { ArrowLeft, ArrowUp, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function NoticeDetailPage({ params }: { params: { id: string } }) {
  const noticeId = Number.parseInt(params.id)

  // 임시 공지사항 데이터
  const notice = {
    id: noticeId,
    title: "5월 스트링 할인 이벤트",
    date: "2023-05-01",
    views: 245,
    content: `
      <h3>5월 가정의 달 맞이 스트링 할인 이벤트</h3>
      <p>안녕하세요, 도깨비 테니스 아카데미입니다.</p>
      <p>5월 가정의 달을 맞이하여 전 제품 10% 할인 이벤트를 진행합니다.</p>
      <br />
      <h4>이벤트 기간</h4>
      <p>2023년 5월 1일 ~ 5월 31일</p>
      <br />
      <h4>이벤트 내용</h4>
      <ul>
        <li>전 스트링 제품 10% 할인</li>
        <li>3개 이상 구매 시 추가 5% 할인</li>
        <li>스트링 장착 서비스 20% 할인</li>
      </ul>
      <br />
      <h4>유의사항</h4>
      <p>- 본 이벤트는 기간 내 온라인 구매 시에만 적용됩니다.</p>
      <p>- 타 이벤트와 중복 적용되지 않습니다.</p>
      <p>- 일부 품목은 조기 품절될 수 있습니다.</p>
      <br />
      <p>많은 관심과 참여 부탁드립니다.</p>
      <p>감사합니다.</p>
    `,
  }

  // 이전/다음 공지사항 데이터
  const prevNotice = noticeId > 1 ? { id: noticeId - 1, title: "여름 아카데미 회원 모집" } : null
  const nextNotice = { id: noticeId + 1, title: "신규 스트링 입고 안내" }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link href="/board/notice" className="inline-flex items-center text-primary hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            공지사항 목록으로 돌아가기
          </Link>
        </div>

        <Card>
          <CardHeader className="border-b p-6">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">{notice.title}</h1>
              <div className="flex flex-wrap items-center gap-x-6 text-sm text-muted-foreground">
                <div>작성일: {notice.date}</div>
                <div>조회수: {notice.views}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: notice.content }} />
          </CardContent>
          <CardFooter className="flex flex-col border-t p-6">
            <div className="w-full space-y-2">
              {prevNotice && (
                <div className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center">
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    <span className="text-muted-foreground">이전 글</span>
                  </div>
                  <Link href={`/board/notice/${prevNotice.id}`} className="hover:underline">
                    {prevNotice.title}
                  </Link>
                </div>
              )}
              <Separator />
              {nextNotice && (
                <div className="flex items-center justify-between py-2 text-sm">
                  <div className="flex items-center">
                    <ChevronRight className="mr-1 h-4 w-4" />
                    <span className="text-muted-foreground">다음 글</span>
                  </div>
                  <Link href={`/board/notice/${nextNotice.id}`} className="hover:underline">
                    {nextNotice.title}
                  </Link>
                </div>
              )}
            </div>
            <div className="mt-6 flex justify-between w-full">
              <Button variant="outline" asChild>
                <Link href="/board/notice">
                  <ArrowUp className="mr-2 h-4 w-4" />
                  목록
                </Link>
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
