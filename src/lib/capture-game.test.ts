import { describe, it, expect } from "vitest";
import { catchProbability, qualifiesAsCurve, resolveThrow } from "./capture-game";
describe("Captura con resultados reales", () => {
  const attempt = {
    rate: 100,
    ball: "poke" as const,
    berry: false,
    accuracy: 0.5,
    curve: false,
    hit: true,
    attempt: 1,
  };
  it("an evade consumes the throw without rolling a capture or flee", () => {
    let rolls = 0;
    const result = resolveThrow({ ...attempt, evading: true }, () => {
      rolls++;
      return 0;
    });
    expect(result.outcome).toBe("miss");
    expect(rolls).toBe(0);
    expect(resolveThrow({ ...attempt, evading: false }, () => 0).outcome).toBe("caught");
  });
  it("aplica la misma bonificación de curva en ambos sentidos a partir del umbral", () => {
    expect(qualifiesAsCurve(0.1)).toBe(false);
    expect(qualifiesAsCurve(-0.1)).toBe(false);
    expect(qualifiesAsCurve(0.3)).toBe(true);
    expect(qualifiesAsCurve(-0.3)).toBe(true);
  });
  it("distingue fallo, captura, liberaciÃ³n y huida con los mismos controles", () => {
    expect(resolveThrow({ ...attempt, hit: false }, () => 0).outcome).toBe("miss");
    expect(resolveThrow(attempt, () => 0).outcome).toBe("caught");
    expect(resolveThrow(attempt, () => 0.999).outcome).toBe("breakout");
    const rolls = [0.999, 0];
    expect(resolveThrow(attempt, () => rolls.shift()!).outcome).toBe("fled");
  });
  it("mejora las chances con punterÃ­a, equipo y curva sin garantizar captura", () => {
    const base = catchProbability(100, "poke", false, 0.1, false);
    expect(catchProbability(100, "poke", false, 0.9, false)).toBeGreaterThan(base);
    expect(catchProbability(100, "great", false, 0.1, false)).toBeGreaterThan(base);
    expect(catchProbability(100, "poke", true, 0.1, false)).toBeGreaterThan(base);
    expect(catchProbability(100, "poke", false, 0.1, true)).toBeGreaterThan(base);
    expect(catchProbability(255, "ultra", true, 1, true)).toBeLessThan(1);
  });
});
