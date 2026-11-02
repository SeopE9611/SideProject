import { PublicHomeV2 } from "@/components/home/public-home-v2";
import { findPublicGalleryItems } from "@/features/gallery/gallery.repository";
import { getNewsRepository } from "@/features/news/news.repository";
import { getProgramRepository } from "@/features/programs/program.repository";
import { createPublicPageMetadata } from "@/features/seo/metadata";
import {
  getPublicContactInformation,
  getPublicFacilityOverview,
} from "@/features/site-content/site-content.repository";
import { findPublicTransparencyDocuments } from "@/features/transparency/transparency.repository";

export const metadata = createPublicPageMetadata("/");
export const dynamic = "force-dynamic";

export default async function Home() {
  const [overview, contact, [noticesResult, activitiesResult, galleryResult, programsResult, transparencyResult]] =
    await Promise.all([
      getPublicFacilityOverview(),
      getPublicContactInformation(),
      Promise.allSettled([
        getNewsRepository().searchPublished({ category: "notice", pageSize: 3 }),
        getNewsRepository().searchPublished({ category: "activity", pageSize: 2 }),
        findPublicGalleryItems(),
        getProgramRepository().listPublished({ limit: 3 }),
        findPublicTransparencyDocuments(),
      ]),
    ]);
  const isPreview = process.env.NODE_ENV === "development" || process.env.VERCEL_ENV === "preview";
  const notices =
    noticesResult.status === "fulfilled" ? noticesResult.value.items.filter((post) => isPreview || !post.isDemo) : [];
  const activities =
    activitiesResult.status === "fulfilled"
      ? activitiesResult.value.items.filter((post) => isPreview || !post.isDemo)
      : [];
  const photos = galleryResult.status === "fulfilled" ? galleryResult.value.slice(0, 4) : [];
  const heroPhoto = photos.find((photo) => photo.width >= photo.height) ?? photos[0];
  const galleryItems = photos.filter((photo) => photo.slug !== heroPhoto?.slug);
  const programs = programsResult.status === "fulfilled" ? programsResult.value.slice(0, 3) : [];
  const documents = transparencyResult.status === "fulfilled" ? transparencyResult.value.slice(0, 3) : [];
  const heroImage = heroPhoto
    ? {
        src: `/api/gallery/${heroPhoto.slug}/media`,
        alt: heroPhoto.altText,
        width: heroPhoto.width,
        height: heroPhoto.height,
        caption: heroPhoto.title,
        href: `/life/gallery/${heroPhoto.slug}`,
      }
    : undefined;

  if (noticesResult.status === "rejected") console.error("홈 공지사항 조회 실패");
  if (activitiesResult.status === "rejected") console.error("홈 활동소식 조회 실패");
  if (galleryResult.status === "rejected") console.error("홈 활동사진 조회 실패");
  if (programsResult.status === "rejected") console.error("홈 프로그램 조회 실패");
  if (transparencyResult.status === "rejected") console.error("홈 자료공개 조회 실패");

  return (
    <PublicHomeV2
      overview={overview}
      contact={contact}
      heroImage={heroImage}
      hasPublishedPhotos={photos.length > 0}
      notices={notices}
      activities={activities}
      galleryItems={galleryItems}
      programs={programs}
      documents={documents}
      errors={{
        news: noticesResult.status === "rejected" || activitiesResult.status === "rejected",
        gallery: galleryResult.status === "rejected",
        programs: programsResult.status === "rejected",
        transparency: transparencyResult.status === "rejected",
      }}
    />
  );
}
