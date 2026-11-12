import { describe, expect, it } from "vitest";
import { accessibleRadarStatus } from "./radar-status";

describe("Estado accesible del radar", () => {
  it("mantiene estable el anuncio mientras corre la cuenta regresiva", () => {
    expect(accessibleRadarStatus("12 señales cerca · renovación en 20s")).toBe(
      "12 señales cerca · renovación automática",
    );
    expect(accessibleRadarStatus("12 señales cerca · renovación en 19s")).toBe(
      "12 señales cerca · renovación automática",
    );
    expect(accessibleRadarStatus("No hay señales en esta vista")).toBe(
      "No hay señales en esta vista",
    );
  });
});
