import { Loader2 } from "lucide-react"

export default function ReviewDetailLoading() {
  return (
    <div className="flex h-[80vh] flex-col items-center justify-center">
      <div className="flex flex-col items-center space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-[#3b82f6]" />
        <p className="text-lg font-medium text-[#64748b]">리뷰 정보를 불러오는 중입니다...</p>
      </div>
    </div>
  )
}
