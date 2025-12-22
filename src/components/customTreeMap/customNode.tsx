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
    depth = 0,
    name,
    value,
    colors,
  } = props;

  const color = colors[depth % colors.length];

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
      {name && width > 80 && height > 20 && (
        <text 
            x={x + 4}
            y={y + 18}
            fill="#fff"
            fontSize={15}
            style={{ shapeRendering: "crispEdges", textRendering: "optimizeLegibility", }}>
          {name} ({value})
        </text>
      )}
    </g>
  );
};
