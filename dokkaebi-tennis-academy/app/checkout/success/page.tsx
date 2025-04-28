import Link from "next/link"
import { CheckCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

export default function CheckoutSuccessPage() {
  // 임시 주문 정보
  const orderInfo = {
    orderNumber: "ORD-2023-0004",
    orderDate: "2023-05-20",
    paymentMethod: "무통장입금",
    bankAccount: "신한은행 123-456-789012 (예금주: 도깨비테니스)",
    totalAmount: 80000,
    items: [
      { name: "루키론 프로 스트링", quantity: 2, price: 25000 },
      { name: "바볼랏 RPM 블라스트", quantity: 1, price: 30000 },
    ],
    shippingInfo: {
      name: "홍길동",
      phone: "010-1234-5678",
      address: "서울시 강남구 테니스로 123, 456호",
    },
  }

  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <CheckCircle className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">주문이 완료되었습니다</h1>
          <p className="text-muted-foreground mt-2">주문해주셔서 감사합니다. 아래 정보를 확인해주세요.</p>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle>주문 정보</CardTitle>
            <CardDescription>주문 번호: {orderInfo.orderNumber}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground">주문일자</p>
                <p className="font-medium">{orderInfo.orderDate}</p>
              </div>
              <div>
                <p className="text-muted-foreground">결제 방법</p>
                <p className="font-medium">{orderInfo.paymentMethod}</p>
              </div>
            </div>

            <div className="rounded-md bg-muted p-4 text-sm">
              <p className="font-medium mb-2">입금 계좌 정보</p>
              <p>{orderInfo.bankAccount}</p>
              <p className="mt-2 text-primary font-medium">입금 기한: {orderInfo.orderDate} 23:59까지</p>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-3">주문 상품</h3>
              <div className="space-y-3">
                {orderInfo.items.map((item, index) => (
                  <div key={index} className="flex justify-between">
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">수량: {item.quantity}개</p>
                    </div>
                    <p className="font-medium">{(item.price * item.quantity).toLocaleString()}원</p>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <h3 className="font-medium mb-3">배송 정보</h3>
              <div className="space-y-1 text-sm">
                <p>
                  <span className="text-muted-foreground">수령인:</span> {orderInfo.shippingInfo.name}
                </p>
                <p>
                  <span className="text-muted-foreground">연락처:</span> {orderInfo.shippingInfo.phone}
                </p>
                <p>
                  <span className="text-muted-foreground">주소:</span> {orderInfo.shippingInfo.address}
                </p>
              </div>
            </div>

            <Separator />

            <div className="flex justify-between items-center font-bold text-lg">
              <span>총 결제 금액</span>
              <span>{orderInfo.totalAmount.toLocaleString()}원</span>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4 sm:flex-row">
            <Button className="w-full" asChild>
              <Link href="/mypage">주문 내역 확인</Link>
            </Button>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/">쇼핑 계속하기</Link>
            </Button>
          </CardFooter>
        </Card>

        <div className="rounded-md border p-4 text-sm">
          <h3 className="font-medium mb-2">주문 안내사항</h3>
          <ul className="space-y-1 text-muted-foreground">
            <li>• 주문하신 상품의 결제 금액을 위 계좌로 입금해주세요.</li>
            <li>• 입금 확인 후 배송이 시작됩니다.</li>
            <li>• 주문 내역은 마이페이지에서 확인하실 수 있습니다.</li>
            <li>• 배송 관련 문의사항은 고객센터(02-123-4567)로 연락주세요.</li>
          </ul>
        </div>
      </div>
    </div>
  )
}
