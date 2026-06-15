import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { VehicleToggle } from "@/components/VehicleToggle";

describe("VehicleToggle", () => {
  it("renders three vehicle buttons and marks the active one", () => {
    render(<VehicleToggle value="motorbike" onChange={() => {}} />);
    const active = screen.getByRole("button", { name: /xe máy/i });
    expect(active.getAttribute("aria-pressed")).toBe("true");
  });

  it("calls onChange with the chosen vehicle", () => {
    const onChange = vi.fn();
    render(<VehicleToggle value="walk" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /ô tô/i }));
    expect(onChange).toHaveBeenCalledWith("car");
  });
});
