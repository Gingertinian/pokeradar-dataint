import { describe, expect, it } from "vitest";
import { isReadableTeam, parseTeam } from "./exploration";
import { TEAM_KEY, writeTeam } from "./team-storage";

describe("protección del equipo", () => {
  it.each(['{"version":2,"ids":[25]}', '{"version":1,"ids":', "{}"])(
    "no reemplaza datos de equipo no reconocidos",
    (original) => {
      let stored = original;
      const storage = {
        getItem: () => stored,
        setItem: (_key: string, value: string) => {
          stored = value;
        },
      };
      const { temporary } = writeTeam(
        () => storage,
        undefined,
        () => [25],
      );
      expect(temporary?.status).toBe("unreadable");
      expect(stored).toBe(original);
      const next = writeTeam(
        () => storage,
        temporary,
        (current) => [...current, 131],
      );
      expect(parseTeam(next.temporary!.serialized)).toEqual([25, 131]);
      expect(stored).toBe(original);
    },
  );
  it("acepta el formato anterior y guarda normalmente", () => {
    let stored: string | null = "[25]";
    const storage = {
      getItem: () => stored,
      setItem: (key: string, value: string) => {
        expect(key).toBe(TEAM_KEY);
        stored = value;
      },
    };
    expect(isReadableTeam(stored)).toBe(true);
    expect(
      writeTeam(
        () => storage,
        undefined,
        (current) => [...current, 131],
      ).temporary,
    ).toBeUndefined();
    expect(parseTeam(stored)).toEqual([25, 131]);
  });
  it("retiene los cambios de sesión si falla el acceso o la escritura", () => {
    const blocked = writeTeam(
      () => {
        throw new Error("blocked");
      },
      undefined,
      () => [25],
    );
    expect(blocked.temporary?.status).toBe("unavailable");
    expect(parseTeam(blocked.temporary!.serialized)).toEqual([25]);
    const full = writeTeam(
      () => ({
        getItem: () => "[25]",
        setItem: () => {
          throw new Error("quota");
        },
      }),
      undefined,
      (current) => [...current, 131],
    );
    expect(full.temporary?.status).toBe("unavailable");
    expect(parseTeam(full.temporary!.serialized)).toEqual([25, 131]);
  });
});
