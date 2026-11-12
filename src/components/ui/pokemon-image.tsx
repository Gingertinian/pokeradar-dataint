"use client";

import Image from "next/image";
import { useState } from "react";
import { CircleHelp } from "lucide-react";
import { spriteUrl } from "@/lib/pokemon";

type PokemonImageProps = {
  id: number;
  name: string;
  size?: number;
  src?: string;
  className?: string;
  decorative?: boolean;
};

export function PokemonImage({
  id,
  name,
  size = 48,
  src,
  className = "",
  decorative = false,
}: PokemonImageProps) {
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const original = src ?? spriteUrl(id);
  const source = failedSource === original ? spriteUrl(id) : original;
  const [brokenFallback, setBrokenFallback] = useState<string | null>(null);

  if (brokenFallback === source) {
    return (
      <span
        className={`image-unavailable ${className}`}
        style={{ width: size, height: size }}
        role={decorative ? undefined : "img"}
        aria-label={decorative ? undefined : `Imagen de ${name} no disponible`}
      >
        <CircleHelp size={Math.min(size / 2, 36)} aria-hidden="true" />
      </span>
    );
  }

  return (
    <Image
      src={source}
      alt={decorative ? "" : name}
      width={size}
      height={size}
      className={className}
      unoptimized
      draggable={false}
      onError={() => {
        if (source === spriteUrl(id)) setBrokenFallback(source);
        else setFailedSource(source);
      }}
    />
  );
}
