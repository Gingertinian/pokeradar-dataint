"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AttributionControl,
  Map as MapLibreMap,
  ScaleControl,
  setWorkerUrl,
  type StyleSpecification,
} from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  addTerrainReference,
  sampleVisibleTerrain,
  terrainFingerprint,
  type TerrainSample,
} from "@/lib/map-terrain";
import { useMobile } from "@/hooks/use-mobile";
import type { CameraCommand } from "./map-controls";
import {
  boundsOf,
  regionDestinations,
  type Destination,
  type ExpeditionSighting,
} from "@/lib/destinations";
import {
  boundsFingerprint,
  clusterEncounters,
  type Coordinate,
  type MapBounds,
} from "@/lib/geography";
import { REGIONS, type Region, type RegionId } from "@/lib/regions";
import type { SharedCamera } from "@/lib/camera-link";
import {
  destinationLabelOffsets,
  radarPlacement,
  type RadarPlacement,
} from "@/lib/label-placement";
import {
  ClusterMarker,
  EncounterMarker,
  ScanPulse,
  DestinationMarker,
  RegionMarker,
} from "@/components/map/map-markers";

export type MapMode = "map" | "satellite" | "relief";
export type MapScope = "atlas" | "region" | "site";
export type MapViewProps = {
  initialCamera: SharedCamera | null;
  historyCamera: { camera: SharedCamera | null; serial: number };
  cameraCommand: CameraCommand;
  region: Region;
  site: Destination;
  scope: MapScope;
  sightings: ExpeditionSighting[];
  radarEntries: ExpeditionSighting[];
  onRadarLayout: (layout: RadarPlacement) => void;
  selectedId: number | null;
  hoveredId: number | null;
  discovered: ReadonlySet<string>;
  visited: ReadonlySet<string>;
  onSelect: (sighting: ExpeditionSighting) => void;
  onHover: (id: number | null) => void;
  onDestination: (id: string) => void;
  onRegion: (id: RegionId) => void;
  onSurvey: (point: Coordinate) => void;
  resetKey: number;
  detailOpen: boolean;
  mapMode: MapMode;
  scanOrigin: Coordinate | null;
  scanKey: number;
  onMoveEnd: (
    coordinates: Coordinate,
    zoom: number,
    bounds: MapBounds,
    terrain?: TerrainSample[],
  ) => void;
  onCameraActivity: (moving: boolean, userInitiated?: boolean) => void;
};

setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).toString());
const SATELLITE: StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: "raster",
      tiles: [
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      ],
      tileSize: 256,
      maxzoom: 17,
      attribution: "Imagery © Esri, Vantor, Earthstar Geographics, GIS User Community",
    },
  },
  layers: [
    { id: "imagery", type: "raster", source: "imagery", paint: { "raster-fade-duration": 250 } },
  ],
};
const styleFor = (mode: MapMode) =>
  mode === "satellite" ? SATELLITE : "https://tiles.openfreemap.org/styles/liberty";
const duration = (ms: number) =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 0 : ms;

function decorate(map: MapLibreMap, site: Destination, mode: MapMode, scope: MapScope) {
  if (!map.getStyle()?.layers) return;
  for (const layer of map.getStyle().layers ?? []) {
    if (layer.type === "symbol" && "source-layer" in layer && layer["source-layer"] === "poi")
      map.setLayoutProperty(layer.id, "visibility", "none");
    if (layer.type === "fill" && "source-layer" in layer && layer["source-layer"] === "water")
      map.setPaintProperty(layer.id, "fill-color", "#8fcbd0");
    if (
      mode === "map" &&
      layer.type === "fill" &&
      "source-layer" in layer &&
      layer["source-layer"] === "landcover"
    )
      map.setPaintProperty(layer.id, "fill-color", "#b5d19a");
  }
  addTerrainReference(map);
  const relief = mode === "relief" && scope !== "atlas";
  if (relief && !map.getSource("terrain-dem")) {
    // Separate DEM sources preserve the quality of terrain and hillshade.
    for (const id of ["terrain-dem", "hillshade-dem"])
      map.addSource(id, {
        type: "raster-dem",
        url: "https://tiles.mapterhorn.com/tilejson.json",
        tileSize: 512,
        maxzoom: 12,
        encoding: "terrarium",
      });
    const before = map.getStyle().layers?.find((layer) => layer.type === "symbol")?.id;
    map.addLayer(
      {
        id: "land-relief",
        type: "hillshade",
        source: "hillshade-dem",
        paint: {
          "hillshade-exaggeration": 0.4,
          "hillshade-shadow-color": "#546b59",
          "hillshade-highlight-color": "#f8f5df",
        },
      },
      before,
    );
  }
  if (map.getLayer("land-relief"))
    map.setLayoutProperty("land-relief", "visibility", relief ? "visible" : "none");
  map.setTerrain(relief ? { source: "terrain-dem", exaggeration: 1.25 } : null);
}

function padding(map: MapLibreMap, detail: boolean, mobile: boolean) {
  const panel = map
    .getContainer()
    .closest(".map-stage")
    ?.querySelector<HTMLElement>(".pokemon-detail");
  return {
    top: mobile ? 112 : 110,
    left: mobile ? 36 : 65,
    right: detail && !mobile ? (panel?.offsetWidth ?? 354) + 40 : mobile ? 50 : 80,
    bottom: detail && mobile ? (panel?.offsetHeight ?? 400) + 12 : mobile ? 165 : 150,
  };
}

function MapInstance(props: MapViewProps & { onRetry: () => void }) {
  const {
    region,
    site,
    scope,
    sightings,
    radarEntries,
    onRadarLayout,
    selectedId,
    hoveredId,
    discovered,
    visited,
    onSelect,
    onHover,
    onDestination,
    onRegion,
    resetKey,
    detailOpen,
    mapMode,
    scanOrigin,
    scanKey,
    onMoveEnd,
    onCameraActivity,
    onRetry,
    onSurvey,
    cameraCommand,
    historyCamera,
  } = props;
  const [map, setMap] = useState<MapLibreMap | null>(null);
  const [zoom, setZoom] = useState(scope === "atlas" ? 4 : 14);
  const [error, setError] = useState<string | null>(null);
  const initial = useRef({ site, scope, mapMode });
  const current = useRef({
    site,
    scope,
    mapMode,
    onMoveEnd,
    onCameraActivity,
    onSurvey,
  });
  const baseMode = useRef(mapMode === "satellite");
  const previousMode = useRef(mapMode);
  const framed = useRef(false);
  const sharedCamera = useRef(props.initialCamera);
  const appliedHistory = useRef(0);
  const mobile = useMobile();
  const mobileRef = useRef(mobile);
  useEffect(() => {
    mobileRef.current = mobile;
  }, [mobile]);
  useEffect(() => {
    current.current = {
      site,
      scope,
      mapMode,
      onMoveEnd,
      onCameraActivity,
      onSurvey,
    };
  }, [site, scope, mapMode, onMoveEnd, onSurvey, onCameraActivity]);
  const attach = useCallback((container: HTMLDivElement | null) => {
    if (!container) return;
    let instance: MapLibreMap | undefined;
    let disposed = false;
    let timeout: number | undefined;
    let resizeObserver: ResizeObserver | undefined;
    const fail = (message: string) => {
      if (!disposed) setError(message);
    };
    try {
      instance = new MapLibreMap({
        container,
        style: styleFor(initial.current.mapMode),
        center: initial.current.scope === "atlas" ? [-65, -39] : initial.current.site.area.center,
        zoom: initial.current.scope === "atlas" ? 3.5 : 14,
        minZoom: 2.8,
        maxZoom: initial.current.mapMode === "satellite" ? 17 : 19,
        maxPitch: 65,
        renderWorldCopies: false,
        attributionControl: false,
        locale: {
          "Map.Title": "Mapa interactivo de expedición",
          "NavigationControl.ZoomIn": "Acercar mapa",
          "NavigationControl.ZoomOut": "Alejar mapa",
          "NavigationControl.ResetBearing": "Restablecer el norte",
          "AttributionControl.ToggleAttribution": "Mostrar créditos del mapa",
        },
      });
      const target = instance;
      resizeObserver = new ResizeObserver(() => {
        if (!disposed) target.resize();
      });
      resizeObserver.observe(container);
      let lastView = "";
      const emit = () => {
        if (disposed || !framed.current) return;
        current.current.onCameraActivity(false);
        const c = target.unproject([
            target.getContainer().clientWidth / 2,
            target.getContainer().clientHeight / 2,
          ]),
          b = target.getBounds();
        const bounds: MapBounds = [b.getWest(), b.getSouth(), b.getEast(), b.getNorth()];
        const terrain = sampleVisibleTerrain(target, current.current.site);
        const signature = [
          c.lng.toFixed(5),
          c.lat.toFixed(5),
          target.getZoom().toFixed(2),
          boundsFingerprint(bounds),
          terrainFingerprint(terrain),
          current.current.site.id,
        ].join(":");
        if (signature === lastView) return;
        lastView = signature;
        setZoom(target.getZoom());
        current.current.onMoveEnd([c.lng, c.lat], target.getZoom(), bounds, terrain);
      };
      target.on("load", () => {
        if (!disposed) {
          window.clearTimeout(timeout);
          setError(null);
          setMap(target);
          current.current.onCameraActivity(true);
        }
      });
      target.on("style.load", () => {
        const v = current.current;
        decorate(target, v.site, v.mapMode, v.scope);
      });
      target.on("moveend", emit);
      target.on("idle", emit);
      target.on("movestart", (event) =>
        current.current.onCameraActivity(true, Boolean(event.originalEvent)),
      );
      target.on("click", (event) => {
        if ((event.originalEvent.target as HTMLElement)?.closest("button")) return;
        const point: Coordinate = [event.lngLat.lng, event.lngLat.lat];
        if (current.current.scope === "site") current.current.onSurvey(point);
      });
      target.on("error", (event) => {
        if (!target.isStyleLoaded())
          fail("La cartografía no está disponible. Podés reintentar o seguir desde la lista.");
        else if (
          "sourceId" in event &&
          (event.sourceId === "terrain-dem" || event.sourceId === "hillshade-dem")
        )
          target.setTerrain(null);
      });
      target.on("webglcontextlost", () =>
        fail("El navegador interrumpió la vista gráfica. Podés reabrir el mapa."),
      );
      target.addControl(new ScaleControl({ maxWidth: 90, unit: "metric" }), "bottom-left");
      target.addControl(
        new AttributionControl({
          compact: true,
          customAttribution:
            '<a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">Lugares © OpenStreetMap</a>',
        }),
        "bottom-right",
      );
      const credits = target.getContainer().querySelector("details.maplibregl-ctrl-attrib");
      if (credits instanceof HTMLDetailsElement) {
        credits.classList.remove("maplibregl-compact-show");
        credits.open = false;
      }
      timeout = window.setTimeout(
        () => fail("El mapa está tardando en responder. Revisá la conexión y volvé a intentarlo."),
        18000,
      );
    } catch {
      fail("No pudimos iniciar el mapa. El explorador sigue disponible.");
    }
    return () => {
      disposed = true;
      resizeObserver?.disconnect();
      window.clearTimeout(timeout);
      instance?.remove();
    };
  }, []);
  useEffect(() => {
    if (!map || cameraCommand.serial === 0) return;
    if (cameraCommand.action === "in") map.zoomIn({ duration: duration(280) });
    else if (cameraCommand.action === "out") map.zoomOut({ duration: duration(280) });
    else map.easeTo({ bearing: 0, duration: duration(350) });
  }, [map, cameraCommand]);
  useEffect(() => {
    if (!map) return;
    const switched = previousMode.current !== mapMode;
    previousMode.current = mapMode;
    map.setMaxZoom(mapMode === "satellite" ? 17 : 19);
    if (baseMode.current !== (mapMode === "satellite")) {
      baseMode.current = mapMode === "satellite";
      map.setStyle(styleFor(mapMode));
    } else decorate(map, site, mapMode, scope);
    if (switched)
      map.easeTo({
        pitch: mapMode === "relief" && scope !== "atlas" ? 52 : 0,
        bearing: mapMode === "relief" && scope === "site" ? -16 : 0,
        duration: duration(350),
      });
  }, [map, mapMode, site, scope]);
  useEffect(() => {
    if (!map) return;
    const mode = current.current.mapMode;
    if (sharedCamera.current && scope === "site" && resetKey === 0) {
      const saved = sharedCamera.current;
      sharedCamera.current = null;
      framed.current = true;
      map.jumpTo({
        center: saved.coordinates,
        zoom: Math.min(saved.zoom, mode === "satellite" ? 17 : 19),
        pitch: mode === "relief" ? 52 : 0,
        bearing: mode === "relief" ? -16 : 0,
      });
      return;
    }
    let bounds: MapBounds;
    if (scope === "atlas") bounds = [-73.5, -51.2, -53.8, -24.8];
    else if (scope === "region")
      bounds = boundsOf(regionDestinations(region.id).map((entry) => entry.area.center));
    else bounds = site.viewBounds;
    framed.current = true;
    map.fitBounds(
      [
        [bounds[0], bounds[1]],
        [bounds[2], bounds[3]],
      ],
      {
        padding: padding(map, false, mobileRef.current),
        maxZoom: scope === "site" ? (mode === "satellite" ? 16.5 : 17.6) : 14.4,
        duration: duration(scope === "atlas" ? 1300 : 1000),
        pitch: mode === "relief" && scope !== "atlas" ? 52 : 0,
        bearing: mode === "relief" && scope === "site" ? -16 : 0,
      },
    );
  }, [map, scope, site, region.id, resetKey]);
  useEffect(() => {
    if (
      !map ||
      !historyCamera.camera ||
      scope !== "site" ||
      historyCamera.serial === appliedHistory.current
    )
      return;
    appliedHistory.current = historyCamera.serial;
    const saved = historyCamera.camera,
      mode = current.current.mapMode;
    map.easeTo({
      center: saved.coordinates,
      zoom: Math.min(saved.zoom, mode === "satellite" ? 17 : 19),
      pitch: mode === "relief" ? 52 : 0,
      bearing: mode === "relief" ? -16 : 0,
      duration: duration(450),
    });
  }, [map, historyCamera, scope]);
  const selected = sightings.find((entry) => entry.pokemon.id === selectedId);
  const longitude = selected?.coordinates[0],
    latitude = selected?.coordinates[1];
  useEffect(() => {
    if (!map || scope !== "site" || longitude === undefined || latitude === undefined) return;
    const focus = (immediate = false) => {
      const inset = padding(map, detailOpen, mobile);
      map.flyTo({
        center: [longitude, latitude],
        zoom: Math.min(mapMode === "satellite" ? 16.8 : 18, Math.max(16, map.getZoom())),
        offset: [(inset.left - inset.right) / 2, (inset.top - inset.bottom) / 2],
        duration: immediate ? 0 : duration(650),
      });
    };
    focus();
    const resize = () => focus(true);
    map.on("resize", resize);
    return () => {
      map.off("resize", resize);
    };
  }, [map, scope, selectedId, longitude, latitude, detailOpen, mobile, mapMode]);
  useEffect(() => {
    if (!map || !radarEntries.length) return;
    const place = () => {
      const container = map.getContainer();
      const points = radarEntries.map((entry) => map.project(entry.coordinates));
      onRadarLayout(radarPlacement(points, container.clientWidth, container.clientHeight, mobile));
    };
    place();
    map.on("resize", place);
    return () => {
      map.off("resize", place);
    };
  }, [map, radarEntries, onRadarLayout, mobile]);
  const groups = useMemo(() => {
    const fixed = sightings.filter(
      (entry) =>
        entry.pokemon.id === selectedId ||
        entry.pokemon.id === hoveredId ||
        radarEntries.some((target) => target.key === entry.key),
    );
    return [
      ...clusterEncounters(
        sightings.filter((entry) => !fixed.includes(entry)),
        zoom,
      ),
      ...fixed.map((entry) => ({ key: entry.key, coordinates: entry.coordinates, items: [entry] })),
    ];
  }, [sightings, selectedId, hoveredId, zoom, radarEntries]);
  const atlas = scope === "atlas" || zoom < 6.4;
  const destinations = !atlas && (scope === "region" || zoom < 13);
  const destinationSites = regionDestinations(region.id);
  const destinationOffsets =
    map && destinations
      ? destinationLabelOffsets(
          destinationSites.map((entry) => map.project(entry.area.center)),
          map.getContainer().clientWidth,
          map.getContainer().clientHeight,
        )
      : [];
  return (
    <section
      className="map-view"
      aria-label={
        scope === "site"
          ? "Mapa de exploración"
          : `Mapa de ${scope === "atlas" ? "Argentina" : region.name}`
      }
      aria-busy={!map && !error}
    >
      <div ref={attach} className="map-canvas" />
      {map &&
        atlas &&
        REGIONS.map((entry) => (
          <RegionMarker
            key={entry.id}
            map={map}
            region={entry}
            onSelect={() => onRegion(entry.id)}
          />
        ))}
      {map &&
        destinations &&
        destinationSites.map((entry, index) => (
          <DestinationMarker
            key={entry.id}
            map={map}
            site={entry}
            index={index}
            offset={destinationOffsets[index]!}
            visited={visited.has(entry.id)}
            onSelect={() => onDestination(entry.id)}
          />
        ))}
      {map &&
        !atlas &&
        !destinations &&
        groups.map((group) => {
          const sighting = group.items[0];
          if (!sighting) return null;
          return group.items.length > 1 ? (
            <ClusterMarker
              key={group.key}
              map={map}
              cluster={group}
              onExpand={() =>
                map.flyTo({
                  center: group.coordinates,
                  zoom: Math.min(map.getZoom() + 1.3, map.getMaxZoom()),
                  duration: duration(500),
                })
              }
            />
          ) : (
            <EncounterMarker
              key={sighting.key}
              map={map}
              sighting={sighting}
              selected={selectedId === sighting.pokemon.id}
              hovered={hoveredId === sighting.pokemon.id}
              discovered={discovered.has(sighting.key)}
              mystery={sighting.mystery}
              boosted={sighting.boosted}
              radarNumber={radarEntries.findIndex((entry) => entry.key === sighting.key) + 1}
              onSelect={() => onSelect(sighting)}
              onHover={onHover}
            />
          );
        })}
      {map && scanOrigin && <ScanPulse key={scanKey} map={map} coordinates={scanOrigin} />}
      {!map && !error && (
        <div className="map-loading" role="status">
          Preparando la expedición…
        </div>
      )}
      {error && (
        <div className="map-message" role="alert">
          <h3>No pudimos abrir el mapa</h3>
          <p>{error}</p>
          <button className="map-retry" onClick={onRetry}>
            Reintentar mapa
          </button>
        </div>
      )}
    </section>
  );
}
export function MapView(props: MapViewProps) {
  const [attempt, setAttempt] = useState(0);
  return <MapInstance key={attempt} {...props} onRetry={() => setAttempt((value) => value + 1)} />;
}
