/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { ISSUE_LAYOUTS } from "@plane/constants";
import { useTranslation } from "@plane/i18n";
import { ChevronDownIcon } from "@plane/propel/icons";
import type { EIssueLayoutTypes } from "@plane/types";
import { CustomMenu } from "@plane/ui";
import { IssueLayoutIcon } from "../../layout-icon";

export function MobileLayoutSelection({
  layouts,
  onChange,
  activeLayout,
}: {
  layouts: EIssueLayoutTypes[];
  onChange: (layout: EIssueLayoutTypes) => void;
  activeLayout?: EIssueLayoutTypes;
}) {
  const { t } = useTranslation();

  return (
    <CustomMenu
      ariaLabel={t("common.layout")}
      maxHeight={"md"}
      className="flex flex-grow justify-center text-13 text-secondary"
      placement="bottom-start"
      customButton={
        <span className="flex items-center gap-1">
          {activeLayout && <IssueLayoutIcon layout={activeLayout} size={14} strokeWidth={2} className="size-3.5" />}
          <ChevronDownIcon className="size-3 text-secondary" strokeWidth={2} />
        </span>
      }
      customButtonClassName="flex h-8 flex-grow items-center justify-center rounded-md border border-strong bg-layer-2 px-2 text-13 text-secondary shadow-raised-100 hover:bg-layer-2-hover active:bg-layer-2-active"
      closeOnSelect
    >
      {ISSUE_LAYOUTS.filter((layout) => layouts.includes(layout.key)).map((layout) => (
        <CustomMenu.MenuItem
          key={layout.key}
          onClick={() => {
            onChange(layout.key);
          }}
          className="flex items-center gap-2"
        >
          <IssueLayoutIcon layout={layout.key} className="h-3 w-3" />
          <div className="text-tertiary">{t(layout.i18n_label)}</div>
        </CustomMenu.MenuItem>
      ))}
    </CustomMenu>
  );
}
