export interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];

  // Runtime layout props from Recharts
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  depth?: number;
  index?: number;
  parent?: TreemapNode;
  root?: TreemapNode;
}
