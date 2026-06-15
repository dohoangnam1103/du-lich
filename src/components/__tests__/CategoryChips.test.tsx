import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CategoryChips } from "@/components/CategoryChips";

describe("CategoryChips", () => {
  it("renders all four category chips", () => {
    render(<CategoryChips value="food" onChange={() => {}} />);
    expect(screen.getByRole("button", { name: /ăn uống/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /cà phê/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /vui chơi/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /tham quan/i })).toBeInTheDocument();
  });

  it("calls onChange with category key", () => {
    const onChange = vi.fn();
    render(<CategoryChips value="food" onChange={onChange} />);
    fireEvent.click(screen.getByRole("button", { name: /cà phê/i }));
    expect(onChange).toHaveBeenCalledWith("cafe");
  });
});
