"use client";
import { useRef, useEffect } from "react";
import { Layers, LocateFixed, Plus, Minus, Navigation2 } from "lucide-react";
import { AtmosphereControl, type AtmospherePreview } from "@/components/atmosphere";
import type { MapMode, MapScope } from "./expedition-map";
import type { Weather } from "@/lib/weather";
export type CameraCommand = { action: "in" | "out" | "north"; serial: number };
export function MapControls({
  mode,
  scope,
  onMode,
  onRecenter,
  onCamera,
  weather,
  preview,
  onPreview,
}: {
  mode: MapMode;
  scope: MapScope;
  onMode: (mode: MapMode) => void;
  onRecenter: () => void;
  onCamera: (action: CameraCommand["action"]) => void;
  weather: Weather | undefined;
  preview: AtmospherePreview;
  onPreview: (value: AtmospherePreview) => void;
}) {
  const menu = useRef<HTMLDetailsElement>(null);
  const recenterLabel =
    scope === "atlas" ? "Centrar atlas" : scope === "region" ? "Centrar región" : "Centrar lugar";
  useEffect(() => {
    const dismiss = (event: MouseEvent) => {
      const target = event.target,
        element = menu.current;
      if (!element?.open || !(target instanceof Element) || element.contains(target)) return;
      element.open = false;
      const atmosphere = element.querySelector<HTMLDetailsElement>(".atmosphere-control");
      if (atmosphere) atmosphere.open = false;
      if (target.closest(".map-canvas") && !target.closest("button")) event.stopPropagation();
    };
    document.addEventListener("click", dismiss, true);
    return () => document.removeEventListener("click", dismiss, true);
  }, []);
  function close(returnFocus = false) {
    const element = menu.current;
    if (!element) return;
    const atmosphere = element.querySelector<HTMLDetailsElement>(".atmosphere-control");
    if (atmosphere) atmosphere.open = false;
    element.open = false;
    if (returnFocus) element.querySelector<HTMLElement>(":scope > summary")?.focus();
  }
  return (
    <div className="game-map-controls" role="group" aria-label="Controles del mapa">
      <details
        className="game-map-settings"
        ref={menu}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            close(true);
          }
        }}
      >
        <summary aria-label="Vista y ambiente" title="Vista y ambiente">
          <Layers size={20} />
        </summary>
        <div className="game-settings-panel">
          <span className="game-setting-label">Vista del mundo</span>
          <div className="game-style-options" role="group" aria-label="Estilo del mapa">
            {(["map", "relief", "satellite"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={mode === value}
                onClick={() => {
                  onMode(value);
                  close(true);
                }}
              >
                {value === "map" ? "Mapa" : value === "relief" ? "Relieve" : "Satélite"}
              </button>
            ))}
          </div>
          <span className="game-setting-label">Ambiente</span>
          <AtmosphereControl
            weather={weather}
            preview={preview}
            onChange={(value) => {
              onPreview(value);
              close(true);
            }}
          />
        </div>
      </details>
      <span className="game-control-divider" />
      <button aria-label={recenterLabel} title={recenterLabel} onClick={onRecenter}>
        <LocateFixed size={20} />
      </button>
      <button aria-label="Acercar mapa" title="Acercar" onClick={() => onCamera("in")}>
        <Plus size={21} />
      </button>
      <button aria-label="Alejar mapa" title="Alejar" onClick={() => onCamera("out")}>
        <Minus size={21} />
      </button>
      <button
        aria-label="Restablecer el norte"
        title="Orientar al norte"
        onClick={() => onCamera("north")}
      >
        <Navigation2 size={18} />
      </button>
    </div>
  );
}
