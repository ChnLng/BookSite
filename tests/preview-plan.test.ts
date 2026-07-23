import { describe, expect, it } from "vitest";
import { previewPlanSections, visualPillars } from "../src/data/preview-plan";

describe("design preview plan", () => {
  it("includes architecture and visual pillars for the new experience", () => {
    expect(previewPlanSections.map((item) => item.title)).toEqual(
      expect.arrayContaining(["Architecture", "Visual direction", "Page modules"])
    );

    expect(visualPillars).toEqual(
      expect.arrayContaining(["Story-led hero", "Structured catalogue", "Calm account experience"])
    );
  });
});
