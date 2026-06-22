/**
 * Concrete (non-CSS-var) chart colors per theme. ECharts renders to canvas and
 * cannot resolve CSS custom properties, so chart code must pass real hex/rgba.
 * Single source of truth — pages/components import this instead of re-declaring
 * the muted/grid literals inline.
 */
export interface ChartTheme {
  muted: string;
  grid: string;
}

export function chartTheme(theme: string): ChartTheme {
  const dark = theme === "dark";
  return {
    muted: dark ? "#b9af97" : "#4a4434",
    grid: dark ? "rgba(232,224,204,0.10)" : "rgba(20,18,11,0.10)",
  };
}
