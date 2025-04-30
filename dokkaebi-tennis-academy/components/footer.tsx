import Link from "next/link"

const Footer = () => {
  return (
    <footer className="w-full border-t border-[#e2e8f0] bg-[#ffffff] dark:border-[#1e293b] dark:bg-[#0f172a]">
      <div className="container py-10">
        <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 md:grid-cols-4">
          <div>
            <h3 className="text-lg font-semibold">도깨비 테니스 아카데미</h3>
            <p className="mt-2 text-sm text-[#64748b] dark:text-[#94a3b8]">최고의 테니스 스트링과 장비를 제공합니다.</p>
          </div>
          <div>
            <h3 className="text-lg font-semibold">바로가기</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link
                  href="/products"
                  className="text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-[#f8fafc]"
                >
                  스트링 쇼핑
                </Link>
              </li>
              <li>
                <Link
                  href="/services"
                  className="text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-[#f8fafc]"
                >
                  장착 서비스
                </Link>
              </li>
              <li>
                <Link
                  href="/academy"
                  className="text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-[#f8fafc]"
                >
                  아카데미 신청
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">고객센터</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li>
                <Link
                  href="/board/notice"
                  className="text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-[#f8fafc]"
                >
                  공지사항
                </Link>
              </li>
              <li>
                <Link
                  href="/board/qna"
                  className="text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-[#f8fafc]"
                >
                  Q&A
                </Link>
              </li>
              <li>
                <Link
                  href="/mypage"
                  className="text-[#64748b] hover:text-[#0f172a] dark:text-[#94a3b8] dark:hover:text-[#f8fafc]"
                >
                  마이페이지
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="text-lg font-semibold">연락처</h3>
            <ul className="mt-2 space-y-2 text-sm">
              <li className="text-[#64748b] dark:text-[#94a3b8]">전화: 02-123-4567</li>
              <li className="text-[#64748b] dark:text-[#94a3b8]">이메일: info@dokkaebi-tennis.com</li>
              <li className="text-[#64748b] dark:text-[#94a3b8]">주소: 서울시 강남구 테니스로 123</li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-[#e2e8f0] pt-6 text-center text-sm text-[#64748b] dark:border-[#1e293b] dark:text-[#94a3b8]">
          &copy; {new Date().getFullYear()} 도깨비 테니스 아카데미. All rights reserved.
        </div>
      </div>
    </footer>
  )
}

export default Footer
