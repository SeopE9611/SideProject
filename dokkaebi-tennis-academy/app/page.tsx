import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardFooter, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

export default function Home() {
  // 임시 상품 데이터
  const featuredProducts = [
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
  ]

  // 카테고리 데이터
  const categories = [
    { name: "멀티필라멘트", icon: "🧵", href: "/products/multifilament" },
    { name: "폴리에스터", icon: "🔄", href: "/products/polyester" },
    { name: "나일론", icon: "🧶", href: "/products/nylon" },
    { name: "하이브리드", icon: "🔀", href: "/products/hybrid" },
  ]

  // 공지사항 데이터
  const notices = [
    { id: 1, title: "5월 스트링 할인 이벤트", date: "2023-05-01" },
    { id: 2, title: "여름 아카데미 회원 모집", date: "2023-05-10" },
    { id: 3, title: "신규 스트링 입고 안내", date: "2023-05-15" },
  ]

  return (
    <div className="flex flex-col gap-10 py-6">
      {/* 메인 배너 */}
      <section className="relative">
        <div className="container">
          <div className="relative overflow-hidden rounded-lg">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/80 to-primary/20" />
            <Image
              src="/placeholder.svg?height=500&width=1200"
              alt="메인 배너"
              width={1200}
              height={500}
              className="h-[300px] sm:h-[400px] w-full object-cover"
            />
            <div className="absolute inset-0 flex flex-col justify-center p-6 sm:p-10">
              <h1 className="max-w-xl text-3xl font-bold tracking-tight text-white sm:text-5xl">
                최고의 테니스 스트링으로
                <br />
                최상의 경기력을
              </h1>
              <p className="mt-4 max-w-md text-white">
                도깨비 테니스 아카데미에서 당신의 플레이 스타일에 맞는 최적의 스트링을 찾아보세요.
              </p>
              <div className="mt-6 flex gap-4">
                <Button asChild size="lg">
                  <Link href="/products">스트링 쇼핑하기</Link>
                </Button>
                <Button asChild variant="outline" className="bg-white/20 text-white hover:bg-white/30">
                  <Link href="/services">장착 서비스 예약</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 카테고리 버튼 */}
      <section className="container">
        <h2 className="mb-6 text-2xl font-bold">스트링 카테고리</h2>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {categories.map((category) => (
            <Link key={category.name} href={category.href}>
              <Button variant="outline" className="h-24 w-full flex flex-col items-center justify-center gap-2 text-lg">
                <span className="text-2xl">{category.icon}</span>
                {category.name}
              </Button>
            </Link>
          ))}
        </div>
      </section>

      {/* 추천 상품 섹션 */}
      <section className="container">
        <Tabs defaultValue="popular" className="w-full">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">추천 상품</h2>
            <TabsList>
              <TabsTrigger value="popular">인기 상품</TabsTrigger>
              <TabsTrigger value="new">신상품</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="popular" className="mt-0">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts.map((product) => (
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
          </TabsContent>

          <TabsContent value="new" className="mt-0">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {featuredProducts
                .filter((product) => product.isNew)
                .map((product) => (
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
                        <Badge className="absolute right-2 top-2">NEW</Badge>
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
          </TabsContent>
        </Tabs>
      </section>

      {/* 게시판 바로가기 */}
      <section className="container">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">공지사항</h3>
              <ul className="space-y-3">
                {notices.map((notice) => (
                  <li key={notice.id} className="flex justify-between items-center">
                    <Link href={`/board/notice/${notice.id}`} className="hover:underline">
                      {notice.title}
                    </Link>
                    <span className="text-sm text-muted-foreground">{notice.date}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-4 text-right">
                <Button asChild variant="ghost" size="sm">
                  <Link href="/board/notice">더보기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <h3 className="text-xl font-bold mb-4">아카데미 소개</h3>
              <p className="mb-4">
                도깨비 테니스 아카데미는 초보부터 프로까지 모든 레벨의 테니스 선수들을 위한 전문 교육 프로그램을
                제공합니다.
              </p>
              <Image
                src="/placeholder.svg?height=150&width=300"
                alt="아카데미 이미지"
                width={300}
                height={150}
                className="rounded-md mb-4 w-full h-32 object-cover"
              />
              <div className="text-right">
                <Button asChild>
                  <Link href="/academy">아카데미 신청하기</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>
    </div>
  )
}
