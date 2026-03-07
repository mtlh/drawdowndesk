export interface TreemapNode {
  name: string;
  value?: number;
  children?: TreemapNode[];
  accountName?: string;
  accountValue?: number;
  accountColor?: string;

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
