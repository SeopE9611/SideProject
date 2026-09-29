"use client";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { adminSurface, adminTypography } from "@/components/admin/admin-typography";
import { cn } from "@/lib/utils";

// 길이 추정 스케일은 제거(혹은 fallback로만 유지해도 OK)
const MIN_SCALE = 0.66; // 너무 작아지지 않도록 하한선
const EPS = 2; // 우측 1~2px 여유(클립 방지)

type Props = {
  label: string; // 카드 제목
  value: number; // 숫자
  icon?: React.ReactNode; // 우측 아이콘(선택)
  storageKey: string; // 로컬스토리지 키(카드별 기억)
  formatCompact: (n: number) => string; // 축약 포맷 함수
  isLoading?: boolean; // 스켈레톤 On/Off
  hint?: boolean; //  "클릭하여…" 힌트 보이기
  skeletonWidthClass?: string; // 스켈레톤 너비 클래스 (기본 w-24)
};

const numberClass = cn(
  "block leading-none whitespace-nowrap",
  adminTypography.kpiValue,
);

// 글자 길이에 따라 '스케일'만 변경 (폰트사이즈는 고정)
function scaleByLength(len: number) {
  if (len <= 6) return 1; // 예: "₩12만"
  if (len <= 8) return 0.94; // 예: "₩1,234,567"
  if (len <= 10) return 0.88;
  if (len <= 12) return 0.82;
  return 0.76; // 더 길어지면 조금 더 축소
}
const formatFull = (n: number) => `₩${n.toLocaleString()}`;

export default function KpiCard({
  label,
  value,
  icon,
  storageKey,
  formatCompact,
  isLoading = false,
  hint = true,
  skeletonWidthClass = "w-24",
}: Props) {
  // SSR/CSR 모두 동일한 값으로 시작
  const [compact, setCompact] = useState<boolean>(true);

  //  접근성/속성 불일치 방지
  const [hydrated, setHydrated] = useState(false);

  // 마운트 후에만 localStorage 값을 반영(하이드레이션 끝난 뒤라 mismatch 없음)
  useEffect(() => {
    setHydrated(true);
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved !== null) setCompact(saved === "1");
    } catch {}
  }, [storageKey]);

  // 변경사항 저장 (마운트 전에는 저장 안 함)
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, compact ? "1" : "0");
    } catch {}
  }, [compact, hydrated, storageKey]);

  const display = useMemo(
    () => (compact ? formatCompact(value) : formatFull(value)),
    [compact, value, formatCompact],
  );

  // 숫자 칼럼/텍스트 참조
  const wrapRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [scale, setScale] = useState(1);

  // 스케일 재계산 함수
  const recomputeScale = useCallback(() => {
    const wrap = wrapRef.current;
    const text = textRef.current;
    if (!wrap || !text) return;

    // 자연 폭으로 측정하기 위해 잠시 스케일 1로
    text.style.transform = "scale(1)";
    // 다음 프레임에 실제 폭을 측정
    requestAnimationFrame(() => {
      const wrapW = wrap.clientWidth; // 사용 가능한 폭
      const textW = text.scrollWidth; // 자연 폭(쉼표/통화기호 포함)
      if (!wrapW || !textW) return;

      // EPS 만큼 여유(픽셀 클립 방지)
      const raw = (wrapW - EPS) / textW;
      const next = Math.min(1, Math.max(MIN_SCALE, raw));
      setScale(next);
      // 최종 스케일 적용
      text.style.transform = `scale(${next})`;
    });
  }, []);

  // 표시값이 바뀔 때마다/초기 렌더 시 재계산
  useLayoutEffect(() => {
    recomputeScale();
  }, [display, recomputeScale]);

  // 래퍼가 리사이즈되면 재계산(반응형/폰트로드 등)
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const ro = new ResizeObserver(() => recomputeScale());
    ro.observe(wrap);
    return () => ro.disconnect();
  }, [recomputeScale]);

  return (
    <div className={cn(adminSurface.kpiCard, "h-full min-h-[144px] overflow-hidden")}>
      <div className="flex h-full p-6">
        <div className="grid w-full grid-cols-[minmax(0,1fr)_40px] items-center gap-3">
          <div ref={wrapRef} className="min-w-0 overflow-hidden">
            <p className={adminTypography.metaMuted}>{label}</p>
            <button
              type="button"
              onClick={() => setCompact((v) => !v)}
              aria-pressed={hydrated ? !compact : undefined} // 초기 SSR과 불일치 방지
              className="block w-full rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {isLoading ? (
                <span
                  className={`inline-block h-8 ${skeletonWidthClass} rounded bg-muted/70 animate-pulse`}
                />
              ) : (
                <span
                  ref={textRef}
                  className={numberClass}
                  style={{
                    fontSize: "32px",
                    transformOrigin: "left center",
                    display: "inline-block",
                    willChange: "transform",
                    transform: `scale(${scale})`,
                  }}
                >
                  {display}
                </span>
              )}

              {hint && (
                <span className={cn("mt-1 block whitespace-nowrap overflow-hidden text-ellipsis", adminTypography.caption)}>
                  클릭하여 단위 전환
                </span>
              )}
            </button>
          </div>

          {icon && (
            <div className={cn(adminSurface.fieldPanelMuted, "w-10 h-10 flex-shrink-0 grid place-items-center p-0")}>
              {icon}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
