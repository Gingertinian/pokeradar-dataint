"use client";

import { AnimatePresence } from "framer-motion";
import { Backpack, ChevronRight, Filter, Footprints, Radar, RotateCw } from "lucide-react";
import { RadarFindings } from "./radar-findings";
import { PokemonImage } from "./ui/pokemon-image";
import type { ExpeditionSighting } from "@/lib/destinations";
import type { Coordinate } from "@/lib/geography";
import { findPokemon } from "@/lib/catalog";
import { pokemonName } from "@/lib/pokemon";
import { accessibleRadarStatus } from "@/lib/radar-status";
import type { RadarPlacement } from "@/lib/label-placement";

type Props = {
  team: number[];
  scanning: boolean;
  blocked: boolean;
  status: string;
  detailOpen: boolean;
  findings: { entries: ExpeditionSighting[]; origin: Coordinate } | null;
  radarLayout: RadarPlacement;
  known: ReadonlySet<string>;
  emptyAction?: { label: string; onClick: () => void };
  onScan: (keyboard: boolean) => void;
  onRenew: () => void;
  onTeam: () => void;
  onCompanionTypes: () => void;
  companionFilterActive: boolean;
  activeFilterCount: number;
  onSignals: () => void;
  onChoose: (entry: ExpeditionSighting) => void;
  onPreview: (id: number | null) => void;
  onCloseFindings: () => void;
};

export function ExpeditionDock(p: Props) {
  const buddy = p.team[0] ? findPokemon(p.team[0]) : null;
  return (
    <div
      className="field-console"
      data-detail-open={p.detailOpen}
      data-scanning={p.scanning}
      data-radar-side={p.radarLayout.side}
      style={{ "--radar-lift": `${p.radarLayout.lift}px` } as React.CSSProperties}
    >
      <AnimatePresence>
        {p.findings && (
          <RadarFindings
            entries={p.findings.entries}
            origin={p.findings.origin}
            known={p.known}
            onChoose={p.onChoose}
            onPreview={p.onPreview}
            onClose={p.onCloseFindings}
          />
        )}
      </AnimatePresence>
      <div className="field-console-bar">
        <button
          className="field-companion"
          onClick={p.onTeam}
          aria-label={
            buddy
              ? `Abrir mi equipo de expedición, te acompaña ${pokemonName(buddy.name)}`
              : "Abrir mi equipo de expedición"
          }
        >
          <span className="companion-portrait">
            {buddy ? (
              <PokemonImage id={buddy.id} name="" size={58} decorative className="pixel-art" />
            ) : (
              <Backpack size={26} />
            )}
          </span>
          <span>
            <small>{buddy ? "TE ACOMPAÑA" : "TU EQUIPO"}</small>
            <strong>{buddy ? pokemonName(buddy.name) : "Tu primer compañero"}</strong>
          </span>
        </button>
        <div className="field-radar-action">
          <button
            className="field-radar-button"
            disabled={p.blocked}
            onClick={(event) => p.onScan(event.detail === 0)}
            aria-label={p.scanning ? "Explorando esta vista" : "Explorar esta vista"}
          >
            <span className="field-radar-orbit" aria-hidden="true" />
            <Radar size={28} />
          </button>
          <span>
            <strong>{p.scanning ? "Siguiendo el rastro…" : "Explorá a tu alrededor"}</strong>
            <small aria-hidden="true">{p.status}</small>
            <span className="sr-only" role="status">
              {accessibleRadarStatus(p.status)}
            </span>
            {p.emptyAction && (
              <button className="field-empty-action" onClick={p.emptyAction.onClick}>
                {p.emptyAction.label}
              </button>
            )}
          </span>
        </div>
        <div className="field-console-tools">
          {buddy && (
            <button
              className="field-affinity"
              onClick={p.onCompanionTypes}
              aria-pressed={p.companionFilterActive}
              aria-label={
                p.companionFilterActive
                  ? `Quitar filtro de tipos de ${pokemonName(buddy.name)}`
                  : `Filtrar señales por tipos de ${pokemonName(buddy.name)}`
              }
              title={
                p.companionFilterActive
                  ? `Quitar filtro de ${pokemonName(buddy.name)}`
                  : `Filtrar por los tipos de ${pokemonName(buddy.name)}`
              }
            >
              <Filter size={18} />
              <span>{p.companionFilterActive ? "Quitar tipos" : "Sus tipos"}</span>
              <PokemonImage
                id={buddy.id}
                name=""
                size={24}
                decorative
                className="affinity-buddy pixel-art"
              />
            </button>
          )}
          <button
            onClick={p.onRenew}
            disabled={p.blocked}
            aria-label="Renovar especies y posiciones de esta búsqueda"
            title="Nuevas señales"
          >
            <RotateCw size={18} />
          </button>
          <button
            onClick={p.onSignals}
            aria-label={
              p.activeFilterCount
                ? `Ver señales y filtros, ${p.activeFilterCount} ${p.activeFilterCount === 1 ? "activo" : "activos"}`
                : "Ver señales y filtros"
            }
            aria-keyshortcuts="/"
          >
            <Footprints size={18} />
            <span>Señales</span>
            {p.activeFilterCount > 0 && (
              <b className="field-filter-count" aria-hidden="true">
                {p.activeFilterCount}
              </b>
            )}
            <kbd className="signals-shortcut" aria-hidden="true">
              /
            </kbd>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </div>
  );
}
