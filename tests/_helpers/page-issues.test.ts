// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect } from "vitest";
import { EventEmitter } from "node:events";
import type { Page } from "@playwright/test";
import { collectPageIssues } from "./page-issues.js";

interface MockPage {
  page: Page;
  emitPageError: (err: Error) => void;
  emitResponse: (status: number, url?: string) => void;
}

function makeMockPage(): MockPage {
  const emitter = new EventEmitter();
  return {
    page: emitter as unknown as Page,
    emitPageError: (err) => emitter.emit("pageerror", err),
    emitResponse: (status, url = "http://localhost/test") =>
      emitter.emit("response", { status: () => status, url: () => url }),
  };
}

describe("collectPageIssues — initial state", () => {
  it("returns a collector with an empty issues array before any events fire", () => {
    const { page } = makeMockPage();
    const collector = collectPageIssues(page);
    expect(collector.issues).toHaveLength(0);
  });

  it("the same issues array reference is returned on repeated access", () => {
    const { page } = makeMockPage();
    const collector = collectPageIssues(page);
    expect(collector.issues).toBe(collector.issues);
  });
});

describe("collectPageIssues — pageerror events", () => {
  it("records a pageerror as kind 'js-error'", () => {
    const { page, emitPageError } = makeMockPage();
    const collector = collectPageIssues(page);
    emitPageError(new Error("Uncaught ReferenceError: x is not defined"));
    expect(collector.issues[0].kind).toBe("js-error");
  });

  it("records the error message verbatim as the detail", () => {
    const { page, emitPageError } = makeMockPage();
    const collector = collectPageIssues(page);
    emitPageError(new Error("TypeError: null is not an object"));
    expect(collector.issues[0].detail).toBe("TypeError: null is not an object");
  });

  it("accumulates multiple pageerror events in emission order", () => {
    const { page, emitPageError } = makeMockPage();
    const collector = collectPageIssues(page);
    emitPageError(new Error("first"));
    emitPageError(new Error("second"));
    emitPageError(new Error("third"));
    expect(collector.issues).toHaveLength(3);
    expect(collector.issues.map((i) => i.detail)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });
});

describe("collectPageIssues — successful responses are not captured", () => {
  const NON_ERROR_STATUSES = [200, 201, 204, 301, 302, 304, 399];

  for (const status of NON_ERROR_STATUSES) {
    it(`HTTP ${status} does not produce an issue`, () => {
      const { page, emitResponse } = makeMockPage();
      const collector = collectPageIssues(page);
      emitResponse(status);
      expect(collector.issues).toHaveLength(0);
    });
  }
});

describe("collectPageIssues — error responses are captured", () => {
  const ERROR_STATUSES = [400, 401, 403, 404, 422, 500, 502, 503, 599];

  for (const status of ERROR_STATUSES) {
    it(`HTTP ${status} is captured as kind 'http-error'`, () => {
      const { page, emitResponse } = makeMockPage();
      const collector = collectPageIssues(page);
      emitResponse(status);
      expect(collector.issues).toHaveLength(1);
      expect(collector.issues[0].kind).toBe("http-error");
    });
  }
});

describe("collectPageIssues — http-error detail format", () => {
  it("detail starts with 'HTTP <status>'", () => {
    const { page, emitResponse } = makeMockPage();
    const collector = collectPageIssues(page);
    emitResponse(404);
    expect(collector.issues[0].detail).toMatch(/^HTTP 404 /);
  });

  it("detail includes the response URL", () => {
    const { page, emitResponse } = makeMockPage();
    const collector = collectPageIssues(page);
    emitResponse(404, "http://localhost:3000/favicon.ico");
    expect(collector.issues[0].detail).toContain(
      "http://localhost:3000/favicon.ico"
    );
  });

  it("detail format is 'HTTP <status> <url>' with exactly one space between status and url", () => {
    const { page, emitResponse } = makeMockPage();
    const collector = collectPageIssues(page);
    emitResponse(500, "http://example.com/api");
    expect(collector.issues[0].detail).toBe("HTTP 500 http://example.com/api");
  });
});

describe("collectPageIssues — mixed js-error and http-error events", () => {
  it("accumulates both kinds in a single issues array", () => {
    const { page, emitPageError, emitResponse } = makeMockPage();
    const collector = collectPageIssues(page);
    emitPageError(new Error("js boom"));
    emitResponse(404, "http://localhost/missing.css");
    emitResponse(200);
    expect(collector.issues).toHaveLength(2);
    expect(collector.issues[0].kind).toBe("js-error");
    expect(collector.issues[1].kind).toBe("http-error");
  });

  it("issues appear in the order events were emitted", () => {
    const { page, emitPageError, emitResponse } = makeMockPage();
    const collector = collectPageIssues(page);
    emitResponse(500, "http://localhost/a");
    emitPageError(new Error("b"));
    emitResponse(404, "http://localhost/c");
    expect(collector.issues[0].kind).toBe("http-error");
    expect(collector.issues[1].kind).toBe("js-error");
    expect(collector.issues[2].kind).toBe("http-error");
  });
});
