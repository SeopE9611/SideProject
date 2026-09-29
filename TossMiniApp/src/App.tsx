import { Top } from "@toss/tds-mobile";
import { useCallback, useEffect, useRef, useState } from "react";

import { getStringingProducts } from "./api/products";
import { useAppsInTossAuth } from "./auth/AppsInTossAuthContext";
import ActivityScreen from "./components/ActivityScreen";
import RacketCatalogScreen, { initialRacketCatalogState } from "./components/RacketCatalogScreen";
import RacketDetail from "./components/RacketDetail";
import RacketPurchaseFlow from "./components/RacketPurchaseFlow";
import RacketRentalFlow from "./components/RacketRentalFlow";
import { ProductCard } from "./components/ProductCard";
import ProductDetail from "./components/ProductDetail";
import StringingApplicationFlow from "./components/StringingApplicationFlow";
import StringingPendingPaymentRecovery from "./components/StringingPendingPaymentRecovery";
import { readPendingAppsPayment, type PendingAppsPayment } from "./lib/pending-payment";
import type { Product } from "./types/product";
import type { StringingStartSelection } from "./types/stringing";

type ProductLoadState = "loading" | "success" | "error";

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function getSearchParamsFromLocation() {
  return new URLSearchParams(window.location.search);
}

function getProductIdFromLocation() {
  return getSearchParamsFromLocation().get("productId");
}

function getStringingCheckoutModeFromLocation() {
  return getSearchParamsFromLocation().get("view") === "stringing-checkout";
}

function getActivityModeFromLocation() {
  return getSearchParamsFromLocation().get("view") === "activity";
}

function getRacketModeFromLocation() {
  return getSearchParamsFromLocation().get("view") === "rackets";
}

function getRacketPurchaseModeFromLocation() {
  return getSearchParamsFromLocation().get("view") === "racket-purchase";
}
function getRacketRentalModeFromLocation() { return getSearchParamsFromLocation().get("view") === "racket-rental"; }

function getRacketIdFromLocation() {
  return getSearchParamsFromLocation().get("racketId");
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
  const auth = useAppsInTossAuth();
  const [products, setProducts] = useState<Product[]>([]);

  const [loadState, setLoadState] = useState<ProductLoadState>("loading");

  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => getProductIdFromLocation());

  const [isStringingCheckout, setIsStringingCheckout] = useState(() => getStringingCheckoutModeFromLocation());
  const [isActivity, setIsActivity] = useState(() => getActivityModeFromLocation());
  const [isRackets, setIsRackets] = useState(() => getRacketModeFromLocation());
  const [isRacketPurchase, setIsRacketPurchase] = useState(() => getRacketPurchaseModeFromLocation());
  const [isRacketRental, setIsRacketRental] = useState(() => getRacketRentalModeFromLocation());
  const [selectedRacketId, setSelectedRacketId] = useState<string | null>(() => getRacketIdFromLocation());
  const [racketCatalog, setRacketCatalog] = useState(initialRacketCatalogState);
  const [pendingPayment, setPendingPayment] = useState<PendingAppsPayment | null>(() => readPendingAppsPayment());

  const [detailSelectedColor, setDetailSelectedColor] = useState(() => getSelectedColorFromLocation());

  const [detailSelectedGauge, setDetailSelectedGauge] = useState(() => getSelectedGaugeFromLocation());

  const listScrollYRef = useRef(0);
  const racketListScrollYRef = useRef(0);

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
      setPendingPayment(readPendingAppsPayment());
      const nextProductId = getProductIdFromLocation();

      setSelectedProductId(nextProductId);
      setIsStringingCheckout(getStringingCheckoutModeFromLocation());
      setIsActivity(getActivityModeFromLocation());
      const nextIsRackets = getRacketModeFromLocation();
      const nextIsRacketPurchase = getRacketPurchaseModeFromLocation();
      const nextIsRacketRental = getRacketRentalModeFromLocation();
      const nextRacketId = getRacketIdFromLocation();
      setIsRackets(nextIsRackets);
      setIsRacketPurchase(nextIsRacketPurchase);
      setIsRacketRental(nextIsRacketRental);
      setSelectedRacketId(nextRacketId);

      setDetailSelectedColor(getSelectedColorFromLocation());

      setDetailSelectedGauge(getSelectedGaugeFromLocation());

      requestAnimationFrame(() => {
        window.scrollTo({
          top: nextRacketId ? 0 : nextIsRackets ? racketListScrollYRef.current : nextProductId ? 0 : listScrollYRef.current,
          behavior: "auto",
        });
      });
    };

    window.addEventListener("popstate", handlePopState);

    return () => {
      window.removeEventListener("popstate", handlePopState);
    };
  }, []);

  const handlePendingPaymentResolved = useCallback(() => {
    setPendingPayment(readPendingAppsPayment());
  }, []);

  const navigate = useCallback((view?: "activity" | "rackets") => {
    const nextUrl = new URL(window.location.href);
    nextUrl.search = view ? `?view=${view}` : "";
    window.history.pushState({ view }, "", `${nextUrl.pathname}${nextUrl.search}`);
    setSelectedProductId(null); setIsStringingCheckout(false); setIsActivity(view === "activity");
    setIsRackets(view === "rackets"); setIsRacketPurchase(false); setIsRacketRental(false); setSelectedRacketId(null);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const handleSelectRacket = useCallback((racketId: string) => {
    racketListScrollYRef.current = window.scrollY;
    const nextUrl = new URL(window.location.href);
    nextUrl.search = "";
    nextUrl.searchParams.set("view", "rackets");
    nextUrl.searchParams.set("racketId", racketId);
    window.history.pushState({ view: "rackets", racketId }, "", `${nextUrl.pathname}${nextUrl.search}`);
    setIsRackets(true); setIsRacketPurchase(false); setIsRacketRental(false); setSelectedRacketId(racketId); window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const handleRacketList = useCallback(() => {
    const nextUrl = new URL(window.location.href);
    nextUrl.search = "";
    nextUrl.searchParams.set("view", "rackets");
    window.history.replaceState({ view: "rackets" }, "", `${nextUrl.pathname}${nextUrl.search}`);
    setIsRackets(true);
    setIsRacketPurchase(false);
    setIsRacketRental(false);
    setSelectedRacketId(null);
    requestAnimationFrame(() => window.scrollTo({ top: racketListScrollYRef.current, behavior: "auto" }));
  }, []);

  const handleStartRacketPurchase = useCallback((racketId: string) => {
    const nextUrl = new URL(window.location.href);
    nextUrl.search = "";
    nextUrl.searchParams.set("view", "racket-purchase");
    nextUrl.searchParams.set("racketId", racketId);
    nextUrl.searchParams.set("step", "1");
    window.history.pushState({ view: "racket-purchase", racketId, step: 1 }, "", `${nextUrl.pathname}${nextUrl.search}`);
    setIsRackets(false);
    setIsRacketPurchase(true);
    setSelectedRacketId(racketId);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, []);

  const handleRacketPurchaseBackToDetail = useCallback(() => {
    if (!selectedRacketId) return;
    const nextUrl = new URL(window.location.href);
    nextUrl.search = "";
    nextUrl.searchParams.set("view", "rackets");
    nextUrl.searchParams.set("racketId", selectedRacketId);
    window.history.replaceState({ view: "rackets", racketId: selectedRacketId }, "", `${nextUrl.pathname}${nextUrl.search}`);
    setIsRacketPurchase(false);
    setIsRackets(true);
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [selectedRacketId]);

  const handleStartRacketRental = useCallback((racketId: string) => { const url = new URL(window.location.href); url.search = ""; url.searchParams.set("view", "racket-rental"); url.searchParams.set("racketId", racketId); url.searchParams.set("step", "1"); window.history.pushState({ view: "racket-rental", racketId, step: 1 }, "", `${url.pathname}${url.search}`); setIsRackets(false); setIsRacketPurchase(false); setIsRacketRental(true); setSelectedRacketId(racketId); window.scrollTo({ top: 0 }); }, []);
  const handleRacketRentalBackToDetail = useCallback(() => { if (!selectedRacketId) return; const url = new URL(window.location.href); url.search = ""; url.searchParams.set("view", "rackets"); url.searchParams.set("racketId", selectedRacketId); window.history.replaceState({ view: "rackets", racketId: selectedRacketId }, "", `${url.pathname}${url.search}`); setIsRacketRental(false); setIsRackets(true); }, [selectedRacketId]);

  const handleSelectProduct = useCallback((productId: string) => {
    listScrollYRef.current = window.scrollY;

    const nextUrl = new URL(window.location.href);

    nextUrl.searchParams.set("productId", productId);

    nextUrl.searchParams.delete("view");
    nextUrl.searchParams.delete("selectedColor");
    nextUrl.searchParams.delete("selectedGauge");

    window.history.pushState({ productId }, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);

    setSelectedProductId(productId);
    setIsStringingCheckout(false);
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

    applyUrl.searchParams.set("view", "stringing-checkout");

    window.history.pushState(
      {
        productId: selection.productId,
        view: "stringing-checkout",
      },
      "",
      `${applyUrl.pathname}${applyUrl.search}${applyUrl.hash}`,
    );

    setSelectedProductId(selection.productId);

    setDetailSelectedColor(selection.selectedColor);

    setDetailSelectedGauge(selection.selectedGauge);

    setIsStringingCheckout(true);

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);

  if (pendingPayment) {
    return <StringingPendingPaymentRecovery pending={pendingPayment} onResolved={handlePendingPaymentResolved} />;
  }

  if (isRacketRental && selectedRacketId) return <RacketRentalFlow key={selectedRacketId} racketId={selectedRacketId} onBackToDetail={handleRacketRentalBackToDetail} onViewActivity={() => navigate("activity")} />;

  if (isRacketPurchase && selectedRacketId) {
    return (
      <RacketPurchaseFlow
        key={selectedRacketId}
        racketId={selectedRacketId}
        onBackToDetail={handleRacketPurchaseBackToDetail}
        onViewActivity={() => navigate("activity")}
      />
    );
  }

  if (isRackets && selectedRacketId) {
    return <RacketDetail racketId={selectedRacketId} onBack={handleRacketList} onPurchase={() => handleStartRacketPurchase(selectedRacketId)} onRental={() => handleStartRacketRental(selectedRacketId)} />;
  }

  if (isRackets) return <RacketCatalogScreen catalog={racketCatalog} setCatalog={setRacketCatalog} onHome={() => navigate()} onSelect={handleSelectRacket} />;

  if (isActivity) return <ActivityScreen onHome={() => navigate()} />;

  if (selectedProductId && isStringingCheckout) {
    return (
      <StringingApplicationFlow
        productId={selectedProductId}
        selectedColor={detailSelectedColor}
        selectedGauge={detailSelectedGauge}
        onViewActivity={() => navigate("activity")}
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
          <Top.SubtitleParagraph size={17}>토스에서 바로 신청하는 스트링 교체서비스</Top.SubtitleParagraph>
          }
        />

        <p className="m-0 break-keep px-6 text-[15px] leading-[1.65] text-[#6b7684] max-[359px]:px-5">
          스트링을 고르고 옵션을 선택한 뒤 교체서비스 신청과 토스페이 결제까지 한 번에 진행할 수 있어요.
        </p>
        <div className="mt-5 flex gap-2 px-6 max-[359px]:px-5"><button type="button" className="min-h-12 flex-1 rounded-2xl border-0 bg-[#191f28] font-bold text-white" onClick={() => document.getElementById("products-title")?.scrollIntoView()}>교체서비스 시작</button><button type="button" className="min-h-12 flex-1 rounded-2xl border border-[#d1d6db] bg-white font-bold" onClick={() => navigate("activity")}>내 이용내역</button></div>
        <div className="mt-3 px-6 text-sm text-[#6b7684] max-[359px]:px-5">{auth.status === "authenticated" ? `${auth.user.name}님, 로그인 중이에요.` : "결제 단계에서 토스 로그인으로 안전하게 연결해요."}</div>
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

      <section className="mx-6 mt-10 rounded-[20px] border border-[#e5e8eb] p-5 max-[359px]:mx-5" aria-labelledby="rackets-entry-title">
        <p className="mb-1.5 text-xs font-extrabold tracking-[0.08em] text-[#688d00]">RACKET SHOP</p>
        <h2 id="rackets-entry-title" className="m-0 text-xl font-extrabold">중고 라켓</h2>
        <p className="mt-2 mb-4 text-sm leading-6 text-[#6b7684]">검수된 중고 라켓을 조건별로 둘러보세요.</p>
        <button type="button" className="min-h-11 w-full rounded-xl border border-[#d1d6db] bg-white font-bold" onClick={() => navigate("rackets")}>라켓 둘러보기</button>
      </section>

    </main>
  );
}

export default App;
