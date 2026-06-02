// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko
import { describe, it, expect } from "vitest";
import { parseBrandHandle } from "../src/brand/handle.js";
import { VcliError } from "../src/utils/exit.js";

describe("parseBrandHandle", () => {
  describe("url: prefix", () => {
    it("returns url handle for valid URL", () => {
      const h = parseBrandHandle("url:https://example.com/brand.json");
      expect(h).toEqual({ prefix: "url", value: "https://example.com/brand.json" });
    });

    it("throws when value is empty", () => {
      expect(() => parseBrandHandle("url:")).toThrow(VcliError);
    });
  });

  describe("fixture: prefix", () => {
    it("returns fixture handle for named fixture", () => {
      const h = parseBrandHandle("fixture:stripe");
      expect(h).toEqual({ prefix: "fixture", value: "stripe" });
    });

    it("throws when fixture name is empty", () => {
      expect(() => parseBrandHandle("fixture:")).toThrow(VcliError);
    });
  });

  describe("github: prefix", () => {
    it("parses owner/repo correctly", () => {
      const h = parseBrandHandle("github:acme/brand");
      expect(h).toEqual({ prefix: "github", owner: "acme", repo: "brand" });
    });

    it("throws when no slash present", () => {
      expect(() => parseBrandHandle("github:acme")).toThrow(VcliError);
    });

    it("throws when owner is missing (leading slash)", () => {
      expect(() => parseBrandHandle("github:/brand")).toThrow(VcliError);
    });

    it("throws when repo is missing (trailing slash)", () => {
      expect(() => parseBrandHandle("github:acme/")).toThrow(VcliError);
    });

    it("throws when path has more than two segments", () => {
      expect(() => parseBrandHandle("github:acme/brand/extra")).toThrow(VcliError);
    });
  });

  describe("npm: prefix", () => {
    it("returns npm handle for scoped package", () => {
      const h = parseBrandHandle("npm:@acme/brand");
      expect(h).toEqual({ prefix: "npm", value: "@acme/brand" });
    });

    it("throws when package name is empty", () => {
      expect(() => parseBrandHandle("npm:")).toThrow(VcliError);
    });
  });

  describe("json: prefix", () => {
    it("decodes valid base64 JSON payload", () => {
      const payload = { foo: "bar" };
      const encoded = Buffer.from(JSON.stringify(payload)).toString("base64");
      const h = parseBrandHandle(`json:${encoded}`);
      expect(h).toEqual({ prefix: "json", payload });
    });

    it("throws when payload is empty", () => {
      expect(() => parseBrandHandle("json:")).toThrow(VcliError);
    });

    it("throws when base64 decodes to invalid JSON", () => {
      const notJson = Buffer.from("not-valid-json").toString("base64");
      expect(() => parseBrandHandle(`json:${notJson}`)).toThrow(VcliError);
    });
  });

  describe("file: prefix", () => {
    it("returns file handle for absolute path", () => {
      const h = parseBrandHandle("file:/tmp/brand.json");
      expect(h).toEqual({ prefix: "file", value: "/tmp/brand.json" });
    });

    it("throws when path is empty", () => {
      expect(() => parseBrandHandle("file:")).toThrow(VcliError);
    });
  });

  describe("error cases", () => {
    it("throws when no colon present", () => {
      expect(() => parseBrandHandle("fixture")).toThrow(VcliError);
    });

    it("throws when prefix is unknown", () => {
      expect(() => parseBrandHandle("s3:bucket/key")).toThrow(VcliError);
    });

    it("throws for empty string", () => {
      expect(() => parseBrandHandle("")).toThrow(VcliError);
    });
  });
});
