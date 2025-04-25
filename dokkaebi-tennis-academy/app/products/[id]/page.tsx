import Image from "next/image"
import Link from "next/link"
import { Star, ShoppingCart, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function ProductDetailPage({ params }: { params: { id: string } }) {
  // 임시 상품 데이터
  const product = {
    id: Number.parseInt(params.id),
    name: "루키론 프로 스트링",
    price: 25000,
    images: [
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
      "/placeholder.svg?height=400&width=400",
    ],
    brand: "루키론",
    features: {
      반발력: 4,
      내구성: 5,
      스핀: 3,
    },
    description:
      "루키론 프로 스트링은 프로 선수들이 선호하는 고성능 스트링입니다. 뛰어난 내구성과 우수한 반발력으로 파워풀한 샷을 구사할 수 있습니다. 특히 하드 히터들에게 적합한 스트링으로, 강한 임팩트에도 안정적인 성능을 발휘합니다.",
    specifications: {
      재질: "폴리에스터",
      게이지: "1.25mm / 16G",
      색상: "블랙",
      길이: "12.2m",
      원산지: "일본",
    },
    reviews: [
      {
        id: 1,
        user: "테니스마스터",
        rating: 5,
        date: "2023-04-15",
        content: "정말 좋은 스트링입니다. 내구성이 뛰어나고 타구감도 좋습니다. 다음에도 구매할 예정입니다.",
      },
      {
        id: 2,
        user: "라켓러버",
        rating: 4,
        date: "2023-03-22",
        content: "반발력이 좋고 스핀을 걸기에도 좋습니다. 다만 가격이 조금 비싼 편입니다.",
      },
      {
        id: 3,
        user: "테니스초보",
        rating: 5,
        date: "2023-02-10",
        content: "코치님 추천으로 구매했는데 정말 만족스럽습니다. 타구감이 좋고 내구성도 뛰어납니다.",
      },
    ],
    relatedProducts: [
      {
        id: 2,
        name: "테크니파이버 블랙코드",
        price: 32000,
        image: "/placeholder.svg?height=100&width=100",
      },
      {
        id: 3,
        name: "윌슨 NXT 파워",
        price: 28000,
        image: "/placeholder.svg?height=100&width=100",
      },
      {
        id: 4,
        name: "바볼랏 RPM 블라스트",
        price: 30000,
        image: "/placeholder.svg?height=100&width=100",
      },
    ],
  }

  return (
    <div className="container py-8">
      <div className="mb-4">
        <Link href="/products" className="text-primary hover:underline">
          ← 상품 목록으로 돌아가기
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        {/* 상품 이미지 */}
        <div className="space-y-4">
          <div className="overflow-hidden rounded-lg border">
            <Image
              src={product.images[0] || "/placeholder.svg"}
              alt={product.name}
              width={600}
              height={600}
              className="h-full w-full object-cover"
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            {product.images.map((image, index) => (
              <div key={index} className="overflow-hidden rounded-md border cursor-pointer hover:border-primary">
                <Image
                  src={image || "/placeholder.svg"}
                  alt={`${product.name} ${index + 1}`}
                  width={100}
                  height={100}
                  className="h-20 w-full object-cover"
                />
              </div>
            ))}
          </div>
        </div>

        {/* 상품 정보 */}
        <div className="space-y-6">
          <div>
            <div className="text-sm text-muted-foreground">{product.brand}</div>
            <h1 className="text-3xl font-bold">{product.name}</h1>
            <div className="mt-2 flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${i < 4 ? "fill-primary text-primary" : "fill-muted text-muted-foreground"}`}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">({product.reviews.length} 리뷰)</span>
            </div>
          </div>

          <div className="text-3xl font-bold">{product.price.toLocaleString()}원</div>

          <div className="space-y-2">
            <h3 className="font-medium">성능</h3>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1">
                <div className="text-sm">반발력</div>
                <div className="text-sm">
                  {"★".repeat(product.features.반발력)}
                  {"☆".repeat(5 - product.features.반발력)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm">내구성</div>
                <div className="text-sm">
                  {"★".repeat(product.features.내구성)}
                  {"☆".repeat(5 - product.features.내구성)}
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-sm">스핀</div>
                <div className="text-sm">
                  {"★".repeat(product.features.스핀)}
                  {"☆".repeat(5 - product.features.스핀)}
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="quantity" className="block text-sm font-medium">
                수량
              </label>
              <Select defaultValue="1">
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="수량" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5].map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      {num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row">
              <Button className="flex-1">
                <ShoppingCart className="mr-2 h-4 w-4" />
                장바구니에 담기
              </Button>
              <Button variant="outline">
                <Heart className="mr-2 h-4 w-4" />
                위시리스트에 추가
              </Button>
            </div>
          </div>

          <div className="rounded-lg border p-4 text-sm">
            <h3 className="font-medium mb-2">배송 정보</h3>
            <ul className="space-y-1 text-muted-foreground">
              <li>• 3,000원 (30,000원 이상 구매 시 무료배송)</li>
              <li>• 오후 2시 이전 주문 시 당일 출고</li>
              <li>• 스트링 장착 서비스 신청 시 1-2일 추가 소요</li>
            </ul>
          </div>
        </div>
      </div>

      {/* 상품 상세 정보 탭 */}
      <div className="mt-12">
        <Tabs defaultValue="description">
          <TabsList className="w-full grid grid-cols-3">
            <TabsTrigger value="description">상품 설명</TabsTrigger>
            <TabsTrigger value="specifications">상세 스펙</TabsTrigger>
            <TabsTrigger value="reviews">리뷰 ({product.reviews.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="mt-6">
            <div className="prose max-w-none">
              <p>{product.description}</p>
            </div>
          </TabsContent>

          <TabsContent value="specifications" className="mt-6">
            <div className="overflow-hidden rounded-lg border">
              <table className="w-full text-sm">
                <tbody>
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <tr key={key} className="border-b last:border-b-0">
                      <th className="bg-muted px-4 py-3 text-left font-medium w-1/4">{key}</th>
                      <td className="px-4 py-3">{value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="mt-6">
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">고객 리뷰</h3>
                <Button>리뷰 작성하기</Button>
              </div>

              <div className="space-y-4">
                {product.reviews.map((review) => (
                  <Card key={review.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="font-medium">{review.user}</div>
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < review.rating ? "fill-primary text-primary" : "fill-muted text-muted-foreground"
                                }`}
                              />
                            ))}
                          </div>
                        </div>
                        <div className="text-sm text-muted-foreground">{review.date}</div>
                      </div>
                      <p className="mt-2 text-sm">{review.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* 관련 상품 */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-6">관련 상품</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
          {product.relatedProducts.map((relatedProduct) => (
            <Link key={relatedProduct.id} href={`/products/${relatedProduct.id}`}>
              <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                <div className="p-2">
                  <Image
                    src={relatedProduct.image || "/placeholder.svg"}
                    alt={relatedProduct.name}
                    width={100}
                    height={100}
                    className="h-32 w-full object-cover"
                  />
                  <div className="p-2">
                    <div className="font-medium line-clamp-2">{relatedProduct.name}</div>
                    <div className="mt-1 font-bold text-sm">{relatedProduct.price.toLocaleString()}원</div>
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
