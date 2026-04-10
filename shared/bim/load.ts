/**
 * Parse / normalise the canonical BIM JSON.
 *
 * Intended for use by both the API (hydrating from the DB column) and the
 * client (hydrating from API responses). Keeps loading failures isolated so
 * corrupt data does not blank the whole app — returns either a parsed model
 * or a list of diagnostics, mirroring the Pascal loader pattern.
 */

import {
  canonicalBimSchema,
  createEmptyCanonicalBim,
  type CanonicalBim,
} from "./canonical-schema.js";

export interface BimLoadDiagnostic {
  stage: "parse" | "validate" | "fetch";
  code: string;
  message: string;
}

export type BimLoadResult =
  | {
      status: "ok" | "recovered";
      bim: CanonicalBim;
      diagnostics: BimLoadDiagnostic[];
    }
  | {
      status: "error";
      bim: null;
      diagnostics: BimLoadDiagnostic[];
    };

export function loadCanonicalBim(input: string | unknown): BimLoadResult {
  const diagnostics: BimLoadDiagnostic[] = [];
  let raw: unknown = input;

  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) {
      diagnostics.push({
        stage: "parse",
        code: "empty-bim",
        message: "Canonical BIM payload was blank. Using an empty BIM model.",
      });
      return {
        status: "recovered",
        bim: createEmptyCanonicalBim(),
        diagnostics,
      };
    }

    try {
      raw = JSON.parse(trimmed);
    } catch (error) {
      diagnostics.push({
        stage: "parse",
        code: "parse-error",
        message:
          error instanceof Error
            ? `Canonical BIM JSON could not be parsed: ${error.message}`
            : "Canonical BIM JSON could not be parsed.",
      });
      return { status: "error", bim: null, diagnostics };
    }
  }

  const result = canonicalBimSchema.safeParse(raw);
  if (!result.success) {
    diagnostics.push({
      stage: "validate",
      code: "schema-validation-failed",
      message: `Canonical BIM validation failed: ${result.error.message}`,
    });
    return { status: "error", bim: null, diagnostics };
  }

  return {
    status: diagnostics.length === 0 ? "ok" : "recovered",
    bim: result.data,
    diagnostics,
  };
}

/** Parse or throw (for server code that wants the exception path). */
export function ensureCanonicalBim(input: string | unknown): CanonicalBim {
  const result = loadCanonicalBim(input);
  if (result.status === "error") {
    const message = result.diagnostics
      .map((d) => d.message)
      .join(" | ");
    const err = new Error(message || "Invalid canonical BIM payload");
    (err as Error & { diagnostics?: BimLoadDiagnostic[] }).diagnostics =
      result.diagnostics;
    throw err;
  }
  return result.bim;
}
