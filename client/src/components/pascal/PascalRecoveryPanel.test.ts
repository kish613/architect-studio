import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { PascalRecoveryPanel } from "./PascalRecoveryPanel";

describe("PascalRecoveryPanel", () => {
  it("renders stage-specific diagnostics and actions", () => {
    const markup = renderToStaticMarkup(
      createElement(PascalRecoveryPanel, {
        title: "Pascal scene could not be validated",
        description: "The stored scene payload is malformed.",
        diagnostics: [
          {
            stage: "validate",
            code: "orphan-wall-ref-removed",
            message: 'Door "Kitchen Door" referenced missing wall — removed from scene.',
          },
        ],
        primaryAction: { label: "Open Original View", onClick: vi.fn() },
        secondaryAction: { label: "Back to Projects", onClick: vi.fn() },
      })
    );

    expect(markup).toContain("Pascal scene could not be validated");
    expect(markup).toContain("The stored scene payload is malformed.");
    expect(markup).toContain("orphan-wall-ref-removed");
    expect(markup).toContain("Door &quot;Kitchen Door&quot; referenced missing wall — removed from scene.");
    expect(markup).toContain("Open Original View");
    expect(markup).toContain("Back to Projects");
  });
});
