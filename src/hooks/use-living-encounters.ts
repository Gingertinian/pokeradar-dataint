"use client";
import { useEffect, useRef, useState } from "react";
import type { ExpeditionSighting } from "@/lib/destinations";
type State = {
  key: string;
  items: ExpeditionSighting[];
  seconds: number;
  revision: number;
  removed: number[];
};
export function useLivingEncounters(
  key: string,
  base: ExpeditionSighting[],
  generate: (revision: number) => ExpeditionSighting[],
  paused: boolean,
  protectedId: number | null = null,
) {
  const [state, setState] = useState<State | null>(null);
  const latest = useRef({ key, base, generate, protectedId });
  useEffect(() => {
    latest.current = { key, base, generate, protectedId };
  }, [key, base, generate, protectedId]);
  useEffect(() => {
    if (paused) return;
    const timer = window.setInterval(() => {
      if (document.hidden) return;
      const c = latest.current;
      setState((old) => {
        const current =
          old?.key === c.key
            ? old
            : { key: c.key, items: c.base, seconds: 20, revision: 0, removed: [] };
        if (current.seconds > 1) return { ...current, seconds: current.seconds - 1 };
        const revision = current.revision + 1;
        const keep = [
          ...current.items.filter((e) => e.pokemon.id !== c.protectedId).slice(2),
          ...current.items.filter((e) => e.pokemon.id === c.protectedId),
        ];
        const ids = new Set(keep.map((e) => e.pokemon.id));
        const fresh = c
          .generate(revision)
          .filter((e) => !ids.has(e.pokemon.id) && !current.removed.includes(e.pokemon.id))
          .slice(0, Math.max(0, c.base.length - keep.length));
        return { ...current, revision, seconds: 20, items: [...keep, ...fresh] };
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [paused]);
  function dismiss(id: number) {
    setState((old) => {
      const c =
        old?.key === key ? old : { key, items: base, seconds: 20, revision: 0, removed: [] };
      return {
        ...c,
        items: c.items.filter((e) => e.pokemon.id !== id),
        removed: [...new Set([...c.removed, id])],
      };
    });
  }
  return {
    sightings: state?.key === key ? state.items : base,
    seconds: state?.key === key ? state.seconds : 20,
    revision: state?.key === key ? state.revision : 0,
    dismiss,
  };
}
