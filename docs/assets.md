# Recursos visuales

## Logo

Archivo del proyecto: `public/brand/pokeradar-logo.png`.
Generado mediante la herramienta integrada `image_gen`, con fondo transparente.
El PNG original se conserva con su canal alfa. Su uso en la interfaz se adapta
mediante CSS y el componente Image de Next.js.

Prompt utilizado:

> Use case: logo-brand. Create one polished, simple app logo symbol for PokéRadar, a Pokémon exploration map. A recognizable red-and-white Poké Ball is gently shaped into a location pin, with a rounded circular top and a short clean point. Bold smooth dark navy outline, coral-red upper half, clean white lower half, a small central white button. Friendly, confident and modern, with excellent readability at 32–48 pixels. Flat, vector-friendly illustration with only very restrained depth, clean geometry, even line weight. One centered symbol, generous transparent padding, genuinely transparent background. No words, letters, wordmark, badge frame, extra rings, radar diagram, scenery, mascot, cast shadow or watermark. The result should feel like a tasteful modern app mark, not a complicated gaming crest.

## Imágenes de las regiones

Se usan como referencias visuales de cada región. Los perímetros de exploración
proceden de OpenStreetMap y se guardan por separado en `src/data/areas.json`.

- `/regions/costa.jpg` — Ezarate — CC BY-SA 4.0. [Fuente](https://commons.wikimedia.org/wiki/File:ParqueSanMart%C3%ADnMDP-1.jpg).
- `/regions/selva.jpg` — Falk2 — CC BY-SA 4.0. [Fuente](https://commons.wikimedia.org/wiki/File:J31_134_%C2%BBtren_ecologico%C2%AB,_Gleisverbindung.jpg).
- `/regions/cordillera.jpg` — Graciela Di Fabio — CC BY-SA 3.0. [Fuente](https://commons.wikimedia.org/wiki/File:Uspallata_landscape.JPG).
- `/regions/pampa.jpg` — Roberto Fiadone — CC BY-SA 4.0. [Fuente](https://commons.wikimedia.org/wiki/File:Parque_Independencia,_Tandil_02.jpg).
- `/regions/patagonia.jpg` — Pavel Špindler — CC BY 3.0. [Fuente](https://commons.wikimedia.org/wiki/File:Lago_Argentino_-_El_Calafate_-_Patagonie_-_panoramio.jpg).

## Cartografía

- OpenFreeMap y OpenStreetMap para la vista cartográfica.
- Esri World Imagery para la vista satelital. Atribución de la fuente: Esri,
  Vantor, Earthstar Geographics y GIS User Community.
- Los límites de parques y plazas derivan de las entidades indicadas en
  `src/data/areas.json`, con sus identificadores y enlaces de OpenStreetMap.
- La fuente satelital se limita al nivel nativo 17 para evitar los mosaicos de
  contenido no disponible que el proveedor devuelve en niveles superiores para
  estas ubicaciones. El zoom de esa vista se limita a su resolución útil.

## Ampliación de la expedición

- Los terrenos, senderos y miradores de los catorce destinos están en
  `src/data/destinations.json`. Conservan identificadores OSM, fuente y, para
  redes de senderos, la lista de vías originales. Los límites de cámara son un
  encuadre editorial; no se presentan como límites físicos ni rutas transitables.
- En Horcones se utiliza el polígono del Parque Provincial Aconcagua y se
  excluye el polígono de Laguna Horcones. Se explora un sector acotado del valle.
- Cartografía vectorial: estilo Liberty de OpenFreeMap, con colores adaptados
  a la interfaz y POI comerciales ocultos para dar prioridad a la exploración.
- Relieve: [Mapterhorn](https://mapterhorn.com/data-access/), teselas Terrarium
  públicas de 512 px. Atribución visible: [© Mapterhorn](https://mapterhorn.com/attribution/).
- Clima: [Open-Meteo Forecast API](https://open-meteo.com/en/docs), condiciones
  actuales de modelo con hora de Argentina. No hay sensor o estación propios.
- Especies, generaciones, hábitats y estadísticas: CSV públicos de
  [PokéAPI](https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv).
- Ilustraciones, sprites y animaciones: [PokeAPI/sprites](https://github.com/PokeAPI/sprites).
  Las voces usan `cries.latest` de PokéAPI. Los recursos son del universo Pokémon
  y no implican afiliación de este proyecto con sus titulares.
- Los iconos de Ball están dibujados con SVG; la Ball de lanzamiento se sombrea
  como esfera en canvas. Las escenas V8 usan las ilustraciones generadas que se
  detallan abajo, junto a partículas y capas CSS/Framer Motion. El sonido opcional
  utiliza las voces originales de PokéAPI.
- Las vistas previas de ambiente son explícitas y no sustituyen los datos
  climáticos reales ni modifican la afinidad de los encuentros.

# Ilustraciones de encuentro V8

Siete fondos de bioma generados con `image_gen` y copiados a `public/scenes/`.
Son ilustraciones de juego, no fotografías documentales de las ubicaciones.
