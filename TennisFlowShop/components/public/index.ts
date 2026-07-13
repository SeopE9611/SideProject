/**
 * 공개 페이지 UI 기준
 * - 페이지 상단 소개 영역은 PublicPageHero, 본문 폭은 SiteContainer를 우선 사용합니다.
 * - 섹션 제목/설명/액션 묶음은 SectionHeader로 맞춥니다.
 * - 단순 카드형 표면은 PublicSurface 또는 SummaryCard를 먼저 검토합니다.
 * - 성공/실패/안내/주의 완료 화면은 ResultState로 통일합니다.
 * - 로그인/비밀번호/계정 탈퇴처럼 인증 맥락의 단일 폼 화면은 AuthShell을 우선 사용합니다.
 */
export { AuthShell, type AuthShellProps } from "./AuthShell";
export { EmptyState, type EmptyStateProps } from "./EmptyState";
export { InteractiveCard, type InteractiveCardProps } from "./InteractiveCard";
export { PublicPageHero, type PublicPageHeroProps, type PublicPageHeroVariant } from "./PublicPageHero";
export { PublicSurface, type PublicSurfaceProps } from "./PublicSurface";
export { ResultState, type ResultStateProps } from "./ResultState";
export { SectionHeader, type SectionHeaderProps } from "./SectionHeader";
export { StepIndicator, type Step, type StepIndicatorProps } from "./StepIndicator";
export { PrimaryCTAGroup } from "./PrimaryCTAGroup";
export { PriceSummary, type PriceSummaryProps, type PriceSummaryRow } from "./PriceSummary";
export { SummaryCard, type SummaryCardProps } from "./SummaryCard";
