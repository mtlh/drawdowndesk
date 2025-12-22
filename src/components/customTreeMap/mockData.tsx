import { TreemapNode } from "./treeMapNode";

export const mockTreemapData: TreemapNode[] = [
  {
    name: "Tech",
    children: [
      { name: "Apple", value: 120 },
      { name: "Microsoft", value: 90 },
      { name: "Nvidia", value: 150 },
    ],
  },
  {
    name: "Finance",
    children: [
      { name: "JPMorgan", value: 80 },
      { name: "Goldman Sachs", value: 60 },
    ],
  },
  {
    name: "Energy",
    children: [
      { name: "Exxon", value: 110 },
      { name: "Chevron", value: 95 },
    ],
  },
];
