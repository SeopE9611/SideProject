import Image from "next/image";
import Link from "next/link";
import { getPublishedFixtureNewsPosts } from "@/content/fixtures/news.fixture";
import { visualDocumentFixtures, visualProgramFixtures } from "@/content/fixtures/visual.fixture";
import samplePhoto from "@/content/fixtures/assets/home-still-life.png";
import sampleLandscape from "@/content/fixtures/assets/landscape.webp";
import samplePortrait from "@/content/fixtures/assets/portrait.webp";
import { RedesignNavigation, RedesignNewsExplorer, type RedesignScreen } from "./redesign-controls";
import styles from "./redesign-preview.module.css";

const base = "/design-preview/redesign";
const news = getPublishedFixtureNewsPosts();
const titles = { home: "홈", about: "기관소개", support: "후원·봉사", news: "소식·자료" };

function Arrow() {
  return <span aria-hidden="true">↗</span>;
}
function TextLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className={styles.textLink}>
      {children}
      <Arrow />
    </Link>
  );
}

function Documents() {
  return (
    <section id="documents" className={styles.documents} aria-labelledby="redesign-documents-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>운영 정보</p>
          <h2 id="redesign-documents-heading">운영 자료공개</h2>
        </div>
        <span className={styles.testLabel}>예시 자료 · 실제 보고서 아님</span>
      </div>
      <p className={styles.muted}>분류와 기준 기간을 먼저 확인하고 자료를 찾는 구성입니다.</p>
      <div className={styles.documentList}>
        {visualDocumentFixtures.map((document) => (
          <details key={document.slug} className={styles.documentRow}>
            <summary>
              <span className={styles.documentCategory}>
                {document.category === "operations" ? "운영" : "예산·결산"}
              </span>
              <span className={styles.documentTitle}>{document.title}</span>
              <span>{document.periodLabel}</span>
              <span className={styles.fileType}>PDF · 정보 보기 +</span>
            </summary>
            <p>{document.summary} 이 시안에서는 파일 다운로드를 제공하지 않습니다.</p>
          </details>
        ))}
      </div>
    </section>
  );
}

function Contact() {
  return (
    <section id="contact" className={styles.contact} aria-labelledby="redesign-contact-heading">
      <div>
        <p className={styles.eyebrow}>문의와 방문</p>
        <h2 id="redesign-contact-heading">어떤 안내가 필요하신가요?</h2>
        <p>전화·온라인 문의와 방문 정보의 배치를 확인하는 영역입니다.</p>
      </div>
      <div className={styles.contactChannels}>
        <strong>연락처 표시 영역</strong>
        <p>공식 연락처 확인 후 표시 · 현재 시안에서는 전화·문의 요청을 보내지 않습니다.</p>
        <details>
          <summary>방문 정보 표시 예시</summary>
          <p>확인된 주소와 지도 링크가 들어갈 위치입니다. 실제 길찾기 기능은 연결하지 않았습니다.</p>
        </details>
      </div>
    </section>
  );
}

function Participation({ full = false }: { full?: boolean }) {
  return (
    <section className={styles.participation} aria-labelledby="redesign-participation-heading">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.eyebrow}>함께하는 방법</p>
          <h2 id="redesign-participation-heading">후원과 자원봉사</h2>
        </div>
        <span className={styles.testLabel}>참여 안내 설계 예시</span>
      </div>
      <div className={styles.participationGrid}>
        <article id="donation">
          <span className={styles.participationLabel}>후원</span>
          <h3>후원에 대해 알아보고 싶어요</h3>
          <p>후원 방법을 알아보는 안내와 영수증·내역에 관한 문의를 구분합니다.</p>
          {full && (
            <div className={styles.participationBody}>
              <h4>후원 전 확인할 정보</h4>
              <ul>
                <li>가능한 후원 방식과 공식 안내</li>
                <li>후원 관련 문의 경로</li>
                <li>영수증·내역 확인 안내</li>
              </ul>
              <p className={styles.small}>
                위 항목은 콘텐츠 구성안입니다. 계좌·후원 방식·사용처·영수증 절차는 공식 자료 확인 전 제공하지 않습니다.
              </p>
            </div>
          )}
          <TextLink href={full ? "#donation-inquiry" : `${base}/support#donation`}>
            {full ? "후원 문의 화면 위치 보기" : "후원 안내 살펴보기"}
          </TextLink>
        </article>
        <article id="volunteer">
          <span className={styles.participationLabel}>자원봉사</span>
          <h3>자원봉사 참여를 알아보고 싶어요</h3>
          <p>가능한 활동과 일정을 먼저 확인하고 담당자와 참여를 의논하는 안내를 제공합니다.</p>
          {full && (
            <div className={styles.participationBody}>
              <h4>참여 전 확인할 정보</h4>
              <ul>
                <li>가능한 활동과 참여 대상</li>
                <li>일정·활동 범위 확인</li>
                <li>방문 전 준비와 개인정보 안내</li>
              </ul>
              <p className={styles.small}>
                활동·일정은 미확정입니다. 문의만으로 참여가 자동 확정되는 안내나 접수 기능은 제공하지 않습니다.
              </p>
            </div>
          )}
          <TextLink href={full ? "#volunteer-inquiry" : `${base}/support#volunteer`}>
            {full ? "봉사 문의 화면 위치 보기" : "자원봉사 안내 살펴보기"}
          </TextLink>
        </article>
      </div>
    </section>
  );
}

function Admission() {
  return (
    <section id="admission" className={styles.admission} aria-labelledby="redesign-admission-heading">
      <div>
        <p className={styles.eyebrow}>입소·이용</p>
        <h2 id="redesign-admission-heading">상담 안내 위치를 확인해 주세요</h2>
      </div>
      <div>
        <p>입소·이용 안내는 신규 설계 후보입니다. 운영 경로와 상담 접수 기능은 구현되지 않았습니다.</p>
        <p className={styles.small}>
          자격·정원·신청 절차를 안내하지 않습니다. 실제 운영에서는 확인된 전화·일반 문의 경로만 연결할 예정입니다.
        </p>
        <span className={styles.testLabel}>설계 후보 · 접수 불가</span>
      </div>
    </section>
  );
}

function Home() {
  return (
    <>
      <section className={styles.hero} aria-labelledby="redesign-home-heading">
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>샬롬의집 · 새로운 홈페이지 구성안</p>
          <h1 id="redesign-home-heading">
            생활을 알아보고,
            <br />
            상담과 참여로
            <br />
            <em>이어지는 곳.</em>
          </h1>
          <p className={styles.heroDescription}>
            장애인의 거주와 일상생활 지원, 입소·이용 상담, 후원과 자원봉사 정보를 함께 안내합니다.
          </p>
          <Link href={`${base}/about`} className={styles.primaryButton}>
            샬롬의집 알아보기 <Arrow />
          </Link>
          <span className={styles.copyNote}>정보구조 검토용 문구 · 기관 공식 슬로건 아님</span>
        </div>
        <figure className={styles.heroFigure}>
          <Image
            src={samplePhoto}
            alt="붓과 수채화 종이를 배치한 AI 생성 디자인 예시. 실제 기관·활동 사진이 아닙니다."
            sizes="(min-width: 1200px) 52vw, 100vw"
            preload
          />
          <figcaption>AI 생성 디자인 예시 · 실제 기관 사진 아님</figcaption>
        </figure>
      </section>
      <nav className={styles.quickLinks} aria-label="방문 목적별 빠른 안내">
        <Link href="#admission">
          <span>상담이 필요하신가요?</span>
          <strong>
            입소·이용 상담 <Arrow />
          </strong>
        </Link>
        <Link href={`${base}/support#donation`}>
          <span>후원을 알아보시나요?</span>
          <strong>
            후원 안내 <Arrow />
          </strong>
        </Link>
        <Link href={`${base}/support#volunteer`}>
          <span>참여하고 싶으신가요?</span>
          <strong>
            자원봉사 안내 <Arrow />
          </strong>
        </Link>
      </nav>
      <section id="life" className={styles.life} aria-labelledby="redesign-life-heading">
        <div>
          <p className={styles.eyebrow}>기관의 역할</p>
          <h2 id="redesign-life-heading">
            생활과 지원,
            <br />
            그리고 일상의 기록
          </h2>
          <p className={styles.lead}>기관의 지원을 설명하는 안내와 실제 활동을 전하는 기록을 구분합니다.</p>
          <TextLink href={`${base}/about#spaces`}>생활공간 안내 위치 보기</TextLink>
        </div>
        <div className={styles.lifeContent}>
          <div className={styles.roleRow}>
            <h3>거주와 일상생활 지원</h3>
            <p>실제 지원 범위를 담을 영역입니다. 세부 서비스는 기관의 확인 후 작성합니다.</p>
          </div>
          <div className={styles.roleRow}>
            <h3>상담과 지역사회 참여</h3>
            <p>입소·이용 상담과 후원·봉사, 기관 활동을 각각의 목적에 맞게 연결합니다.</p>
          </div>
          <div id="programs" className={styles.programs}>
            <h3>프로그램 안내</h3>
            <span className={styles.testLabel}>기존 고정 테스트 데이터</span>
            {visualProgramFixtures.map((program) => (
              <details key={program.id}>
                <summary>{program.title}</summary>
                <p>{program.summary}</p>
                <p>{program.purpose}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
      <section id="records" className={styles.records} aria-labelledby="redesign-records-heading">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>소식과 기록</p>
            <h2 id="redesign-records-heading">최근 소식을 전합니다</h2>
          </div>
          <TextLink href={`${base}/news`}>소식·자료 전체 보기</TextLink>
        </div>
        <div className={styles.recordsGrid}>
          <div className={styles.homeNews}>
            {news.slice(0, 3).map((post) => (
              <article key={post.id}>
                <div className={styles.meta}>
                  <span>{post.category === "notice" ? "공지사항" : "활동소식"}</span>
                  <time dateTime={post.publishedAt}>{post.publishedAt.slice(0, 10).replaceAll("-", ".")}</time>
                </div>
                <h3>
                  <Link href={`${base}/news#${post.id}`}>{post.title}</Link>
                </h3>
              </article>
            ))}
          </div>
          <figure className={styles.recordFigure}>
            <Image
              src={sampleLandscape}
              alt="화면 배치를 확인하는 가로형 테스트 도형 이미지. 실제 활동사진이 아닙니다."
              sizes="(min-width: 900px) 40vw, 100vw"
            />
            <figcaption>
              <strong>활동사진이 들어갈 자리</strong>
              <span>도형 테스트 이미지 · 실제 활동 기록 아님</span>
            </figcaption>
          </figure>
        </div>
      </section>
      <section className={styles.homeParticipation} aria-labelledby="redesign-home-participation-heading">
        <div>
          <p className={styles.eyebrow}>후원과 자원봉사</p>
          <h2 id="redesign-home-participation-heading">관심에서 참여로</h2>
          <p>
            안내를 읽는 행동과 문의하는 행동을 구분합니다.
            <br />
            아래는 문의 동선의 위치를 확인하는 링크입니다.
          </p>
        </div>
        <div className={styles.participationActions}>
          <TextLink href={`${base}/support#donation-inquiry`}>후원 문의 안내</TextLink>
          <TextLink href={`${base}/support#volunteer-inquiry`}>자원봉사 문의 안내</TextLink>
        </div>
      </section>
      <Documents />
      <Admission />
      <Contact />
    </>
  );
}

function About() {
  return (
    <>
      <div className={styles.aboutIntro}>
        <div>
          <p className={styles.eyebrow}>기관소개</p>
          <h1>
            샬롬의집을
            <br />
            소개합니다
          </h1>
          <p className={styles.lead}>
            거주와 일상생활 지원을 바탕으로 상담, 후원, 자원봉사와 지역사회를 연결하는 기관의 역할을 안내합니다.
          </p>
          <p className={styles.small}>
            사용자가 설명한 기관 역할을 토대로 구성한 디자인 문구입니다. 세부 운영 방침은 공식 확인이 필요합니다.
          </p>
        </div>
        <figure className={styles.aboutMark}>
          <Image src="/brand/logo-stacked.svg" width={860} height={860} alt="샬롬의집 공식 세로형 로고" unoptimized />
          <figcaption>공식 로고 · 비율과 색상 유지</figcaption>
        </figure>
      </div>
      <nav className={styles.localNavigation} aria-label="기관소개 시안 내 탐색">
        <a href="#overview">기관개요</a>
        <a href="#direction">운영 방향</a>
        <a href="#people">사람과 공간</a>
        <a href="#identity">공식 로고</a>
      </nav>
      <section id="overview" className={styles.editorial}>
        <div>
          <p className={styles.eyebrow}>기관개요</p>
          <h2>
            어떤 기관인지,
            <br />
            먼저 알 수 있도록
          </h2>
        </div>
        <div>
          <p className={styles.lead}>기관을 소개하는 문장과 서로 다른 사실을 담은 정보를 함께 배치합니다.</p>
          <p>
            시설 유형과 생활 설명을 같은 내용의 카드로 반복하지 않습니다. 운영 주체·공식 기본 현황·연혁은 확인된 자료가
            있을 때만 추가합니다.
          </p>
          <dl className={styles.facts}>
            <div>
              <dt>공식 기관명</dt>
              <dd>샬롬의집</dd>
            </div>
            <div>
              <dt>기관 역할</dt>
              <dd>거주·일상생활 지원, 상담, 후원·자원봉사, 소식·운영 정보 제공</dd>
            </div>
          </dl>
        </div>
      </section>
      <section id="direction" className={styles.direction}>
        <p className={styles.eyebrow}>운영 방향 표시 예시</p>
        <h2>
          운영 정보와 생활 안내를
          <br />
          각각의 내용에 맞게
        </h2>
        <p>이 영역은 공식 운영 방향을 담을 본문 위치입니다. 승인되지 않은 미션·비전·기관 철학은 작성하지 않았습니다.</p>
        <span className={styles.testLabel}>공식 자료 확인 필요</span>
      </section>
      <section id="people" className={styles.peopleSpaces} aria-labelledby="redesign-people-heading">
        <div>
          <p className={styles.eyebrow}>사람과 공간</p>
          <h2 id="redesign-people-heading">
            기관을 이해하는
            <br />또 다른 안내
          </h2>
          <div className={styles.roleRow}>
            <h3>함께하는 사람들</h3>
            <p>직원의 역할·담당 업무를 소개할 위치입니다. 실제 직원 이름과 인물 사진은 사용하지 않았습니다.</p>
          </div>
          <div id="spaces" className={styles.roleRow}>
            <h3>생활공간</h3>
            <p>
              공개 가능한 공간 설명과 승인 사진을 배치할 위치입니다. 오른쪽 이미지는 공간 사진이 아닌 도형 테스트
              자산입니다.
            </p>
          </div>
          <TextLink href={`${base}#life`}>생활·지원 시안 보기</TextLink>
        </div>
        <figure className={styles.spaceFigure}>
          <Image
            src={samplePortrait}
            alt="세로형 도형 테스트 이미지. 실제 직원이나 생활공간의 사진이 아닙니다."
            sizes="(min-width: 900px) 35vw, 100vw"
          />
          <figcaption>기존 테스트 자산 · 실제 공간 아님</figcaption>
        </figure>
      </section>
      <section id="identity" className={styles.identity}>
        <div>
          <p className={styles.eyebrow}>공식 로고</p>
          <h2>샬롬의집의 이름과 색</h2>
          <p>공식 SVG 자산을 그대로 사용합니다.</p>
        </div>
        <Image src="/brand/logo-header.svg" width={1400} height={360} alt="샬롬의집 공식 가로형 로고" unoptimized />
      </section>
      <Contact />
    </>
  );
}

function Support() {
  return (
    <>
      <div className={styles.pageIntro}>
        <p className={styles.eyebrow}>후원·봉사</p>
        <h1>
          함께하는 방법을
          <br />
          알아보세요
        </h1>
        <p className={styles.lead}>후원과 자원봉사, 서로 다른 참여 목적에 맞는 안내를 찾습니다.</p>
      </div>
      <nav className={styles.localNavigation} aria-label="후원·봉사 시안 내 탐색">
        <a href="#donation">후원 안내</a>
        <a href="#volunteer">자원봉사 안내</a>
        <a href="#inquiries">문의 안내</a>
      </nav>
      <Participation full />
      <section id="inquiries" className={styles.inquiries} aria-labelledby="redesign-inquiries-heading">
        <div>
          <p className={styles.eyebrow}>문의 동선</p>
          <h2 id="redesign-inquiries-heading">
            안내 다음의 행동도
            <br />
            목적에 맞게
          </h2>
          <p>입력·접수 기능이 없는 화면 구성 예시입니다.</p>
        </div>
        <div className={styles.inquiryChoices}>
          <div id="donation-inquiry">
            <h3>후원 문의</h3>
            <p>후원 방법 문의와 영수증·내역 문의를 구분할 자리입니다.</p>
            <span className={styles.testLabel}>시안 · 접수 기능 없음</span>
          </div>
          <div id="volunteer-inquiry">
            <h3>자원봉사 문의</h3>
            <p>활동 가능 여부·일정·범위를 담당자와 확인할 자리입니다.</p>
            <span className={styles.testLabel}>시안 · 접수 기능 없음</span>
          </div>
        </div>
      </section>
      <Documents />
      <Contact />
    </>
  );
}

export function RedesignPreview({ screen }: { screen: RedesignScreen }) {
  return (
    <div className={styles.preview}>
      <a className={styles.skipLink} href="#redesign-main">
        시안 본문 바로가기
      </a>
      <aside className={styles.reviewBar} aria-label="디자인 시안 안내">
        <span>
          <strong>DESIGN PREVIEW</strong> 검토 중인 시안 · 모든 기록·이미지는 테스트 · 저장·접수 기능 없음
        </span>
        <div>
          <Link href="/design-preview">기존 공개 시안</Link>
          <Link href="/design-preview/admin">기존 관리자 시안</Link>
        </div>
      </aside>
      <RedesignNavigation key={screen} current={screen} />
      <main id="redesign-main" tabIndex={-1} className={styles.main}>
        {screen !== "home" && (
          <nav aria-label="Breadcrumb" className={styles.breadcrumb}>
            <Link href={base}>시안 홈</Link>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{titles[screen]}</span>
          </nav>
        )}
        {screen === "home" ? (
          <Home />
        ) : screen === "about" ? (
          <About />
        ) : screen === "support" ? (
          <Support />
        ) : (
          <>
            <div className={styles.pageIntro}>
              <p className={styles.eyebrow}>소식·자료</p>
              <h1>
                소식과 운영 정보를
                <br />
                한눈에
              </h1>
              <p className={styles.lead}>공지·활동소식은 읽기 쉬운 목록으로, 운영자료는 분류와 기간으로 찾습니다.</p>
            </div>
            <nav className={styles.localNavigation} aria-label="소식·자료 시안 내 탐색">
              <a href="#redesign-news-list">소식 목록</a>
              <a href="#documents">운영 자료공개</a>
            </nav>
            <div className={styles.newsExplorer}>
              <RedesignNewsExplorer items={news} />
            </div>
            <Documents />
            <Contact />
          </>
        )}
      </main>
      <footer className={styles.footer}>
        <div>
          <Link href={base} aria-label="샬롬의집 리디자인 시안 홈">
            <Image src="/brand/logo-footer.svg" width={1400} height={360} alt="샬롬의집" unoptimized />
          </Link>
          <p>기관소개 · 생활과 지원 · 상담 · 후원과 봉사 · 소식과 자료</p>
          <small>디자인 검토용 테스트 화면입니다. 실제 기관 자료·정책·활동 기록이 아닙니다.</small>
        </div>
        <nav aria-label="시안 하단 메뉴">
          <Link href={`${base}/about`}>기관소개</Link>
          <Link href={`${base}/support`}>후원·봉사</Link>
          <Link href={`${base}/news#documents`}>운영 자료공개</Link>
          <Link href={`${base}#contact`}>문의·방문</Link>
        </nav>
      </footer>
    </div>
  );
}
