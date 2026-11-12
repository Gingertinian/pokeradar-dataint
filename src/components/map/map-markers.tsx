"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Marker, type Map as MapLibreMap } from "maplibre-gl";
import { motion, useReducedMotion } from "framer-motion";
import { PokemonImage } from "@/components/ui/pokemon-image";
import { pokemonName, animatedSpriteUrl, artworkUrl } from "@/lib/pokemon";
import type { Coordinate, EncounterCluster } from "@/lib/geography";
import type { Sighting } from "@/lib/regions";
import { getRegion, type Region } from "@/lib/regions";
import { regionDestinations, HABITATS, REGION_GUIDES, type Destination } from "@/lib/destinations";
import { Check, Footprints, MapPin, Zap } from "lucide-react";
import { LABEL_RIGHT_INSET } from "@/lib/label-placement";

function MapAnchor({
  map,
  coordinates,
  children,
}: {
  map: MapLibreMap;
  coordinates: Coordinate;
  children: ReactNode;
}) {
  const [element] = useState(() => document.createElement("div"));
  const [longitude, latitude] = coordinates;

  useEffect(() => {
    const marker = new Marker({ element, anchor: "center", subpixelPositioning: true })
      .setLngLat([longitude, latitude])
      .addTo(map);
    return () => {
      marker.remove();
    };
  }, [map, element, longitude, latitude]);

  return createPortal(children, element);
}

function GeographicLabel({
  map,
  coordinates,
  offset,
  color,
  children,
}: {
  map: MapLibreMap;
  coordinates: Coordinate;
  offset: Coordinate;
  color: string;
  children: ReactNode;
}) {
  const point = map.project(coordinates);
  const container = map.getContainer();
  if (
    point.x < -24 ||
    point.y < -24 ||
    point.x > container.clientWidth + 24 ||
    point.y > container.clientHeight + 24
  )
    return null;
  const width = container.clientWidth < 600 ? 145 : 174;
  const left = Math.max(
    12 - point.x,
    Math.min(offset[0], container.clientWidth - point.x - width - LABEL_RIGHT_INSET),
  );
  const top = Math.max(108 - point.y, Math.min(offset[1], container.clientHeight - point.y - 135));
  const endX = Math.max(left, Math.min(0, left + width));
  const endY = Math.max(top, Math.min(0, top + 58));
  return (
    <MapAnchor map={map} coordinates={coordinates}>
      <div className="geographic-map-pin">
        <span
          className="geographic-pin-leader"
          style={{
            width: Math.hypot(endX, endY),
            transform: `rotate(${Math.atan2(endY, endX)}rad)`,
            backgroundColor: color,
          }}
          aria-hidden="true"
        />
        <span
          className="geographic-pin-point"
          style={{ backgroundColor: color }}
          aria-hidden="true"
        />
        <div className="geographic-pin-label" style={{ left, top, width }}>
          {children}
        </div>
      </div>
    </MapAnchor>
  );
}

export function EncounterMarker({
  map,
  sighting,
  selected,
  hovered,
  discovered,
  mystery = false,
  boosted = false,
  radarNumber = 0,
  onSelect,
  onHover,
}: {
  map: MapLibreMap;
  sighting: Sighting;
  selected: boolean;
  hovered: boolean;
  discovered: boolean;
  mystery?: boolean;
  boosted?: boolean;
  radarNumber?: number;
  onSelect: (sighting: Sighting) => void;
  onHover: (id: number | null) => void;
}) {
  const reducedMotion = useReducedMotion();
  const name = pokemonName(sighting.pokemon.name);
  const id = sighting.pokemon.id;
  const unknown = mystery && !discovered;
  const action = unknown
    ? "Investigar señal sin identificar en el mapa"
    : `Iniciar encuentro con ${name}`;

  return (
    <MapAnchor map={map} coordinates={sighting.coordinates}>
      <motion.button
        type="button"
        className={`encounter-marker ${selected ? "is-selected" : ""} ${hovered ? "is-hovered" : ""} ${discovered ? "is-discovered" : ""} ${mystery && !discovered ? "is-mystery" : ""} ${radarNumber ? "is-radar-target" : ""}`}
        data-pokemon-id={id}
        aria-label={`${radarNumber ? `Rastro ${radarNumber}: ` : ""}${action}${boosted ? ", favorecido por el clima" : ""}`}
        initial={reducedMotion ? false : { opacity: 0, scale: 0.7 }}
        animate={{ opacity: 1, scale: selected ? 1.15 : 1 }}
        whileHover={reducedMotion ? undefined : { scale: selected ? 1.2 : 1.1 }}
        whileTap={reducedMotion ? undefined : { scale: 0.96 }}
        transition={{ duration: reducedMotion ? 0 : 0.2 }}
        onClick={(event) => {
          event.stopPropagation();
          onSelect(sighting);
        }}
        onPointerEnter={() => onHover(id)}
        onPointerLeave={() => onHover(null)}
        onFocus={() => onHover(id)}
        onBlur={() => onHover(null)}
        onKeyDown={(event) => {
          if (event.key !== "Escape") event.stopPropagation();
        }}
      >
        <span className="encounter-label">
          {mystery && !discovered ? "Señal sin identificar" : name}
        </span>
        <span className="encounter-selection-ring" aria-hidden="true" />
        {radarNumber > 0 && (
          <>
            <span className="encounter-radar-ring" aria-hidden="true" />
            <span className="encounter-radar-number" aria-hidden="true">
              {String(radarNumber).padStart(2, "0")}
            </span>
          </>
        )}
        <PokemonImage
          id={id}
          name={name}
          size={56}
          src={reducedMotion ? undefined : animatedSpriteUrl(id)}
          decorative
          className="encounter-sprite pixel-art"
        />
        <span className="encounter-foot" aria-hidden="true" />
        {mystery && !discovered && (
          <span className="mystery-mark" aria-hidden="true">
            <Footprints size={16} />
          </span>
        )}
        {boosted && (
          <span className="weather-boost-dot" aria-label="Favorecido por el clima">
            <Zap size={10} />
          </span>
        )}
        {discovered && <span className="encounter-seen-dot" aria-hidden="true" />}
      </motion.button>
    </MapAnchor>
  );
}

export function ClusterMarker({
  map,
  cluster,
  onExpand,
}: {
  map: MapLibreMap;
  cluster: EncounterCluster<Sighting>;
  onExpand: () => void;
}) {
  return (
    <MapAnchor map={map} coordinates={cluster.coordinates}>
      <button
        className="encounter-cluster"
        onClick={onExpand}
        aria-label={`Acercar para ver ${cluster.items.length} Pokémon agrupados`}
      >
        <span className="cluster-ball" aria-hidden="true" />
        <span>{cluster.items.length}</span>
        <span className="cluster-plus" aria-hidden="true">
          +
        </span>
      </button>
    </MapAnchor>
  );
}

export function ScanPulse({ map, coordinates }: { map: MapLibreMap; coordinates: Coordinate }) {
  return (
    <MapAnchor map={map} coordinates={coordinates}>
      <div className="geo-scan-pulse" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
    </MapAnchor>
  );
}

export function RegionMarker({
  map,
  region,
  onSelect,
}: {
  map: MapLibreMap;
  region: Region;
  onSelect: () => void;
}) {
  const sites = regionDestinations(region.id);
  const point = sites[0]?.area.center ?? region.center;
  return (
    <GeographicLabel
      map={map}
      coordinates={point}
      offset={
        region.id === "pampa"
          ? [20, -78]
          : region.id === "cordillera"
            ? [-190, 70]
            : region.id === "costa"
              ? [24, 12]
              : [18, -28]
      }
      color={region.color}
    >
      <motion.button
        className="atlas-region-marker"
        onClick={onSelect}
        aria-label={`Explorar ${region.name}, ${sites.length} lugares`}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ y: -3 }}
      >
        <span className="region-marker-symbol" style={{ backgroundColor: region.color }}>
          <PokemonImage
            id={REGION_GUIDES[region.id]}
            name=""
            size={60}
            src={artworkUrl(REGION_GUIDES[region.id])}
            decorative
          />
        </span>
        <span>
          <strong>{region.shortName}</strong>
          <small>{sites.length} lugares para explorar</small>
        </span>
      </motion.button>
    </GeographicLabel>
  );
}

export function DestinationMarker({
  map,
  site,
  index,
  offset,
  visited,
  onSelect,
}: {
  map: MapLibreMap;
  site: Destination;
  index: number;
  offset: Coordinate;
  visited: boolean;
  onSelect: () => void;
}) {
  const region = getRegion(site.regionId);
  return (
    <GeographicLabel map={map} coordinates={site.area.center} offset={offset} color={region.color}>
      <motion.button
        className="destination-map-marker"
        onClick={onSelect}
        aria-label={`Explorar ${site.name}`}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: index * 0.07 }}
        whileHover={{ y: -4 }}
      >
        <span className="destination-marker-pin" style={{ background: region.color }}>
          {visited ? <Check size={17} /> : <MapPin size={17} />}
        </span>
        <span>
          <strong>{site.name}</strong>
          <small>{HABITATS[site.habitat].label}</small>
        </span>
      </motion.button>
    </GeographicLabel>
  );
}
