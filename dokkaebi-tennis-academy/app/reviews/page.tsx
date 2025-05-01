import { Star } from "lucide-react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function ReviewsPage() {
  // 아카데미 레슨 후기 데이터
  const academyReviews = [
    {
      id: 1,
      author: "김민준",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5,
      content:
        "처음 테니스를 배우는 초보자였는데, 김도깨비 코치님의 체계적인 지도 덕분에 빠르게 실력이 향상되었습니다. 기초부터 차근차근 알려주셔서 테니스의 재미를 느낄 수 있었어요!",
      date: "2023-05-15",
      program: "성인반",
    },
    {
      id: 2,
      author: "이서연",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5,
      content:
        "주니어반에서 아이가 테니스를 배우고 있는데, 아이의 성향과 체력에 맞춰 지도해주셔서 정말 감사합니다. 무엇보다 테니스를 즐기면서 배울 수 있도록 해주신 점이 가장 좋았습니다.",
      date: "2023-06-02",
      program: "주니어반",
    },
    {
      id: 3,
      author: "박지훈",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 4,
      content:
        "주말 집중반을 통해 테니스를 배우고 있습니다. 평일에는 시간이 없어 주말에만 배울 수 있는데, 3시간 동안 집중적으로 배울 수 있어 효율적입니다. 다만 조금 더 개인 피드백이 있으면 좋겠어요.",
      date: "2023-04-22",
      program: "주말 집중반",
    },
    {
      id: 4,
      author: "최예은",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5,
      content:
        "테니스를 치면서 자세가 잘못되어 어깨 통증이 있었는데, 박테니스 코치님께서 올바른 자세와 스윙 방법을 알려주셔서 통증 없이 테니스를 즐길 수 있게 되었습니다. 건강하게 테니스를 즐길 수 있어 정말 감사합니다!",
      date: "2023-07-10",
      program: "성인반",
    },
    {
      id: 5,
      author: "정현우",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5,
      content:
        "동호회 대회를 앞두고 집중 레슨을 받았는데, 경기 운영과 전략에 대한 조언이 정말 도움이 되었습니다. 덕분에 대회에서 좋은 성적을 거둘 수 있었어요. 이에이스 코치님 감사합니다!",
      date: "2023-03-18",
      program: "성인반",
    },
    {
      id: 6,
      author: "한소율",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 4,
      content:
        "아이가 주니어반에서 6개월째 레슨을 받고 있는데, 테니스 실력뿐만 아니라 인성 교육까지 신경써주셔서 감사합니다. 체력도 좋아지고 자신감도 생겨서 정말 만족스럽습니다.",
      date: "2023-05-30",
      program: "주니어반",
    },
  ]

  // 스트링 장착 서비스 후기 데이터
  const stringServiceReviews = [
    {
      id: 1,
      author: "김테니스",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5,
      content:
        "프로 수준의 정확한 장력과 세심한 작업으로 스트링 장착해주셔서 경기력이 크게 향상되었습니다. 특히 스핀이 잘 걸리는 스트링 추천에 매우 만족합니다.",
      date: "2023-06-15",
      service: "스트링 장착 (스트링 포함)",
    },
    {
      id: 2,
      author: "박초보",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5,
      content:
        "테니스를 시작한 지 얼마 안 된 초보자였는데, 친절하게 스트링과 장력에 대해 상세히 설명해주셨어요. 덕분에 테니스에 더 재미를 붙이게 되었습니다!",
      date: "2023-05-22",
      service: "스트링 장착 (스트링 포함)",
    },
    {
      id: 3,
      author: "이프로",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5,
      content:
        "하이브리드 조합을 추천받아 사용해봤는데, 정말 제 플레이 스타일에 딱 맞았습니다. 장착 후 실력이 눈에 띄게 향상되어 대회에서도 좋은 성적을 거둘 수 있었습니다.",
      date: "2023-04-10",
      service: "하이브리드 장착",
    },
    {
      id: 4,
      author: "최라켓",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 4,
      content:
        "급행 서비스를 이용했는데, 약속 시간보다 더 빨리 완료해주셨어요. 장력도 정확하게 맞춰주셔서 만족스럽습니다. 다음에도 이용할 예정입니다.",
      date: "2023-07-05",
      service: "급행 서비스",
    },
    {
      id: 5,
      author: "정스트링",
      avatar: "/placeholder.svg?height=40&width=40",
      rating: 5,
      content:
        "여러 테니스샵을 다녀봤지만, 도깨비 테니스 아카데미의 스트링 장착 서비스가 가장 정확하고 세심합니다. 특히 장력 추천 서비스가 정말 유용했어요.",
      date: "2023-03-28",
      service: "스트링 장착 (스트링 미포함)",
    },
  ]

  // 별점 렌더링 함수
  const renderStars = (rating: number) => {
    return (
      <div className="flex">
        {[...Array(5)].map((_, i) => (
          <Star
            key={i}
            className={`h-4 w-4 ${i < rating ? "fill-[#fbbf24] text-[#fbbf24]" : "fill-muted text-muted-foreground"}`}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="container py-8">
      <h1 className="text-3xl font-bold mb-2">고객 후기</h1>
      <p className="text-muted-foreground mb-8">도깨비 테니스 아카데미의 서비스를 경험한 고객들의 생생한 후기입니다.</p>

      {/* 아카데미 레슨 후기 섹션 */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-[#3b82f6] h-8 w-1 rounded-full"></div>
          <h2 className="text-2xl font-bold">아카데미 레슨 후기</h2>
        </div>
        <p className="text-muted-foreground mb-8">도깨비 아카데미 수강생들의 생생한 후기를 확인해보세요.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {academyReviews.map((review) => (
            <Card key={review.id} className="h-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={review.avatar || "/placeholder.svg"} alt={review.author} />
                      <AvatarFallback>{review.author[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{review.author}</div>
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <Badge variant="outline">{review.program}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{review.content}</p>
                <div className="text-xs text-muted-foreground">{review.date}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <Separator className="my-12" />

      {/* 스트링 장착 서비스 후기 섹션 */}
      <section className="mb-16">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-[#ef4444] h-8 w-1 rounded-full"></div>
          <h2 className="text-2xl font-bold">스트링 장착 서비스 후기</h2>
        </div>
        <p className="text-muted-foreground mb-8">정밀한 스트링 작업을 받은 고객들의 리뷰입니다.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {stringServiceReviews.map((review) => (
            <Card key={review.id} className="h-full">
              <CardHeader className="pb-2">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <Avatar>
                      <AvatarImage src={review.avatar || "/placeholder.svg"} alt={review.author} />
                      <AvatarFallback>{review.author[0]}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{review.author}</div>
                      {renderStars(review.rating)}
                    </div>
                  </div>
                  <Badge variant="outline">{review.service}</Badge>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm mb-4">{review.content}</p>
                <div className="text-xs text-muted-foreground">{review.date}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </div>
  )
}
