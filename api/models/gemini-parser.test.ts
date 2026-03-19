import { describe, expect, it } from "vitest";
import { parseGeminiImageResponse } from "../../lib/gemini.js";

describe("Gemini image parsing", () => {
  it("accepts responses that include an image part", () => {
    const result = parseGeminiImageResponse({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [
              { text: "here is the image" },
              {
                inline_data: {
                  mime_type: "image/png",
                  data: "ZmFrZS1iYXNlNjQ=",
                },
              },
            ],
          },
        },
      ],
    });

    expect(result.success).toBe(true);
    expect(result.imagePart?.inline_data?.mime_type).toBe("image/png");
    expect(result.diagnostics?.imagePartCount).toBe(1);
  });

  it("requires an image part and marks text-only responses retryable", () => {
    const result = parseGeminiImageResponse({
      candidates: [
        {
          finishReason: "STOP",
          content: {
            parts: [{ text: "text only" }],
          },
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.retryable).toBe(true);
    expect(result.error).toMatch(/NO_IMAGE_DATA/i);
    expect(result.diagnostics?.hasImagePart).toBe(false);
    expect(result.diagnostics?.textPartCount).toBe(1);
  });
});
