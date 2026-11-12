import { TYPE_INFO, type PokemonType } from "@/lib/pokemon";

export function TypeBadge({ type, compact = false }: { type: PokemonType; compact?: boolean }) {
  const info = TYPE_INFO[type];
  return (
    <span
      className={`type-badge ${compact ? "type-badge-compact" : ""}`}
      style={{ color: info.color, backgroundColor: info.soft }}
    >
      <span className="type-dot" style={{ backgroundColor: info.color }} aria-hidden="true" />
      {info.label}
    </span>
  );
}
