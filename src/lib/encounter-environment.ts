import { HABITATS, type Destination, type ExpeditionSighting, type Habitat } from "./destinations";
import { isWithinBounds } from "./geography";

const terrainLabels: Record<Habitat, string> = {
  coast: "Costa",
  forest: "Vegetación arbolada",
  riverside: "Ribera",
  mountain: "Terreno abierto",
  grassland: "Vegetación abierta",
  glacier: "Entorno glaciar",
  urban: "Entorno urbano",
};

export function encounterEnvironment(site: Destination, sighting?: ExpeditionSighting) {
  if (!sighting?.terrainDerived) {
    return { name: site.name, label: HABITATS[site.habitat].label, visualHabitat: site.habitat };
  }
  const habitat = sighting.habitat ?? site.habitat;
  const nearSite = isWithinBounds(sighting.coordinates, site.viewBounds);
  return {
    name: nearSite ? `Entorno de ${site.name}` : "Zona explorada",
    label: terrainLabels[habitat],
    visualHabitat: nearSite && site.habitat === "coast" && habitat === "grassland" ? "coast" : habitat,
  } as const;
}
