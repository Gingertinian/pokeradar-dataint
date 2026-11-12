"use client";

import dynamic from "next/dynamic";
import type { MapViewProps } from "@/components/map/expedition-map";

export type { MapViewProps } from "@/components/map/expedition-map";

const ClientMapView = dynamic<MapViewProps>(
  () => import("@/components/map/expedition-map").then((module) => module.MapView),
  {
    ssr: false,
    loading: () => (
      <div className="map-view" aria-busy="true">
        <div className="map-loading" role="status">
          Cargando mapa…
        </div>
      </div>
    ),
  },
);

export function MapLoader(props: MapViewProps) {
  return <ClientMapView {...props} />;
}
