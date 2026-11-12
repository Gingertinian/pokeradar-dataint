"use client";

import { useEffect, useRef } from "react";
import { ArrowLeftRight, RefreshCw, X } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { usePokemon } from "@/hooks/use-pokemon";
import { findPokemon, POKEMON } from "@/lib/catalog";
import { pokemonName, STAT_LABELS, STAT_NAMES, TYPE_INFO } from "@/lib/pokemon";
import { PokemonImage } from "@/components/ui/pokemon-image";
import { TypeBadge } from "@/components/ui/type-badge";

export function CompareDialog({
  ids,
  onChange,
  onClose,
}: {
  ids: [number, number];
  onChange: (index: number, id: number) => void;
  onClose: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const left = usePokemon(ids[0]),
    right = usePokemon(ids[1]);
  const reduced = useReducedMotion();
  useEffect(() => {
    const target = dialog.current;
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    target?.showModal();
    return () => target?.close();
  }, []);
  function closeComparison() {
    dialog.current?.close();
    if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true });
    onClose();
  }
  const requests = [left, right];
  return (
    <dialog
      ref={dialog}
      className="compare-dialog"
      aria-labelledby="compare-title"
      onCancel={(event) => {
        event.preventDefault();
        closeComparison();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) closeComparison();
      }}
    >
      <div className="compare-inner">
        <header>
          <span>
            <ArrowLeftRight size={19} />
            <h2 id="compare-title">Comparar especies</h2>
          </span>
          <button className="icon-button" onClick={closeComparison} aria-label="Cerrar comparación">
            <X size={20} />
          </button>
        </header>
        <div className="comparison-species">
          {ids.map((id, index) => {
            const p = findPokemon(id)!;
            return (
              <div key={index}>
                <label htmlFor={`compare-${index}`}>
                  {index === 0 ? "Primera especie" : "Segunda especie"}
                </label>
                <select
                  id={`compare-${index}`}
                  value={id}
                  onChange={(event) => onChange(index, Number(event.target.value))}
                >
                  {POKEMON.map((entry) => (
                    <option key={entry.id} value={entry.id} disabled={ids[1 - index] === entry.id}>
                      {pokemonName(entry.name)}
                    </option>
                  ))}
                </select>
                <PokemonImage
                  id={id}
                  name={pokemonName(p.name)}
                  size={130}
                  src={requests[index]?.data?.artwork}
                />
                <div className="type-badges">
                  {p.types.map((type) => (
                    <TypeBadge type={type} key={type} />
                  ))}
                </div>
                <small>
                  Generación {p.generation} · {p.baseStatTotal} puntos base
                </small>
              </div>
            );
          })}
        </div>
        {(left.isPending || right.isPending) && (
          <div className="compare-loading" role="status">
            Cargando estadísticas de PokéAPI…
          </div>
        )}
        {(left.isError || right.isError) && (
          <div className="compare-loading" role="alert">
            <p>No pudimos cargar ambas fichas.</p>
            <button
              className="secondary-button"
              onClick={() => {
                void left.refetch();
                void right.refetch();
              }}
            >
              <RefreshCw size={14} />
              Reintentar
            </button>
          </div>
        )}
        {left.data && right.data && (
          <div className="compare-stats" role="list" aria-label="Comparación de estadísticas base">
            {STAT_NAMES.map((name) => {
              const a = left.data.stats.find((stat) => stat.name === name)!.value,
                b = right.data.stats.find((stat) => stat.name === name)!.value;
              return (
                <div
                  className="comparison-stat"
                  role="listitem"
                  key={name}
                  aria-label={`${STAT_LABELS[name]}: ${pokemonName(findPokemon(ids[0])!.name)} ${a}; ${pokemonName(findPokemon(ids[1])!.name)} ${b}`}
                >
                  <span aria-hidden="true" className={a > b ? "is-higher" : ""}>
                    {a}
                  </span>
                  <div aria-hidden="true">
                    <strong>{STAT_LABELS[name]}</strong>
                    <div className="comparison-bars">
                      {[a, b].map((value, index) => (
                        <span key={index}>
                          <motion.i
                            initial={{ width: 0 }}
                            animate={{ width: `${(value / 255) * 100}%` }}
                            transition={{ duration: reduced ? 0 : 0.4 }}
                            style={{
                              background: `color-mix(in srgb, ${TYPE_INFO[findPokemon(ids[index]!)!.types[0]!].color} 55%, #e8f7f1)`,
                            }}
                          />
                        </span>
                      ))}
                    </div>
                  </div>
                  <span aria-hidden="true" className={b > a ? "is-higher" : ""}>
                    {b}
                  </span>
                </div>
              );
            })}
          </div>
        )}
        <p className="compare-note">
          Estadísticas base de la especie. No representan el nivel de un individuo.
        </p>
      </div>
    </dialog>
  );
}
