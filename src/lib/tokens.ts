// Design tokens — single source of truth for all color/radius/font constants.
// Import in style objects: import { C, RADIUS } from "@/lib/tokens";

export const C = {
  bg:         "#0f0d1a",
  surface:    "#1a1730",
  surfaceAlt: "#221f38",
  border:     "#2e2a4a",
  mint:       "#00e5c3",
  mintDim:    "#00b89c",
  purple:     "#8b80b0",
  text:       "#f0eeff",
  textDim:    "#e8e0ff",
  red:        "#ff4f6d",
  amber:      "#ffb547",
  blue:       "#3b82f6",
  violet:     "#5a4a9e",
} as const;

export const RADIUS = {
  sm:  8,
  md:  12,
  lg:  16,
  xl:  20,
  full: 999,
} as const;

export const FONT = {
  body: "'Exo 2', sans-serif",
  mono: "'Space Mono', monospace",
} as const;
