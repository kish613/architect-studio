import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const repoRoot = process.cwd();

describe("shared schema entrypoint", () => {
  it("keeps runtime-safe .js imports for shared modules", () => {
    const schemaSource = readFileSync(path.join(repoRoot, "shared/schema.ts"), "utf8");

    expect(schemaSource).toContain('from "./model-pipeline.js"');
    expect(schemaSource).toContain('from "./models/auth.js"');
    expect(schemaSource).not.toContain('from "./model-pipeline.ts"');
    expect(schemaSource).not.toContain('from "./models/auth.ts"');
  });

  it("runs drizzle commands through tsx so .js specifiers still resolve from TS source", () => {
    const packageSource = readFileSync(path.join(repoRoot, "package.json"), "utf8");

    expect(packageSource).toContain('"db:push": "node --import tsx ./node_modules/drizzle-kit/bin.cjs push"');
    expect(packageSource).toContain('"db:generate": "node --import tsx ./node_modules/drizzle-kit/bin.cjs generate"');
    expect(packageSource).toContain('"db:migrate": "node --import tsx ./node_modules/drizzle-kit/bin.cjs migrate"');
  });
});
