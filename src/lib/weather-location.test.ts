import { describe, expect, it } from "vitest";
import { parseWeatherLocation, weatherCell } from "./weather-location";

describe("Zona aproximada para el clima", () => {
  it("mantiene la misma celda en movimientos pequeños y cambia al desplazarse lejos", () => {
    expect(weatherCell([-57.529, -38.024])).toEqual(weatherCell([-57.531, -38.025]));
    expect(weatherCell([-57.529, -38.024])).not.toEqual(weatherCell([-58.4, -34.6]));
    expect(weatherCell([302.471, -38.024])).toEqual(weatherCell([-57.529, -38.024]));
  });
  it("acepta solo pares de coordenadas numéricas dentro de rango", () => {
    expect(parseWeatherLocation(new URLSearchParams())).toBeUndefined();
    expect(parseWeatherLocation(new URLSearchParams("lat=-38.024&lon=-57.529"))).toEqual([
      -57.5, -38,
    ]);
    for (const input of [
      "lat=1",
      "lat=&lon=1",
      "lat=91&lon=1",
      "lat=1&lon=181",
      "lat=NaN&lon=1",
      "lat=0x10&lon=1",
    ])
      expect(parseWeatherLocation(new URLSearchParams(input))).toBeNull();
  });
});
