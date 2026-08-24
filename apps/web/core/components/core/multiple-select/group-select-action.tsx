/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

// ui
import { Checkbox } from "@plane/ui";
// helpers
import { cn } from "@plane/utils";
// hooks
import type { TSelectionHelper } from "@/hooks/use-multiple-select";

type Props = {
  className?: string;
  disabled?: boolean;
  groupID: string;
  selectionHelpers: TSelectionHelper;
};

export function MultipleSelectGroupAction(props: Props) {
  const { className, disabled = false, groupID, selectionHelpers } = props;
  // derived values
  const groupSelectionStatus = selectionHelpers.isGroupSelected(groupID);
  const checkboxId = `select-work-item-group-${groupID}`;

  if (selectionHelpers.isSelectionDisabled) return null;

  return (
    <label htmlFor={checkboxId} className={cn("grid size-3.5 shrink-0 place-items-center", className)}>
      <Checkbox
        id={checkboxId}
        className="size-3.5 !outline-none"
        iconClassName="size-3"
        aria-label="Select work item group"
        onClick={() => selectionHelpers.handleGroupClick(groupID)}
        checked={groupSelectionStatus === "complete"}
        indeterminate={groupSelectionStatus === "partial"}
        disabled={disabled}
      />
    </label>
  );
}
