"use client";
import Image from "next/image";
import { motion, useReducedMotion, type MotionValue } from "framer-motion";
import type { Habitat } from "@/lib/destinations";
export function HabitatScene({
  habitat,
  panX,
  panY,
}: {
  habitat: Habitat;
  panX?: MotionValue<number>;
  panY?: MotionValue<number>;
}) {
  const reduced = useReducedMotion();
  const water = habitat === "coast" || habitat === "riverside" || habitat === "glacier";
  const foliage =
    habitat === "forest" ||
    habitat === "grassland" ||
    habitat === "urban" ||
    habitat === "riverside";
  return (
    <div className={`painted-habitat painted-${habitat}`} aria-hidden="true">
      <motion.div className="habitat-art-depth" style={reduced ? undefined : { x: panX, y: panY }}>
        <Image
          src={`/scenes/${habitat}-v8.png`}
          alt=""
          fill
          sizes="(max-aspect-ratio: 3/2) 150vh, 100vw"
          priority
          quality={85}
          className="habitat-art"
        />
      </motion.div>
      <div className="habitat-light" />
      {water && (
        <div className="habitat-reflections">
          <i />
          <i />
          <i />
        </div>
      )}
      <div className="habitat-motes">
        {Array.from({ length: foliage ? 14 : 8 }, (_, i) => (
          <i
            key={i}
            style={{
              left: `${(i * 29 + 7) % 96}%`,
              top: `${(i * 17 + 24) % 82}%`,
              animationDelay: `${-i * 1.7}s`,
              animationDuration: `${10 + (i % 6)}s`,
            }}
          />
        ))}
      </div>
      {foliage && (
        <div className="habitat-fronds">
          <svg viewBox="0 0 170 220">
            <g fill="currentColor">
              <path d="M29 220Q27 106 97 21 76 103 44 155 81 90 160 91 100 155 48 178 85 161 151 176 105 203 47 203l-4 17Z" />
              <path d="M27 174Q-6 116 3 64 45 116 27 174Z" />
            </g>
          </svg>
          <svg viewBox="0 0 170 220">
            <g fill="currentColor">
              <path d="M29 220Q27 106 97 21 76 103 44 155 81 90 160 91 100 155 48 178 85 161 151 176 105 203 47 203l-4 17Z" />
            </g>
          </svg>
        </div>
      )}
      <div className="habitat-ground-shade" />
    </div>
  );
}
