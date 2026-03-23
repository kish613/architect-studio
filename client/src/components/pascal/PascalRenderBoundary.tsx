import React, { type ReactNode } from "react";
import { ErrorBoundary, type FallbackProps } from "react-error-boundary";
import { PascalRecoveryPanel } from "./PascalRecoveryPanel";
import type { PascalSceneDiagnostic } from "@shared/pascal-load";

interface PascalRenderBoundaryProps {
  children: ReactNode;
  title: string;
  description: string;
  onReset?: () => void;
  resetKeys?: unknown[];
  primaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: "default" | "secondary" | "outline" | "ghost";
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    variant?: "default" | "secondary" | "outline" | "ghost";
  };
}

function buildRenderDiagnostics(error: Error): PascalSceneDiagnostic[] {
  return [
    {
      stage: "render",
      code: "render-error",
      message: error.message || "Pascal renderer crashed while mounting this scene.",
    },
  ];
}

function PascalRenderFallback({
  error,
  resetErrorBoundary,
  title,
  description,
  primaryAction,
  secondaryAction,
}: FallbackProps &
  Omit<PascalRenderBoundaryProps, "children" | "onReset">) {
  return (
    <PascalRecoveryPanel
      title={title}
      description={description}
      diagnostics={buildRenderDiagnostics(error)}
      primaryAction={
        primaryAction && {
          ...primaryAction,
          onClick: () => {
            primaryAction.onClick();
            resetErrorBoundary();
          },
        }
      }
      secondaryAction={
        secondaryAction && {
          ...secondaryAction,
          onClick: () => {
            secondaryAction.onClick();
            resetErrorBoundary();
          },
        }
      }
    />
  );
}

export function PascalRenderBoundary({
  children,
  title,
  description,
  onReset,
  resetKeys,
  primaryAction,
  secondaryAction,
}: PascalRenderBoundaryProps) {
  return (
    <ErrorBoundary
      onReset={onReset}
      resetKeys={resetKeys}
      FallbackComponent={(props) => (
        <PascalRenderFallback
          {...props}
          title={title}
          description={description}
          primaryAction={primaryAction}
          secondaryAction={secondaryAction}
        />
      )}
    >
      {children}
    </ErrorBoundary>
  );
}
