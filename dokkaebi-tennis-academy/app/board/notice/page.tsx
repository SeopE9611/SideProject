import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function NoticePage() {
  // 임시 공지사항 데이터
  const notices = [
    {
      id: 1,
      title: "5월 스트링 할인 이벤트",
      date: "2023-05-01",
      views: 245,
      content: "5월 가정의 달을 맞이하여 전 제품 10% 할인 이벤트를 진행합니다.",
    },
    {
      id: 2,
      title: "여름 아카데미 회원 모집",
      date: "2023-05-10",
      views: 187,
      content: "여름 방학 특별 아카데미 회원을 모집합니다. 많은 관심 부탁드립니다.",
    },
    {
      id: 3,
      title: "신규 스트링 입고 안내",
      date: "2023-05-15",
      views: 156,
      content: "새로운 스트링 제품이 입고되었습니다. 많은 관심 부탁드립니다.",
    },
    {
      id: 4,
      title: "6월 휴무 안내",
      date: "2023-05-25",
      views: 98,
      content: "6월 6일 현충일은 휴무입니다. 참고 부탁드립니다.",
    },
    {
      id: 5,
      title: "스트링 장착 서비스 가격 안내",
      date: "2023-04-20",
      views: 312,
      content: "스트링 장착 서비스 가격이 변경되었습니다. 자세한 내용은 공지사항을 참고해주세요.",
    },
    {
      id: 6,
      title: "테니스 라켓 신제품 입고",
      date: "2023-04-15",
      views: 275,
      content: "테니스 라켓 신제품이 입고되었습니다. 많은 관심 부탁드립니다.",
    },
    {
      id: 7,
      title: "배송 지연 안내",
      date: "2023-04-10",
      views: 198,
      content: "물류 센터 이전으로 인해 배송이 지연될 수 있습니다. 양해 부탁드립니다.",
    },
    {
      id: 8,
      title: "회원 등급 혜택 안내",
      date: "2023-04-05",
      views: 267,
      content: "회원 등급별 혜택이 변경되었습니다. 자세한 내용은 공지사항을 참고해주세요.",
    },
    {
      id: 9,
      title: "적립금 사용 안내",
      date: "2023-03-25",
      views: 189,
      content: "적립금 사용 방법이 변경되었습니다. 자세한 내용은 공지사항을 참고해주세요.",
    },
    {
      id: 10,
      title: "봄 시즌 스트링 추천",
      date: "2023-03-15",
      views: 321,
      content: "봄 시즌에 추천하는 스트링을 소개합니다. 많은 관심 부탁드립니다.",
    },
  ]

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">공지사항</h1>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>공지사항</CardTitle>
              <CardDescription>도깨비 테니스 아카데미의 공지사항을 확인하세요.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Select defaultValue="all">
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="검색 조건" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  <SelectItem value="title">제목</SelectItem>
                  <SelectItem value="content">내용</SelectItem>
                </SelectContent>
              </Select>
              <div className="relative">
                <Input type="search" placeholder="검색어를 입력하세요" className="w-[200px]" />
              </div>
              <Button>검색</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <div className="grid grid-cols-12 border-b bg-muted px-4 py-3 text-sm font-medium">
              <div className="col-span-1 text-center">번호</div>
              <div className="col-span-7">제목</div>
              <div className="col-span-2 text-center">등록일</div>
              <div className="col-span-2 text-center">조회수</div>
            </div>

            {notices.map((notice) => (
              <Link
                key={notice.id}
                href={`/board/notice/${notice.id}`}
                className="grid grid-cols-12 border-b px-4 py-4 text-sm hover:bg-muted/50"
              >
                <div className="col-span-1 text-center">{notice.id}</div>
                <div className="col-span-7 font-medium">{notice.title}</div>
                <div className="col-span-2 text-center text-muted-foreground">{notice.date}</div>
                <div className="col-span-2 text-center text-muted-foreground">{notice.views}</div>
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
              <Button variant="outline" size="sm" className="h-8 w-8">
                4
              </Button>
              <Button variant="outline" size="sm" className="h-8 w-8">
                5
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
