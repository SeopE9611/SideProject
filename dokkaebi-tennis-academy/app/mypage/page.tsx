import Link from "next/link"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function MyPage() {
  // 임시 주문 내역 데이터
  const orders = [
    {
      id: "ORD-2023-0001",
      date: "2023-05-01",
      total: 55000,
      status: "배송 완료",
      items: [
        { name: "루키론 프로 스트링", quantity: 2 },
        { name: "바볼랏 RPM 블라스트", quantity: 1 },
      ],
    },
    {
      id: "ORD-2023-0002",
      date: "2023-04-15",
      total: 28000,
      status: "입금 확인",
      items: [{ name: "윌슨 NXT 파워", quantity: 1 }],
    },
    {
      id: "ORD-2023-0003",
      date: "2023-04-10",
      total: 32000,
      status: "입금 대기",
      items: [{ name: "테크니파이버 블랙코드", quantity: 1 }],
    },
  ]

  // 임시 리뷰 데이터
  const reviews = [
    {
      id: 1,
      productName: "루키론 프로 스트링",
      rating: 5,
      date: "2023-04-20",
      content: "정말 좋은 스트링입니다. 내구성이 뛰어나고 타구감도 좋습니다.",
    },
    {
      id: 2,
      productName: "바볼랏 RPM 블라스트",
      rating: 4,
      date: "2023-03-15",
      content: "스핀이 잘 걸리고 컨트롤이 좋습니다. 다만 내구성이 조금 아쉽습니다.",
    },
  ]

  // 임시 Q&A 데이터
  const qnas = [
    {
      id: 1,
      title: "스트링 장착 서비스 문의",
      date: "2023-05-05",
      status: "답변 완료",
      category: "서비스",
    },
    {
      id: 2,
      title: "주문 취소 가능한가요?",
      date: "2023-04-28",
      status: "답변 대기",
      category: "주문/결제",
    },
  ]

  // 임시 위시리스트 데이터
  const wishlist = [
    {
      id: 3,
      name: "윌슨 NXT 파워",
      price: 28000,
    },
    {
      id: 5,
      name: "헤드 링키 스트링",
      price: 22000,
    },
  ]

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">마이페이지</h1>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
        {/* 사용자 정보 */}
        <div className="md:col-span-1">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src="/placeholder.svg?height=64&width=64" alt="프로필 이미지" />
                  <AvatarFallback>사용자</AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle>홍길동님</CardTitle>
                  <CardDescription>일반 회원</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <nav className="space-y-2">
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/mypage">주문 내역</Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/mypage/wishlist">위시리스트</Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/mypage/reviews">리뷰 관리</Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/mypage/qna">Q&A 내역</Link>
                </Button>
                <Button variant="ghost" className="w-full justify-start" asChild>
                  <Link href="/mypage/profile">회원 정보 수정</Link>
                </Button>
              </nav>
            </CardContent>
          </Card>
        </div>

        {/* 마이페이지 콘텐츠 */}
        <div className="md:col-span-3">
          <Tabs defaultValue="orders">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="orders">주문 내역</TabsTrigger>
              <TabsTrigger value="wishlist">위시리스트</TabsTrigger>
              <TabsTrigger value="reviews">리뷰 관리</TabsTrigger>
              <TabsTrigger value="qna">Q&A 내역</TabsTrigger>
            </TabsList>

            {/* 주문 내역 탭 */}
            <TabsContent value="orders" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>주문 내역</CardTitle>
                  <CardDescription>최근 주문 내역을 확인하실 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {orders.length > 0 ? (
                    <div className="space-y-4">
                      {orders.map((order) => (
                        <Card key={order.id}>
                          <CardContent className="p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <div className="font-medium">{order.id}</div>
                                <div className="text-sm text-muted-foreground">{order.date}</div>
                              </div>
                              <Badge
                                variant={
                                  order.status === "배송 완료"
                                    ? "default"
                                    : order.status === "입금 확인"
                                      ? "secondary"
                                      : "outline"
                                }
                              >
                                {order.status}
                              </Badge>
                            </div>
                            <div className="mt-4">
                              <div className="text-sm text-muted-foreground mb-1">주문 상품</div>
                              <ul className="text-sm">
                                {order.items.map((item, index) => (
                                  <li key={index}>
                                    {item.name} x {item.quantity}
                                  </li>
                                ))}
                              </ul>
                            </div>
                            <div className="mt-4 flex items-center justify-between">
                              <div className="font-medium">총 결제 금액: {order.total.toLocaleString()}원</div>
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/mypage/orders/${order.id}`}>상세보기</Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">주문 내역이 없습니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 위시리스트 탭 */}
            <TabsContent value="wishlist" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>위시리스트</CardTitle>
                  <CardDescription>찜한 상품 목록을 확인하실 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {wishlist.length > 0 ? (
                    <div className="space-y-4">
                      {wishlist.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center justify-between border-b pb-4 last:border-b-0 last:pb-0"
                        >
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm font-bold">{item.price.toLocaleString()}원</div>
                          </div>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" asChild>
                              <Link href={`/products/${item.id}`}>상세보기</Link>
                            </Button>
                            <Button size="sm">장바구니에 담기</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">위시리스트가 비어있습니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* 리뷰 관리 탭 */}
            <TabsContent value="reviews" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>리뷰 관리</CardTitle>
                  <CardDescription>작성한 리뷰를 확인하고 관리하실 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {reviews.length > 0 ? (
                    <div className="space-y-4">
                      {reviews.map((review) => (
                        <Card key={review.id}>
                          <CardContent className="p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="font-medium">{review.productName}</div>
                              <div className="text-sm text-muted-foreground">{review.date}</div>
                            </div>
                            <div className="mt-2">
                              <div className="flex">
                                {[...Array(5)].map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`h-4 w-4 ${
                                      i < review.rating
                                        ? "fill-primary text-primary"
                                        : "fill-muted text-muted-foreground"
                                    }`}
                                    xmlns="http://www.w3.org/2000/svg"
                                    viewBox="0 0 24 24"
                                  >
                                    <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                                  </svg>
                                ))}
                              </div>
                            </div>
                            <p className="mt-2 text-sm">{review.content}</p>
                            <div className="mt-4 flex justify-end gap-2">
                              <Button size="sm" variant="outline">
                                수정
                              </Button>
                              <Button size="sm" variant="destructive">
                                삭제
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">작성한 리뷰가 없습니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Q&A 내역 탭 */}
            <TabsContent value="qna" className="mt-6">
              <Card>
                <CardHeader>
                  <CardTitle>Q&A 내역</CardTitle>
                  <CardDescription>문의 내역을 확인하실 수 있습니다.</CardDescription>
                </CardHeader>
                <CardContent>
                  {qnas.length > 0 ? (
                    <div className="space-y-4">
                      {qnas.map((qna) => (
                        <Card key={qna.id}>
                          <CardContent className="p-4">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div>
                                <Badge variant="outline" className="mb-2">
                                  {qna.category}
                                </Badge>
                                <div className="font-medium">{qna.title}</div>
                              </div>
                              <Badge variant={qna.status === "답변 완료" ? "default" : "secondary"}>{qna.status}</Badge>
                            </div>
                            <div className="mt-2 text-sm text-muted-foreground">{qna.date}</div>
                            <div className="mt-4 flex justify-end">
                              <Button size="sm" variant="outline" asChild>
                                <Link href={`/mypage/qna/${qna.id}`}>상세보기</Link>
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-muted-foreground">문의 내역이 없습니다.</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
