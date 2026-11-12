"use client";

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react";
import {
  parseJournal,
  readJournal,
  addSighting,
  addCollectionRecord,
  importTeam,
  type Journal,
  type CaptureDetails,
} from "@/lib/journal";
import { JOURNAL_KEY, writeJournal, type JournalStorageStatus } from "@/lib/journal-storage";
import type { Coordinate } from "@/lib/geography";
export { parseJournal } from "@/lib/journal";
export type { JournalEntry, CollectionRecord, CaptureDetails } from "@/lib/journal";

const EVENT = "pokeradar-journal-change";
let volatile: { serialized: string; status: Exclude<JournalStorageStatus, "ok"> } | undefined;
let checkedRaw: string | null | undefined;
let checkedStatus: JournalStorageStatus = "ok";

function snapshot(): string | null {
  if (volatile !== undefined) return volatile.serialized;
  try {
    return window.localStorage.getItem(JOURNAL_KEY);
  } catch {
    return null;
  }
}

function statusSnapshot(): JournalStorageStatus {
  if (volatile) return volatile.status;
  try {
    const raw = window.localStorage.getItem(JOURNAL_KEY);
    if (raw !== checkedRaw) {
      checkedRaw = raw;
      checkedStatus = readJournal(raw) ? "ok" : "unreadable";
    }
    return checkedStatus;
  } catch {
    return "unavailable";
  }
}

function subscribe(callback: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === JOURNAL_KEY || event.key === null) {
      volatile = undefined;
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(EVENT, callback);
  };
}

function update(transform: (current: Journal) => Journal) {
  volatile = writeJournal(() => window.localStorage, volatile, transform);
  window.dispatchEvent(new Event(EVENT));
}

export function useJournal(team: readonly number[] = []) {
  const raw = useSyncExternalStore(subscribe, snapshot, () => null);
  const storageStatus = useSyncExternalStore<JournalStorageStatus>(
    subscribe,
    statusSnapshot,
    () => "ok",
  );
  const journal = useMemo(() => parseJournal(raw), [raw]);
  const teamKey = team.join(",");
  useEffect(() => {
    const ids = teamKey ? teamKey.split(",").map(Number) : [];
    const current = parseJournal(snapshot());
    if (ids.some((id) => !current.collection.some((record) => record.pokemonId === id)))
      update((value) => importTeam(value, ids, new Date().toISOString()));
  }, [teamKey]);
  const collect = useCallback(
    (pokemonId: number, siteId: string | null, details: CaptureDetails) => {
      update((current) =>
        addCollectionRecord(current, {
          pokemonId,
          siteId,
          method: "capture",
          recordedAt: new Date().toISOString(),
          ...details,
        }),
      );
    },
    [],
  );
  const record = useCallback(
    (
      pokemonId: number,
      siteId: string,
      weather: string | null,
      outsideSite: boolean,
      coordinates?: Coordinate,
    ) => {
      update((current) =>
        addSighting(current, {
          pokemonId,
          siteId,
          weather,
          outsideSite,
          coordinates,
          seenAt: new Date().toISOString(),
        }),
      );
    },
    [],
  );
  const visit = useCallback((siteId: string) => {
    update((current) =>
      current.visits.includes(siteId)
        ? current
        : { ...current, visits: [...current.visits, siteId] },
    );
  }, []);
  return { ...journal, storageStatus, record, visit, collect };
}
