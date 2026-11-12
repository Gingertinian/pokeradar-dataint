"use client";

import Image from "next/image";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import {
  ArrowRight,
  Backpack,
  BookOpen,
  Check,
  ChevronRight,
  Compass,
  Info,
  MapPin,
  Share2,
  Volume2,
  VolumeX,
} from "lucide-react";
import { LocationTrail } from "@/components/location-trail";
import { MapLoader } from "@/components/map/map-loader";
import type { MapMode, MapScope } from "@/components/map/expedition-map";
import { ExpeditionPanel, type PanelView } from "@/components/expedition-panel";
import { Atmosphere, atmosphereState, type AtmospherePreview } from "@/components/atmosphere";
import { CaptureEncounter } from "@/components/capture-play";
import { encounterEnvironment } from "@/lib/encounter-environment";
import { ExpeditionDock } from "@/components/expedition-dock";
import { terrainFingerprint, type TerrainSample } from "@/lib/map-terrain";
import type { CaptureDetails } from "@/lib/journal";
import { sightingCoordinate } from "@/lib/journal";
import {
  parseSharedCamera,
  reachedDestination,
  writeSharedCamera,
  type SharedCamera,
} from "@/lib/camera-link";
import { readNavigation } from "@/lib/navigation";
import type { ExpeditionSighting } from "@/lib/destinations";
import { useLivingEncounters } from "@/hooks/use-living-encounters";
import { localSightings, radarTargets, viewSeed, type RadarView } from "@/lib/local-radar";
import { MapControls, type CameraCommand } from "@/components/map/map-controls";
import { CompareDialog } from "@/components/compare-dialog";
import { PokemonDetailPanel } from "@/components/pokemon-detail";
import { AboutDialog } from "@/components/about-dialog";
import { useTeam } from "@/hooks/use-team";
import { useJournal } from "@/hooks/use-journal";
import { useWeather } from "@/hooks/use-weather";
import { usePokemon } from "@/hooks/use-pokemon";
import { findPokemon, POKEMON } from "@/lib/catalog";
import { TEAM_LIMIT } from "@/lib/exploration";
import {
  EMPTY_FILTERS,
  companionTypesSelected,
  filterCount,
  followCompanionFilter,
  matchesFilters,
  type ExpeditionFilters,
} from "@/lib/expedition";
import type { RadarPlacement } from "@/lib/label-placement";
import {
  DEFAULT_DESTINATION,
  getDestination,
  HABITATS,
  regionDestinations,
} from "@/lib/destinations";
import {
  boundsFingerprint,
  distanceInMeters,
  isNearBounds,
  isWithinBounds,
  type Coordinate,
  type MapBounds,
} from "@/lib/geography";
import { pokemonName, type PokemonSummary } from "@/lib/pokemon";
import { getRegion, type RegionId } from "@/lib/regions";
import { weatherAffinity, weatherLabel } from "@/lib/weather";

type Props = {
  initialRegionId: RegionId;
  initialSiteId: string;
  initialSelectedId: number | null;
  initialMapMode: MapMode;
  initialScope: MapScope;
  initialRound: number;
  initialCamera: SharedCamera | null;
  day: string;
};

export function Explorer({
  initialRegionId,
  initialSiteId,
  initialSelectedId,
  initialMapMode,
  initialScope,
  initialRound,
  initialCamera,
  day,
}: Props) {
  const [regionId, setRegionId] = useState(initialRegionId);
  const [siteId, setSiteId] = useState(initialSiteId);
  const [scope, setScope] = useState<MapScope>(initialScope);
  const [selectedId, setSelectedId] = useState(initialSelectedId);
  const [detailReturn, setDetailReturn] = useState<PanelView | null>(null);
  const [pinnedId, setPinnedId] = useState(initialSelectedId);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [filters, setFilters] = useState<ExpeditionFilters>(EMPTY_FILTERS);
  const [teamFilters, setTeamFilters] = useState<ExpeditionFilters>(EMPTY_FILTERS);
  const [companionFilterOwner, setCompanionFilterOwner] = useState<number | null>(null);
  const [panelView, setPanelView] = useState<PanelView>(
    initialScope === "site" ? "signals" : "destinations",
  );
  const [listOpen, setListOpen] = useState(initialScope !== "site");
  const [panelCollapsed, setPanelCollapsed] = useState(initialScope === "site");
  const [cameraCommand, setCameraCommand] = useState<CameraCommand>({ action: "north", serial: 0 });
  const [historyCamera, setHistoryCamera] = useState<{
    camera: SharedCamera | null;
    serial: number;
  }>({ camera: null, serial: 0 });
  const [cameraMoving, setCameraMoving] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [resetKey, setResetKey] = useState(0);
  const [mapMode, setMapMode] = useState(initialMapMode);
  const [round, setRound] = useState(initialRound);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [compareOpen, setCompareOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const [encounterId, setEncounterId] = useState<number | null>(null);
  const [encounterBase, setEncounterBase] = useState<string | null>(null);
  const [encounterSetting, setEncounterSetting] = useState<ReturnType<
    typeof encounterEnvironment
  > | null>(null);
  const [departedIds, setDepartedIds] = useState<number[]>([]);
  const [radarView, setRadarView] = useState<RadarView | null>(null);
  const [radarFindings, setRadarFindings] = useState<{
    entries: ExpeditionSighting[];
    origin: Coordinate;
    viewCenter: Coordinate;
  } | null>(null);
  const [radarLayout, setRadarLayout] = useState<RadarPlacement>({
    side: "right",
    lift: 0,
    shift: 0,
  });
  const [atmospherePreview, setAtmospherePreview] = useState<AtmospherePreview>("live");
  const [scanOrigin, setScanOrigin] = useState<Coordinate | null>(null);
  const [scanKey, setScanKey] = useState(0);
  const [toast, setToast] = useState<string | null>(null);
  const [travel, setTravel] = useState<{ id: number; label: string } | null>(null);
  const travelSequence = useRef(0);
  const site = getDestination(siteId) ?? DEFAULT_DESTINATION;
  const region = getRegion(regionId);
  const [camera, setCamera] = useState<RadarView>({
    coordinates:
      initialScope === "site" ? (initialCamera?.coordinates ?? site.area.center) : site.area.center,
    bounds: site.area.bounds,
    zoom: 0,
  });
  const { team, storageStatus: teamStorageStatus, toggle, capture, lead } = useTeam();
  const companion = team[0] ? findPokemon(team[0]) : undefined;
  const companionFilterActive =
    companionFilterOwner === companion?.id && companionTypesSelected(filters, companion);
  const journal = useJournal(team);
  const weather = useWeather(siteId, camera.coordinates, scope === "site");
  const atmosphere = atmosphereState(weather.data, atmospherePreview);
  const selectedData = usePokemon(selectedId);
  const reduced = useReducedMotion();
  const scanTimer = useRef<number | undefined>(undefined);
  const pendingRevisit = useRef<SharedCamera | null>(null);
  const pendingDestination = useRef<{ coordinates: Coordinate; minZoom: number } | null>(
    initialScope === "site"
      ? {
          coordinates: initialCamera?.coordinates ?? site.area.center,
          minZoom: initialCamera ? Math.max(2.8, initialCamera.zoom - 0.5) : 12,
        }
      : null,
  );
  const selectionLocked = useRef(false);
  useEffect(() => {
    selectionLocked.current = selectedId !== null || encounterId !== null;
  }, [selectedId, encounterId]);
  const resumeScan = useRef<((view: RadarView) => void) | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const terrainKey = useMemo(() => terrainFingerprint(radarView?.terrain), [radarView?.terrain]);
  const contextKey = `${siteId}:${round}:${weatherAffinity(weather.data).join(",")}:${viewSeed(radarView)}:${radarView ? boundsFingerprint(radarView.bounds) : "pending"}:${terrainKey}`;
  const scanVersion = useRef(0);
  const focusRadarResults = useRef(false);
  useEffect(() => {
    if (!radarFindings || !focusRadarResults.current) return;
    focusRadarResults.current = false;
    if (
      document.activeElement === document.body ||
      document.activeElement?.classList.contains("field-radar-button")
    )
      document.querySelector<HTMLButtonElement>(".radar-findings > div > button")?.focus();
  }, [radarFindings]);
  const generatePool = useCallback(
    (revision: number) =>
      localSightings(site, radarView, {
        day,
        round: round + revision * 13,
        weather: weather.data,
        pinnedId: revision === 0 ? pinnedId : null,
      }).filter((entry) => !departedIds.includes(entry.pokemon.id)),
    [site, radarView, day, round, weather.data, pinnedId, departedIds],
  );
  const baseSightings = useMemo(() => generatePool(0), [generatePool]);
  const living = useLivingEncounters(
    contextKey,
    baseSightings,
    generatePool,
    scope !== "site" ||
      selectedId !== null ||
      (listOpen && !panelCollapsed) ||
      encounterId !== null ||
      scanOrigin !== null ||
      radarFindings !== null ||
      cameraMoving,
    selectedId,
  );
  const sightings = useMemo(
    () => living.sightings.filter((entry) => !departedIds.includes(entry.pokemon.id)),
    [living.sightings, departedIds],
  );
  const discovered = useMemo(
    () => new Set(journal.entries.map((entry) => `${entry.siteId}:${entry.pokemonId}`)),
    [journal.entries],
  );
  const visited = useMemo(() => new Set(journal.visits), [journal.visits]);
  const visibleSightings = useMemo(
    () => sightings.filter((entry) => isWithinBounds(entry.coordinates, camera.bounds)),
    [sightings, camera.bounds],
  );
  const filteredSightings = useMemo(
    () =>
      sightings.filter((entry) =>
        matchesFilters(entry.pokemon, filters, discovered.has(entry.key)),
      ),
    [sightings, filters, discovered],
  );
  const radarEntries = useMemo(() => radarFindings?.entries ?? [], [radarFindings]);
  const mapSightings = useMemo(() => {
    const selected = sightings.find((entry) => entry.pokemon.id === selectedId);
    const visible = [...filteredSightings];
    if (selected && !visible.some((entry) => entry.key === selected.key)) visible.push(selected);
    for (const entry of radarEntries)
      if (!visible.some((candidate) => candidate.key === entry.key)) visible.push(entry);
    return visible;
  }, [sightings, filteredSightings, selectedId, radarEntries]);
  const selectedSighting = sightings.find((entry) => entry.pokemon.id === selectedId);
  const distances = useMemo(
    () =>
      new Map(
        sightings.map((entry) => [
          entry.pokemon.id,
          distanceInMeters(entry.coordinates, camera.coordinates),
        ]),
      ),
    [sightings, camera.coordinates],
  );
  const visiblePokemon = useMemo(
    () =>
      panelView === "team"
        ? team
            .map(findPokemon)
            .filter((entry): entry is NonNullable<ReturnType<typeof findPokemon>> => Boolean(entry))
            .filter((entry) => matchesFilters(entry, teamFilters, false))
        : filteredSightings
            .filter((entry) => isWithinBounds(entry.coordinates, camera.bounds))
            .map((entry) => entry.pokemon),
    [panelView, team, teamFilters, filteredSightings, camera.bounds],
  );
  const inViewport = filteredSightings.filter((entry) =>
    isWithinBounds(entry.coordinates, camera.bounds),
  ).length;
  const awayFromSite =
    scope === "site" && camera.zoom > 0 && !isNearBounds(camera.coordinates, site.viewBounds, 200);
  const detailOpen = selectedId !== null;
  const scanning = scanOrigin !== null;
  const closeDetail = useCallback(() => {
    const closingId = selectedId;
    setSelectedId(null);
    if (detailReturn) {
      setPanelView(detailReturn);
      setPanelCollapsed(false);
      setListOpen(true);
      setDetailReturn(null);
      window.requestAnimationFrame(() => {
        const list = document.getElementById("exploration-list");
        const item = list?.querySelector<HTMLButtonElement>(`[data-sighting-id="${closingId}"]`);
        (item ?? list)?.focus({ preventScroll: true });
      });
    }
  }, [detailReturn, selectedId]);
  const onCameraMove = useCallback(
    (coordinates: Coordinate, zoom: number, bounds: MapBounds, terrain?: TerrainSample[]) => {
      const destination = pendingDestination.current;
      if (
        destination &&
        !reachedDestination({ coordinates, zoom }, destination.coordinates, destination.minZoom)
      )
        return;
      pendingDestination.current = null;
      setCamera({ coordinates, bounds, zoom, terrain });
      const url = new URL(window.location.href);
      const linked = parseSharedCamera(Object.fromEntries(url.searchParams));
      const pending = pendingRevisit.current;
      if (
        pending &&
        distanceInMeters(pending.coordinates, coordinates) < 1000 &&
        Math.abs(pending.zoom - zoom) < 0.5
      ) {
        pendingRevisit.current = null;
        writeSharedCamera(url.searchParams, { coordinates, zoom });
        window.history.replaceState(null, "", url);
      } else if (
        !pending &&
        linked &&
        (distanceInMeters(linked.coordinates, coordinates) > 3 ||
          Math.abs(linked.zoom - zoom) > 0.02)
      ) {
        writeSharedCamera(url.searchParams, { coordinates, zoom });
        window.history.replaceState(null, "", url);
      }
      if (zoom >= 13 && !selectionLocked.current)
        setRadarView({ coordinates, bounds, zoom, terrain });
      setRadarFindings((current) =>
        current && distanceInMeters(current.viewCenter, coordinates) > 10 ? null : current,
      );
      const resume = resumeScan.current;
      resumeScan.current = null;
      resume?.({ coordinates, bounds, zoom, terrain });
    },
    [],
  );

  const onCameraActivity = useCallback((moving: boolean, userInitiated = false) => {
    setCameraMoving(moving);
    if (moving) {
      if (userInitiated) {
        pendingDestination.current = null;
        pendingRevisit.current = null;
        const url = new URL(window.location.href);
        for (const key of ["lng", "lat", "zoom"]) url.searchParams.delete(key);
        window.history.replaceState(null, "", url);
      }
      window.clearTimeout(scanTimer.current);
      scanVersion.current++;
      setScanOrigin(null);
      setRadarFindings(null);
    }
  }, []);
  useEffect(() => () => window.clearTimeout(scanTimer.current), []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 3400);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const params = new URLSearchParams({ view: mapMode });
    if (scope !== "atlas") params.set("region", regionId);
    if (scope === "site") params.set("place", siteId);
    if (round) params.set("run", String(round));
    if (selectedId !== null) params.set("pokemon", String(selectedId));
    const existing = new URLSearchParams(window.location.search);
    const savedCamera = parseSharedCamera(Object.fromEntries(existing));
    if (scope === "site" && existing.get("place") === siteId && savedCamera)
      writeSharedCamera(params, savedCamera);
    window.history.replaceState(null, "", `?${params}`);
  }, [regionId, siteId, scope, mapMode, round, selectedId]);
  useEffect(() => {
    if (!soundEnabled || !selectedData.data?.cry) return;
    const player = new Audio(selectedData.data.cry);
    audio.current = player;
    player.volume = 0.4;
    void player
      .play()
      .catch(() => setToast("Podés escuchar el sonido desde el botón de la ficha."));
    return () => {
      player.pause();
      audio.current = null;
    };
  }, [soundEnabled, selectedId, selectedData.data?.cry]);

  function cancelScan() {
    resumeScan.current = null;
    focusRadarResults.current = false;
    scanVersion.current++;
    window.clearTimeout(scanTimer.current);
    setScanOrigin(null);
  }
  function resetIntent() {
    pendingRevisit.current = null;
    pendingDestination.current = null;
    resumeScan.current = null;
    setDepartedIds([]);
    setRadarFindings(null);
    setRadarView(null);
    cancelScan();
    setSelectedId(null);
    setHoveredId(null);
    setDetailReturn(null);
    setEncounterId(null);
    setAtmospherePreview("live");
    setListOpen(false);
    setRound(0);
    setPinnedId(null);
  }
  function beginTravel(label: string) {
    if (!reduced) setTravel({ id: ++travelSequence.current, label });
  }
  function returnToMap() {
    cancelScan();
    setSelectedId(null);
    setPanelView(scope === "site" ? "signals" : "destinations");
    setListOpen(scope !== "site");
    setPanelCollapsed(scope === "site");
  }
  function pushLocation(next: {
    scope: MapScope;
    regionId?: RegionId;
    siteId?: string;
    mapMode: MapMode;
    camera?: SharedCamera;
  }) {
    const currentUrl = new URL(window.location.href);
    if (scope === "site" && !cameraMoving && camera.zoom >= 2.8)
      writeSharedCamera(currentUrl.searchParams, camera);
    window.history.replaceState(null, "", currentUrl);
    const nextParams = new URLSearchParams({ view: next.mapMode });
    if (next.regionId) nextParams.set("region", next.regionId);
    if (next.siteId) nextParams.set("place", next.siteId);
    if (next.camera) writeSharedCamera(nextParams, next.camera);
    if (window.location.search !== `?${nextParams}`)
      window.history.pushState(null, "", `?${nextParams}`);
  }
  function chooseRegion(id: RegionId) {
    pushLocation({ scope: "region", regionId: id, mapMode });
    resetIntent();
    setRegionId(id);
    setSiteId(regionDestinations(id)[0]!.id);
    setScope("region");
    setPanelCollapsed(false);
    setListOpen(true);
    beginTravel(getRegion(id).name);
    setPanelView("destinations");
    setResetKey((value) => value + 1);
  }
  function chooseAtlas() {
    pushLocation({ scope: "atlas", mapMode });
    resetIntent();
    setScope("atlas");
    setPanelCollapsed(false);
    setListOpen(true);
    beginTravel("Atlas de Argentina");
    setPanelView("destinations");
    setResetKey((value) => value + 1);
  }
  function chooseDestination(id: string, pokemonId?: number, location?: Coordinate) {
    const destination = getDestination(id);
    if (!destination) return;
    const nextMode = location
      ? mapMode
      : mapMode === "satellite"
        ? "satellite"
        : destination.habitat === "mountain" || destination.habitat === "glacier"
          ? "relief"
          : "map";
    if (scope !== "site" || siteId !== id || location)
      pushLocation({
        scope: "site",
        regionId: destination.regionId,
        siteId: id,
        mapMode: nextMode,
        camera: location ? { coordinates: location, zoom: 16 } : undefined,
      });
    resetIntent();
    pendingRevisit.current = location ? { coordinates: location, zoom: 16 } : null;
    pendingDestination.current = { coordinates: location ?? destination.area.center, minZoom: 12 };
    setRegionId(destination.regionId);
    setSiteId(id);
    setScope("site");
    beginTravel(location ? "Zona del hallazgo" : destination.name);
    setPanelView("signals");
    setPinnedId(pokemonId ?? null);
    setSelectedId(pokemonId ?? null);
    setMapMode(nextMode);
    setCamera({
      coordinates: location ?? destination.area.center,
      bounds: destination.area.bounds,
      zoom: 16,
    });
    setHistoryCamera((current) => ({
      camera: location ? { coordinates: location, zoom: 16 } : null,
      serial: current.serial + 1,
    }));
    setPanelCollapsed(true);
    if (!location || isWithinBounds(location, destination.viewBounds)) journal.visit(id);
    setResetKey((value) => value + 1);
  }
  useEffect(() => {
    const onPop = () => {
      const route = readNavigation(Object.fromEntries(new URLSearchParams(window.location.search)));
      resetIntent();
      if (route.scope === "site") {
        const destination = getDestination(route.siteId) ?? DEFAULT_DESTINATION;
        const coordinates = route.camera?.coordinates ?? destination.area.center;
        pendingDestination.current = {
          coordinates,
          minZoom: route.camera ? Math.max(2.8, route.camera.zoom - 0.5) : 12,
        };
        setCamera({ coordinates, bounds: destination.area.bounds, zoom: route.camera?.zoom ?? 16 });
      }
      setRegionId(route.regionId);
      setSiteId(route.siteId);
      setScope(route.scope);
      setMapMode(route.mapMode);
      setRound(route.round);
      setPinnedId(route.selectedId);
      setSelectedId(route.selectedId);
      setPanelView(route.scope === "site" ? "signals" : "destinations");
      setListOpen(route.scope !== "site");
      setPanelCollapsed(route.scope === "site");
      setHistoryCamera((current) => ({ camera: route.camera, serial: current.serial + 1 }));
      setResetKey((current) => current + 1);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  });
  function selectPokemon(id: number, fromPanel = false, chosen?: ExpeditionSighting) {
    selectionLocked.current = true;
    setDetailReturn(fromPanel && !panelCollapsed ? panelView : null);
    const sighting = chosen ?? sightings.find((entry) => entry.pokemon.id === id);
    if (sighting && scope === "site")
      journal.record(
        id,
        siteId,
        weather.data ? weatherLabel(weather.data) : null,
        !isWithinBounds(sighting.coordinates, site.viewBounds),
        sightingCoordinate(sighting.coordinates),
      );
    setSelectedId(id);
    setHoveredId(null);
    setListOpen(false);
    setPanelCollapsed(true);
  }

  function startEncounter(id: number, chosen?: ExpeditionSighting) {
    const sighting =
      chosen ??
      sightings.find((entry) => entry.pokemon.id === id) ??
      radarFindings?.entries.find((entry) => entry.pokemon.id === id);
    setEncounterSetting(encounterEnvironment(site, sighting));
    setEncounterBase(
      sighting && isWithinBounds(sighting.coordinates, site.viewBounds) ? siteId : null,
    );
    setRadarFindings(null);
    selectPokemon(id, false, sighting);
    setSelectedId(null);
    setDetailReturn(null);
    setPanelView("signals");
    setEncounterId(id);
  }

  function capturePokemon(id: number, details: CaptureDetails): "team" | "collection" {
    journal.collect(id, encounterBase, details);
    const next = capture(id);
    setDepartedIds((current) => [...new Set([...current, id])]);
    living.dismiss(id);
    return next.includes(id) ? "team" : "collection";
  }
  function changeFilters(value: ExpeditionFilters) {
    setRadarFindings(null);
    cancelScan();
    if (
      value.types.length !== filters.types.length ||
      !value.types.every((type) => filters.types.includes(type))
    )
      setCompanionFilterOwner(null);
    setFilters(value);
    setSelectedId(null);
  }
  function showPanel(view: PanelView) {
    setDetailReturn(null);
    setRadarFindings(null);
    setSelectedId(null);
    setPanelCollapsed(false);
    cancelScan();
    setPanelView(view);
    setListOpen(true);
  }
  function closePanel() {
    const target =
      panelView === "team"
        ? 'button[aria-label^="Mi equipo,"]'
        : panelView === "journal"
          ? 'button[aria-label="Cuaderno de campo"]'
          : scope === "site"
            ? 'button[aria-label^="Ver señales y filtros"]'
            : 'button[aria-label="Elegir un lugar"]';
    setListOpen(false);
    setPanelCollapsed(true);
    window.requestAnimationFrame(() =>
      document.querySelector<HTMLButtonElement>(target)?.focus({ preventScroll: true }),
    );
  }
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (
        event.defaultPrevented ||
        event.altKey ||
        event.ctrlKey ||
        event.metaKey ||
        document.querySelector("dialog[open]")
      )
        return;
      if (event.key === "Escape") {
        if (
          target instanceof Element &&
          (target.closest("details") ||
            target.closest(".pokemon-detail") ||
            target.tagName === "SELECT")
        )
          return;
        if (radarFindings) {
          setRadarFindings(null);
          window.requestAnimationFrame(() =>
            document
              .querySelector<HTMLButtonElement>(".field-radar-button")
              ?.focus({ preventScroll: true }),
          );
          event.preventDefault();
        } else if (selectedId !== null) {
          closeDetail();
          event.preventDefault();
        } else if (listOpen && !panelCollapsed) {
          closePanel();
          event.preventDefault();
        }
        return;
      }
      if (event.key !== "/" || scope !== "site" || event.repeat) return;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      )
        return;
      event.preventDefault();
      showPanel("signals");
      window.requestAnimationFrame(() => document.getElementById("pokemon-search")?.focus());
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });
  function togglePokemon(id: number) {
    if (!team.includes(id) && !journal.collection.some((entry) => entry.pokemonId === id)) return;
    if (team.length >= TEAM_LIMIT && !team.includes(id)) {
      setToast("Tu equipo ya tiene seis Pokémon.");
      return;
    }
    const next = toggle(id);
    if (companionFilterActive && team[0] === id && !next.includes(id)) {
      const replacement = next[0] ? findPokemon(next[0]) : undefined;
      setFilters(followCompanionFilter(filters, companion, replacement));
      setCompanionFilterOwner(replacement?.id ?? null);
    }
    setToast(
      `${pokemonName(findPokemon(id)?.name ?? "Pokémon")} ${next.includes(id) ? "se sumó a tu equipo." : "se quitó del equipo."}`,
    );
  }
  function chooseCompanion(id: number) {
    const chosen = findPokemon(id);
    if (!chosen || !team.includes(id) || team[0] === id) return;
    lead(id);
    if (companionFilterActive) {
      setFilters(followCompanionFilter(filters, companion, chosen));
      setCompanionFilterOwner(chosen.id);
    }
    setToast(`${pokemonName(chosen.name)} ahora te acompaña.`);
  }
  function filterByCompanion() {
    if (!companion) return;
    changeFilters({ ...filters, types: companionFilterActive ? [] : [...companion.types] });
    setCompanionFilterOwner(companionFilterActive ? null : companion.id);
    setToast(
      companionFilterActive
        ? `Filtro de ${pokemonName(companion.name)} quitado.`
        : `Tipos de ${pokemonName(companion.name)} aplicados.`,
    );
  }
  function renew() {
    setDepartedIds([]);
    setRadarFindings(null);
    cancelScan();
    setSelectedId(null);
    setPinnedId(null);
    setRound((value) => value + 1);
    setRadarView(camera);
    setToast("El radar se actualizó en esta vista.");
  }
  function recenter() {
    pendingRevisit.current = null;
    cancelScan();
    setSelectedId(null);
    const url = new URL(window.location.href);
    for (const key of ["lng", "lat", "zoom"]) url.searchParams.delete(key);
    window.history.replaceState(null, "", url);
    setResetKey((value) => value + 1);
  }
  function scanAt(origin: Coordinate, settledView?: RadarView, keyboard = false) {
    if (scanning || (!settledView && cameraMoving) || scope !== "site") return;
    const view = settledView ?? camera;
    if (view.zoom < 13) {
      setToast("Acercá el mapa para explorar el terreno que tenés a la vista.");
      return;
    }
    cancelScan();
    const candidates = (
      settledView
        ? localSightings(site, view, { day, round, weather: weather.data })
        : sightings.filter((entry) => isWithinBounds(entry.coordinates, view.bounds))
    ).filter((entry) => !departedIds.includes(entry.pokemon.id));
    const matching = candidates.filter((entry) =>
      matchesFilters(entry.pokemon, filters, discovered.has(entry.key)),
    );
    const targets = radarTargets(matching, origin, view.zoom, discovered);
    setRadarView(view);
    setSelectedId(null);
    setPanelView("signals");
    if (!targets.length) {
      setToast("No hay señales del hábitat en esta vista. Mové el mapa o ajustá los filtros.");
      return;
    }
    focusRadarResults.current = keyboard;
    const version = scanVersion.current;
    setScanOrigin(origin);
    setScanKey((value) => value + 1);
    setListOpen(false);
    scanTimer.current = window.setTimeout(
      () => {
        setScanOrigin(null);
        if (scanVersion.current !== version) return;
        setRadarFindings({ entries: targets, origin, viewCenter: view.coordinates });
      },
      reduced ? 0 : 850,
    );
  }
  function continueExploring() {
    setEncounterId(null);
    setSelectedId(null);
    const nearby = sightings.some((entry) => isWithinBounds(entry.coordinates, camera.bounds));
    if (nearby && !cameraMoving && camera.zoom >= 13) {
      scanAt(camera.coordinates);
    } else {
      resumeScan.current = (view) => scanAt(view.coordinates, view);
      setResetKey((value) => value + 1);
      setToast("Volviendo al hábitat para seguir el rastro.");
    }
  }
  function compare(id: number) {
    if (compareIds.includes(id)) {
      setCompareIds(compareIds.filter((value) => value !== id));
      return;
    }
    const next = compareIds.length < 2 ? [...compareIds, id] : [compareIds[1]!, id];
    setCompareIds(next);
    if (next.length === 2) setCompareOpen(true);
  }
  function compareFromDetail(id: number) {
    const partner = [
      ...compareIds,
      ...team,
      ...visibleSightings
        .filter((entry) => !entry.mystery || discovered.has(entry.key))
        .map((entry) => entry.pokemon.id),
      ...POKEMON.map((entry) => entry.id),
    ].find((candidate) => candidate !== id && findPokemon(candidate));
    if (partner === undefined) return;
    setCompareIds([id, partner]);
    setCompareOpen(true);
  }
  async function share() {
    try {
      if (cameraMoving) {
        setToast("Esperá a que el mapa termine de moverse.");
        return;
      }
      const url = new URL(window.location.href);
      if (scope === "site" && camera.zoom >= 2.8) writeSharedCamera(url.searchParams, camera);
      window.history.replaceState(null, "", url);
      await navigator.clipboard.writeText(url.toString());
      setToast("Enlace de esta vista copiado.");
    } catch {
      setToast("Podés compartir la dirección desde el navegador.");
    }
  }

  return (
    <div
      className="atlas-app expedition-shell pokemon-world live-world hud-world"
      data-panel-collapsed={panelCollapsed}
      data-weather={scope === "site" ? atmosphere.kind : undefined}
      data-period={scope === "site" && atmosphere.night ? "night" : "day"}
      data-world-scope={scope}
    >
      <button
        className="skip-link"
        onClick={() => {
          showPanel(scope === "site" ? "signals" : "destinations");
          window.requestAnimationFrame(() => document.getElementById("exploration-list")?.focus());
        }}
      >
        Ir al explorador
      </button>
      <header className="app-header">
        <button
          className="brand brand-button"
          onClick={chooseAtlas}
          aria-label="PokéRadar, abrir atlas de Argentina"
        >
          <span className="brand-image">
            <Image src="/brand/pokeradar-logo.png" alt="" width={52} height={52} loading="eager" />
          </span>
          <h1 className="brand-name">
            Poké<span>Radar</span>
          </h1>
          <span className="brand-edition mono">EDICIÓN ARGENTINA</span>
        </button>
        <nav className="main-navigation" aria-label="Exploración">
          <button
            aria-pressed={panelView === "signals" || panelView === "destinations"}
            className={panelView === "signals" || panelView === "destinations" ? "is-active" : ""}
            onClick={returnToMap}
            aria-label="Explorar"
          >
            <Compass size={17} />
            <span>{scope === "site" ? "Mapa" : "Explorar"}</span>
          </button>
          <button
            aria-pressed={panelView === "journal"}
            className={panelView === "journal" ? "is-active" : ""}
            onClick={() => showPanel("journal")}
            aria-label="Cuaderno de campo"
          >
            <BookOpen size={17} />
            <span>Cuaderno</span>
          </button>
          <button
            aria-pressed={panelView === "team"}
            className={panelView === "team" ? "is-active" : ""}
            onClick={() => showPanel("team")}
            aria-label={`Mi equipo, ${team.length} Pokémon`}
          >
            <Backpack size={17} />
            <span>Mi equipo</span>
            <span className="nav-team-count">{team.length}</span>
          </button>
        </nav>
        <div className="header-tools">
          <button
            className={`icon-button sound-toggle ${soundEnabled ? "is-active" : ""}`}
            aria-label={
              soundEnabled
                ? "Desactivar sonidos de descubrimiento"
                : "Activar sonidos de descubrimiento"
            }
            aria-pressed={soundEnabled}
            onClick={() => setSoundEnabled(!soundEnabled)}
          >
            {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
          </button>
          <button
            className="icon-button share-button"
            aria-label="Copiar enlace de esta vista"
            title="Copiar enlace de esta vista"
            onClick={() => void share()}
          >
            <Share2 size={17} />
          </button>
          <button
            className="icon-button"
            aria-label="Acerca de este atlas"
            onClick={() => setAboutOpen(true)}
          >
            <Info size={19} />
          </button>
        </div>
      </header>
      <main className="explorer-workspace">
        <ExpeditionPanel
          key={panelView}
          region={region}
          site={site}
          scope={scope}
          awayFromSite={awayFromSite}
          view={panelView}
          mobileOpen={listOpen}
          filters={panelView === "team" ? teamFilters : filters}
          pokemon={visiblePokemon as PokemonSummary[]}
          sightings={sightings}
          visibleSightings={visibleSightings}
          selectedId={selectedId}
          hoveredId={hoveredId}
          discovered={discovered}
          distances={distances}
          team={team}
          entries={journal.entries}
          collection={journal.collection}
          visits={journal.visits}
          journalStorageStatus={journal.storageStatus}
          teamStorageStatus={teamStorageStatus}
          compareIds={compareIds}
          weather={weather.data}
          weatherPending={weather.isPending}
          onRetryWeather={() => void weather.refetch()}
          onFilters={panelView === "team" ? setTeamFilters : changeFilters}
          onRegion={chooseRegion}
          onDestination={chooseDestination}
          onRevisit={(id, coordinates) => chooseDestination(id, undefined, coordinates)}
          onSelect={(id) => selectPokemon(id, true)}
          onHover={setHoveredId}
          onRemove={togglePokemon}
          onLead={chooseCompanion}
          onCompare={compare}
          onOpenCompare={() => setCompareOpen(true)}
          onView={showPanel}
          onAtlas={chooseAtlas}
          onCloseMobile={closePanel}
        />
        <section
          className="map-stage"
          aria-label="Mapa de expedición"
          data-view-longitude={camera.coordinates[0]}
          data-view-latitude={camera.coordinates[1]}
          data-view-zoom={camera.zoom}
          data-view-bounds={boundsFingerprint(camera.bounds)}
          data-detail-open={detailOpen}
          data-scanning={scanning}
          data-radar-results={radarFindings !== null}
          data-scope={scope}
        >
          <MapLoader
            region={region}
            site={site}
            scope={scope}
            sightings={mapSightings}
            radarEntries={radarEntries}
            onRadarLayout={setRadarLayout}
            selectedId={selectedId}
            hoveredId={hoveredId}
            discovered={discovered}
            visited={visited}
            onSelect={(entry) => startEncounter(entry.pokemon.id, entry)}
            onHover={setHoveredId}
            onDestination={chooseDestination}
            onRegion={chooseRegion}
            onSurvey={scanAt}
            cameraCommand={cameraCommand}
            initialCamera={initialCamera}
            historyCamera={historyCamera}
            resetKey={resetKey}
            detailOpen={detailOpen}
            mapMode={mapMode}
            scanOrigin={scanOrigin}
            scanKey={scanKey}
            onMoveEnd={onCameraMove}
            onCameraActivity={onCameraActivity}
          />
          {(scope === "site" || atmospherePreview !== "live") && (
            <Atmosphere weather={weather.data} preview={atmospherePreview} />
          )}
          <div className="expedition-map-topbar">
            <LocationTrail
              scope={scope}
              region={region}
              site={site}
              awayFromSite={awayFromSite}
              onAtlas={chooseAtlas}
              onRegion={() => chooseRegion(region.id)}
              onPlaces={() => showPanel("destinations")}
              ambientLabel={
                atmospherePreview === "live"
                  ? undefined
                  : `Vista previa · ${{ sun: "Sol", cloud: "Nubes", rain: "Lluvia", snow: "Nieve", storm: "Tormenta", night: "Noche" }[atmospherePreview]}`
              }
            />
          </div>
          <MapControls
            mode={mapMode}
            scope={scope}
            onMode={(value) => {
              cancelScan();
              setMapMode(value);
            }}
            onRecenter={recenter}
            onCamera={(action) => {
              pendingRevisit.current = null;
              pendingDestination.current = null;
              if (action !== "north") {
                const url = new URL(window.location.href);
                for (const key of ["lng", "lat", "zoom"]) url.searchParams.delete(key);
                window.history.replaceState(null, "", url);
              }
              setCameraCommand((current) => ({ action, serial: current.serial + 1 }));
            }}
            weather={weather.data}
            preview={atmospherePreview}
            onPreview={setAtmospherePreview}
          />
          {scope === "site" && !detailOpen && (
            <div className="map-viewfinder" aria-hidden="true">
              <span />
              <i />
            </div>
          )}
          <AnimatePresence>
            {travel && (
              <motion.div
                className="travel-banner"
                key={travel.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: [0, 1, 1, 0], y: [12, 0, 0, -8], scale: [0.96, 1, 1, 1] }}
                transition={{ duration: 1.25, times: [0, 0.2, 0.72, 1] }}
                onAnimationComplete={() =>
                  setTravel((current) => (current?.id === travel.id ? null : current))
                }
              >
                <Compass size={19} />
                <span>{travel.label}</span>
              </motion.div>
            )}
          </AnimatePresence>
          {scope === "atlas" && (
            <div className="atlas-map-heading">
              <span className="mono">34° — 55° S</span>
              <h2>
                Argentina,
                <br />
                <em>por descubrir.</em>
              </h2>
              <p>
                Elegí un paisaje en el mapa
                <br />y empezá tu expedición.
              </p>
            </div>
          )}
          {scope === "region" && (
            <div className="region-map-heading">
              <span className="section-kicker">{region.biome}</span>
              <h2>{region.name}</h2>
              <p>Elegí uno de sus {regionDestinations(regionId).length} lugares para explorar.</p>
            </div>
          )}
          {scope === "site" && (
            <div className="site-map-caption">
              <MapPin size={13} />
              <span>{HABITATS[site.habitat].label}</span>
              <span className="caption-dot" />
              <span>
                {inViewport} {inViewport === 1 ? "señal" : "señales"} en esta vista
              </span>
            </div>
          )}
          <button
            className={`mobile-results-button ${detailOpen ? "is-hidden" : ""}`}
            onClick={() => showPanel(scope === "site" ? "signals" : "destinations")}
          >
            <BookOpen size={16} />
            <span>
              {panelView === "team"
                ? "Mi equipo"
                : panelView === "journal"
                  ? "Cuaderno"
                  : scope === "site"
                    ? "Ver señales"
                    : "Elegir destino"}
            </span>
            <ChevronRight size={15} />
          </button>
          {scope === "site" ? (
            <ExpeditionDock
              team={team}
              scanning={scanning}
              blocked={scanning || cameraMoving || camera.zoom < 13}
              detailOpen={detailOpen}
              findings={radarFindings}
              radarLayout={radarLayout}
              known={discovered}
              status={
                cameraMoving
                  ? "Ajustando a la vista…"
                  : camera.zoom < 13
                    ? "Acercá el mapa para explorar"
                    : radarFindings
                      ? `${radarFindings.entries.length} ${radarFindings.entries.length === 1 ? "rastro encontrado" : "rastros encontrados"}`
                      : inViewport === 0
                        ? "No hay señales en esta vista"
                        : listOpen && !panelCollapsed
                          ? `${inViewport} ${inViewport === 1 ? "señal" : "señales"} en esta vista`
                          : `${inViewport} ${inViewport === 1 ? "señal" : "señales"} cerca · renovación en ${living.seconds}s`
              }
              emptyAction={
                !cameraMoving &&
                !scanning &&
                camera.zoom >= 13 &&
                inViewport === 0 &&
                !radarFindings
                  ? filterCount(filters) > 0 || filters.search.trim().length > 0
                    ? { label: "Revisar filtros", onClick: () => showPanel("signals") }
                    : { label: "Volver al lugar", onClick: recenter }
                  : undefined
              }
              onScan={(keyboard) => scanAt(camera.coordinates, undefined, keyboard)}
              onRenew={renew}
              onTeam={() => showPanel("team")}
              onCompanionTypes={filterByCompanion}
              companionFilterActive={companionFilterActive}
              activeFilterCount={filterCount(filters) + Number(filters.search.trim().length > 0)}
              onSignals={() => showPanel("signals")}
              onChoose={(entry) => startEncounter(entry.pokemon.id, entry)}
              onPreview={setHoveredId}
              onCloseFindings={() => {
                setRadarFindings(null);
                setHoveredId(null);
                window.requestAnimationFrame(() =>
                  document.querySelector<HTMLButtonElement>(".field-radar-button")?.focus(),
                );
              }}
            />
          ) : (
            <div className="map-exploration-prompt">
              <span className="prompt-pulse" />
              <span>
                {scope === "atlas"
                  ? "5 regiones · 14 lugares reales"
                  : "Los destinos también se pueden elegir en el mapa"}
              </span>
              <button onClick={() => setListOpen(true)}>
                Ver destinos
                <ArrowRight size={14} />
              </button>
            </div>
          )}
          <PokemonDetailPanel
            id={selectedId}
            regionId={selectedSighting && scope === "site" ? regionId : null}
            team={team}
            collected={journal.collection.some((entry) => entry.pokemonId === selectedId)}
            onClose={closeDetail}
            onToggleTeam={togglePokemon}
            onCompare={compareFromDetail}
            onCatch={selectedSighting && scope === "site" ? startEncounter : undefined}
            encounterReason={selectedSighting?.reason}
            destinationName={
              selectedSighting ? encounterEnvironment(site, selectedSighting).name : undefined
            }
          />
        </section>
      </main>
      {encounterId !== null && (
        <CaptureEncounter
          key={encounterId}
          id={encounterId}
          setting={encounterSetting ?? encounterEnvironment(site)}
          weather={weather.data}
          preview={atmospherePreview}
          soundEnabled={soundEnabled}
          teamFull={team.length >= TEAM_LIMIT && !team.includes(encounterId)}
          journalStorageStatus={journal.storageStatus}
          teamStorageStatus={teamStorageStatus}
          onSound={() => setSoundEnabled((value) => !value)}
          onCapture={capturePokemon}
          onCollection={() => {
            setEncounterId(null);
            setSelectedId(null);
            showPanel("journal");
          }}
          onDepart={(id) => {
            setDepartedIds((current) => [...new Set([...current, id])]);
            living.dismiss(id);
            setSelectedId(null);
          }}
          onClose={() => setEncounterId(null)}
          onNext={continueExploring}
        />
      )}
      <AnimatePresence>
        {toast && (
          <motion.div
            className="app-toast"
            role="status"
            initial={{ y: 12, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 12, opacity: 0 }}
          >
            <Check size={16} />
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
      {compareOpen && compareIds.length === 2 && (
        <CompareDialog
          ids={[compareIds[0]!, compareIds[1]!]}
          onChange={(index, id) =>
            setCompareIds((current) => current.map((value, i) => (i === index ? id : value)))
          }
          onClose={() => setCompareOpen(false)}
        />
      )}
      {aboutOpen && <AboutDialog onClose={() => setAboutOpen(false)} />}
    </div>
  );
}
