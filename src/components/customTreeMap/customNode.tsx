import React from "react";
import type { TreemapNode } from "./treeMapNode";

type CustomNodeProps = Partial<TreemapNode> & {
  colors: string[];
  totalValue?: number;
  index?: number;
  depth?: number;
};

// Account colors
const ACCOUNT_COLORS: Record<string, string> = {
  SIPP: "#4F46E5",
  ISA: "#10B981",
  General: "#F59E0B",
  Trading: "#EC4899",
  Pension: "#06B6D4",
  OEIC: "#8B5CF6",
  "Unit Trust": "#14B8A6",
};

const getAccountColor = (name: string): string => {
  if (ACCOUNT_COLORS[name]) return ACCOUNT_COLORS[name];
  const n = name.toLowerCase();
  if (n.includes("sipp") || n.includes("pension")) return "#4F46E5";
  if (n.includes("isa")) return "#10B981";
  if (n.includes("trading") || n.includes("general")) return "#F59E0B";
  if (n.includes("oeic") || n.includes("fund")) return "#8B5CF6";
  return "#6B7280";
};

const darkenColor = (hex: string, factor: number): string => {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = Math.round(((bigint >> 16) & 255) * factor);
  const g = Math.round(((bigint >> 8) & 255) * factor);
  const b = Math.round((bigint & 255) * factor);
  return `rgb(${r},${g},${b})`;
};

const lightenColor = (hex: string, factor: number): string => {
  const h = hex.replace("#", "");
  const bigint = parseInt(h.length === 3 ? h.split("").map(c => c + c).join("") : h, 16);
  const r = Math.min(255, Math.round(((bigint >> 16) & 255) + (255 - ((bigint >> 16) & 255)) * factor));
  const g = Math.min(255, Math.round(((bigint >> 8) & 255) + (255 - ((bigint >> 8) & 255)) * factor));
  const b = Math.min(255, Math.round((bigint & 255) + (255 - (bigint & 255)) * factor));
  return `rgb(${r},${g},${b})`;
};

export const CustomNode: React.FC<CustomNodeProps> = (props) => {
  const { x = 0, y = 0, width = 0, height = 0, name = "", value = 0, totalValue = 1, depth = 0 } = props;

  const nodeName = props.name || name;
  const nodeValue = props.value || value;
  const nodeDepth = props.depth ?? depth;

  const percentage = ((nodeValue / totalValue) * 100).toFixed(1);

  // Determine color based on node name patterns
  const getColor = (): string => {
    const baseColor = getAccountColor(nodeName);
    const lowerName = nodeName.toLowerCase();

    // Root level - account
    if (nodeDepth === 0) {
      return baseColor;
    }

    // Level 1 - asset type (Stock/Bond/etc)
    if (nodeDepth === 1) {
      if (lowerName.includes("stock") || lowerName.includes("equity")) {
        return darkenColor(baseColor, 0.7);
      }
      if (lowerName.includes("bond") || lowerName.includes("fixed")) {
        return lightenColor(baseColor, 0.3);
      }
      return baseColor;
    }

    // Level 2+ - individual holdings
    if (lowerName.includes("stock") || lowerName.includes("equity")) {
      return darkenColor(baseColor, 0.75);
    }
    if (lowerName.includes("bond") || lowerName.includes("fixed")) {
      return lightenColor(baseColor, 0.2);
    }
    return lightenColor(baseColor, 0.1);
  };

  const color = getColor();
  const isAccount = nodeDepth === 0;
  const isAssetType = nodeDepth === 1;

  const fontSize = Math.max(isAccount ? 14 : 10, Math.min(width * 0.04, height * 0.18));
  const showText = width > 55 && height > 30;
  const showSmall = width > 40 && height > 22;

  const formatValue = (val: number) => {
    if (val >= 1000000) return `£${(val / 1000000).toFixed(1)}M`;
    if (val >= 1000) return `£${(val / 1000).toFixed(0)}k`;
    return `£${val.toFixed(0)}`;
  };

  const centerY = y + height / 2;

  const strokeW = isAccount ? 3 : (isAssetType ? 2 : 1);
  const strokeC = isAccount ? "#fff" : (isAssetType ? "rgba(255,255,255,0.8)" : "rgba(255,255,255,0.4)");

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke={strokeC}
        strokeWidth={strokeW}
      />

      {isAccount && showText && (
        <>
          <text x={x + width/2} y={centerY - 5} textAnchor="middle" fill="#fff" fontSize={fontSize} fontWeight="bold" style={{textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>
            {nodeName}
          </text>
          <text x={x + width/2} y={centerY + 14} textAnchor="middle" fill="rgba(255,255,255,0.9)" fontSize={fontSize-2} style={{textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>
            {formatValue(nodeValue)} ({percentage}%)
          </text>
        </>
      )}

      {isAssetType && showSmall && (
        <>
          <text x={x + 5} y={centerY - 3} fill="#fff" fontSize={fontSize-1} fontWeight="600" style={{textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>
            {nodeName.length > 12 ? nodeName.slice(0,10)+".." : nodeName}
          </text>
          <text x={x + 5} y={centerY + 11} fill="rgba(255,255,255,0.85)" fontSize={fontSize-3} style={{textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>
            {formatValue(nodeValue)}
          </text>
        </>
      )}

      {!isAccount && !isAssetType && showSmall && (
        <>
          <text x={x + 4} y={centerY - 2} fill="#fff" fontSize={Math.max(9, fontSize-2)} fontWeight="600" style={{textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>
            {nodeName.length > 9 ? nodeName.slice(0,7)+".." : nodeName}
          </text>
          <text x={x + 4} y={centerY + 9} fill="rgba(255,255,255,0.8)" fontSize={Math.max(8, fontSize-4)} style={{textShadow:"0 1px 3px rgba(0,0,0,0.5)"}}>
            {formatValue(nodeValue)}
          </text>
        </>
      )}
    </g>
  );
};
