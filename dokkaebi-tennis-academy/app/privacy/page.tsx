import Link from 'next/link';
import { ArrowLeft, Shield, Eye, Lock, Users, FileText, Bell, Cookie, RefreshCw, Mail, Phone } from 'lucide-react';

export default function PrivacyPage() {
  const privacySections = [
    {
      id: 'collected-items',
      title: '1. 수집하는 개인정보 항목',
      icon: FileText,
      content: `도깨비 테니스 아카데미는 회원 가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.

수집항목
- 필수항목: 이름, 생년월일, 로그인ID, 비밀번호, 휴대전화번호, 이메일, 서비스 이용 기록, 접속 로그, 쿠키, 접속 IP 정보
- 선택항목: 주소, 직업, 테니스 경력, 관심 분야, 프로필 사진

개인정보 수집방법
- 홈페이지(회원가입, 게시판, 상담 게시판), 전화/팩스를 통한 회원가입, 경품 행사 응모, 배송 요청
- 생성정보 수집 툴을 통한 수집`,
    },
    {
      id: 'collection-method',
      title: '2. 개인정보 수집 방법',
      icon: Eye,
      content: `도깨비 테니스 아카데미는 다음과 같은 방법으로 개인정보를 수집합니다.

- 홈페이지, 모바일 애플리케이션, 서면양식, 팩스, 전화, 상담 게시판, 이메일, 이벤트 응모
- 협력회사로부터의 제공
- 생성정보 수집 툴을 통한 자동 수집

회사는 이용자의 개인정보를 수집할 경우 반드시 사전에 이용자에게 해당 사실을 알리고 동의를 구하고 있습니다. 또한 회사는 이용자의 기본적 인권을 침해할 우려가 있는 민감한 개인정보(인종, 민족, 사상, 신조, 출신지, 정치적 성향, 범죄기록, 건강상태 등)는 수집하지 않습니다.`,
    },
    {
      id: 'purpose',
      title: '3. 개인정보의 이용 목적',
      icon: Users,
      content: `도깨비 테니스 아카데미는 수집한 개인정보를 다음의 목적을 위해 활용합니다.

서비스 제공에 관한 계약 이행 및 서비스 제공에 따른 요금정산
- 콘텐츠 제공, 테니스 레슨 예약 및 관리, 물품배송 또는 청구서 등 발송, 본인인증, 구매 및 요금 결제, 요금추심

회원 관리
- 회원제 서비스 이용에 따른 본인확인, 개인식별, 불량회원의 부정 이용 방지와 비인가 사용 방지, 가입 의사 확인, 연령확인, 불만처리 등 민원처리, 고지사항 전달

마케팅 및 광고에 활용
- 신규 서비스(제품) 개발 및 특화, 이벤트 등 광고성 정보 전달, 인구통계학적 특성에 따른 서비스 제공 및 광고 게재, 접속 빈도 파악 또는 회원의 서비스 이용에 대한 통계`,
    },
    {
      id: 'retention',
      title: '4. 개인정보의 보유 및 이용 기간',
      icon: RefreshCw,
      content: `도깨비 테니스 아카데미는 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다.

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
      id: 'third-party',
      title: '5. 개인정보 제3자 제공',
      icon: Users,
      content: `도깨비 테니스 아카데미는 원칙적으로 이용자의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서 처리하며, 이용자의 사전 동의 없이는 본래의 범위를 초과하여 처리하거나 제3자에게 제공하지 않습니다. 단, 다음의 경우에는 개인정보를 처리할 수 있습니다.

- 이용자가 사전에 제3자 제공 및 공개에 동의한 경우
- 법령 등에 의해 제공이 요구되는 경우
- 서비스의 제공에 관한 계약의 이행을 위하여 필요한 개인정보로서 경제적/기술적인 사유로 통상의 동의를 받는 것이 현저히 곤란한 경우
- 개인을 식별하기에 특정할 수 없는 상태로 가공하여 이용하는 경우

현재 도깨비 테니스 아카데미는 이용자의 개인정보를 제3자에게 제공하고 있지 않습니다. 향후 제3자 제공이 필요한 경우, 이용자에게 사전 동의를 구하고 관련 법령에 따라 처리하겠습니다.`,
    },
    {
      id: 'user-rights',
      title: '6. 이용자 권리와 행사 방법',
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
      id: 'security',
      title: '7. 개인정보 보호를 위한 기술적/관리적 대책',
      icon: Lock,
      content: `도깨비 테니스 아카데미는 이용자의 개인정보를 취급함에 있어 개인정보가 분실, 도난, 누출, 변조 또는 훼손되지 않도록 안전성 확보를 위하여 다음과 같은 기술적/관리적 대책을 강구하고 있습니다.

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
      id: 'cookies',
      title: '8. 쿠키(Cookie)의 운영 및 활용',
      icon: Cookie,
      content: `도깨비 테니스 아카데미는 이용자에게 개인화되고 맞춤화된 서비스를 제공하기 위해 쿠키(cookie)를 사용합니다.

쿠키란?
- 웹사이트를 운영하는데 이용되는 서버가 이용자의 브라우저에 보내는 아주 작은 텍스트 파일로, 이용자 컴퓨터의 하드디스크에 저장됩니다.

쿠키의 사용 목적
- 회원과 비회원의 접속 빈도나 방문 시간 등을 분석, 이용자의 취향과 관심분야를 파악
- 각종 이벤트 참여 정도 및 방문 회수 파악을 통한 타겟 마케팅 및 개인 맞춤 서비스 제공

쿠키 설정 거부 방법
- 이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 따라서 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 아니면 모든 쿠키의 저장을 거부할 수도 있습니다.
- 다만, 쿠키 설치를 거부할 경우 웹 사용이 불편해지며 로그인이 필요한 일부 서비스 이용에 어려움이 있을 수 있습니다.

설정 방법 (인터넷 익스플로러의 경우)
- 웹 브라우저 상단의 도구 > 인터넷 옵션 > 개인정보 > 사이트 차단`,
    },
    {
      id: 'changes',
      title: '9. 개인정보처리방침 변경',
      icon: Bell,
      content: `이 개인정보처리방침은 2025년 10월 14일부터 적용됩니다.

법령, 정책 또는 보안기술의 변경에 따라 내용의 추가, 삭제 및 수정이 있을 시에는 변경사항의 시행 7일 전부터 홈페이지의 공지사항을 통하여 고지할 것입니다.

개인정보처리방침 변경 이력
- 2025년 10월 14일: 개인정보처리방침 개정
- 2023년 12월 1일: 개인정보처리방침 제정`,
    },
    {
      id: 'contact',
      title: '10. 개인정보 보호책임자 및 연락처',
      icon: Mail,
      content: `도깨비 테니스 아카데미는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

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
      <div className="border-b">
        <div className="container py-8 max-w-5xl">
          <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground transition-colors mb-8">
            <ArrowLeft className="mr-2 h-4 w-4" />
            홈으로 돌아가기
          </Link>

          <div className="space-y-4">
            <h1 className="text-4xl font-bold tracking-tight">개인정보처리방침</h1>
            <p className="text-muted-foreground max-w-3xl leading-relaxed">도깨비 테니스 아카데미(이하 '회사')는 이용자의 개인정보를 중요시하며, 「개인정보 보호법」을 준수하기 위하여 노력하고 있습니다.</p>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4" />
              <span>최종 업데이트: 2025년 10월 14일</span>
            </div>
          </div>
        </div>
      </div>

      <div className="container py-12 max-w-5xl">
        <div className="space-y-12">
          {/* Introduction */}
          <div className="space-y-4">
            <p className="text-foreground/80 leading-relaxed">
              회사는 개인정보처리방침을 통하여 회사가 이용자로부터 수집하는 개인정보의 항목, 개인정보의 수집 및 이용목적, 개인정보의 보유 및 이용기간, 개인정보의 제3자 제공 및 취급위탁에 관한 사항을 알려드립니다.
            </p>
            <p className="text-foreground/80 leading-relaxed">본 개인정보처리방침은 관련 법령 및 지침의 변경이나 회사의 내부 방침 변경 등으로 인하여 변경될 수 있으며, 변경 시에는 회사 홈페이지를 통하여 공지하도록 하겠습니다.</p>
          </div>

          {/* Privacy Sections */}
          {privacySections.map((section) => {
            const Icon = section.icon;
            return (
              <div key={section.id} id={section.id} className="scroll-mt-20 space-y-4">
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-primary flex-shrink-0" />
                  <h2 className="text-2xl font-semibold">{section.title}</h2>
                </div>
                <div className="pl-8">
                  <div className="whitespace-pre-line text-foreground/80 leading-relaxed">{section.content}</div>
                </div>
              </div>
            );
          })}

          {/* Contact Information */}
          <div className="pt-8 border-t space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="h-5 w-5 text-primary flex-shrink-0" />
              <h2 className="text-2xl font-semibold">개인정보 관련 문의</h2>
            </div>
            <div className="pl-8 space-y-3">
              <p className="text-foreground/80 leading-relaxed">개인정보 보호 관련 문의사항이 있으시면 개인정보 보호책임자에게 연락해 주시기 바랍니다. 회사는 이용자의 개인정보를 보호하기 위해 최선을 다하겠습니다.</p>
              <p className="text-foreground/80">
                더 자세한 문의는{' '}
                <Link href="/board/qna/write" className="text-primary hover:underline">
                  고객센터
                </Link>
                를 통해 문의해 주시기 바랍니다.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t mt-16">
        <div className="container py-8 max-w-5xl">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} 도깨비 테니스 아카데미. All rights reserved.</p>
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
        </div>
      </div>
    </div>
  );
}
