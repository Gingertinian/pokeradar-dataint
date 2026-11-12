import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getPokemonDetail, PokemonApiError } from "@/lib/server/pokeapi";

const sprite = "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/6.png";

function pokemonFixture() {
  return {
    id: 6,
    name: "charizard",
    height: 17,
    weight: 905,
    types: [
      { slot: 2, type: { name: "flying" } },
      { slot: 1, type: { name: "fire" } },
    ],
    // Distinct values expose stat swaps independently of upstream array order.
    stats: [
      { base_stat: 100, stat: { name: "speed" } },
      { base_stat: 79, stat: { name: "defense" } },
      { base_stat: 109, stat: { name: "special-attack" } },
      { base_stat: 78, stat: { name: "hp" } },
      { base_stat: 85, stat: { name: "special-defense" } },
      { base_stat: 84, stat: { name: "attack" } },
    ],
    abilities: [{ ability: { name: "blaze" } }],
    sprites: { front_default: null },
  };
}

function speciesFixture() {
  return {
    is_legendary: false,
    genera: [
      { genus: "Flame Pokémon", language: { name: "en" } },
      { genus: "Pokémon Llama", language: { name: "es" } },
    ],
    flavor_text_entries: [
      { flavor_text: "Una entrada anterior.", language: { name: "es" } },
      {
        flavor_text: "  Escupe\nfuego.\fVuela\r muy  alto.  ",
        language: { name: "es" },
      },
      { flavor_text: "An English entry.", language: { name: "en" } },
    ],
  };
}

const fetchMock = vi.fn<typeof fetch>();

function mockResources(
  pokemon: Response | Error = Response.json(pokemonFixture()),
  species: Response | Error = Response.json(speciesFixture()),
  id = 6,
) {
  fetchMock.mockImplementation(async (input) => {
    const url = input instanceof Request ? input.url : String(input);
    let result: Response | Error;
    if (url === `https://pokeapi.co/api/v2/pokemon/${id}`) result = pokemon;
    else if (url === `https://pokeapi.co/api/v2/pokemon-species/${id}`) result = species;
    else throw new Error(`Unexpected fetch: ${url}`);
    if (result instanceof Error) throw result;
    return result;
  });
}

async function expectApiError(status: number) {
  const result = getPokemonDetail(6);
  await expect(result).rejects.toBeInstanceOf(PokemonApiError);
  await expect(result).rejects.toMatchObject({ status });
}

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  mockResources();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("getPokemonDetail", () => {
  it("fetches the requested ID, converts decimetres/hectograms, and maps unordered stats and type slots", async () => {
    const detail = await getPokemonDetail(6);

    expect(fetchMock.mock.calls.map(([input]) => String(input)).sort()).toEqual([
      "https://pokeapi.co/api/v2/pokemon-species/6",
      "https://pokeapi.co/api/v2/pokemon/6",
    ]);
    expect(detail).toMatchObject({
      id: 6,
      name: "charizard",
      height: 1.7,
      weight: 90.5,
      types: ["fire", "flying"],
      abilities: ["blaze"],
      sprite,
      artwork: sprite,
      animatedSprite: null,
      cry: null,
    });
    expect(detail.stats).toEqual([
      { name: "hp", value: 78 },
      { name: "attack", value: 84 },
      { name: "defense", value: 79 },
      { name: "special-attack", value: 109 },
      { name: "special-defense", value: 85 },
      { name: "speed", value: 100 },
    ]);
  });

  it("uses the caller's ID for both resources and the fallback sprite", async () => {
    mockResources(
      Response.json({ ...pokemonFixture(), id: 25, name: "pikachu" }),
      Response.json(speciesFixture()),
      25,
    );

    const detail = await getPokemonDetail(25);

    expect(fetchMock.mock.calls.map(([input]) => String(input)).sort()).toEqual([
      "https://pokeapi.co/api/v2/pokemon-species/25",
      "https://pokeapi.co/api/v2/pokemon/25",
    ]);
    expect(detail).toMatchObject({
      id: 25,
      name: "pikachu",
      sprite: "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png",
    });
  });

  it("selects the latest Spanish description, cleans control characters, and keeps species metadata", async () => {
    mockResources(
      Response.json(pokemonFixture()),
      Response.json({ ...speciesFixture(), is_legendary: true }),
    );

    expect(await getPokemonDetail(6)).toMatchObject({
      description: "Escupe fuego. Vuela muy alto.",
      genus: "Pokémon Llama",
      legendary: true,
    });
  });

  it("keeps valid species metadata when Spanish text is absent", async () => {
    mockResources(
      Response.json(pokemonFixture()),
      Response.json({
        is_legendary: true,
        genera: [{ genus: "Flame Pokémon", language: { name: "en" } }],
        flavor_text_entries: [{ flavor_text: "An English entry.", language: { name: "en" } }],
      }),
    );

    expect(await getPokemonDetail(6)).toMatchObject({
      id: 6,
      description: null,
      genus: null,
      legendary: true,
    });
  });

  it.each([
    { reason: "404", response: () => new Response(null, { status: 404 }) },
    {
      reason: "server failure",
      response: () => new Response(null, { status: 503 }),
    },
    { reason: "network failure", response: () => new Error("offline") },
    { reason: "malformed JSON", response: () => new Response("{broken") },
    {
      reason: "invalid species data",
      response: () => Response.json({ is_legendary: "false" }),
    },
  ])("preserves required detail when optional species has $reason", async ({ response }) => {
    mockResources(Response.json(pokemonFixture()), response());

    const detail = await getPokemonDetail(6);
    expect(detail).toMatchObject({
      id: 6,
      name: "charizard",
      height: 1.7,
      weight: 90.5,
      types: ["fire", "flying"],
    });
    expect(detail.stats).toHaveLength(6);
    expect(detail).toMatchObject({
      description: null,
      genus: null,
      legendary: false,
    });
  });

  it.each([
    { reason: "a different Pokémon ID", patch: { id: 25 } },
    { reason: "a missing name", patch: { name: undefined } },
    { reason: "negative height", patch: { height: -1 } },
    { reason: "non-numeric weight", patch: { weight: "905" } },
    { reason: "no types", patch: { types: [] } },
    {
      reason: "an unknown type",
      patch: { types: [{ slot: 1, type: { name: "cosmic" } }] },
    },
    {
      reason: "a missing stat",
      patch: { stats: pokemonFixture().stats.slice(1) },
    },
    {
      reason: "a duplicate stat replacing speed",
      patch: {
        stats: [{ base_stat: 78, stat: { name: "hp" } }, ...pokemonFixture().stats.slice(1)],
      },
    },
    {
      reason: "an invalid stat value",
      patch: {
        stats: pokemonFixture().stats.map((stat) => ({
          ...stat,
          base_stat: 256,
        })),
      },
    },
    { reason: "missing sprites", patch: { sprites: undefined } },
  ])("rejects $reason with PokemonApiError", async ({ patch }) => {
    mockResources(Response.json({ ...pokemonFixture(), ...patch }));
    await expectApiError(502);
  });

  it.each([
    { label: "null", payload: null },
    { label: "an array", payload: [] },
    { label: "an empty object", payload: {} },
  ])("rejects an incomplete required payload: $label", async ({ payload }) => {
    mockResources(Response.json(payload));
    await expectApiError(502);
  });

  it.each([
    { upstream: 404, expected: 404 },
    { upstream: 429, expected: 502 },
    { upstream: 500, expected: 502 },
  ])("translates required resource HTTP $upstream to $expected", async ({ upstream, expected }) => {
    mockResources(new Response(null, { status: upstream }));
    await expectApiError(expected);
  });

  it.each([
    new TypeError("network unavailable"),
    new DOMException("request timed out", "TimeoutError"),
  ])("reports an unavailable required resource as 503 (%s)", async (error) => {
    mockResources(error);
    await expectApiError(503);
  });

  it("turns malformed required JSON into a typed 502 error", async () => {
    mockResources(new Response("{broken"));
    await expectApiError(502);
  });

  it("falls back to trusted media when upstream URLs point outside PokeAPI", async () => {
    mockResources(
      Response.json({
        ...pokemonFixture(),
        sprites: {
          front_default: "https://example.test/untrusted.png",
          other: {
            "official-artwork": {
              front_default: "https://raw.githubusercontent.com.evil.test/PokeAPI/sprites/6.png",
            },
          },
          versions: {
            "generation-v": {
              "black-white": {
                animated: { front_default: "javascript:alert(1)" },
              },
            },
          },
        },
        cries: { latest: "https://example.test/untrusted.ogg" },
      }),
    );

    expect(await getPokemonDetail(6)).toMatchObject({
      sprite,
      artwork: sprite,
      animatedSprite: sprite,
      cry: null,
    });
  });

  it("preserves trusted provider sprites, artwork, animation and cries", async () => {
    const media = {
      sprite:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/shiny/6.png",
      artwork:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/6.png",
      animatedSprite:
        "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/6.gif",
      cry: "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest/6.ogg",
    };
    mockResources(
      Response.json({
        ...pokemonFixture(),
        sprites: {
          front_default: media.sprite,
          other: { "official-artwork": { front_default: media.artwork } },
          versions: {
            "generation-v": {
              "black-white": {
                animated: { front_default: media.animatedSprite },
              },
            },
          },
        },
        cries: { latest: media.cry },
      }),
    );

    expect(await getPokemonDetail(6)).toMatchObject(media);
  });
});
