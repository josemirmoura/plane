/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import { observer } from "mobx-react";
import { Expand, Shrink } from "lucide-react";
import { useTranslation } from "@plane/i18n";
// plane
import type { TGanttViews } from "@plane/types";
import { Row } from "@plane/ui";
// components
import { cn } from "@plane/utils";
import { VIEWS_LIST } from "@/components/gantt-chart/data";
// helpers
// hooks
import { useTimeLineChartStore } from "@/hooks/use-timeline-chart";
//
import { GANTT_BREADCRUMBS_HEIGHT } from "../constants";

type Props = {
  blockIds: string[];
  fullScreenMode: boolean;
  handleChartView: (view: TGanttViews) => void;
  handleToday: () => void;
  loaderTitle: string;
  toggleFullScreenMode: () => void;
  showToday: boolean;
};

export const GanttChartHeader = observer(function GanttChartHeader(props: Props) {
  const { t } = useTranslation();
  const { blockIds, fullScreenMode, handleChartView, handleToday, loaderTitle, toggleFullScreenMode, showToday } =
    props;
  // chart hook
  const { currentView } = useTimeLineChartStore();

  return (
    <Row
      className="relative flex w-full flex-shrink-0 flex-wrap items-center gap-2 bg-surface-1 py-2 whitespace-nowrap"
      style={{ minHeight: `${GANTT_BREADCRUMBS_HEIGHT}px` }}
    >
      <div className="ml-auto">
        <div className="ml-auto text-11 font-medium text-tertiary">
          {blockIds ? `${blockIds.length} ${loaderTitle}` : t("common.loading")}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {VIEWS_LIST.map((chartView: any) => (
          <button
            key={chartView?.key}
            type="button"
            className={cn(
              "min-h-8 cursor-pointer rounded-md bg-layer-transparent px-2 py-1 text-11 hover:bg-layer-transparent-hover md:min-h-0",
              {
                "bg-layer-transparent-selected": currentView === chartView?.key,
              }
            )}
            onClick={() => handleChartView(chartView?.key)}
          >
            {t(chartView?.i18n_title)}
          </button>
        ))}
      </div>

      {showToday && (
        <button
          type="button"
          className="min-h-8 rounded-md bg-layer-transparent px-2 py-1 text-11 hover:bg-layer-transparent-hover md:min-h-0"
          onClick={handleToday}
        >
          {t("common.today")}
        </button>
      )}

      <button
        type="button"
        className="flex size-8 items-center justify-center rounded-md border border-subtle bg-layer-transparent transition-all hover:bg-layer-transparent-hover md:size-auto md:p-1"
        onClick={toggleFullScreenMode}
        aria-label={fullScreenMode ? "Exit full screen" : "Enter full screen"}
      >
        {fullScreenMode ? <Shrink className="h-4 w-4" /> : <Expand className="h-4 w-4" />}
      </button>
    </Row>
  );
});
