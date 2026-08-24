/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
// ui
import { Checkbox } from "@plane/ui";
// helpers
import { cn } from "@plane/utils";
// hooks
import type { TSelectionHelper } from "@/hooks/use-multiple-select";

type Props = {
  className?: string;
  disabled?: boolean;
  groupId: string;
  id: string;
  selectionHelpers: TSelectionHelper;
};

export const MultipleSelectEntityAction = observer(function MultipleSelectEntityAction(props: Props) {
  const { className, disabled = false, groupId, id, selectionHelpers } = props;
  // derived values
  const isSelected = selectionHelpers.getIsEntitySelected(id);
  const checkboxId = `select-work-item-${groupId}-${id}`;

  if (selectionHelpers.isSelectionDisabled) return null;

  return (
    <label
      htmlFor={checkboxId}
      className={cn("grid size-3.5 shrink-0 place-items-center", disabled ? "cursor-not-allowed" : "cursor-pointer", className)}
    >
      <Checkbox
        id={checkboxId}
        className="size-3.5 !outline-none"
        iconClassName="size-3"
        aria-label="Select work item"
        onClick={(e) => {
          e.stopPropagation();
          selectionHelpers.handleEntityClick(e, id, groupId);
        }}
        checked={isSelected}
        data-entity-group-id={groupId}
        data-entity-id={id}
        disabled={disabled}
        readOnly
      />
    </label>
  );
});
