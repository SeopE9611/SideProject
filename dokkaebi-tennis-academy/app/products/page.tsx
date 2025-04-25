import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Slider } from "@/components/ui/slider"

export default function ProductsPage() {
  // 임시 상품 데이터
  const products = [
    {
      id: 1,
      name: "루키론 프로 스트링",
      price: 25000,
      image: "/placeholder.svg?height=200&width=200",
      brand: "루키론",
      features: ["반발력 ★★★★☆", "내구성 ★★★★★", "스핀 ★★★☆☆"],
      isNew: true,
    },
    {
      id: 2,
      name: "테크니파이버 블랙코드",
      price: 32000,
      image: "/placeholder.svg?height=200&width=200",
      brand: "테크니파이버",
      features: ["반발력 ★★★★★", "내구성 ★★★☆☆", "스핀 ★★★★☆"],
      isNew: false,
    },
    {
      id: 3,
      name: "윌슨 NXT 파워",
      price: 28000,
      image: "/placeholder.svg?height=200&width=200",
      brand: "윌슨",
      features: ["반발력 ★★★★★", "내구성 ★★★☆☆", "스핀 ★★★☆☆"],
      isNew: false,
    },
    {
      id: 4,
      name: "바볼랏 RPM 블라스트",
      price: 30000,
      image: "/placeholder.svg?height=200&width=200",
      brand: "바볼랏",
      features: ["반발력 ★★★☆☆", "내구성 ★★★★☆", "스핀 ★★★★★"],
      isNew: true,
    },
    {
      id: 5,
      name: "헤드 링키 스트링",
      price: 22000,
      image: "/placeholder.svg?height=200&width=200",
      brand: "헤드",
      features: ["반발력 ★★★★☆", "내구성 ★★★☆☆", "스핀 ★★★★☆"],
      isNew: false,
    },
    {
      id: 6,
      name: "요넥스 폴리투어 프로",
      price: 35000,
      image: "/placeholder.svg?height=200&width=200",
      brand: "요넥스",
      features: ["반발력 ★★★☆☆", "내구성 ★★★★★", "스핀 ★★★★★"],
      isNew: true,
    },
    {
      id: 7,
      name: "소링크 투어바이트",
      price: 27000,
      image: "/placeholder.svg?height=200&width=200",
      brand: "소링크",
      features: ["반발력 ★★★★☆", "내구성 ★★★★☆", "스핀 ★★★★☆"],
      isNew: false,
    },
    {
      id: 8,
      name: "던롭 익스플로전",
      price: 26000,
      image: "/placeholder.svg?height=200&width=200",
      brand: "던롭",
      features: ["반발력 ★★★★★", "내구성 ★★★☆☆", "스핀 ★★★★☆"],
      isNew: false,
    },
  ]

  // 브랜드 필터 옵션
  const brands = ["루키론", "테크니파이버", "윌슨", "바볼랏", "헤드", "요넥스", "소링크", "던롭"]

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-8">스트링 상품 목록</h1>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
        {/* 필터 사이드바 */}
        <div className="space-y-6 lg:col-span-1">
          <div className="rounded-lg border p-4">
            <h2 className="font-semibold text-lg mb-4">필터</h2>

            {/* 검색 */}
            <div className="mb-6">
              <Label htmlFor="search" className="mb-2 block">
                검색
              </Label>
              <Input id="search" placeholder="상품명 검색..." />
            </div>

            {/* 가격 범위 */}
            <div className="mb-6">
              <Label className="mb-2 block">가격 범위</Label>
              <div className="space-y-4">
                <Slider defaultValue={[0, 50000]} min={0} max={50000} step={1000} />
                <div className="flex items-center justify-between">
                  <span>₩0</span>
                  <span>₩50,000</span>
                </div>
              </div>
            </div>

            {/* 브랜드 필터 */}
            <div className="mb-6">
              <Label htmlFor="brand" className="mb-2 block">
                브랜드
              </Label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="브랜드 선택" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">전체</SelectItem>
                  {brands.map((brand) => (
                    <SelectItem key={brand} value={brand.toLowerCase()}>
                      {brand}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* 성능 필터 */}
            <div className="space-y-4">
              <h3 className="font-medium">성능</h3>

              <div>
                <Label className="mb-2 block text-sm">반발력</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">★★★★★</SelectItem>
                    <SelectItem value="4">★★★★☆ 이상</SelectItem>
                    <SelectItem value="3">★★★☆☆ 이상</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block text-sm">내구성</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">★★★★★</SelectItem>
                    <SelectItem value="4">★★★★☆ 이상</SelectItem>
                    <SelectItem value="3">★★★☆☆ 이상</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="mb-2 block text-sm">스핀 성능</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="선택" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="5">★★★★★</SelectItem>
                    <SelectItem value="4">★★★★☆ 이상</SelectItem>
                    <SelectItem value="3">★★★☆☆ 이상</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button className="w-full mt-6">필터 적용</Button>
          </div>
        </div>

        {/* 상품 목록 */}
        <div className="lg:col-span-3">
          <div className="flex items-center justify-between mb-6">
            <div>
              <span className="text-muted-foreground">총 {products.length}개 상품</span>
            </div>
            <Select defaultValue="latest">
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="정렬 기준" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="latest">최신순</SelectItem>
                <SelectItem value="popular">인기순</SelectItem>
                <SelectItem value="price-low">가격 낮은순</SelectItem>
                <SelectItem value="price-high">가격 높은순</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <Link key={product.id} href={`/products/${product.id}`}>
                <Card className="h-full overflow-hidden transition-all hover:shadow-md">
                  <div className="relative">
                    <Image
                      src={product.image || "/placeholder.svg"}
                      alt={product.name}
                      width={200}
                      height={200}
                      className="h-48 w-full object-cover"
                    />
                    {product.isNew && <Badge className="absolute right-2 top-2">NEW</Badge>}
                  </div>
                  <CardContent className="p-4">
                    <div className="text-sm text-muted-foreground mb-1">{product.brand}</div>
                    <CardTitle className="text-base">{product.name}</CardTitle>
                    <div className="mt-2 text-sm space-y-1">
                      {product.features.map((feature, index) => (
                        <div key={index}>{feature}</div>
                      ))}
                    </div>
                  </CardContent>
                  <CardFooter className="p-4 pt-0 flex justify-between items-center">
                    <div className="font-bold">{product.price.toLocaleString()}원</div>
                    <Button variant="secondary" size="sm">
                      상세보기
                    </Button>
                  </CardFooter>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
