"use client";
import { useMemo, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Check, BookOpen, Search, X } from "lucide-react";
import { POKEMON } from "@/lib/catalog";
import { matchesCollectionSearch } from "@/lib/exploration";
import { pokemonName, pokemonNumber } from "@/lib/pokemon";
import { PokemonImage } from "@/components/ui/pokemon-image";
import type { JournalEntry, CollectionRecord } from "@/lib/journal";
export function FieldCollection({
  entries,
  collection,
  team,
  onInspect,
}: {
  entries: JournalEntry[];
  collection: CollectionRecord[];
  team: number[];
  onInspect: (id: number) => void;
}) {
  const [generation, setGeneration] = useState(0),
    [mode, setMode] = useState<"known" | "owned" | "all">("known"),
    [search, setSearch] = useState("");
  const searchRef = useRef<HTMLInputElement>(null);
  const seen = useMemo(() => new Map(entries.map((entry) => [entry.pokemonId, entry])), [entries]);
  const owned = useMemo(
    () => new Map(collection.map((entry, index) => [entry.pokemonId, { ...entry, index }])),
    [collection],
  );
  const registered = new Set([...seen.keys(), ...owned.keys()]);
  const generationCatalog = POKEMON.filter(
    (entry) => !generation || entry.generation === generation,
  );
  const catalog = generationCatalog
    .filter(
      (entry) =>
        (mode === "all" || (mode === "owned" ? owned.has(entry.id) : registered.has(entry.id))) &&
        matchesCollectionSearch(entry, search, registered.has(entry.id)),
    )
    .sort((a, b) =>
      mode === "all"
        ? a.id - b.id
        : (owned.get(a.id)?.index ?? 1000) - (owned.get(b.id)?.index ?? 1000) || a.id - b.id,
    );
  const reduced = useReducedMotion();
  return (
    <section className="field-collection" aria-label="Pokédex y colección">
      <div className="collection-heading">
        <h3>Tu Pokédex</h3>
        <span>
          {registered.size}
          <small> / {POKEMON.length}</small>
        </span>
      </div>
      <p>
        {owned.size} en tu colección · {team.length} en tu equipo
      </p>
      <div className="collection-mode" aria-label="Filtrar colección">
        {(
          [
            { id: "known", label: "Registrados" },
            { id: "owned", label: "Colección" },
            { id: "all", label: "Todos" },
          ] as const
        ).map((option) => (
          <button
            key={option.id}
            aria-pressed={mode === option.id}
            onClick={() => setMode(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>
      <div className="collection-generations" aria-label="Generación de la colección">
        {[0, 1, 2, 3].map((value) => (
          <button
            key={value}
            aria-pressed={generation === value}
            onClick={() => setGeneration(value)}
          >
            {["Todas", "Kanto", "Johto", "Hoenn"][value]}
          </button>
        ))}
      </div>
      <div className="search-field collection-search">
        <Search size={16} aria-hidden="true" />
        <label className="sr-only" htmlFor="collection-search">
          Buscar en la Pokédex por nombre o número
        </label>
        <input
          id="collection-search"
          ref={searchRef}
          value={search}
          placeholder="Buscar nombre o número…"
          maxLength={80}
          autoComplete="off"
          onChange={(event) => setSearch(event.target.value)}
        />
        {search && (
          <button
            className="clear-search"
            aria-label="Limpiar búsqueda de la Pokédex"
            onClick={() => {
              setSearch("");
              searchRef.current?.focus();
            }}
          >
            <X size={14} aria-hidden="true" />
          </button>
        )}
      </div>
      {search.trim() && (
        <p className="collection-search-count" role="status">
          {catalog.length} {catalog.length === 1 ? "resultado" : "resultados"}
        </p>
      )}
      <div className="collection-progress">
        <span>
          {generationCatalog.filter((entry) => registered.has(entry.id)).length} de{" "}
          {generationCatalog.length} registrados
        </span>
        <i>
          <span
            style={{
              width: `${(generationCatalog.filter((entry) => registered.has(entry.id)).length / generationCatalog.length) * 100}%`,
            }}
          />
        </i>
      </div>
      {catalog.length ? (
        <div className="collection-grid">
          {catalog.map((pokemon) => {
            const caught = owned.get(pokemon.id),
              known = registered.has(pokemon.id);
            return (
              <motion.button
                key={pokemon.id}
                data-sighting-id={pokemon.id}
                className={`${known ? "is-known" : ""} ${caught ? "is-collected" : ""} ${team.includes(pokemon.id) ? "is-in-team" : ""}`}
                disabled={!known}
                aria-label={
                  known
                    ? `Ver ${pokemonName(pokemon.name)}${caught ? ", en colección" : ""}`
                    : `Sin registrar, ${pokemonNumber(pokemon.id)}`
                }
                title={known ? pokemonName(pokemon.name) : pokemonNumber(pokemon.id)}
                whileHover={known && !reduced ? { y: -3 } : undefined}
                onClick={() => onInspect(pokemon.id)}
              >
                {known ? (
                  <PokemonImage
                    id={pokemon.id}
                    name=""
                    size={49}
                    decorative
                    className="pixel-art"
                  />
                ) : (
                  <i className="collection-unknown-symbol" />
                )}
                {caught && (
                  <Check className="collection-caught-badge" size={11} aria-hidden="true" />
                )}
                <span className="mono">{String(pokemon.id).padStart(3, "0")}</span>
                {known && (
                  <strong className="collection-species">{pokemonName(pokemon.name)}</strong>
                )}
              </motion.button>
            );
          })}
        </div>
      ) : (
        <div className="collection-empty">
          <BookOpen size={22} />
          <strong>{search.trim() ? "Sin resultados" : "Hay páginas por completar"}</strong>
          <p>
            {search.trim()
              ? mode === "all"
                ? "Los nombres se buscan entre las especies registradas. También podés buscar un número."
                : "Probá otro nombre o número, o cambiá los filtros de la Pokédex."
              : "Explorá y capturá especies de esta generación para encontrarlas acá."}
          </p>
        </div>
      )}
    </section>
  );
}
