import { eq } from "drizzle-orm";
import { db } from "../lib/db.js";
import { floorplanDesigns, floorplanModels } from "../shared/schema.js";
import { loadPascalScene } from "../shared/pascal-load.js";

type PascalRecordKind = "design" | "model";
type PascalAuditStatus = "valid" | "recoverable" | "irreparable" | "missing";

interface PascalAuditRecord {
  kind: PascalRecordKind;
  id: number;
  status: PascalAuditStatus;
  sceneVersion?: number;
  diagnostics: string[];
  normalizedScene?: string;
}

function parseArgs(argv: string[]) {
  const mode = argv[2];
  const apply = argv.includes("--apply");

  if (mode !== "audit" && mode !== "repair") {
    throw new Error('Usage: tsx scripts/pascal-scenes.ts <audit|repair> [--apply]');
  }

  return { mode, apply };
}

function summarize(records: PascalAuditRecord[]) {
  return records.reduce<Record<PascalAuditStatus, number>>(
    (summary, record) => {
      summary[record.status] += 1;
      return summary;
    },
    {
      valid: 0,
      recoverable: 0,
      irreparable: 0,
      missing: 0,
    }
  );
}

async function collectAuditRecords(): Promise<PascalAuditRecord[]> {
  const [designs, models] = await Promise.all([
    db
      .select({
        id: floorplanDesigns.id,
        sceneData: floorplanDesigns.sceneData,
      })
      .from(floorplanDesigns),
    db
      .select({
        id: floorplanModels.id,
        pascalData: floorplanModels.pascalData,
        sceneVersion: floorplanModels.sceneVersion,
      })
      .from(floorplanModels),
  ]);

  const designRecords = designs.map((design): PascalAuditRecord => {
    const result = loadPascalScene(design.sceneData);
    return {
      kind: "design",
      id: design.id,
      status:
        result.status === "ok"
          ? "valid"
          : result.status === "recovered"
            ? "recoverable"
            : "irreparable",
      diagnostics: result.diagnostics.map((diagnostic) => diagnostic.message),
      normalizedScene:
        result.status === "error" ? undefined : JSON.stringify(result.sceneData),
    };
  });

  const modelRecords = models.map((model): PascalAuditRecord => {
    if (!model.pascalData) {
      return {
        kind: "model",
        id: model.id,
        status: "missing",
        sceneVersion: model.sceneVersion,
        diagnostics: [],
      };
    }

    const result = loadPascalScene(model.pascalData);
    return {
      kind: "model",
      id: model.id,
      sceneVersion: model.sceneVersion,
      status:
        result.status === "ok"
          ? "valid"
          : result.status === "recovered"
            ? "recoverable"
            : "irreparable",
      diagnostics: result.diagnostics.map((diagnostic) => diagnostic.message),
      normalizedScene:
        result.status === "error" ? undefined : JSON.stringify(result.sceneData),
    };
  });

  return [...designRecords, ...modelRecords];
}

async function repairRecords(records: PascalAuditRecord[], apply: boolean) {
  const recoverable = records.filter((record) => record.status === "recoverable");
  const irreparable = records.filter((record) => record.status === "irreparable");

  if (!apply) {
    console.log(
      JSON.stringify(
        {
          mode: "repair",
          dryRun: true,
          recoverable: recoverable.length,
          irreparable: irreparable.length,
          records: recoverable,
        },
        null,
        2
      )
    );
    return;
  }

  for (const record of recoverable) {
    if (!record.normalizedScene) {
      continue;
    }

    if (record.kind === "design") {
      await db
        .update(floorplanDesigns)
        .set({
          sceneData: record.normalizedScene,
          updatedAt: new Date(),
        })
        .where(eq(floorplanDesigns.id, record.id));
      continue;
    }

    await db
      .update(floorplanModels)
      .set({
        pascalData: record.normalizedScene,
        sceneVersion: Math.max(1, (record.sceneVersion ?? 1) + 1),
      })
      .where(eq(floorplanModels.id, record.id));
  }

  console.log(
    JSON.stringify(
      {
        mode: "repair",
        dryRun: false,
        repaired: recoverable.length,
        irreparable: irreparable.length,
        irreparableRecords: irreparable,
      },
      null,
      2
    )
  );
}

async function main() {
  const { mode, apply } = parseArgs(process.argv);
  const records = await collectAuditRecords();

  if (mode === "audit") {
    console.log(
      JSON.stringify(
        {
          mode,
          summary: summarize(records),
          records,
        },
        null,
        2
      )
    );
    return;
  }

  await repairRecords(records, apply);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
