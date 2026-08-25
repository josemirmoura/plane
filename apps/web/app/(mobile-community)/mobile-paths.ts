export const MOBILE_MODE_STORAGE_KEY = "plane-ce-mobile-web-mode";

const RESERVED_ROOTS = new Set([
  "app",
  "accounts",
  "create-workspace",
  "god-mode",
  "invitations",
  "onboarding",
  "settings",
  "sign-up",
  "workspace-invitations",
]);

export function isLikelyMobileDevice(): boolean {
  if (typeof window === "undefined") return false;
  const viewport = window.matchMedia?.("(max-width: 767px)")?.matches ?? window.innerWidth <= 767;
  const coarse = window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  return viewport && (coarse || "ontouchstart" in window);
}

export function shouldAutoOpenMobile(pathname: string): boolean {
  if (!pathname || pathname === "/" || pathname.startsWith("/app/")) return false;
  const first = pathname.split("/").filter(Boolean)[0];
  return !!first && !RESERVED_ROOTS.has(first);
}

export function desktopPathToMobile(pathname: string): string | null {
  const parts = pathname.split("/").filter(Boolean);
  if (!parts.length || RESERVED_ROOTS.has(parts[0])) return null;
  const workspaceSlug = parts[0];
  const rest = parts.slice(1);
  const base = `/app/${workspaceSlug}`;

  if (!rest.length) return base;
  if (rest[0] === "projects") {
    if (rest.length === 1) return `${base}/projects`;
    const projectId = rest[1];
    if (!projectId) return `${base}/projects`;
    if (rest.length === 2) return `${base}/projects/${projectId}`;
    if (rest[2] === "issues") {
      return rest[3]
        ? `${base}/projects/${projectId}/work-items/${rest[3]}`
        : `${base}/projects/${projectId}/work-items`;
    }
    if (["cycles", "modules", "pages"].includes(rest[2])) {
      const section = rest[2];
      return rest[3]
        ? `${base}/projects/${projectId}/${section}/${rest[3]}`
        : `${base}/projects/${projectId}/${section}`;
    }
    return `${base}/projects/${projectId}`;
  }
  if (rest[0] === "notifications") return `${base}/inbox`;
  if (rest[0] === "settings") return `${base}/settings`;
  if (rest[0] === "profile") return `${base}/work`;
  if (rest[0] === "stickies") return `${base}/stickies`;
  return base;
}

export function mobilePathToDesktop(pathname: string): string {
  const parts = pathname.split("/").filter(Boolean);
  if (parts[0] !== "app" || !parts[1]) return "/";
  const workspaceSlug = parts[1];
  const rest = parts.slice(2);
  const base = `/${workspaceSlug}`;
  if (!rest.length) return base;
  if (rest[0] === "projects") {
    if (!rest[1]) return `${base}/projects`;
    const projectId = rest[1];
    if (!rest[2]) return `${base}/projects/${projectId}/issues`;
    if (rest[2] === "work-items") {
      return rest[3]
        ? `${base}/projects/${projectId}/issues/${rest[3]}`
        : `${base}/projects/${projectId}/issues`;
    }
    if (["cycles", "modules", "pages"].includes(rest[2])) {
      return `${base}/projects/${projectId}/${rest.slice(2).join("/")}`;
    }
    return `${base}/projects/${projectId}/issues`;
  }
  if (rest[0] === "inbox") return `${base}/notifications`;
  if (rest[0] === "settings") return `${base}/settings`;
  return base;
}
