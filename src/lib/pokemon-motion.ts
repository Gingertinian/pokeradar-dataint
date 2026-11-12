import type { TargetAndTransition, Transition } from "framer-motion";

export function pokemonMotion(p: {
  phase: string;
  outcome: string | null;
  behavior: string;
  flying: boolean;
  calm: boolean;
  reduced: boolean;
  evaded: boolean;
  frozenX: number;
  frozenY: number;
}) {
  const base = { opacity: 1, scaleX: 1, scaleY: 1, rotate: 0 };
  let animate: TargetAndTransition = { ...base, x: 0, y: 0 };
  let transition: Transition = { duration: 0.32, ease: "easeOut" };
  if (p.phase === "impact") {
    animate = {
      x: p.frozenX,
      y: p.frozenY + 8,
      scaleX: [1, 0.88, 0.1],
      scaleY: [1, 0.78, 0.1],
      opacity: [1, 1, 0],
      rotate: 0,
    };
    transition = { duration: p.reduced ? 0 : 0.18, times: [0, 0.3, 1] };
  } else if (p.phase === "settle" || p.phase === "shake")
    animate = { ...base, x: p.frozenX, y: p.frozenY, opacity: 0, scaleX: 0.1, scaleY: 0.1 };
  else if (p.phase === "flight") {
    animate = {
      ...base,
      x: p.frozenX + (p.evaded ? 85 : 0),
      y: p.frozenY - (p.evaded ? 30 : 0),
      rotate: p.evaded ? 8 : 0,
    };
    transition = { duration: p.evaded ? 0.22 : 0 };
  } else if (p.phase === "result" && p.outcome === "fled") {
    animate = {
      ...base,
      x: 220,
      y: p.flying ? -130 : -30,
      opacity: 0,
      scaleX: 0.75,
      scaleY: 0.75,
      rotate: 12,
    };
    transition = { duration: p.reduced ? 0 : 0.5, ease: "easeIn" };
  } else if (p.phase === "result" && (p.outcome === "caught" || p.outcome === "breakout")) {
    animate = {
      ...base,
      x: 0,
      y: p.reduced ? 0 : [-15, 4, 0],
      scaleX: p.reduced ? 1 : [0.65, 1.04, 1],
      scaleY: p.reduced ? 1 : [0.65, 0.96, 1],
    };
    transition = { duration: p.reduced ? 0 : 0.5 };
  } else if (!p.reduced) {
    if (p.behavior === "dodge") {
      animate = {
        ...base,
        x: [0, 75, 62, 0],
        y: p.flying ? [0, -42, -34, 0] : [0, -25, -12, 0],
        rotate: [0, 9, 5, 0],
        scaleY: [1, 0.95, 1, 1],
      };
      transition = { duration: 0.85, times: [0, 0.38, 0.6, 1], ease: "easeInOut" };
    } else if (p.behavior === "alert") {
      animate = { ...base, x: 0, y: 4, scaleX: 1.04, scaleY: 0.94, rotate: -2 };
    } else {
      animate = {
        ...base,
        x: p.flying ? [-5, 5, -5] : [0, 2, 0, -1, 0],
        y: p.flying ? [-4, -13, -4] : [0, 1, 0],
        scaleX: p.flying ? 1 : [1, 1.012, 1],
        scaleY: p.flying ? 1 : [1, 0.985, 1],
        rotate: p.flying ? [-1.5, 1.5, -1.5] : [0, 0.5, 0],
      };
      transition = {
        duration: p.calm ? 5.2 : p.flying ? 3.8 : 4.4,
        repeat: Infinity,
        ease: "easeInOut",
      };
    }
  }
  return { animate, transition };
}
