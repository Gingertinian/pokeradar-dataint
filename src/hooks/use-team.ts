"use client";

import { useMemo, useSyncExternalStore } from "react";
import { isReadableTeam, leadTeamMember, parseTeam, toggleTeamMember } from "@/lib/exploration";
import { TEAM_KEY, writeTeam, type TeamStorageStatus } from "@/lib/team-storage";

const CHANGE_EVENT = "pokeradar-team-change";

function subscribe(callback: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === TEAM_KEY || event.key === null) {
      volatileTeam = undefined;
      callback();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener(CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(CHANGE_EVENT, callback);
  };
}

let volatileTeam: { serialized: string; status: Exclude<TeamStorageStatus, "ok"> } | undefined;
let checkedRaw: string | null | undefined;
let checkedStatus: TeamStorageStatus = "ok";

function getSnapshot(): string | null {
  if (volatileTeam !== undefined) return volatileTeam.serialized;
  try {
    return window.localStorage.getItem(TEAM_KEY);
  } catch {
    return null;
  }
}

function statusSnapshot(): TeamStorageStatus {
  if (volatileTeam) return volatileTeam.status;
  try {
    const raw = window.localStorage.getItem(TEAM_KEY);
    if (raw !== checkedRaw) {
      checkedRaw = raw;
      checkedStatus = isReadableTeam(raw) ? "ok" : "unreadable";
    }
    return checkedStatus;
  } catch {
    return "unavailable";
  }
}

export function useTeam() {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, () => null);
  const storageStatus = useSyncExternalStore<TeamStorageStatus>(
    subscribe,
    statusSnapshot,
    () => "ok",
  );
  const team = useMemo(() => parseTeam(snapshot), [snapshot]);

  function persist(transform: (current: number[]) => number[]) {
    const result = writeTeam(() => window.localStorage, volatileTeam, transform);
    volatileTeam = result.temporary;
    window.dispatchEvent(new Event(CHANGE_EVENT));
    return result.team;
  }

  function toggle(id: number) {
    return persist((current) => toggleTeamMember(current, id));
  }

  function capture(id: number) {
    return persist((current) => (current.includes(id) ? current : toggleTeamMember(current, id)));
  }

  function lead(id: number) {
    return persist((current) => leadTeamMember(current, id));
  }

  return { team, storageStatus, toggle, capture, lead };
}
