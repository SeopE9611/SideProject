"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { siteConfig } from "@/config/site";
import styles from "./home-v2.module.css";

export function HomeV2Navigation({ admission, previewQuery = "" }: { admission: boolean; previewQuery?: string }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const boundary = useRef<HTMLElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const id = useId();
  const close = () => {
    setMobileOpen(false);
    setOpenGroup(null);
  };
  useEffect(() => {
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !boundary.current?.contains(event.target)) {
        setMobileOpen(false);
        setOpenGroup(null);
      }
    };
    const media = window.matchMedia("(min-width: 1200px)");
    const resize = () => {
      setMobileOpen(false);
      setOpenGroup(null);
    };
    document.addEventListener("pointerdown", outside);
    media.addEventListener("change", resize);
    return () => {
      document.removeEventListener("pointerdown", outside);
      media.removeEventListener("change", resize);
    };
  }, []);
  return (
    <header
      className={styles.header}
      ref={boundary}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
      onKeyDown={(event) => {
        if (event.key !== "Escape") return;
        if (openGroup !== null) {
          event.preventDefault();
          triggers.current[openGroup]?.focus();
          setOpenGroup(null);
        } else if (mobileOpen) {
          event.preventDefault();
          toggle.current?.focus();
          setMobileOpen(false);
        }
      }}
    >
      <div className={styles.headerInner}>
        <Link
          href={`/design-preview/home-v2${previewQuery}`}
          className={styles.logo}
          aria-label="샬롬의집 메인 V2 시안 홈"
          onClick={close}
        >
          <Image src="/brand/logo-header.svg" width={1400} height={360} alt="샬롬의집" unoptimized />
        </Link>
        <button
          ref={toggle}
          className={styles.menuToggle}
          type="button"
          aria-controls={`${id}-nav`}
          aria-expanded={mobileOpen}
          onClick={() => {
            setMobileOpen(!mobileOpen);
            setOpenGroup(null);
          }}
        >
          {mobileOpen ? "메뉴 닫기 −" : "메뉴 열기 +"}
        </button>
        <nav
          id={`${id}-nav`}
          aria-label="메인 V2 주요 메뉴"
          className={`${styles.navigation} ${mobileOpen ? styles.navigationOpen : ""}`}
        >
          <ul className={styles.navGroups}>
            {siteConfig.mainNavigation.map((item, index) => {
              const isAdmission = item.href === "/#admission";
              const href = isAdmission ? `/design-preview/home-v2/admission${previewQuery}` : item.href;
              const expanded = openGroup === item.href;
              return (
                <li
                  key={item.href}
                  className={styles.navGroup}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget)) {
                      setOpenGroup((current) => current === item.href ? null : current);
                    }
                  }}
                >
                  <div className={styles.navTop}>
                    <Link
                      href={href}
                      aria-current={isAdmission && admission ? "page" : undefined}
                      onClick={() => {
                        close();
                        if (isAdmission && admission && mobileOpen) toggle.current?.focus();
                      }}
                    >
                      {item.label}
                    </Link>
                    {item.children.length > 0 && (
                      <button
                        type="button"
                        ref={(node) => {
                          triggers.current[item.href] = node;
                        }}
                        aria-label={`${item.label} 하위 메뉴 ${expanded ? "닫기" : "열기"}`}
                        aria-controls={`${id}-group-${index}`}
                        aria-expanded={expanded}
                        onClick={() => setOpenGroup(expanded ? null : item.href)}
                      >
                        <span aria-hidden="true">{expanded ? "−" : "+"}</span>
                      </button>
                    )}
                  </div>
                  {item.children.length > 0 && (
                    <ul id={`${id}-group-${index}`} className={styles.submenu} hidden={!expanded}>
                      {item.children.map((child) => (
                        <li key={child.href}>
                          <Link href={child.href} onClick={close}>
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
          <Link href="/support/contact" className={styles.headerContact} onClick={close}>
            문의하기 <span aria-hidden="true">↗</span>
          </Link>
        </nav>
      </div>
    </header>
  );
}
