import { getRegion, type RegionId } from "./regions";
import { getDestination, regionDestinations } from "./destinations";
import { findPokemon } from "./catalog";
import { parseSharedCamera, type SharedCamera } from "./camera-link";
import type { MapMode, MapScope } from "@/components/map/expedition-map";

export type Navigation = {
  regionId: RegionId;
  siteId: string;
  selectedId: number | null;
  mapMode: MapMode;
  scope: MapScope;
  round: number;
  camera: SharedCamera | null;
};
export function readNavigation(params: Record<string, string | string[] | undefined>): Navigation {
  const requestedSite = getDestination(typeof params.place === "string" ? params.place : undefined);
  const region = getRegion(
    requestedSite?.regionId ?? (typeof params.region === "string" ? params.region : undefined),
  );
  const site = requestedSite ?? regionDestinations(region.id)[0]!;
  const requestedId = typeof params.pokemon === "string" ? Number(params.pokemon) : null;
  const selectedId = requestedId !== null && findPokemon(requestedId) ? requestedId : null;
  const mapMode =
    params.view === "satellite" ? "satellite" : params.view === "relief" ? "relief" : "map";
  const scope = requestedSite || selectedId !== null ? "site" : params.region ? "region" : "atlas";
  const round = typeof params.run === "string" ? Number(params.run) : 0;
  return {
    regionId: region.id,
    siteId: site.id,
    selectedId,
    mapMode,
    scope,
    round: Number.isSafeInteger(round) && round >= 0 && round < 10000 ? round : 0,
    camera: requestedSite ? parseSharedCamera(params) : null,
  };
}
