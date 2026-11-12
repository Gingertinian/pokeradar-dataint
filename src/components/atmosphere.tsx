"use client";

import { useRef } from "react";
import {
  Cloud,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Moon,
  Sun,
  ChevronDown,
  Radio,
} from "lucide-react";
import { useReducedMotion } from "framer-motion";
import { weatherKind, weatherLabel, type Weather, type WeatherKind } from "@/lib/weather";

export type AtmospherePreview = "live" | "sun" | "cloud" | "rain" | "snow" | "storm" | "night";
export function atmosphereState(
  weather: Weather | undefined,
  preview: AtmospherePreview,
): { kind: WeatherKind | null; night: boolean } {
  return preview === "live"
    ? { kind: weather ? weatherKind(weather.code) : null, night: weather ? !weather.isDay : false }
    : { kind: preview === "night" ? "sun" : preview, night: preview === "night" };
}
const options = [
  { id: "live", label: "Clima real", Icon: Radio },
  { id: "sun", label: "Sol", Icon: Sun },
  { id: "cloud", label: "Nubes", Icon: Cloud },
  { id: "rain", label: "Lluvia", Icon: CloudRain },
  { id: "snow", label: "Nieve", Icon: CloudSnow },
  { id: "storm", label: "Tormenta", Icon: CloudLightning },
  { id: "night", label: "Noche", Icon: Moon },
] as const;

export function AtmosphereControl({
  weather,
  preview,
  onChange,
}: {
  weather: Weather | undefined;
  preview: AtmospherePreview;
  onChange: (value: AtmospherePreview) => void;
}) {
  const details = useRef<HTMLDetailsElement>(null);
  const state = atmosphereState(weather, preview);
  const Icon = state.night
    ? Moon
    : (options.find((option) => option.id === state.kind)?.Icon ?? Cloud);
  const currentLabel =
    preview === "live"
      ? weather
        ? weatherLabel(weather)
        : "Ambiente"
      : options.find((option) => option.id === preview)?.label;
  return (
    <details
      className="atmosphere-control"
      ref={details}
      onKeyDown={(event) => {
        if (event.key !== "Escape" || !details.current?.open) return;
        event.preventDefault();
        event.stopPropagation();
        details.current.open = false;
        details.current.querySelector<HTMLElement>(":scope > summary")?.focus();
      }}
    >
      <summary aria-label={`Ambiente del mapa: ${currentLabel}`}>
        <Icon size={17} />
        <span>{currentLabel}</span>
        <ChevronDown size={12} />
      </summary>
      <div className="atmosphere-menu">
        <strong>Ambiente del mapa</strong>
        <div>
          {options.map(({ id, label, Icon: OptionIcon }) => (
            <button
              key={id}
              aria-pressed={id === preview}
              onClick={() => {
                onChange(id);
                if (details.current) details.current.open = false;
              }}
            >
              <OptionIcon size={17} />
              {label}
            </button>
          ))}
        </div>
        <p>
          Las vistas previas cambian el ambiente visual. Los encuentros siguen el clima estimado
          cerca del centro del mapa.
        </p>
      </div>
    </details>
  );
}

export function Atmosphere({
  weather,
  preview = "live",
  scene = false,
}: {
  weather: Weather | undefined;
  preview?: AtmospherePreview;
  scene?: boolean;
}) {
  const reduced = useReducedMotion();
  const { kind, night } = atmosphereState(weather, preview);
  if (!kind) return null;
  const raining = kind === "rain" || kind === "storm";
  return (
    <div
      className={`world-atmosphere atmosphere-${kind} ${night ? "atmosphere-night" : ""} ${scene ? "is-scene" : ""} ${reduced ? "is-still" : ""}`}
      aria-hidden="true"
    >
      {kind === "sun" && !night && <div className="daylight-wash" />}
      {night && scene && (
        <>
          <div className="night-stars">
            {Array.from({ length: 16 }, (_, index) => (
              <i
                key={index}
                style={{
                  left: `${(index * 43 + 9) % 96}%`,
                  top: `${(index * 19 + 7) % 60}%`,
                  animationDelay: `${index % 4}s`,
                }}
              />
            ))}
          </div>
        </>
      )}
      {(kind === "cloud" || raining || kind === "fog" || kind === "snow") && (
        <div className="weather-clouds">
          <span />
          <span />
          <span />
        </div>
      )}
      {(raining || kind === "snow") && (
        <div className="weather-particles">
          {Array.from({ length: kind === "snow" ? 30 : 48 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${(index * 41 + 7) % 105}%`,
                animationDelay: `${(index % 13) * -0.29}s`,
                animationDuration: `${kind === "snow" ? 5 + (index % 5) : 0.75 + (index % 5) * 0.12}s`,
                opacity: 0.2 + (index % 5) * 0.12,
              }}
            />
          ))}
        </div>
      )}
      {kind === "storm" && <div className="storm-glow" />}
      {raining && (
        <div className="rain-ripples">
          {Array.from({ length: 8 }, (_, index) => (
            <i
              key={index}
              style={{
                left: `${9 + index * 12}%`,
                bottom: `${4 + (index % 3) * 10}%`,
                animationDelay: `${index * -0.39}s`,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}
