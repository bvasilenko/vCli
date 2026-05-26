import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import os from "node:os";
import path from "node:path";
import fse from "fs-extra";

import { copyTemplate, VALID_TEMPLATES } from "../src/template/index.js";
import { VcliError } from "../src/utils/exit.js";

describe("copyTemplate — validation", () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), "vcli-tpl-"));
    vi.spyOn(fse, "copy").mockResolvedValue(undefined as unknown as void);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fse.remove(tmpDir);
  });

  it("throws VcliError for an unrecognised template name", async () => {
    await expect(copyTemplate(tmpDir, "nonexistent")).rejects.toBeInstanceOf(
      VcliError
    );
  });

  it("VcliError has exit code 1 for invalid template", async () => {
    let code: number | undefined;
    try {
      await copyTemplate(tmpDir, "bad");
    } catch (err) {
      code = (err as VcliError).code;
    }
    expect(code).toBe(1);
  });

  it("error message enumerates every valid template name", async () => {
    let message = "";
    try {
      await copyTemplate(tmpDir, "not-a-template");
    } catch (err) {
      message = (err as Error).message;
    }
    for (const name of VALID_TEMPLATES) {
      expect(message).toContain(name);
    }
  });

  it("throws VcliError for an empty string", async () => {
    await expect(copyTemplate(tmpDir, "")).rejects.toBeInstanceOf(VcliError);
  });

  it("does not confuse a prefix of a valid name ('defaul') with the full name", async () => {
    await expect(copyTemplate(tmpDir, "defaul")).rejects.toBeInstanceOf(
      VcliError
    );
  });

  it("does not confuse a superstring ('default-extra') with a valid name", async () => {
    await expect(copyTemplate(tmpDir, "default-extra")).rejects.toBeInstanceOf(
      VcliError
    );
  });
});

describe("copyTemplate — resolution", () => {
  let tmpDir: string;
  let copySpy: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    tmpDir = await fse.mkdtemp(path.join(os.tmpdir(), "vcli-tpl-"));
    copySpy = vi
      .spyOn(fse, "copy")
      .mockResolvedValue(undefined as unknown as void);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await fse.remove(tmpDir);
  });

  it("invokes fs.copy exactly once per call", async () => {
    await copyTemplate(tmpDir, "default");
    expect(copySpy).toHaveBeenCalledOnce();
  });

  it("copies to the supplied targetDir", async () => {
    await copyTemplate(tmpDir, "default");
    const [, dest] = copySpy.mock.calls[0];
    expect(dest).toBe(tmpDir);
  });

  it("always passes overwrite:false (never clobbers existing files)", async () => {
    for (const name of VALID_TEMPLATES) {
      await copyTemplate(tmpDir, name);
    }
    for (const call of copySpy.mock.calls) {
      expect(call[2]).toEqual({ overwrite: false });
    }
  });

  it("source path for 'default' ends with the path segment 'default'", async () => {
    await copyTemplate(tmpDir, "default");
    const [src] = copySpy.mock.calls[0];
    const segments = (src as string).split(path.sep);
    expect(segments[segments.length - 1]).toBe("default");
  });

  it("source path for 'blank' ends with segment 'blank'", async () => {
    await copyTemplate(tmpDir, "blank");
    const [src] = copySpy.mock.calls[0];
    const segments = (src as string).split(path.sep);
    expect(segments[segments.length - 1]).toBe("blank");
  });

  it("default and blank template paths share the same parent directory", async () => {
    await copyTemplate(tmpDir, "default");
    const [srcDefault] = copySpy.mock.calls[0];
    copySpy.mockClear();

    await copyTemplate(tmpDir, "blank");
    const [srcMarketing] = copySpy.mock.calls[0];

    expect(path.dirname(srcDefault as string)).toBe(
      path.dirname(srcMarketing as string)
    );
  });

  it("omitting template name defaults to 'default' template", async () => {
    await copyTemplate(tmpDir);
    const [src] = copySpy.mock.calls[0];
    const segments = (src as string).split(path.sep);
    expect(segments[segments.length - 1]).toBe("default");
  });
});

describe("VALID_TEMPLATES", () => {
  it("includes 'default'", () => {
    expect(VALID_TEMPLATES).toContain("default");
  });

  it("includes 'blank'", () => {
    expect(VALID_TEMPLATES).toContain("blank");
  });

  it("is a non-empty readonly tuple", () => {
    expect(VALID_TEMPLATES.length).toBeGreaterThan(0);
  });

  it("contains no duplicate entries", () => {
    expect(new Set(VALID_TEMPLATES).size).toBe(VALID_TEMPLATES.length);
  });
});
