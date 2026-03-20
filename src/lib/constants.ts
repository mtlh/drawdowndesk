// Theme configuration - Blue & Slate color scheme
// To change theme, update these CSS variables in globals.css

export const CHART_COLORS = [
  "#4F46E5", // Indigo (primary accent)
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#06B6D4", // Cyan
  "#EC4899", // Pink
  "#84CC16", // Lime
  "#F97316", // Orange
  "#6366F1", // Indigo Light
] as const;

// Shorthand for the main 5 colors (for smaller charts)
export const CHART_COLORS_MAIN: readonly [string, string, string, string, string] = [
  CHART_COLORS[0],
  CHART_COLORS[1],
  CHART_COLORS[2],
  CHART_COLORS[3],
  CHART_COLORS[4],
];

// Donut chart inner radius for hollow center effect
export const DONUT_INNER_RADIUS = 60;
export const DONUT_OUTER_RADIUS = 100;

// UK Tax configuration
export const CURRENT_TAX_YEAR = 2026;
export const TAX_YEAR_START_MONTH = 4; // April
export const TAX_YEAR_START_DAY = 6;   // 6th April

// Extended palette for treemap and other visualizations with many items
export const EXTENDED_PALETTE = [
  "#4F46E5", "#10B981", "#F59E0B", "#EC4899", "#06B6D4",
  "#8B5CF6", "#14B8A6", "#EF4444", "#84CC16", "#F97316",
  "#6366F1", "#34D399", "#FBBF24", "#F472B6", "#22D3EE",
] as const;
