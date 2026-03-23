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
            code: "missing-wall-reference",
            message: 'Door "Kitchen Door" references a wall that no longer exists.',
          },
        ],
        primaryAction: { label: "Open Original View", onClick: vi.fn() },
        secondaryAction: { label: "Back to Projects", onClick: vi.fn() },
      })
    );

    expect(markup).toContain("Pascal scene could not be validated");
    expect(markup).toContain("The stored scene payload is malformed.");
    expect(markup).toContain("missing-wall-reference");
    expect(markup).toContain("Door &quot;Kitchen Door&quot; references a wall that no longer exists.");
    expect(markup).toContain("Open Original View");
    expect(markup).toContain("Back to Projects");
  });
});
