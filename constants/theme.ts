import { Platform } from "react-native";

// ─── Neo-Gothic Dark Techno Palette ─────────────────────────────────────────
// Black base · Ember orange accent · Dim amber midtones · Ash borders
const palette = {
  // Backgrounds
  bg:              "#0A0A0A",   // near-black base
  surface:         "#111111",   // card surface
  surfaceAlt:      "#171717",   // slightly lifted surface
  surfaceElevated: "#1E1E1E",   // modal / elevated card
  panel:           "#0E0E0E",   // inset / dark panel
  panelAlt:        "#161616",   // secondary inset

  // Borders
  border:          "#222222",   // hairline dividers
  borderStrong:    "#2E2E2E",   // visible separators
  borderAccent:    "#FF5500",   // orange border highlight

  // Accent — ember orange
  accent:          "#FF5500",   // primary CTA / active state
  accentSoft:      "#FF7A33",   // hover / secondary accent
  accentDim:       "#7A2800",   // muted accent bg (badge, glow fill)

  // Text
  text:            "#F0EDE8",   // primary text — warm white
  textMuted:       "#6B6560",   // secondary labels
  textFaint:       "#3A3633",   // disabled / placeholder
  iconMuted:       "#4A4540",   // icon default

  // Status
  danger:          "#CC2200",
  success:         "#1A7A4A",
};

export const Colors = {
  // Both modes identical — this is always dark
  light: buildTheme(),
  dark:  buildTheme(),
};

function buildTheme() {
  return {
    background:      palette.bg,
    surface:         palette.surface,
    surfaceAlt:      palette.surfaceAlt,
    surfaceElevated: palette.surfaceElevated,
    panel:           palette.panel,
    panelAlt:        palette.panelAlt,

    border:          palette.border,
    borderStrong:    palette.borderStrong,
    borderAccent:    palette.borderAccent,

    text:            palette.text,
    textMuted:       palette.textMuted,
    textFaint:       palette.textFaint,

    tint:            palette.accent,
    accent:          palette.accent,
    accentSoft:      palette.accentSoft,
    accentDim:       palette.accentDim,

    icon:            palette.text,
    iconMuted:       palette.iconMuted,

    tabIconDefault:  palette.textMuted,
    tabIconSelected: palette.accent,

    panelText:       palette.text,
    panelTextMuted:  palette.textMuted,

    danger:  palette.danger,
    success: palette.success,
  };
}

export const Fonts = Platform.select({
  ios: {
    sans:    "AvenirNextCondensed-DemiBold",
    serif:   "AvenirNextCondensed-Regular",
    rounded: "AvenirNextCondensed-Medium",
    mono:    "Menlo",
  },
  default: {
    sans:    "sans-serif-condensed",
    serif:   "serif",
    rounded: "sans-serif-medium",
    mono:    "monospace",
  },
  web: {
    sans:    "'Space Grotesk', 'IBM Plex Sans Condensed', 'Rajdhani', sans-serif",
    serif:   "'IBM Plex Serif', serif",
    rounded: "'Sora', 'Rajdhani', sans-serif",
    mono:    "'IBM Plex Mono', 'JetBrains Mono', monospace",
  },
});
