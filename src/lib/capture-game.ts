export type BallKind = "poke" | "great" | "ultra";
export type ThrowOutcome = "miss" | "caught" | "breakout" | "fled";
export const BALLS = {
  poke: { name: "Poké Ball", multiplier: 1, color: "#e65d72", stock: 8 },
  great: { name: "Super Ball", multiplier: 1.35, color: "#477bc4", stock: 3 },
  ultra: { name: "Ultra Ball", multiplier: 1.7, color: "#c29d32", stock: 1 },
} as const;
export function qualifiesAsCurve(spin: number) {
  return Math.abs(spin) >= 0.3;
}
export function catchProbability(
  rate: number,
  ball: BallKind,
  berry: boolean,
  accuracy: number,
  curve: boolean,
) {
  const base = 0.12 + (Math.max(0, Math.min(255, rate)) / 255) * 0.32;
  return Math.min(
    0.86,
    Math.max(
      0.06,
      base *
        BALLS[ball].multiplier *
        (berry ? 1.25 : 1) *
        (0.85 + Math.max(0, Math.min(1, accuracy)) * 0.55) *
        (curve ? 1.12 : 1),
    ),
  );
}
export function resolveThrow(
  input: {
    rate: number;
    ball: BallKind;
    berry: boolean;
    accuracy: number;
    curve: boolean;
    hit: boolean;
    evading?: boolean;
    attempt: number;
  },
  random: () => number,
) {
  const chance = catchProbability(input.rate, input.ball, input.berry, input.accuracy, input.curve);
  if (!input.hit || input.evading) return { outcome: "miss" as ThrowOutcome, chance };
  if (random() < chance) return { outcome: "caught" as ThrowOutcome, chance };
  const flee = Math.min(0.3, 0.05 + input.attempt * 0.025);
  return { outcome: (random() < flee ? "fled" : "breakout") as ThrowOutcome, chance };
}
export function randomRoll() {
  return crypto.getRandomValues(new Uint32Array(1))[0]! / 4294967296;
}
