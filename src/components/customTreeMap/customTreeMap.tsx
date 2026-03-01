import React, { useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { TreemapNode } from "./treeMapNode";

// ============================================================================
// Constants
// ============================================================================

const ACCOUNT_PALETTE = [
  "#4F46E5", "#10B981", "#F59E0B", "#EC4899", "#06B6D4",
  "#8B5CF6", "#14B8A6", "#EF4444", "#84CC16", "#F97316",
];

const GRID_LAYOUT: Record<number, { cols: number; largeIndexes: number[] }> = {
  1: { cols: 1, largeIndexes: [] },
  2: { cols: 2, largeIndexes: [] },
  3: { cols: 2, largeIndexes: [] },
  4: { cols: 2, largeIndexes: [] },
  5: { cols: 2, largeIndexes: [4] },
  6: { cols: 3, largeIndexes: [] },
  7: { cols: 3, largeIndexes: [6] },
  8: { cols: 4, largeIndexes: [] },
};

// ============================================================================
// Utility Functions
// ============================================================================

const getAccountColor = (index: number): string => ACCOUNT_PALETTE[index % ACCOUNT_PALETTE.length];

const formatValue = (val: number): string => {
  if (val >= 1000000) return `£${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `£${(val / 1000).toFixed(0)}k`;
  return `£${val.toFixed(0)}`;
};

const generateHoldingShades = (baseColor: string, count: number): string[] => {
  const h = baseColor.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;

  return Array.from({ length: count }, (_, i) => {
    const factor = 0.5 + (i / Math.max(count - 1, 1)) * 0.5;
    return `rgb(${Math.min(255, Math.round(r * factor))},${Math.min(255, Math.round(g * factor))},${Math.min(255, Math.round(b * factor))})`;
  });
};

// ============================================================================
// Single Account Component
// ============================================================================

interface SingleAccountProps {
  name: string;
  value: number;
  holdings: TreemapNode[];
  color: string;
  totalValue: number;
  isLarge?: boolean;
}

const SingleAccount: React.FC<SingleAccountProps> = ({ name, value, holdings, color, totalValue, isLarge = false }) => {
  const percentage = ((value / totalValue) * 100).toFixed(1);
  const sortedHoldings = [...holdings].sort((a, b) => (b.value || 0) - (a.value || 0));
  const shades = useMemo(() => generateHoldingShades(color, Math.max(holdings.length, 1)), [color, holdings.length]);
  const isSingleHolding = sortedHoldings.length === 1;

  // Custom treemap content renderer
  const renderContent = (props: { x?: number; y?: number; width?: number; height?: number; name?: string; value?: number; index?: number }) => {
    const { x = 0, y = 0, width = 0, height = 0, name = "", value = 0, index = 0 } = props;
    const hasSpace = width > 40 && height > 20;
    const fontSize = Math.max(10, Math.min(width * 0.05, height * 0.16));

    // For single holding, center the text
    const textX = isSingleHolding ? x + width / 2 : x + 6;
    const textAnchor = isSingleHolding ? "middle" : "start";

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={shades[index % shades.length]}
          stroke="rgba(255,255,255,0.7)"
          strokeWidth={1}
        />
        {hasSpace && (
          <>
            <text
              x={textX}
              y={y + height / 2 - 4}
              textAnchor={textAnchor}
              fill="#fff"
              fontSize={fontSize}
              fontWeight="600"
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
            >
              {name.length > 12 ? name.slice(0, 10) + ".." : name}
            </text>
            <text
              x={textX}
              y={y + height / 2 + 14}
              textAnchor={textAnchor}
              fill="rgba(255,255,255,0.9)"
              fontSize={fontSize - 2}
              style={{ textShadow: "0 1px 3px rgba(0,0,0,0.4)" }}
            >
              {formatValue(value)}
            </text>
          </>
        )}
      </g>
    );
  };

  // Tooltip renderer
  const renderTooltip = (props: { active?: boolean; payload?: Array<{ payload: { name: string; value: number } }> }) => {
    if (!props.active || !props.payload?.length) return null;
    const payload = props.payload[0].payload;
    const pct = ((payload.value / value) * 100).toFixed(1);
    return (
      <div className="bg-slate-800 text-white px-3 py-2 rounded-lg shadow-xl border border-slate-600">
        <div className="font-semibold text-sm">{payload.name}</div>
        <div className="text-xs text-slate-300">£{payload.value.toLocaleString()} ({pct}%)</div>
      </div>
    );
  };

  return (
    <div className={`min-w-0 border-r border-b border-white ${isLarge ? "row-span-2" : ""}`}>
      {/* Account Header */}
      <div className="px-3 py-2 text-white font-semibold text-sm text-center" style={{ backgroundColor: color }}>
        <div className="truncate">{name}</div>
        <div className="text-xs opacity-90">{formatValue(value)} ({percentage}%)</div>
      </div>

      {/* Holdings Treemap */}
      <div style={{ height: isLarge ? 240 : 200 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={sortedHoldings}
            dataKey="value"
            aspectRatio={1.5}
            stroke="#fff"
            content={renderContent}
          >
            <Tooltip content={renderTooltip} />
          </Treemap>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

// ============================================================================
// Main Component
// ============================================================================

interface CustomTreemapProps {
  data: TreemapNode[];
}

export const CustomTreemap: React.FC<CustomTreemapProps> = ({ data }) => {
  // Calculate total value across all accounts
  const totalValue = useMemo(
    () => data.reduce((sum, item) => sum + (item.value || 0), 0),
    [data]
  );

  // Sort accounts alphabetically
  const sortedAccounts = [...data].sort((a, b) => a.name.localeCompare(b.name));
  const accountCount = sortedAccounts.length;

  // Get grid layout
  const { cols, largeIndexes } = GRID_LAYOUT[accountCount] || { cols: 4, largeIndexes: [] };

  return (
    <div
      className="w-full rounded-lg overflow-hidden border-2 border-white"
      style={{
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridAutoRows: "1fr",
      }}
    >
      {sortedAccounts.map((account, index) => (
        <SingleAccount
          key={`${account.name}-${index}`}
          name={account.name}
          value={account.value || 0}
          holdings={account.children || []}
          color={getAccountColor(index)}
          totalValue={totalValue}
          isLarge={largeIndexes.includes(index)}
        />
      ))}
    </div>
  );
};
