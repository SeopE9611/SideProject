import { Top } from "@toss/tds-mobile";
import { useCallback, useEffect, useRef, useState } from "react";

import { getStringingProducts } from "./api/products";
import { ProductCard } from "./components/ProductCard";
import ProductDetail from "./components/ProductDetail";
import StringingApplicationStepOne from "./components/StringingApplicationStepOne";
import type { Product } from "./types/product";
import { StringingStartSelection } from "./types/stringing";

type ProductLoadState = "loading" | "success" | "error";

const plannedFeatures = [
  {
    title: "교체서비스",
    description: "스트링 선택부터 교체 신청까지 한 흐름으로 이용할 수 있도록 준비하고 있어요.",
  },
  {
    title: "중고 라켓",
    description: "판매 중인 중고 라켓의 상태와 주요 정보를 모바일에서 편하게 확인할 수 있어요.",
  },
] as const;

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getSearchParamsFromLocation() {
  return new URLSearchParams(window.location.search);
}

function getProductIdFromLocation() {
  return getSearchParamsFromLocation().get("productId");
}

function getStringingApplyModeFromLocation() {
  return getSearchParamsFromLocation().get("view") === "stringing-apply";
}

function getSelectedColorFromLocation() {
  return getSearchParamsFromLocation().get("selectedColor") ?? "";
}

function getSelectedGaugeFromLocation() {
  return getSearchParamsFromLocation().get("selectedGauge") ?? "";
}

function SectionHeading({ eyebrow, title, titleId }: { eyebrow: string; title: string; titleId: string }) {
  return (
    <header className="mb-4">
      <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">{eyebrow}</p>

      <h2 id={titleId} className="m-0 text-[21px] leading-[1.35] font-extrabold tracking-[-0.02em] text-[#191f28]">
        {title}
      </h2>
    </header>
  );
}

function ProductStateCard({
  title,
  description,
  onRetry,
}: {
  title: string;
  description: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-[20px] bg-[#f2f4f6] px-5 py-7 text-center">
      <strong className="block text-base leading-[1.45] font-bold text-[#333d4b]">{title}</strong>

      <p className="mt-[7px] mb-0 text-sm leading-[1.55] text-[#6b7684]">{description}</p>

      {onRetry && (
        <button
          className="mt-[18px] min-h-11 cursor-pointer rounded-xl border-0 bg-[#e9f6c9] px-[18px] text-sm font-bold text-[#344700]"
          type="button"
          onClick={onRetry}
        >
          다시 시도
        </button>
      )}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="min-w-0" aria-hidden="true">
      <div className="aspect-square w-full rounded-[18px] bg-[#f2f4f6]" />
      <div className="mt-3 h-[13px] w-[46%] rounded-md bg-[#f2f4f6]" />
      <div className="mt-[9px] h-[13px] w-full rounded-md bg-[#f2f4f6]" />
      <div className="mt-[9px] h-[13px] w-[65%] rounded-md bg-[#f2f4f6]" />
    </div>
  );
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);

  const [loadState, setLoadState] = useState<ProductLoadState>("loading");

  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => getProductIdFromLocation());

  const [isStringingApply, setIsStringingApply] = useState(() => getStringingApplyModeFromLocation());

  const [detailSelectedColor, setDetailSelectedColor] = useState(() => getSelectedColorFromLocation());

  const [detailSelectedGauge, setDetailSelectedGauge] = useState(() => getSelectedGaugeFromLocation());

  const listScrollYRef = useRef(0);

  const loadProducts = useCallback(async (signal?: AbortSignal) => {
    setLoadState("loading");

    try {
      const data = await getStringingProducts(signal);

      if (signal?.aborted) {
        return;
      }

      setProducts(data.products);
      setLoadState("success");
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      console.error("[스트링 상품 조회 실패]", error);

      setProducts([]);
      setLoadState("error");
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    void loadProducts(controller.signal);

    return () => {
      controller.abort();
    };
  }, [loadProducts]);

  useEffect(() => {
    const handlePopState = () => {
      const nextProductId = getProductIdFromLocation();

      setSelectedProductId(nextProductId);
      setIsStringingApply(getStringingApplyModeFromLocation());

      setDetailSelectedColor(getSelectedColorFromLocation());

      setDetailSelectedGauge(getSelectedGaugeFromLocation());

      requestAnimationFrame(() => {
        window.scrollTo({
          top: nextProductId ? 0 : listScrollYRef.current,
          behavior: "auto",
        });
      });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const handleSelectProduct = useCallback((productId: string) => {
    listScrollYRef.current = window.scrollY;

    const nextUrl = new URL(window.location.href);

    nextUrl.searchParams.set("productId", productId);

    nextUrl.searchParams.delete("view");
    nextUrl.searchParams.delete("selectedColor");
    nextUrl.searchParams.delete("selectedGauge");

    window.history.pushState({ productId }, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);

    setSelectedProductId(productId);
    setIsStringingApply(false);
    setDetailSelectedColor("");
    setDetailSelectedGauge("");

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);

  const handleStartStringing = useCallback((selection: StringingStartSelection) => {
    const detailUrl = new URL(window.location.href);

    detailUrl.searchParams.set("productId", selection.productId);

    detailUrl.searchParams.delete("view");

    if (selection.selectedColor) {
      detailUrl.searchParams.set("selectedColor", selection.selectedColor);
    } else {
      detailUrl.searchParams.delete("selectedColor");
    }

    if (selection.selectedGauge) {
      detailUrl.searchParams.set("selectedGauge", selection.selectedGauge);
    } else {
      detailUrl.searchParams.delete("selectedGauge");
    }

    window.history.replaceState(
      {
        productId: selection.productId,
      },
      "",
      `${detailUrl.pathname}${detailUrl.search}${detailUrl.hash}`,
    );

    const applyUrl = new URL(detailUrl.href);

    applyUrl.searchParams.set("view", "stringing-apply");

    window.history.pushState(
      {
        productId: selection.productId,
        view: "stringing-apply",
      },
      "",
      `${applyUrl.pathname}${applyUrl.search}${applyUrl.hash}`,
    );

    setSelectedProductId(selection.productId);

    setDetailSelectedColor(selection.selectedColor);

    setDetailSelectedGauge(selection.selectedGauge);

    setIsStringingApply(true);

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);

  if (selectedProductId && isStringingApply) {
    return (
      <StringingApplicationStepOne
        productId={selectedProductId}
        selectedColor={detailSelectedColor}
        selectedGauge={detailSelectedGauge}
      />
    );
  }

  if (selectedProductId) {
    return (
      <ProductDetail
        productId={selectedProductId}
        initialSelectedColor={detailSelectedColor}
        initialSelectedGauge={detailSelectedGauge}
        onStartStringing={handleStartStringing}
      />
    );
  }

  return (
    <main className="min-h-dvh min-w-0 w-full bg-white pb-[calc(32px+env(safe-area-inset-bottom))] text-[#191f28] min-[481px]:shadow-[0_0_0_1px_rgba(2,32,71,0.05)]">
      <section className="pt-[calc(16px+env(safe-area-inset-top))]" aria-labelledby="service-title">
        <div className="px-6 pb-1 max-[359px]:px-5">
          <span className="inline-flex min-h-[30px] items-center gap-[7px] rounded-full border border-[rgba(154,206,34,0.42)] bg-[rgba(154,206,34,0.14)] px-[11px] py-1.5 text-[13px] leading-none font-bold text-[#415800]">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-[#7ca800]" aria-hidden="true" />
            앱인토스 베타
          </span>
        </div>

        <h1 id="service-title" className="sr-only">
          도깨비테니스
        </h1>

        <Top
          title={<Top.TitleParagraph size={22}>도깨비테니스</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={17}>토스에서 만나는 테니스 쇼핑·스트링 교체 서비스</Top.SubtitleParagraph>
          }
        />

        <p className="m-0 break-keep px-6 text-[15px] leading-[1.65] text-[#6b7684] max-[359px]:px-5">
          도깨비테니스에서 판매 중인 스트링을 앱인토스에서 확인할 수 있어요. 주문과 교체서비스 기능은 안정성 검증 후
          순차적으로 연결할 예정이에요.
        </p>
      </section>

      <section className="px-6 pt-[38px] max-[359px]:px-5" aria-labelledby="products-title">
        <SectionHeading eyebrow="STRING SHOP" title="지금 판매 중인 스트링" titleId="products-title" />

        {loadState === "loading" && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6" aria-label="상품을 불러오는 중">
            {Array.from({
              length: 6,
            }).map((_, index) => (
              <ProductSkeleton key={index} />
            ))}
          </div>
        )}

        {loadState === "error" && (
          <div role="alert">
            <ProductStateCard
              title="상품 정보를 불러오지 못했어요."
              description="네트워크 상태를 확인한 뒤 다시 시도해주세요."
              onRetry={() => void loadProducts()}
            />
          </div>
        )}

        {loadState === "success" && products.length === 0 && (
          <ProductStateCard title="현재 표시할 스트링이 없어요." description="판매 가능한 상품을 준비하고 있어요." />
        )}

        {loadState === "success" && products.length > 0 && (
          <div className="grid grid-cols-2 gap-x-3 gap-y-6">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} onSelect={handleSelectProduct} />
            ))}
          </div>
        )}
      </section>

      <section className="px-6 pt-[38px] max-[359px]:px-5" aria-labelledby="planned-features-title">
        <SectionHeading eyebrow="COMING SOON" title="다음으로 준비 중인 기능" titleId="planned-features-title" />

        <ol className="m-0 flex list-none flex-col gap-3 p-0">
          {plannedFeatures.map((feature, index) => (
            <li
              className="grid grid-cols-[42px_minmax(0,1fr)] items-start gap-3.5 rounded-[20px] border border-[#e5e8eb] bg-white p-5 max-[359px]:grid-cols-[38px_minmax(0,1fr)] max-[359px]:gap-3 max-[359px]:p-[17px]"
              key={feature.title}
            >
              <span
                className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[14px] bg-[#eff8d8] text-[13px] leading-none font-extrabold text-[#344700] max-[359px]:h-[38px] max-[359px]:w-[38px]"
                aria-hidden="true"
              >
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0">
                <h3 className="mt-px mb-1.5 text-[17px] leading-[1.4] font-extrabold tracking-[-0.015em] text-[#191f28]">
                  {feature.title}
                </h3>

                <p className="m-0 break-keep text-sm leading-[1.55] text-[#6b7684]">{feature.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className="mx-6 mt-6 rounded-[20px] bg-[#f2f4f6] p-5 max-[359px]:mx-5" aria-label="서비스 준비 안내">
        <strong className="mb-[7px] block text-[15px] leading-[1.45] font-extrabold text-[#333d4b]">
          상품 조회 기능을 먼저 연결하고 있어요.
        </strong>

        <p className="m-0 break-keep text-sm leading-[1.6] text-[#6b7684]">
          로그인, 장바구니, 주문 및 결제 기능은 아직 연결하지 않았어요. 기존 도깨비테니스 서비스와의 연동을 검증한 뒤
          순차적으로 제공할 예정입니다.
        </p>
      </aside>
    </main>
  );
}

export default App;
