/**
 * Client-side BIM surface.
 *
 * Thin wrapper around the shared canonical BIM schema + loader. The client
 * should prefer importing from here so we have a single chokepoint for
 * client-only helpers (React adapters, memoised selectors, etc.) down the
 * line without touching the isomorphic shared/ code.
 */

export * from "@shared/bim/canonical-schema";
export * from "@shared/bim/load";
