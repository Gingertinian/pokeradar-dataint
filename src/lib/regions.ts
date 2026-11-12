import { findPokemon } from "@/lib/catalog";
import type { PokemonSummary } from "@/lib/pokemon";
import areas from "@/data/areas.json";
import { areaSchema, placeEncounters, type ExplorationArea } from "@/lib/geography";

export type RegionId = "costa" | "selva" | "cordillera" | "pampa" | "patagonia";

export type Region = {
  id: RegionId;
  name: string;
  place: string;
  biome: string;
  description: string;
  center: [number, number];
  zoom: number;
  area: ExplorationArea;
  image: string;
  shortName: string;
  color: string;
  species: number[];
};

export const REGIONS: Region[] = [
  {
    id: "costa",
    name: "Costa Atlántica",
    place: "Mar del Plata · Buenos Aires",
    biome: "Mar y costa",
    description:
      "Entre olas y acantilados. Los tipos Agua y Hielo encuentran su lugar junto al mar.",
    center: areaSchema.parse(areas.costa).center,
    zoom: 17.6,
    area: areaSchema.parse(areas.costa),
    image: "/regions/costa.jpg",
    shortName: "Atlántico",
    color: "#277995",
    species: [7, 8, 54, 60, 72, 86, 90, 98, 116, 120, 129, 131],
  },
  {
    id: "selva",
    name: "Selva Misionera",
    place: "Puerto Iguazú · Misiones",
    biome: "Selva subtropical",
    description:
      "Un dosel verde y húmedo. Buscá tipos Planta y Bicho entre los senderos de la selva.",
    center: areaSchema.parse(areas.selva).center,
    zoom: 18.2,
    area: areaSchema.parse(areas.selva),
    image: "/regions/selva.jpg",
    shortName: "Selva",
    color: "#527c4f",
    species: [1, 10, 12, 13, 15, 43, 46, 48, 69, 102, 114, 123],
  },
  {
    id: "cordillera",
    name: "La Cordillera",
    place: "Uspallata · Mendoza",
    biome: "Montaña y roca",
    description:
      "Cumbres, roca y terreno abierto. Explorá el refugio de los tipos Tierra, Roca y Fuego.",
    center: areaSchema.parse(areas.cordillera).center,
    zoom: 18.8,
    area: areaSchema.parse(areas.cordillera),
    image: "/regions/cordillera.jpg",
    shortName: "Andes",
    color: "#a87948",
    species: [4, 6, 27, 37, 50, 74, 77, 95, 104, 111, 126, 142],
  },
  {
    id: "pampa",
    name: "Sierras de Tandil",
    place: "Tandil · Buenos Aires",
    biome: "Pradera y sierras",
    description:
      "Pastizales y sierras bajas. En campo abierto predominan los tipos Normal y Volador.",
    center: areaSchema.parse(areas.pampa).center,
    zoom: 18,
    area: areaSchema.parse(areas.pampa),
    image: "/regions/pampa.jpg",
    shortName: "Sierras",
    color: "#8d8a4b",
    species: [16, 19, 21, 23, 25, 29, 32, 39, 52, 83, 84, 128],
  },
  {
    id: "patagonia",
    name: "Patagonia Austral",
    place: "Lago Argentino · Santa Cruz",
    biome: "Lago y hielo",
    description:
      "Agua fría, glaciares y viento. Un paisaje para descubrir especies de Agua y Hielo.",
    center: areaSchema.parse(areas.patagonia).center,
    zoom: 17.8,
    area: areaSchema.parse(areas.patagonia),
    image: "/regions/patagonia.jpg",
    shortName: "Patagonia",
    color: "#5e8e9c",
    species: [54, 86, 87, 90, 91, 124, 131, 133, 143, 144],
  },
];

const firstRegion = REGIONS[0];
if (!firstRegion) throw new Error("At least one exploration region is required");
export const DEFAULT_REGION: Region = firstRegion;

export type Sighting = {
  key: string;
  pokemon: PokemonSummary;
  regionId: RegionId;
  coordinates: [number, number];
};

export function createSightings(region: Region): Sighting[] {
  const positions = placeEncounters(region.area, region.species, region.id);
  return region.species.map((id, index) => {
    const pokemon = findPokemon(id);
    if (!pokemon) throw new Error(`Region ${region.id} references an unknown Pokémon`);
    const coordinates = positions[index];
    if (!coordinates) throw new Error("Encounter position is missing");
    return {
      key: `${region.id}:${id}`,
      pokemon,
      regionId: region.id,
      coordinates,
    };
  });
}

export function getRegion(id: string | null | undefined): Region {
  return REGIONS.find((region) => region.id === id) ?? DEFAULT_REGION;
}

export function getPokemonRegion(id: number): Region | undefined {
  return REGIONS.find((region) => region.species.includes(id));
}

export function formatCoordinates([longitude, latitude]: [number, number]): string {
  return `${Math.abs(latitude).toFixed(3)}° ${latitude < 0 ? "S" : "N"}  /  ${Math.abs(longitude).toFixed(3)}° ${longitude < 0 ? "O" : "E"}`;
}
