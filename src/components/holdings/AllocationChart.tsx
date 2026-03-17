import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from "recharts";
import Link from "next/link";
import { CHART_COLORS, DONUT_INNER_RADIUS, DONUT_OUTER_RADIUS } from "@/lib/constants";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyFunction = (...args: any[]) => any;

interface AllocationChartProps {
  allocationData: Array<{ name: string; value: number }>;
  portfolioId: string;
  PieTooltip: AnyFunction | null;
}

export function AllocationChart({ allocationData, portfolioId, PieTooltip }: AllocationChartProps) {
  return (
    <Link
      href={`/holdings/${portfolioId}`}
      className="w-full cursor-pointer hover:opacity-80 transition-opacity"
    >
      <ResponsiveContainer width="100%" height={200}>
        <PieChart>
          <Pie
            data={allocationData}
            cx="50%"
            cy="50%"
            innerRadius={DONUT_INNER_RADIUS}
            outerRadius={DONUT_OUTER_RADIUS}
            paddingAngle={3}
            cornerRadius={8}
            dataKey="value"
          >
            {allocationData.map((item, index) => (
              <Cell key={item.name} fill={CHART_COLORS[index % CHART_COLORS.length]} stroke="none" />
            ))}
          </Pie>
          <RechartsTooltip content={PieTooltip as never} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-1 px-2">
        {allocationData.slice(0, 5).map((item, index) => (
          <div key={item.name} className="flex items-center gap-1.5 text-xs">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
            <span className="text-muted-foreground">{item.name}</span>
          </div>
        ))}
      </div>
    </Link>
  );
}
