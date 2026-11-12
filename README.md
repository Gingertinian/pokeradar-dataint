# PokéRadar

Una aventura Pokémon por Argentina. Elegí un paisaje, viajá a un lugar real,
investigá señales y capturá tu próximo compañero con una Poké Ball.

**[Probar la aplicación](https://pokeradar-dataint-sable.vercel.app/)**

## Concepto y narrativa

El mapa es el centro de la experiencia. Cinco regiones reúnen catorce lugares
reales que sirven como punto de partida para explorar sus alrededores. El radar
busca señales en el encuadre actual; sus resultados se vinculan con marcadores
numerados y permiten entrar a un encuentro. La vegetación, el terreno y el clima
estimado influyen en las especies que aparecen.

Cada encuentro tiene una escena asociada al hábitat y una captura interactiva:
el lanzamiento, la puntería, la Ball, la baya y el giro influyen en el resultado.
El cuaderno conserva los hallazgos y la colección; el equipo tiene hasta seis
integrantes. También hay filtros, comparación de estadísticas y sonidos opcionales.

**Las apariciones son simuladas.** Los lugares y la cartografía son reales, pero
los Pokémon, sus coordenadas y las capturas no son observaciones reales. La app
no usa la ubicación del dispositivo. Las vistas previas de clima cambian la
ambientación visual, no la fuente meteorológica ni las afinidades calculadas.

## Ejecutar

Node.js 24 LTS y npm:

```bash
npm ci
npm run dev
```

Abrir http://127.0.0.1:4317. Para producción:

```bash
npm run build
npm start
```

La aplicación utiliza fuentes públicas y no necesita variables de entorno.

## El recorrido

- **Atlas de Argentina.** Cinco regiones y catorce lugares con identidad propia:
  Camet, Sendero Macuco, Valle de Horcones, La Movediza, las pasarelas del Perito
  Moreno y el sendero de Los Cóndores, entre otros. Elegibles desde el mapa o el
  panel de destinos.
- **Mapa navegable.** Cartografía vectorial, relieve con elevación real y satélite.
  La cámara acompaña el cambio de región, lugar y encuentro. Los grupos se abren
  al acercarse y la escala métrica ayuda a leer las distancias.
- **Navegación continua.** Las señales mantienen posiciones coherentes al mover
  la cámara; Atrás y Adelante recorren atlas, región y lugar. El enlace de la vista
  conserva centro y zoom. En escritorio, `/` abre el buscador y Escape cierra
  el panel o la ficha activa.
- **Encuentros contextuales.** El hábitat y el clima actual favorecen ciertos
  tipos. Cada búsqueda tiene una distribución reproducible; se puede iniciar una
  nueva para renovar las especies y sus posiciones. Algunas señales necesitan
  investigarse para revelar su identidad.
- **Ambiente visible.** Nubes, lluvia, nieve, luz solar y noche acompañan el mapa
  y la escena de encuentro. El control de ambiente permite vistas previas
  identificadas, sin modificar el clima real ni sus efectos sobre la selección
  de especies.
- **Captura.** Arrastrar y soltar hacia un objetivo móvil, con trayectoria,
  colisión y aro variable. Puede fallar, liberarse o huir. Las Balls, bayas,
  puntería y curva modifican una probabilidad visible del modelo propio.
  Cada lanzamiento consume una Ball; sólo una captura conseguida se registra en
  la colección. Si hay lugar, también se incorpora al equipo.
- **Escena de encuentro.** Pantalla completa con paisaje animado por hábitat.
  El Pokémon avisa antes de esquivar y luego baja la guardia. La baya lo calma;
  teclado y movimiento reducido permiten jugar sin ese requisito temporal.
  El resultado conecta directamente con la siguiente búsqueda del radar.
- **Radar local.** El botón explora alrededor del centro visible y también se
  puede elegir un punto del mapa. Los resultados muestran hasta tres rastros
  cercanos y los vinculan con marcadores numerados; al enfocar una tarjeta se
  destaca su ubicación. Mover la cámara cancela la búsqueda anterior y las
  señales se renuevan gradualmente. Si falta cobertura del terreno, se recurre
  al lugar de referencia; las posiciones siguen siendo una simulación.
- **Vuelo y giro.** Los gestos circulares cargan giro; al liberar, velocidad,
  gravedad y desviación lateral determinan el arco. El modo de teclado permite
  ajustar dirección, fuerza y giro.
- **Equipo y colección.** Seis integrantes activos y una colección persistente
  independiente: completar el equipo no impide seguir capturando. La Pokédex
  permite ver registros, colección o catálogo completo por generación. Los
  objetivos y el historial tienen sus propias vistas en el cuaderno. Podés elegir
  qué integrante te acompaña junto al radar sin quitarlo de la colección.
  Desde el radar podés aplicar o quitar un filtro por sus tipos.
- **Herramientas de exploración.** Nombre o número, varios tipos, generación,
  rango de estadísticas base, señales sin registrar, orden por distancia o
  estadísticas y comparación de dos fichas reales.
- **Sonido opcional.** Voces originales de PokéAPI al activar sonido o usar el
  control de la ficha.

## Arquitectura y stack

Next.js App Router y TypeScript estricto. Layout y entrada en servidor; el
explorador interactivo se compone de componentes de cliente. MapLibre se importa
dinámicamente con `ssr: false` y un worker emitido por Turbopack.

```text
src/app/                  Entrada, estilos y Route Handlers
src/components/           Explorador, destinos, encuentros, cuaderno y fichas
src/components/map/       Adaptador de MapLibre y marcadores
src/components/ui/        Imágenes, tipos y Poké Ball
src/hooks/                Consultas y almacenamiento local
src/lib/                  Geografía, hábitats, encuentros, clima y filtros
src/lib/server/           Normalización de PokéAPI
src/data/                 Catálogo, geografía y créditos
public/                   Logo y fotografías locales
```

`/api/pokemon/[id]` admite las primeras tres generaciones, valida la entrada,
consulta PokéAPI y normaliza imágenes, estadísticas y unidades con Zod.
`/api/weather/[site]` sólo admite destinos conocidos y consulta condiciones
actuales de Open-Meteo con timeout y caché de quince minutos.

TanStack Query gestiona caché, cancelación y errores. MapLibre controla la cámara;
Framer Motion anima fichas, marcadores, apuntado y captura. Las preferencias de movimiento reducido
eliminan el requisito de precisión temporal y reducen partículas y transiciones.
Tailwind CSS proporciona la base de estilos y tokens junto con las hojas del
proyecto.

## Geografía y datos

Las apariciones de Pokémon son una **simulación editorial sobre lugares reales**.
No representan observaciones de fauna, ubicación del usuario ni una ruta de
navegación peatonal.

Los terrenos y senderos iniciales proceden de OpenStreetMap. El radar amplía la
exploración usando cobertura y uso de suelo de las teselas visibles de OpenFreeMap,
también en satélite. Excluye agua, cauces, edificios e hielo cartografiado y no
interpreta la ausencia de datos como suelo válido. Los destinos conocidos siguen
siendo el respaldo cuando esa cobertura no está disponible. La superposición de
límites se retiró de la interfaz; la cartografía no acredita acceso peatonal.

Los datos y fuentes se conservan en `src/data/destinations.json`. La distribución
se calcula a partir del destino, día, número de búsqueda y afinidad climática.
Cambiar filtros conserva las coordenadas.

El clima es una estimación actual de modelo para una zona aproximada cercana al
centro del mapa; no hay una estación propia en cada aparición. Si el proveedor
falla, se conserva la exploración por hábitat y se informa la limitación.

El catálogo contiene 386 especies, con tipo, generación, hábitat y total de
estadísticas base tomados de los CSV públicos de PokéAPI. Se actualiza con:

```bash
npm run refresh:catalog
```

Las fichas completas se consultan al seleccionar una especie. Las descripciones
son opcionales y una falla de ese recurso conserva la ficha principal.

El equipo y el cuaderno usan almacenamiento local versionado. Una captura
confirmada incorpora la especie de forma idempotente: repetirla no la quita del
equipo ni duplica la colección. Los equipos anteriores se incorporan a la
colección como registros heredados, sin inventar datos de una captura.
Quitar una especie del equipo conserva su registro y permite reincorporarla.
Cancelar una escena antes de terminar cancela sus temporizadores. Si el
navegador impide persistir, el estado puede continuar temporalmente en memoria.

## Comprobaciones

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

Las pruebas cubren contratos de datos, límites del equipo, filtros y geografía.
Las verificaciones de la nueva expedición comprueban que los encuentros de los
catorce destinos quedan en sus terrenos o senderos, que Horcones excluye el
agua, que una búsqueda se reproduce y puede renovarse, y que el clima y los
objetivos se interpretan correctamente. La revisión visual en navegador es
necesaria para comprobar la captura, la cámara, los paneles y el uso móvil.

## Uso de inteligencia artificial

Trabajé con **Codex de OpenAI** en ciclos de implementación, revisión y mejora.
La IA ayudó a analizar el desafío, desarrollar componentes, explorar alternativas
de diseño y detectar problemas técnicos. En una etapa inicial se coordinaron
agentes en paralelo con tareas acotadas: uno trabajó sobre el mapa y otro sobre
pruebas de geografía, filtros y API, mientras avanzaba el resto de la aplicación.
El desarrollo posterior continuó con iteraciones directas guiadas por mis
observaciones. El logo y las escenas de encuentro también se generaron con IA.

Las iteraciones combinaron revisión del código y comprobación de recorridos en el
navegador. Por ejemplo, una versión inicial no cargaba correctamente el mapa y
necesitó ajustar el worker de MapLibre; otras ubicaciones resultaban arbitrarias
o caían en el mar, por lo que se incorporó información del terreno. También se
detectaron superposiciones en la interfaz y una captura demasiado automática:
se reorganizaron los controles y se incorporaron trayectoria, giro, puntería y
probabilidades. Las comprobaciones se enfocaron en los problemas y recorridos
relevantes para la experiencia.

## Próximos pasos

Con una semana adicional priorizaría:

1. Pruebas de extremo a extremo para los recorridos principales y los fallos de
   proveedores, incluyendo dispositivos táctiles reales y tecnologías de asistencia.
2. Mejorar la clasificación de hábitats y sus alternativas cuando faltan teselas,
   manteniendo explícita la naturaleza simulada de los encuentros.
3. Profundizar la respuesta visual y sonora de los encuentros y ajustar la
   dificultad a partir de pruebas con jugadores, sin depender solo de más efectos.
4. Optimizar recursos y tiempos de carga, y ampliar la cobertura de accesibilidad
   antes de incorporar más regiones.

## Fuentes y continuidad

Los créditos del logo, fotografías, sprites, clima y mapas están en
[docs/assets.md](docs/assets.md).

Las ubicaciones de Pokémon son una simulación. Este proyecto de prueba no está
afiliado a Pokémon ni a sus titulares.
