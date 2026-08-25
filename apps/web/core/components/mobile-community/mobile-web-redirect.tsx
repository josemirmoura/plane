"use client";

import { useEffect } from "react";
import {
  MOBILE_MODE_STORAGE_KEY,
  desktopPathToMobile,
  isLikelyMobileDevice,
  shouldAutoOpenMobile,
} from "@/app/(mobile-community)/mobile-paths";

export function MobileWebRedirect() {
  useEffect(() => {
    if (!isLikelyMobileDevice()) return;
    if (window.localStorage.getItem(MOBILE_MODE_STORAGE_KEY) === "desktop") return;
    const pathname = window.location.pathname;
    if (!shouldAutoOpenMobile(pathname)) return;
    const target = desktopPathToMobile(pathname);
    if (!target || target === pathname) return;
    window.location.replace(`${target}${window.location.search}${window.location.hash}`);
  }, []);

  return null;
}
