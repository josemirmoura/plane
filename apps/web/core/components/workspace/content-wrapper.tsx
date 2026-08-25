/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React from "react";
import { observer } from "mobx-react";
// plane imports
import { cn } from "@plane/utils";
import { AppRailRoot } from "@/components/navigation";
import { MobileBottomNavigation } from "@/components/navigation/mobile-bottom-navigation";
import { useAppRailVisibility } from "@/lib/app-rail";
import { TopNavigationRoot } from "@/components/navigation/top-navigation-root";

export const WorkspaceContentWrapper = observer(function WorkspaceContentWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  // App rail visibility is a desktop preference. Mobile navigation must not
  // inherit that preference or a new/collapsed workspace can lose its phone shell.
  const { shouldRenderAppRail } = useAppRailVisibility();

  return (
    <div className="relative flex size-full flex-col overflow-hidden bg-canvas transition-all duration-300 ease-in-out">
      <TopNavigationRoot />
      <div className="relative flex size-full overflow-hidden">
        {/* Desktop app rail respects the desktop visibility preference. */}
        {shouldRenderAppRail && <AppRailRoot />}
        <div
          className={cn(
            "relative size-full flex-grow overflow-hidden pr-2 pl-2 pb-[calc(4.5rem+env(safe-area-inset-bottom))] transition-all duration-300 ease-in-out md:pb-2",
            shouldRenderAppRail && "md:pl-0!"
          )}
        >
          {children}
        </div>
        {/* Phone navigation is independent of the desktop App Rail preference. */}
        <MobileBottomNavigation />
      </div>
    </div>
  );
});
