"use client";
import { useEffect, useRef, useState, type PointerEvent } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
  useReducedMotion,
} from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Keyboard,
  Leaf,
  Volume2,
  VolumeX,
  Sparkles,
} from "lucide-react";
import { useEncounterBehavior } from "@/hooks/use-encounter-behavior";
import { usePokemon } from "@/hooks/use-pokemon";
import { findPokemon } from "@/lib/catalog";
import { artworkUrl, pokemonName } from "@/lib/pokemon";
import {
  BALLS,
  catchProbability,
  qualifiesAsCurve,
  randomRoll,
  resolveThrow,
  type BallKind,
  type ThrowOutcome,
} from "@/lib/capture-game";
import type { encounterEnvironment } from "@/lib/encounter-environment";
import type { Weather } from "@/lib/weather";
import { Atmosphere, atmosphereState, type AtmospherePreview } from "@/components/atmosphere";
import { Pokeball } from "@/components/ui/pokeball";
import { PokemonImage } from "@/components/ui/pokemon-image";
import {
  accumulateSpin,
  assistedThrowVelocity,
  closestApproach,
  gestureVelocity,
  isThrowGesture,
  simulateThrow,
  type Vector2,
} from "@/lib/throw-physics";
import { TypeBadge } from "@/components/ui/type-badge";
import type { CaptureDetails } from "@/lib/journal";
import type { JournalStorageStatus } from "@/lib/journal-storage";
import type { TeamStorageStatus } from "@/lib/team-storage";
import { ThrowBall } from "@/components/ui/throw-ball";
import { pokemonMotion } from "@/lib/pokemon-motion";
import { HabitatScene } from "@/components/habitat-scene";

type Phase = "ready" | "dragging" | "flight" | "impact" | "settle" | "shake" | "result";
type Props = {
  id: number;
  setting: ReturnType<typeof encounterEnvironment>;
  weather: Weather | undefined;
  preview: AtmospherePreview;
  soundEnabled: boolean;
  teamFull: boolean;
  journalStorageStatus: JournalStorageStatus;
  teamStorageStatus: TeamStorageStatus;
  onSound: () => void;
  onCapture: (id: number, details: CaptureDetails) => "team" | "collection";
  onCollection: () => void;
  onDepart: (id: number) => void;
  onClose: () => void;
  onNext: () => void;
};
type Gesture = {
  startX: number;
  startY: number;
  lastX: number;
  lastY: number;
  lastTime: number;
  vx: number;
  vy: number;
  spin: number;
  rotation: number;
  delta: Vector2;
  origin: Vector2;
};
export function CaptureEncounter(p: Props) {
  const dialog = useRef<HTMLDialogElement>(null),
    scene = useRef<HTMLDivElement>(null),
    target = useRef<HTMLDivElement>(null);
  const aimDirection = useRef<HTMLInputElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);
  const gesture = useRef<Gesture | null>(null),
    timers = useRef<number[]>([]),
    locked = useRef(false);
  const [phase, setPhase] = useState<Phase>("ready");
  const [evaded, setEvaded] = useState(false);
  const [outcome, setOutcome] = useState<ThrowOutcome | null>(null);
  const [recordLocation, setRecordLocation] = useState<"team" | "collection" | null>(null);
  const [ball, setBall] = useState<BallKind>("poke");
  const [stock, setStock] = useState<Record<BallKind, number>>({ poke: 8, great: 3, ultra: 1 });
  const [berries, setBerries] = useState(2),
    [berry, setBerry] = useState(false);
  const [attempt, setAttempt] = useState(0),
    [feedback, setFeedback] = useState(""),
    [chance, setChance] = useState<number | null>(null);
  const [assist, setAssist] = useState(false),
    [direction, setDirection] = useState(50),
    [power, setPower] = useState(61);
  const [aimPreview, setAimPreview] = useState<Vector2 | null>(null);
  const [endpoint, setEndpoint] = useState({ x: 0, y: 0 }),
    [frozenX, setFrozenX] = useState(0);
  const [frozenY, setFrozenY] = useState(0),
    [landing, setLanding] = useState({ x: 0, y: 0 });
  const panX = useSpring(0, { stiffness: 55, damping: 22 }),
    panY = useSpring(0, { stiffness: 55, damping: 22 });
  const [spinDirection, setSpinDirection] = useState(0),
    [assistSpin, setAssistSpin] = useState(0);
  const [flightFrames, setFlightFrames] = useState({
    x: [0],
    y: [0],
    rotation: [0],
    duration: 0.6,
  });
  const dragRotation = useMotionValue(0),
    spinVisual = useMotionValue(0);
  const dragX = useMotionValue(0),
    dragY = useMotionValue(0);
  const reduced = useReducedMotion();
  const { data, isPending, isError, refetch } = usePokemon(p.id);
  const pokemon = findPokemon(p.id)!,
    name = pokemonName(pokemon.name);
  const busy = ["flight", "impact", "settle", "shake"].includes(phase);
  const flying = pokemon.types.includes("flying") || pokemon.types.includes("ghost");
  const finished = phase === "result" && (outcome === "caught" || outcome === "fled");
  const available = Object.values(stock).some((n) => n > 0);
  const exhausted = !available && !busy && !finished;
  const behavior = useEncounterBehavior(
    pokemon.captureRate,
    busy || finished || exhausted || isPending || isError,
    Boolean(berry || reduced || assist),
  );
  useEffect(() => {
    if (!assist || busy || finished || exhausted || isPending || isError) return;
    const box = scene.current,
      creature = target.current;
    if (!box || !creature) return;
    let frame = 0;
    const update = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const area = box.getBoundingClientRect(),
          body = creature.getBoundingClientRect();
        if (!area.width || !area.height) return;
        const aim = {
          x: body.left + body.width / 2 - area.left,
          y: body.top + body.height / 2 - area.top,
        };
        const flight = simulateThrow({
          start: { x: area.width / 2, y: area.height - 50 },
          velocity: assistedThrowVelocity(direction, power, area.height),
          spin: assistSpin / 100,
          target: aim,
          radius: Math.min(area.width * 0.19, 82),
          width: area.width,
          height: area.height,
        });
        const point = closestApproach(flight.points, aim);
        setAimPreview(
          point.x >= 0 && point.x <= area.width && point.y >= 0 && point.y <= area.height
            ? point
            : null,
        );
      });
    };
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
    observer?.observe(box);
    update();
    return () => {
      window.cancelAnimationFrame(frame);
      observer?.disconnect();
    };
  }, [assist, busy, finished, exhausted, isPending, isError, direction, power, assistSpin]);
  const baseChance = catchProbability(
    pokemon.captureRate,
    ball,
    berry,
    0.5,
    assist
      ? qualifiesAsCurve(assistSpin / 100)
      : (phase === "dragging" || busy) && spinDirection !== 0,
  );
  useEffect(() => {
    const el = dialog.current;
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    el?.showModal();
    const pending = timers.current;
    return () => {
      pending.forEach(window.clearTimeout);
      el?.close();
    };
  }, []);
  function closeEncounter() {
    dialog.current?.close();
    p.onClose();
    window.requestAnimationFrame(() => {
      const previous = returnFocus.current;
      const fallback = document.querySelector<HTMLButtonElement>(".field-radar-button");
      (previous && previous !== document.body && previous.isConnected ? previous : fallback)?.focus(
        {
          preventScroll: true,
        },
      );
    });
  }
  useEffect(() => {
    if (!p.soundEnabled || !data?.cry) return;
    const audio = new Audio(data.cry);
    audio.volume = 0.4;
    void audio.play().catch(() => {});
    return () => audio.pause();
  }, [p.soundEnabled, data?.cry]);
  function launch(startPoint: Vector2, velocity: Vector2, spin: number) {
    if (locked.current || finished || isPending || isError || stock[ball] === 0) return;
    const box = scene.current?.getBoundingClientRect(),
      body = target.current?.getBoundingClientRect();
    if (!box || !body) return;
    const targetX = body.left + body.width / 2 - box.left,
      targetY = body.top + body.height / 2 - box.top;
    const radius = Math.min(box.width * 0.19, 82);
    const flight = simulateThrow({
      start: startPoint,
      velocity,
      spin,
      target: { x: targetX, y: targetY },
      radius,
      width: box.width,
      height: box.height,
    });
    const dodged = behavior === "dodge" && flight.hit;
    setEvaded(dodged);
    const { x, y } = flight.impact;
    if (dodged) {
      flight.points.push({ x: x + spin * 20, y: y + 65 }, { x: x + spin * 35, y: box.height + 45 });
      flight.duration += 0.3;
    }
    const distance = Math.hypot(x - targetX, y - targetY),
      curve = qualifiesAsCurve(spin);
    setFlightFrames({
      x: flight.points.map((point) => point.x - box.width / 2),
      y: flight.points.map((point) => point.y - (box.height - 50)),
      rotation: flight.points.map((_, i) => dragRotation.get() + spin * i * 24),
      duration: flight.duration,
    });
    const innerRadius =
      (target.current?.querySelector(".game-target-ring")?.getBoundingClientRect().width ??
        radius * 2) / 2;
    const hit = flight.hit && !dodged;
    const precision =
      reduced || assist
        ? Math.max(0, 1 - distance / radius)
        : distance <= innerRadius
          ? Math.max(0.5, 1 - (innerRadius / radius) * 0.5)
          : 0.15;
    const accuracy = Math.min(1, precision + (behavior === "opening" ? 0.15 : 0));
    const result = resolveThrow(
      {
        rate: pokemon.captureRate,
        ball,
        berry,
        accuracy,
        curve,
        hit: flight.hit,
        evading: dodged,
        attempt: attempt + 1,
      },
      randomRoll,
    );
    locked.current = true;
    gesture.current = null;
    setEndpoint({ x: x - box.width / 2, y: y - (box.height - 50) });
    setFrozenX(targetX - box.width / 2);
    setFrozenY(targetY - (target.current!.offsetTop + target.current!.offsetHeight / 2));
    setLanding({
      x: x - box.width / 2,
      y: Math.min(box.height - 95, targetY + body.height * 0.48) - (box.height - 50),
    });
    setStock((old) => ({ ...old, [ball]: old[ball] - 1 }));
    setAttempt((n) => n + 1);
    setChance(hit ? result.chance : null);
    setOutcome(null);
    const throwFeedback = dodged
      ? "Lo esquivó. Esperá a que vuelva a bajar la guardia."
      : !hit
        ? flight.missReason === "weak"
          ? "Faltó impulso: deslizá más rápido hacia arriba"
          : flight.missReason === "short"
            ? "El tiro quedó corto: necesitás más fuerza"
            : "La Ball se fue hacia un costado: ajustá la dirección"
        : accuracy > 0.8
          ? "Impacto excelente"
          : accuracy > 0.45
            ? "Gran impacto"
            : curve
              ? "Impacto con curva"
              : "Impacto";
    setFeedback(throwFeedback);
    if (hit) setBerry(false);
    dragX.set(0);
    dragY.set(0);
    setPhase("flight");
    const travelMs = reduced ? 80 : flight.duration * 1000;
    if (hit) {
      timers.current.push(window.setTimeout(() => setPhase("impact"), travelMs));
      timers.current.push(
        window.setTimeout(() => setPhase("settle"), travelMs + (reduced ? 20 : 180)),
      );
      timers.current.push(
        window.setTimeout(() => setPhase("shake"), travelMs + (reduced ? 40 : 680)),
      );
    }
    timers.current.push(
      window.setTimeout(
        () => {
          setOutcome(result.outcome);
          if (result.outcome === "caught") {
            setRecordLocation(
              p.onCapture(p.id, { ball, attempts: attempt + 1, quality: throwFeedback }),
            );
          } else if (result.outcome === "fled") p.onDepart(p.id);
          locked.current = false;
          setPhase("result");
          if (result.outcome === "miss" || result.outcome === "breakout")
            timers.current.push(
              window.setTimeout(
                () => setPhase((current) => (current === "result" ? "ready" : current)),
                750,
              ),
            );
          const next = Object.keys(BALLS).find(
            (key) => stock[key as BallKind] - (key === ball ? 1 : 0) > 0,
          ) as BallKind | undefined;
          if (stock[ball] === 1 && next) setBall(next);
        },
        reduced ? 240 : flight.duration * 1000 + (hit ? 2730 : 120),
      ),
    );
  }
  function start(event: PointerEvent<HTMLButtonElement>) {
    if (busy || finished || isPending || isError || !stock[ball]) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const now = event.timeStamp;
    const box = scene.current!.getBoundingClientRect(),
      ballBox = event.currentTarget.getBoundingClientRect();
    gesture.current = {
      startX: event.clientX,
      startY: event.clientY,
      lastX: event.clientX,
      lastY: event.clientY,
      lastTime: now,
      vx: 0,
      vy: 0,
      spin: 0,
      rotation: 0,
      delta: { x: 0, y: 0 },
      origin: {
        x: ballBox.left + ballBox.width / 2 - box.left,
        y: ballBox.top + ballBox.height / 2 - box.top,
      },
    };
    dragRotation.set(0);
    spinVisual.set(0);
    setSpinDirection(0);
    setPhase("dragging");
    setOutcome(null);
    setFeedback("");
  }
  function move(event: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current,
      box = scene.current?.getBoundingClientRect();
    if (!g || !box) return;
    const now = event.timeStamp,
      dt = Math.max(8, now - g.lastTime);
    const delta = { x: event.clientX - g.lastX, y: event.clientY - g.lastY };
    g.vx = g.vx * 0.45 + (delta.x / dt) * 0.55;
    g.vy = g.vy * 0.45 + (delta.y / dt) * 0.55;
    g.spin = accumulateSpin(g.spin, g.delta, delta, dt);
    if (Math.hypot(g.delta.x, g.delta.y) > 1 && Math.hypot(delta.x, delta.y) > 1)
      g.rotation +=
        (Math.atan2(
          g.delta.x * delta.y - g.delta.y * delta.x,
          g.delta.x * delta.x + g.delta.y * delta.y,
        ) *
          180) /
        Math.PI;
    g.delta = delta;
    g.lastX = event.clientX;
    g.lastY = event.clientY;
    g.lastTime = now;
    dragX.set(
      Math.max(-box.width * 0.3, Math.min(box.width * 0.3, (event.clientX - g.startX) * 0.55)),
    );
    dragY.set(Math.max(-box.height * 0.19, Math.min(35, (event.clientY - g.startY) * 0.55)));
    dragRotation.set(g.rotation);
    spinVisual.set(Math.min(1, Math.abs(g.spin)));
    setSpinDirection(qualifiesAsCurve(g.spin) ? Math.sign(g.spin) : 0);
  }
  function release(event: PointerEvent<HTMLButtonElement>) {
    const g = gesture.current,
      box = scene.current?.getBoundingClientRect();
    if (!g || !box) return;
    event.currentTarget.releasePointerCapture(event.pointerId);
    gesture.current = null;
    const displacement = { x: event.clientX - g.startX, y: event.clientY - g.startY };
    if (!isThrowGesture(displacement)) {
      dragX.set(0);
      dragY.set(0);
      spinVisual.set(0);
      setSpinDirection(0);
      setPhase("ready");
      setFeedback("Deslizá la Ball hacia arriba para lanzarla.");
      return;
    }
    const decay = Math.exp(-Math.max(0, event.timeStamp - g.lastTime) / 150);
    const startPoint = { x: box.width / 2 + dragX.get(), y: box.height - 50 + dragY.get() };
    const velocity = gestureVelocity(
      displacement,
      { x: g.vx * 1000 * decay, y: g.vy * 1000 * decay },
      box.height,
    );
    spinVisual.set(0);
    launch(startPoint, velocity, g.spin);
  }
  function cancelGesture() {
    gesture.current = null;
    dragX.set(0);
    dragY.set(0);
    spinVisual.set(0);
    setSpinDirection(0);
    setPhase("ready");
  }
  const message =
    outcome === "caught"
      ? "Captura conseguida"
      : outcome === "fled"
        ? "Huyó del encuentro"
        : outcome === "breakout"
          ? "Se liberó. Podés volver a intentar."
          : outcome === "miss"
            ? feedback
            : phase === "dragging"
              ? spinDirection
                ? "Giro cargado · soltá hacia arriba"
                : "Soltá hacia el centro del aro"
              : assist
                ? "Ajustá la puntería y lanzá la Ball"
                : feedback || "Arrastrá la Ball y lanzala hacia el Pokémon";
  return (
    <dialog
      ref={dialog}
      className="capture-dialog capture-play immersive-encounter"
      data-phase={phase}
      data-outcome={outcome ?? ""}
      data-behavior={berry ? "calm" : behavior}
      data-assist={assist && !finished && !exhausted}
      data-night={atmosphereState(p.weather, p.preview).night}
      aria-labelledby="encounter-title"
      onCancel={(e) => {
        e.preventDefault();
        closeEncounter();
      }}
    >
      <header className="encounter-header">
        <button className="encounter-back" onClick={closeEncounter} aria-label="Cerrar encuentro">
          <ArrowLeft size={18} />
          <span>Volver a explorar</span>
        </button>
        <span className="encounter-place-header">
          {p.setting.name}
          <small>{p.setting.label}</small>
        </span>
        <div>
          <button
            className="icon-button"
            aria-label={
              p.soundEnabled ? "Desactivar sonido del encuentro" : "Activar sonido del encuentro"
            }
            onClick={p.onSound}
          >
            {p.soundEnabled ? <Volume2 size={17} /> : <VolumeX size={17} />}
          </button>
        </div>
      </header>
      <div className="encounter-identity">
        <span className="encounter-eyebrow">
          {finished && outcome === "caught" ? "REGISTRO CONSEGUIDO" : "POKÉMON SALVAJE"} · #
          {String(p.id).padStart(3, "0")}
        </span>
        <h2 id="encounter-title">{name}</h2>
        <div className="type-badges">
          {pokemon.types.map((type) => (
            <TypeBadge type={type} key={type} />
          ))}
        </div>
      </div>
      <div
        className={`capture-scene habitat-${p.setting.visualHabitat}`}
        ref={scene}
        onPointerMove={(e) => {
          if (reduced || busy) return;
          const b = e.currentTarget.getBoundingClientRect();
          panX.set((0.5 - (e.clientX - b.left) / b.width) * 13);
          panY.set((0.5 - (e.clientY - b.top) / b.height) * 8);
        }}
        onPointerLeave={() => {
          panX.set(0);
          panY.set(0);
        }}
      >
        <HabitatScene habitat={p.setting.visualHabitat} panX={panX} panY={panY} />
        <Atmosphere weather={p.weather} preview={p.preview} scene />
        {assist && !busy && !finished && !exhausted && aimPreview && (
          <span
            className="assisted-aim-preview"
            style={{ left: aimPreview.x, top: aimPreview.y }}
            aria-hidden="true"
          />
        )}
        <motion.div
          className="encounter-ground-shadow"
          aria-hidden="true"
          animate={{
            x: busy ? frozenX : 0,
            scale: flying ? 0.72 : 1,
            opacity: ["impact", "settle", "shake"].includes(phase) ? 0 : 0.32,
          }}
          transition={{ duration: 0.3 }}
        />
        <div className="encounter-behavior" aria-live="polite">
          {!finished && !exhausted && !busy && (
            <span key={behavior}>
              <i />
              {berry
                ? "Calmado por la baya"
                : behavior === "alert"
                  ? "Está por moverse…"
                  : behavior === "dodge"
                    ? "Está esquivando · esperá"
                    : behavior === "opening"
                      ? "Bajó la guardia · ¡ahora!"
                      : "Observá sus movimientos"}
            </span>
          )}
        </div>
        <motion.div
          ref={target}
          className="moving-target"
          {...pokemonMotion({
            phase,
            outcome,
            behavior,
            flying,
            calm: berry,
            reduced: Boolean(reduced),
            evaded,
            frozenX,
            frozenY,
          })}
        >
          {!finished && !exhausted && (
            <div
              className="game-target-ring"
              style={{
                borderColor:
                  baseChance > 0.6 ? "#54b18b" : baseChance > 0.35 ? "#e6b24e" : "#e47375",
              }}
            />
          )}
          <PokemonImage id={p.id} name={name} size={214} src={data?.artwork ?? artworkUrl(p.id)} />
        </motion.div>
        {!finished && !exhausted && !isPending && !isError && (
          <motion.button
            type="button"
            className="throw-pokeball gesture-ball"
            aria-label={`Arrastrar ${BALLS[ball].name} hacia el Pokémon; presioná Enter para apuntar con teclado`}
            onPointerDown={start}
            onPointerMove={move}
            onPointerUp={release}
            onPointerCancel={cancelGesture}
            onClick={(e) => {
              if (e.detail === 0) {
                setAssist(true);
                window.requestAnimationFrame(() => aimDirection.current?.focus());
              }
            }}
            disabled={busy || !available}
            style={phase === "dragging" ? { x: dragX, y: dragY, rotate: dragRotation } : undefined}
            animate={
              phase === "flight"
                ? {
                    x: flightFrames.x,
                    y: flightFrames.y,
                    rotate: flightFrames.rotation,
                    scale: flightFrames.x.map(
                      (_, i) => 1 - (i / Math.max(1, flightFrames.x.length - 1)) * 0.45,
                    ),
                  }
                : phase === "impact"
                  ? { x: endpoint.x, y: endpoint.y, scale: 0.48, rotate: 0 }
                  : phase === "settle"
                    ? {
                        x: landing.x,
                        y: [endpoint.y, landing.y, landing.y - 18, landing.y],
                        scale: 0.48,
                        rotate: [0, 18, 8, 0],
                      }
                    : phase === "shake"
                      ? {
                          x: landing.x,
                          y: landing.y,
                          scale: 0.48,
                          rotate: [0, -22, 0, 0, 20, 0, 0, -17, 0],
                        }
                      : phase === "dragging"
                        ? undefined
                        : { x: 0, y: 0, scale: 1, rotate: 0 }
            }
            transition={{
              duration:
                phase === "flight"
                  ? flightFrames.duration
                  : phase === "impact"
                    ? 0.18
                    : phase === "shake"
                      ? 2
                      : 0.5,
              ease: phase === "flight" ? "linear" : "easeInOut",
              repeat: 0,
            }}
          >
            <motion.span
              className="ball-spin-aura"
              style={{ opacity: spinVisual }}
              aria-hidden="true"
            />
            <span>
              <ThrowBall
                kind={ball}
                active={phase === "flight" || phase === "settle" || phase === "dragging"}
                rotation={dragRotation}
              />
            </span>
          </motion.button>
        )}
        <AnimatePresence>
          {phase === "impact" && (
            <motion.div
              className="encounter-impact"
              key={attempt}
              initial={{ opacity: 0.9, scale: 0.3 }}
              animate={{ opacity: 0, scale: 1.8 }}
              transition={{ duration: reduced ? 0 : 0.45 }}
              aria-hidden="true"
            />
          )}
          {outcome === "caught" && phase === "result" && (
            <motion.div
              className="capture-seal"
              initial={reduced ? false : { opacity: 0, y: 20, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 22 }}
            >
              <Check size={18} />
              <span>¡Capturado!</span>
              <Sparkles size={18} />
            </motion.div>
          )}
        </AnimatePresence>
        {isPending && (
          <span className="encounter-fetching" role="status">
            Cargando encuentro…
          </span>
        )}
        {isError && (
          <div className="encounter-api-error" role="alert">
            <p>No pudimos cargar la ficha.</p>
            <button className="secondary-button" onClick={() => void refetch()}>
              Reintentar
            </button>
          </div>
        )}
      </div>
      <div className="game-feedback" role="status">
        <strong>
          {busy
            ? phase === "flight"
              ? "La Ball está en vuelo…"
              : phase === "impact"
                ? "¡Impacto!"
                : phase === "settle"
                  ? "La Ball cae al suelo…"
                  : "Está intentando liberarse…"
            : !available && !finished
              ? "Se terminaron tus Balls"
              : message}
        </strong>
        <small>
          {phase === "flight"
            ? "Esperá el resultado."
            : outcome === "caught" && phase === "result"
              ? p.journalStorageStatus !== "ok"
                ? p.teamStorageStatus !== "ok" && recordLocation === "team"
                  ? "La captura y el equipo figuran solo en esta sesión."
                  : "La captura figura en esta sesión; el cuaderno no pudo guardarse."
                : p.teamStorageStatus !== "ok" && recordLocation === "team"
                  ? "Captura guardada en el cuaderno; el equipo no pudo guardarse."
                  : recordLocation === "team"
                    ? "Registrado en tu colección y disponible en tu equipo"
                    : "Registrado en tu colección; el equipo conserva sus seis integrantes"
              : exhausted
                ? "Volvé al mapa para continuar explorando."
                : chance !== null && (outcome || busy)
                  ? `${feedback} · Retención: ${Math.round(chance * 100)}%`
                  : outcome === "miss"
                    ? "Ajustá la dirección y la fuerza para volver a intentar."
                    : `Captura al acertar: ~${Math.round(baseChance * 100)}% · Influyen puntería, Ball y baya`}
        </small>
        {p.teamFull && !finished && !exhausted && (
          <small>Equipo completo · Las capturas se conservan en tu colección.</small>
        )}
      </div>
      {!finished && !exhausted && (
        <div className="encounter-kit">
          <div className="ball-choices" aria-label="Elegir Ball">
            {(Object.keys(BALLS) as BallKind[]).map((kind) => (
              <button
                key={kind}
                disabled={busy || !stock[kind]}
                aria-pressed={ball === kind}
                onClick={() => setBall(kind)}
              >
                <span className="kit-ball-icon">
                  <Pokeball size={32} variant={kind} />
                </span>
                <span>
                  {BALLS[kind].name}
                  <small>
                    {stock[kind]} {stock[kind] === 1 ? "disponible" : "disponibles"}
                  </small>
                </span>
              </button>
            ))}
          </div>
          <button
            className="berry-button"
            disabled={busy || berry || berries === 0}
            aria-pressed={berry}
            onClick={() => {
              setBerry(true);
              setBerries((n) => n - 1);
            }}
          >
            <Leaf size={19} />
            <span>{berry ? "Baya activa" : `Usar baya · ${berries}`}</span>
            <small>Mejora la retención y calma el movimiento</small>
          </button>
          <button
            className="keyboard-mode"
            aria-expanded={assist}
            onClick={() => setAssist(!assist)}
          >
            <Keyboard size={14} />
            Apuntar con teclado
          </button>
          {assist && (
            <div className="keyboard-aim">
              <label>
                Dirección
                <input
                  ref={aimDirection}
                  aria-label="Dirección del lanzamiento"
                  aria-valuetext={
                    direction === 50
                      ? "Centrado"
                      : `${Math.abs(direction - 50)} a la ${direction < 50 ? "izquierda" : "derecha"}`
                  }
                  type="range"
                  min="5"
                  max="95"
                  value={direction}
                  onChange={(e) => setDirection(Number(e.target.value))}
                />
                <small>
                  {direction === 50
                    ? "Centrado"
                    : `${Math.abs(direction - 50)} ${direction < 50 ? "←" : "→"}`}
                </small>
              </label>
              <label>
                Fuerza
                <input
                  aria-label="Fuerza del lanzamiento"
                  aria-valuetext={`${power} por ciento`}
                  type="range"
                  min="10"
                  max="95"
                  value={power}
                  onChange={(e) => setPower(Number(e.target.value))}
                />
                <small>{power}%</small>
              </label>
              <label className="spin-slider">
                Giro
                <input
                  aria-label="Giro del lanzamiento"
                  aria-valuetext={
                    assistSpin === 0
                      ? "Recto"
                      : `${Math.abs(assistSpin)} por ciento hacia la ${assistSpin > 0 ? "derecha" : "izquierda"}`
                  }
                  type="range"
                  min="-100"
                  max="100"
                  step="10"
                  value={assistSpin}
                  onChange={(e) => setAssistSpin(Number(e.target.value))}
                />
                <small>
                  {assistSpin === 0
                    ? "Recto"
                    : assistSpin > 0
                      ? "Comba a la derecha"
                      : "Comba a la izquierda"}
                </small>
              </label>
              <button
                className="capture-primary"
                disabled={busy || !stock[ball] || isPending || isError}
                onClick={() => {
                  const b = scene.current?.getBoundingClientRect();
                  if (b) {
                    launch(
                      { x: b.width / 2, y: b.height - 50 },
                      assistedThrowVelocity(direction, power, b.height),
                      assistSpin / 100,
                    );
                  }
                }}
              >
                Lanzar con esta puntería
              </button>
              <p className="assisted-aim-note">
                La marca es orientativa; el Pokémon puede moverse.
              </p>
            </div>
          )}
        </div>
      )}
      {(finished || exhausted) && (
        <div className="capture-actions">
          {outcome === "caught" && (
            <button className="capture-secondary" onClick={p.onCollection}>
              Ver mi colección
            </button>
          )}
          <button
            className="capture-primary"
            onClick={outcome === "caught" ? p.onNext : closeEncounter}
          >
            {outcome === "caught" ? "Buscar otro encuentro" : "Volver al mapa"}
            <ArrowRight size={16} />
          </button>
        </div>
      )}
    </dialog>
  );
}
