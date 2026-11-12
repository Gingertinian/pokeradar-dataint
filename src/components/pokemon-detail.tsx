"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUpRight,
  ArrowLeftRight,
  Bookmark,
  Minus,
  RefreshCw,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";
import { usePokemon } from "@/hooks/use-pokemon";
import { useMobile } from "@/hooks/use-mobile";
import { findPokemon } from "@/lib/catalog";
import { TEAM_LIMIT } from "@/lib/exploration";
import {
  formatMeasure,
  pokemonName,
  pokemonNumber,
  STAT_LABELS,
  TYPE_INFO,
  type PokemonDetail,
} from "@/lib/pokemon";
import { getRegion, type RegionId } from "@/lib/regions";
import { PokemonImage } from "@/components/ui/pokemon-image";
import { TypeBadge } from "@/components/ui/type-badge";

type DetailProps = {
  id: number | null;
  regionId: RegionId | null;
  team: number[];
  collected?: boolean;
  onClose: () => void;
  onToggleTeam: (id: number) => void;
  onCompare?: (id: number) => void;
  onCatch?: (id: number) => void;
  encounterReason?: string;
  destinationName?: string;
};

function DetailSkeleton({ name }: { name: string }) {
  return (
    <div className="detail-skeleton" role="status" aria-label={`Cargando la ficha de ${name}`}>
      <div className="skeleton skeleton-art" />
      <div className="skeleton skeleton-line" />
      <div className="skeleton skeleton-line short" />
      <div className="skeleton-measures">
        <div className="skeleton" />
        <div className="skeleton" />
      </div>
      {Array.from({ length: 6 }, (_, index) => (
        <div className="skeleton skeleton-stat" key={index} />
      ))}
      <span className="sr-only">Consultando PokéAPI</span>
    </div>
  );
}

function Stats({ pokemon }: { pokemon: PokemonDetail }) {
  const reducedMotion = useReducedMotion();
  const color = TYPE_INFO[pokemon.types[0] ?? "normal"].color;
  const total = pokemon.stats.reduce((sum, stat) => sum + stat.value, 0);
  return (
    <section className="stats-section" aria-label="Estadísticas base">
      <div className="section-caption">
        <h3>Estadísticas base</h3>
        <span className="mono">
          {total} <span className="muted">TOTAL</span>
        </span>
      </div>
      <div className="stat-list">
        {pokemon.stats.map((stat, index) => (
          <div className="stat-row" key={stat.name}>
            <span>{STAT_LABELS[stat.name]}</span>
            <span className="stat-track" aria-hidden="true">
              <motion.span
                initial={{ width: 0 }}
                animate={{ width: `${(stat.value / 255) * 100}%` }}
                transition={{
                  duration: reducedMotion ? 0 : 0.5,
                  delay: reducedMotion ? 0 : index * 0.035,
                  ease: "easeOut",
                }}
                style={{ backgroundColor: color }}
              />
            </span>
            <span className="mono stat-value">{stat.value}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

export function PokemonDetailPanel({
  id,
  regionId,
  team,
  collected = false,
  onClose,
  onToggleTeam,
  onCompare,
  onCatch,
  encounterReason,
  destinationName,
}: DetailProps) {
  const { data, isPending, isError, isFetching, refetch } = usePokemon(id);
  const summary = id !== null ? findPokemon(id) : undefined;
  const mobile = useMobile();
  const reducedMotion = useReducedMotion();
  const closeButton = useRef<HTMLButtonElement>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playingId, setPlayingId] = useState<number | null>(null);
  const [animatedId, setAnimatedId] = useState<number | null>(null);
  const [statsView, setStatsView] = useState(false);
  const [audioErrorId, setAudioErrorId] = useState<number | null>(null);
  const saved = id !== null && team.includes(id);
  const full = team.length >= TEAM_LIMIT && !saved;
  const name = summary ? pokemonName(summary.name) : "Pokémon";
  const region = regionId ? getRegion(regionId) : null;

  useEffect(() => {
    if (id === null) return;
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const button = closeButton.current;
    button?.focus({ preventScroll: true });
    const onKey = (event: KeyboardEvent) => {
      const fromPanel =
        event.target instanceof Node && button?.closest(".pokemon-detail")?.contains(event.target);
      if (event.key === "Escape" && !event.defaultPrevented && fromPanel) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (previous?.isConnected && document.activeElement === button) previous.focus();
    };
  }, [id, onClose]);

  useEffect(() => {
    return () => {
      audio.current?.pause();
      audio.current = null;
    };
  }, [id]);

  async function playCry() {
    if (!data?.cry) return;
    setAudioErrorId(null);
    audio.current?.pause();
    if (playingId === data.id) {
      setPlayingId(null);
      return;
    }
    const player = new Audio(data.cry);
    audio.current = player;
    player.onended = () => setPlayingId(null);
    try {
      await player.play();
      setPlayingId(data.id);
    } catch {
      setAudioErrorId(data.id);
      setPlayingId(null);
    }
  }

  return (
    <AnimatePresence>
      {id !== null && summary && (
        <motion.aside
          className="pokemon-detail"
          data-view={statsView ? "stats" : "profile"}
          aria-label={`Ficha de ${name}`}
          initial={
            reducedMotion ? { opacity: 0 } : mobile ? { y: 32, opacity: 0 } : { x: 24, opacity: 0 }
          }
          animate={{ x: 0, y: 0, opacity: 1 }}
          exit={
            reducedMotion ? { opacity: 0 } : mobile ? { y: 32, opacity: 0 } : { x: 24, opacity: 0 }
          }
          transition={{
            duration: reducedMotion ? 0 : 0.22,
            ease: [0.22, 1, 0.36, 1],
          }}
        >
          <div className="detail-topline">
            <div className="detail-view-toggle" role="group" aria-label="Vista de la ficha">
              <button
                aria-pressed={!statsView}
                aria-controls="pokemon-detail-body"
                onClick={() => setStatsView(false)}
              >
                Ficha
              </button>
              <button
                aria-pressed={statsView}
                aria-controls="pokemon-detail-body"
                onClick={() => setStatsView(true)}
              >
                Estadísticas
              </button>
            </div>
            <span className="mono detail-dex-number">{pokemonNumber(id)}</span>
            <button
              ref={closeButton}
              className="icon-button"
              aria-label="Cerrar ficha"
              onClick={onClose}
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
          <div className="detail-scroll" id="pokemon-detail-body">
            <div className="detail-title">
              <h2>{name}</h2>
              <div className="type-badges">
                {summary.types.map((type) => (
                  <TypeBadge key={type} type={type} />
                ))}
              </div>
            </div>
            {isPending && <DetailSkeleton name={name} />}
            {isError && (
              <div className="detail-error" role="alert">
                <div className="error-symbol">
                  <RefreshCw size={24} aria-hidden="true" />
                </div>
                <h3>No pudimos cargar la ficha</h3>
                <p>
                  La conexión con PokéAPI está tardando. Podés volver a intentarlo y seguir
                  explorando el mapa.
                </p>
                <button
                  className="secondary-button"
                  disabled={isFetching}
                  onClick={() => void refetch()}
                >
                  <RefreshCw
                    size={15}
                    className={isFetching ? "spin" : undefined}
                    aria-hidden="true"
                  />
                  {isFetching ? "Reintentando…" : "Volver a intentar"}
                </button>
              </div>
            )}
            {data && (
              <motion.div
                className="detail-data"
                key={`${data.id}:${statsView ? "stats" : "profile"}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: reducedMotion ? 0 : 0.15 }}
              >
                <div
                  className="pokemon-art-stage"
                  style={
                    {
                      "--art-accent": TYPE_INFO[data.types[0] ?? "normal"].color,
                    } as React.CSSProperties
                  }
                >
                  <PokemonImage
                    key={`${data.id}:${animatedId === data.id}`}
                    id={data.id}
                    name={name}
                    size={240}
                    src={
                      animatedId === data.id && data.animatedSprite
                        ? data.animatedSprite
                        : data.artwork
                    }
                    className={
                      animatedId === data.id ? "detail-art pixel-art is-animated" : "detail-art"
                    }
                  />
                  {data.legendary && (
                    <span className="legendary-label">
                      <Sparkles size={13} aria-hidden="true" />
                      Legendario
                    </span>
                  )}
                  <div className="art-actions">
                    {data.animatedSprite && (
                      <button
                        className={`art-action ${animatedId === data.id ? "is-active" : ""}`}
                        aria-pressed={animatedId === data.id}
                        onClick={() => setAnimatedId(animatedId === data.id ? null : data.id)}
                      >
                        {animatedId === data.id ? "Ver ilustración" : "Ver animación"}
                      </button>
                    )}
                    {data.cry && (
                      <button
                        className="icon-button art-sound"
                        onClick={() => void playCry()}
                        aria-label={
                          playingId === data.id ? `Detener sonido de ${name}` : `Escuchar a ${name}`
                        }
                        aria-pressed={playingId === data.id}
                      >
                        {playingId === data.id ? (
                          <VolumeX size={17} aria-hidden="true" />
                        ) : (
                          <Volume2 size={17} aria-hidden="true" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
                {audioErrorId === data.id && (
                  <p className="inline-error" role="status">
                    No se pudo reproducir el sonido.
                  </p>
                )}
                {data.genus && <p className="pokemon-genus">{data.genus}</p>}
                {data.description && <p className="pokemon-description">{data.description}</p>}
                <dl className="pokemon-measures">
                  <div>
                    <dt>Altura</dt>
                    <dd>{formatMeasure(data.height, "m")}</dd>
                  </div>
                  <div>
                    <dt>Peso</dt>
                    <dd>{formatMeasure(data.weight, "kg")}</dd>
                  </div>
                </dl>
                <Stats pokemon={data} />
                {region && (
                  <div className="detail-location">
                    <span
                      className="location-dot"
                      style={{ background: region.color }}
                      aria-hidden="true"
                    />
                    <span>
                      {destinationName ?? region.biome}
                      <small>{encounterReason ?? region.name}</small>
                    </span>
                    <ArrowUpRight size={17} aria-hidden="true" />
                  </div>
                )}
              </motion.div>
            )}
          </div>
          <div className="detail-bottom">
            {onCompare && (
              <button className="detail-compare-button" onClick={() => onCompare(id)}>
                <ArrowLeftRight size={14} /> Comparar estadísticas
              </button>
            )}
            <button
              className={`save-button ${saved ? "is-saved" : ""}`}
              disabled={(collected && full) || (!saved && !collected && !onCatch)}
              onClick={() => (saved || collected ? onToggleTeam(id) : onCatch?.(id))}
            >
              {saved ? (
                <Minus size={17} aria-hidden="true" />
              ) : (
                <Bookmark size={17} aria-hidden="true" />
              )}
              {saved
                ? "Quitar del equipo"
                : collected
                  ? "Sumar al equipo"
                  : onCatch
                    ? "Iniciar encuentro"
                    : "Sin encuentro activo"}
            </button>
            {full && (
              <p>
                {collected
                  ? "Liberá un lugar en tu equipo para sumar esta especie."
                  : "Equipo completo: las nuevas capturas van a tu colección."}
              </p>
            )}
            <span className="detail-source">Características de PokéAPI</span>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
