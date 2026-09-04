import { aboutFixture } from "@/content/fixtures/about.fixture";
import { siteConfig } from "@/config/site";
import type {
  ContactInformationContent,
  DonationGuidanceContent,
  FacilityOverviewContent,
  GreetingContent,
} from "./site-content.types";

export const defaultFacilityOverviewContent: FacilityOverviewContent = {
  pageDescription: "샬롬의 집은 지체 및 지적 장애인이 함께 생활하는 장애인거주시설입니다.",
  facts: [
    { label: "시설 유형", value: "장애인거주시설" },
    { label: "생활", value: "지체 및 지적 장애인이 함께 생활합니다" },
    { label: "지역", value: "서울특별시 강서구" },
  ],
  principlesEyebrow: "함께 사는 기준",
  principlesTitle: "사람마다 다른 하루를 살핍니다",
  principlesDescription: "정해진 방식에 사람을 맞추기보다 각자의 의사와 생활 방식에 필요한 지원을 함께 찾습니다.",
  principles: [
    {
      title: "한 사람의 선택",
      description: "익숙한 생활 방식과 의사를 먼저 살피고, 스스로 선택할 수 있는 일상을 함께 만듭니다.",
    },
    {
      title: "필요에 맞는 지원",
      description: "모두에게 같은 방법을 적용하지 않고 몸과 마음의 특성에 맞춰 필요한 도움을 나눕니다.",
    },
    {
      title: "지역과 잇는 관계",
      description: "식사, 나들이, 이웃과의 만남을 통해 생활의 범위가 집 안에만 머물지 않도록 이어 갑니다.",
    },
  ],
  scenesEyebrow: "생활의 모습",
  scenesTitle: "집 안과 밖에서 이어지는 일상",
  scenesDescription: "특별한 행사만이 아니라 매일 반복되는 생활과 관계가 샬롬의 집을 이루는 가장 중요한 모습입니다.",
  scenes: [
    {
      label: "일상",
      title: "같이 먹고 쉬는 집",
      description: "식탁을 나누고 대화를 이어 가며 편안하게 쉴 수 있는 평범한 하루를 소중히 여깁니다.",
    },
    {
      label: "경험",
      title: "집 밖으로 이어지는 생활",
      description: "외출과 나들이, 지역 활동을 통해 새로운 사람과 장소를 만나는 경험을 지원합니다.",
    },
    {
      label: "공간",
      title: "더 안전하고 편안한 환경",
      description: "매일 머무는 공간을 살피고 생활에 필요한 변화를 이어 가며 집다운 환경을 가꿉니다.",
    },
  ],
  policyEyebrow: "공개 원칙",
  policyTitle: "소개하는 과정에서도 사람을 먼저 생각합니다",
  policyItems: [
    {
      title: "동의와 보호",
      description: "사진과 관계자 정보는 공개 동의와 개인정보 검토를 마친 자료만 사용합니다.",
    },
    {
      title: "정확한 정보",
      description:
        "운영 내용과 시설 정보는 담당자 확인을 거친 뒤 공개하고 확인되지 않은 내용으로 빈자리를 채우지 않습니다.",
    },
  ],
};

export const defaultGreetingContent: GreetingContent = {
  pageDescription: "운영 책임자의 확인을 거친 공식 메시지를 안내하는 페이지입니다.",
  notice: "공식 인사말은 운영 책임자의 확인과 공개 승인을 마친 뒤 게시합니다.",
  statusLabel: aboutFixture.greeting.statusLabel,
  title: aboutFixture.greeting.title,
  paragraphs: aboutFixture.greeting.paragraphs,
  signerRole: "",
  signerName: "",
  showSignerName: false,
};

export const defaultContactInformationContent: ContactInformationContent = {
  directionsPageDescription: "샬롬의 집 방문에 필요한 주소와 연락처를 안내합니다.",
  address: siteConfig.address,
  phone: siteConfig.phone,
  visitInquiryTitle: "방문 전 문의",
  visitInquiryDescription: "방문 일정과 시설 출입 안내는 대표 전화로 확인할 수 있습니다.",
  contactPageDescription: "시설에 관한 질문과 방문·후원·자원봉사 문의를 접수합니다.",
  contactIntroduction: "대표 전화와 방문 안내, 공식 외부 채널을 통해 문의할 수 있습니다.",
  instagramUrl: siteConfig.instagram,
  showInstagram: true,
};

export const defaultDonationGuidanceContent: DonationGuidanceContent = {
  pageDescription: "확인 가능한 후원 방식과 문의 절차를 안내합니다.",
  notice: "공식 계좌 정보는 준비 중이며 홈페이지에 아직 표시하지 않습니다.",
  steps: [
    "가능한 후원 방식과 최신 안내 여부를 대표 전화로 확인합니다.",
    "공식 안내의 절차와 필요한 사항을 다시 확인합니다.",
    "확인된 정보에 따라 참여합니다.",
  ],
  contactTitle: "후원 관련 문의",
  contactDescription: "대표 전화 또는 온라인 문의를 통해 후원 방법과 후원금 영수증·내역을 확인할 수 있습니다.",
  transparencyLinkLabel: "후원금 자료공개 보기",
  donationInquiryLabel: "후원 문의 접수",
  receiptInquiryLabel: "후원금 영수증·내역 문의",
};
