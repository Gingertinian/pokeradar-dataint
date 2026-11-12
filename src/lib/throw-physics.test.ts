import { describe, it, expect } from "vitest";
import {
  accumulateSpin,
  assistedThrowVelocity,
  closestApproach,
  gestureVelocity,
  isThrowGesture,
  simulateThrow,
} from "./throw-physics";
describe("Trayectoria e inercia", () => {
  it("solo considera lanzamiento un desplazamiento suficiente hacia arriba", () => {
    expect(isThrowGesture({ x: 1, y: 0 })).toBe(false);
    expect(isThrowGesture({ x: 45, y: 10 })).toBe(false);
    expect(isThrowGesture({ x: 0, y: -20 })).toBe(false);
    expect(isThrowGesture({ x: 10, y: -25 })).toBe(true);
  });
  it("la marca asistida sigue la trayectoria calculada y responde a dirección y fuerza", () => {
    const target = { x: 200, y: 110 };
    const base = {
      start: { x: 200, y: 280 },
      target,
      radius: 60,
      width: 400,
      height: 330,
      spin: 0,
    };
    const centered = simulateThrow({ ...base, velocity: assistedThrowVelocity(50, 61, 330) });
    const left = simulateThrow({ ...base, velocity: assistedThrowVelocity(5, 61, 330) });
    const weak = simulateThrow({ ...base, velocity: assistedThrowVelocity(50, 10, 330) });
    expect(closestApproach(centered.points, target).x).toBeCloseTo(200);
    expect(closestApproach(left.points, target).x).toBeLessThan(200);
    expect(closestApproach(weak.points, target).y).toBeGreaterThan(
      closestApproach(centered.points, target).y,
    );
  });
  it("un swipe rápido conserva la dirección sin multiplicar la potencia", () => {
    const medium = gestureVelocity({ x: 8, y: -200 }, { x: 40, y: -800 }, 600);
    const fast = gestureVelocity({ x: 8, y: -200 }, { x: 400, y: -8000 }, 600);
    expect(Math.abs(fast.y / medium.y)).toBeLessThan(1.4);
    expect(fast.x).toBe(medium.x);
    const shot = {
      start: { x: 200, y: 450 },
      target: { x: 200, y: 348 },
      radius: 70,
      width: 400,
      height: 600,
      spin: 0,
    };
    expect(simulateThrow({ ...shot, velocity: medium }).hit).toBe(true);
    expect(simulateThrow({ ...shot, velocity: fast }).hit).toBe(true);
    expect(Math.abs(gestureVelocity({ x: 0, y: 4 }, { x: 0, y: 0 }, 600).y)).toBeLessThan(120);
  });
  const base = {
    start: { x: 200, y: 280 },
    velocity: { x: 0, y: -650 },
    spin: 0,
    target: { x: 200, y: 110 },
    radius: 60,
    width: 400,
    height: 330,
  };
  it("un gesto lento cae; un impulso ascendente puede alcanzar el objetivo", () => {
    expect(simulateThrow({ ...base, velocity: { x: 0, y: -40 } }).hit).toBe(false);
    expect(simulateThrow(base).hit).toBe(true);
  });
  it("el giro desvía la trayectoria en sentidos opuestos", () => {
    const a = simulateThrow({ ...base, spin: 1, target: { x: 1000, y: 110 } }),
      b = simulateThrow({ ...base, spin: -1, target: { x: 1000, y: 110 } });
    expect(a.points[12]!.x).toBeGreaterThan(200);
    expect(b.points[12]!.x).toBeLessThan(200);
    expect(simulateThrow(base).points.every((p) => p.x === 200)).toBe(true);
  });
  it("los movimientos circulares acumulan giro que decae al dejar de girar", () => {
    let spin = 0;
    const moves = [
      { x: 10, y: 0 },
      { x: 0, y: 10 },
      { x: -10, y: 0 },
      { x: 0, y: -10 },
      { x: 10, y: 0 },
    ];
    for (let i = 1; i < moves.length; i++)
      spin = accumulateSpin(spin, moves[i - 1]!, moves[i]!, 16);
    expect(spin).toBeGreaterThan(0.8);
    expect(accumulateSpin(spin, { x: 0, y: 0 }, { x: 0, y: 0 }, 3000)).toBeLessThan(spin * 0.2);
  });
});
