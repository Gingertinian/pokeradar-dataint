"use client";
import { useEffect, useRef } from "react";
import { useReducedMotion, type MotionValue } from "framer-motion";
import type { BallKind } from "@/lib/capture-game";

export function ThrowBall({
  kind,
  active,
  rotation,
}: {
  kind: BallKind;
  active: boolean;
  rotation: MotionValue<number>;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const reduced = useReducedMotion();
  useEffect(() => {
    const canvas = ref.current,
      ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    const size = 112,
      radius = 53,
      pixels = ctx.createImageData(size, size);
    let frame = 0,
      start: number | null = null;
    const upper =
      kind === "great" ? [35, 111, 209] : kind === "ultra" ? [37, 44, 55] : [232, 51, 66];
    const draw = (now: number) => {
      start ??= now;
      const t = reduced ? 0 : (now - start) / 1000;
      const angle = (rotation.get() * Math.PI) / 180 + (active ? t * 4.2 : 0);
      const tilt = 0.15 + (active && !reduced ? t * 2.2 : 0);
      const ca = Math.cos(angle),
        sa = Math.sin(angle),
        ct = Math.cos(tilt),
        st = Math.sin(tilt);
      for (let y = 0; y < size; y++)
        for (let x = 0; x < size; x++) {
          const nx = (x - size / 2) / radius,
            ny = (y - size / 2) / radius,
            r2 = nx * nx + ny * ny,
            index = (y * size + x) * 4;
          if (r2 > 1) {
            pixels.data[index + 3] = 0;
            continue;
          }
          const nz = Math.sqrt(1 - r2),
            rx = nx * ca - nz * sa,
            rz = nx * sa + nz * ca,
            ry = ny * ct - rz * st,
            z = ny * st + rz * ct;
          let color = ry < -0.065 ? upper : ry > 0.065 ? [232, 239, 243] : [25, 35, 45];
          if (ry < -0.065 && kind === "great" && Math.abs(rx) > 0.38 && Math.abs(rx) < 0.64)
            color = [230, 57, 72];
          if (ry < -0.08 && kind === "ultra" && Math.abs(rx) > 0.32 && Math.abs(rx) < 0.5)
            color = [238, 193, 59];
          const button = Math.hypot(rx, ry);
          if (z > 0.88 && button < 0.25)
            color =
              button > 0.18 ? [24, 35, 46] : button > 0.11 ? [247, 250, 251] : [195, 215, 222];
          const light = 0.38 + 0.57 * Math.max(0, -nx * 0.4 - ny * 0.5 + nz * 0.76);
          const shine = Math.pow(Math.max(0, -nx * 0.23 - ny * 0.3 + nz * 0.925), 45) * 0.75;
          for (let c = 0; c < 3; c++)
            pixels.data[index + c] = Math.min(255, color[c]! * light + 255 * shine);
          pixels.data[index + 3] = Math.min(255, (1 - Math.sqrt(r2)) * radius * 255);
        }
      ctx.putImageData(pixels, 0, 0);
      if (active && !reduced) frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [kind, active, rotation, reduced]);
  return (
    <canvas ref={ref} width={112} height={112} className="throw-ball-model" aria-hidden="true" />
  );
}
