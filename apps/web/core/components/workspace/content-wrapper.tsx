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
  // Use the context to determine if app rail should render
  const { shouldRenderAppRail } = useAppRailVisibility();

  return (
    <div className="relative flex size-full flex-col overflow-hidden bg-canvas transition-all duration-300 ease-in-out">
      <TopNavigationRoot />
      <div className="relative flex size-full overflow-hidden">
        {/* Desktop app rail; the phone shell uses the bottom navigation instead. */}
        {shouldRenderAppRail && <AppRailRoot />}
        <div
          className={cn(
            "relative size-full flex-grow overflow-hidden pr-2 pl-2 transition-all duration-300 ease-in-out",
            shouldRenderAppRail ? "pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-2 md:pl-0!" : "pb-2"
          )}
        >
          {children}
        </div>
        {shouldRenderAppRail && <MobileBottomNavigation />}
      </div>
    </div>
  );
});
