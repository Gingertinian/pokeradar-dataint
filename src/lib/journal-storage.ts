import { parseJournal, readJournal, type Journal } from "./journal";

export const JOURNAL_KEY = "pokeradar:journal:v1";
export type JournalStorageStatus = "ok" | "unreadable" | "unavailable";
type StorageAccess = Pick<Storage, "getItem" | "setItem">;
type TemporaryJournal = { serialized: string; status: Exclude<JournalStorageStatus, "ok"> };

export function writeJournal(
  access: () => StorageAccess,
  temporary: TemporaryJournal | undefined,
  transform: (journal: Journal) => Journal,
): TemporaryJournal | undefined {
  if (temporary)
    return {
      ...temporary,
      serialized: JSON.stringify(transform(parseJournal(temporary.serialized))),
    };
  let storage: StorageAccess;
  let raw: string | null;
  try {
    storage = access();
    raw = storage.getItem(JOURNAL_KEY);
  } catch {
    return { serialized: JSON.stringify(transform(parseJournal(null))), status: "unavailable" };
  }
  const journal = readJournal(raw);
  if (!journal)
    return { serialized: JSON.stringify(transform(parseJournal(null))), status: "unreadable" };
  const serialized = JSON.stringify(transform(journal));
  try {
    storage.setItem(JOURNAL_KEY, serialized);
    return undefined;
  } catch {
    return { serialized, status: "unavailable" };
  }
}
