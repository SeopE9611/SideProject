import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function TermsPage() {
  // 약관 섹션 데이터
  const termsSections = [
    {
      id: "service-target",
      title: "제1조 (서비스 이용 대상)",
      content: `
        1. 본 서비스는 만 14세 이상의 모든 사용자가 이용할 수 있습니다.
        2. 만 14세 미만의 아동이 서비스를 이용하기 위해서는 법정대리인(부모 등)의 동의가 필요합니다.
        3. 회사는 서비스별로 이용 가능한 연령 및 조건을 별도로 정할 수 있으며, 이 경우 해당 서비스 초기 화면이나 별도 공지사항을 통해 안내합니다.
      `,
    },
    {
      id: "membership",
      title: "제2조 (회원 가입 및 탈퇴)",
      content: `
        1. 이용자는 회사가 정한 가입 양식에 따라 회원정보를 기입한 후 이 약관에 동의한다는 의사표시를 함으로써 회원가입을 신청합니다.
        2. 회사는 제1항과 같이 회원으로 가입할 것을 신청한 이용자 중 다음 각 호에 해당하지 않는 한 회원으로 등록합니다.
           - 가입신청자가 이 약관 제6조에 의하여 이전에 회원자격을 상실한 적이 있는 경우
           - 등록 내용에 허위, 기재누락, 오기가 있는 경우
           - 기타 회원으로 등록하는 것이 회사의 서비스 운영에 현저히 지장이 있다고 판단되는 경우
        3. 회원은 회원가입 시 등록한 개인정보의 변경이 발생한 경우, 즉시 변경사항을 수정하여야 합니다.
        4. 회원은 언제든지 회사에 탈퇴를 요청할 수 있으며, 회사는 즉시 회원탈퇴를 처리합니다.
      `,
    },
    {
      id: "user-obligations",
      title: "제3조 (이용자의 의무)",
      content: `
        1. 회원은 다음 행위를 하여서는 안 됩니다.
           - 회원가입 신청 또는 변경 시 허위내용을 등록하는 행위
           - 타인의 정보를 도용하는 행위
           - 회사가 게시한 정보를 변경하는 행위
           - 회사가 정한 정보 이외의 정보(컴퓨터 프로그램 등)를 송신 또는 게시하는 행위
           - 회사와 기타 제3자의 저작권 등 지적재산권을 침해하는 행위
           - 회사 및 기타 제3자의 명예를 손상시키거나 업무를 방해하는 행위
           - 외설 또는 폭력적인 메시지, 화상, 음성, 기타 공서양속에 반하는 정보를 서비스에 공개 또는 게시하는 행위
        2. 회원은 관계법령, 이 약관의 규정, 이용안내 및 서비스와 관련하여 공��한 주의사항, 회사가 통지하는 사항 등을 준수하여야 합니다.
        3. 회원은 회사의 사전 승낙 없이 서비스를 이용하여 영업활동을 할 수 없으며, 그 영업활동의 결과에 대해 회사는 책임을 지지 않습니다.
      `,
    },
    {
      id: "company-obligations",
      title: "제4조 (회사의 의무)",
      content: `
        1. 회사는 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며 이 약관이 정하는 바에 따라 지속적이고, 안정적으로 서비스를 제공하는 데 최선을 다합니다.
        2. 회사는 회원이 안전하게 서비스를 이용할 수 있도록 회원의 개인정보(신용정보 포함)보호를 위한 보안 시스템을 갖추어야 합니다.
        3. 회사는 서비스 이용과 관련하여 회원으로부터 제기된 의견이나 불만이 정당하다고 인정할 경우에는 이를 처리하여야 합니다. 회원이 제기한 의견이나 불만사항에 대해서는 게시판을 활용하거나 전자우편 등을 통하여 회원에게 처리과정 및 결과를 전달합니다.
      `,
    },
    {
      id: "post-management",
      title: "제5조 (게시물 관리)",
      content: `
        1. 회원이 서비스에 등록한 게시물의 저작권은 해당 게시물의 저작자에게 귀속됩니다.
        2. 회원이 서비스에 등록한 게시물은 검색결과 내지 서비스 및 관련 프로모션, 광고 등에 노출될 수 있으며, 해당 노출을 위해 필요한 범위 내에서는 일부 수정, 복제, 편집되어 게시될 수 있습니다.
        3. 회사는 다음 각 호에 해당하는 게시물 등을 회원의 사전 동의 없이 임시 삭제하거나 이동 또는 등록 거부할 수 있습니다.
           - 다른 회원 또는 제3자에게 심한 모욕을 주거나 명예를 손상시키는 내용인 경우
           - 공공질서 및 미풍양속에 위반되는 내용을 유포하거나 링크시키는 경우
           - 불법복제 또는 해킹을 조장하는 내용인 경우
           - 영리를 목적으로 하는 광고일 경우
           - 범죄와 결부된다고 객관적으로 인정되는 내용일 경우
           - 다른 이용자 또는 제3자의 저작권 등 기타 권리를 침해하는 내용인 경우
           - 기타 관계법령에 위배된다고 판단되는 경우
      `,
    },
    {
      id: "service-restriction",
      title: "제6조 (서비스 이용 제한)",
      content: `
        1. 회사는 회원이 이 약관의 의무를 위반하거나 서비스의 정상적인 운영을 방해한 경우, 서비스 이용을 경고, 일시정지, 계약해지 등으로 단계적으로 제한할 수 있습니다.
        2. 회사는 전항에도 불구하고, 결제도용, 불법프로그램의 제공 및 운영방해, 허위사실의 유포, 타인의 명예훼손, 저작권 침해 등과 같이 관련법을 위반한 경우에는 즉시 영구이용정지를 할 수 있습니다.
        3. 회사는 회원이 계속해서 1년 이상 로그인하지 않는 경우, 회원정보의 보호 및 운영의 효율성을 위해 이용을 제한할 수 있습니다.
        4. 회사는 본 조의 이용제한 범위 내에서 제한의 조건 및 세부내용은 이용제한정책 및 개별 서비스상의 운영정책에서 정하는 바에 의합니다.
        5. 본 조에 따라 서비스 이용을 제한하거나 계약을 해지하는 경우에는 회사는 제한의 종류 및 사유를 회원에게 통지합니다.
      `,
    },
    {
      id: "liability",
      title: "제7조 (책임의 한계)",
      content: `
        1. 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임이 면제됩니다.
        2. 회사는 회원의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.
        3. 회사는 회원이 서비스를 이용하여 기대하는 수익을 상실한 것에 대하여 책임을 지지 않으며, 그 밖의 서비스를 통하여 얻은 자료로 인한 손해에 관하여 책임을 지지 않습니다.
        4. 회사는 회원이 게재한 정보, 자료, 사실의 신뢰도, 정확성 등 내용에 관해서는 책임을 지지 않습니다.
        5. 회사는 회원 간 또는 회원과 제3자 상호간에 서비스를 매개로 하여 거래 등을 한 경우에는 책임이 면제됩니다.
      `,
    },
    {
      id: "terms-change",
      title: "제8조 (약관의 변경)",
      content: `
        1. 회사는 필요한 경우 약관을 변경할 수 있으며, 변경된 약관은 서비스 내 공지사항을 통해 공지하거나 전자메일 등의 방법으로 회원에게 통지함으로써 효력이 발생합니다.
        2. 회원은 변경된 약관에 동의하지 않을 경우 회원 탈퇴를 요청할 수 있으며, 변경된 약관의 효력 발생일로부터 7일 이후에도 거부의사를 표시하지 않고 서비스를 계속 이용할 경우 약관의 변경 사항에 동의한 것으로 간주됩니다.
      `,
    },
  ]

  return (
    <div className="container py-8">
      <div className="mb-4">
        <Link href="/" className="inline-flex items-center text-primary hover:underline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          홈으로 돌아가기
        </Link>
      </div>

      <div className="mx-auto max-w-4xl">
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-3xl font-bold">이용약관</CardTitle>
            <p className="text-muted-foreground">
              도깨비 테니스 아카데미 웹사이트 이용에 관한 약관입니다. 서비스 이용 전 반드시 읽어주시기 바랍니다.
            </p>
            <p className="text-sm text-muted-foreground">최종 업데이트: 2023년 12월 1일</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p>
                도깨비 테니스 아카데미(이하 '회사')는 이용자의 권리를 보호하고 안전하고 편리한 서비스를 제공하기 위해 본
                약관을 마련하였습니다. 본 약관은 회사가 제공하는 모든 서비스에 적용됩니다.
              </p>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-8">
          {/* 목차 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">목차</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {termsSections.map((section) => (
                  <li key={section.id}>
                    <Link href={`#${section.id}`} className="text-primary hover:underline">
                      {section.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* 약관 내용 */}
          {termsSections.map((section) => (
            <Card key={section.id} id={section.id} className="scroll-mt-20">
              <CardHeader>
                <CardTitle className="text-xl">{section.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="whitespace-pre-line text-sm leading-relaxed">{section.content}</div>
              </CardContent>
            </Card>
          ))}

          {/* 약관 동의 안내 */}
          <Card>
            <CardContent className="p-6">
              <div className="rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium mb-2">약관 동의 안내</p>
                <p className="mb-2">
                  본 약관에 동의하시면 도깨비 테니스 아카데미의 서비스를 이용하실 수 있습니다. 약관에 동의하지 않으실
                  경우 서비스 이용이 제한될 수 있습니다.
                </p>
                <p>
                  문의사항이 있으시면{" "}
                  <Link href="/board/qna/write" className="text-primary hover:underline">
                    고객센터
                  </Link>
                  로 연락해 주시기 바랍니다.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-8 text-center">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} 도깨비 테니스 아카데미. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  )
}
