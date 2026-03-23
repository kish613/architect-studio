import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { PascalSceneDiagnostic } from "@shared/pascal-load";

interface PascalRecoveryAction {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "secondary" | "outline" | "ghost";
}

interface PascalRecoveryPanelProps {
  title: string;
  description: string;
  diagnostics?: PascalSceneDiagnostic[];
  primaryAction?: PascalRecoveryAction;
  secondaryAction?: PascalRecoveryAction;
  compact?: boolean;
}

export function PascalRecoveryPanel({
  title,
  description,
  diagnostics = [],
  primaryAction,
  secondaryAction,
  compact = false,
}: PascalRecoveryPanelProps) {
  return (
    <div
      className={
        compact
          ? "w-full"
          : "w-full h-full flex items-center justify-center bg-[#050505] p-6"
      }
    >
      <div
        className={`w-full rounded-3xl border border-white/10 bg-white/[0.03] p-6 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl ${
          compact ? "max-w-xl" : "max-w-2xl"
        }`}
      >
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-300">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-semibold text-white">{title}</h2>
            <p className="mt-2 text-sm leading-6 text-white/65">{description}</p>
          </div>
        </div>

        {diagnostics.length > 0 && (
          <div className="mt-6 rounded-2xl border border-white/10 bg-black/30 p-4">
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-white/45">
              <RefreshCw className="h-3.5 w-3.5" />
              Pascal Diagnostics
            </div>
            <div className="space-y-3">
              {diagnostics.map((diagnostic, index) => (
                <div
                  key={`${diagnostic.code}-${diagnostic.nodeId ?? "global"}-${index}`}
                  className="rounded-xl border border-white/8 bg-white/[0.03] px-3 py-2"
                >
                  <div className="flex flex-wrap items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-white/40">
                    <span>{diagnostic.stage}</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-white/55">
                      {diagnostic.code}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/70">{diagnostic.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {(primaryAction || secondaryAction) && (
          <div className="mt-6 flex flex-wrap gap-3">
            {primaryAction && (
              <Button
                onClick={primaryAction.onClick}
                disabled={primaryAction.disabled}
                variant={primaryAction.variant ?? "default"}
              >
                {primaryAction.label}
              </Button>
            )}
            {secondaryAction && (
              <Button
                onClick={secondaryAction.onClick}
                disabled={secondaryAction.disabled}
                variant={secondaryAction.variant ?? "outline"}
              >
                {secondaryAction.label}
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
