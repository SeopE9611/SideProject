import Link from "next/link"
import { Home, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <div className="container flex min-h-[calc(100vh-200px)] items-center justify-center py-20">
      <div className="mx-auto max-w-md text-center space-y-8">

        {/* 404 숫자 */}
        <div>
          <h1 className="text-8xl font-extrabold text-primary">404</h1>
        </div>

        {/* 제목 */}
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold">페이지를 찾을 수 없습니다.</h2>
        </div>

        {/* 설명 문구 */}
        <div className="space-y-2">
          <p className="text-base text-muted-foreground">
            요청하신 페이지가 존재하지 않거나, 이동되었을 수 있습니다.
          </p>
          <p className="text-sm text-muted-foreground/80">
            찾으시는 페이지가 있다면 홈으로 돌아가서 다시 시도해보세요.
          </p>
        </div>

        {/* 버튼들 */}
        <div className="w-full flex flex-col sm:flex-row gap-4">
          <Button className="flex-1" asChild>
            <Link href="/">
              <Home className="mr-2 h-4 w-4" />
              홈으로 돌아가기
            </Link>
          </Button>
          <Button variant="outline" className="flex-1" asChild>
            <Link href="/board/qna/write">
              문의하기
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

      </div>
    </div>
  )
}
