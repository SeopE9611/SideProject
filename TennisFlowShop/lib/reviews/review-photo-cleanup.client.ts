"use client";

export async function cleanupReviewSessionPhotos({
  uploadSessionId,
  urls,
  keepalive = true,
}: {
  uploadSessionId: string | null | undefined;
  urls: string[];
  keepalive?: boolean;
}) {
  const uniqueUrls = Array.from(new Set(urls.filter(Boolean))).slice(0, 10);
  if (!uploadSessionId || !uniqueUrls.length) return;

  try {
    await fetch("/api/reviews/photos/cleanup", {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uploadSessionId, urls: uniqueUrls }),
      keepalive,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.warn("[reviews] photo cleanup request failed", error);
    }
  }
}
