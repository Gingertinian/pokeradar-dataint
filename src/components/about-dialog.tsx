"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import { ArrowUpRight, ChevronDown, X } from "lucide-react";
import imageCredits from "@/data/image-credits.json";
import { REGIONS } from "@/lib/regions";

export function AboutDialog({ onClose }: { onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const dialog = ref.current;
    returnFocus.current =
      document.activeElement instanceof HTMLElement ? document.activeElement : null;
    dialog?.showModal();
    return () => dialog?.close();
  }, []);

  function close() {
    ref.current?.close();
    if (returnFocus.current?.isConnected) returnFocus.current.focus({ preventScroll: true });
    onClose();
  }

  return (
    <dialog
      ref={ref}
      className="about-dialog"
      aria-labelledby="about-title"
      onCancel={(event) => {
        event.preventDefault();
        close();
      }}
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="about-inner">
        <div className="about-heading">
          <Image src="/brand/pokeradar-logo.png" alt="" width={42} height={42} />
          <button className="icon-button" aria-label="Cerrar información" onClick={close}>
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <span className="section-kicker">ATLAS DE CAMPO</span>
        <h2 id="about-title">
          Cinco paisajes.
          <br />
          Una expedición.
        </h2>
        <p>
          PokéRadar conecta el universo Pokémon con los biomas de Argentina. Explorá cada región y
          armá un equipo para tu recorrido.
        </p>
        <div className="about-guide">
          <details>
            <summary>
              Exploración y clima <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>
              Partí de uno de los catorce destinos o mové y acercá el mapa. El radar ofrece hasta
              tres señales próximas al centro visible. El hábitat se aproxima con datos del mapa y
              las apariciones son simuladas.
            </p>
            <p>
              Open-Meteo estima el clima en una zona cercana al centro del mapa y modifica la
              afinidad de las especies. Las vistas previas de ambiente son solo visuales y no
              cambian ese cálculo.
            </p>
          </details>
          <details>
            <summary>
              Encuentros y equipo <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>
              Girá y lanzá la Ball hacia el Pokémon. La puntería, la comba, la Ball y la baya
              influyen en la probabilidad: también puede liberarse o huir. Las Balls y bayas se
              reponen al iniciar otro encuentro.
            </p>
            <p>
              El Pokémon avisa antes de esquivar; la baya lo calma. El modo de teclado y la
              preferencia de movimiento reducido eliminan esa exigencia temporal. Con teclado, una
              marca orientativa ayuda a ajustar el lanzamiento. El equipo admite seis integrantes y
              las demás capturas quedan en tu colección.
            </p>
            <p>Son reglas de esta aventura, no una reproducción de Pokémon GO.</p>
          </details>
          <details>
            <summary>
              Progreso y privacidad <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>
              El cuaderno y el equipo se guardan en este navegador, incluidas las posiciones
              simuladas de los hallazgos para volver a esas zonas. La aplicación no utiliza el GPS
              del dispositivo. Las ilustraciones representan ambientes; no son fotos de cada lugar.
            </p>
          </details>
          <details>
            <summary>
              Fuentes y créditos <ChevronDown size={16} aria-hidden="true" />
            </summary>
            <p>
              Fichas y estadísticas de PokéAPI; cartografía de OpenFreeMap y OpenStreetMap, clima de
              Open-Meteo y elevación de Mapterhorn para la vista Relieve.
            </p>
            <div className="about-sources">
              <a href="https://pokeapi.co/" target="_blank" rel="noreferrer">
                PokéAPI <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              <a href="https://openfreemap.org/" target="_blank" rel="noreferrer">
                OpenFreeMap <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              <a href="https://open-meteo.com/" target="_blank" rel="noreferrer">
                Open-Meteo <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              <a href="https://mapterhorn.com/attribution/" target="_blank" rel="noreferrer">
                Mapterhorn <ArrowUpRight size={14} aria-hidden="true" />
              </a>
              <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">
                OpenStreetMap <ArrowUpRight size={14} aria-hidden="true" />
              </a>
            </div>
            <h3>Fotos de las regiones</h3>
            <ul className="asset-credit-list">
              {imageCredits.map((credit) => (
                <li key={credit.file}>
                  <a href={credit.source} target="_blank" rel="noreferrer">
                    {REGIONS.find((region) => region.image === credit.file)?.name ?? credit.title}
                  </a>
                  {" · "}
                  {credit.artist}
                  {" · "}
                  {credit.license}
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </dialog>
  );
}
