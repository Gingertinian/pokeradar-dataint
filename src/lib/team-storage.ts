import { isReadableTeam, parseTeam } from "./exploration";

export const TEAM_KEY = "pokeradar:team:v1";
export type TeamStorageStatus = "ok" | "unreadable" | "unavailable";
type TemporaryTeam = { serialized: string; status: Exclude<TeamStorageStatus, "ok"> };

export function writeTeam(
  access: () => Pick<Storage, "getItem" | "setItem">,
  temporary: TemporaryTeam | undefined,
  transform: (team: number[]) => number[],
): { team: number[]; temporary: TemporaryTeam | undefined } {
  const serialize = (ids: number[]) => JSON.stringify({ version: 1, ids });
  if (temporary) {
    const team = transform(parseTeam(temporary.serialized));
    return { team, temporary: { ...temporary, serialized: serialize(team) } };
  }
  let storage: Pick<Storage, "getItem" | "setItem">;
  let raw: string | null;
  try {
    storage = access();
    raw = storage.getItem(TEAM_KEY);
  } catch {
    const team = transform([]);
    return { team, temporary: { serialized: serialize(team), status: "unavailable" } };
  }
  if (!isReadableTeam(raw)) {
    const team = transform([]);
    return { team, temporary: { serialized: serialize(team), status: "unreadable" } };
  }
  const current = parseTeam(raw);
  const team = transform(current);
  if (team === current) return { team, temporary: undefined };
  try {
    storage.setItem(TEAM_KEY, serialize(team));
    return { team, temporary: undefined };
  } catch {
    return { team, temporary: { serialized: serialize(team), status: "unavailable" } };
  }
}
