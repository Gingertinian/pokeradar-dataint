"use client";

import {
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Moon,
  Sun,
  Wind,
  Check,
  ArrowUpRight,
  Flag,
} from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { weatherAffinity, weatherKind, weatherLabel, type Weather } from "@/lib/weather";
import { TYPE_INFO } from "@/lib/pokemon";
import { regionMission } from "@/lib/expedition";
import { getRegion, type RegionId } from "@/lib/regions";
import type { JournalEntry } from "@/hooks/use-journal";

export function WeatherCard({
  weather,
  pending,
  onRetry,
}: {
  weather: Weather | undefined;
  pending: boolean;
  onRetry: () => void;
}) {
  if (!weather)
    return (
      <div className="weather-card weather-unavailable" role="status">
        <Cloud size={22} />
        <span>
          {pending ? "Consultando el clima…" : "Clima no disponible"}
          <small>
            {pending
              ? "Las condiciones modifican los encuentros"
              : "Podés seguir explorando por hábitat"}
          </small>
        </span>
        {!pending && <button onClick={onRetry}>Reintentar</button>}
      </div>
    );
  const kind = weatherKind(weather.code);
  const icons = {
    sun: weather.isDay ? Sun : Moon,
    cloud: Cloud,
    fog: CloudFog,
    rain: CloudRain,
    snow: CloudSnow,
    storm: CloudLightning,
  };
  const Icon = icons[kind];
  return (
    <details className="weather-card" data-weather={kind}>
      <summary>
        <span className="weather-symbol">
          <Icon size={26} strokeWidth={1.5} />
        </span>
        <span>
          <strong>
            {Math.round(weather.temperature)}° <span>{weatherLabel(weather)}</span>
          </strong>
          <small>Zona del mapa · Open-Meteo</small>
        </span>
        <span className="weather-time mono">{weather.reportedAt.slice(11, 16)}</span>
      </summary>
      <div className="weather-expanded">
        <p>
          <Wind size={13} /> {Math.round(weather.wind)} km/h{" "}
          <span>· Sensación {Math.round(weather.feelsLike)}°</span>
        </p>
        <p>
          Más afinidad con{" "}
          {weatherAffinity(weather)
            .map((type) => TYPE_INFO[type].label)
            .join(", ")
            .toLocaleLowerCase("es-AR")}
          .
        </p>
        <small>
          Estimación para una zona aproximada alrededor del centro del mapa. Hora local de esa zona.
          Las apariciones son simuladas.
        </small>
      </div>
    </details>
  );
}

export function MissionCard({
  regionId,
  entries,
  visits,
  compact = false,
  onOpen,
  onExplore,
}: {
  regionId: RegionId;
  entries: JournalEntry[];
  visits: string[];
  compact?: boolean;
  onOpen?: () => void;
  onExplore?: (completed: boolean) => void;
}) {
  const goals = regionMission(regionId, entries, visits);
  const region = getRegion(regionId);
  const done = goals.filter((goal) => goal.value >= goal.target).length;
  const next = goals.find((goal) => goal.value < goal.target);
  const reduced = useReducedMotion();
  if (compact)
    return (
      <button
        className="mission-compact"
        onClick={onOpen}
        aria-label="Ver objetivos de esta expedición"
      >
        <span className={`mission-emblem ${done === 3 ? "is-complete" : ""}`}>
          <Flag size={19} />
        </span>
        <span>
          <strong>{done === 3 ? "Expedición completada" : next?.label}</strong>
          <small>
            {done === 3
              ? "Buscá un nuevo paisaje"
              : `${Math.min(next?.value ?? 0, next?.target ?? 0)} / ${next?.target} · ${done} de 3 objetivos`}
          </small>
        </span>
        <ArrowUpRight size={17} />
      </button>
    );
  return (
    <section className="mission-card" aria-label={`Objetivos de ${region.name}`}>
      <div className="mission-heading">
        <Flag size={16} />
        <h3>Expedición · {region.shortName}</h3>
        <span>{done}/3</span>
      </div>
      {goals.map((goal) => (
        <div className="mission-goal" key={goal.label}>
          <span className={goal.value >= goal.target ? "is-complete" : ""}>
            {goal.value >= goal.target ? <Check size={13} /> : <span />}
          </span>
          <div>
            <p>
              {goal.label}
              <strong>
                {Math.min(goal.value, goal.target)}/{goal.target}
              </strong>
            </p>
            <span className="mission-track">
              <motion.i
                initial={false}
                animate={{ width: `${Math.min(100, (goal.value / goal.target) * 100)}%` }}
                transition={{ duration: reduced ? 0 : 0.3 }}
              />
            </span>
          </div>
        </div>
      ))}
      {onExplore && (
        <div className="mission-complete">
          <p>
            {done === goals.length
              ? "Completaste los objetivos de esta región."
              : "Seguí explorando esta región para avanzar."}
          </p>
          <button onClick={() => onExplore(done === goals.length)}>
            {done === goals.length ? "Explorar otra región" : "Ver lugares de la región"}{" "}
            <ArrowUpRight size={14} aria-hidden="true" />
          </button>
        </div>
      )}
    </section>
  );
}
