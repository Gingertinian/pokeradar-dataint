import { describe, expect, it } from "vitest";
import { getDestination } from "./destinations";
import { localSightings } from "./local-radar";
import { encounterEnvironment } from "./encounter-environment";

describe("Entorno visual del encuentro", () => {
  it("representa el césped cercano a la costa sin llamarlo pradera serrana", () => {
    const site = getDestination("san-martin")!;
    const [sighting] = localSightings(
      site,
      {
        coordinates: site.area.center,
        bounds: site.viewBounds,
        zoom: 16,
        terrain: [{ coordinates: site.area.center, habitat: "grassland" }],
      },
      { day: "2026-11-12", round: 0 },
    );
    expect(sighting).toBeDefined();
    expect(encounterEnvironment(site, sighting)).toEqual({
      name: "Entorno de Parque San Martín",
      label: "Vegetación abierta",
      visualHabitat: "coast",
    });
    expect(sighting?.habitat).toBe("grassland");
  });

  it("no atribuye a un destino una señal lejana", () => {
    const site = getDestination("san-martin")!;
    const [sighting] = localSightings(
      site,
      {
        coordinates: [-57, -38],
        bounds: [-57.01, -38.01, -56.99, -37.99],
        zoom: 16,
        terrain: [{ coordinates: [-57, -38], habitat: "grassland" }],
      },
      { day: "2026-11-12", round: 0 },
    );
    expect(sighting).toBeDefined();
    expect(encounterEnvironment(site, sighting)).toEqual({
      name: "Zona explorada",
      label: "Vegetación abierta",
      visualHabitat: "grassland",
    });
  });
});
