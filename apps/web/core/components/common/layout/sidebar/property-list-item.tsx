/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { ReactNode } from "react";
import { cn } from "@plane/utils";

type TSidebarPropertyListItemProps = {
  icon: React.FC<{ className?: string }>;
  label: string;
  children: ReactNode;
  appendElement?: ReactNode;
  childrenClassName?: string;
};

export function SidebarPropertyListItem(props: TSidebarPropertyListItemProps) {
  const { icon: Icon, label, children, appendElement, childrenClassName } = props;

  return (
    <div className="flex min-w-0 items-start gap-2">
      <div className="flex h-8 w-24 min-w-0 shrink-0 items-center gap-1.5 text-body-xs-regular text-tertiary sm:w-30 md:h-7.5">
        <Icon className="size-4 shrink-0" />
        <span className="min-w-0 truncate">{label}</span>
        {appendElement}
      </div>
      <div className={cn("flex min-w-0 grow flex-wrap items-center gap-1", childrenClassName)}>{children}</div>
    </div>
  );
}
