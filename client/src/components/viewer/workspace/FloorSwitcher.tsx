import { useScene } from "@/stores/use-scene";
import { useViewer } from "@/stores/use-viewer";

interface LevelLike {
  id: string;
  name?: string;
}

export function FloorSwitcher() {
  const nodes = useScene((s) => s.nodes);
  const activeLevelId = useViewer((s) => s.activeLevelId);
  const setActiveLevel = useViewer((s) => s.setActiveLevel);

  const levels = Object.values(nodes).filter(
    (n: any) => n?.type === "level",
  ) as LevelLike[];

  if (levels.length < 2) return null;

  const toLabel = (lvl: LevelLike) => {
    const text = lvl.name || lvl.id;
    return (text[0] || "L").toUpperCase();
  };

  return (
    <div
      style={{
        position: "absolute",
        left: 16,
        bottom: 72,
        background: "rgba(17,17,17,.72)",
        backdropFilter: "blur(20px)",
        border: "1px solid var(--line-2)",
        borderRadius: 10,
        padding: 6,
        display: "flex",
        flexDirection: "row",
        gap: 2,
        zIndex: 9,
        boxShadow: "0 8px 32px rgba(0,0,0,.4)",
      }}
    >
      {[...levels].reverse().map((lvl) => {
        const active = activeLevelId === lvl.id;
        return (
          <button
            key={lvl.id}
            onClick={() => setActiveLevel(lvl.id)}
            title={lvl.name || lvl.id}
            style={{
              width: 32,
              height: 30,
              border: 0,
              borderRadius: 6,
              background: active ? "rgba(249,115,22,.14)" : "transparent",
              color: active ? "var(--primary)" : "var(--fg-3)",
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              fontWeight: 600,
              cursor: "pointer",
              transition: "all .12s",
              display: "grid",
              placeItems: "center",
            }}
            onMouseOver={(e) => {
              if (!active) e.currentTarget.style.background = "rgba(255,255,255,.04)";
            }}
            onMouseOut={(e) => {
              if (!active) e.currentTarget.style.background = "transparent";
            }}
          >
            {toLabel(lvl)}
          </button>
        );
      })}
    </div>
  );
}
