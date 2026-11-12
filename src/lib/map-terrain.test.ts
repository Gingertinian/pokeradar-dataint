import { describe, it, expect } from "vitest";
import { referenceHabitat, terrainFingerprint, terrainHabitat } from "./map-terrain";
import { getDestination } from "./destinations";
describe("Superficie cartográfica del radar", () => {
  it("detecta cambios de celdas o hábitats aunque la cantidad no cambie", () => {
    const first = [
      { cellId: "a", coordinates: [-57.5, -38] as [number, number], habitat: "grassland" as const },
      { cellId: "b", coordinates: [-57.6, -38] as [number, number], habitat: "urban" as const },
    ];
    expect(terrainFingerprint(first)).toBe(terrainFingerprint([...first].reverse()));
    expect(terrainFingerprint(first)).not.toBe(
      terrainFingerprint([{ ...first[0]!, habitat: "forest" }, first[1]!]),
    );
    expect(terrainFingerprint(first)).not.toBe(
      terrainFingerprint([{ ...first[0]!, cellId: "c" }, first[1]!]),
    );
    expect(terrainFingerprint([])).not.toBe(terrainFingerprint(undefined));
  });
  it("no traslada el hábitat costero de la base a una zona andina lejana", () => {
    const coast = getDestination("san-martin")!;
    const andes = getDestination("puente-inca")!;
    expect(referenceHabitat(coast.area.center, coast)).toBe("coast");
    expect(referenceHabitat(andes.area.center, coast)).toBe("mountain");
    expect(referenceHabitat([-64, -35], coast)).toBe("grassland");
  });
  it("el agua y los edificios prevalecen sobre un parque que los contiene", () => {
    const park = { sourceLayer: "park", properties: {} };
    for (const sourceLayer of ["water", "waterway", "building"])
      expect(terrainHabitat([park, { sourceLayer, properties: {} }], "forest")).toBeNull();
    expect(terrainHabitat([], "forest")).toBeNull();
    expect(
      terrainHabitat([{ sourceLayer: "landcover", properties: { class: "wood" } }], "urban"),
    ).toBe("forest");
    expect(
      terrainHabitat([{ sourceLayer: "landcover", properties: { class: "sand" } }], "mountain"),
    ).toBe("mountain");
  });
});
