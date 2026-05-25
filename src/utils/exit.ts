// SPDX-License-Identifier: MIT
// Copyright (c) 2026 bvasilenko

export class VcliError extends Error {
  readonly code: number;

  constructor(message: string, code = 1) {
    super(message);
    this.name = "VcliError";
    this.code = code;
  }
}

export function fail(message: string, code = 1): never {
  throw new VcliError(message, code);
}
