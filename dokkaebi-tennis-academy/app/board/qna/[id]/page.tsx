import Link from "next/link"
import { ArrowLeft, ArrowUp, MessageCircle, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function QnaDetailPage({ params }: { params: { id: string } }) {
  const qnaId = Number.parseInt(params.id)

  // 임시 Q&A 데이터
  const qna = {
    id: qnaId,
    title: "스트링 장착 서비스 문의",
    date: "2023-05-05",
    author: "테니스러버",
    status: "답변 완료",
    category: "서비스",
    content: `
      <p>안녕하세요, 스트링 장착 서비스에 대해 몇 가지 문의사항이 있습니다.</p>
      <br />
      <p>1. 스트링 장착 서비스는 얼마나 걸리나요?</p>
      <p>2. 제가 구매한 스트링이 아닌 다른 곳에서 구매한 스트링도 장착 가능한가요?</p>
      <p>3. 라켓을 맡기고 찾아가는 방식인가요, 아니면 기다리면 되나요?</p>
      <br />
      <p>답변 부탁드립니다. 감사합니다.</p>
    `,
    answer: {
      date: "2023-05-06",
      admin: "도깨비관리자",
      content: `
        <p>안녕하세요, 테니스러버님. 문의 주셔서 감사합니다.</p>
        <br />
        <p>1. 스트링 장착 서비스는 보통 30분~1시간 정도 소요됩니다. 매장 상황에 따라 다소 차이가 있을 수 있습니다.</p>
        <p>2. 네, 다른 곳에서 구매하신 스트링도 장착 가능합니다. 다만, 스트링의 상태가 좋지 않을 경우 장착이 어려울 수 있습니다.</p>
        <p>3. 기본적으로는 맡기고 찾아가는 방식입니다. 하지만 여유가 있으시다면 매장에서 기다리셔도 됩니다. 미리 예약하시면 대기 시간을 줄일 수 있습니다.</p>
        <br />
        <p>추가 문의사항이 있으시면 언제든지 문의해주세요.</p>
        <p>감사합니다.</p>
      `,
    },
    isAuthor: true, // 현재 로그인한 사용자가 작성자인지 여부 (예시)
  }

  return (
    <div className="container py-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-4">
          <Link href="/board/qna" className="inline-flex items-center text-primary hover:underline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Q&A 목록으로 돌아가기
          </Link>
        </div>

        {/* 질문 카드 */}
        <Card className="mb-6">
          <CardHeader className="border-b p-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Badge variant="outline">{qna.category}</Badge>
                <Badge variant={qna.status === "답변 완료" ? "default" : "secondary"}>{qna.status}</Badge>
              </div>
              <h1 className="text-2xl font-bold">{qna.title}</h1>
              <div className="flex flex-wrap items-center gap-x-6 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarFallback>{qna.author[0]}</AvatarFallback>
                  </Avatar>
                  <span>{qna.author}</span>
                </div>
                <div>작성일: {qna.date}</div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: qna.content }} />
          </CardContent>
          {qna.isAuthor && (
            <CardFooter className="flex justify-end gap-2 border-t p-6">
              <Button variant="outline" size="sm">
                <Pencil className="mr-2 h-4 w-4" />
                수정
              </Button>
              <Button variant="destructive" size="sm">
                <Trash2 className="mr-2 h-4 w-4" />
                삭제
              </Button>
            </CardFooter>
          )}
        </Card>

        {/* 답변 카드 */}
        {qna.answer && (
          <Card className="mb-6 border-primary">
            <CardHeader className="border-b p-6 bg-primary/5">
              <div className="space-y-2">
                <div className="flex items-center">
                  <MessageCircle className="mr-2 h-5 w-5 text-primary" />
                  <h2 className="text-xl font-bold">답변</h2>
                </div>
                <div className="flex flex-wrap items-center gap-x-6 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Avatar className="h-6 w-6">
                      <AvatarFallback>{qna.answer.admin[0]}</AvatarFallback>
                    </Avatar>
                    <span>{qna.answer.admin}</span>
                  </div>
                  <div>작성일: {qna.answer.date}</div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-6">
              <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: qna.answer.content }} />
            </CardContent>
          </Card>
        )}

        {/* 하단 버튼 */}
        <div className="flex justify-between">
          <Button variant="outline" asChild>
            <Link href="/board/qna">
              <ArrowUp className="mr-2 h-4 w-4" />
              목록
            </Link>
          </Button>
          <Button asChild>
            <Link href="/board/qna/write">문의하기</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
