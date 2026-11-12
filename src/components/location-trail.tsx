"use client";
import { ArrowLeft, Compass, MapPin, PanelLeftOpen } from "lucide-react";
import { HABITATS, regionDestinations, type Destination } from "@/lib/destinations";
import type { Region } from "@/lib/regions";
import type { MapScope } from "@/components/map/expedition-map";
export function LocationTrail({
  scope,
  region,
  site,
  awayFromSite,
  onAtlas,
  onRegion,
  onPlaces,
  ambientLabel,
}: {
  scope: MapScope;
  region: Region;
  site: Destination;
  awayFromSite: boolean;
  onAtlas: () => void;
  onRegion: () => void;
  onPlaces: () => void;
  ambientLabel?: string;
}) {
  return (
    <nav className="location-trail" aria-label="Navegación de la expedición">
      <button
        className="location-back"
        aria-label={scope === "site" ? `Volver a ${region.name}` : "Volver al atlas"}
        onClick={scope === "site" ? onRegion : onAtlas}
      >
        {scope === "atlas" ? <Compass size={20} /> : <ArrowLeft size={20} />}
      </button>
      <div>
        <strong>
          {scope === "atlas"
            ? "Atlas de Argentina"
            : scope === "region"
              ? region.name
              : awayFromSite
                ? "Zona explorada"
                : site.name}
        </strong>
        <span>
          {awayFromSite && scope === "site"
            ? `Base: ${site.name}${ambientLabel ? ` · ${ambientLabel}` : ""}`
            : (ambientLabel ??
              (scope === "atlas"
                ? "Elegí tu próxima aventura"
                : scope === "region"
                  ? `${regionDestinations(region.id).length} destinos · ${region.biome}`
                  : HABITATS[site.habitat].label))}
        </span>
      </div>
      <button className="location-places" aria-label="Elegir un lugar" onClick={onPlaces}>
        <PanelLeftOpen size={17} />
        <span>Lugares</span>
      </button>
      {scope === "site" && (
        <span className="location-live" title="Lugar activo">
          <MapPin size={12} />
        </span>
      )}
    </nav>
  );
}
