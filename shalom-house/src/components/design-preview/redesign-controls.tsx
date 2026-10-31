"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./redesign-preview.module.css";

export const redesignBase = "/design-preview/redesign";
export type RedesignScreen = "home" | "about" | "support" | "news";

const groups = [
  {
    label: "기관소개",
    href: `${redesignBase}/about`,
    screen: "about",
    children: [
      ["기관개요", `${redesignBase}/about`],
      ["함께하는 사람들", `${redesignBase}/about#people`],
      ["생활공간", `${redesignBase}/about#spaces`],
      ["공식 로고", `${redesignBase}/about#identity`],
    ],
  },
  {
    label: "생활·활동",
    href: `${redesignBase}#life`,
    screen: null,
    children: [
      ["생활·지원", `${redesignBase}#life`],
      ["프로그램", `${redesignBase}#programs`],
      ["활동 기록", `${redesignBase}#records`],
    ],
  },
  { label: "입소·이용", href: `${redesignBase}#admission`, screen: null, children: [] },
  {
    label: "후원·봉사",
    href: `${redesignBase}/support`,
    screen: "support",
    children: [
      ["참여 안내", `${redesignBase}/support`],
      ["후원 안내", `${redesignBase}/support#donation`],
      ["자원봉사 안내", `${redesignBase}/support#volunteer`],
    ],
  },
  {
    label: "소식·자료",
    href: `${redesignBase}/news`,
    screen: "news",
    children: [
      ["소식 목록", `${redesignBase}/news`],
      ["운영 자료공개", `${redesignBase}/news#documents`],
    ],
  },
] as const;

export function RedesignNavigation({ current }: { current: RedesignScreen }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<number | null>(null);
  const boundary = useRef<HTMLElement>(null);
  const mobileTrigger = useRef<HTMLButtonElement>(null);
  const groupTriggers = useRef<Array<HTMLButtonElement | null>>([]);
  const close = () => {
    setMobileOpen(false);
    setOpenGroup(null);
  };

  useEffect(() => {
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !boundary.current?.contains(event.target)) {
        setMobileOpen(false);
        setOpenGroup(null);
      }
    }
    const viewport = window.matchMedia("(min-width: 1200px)");
    function resize() {
      setMobileOpen(false);
      setOpenGroup(null);
    }
    document.addEventListener("pointerdown", outside);
    viewport.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      viewport.removeEventListener("change", resize);
    };
  }, []);

  return (
    <header
      ref={boundary}
      className={styles.header}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (openGroup !== null) {
          event.preventDefault();
          groupTriggers.current[openGroup]?.focus();
          setOpenGroup(null);
        } else if (mobileOpen) {
          event.preventDefault();
          mobileTrigger.current?.focus();
          setMobileOpen(false);
        }
      }}
    >
      <div className={styles.headerInner}>
        <Link
          className={styles.logo}
          href={redesignBase}
          aria-label="샬롬의집 리디자인 시안 홈"
          aria-current={current === "home" ? "page" : undefined}
          onClick={close}
        >
          <Image src="/brand/logo-header.svg" width={1400} height={360} alt="샬롬의집" unoptimized />
        </Link>
        <button
          ref={mobileTrigger}
          type="button"
          className={styles.menuToggle}
          aria-expanded={mobileOpen}
          aria-controls="redesign-navigation"
          onClick={() => {
            setMobileOpen(!mobileOpen);
            setOpenGroup(null);
          }}
        >
          {mobileOpen ? "메뉴 닫기 −" : "메뉴 열기 +"}
        </button>
        <nav
          id="redesign-navigation"
          aria-label="리디자인 주요 메뉴"
          className={`${styles.navigation} ${mobileOpen ? styles.navigationOpen : ""}`}
        >
          <ul className={styles.navGroups}>
            {groups.map((group, index) => (
              <li key={group.label} className={styles.navGroup}>
                <div className={styles.navTop}>
                  <Link
                    href={group.href}
                    aria-current={group.screen === current ? "page" : undefined}
                    onClick={() => {
                      close();
                      if (group.screen === current && mobileOpen) mobileTrigger.current?.focus();
                    }}
                  >
                    {group.label}
                  </Link>
                  {group.children.length > 0 && (
                    <button
                      type="button"
                      ref={(node) => {
                        groupTriggers.current[index] = node;
                      }}
                      aria-label={`${group.label} 하위 메뉴 ${openGroup === index ? "닫기" : "열기"}`}
                      aria-expanded={openGroup === index}
                      aria-controls={`redesign-submenu-${index}`}
                      onClick={() => setOpenGroup(openGroup === index ? null : index)}
                    >
                      <span aria-hidden="true">{openGroup === index ? "−" : "+"}</span>
                    </button>
                  )}
                </div>
                {group.children.length > 0 && (
                  <ul id={`redesign-submenu-${index}`} className={styles.submenu} hidden={openGroup !== index}>
                    {group.children.map(([label, href]) => (
                      <li key={href}>
                        <Link
                          href={href}
                          onClick={() => {
                            close();
                            if (group.screen === current && !href.includes("#")) {
                              if (mobileOpen) mobileTrigger.current?.focus();
                              else groupTriggers.current[index]?.focus();
                            }
                          }}
                        >
                          {label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
          <Link className={styles.navContact} href={`${redesignBase}#contact`} onClick={close}>
            문의·방문 ↗
          </Link>
        </nav>
      </div>
    </header>
  );
}

type PreviewNews = {
  id: string;
  title: string;
  category: "notice" | "activity";
  publishedAt: string;
  summary: string;
  body: readonly string[];
};

export function RedesignNewsExplorer({ items }: { items: readonly PreviewNews[] }) {
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [state, setState] = useState("default");
  const results =
    state === "empty"
      ? []
      : items.filter(
          (item) =>
            (category === "all" || item.category === category) &&
            `${item.title} ${item.summary}`.includes(query.trim()),
        );
  const reset = () => {
    setSearch("");
    setQuery("");
    setCategory("all");
    setState("default");
  };

  return (
    <section aria-labelledby="redesign-news-list">
      <div className={styles.sectionHeading}>
        <h2 id="redesign-news-list">소식 목록</h2>
        <span className={styles.testLabel}>고정 테스트 데이터</span>
      </div>
      <form
        className={styles.search}
        onSubmit={(event) => {
          event.preventDefault();
          setQuery(search);
        }}
      >
        <label>
          분류
          <select value={category} onChange={(event) => setCategory(event.target.value)}>
            <option value="all">전체 소식</option>
            <option value="notice">공지사항</option>
            <option value="activity">활동소식</option>
          </select>
        </label>
        <label className={styles.searchInput}>
          검색어
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="테스트 소식 검색"
          />
        </label>
        <button className={styles.primaryButton} type="submit">
          검색
        </button>
      </form>
      <fieldset className={styles.stateControls}>
        <legend>시안 상태 비교</legend>
        {[
          ["default", "기본 목록"],
          ["empty", "정상 0건"],
          ["error", "조회 오류"],
        ].map(([value, label]) => (
          <label key={value}>
            <input
              type="radio"
              name="redesign-news-state"
              value={value}
              checked={state === value}
              onChange={() => setState(value)}
            />
            {label}
          </label>
        ))}
      </fieldset>
      <div role="status" className={styles.resultSummary}>
        {state === "error" ? "조회 오류 화면 예시" : `테스트 소식 ${results.length}건`}
      </div>
      {state === "error" ? (
        <div className={styles.empty}>
          <h3>소식을 불러오지 못했습니다.</h3>
          <p>조회 실패 화면을 확인하는 예시입니다. 실제 서버 오류가 아닙니다.</p>
          <button type="button" className={styles.textLink} onClick={reset}>
            테스트 목록 다시 보기 ↗
          </button>
        </div>
      ) : results.length === 0 ? (
        <div className={styles.empty}>
          <h3>
            {query || category !== "all" ? "조건에 맞는 테스트 소식이 없습니다." : "등록된 테스트 소식이 없습니다."}
          </h3>
          <p>다른 조건으로 검색하거나 기본 목록으로 돌아갈 수 있습니다.</p>
          <button type="button" className={styles.textLink} onClick={reset}>
            전체 테스트 소식 보기 ↗
          </button>
        </div>
      ) : (
        <>
          {(query || category !== "all") && (
            <button type="button" className={styles.textLink} onClick={reset}>
              조건 초기화 ↗
            </button>
          )}
          <div className={styles.newsList}>
            {results.map((item) => (
              <article key={item.id} id={item.id} className={styles.newsRow}>
                <div className={styles.meta}>
                  <span>{item.category === "notice" ? "공지사항" : "활동소식"}</span>
                  <time dateTime={item.publishedAt}>{item.publishedAt.slice(0, 10).replaceAll("-", ".")}</time>
                </div>
                <div>
                  <h3>{item.title}</h3>
                  <p>{item.summary}</p>
                  <details className={styles.inlineDetail}>
                    <summary>테스트 본문 펼치기</summary>
                    {item.body.map((paragraph, index) => (
                      <p key={index}>{paragraph}</p>
                    ))}
                  </details>
                </div>
              </article>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
