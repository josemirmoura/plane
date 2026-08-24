/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type React from "react";
import { observer } from "mobx-react";
// plane package imports
import { useTranslation } from "@plane/i18n";
import type { ISvgIcons } from "@plane/propel/icons";
import { TimelineLayoutIcon, GridLayoutIcon, ListLayoutIcon } from "@plane/propel/icons";
import type { TCycleLayoutOptions } from "@plane/types";
import { CustomMenu } from "@plane/ui";
// hooks
import { useCycleFilter } from "@/hooks/store/use-cycle-filter";
import { useProject } from "@/hooks/store/use-project";

const CYCLE_VIEW_LAYOUTS: {
  key: TCycleLayoutOptions;
  icon: React.FC<ISvgIcons>;
  titleTranslationKey: string;
}[] = [
  {
    key: "list",
    icon: ListLayoutIcon,
    titleTranslationKey: "project_modules.layout.list",
  },
  {
    key: "board",
    icon: GridLayoutIcon,
    titleTranslationKey: "project_modules.layout.board",
  },
  {
    key: "gantt",
    icon: TimelineLayoutIcon,
    titleTranslationKey: "project_modules.layout.timeline",
  },
];

export const CyclesListMobileHeader = observer(function CyclesListMobileHeader() {
  const { currentProjectDetails } = useProject();
  const { updateDisplayFilters } = useCycleFilter();
  const { t } = useTranslation();

  return (
    <div className="flex justify-center sm:hidden">
      <CustomMenu
        ariaLabel={t("common.layout")}
        maxHeight={"md"}
        className="flex flex-grow justify-center border-b border-subtle bg-surface-1 py-2 text-13 text-secondary"
        placement="bottom-start"
        customButton={
          <span className="flex items-center gap-2">
            <ListLayoutIcon className="h-4 w-4" />
            <span className="flex flex-grow justify-center text-13 text-secondary">{t("common.layout")}</span>
          </span>
        }
        customButtonClassName="flex flex-grow justify-center items-center text-secondary text-13"
        closeOnSelect
      >
        {CYCLE_VIEW_LAYOUTS.map((layout) => {
          if (layout.key === "gantt") return;
          return (
            <CustomMenu.MenuItem
              key={layout.key}
              onClick={() => {
                if (!currentProjectDetails?.id) return;
                updateDisplayFilters(currentProjectDetails.id, {
                  layout: layout.key,
                });
              }}
              className="flex items-center gap-2"
            >
              <layout.icon className="h-3 w-3" />
              <div className="text-tertiary">{t(layout.titleTranslationKey)}</div>
            </CustomMenu.MenuItem>
          );
        })}
      </CustomMenu>
    </div>
  );
});
