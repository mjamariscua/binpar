import { describe, expect, it } from "vitest";
import {
  EARTH_MOON_FORCE_N,
  MOON_DISTANCE_RADII,
  accelerationAt,
  circularPeriodDays,
  fallDistance,
} from "./earth-moon";

describe("el test de la Luna de Newton", () => {
  it("en la superficie, una manzana cae 4.9 m en el primer segundo", () => {
    expect(fallDistance(accelerationAt(1))).toBeCloseTo(4.905, 3);
  });

  it("la Luna, a 60 radios, cae unos 1.35 mm en ese mismo segundo (60² veces menos)", () => {
    const moonFall = fallDistance(accelerationAt(MOON_DISTANCE_RADII));
    expect(moonFall * 1000).toBeCloseTo(1.35, 2);
    expect(fallDistance(accelerationAt(1)) / moonFall).toBeCloseTo(MOON_DISTANCE_RADII ** 2, 6);
  });

  it("con esa misma gravedad, una órbita a 60.3 radios dura unos 27 días (el mes lunar)", () => {
    expect(circularPeriodDays(MOON_DISTANCE_RADII)).toBeGreaterThan(27);
    expect(circularPeriodDays(MOON_DISTANCE_RADII)).toBeLessThan(28);
  });

  it("la fuerza Tierra–Luna es del orden de 2·10²⁰ N", () => {
    expect(EARTH_MOON_FORCE_N).toBeGreaterThan(1.9e20);
    expect(EARTH_MOON_FORCE_N).toBeLessThan(2.05e20);
  });
});
