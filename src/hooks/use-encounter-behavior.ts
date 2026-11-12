"use client";

import { useEffect, useState } from "react";

export type EncounterBehavior = "idle" | "alert" | "dodge" | "opening";

export function useEncounterBehavior(rate: number, paused: boolean, calm: boolean) {
  const [behavior, setBehavior] = useState<EncounterBehavior>("idle");
  useEffect(() => {
    if (paused || calm) return;
    let timer: number;
    const next: Record<EncounterBehavior, EncounterBehavior> = {
      idle: "alert",
      alert: "dodge",
      dodge: "opening",
      opening: "idle",
    };
    const delays: Record<EncounterBehavior, number> = {
      idle: 4200 + Math.min(255, rate) * 10,
      alert: 1100,
      dodge: 850,
      opening: 2400,
    };
    const enter = (phase: EncounterBehavior) => {
      setBehavior(phase);
      timer = window.setTimeout(() => enter(next[phase]), delays[phase]);
    };
    timer = window.setTimeout(() => enter("idle"), 0);
    return () => window.clearTimeout(timer);
  }, [rate, paused, calm]);
  return paused || calm ? "idle" : behavior;
}
