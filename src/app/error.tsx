"use client";

import { Compass, RefreshCw } from "lucide-react";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="page-error">
      <Compass size={44} strokeWidth={1.3} aria-hidden="true" />
      <h1>Hagamos una pausa en el camino.</h1>
      <p>No pudimos abrir el explorador. Podés volver a intentarlo.</p>
      <button className="primary-button" onClick={reset}>
        <RefreshCw size={16} aria-hidden="true" />
        Volver a intentar
      </button>
    </main>
  );
}
