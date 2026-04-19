import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";
import { WORKSPACE_MATERIALS, findMaterial } from "./materials";

function NumberField({
  label,
  value,
  unit = "m",
}: {
  label: string;
  value: number | string | undefined;
  unit?: string;
}) {
  const display =
    typeof value === "number" ? value.toFixed(2) : value ?? "—";
  return (
    <div className="sb-field">
      <label>{label}</label>
      <input defaultValue={String(display)} readOnly />
      <span className="unit">{unit}</span>
    </div>
  );
}

function distance3(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  const dz = a.z - b.z;
  return Math.sqrt(dx * dx + dy * dy + dz * dz);
}

export function Inspector({ className }: { className?: string }) {
  const selectedIds = useViewer((s) => s.selectedIds);
  const selectedId = selectedIds[0];
  const node = useScene((s) =>
    selectedId ? (s.nodes as Record<string, any>)[selectedId] : undefined,
  );

  if (!node) {
    return (
      <div className={className}>
        <div className="sb-prop" style={{ borderBottom: 0 }}>
          <div className="sb-prop-label">Selection</div>
          <div
            style={{
              padding: "18px 4px",
              fontSize: 12,
              color: "var(--fg-3)",
              textAlign: "center",
            }}
          >
            Nothing selected. Click an element in the scene.
          </div>
        </div>
      </div>
    );
  }

  const typeStr = String(node.type ?? "");
  const label =
    node.label ||
    node.name ||
    (typeStr ? typeStr.charAt(0).toUpperCase() + typeStr.slice(1) : "Element");
  const material = findMaterial(node.material);

  return (
    <div className={className}>
      <div className="sb-prop">
        <div className="sb-prop-label">Selection</div>
        <div className="sb-sel">{label}</div>
        <div className="sb-sel-meta">
          {typeStr} · id-{String(node.id ?? "").slice(0, 6)}
        </div>
      </div>

      {node.transform?.position && (
        <div className="sb-prop">
          <div className="sb-prop-label">Transform</div>
          <NumberField label="X" value={node.transform.position.x} />
          <NumberField label="Y" value={node.transform.position.y} />
          <NumberField label="Z" value={node.transform.position.z} />
        </div>
      )}

      {node.type === "wall" && (
        <div className="sb-prop">
          <div className="sb-prop-label">Dimensions</div>
          <NumberField
            label="Length"
            value={
              node.start && node.end
                ? distance3(node.start, node.end)
                : undefined
            }
          />
          <NumberField label="Height" value={node.height} />
          <NumberField label="Thickness" value={node.thickness} />
        </div>
      )}
      {(node.type === "door" || node.type === "window") && (
        <div className="sb-prop">
          <div className="sb-prop-label">Dimensions</div>
          <NumberField label="Width" value={node.width} />
          <NumberField label="Height" value={node.height} />
          {node.type === "window" && (
            <NumberField label="Sill" value={node.sillHeight} />
          )}
        </div>
      )}
      {node.type === "item" && node.dimensions && (
        <div className="sb-prop">
          <div className="sb-prop-label">Dimensions</div>
          <NumberField label="Width" value={node.dimensions.x} />
          <NumberField label="Depth" value={node.dimensions.z} />
          <NumberField label="Height" value={node.dimensions.y} />
        </div>
      )}
      {node.type === "slab" && (
        <div className="sb-prop">
          <div className="sb-prop-label">Dimensions</div>
          <NumberField label="Thickness" value={node.thickness} />
        </div>
      )}
      {node.type === "roof" && (
        <div className="sb-prop">
          <div className="sb-prop-label">Roof</div>
          <NumberField label="Pitch" value={node.pitch} unit="°" />
          <NumberField label="Overhang" value={node.overhang} />
        </div>
      )}

      <div className="sb-prop">
        <div className="sb-prop-label">Material</div>
        <div className="sb-mats">
          {WORKSPACE_MATERIALS.map((m) => (
            <div
              key={m.id}
              className={`sb-mat ${material?.id === m.id ? "active" : ""}`}
              style={{
                background: m.glass
                  ? "linear-gradient(135deg,#7DDBF5,#00AEEF)"
                  : m.hex,
              }}
              title={m.name}
            />
          ))}
        </div>
        <div
          style={{
            marginTop: 10,
            fontSize: 11,
            fontFamily: "var(--font-mono)",
            color: "var(--fg-3)",
          }}
        >
          {material?.name || node.material || "—"}
        </div>
      </div>

      <div className="sb-prop">
        <div className="sb-prop-label">Planning</div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            fontSize: 11,
            color: "var(--fg-2)",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Permitted development</span>
            <span style={{ color: "var(--success-fg)" }}>✓ within limit</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Height to roof</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>3.40 m</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <span>Distance to boundary</span>
            <span style={{ fontFamily: "var(--font-mono)" }}>2.10 m</span>
          </div>
        </div>
      </div>
    </div>
  );
}
