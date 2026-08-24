/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import React, { useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
// icons
import { ListFilter } from "lucide-react";
import { useOutsideClickDetector } from "@plane/hooks";
import { useTranslation } from "@plane/i18n";
import { IconButton } from "@plane/propel/icon-button";
import { SearchIcon, CloseIcon } from "@plane/propel/icons";
// helpers
import { cn } from "@plane/utils";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useProjectView } from "@/hooks/store/use-project-view";
import { FiltersDropdown } from "../issues/issue-layouts/filters";
import { ViewFiltersSelection } from "./filters/filter-selection";
import { ViewOrderByDropdown } from "./filters/order-by";

export const ViewListHeader = observer(function ViewListHeader() {
  // states
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  // refs
  const inputRef = useRef<HTMLInputElement>(null);
  // hooks
  const { t } = useTranslation();
  // store hooks
  const { filters, updateFilters } = useProjectView();
  const {
    project: { projectMemberIds },
  } = useMember();

  // handlers
  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      if (filters?.searchQuery && filters?.searchQuery.trim() !== "") {
        updateFilters("searchQuery", "");
      } else {
        setIsSearchOpen(false);
        inputRef.current?.blur();
      }
    }
  };

  // outside click detector hook
  useOutsideClickDetector(inputRef, () => {
    if (isSearchOpen && filters?.searchQuery.trim() === "") setIsSearchOpen(false);
  });

  useEffect(() => {
    if (filters?.searchQuery.trim() !== "") setIsSearchOpen(true);
  }, [filters?.searchQuery]);

  return (
    <div className="flex h-full min-w-0 items-center gap-2">
      <div className="flex min-w-0 items-center">
        {!isSearchOpen && (
          <IconButton
            variant="ghost"
            size="lg"
            className="-mr-1"
            aria-label={t("common.search.label")}
            onClick={() => {
              setIsSearchOpen(true);
              inputRef.current?.focus();
            }}
            icon={SearchIcon}
          />
        )}
        <div
          className={cn(
            "ml-auto flex w-0 items-center justify-start gap-1 overflow-hidden rounded-md border border-transparent bg-surface-1 text-placeholder opacity-0 transition-[width] ease-linear",
            {
              "w-40 border-subtle py-1.5 pr-1 pl-2.5 opacity-100 md:w-64 md:pr-2.5": isSearchOpen,
            }
          )}
        >
          <SearchIcon className="h-3.5 w-3.5 shrink-0" />
          <input
            ref={inputRef}
            className="w-full max-w-[234px] min-w-0 border-none bg-transparent text-13 text-primary placeholder:text-placeholder focus:outline-none"
            placeholder={t("common.search.label")}
            value={filters?.searchQuery}
            onChange={(e) => updateFilters("searchQuery", e.target.value)}
            onKeyDown={handleInputKeyDown}
          />
          {isSearchOpen && (
            <button
              type="button"
              className="grid size-8 shrink-0 place-items-center rounded-sm hover:bg-layer-1 md:size-5"
              aria-label="Close search"
              onClick={() => {
                updateFilters("searchQuery", "");
                setIsSearchOpen(false);
              }}
            >
              <CloseIcon className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>
      <div className="hidden items-center gap-2 md:flex">
        <ViewOrderByDropdown
          sortBy={filters.sortBy}
          sortKey={filters.sortKey}
          onChange={(val) => {
            if (val.key) updateFilters("sortKey", val.key);
            if (val.order) updateFilters("sortBy", val.order);
          }}
        />
        <FiltersDropdown
          icon={<ListFilter className="h-3 w-3" />}
          title={t("common.filters")}
          placement="bottom-end"
          isFiltersApplied={false}
        >
          <ViewFiltersSelection
            filters={filters}
            handleFiltersUpdate={updateFilters}
            memberIds={projectMemberIds ?? undefined}
          />
        </FiltersDropdown>
      </div>
    </div>
  );
});
