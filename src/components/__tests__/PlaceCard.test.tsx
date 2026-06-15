import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PlaceCard } from "@/components/PlaceCard";

const place = {
  placeId: "p1",
  name: "Quán Ngon",
  lat: 10,
  lng: 106,
  rating: 4.3,
  userRatingCount: 88,
  distanceMeters: 1234,
};

describe("PlaceCard", () => {
  it("shows name, rating and human distance", () => {
    render(<PlaceCard place={place} />);
    expect(screen.getByText("Quán Ngon")).toBeInTheDocument();
    expect(screen.getByText(/4.3/)).toBeInTheDocument();
    expect(screen.getByText(/1.2 km/)).toBeInTheDocument();
  });

  it("shows meters when under 1km", () => {
    render(<PlaceCard place={{ ...place, distanceMeters: 450 }} />);
    expect(screen.getByText(/450 m/)).toBeInTheDocument();
  });

  it("links to the detail page", () => {
    render(<PlaceCard place={place} />);
    expect(screen.getByRole("link").getAttribute("href")).toBe("/place/p1");
  });
});
