import React from "react";
import type { TreemapNode } from "./treeMapNode";

type CustomNodeProps = Partial<TreemapNode> & {
  colors: string[];
};

export const CustomNode: React.FC<CustomNodeProps> = (props) => {
  const {
    x = 0,
    y = 0,
    width = 0,
    height = 0,
    name = "",
    value = 0,
    colors,
  } = props;

  // stable hash function for consistent color mapping
  const hashString = (str: string) => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash * 31 + str.charCodeAt(i)) >>> 0; // unsigned 32‑bit
    }
    return hash;
  };

  // derive stable color index from hashed name
  const colorIndex = hashString(name) % colors.length;
  const baseHex = colors[colorIndex];

  // helper to convert hex -> rgba with optional alpha
  const hexToRgba = (hex: string, alpha = 1) => {
    const h = hex.replace("#", "");
    const bigint = parseInt(
      h.length === 3 ? h.split("").map(c => c + c).join("") : h,
      16
    );
    const r = (bigint >> 16) & 255;
    const g = (bigint >> 8) & 255;
    const b = bigint & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  };

  const fillOpacity = +(0.85 + Math.random() * 0.15).toFixed(2);
  const color = hexToRgba(baseHex, fillOpacity);

  // compute font size based on both width and height (keeps text proportional)
  const computedFontSize = Math.max(
    10,
    Math.min(
      Math.floor(width * 0.03), // scale with width
      Math.floor(height * 0.15) // but never exceed a portion of height
    )
  );

  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        fill={color}
        stroke="#fff"
      />
        <text 
            x={x + 4}
            y={y + 4 + computedFontSize}
            fill="#fff"
            fontSize={computedFontSize}
            style={{ shapeRendering: "crispEdges", textRendering: "optimizeLegibility" }}>
          {name} ({value})
        </text>
    </g>
  );
};
