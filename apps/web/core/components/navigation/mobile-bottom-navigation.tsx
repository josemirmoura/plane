/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { BellIcon, BriefcaseBusinessIcon, FolderKanbanIcon, HouseIcon, PlusIcon, SearchIcon } from "lucide-react";
import { observer } from "mobx-react";
// plane imports
import { EUserPermissions, EUserPermissionsLevel } from "@plane/constants";
import { cn } from "@plane/utils";
// hooks
import { useAppTheme } from "@/hooks/store/use-app-theme";
import { useCommandPalette } from "@/hooks/store/use-command-palette";
import { usePowerK } from "@/hooks/store/use-power-k";
import { useProject } from "@/hooks/store/use-project";
import { useUser, useUserPermissions } from "@/hooks/store/user";

type TMobileNavItemProps = {
  href?: string;
  label: string;
  icon: ReactNode;
  isActive?: boolean;
  onClick?: () => void;
};

function MobileNavItem({ href, label, icon, isActive = false, onClick }: TMobileNavItemProps) {
  const className = cn(
    "flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-md px-1 py-1 text-[10px] font-medium text-tertiary transition-colors",
    "min-h-11 active:bg-layer-1",
    isActive && "text-accent-primary"
  );

  const content = (
    <>
      <span className="flex size-5 items-center justify-center">{icon}</span>
      <span className="max-w-full truncate">{label}</span>
    </>
  );

  if (href) {
    return (
      <Link href={href} className={className} aria-current={isActive ? "page" : undefined} onClick={onClick}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {content}
    </button>
  );
}

export const MobileBottomNavigation = observer(function MobileBottomNavigation() {
  const { workspaceSlug } = useParams();
  const pathname = usePathname();
  const slug = workspaceSlug?.toString();

  const { toggleSidebar } = useAppTheme();
  const { toggleCreateIssueModal } = useCommandPalette();
  const { togglePowerKModal } = usePowerK();
  const { joinedProjectIds } = useProject();
  const { data: currentUser } = useUser();
  const { allowPermissions } = useUserPermissions();

  if (!slug) return null;

  const workspaceRoot = `/${slug}`;
  const projectsHref = `${workspaceRoot}/projects`;
  const workItemsHref = currentUser?.id ? `${workspaceRoot}/profile/${currentUser.id}` : workspaceRoot;
  const inboxHref = `${workspaceRoot}/notifications`;

  const canCreateIssue = allowPermissions(
    [EUserPermissions.ADMIN, EUserPermissions.MEMBER],
    EUserPermissionsLevel.WORKSPACE
  );
  const isCreateDisabled = joinedProjectIds.length === 0 || !canCreateIssue;

  const isHomeActive = pathname === workspaceRoot || pathname === `${workspaceRoot}/`;
  const isProjectsActive = pathname === projectsHref || pathname.startsWith(`${projectsHref}/`);
  const isWorkItemsActive = !!currentUser?.id && pathname.startsWith(workItemsHref);
  const isInboxActive = pathname.startsWith(inboxHref);

  const closeMobileSidebar = () => toggleSidebar(true);

  return (
    <nav
      className="absolute inset-x-0 bottom-0 z-[45] border-t border-subtle bg-surface-1 pb-[env(safe-area-inset-bottom)] md:hidden"
      aria-label="Mobile workspace navigation"
    >
      <button
        type="button"
        onClick={() => {
          closeMobileSidebar();
          toggleCreateIssueModal(true);
        }}
        disabled={isCreateDisabled}
        className={cn(
          "shadow-md absolute right-4 -top-12 flex size-11 items-center justify-center rounded-full bg-accent-primary text-white transition-transform",
          "active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
        )}
        aria-label="Create work item"
      >
        <PlusIcon className="size-5" />
      </button>

      <div className="grid h-16 grid-cols-5 items-center px-1">
        <MobileNavItem
          href={workspaceRoot}
          label="Home"
          icon={<HouseIcon className="size-[18px]" />}
          isActive={isHomeActive}
          onClick={closeMobileSidebar}
        />
        <MobileNavItem
          href={projectsHref}
          label="Projects"
          icon={<FolderKanbanIcon className="size-[18px]" />}
          isActive={isProjectsActive}
          onClick={closeMobileSidebar}
        />
        <MobileNavItem
          href={workItemsHref}
          label="Work items"
          icon={<BriefcaseBusinessIcon className="size-[18px]" />}
          isActive={isWorkItemsActive}
          onClick={closeMobileSidebar}
        />
        <MobileNavItem
          href={inboxHref}
          label="Inbox"
          icon={<BellIcon className="size-[18px]" />}
          isActive={isInboxActive}
          onClick={closeMobileSidebar}
        />
        <MobileNavItem
          label="Search"
          icon={<SearchIcon className="size-[18px]" />}
          onClick={() => {
            closeMobileSidebar();
            togglePowerKModal(true);
          }}
        />
      </div>
    </nav>
  );
});
