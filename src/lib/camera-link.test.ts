import { describe, it, expect } from "vitest";
import { parseSharedCamera, writeSharedCamera } from "./camera-link";
describe("Enlace de la vista", () => {
  it("conserva el centro y el zoom sin aceptar coordenadas inválidas", () => {
    const params = new URLSearchParams({ place: "san-martin" });
    writeSharedCamera(params, { coordinates: [-57.535321, -38.026614], zoom: 16.732 });
    expect(parseSharedCamera(Object.fromEntries(params))).toEqual({
      coordinates: [-57.53532, -38.02661],
      zoom: 16.73,
    });
    expect(parseSharedCamera({ lng: "-57", lat: "91", zoom: "16" })).toBeNull();
    expect(parseSharedCamera({ lng: "", lat: "-38", zoom: "16" })).toBeNull();
    expect(parseSharedCamera({ lng: "-57", lat: "-38", zoom: "Infinity" })).toBeNull();
  });
});
