"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ArrowLeftRight,
  BookOpen,
  Check,
  ChevronRight,
  Footprints,
  MapPin,
  Search,
  SlidersHorizontal,
  Trash2,
  X,
  Zap,
} from "lucide-react";
import { useMobile } from "@/hooks/use-mobile";
import { MissionCard, WeatherCard } from "@/components/expedition-context";
import { PokemonImage } from "@/components/ui/pokemon-image";
import { FieldCollection } from "@/components/field-collection";
import { TypeBadge } from "@/components/ui/type-badge";
import { findPokemon } from "@/lib/catalog";
import { distanceInMeters, type Coordinate } from "@/lib/geography";
import {
  DESTINATIONS,
  DESTINATION_GUIDES,
  getDestination,
  HABITATS,
  REGION_GUIDES,
  regionDestinations,
  type Destination,
  type ExpeditionSighting,
} from "@/lib/destinations";
import {
  EMPTY_FILTERS,
  filterCount,
  matchesFilters,
  type ExpeditionFilters,
} from "@/lib/expedition";
import { REGIONS, type Region, type RegionId } from "@/lib/regions";
import {
  pokemonName,
  pokemonNumber,
  artworkUrl,
  POKEMON_TYPES,
  TYPE_INFO,
  type PokemonSummary,
} from "@/lib/pokemon";
import type { MapScope } from "@/components/map/expedition-map";
import type { JournalEntry } from "@/hooks/use-journal";
import type { CollectionRecord } from "@/lib/journal";
import type { JournalStorageStatus } from "@/lib/journal-storage";
import type { TeamStorageStatus } from "@/lib/team-storage";
import type { Weather } from "@/lib/weather";

export type PanelView = "destinations" | "signals" | "journal" | "team";
type Props = {
  region: Region;
  site: Destination;
  scope: MapScope;
  awayFromSite: boolean;
  view: PanelView;
  mobileOpen: boolean;
  filters: ExpeditionFilters;
  pokemon: PokemonSummary[];
  sightings: ExpeditionSighting[];
  visibleSightings: ExpeditionSighting[];
  selectedId: number | null;
  hoveredId: number | null;
  discovered: ReadonlySet<string>;
  distances: ReadonlyMap<number, number>;
  team: number[];
  entries: JournalEntry[];
  collection: CollectionRecord[];
  visits: string[];
  journalStorageStatus: JournalStorageStatus;
  teamStorageStatus: TeamStorageStatus;
  compareIds: number[];
  weather: Weather | undefined;
  weatherPending: boolean;
  onRetryWeather: () => void;
  onFilters: (filters: ExpeditionFilters) => void;
  onRegion: (id: RegionId) => void;
  onDestination: (id: string, pokemonId?: number) => void;
  onRevisit: (id: string, coordinates: Coordinate) => void;
  onSelect: (id: number) => void;
  onHover: (id: number | null) => void;
  onRemove: (id: number) => void;
  onLead: (id: number) => void;
  onCompare: (id: number) => void;
  onOpenCompare: () => void;
  onView: (view: PanelView) => void;
  onAtlas: () => void;
  onCloseMobile: () => void;
};

const distance = (value: number | undefined) =>
  value === undefined
    ? ""
    : value >= 1000
      ? `${(value / 1000).toFixed(1).replace(".", ",")} km`
      : `${Math.round(value)} m`;

export function ExpeditionPanel(p: Props) {
  const listRef = useRef<HTMLDivElement>(null);
  const filterToggleRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = 0;
  }, [p.filters]);
  const [advanced, setAdvanced] = useState(false);
  const [sort, setSort] = useState("distance");
  const [journalMode, setJournalMode] = useState<"collection" | "timeline" | "missions">(
    "collection",
  );
  const mobile = useMobile();
  const reduced = useReducedMotion();
  const filtered = filterCount(p.filters) > 0 || p.filters.search.length > 0;
  const sites = regionDestinations(p.region.id);
  const contextualSightings = p.visibleSightings.filter((entry) =>
    matchesFilters(entry.pokemon, { ...p.filters, types: [] }, p.discovered.has(entry.key)),
  );
  const quickTypes = POKEMON_TYPES.filter(
    (type) =>
      p.filters.types.includes(type) ||
      contextualSightings.some((entry) => entry.pokemon.types.includes(type)),
  )
    .sort(
      (a, b) =>
        Number(p.filters.types.includes(b)) - Number(p.filters.types.includes(a)) ||
        contextualSightings.filter((entry) => entry.pokemon.types.includes(b)).length -
          contextualSightings.filter((entry) => entry.pokemon.types.includes(a)).length,
    )
    .slice(0, 4);
  const showingAtlas = p.scope === "atlas" && p.view === "destinations";
  const signals = p.view === "signals" || p.view === "team";
  const list = p.pokemon
    .slice()
    .sort((a, b) =>
      sort === "power"
        ? (findPokemon(b.id)?.baseStatTotal ?? 0) - (findPokemon(a.id)?.baseStatTotal ?? 0)
        : sort === "number"
          ? a.id - b.id
          : p.view === "team"
            ? p.team.indexOf(a.id) - p.team.indexOf(b.id)
            : (p.distances.get(a.id) ?? Infinity) - (p.distances.get(b.id) ?? Infinity),
    );
  const title =
    p.view === "team"
      ? "Tu equipo"
      : p.view === "journal"
        ? "Cuaderno de campo"
        : showingAtlas
          ? "Tu próxima expedición"
          : p.view === "signals"
            ? p.awayFromSite
              ? "Zona explorada"
              : p.site.name
            : p.region.name;
  return (
    <aside
      className={`expedition-panel ${p.mobileOpen ? "is-open" : ""}`}
      aria-label="Explorador de expediciones"
      inert={mobile && !p.mobileOpen}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !advanced || event.defaultPrevented) return;
        const target = event.target;
        if (target instanceof Element && (target.closest("details") || target.tagName === "SELECT"))
          return;
        event.preventDefault();
        event.stopPropagation();
        setAdvanced(false);
        window.requestAnimationFrame(() => filterToggleRef.current?.focus({ preventScroll: true }));
      }}
    >
      <div className="panel-mobile-handle" aria-hidden="true" />
      <div className="panel-topline">
        <span className="section-kicker">
          {p.view === "journal"
            ? "TU RECORRIDO"
            : p.view === "team"
              ? "EQUIPO DE EXPEDICIÓN"
              : showingAtlas
                ? "ATLAS DE ARGENTINA"
                : p.view === "signals"
                  ? p.awayFromSite
                    ? "MAPA ACTUAL"
                    : p.site.locality.toUpperCase()
                  : "ELEGÍ TU DESTINO"}
        </span>
        <button
          className="icon-button mobile-panel-close"
          onClick={p.onCloseMobile}
          aria-label="Cerrar explorador"
        >
          <X size={19} />
        </button>
      </div>
      <div className="panel-title">
        <h2>{title}</h2>
        {showingAtlas ? (
          <p>Cambiá de paisaje. Seguí nuevas señales.</p>
        ) : p.view === "journal" ? (
          <p>Cada hallazgo deja una historia en el mapa.</p>
        ) : p.view === "team" ? (
          <p>
            {p.teamStorageStatus === "unreadable"
              ? `${p.team.length} integrantes en esta sesión`
              : `${p.team.length} de 6 lugares ocupados`}
          </p>
        ) : (
          <p>
            {p.view === "signals"
              ? p.awayFromSite
                ? `Destino de referencia: ${p.site.name}`
                : p.site.headline
              : p.region.description}
          </p>
        )}
      </div>
      {p.view === "team" && p.teamStorageStatus !== "ok" && (
        <p className="team-storage-warning journal-storage-warning" role="status">
          {p.teamStorageStatus === "unreadable"
            ? "No pudimos leer el equipo guardado. Los datos originales permanecen intactos."
            : "El navegador no permite guardar el equipo."}{" "}
          Los cambios de esta sesión no se conservarán al cerrar o recargar.
        </p>
      )}
      {p.view === "signals" && (
        <div className="panel-weather">
          <WeatherCard weather={p.weather} pending={p.weatherPending} onRetry={p.onRetryWeather} />
        </div>
      )}
      {p.scope !== "atlas" && p.view !== "team" && p.view !== "journal" && (
        <nav className="panel-tabs" aria-label="Contenido del explorador">
          <button aria-pressed={p.view === "destinations"} onClick={() => p.onView("destinations")}>
            Lugares <span>{sites.length}</span>
          </button>
          <button
            aria-pressed={p.view === "signals"}
            onClick={() => p.onView("signals")}
            disabled={p.scope !== "site"}
          >
            Señales <span>{p.scope === "site" ? p.sightings.length : "—"}</span>
          </button>
        </nav>
      )}
      {signals && (
        <div className="expedition-filters">
          <div className="search-field">
            <Search size={17} />
            <label htmlFor="pokemon-search" className="sr-only">
              Buscar Pokémon por nombre o número
            </label>
            <input
              id="pokemon-search"
              value={p.filters.search}
              placeholder="Nombre o número…"
              maxLength={80}
              autoComplete="off"
              onChange={(event) => p.onFilters({ ...p.filters, search: event.target.value })}
            />
            {p.filters.search && (
              <button
                className="clear-search"
                aria-label="Limpiar búsqueda"
                onClick={() => p.onFilters({ ...p.filters, search: "" })}
              >
                <X size={14} />
              </button>
            )}
            <button
              ref={filterToggleRef}
              className={`filter-toggle ${advanced ? "is-active" : ""}`}
              aria-expanded={advanced}
              aria-controls="advanced-filters"
              aria-label="Filtros avanzados"
              onClick={() => setAdvanced(!advanced)}
            >
              <SlidersHorizontal size={16} />
              {filterCount(p.filters) > 0 && <span>{filterCount(p.filters)}</span>}
            </button>
          </div>
          {p.view === "signals" && !advanced && quickTypes.length > 0 && (
            <div className="quick-types" role="group" aria-label="Filtrar señales por tipo">
              {quickTypes.map((type) => (
                <button
                  key={type}
                  aria-pressed={p.filters.types.includes(type)}
                  onClick={() =>
                    p.onFilters({
                      ...p.filters,
                      types: p.filters.types.includes(type)
                        ? p.filters.types.filter((value) => value !== type)
                        : [...p.filters.types, type],
                    })
                  }
                >
                  <span aria-hidden="true" style={{ background: TYPE_INFO[type].color }} />
                  {TYPE_INFO[type].label}
                </button>
              ))}
            </div>
          )}
          <AnimatePresence>
            {advanced && (
              <motion.div
                id="advanced-filters"
                className="advanced-filters"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: reduced ? 0 : 0.18 }}
              >
                <fieldset>
                  <legend>
                    Tipos <small>Cualquiera de los elegidos</small>
                  </legend>
                  <div className="type-filter-grid">
                    {POKEMON_TYPES.map((type) => (
                      <button
                        key={type}
                        aria-pressed={p.filters.types.includes(type)}
                        onClick={() =>
                          p.onFilters({
                            ...p.filters,
                            types: p.filters.types.includes(type)
                              ? p.filters.types.filter((v) => v !== type)
                              : [...p.filters.types, type],
                          })
                        }
                        style={
                          {
                            "--type-color": TYPE_INFO[type].color,
                            "--type-soft": TYPE_INFO[type].soft,
                          } as React.CSSProperties
                        }
                      >
                        {TYPE_INFO[type].label}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Generación</legend>
                  <div className="generation-filter">
                    {[0, 1, 2, 3].map((generation) => (
                      <button
                        key={generation}
                        aria-pressed={p.filters.generation === generation}
                        onClick={() => p.onFilters({ ...p.filters, generation })}
                      >
                        {generation === 0
                          ? "Todas"
                          : ["", "I · Kanto", "II · Johto", "III · Hoenn"][generation]}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend>Total de estadísticas base</legend>
                  <div className="stat-range">
                    <label>
                      Desde
                      <input
                        type="number"
                        min={0}
                        max={780}
                        step={10}
                        value={p.filters.minimum}
                        aria-invalid={p.filters.minimum > p.filters.maximum}
                        aria-describedby={
                          p.filters.minimum > p.filters.maximum ? "invalid-stat-range" : undefined
                        }
                        onChange={(event) =>
                          p.onFilters({
                            ...p.filters,
                            minimum: Math.max(0, Math.min(780, Number(event.target.value))),
                          })
                        }
                      />
                    </label>
                    <span>—</span>
                    <label>
                      Hasta
                      <input
                        type="number"
                        min={0}
                        max={780}
                        step={10}
                        value={p.filters.maximum}
                        aria-invalid={p.filters.minimum > p.filters.maximum}
                        aria-describedby={
                          p.filters.minimum > p.filters.maximum ? "invalid-stat-range" : undefined
                        }
                        onChange={(event) =>
                          p.onFilters({
                            ...p.filters,
                            maximum: Math.max(0, Math.min(780, Number(event.target.value))),
                          })
                        }
                      />
                    </label>
                  </div>
                  {p.filters.minimum > p.filters.maximum && (
                    <p id="invalid-stat-range" className="stat-range-error" role="status">
                      El mínimo no puede ser mayor que el máximo.
                    </p>
                  )}
                </fieldset>
                {p.view === "signals" && (
                  <label className="unseen-toggle">
                    <input
                      type="checkbox"
                      checked={p.filters.unseenOnly}
                      onChange={(event) =>
                        p.onFilters({ ...p.filters, unseenOnly: event.target.checked })
                      }
                    />
                    Solo señales sin registrar
                  </label>
                )}
              </motion.div>
            )}
          </AnimatePresence>
          {advanced && (
            <div className="advanced-filter-actions">
              <button className="text-button" onClick={() => p.onFilters(EMPTY_FILTERS)}>
                Restablecer filtros
              </button>
              <button
                className="filter-results-button"
                onClick={() => {
                  setAdvanced(false);
                  window.requestAnimationFrame(() =>
                    listRef.current?.focus({ preventScroll: true }),
                  );
                }}
              >
                {p.view === "team"
                  ? "Ver equipo"
                  : `Ver ${list.length} ${list.length === 1 ? "señal" : "señales"}`}
              </button>
            </div>
          )}
          <div className="list-sort">
            <span>
              {list.length}{" "}
              {p.view === "team"
                ? p.teamStorageStatus === "unreadable"
                  ? "en esta sesión"
                  : "en tu equipo"
                : list.length === 1
                  ? "señal"
                  : "señales"}
            </span>
            <label>
              <span className="sr-only">Ordenar especies</span>
              <select value={sort} onChange={(event) => setSort(event.target.value)}>
                <option value="distance">
                  {p.view === "team" ? "Orden del equipo" : "Más cerca del centro"}
                </option>
                <option value="power">Mayor estadística base</option>
                <option value="number">Número de Pokédex</option>
              </select>
            </label>
          </div>
        </div>
      )}
      <motion.div
        ref={listRef}
        key={`${p.view}:${p.scope}:${p.region.id}:${p.site.id}`}
        className="expedition-panel-scroll"
        id="exploration-list"
        role="region"
        aria-label={
          p.view === "team"
            ? "Integrantes del equipo"
            : p.view === "signals"
              ? "Resultados de señales"
              : p.view === "journal"
                ? "Cuaderno de campo"
                : "Destinos"
        }
        tabIndex={-1}
        initial={reduced ? false : { opacity: 0, x: -8 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.22 }}
      >
        {p.view === "destinations" &&
          (showingAtlas ? (
            <div className="atlas-region-cards">
              {REGIONS.map((region, index) => (
                <motion.button
                  className="atlas-region-card"
                  key={region.id}
                  onClick={() => p.onRegion(region.id)}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: reduced ? 0 : 0.25, delay: reduced ? 0 : index * 0.04 }}
                >
                  <Image
                    src={region.image}
                    alt=""
                    width={320}
                    height={120}
                    loading={index === 0 ? "eager" : "lazy"}
                  />
                  <span className="region-card-pokemon">
                    <PokemonImage
                      id={REGION_GUIDES[region.id]}
                      name={pokemonName(findPokemon(REGION_GUIDES[region.id])!.name)}
                      size={140}
                      src={artworkUrl(REGION_GUIDES[region.id])}
                      decorative
                    />
                  </span>
                  <span className="region-card-copy">
                    <small>{String(index + 1).padStart(2, "0")} / ARGENTINA</small>
                    <strong>{region.name}</strong>
                    <span>
                      {regionDestinations(region.id).length} lugares · {region.biome}
                    </span>
                  </span>
                  <span className="region-card-arrow">
                    <ArrowRight size={18} />
                  </span>
                </motion.button>
              ))}
              <p className="atlas-footnote">
                {DESTINATIONS.length} lugares reales · 3 generaciones
                <br />
                Apariciones simuladas, paisajes por descubrir.
              </p>
            </div>
          ) : (
            <div className="destination-cards">
              {sites.map((site, index) => (
                <motion.button
                  key={site.id}
                  initial={reduced ? false : { opacity: 0, y: 9 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: reduced ? 0 : index * 0.06 }}
                  whileHover={reduced ? undefined : { x: 4 }}
                  className={`destination-card ${p.site.id === site.id && p.scope === "site" ? "is-active" : ""}`}
                  aria-label={`Viajar a ${site.name}`}
                  style={
                    {
                      "--destination-soft": TYPE_INFO[HABITATS[site.habitat].types[0]!].soft,
                    } as React.CSSProperties
                  }
                  onClick={() => p.onDestination(site.id)}
                >
                  <span className="destination-number">
                    {p.visits.includes(site.id) ? (
                      <Check size={16} />
                    ) : (
                      String(index + 1).padStart(2, "0")
                    )}
                  </span>
                  <span className="destination-card-content">
                    <strong>{site.name}</strong>
                    <small>{site.locality}</small>
                    <p>{site.headline}</p>
                    <span className="destination-biome">{HABITATS[site.habitat].label}</span>
                  </span>
                  <span className="destination-guide-art">
                    <PokemonImage
                      id={DESTINATION_GUIDES[site.id] ?? HABITATS[site.habitat].signature}
                      name=""
                      decorative
                      size={134}
                      src={artworkUrl(
                        DESTINATION_GUIDES[site.id] ?? HABITATS[site.habitat].signature,
                      )}
                    />
                  </span>
                  <ChevronRight size={16} />
                </motion.button>
              ))}
              <button className="panel-back-link" onClick={p.onAtlas}>
                <ArrowLeft size={15} />
                Volver al atlas de Argentina
              </button>
            </div>
          ))}
        {signals &&
          (list.length ? (
            <ul className="expedition-sightings">
              {list.map((entry) => {
                const sighting = p.sightings.find((v) => v.pokemon.id === entry.id);
                const seen = p.discovered.has(`${p.site.id}:${entry.id}`);
                const mystery = p.view === "signals" && sighting?.mystery && !seen;
                const metadata = findPokemon(entry.id)!;
                return (
                  <li
                    key={entry.id}
                    className={`${p.selectedId === entry.id ? "is-selected" : ""} ${p.hoveredId === entry.id ? "is-hovered" : ""}`}
                  >
                    <button
                      className="expedition-sighting-main"
                      data-sighting-id={entry.id}
                      aria-label={
                        mystery
                          ? "Investigar señal sin identificar"
                          : `Ver ${pokemonName(entry.name)}, ${pokemonNumber(entry.id)}`
                      }
                      aria-pressed={p.selectedId === entry.id}
                      onClick={() => p.onSelect(entry.id)}
                      onPointerEnter={() => p.onHover(entry.id)}
                      onPointerLeave={() => p.onHover(null)}
                      onFocus={() => p.onHover(entry.id)}
                      onBlur={() => p.onHover(null)}
                    >
                      <span
                        className={`expedition-sprite ${mystery ? "is-unknown" : ""}`}
                        style={{ background: TYPE_INFO[entry.types[0]!].soft }}
                      >
                        <PokemonImage
                          id={entry.id}
                          name={pokemonName(entry.name)}
                          size={58}
                          decorative
                          className="pixel-art"
                        />
                        {mystery && <Footprints size={18} />}
                      </span>
                      <span className="expedition-sighting-copy">
                        <strong>
                          {mystery ? "Señal sin identificar" : pokemonName(entry.name)}
                          {seen && <Check size={12} aria-label="Registrado" />}
                        </strong>
                        <span className="type-badges">
                          {entry.types.map((type) => (
                            <TypeBadge type={type} compact key={type} />
                          ))}
                        </span>
                        <small>
                          {mystery ? (
                            "Investigá para revelar la especie"
                          ) : sighting?.boosted && p.view === "signals" ? (
                            <>
                              <Zap size={10} />
                              {sighting.reason}
                            </>
                          ) : (
                            `Gen. ${metadata.generation} · ${metadata.baseStatTotal} puntos base`
                          )}
                        </small>
                      </span>
                      <span className="expedition-sighting-meta">
                        <small>{mystery ? "?" : pokemonNumber(entry.id)}</small>
                        {p.view === "signals" && <span>{distance(p.distances.get(entry.id))}</span>}
                      </span>
                    </button>
                    {!mystery && (
                      <button
                        className={`compare-species ${p.compareIds.includes(entry.id) ? "is-active" : ""}`}
                        aria-label={`Comparar a ${pokemonName(entry.name)}`}
                        aria-pressed={p.compareIds.includes(entry.id)}
                        onClick={() => p.onCompare(entry.id)}
                      >
                        <ArrowLeftRight size={14} />
                      </button>
                    )}
                    {p.view === "team" && (
                      <button
                        className="team-lead-control"
                        aria-pressed={p.team[0] === entry.id}
                        aria-label={
                          p.team[0] === entry.id
                            ? `${pokemonName(entry.name)} te acompaña`
                            : `Elegir a ${pokemonName(entry.name)} como acompañante`
                        }
                        onClick={() => p.onLead(entry.id)}
                      >
                        {p.team[0] === entry.id ? "Acompaña" : "Elegir"}
                      </button>
                    )}
                    {p.view === "team" && (
                      <button
                        className="remove-expedition-member"
                        aria-label={`Quitar a ${pokemonName(entry.name)} del equipo`}
                        onClick={() => p.onRemove(entry.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="panel-empty">
              <Search size={29} />
              <h3>
                {p.view === "team" && !filtered
                  ? p.teamStorageStatus === "unreadable"
                    ? "No pudimos mostrar el equipo guardado"
                    : "Tu equipo empieza en el mapa"
                  : p.view === "team"
                    ? "Ningún integrante coincide"
                    : filtered
                      ? "Ninguna señal coincide"
                      : "No hay señales en esta vista"}
              </h3>
              <p>
                {p.view === "team" && !filtered
                  ? p.teamStorageStatus === "unreadable"
                    ? "Podés seguir explorando; los integrantes nuevos serán temporales."
                    : "Explorá un lugar y guardá tus favoritos. Hay espacio para seis."
                  : filtered
                    ? "Cambiá o limpiá los filtros para ver otros resultados."
                    : "Mové el mapa o elegí un destino para seguir explorando."}
              </p>
              <button
                className="secondary-button"
                onClick={() => (filtered ? p.onFilters(EMPTY_FILTERS) : p.onView("destinations"))}
              >
                {filtered ? "Limpiar filtros" : "Elegir un destino"}
              </button>
            </div>
          ))}
        {p.view === "journal" && (
          <div className="field-journal">
            {p.journalStorageStatus !== "ok" && (
              <p className="journal-storage-warning" role="status">
                {p.journalStorageStatus === "unreadable"
                  ? "No pudimos leer el cuaderno guardado. Los datos originales permanecen intactos, pero no se muestran en esta sesión."
                  : "El navegador no permite guardar el cuaderno."}{" "}
                Los cambios de esta sesión no se conservarán al cerrar o recargar.
              </p>
            )}
            {journalMode !== "collection" && (
              <div className="journal-numbers">
                <span>
                  <strong>{new Set(p.entries.map((e) => e.pokemonId)).size}</strong>especies
                </span>
                <span>
                  <strong>{p.visits.length}</strong>lugares
                </span>
                <span>
                  <strong>
                    {new Set(p.entries.flatMap((e) => findPokemon(e.pokemonId)?.types ?? [])).size}
                  </strong>
                  tipos
                </span>
              </div>
            )}
            <div className="journal-view-toggle">
              <button
                aria-pressed={journalMode === "collection"}
                onClick={() => setJournalMode("collection")}
              >
                Pokédex
              </button>
              <button
                aria-pressed={journalMode === "timeline"}
                onClick={() => setJournalMode("timeline")}
              >
                Historial
              </button>
              <button
                aria-pressed={journalMode === "missions"}
                onClick={() => setJournalMode("missions")}
              >
                Objetivos
              </button>
            </div>
            {journalMode === "missions" && (
              <MissionCard
                regionId={p.region.id}
                entries={p.entries}
                visits={p.visits}
                onExplore={(completed) => {
                  if (completed) p.onAtlas();
                  else p.onRegion(p.region.id);
                  window.requestAnimationFrame(() =>
                    document.getElementById("exploration-list")?.focus({ preventScroll: true }),
                  );
                }}
              />
            )}
            {journalMode === "collection" && (
              <FieldCollection
                entries={p.entries}
                collection={p.collection}
                team={p.team}
                onInspect={p.onSelect}
              />
            )}
            {journalMode === "timeline" && (
              <>
                <div className="journal-caption">
                  <h3>Últimos hallazgos</h3>
                  <span>{p.entries.length}</span>
                </div>
                {p.entries.length ? (
                  <ol className="journal-entries">
                    {p.entries.slice(0, 40).map((entry) => {
                      const species = findPokemon(entry.pokemonId),
                        site = getDestination(entry.siteId);
                      if (!species || !site) return null;
                      const fromBase =
                        entry.outsideSite && entry.coordinates
                          ? distance(distanceInMeters(site.area.center, entry.coordinates))
                          : null;
                      return (
                        <li
                          key={`${entry.siteId}:${entry.pokemonId}:${entry.outsideSite ?? "legacy"}:${entry.seenAt}`}
                        >
                          <button
                            aria-label={`Ver ${pokemonName(species.name)} desde la base ${site.name}`}
                            onClick={() => p.onDestination(entry.siteId, entry.pokemonId)}
                          >
                            <PokemonImage
                              id={entry.pokemonId}
                              name={pokemonName(species.name)}
                              size={52}
                              decorative
                              className="pixel-art"
                            />
                            <span>
                              <strong>{pokemonName(species.name)}</strong>
                              <small>
                                <MapPin size={10} />
                                {entry.outsideSite === true
                                  ? `Zona explorada${fromBase ? ` · ${fromBase} de ` : " · base: "}${site.name}`
                                  : entry.outsideSite === false
                                    ? site.name
                                    : `Base: ${site.name}`}
                              </small>
                              <small>
                                {new Intl.DateTimeFormat("es-AR", {
                                  day: "numeric",
                                  month: "short",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  timeZone: "America/Argentina/Buenos_Aires",
                                }).format(new Date(entry.seenAt))}
                                {entry.weather ? ` · ${entry.weather}` : ""}
                              </small>
                            </span>
                            <ChevronRight size={14} />
                          </button>
                          {entry.coordinates && (
                            <button
                              className="journal-revisit"
                              aria-label={`Explorar zona del hallazgo de ${pokemonName(species.name)}${fromBase ? `, a ${fromBase} de ${site.name}` : ""}`}
                              title="Explorar esta zona"
                              onClick={() => p.onRevisit(entry.siteId, entry.coordinates!)}
                            >
                              <MapPin size={16} aria-hidden="true" />
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ol>
                ) : (
                  <div className="panel-empty">
                    <BookOpen size={28} />
                    <h3>La primera página está por escribir</h3>
                    <p>
                      Elegí un lugar y registrá una señal. Tu recorrido se guarda en este navegador.
                    </p>
                    <button className="secondary-button" onClick={() => p.onView("destinations")}>
                      Elegir un destino
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </motion.div>
      {p.compareIds.length > 0 && signals && (
        <div className="comparison-tray">
          <span>
            <ArrowLeftRight size={15} />
            Comparación <strong>{p.compareIds.length}/2</strong>
          </span>
          <button disabled={p.compareIds.length !== 2} onClick={p.onOpenCompare}>
            Ver comparación
            <ArrowRight size={14} />
          </button>
        </div>
      )}
      <footer className="expedition-panel-footer">
        <span className="simulation-dot" />
        Avistamientos simulados · Progreso en este navegador
      </footer>
    </aside>
  );
}
