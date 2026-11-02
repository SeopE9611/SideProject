import type { StaticImageData } from "next/image";
import type { PublicProgram } from "@/features/programs/program.types";
import type { PublicNewsPost } from "@/features/news/news.types";
import type { TransparencyCategory } from "@/features/transparency/transparency.types";
import commonRoom from "./assets/home-v2-realistic/hero-01-common-room.webp";
import personalChoice from "./assets/home-v2-realistic/hero-02-personal-choice.webp";
import neighborhood from "./assets/home-v2-realistic/hero-03-neighborhood.webp";
import tableSetting from "./assets/home-v2-realistic/program-01-table-setting.webp";
import expression from "./assets/home-v2-realistic/program-02-creative-expression.webp";

export type HomeV2Slide = {
  title: string; description: string; image: StaticImageData;
  alt: string; label: string; position: string;
};
const imageLabel = "AI 생성 이미지 · 실제 샬롬의집 사진 아님";
export const realisticHeroSlides: readonly HomeV2Slide[] = [
  {
    title: "샬롬의집",
    description: "샬롬의집은 지체 및 지적 장애인이 함께 생활하는 장애인거주시설입니다.",
    image: commonRoom, alt: "햇빛이 드는 창가와 나무 식탁, 꽃과 화분이 있는 실내를 그린 AI 이미지. 실제 기관 사진이 아닙니다.",
    label: imageLabel, position: "65% center",
  },
  {
    title: "내가 고르는 오늘",
    description: "작은 선택이 모여 각자의 하루가 됩니다. 익숙한 방식과 서로 다른 속도를 존중하는 일상을 생각합니다.",
    image: personalChoice, alt: "여러 색의 크레용 중 하나를 고르는 손을 그린 AI 이미지. 실제 이용인이나 활동 기록이 아닙니다.",
    label: imageLabel, position: "center",
  },
  {
    title: "동네와 이어지는 일상",
    description: "집 안의 편안함에서 동네의 만남까지. 지역과 함께하는 생활의 의미를 전합니다.",
    image: neighborhood, alt: "나무와 벤치가 이어진 동네 산책길을 그린 AI 이미지. 실제 기관 주변 사진이 아닙니다.",
    label: imageLabel, position: "center",
  },
];

type PreviewProgram = Pick<PublicProgram, "slug" | "category" | "title" | "summary" | "purpose" | "body" | "coverImage">;
export const realisticPrograms: readonly PreviewProgram[] = [
  {
    slug: "realistic-table-setting", title: "함께 준비하는 한 끼", category: "일상생활",
    summary: "메뉴를 고르고 식탁을 준비하는 과정을 통해 일상의 선택을 표현하는 활동을 소개합니다.",
    purpose: "일상 속 선택을 주제로 한 가상 시안입니다. 실제 운영 프로그램이 아닙니다.",
    body: ["메뉴 그림을 살펴보고 식탁에 필요한 물건을 고르는 장면을 가정한 소개 예시입니다.", "선택과 식탁 준비라는 주제를 어떻게 전달할지 검토하기 위한 내용이며, 실제 참여나 활동 결과를 기록하지 않습니다."],
    coverImage: { src: tableSetting.src, width: tableSetting.width, height: tableSetting.height,
      altText: "식사 그림 안내 옆에서 접시를 놓는 손을 그린 AI 이미지. 실제 기관 활동사진이 아닙니다." },
  },
  {
    slug: "realistic-creative-expression", title: "색과 재료로 표현하는 시간", category: "문화·여가",
    summary: "좋아하는 색과 재료를 고르고 각자의 방식으로 표현하는 시간을 소개합니다.",
    purpose: "색과 재료의 선택을 주제로 한 가상 시안입니다. 실제 운영 프로그램이 아닙니다.",
    body: ["색연필과 종이를 고르고 자신이 떠올린 모양을 표현하는 상황을 가정한 소개 예시입니다.", "표현 방식의 다양성을 담는 화면을 검토하기 위한 내용이며, 특정 이용인의 경험이나 치료 효과를 설명하지 않습니다."],
    coverImage: { src: expression.src, width: expression.width, height: expression.height,
      altText: "색연필로 꽃을 그리는 손과 미술 재료를 그린 AI 이미지. 실제 이용인이나 활동 기록이 아닙니다." },
  },
  {
    slug: "realistic-neighborhood-choice", title: "동네에서 고르고 이용하기", category: "지역사회 참여",
    summary: "산책 경로와 필요한 물건을 선택하는 상황으로 지역에서의 일상을 소개합니다.",
    purpose: "지역에서의 일상적인 선택을 주제로 한 가상 시안입니다. 실제 운영 프로그램이 아닙니다.",
    body: ["걷고 싶은 길과 필요한 물건을 고르는 상황을 가정해 지역에서의 일상을 소개하는 예시입니다.", "실제 외출 장소나 일정, 참여자 사례가 아닌 콘텐츠 배치 검토용 설명입니다."],
    coverImage: null,
  },
];

type PreviewNews = Pick<PublicNewsPost, "id" | "slug" | "category" | "title" | "summary" | "body" | "publishedAt">;
export const realisticNews: readonly PreviewNews[] = [
  {
    id: "realistic-visit-notice", slug: "realistic-visit-notice", category: "notice",
    title: "방문 전 연락과 일정 확인 안내", publishedAt: "2026-10-15",
    summary: "방문 관련 연락과 일정 확인을 주제로 구성한 가상 공지입니다.",
    body: ["방문 전에 문의할 내용을 살펴보는 공지 화면의 예시입니다. 실제 방문 정책이나 예약 절차를 정하지 않습니다.", "공식 연락처는 기존 문의 안내에서 확인할 수 있으며, 표시된 게시일은 시안용 예시입니다."],
  },
  {
    id: "realistic-volunteer-notice", slug: "realistic-volunteer-notice", category: "notice",
    title: "자원봉사 참여 문의 방법 안내", publishedAt: "2026-10-08",
    summary: "자원봉사 관련 문의 안내를 담는 가상 공지입니다.",
    body: ["자원봉사 문의에 관한 정보를 배치하는 예시이며, 실제 모집 공고나 참여 확정 안내가 아닙니다.", "현재 시안은 새로운 접수 방법이나 활동 일정을 제시하지 않습니다. 표시된 게시일은 예시입니다."],
  },
  {
    id: "realistic-expression-story", slug: "realistic-expression-story", category: "activity",
    title: "색과 재료를 고르며 표현한 하루", publishedAt: "2026-10-01",
    summary: "색과 재료의 선택을 주제로 한 가상 활동소식입니다.",
    body: ["여러 색과 재료를 고르는 장면을 이야기 형식으로 소개하는 화면 예시입니다.", "실제 행사나 이용인의 활동을 기록한 글이 아니며, 참여자 발언이나 활동 성과를 포함하지 않습니다. 표시된 게시일은 예시입니다."],
  },
];

export const realisticDocuments: readonly {
  slug: string; title: string; category: TransparencyCategory; summary: string; periodLabel: string; fileType: string;
}[] = [
  {
    slug: "realistic-support-information", title: "일상생활·문화여가 지원 내용 안내", category: "operations",
    summary: "지원 내용 안내의 표시 구조를 검토하는 가상 자료입니다. 실제 운영 보고서가 아닙니다.",
    periodLabel: "2026년 상반기 (예시)", fileType: "PDF 형식 예시 · 파일 없음",
  },
  {
    slug: "realistic-budget-information", title: "예산·결산 공개자료 안내", category: "budget_settlement",
    summary: "공개자료 제목과 기준 기간의 배치를 확인하는 가상 자료입니다. 실제 회계자료나 금액을 제공하지 않습니다.",
    periodLabel: "2026년 (예시)", fileType: "PDF 형식 예시 · 파일 없음",
  },
];
