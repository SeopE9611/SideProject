import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"

export default function QnaPage() {
  // 임시 Q&A 데이터
  const qnas = [
    {
      id: 1,
      title: "스트링 장착 서비스 문의",
      date: "2023-05-05",
      author: "테니스러버",
      status: "답변 완료",
      category: "서비스",
    },
    {
      id: 2,
      title: "주문 취소 가능한가요?",
      date: "2023-04-28",
      author: "초보자",
      status: "답변 대기",
      category: "주문/결제",
    },
    {
      id: 3,
      title: "스트링 추천 부탁드립니다.",
      date: "2023-04-25",
      author: "테니스마스터",
      status: "답변 완료",
      category: "상품",
    },
    {
      id: 4,
      title: "배송 언제 시작되나요?",
      date: "2023-04-20",
      author: "급한사람",
      status: "답변 완료",
      category: "배송",
    },
    {
      id: 5,
      title: "아카데미 신청 방법",
      date: "2023-04-15",
      author: "테니스초보",
      status: "답변 완료",
      category: "아카데미",
    },
    {
      id: 6,
      title: "환불 절차 문의",
      date: "2023-04-10",
      author: "불만족",
      status: "답변 완료",
      category: "환불/교환",
    },
    {
      id: 7,
      title: "회원 정보 수정 방법",
      date: "2023-04-05",
      author: "새내기",
      status: "답변 완료",
      category: "회원",
    },
    {
      id: 8,
      title: "적립금 사용 방법",
      date: "2023-03-30",
      author: "포인트킹",
      status: "답변 완료",
      category: "적립금",
    },
  ]

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">Q&A</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Q&A</CardTitle>
              <CardDescription>도깨비 테니스 아카데미에 궁금한 점을 문의해보세요.</CardDescription>
            </div>
            <Button asChild>
              <Link href="/board/qna/write">문의하기</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="카테고리" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="product">상품</SelectItem>
                  <SelectItem value="order">주문/결제</SelectItem>
                  <SelectItem value="delivery">배송</SelectItem>
                  <SelectItem value="refund">환불/교환</SelectItem>
                  <SelectItem value="service">서비스</SelectItem>
                  <SelectItem value="academy">아카데미</SelectItem>
                  <SelectItem value="member">회원</SelectItem>
                </SelectContent>
              </Select>
              <Select defaultValue="all">
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="답변 상태" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="waiting">답변 대기</SelectItem>
                  <SelectItem value="completed">답변 완료</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="title">
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="검색 조건" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="title">제목</SelectItem>
                  <SelectItem value="content">내용</SelectItem>
                  <SelectItem value="author">작성자</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Input type="search" placeholder="검색어를 입력하세요" className="w-[200px]" />
              </div>
              <Button>검색</Button>
            </div>
          </div>

          <div className="rounded-md border">
            <div className="grid grid-cols-12 border-b bg-muted px-4 py-3 text-sm font-medium">
              <div className="col-span-1 text-center">번호</div>
              <div className="col-span-2 text-center">카테고리</div>
              <div className="col-span-5">제목</div>
              <div className="col-span-1 text-center">작성자</div>
              <div className="col-span-2 text-center">등록일</div>
              <div className="col-span-1 text-center">상태</div>
            </div>

            {qnas.map((qna) => (
              <Link
                key={qna.id}
                href={`/board/qna/${qna.id}`}
                className="grid grid-cols-12 border-b px-4 py-4 text-sm hover:bg-muted/50"
              >
                <div className="col-span-1 text-center">{qna.id}</div>
                <div className="col-span-2 text-center">
                  <Badge variant="outline">{qna.category}</Badge>
                </div>
                <div className="col-span-5 font-medium">{qna.title}</div>
                <div className="col-span-1 text-center text-muted-foreground">{qna.author}</div>
                <div className="col-span-2 text-center text-muted-foreground">{qna.date}</div>
                <div className="col-span-1 text-center">
                  <Badge variant={qna.status === "답변 완료" ? "default" : "secondary"}>{qna.status}</Badge>
                </div>
              </Link>
            ))}
          </div>

          <div className="mt-6 flex items-center justify-center">
            <div className="flex items-center gap-1">
              <Button variant="outline" size="icon">
                <span className="sr-only">이전 페이지</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8">
                1
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8">
                2
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8">
                3
              </Button>
              <Button variant="outline" size="icon">
                <span className="sr-only">다음 페이지</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-4 w-4"
                >
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
