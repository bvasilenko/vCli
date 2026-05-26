// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import type { Page } from "@playwright/test";

export type IssueKind = "js-error" | "http-error";

export interface PageIssue {
  kind: IssueKind;
  detail: string;
}

export interface PageIssueCollector {
  readonly issues: PageIssue[];
}

export function collectPageIssues(page: Page): PageIssueCollector {
  const issues: PageIssue[] = [];

  page.on("pageerror", (err) => {
    issues.push({ kind: "js-error", detail: err.message });
  });

  page.on("response", (response) => {
    if (response.status() >= 400) {
      issues.push({
        kind: "http-error",
        detail: `HTTP ${response.status()} ${response.url()}`,
      });
    }
  });

  return { issues };
}
