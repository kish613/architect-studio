import { useState } from "react";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Sparkles,
  Check,
  Loader2,
  Box,
  Image as ImageIcon,
  Layers,
  Paintbrush,
} from "lucide-react";

export type ThreeDProvider = "meshy" | "trellis";

export interface GeneratePopoverProps {
  hasPascal: boolean;
  hasIsometric: boolean;
  has3D: boolean;
  isPascalLoading: boolean;
  isIsometricLoading: boolean;
  is3DLoading: boolean;
  isRetexturing: boolean;
  provider3D: ThreeDProvider;
  onProviderChange: (p: ThreeDProvider) => void;
  onPascal: () => void;
  onIsometric: (prompt?: string) => void;
  onGenerate3D: () => void;
  onRetexture: (prompt: string) => void;
  onRevert: () => void;
  disabled?: boolean;
}

export function GeneratePopover(p: GeneratePopoverProps) {
  const [isoPrompt, setIsoPrompt] = useState("");
  const [texPrompt, setTexPrompt] = useState("");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="sb-btn sb-btn-primary" disabled={p.disabled}>
          <Sparkles style={{ width: 13, height: 13 }} />
          Generate
        </button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        sideOffset={8}
        className="p-0"
        style={{
          width: 340,
          background: "var(--ink-2)",
          border: "1px solid var(--line-3)",
          borderRadius: 12,
          color: "var(--fg-1)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <Row
          icon={Layers}
          label="Pascal BIM"
          done={p.hasPascal}
          loading={p.isPascalLoading}
          onClick={p.onPascal}
          cta="Generate"
        />
        <Row
          icon={ImageIcon}
          label="Isometric render"
          done={p.hasIsometric}
          loading={p.isIsometricLoading}
          onClick={() => p.onIsometric(isoPrompt || undefined)}
          cta="Generate"
          extra={
            <textarea
              value={isoPrompt}
              onChange={(e) => setIsoPrompt(e.target.value)}
              placeholder="Optional: describe the look you want"
              style={promptStyle}
              rows={2}
            />
          }
        />
        <Row
          icon={Box}
          label="3D mesh"
          done={p.has3D}
          loading={p.is3DLoading}
          onClick={p.onGenerate3D}
          cta="Generate"
          extra={
            <div
              style={{
                display: "flex",
                gap: 4,
                background: "var(--ink-3)",
                borderRadius: 6,
                padding: 3,
                marginTop: 6,
                border: "1px solid var(--line-2)",
              }}
            >
              {(["trellis", "meshy"] as const).map((provider) => (
                <button
                  key={provider}
                  onClick={() => p.onProviderChange(provider)}
                  style={{
                    flex: 1,
                    padding: "4px 8px",
                    borderRadius: 4,
                    border: 0,
                    background:
                      p.provider3D === provider
                        ? "var(--primary)"
                        : "transparent",
                    color:
                      p.provider3D === provider ? "white" : "var(--fg-3)",
                    fontSize: 11,
                    fontWeight: 500,
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  {provider}
                </button>
              ))}
            </div>
          }
        />
        <Row
          icon={Paintbrush}
          label="Retexture"
          loading={p.isRetexturing}
          onClick={() => texPrompt && p.onRetexture(texPrompt)}
          cta="Apply"
          extra={
            <>
              <textarea
                value={texPrompt}
                onChange={(e) => setTexPrompt(e.target.value)}
                placeholder="e.g. weathered oak plank flooring"
                style={promptStyle}
                rows={2}
              />
              <button onClick={p.onRevert} style={revertLinkStyle}>
                Revert to original
              </button>
            </>
          }
        />
      </PopoverContent>
    </Popover>
  );
}

const promptStyle: React.CSSProperties = {
  width: "100%",
  marginTop: 6,
  background: "var(--ink-3)",
  border: "1px solid var(--line-2)",
  borderRadius: 6,
  padding: "6px 8px",
  color: "var(--fg-1)",
  fontFamily: "var(--font-sans)",
  fontSize: 12,
  resize: "vertical",
};

const revertLinkStyle: React.CSSProperties = {
  background: "transparent",
  border: 0,
  color: "var(--fg-3)",
  fontSize: 11,
  padding: "4px 0",
  marginTop: 4,
  cursor: "pointer",
  textDecoration: "underline",
};

interface RowProps {
  icon: React.ComponentType<{ style?: React.CSSProperties }>;
  label: string;
  done?: boolean;
  loading?: boolean;
  onClick: () => void;
  cta: string;
  extra?: React.ReactNode;
}

function Row({
  icon: Icon,
  label,
  done,
  loading,
  onClick,
  cta,
  extra,
}: RowProps) {
  return (
    <div
      style={{
        padding: "12px 14px",
        borderBottom: "1px solid var(--line-2)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <Icon style={{ width: 14, height: 14, color: "var(--fg-2)" }} />
        <span
          style={{
            flex: 1,
            fontSize: 13,
            color: "var(--fg-1)",
            fontWeight: 500,
          }}
        >
          {label}
        </span>
        {done && (
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
              fontSize: 10,
              color: "var(--success-fg)",
              padding: "2px 6px",
              borderRadius: 4,
              background: "rgba(16,185,129,.12)",
            }}
          >
            <Check style={{ width: 10, height: 10 }} />
            done
          </span>
        )}
        <button
          disabled={loading}
          onClick={onClick}
          style={{
            height: 26,
            padding: "0 10px",
            borderRadius: 6,
            background: "var(--primary)",
            color: "white",
            border: 0,
            fontSize: 11,
            fontWeight: 500,
            cursor: loading ? "wait" : "pointer",
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          {loading && (
            <Loader2
              style={{
                width: 11,
                height: 11,
                animation: "spin 1s linear infinite",
              }}
            />
          )}
          {cta}
        </button>
      </div>
      {extra}
    </div>
  );
}
