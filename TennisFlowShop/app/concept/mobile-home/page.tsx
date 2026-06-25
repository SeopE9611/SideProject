import type { Metadata } from "next";

import MobileHomeConcept from "./MobileHomeConcept";

export const metadata: Metadata = {
  title: "모바일 홈 리디자인 컨셉 | 도깨비테니스",
  description:
    "스트링 교체 서비스로 자연스럽게 이어지는 도깨비테니스 모바일 홈 화면 UX 컨셉 시안입니다.",
};

export default function MobileHomeConceptPage() {
  return <MobileHomeConcept />;
}
