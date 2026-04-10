/**
 * Server-side re-export of the shared canonical BIM schema.
 *
 * The server pipeline imports through this module so that if we ever need
 * server-specific helpers (DB-aware hydration, index-building, etc.) we have
 * a single home for them without leaking into the shared/ browser-safe code.
 */

export * from "../../shared/bim/canonical-schema.js";
export * from "../../shared/bim/load.js";
