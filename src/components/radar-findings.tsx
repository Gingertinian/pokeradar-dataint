"use client";
import { useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Footprints, ChevronRight, MapPin, Zap, X } from "lucide-react";
import type { ExpeditionSighting } from "@/lib/destinations";
import { distanceInMeters, type Coordinate } from "@/lib/geography";
import { pokemonName, TYPE_INFO } from "@/lib/pokemon";
import { PokemonImage } from "@/components/ui/pokemon-image";
export function RadarFindings({
  entries,
  origin,
  known,
  onChoose,
  onPreview,
  onClose,
}: {
  entries: ExpeditionSighting[];
  origin: Coordinate;
  known: ReadonlySet<string>;
  onChoose: (entry: ExpeditionSighting) => void;
  onPreview: (id: number | null) => void;
  onClose: () => void;
}) {
  const reduced = useReducedMotion();
  useEffect(() => () => onPreview(null), [onPreview]);
  return (
    <motion.section
      className="radar-findings"
      aria-label="Encuentros del radar"
      initial={reduced ? false : { opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: reduced ? 0 : 0.2 }}
    >
      <header>
        <div className="radar-heading">
          <span>
            RADAR DE CAMPO <i aria-hidden="true" /> {entries.length} RASTROS
          </span>
          <h3>Elegí una señal para explorar</h3>
        </div>
        <button aria-label="Cerrar resultados del radar" onClick={onClose}>
          <X size={14} />
        </button>
      </header>
      <div>
        {entries.map((entry, index) => {
          const identified = !entry.mystery || known.has(entry.key),
            distance = distanceInMeters(origin, entry.coordinates),
            distanceShort =
              distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`,
            distanceSpoken =
              distance < 1000
                ? `${Math.round(distance)} ${Math.round(distance) === 1 ? "metro" : "metros"}`
                : `${(distance / 1000).toFixed(1)} kilómetros`,
            type = entry.pokemon.types[0] ?? "normal";
          return (
            <motion.button
              key={entry.key}
              className={identified ? "" : "is-unknown"}
              initial={reduced ? false : { opacity: 0, y: 7 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: reduced ? 0 : index * 0.05 }}
              style={{ "--signal-color": TYPE_INFO[type].color } as React.CSSProperties}
              onClick={() => onChoose(entry)}
              onPointerEnter={() => onPreview(entry.pokemon.id)}
              onPointerLeave={(event) => {
                if (document.activeElement !== event.currentTarget) onPreview(null);
              }}
              onFocus={() => onPreview(entry.pokemon.id)}
              onBlur={(event) => {
                if (!event.currentTarget.matches(":hover")) onPreview(null);
              }}
              aria-label={
                identified
                  ? `Rastro ${index + 1}: encontrar a ${pokemonName(entry.pokemon.name)}, a ${distanceSpoken}`
                  : `Rastro ${index + 1}: investigar señal sin identificar, tipo ${TYPE_INFO[type].label}, a ${distanceSpoken}`
              }
            >
              <span className="radar-card-top">
                <span>{String(index + 1).padStart(2, "0")}</span>
                {entry.boosted && (
                  <span>
                    <Zap size={11} /> Clima
                  </span>
                )}
              </span>
              <span className="radar-find-art">
                <PokemonImage
                  id={entry.pokemon.id}
                  name=""
                  decorative
                  size={58}
                  className="pixel-art"
                />
                {!identified && <Footprints size={17} />}
              </span>
              <span className="radar-card-copy">
                <strong>
                  {identified ? pokemonName(entry.pokemon.name) : "Desconocido"}
                </strong>
                <span className="radar-card-type">
                  {entry.pokemon.types.map((value) => TYPE_INFO[value].label).join(" · ")}
                </span>
                <small>
                  <MapPin size={11} /> {distanceShort} <ChevronRight size={12} />
                </small>
              </span>
            </motion.button>
          );
        })}
      </div>
      <p>
        <span className="radar-pointer-hint">
          Pasá el cursor o usá Tab para ubicar cada rastro.
        </span>
        <span className="radar-touch-hint">Los números ubican los rastros en el mapa.</span>
      </p>
    </motion.section>
  );
}
