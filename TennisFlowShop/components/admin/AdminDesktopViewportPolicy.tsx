"use client";

import { useEffect } from "react";

const ADMIN_DESKTOP_CLASS = "admin-desktop-console";

export default function AdminDesktopViewportPolicy() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add(ADMIN_DESKTOP_CLASS);

    return () => {
      root.classList.remove(ADMIN_DESKTOP_CLASS);
    };
  }, []);

  return null;
}
