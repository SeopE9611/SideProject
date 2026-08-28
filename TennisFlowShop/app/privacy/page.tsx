import SiteContainer from "@/components/layout/SiteContainer";
import { PublicSurface } from "@/components/public/PublicSurface";
import {
  ArrowLeft,
  Bell,
  Cookie,
  Eye,
  FileText,
  Lock,
  Mail,
  Phone,
  RefreshCw,
  Shield,
  Users,
} from "lucide-react";
import Link from "next/link";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "개인정보처리방침",
};

export default function PrivacyPage() {
  const privacySections = [
    {
      id: "collected-items",
      title: "1. 수집하는 개인정보 항목",
      icon: FileText,
      content: `도깨비테니스는 회원 가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.

수집항목
- 필수항목: 이름, 생년월일, 로그인ID, 비밀번호, 휴대전화번호, 이메일, 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보
- 선택항목: 주소, 직업, 테니스 경력, 관심 분야, 프로필 사진
- Apps in Toss에서 토스 로그인을 이용하는 경우: 이름, 앱 단위 사용자 식별자(userKey)

개인정보 수집방법
- 웹사이트(회원가입, 게시판, 상담 게시판), 모바일 환경, Apps in Toss 미니앱, 배송 요청
- 생성정보 수집 툴을 통한 수집`,
    },
    {
      id: "collection-method",
      title: "2. 개인정보 수집 방법",
      icon: Eye,
      content: `도깨비테니스는 다음과 같은 방법으로 개인정보를 수집합니다.

- 웹사이트, 모바일 환경, Apps in Toss 미니앱, 상담 게시판, 이메일
- 협력회사로부터의 제공
- 생성정보 수집 툴을 통한 자동 수집

회사는 이용자의 개인정보를 수집할 경우 반드시 사전에 이용자에게 해당 사실을 알리고 동의를 구하고 있습니다. 또한 회사는 이용자의 기본적 인권을 침해할 우려가 있는 민감한 개인정보(인종, 민족, 사상, 신조, 출신지, 정치적 성향, 범죄기록, 건강상태 등)는 수집하지 않습니다.`,
    },
    {
      id: "purpose",
      title: "3. 개인정보의 이용 목적",
      icon: Users,
      content: `도깨비테니스는 수집한 개인정보를 다음의 목적을 위해 활용합니다.

서비스 제공 및 계약 이행
- 회원가입과 로그인, 상품 주문, 결제, 배송, 스트링 교체 서비스, 라켓 구매·대여, 아카데미 신청 및 이용 내역 제공

회원 및 고객 문의 관리
- 본인 확인, 부정 이용 방지, 문의·불만 처리, 주문·신청 상태 안내, 공지사항 전달

서비스 보안 및 안정적인 운영
- 로그인 상태 유지, 요청 위조 및 중복 처리 방지, 오류 확인, 서비스 이용 과정에서 발생하는 보안 기록 관리

도깨비테니스는 현재 맞춤형 광고 또는 광고 목적의 이용자 행동 분석을 위해 개인정보를 이용하지 않습니다. 해당 기능을 도입하는 경우 처리방침을 변경하고 필요한 동의 절차를 마련합니다.`,
    },
    {
      id: "retention",
      title: "4. 개인정보의 보유 및 이용 기간",
      icon: RefreshCw,
      content: `도깨비테니스는 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.

보존 항목: 이름, 로그인ID, 휴대전화번호, 이메일, 서비스 이용 기록
보존 근거: 회원탈퇴 시 부정이용 방지
보존 기간: 회원탈퇴 후 6개월

관련법령에 의한 정보보유 사유
- 계약 또는 청약철회 등에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)
- 대금결제 및 재화 등의 공급에 관한 기록: 5년 (전자상거래 등에서의 소비자보호에 관한 법률)
- 소비자의 불만 또는 분쟁처리에 관한 기록: 3년 (전자상거래 등에서의 소비자보호에 관한 법률)
- 표시/광고에 관한 기록: 6개월 (전자상거래 등에서의 소비자보호에 관한 법률)
- 웹사이트 방문기록: 3개월 (통신비밀보호법)`,
    },
    {
      id: "third-party",
      title: "5. 개인정보 제3자 제공",
      icon: Users,
      content: `도깨비테니스는 원칙적으로 이용자의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서 처리하며, 이용자의 사전 동의 없이는 본래의 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다. 단, 다음의 경우에는 개인정보를 처리할 수 있습니다.

- 이용자가 사전에 제3자 제공 및 공개에 동의한 경우
- 법령 등에 의해 제공이 요구되는 경우
- 서비스의 제공에 관한 계약의 이행을 위하여 필요한 개인정보로서 경제적/기술적인 사유로 통상의 동의를 받는 것이 현저히 곤란한 경우
- 개인을 식별하기에 특정할 수 없는 상태로 가공하여 이용하는 경우

현재 도깨비테니스는 이용자의 개인정보를 제3자에게 제공하고 있지 않습니다. 향후 제3자 제공이 필요한 경우, 이용자에게 사전 동의를 구하고 관련 법령에 따라 처리하겠습니다.`,
    },
    {
      id: "user-rights",
      title: "6. 이용자 권리와 행사 방법",
      icon: Shield,
      content: `이용자는 개인정보주체로서 다음과 같은 권리를 행사할 수 있습니다.

- 개인정보 열람 요구
- 오류 등이 있을 경우 정정 요구
- 삭제 요구
- 처리정지 요구

이용자가 개인정보의 오류에 대한 정정을 요청하신 경우에는 정정을 완료하기 전까지 당해 개인정보를 이용 또는 제공하지 않습니다. 또한 잘못된 개인정보를 제3자에게 이미 제공한 경우에는 정정 처리결과를 제3자에게 지체 없이 통지하여 정정이 이루어지도록 하겠습니다.

이용자의 권리 행사는 개인정보 보호법 시행령 제41조 제1항에 따라 서면, 전자우편, 모사전송(FAX) 등을 통하여 하실 수 있으며, 회사는 이에 대해 지체 없이 조치하겠습니다.

권리 행사는 이용자의 법정대리인이나 위임을 받은 자 등 대리인을 통하여 하실 수도 있습니다. 이 경우 개인정보 보호법 시행규칙 별지 제11호 서식에 따른 위임장을 제출하셔야 합니다.`,
    },
    {
      id: "security",
      title: "7. 개인정보 보호를 위한 기술적/관리적 대책",
      icon: Lock,
      content: `도깨비테니스는 이용자의 개인정보를 취급함에 있어 개인정보가 분실, 도난, 누출, 변조 또는 훼손되지 않도록 안전성 확보를 위하여 다음과 같은 기술적/관리적 대책을 강구하고 있습니다.

기술적 대책
- 이용자의 개인정보는 비밀번호에 의해 보호되며, 파일 및 전송 데이터를 암호화하거나 파일 잠금 기능(Lock)을 사용하여 중요한 데이터는 별도의 보안기능을 통해 보호되고 있습니다.
- 회사는 백신프로그램을 이용하여 컴퓨터 바이러스에 의한 피해를 방지하기 위한 조치를 취하고 있습니다. 백신프로그램은 주기적으로 업데이트되며 갑작스런 바이러스가 출현할 경우 백신이 나오는 즉시 이를 제공함으로써 개인정보가 침해되는 것을 방지하고 있습니다.
- 회사는 암호알고리즘을 이용하여 네트워크 상의 개인정보를 안전하게 전송할 수 있는 보안장치(SSL 또는 SET)를 채택하고 있습니다.
- 해킹 등에 의해 이용자의 개인정보가 유출되는 것을 방지하기 위해, 외부로부터의 침입을 차단하는 장치를 이용하고 있으며, 각 서버마다 침입탐지시스템을 설치하여 24시간 침입을 감시하고 있습니다.

관리적 대책
- 회사는 개인정보의 안전한 처리를 위한 내부관리계획을 수립하고 시행하고 있습니다.
- 회사는 개인정보를 취급하는 직원을 대상으로 새로운 보안 기술 습득 및 개인정보 보호 의무 등에 관해 정기적인 사내 교육과 외부 위탁교육을 실시하고 있습니다.
- 입사 시 개인정보 관련 취급자의 보안서약서를 통하여 사람에 의한 정보유출을 사전에 방지하고 개인정보보호 정책에 대한 이행사항 및 직원의 준수여부를 감사하기 위한 내부절차를 마련하고 있습니다.
- 개인정보 관련 취급자의 업무 인수인계는 보안이 유지된 상태에서 철저하게 이뤄지고 있으며 입사 및 퇴사 후 개인정보 사고에 대한 책임을 명확화하고 있습니다.`,
    },
    {
      id: "cookies",
      title: "8. 쿠키 및 브라우저 저장 기술의 운영",
      icon: Cookie,
      content: `도깨비테니스는 서비스 제공과 이용 편의를 위해 쿠키, 로컬 스토리지(localStorage), 세션 스토리지(sessionStorage)를 사용합니다. 현재 맞춤형 광고나 광고 목적의 이용자 행동 추적 도구는 사용하지 않습니다.

쿠키 사용 항목과 목적
- 로그인 인증 및 갱신: 로그인 상태 유지와 사용자 인증
- 보안: 요청 위조 방지, 소셜 로그인 상태 검증, 관리자 요청 보호
- 비회원 주문·신청 접근: 비회원이 본인의 주문 또는 신청 결과를 확인할 수 있도록 접근 권한 유지
- 게시판 조회 처리: 비로그인 사용자의 중복 조회 방지

로컬 스토리지 사용 항목과 목적
- 장바구니 상품과 수량 유지
- 최근 본 상품·라켓 목록 유지
- 이용자가 직접 선택한 이메일 저장 기능
- 회원가입 혜택 안내 팝업의 닫기 상태 유지
- 게시글 중복 조회 방지를 위한 브라우저 상태 유지

세션 스토리지 사용 항목과 목적
- 결제·주문·대여 요청의 중복 처리 방지
- 결제 및 신청 단계에서 선택한 상품과 화면 상태 유지
- 라켓 찾기와 비교 화면 상태 유지
- 결제·대여 완료 화면에 필요한 일시적인 정보 전달

보관 및 삭제
- 쿠키의 보관 기간은 쿠키별 설정에 따라 다르며, 로그아웃 또는 보관 기간 만료 시 삭제될 수 있습니다.
- 세션 스토리지 정보는 일반적으로 브라우저 탭 또는 창을 닫으면 삭제됩니다.
- 로컬 스토리지 정보는 이용자가 삭제하거나 사이트 기능이 초기화할 때까지 브라우저에 남을 수 있습니다.

거부 및 삭제 방법
- Chrome, Edge, Safari, Whale 등 브라우저의 개인정보 또는 사이트 데이터 설정에서 도깨비테니스의 쿠키와 저장 데이터를 확인하거나 삭제할 수 있습니다.
- 쿠키 또는 저장 데이터를 차단·삭제하면 로그인 유지, 장바구니, 최근 본 상품, 결제·신청 진행 상태 등 일부 기능이 정상적으로 동작하지 않을 수 있습니다.`,
    },
    {
      id: "changes",
      title: "9. 개인정보처리방침 변경",
      icon: Bell,
      content: `이 개인정보처리방침은 2026년 8월 28일부터 적용됩니다.

법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 시에는 변경사항의 시행 7일 전부터 홈페이지의 공지사항을 통하여 고지할 것입니다.

개인정보처리방침 변경 이력
- 2026년 8월 28일: 쿠키 및 브라우저 저장 기술의 실제 사용 목적 반영, 맞춤형 광고 관련 미사용 내용 정정
- 2026년 8월 8일: 서비스 제공 환경 및 Apps in Toss 토스 로그인 처리 항목 반영
- 2025년 10월 14일: 개인정보처리방침 개정
- 2023년 12월 1일: 개인정보처리방침 제정`,
    },
    {
      id: "contact",
      title: "10. 개인정보 보호책임자 및 연락처",
      icon: Mail,
      content: `도깨비테니스는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

책임자
- 성명: 윤형섭
- 직책: 개발자
- 연락처: baxteryhs1118@gmail.com


기타 개인정보침해에 대한 신고나 상담이 필요하신 경우에는 아래 기관에 문의하시기 바랍니다.
- 개인정보침해신고센터 (privacy.kisa.or.kr / 국번없이 118)
- 대검찰청 사이버수사과 (www.spo.go.kr / 국번없이 1301)
- 경찰청 사이버안전국 (www.police.go.kr/www/security/cyber.jsp / 국번없이 182)`,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card/30">
        <SiteContainer className="max-w-4xl bp-lg:max-w-4xl py-8 md:py-10">
          <Link
            href="/"
            className="mb-6 inline-flex items-center text-ui-label text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로 돌아가기
          </Link>

          <div className="space-y-3">
            <h1 className="break-keep text-ui-page-title font-semibold tracking-tight bp-sm:text-ui-page-title-lg">
              개인정보처리방침
            </h1>
            <p className="max-w-3xl break-keep text-muted-foreground leading-relaxed">
              도깨비테니스(이하 '회사')는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을
              준수하기 위하여 노력하고 있습니다.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-ui-label text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              <span>최종 업데이트: 2026년 8월 9일</span>
            </div>
          </div>
        </SiteContainer>
      </div>

      <SiteContainer className="max-w-4xl bp-lg:max-w-4xl py-8 md:py-12">
        <div className="space-y-6 md:space-y-8">
          {/* Introduction */}
          <PublicSurface className="space-y-4">
            <p className="break-keep text-foreground/80 leading-relaxed">
              회사는 개인정보처리방침을 통하여 회사가 이용자로부터 수집하는 개인정보의 항목,
              개인정보의 수집 및 이용목적, 개인정보의 보유 및 이용기간, 개인정보의 제3자 제공 및
              취급위탁에 관한 사항을 알려드립니다.
            </p>
            <p className="break-keep text-foreground/80 leading-relaxed">
              본 개인정보처리방침은 관련 법령 및 지침의 변경이나 회사의 내부 방침 변경 등으로 인하여
              변경될 수 있으며, 변경 시에는 회사 홈페이지를 통하여 공지하도록 하겠습니다.
            </p>
          </PublicSurface>

          {/* Privacy Sections */}
          {privacySections.map((section) => {
            const Icon = section.icon;
            return (
              <PublicSurface key={section.id} id={section.id} className="scroll-mt-20 space-y-4">
                <div className="flex items-start gap-3">
                  <Icon className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
                  <h2 className="break-keep text-ui-card-title-lg font-semibold tracking-tight">
                    {section.title}
                  </h2>
                </div>
                <div className="min-w-0 md:pl-8">
                  <div className="whitespace-pre-line break-keep break-words text-foreground/80 leading-relaxed">
                    {section.content}
                  </div>
                </div>
              </PublicSurface>
            );
          })}

          {/* Contact Information */}
          <PublicSurface variant="muted" className="space-y-4">
            <div className="flex items-start gap-3">
              <Phone className="mt-1 h-5 w-5 flex-shrink-0 text-primary" />
              <h2 className="break-keep text-ui-card-title-lg font-semibold tracking-tight">
                개인정보 관련 문의
              </h2>
            </div>
            <div className="min-w-0 space-y-3 md:pl-8">
              <p className="break-keep text-foreground/80 leading-relaxed">
                개인정보 보호 관련 문의사항이 있으시면 개인정보 보호책임자에게 연락해 주시기
                바랍니다. 회사는 이용자의 개인정보를 보호하기 위해 최선을 다하겠습니다.
              </p>
              <p className="break-keep text-foreground/80">
                더 자세한 문의는{" "}
                <Link href="/board/qna/write" className="text-primary hover:underline">
                  고객센터
                </Link>
                를 통해 문의해 주시기 바랍니다.
              </p>
            </div>
          </PublicSurface>
        </div>
      </SiteContainer>

      <div className="mt-10 border-t">
        <SiteContainer className="max-w-4xl bp-lg:max-w-4xl py-8 md:py-10">
          <div className="flex flex-col items-start justify-between gap-4 text-ui-label text-muted-foreground sm:flex-row sm:items-center">
            <p>&copy; {new Date().getFullYear()} 도깨비테니스. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link href="/terms" className="hover:text-foreground transition-colors">
                이용약관
              </Link>
              <span>·</span>
              <Link href="/privacy" className="text-foreground">
                개인정보처리방침
              </Link>
            </div>
          </div>
        </SiteContainer>
      </div>
    </div>
  );
}
