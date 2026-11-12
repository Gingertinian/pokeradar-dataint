import Link from "next/link";
import { Compass } from "lucide-react";

export default function NotFound() {
  return (
    <main className="page-error">
      <Compass size={44} aria-hidden="true" />
      <h1>Este camino todavía no está en el mapa.</h1>
      <Link className="primary-button" href="/">
        Volver a explorar
      </Link>
    </main>
  );
}
