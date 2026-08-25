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

    const params = new URLSearchParams(window.location.search);
    if (params.get("desktop") === "1") {
      window.localStorage.setItem(MOBILE_MODE_STORAGE_KEY, "desktop");
      return;
    }
    if (params.get("mobile") === "1") {
      window.localStorage.removeItem(MOBILE_MODE_STORAGE_KEY);
      params.delete("mobile");
    } else if (window.localStorage.getItem(MOBILE_MODE_STORAGE_KEY) === "desktop") {
      return;
    }

    const pathname = window.location.pathname;
    if (!shouldAutoOpenMobile(pathname)) return;
    const target = desktopPathToMobile(pathname);
    if (!target || target === pathname) return;
    const query = params.toString();
    window.location.replace(`${target}${query ? `?${query}` : ""}${window.location.hash}`);
  }, []);

  return null;
}
