import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GET } from "@/app/api/pokemon/[id]/route";
import { STAT_NAMES, type PokemonDetail } from "@/lib/pokemon";
import { getPokemonDetail, PokemonApiError } from "@/lib/server/pokeapi";

vi.mock("@/lib/server/pokeapi", async (importOriginal) => {
  const original = await importOriginal<typeof import("@/lib/server/pokeapi")>();
  return { ...original, getPokemonDetail: vi.fn() };
});

const getDetailMock = vi.mocked(getPokemonDetail);
const fetchMock = vi.fn<typeof fetch>();
const detail: PokemonDetail = {
  id: 25,
  name: "pikachu",
  types: ["electric"],
  height: 0.4,
  weight: 6,
  sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
  artwork: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
  animatedSprite: null,
  cry: null,
  description: null,
  genus: null,
  legendary: false,
  abilities: [],
  stats: STAT_NAMES.map((name) => ({ name, value: 50 })),
};

function requestDetail(id: string) {
  return GET(new Request("http://localhost/api/pokemon/25"), {
    params: Promise.resolve({ id }),
  });
}

beforeEach(() => {
  getDetailMock.mockReset();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("GET /api/pokemon/[id]", () => {
  it.each(["", "0", "387", "-1", "1.5", "1e2", "25abc", " 25 ", "0025", "NaN", "２５"])(
    "rejects invalid ID %j with 400 before fetching",
    async (id) => {
      const response = await requestDetail(id);

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({ error: expect.any(String) });
      expect(getDetailMock).not.toHaveBeenCalled();
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it.each(["1", "25", "151", "386"])(
    "passes valid ID %s as a number and returns cacheable JSON",
    async (id) => {
      const expected = { ...detail, id: Number(id) };
      getDetailMock.mockResolvedValue(expected);

      const response = await requestDetail(id);

      expect(getDetailMock).toHaveBeenCalledExactlyOnceWith(Number(id));
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual(expected);
      expect(response.headers.get("Cache-Control")).toContain("s-maxage=");
    },
  );

  it.each([404, 502, 503])("returns a typed %s failure without caching it", async (status) => {
    getDetailMock.mockRejectedValue(new PokemonApiError(status, "Upstream unavailable"));

    const response = await requestDetail("25");

    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: "Upstream unavailable" });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns an uncached 500 without exposing an unexpected internal error", async () => {
    getDetailMock.mockRejectedValue(new Error("private upstream diagnostic"));

    const response = await requestDetail("25");
    const body: unknown = await response.json();

    expect(response.status).toBe(500);
    expect(body).toEqual({ error: expect.any(String) });
    expect(JSON.stringify(body)).not.toContain("private upstream diagnostic");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });
});
