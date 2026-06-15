import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GlassPanel } from "@/components/GlassPanel";

describe("GlassPanel", () => {
  it("renders children inside a glass container", () => {
    render(<GlassPanel>hello</GlassPanel>);
    const el = screen.getByText("hello");
    expect(el.className).toContain("glass");
  });

  it("merges extra className", () => {
    render(<GlassPanel className="extra">x</GlassPanel>);
    expect(screen.getByText("x").className).toContain("extra");
  });
});
