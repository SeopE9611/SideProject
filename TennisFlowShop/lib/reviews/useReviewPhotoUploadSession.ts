"use client";

import { useCallback, useRef, useState } from "react";

import { cleanupReviewSessionPhotos } from "@/lib/reviews/review-photo-cleanup.client";

type ReviewPhotoUploadSessionController = {
  uploadSessionId: string | null;
  isSessionReady: boolean;
  isCreatingSession: boolean;
  startSession: () => Promise<string | null>;
  registerUploadedUrls: (urls: string[], uploadSessionId: string) => void;
  removeUploadedUrl: (url: string, uploadSessionId: string) => Promise<void>;
  cleanupUncommittedPhotos: () => Promise<void>;
  markSaving: () => void;
  markSaveFailed: () => void;
  markCommitted: () => void;
  resetSession: () => void;
};

export function useReviewPhotoUploadSession(): ReviewPhotoUploadSessionController {
  const [uploadSessionId, setUploadSessionId] = useState<string | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const uploadSessionIdRef = useRef<string | null>(null);
  const uploadedUrlsRef = useRef<Set<string>>(new Set());
  const savingRef = useRef(false);
  const committedRef = useRef(false);
  const generationRef = useRef(0);
  const creatingPromiseRef = useRef<Promise<string | null> | null>(null);

  const cleanupUncommittedPhotos = useCallback(async () => {
    const currentSessionId = uploadSessionIdRef.current;
    if (!currentSessionId || savingRef.current || committedRef.current) return;
    const urls = Array.from(uploadedUrlsRef.current);
    uploadedUrlsRef.current.clear();
    await cleanupReviewSessionPhotos({ uploadSessionId: currentSessionId, urls });
  }, []);

  const resetSession = useCallback(() => {
    generationRef.current += 1;
    uploadSessionIdRef.current = null;
    uploadedUrlsRef.current.clear();
    savingRef.current = false;
    committedRef.current = false;
    creatingPromiseRef.current = null;
    setUploadSessionId(null);
    setIsCreatingSession(false);
  }, []);

  const startSession = useCallback(async () => {
    if (uploadSessionIdRef.current) return uploadSessionIdRef.current;
    if (creatingPromiseRef.current) return creatingPromiseRef.current;

    const generation = generationRef.current;
    setIsCreatingSession(true);
    creatingPromiseRef.current = fetch("/api/reviews/photos/session", { method: "POST", cache: "no-store" })
      .then(async (res) => {
        const json = await res.json().catch(() => null);
        if (!res.ok || typeof json?.uploadSessionId !== "string") return null;
        if (generationRef.current !== generation) return null;
        uploadSessionIdRef.current = json.uploadSessionId;
        uploadedUrlsRef.current.clear();
        savingRef.current = false;
        committedRef.current = false;
        setUploadSessionId(json.uploadSessionId);
        return json.uploadSessionId;
      })
      .catch(() => null)
      .finally(() => {
        if (generationRef.current === generation) {
          setIsCreatingSession(false);
          creatingPromiseRef.current = null;
        }
      });

    return creatingPromiseRef.current;
  }, []);

  const registerUploadedUrls = useCallback((urls: string[], sessionId: string) => {
    if (!sessionId || sessionId !== uploadSessionIdRef.current) return;
    urls.forEach((url) => uploadedUrlsRef.current.add(url));
  }, []);

  const removeUploadedUrl = useCallback(async (url: string, sessionId: string) => {
    if (!sessionId || sessionId !== uploadSessionIdRef.current) return;
    if (!uploadedUrlsRef.current.has(url)) return;
    uploadedUrlsRef.current.delete(url);
    await cleanupReviewSessionPhotos({ uploadSessionId: sessionId, urls: [url] });
  }, []);

  const markSaving = useCallback(() => {
    savingRef.current = true;
  }, []);

  const markSaveFailed = useCallback(() => {
    savingRef.current = false;
  }, []);

  const markCommitted = useCallback(() => {
    savingRef.current = false;
    committedRef.current = true;
    uploadedUrlsRef.current.clear();
  }, []);

  return {
    uploadSessionId,
    isSessionReady: Boolean(uploadSessionId),
    isCreatingSession,
    startSession,
    registerUploadedUrls,
    removeUploadedUrl,
    cleanupUncommittedPhotos,
    markSaving,
    markSaveFailed,
    markCommitted,
    resetSession,
  };
}
