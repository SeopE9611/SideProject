import type { Metadata } from "next";
import Image from "next/image";

import { SectionPageHeader } from "@/components/layout/section-page-header";
import {
  aboutFixture,
  type StaffProfile,
} from "@/content/fixtures/about.fixture";

export const metadata: Metadata = {
  title: "함께하는 사람들",
};

export default function PeoplePage() {
  return (
    <>
      <SectionPageHeader
        eyebrow="시설소개"
        title="함께하는 사람들"
        description="직원과 운영 역할을 승인된 범위에서 소개합니다."
        breadcrumbs={[
          { label: "홈", href: "/" },
          { label: "시설소개", href: "/about" },
          { label: "함께하는 사람들" },
        ]}
        notice="직원 이름과 사진은 당사자 확인 및 홈페이지 공개 승인을 마친 경우에만 표시합니다. 현재 항목은 레이아웃 검증용 예시입니다."
      />
      <section className="mx-auto max-w-site px-page py-12 sm:px-page-wide">
        <h2 className="text-heading font-bold">직원 역할 화면 예시</h2>
        <ul className="mt-6 grid gap-6 lg:grid-cols-3">
          {aboutFixture.staffProfiles.map((profile: StaffProfile) => {
            const officialName =
              profile.contentStatus === "official" && profile.name?.trim()
                ? profile.name
                : undefined;

            return (
              <li
                key={profile.id}
                className="border-t-4 border-primary py-6"
              >
                {profile.contentStatus === "official" &&
                profile.media?.kind === "image" ? (
                  <div className="aspect-[4/3] overflow-hidden">
                    <Image
                      className="h-full w-full object-cover"
                      src={profile.media.src}
                      alt={profile.media.alt}
                      width={profile.media.width}
                      height={profile.media.height}
                    />
                  </div>
                ) : profile.media?.kind === "placeholder" ? (
                  <div className="flex aspect-[4/3] flex-col justify-center border border-border bg-surface-subtle p-4">
                    <strong>{profile.media.label}</strong>
                    <p className="text-safe-wrap mt-1 text-small">
                      {profile.media.description}
                    </p>
                  </div>
                ) : null}
                {officialName ? (
                  <>
                    <h3 className="text-safe-wrap mt-5 font-bold">
                      {officialName}
                    </h3>
                    <p className="text-safe-wrap mt-2">{profile.role}</p>
                  </>
                ) : (
                  <h3 className="text-safe-wrap mt-5 font-bold">
                    {profile.role}
                  </h3>
                )}
                <p className="text-safe-wrap mt-3 text-muted-foreground">
                  {profile.responsibility}
                </p>
              </li>
            );
          })}
        </ul>
        <p className="text-safe-wrap mt-10 border-l-4 border-accent pl-4">
          실제 자료 확보와 공개 승인 전까지 역할 구조만 확인합니다.
        </p>
      </section>
    </>
  );
}
