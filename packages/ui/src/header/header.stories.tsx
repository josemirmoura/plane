/**
 * Copyright (c) 2023-present Plane Software, Inc. and contributors
 * SPDX-License-Identifier: AGPL-3.0-only
 * See the LICENSE file for details.
 */

import type { Meta, StoryObj } from "@storybook/react";
import { Header } from "./header";

const meta: Meta<typeof Header> = {
  title: "UI/Header",
  component: Header,
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof Header>;

export const ResponsiveContent: Story = {
  render: () => (
    <div className="w-full">
      <Header className="w-full border-b border-subtle bg-surface-1">
        <Header.LeftItem>
          <span className="min-w-0 truncate text-13 font-medium text-primary">
            A deliberately long project and work item title that must shrink without overflowing the viewport
          </span>
        </Header.LeftItem>
        <Header.RightItem className="shrink-0">
          <button
            type="button"
            className="h-8 shrink-0 rounded-md border border-strong bg-layer-2 px-3 text-11 text-secondary"
          >
            Action
          </button>
        </Header.RightItem>
      </Header>
    </div>
  ),
};
