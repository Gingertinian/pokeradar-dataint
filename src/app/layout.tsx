import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource/dm-sans/400.css";
import "@fontsource/dm-sans/500.css";
import "@fontsource/dm-sans/600.css";
import "@fontsource/dm-sans/700.css";
import "@fontsource/ibm-plex-mono/400.css";
import "@fontsource/ibm-plex-mono/500.css";
import "./globals.css";
import "./expedition.css";
import "./pokemon-world.css";
import "./gameplay.css";
import "./hud.css";
import "./expedition-loop.css";
import "./game-world.css";
import "./world-depth.css";
import "./desktop-refinement.css";
import "./discovery.css";
import { Providers } from "@/components/providers";

export const metadata: Metadata = {
  title: "PokéRadar · Atlas de campo",
  description:
    "Una expedición Pokémon por los biomas de Argentina. Explorá el mapa, conocé cada especie y armá tu equipo.",
  robots: { index: false, follow: false },
  icons: { icon: "/brand/pokeradar-logo.png" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#f8f7f2",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
