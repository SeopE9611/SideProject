import { Top } from "@toss/tds-mobile";
import { useCallback, useEffect, useRef, useState } from "react";

import { getStringingProducts } from "./api/products";
import "./App.css";
import { ProductCard } from "./components/ProductCard";
import ProductDetail from "./components/ProductDetail";
import type { Product } from "./types/product";

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
function getProductIdFromLocation() {
  return new URLSearchParams(window.location.search).get("productId");
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadState, setLoadState] = useState<ProductLoadState>("loading");
  const [selectedProductId, setSelectedProductId] = useState<string | null>(() => getProductIdFromLocation());

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

    window.history.pushState({ productId }, "", `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);

    setSelectedProductId(productId);

    window.scrollTo({
      top: 0,
      behavior: "auto",
    });
  }, []);
  if (selectedProductId) {
    return <ProductDetail productId={selectedProductId} />;
  }
  return (
    <main className="app-shell">
      <section className="intro-section" aria-labelledby="service-title">
        <div className="status-row">
          <span className="status-badge">
            <span className="status-dot" aria-hidden="true" />
            앱인토스 베타
          </span>
        </div>

        <h1 id="service-title" className="visually-hidden">
          도깨비테니스
        </h1>

        <Top
          title={<Top.TitleParagraph size={22}>도깨비테니스</Top.TitleParagraph>}
          subtitleBottom={
            <Top.SubtitleParagraph size={17}>토스에서 만나는 테니스 쇼핑·스트링 교체 서비스</Top.SubtitleParagraph>
          }
        />

        <p className="intro-description">
          도깨비테니스에서 판매 중인 스트링을 앱인토스에서 확인할 수 있어요. 주문과 교체서비스 기능은 안정성 검증 후
          순차적으로 연결할 예정이에요.
        </p>
      </section>

      <section className="products-section" aria-labelledby="products-title">
        <header className="section-heading">
          <p className="section-eyebrow">STRING SHOP</p>
          <h2 id="products-title">지금 판매 중인 스트링</h2>
        </header>

        {loadState === "loading" && (
          <div className="product-grid" aria-label="상품을 불러오는 중">
            {Array.from({ length: 6 }).map((_, index) => (
              <div className="product-skeleton" key={index} aria-hidden="true">
                <div className="skeleton-image" />
                <div className="skeleton-line skeleton-line-short" />
                <div className="skeleton-line" />
                <div className="skeleton-line skeleton-line-price" />
              </div>
            ))}
          </div>
        )}

        {loadState === "error" && (
          <div className="product-state-card" role="alert">
            <strong>상품 정보를 불러오지 못했어요.</strong>
            <p>네트워크 상태를 확인한 뒤 다시 시도해주세요.</p>

            <button className="retry-button" type="button" onClick={() => void loadProducts()}>
              다시 시도
            </button>
          </div>
        )}

        {loadState === "success" && products.length === 0 && (
          <div className="product-state-card">
            <strong>현재 표시할 스트링이 없어요.</strong>
            <p>판매 가능한 상품을 준비하고 있어요.</p>
          </div>
        )}

        {loadState === "success" && products.length > 0 && (
          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product._id} product={product} onSelect={handleSelectProduct} />
            ))}
          </div>
        )}
      </section>

      <section className="feature-section" aria-labelledby="planned-features-title">
        <header className="section-heading">
          <p className="section-eyebrow">COMING SOON</p>
          <h2 id="planned-features-title">다음으로 준비 중인 기능</h2>
        </header>

        <ol className="feature-list">
          {plannedFeatures.map((feature, index) => (
            <li className="feature-card" key={feature.title}>
              <span className="feature-index" aria-hidden="true">
                {String(index + 1).padStart(2, "0")}
              </span>

              <div className="feature-copy">
                <h3>{feature.title}</h3>
                <p>{feature.description}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <aside className="notice-card" aria-label="서비스 준비 안내">
        <strong>상품 조회 기능을 먼저 연결하고 있어요.</strong>
        <p>
          로그인, 장바구니, 주문 및 결제 기능은 아직 연결하지 않았어요. 기존 도깨비테니스 서비스와의 연동을 검증한 뒤
          순차적으로 제공할 예정입니다.
        </p>
      </aside>
    </main>
  );
}

export default App;
