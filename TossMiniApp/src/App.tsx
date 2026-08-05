import { Top } from "@toss/tds-mobile";
import "./App.css";

const plannedFeatures = [
  {
    title: "스트링 찾기",
    description: "플레이 성향과 상품 특성을 비교하며 나에게 맞는 스트링을 살펴볼 수 있어요.",
  },
  {
    title: "교체서비스",
    description: "스트링 선택부터 교체 신청까지 한 흐름으로 이용할 수 있도록 준비하고 있어요.",
  },
  {
    title: "중고 라켓",
    description: "판매 중인 중고 라켓의 상태와 주요 정보를 모바일에서 편하게 확인할 수 있어요.",
  },
] as const;

function App() {
  return (
    <main className="app-shell">
      <section className="intro-section" aria-labelledby="service-title">
        <div className="status-row">
          <span className="status-badge">
            <span className="status-dot" aria-hidden="true" />
            앱인토스 서비스 준비 중
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
          현재 앱인토스 전용 화면을 준비하고 있어요. 상품 조회와 교체서비스 기능을 안정성 검증 후 순차적으로 연결할
          예정이에요.
        </p>
      </section>

      <section className="feature-section" aria-labelledby="planned-features-title">
        <header className="section-heading">
          <p className="section-eyebrow">COMING SOON</p>
          <h2 id="planned-features-title">먼저 만나볼 기능</h2>
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
        <strong>현재는 서비스 준비 안내 화면입니다.</strong>
        <p>
          로그인, 장바구니, 주문 및 결제 기능은 아직 연결하지 않았어요. 각 기능은 기존 도깨비테니스 서비스와의 연동을
          검증한 뒤 제공할 예정입니다.
        </p>
      </aside>
    </main>
  );
}

export default App;
