import { mkdir, writeFile } from "node:fs/promises";

const base = "https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv";
const sources = [
  "pokemon",
  "pokemon_types",
  "pokemon_species",
  "pokemon_stats",
  "pokemon_habitats",
].map((name) => `${base}/${name}.csv`);
const types = [
  "",
  "normal",
  "fighting",
  "flying",
  "poison",
  "ground",
  "rock",
  "bug",
  "ghost",
  "steel",
  "fire",
  "water",
  "grass",
  "electric",
  "psychic",
  "ice",
  "dragon",
  "dark",
  "fairy",
];

async function readRows(url) {
  const response = await fetch(url, { signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`Catalog source returned ${response.status}`);
  const lines = (await response.text()).trim().split(/\r?\n/);
  const headers = lines.shift().split(",");
  return lines.map((line) => {
    const values = line.split(",");
    if (values.length !== headers.length) throw new Error("Unexpected CSV columns");
    return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
  });
}

const [pokemonRows, typeRows, speciesRows, statRows, habitatRows] = await Promise.all(
  sources.map(readRows),
);
const speciesById = new Map(speciesRows.map((row) => [row.id, row]));
const habitats = new Map(habitatRows.map((row) => [row.id, row.identifier]));
const pokemon = pokemonRows
  .filter((row) => Number(row.id) >= 1 && Number(row.id) <= 386 && row.is_default === "1")
  .map((row) => {
    const pokemonTypes = typeRows
      .filter((type) => type.pokemon_id === row.id)
      .sort((a, b) => Number(a.slot) - Number(b.slot))
      .map((type) => types[Number(type.type_id)]);
    if (!pokemonTypes.length || pokemonTypes.some((type) => !type)) {
      throw new Error(`Missing canonical type for ${row.identifier}`);
    }
    const species = speciesById.get(row.species_id);
    const stats = statRows.filter((entry) => entry.pokemon_id === row.id);
    if (!species || stats.length !== 6)
      throw new Error(`Incomplete metadata for ${row.identifier}`);
    return {
      id: Number(row.id),
      name: row.identifier,
      types: pokemonTypes,
      generation: Number(species.generation_id),
      habitat: habitats.get(species.habitat_id) ?? null,
      legendary: species.is_legendary === "1" || species.is_mythical === "1",
      captureRate: Number(species.capture_rate),
      baseStatTotal: stats.reduce((sum, entry) => sum + Number(entry.base_stat), 0),
    };
  });

if (pokemon.length !== 386) throw new Error("Expected 386 Pokémon from generations I–III");
const output = new URL("../src/data/catalog.json", import.meta.url);
await mkdir(new URL("../src/data/", import.meta.url), { recursive: true });
await writeFile(output, JSON.stringify({ sources, pokemon }, null, 2) + "\n");
console.log(`Saved ${pokemon.length} canonical Pokémon records from PokéAPI's public dataset.`);
