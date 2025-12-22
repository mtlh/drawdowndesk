import React from "react";
import { Treemap, ResponsiveContainer } from "recharts";
import type { TreemapNode } from "./treeMapNode";
import { CustomNode } from "./customNode";

interface CustomTreemapProps {
  data: TreemapNode[];
  colors?: string[];
}

export const CustomTreemap: React.FC<CustomTreemapProps> = ({
  data,
  colors = ["#8884d8", "#83a6ed", "#8dd1e1", "#82ca9d", "#a4de6c"],
}) => {
  return (
    <ResponsiveContainer width="100%" height={400}>
      <Treemap
        data={data}
        dataKey="value"
        aspectRatio={4 / 3}
        stroke="#fff"
        content={<CustomNode colors={colors} />}
      />
    </ResponsiveContainer>
  );
};
