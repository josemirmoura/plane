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

  if (selectionHelpers.isSelectionDisabled) return null;

  return (
    <label className={cn("grid size-3.5 shrink-0 place-items-center", className)}>
      <Checkbox
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
