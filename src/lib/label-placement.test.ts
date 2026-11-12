import { describe, expect, it } from "vitest";
import { destinationLabelOffsets, radarPlacement } from "./label-placement";

describe("Etiquetas de destinos", () => {
  it("separa destinos cercanos sin sacar las etiquetas del mapa", () => {
    const points = [
      { x: 450, y: 250 },
      { x: 470, y: 255 },
      { x: 490, y: 260 },
    ];
    const offsets = destinationLabelOffsets(points, 900, 650);
    const boxes = points.map((point, index) => ({
      left: point.x + offsets[index]![0],
      top: point.y + offsets[index]![1],
    }));
    for (const [i, box] of boxes.entries()) {
      expect(box.left).toBeGreaterThanOrEqual(12);
      expect(box.left + 174).toBeLessThanOrEqual(888);
      expect(box.top).toBeGreaterThanOrEqual(108);
      for (const other of boxes.slice(i + 1))
        expect(
          box.left + 174 <= other.left ||
            other.left + 174 <= box.left ||
            box.top + 58 <= other.top ||
            other.top + 58 <= box.top,
        ).toBe(true);
    }
  });
  it("reserva espacio para los controles laterales", () => {
    const point = { x: 600, y: 200 };
    const [offset] = destinationLabelOffsets([point], 650, 720);
    expect(point.x + offset![0] + 174).toBeLessThanOrEqual(650 - 76);
  });
});

describe("Ubicación del radar", () => {
  it("despeja los rastros cercanos al borde inferior", () => {
    const placement = radarPlacement(
      [
        { x: 470, y: 350 },
        { x: 434, y: 429 },
        { x: 565, y: 436 },
      ],
      1000,
      582,
    );
    expect(placement.side).toBe("right");
    expect(placement.lift + placement.shift).toBeGreaterThan(0);
  });
  it("elige el lado libre si los rastros están en el lado derecho", () => {
    const placement = radarPlacement(
      [
        { x: 820, y: 350 },
        { x: 780, y: 410 },
        { x: 750, y: 460 },
      ],
      1000,
      582,
    );
    expect(placement.side).toBe("left");
  });
  it("desplaza el panel cuando tapa un rastro al entrar al glaciar", () => {
    const placement = radarPlacement(
      [
        { x: 687, y: 340 },
        { x: 526, y: 292 },
        { x: 460, y: 396 },
      ],
      1280,
      652,
    );
    expect(placement.side).toBe("right");
    expect(placement.shift).toBeGreaterThanOrEqual(64);
  });
  it("también evita tapar señales cercanas que no son resultados del radar", () => {
    const placement = radarPlacement(
      [
        { x: 687, y: 340 },
        { x: 526, y: 292 },
        { x: 460, y: 396 },
      ],
      1280,
      652,
      false,
      [{ x: 738, y: 461 }],
    );
    expect(placement.side).toBe("right");
    expect(placement.shift).toBeGreaterThanOrEqual(128);
  });
  it("eleva la tarjeta móvil cuando los rastros están en la parte inferior", () => {
    const placement = radarPlacement(
      [
        { x: 165, y: 450 },
        { x: 230, y: 280 },
        { x: 260, y: 540 },
      ],
      390,
      782,
      true,
    );
    expect(placement.side).toBe("left");
    expect(placement.lift).toBeGreaterThan(0);
  });
});
