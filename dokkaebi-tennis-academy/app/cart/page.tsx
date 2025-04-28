import Link from "next/link"
import Image from "next/image"
import { Minus, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function CartPage() {
  // 임시 장바구니 데이터
  const cartItems = [
    {
      id: 1,
      name: "루키론 프로 스트링",
      price: 25000,
      quantity: 2,
      image: "/placeholder.svg?height=100&width=100",
    },
    {
      id: 4,
      name: "바볼랏 RPM 블라스트",
      price: 30000,
      quantity: 1,
      image: "/placeholder.svg?height=100&width=100",
    },
  ]

  // 장바구니 합계 계산
  const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingFee = subtotal >= 30000 ? 0 : 3000
  const total = subtotal + shippingFee

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">장바구니</h1>

      {cartItems.length > 0 ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* 장바구니 상품 목록 */}
          <div className="lg:col-span-2">
            <div className="rounded-lg border">
              <div className="p-4 grid grid-cols-12 text-sm font-medium border-b">
                <div className="col-span-6">상품</div>
                <div className="col-span-2 text-center">가격</div>
                <div className="col-span-2 text-center">수량</div>
                <div className="col-span-2 text-right">합계</div>
              </div>

              {cartItems.map((item) => (
                <div key={item.id} className="p-4 grid grid-cols-12 items-center border-b last:border-b-0">
                  <div className="col-span-6 flex items-center gap-4">
                    <Image
                      src={item.image || "/placeholder.svg"}
                      alt={item.name}
                      width={80}
                      height={80}
                      className="rounded-md"
                    />
                    <div>
                      <Link href={`/products/${item.id}`} className="font-medium hover:underline">
                        {item.name}
                      </Link>
                    </div>
                  </div>

                  <div className="col-span-2 text-center">{item.price.toLocaleString()}원</div>

                  <div className="col-span-2 flex items-center justify-center">
                    <div className="flex items-center border rounded-md">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Minus className="h-3 w-3" />
                        <span className="sr-only">수량 감소</span>
                      </Button>
                      <span className="w-8 text-center">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Plus className="h-3 w-3" />
                        <span className="sr-only">수량 증가</span>
                      </Button>
                    </div>
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-2">
                    <span className="font-medium">{(item.price * item.quantity).toLocaleString()}원</span>
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                      <Trash2 className="h-4 w-4" />
                      <span className="sr-only">삭제</span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 flex justify-between">
              <Button variant="outline" asChild>
                <Link href="/products">쇼핑 계속하기</Link>
              </Button>
              <Button variant="destructive">장바구니 비우기</Button>
            </div>
          </div>

          {/* 주문 요약 및 결제 */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>주문 요약</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span>상품 금액</span>
                  <span>{subtotal.toLocaleString()}원</span>
                </div>
                <div className="flex justify-between">
                  <span>배송비</span>
                  <span>{shippingFee > 0 ? `${shippingFee.toLocaleString()}원` : "무료"}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold">
                  <span>총 결제 금액</span>
                  <span>{total.toLocaleString()}원</span>
                </div>

                <div className="rounded-md bg-muted p-3 text-sm">
                  <p>30,000원 이상 구매 시 무료배송</p>
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" size="lg" asChild>
                  <Link href="/checkout">주문하기</Link>
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
      ) : (
        <div className="text-center py-12">
          <h2 className="text-2xl font-semibold mb-4">장바구니가 비어있습니다</h2>
          <p className="text-muted-foreground mb-8">장바구니에 상품을 추가하고 쇼핑을 계속해보세요.</p>
          <Button asChild>
            <Link href="/products">쇼핑하러 가기</Link>
          </Button>
        </div>
      )}
    </div>
  )
}
