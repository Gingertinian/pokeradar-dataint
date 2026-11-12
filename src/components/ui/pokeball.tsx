import { useId } from "react";

export function Pokeball({
  size = 32,
  className = "",
  variant = "poke",
}: {
  size?: number;
  className?: string;
  variant?: "poke" | "great" | "ultra";
}) {
  const id = useId().replaceAll(":", "");
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`${id}-red`} x1=".2" y1="0" x2=".8" y2="1">
          <stop stopColor="#ff7166" />
          <stop offset="1" stopColor="#d83042" />
        </linearGradient>
        <radialGradient id={`${id}-white`} cx=".3" cy=".2" r=".8">
          <stop stopColor="#fff" />
          <stop offset="1" stopColor="#dbe7ef" />
        </radialGradient>
        <radialGradient id={`${id}-shade`} cx=".3" cy=".25" r=".8">
          <stop stopColor="#fff" stopOpacity=".22" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
          <stop offset="1" stopColor="#17334b" stopOpacity=".22" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="46" fill={`url(#${id}-white)`} stroke="#25394c" strokeWidth="4" />
      <path
        d="M4 50a46 46 0 0 1 92 0Z"
        fill={variant === "great" ? "#327dcc" : variant === "ultra" ? "#243342" : `url(#${id}-red)`}
      />
      {variant === "great" && (
        <path d="M14 24 28 13 38 27 27 42 14 37ZM86 24 72 13 62 27 73 42 86 37Z" fill="#ee5361" />
      )}
      {variant === "ultra" && <path d="M22 14 34 8v31H22Zm44-6 12 6v25H66Z" fill="#f1c34f" />}
      <path d="M5 50h90" stroke="#25394c" strokeWidth="7" />
      <circle cx="50" cy="50" r="15" fill="#fff" stroke="#25394c" strokeWidth="6" />
      <circle cx="50" cy="50" r="7" fill="#e9f1f4" stroke="#cad9e2" strokeWidth="1.5" />
      <circle cx="50" cy="50" r="46" fill={`url(#${id}-shade)`} />
      <path
        d="M20 30a34 34 0 0 1 20-14"
        fill="none"
        stroke="#fff"
        strokeWidth="5"
        strokeLinecap="round"
        opacity=".65"
      />
    </svg>
  );
}
