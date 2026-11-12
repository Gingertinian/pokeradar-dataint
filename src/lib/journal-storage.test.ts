import { describe, expect, it } from "vitest";
import { JOURNAL_KEY, writeJournal } from "./journal-storage";
import { parseJournal } from "./journal";

describe("protección del cuaderno", () => {
  it.each([
    JSON.stringify({ version: 2, entries: [{ future: true }] }),
    '{"version":1,"entries":',
    JSON.stringify({ version: 1, entries: [{ pokemonId: "invalid" }], visits: [] }),
  ])("conserva datos no reconocidos y mantiene los cambios solo en memoria", (original) => {
    let stored = original;
    const storage = {
      getItem: () => stored,
      setItem: (_key: string, value: string) => {
        stored = value;
      },
    };
    const first = writeJournal(
      () => storage,
      undefined,
      (journal) => ({ ...journal, visits: ["camet"] }),
    );
    expect(first?.status).toBe("unreadable");
    expect(stored).toBe(original);
    const next = writeJournal(
      () => storage,
      first,
      (journal) => ({ ...journal, visits: [...journal.visits, "macuco"] }),
    );
    expect(parseJournal(next!.serialized).visits).toEqual(["camet", "macuco"]);
    expect(stored).toBe(original);
  });
  it("mantiene cambios temporales si el almacenamiento no se puede leer", () => {
    const result = writeJournal(
      () => {
        throw new Error("blocked");
      },
      undefined,
      (journal) => ({ ...journal, visits: ["camet"] }),
    );
    expect(result?.status).toBe("unavailable");
    expect(parseJournal(result!.serialized).visits).toEqual(["camet"]);
  });
  it("conserva el estado válido en memoria si falla la escritura", () => {
    const original = JSON.stringify({ version: 1, entries: [], visits: ["camet"] });
    const storage = {
      getItem: () => original,
      setItem: () => {
        throw new Error("quota");
      },
    };
    const result = writeJournal(
      () => storage,
      undefined,
      (journal) => ({ ...journal, visits: [...journal.visits, "macuco"] }),
    );
    expect(result?.status).toBe("unavailable");
    expect(parseJournal(result!.serialized).visits).toEqual(["camet", "macuco"]);
  });
  it("persiste los cambios cuando el almacenamiento funciona", () => {
    let stored: string | null = null;
    const storage = {
      getItem: () => stored,
      setItem: (key: string, value: string) => {
        expect(key).toBe(JOURNAL_KEY);
        stored = value;
      },
    };
    expect(
      writeJournal(
        () => storage,
        undefined,
        (journal) => ({ ...journal, visits: ["camet"] }),
      ),
    ).toBeUndefined();
    expect(parseJournal(stored).visits).toEqual(["camet"]);
  });
});
