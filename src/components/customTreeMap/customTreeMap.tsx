import React, { useMemo } from "react";
import { Treemap, ResponsiveContainer, Tooltip } from "recharts";
import type { TreemapNode } from "./treeMapNode";

// Type for Recharts Treemap content props
interface TreemapContentProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  name?: string;
  value?: number;
  index?: number;
  depth?: number;
  colors?: string[];
  parent?: { name?: string; value?: number };
  // Custom fields from our data
  accountName?: string;
  accountValue?: number;
  accountColor?: string;
}

// ============================================================================
// Constants
// ============================================================================

// ============================================================================
// Utility Functions
// ============================================================================

const formatValue = (val: number): string => {
  if (val >= 1000000) return `£${(val / 1000000).toFixed(1)}M`;
  if (val >= 1000) return `£${(val / 1000).toFixed(0)}k`;
  return `£${val.toFixed(0)}`;
};

// Extended palette for more accounts
const EXTENDED_PALETTE = [
  "#4F46E5", "#10B981", "#F59E0B", "#EC4899", "#06B6D4",
  "#8B5CF6", "#14B8A6", "#EF4444", "#84CC16", "#F97316",
  "#6366F1", "#34D399", "#FBBF24", "#F472B6", "#22D3EE",
];

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

  // Build color map for accounts using index-based colors
  const accountColors = useMemo(() => {
    const colors: Record<string, string> = {};
    data.forEach((account, index) => {
      colors[account.name] = EXTENDED_PALETTE[index % EXTENDED_PALETTE.length];
    });
    return colors;
  }, [data]);

  // Custom content renderer for the hierarchical treemap
  const renderContent = (props: TreemapContentProps): React.ReactElement => {
    const { x = 0, y = 0, width = 0, height = 0, name = "", value = 0, accountColor } = props;

    // Determine if this is an account or holding by checking if name exists in our account colors
    // If it's in accountColors, it's a top-level account; otherwise it's a holding
    const isAccount = name in accountColors;

    // Get the color - from props for holdings, from accountColors for accounts
    let color: string;
    if (isAccount) {
      color = accountColors[name] || EXTENDED_PALETTE[0];
    } else {
      // For holdings, use the accountColor passed directly in the data
      color = accountColor || EXTENDED_PALETTE[0];
    }

    const hasSpace = width > 40 && height > 20;
    const fontSize = Math.max(10, Math.min(width * 0.05, height * 0.16));

    // For accounts, show name and value. For holdings, show symbol and value
    const displayName = isAccount ? name : (name.length > 10 ? name.slice(0, 8) + ".." : name);
    const textAnchor = isAccount && width > 60 ? "middle" : "start";
    const textX = isAccount && width > 60 ? x + width / 2 : x + 6;

    // Account border is thicker and dark, holdings have white border
    const borderWidth = isAccount ? 4 : 1.5;
    const borderColor = isAccount ? "#000000" : "rgba(255,255,255,0.5)";

    return (
      <g>
        <rect
          x={x}
          y={y}
          width={width}
          height={height}
          fill={color}
          stroke={borderColor}
          strokeWidth={borderWidth}
        />
        {hasSpace && (
          <>
            <text
              x={textX}
              y={y + height / 2 - (isAccount ? 8 : 4)}
              textAnchor={textAnchor}
              fill="var(--treemap-text, #fff)"
              fontSize={fontSize}
              fontWeight={isAccount ? "700" : "600"}
            >
              {displayName}
            </text>
            {!isAccount && (
              <text
                x={textX}
                y={y + height / 2 + 10}
                textAnchor={textAnchor}
                fill="rgba(255,255,255,0.9)"
                fontSize={fontSize - 2}
              >
                {formatValue(value)}
              </text>
            )}
          </>
        )}
      </g>
    );
  };

  // Tooltip renderer
  const renderTooltip = (props: { active?: boolean; payload?: Array<{ payload: { name: string; value?: number; accountName?: string; accountValue?: number } }> }) => {
    if (!props.active || !props.payload?.length) return null;
    const payload = props.payload[0].payload;

    // Check if it's an account or holding
    const isAccount = !payload.accountName;

    if (isAccount) {
      const pct = ((payload.value || 0) / totalValue * 100).toFixed(1);
      return (
        <div className="bg-card text-card-foreground px-3 py-2 rounded-lg shadow-xl border border-border">
          <div className="font-semibold text-sm">{payload.name}</div>
          <div className="text-xs text-muted-foreground">
            £{payload.value?.toLocaleString()} ({pct}%)
          </div>
        </div>
      );
    }

    // Holding tooltip - show account name too
    const holdingPct = payload.value && payload.accountValue ? ((payload.value / payload.accountValue) * 100).toFixed(1) : "0";
    const accountPct = payload.accountValue ? ((payload.accountValue / totalValue) * 100).toFixed(1) : "0";

    return (
      <div className="bg-card text-card-foreground px-3 py-2 rounded-lg shadow-xl border border-border">
        <div className="font-semibold text-sm">{payload.name}</div>
        <div className="text-xs text-muted-foreground">{payload.accountName}</div>
        <div className="text-xs text-muted-foreground mt-1">
          Holding: £{payload.value?.toLocaleString()} ({holdingPct}%)
        </div>
        <div className="text-xs text-muted-foreground">
          Account: £{payload.accountValue?.toLocaleString()} ({accountPct}%)
        </div>
      </div>
    );
  };

  // Sort accounts by value descending for better visualization
  const sortedData = useMemo(
    () => [...data].sort((a, b) => (b.value || 0) - (a.value || 0)),
    [data]
  );

  // Build legend data from sorted accounts
  const legendItems = useMemo(() => {
    return sortedData.map((account, index) => ({
      name: account.name,
      value: account.value || 0,
      color: account.children?.[0]?.accountColor || EXTENDED_PALETTE[index % EXTENDED_PALETTE.length],
    }));
  }, [sortedData]);

  if (sortedData.length === 0) {
    return (
      <div className="h-48 flex items-center justify-center text-muted-foreground">
        No holdings to display
      </div>
    );
  }

  return (
    <div>
      <div className="w-full rounded-lg overflow-hidden" style={{ height: 400 }}>
        <ResponsiveContainer width="100%" height="100%">
          <Treemap
            data={sortedData}
            dataKey="value"
            aspectRatio={1.5}
            stroke="#fff"
            content={renderContent as unknown as React.ComponentProps<typeof Treemap>["content"]}
          >
            <Tooltip content={renderTooltip as unknown as React.ComponentProps<typeof Tooltip>["content"]} />
          </Treemap>
        </ResponsiveContainer>
      </div>
      {/* Color legend */}
      <div className="flex flex-wrap justify-center gap-4 mt-4 pt-4 border-t border-border">
        {legendItems.map((item) => (
          <div key={item.name} className="flex items-center gap-2">
            <div
              className="w-4 h-4 rounded"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-sm text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};
