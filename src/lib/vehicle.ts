export const VEHICLES = ["walk", "motorbike", "car"] as const;
export type Vehicle = (typeof VEHICLES)[number];

const RADIUS_METERS: Record<Vehicle, number> = {
  walk: 1000,
  motorbike: 5000,
  car: 15000,
};

export function radiusForVehicle(vehicle: Vehicle): number {
  return RADIUS_METERS[vehicle] ?? RADIUS_METERS.motorbike;
}
